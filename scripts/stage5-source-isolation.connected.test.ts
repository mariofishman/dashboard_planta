import assert from "node:assert/strict";
import { mkdir, readFile, rmdir } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import {
  TestDatabaseConnections,
  TestDatabaseScenarioRepository,
  TestDatabaseSourceAdapter,
  SimulatorSourceAdapter,
  type ScenarioFault,
  type ScenarioRuleCode,
} from "@monitor/detection";
import { assertCanonicalSourceActionIsolation } from "../apps/api/src/source-action-isolation.connected.js";
import { buildMonitorServer, type MonitorServer } from "../apps/api/src/server.js";

const repositoryRoot = resolve(import.meta.dirname, "..");
const manager = { authorization: "Bearer mock:plant-manager" };
const codes: ScenarioRuleCode[] = ["A02", "A03", "A05"];

async function monitorSnapshot(server: Awaited<ReturnType<typeof buildMonitorServer>>) {
  const tables = await server.database.queryAll(`SELECT table_name AS "tableName" FROM information_schema.tables
    WHERE table_schema=current_schema() AND table_type='BASE TABLE' AND left(table_name,8)='monitor_' ORDER BY table_name`);
  return Object.fromEntries(await Promise.all(tables.map(async ({ tableName }) => {
    const table = String(tableName);
    if (!/^monitor_[a-z0-9_]+$/.test(table)) throw new Error("invalid_monitor_table_name");
    const rows = await server.database.queryAll(`SELECT to_jsonb(snapshot_row)::text AS row
      FROM ${table} snapshot_row ORDER BY to_jsonb(snapshot_row)::text`);
    return [table, rows.map(({ row }) => String(row))] as const;
  })));
}

async function queryContract(code: ScenarioRuleCode) {
  return JSON.parse(await readFile(resolve(repositoryRoot, `config/detection/contracts/${code.toLowerCase()}.query.json`), "utf8")) as {
    alertTypeCode: ScenarioRuleCode;
    queryId: string;
    queryVersion: string;
  };
}

async function authoritySnapshot(server: MonitorServer) {
  const excluded = new Set(["monitor_detection_query", "monitor_poll_cycle"]);
  const tables = (await server.database.queryAll(`SELECT table_name AS "tableName" FROM information_schema.tables
    WHERE table_schema=current_schema() AND table_type='BASE TABLE' AND left(table_name,8)='monitor_' ORDER BY table_name`))
    .map(({ tableName }) => String(tableName))
    .filter((table) => !excluded.has(table));
  return Object.fromEntries(await Promise.all(tables.map(async (table) => {
    if (!/^monitor_[a-z0-9_]+$/.test(table)) throw new Error("invalid_monitor_authority_table_name");
    const rows = await server.database.queryAll(`SELECT to_jsonb(snapshot_row)::text AS row
      FROM ${table} snapshot_row ORDER BY to_jsonb(snapshot_row)::text`);
    return [table, rows.map(({ row }) => String(row))] as const;
  })));
}

