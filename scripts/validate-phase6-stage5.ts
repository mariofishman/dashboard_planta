import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ScenarioExperimentRepository,
  TestDatabaseConnections,
  type ScenarioRuleCode,
  type ScenarioSource,
  type SourceActionId,
  type TestDatabaseFixtureSeeds,
} from "@monitor/detection";
import { createDatabaseRuntime, migrateFoundation } from "@monitor/database";
import { buildMonitorServer, type MonitorServer } from "../apps/api/src/server.js";
import { workerGroupForIncident } from "../apps/api/test/routing-fixtures.js";
import { io as connectSocket } from "socket.io-client";

type TestDefinition = { id: string; group: "shared" | ScenarioRuleCode; title: string; expected: string };
type Result = { id: string; status: "passed" | "failed"; startedAt: string; completedAt: string; evidence: Record<string, unknown>; error?: string };
type Stage5Fixtures = {
  fixtureVersion: string; sourceRevision: string;
  a02: Record<string, number[]>; a03: Record<string, number[]>; a05: Record<string, number[]>;
};

const root = fileURLToPath(new URL("..", import.meta.url));
const runId = process.env.STAGE5_RUN_ID ?? new Date().toISOString().replaceAll(/[-:.]/g, "");
const pgliteDataDir = resolve(root, "local-data/test-database/evidence/stage5", `${runId}-monitor`);
await mkdir(resolve(root, "local-data/test-database/evidence/stage5"), { recursive: true });
const manifest = JSON.parse(await readFile(resolve(root, "config/detection/stage5-connected-acceptance.v1.json"), "utf8")) as { version: string; requiredCount: number; excluded: string[]; tests: TestDefinition[] };
const sourceActionContract = JSON.parse(await readFile(resolve(root, "config/detection/source-actions/stage5-source-actions.v1.json"), "utf8")) as { contractVersion: string };
const fixtures = JSON.parse(await readFile(resolve(root, "config/detection/fixtures/test-database-stage5.v1.json"), "utf8")) as Stage5Fixtures;
assert.equal(manifest.requiredCount, 34);
assert.equal(manifest.tests.length, 34);
assert.equal(new Set(manifest.tests.map(({ id }) => id)).size, 34);
assert.deepEqual(manifest.excluded, ["A02-08", "A03-06", "A05-07"]);

const connections = await TestDatabaseConnections.create(root);
const ledgerDatabase = await createDatabaseRuntime({ mode: "pglite", pgliteDataDir });
await migrateFoundation(ledgerDatabase);
const manager = { authorization: "Bearer mock:plant-manager" };
const supervisor = { authorization: "Bearer mock:shift-supervisor" };
const operator = { authorization: "Bearer mock:machine-operator" };
const rosterAssignment = (id: string, sysUserId: number, person: string, position: string, scope: string, group: string | null = null, operations: string[] = []) => ({
  id, sysUserId, person, position, operations, warehouseType: null, scope, group,
  validFrom: "2026-07-01", validTo: null, state: "active", setupComplete: true,
});
const defaultSeeds: TestDatabaseFixtureSeeds = { A02: 26058, A03: 12198, A05: 141084 };
const experimentRepository = new ScenarioExperimentRepository(ledgerDatabase);
const experimentId = (await experimentRepository.create(`Stage 5 ${runId}`, "2026-08-01T09:00:00.000Z", { A02: 3, A03: 3, A05: 3 }, {
  runId, manifestVersion: manifest.version, sourceActionContractVersion: sourceActionContract.contractVersion,
})).id;
const results: Result[] = [];

const seeds = (code?: ScenarioRuleCode, key?: number): TestDatabaseFixtureSeeds => ({ ...defaultSeeds, ...(code && key ? { [code]: key } : {}) });
const build = async (fixtureSeeds = defaultSeeds, isolated = false): Promise<MonitorServer> => {
  const server = await buildMonitorServer({
    testDatabaseFixtureSeeds: fixtureSeeds,
    config: {
      nodeEnv: "test", cookieSecret: "phase6-stage5-connected-acceptance-secret", allowMockAuth: true,
      enableScenarioLab: true, scenarioSource: "test_database", databaseMode: "pglite", pgliteDataDir: isolated ? "memory://" : pgliteDataDir,
    },
  });
  assert.ok(server.acceptance);
  {
    const response = await server.app.inject({ method: "PUT", url: "/api/roster/assignments", headers: manager, payload: { revision: 0, assignments: [
      rosterAssignment("manager", 9001, "María Torres", "Gerente de fábrica", "factory"),
    ] } });
    assert.equal(response.statusCode, 200, response.body);
  }
  return server;
};
const isolated = async <T>(fixtureSeeds: TestDatabaseFixtureSeeds, execute: (server: MonitorServer) => Promise<T>): Promise<T> => {
  const server = await build(fixtureSeeds, true);
  try { return await execute(server); } finally { await server.close(); }
};

