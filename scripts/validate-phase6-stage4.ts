import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadTestDatabaseFixtureSeeds, TestDatabaseConnections, TestDatabaseScenarioRepository } from "@monitor/detection";
import { buildMonitorServer } from "../apps/api/src/server.js";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const fixtureSeedIds = await loadTestDatabaseFixtureSeeds(repositoryRoot);
const sourceConnections = await TestDatabaseConnections.create(repositoryRoot);
const sourceRepository = await TestDatabaseScenarioRepository.create(sourceConnections, repositoryRoot, fixtureSeedIds);
const sourceIds = sourceRepository.fixtureIds;

const sourceRow = async (sql: string, parameters: unknown[]) => {
  const [rows] = await sourceConnections.writer.query(sql, parameters);
  return { ...((rows as Array<Record<string, unknown>>)[0] ?? {}) };
};
const sourceRows = async (sql: string, parameters: unknown[]) => {
  const [rows] = await sourceConnections.writer.query(sql, parameters);
  return (rows as Array<Record<string, unknown>>).map((row) => ({ ...row }));
};
const restoreRow = async (table: string, row: Record<string, unknown>) => {
  assert.match(table, /^[a-z_][a-z0-9_]*$/i);
  assert.ok(Number.isSafeInteger(Number(row.id)));
  const columns = Object.keys(row).filter((column) => column !== "id");
  assert.ok(columns.length > 0 && columns.every((column) => /^[a-z_][a-z0-9_]*$/i.test(column)));
  await sourceConnections.writer.execute(
    `UPDATE \`${table}\` SET ${columns.map((column) => `\`${column}\`=?`).join(",")} WHERE id=?`,
    [...columns.map((column) => row[column] as string | number | Date | null), Number(row.id)],
  );
};
const insertRow = async (table: string, row: Record<string, unknown>) => {
  assert.match(table, /^[a-z_][a-z0-9_]*$/i);
  const columns = Object.keys(row);
  assert.ok(columns.length > 0 && columns.every((column) => /^[a-z_][a-z0-9_]*$/i.test(column)));
  await sourceConnections.writer.execute(
    `INSERT INTO \`${table}\` (${columns.map((column) => `\`${column}\``).join(",")}) VALUES (${columns.map(() => "?").join(",")})`,
    columns.map((column) => row[column] as string | number | Date | null),
  );
};

const a05WorkOrder = await sourceRow(`SELECT work_order.* FROM ordenes_trabajo work_order
  JOIN articulo_serial serial ON work_order.id=COALESCE(serial.id_orden_trabajo_origen,serial.id_ultimo_orden_trabajo_cierre)
  WHERE serial.id=?`, [sourceIds.A05.serialId]);
const sourceBefore = {
  a02: await sourceRow("SELECT * FROM flujo_materiales_detalles WHERE id=?", [sourceIds.A02.flowId]),
  a03WorkOrder: await sourceRow("SELECT * FROM ordenes_trabajo WHERE id=?", [sourceIds.A03.workOrderId]),
  a03Material: await sourceRow("SELECT * FROM orden_trabajo_materiales WHERE id=?", [sourceIds.A03.materialId]),
  a05Serial: await sourceRow("SELECT * FROM articulo_serial WHERE id=?", [sourceIds.A05.serialId]),
  a05WorkOrder,
  a05Scale: await sourceRows("SELECT * FROM balanza_carga_detalle_registros WHERE id_articulo_serial=? ORDER BY id", [sourceIds.A05.serialId]),
};

const server = await buildMonitorServer({ config: {
  nodeEnv: "test",
  cookieSecret: "phase6-stage4-connected-validation-secret",
  allowMockAuth: true,
  enableScenarioLab: true,
  scenarioSource: "test_database",
  databaseMode: "pglite",
  pgliteDataDir: "memory://",
} });

const headers = { authorization: "Bearer mock:plant-manager" };
const monitorCounts = () => server.database.queryOne(`SELECT
  (SELECT COUNT(*)::int FROM monitor_incident) AS incidents,
  (SELECT COUNT(*)::int FROM monitor_incident_evidence) AS evidence,
  (SELECT COUNT(*)::int FROM monitor_routing_decision) AS routing,
  (SELECT COUNT(*)::int FROM monitor_conversation_incident) AS conversations,
  (SELECT COUNT(*)::int FROM monitor_message) AS messages`);

try {
  // The validator owns these fixture rows for its duration. Establish the required
  // forward-action preconditions, then restore the exact pre-run values in finally.
  await sourceConnections.writer.execute(`UPDATE flujo_materiales_detalles
    SET estado='TRANSITO',fecha_recepcion=NULL,fecha_eliminacion=NULL WHERE id=?`, [sourceIds.A02.flowId]);
  await sourceConnections.writer.execute(`UPDATE ordenes_trabajo
    SET fecha_fin_ejecucion=NULL,fecha_eliminacion=NULL,eliminado=0 WHERE id=?`, [sourceIds.A03.workOrderId]);
  await sourceConnections.writer.execute(`UPDATE orden_trabajo_materiales
    SET cantidad_consumida=0 WHERE id=?`, [sourceIds.A03.materialId]);
  const fixtureKeys = { A02: ["materialFlowDetailId", fixtureSeedIds.A02], A03: ["workOrderId", fixtureSeedIds.A03], A05: ["articleSerialId", fixtureSeedIds.A05] } as const;
  for (const [code, scenario] of [["A02", "past_threshold"], ["A03", "past_threshold"], ["A05", "past_threshold_both"]] as const) {
    const beforeSourceAction = await monitorCounts();
    let response = await server.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/prepare`, headers, payload: { scenario } });
    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(await monitorCounts(), beforeSourceAction, `${code} source preparation wrote Monitor-owned state`);
    const [fixtureKey, fixtureId] = fixtureKeys[code];
    assert.equal(response.json().sourceState.rows[0]?.[fixtureKey], fixtureId, `${code} did not reuse its fixed source fixture`);

    response = await server.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/poll`, headers });
    assert.equal(response.statusCode, 200, response.body);
    const opened = response.json().scenario;
    assert.equal(response.json().result.status, "healthy", `${code} poll was not healthy`);
    assert.equal(opened.actualMonitor.latestIncident?.lifecycle, "open", `${code} did not open`);
    assert.equal(opened.actualMonitor.openIncidentCount, 1, `${code} open count`);
    const evidenceCount = opened.actualMonitor.evidenceCount;

    response = await server.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/poll`, headers });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().scenario.actualMonitor.evidenceCount, evidenceCount, `${code} duplicated unchanged evidence`);

    if (code === "A03") {
      for (const [fault, expectedStatus] of [["source_error", "source_error"], ["partial", "partial"], ["invalid_schema", "invalid_schema"], ["timeout", "timeout"]] as const) {
        response = await server.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/fail-next-poll`, headers, payload: { fault } });
        assert.equal(response.statusCode, 200, response.body);
        response = await server.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/poll`, headers });
        assert.equal(response.statusCode, 200, response.body);
        assert.equal(response.json().result.status, expectedStatus, `${code} ${fault} did not fail the complete poll`);
        assert.equal(response.json().scenario.actualMonitor.latestIncident?.lifecycle, "open", `${code} ${fault} changed incident lifecycle`);
        assert.equal(response.json().scenario.actualMonitor.evidenceCount, evidenceCount, `${code} ${fault} changed incident evidence`);
      }
    }

    const beforeCorrection = await monitorCounts();
    const correctionActions = code === "A02"
      ? ["a02.receive"]
      : code === "A03"
        ? ["a03.record_first_consumption"]
        : ["a05.register_weighing", "a05.register_movement"];
    for (const actionId of correctionActions) {
      response = await server.app.inject({ method: "POST", url: "/api/dev/source-actions", headers, payload: { actionId, key: fixtureId } });
      assert.equal(response.statusCode, 200, response.body);
    }
    assert.deepEqual(await monitorCounts(), beforeCorrection, `${code} source action wrote Monitor-owned state`);

    response = await server.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/poll`, headers });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().result.status, "healthy", `${code} resolution poll was not healthy`);
    assert.equal(response.json().scenario.actualMonitor.latestIncident?.lifecycle, "resolved", `${code} did not resolve`);
  }

  const diagnostics = await server.database.queryAll("SELECT query_id AS \"queryId\",adapter_kind AS \"adapterKind\" FROM monitor_detection_query WHERE rule_code IN ('A02','A03','A05') ORDER BY rule_code");
  assert.deepEqual(diagnostics.map((row) => row.adapterKind), ["test_database", "test_database", "test_database"]);
  console.log("Phase 6 Stage 4 connected source-to-incident validation passed");
} finally {
  try {
    await restoreRow("flujo_materiales_detalles", sourceBefore.a02);
    await restoreRow("ordenes_trabajo", sourceBefore.a03WorkOrder);
    await restoreRow("orden_trabajo_materiales", sourceBefore.a03Material);
    await restoreRow("articulo_serial", sourceBefore.a05Serial);
    await restoreRow("ordenes_trabajo", sourceBefore.a05WorkOrder);
    await sourceConnections.writer.execute("DELETE FROM balanza_carga_detalle_registros WHERE id_articulo_serial=?", [sourceIds.A05.serialId]);
    for (const row of sourceBefore.a05Scale) await insertRow("balanza_carga_detalle_registros", row);
    assert.deepEqual(await sourceRow("SELECT * FROM flujo_materiales_detalles WHERE id=?", [sourceIds.A02.flowId]), sourceBefore.a02);
    assert.deepEqual(await sourceRow("SELECT * FROM ordenes_trabajo WHERE id=?", [sourceIds.A03.workOrderId]), sourceBefore.a03WorkOrder);
    assert.deepEqual(await sourceRow("SELECT * FROM orden_trabajo_materiales WHERE id=?", [sourceIds.A03.materialId]), sourceBefore.a03Material);
    assert.deepEqual(await sourceRow("SELECT * FROM articulo_serial WHERE id=?", [sourceIds.A05.serialId]), sourceBefore.a05Serial);
    assert.deepEqual(await sourceRows("SELECT * FROM balanza_carga_detalle_registros WHERE id_articulo_serial=? ORDER BY id", [sourceIds.A05.serialId]), sourceBefore.a05Scale);
  } finally {
    await Promise.allSettled([server.close(), sourceConnections.close()]);
  }
}