async function poll(server: MonitorServer, code: ScenarioRuleCode) {
  const response = await server.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/poll`, headers: manager });
  assert.equal(response.statusCode, 200, response.body);
  return response.json().result as {
    cycleId: string;
    queryId: string;
    status: string;
    complete: boolean;
    fullEvaluation: boolean;
    pageCount: number;
    rowCount: number;
    errorCode: string | null;
    pageEvidence: Array<{ page: number; rowCount: number; revision: string }>;
  };
}

async function injectFault(server: MonitorServer, code: ScenarioRuleCode, fault: ScenarioFault) {
  const response = await server.app.inject({
    method: "POST", url: `/api/dev/test/scenarios/${code}/fail-next-poll`, headers: manager, payload: { fault },
  });
  assert.equal(response.statusCode, 200, response.body);
}

async function persistedFreshness(server: MonitorServer, cycleId: string) {
  const row = await server.database.queryOne(`SELECT freshness,source_revision AS "sourceRevision"
    FROM monitor_poll_cycle WHERE cycle_id=$1`, [cycleId]);
  return { freshness: row.freshness as Record<string, unknown>, sourceRevision: String(row.sourceRevision) };
}

interface TrustedA02Context {
  server: MonitorServer;
  flowId: number;
  trustedIncidentId: string;
  trustedAuthority: Record<string, string[]>;
  trustedPageCount: number;
}

async function withTrustedA02(
  execute: (context: TrustedA02Context) => Promise<void>,
) {
  const server = await buildMonitorServer({
    config: {
      nodeEnv: "test", cookieSecret: "stage5-failed-read-preservation-secret", allowMockAuth: true,
      enableScenarioLab: true, scenarioSource: "test_database", databaseMode: "pglite", pgliteDataDir: "memory://",
    },
  });
  const connections = await TestDatabaseConnections.create(repositoryRoot);
  let original: Record<string, unknown> | undefined;
  try {
    assert.ok(server.acceptance?.source instanceof TestDatabaseScenarioRepository);
    const flowId = server.acceptance.source.fixtureIds.A02.flowId;
    const [rows] = await connections.writer.query(`SELECT id,estado,fecha_recepcion,fecha_creacion,fecha_actualizacion
      FROM flujo_materiales_detalles WHERE id=?`, [flowId]);
    original = { ...(rows as Array<Record<string, unknown>>)[0] };
    assert.equal(Number(original.id), flowId);
    await connections.writer.execute(`UPDATE flujo_materiales_detalles SET estado='TRANSITO',fecha_recepcion=NULL,
      fecha_creacion=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 31 MINUTE) WHERE id=?`, [flowId]);
    const healthy = await poll(server, "A02");
    assert.equal(healthy.status, "healthy");
    const incident = await server.database.queryOne("SELECT id,lifecycle FROM monitor_incident WHERE rule_code='A02' AND condition_key=$1", [`A02:v1:${flowId}`]);
    assert.ok(incident.id);
    assert.equal(incident.lifecycle, "open");
    await execute({
      server,
      flowId,
      trustedIncidentId: String(incident.id),
      trustedAuthority: await authoritySnapshot(server),
      trustedPageCount: healthy.pageCount,
    });
  } finally {
    try {
      if (original) {
        await connections.writer.execute(`UPDATE flujo_materiales_detalles SET estado=?,fecha_recepcion=?,
          fecha_creacion=?,fecha_actualizacion=? WHERE id=?`, [original.estado, original.fecha_recepcion,
          original.fecha_creacion, original.fecha_actualizacion, original.id]);
        const [rows] = await connections.writer.query(`SELECT id,estado,fecha_recepcion,fecha_creacion,fecha_actualizacion
          FROM flujo_materiales_detalles WHERE id=?`, [original.id]);
        assert.deepEqual({ ...(rows as Array<Record<string, unknown>>)[0] }, original, "failed-read fixture was not restored exactly");
      }
    } finally {
      await Promise.all([connections.close(), server.close()]);
    }
  }
}

async function assertNextFailurePreserved(
  context: TrustedA02Context,
  label: string,
  expected: { status: string; errorCode: string; pageCount: number },
) {
  const failed = await poll(context.server, "A02");
  assert.equal(failed.status, expected.status);
  assert.equal(failed.errorCode, expected.errorCode);
  assert.equal(failed.complete, false);
  assert.equal(failed.fullEvaluation, false);
  assert.equal(failed.pageCount, expected.pageCount);
  assert.deepEqual(await authoritySnapshot(context.server), context.trustedAuthority, `${label} changed Monitor authority`);
  const persisted = await context.server.database.queryOne(`SELECT status,error_code AS "errorCode",complete,
    full_evaluation AS "fullEvaluation",page_count AS "pageCount",row_count AS "rowCount"
    FROM monitor_poll_cycle WHERE cycle_id=$1`, [failed.cycleId]);
  assert.deepEqual(persisted, {
    status: expected.status, errorCode: expected.errorCode, complete: false, fullEvaluation: false,
    pageCount: expected.pageCount, rowCount: failed.rowCount,
  });
  const incident = await context.server.database.queryOne("SELECT id,lifecycle FROM monitor_incident WHERE id=$1", [context.trustedIncidentId]);
  assert.equal(incident.id, context.trustedIncidentId);
  assert.equal(incident.lifecycle, "open");
  return failed;
}

async function assertFailurePreserved(
  context: TrustedA02Context,
  fault: ScenarioFault,
  expected: { status: string; errorCode: string; pageCount: number },
) {
  await injectFault(context.server, "A02", fault);
  return assertNextFailurePreserved(context, fault, expected);
}

test("6.1a establishes the connected healthy baseline through the real test_database adapter", async () => {
  const server = await buildMonitorServer({
    config: {
      nodeEnv: "test",
      cookieSecret: "stage5-source-isolation-connected-secret",
      allowMockAuth: true,
      enableScenarioLab: true,
      scenarioSource: "test_database",
      databaseMode: "pglite",
      pgliteDataDir: "memory://",
    },
  });
  let identityProbe: TestDatabaseConnections | undefined;

  try {
    assert.ok(server.acceptance);
    assert.equal(server.config.scenarioSource, "test_database");
    assert.ok(server.acceptance.source instanceof TestDatabaseScenarioRepository);
    assert.deepEqual([...server.acceptance.registry.keys()].sort(), codes);
    identityProbe = await TestDatabaseConnections.create(repositoryRoot);
    const [identityRows] = await identityProbe.monitor.query("SELECT CURRENT_USER() AS currentUser,DATABASE() AS databaseName");
    const identity = (identityRows as Array<{ currentUser: string; databaseName: string }>)[0];
    assert.ok(identity);
    assert.match(identity.currentUser, /^monitor_source_ro@/);
    assert.equal(identity.databaseName, "test_database");

    for (const code of codes) {
      const contract = await queryContract(code);
      const entry = server.acceptance.registry.get(code);
      assert.ok(entry, `${code} registry entry missing`);
      assert.ok(entry.adapter instanceof TestDatabaseSourceAdapter, `${code} did not use TestDatabaseSourceAdapter`);
      assert.equal(entry.query.adapterKind, "test_database");
      assert.equal(entry.query.ruleCode, contract.alertTypeCode);
      assert.equal(entry.query.queryId, contract.queryId);
      assert.equal(entry.query.queryVersion, contract.queryVersion);

      const response = await server.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/poll`, headers: manager });
      assert.equal(response.statusCode, 200, response.body);
      const result = response.json().result as {
        cycleId: string;
        queryId: string;
        status: string;
        complete: boolean;
        fullEvaluation: boolean;
        pageCount: number;
        pageEvidence: Array<{ page: number; revision: string }>;
      };
      assert.equal(result.queryId, contract.queryId);
      assert.equal(result.status, "healthy");
      assert.equal(result.complete, true);
      assert.equal(result.fullEvaluation, true);
      assert.ok(result.pageCount >= 1);
      assert.equal(result.pageEvidence.length, result.pageCount);
      assert.deepEqual(result.pageEvidence.map(({ page }) => page), Array.from({ length: result.pageCount }, (_value, index) => index + 1));
      const revisions = new Set(result.pageEvidence.map(({ revision }) => revision));
      assert.equal(revisions.size, 1, `${code} healthy cycle crossed source revisions`);
      assert.match([...revisions][0]!, new RegExp(`^test_database\\.${code}\\.v\\d+$`));

      const persisted = await server.database.queryOne(`SELECT cycle.query_id AS "queryId",cycle.query_version AS "queryVersion",
        cycle.status,cycle.source_revision AS "sourceRevision",cycle.complete,cycle.full_evaluation AS "fullEvaluation",
        query.adapter_kind AS "adapterKind"
        FROM monitor_poll_cycle cycle JOIN monitor_detection_query query ON query.query_id=cycle.query_id
        WHERE cycle.cycle_id=$1`, [result.cycleId]);
      assert.deepEqual(persisted, {
        queryId: contract.queryId,
        queryVersion: contract.queryVersion,
        status: "healthy",
        sourceRevision: [...revisions][0],
        complete: true,
        fullEvaluation: true,
        adapterKind: "test_database",
      });
    }
  } finally {
    await identityProbe?.close();
    await server.close();
  }
});