const request = async (server: MonitorServer, method: "GET" | "POST" | "PUT", url: string, payload?: Record<string, unknown>, headers = manager) => {
  const response = await server.app.inject({ method, url, headers, ...(payload ? { payload } : {}) });
  assert.equal(response.statusCode, 200, `${method} ${url}: ${response.body}`);
  return response.json();
};
const poll = (server: MonitorServer, code: ScenarioRuleCode) => request(server, "POST", `/api/dev/scenarios/${code}/poll`);
const prepare = (server: MonitorServer, code: ScenarioRuleCode, scenario: string) => request(server, "POST", `/api/dev/scenarios/${code}/prepare`, { scenario });
const fault = (server: MonitorServer, code: ScenarioRuleCode, value: string) => request(server, "POST", `/api/dev/scenarios/${code}/fail-next-poll`, { fault: value });
const preparePopulation = (server: MonitorServer, code: ScenarioRuleCode, population: string, keys: number[]) => request(server, "POST", `/api/dev/scenarios/${code}/prepare-population`, { population, keys });
const injectMonitorFault = (server: MonitorServer, code: ScenarioRuleCode, fault: string) => request(server, "POST", `/api/dev/scenarios/${code}/inject-monitor-fault`, { fault });
const act = async (server: MonitorServer, actionId: SourceActionId, key?: number, authority?: "origin" | "destination" | "both") => {
  const ruleCode = actionId.slice(0, 3).toUpperCase() as ScenarioRuleCode;
  const status = key === undefined ? await server.acceptance!.source.status(ruleCode) : null;
  const row = status?.sourceState.rows[0] ?? {};
  const resolvedKey = key ?? Number(ruleCode === "A02" ? row.materialFlowDetailId : ruleCode === "A03" ? row.workOrderId : row.articleSerialId);
  assert.ok(Number.isSafeInteger(resolvedKey) && resolvedKey > 0, `${actionId} source key unavailable`);
  return request(server, "POST", "/api/dev/source-actions", { actionId, key: resolvedKey, ...(authority ? { authority } : {}) });
};
const counts = (server: MonitorServer) => server.database.queryOne(`SELECT
  (SELECT COUNT(*)::int FROM monitor_incident) incidents,
  (SELECT COUNT(*)::int FROM monitor_incident_evidence) evidence,
  (SELECT COUNT(*)::int FROM monitor_routing_decision) routing,
  (SELECT COUNT(*)::int FROM monitor_notification_delivery) deliveries,
  (SELECT COUNT(*)::int FROM monitor_conversation_incident) conversation_links,
  (SELECT COUNT(*)::int FROM monitor_message) messages,
  (SELECT COUNT(*)::int FROM monitor_change_event) events`);
const latest = (server: MonitorServer, code: ScenarioRuleCode) => server.database.queryOne(`SELECT id,lifecycle,condition_key AS "conditionKey",occurrence,reasons,
  opened_at AS "openedAt",updated_at AS "updatedAt" FROM monitor_incident WHERE rule_code=$1 ORDER BY occurrence DESC LIMIT 1`, [code]);

const run = async (test: TestDefinition, fixtureSeeds: TestDatabaseFixtureSeeds, execute: (server: MonitorServer, source: ScenarioSource) => Promise<Record<string, unknown>>): Promise<void> => {
  const startedAt = new Date().toISOString();
  const server = await build(fixtureSeeds);
  try {
    const evidence = await execute(server, server.acceptance!.source);
    await experimentRepository.record(experimentId, test.id, "passed", evidence, startedAt);
    results.push({ id: test.id, status: "passed", startedAt, completedAt: new Date().toISOString(), evidence });
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    await experimentRepository.record(experimentId, test.id, "failed", { error: message }, startedAt);
    results.push({ id: test.id, status: "failed", startedAt, completedAt: new Date().toISOString(), evidence: {}, error: message });
  } finally { await server.close(); }
};

const openAndAssert = async (server: MonitorServer, code: ScenarioRuleCode, scenario: string) => {
  const before = await counts(server);
  await prepare(server, code, scenario);
  assert.deepEqual(await counts(server), before, `${code} source action wrote Monitor tables`);
  const opened = await poll(server, code);
  assert.equal(opened.result.status, "healthy");
  assert.equal(opened.scenario.actualMonitor.latestIncident.lifecycle, "open");
  assert.equal(opened.scenario.actualMonitor.openIncidentCount, 1);
  assert.equal(opened.scenario.actualMonitor.evidenceCount, 1);
  assert.equal(opened.scenario.actualMonitor.routingDecisionCount, 1);
  assert.ok(opened.scenario.actualMonitor.routingDeliveryCount >= 1);
  assert.equal(opened.scenario.actualMonitor.conversationLinkCount, 1);
  assert.equal(opened.scenario.actualMonitor.alertMessageCount, 1);
  return opened;
};
const assertStable = async (server: MonitorServer, code: ScenarioRuleCode, baseline: Record<string, unknown>) => {
  const repeated = await poll(server, code);
  for (const field of ["incidentCount", "evidenceCount", "routingDecisionCount", "routingDeliveryCount", "conversationLinkCount", "alertMessageCount", "latestChangeCursor"])
    assert.equal(repeated.scenario.actualMonitor[field], baseline[field], `${code} duplicated ${field}`);
  return repeated;
};
const closeAdministratively = async (server: MonitorServer, code: ScenarioRuleCode) => {
  const incident = await latest(server, code);
  const sourceBefore = JSON.stringify((await server.acceptance!.source.status(code)).sourceState);
  const closed = await request(server, "POST", `/api/incidents/${incident.id}/close-without-resolution`, { reason: "Stage 5 acceptance", comment: `${code} uninterrupted condition` });
  assert.equal(closed.change.lifecycle, "closed_without_resolution");
  assert.equal(JSON.stringify((await server.acceptance!.source.status(code)).sourceState), sourceBefore);
  const unchanged = await poll(server, code);
  assert.equal(unchanged.scenario.actualMonitor.latestIncident.lifecycle, "closed_without_resolution");
  assert.equal(unchanged.scenario.actualMonitor.incidentCount, 1);
  return { incidentId: incident.id, sourceBefore };
};

