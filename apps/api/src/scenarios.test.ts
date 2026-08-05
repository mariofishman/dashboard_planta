import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { afterEach, it } from "node:test";
import { io as connectSocket } from "socket.io-client";
import { TestDatabaseConnections, TestDatabaseScenarioRepository } from "@monitor/detection";
import { loadConfig } from "./config.js";
import { buildMonitorServer, type MonitorServer } from "./server.js";
import { assertCanonicalSourceActionIsolation } from "./source-action-isolation.connected.js";

const servers: MonitorServer[] = [];
const repositoryRoot = resolve(import.meta.dirname, "../../..");
const protectedDump = process.env.TEST_DB_DUMP ?? "/Users/mariofishman/projects/dashboard_planta/local-data/database/staging_emusa_core-20260723-025548.sql";
const testDatabaseRuntime = process.env.TEST_DB_RUNTIME_ROOT ?? resolve(dirname(dirname(protectedDump)), "test-database");
const connectedLabAvailable = existsSync(resolve(testDatabaseRuntime, "state/ready"));

afterEach(async () => { await Promise.all(servers.splice(0).map((instance) => instance.close())); });

async function snapshotScenarioPreviewState(instance: MonitorServer) {
  const tables = await instance.database.queryAll(`SELECT tablename
    FROM pg_tables
    WHERE schemaname='public' AND tablename LIKE 'monitor_%'
    ORDER BY tablename`);
  const snapshot: Record<string, unknown[]> = {};
  for (const { tablename } of tables) {
    const table = String(tablename);
    if (!/^monitor_[a-z0-9_]+$/.test(table)) throw new Error(`unsafe_snapshot_table_${table}`);
    snapshot[table] = await instance.database.queryAll(`SELECT row_to_json(snapshot_row) AS row
      FROM (SELECT * FROM ${table}) snapshot_row
      ORDER BY row_to_json(snapshot_row)::text`);
  }
  return snapshot;
}

it("locks the scenario laboratory out of production", () => {
  assert.throws(() => loadConfig({
    nodeEnv: "production", cookieSecret: "phase-4b-production-secret-with-enough-entropy", allowMockAuth: false, enableScenarioLab: true,
  }), /Scenario laboratory is local development and test only/);
});