test("6.1b detects a direct approved fixture mutation only after a real-adapter poll", async () => {
  const server = await buildMonitorServer({
    config: {
      nodeEnv: "test",
      cookieSecret: "stage5-direct-fixture-detection-secret",
      allowMockAuth: true,
      enableScenarioLab: true,
      scenarioSource: "test_database",
      databaseMode: "pglite",
      pgliteDataDir: "memory://",
    },
  });
  const connections = await TestDatabaseConnections.create(repositoryRoot);
  let original: Record<string, unknown> | undefined;

  try {
    assert.ok(server.acceptance);
    assert.ok(server.acceptance.source instanceof TestDatabaseScenarioRepository);
    const flowId = server.acceptance.source.fixtureIds.A02.flowId;
    const [originalRows] = await connections.writer.query(`SELECT id,estado,fecha_recepcion,fecha_creacion,fecha_actualizacion
      FROM flujo_materiales_detalles WHERE id=?`, [flowId]);
    original = { ...(originalRows as Array<Record<string, unknown>>)[0] };
    assert.equal(Number(original.id), flowId);

    const monitorBefore = await monitorSnapshot(server);
    await connections.writer.execute(`UPDATE flujo_materiales_detalles SET estado='TRANSITO',fecha_recepcion=NULL,
      fecha_creacion=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 31 MINUTE) WHERE id=?`, [flowId]);
    const [mutatedRows] = await connections.writer.query(`SELECT id,estado,fecha_recepcion,fecha_creacion,fecha_actualizacion
      FROM flujo_materiales_detalles WHERE id=?`, [flowId]);
    const mutated = { ...(mutatedRows as Array<Record<string, unknown>>)[0] };
    assert.notDeepEqual(mutated, original, "direct source mutation produced no source change");
    assert.deepEqual(await monitorSnapshot(server), monitorBefore, "direct source mutation changed Monitor before polling");

    const response = await server.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
    assert.equal(response.statusCode, 200, response.body);
    const result = response.json().result as { cycleId: string; status: string; complete: boolean; fullEvaluation: boolean };
    assert.equal(result.status, "healthy");
    assert.equal(result.complete, true);
    assert.equal(result.fullEvaluation, true);
    const incident = await server.database.queryOne(`SELECT incident.id,incident.lifecycle,incident.condition_key AS "conditionKey",
      evidence.cycle_id AS "cycleId",evidence.evidence
      FROM monitor_incident incident JOIN monitor_incident_evidence evidence ON evidence.incident_id=incident.id
      WHERE incident.rule_code='A02' AND incident.condition_key=$1 ORDER BY evidence.observed_at DESC LIMIT 1`, [`A02:v1:${flowId}`]);
    assert.ok(incident.id, "direct fixture mutation was not detected");
    assert.equal(incident.lifecycle, "open");
    assert.equal(incident.conditionKey, `A02:v1:${flowId}`);
    assert.equal(incident.cycleId, result.cycleId);
    assert.equal(Number((incident.evidence as Record<string, unknown>).materialFlowDetailId), flowId);
  } finally {
    try {
      if (original) {
        await connections.writer.execute(`UPDATE flujo_materiales_detalles SET estado=?,fecha_recepcion=?,
          fecha_creacion=?,fecha_actualizacion=? WHERE id=?`, [original.estado, original.fecha_recepcion,
          original.fecha_creacion, original.fecha_actualizacion, original.id]);
        const [restoredRows] = await connections.writer.query(`SELECT id,estado,fecha_recepcion,fecha_creacion,fecha_actualizacion
          FROM flujo_materiales_detalles WHERE id=?`, [original.id]);
        assert.deepEqual({ ...(restoredRows as Array<Record<string, unknown>>)[0] }, original, "direct source fixture was not restored exactly");
      }
    } finally {
      await Promise.all([connections.close(), server.close()]);
    }
  }
});