const definitions = new Map(manifest.tests.map((test) => [test.id, test]));
const test = (id: string) => {
  const definition = definitions.get(id);
  if (!definition) throw new Error(`missing_${id}`);
  return definition;
};

// Shared controls and connected technical requirements.
await run(test("SH-01"), defaultSeeds, async (server) => {
  const repository = experimentRepository;
  const current = await repository.get(experimentId);
  const resultCount = await ledgerDatabase.queryOne("SELECT COUNT(*)::int count FROM monitor_scenario_acceptance_result WHERE experiment_id=$1", [experimentId]);
  assert.equal(Number(resultCount.count), 0);
  assert.equal(current.runId, runId); assert.equal(current.manifestVersion, manifest.version);
  assert.equal(current.sourceActionContractVersion, sourceActionContract.contractVersion);
  return { experimentId, runId: current.runId, manifestVersion: current.manifestVersion, sourceActionContractVersion: current.sourceActionContractVersion, status: current.status, initialResultCount: 0 };
});
await run(test("SH-02"), defaultSeeds, async (server) => {
  const repository = experimentRepository;
  const before = await counts(server);
  const configured = [];
  for (const speed of [1, 2, 3, 60] as const) configured.push(await repository.configure(experimentId, speed, { A02: 3, A03: 6, A05: 9 }));
  assert.deepEqual(await counts(server), before);
  assert.deepEqual(configured.at(-1)!.frequencies, { A02: 3, A03: 6, A05: 9 });
  return { speeds: configured.map(({ speed }) => speed), nextDue: configured.at(-1)!.nextDue };
});
await run(test("SH-03"), defaultSeeds, async (server) => {
  const repository = experimentRepository;
  await repository.configure(experimentId, 1, { A02: 3, A03: 60, A05: 60 });
  let dueCycles = 0;
  for (let minute = 3; minute <= 27; minute += 3) dueCycles += (await repository.advance(experimentId, 3)).due.filter((code) => code === "A02").length;
  assert.equal(dueCycles, 9);
  await repository.pause(experimentId, true);
  const before = await repository.get(experimentId);
  const paused = await repository.advance(experimentId, 3);
  assert.equal(new Date(paused.experiment.businessTime).toISOString(), new Date(before.businessTime).toISOString());
  assert.deepEqual(paused.due, []);
  await repository.pause(experimentId, false);
  return { dueCycles, pausedAt: before.businessTime };
});
await run(test("SH-04"), seeds("A02", 26194), async (server) => {
  const entry = server.acceptance!.registry.get("A02")!;
  await prepare(server, "A02", "clean_baseline");
  const before = await server.database.queryOne("SELECT COUNT(*)::int count FROM monitor_poll_cycle WHERE query_id=$1", [entry.query.queryId]);
  const result = await server.acceptance!.scheduler.runWhenDue(entry.query, entry.adapter, 10);
  const after = await server.database.queryOne("SELECT COUNT(*)::int count FROM monitor_poll_cycle WHERE query_id=$1", [entry.query.queryId]);
  assert.equal(Number(after.count) - Number(before.count), 1);
  assert.equal(result.status, "healthy");
  return { cycleId: result.cycleId, schedulerOwnedExecutions: 1 };
});
await run(test("SH-05"), defaultSeeds, async (server) => {
  const repository = experimentRepository;
  const before = await counts(server);
  const beforeStatus = (await request(server, "GET", "/api/dev/scenarios")).scenarios.find((scenario: { ruleCode: string }) => scenario.ruleCode === "A03");
  assert.ok(beforeStatus);
  const beforeSnapshot = await repository.snapshot(experimentId, "before-failed-connected-poll", {
    source: beforeStatus.sourceState, clock: beforeStatus.scenarioClock, poll: beforeStatus.pollerState, monitor: { counts: before, actual: beforeStatus.actualMonitor },
  });
  await fault(server, "A03", "partial");
  const failed = await poll(server, "A03");
  assert.equal(failed.result.status, "partial");
  assert.deepEqual(await counts(server), before);
  const afterSnapshot = await repository.snapshot(experimentId, "after-failed-connected-poll", {
    source: failed.scenario.sourceState, clock: failed.scenario.scenarioClock, poll: { state: failed.scenario.pollerState, cycle: failed.result },
    monitor: { counts: await counts(server), actual: failed.scenario.actualMonitor },
  });
  assert.notEqual(beforeSnapshot.id, afterSnapshot.id);
  return { beforeSnapshotId: beforeSnapshot.id, afterSnapshotId: afterSnapshot.id, snapshotSchemaVersion: afterSnapshot.schemaVersion, preserved: true };
});
await run(test("SH-06"), defaultSeeds, async (server) => {
  const before = await Promise.all((["A02", "A03", "A05"] as const).map((code) => server.acceptance!.source.status(code)));
  await request(server, "POST", "/api/dev/scenarios/A02/advance-time", { minutes: 15 });
  const after = await Promise.all((["A02", "A03", "A05"] as const).map((code) => server.acceptance!.source.status(code)));
  const advances = after.map((value, index) => Date.parse(value.scenarioClock.currentAt) - Date.parse(before[index].scenarioClock.currentAt));
  assert.deepEqual(advances, [900_000, 900_000, 900_000]);
  assert.ok(after.every((value) => value.lastActionRecordedAt !== value.scenarioClock.currentAt));
  return { businessAdvanceMs: advances, auditTimeDistinct: true };
});
await run(test("SH-07"), seeds("A02", 26174), async (server) => {
  const opened = await openAndAssert(server, "A02", "at_threshold");
  const committed = opened.scenario.actualMonitor;
  await act(server, "a02.receive");
  assert.equal((await latest(server, "A02")).lifecycle, "open");
  const reconciled = await poll(server, "A02");
  assert.equal(reconciled.scenario.actualMonitor.latestIncident.lifecycle, "resolved");
  return { committedCursor: committed.latestChangeCursor, pendingUntilCycle: reconciled.result.cycleId };
});
await run(test("SH-08"), defaultSeeds, async (server) => {
  const repository = experimentRepository;
  await openAndAssert(server, "A02", "past_threshold");
  const historical = await repository.history(experimentId);
  const beforeMonitor = await counts(server);
  const next = await repository.create(`Stage 5 ${runId} second`, "2026-08-01T10:00:00.000Z", { A02: 3, A03: 3, A05: 3 }, {
    runId: `${runId}-second`, manifestVersion: manifest.version, sourceActionContractVersion: sourceActionContract.contractVersion,
  });
  assert.notEqual(next.id, experimentId);
  const preserved = await repository.history(experimentId);
  assert.equal(preserved.snapshots.items.length, historical.snapshots.items.length);
  assert.deepEqual(await counts(server), beforeMonitor);
  return { newExperimentId: next.id, priorRunId: preserved.experiment.runId, preservedSnapshots: preserved.snapshots.items.length, preservedResults: preserved.results.items.length, preservedMonitor: beforeMonitor };
});
await run(test("SH-09"), seeds("A02", 26061), async (server) => {
  const opened = await openAndAssert(server, "A02", "past_threshold");
  await assertStable(server, "A02", opened.scenario.actualMonitor);
  const incident = await latest(server, "A02");
  const dashboard = await request(server, "GET", "/api/incidents?status=open");
  assert.equal(dashboard.incidents.filter((item: { id: string }) => item.id === incident.id).length, 1);
  return { incidentId: incident.id, stable: opened.scenario.actualMonitor };
});
await run(test("SH-10"), seeds("A02", 26157), async (server) => {
  const opened = await openAndAssert(server, "A02", "past_threshold");
  const stable = opened.scenario.actualMonitor;
  const statuses: Record<string, string> = {};
  for (const [value, expected] of [["partial", "partial"], ["partial_pagination", "partial"], ["invalid_schema", "invalid_schema"], ["duplicate_keys", "invalid_schema"], ["revision_change", "partial"], ["stale", "stale"], ["unknown_freshness", "unknown_freshness"], ["source_error", "source_error"], ["timeout", "timeout"]] as const) {
    await fault(server, "A02", value);
    const failed = await poll(server, "A02");
    assert.equal(failed.result.status, expected, value);
    for (const field of ["incidentCount", "evidenceCount", "routingDecisionCount", "routingDeliveryCount", "conversationLinkCount", "alertMessageCount"])
      assert.equal(failed.scenario.actualMonitor[field], stable[field], `${value} changed ${field}`);
    statuses[value] = failed.result.status;
  }
  const entry = server.acceptance!.registry.get("A02")!;
  await fault(server, "A02", "timeout");
  const first = server.acceptance!.runner.run(entry.query, entry.adapter);
  await new Promise((resolve) => setTimeout(resolve, 10));
  const second = await server.acceptance!.runner.run(entry.query, entry.adapter);
  const firstResult = await first;
  assert.equal(second.status, "overlap_skipped");
  assert.equal(firstResult.status, "timeout");
  await injectMonitorFault(server, "A02", "missing_open_incident_downstream");
  const repaired = await poll(server, "A02");
  assert.equal(repaired.scenario.actualMonitor.latestIncident.lifecycle, "open");
  assert.equal(repaired.scenario.actualMonitor.conversationLinkCount, 1);
  assert.equal(repaired.scenario.actualMonitor.alertMessageCount, 1);
  await act(server, "a02.receive");
  const resolved = await poll(server, "A02");
  assert.equal(resolved.scenario.actualMonitor.latestIncident.lifecycle, "resolved");
  return { statuses, overlap: [firstResult.status, second.status], repairCycle: repaired.result.cycleId, resolutionCycle: resolved.result.cycleId };
});