it("keeps the connected preview passive against test_database", { skip: !connectedLabAvailable }, async () => {
  const connections = await TestDatabaseConnections.create(repositoryRoot);
  const source = await TestDatabaseScenarioRepository.create(connections, repositoryRoot);
  const instance = await buildMonitorServer({
    config: {
      nodeEnv: "test", cookieSecret: "phase-6-preview-passivity-secret-with-enough-entropy", allowMockAuth: true,
      enableScenarioLab: true, scenarioSource: "test_database", databaseMode: "pglite", pgliteDataDir: "memory://",
    },
  });
  servers.push(instance);
  const manager = { authorization: "Bearer mock:plant-manager" };
  const checksumTables = [
    "articulo_serial", "balanza_carga_detalle_registros", "flujo_materiales_detalles", "orden_trabajo_materiales", "ordenes_trabajo",
  ];
  const checksums = async () => {
    const [rows] = await connections.writer.query(`CHECKSUM TABLE ${checksumTables.map((table) => `test_database.\`${table}\``).join(",")}`);
    return rows;
  };
  try {
    const latestSourceTimestamp = await source.latestSourceTimestamp();
    const created = await instance.app.inject({ method: "POST", url: "/api/dev/scenario-runtime", headers: manager, payload: {
      name: "Preview passivity", businessTime: latestSourceTimestamp, runId: "preview-passivity",
      manifestVersion: "stage5.v2", pollingFrequencyMinutes: 3, sourceLookbackDays: -30,
    } });
    assert.equal(created.statusCode, 200, created.body);
    const monitorBefore = await snapshotScenarioPreviewState(instance);
    const sourceBefore = await checksums();
    const selections = [
      ["A02", source.fixtureIds.A02.flowId],
      ["A03", source.fixtureIds.A03.workOrderId],
      ["A05", source.fixtureIds.A05.serialId],
    ] as const;
    for (const [ruleCode, sourceKey] of selections) {
      for (let refresh = 0; refresh < 2; refresh += 1) {
        const response = await instance.app.inject({
          method: "GET", url: `/api/dev/scenario-alert-messages?ruleCode=${ruleCode}&sourceKey=${sourceKey}`, headers: manager,
        });
        assert.equal(response.statusCode, 200, response.body);
      }
    }
    for (const url of ["/api/session", "/api/incidents?", "/api/incidents?"]) {
      const response = await instance.app.inject({ method: "GET", url, headers: manager });
      assert.equal(response.statusCode, 200, `${url}: ${response.body}`);
    }
    assert.deepEqual(await snapshotScenarioPreviewState(instance), monitorBefore, "connected previews must not mutate Monitor tables");
    assert.deepEqual(await checksums(), sourceBefore, "connected previews must not mutate any reset-managed test_database table");
  } finally {
    await connections.close();
  }
});

it("keeps every canonical source action isolated from Monitor until polling", { skip: !connectedLabAvailable },
  assertCanonicalSourceActionIsolation);

it("derives and enforces the earliest experiment start from the latest connected source transaction", { skip: !connectedLabAvailable }, async () => {
  const instance = await buildMonitorServer({
    config: {
      nodeEnv: "test", cookieSecret: "phase-6-source-window-secret-with-enough-entropy", allowMockAuth: true,
      enableScenarioLab: true, scenarioSource: "test_database", databaseMode: "pglite", pgliteDataDir: "memory://",
    },
  });
  servers.push(instance);
  const manager = { authorization: "Bearer mock:plant-manager" };
  const connections = await TestDatabaseConnections.create(repositoryRoot);
  const repository = await TestDatabaseScenarioRepository.create(connections, repositoryRoot);
  try {
    const expected = await repository.latestSourceTimestamp();
    const response = await instance.app.inject({ url: "/api/dev/scenario-source-window", headers: manager });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().earliestExperimentStartAt, expected);
    assert.equal(response.json().defaultSourceLookbackDays, -30);
    const cleanReset = await instance.app.inject({ url: "/api/dev/test-database-reset", headers: manager });
    assert.equal(cleanReset.json().baselineClean, true);
    const rejected = await instance.app.inject({ method: "POST", url: "/api/dev/scenario-runtime", headers: manager, payload: {
      name: "Before source baseline", businessTime: new Date(Date.parse(expected) - 1).toISOString(), runId: "before-source-baseline",
      manifestVersion: "stage5.v2", pollingFrequencyMinutes: 3, sourceLookbackDays: -30,
    } });
    assert.equal(rejected.statusCode, 400, rejected.body);
    assert.equal(rejected.json().error, "scenario_experiment_before_source_baseline");
    const created = await instance.app.inject({ method: "POST", url: "/api/dev/scenario-runtime", headers: manager, payload: {
      name: "Source window", businessTime: expected, runId: "source-window",
      manifestVersion: "stage5.v2", pollingFrequencyMinutes: 3, sourceLookbackDays: -30,
    } });
    assert.equal(created.statusCode, 200, created.body);
    const scenarios = (await instance.app.inject({ url: "/api/dev/scenarios?page=1&pageSize=50&activeOnly=true", headers: manager })).json().scenarios;
    const a02 = scenarios.find((item: { ruleCode: string }) => item.ruleCode === "A02");
    const a05 = scenarios.find((item: { ruleCode: string }) => item.ruleCode === "A05");
    assert.ok(a02.pagination.totalRecords > 100, "the paused experiment must expose the connected A02 window before its first poll");
    assert.ok(a05.pagination.totalRecords > 100, "the paused experiment must expose the connected A05 window before its first poll");
    assert.equal(a02.sourceState.rows.length, 50);
    assert.equal(a05.sourceState.rows.length, 50);
    const firstPageDispatches = a02.sourceState.rows.map((row: { dispatchedAt: string }) => Date.parse(row.dispatchedAt));
    assert.deepEqual(firstPageDispatches, [...firstPageDispatches].sort((left, right) => right - left), "A02 presents the newest dispatches first");
    const oldestPage = (await instance.app.inject({
      url: `/api/dev/scenarios?page=${a02.pagination.totalPages}&pageSize=50&activeOnly=true`, headers: manager,
    })).json().scenarios.find((item: { ruleCode: string }) => item.ruleCode === "A02");
    assert.ok(Date.parse(oldestPage.sourceState.rows[0].dispatchedAt) <= firstPageDispatches.at(-1)!, "the final A02 page contains older dispatches than the first page");
    const experimentId = created.json().experiment.id;
    const narrowed = await instance.app.inject({ method: "PUT", url: `/api/dev/scenario-runtime/${experimentId}/source-window`, headers: manager, payload: { sourceLookbackDays: -3 } });
    assert.equal(narrowed.statusCode, 200, narrowed.body);
    const narrowedScenarios = (await instance.app.inject({ url: "/api/dev/scenarios?page=1&pageSize=50&activeOnly=true", headers: manager })).json().scenarios;
    const narrowedA02 = narrowedScenarios.find((item: { ruleCode: string }) => item.ruleCode === "A02");
    assert.ok(narrowedA02.pagination.totalRecords < a02.pagination.totalRecords, "shortening the source window must reduce the connected A02 record count");
    const running = await instance.app.inject({ method: "POST", url: `/api/dev/scenario-runtime/${experimentId}/pause`, headers: manager, payload: { paused: false } });
    assert.equal(running.statusCode, 200, running.body);
    const beforeFirstPoll = (await instance.app.inject({ url: "/api/dev/scenarios?page=1&pageSize=50&activeOnly=true", headers: manager })).json().scenarios;
    assert.ok(beforeFirstPoll.every((item: { expectedResult: { awaitingPoll: boolean } }) => item.expectedResult.awaitingPoll === false),
      "starting an unchanged source window must not report a pending source change");
    await instance.app.inject({ method: "POST", url: `/api/dev/scenario-runtime/${experimentId}/pause`, headers: manager, payload: { paused: true } });
  } finally {
    await connections.close();
  }
});

it("executes the canonical source-action endpoint against test_database and restores its fixture", { skip: !connectedLabAvailable }, async () => {
  const instance = await buildMonitorServer({
    config: {
      nodeEnv: "test", cookieSecret: "phase-6-connected-action-secret-with-enough-entropy", allowMockAuth: true,
      enableScenarioLab: true, scenarioSource: "test_database", databaseMode: "pglite", pgliteDataDir: "memory://",
    },
  });
  servers.push(instance);
  const manager = { authorization: "Bearer mock:plant-manager" };
  const experiment = await instance.app.inject({ method: "POST", url: "/api/dev/scenario-runtime", headers: manager, payload: {
    name: "Connected editable history", businessTime: "2026-08-01T09:00:00.000Z", runId: "connected-editable-history",
    manifestVersion: "stage5.v2", pollingFrequencyMinutes: 3,
  } });
  assert.equal(experiment.statusCode, 200, experiment.body);
  const connections = await TestDatabaseConnections.create(repositoryRoot);
  const repository = await TestDatabaseScenarioRepository.create(connections, repositoryRoot);
  const workOrderId = repository.fixtureIds.A03.workOrderId;
  const materialId = repository.fixtureIds.A03.materialId;
  const flowId = repository.fixtureIds.A02.flowId;
  const [dispatchesBefore] = await connections.writer.query("SELECT id FROM flujo_materiales_detalles WHERE observacion='MONITOR-STAGE5-A02-DISPATCH'");
  const existingDispatchIds = new Set((dispatchesBefore as Array<{ id: number }>).map((row) => Number(row.id)));
  let createdFlowId: number | null = null;
  const [workOrderBefore] = await connections.writer.query(`SELECT fecha_inicio_ejecucion,fecha_fin_ejecucion,fecha_eliminacion,eliminado,fecha_actualizacion
    FROM ordenes_trabajo WHERE id=?`, [workOrderId]);
  const [materialBefore] = await connections.writer.query("SELECT cantidad_consumida,fecha_actualizacion FROM orden_trabajo_materiales WHERE id=?", [materialId]);
  try {
    await connections.writer.execute(`UPDATE ordenes_trabajo SET fecha_inicio_ejecucion=UTC_TIMESTAMP(),fecha_fin_ejecucion=NULL,
      fecha_eliminacion=NULL,eliminado=0 WHERE id=?`, [workOrderId]);
    await connections.writer.execute("UPDATE orden_trabajo_materiales SET cantidad_consumida=0 WHERE id=?", [materialId]);
    const retiredCorrection = await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A03/correct", headers: { authorization: "Bearer mock:plant-manager" } });
    assert.equal(retiredCorrection.statusCode, 410);
    assert.equal(retiredCorrection.json().error, "source_action_endpoint_replaced");
    const response = await instance.app.inject({
      method: "POST", url: "/api/dev/source-actions", headers: { authorization: "Bearer mock:plant-manager" },
      payload: { actionId: "a03.record_first_consumption", key: workOrderId },
    });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().execution.actionId, "a03.record_first_consumption");
    assert.equal(response.json().execution.writerIdentity, "alertas_fake");
    assert.equal(response.json().execution.naturalKey.value, workOrderId);
    const [materialAfter] = await connections.writer.query("SELECT cantidad_consumida FROM orden_trabajo_materiales WHERE id=?", [materialId]);
    assert.equal(Number((materialAfter as Array<{ cantidad_consumida: unknown }>)[0]?.cantidad_consumida), 1);

    const dispatch = await instance.app.inject({
      method: "POST", url: "/api/dev/source-actions", headers: { authorization: "Bearer mock:plant-manager" },
      payload: { actionId: "a02.prepare_dispatch", key: flowId, input: { materialName: "Material laboratorio editable", quantity: 2 } },
    });
    assert.equal(dispatch.statusCode, 200, dispatch.body);
    const dispatchExecution = dispatch.json().execution as { sourceDiff: { changes: Array<{ table: string; key: number }>; after: Array<{ table: string; key: number; values: Record<string, unknown> }> } };
    createdFlowId = Number(dispatchExecution.sourceDiff.changes.find((change) => change.table === "flujo_materiales_detalles"
      && !existingDispatchIds.has(Number(change.key)) && Number(change.key) !== flowId)?.key);
    assert.ok(Number.isSafeInteger(createdFlowId) && createdFlowId > 0);
    const createdEvidence = dispatchExecution.sourceDiff.after.find((record) => record.table === "flujo_materiales_detalles" && Number(record.key) === createdFlowId)?.values;
    assert.equal(createdEvidence?.estado, "TRANSITO");
    assert.equal(createdEvidence?.nombre_articulo, "Material laboratorio editable");
    assert.equal(Number(createdEvidence?.cantidad_entransito_uso), 2);
    const dirtyReset = await instance.app.inject({ url: "/api/dev/test-database-reset", headers: manager });
    assert.equal(dirtyReset.json().baselineClean, false, "a source mutation must enable the database reset control");
    const dispatchStatus = await instance.app.inject({ url: "/api/dev/scenarios?page=1&pageSize=50&activeOnly=true", headers: manager });
    const dispatchScenario = dispatchStatus.json().scenarios.find((item: { ruleCode: string }) => item.ruleCode === "A02");
    assert.equal(dispatchScenario.records.find((record: { key: number }) => record.key === createdFlowId)?.pendingPoll, true);
    const receipt = await instance.app.inject({
      method: "POST", url: "/api/dev/source-actions", headers: { authorization: "Bearer mock:plant-manager" },
      payload: { actionId: "a02.receive", key: createdFlowId },
    });
    assert.equal(receipt.statusCode, 200, receipt.body);
    const receivedEvidence = receipt.json().execution.sourceDiff.after.find((record: { table: string; key: number }) => record.table === "flujo_materiales_detalles" && Number(record.key) === createdFlowId)?.values;
    assert.equal(receivedEvidence?.estado, "RECIBIDO");
    const history = await instance.app.inject({ url: "/api/dev/scenario-operational-history?code=A02&timingOutcome=on_time", headers: manager });
    assert.equal(history.statusCode, 200, history.body);
    const historyItem = history.json().items.find((item: { sourceKey: number; experimentName: string }) =>
      item.sourceKey === createdFlowId && item.experimentName === "Connected editable history");
    assert.ok(historyItem);
    assert.deepEqual(historyItem.timeline.map((event: { actionId: string }) => event.actionId), ["a02.prepare_dispatch", "a02.receive"]);
    assert.equal(historyItem.currentSource.materialName, "Material laboratorio editable");
    assert.equal(historyItem.currentSource.state, "RECIBIDO");
    assert.equal(historyItem.incidentCount, 0);
    const experimentId = experiment.json().experiment.id;
    await instance.app.inject({ method: "POST", url: `/api/dev/scenario-runtime/${experimentId}/pause`, headers: manager, payload: { paused: false } });
    const armedFailure = await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/fail-next-poll", headers: manager, payload: { fault: "partial" } });
    assert.equal(armedFailure.statusCode, 200, armedFailure.body);
    const failedAdvance = await instance.app.inject({ method: "POST", url: `/api/dev/scenario-runtime/${experimentId}/advance`, headers: manager, payload: { minutes: 3 } });
    assert.equal(failedAdvance.statusCode, 200, failedAdvance.body);
    assert.equal(failedAdvance.json().polls.find((poll: { ruleCode: string }) => poll.ruleCode === "A02")?.result.status, "partial");
    const afterFailedPoll = await instance.app.inject({ url: "/api/dev/scenarios?page=1&pageSize=50&activeOnly=true", headers: manager });
    const a02AfterFailedPoll = afterFailedPoll.json().scenarios.find((item: { ruleCode: string }) => item.ruleCode === "A02");
    assert.equal(a02AfterFailedPoll.records.find((record: { key: number }) => record.key === createdFlowId)?.pendingPoll, true,
      "an incomplete poll must not acknowledge a source action");
    const failedEvents = await instance.app.inject({ url: `/api/dev/scenario-experiments/${experimentId}`, headers: manager });
    assert.equal(failedEvents.json().events.some((event: { eventType: string; ruleCode: string }) => event.eventType === "poll_failed" && event.ruleCode === "A02"), true);
    const advanced = await instance.app.inject({ method: "POST", url: `/api/dev/scenario-runtime/${experimentId}/advance`, headers: manager, payload: { minutes: 3 } });
    assert.equal(advanced.statusCode, 200, advanced.body);
    const afterPoll = await instance.app.inject({ url: "/api/dev/scenarios?page=1&pageSize=50", headers: manager });
    const a02AfterPoll = afterPoll.json().scenarios.find((item: { ruleCode: string }) => item.ruleCode === "A02");
    assert.equal(a02AfterPoll.records.find((record: { key: number }) => record.key === createdFlowId)?.pendingPoll, false);

    const [negativeBefore] = await connections.writer.query(`SELECT id,estado,fecha_recepcion,fecha_actualizacion
      FROM flujo_materiales_detalles WHERE id=?`, [createdFlowId]);
    for (const payload of [
      { actionId: "a02.receive", key: createdFlowId },
      { actionId: "a02.cancel", key: createdFlowId, authority: "origin" },
      { actionId: "a02.reject", key: createdFlowId, authority: "destination" },
    ]) {
      const rejected = await instance.app.inject({ method: "POST", url: "/api/dev/source-actions", headers: manager, payload });
      assert.equal(rejected.statusCode, 409, rejected.body);
      assert.equal(rejected.json().error, "movement_terminal");
    }
    const [negativeAfter] = await connections.writer.query(`SELECT id,estado,fecha_recepcion,fecha_actualizacion
      FROM flujo_materiales_detalles WHERE id=?`, [createdFlowId]);
    assert.deepEqual(negativeAfter, negativeBefore, "terminal A02 API attempts must not change source state");

    const closed = await instance.app.inject({ method: "POST", url: "/api/dev/source-actions", headers: manager,
      payload: { actionId: "a03.close_work_order", key: workOrderId } });
    assert.equal(closed.statusCode, 200, closed.body);
    const [closedBefore] = await connections.writer.query(`SELECT work_order.fecha_inicio_ejecucion,work_order.fecha_fin_ejecucion,
      work_order.fecha_eliminacion,work_order.eliminado,material.cantidad_consumida
      FROM ordenes_trabajo work_order JOIN orden_trabajo_materiales material ON material.id=? WHERE work_order.id=?`, [materialId, workOrderId]);
    for (const payload of [
      { actionId: "a03.start_work_order", key: workOrderId },
      { actionId: "a03.record_first_consumption", key: workOrderId },
    ]) {
      const rejected = await instance.app.inject({ method: "POST", url: "/api/dev/source-actions", headers: manager, payload });
      assert.equal(rejected.statusCode, 409, rejected.body);
      assert.equal(rejected.json().error, "work_order_closed");
    }
    const removal = await instance.app.inject({ method: "POST", url: "/api/dev/source-actions", headers: manager,
      payload: { actionId: "a03.remove_consumption", key: workOrderId } });
    assert.equal(removal.statusCode, 400, removal.body);
    assert.equal(removal.json().error, "invalid_source_action_id");
    const [closedAfter] = await connections.writer.query(`SELECT work_order.fecha_inicio_ejecucion,work_order.fecha_fin_ejecucion,
      work_order.fecha_eliminacion,work_order.eliminado,material.cantidad_consumida
      FROM ordenes_trabajo work_order JOIN orden_trabajo_materiales material ON material.id=? WHERE work_order.id=?`, [materialId, workOrderId]);
    assert.deepEqual(closedAfter, closedBefore, "closed A03 API attempts must not reactivate work or remove consumption");

    const recurrence = await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A05/recur", headers: manager });
    assert.equal(recurrence.statusCode, 409, recurrence.body);
    assert.equal(recurrence.json().error, "source_lifecycle_recurrence_unsupported");
  } finally {
    const workOrder = (workOrderBefore as Array<Record<string, unknown>>)[0]!;
    const material = (materialBefore as Array<Record<string, unknown>>)[0]!;
    await connections.writer.execute(`UPDATE ordenes_trabajo SET fecha_inicio_ejecucion=?,fecha_fin_ejecucion=?,fecha_eliminacion=?,eliminado=?,fecha_actualizacion=? WHERE id=?`,
      [workOrder.fecha_inicio_ejecucion, workOrder.fecha_fin_ejecucion, workOrder.fecha_eliminacion, workOrder.eliminado, workOrder.fecha_actualizacion, workOrderId] as Array<string | number | Date | null>);
    await connections.writer.execute("UPDATE orden_trabajo_materiales SET cantidad_consumida=?,fecha_actualizacion=? WHERE id=?",
      [material.cantidad_consumida, material.fecha_actualizacion, materialId] as Array<string | number | Date | null>);
    const [dispatchesAfter] = await connections.writer.query("SELECT id FROM flujo_materiales_detalles WHERE observacion='MONITOR-STAGE5-A02-DISPATCH'");
    for (const row of dispatchesAfter as Array<{ id: number }>) {
      const id = Number(row.id);
      if (!existingDispatchIds.has(id)) await connections.writer.execute("DELETE FROM flujo_materiales_detalles WHERE id=?", [id]);
    }
    await connections.close();
  }
});

it("prepares connected mixed populations through the shared API and restores every fixture", { skip: !connectedLabAvailable }, async () => {
  const fixtureDocument = JSON.parse(await readFile(resolve(repositoryRoot, "config/detection/fixtures/test-database-stage5.v1.json"), "utf8")) as {
    a02: { concurrent: number[] }; a03: { concurrent: number[] };
  };
  const a02Keys = fixtureDocument.a02.concurrent;
  const a03Keys = fixtureDocument.a03.concurrent;
  const connections = await TestDatabaseConnections.create(repositoryRoot);
  const [a02Before] = await connections.writer.query("SELECT id,estado,fecha_recepcion,fecha_creacion,fecha_actualizacion FROM flujo_materiales_detalles WHERE id IN (?,?,?) ORDER BY id", a02Keys);
  const [workOrdersBefore] = await connections.writer.query("SELECT id,fecha_inicio_ejecucion,fecha_fin_ejecucion,fecha_eliminacion,eliminado,fecha_actualizacion FROM ordenes_trabajo WHERE id IN (?,?,?,?) ORDER BY id", a03Keys);
  const [materialsBefore] = await connections.writer.query("SELECT id,cantidad_consumida,fecha_actualizacion FROM orden_trabajo_materiales WHERE id_orden_trabajo IN (?,?) AND eliminado=0 ORDER BY id", a03Keys.slice(0, 2));
  const instance = await buildMonitorServer({
    config: {
      nodeEnv: "test", cookieSecret: "phase-6-connected-population-secret-with-enough-entropy", allowMockAuth: true,
      enableScenarioLab: true, scenarioSource: "test_database", databaseMode: "pglite", pgliteDataDir: "memory://",
    },
  });
  servers.push(instance);
  const manager = { authorization: "Bearer mock:plant-manager" };
  try {
    const a02 = await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/prepare-population", headers: manager, payload: { population: "a02_mixed", keys: a02Keys } });
    assert.equal(a02.statusCode, 200, a02.body);
    assert.equal(a02.json().sourceState.rowCount, 3);
    assert.equal(a02.json().sourceState.rows.filter((row: { state: string }) => row.state === "TRANSITO").length, 2);
    const a03 = await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A03/prepare-population", headers: manager, payload: { population: "a03_mixed", keys: a03Keys } });
    assert.equal(a03.statusCode, 200, a03.body);
    assert.equal(a03.json().sourceState.rowCount, 4);
    assert.equal(a03.json().sourceState.rows.filter((row: { active: boolean }) => row.active).length, 3);
  } finally {
    for (const row of a02Before as Array<{ id: number; estado: string; fecha_recepcion: Date | null; fecha_creacion: Date; fecha_actualizacion: Date | null }>) await connections.writer.execute(
      "UPDATE flujo_materiales_detalles SET estado=?,fecha_recepcion=?,fecha_creacion=?,fecha_actualizacion=? WHERE id=?",
      [row.estado, row.fecha_recepcion, row.fecha_creacion, row.fecha_actualizacion, row.id],
    );
    for (const row of workOrdersBefore as Array<{ id: number; fecha_inicio_ejecucion: Date | null; fecha_fin_ejecucion: Date | null; fecha_eliminacion: Date | null; eliminado: number; fecha_actualizacion: Date | null }>) await connections.writer.execute(
      "UPDATE ordenes_trabajo SET fecha_inicio_ejecucion=?,fecha_fin_ejecucion=?,fecha_eliminacion=?,eliminado=?,fecha_actualizacion=? WHERE id=?",
      [row.fecha_inicio_ejecucion, row.fecha_fin_ejecucion, row.fecha_eliminacion, row.eliminado, row.fecha_actualizacion, row.id],
    );
    for (const row of materialsBefore as Array<{ id: number; cantidad_consumida: number | string; fecha_actualizacion: Date | null }>) await connections.writer.execute(
      "UPDATE orden_trabajo_materiales SET cantidad_consumida=?,fecha_actualizacion=? WHERE id=?",
      [row.cantidad_consumida, row.fecha_actualizacion, row.id],
    );
    await connections.close();
  }
});

it("keeps Laboratory routes unavailable when disabled", async () => {
  const instance = await buildMonitorServer({
    config: { nodeEnv: "test", cookieSecret: "phase-4b-disabled-secret-with-enough-entropy", allowMockAuth: true, enableScenarioLab: false, databaseMode: "pglite", pgliteDataDir: "memory://" },
  });
  servers.push(instance);
  assert.equal((await instance.app.inject({ method: "GET", url: "/api/dev/scenarios", headers: { authorization: "Bearer mock:plant-manager" } })).statusCode, 404);
});