test("6.1c keeps connected A02, A03, and A05 healthy with simulator consumption disabled", async () => {
  const server = await buildMonitorServer({
    config: {
      nodeEnv: "test",
      cookieSecret: "stage5-simulator-disabled-connected-secret",
      allowMockAuth: true,
      enableScenarioLab: true,
      scenarioSource: "test_database",
      databaseMode: "pglite",
      pgliteDataDir: "memory://",
    },
  });
  const connections = await TestDatabaseConnections.create(repositoryRoot);
  let a02Original: Record<string, unknown> | undefined;
  let a03Original: Record<string, unknown> | undefined;
  let a03Materials: Array<Record<string, unknown>> = [];
  let a05Original: Record<string, unknown> | undefined;
  let a05WorkOrder: Record<string, unknown> | undefined;

  try {
    assert.ok(server.acceptance);
    assert.ok(server.acceptance.source instanceof TestDatabaseScenarioRepository);
    assert.deepEqual([...server.acceptance.registry.keys()].sort(), codes);
    for (const code of codes) {
      const entry = server.acceptance.registry.get(code)!;
      assert.equal(entry.query.adapterKind, "test_database");
      assert.ok(entry.adapter instanceof TestDatabaseSourceAdapter);
      assert.equal(entry.adapter instanceof SimulatorSourceAdapter, false);
    }

    const fixtureIds = server.acceptance.source.fixtureIds;
    const [a02Rows] = await connections.writer.query(`SELECT id,estado,fecha_recepcion,fecha_creacion,fecha_actualizacion
      FROM flujo_materiales_detalles WHERE id=?`, [fixtureIds.A02.flowId]);
    a02Original = { ...(a02Rows as Array<Record<string, unknown>>)[0] };
    assert.equal(Number(a02Original.id), fixtureIds.A02.flowId);

    const [a03Rows] = await connections.writer.query(`SELECT id,fecha_inicio_ejecucion,fecha_fin_ejecucion,
      fecha_eliminacion,eliminado,fecha_actualizacion FROM ordenes_trabajo WHERE id=?`, [fixtureIds.A03.workOrderId]);
    a03Original = { ...(a03Rows as Array<Record<string, unknown>>)[0] };
    assert.equal(Number(a03Original.id), fixtureIds.A03.workOrderId);
    const [materialRows] = await connections.writer.query(`SELECT id,cantidad_consumida,fecha_actualizacion
      FROM orden_trabajo_materiales WHERE id_orden_trabajo=? AND fecha_eliminacion IS NULL AND eliminado=0 ORDER BY id`, [fixtureIds.A03.workOrderId]);
    a03Materials = (materialRows as Array<Record<string, unknown>>).map((row) => ({ ...row }));
    assert.ok(a03Materials.length > 0);

    const [a05Rows] = await connections.writer.query(`SELECT id,tipo,estado,fecha_creacion,fecha_actualizacion,id_almacen,
      COALESCE(id_orden_trabajo_origen,id_ultimo_orden_trabajo_cierre) AS workOrderId FROM articulo_serial WHERE id=?`, [fixtureIds.A05.serialId]);
    a05Original = { ...(a05Rows as Array<Record<string, unknown>>)[0] };
    assert.equal(Number(a05Original.id), fixtureIds.A05.serialId);
    const [a05WorkOrderRows] = await connections.writer.query(`SELECT id,fecha_fin_ejecucion,fecha_actualizacion
      FROM ordenes_trabajo WHERE id=?`, [a05Original.workOrderId]);
    a05WorkOrder = { ...(a05WorkOrderRows as Array<Record<string, unknown>>)[0] };
    assert.ok(a05WorkOrder.id);

    await connections.writer.execute(`UPDATE flujo_materiales_detalles SET estado='TRANSITO',fecha_recepcion=NULL,
      fecha_creacion=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 31 MINUTE) WHERE id=?`, [fixtureIds.A02.flowId]);
    await connections.writer.execute(`UPDATE ordenes_trabajo SET fecha_inicio_ejecucion=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 16 MINUTE),
      fecha_fin_ejecucion=NULL,fecha_eliminacion=NULL,eliminado=0 WHERE id=?`, [fixtureIds.A03.workOrderId]);
    for (const material of a03Materials) await connections.writer.execute(
      "UPDATE orden_trabajo_materiales SET cantidad_consumida=0 WHERE id=?", [material.id],
    );
    await connections.writer.execute(`UPDATE articulo_serial SET fecha_creacion=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 31 MINUTE),
      id_almacen=? WHERE id=?`, [fixtureIds.A05.originWarehouseId, fixtureIds.A05.serialId]);
    await connections.writer.execute("UPDATE ordenes_trabajo SET fecha_fin_ejecucion=UTC_TIMESTAMP() WHERE id=?", [a05Original.workOrderId]);

    const simulatorTables = (await server.database.queryAll(`SELECT table_name AS "tableName" FROM information_schema.tables
      WHERE table_schema=current_schema() AND table_type='BASE TABLE' AND left(table_name,12)='monitor_sim_' ORDER BY table_name`))
      .map(({ tableName }) => String(tableName));
    assert.ok(simulatorTables.length > 0, "simulator tables were unavailable before the disablement proof");
    for (const table of simulatorTables.reverse()) {
      if (!/^monitor_sim_[a-z0-9_]+$/.test(table)) throw new Error("invalid_simulator_table_name");
      await server.database.execute(`DROP TABLE ${table} CASCADE`);
    }
    const remainingSimulatorTables = await server.database.queryOne(`SELECT COUNT(*)::int AS count FROM information_schema.tables
      WHERE table_schema=current_schema() AND table_type='BASE TABLE' AND left(table_name,12)='monitor_sim_'`);
    assert.equal(Number(remainingSimulatorTables.count), 0);

    const cycleIds: Record<string, string> = {};
    const naturalKeys: Record<ScenarioRuleCode, number> = {
      A02: fixtureIds.A02.flowId,
      A03: fixtureIds.A03.workOrderId,
      A05: fixtureIds.A05.serialId,
    };
    for (const code of codes) {
      const response = await server.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/poll`, headers: manager });
      assert.equal(response.statusCode, 200, response.body);
      const result = response.json().result as { cycleId: string; status: string; complete: boolean; fullEvaluation: boolean };
      assert.equal(result.status, "healthy");
      assert.equal(result.complete, true);
      assert.equal(result.fullEvaluation, true);
      cycleIds[code] = result.cycleId;
      const incident = await server.database.queryOne(`SELECT incident.id,incident.lifecycle,incident.condition_key AS "conditionKey",
        evidence.cycle_id AS "cycleId" FROM monitor_incident incident
        JOIN monitor_incident_evidence evidence ON evidence.incident_id=incident.id
        WHERE incident.rule_code=$1 AND incident.condition_key=$2 AND evidence.cycle_id=$3
        ORDER BY evidence.observed_at DESC LIMIT 1`, [code, `${code}:v1:${naturalKeys[code]}`, result.cycleId]);
      assert.ok(incident.id, `${code} did not reconcile a real-source incident with simulator tables unavailable`);
      assert.equal(incident.lifecycle, "open");
      assert.equal(incident.conditionKey, `${code}:v1:${naturalKeys[code]}`);
      assert.equal(incident.cycleId, result.cycleId);
    }

    const persisted = await server.database.queryAll(`SELECT cycle.cycle_id AS "cycleId",query.rule_code AS "ruleCode",
      query.adapter_kind AS "adapterKind",cycle.status,cycle.complete,cycle.full_evaluation AS "fullEvaluation"
      FROM monitor_poll_cycle cycle JOIN monitor_detection_query query ON query.query_id=cycle.query_id
      WHERE cycle.cycle_id=ANY($1::uuid[]) ORDER BY query.rule_code`, [Object.values(cycleIds)]);
    assert.deepEqual(persisted, codes.map((code) => ({
      cycleId: cycleIds[code], ruleCode: code, adapterKind: "test_database", status: "healthy", complete: true, fullEvaluation: true,
    })));
    const simulatorQueries = await server.database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_detection_query WHERE adapter_kind='simulator'");
    assert.equal(Number(simulatorQueries.count), 0);
  } finally {
    try {
      if (a02Original) await connections.writer.execute(`UPDATE flujo_materiales_detalles SET estado=?,fecha_recepcion=?,
        fecha_creacion=?,fecha_actualizacion=? WHERE id=?`, [a02Original.estado, a02Original.fecha_recepcion,
        a02Original.fecha_creacion, a02Original.fecha_actualizacion, a02Original.id]);
      for (const material of a03Materials) await connections.writer.execute(
        "UPDATE orden_trabajo_materiales SET cantidad_consumida=?,fecha_actualizacion=? WHERE id=?",
        [material.cantidad_consumida, material.fecha_actualizacion, material.id],
      );
      if (a03Original) await connections.writer.execute(`UPDATE ordenes_trabajo SET fecha_inicio_ejecucion=?,fecha_fin_ejecucion=?,
        fecha_eliminacion=?,eliminado=?,fecha_actualizacion=? WHERE id=?`, [a03Original.fecha_inicio_ejecucion,
        a03Original.fecha_fin_ejecucion, a03Original.fecha_eliminacion, a03Original.eliminado, a03Original.fecha_actualizacion, a03Original.id]);
      if (a05Original) await connections.writer.execute(`UPDATE articulo_serial SET tipo=?,estado=?,fecha_creacion=?,
        fecha_actualizacion=?,id_almacen=? WHERE id=?`, [a05Original.tipo, a05Original.estado, a05Original.fecha_creacion,
        a05Original.fecha_actualizacion, a05Original.id_almacen, a05Original.id]);
      if (a05WorkOrder) await connections.writer.execute("UPDATE ordenes_trabajo SET fecha_fin_ejecucion=?,fecha_actualizacion=? WHERE id=?",
        [a05WorkOrder.fecha_fin_ejecucion, a05WorkOrder.fecha_actualizacion, a05WorkOrder.id]);

      if (a02Original) {
        const [rows] = await connections.writer.query(`SELECT id,estado,fecha_recepcion,fecha_creacion,fecha_actualizacion
          FROM flujo_materiales_detalles WHERE id=?`, [a02Original.id]);
        assert.deepEqual({ ...(rows as Array<Record<string, unknown>>)[0] }, a02Original, "6.1c A02 fixture was not restored exactly");
      }
      if (a03Original) {
        const [rows] = await connections.writer.query(`SELECT id,fecha_inicio_ejecucion,fecha_fin_ejecucion,
          fecha_eliminacion,eliminado,fecha_actualizacion FROM ordenes_trabajo WHERE id=?`, [a03Original.id]);
        assert.deepEqual({ ...(rows as Array<Record<string, unknown>>)[0] }, a03Original, "6.1c A03 work order was not restored exactly");
        const [materials] = await connections.writer.query(`SELECT id,cantidad_consumida,fecha_actualizacion
          FROM orden_trabajo_materiales WHERE id_orden_trabajo=? AND fecha_eliminacion IS NULL AND eliminado=0 ORDER BY id`, [a03Original.id]);
        assert.deepEqual((materials as Array<Record<string, unknown>>).map((row) => ({ ...row })), a03Materials, "6.1c A03 materials were not restored exactly");
      }
      if (a05Original && a05WorkOrder) {
        const [serials] = await connections.writer.query(`SELECT id,tipo,estado,fecha_creacion,fecha_actualizacion,id_almacen,
          COALESCE(id_orden_trabajo_origen,id_ultimo_orden_trabajo_cierre) AS workOrderId FROM articulo_serial WHERE id=?`, [a05Original.id]);
        assert.deepEqual({ ...(serials as Array<Record<string, unknown>>)[0] }, a05Original, "6.1c A05 serial was not restored exactly");
        const [workOrders] = await connections.writer.query("SELECT id,fecha_fin_ejecucion,fecha_actualizacion FROM ordenes_trabajo WHERE id=?", [a05WorkOrder.id]);
        assert.deepEqual({ ...(workOrders as Array<Record<string, unknown>>)[0] }, a05WorkOrder, "6.1c A05 work order was not restored exactly");
      }
    } finally {
      await Promise.all([connections.close(), server.close()]);
    }
  }
});

test("6.2a preserves trustworthy Monitor state after an incomplete real-adapter read and recovers", async () => {
  await withTrustedA02(async (context) => {
    const failed = await assertFailurePreserved(context, "partial", {
      status: "partial", errorCode: "missing_next_cursor", pageCount: 1,
    });
    assert.equal(failed.pageEvidence.length, 1);
    assert.equal(failed.pageEvidence[0]?.page, 1);
    assert.ok(failed.pageEvidence[0]?.rowCount >= 1);

    const recovered = await poll(context.server, "A02");
    assert.equal(recovered.status, "healthy");
    assert.equal(recovered.complete, true);
    assert.equal(recovered.fullEvaluation, true);
    const incidents = await context.server.database.queryAll("SELECT id,lifecycle FROM monitor_incident WHERE rule_code='A02' ORDER BY occurrence");
    assert.deepEqual(incidents, [{ id: context.trustedIncidentId, lifecycle: "open" }]);
    const condition = await context.server.database.queryOne(`SELECT active,last_healthy_cycle_id AS "lastHealthyCycleId"
      FROM monitor_condition_state WHERE query_id=$1`, [recovered.queryId]);
    assert.equal(condition.active, true);
    assert.equal(condition.lastHealthyCycleId, recovered.cycleId);
  });
});

test("6.2b rejects schema-version and missing-field shapes from the real adapter without reconciliation", async () => {
  await withTrustedA02(async (context) => {
    await assertFailurePreserved(context, "invalid_schema", {
      status: "invalid_schema", errorCode: "query_schema_version_mismatch", pageCount: 1,
    });

    const entry = context.server.acceptance!.registry.get("A02")!;
    const realAdapter = entry.adapter;
    assert.ok(realAdapter instanceof TestDatabaseSourceAdapter);
    entry.adapter = {
      async readPage(input) {
        const sourcePage = await realAdapter.readPage(input);
        return {
          ...sourcePage,
          rows: sourcePage.rows.map((row, index) => {
            if (index !== 0) return row;
            const { state: _missingRequiredState, ...invalidShape } = row;
            return invalidShape;
          }),
        };
      },
    };
    try {
      await assertNextFailurePreserved(context, "missing_required_field", {
        status: "invalid_schema", errorCode: "required_field_missing", pageCount: 1,
      });
    } finally {
      entry.adapter = realAdapter;
    }

    const recovered = await poll(context.server, "A02");
    assert.equal(recovered.status, "healthy");
    assert.equal(recovered.complete, true);
    assert.equal(recovered.fullEvaluation, true);
    const condition = await context.server.database.queryOne(`SELECT active,last_healthy_cycle_id AS "lastHealthyCycleId"
      FROM monitor_condition_state WHERE query_id=$1`, [recovered.queryId]);
    assert.equal(condition.active, true);
    assert.equal(condition.lastHealthyCycleId, recovered.cycleId);
  });
});

test("6.2c rejects true partial pagination after one valid real-adapter page", async () => {
  await withTrustedA02(async (context) => {
    const failed = await assertFailurePreserved(context, "partial_pagination", {
      status: "partial", errorCode: "missing_next_cursor", pageCount: 2,
    });
    assert.equal(failed.pageEvidence.length, 2);
    assert.deepEqual(failed.pageEvidence.map(({ page }) => page), [1, 2]);
    assert.equal(failed.pageEvidence[0]?.revision, failed.pageEvidence[1]?.revision);
    assert.equal(failed.pageEvidence[1]?.rowCount, 0);

    const recovered = await poll(context.server, "A02");
    assert.equal(recovered.status, "healthy");
    assert.equal(recovered.complete, true);
    assert.equal(recovered.fullEvaluation, true);
    const condition = await context.server.database.queryOne(`SELECT active,last_healthy_cycle_id AS "lastHealthyCycleId"
      FROM monitor_condition_state WHERE query_id=$1`, [recovered.queryId]);
    assert.equal(condition.active, true);
    assert.equal(condition.lastHealthyCycleId, recovered.cycleId);
  });
});

test("6.2d rejects a duplicate natural key across real-adapter pages without reconciliation", async () => {
  await withTrustedA02(async (context) => {
    const failed = await assertFailurePreserved(context, "duplicate_keys", {
      status: "invalid_schema", errorCode: "duplicate_condition_key_across_pages", pageCount: 2,
    });
    assert.equal(failed.pageEvidence.length, 2);
    assert.deepEqual(failed.pageEvidence.map(({ page }) => page), [1, 2]);
    assert.deepEqual(failed.pageEvidence.map(({ rowCount }) => rowCount), [1, 1]);
    assert.equal(failed.pageEvidence[0]?.revision, failed.pageEvidence[1]?.revision);

    const recovered = await poll(context.server, "A02");
    assert.equal(recovered.status, "healthy");
    assert.equal(recovered.complete, true);
    assert.equal(recovered.fullEvaluation, true);
    const condition = await context.server.database.queryOne(`SELECT active,last_healthy_cycle_id AS "lastHealthyCycleId"
      FROM monitor_condition_state WHERE query_id=$1`, [recovered.queryId]);
    assert.equal(condition.active, true);
    assert.equal(condition.lastHealthyCycleId, recovered.cycleId);
  });
});

test("6.2e rejects source-revision drift across real-adapter pages without reconciliation", async () => {
  await withTrustedA02(async (context) => {
    const failed = await assertFailurePreserved(context, "revision_change", {
      status: "partial", errorCode: "source_revision_changed", pageCount: 2,
    });
    assert.equal(failed.pageEvidence.length, 2);
    assert.deepEqual(failed.pageEvidence.map(({ page }) => page), [1, 2]);
    assert.deepEqual(failed.pageEvidence.map(({ rowCount }) => rowCount), [1, 0]);
    assert.notEqual(failed.pageEvidence[0]?.revision, failed.pageEvidence[1]?.revision);

    const recovered = await poll(context.server, "A02");
    assert.equal(recovered.status, "healthy");
    assert.equal(recovered.complete, true);
    assert.equal(recovered.fullEvaluation, true);
    const condition = await context.server.database.queryOne(`SELECT active,last_healthy_cycle_id AS "lastHealthyCycleId"
      FROM monitor_condition_state WHERE query_id=$1`, [recovered.queryId]);
    assert.equal(condition.active, true);
    assert.equal(condition.lastHealthyCycleId, recovered.cycleId);
  });
});

test("6.3a rejects stale freshness before and after a real-adapter read", async () => {
  await withTrustedA02(async (context) => {
    const beforeRead = await assertFailurePreserved(context, "stale", {
      status: "stale", errorCode: "source_stale", pageCount: 0,
    });
    assert.deepEqual(beforeRead.pageEvidence, []);
    assert.equal(beforeRead.rowCount, 0);
    const beforeEvidence = await persistedFreshness(context.server, beforeRead.cycleId);
    assert.deepEqual(beforeEvidence.freshness, {
      status: "stale", observedAt: beforeEvidence.freshness.observedAt, lagMilliseconds: 86_400_000,
      providerVersion: "test-database-controlled.v1", sourceRevision: beforeEvidence.sourceRevision,
    });

    const source = context.server.acceptance!.source;
    assert.ok(source instanceof TestDatabaseScenarioRepository);
    await source.failFreshnessAfterRead("A02", "stale");
    const afterRead = await assertNextFailurePreserved(context, "stale_after_read", {
      status: "stale", errorCode: "source_became_stale", pageCount: context.trustedPageCount,
    });
    assert.equal(afterRead.pageEvidence.length, context.trustedPageCount);
    assert.ok(afterRead.rowCount >= 1);
    const afterEvidence = await persistedFreshness(context.server, afterRead.cycleId);
    assert.deepEqual(afterEvidence.freshness, {
      status: "stale", observedAt: afterEvidence.freshness.observedAt, lagMilliseconds: 86_400_000,
      providerVersion: "test-database-controlled.v1", sourceRevision: afterEvidence.sourceRevision,
    });
    assert.equal(afterEvidence.sourceRevision, beforeEvidence.sourceRevision);

    const recovered = await poll(context.server, "A02");
    assert.equal(recovered.status, "healthy");
    assert.equal(recovered.complete, true);
    assert.equal(recovered.fullEvaluation, true);
    const condition = await context.server.database.queryOne(`SELECT active,last_healthy_cycle_id AS "lastHealthyCycleId"
      FROM monitor_condition_state WHERE query_id=$1`, [recovered.queryId]);
    assert.equal(condition.active, true);
    assert.equal(condition.lastHealthyCycleId, recovered.cycleId);
  });
});

test("6.3b rejects unknown freshness before and after a real-adapter read", async () => {
  await withTrustedA02(async (context) => {
    const beforeRead = await assertFailurePreserved(context, "unknown_freshness", {
      status: "unknown_freshness", errorCode: "freshness_unknown", pageCount: 0,
    });
    assert.deepEqual(beforeRead.pageEvidence, []);
    assert.equal(beforeRead.rowCount, 0);
    const beforeEvidence = await persistedFreshness(context.server, beforeRead.cycleId);
    assert.deepEqual(beforeEvidence.freshness, {
      status: "unknown", observedAt: beforeEvidence.freshness.observedAt, lagMilliseconds: null,
      providerVersion: "test-database-controlled.v1", sourceRevision: beforeEvidence.sourceRevision,
    });

    const source = context.server.acceptance!.source;
    assert.ok(source instanceof TestDatabaseScenarioRepository);
    await source.failFreshnessAfterRead("A02", "unknown_freshness");
    const afterRead = await assertNextFailurePreserved(context, "unknown_freshness_after_read", {
      status: "unknown_freshness", errorCode: "freshness_became_unknown", pageCount: context.trustedPageCount,
    });
    assert.equal(afterRead.pageEvidence.length, context.trustedPageCount);
    assert.ok(afterRead.rowCount >= 1);
    const afterEvidence = await persistedFreshness(context.server, afterRead.cycleId);
    assert.deepEqual(afterEvidence.freshness, {
      status: "unknown", observedAt: afterEvidence.freshness.observedAt, lagMilliseconds: null,
      providerVersion: "test-database-controlled.v1", sourceRevision: afterEvidence.sourceRevision,
    });
    assert.equal(afterEvidence.sourceRevision, beforeEvidence.sourceRevision);

    const recovered = await poll(context.server, "A02");
    assert.equal(recovered.status, "healthy");
    assert.equal(recovered.complete, true);
    assert.equal(recovered.fullEvaluation, true);
    const condition = await context.server.database.queryOne(`SELECT active,last_healthy_cycle_id AS "lastHealthyCycleId"
      FROM monitor_condition_state WHERE query_id=$1`, [recovered.queryId]);
    assert.equal(condition.active, true);
    assert.equal(condition.lastHealthyCycleId, recovered.cycleId);
  });
});

test("6.3c exhausts bounded real-adapter timeout retries without reconciliation", async () => {
  await withTrustedA02(async (context) => {
    const entry = context.server.acceptance!.registry.get("A02")!;
    const realAdapter = entry.adapter;
    assert.ok(realAdapter instanceof TestDatabaseSourceAdapter);
    const original = {
      timeoutMs: entry.query.timeoutMs,
      retryBaseMs: entry.query.retryBaseMs,
      maxAttempts: entry.query.maxAttempts,
    };
    const attempts: number[] = [];
    entry.query.timeoutMs = 20;
    entry.query.retryBaseMs = 5;
    entry.query.maxAttempts = 2;
    entry.adapter = {
      async readPage(input) {
        attempts.push(performance.now());
        return realAdapter.readPage(input);
      },
    };
    let failed: Awaited<ReturnType<typeof poll>>;
    try {
      await injectFault(context.server, "A02", "timeout");
      failed = await assertNextFailurePreserved(context, "timeout", {
        status: "timeout", errorCode: "query_timeout", pageCount: 0,
      });
    } finally {
      entry.adapter = realAdapter;
      entry.query.timeoutMs = original.timeoutMs;
      entry.query.retryBaseMs = original.retryBaseMs;
      entry.query.maxAttempts = original.maxAttempts;
    }
    assert.equal(attempts.length, 2);
    assert.ok(attempts[1]! - attempts[0]! >= 20, "timeout retry began before the first attempt deadline");
    assert.deepEqual(failed.pageEvidence, []);
    assert.equal(failed.rowCount, 0);
    const freshness = await persistedFreshness(context.server, failed.cycleId);
    assert.deepEqual(freshness.freshness, {
      status: "fresh", observedAt: freshness.freshness.observedAt, lagMilliseconds: 0,
      providerVersion: "test-database-controlled.v1", sourceRevision: freshness.sourceRevision,
    });

    const recovered = await poll(context.server, "A02");
    assert.equal(recovered.status, "healthy");
    assert.equal(recovered.complete, true);
    assert.equal(recovered.fullEvaluation, true);
    const condition = await context.server.database.queryOne(`SELECT active,last_healthy_cycle_id AS "lastHealthyCycleId"
      FROM monitor_condition_state WHERE query_id=$1`, [recovered.queryId]);
    assert.equal(condition.active, true);
    assert.equal(condition.lastHealthyCycleId, recovered.cycleId);
  });
});

test("6.3d exhausts bounded real-adapter transport retries with backoff and no reconciliation", async () => {
  await withTrustedA02(async (context) => {
    const entry = context.server.acceptance!.registry.get("A02")!;
    const realAdapter = entry.adapter;
    assert.ok(realAdapter instanceof TestDatabaseSourceAdapter);
    const original = {
      retryBaseMs: entry.query.retryBaseMs,
      maxAttempts: entry.query.maxAttempts,
    };
    const attempts: number[] = [];
    entry.query.retryBaseMs = 25;
    entry.query.maxAttempts = 2;
    entry.adapter = {
      async readPage(input) {
        attempts.push(performance.now());
        return realAdapter.readPage(input);
      },
    };
    let failed: Awaited<ReturnType<typeof poll>>;
    try {
      await injectFault(context.server, "A02", "source_error");
      failed = await assertNextFailurePreserved(context, "source_error", {
        status: "source_error", errorCode: "source_query_failed", pageCount: 0,
      });
    } finally {
      entry.adapter = realAdapter;
      entry.query.retryBaseMs = original.retryBaseMs;
      entry.query.maxAttempts = original.maxAttempts;
    }
    assert.equal(attempts.length, 2);
    assert.ok(attempts[1]! - attempts[0]! >= 20, "transport retry skipped the configured backoff");
    assert.deepEqual(failed.pageEvidence, []);
    assert.equal(failed.rowCount, 0);
    const freshness = await persistedFreshness(context.server, failed.cycleId);
    assert.deepEqual(freshness.freshness, {
      status: "fresh", observedAt: freshness.freshness.observedAt, lagMilliseconds: 0,
      providerVersion: "test-database-controlled.v1", sourceRevision: freshness.sourceRevision,
    });

    const recovered = await poll(context.server, "A02");
    assert.equal(recovered.status, "healthy");
    assert.equal(recovered.complete, true);
    assert.equal(recovered.fullEvaluation, true);
    const condition = await context.server.database.queryOne(`SELECT active,last_healthy_cycle_id AS "lastHealthyCycleId"
      FROM monitor_condition_state WHERE query_id=$1`, [recovered.queryId]);
    assert.equal(condition.active, true);
    assert.equal(condition.lastHealthyCycleId, recovered.cycleId);
  });
});

test("6.4a skips an overlapping real-adapter poll while the original poll completes authoritatively", async () => {
  await withTrustedA02(async (context) => {
    const entry = context.server.acceptance!.registry.get("A02")!;
    const realAdapter = entry.adapter;
    assert.ok(realAdapter instanceof TestDatabaseSourceAdapter);
    let releaseRead!: () => void;
    const heldRead = new Promise<void>((resolve) => { releaseRead = resolve; });
    let announceRead!: () => void;
    const readStarted = new Promise<void>((resolve) => { announceRead = resolve; });
    let readCount = 0;
    entry.adapter = {
      async readPage(input) {
        readCount += 1;
        if (readCount === 1) {
          announceRead();
          await heldRead;
        }
        return realAdapter.readPage(input);
      },
    };

    let winner!: Awaited<ReturnType<typeof poll>>;
    let overlapping!: Awaited<ReturnType<typeof poll>>;
    const first = context.server.acceptance!.scheduler.runScheduled(entry.query, entry.adapter);
    try {
      await readStarted;
      overlapping = await context.server.acceptance!.scheduler.runScheduled(entry.query, entry.adapter);
      assert.equal(readCount, 1, "overlapping poll reached the source adapter");
      assert.deepEqual(await authoritySnapshot(context.server), context.trustedAuthority, "overlapping poll changed Monitor authority");
    } finally {
      releaseRead();
      winner = await first;
      entry.adapter = realAdapter;
    }

    assert.equal(overlapping.status, "overlap_skipped");
    assert.equal(overlapping.errorCode, "query_already_running");
    assert.equal(overlapping.complete, false);
    assert.equal(overlapping.fullEvaluation, false);
    assert.equal(overlapping.pageCount, 0);
    assert.equal(overlapping.rowCount, 0);
    assert.deepEqual(overlapping.pageEvidence, []);
    assert.equal(winner.status, "healthy");
    assert.equal(winner.complete, true);
    assert.equal(winner.fullEvaluation, true);
    assert.equal(readCount, winner.pageCount, "overlapping poll added a real-adapter read");

    const cycles = await context.server.database.queryAll(`SELECT cycle_id AS "cycleId",status,error_code AS "errorCode",
      complete,full_evaluation AS "fullEvaluation",page_count AS "pageCount",row_count AS "rowCount"
      FROM monitor_poll_cycle WHERE cycle_id=ANY($1::uuid[]) ORDER BY status`, [[winner.cycleId, overlapping.cycleId]]);
    assert.deepEqual(cycles, [
      { cycleId: winner.cycleId, status: "healthy", errorCode: null, complete: true, fullEvaluation: true, pageCount: winner.pageCount, rowCount: winner.rowCount },
      { cycleId: overlapping.cycleId, status: "overlap_skipped", errorCode: "query_already_running", complete: false, fullEvaluation: false, pageCount: 0, rowCount: 0 },
    ]);
    const condition = await context.server.database.queryOne(`SELECT active,last_healthy_cycle_id AS "lastHealthyCycleId"
      FROM monitor_condition_state WHERE query_id=$1`, [winner.queryId]);
    assert.equal(condition.active, true);
    assert.equal(condition.lastHealthyCycleId, winner.cycleId);
  });
});

test("6.4b blocks source access without creating an incident and recovers only after access returns", async () => {
  const server = await buildMonitorServer({
    config: {
      nodeEnv: "test", cookieSecret: "stage5-blocked-source-connected-secret", allowMockAuth: true,
      enableScenarioLab: true, scenarioSource: "test_database", databaseMode: "pglite", pgliteDataDir: "memory://",
    },
  });
  const connections = await TestDatabaseConnections.create(repositoryRoot);
  const resetLock = resolve(repositoryRoot, "local-data/test-database/state/reset.lock");
  let lockCreated = false;
  let original: Record<string, unknown> | undefined;
  try {
    assert.ok(server.acceptance?.source instanceof TestDatabaseScenarioRepository);
    const flowId = server.acceptance.source.fixtureIds.A02.flowId;
    const [rows] = await connections.writer.query(`SELECT id,estado,fecha_recepcion,fecha_creacion,fecha_actualizacion
      FROM flujo_materiales_detalles WHERE id=?`, [flowId]);
    original = { ...(rows as Array<Record<string, unknown>>)[0] };
    assert.equal(Number(original.id), flowId);
    await connections.writer.execute(`UPDATE flujo_materiales_detalles SET estado='TRANSITO',fecha_recepcion=NULL,
      fecha_creacion=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 31 MINUTE) WHERE id=?`, [flowId]);
    assert.equal(Number((await server.database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_incident WHERE rule_code='A02'")).count), 0);
    const authorityBefore = await authoritySnapshot(server);

    await mkdir(resetLock);
    lockCreated = true;
    const entry = server.acceptance.registry.get("A02")!;
    assert.ok(entry.adapter instanceof TestDatabaseSourceAdapter);
    const blocked = await server.acceptance.scheduler.runScheduled(entry.query, entry.adapter);
    assert.equal(blocked.status, "source_error");
    assert.equal(blocked.errorCode, "source_query_failed");
    assert.equal(blocked.complete, false);
    assert.equal(blocked.fullEvaluation, false);
    assert.equal(blocked.pageCount, 0);
    assert.equal(blocked.rowCount, 0);
    assert.deepEqual(blocked.pageEvidence, []);
    assert.deepEqual(await authoritySnapshot(server), authorityBefore, "blocked source access changed Monitor authority");
    const blockedCycle = await server.database.queryOne(`SELECT status,error_code AS "errorCode",complete,
      full_evaluation AS "fullEvaluation",page_count AS "pageCount",row_count AS "rowCount"
      FROM monitor_poll_cycle WHERE cycle_id=$1`, [blocked.cycleId]);
    assert.deepEqual(blockedCycle, {
      status: "source_error", errorCode: "source_query_failed", complete: false,
      fullEvaluation: false, pageCount: 0, rowCount: 0,
    });
    assert.equal(Number((await server.database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_incident WHERE rule_code='A02'")).count), 0);

    await rmdir(resetLock);
    lockCreated = false;
    const recovered = await poll(server, "A02");
    assert.equal(recovered.status, "healthy");
    assert.equal(recovered.complete, true);
    assert.equal(recovered.fullEvaluation, true);
    const incident = await server.database.queryOne(`SELECT incident.id,incident.lifecycle,incident.condition_key AS "conditionKey",
      evidence.cycle_id AS "cycleId",evidence.evidence FROM monitor_incident incident
      JOIN monitor_incident_evidence evidence ON evidence.incident_id=incident.id
      WHERE incident.rule_code='A02' AND incident.condition_key=$1 ORDER BY evidence.observed_at DESC LIMIT 1`, [`A02:v1:${flowId}`]);
    assert.ok(incident.id);
    assert.equal(incident.lifecycle, "open");
    assert.equal(incident.conditionKey, `A02:v1:${flowId}`);
    assert.equal(incident.cycleId, recovered.cycleId);
    assert.equal(Number((incident.evidence as Record<string, unknown>).materialFlowDetailId), flowId);
  } finally {
    try {
      if (lockCreated) await rmdir(resetLock);
      if (original) {
        await connections.writer.execute(`UPDATE flujo_materiales_detalles SET estado=?,fecha_recepcion=?,
          fecha_creacion=?,fecha_actualizacion=? WHERE id=?`, [original.estado, original.fecha_recepcion,
          original.fecha_creacion, original.fecha_actualizacion, original.id]);
        const [rows] = await connections.writer.query(`SELECT id,estado,fecha_recepcion,fecha_creacion,fecha_actualizacion
          FROM flujo_materiales_detalles WHERE id=?`, [original.id]);
        assert.deepEqual({ ...(rows as Array<Record<string, unknown>>)[0] }, original, "blocked-source fixture was not restored exactly");
      }
    } finally {
      await Promise.all([connections.close(), server.close()]);
    }
  }
});

test("6.5a proves the live monitor_source_ro account cannot write test_database", async () => {
  const connections = await TestDatabaseConnections.create(repositoryRoot);
  const monitor = await connections.monitor.getConnection();
  try {
    const [identityRows] = await monitor.query("SELECT CURRENT_USER() AS currentUser,DATABASE() AS databaseName");
    const identity = (identityRows as Array<{ currentUser: string; databaseName: string }>)[0];
    assert.ok(identity);
    assert.match(identity.currentUser, /^monitor_source_ro@/);
    assert.equal(identity.databaseName, "test_database");

    const [grantRows] = await monitor.query("SHOW GRANTS FOR CURRENT_USER()");
    const grants = (grantRows as Array<Record<string, unknown>>).map((row) => String(Object.values(row)[0])).sort();
    assert.deepEqual(grants, [
      "GRANT SELECT, SHOW VIEW ON `test_database`.* TO `monitor_source_ro`@`%`",
      "GRANT USAGE ON *.* TO `monitor_source_ro`@`%`",
    ]);

    const [beforeRows] = await connections.writer.query("SELECT * FROM _prisma_migrations ORDER BY id");
    const before = (beforeRows as Array<Record<string, unknown>>).map((row) => ({ ...row }));
    const denied = async (statement: string) => {
      let failure: unknown;
      try { await monitor.query(statement); }
      catch (error) { failure = error; }
      assert.ok(failure instanceof Error, `Monitor operation unexpectedly succeeded: ${statement}`);
      const mysqlFailure = failure as Error & { errno?: number };
      assert.ok([1044, 1142, 1143, 1227].includes(Number(mysqlFailure.errno)), mysqlFailure.message);
      assert.match(mysqlFailure.message, /denied/i);
    };
    await denied(`INSERT INTO test_database._prisma_migrations
      (id,checksum,migration_name,started_at,applied_steps_count)
      SELECT 'monitor-6-5a-denied','x','x',CURRENT_TIMESTAMP(3),0 WHERE FALSE`);
    await denied("UPDATE test_database._prisma_migrations SET checksum=checksum WHERE 1=0");
    await denied("DELETE FROM test_database._prisma_migrations WHERE 1=0");

    const [afterRows] = await connections.writer.query("SELECT * FROM _prisma_migrations ORDER BY id");
    assert.deepEqual((afterRows as Array<Record<string, unknown>>).map((row) => ({ ...row })), before);
  } finally {
    monitor.release();
    await connections.close();
  }
});

test("6.5b proves every canonical source action is isolated from Monitor-owned state", async () => {
  const serviceSource = await readFile(resolve(repositoryRoot, "apps/api/src/scenario-source-action-service.ts"), "utf8");
  assert.doesNotMatch(serviceSource, /@monitor\/database/);
  assert.doesNotMatch(serviceSource, /\bmonitor_[a-z0-9_]+\b/);
  await assertCanonicalSourceActionIsolation();
});