// A02 exact connected cases.
await run(test("A02-00"), seeds("A02", fixtures.a02.clean[0]), async (server) => {
  await prepare(server, "A02", "clean_baseline");
  const result = await poll(server, "A02");
  assert.equal(result.result.status, "healthy"); assert.equal(result.scenario.actualMonitor.incidentCount, 0);
  const row = result.scenario.sourceState.rows[0];
  assert.equal(row.state, "RECIBIDO"); assert.equal(Number(row.elapsedMinutes), 20); assert.ok(row.receivedAt);
  return { history: "Recibido a tiempo", durationMinutes: 20, source: result.scenario.sourceState, incidentCount: 0 };
});
await run(test("A02-01"), seeds("A02", fixtures.a02.concurrent[1]), async (server) => {
  const [received, overdue, young] = fixtures.a02.concurrent;
  await preparePopulation(server, "A02", "a02_mixed", [received, overdue, young]);
  const result = await poll(server, "A02"); assert.equal(result.scenario.actualMonitor.incidentCount, 1);
  assert.equal((await latest(server, "A02")).conditionKey, `A02:v1:${overdue}`);
  return { received, overdue, young, opened: overdue };
});
await run(test("A02-02"), seeds("A02", fixtures.a02.threshold[0]), async (server) => {
  await prepare(server, "A02", "before_threshold"); assert.equal((await poll(server, "A02")).scenario.actualMonitor.incidentCount, 0);
  await request(server, "POST", "/api/dev/scenarios/A02/advance-time", { minutes: 1 });
  const opened = await poll(server, "A02"); assert.equal(opened.scenario.actualMonitor.incidentCount, 1);
  await assertStable(server, "A02", opened.scenario.actualMonitor);
  return { thresholdMinute: 30, incidentId: (await latest(server, "A02")).id };
});
await run(test("A02-03"), seeds("A02", fixtures.a02.receiptBeforeDetection[0]), async (server) => {
  await prepare(server, "A02", "past_threshold"); await act(server, "a02.receive");
  const result = await poll(server, "A02"); assert.equal(result.scenario.actualMonitor.incidentCount, 0);
  return { receiptBeforeFirstCompleteRead: true, incidentCount: 0 };
});
await run(test("A02-04"), seeds("A02", fixtures.a02.failureIsolation[0]), async (server) => {
  const opened = await openAndAssert(server, "A02", "past_threshold"); await act(server, "a02.receive");
  await fault(server, "A02", "partial_pagination"); const failed = await poll(server, "A02");
  assert.equal(failed.scenario.actualMonitor.latestIncident.lifecycle, "open");
  const healthy = await poll(server, "A02"); assert.equal(healthy.scenario.actualMonitor.latestIncident.lifecycle, "resolved");
  return { openedCycle: opened.result.cycleId, failedCycle: failed.result.cycleId, recoveryCycle: healthy.result.cycleId };
});
await run(test("A02-05"), seeds("A02", fixtures.a02.administrativeClosure[0]), async (server) => {
  await openAndAssert(server, "A02", "past_threshold"); return closeAdministratively(server, "A02");
});
await run(test("A02-06"), seeds("A02", fixtures.a02.mixed[1]), async (server) => {
  const [received, overdue, young] = fixtures.a02.mixed;
  await preparePopulation(server, "A02", "a02_mixed", [received, overdue, young]);
  const result = await poll(server, "A02"); assert.equal(result.scenario.actualMonitor.incidentCount, 1); assert.equal((await latest(server, "A02")).conditionKey, `A02:v1:${overdue}`);
  return { clean: [received, young], alerted: overdue };
});
await run(test("A02-07"), seeds("A02", fixtures.a02.cancel[0]), async (server) => {
  await openAndAssert(server, "A02", "past_threshold");
  await act(server, "a02.cancel", undefined, "origin");
  const [cancelRows] = await connections.monitor.query("SELECT id,estado FROM flujo_materiales_detalles WHERE id_padre=? ORDER BY id", [fixtures.a02.cancel[0]]);
  assert.equal((cancelRows as unknown[]).length, 1); assert.notEqual(Number((cancelRows as { id: number }[])[0].id), fixtures.a02.cancel[0]);
  const resolved = await poll(server, "A02"); assert.equal(resolved.scenario.actualMonitor.latestIncident.lifecycle, "resolved");
  const rejectRows = await isolated(seeds("A02", fixtures.a02.reject[0]), async (rejectionServer) => {
    await openAndAssert(rejectionServer, "A02", "past_threshold");
    await act(rejectionServer, "a02.reject", undefined, "both");
    const [rows] = await connections.monitor.query("SELECT id,estado FROM flujo_materiales_detalles WHERE id_padre=? ORDER BY id", [fixtures.a02.reject[0]]);
    assert.equal((rows as unknown[]).length, 1); assert.notEqual(Number((rows as { id: number }[])[0].id), fixtures.a02.reject[0]);
    assert.equal((await poll(rejectionServer, "A02")).scenario.actualMonitor.latestIncident.lifecycle, "resolved");
    return rows;
  });
  return { cancelReverse: cancelRows, rejectReverse: rejectRows };
});
await run(test("A02-09"), seeds("A02", fixtures.a02.downstream[0]), async (server) => {
  await prepare(server, "A02", "past_threshold");
  const sourceStatus = await server.acceptance!.source.status("A02");
  const operation = String(sourceStatus.sourceState.rows[0]?.operationName ?? "Impresión");
  const workerGroup = workerGroupForIncident(sourceStatus.scenarioClock.currentAt, "Día");
  const connectedRoster = [
    rosterAssignment("manager", 9001, "María Torres", "Gerente de fábrica", "factory"),
    rosterAssignment("supervisor", 9002, "Luis Vargas", "Supervisor de turno de operación", "operation_group", workerGroup, [operation]),
    rosterAssignment("operator", 9003, "Jorge Acosta", "Operador de máquina", "machine_group", workerGroup, [operation]),
  ];
  assert.equal((await server.app.inject({ method: "PUT", url: "/api/roster/assignments", headers: manager, payload: { revision: 1, assignments: connectedRoster } })).statusCode, 200);
  const opened = await poll(server, "A02"); assert.equal(opened.scenario.actualMonitor.latestIncident.lifecycle, "open");
  const incident = await latest(server, "A02");
  const linked = await request(server, "GET", `/api/incidents/${incident.id}/conversation`);
  const messages = await request(server, "GET", `/api/conversations/${linked.conversationId}/messages`);
  const conversation = await server.database.queryOne("SELECT COUNT(*)::int count FROM monitor_conversation_participant WHERE conversation_id=$1 AND removed_at IS NULL", [linked.conversationId]);
  assert.equal(Number(conversation.count), 3);
  assert.equal(messages.messages.filter((item: { kind: string; payload?: { id?: string } }) => item.kind === "alert" && item.payload?.id === incident.id).length, 1);
  await assertStable(server, "A02", opened.scenario.actualMonitor);
  await server.app.listen({ host: "127.0.0.1", port: 0 });
  const address = server.app.server.address(); assert.ok(address && typeof address === "object");
  const socket = connectSocket(`http://127.0.0.1:${address.port}`, { auth: { token: "mock:machine-operator" }, transports: ["websocket"] });
  await new Promise<void>((resolve, reject) => { socket.once("connect", resolve); socket.once("connect_error", reject); });
  socket.disconnect(); socket.connect();
  await new Promise<void>((resolve, reject) => { socket.once("connect", resolve); socket.once("connect_error", reject); });
  const live = new Promise<{ messageId: string }>((resolve) => socket.once("message.created", resolve));
  const sent = await request(server, "POST", `/api/conversations/${linked.conversationId}/messages`, { body: "Revisión conectada", clientCommandId: "stage5-a02-09" }, supervisor);
  const duplicate = await request(server, "POST", `/api/conversations/${linked.conversationId}/messages`, { body: "Duplicado", clientCommandId: "stage5-a02-09" }, supervisor);
  assert.equal(duplicate.duplicate, true); assert.equal((await live).messageId, sent.id); socket.close();
  const operatorList = await request(server, "GET", "/api/conversations", undefined, operator); assert.ok(operatorList.conversations[0].unreadCount >= 2);
  const page = await request(server, "GET", `/api/conversations/${linked.conversationId}/messages?limit=1`, undefined, operator); assert.equal(page.messages.length, 1); assert.ok(page.nextCursor);
  const allMessages = await request(server, "GET", `/api/conversations/${linked.conversationId}/messages`, undefined, operator);
  const lastCursor = allMessages.messages.at(-1).cursor;
  const read = await server.app.inject({ method: "POST", url: `/api/conversations/${linked.conversationId}/read`, headers: operator, payload: { cursor: lastCursor } }); assert.equal(read.statusCode, 204);
  const receipts = await request(server, "GET", `/api/conversations/${linked.conversationId}/messages`, undefined, operator);
  assert.ok(receipts.messages.some((item: { deliveredCount: number; readCount: number }) => item.deliveredCount > 0 && item.readCount > 0));
  assert.equal((await request(server, "GET", "/api/conversations", undefined, operator)).conversations[0].unreadCount, 0);
  const remove = await server.app.inject({ method: "PUT", url: `/api/admin/conversations/${linked.conversationId}/participants/9003`, headers: manager, payload: { active: false, displayName: "Jorge Acosta" } }); assert.equal(remove.statusCode, 204);
  assert.equal((await server.app.inject({ method: "GET", url: `/api/conversations/${linked.conversationId}/messages`, headers: operator })).statusCode, 403);
  const cursors = await server.database.queryAll("SELECT cursor FROM monitor_message WHERE conversation_id=$1 ORDER BY cursor", [linked.conversationId]);
  assert.deepEqual(cursors.map((row) => Number(row.cursor)), [...cursors.map((row) => Number(row.cursor))].sort((a, b) => a - b));
  return { incidentId: incident.id, conversationId: linked.conversationId, participants: 3, cursor: opened.scenario.latestChangeCursor, duplicateSend: true, reconnect: true, pagination: true, receipts: true, removalEnforced: true };
});

// A03 exact connected cases.
await run(test("A03-00"), seeds("A03", fixtures.a03.clean[0]), async (server) => {
  await prepare(server, "A03", "clean_baseline"); const result = await poll(server, "A03");
  const row = result.scenario.sourceState.rows[0];
  assert.equal(result.scenario.actualMonitor.incidentCount, 0); assert.equal(Number(row.elapsedMinutes), 10); assert.equal(Number(row.consumptionCount), 1);
  return { history: "Primer consumo a tiempo", consumptionAtMinute: 10, source: result.scenario.sourceState, incidentCount: 0 };
});
await run(test("A03-01"), seeds("A03", fixtures.a03.threshold[0]), async (server) => { await prepare(server, "A03", "before_threshold"); assert.equal((await poll(server, "A03")).scenario.actualMonitor.incidentCount, 0); await request(server, "POST", "/api/dev/scenarios/A03/advance-time", { minutes: 1 }); const opened = await poll(server, "A03"); assert.equal(opened.scenario.actualMonitor.incidentCount, 1); await assertStable(server, "A03", opened.scenario.actualMonitor); return { thresholdMinute: 15, incidentId: (await latest(server, "A03")).id }; });
await run(test("A03-02"), seeds("A03", fixtures.a03.concurrent[0]), async (server) => {
  const [eligible, consumed, closed, young] = fixtures.a03.concurrent;
  await preparePopulation(server, "A03", "a03_mixed", [eligible, consumed, closed, young]);
  const [candidateRows] = await connections.monitor.query(`SELECT candidate.id FROM ordenes_trabajo active
    JOIN ordenes_trabajo candidate ON candidate.id_equipo=active.id_equipo AND candidate.id<>active.id
    WHERE active.id=? AND candidate.fecha_inicio_ejecucion IS NULL AND candidate.fecha_fin_ejecucion IS NULL
      AND candidate.fecha_eliminacion IS NULL AND candidate.eliminado=0 ORDER BY candidate.id LIMIT 1`, [eligible]);
  const candidate = Number((candidateRows as Array<{ id: number }>)[0]?.id);
  assert.ok(Number.isSafeInteger(candidate) && candidate > 0, "inactive competing work order unavailable");
  const duplicate = await server.app.inject({ method: "POST", url: "/api/dev/source-actions", headers: manager, payload: { actionId: "a03.start_work_order", key: candidate } });
  assert.equal(duplicate.statusCode, 409); assert.equal(duplicate.json().error, "machine_has_active_work_order");
  const result = await poll(server, "A03"); assert.equal(result.scenario.actualMonitor.incidentCount, 1); assert.equal((await latest(server, "A03")).conditionKey, `A03:v1:${eligible}`);
  return { eligible, consumed, closed, duplicateMachineAttempt: duplicate.json(), young };
});
await run(test("A03-03"), seeds("A03", fixtures.a03.failure[0]), async (server) => { await openAndAssert(server, "A03", "past_threshold"); await act(server, "a03.record_first_consumption"); await fault(server, "A03", "source_error"); const failed = await poll(server, "A03"); assert.equal(failed.scenario.actualMonitor.latestIncident.lifecycle, "open"); const healthy = await poll(server, "A03"); assert.equal(healthy.scenario.actualMonitor.latestIncident.lifecycle, "resolved"); return { failedCycle: failed.result.cycleId, recoveryCycle: healthy.result.cycleId }; });
await run(test("A03-04"), seeds("A03", fixtures.a03.administrativeClosure[0]), async (server) => { await openAndAssert(server, "A03", "past_threshold"); return closeAdministratively(server, "A03"); });
await run(test("A03-05"), seeds("A03", fixtures.a03.availability[0]), async (server) => { await openAndAssert(server, "A03", "past_threshold"); await act(server, "a03.record_first_consumption"); await act(server, "a03.close_work_order"); const source = await server.acceptance!.source.status("A03"); const blocked = await server.app.inject({ method: "POST", url: "/api/dev/source-actions", headers: manager, payload: { actionId: "a03.record_first_consumption", key: Number(source.sourceState.rows[0]?.workOrderId) } }); assert.equal(blocked.statusCode, 409); const healthy = await poll(server, "A03"); assert.equal(healthy.scenario.actualMonitor.latestIncident.lifecycle, "resolved"); return { consumptionAcceptedOpen: true, laterConsumptionStatus: blocked.statusCode, resolutionCycle: healthy.result.cycleId }; });

// A05 exact connected cases.
await run(test("A05-00"), seeds("A05", fixtures.a05.clean[0]), async (server) => {
  await prepare(server, "A05", "clean_baseline"); const result = await poll(server, "A05");
  const row = result.scenario.sourceState.rows[0];
  assert.equal(result.scenario.actualMonitor.incidentCount, 0); assert.equal(Number(row.declaredAgeMinutes), 10); assert.equal(row.weighed, true); assert.equal(row.movedFromMachine, true);
  return { history: "Pesada y movida a tiempo", weighedAndMovedAtMinute: 10, source: result.scenario.sourceState, incidentCount: 0 };
});
await run(test("A05-01"), seeds("A05", fixtures.a05.thresholdBoth[0]), async (server) => { await prepare(server, "A05", "before_threshold"); assert.equal((await poll(server, "A05")).scenario.actualMonitor.incidentCount, 0); await request(server, "POST", "/api/dev/scenarios/A05/advance-time", { minutes: 1 }); const opened = await poll(server, "A05"); assert.equal(opened.scenario.actualMonitor.incidentCount, 1); const incident = await latest(server, "A05"); assert.deepEqual((incident.reasons as string[]).sort(), ["not_weighed", "still_at_machine"]); await assertStable(server, "A05", opened.scenario.actualMonitor); return { reasonCodes: incident.reasons, thresholdMinute: 30 }; });
await run(test("A05-02"), seeds("A05", fixtures.a05.independentProduced[0]), async (server) => {
  await openAndAssert(server, "A05", "past_threshold_not_weighed"); const producedReasons = (await latest(server, "A05")).reasons as string[]; assert.deepEqual(producedReasons, ["not_weighed"]);
  const remnant = await isolated(seeds("A05", fixtures.a05.independentRemnant[0]), async (remnantServer) => {
    const opened = await openAndAssert(remnantServer, "A05", "past_threshold_still_at_machine");
    const reasons = (await latest(remnantServer, "A05")).reasons as string[]; assert.deepEqual(reasons, ["still_at_machine"]);
    return reasons;
  });
  return { producedReasons, remnantReasons: remnant };
});
await run(test("A05-03"), seeds("A05", fixtures.a05.partialWeighFirst[0]), async (server) => {
  const opened = await openAndAssert(server, "A05", "past_threshold_both"); await act(server, "a05.register_weighing"); const weighed = await poll(server, "A05");
  const weighedReasons = (await latest(server, "A05")).reasons as string[]; assert.deepEqual(weighedReasons, ["still_at_machine"]); assert.equal(weighed.scenario.actualMonitor.incidentCount, opened.scenario.actualMonitor.incidentCount);
  const moved = await isolated(seeds("A05", fixtures.a05.partialMoveFirst[0]), async (moveServer) => {
    const moveOpened = await openAndAssert(moveServer, "A05", "past_threshold_both"); await act(moveServer, "a05.register_movement"); const after = await poll(moveServer, "A05");
    const reasons = (await latest(moveServer, "A05")).reasons as string[]; assert.deepEqual(reasons, ["not_weighed"]); assert.equal(after.scenario.actualMonitor.incidentCount, moveOpened.scenario.actualMonitor.incidentCount); return reasons;
  });
  return { weighFirst: weighedReasons, moveFirst: moved };
});
await run(test("A05-04"), seeds("A05", fixtures.a05.failure[0]), async (server) => { await openAndAssert(server, "A05", "past_threshold_both"); await act(server, "a05.register_weighing"); await act(server, "a05.register_movement"); await fault(server, "A05", "partial_pagination"); const failed = await poll(server, "A05"); assert.equal(failed.scenario.actualMonitor.latestIncident.lifecycle, "open"); const healthy = await poll(server, "A05"); assert.equal(healthy.scenario.actualMonitor.latestIncident.lifecycle, "resolved"); return { failedCycle: failed.result.cycleId, recoveryCycle: healthy.result.cycleId }; });
await run(test("A05-05"), seeds("A05", fixtures.a05.administrativeClosure[0]), async (server) => { await openAndAssert(server, "A05", "past_threshold_both"); return closeAdministratively(server, "A05"); });
await run(test("A05-06"), seeds("A05", fixtures.a05.handoff[0]), async (server) => { await prepare(server, "A02", "clean_baseline"); const opened = await openAndAssert(server, "A05", "past_threshold_both"); await act(server, "a05.handoff_to_a02"); await poll(server, "A05"); assert.deepEqual((await latest(server, "A05")).reasons, ["not_weighed"]); await request(server, "POST", "/api/dev/scenarios/A02/advance-time", { minutes: 31 }); const a02 = await poll(server, "A02"); assert.equal(a02.scenario.actualMonitor.openIncidentCount, 1); return { a05IncidentId: opened.scenario.actualMonitor.latestIncident.id, a02IncidentId: a02.scenario.actualMonitor.latestIncident.id }; });
await run(test("A05-08"), seeds("A05", fixtures.a05.otClosure[0]), async (server) => { const opened = await openAndAssert(server, "A05", "past_threshold_both"); const incidentId = opened.scenario.actualMonitor.latestIncident.id; await act(server, "a05.close_source_work_order"); const survived = await poll(server, "A05"); assert.equal(survived.scenario.actualMonitor.latestIncident.id, incidentId); assert.equal(survived.scenario.actualMonitor.latestIncident.lifecycle, "open"); await act(server, "a05.register_weighing"); await act(server, "a05.register_movement"); const resolved = await poll(server, "A05"); assert.equal(resolved.scenario.actualMonitor.latestIncident.lifecycle, "resolved"); return { incidentId, survivedClosureCycle: survived.result.cycleId, resolvedCycle: resolved.result.cycleId }; });

// SH-11 is completed by the browser-review command against the persisted connected runtime.
await run(test("SH-11"), seeds("A02", 26061), async (server) => {
  await openAndAssert(server, "A02", "past_threshold");
  await openAndAssert(server, "A03", "past_threshold");
  await openAndAssert(server, "A05", "past_threshold_both");
  const evidencePath = resolve(root, "local-data/test-database/evidence/stage5/browser-review.json");
  await server.app.listen({ host: "127.0.0.1", port: 3000 });
  await writeFile(resolve(root, "local-data/test-database/evidence/stage5/browser-target.json"), `${JSON.stringify({ runId, apiOrigin: "http://127.0.0.1:3000", webOrigin: "http://127.0.0.1:5173" }, null, 2)}\n`, "utf8");
  let evidence: Record<string, unknown> | null = null;
  for (let attempt = 0; attempt < 600 && evidence === null; attempt += 1) {
    try {
      const candidate = JSON.parse(await readFile(evidencePath, "utf8")) as Record<string, unknown>;
      if (candidate.runId === runId) evidence = candidate;
    } catch { /* Browser review has not completed yet. */ }
    if (evidence === null) await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  assert.ok(evidence, "same-runtime browser review did not complete within ten minutes");
  assert.deepEqual(evidence.viewports, [390, 768, 1440]);
  for (const key of ["dashboard", "chatList", "chatDetail", "keyboard", "accessibility", "reducedMotion", "overflow", "console"])
    assert.equal(evidence[key], "passed", `browser evidence ${key}`);
  const connected = await server.database.queryOne("SELECT COUNT(*)::int count FROM monitor_incident");
  assert.ok(Number(connected.count) > 0);
  return { ...evidence, persistedIncidentCount: Number(connected.count) };
});

await connections.close();
await ledgerDatabase.close();
const orderedIds = results.map(({ id }) => id);
assert.deepEqual(orderedIds.sort(), manifest.tests.map(({ id }) => id).sort());
const failed = results.filter(({ status }) => status === "failed");
const ledger = { runId, required: manifest.requiredCount, passed: results.length - failed.length, failed: failed.length, excluded: manifest.excluded, results };
const evidencePath = resolve(root, "local-data/test-database/evidence/stage5", `${runId}-ledger.json`);
await writeFile(evidencePath, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ runId, required: manifest.requiredCount, passed: ledger.passed, failed: ledger.failed, evidencePath }, null, 2));
if (failed.length) throw new AggregateError(failed.map(({ id, error }) => new Error(`${id}: ${error}`)), `${failed.length} Stage 5 acceptance tests failed`);
