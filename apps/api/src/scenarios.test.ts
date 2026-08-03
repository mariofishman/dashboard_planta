import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, it } from "node:test";
import { io as connectSocket } from "socket.io-client";
import { TestDatabaseConnections, TestDatabaseScenarioRepository } from "@monitor/detection";
import { loadConfig } from "./config.js";
import { buildMonitorServer, type MonitorServer } from "./server.js";
import { workerGroupForIncident } from "../test/routing-fixtures.js";
import { assertCanonicalSourceActionIsolation } from "./source-action-isolation.connected.js";

const servers: MonitorServer[] = [];
const repositoryRoot = resolve(import.meta.dirname, "../../..");
const connectedLabAvailable = existsSync(resolve(repositoryRoot, "local-data/test-database/state/ready"));

async function scenarioServer() {
  const instance = await buildMonitorServer({
    config: {
      nodeEnv: "test",
      cookieSecret: "phase-4b-test-secret-with-enough-entropy",
      allowMockAuth: true,
      enableScenarioLab: true,
      databaseMode: "pglite",
      pgliteDataDir: "memory://",
    },
  });
  servers.push(instance);
  return instance;
}

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

it("keeps alert and dashboard previews passive across open, refresh, selection, and surface reads", async () => {
  const instance = await scenarioServer();
  const manager = { authorization: "Bearer mock:plant-manager" };
  const operator = { authorization: "Bearer mock:machine-operator" };
  await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/prepare", headers: manager, payload: { scenario: "past_threshold" } });
  await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
  const scenarioResponse = await instance.app.inject({ method: "GET", url: "/api/dev/scenarios", headers: manager });
  assert.equal(scenarioResponse.statusCode, 200, scenarioResponse.body);
  const a02 = scenarioResponse.json().scenarios.find((scenario: { ruleCode: string }) => scenario.ruleCode === "A02");
  const selected = a02.records.find((record: { actual?: { incident?: { id?: string } } }) => record.actual?.incident?.id);
  assert.ok(Number.isSafeInteger(selected?.key), "the preview test requires one poll-created A02 source selection");

  const before = await snapshotScenarioPreviewState(instance);
  const alertUrl = `/api/dev/scenario-alert-messages?ruleCode=A02&sourceKey=${selected.key}`;
  const otherSelectionUrl = `/api/dev/scenario-alert-messages?ruleCode=A02&sourceKey=${Number(selected.key) + 1}`;
  for (const url of [
    "/api/session",
    alertUrl,
    alertUrl,
    otherSelectionUrl,
    alertUrl,
    "/api/session",
    "/api/incidents?",
    "/api/incidents?",
  ]) {
    const response = await instance.app.inject({ method: "GET", url, headers: manager });
    assert.equal(response.statusCode, 200, `${url}: ${response.body}`);
  }
  assert.equal((await instance.app.inject({ method: "GET", url: "/api/session", headers: operator })).statusCode, 200);
  assert.equal((await instance.app.inject({ method: "GET", url: "/api/incidents?", headers: operator })).statusCode, 200);
  assert.equal((await instance.app.inject({ method: "GET", url: alertUrl, headers: operator })).statusCode, 403,
    "a non-admin identity cannot turn the laboratory preview into a broader data read");
  await instance.app.listen({ host: "127.0.0.1", port: 0 });
  const address = instance.app.server.address();
  if (!address || typeof address === "string") throw new Error("preview_passivity_server_did_not_bind");
  const socket = connectSocket(`http://127.0.0.1:${address.port}`, {
    auth: { token: "mock:plant-manager" }, transports: ["websocket"],
  });
  try {
    await new Promise<Record<string, unknown>>((resolveReady, reject) => {
      socket.once("session.ready", resolveReady);
      socket.once("connect_error", reject);
    });
    const resumed = new Promise<Record<string, unknown>>((resolveReady) => socket.once("session.ready", resolveReady));
    socket.emit("sync.resume", { cursor: 0 });
    await resumed;
  } finally {
    socket.close();
  }
  const after = await snapshotScenarioPreviewState(instance);
  assert.deepEqual(after, before,
    "preview opening, refreshing, selecting another record, and switching to Dashboard must not mutate Monitor or simulator state");
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

it("drives A02 through source changes, failure preservation, and resolution without rewriting terminal source history", async () => {
  const instance = await scenarioServer();
  const manager = { authorization: "Bearer mock:plant-manager" };
  const operator = { authorization: "Bearer mock:machine-operator" };
  assert.equal((await instance.app.inject({ method: "GET", url: "/api/dev/scenarios" })).statusCode, 401);
  assert.equal((await instance.app.inject({ method: "GET", url: "/api/dev/scenarios", headers: operator })).statusCode, 403);
  assert.equal((await instance.app.inject({ method: "GET", url: "/api/incidents", headers: manager })).json().incidents.length, 0);

  const reset = await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/reset", headers: manager });
  assert.equal(reset.statusCode, 200, reset.body);
  assert.equal((await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/trigger", headers: manager })).statusCode, 200);
  assert.equal((await instance.app.inject({ method: "GET", url: "/api/incidents", headers: manager })).json().incidents.length, 0, "source actions cannot directly create incidents");
  assert.equal((await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/advance-time", headers: manager, payload: { minutes: 31 } })).statusCode, 200);
  const firstPoll = await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
  assert.equal(firstPoll.statusCode, 200);
  assert.equal(firstPoll.json().result.status, "healthy");
  let incidents = (await instance.app.inject({ method: "GET", url: "/api/incidents", headers: manager })).json().incidents;
  assert.equal(incidents.length, 1);
  assert.equal(incidents[0].ruleCode, "A02");
  assert.equal(incidents[0].lifecycle, "open");
  assert.equal(incidents[0].occurrence, 1);
  assert.equal(new Date(incidents[0].openedAt).toISOString(), firstPoll.json().scenario.scenarioClock.currentAt,
    "scenario incidents must use the database-poll business time, not the wall-clock load time");

  await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
  assert.equal(Number((await instance.database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_incident_evidence")).count), 1, "unchanged polls do not append evidence");

  await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/correct", headers: manager });
  await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/fail-next-poll", headers: manager, payload: { fault: "partial" } });
  const failed = await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
  assert.equal(failed.json().result.status, "partial");
  incidents = (await instance.app.inject({ method: "GET", url: "/api/incidents", headers: manager })).json().incidents;
  assert.equal(incidents[0].lifecycle, "open", "an incomplete poll cannot resolve an incident");

  await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
  incidents = (await instance.app.inject({ method: "GET", url: "/api/incidents", headers: manager })).json().incidents;
  assert.equal(incidents[0].lifecycle, "resolved");

  assert.equal((await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/recur", headers: manager })).statusCode, 409);
});

it("drives A03 and A05 through their local source thresholds and healthy resolution", async () => {
  const instance = await scenarioServer();
  const manager = { authorization: "Bearer mock:plant-manager" };
  for (const [code, minutes] of [["A03", 15], ["A05", 30]] as const) {
    await instance.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/reset`, headers: manager });
    await instance.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/trigger`, headers: manager });
    await instance.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/advance-time`, headers: manager, payload: { minutes } });
    const opened = await instance.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/poll`, headers: manager });
    assert.equal(opened.json().result.status, "healthy");
    let incidents = (await instance.app.inject({ method: "GET", url: "/api/incidents", headers: manager })).json().incidents;
    assert.equal(incidents.find((incident: { ruleCode: string }) => incident.ruleCode === code)?.lifecycle, "open");
    await instance.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/correct`, headers: manager });
    await instance.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/poll`, headers: manager });
    incidents = (await instance.app.inject({ method: "GET", url: "/api/incidents", headers: manager })).json().incidents;
    assert.equal(incidents.find((incident: { ruleCode: string }) => incident.ruleCode === code)?.lifecycle, "resolved");
  }
});

it("preserves every open scenario alert through every simulator read failure", async () => {
  const instance = await scenarioServer();
  const manager = { authorization: "Bearer mock:plant-manager" };
  for (const code of ["A02", "A03", "A05"] as const) {
    const scenario = code === "A05" ? "past_threshold_both" : "past_threshold";
    for (const fault of ["timeout", "source_error", "partial", "invalid_schema"] as const) {
      await instance.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/reset`, headers: manager });
      await instance.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/poll`, headers: manager });
      await instance.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/prepare`, headers: manager, payload: { scenario } });
      await instance.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/poll`, headers: manager });
      await instance.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/correct`, headers: manager });
      const scheduled = await instance.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/fail-next-poll`, headers: manager, payload: { fault } });
      assert.equal(scheduled.json().expectedResult.incidentLifecycle, "open");
      assert.match(scheduled.json().expectedResult.conversation, /conservan/);
      const failed = await instance.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/poll`, headers: manager });
      assert.notEqual(failed.json().result.status, "healthy");
      const latest = (await instance.app.inject({ method: "GET", url: "/api/incidents", headers: manager })).json().incidents
        .filter((incident: { ruleCode: string }) => incident.ruleCode === code)
        .sort((a: { occurrence: number }, b: { occurrence: number }) => b.occurrence - a.occurrence)[0];
      assert.equal(latest.lifecycle, "open", `${code} ${fault} must preserve the open incident`);
      await instance.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/poll`, headers: manager });
    }
  }
});

it("exposes the threshold matrix, A05 reason variants, and one shared factory clock", async () => {
  const instance = await scenarioServer();
  const manager = { authorization: "Bearer mock:plant-manager" };
  const prepare = async (code: string, scenario: string) => {
    const response = await instance.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/prepare`, headers: manager, payload: { scenario } });
    assert.equal(response.statusCode, 200, response.body);
    return response.json();
  };

  for (const [code, cases] of [
    ["A02", [["before_threshold", 29, "clear"], ["at_threshold", 30, "triggered"], ["past_threshold", 31, "triggered"]]],
    ["A03", [["before_threshold", 14, "clear"], ["at_threshold", 15, "triggered"], ["past_threshold", 16, "triggered"]]],
  ] as const) {
    for (const [scenario, minutes, expected] of cases) {
      const state = await prepare(code, scenario);
      assert.equal(state.sourceState.rows[0].elapsedMinutes, minutes);
      assert.equal(state.sourceState.evaluation.status, expected, `${code} ${scenario}`);
      if (code === "A02") assert.equal(state.sourceState.rows[0].physicalArrivalState, undefined);
    }
  }

  for (const [prefix, minutes, status] of [["before_threshold", 29, "clear"], ["at_threshold", 30, "triggered"], ["past_threshold", 31, "triggered"]] as const) {
    for (const [suffix, reasons] of [["not_weighed", ["not_weighed"]], ["still_at_machine", ["still_at_machine"]], ["both", ["not_weighed", "still_at_machine"]]] as const) {
      const scenario = suffix === "both" && prefix !== "past_threshold" ? prefix : `${prefix}_${suffix}`;
      const state = await prepare("A05", scenario);
      assert.equal(state.sourceState.rows[0].declaredAgeMinutes, minutes);
      assert.equal(state.sourceState.evaluation.status, status, `A05 ${scenario}`);
      assert.deepEqual(state.sourceState.evaluation.reasons, status === "clear" ? [] : reasons);
    }
  }

  const rejectedSuppression = await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A03/prepare", headers: manager, payload: { scenario: "suppressed_by_a07" } });
  assert.equal(rejectedSuppression.statusCode, 400, "A07 must not suppress A03");

  const before = (await instance.app.inject({ method: "GET", url: "/api/dev/scenarios", headers: manager })).json().scenarios;
  const a02Cases = before.find((item: { ruleCode: string }) => item.ruleCode === "A02").supportedCases;
  assert.deepEqual(a02Cases, ["clean_baseline", "before_threshold", "at_threshold", "past_threshold"]);
  const a03Clock = before.find((item: { ruleCode: string }) => item.ruleCode === "A03").scenarioClock.currentAt;
  await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/advance-time", headers: manager, payload: { minutes: 1 } });
  const after = (await instance.app.inject({ method: "GET", url: "/api/dev/scenarios", headers: manager })).json().scenarios;
  assert.equal(Date.parse(after.find((item: { ruleCode: string }) => item.ruleCode === "A03").scenarioClock.currentAt), Date.parse(a03Clock) + 60_000, "all rules use one shared factory clock");
});

it("keeps A05 open until weighing and movement are both complete in either order", async () => {
  const instance = await scenarioServer();
  const manager = { authorization: "Bearer mock:plant-manager" };

  for (const [index, corrections] of [[1, ["weigh", "move"]], [2, ["move", "weigh"]]] as const) {
    await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A05/prepare", headers: manager, payload: { scenario: "past_threshold_both" } });
    await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A05/poll", headers: manager });

    const partial = await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A05/correct", headers: manager, payload: { correction: corrections[0] } });
    assert.equal(partial.statusCode, 200, partial.body);
    assert.equal(partial.json().sourceState.evaluation.status, "triggered");
    assert.equal(partial.json().expectedResult.awaitingPoll, true);
    assert.deepEqual(partial.json().sourceState.evaluation.reasons, [corrections[0] === "weigh" ? "still_at_machine" : "not_weighed"]);
    const preserved = await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A05/poll", headers: manager });
    assert.equal(preserved.json().scenario.expectedResult.awaitingPoll, false);
    assert.equal(preserved.json().scenario.actualMonitor.latestIncident.lifecycle, "open");
    assert.equal(preserved.json().scenario.actualMonitor.latestIncident.occurrence, index);

    const complete = await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A05/correct", headers: manager, payload: { correction: corrections[1] } });
    assert.equal(complete.json().sourceState.evaluation.status, "clear");
    assert.equal(complete.json().expectedResult.incidentLifecycle, "resolved");
    const resolved = await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A05/poll", headers: manager });
    assert.equal(resolved.json().scenario.actualMonitor.latestIncident.lifecycle, "resolved");
    assert.equal(resolved.json().scenario.actualMonitor.latestIncident.occurrence, index);
  }
});

it("applies the complete persistent, duplicate, visible-integration, and resolution path to every alert", async () => {
  const instance = await scenarioServer();
  const manager = { authorization: "Bearer mock:plant-manager" };
  const assignment = (id: string, person: string, position: string, scope: string, operations: string[] = []) => ({
    id, person, position, operations, warehouseType: null, scope, group: null, validFrom: "2026-07-01", validTo: null, state: "active", setupComplete: true,
  });
  await instance.app.inject({ method: "PUT", url: "/api/roster/assignments", headers: manager, payload: { revision: 0, assignments: [
    assignment("manager", "María Torres", "Gerente de fábrica", "factory"),
    assignment("leader", "Rosa Paredes", "Líder técnico", "operation", ["Impresión"]),
  ] } });

  for (const code of ["A02", "A03", "A05"] as const) {
    const scenario = code === "A05" ? "past_threshold_both" : "past_threshold";
    assert.equal((await instance.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/recur`, headers: manager })).statusCode, 409);
    await instance.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/prepare`, headers: manager, payload: { scenario } });
    await instance.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/poll`, headers: manager });
    const first = (await instance.app.inject({ method: "GET", url: "/api/dev/scenarios", headers: manager })).json().scenarios.find((item: { ruleCode: string }) => item.ruleCode === code);
    assert.equal(first.comparison.matches, true, `${code} expected and actual state must match`);
    assert.equal(first.actualMonitor.openIncidentCount, 1);
    assert.equal(first.actualMonitor.conversationLinkCount, 1);
    assert.equal(first.actualMonitor.alertMessageCount, 1);
    const connectedRecord = first.records.find((record: { expected: { triggered: boolean } }) => record.expected.triggered);
    assert.equal(connectedRecord.actual.incident.id, first.actualMonitor.latestIncident.id, `${code} V2 record must bind its composite incident condition key`);
    assert.equal(connectedRecord.comparison.matches, true, `${code} V2 record must expose the committed Monitor lifecycle`);

    const incidentId = String(first.actualMonitor.latestIncident.id);
    const dashboard = await instance.app.inject({ method: "GET", url: "/api/incidents?status=open", headers: manager });
    assert.equal(dashboard.json().incidents.filter((item: { ruleCode: string }) => item.ruleCode === code).length, 1);
    const conversation = await instance.app.inject({ method: "GET", url: `/api/incidents/${incidentId}/conversation`, headers: manager });
    assert.equal(conversation.statusCode, 200, `${code} must be reachable through the incident conversation route`);

    await instance.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/poll`, headers: manager });
    const repeated = (await instance.app.inject({ method: "GET", url: "/api/dev/scenarios", headers: manager })).json().scenarios.find((item: { ruleCode: string }) => item.ruleCode === code);
    for (const field of ["incidentCount", "evidenceCount", "routingDecisionCount", "routingDeliveryCount", "conversationLinkCount", "alertMessageCount"] as const) {
      assert.equal(repeated.actualMonitor[field], first.actualMonitor[field], `${code} ${field} must not grow on an unchanged poll`);
    }

    await instance.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/correct`, headers: manager });
    await instance.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/poll`, headers: manager });
    let state = (await instance.app.inject({ method: "GET", url: "/api/dev/scenarios", headers: manager })).json().scenarios.find((item: { ruleCode: string }) => item.ruleCode === code);
    assert.equal(state.actualMonitor.latestIncident.lifecycle, "resolved");
    assert.equal(state.actualMonitor.openIncidentCount, 0);

    assert.equal((await instance.app.inject({ method: "POST", url: `/api/dev/test/scenarios/${code}/recur`, headers: manager })).statusCode, 409);
  }
});

it("covers A02 transfer-end routing, independent A03 evaluation, A05 reel routing, and the A02 movement handoff", async () => {
  const instance = await scenarioServer();
  const manager = { authorization: "Bearer mock:plant-manager" };

  await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/prepare", headers: manager, payload: { scenario: "past_threshold" } });
  let polled = await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
  assert.equal(polled.json().scenario.actualMonitor.primaryRole, "warehouse_dispatcher");
  let routing = await instance.app.inject({ method: "GET", url: `/api/internal/routing/${polled.json().scenario.actualMonitor.latestIncident.id}`, headers: manager });
  assert.equal(routing.json().requiredRoles.includes("warehouse_dispatcher"), true);
  assert.equal(routing.json().requiredRoles.includes("warehouse_supervisor"), true);
  assert.equal(routing.json().requiredRoles.includes("machine_operator"), true);

  await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A03/prepare", headers: manager, payload: { scenario: "past_threshold" } });
  const a03 = await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A03/poll", headers: manager });
  assert.equal(a03.json().scenario.actualMonitor.latestIncident.lifecycle, "open");
  assert.equal(a03.json().scenario.sourceState.rows[0].strongerA07, undefined);

  await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A05/prepare", headers: manager, payload: { scenario: "past_threshold_produced" } });
  polled = await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A05/poll", headers: manager });
  routing = await instance.app.inject({ method: "GET", url: `/api/internal/routing/${polled.json().scenario.actualMonitor.latestIncident.id}`, headers: manager });
  assert.equal(routing.json().primaryRole, "process_operator");
  assert.equal(routing.json().requiredRoles.includes("process_supervisor"), true);
  await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A05/correct", headers: manager });
  await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A05/poll", headers: manager });
  await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A05/prepare", headers: manager, payload: { scenario: "past_threshold_remnant" } });
  polled = await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A05/poll", headers: manager });
  routing = await instance.app.inject({ method: "GET", url: `/api/internal/routing/${polled.json().scenario.actualMonitor.latestIncident.id}`, headers: manager });
  assert.equal(routing.json().requiredRoles.includes("warehouse_dispatcher"), true);
  assert.equal(routing.json().requiredRoles.includes("warehouse_supervisor"), true);

  await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A05/correct", headers: manager });
  await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A05/poll", headers: manager });
  await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A05/prepare", headers: manager, payload: { scenario: "movement_started" } });
  await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A05/poll", headers: manager });
  await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/prepare", headers: manager, payload: { scenario: "past_threshold" } });
  await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
  const open = (await instance.app.inject({ method: "GET", url: "/api/incidents?status=open", headers: manager })).json().incidents;
  assert.equal(open.some((item: { ruleCode: string }) => item.ruleCode === "A02"), true);
  assert.equal(open.some((item: { ruleCode: string }) => item.ruleCode === "A05"), false);
});

it("keeps source actions isolated from Monitor tables and separates simulated from recorded time", async () => {
  const instance = await scenarioServer();
  const manager = { authorization: "Bearer mock:plant-manager" };
  const before = (await instance.app.inject({ method: "GET", url: "/api/dev/scenarios", headers: manager })).json().scenarios;
  const a03 = before.find((item: { ruleCode: string }) => item.ruleCode === "A03");
  const monitorBefore = await instance.database.queryOne(`SELECT
    (SELECT COUNT(*)::int FROM monitor_incident) AS incidents,
    (SELECT COUNT(*)::int FROM monitor_routing_decision) AS routing,
    (SELECT COUNT(*)::int FROM monitor_conversation_incident) AS conversations,
    (SELECT COUNT(*)::int FROM monitor_message) AS messages`);

  await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/prepare", headers: manager, payload: { scenario: "past_threshold" } });
  const advanced = await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/advance-time", headers: manager, payload: { minutes: 60 } });
  await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A05/correct", headers: manager });
  await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A03/fail-next-poll", headers: manager, payload: { fault: "partial" } });
  const after = (await instance.app.inject({ method: "GET", url: "/api/dev/scenarios", headers: manager })).json().scenarios;
  const a03After = after.find((item: { ruleCode: string }) => item.ruleCode === "A03");
  assert.equal(Date.parse(a03After.scenarioClock.currentAt) - Date.parse(a03.scenarioClock.currentAt), 60 * 60_000);
  assert.equal(a03After.sourceRevision, a03.sourceRevision);
  assert.notEqual(advanced.json().scenarioClock.currentAt, advanced.json().sourceChangedAt, "simulated business time and real recording time must remain separate");
  assert.equal(Math.abs(Date.now() - Date.parse(advanced.json().sourceChangedAt)) < 10_000, true, "source action recording time must use real time");

  const monitorAfter = await instance.database.queryOne(`SELECT
    (SELECT COUNT(*)::int FROM monitor_incident) AS incidents,
    (SELECT COUNT(*)::int FROM monitor_routing_decision) AS routing,
    (SELECT COUNT(*)::int FROM monitor_conversation_incident) AS conversations,
    (SELECT COUNT(*)::int FROM monitor_message) AS messages`);
  assert.deepEqual(monitorAfter, monitorBefore, "source actions must not write Monitor-owned tables");
});

it("keeps evidence, routing, conversations, and alert cards idempotent and rejects invalid source recurrence", async () => {
  const instance = await scenarioServer();
  const manager = { authorization: "Bearer mock:plant-manager" };
  const assignment = (id: string, person: string, position: string, scope: string, operations: string[] = []) => ({
    id, person, position, operations, warehouseType: null, scope, group: null, validFrom: "2026-07-01", validTo: null, state: "active", setupComplete: true,
  });
  await instance.app.inject({ method: "PUT", url: "/api/roster/assignments", headers: manager, payload: { revision: 0, assignments: [
    assignment("manager", "María Torres", "Gerente de fábrica", "factory"),
    assignment("leader", "Rosa Paredes", "Líder técnico", "operation", ["Impresión"]),
  ] } });

  assert.equal((await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/recur", headers: manager })).statusCode, 409);
  await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/prepare", headers: manager, payload: { scenario: "past_threshold" } });
  await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
  const first = (await instance.app.inject({ method: "GET", url: "/api/dev/scenarios", headers: manager })).json().scenarios.find((item: { ruleCode: string }) => item.ruleCode === "A02");
  assert.equal(first.actualMonitor.openIncidentCount, 1);
  assert.equal(first.actualMonitor.conversationLinkCount, 1);
  assert.equal(first.actualMonitor.alertMessageCount, 1);

  await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
  const repeated = (await instance.app.inject({ method: "GET", url: "/api/dev/scenarios", headers: manager })).json().scenarios.find((item: { ruleCode: string }) => item.ruleCode === "A02");
  for (const field of ["incidentCount", "evidenceCount", "routingDecisionCount", "routingDeliveryCount", "conversationLinkCount", "alertMessageCount"] as const) {
    assert.equal(repeated.actualMonitor[field], first.actualMonitor[field], `${field} must not grow on an unchanged successful poll`);
  }

  await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/correct", headers: manager });
  await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
  assert.equal((await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/recur", headers: manager })).statusCode, 409);
});

it("validates isolated population preparation contracts", async () => {
  const instance = await scenarioServer();
  const manager = { authorization: "Bearer mock:plant-manager" };
  const invalidPopulation = await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/prepare-population", headers: manager, payload: { population: "a02_mixed", keys: [1, 1, 2] } });
  assert.equal(invalidPopulation.statusCode, 400);
  assert.equal(invalidPopulation.json().error, "invalid_scenario_population");
  const unavailablePopulation = await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/prepare-population", headers: manager, payload: { population: "a02_mixed", keys: [1, 2, 3] } });
  assert.equal(unavailablePopulation.statusCode, 501);
});

it("publishes a simulator-created incident as a cursor-recoverable committed change", async () => {
  const instance = await scenarioServer();
  const manager = { authorization: "Bearer mock:plant-manager" };
  await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A05/trigger", headers: manager });
  await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A05/advance-time", headers: manager, payload: { minutes: 31 } });
  await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A05/poll", headers: manager });
  const changes = await instance.app.inject({ method: "GET", url: "/api/changes?after=0", headers: manager });
  assert.equal(changes.statusCode, 200);
  const matching = changes.json().changes.filter((change: { payload: { incidentId?: string } }) => change.payload.incidentId);
  assert.equal(matching.length, 1);
  assert.equal(matching[0].eventType, "incident.opened");
  assert.equal(Number(matching[0].cursor) > 0, true);
});

it("rejects an unknown scenario rule with a usable 404", async () => {
  const instance = await scenarioServer();
  const response = await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A99/poll", headers: { authorization: "Bearer mock:plant-manager" } });
  assert.equal(response.statusCode, 404);
  assert.equal(response.json().error, "unknown_scenario_rule");
});

it("protects and validates the canonical source-action endpoint", async () => {
  const instance = await scenarioServer();
  const manager = { authorization: "Bearer mock:plant-manager" };
  const operator = { authorization: "Bearer mock:machine-operator" };
  assert.equal((await instance.app.inject({ method: "POST", url: "/api/dev/source-actions", payload: { actionId: "a03.close_work_order" } })).statusCode, 401);
  assert.equal((await instance.app.inject({ method: "POST", url: "/api/dev/source-actions", headers: operator, payload: { actionId: "a03.close_work_order" } })).statusCode, 403);
  const invalid = await instance.app.inject({ method: "POST", url: "/api/dev/source-actions", headers: manager, payload: { actionId: "missing" } });
  assert.equal(invalid.statusCode, 400);
  assert.equal(invalid.json().error, "invalid_source_action_id");
  const precedence = await instance.app.inject({ method: "POST", url: "/api/dev/source-actions", headers: manager, payload: { actionId: "a02.cancel", authority: "both", key: 23811 } });
  assert.equal(precedence.statusCode, 409);
  assert.equal(precedence.json().error, "source_action_rejection_precedence");
  const unavailable = await instance.app.inject({ method: "POST", url: "/api/dev/source-actions", headers: manager, payload: { actionId: "a03.close_work_order", key: 12198 } });
  assert.equal(unavailable.statusCode, 501);
  assert.equal(unavailable.json().error, "source_action_source_unavailable");
});

it("exposes durable experiment history and ordered runtime events to administrators", async () => {
  const instance = await scenarioServer();
  const manager = { authorization: "Bearer mock:plant-manager" };
  const operator = { authorization: "Bearer mock:machine-operator" };
  assert.equal((await instance.app.inject({ url: "/api/dev/scenario-experiments", headers: operator })).statusCode, 403);
  const scenarioState = (await instance.app.inject({ url: "/api/dev/scenarios", headers: manager })).json().scenarios;
  for (const item of scenarioState) {
    const sourceKey = item.ruleCode === "A02" ? item.sourceState.rows[0].materialFlowDetailId : item.ruleCode === "A03" ? item.sourceState.rows[0].workOrderId : item.sourceState.rows[0].articleSerialId;
    assert.equal(item.records[0].key, sourceKey);
  }
  const created = await instance.app.inject({
    method: "POST", url: "/api/dev/scenario-runtime", headers: manager,
    payload: {
      name: "Historial visible", businessTime: "2026-08-01T09:00:00.000Z", runId: "api-visible-history",
      manifestVersion: "stage5.v2", pollingFrequencyMinutes: 1,
    },
  });
  assert.equal(created.statusCode, 200, created.body);
  const experimentId = created.json().experiment.id;
  assert.equal(created.json().experiment.status, "paused");
  const pristine = (await instance.app.inject({ url: "/api/dev/scenarios?activeOnly=true", headers: manager })).json().scenarios;
  for (const item of pristine) {
    assert.equal(item.sourceState.rows.length, 0, `${item.ruleCode} must be empty before the experiment starts`);
    assert.equal(item.pollerState.latestPoll, null, `${item.ruleCode} must not inherit a prior experiment poll`);
    assert.equal(item.actualMonitor.incidentCount, 0, `${item.ruleCode} must not inherit prior experiment incidents`);
  }
  const started = await instance.app.inject({ method: "POST", url: `/api/dev/scenario-runtime/${experimentId}/pause`, headers: manager, payload: { paused: false } });
  assert.equal(started.statusCode, 200, started.body);
  const advanced = await instance.app.inject({ method: "POST", url: `/api/dev/scenario-runtime/${experimentId}/advance`, headers: manager, payload: { minutes: 1 } });
  assert.equal(advanced.statusCode, 200, advanced.body);
  const captured = await instance.app.inject({ method: "POST", url: `/api/dev/scenario-experiments/${experimentId}/snapshots`, headers: manager, payload: { label: "after-first-cycle" } });
  assert.equal(captured.statusCode, 200, captured.body);
  assert.equal(captured.json().label, "after-first-cycle");
  assert.deepEqual(new Set(Object.keys(captured.json().payload)), new Set(["clock", "monitor", "poll", "source"]));
  const list = await instance.app.inject({ url: "/api/dev/scenario-experiments?limit=20", headers: manager });
  assert.equal(list.statusCode, 200, list.body);
  assert.equal(list.json().items[0].id, experimentId);
  const detail = await instance.app.inject({ url: `/api/dev/scenario-experiments/${experimentId}`, headers: manager });
  assert.equal(detail.statusCode, 200, detail.body);
  assert.equal(detail.json().experiment.runId, "api-visible-history");
  assert.equal(detail.json().snapshots.items[0].id, captured.json().id);
  assert.deepEqual(detail.json().events.map((event: { eventType: string }) => event.eventType), [
    "poll_started", "poll_completed", "poll_started", "poll_completed", "poll_started", "poll_completed",
  ]);
  assert.ok(detail.json().events.every((event: { businessTime: string; recordedAt: string }) => event.businessTime !== event.recordedAt));
  const invalidCursor = await instance.app.inject({ url: `/api/dev/scenario-experiments/${experimentId}?snapshotCursor=invalid`, headers: manager });
  assert.equal(invalidCursor.statusCode, 400);
  assert.equal(invalidCursor.json().error, "invalid_scenario_history_cursor");
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

it("reroutes an open Phase 4B incident when the roster changes and protects diagnostics by user role", async () => {
  const instance = await scenarioServer();
  const manager = { authorization: "Bearer mock:plant-manager" };
  const operator = { authorization: "Bearer mock:machine-operator" };
  const trigger = await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/trigger", headers: manager });
  assert.equal(trigger.statusCode, 200, trigger.body);
  const advance = await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/advance-time", headers: manager, payload: { minutes: 31 } });
  assert.equal(advance.statusCode, 200, advance.body);
  const incidentAt = advance.json().scenarioClock.currentAt;
  const poll = await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
  assert.equal(poll.statusCode, 200, poll.body);
  assert.equal(poll.json().scenario.scenarioClock.currentAt, incidentAt);
  const incident = (await instance.app.inject({ url: "/api/incidents", headers: manager })).json().incidents
    .find((item: { ruleCode: string }) => item.ruleCode === "A02");
  assert.ok(incident?.openedAt);
  assert.equal(Number((await instance.database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_routing_decision WHERE incident_id=$1", [incident.id])).count), 1);
  const incidentWorkerGroup = workerGroupForIncident(incident.openedAt, "Día");
  const assignment = (id: string, person: string, position: string, scope: string, group: string | null, operations: string[] = [], warehouseType: string | null = null) => ({
    id, person, position, operations, warehouseType, scope, group, validFrom: "2026-07-01", validTo: null, state: "active", setupComplete: true,
  });
  const roster = [
    assignment("manager", "María Torres", "Gerente de fábrica", "factory", null),
    assignment("supervisor-active", "Luis Vargas", "Supervisor de turno de operación", "operation_group", incidentWorkerGroup, ["Impresión"]),
    assignment("leader", "Rosa Paredes", "Líder técnico", "operation", null, ["Impresión"]),
    assignment("operator-active", "Jorge Acosta", "Operador de máquina", "machine_group", incidentWorkerGroup, ["Impresión"]),
    assignment("dispatcher-active", "Carlos Mendoza", "Despachador de almacén", "warehouse_group", incidentWorkerGroup, [], "Materias primas"),
    assignment("warehouse-supervisor-active", "Sofía Ramos", "Supervisor de almacén", "warehouse_group", incidentWorkerGroup, [], "Materias primas"),
  ];
  assert.equal((await instance.app.inject({ method: "PUT", url: "/api/roster/assignments", headers: manager, payload: { revision: 0, assignments: roster } })).statusCode, 200);
  const route = `/api/internal/routing/${incident.id}`;
  assert.equal((await instance.app.inject({ url: route, headers: operator })).statusCode, 403);
  const before = await instance.app.inject({ url: route, headers: manager });
  assert.equal(before.statusCode, 200, before.body);
  assert.ok(before.json().recipients.some((recipient: { name: string }) => recipient.name === "Carlos Mendoza"), before.body);
  assert.equal(Number((await instance.database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_routing_decision WHERE incident_id=$1", [incident.id])).count), 2);

  const replacement = assignment("dispatcher-replacement", "Carmen Ríos", "Despachador de almacén", "warehouse_group", incidentWorkerGroup, [], "Materias primas");
  const changed = roster.filter((item) => item.id !== "dispatcher-active").concat(replacement);
  assert.equal((await instance.app.inject({ method: "PUT", url: "/api/roster/assignments", headers: manager, payload: { revision: 1, assignments: changed } })).statusCode, 200);
  const after = await instance.app.inject({ url: route, headers: manager });
  assert.ok(after.json().recipients.some((recipient: { name: string }) => recipient.name === "Carmen Ríos"));
  assert.equal(after.json().recipients.some((recipient: { name: string }) => recipient.name === "Carlos Mendoza"), false);
  assert.equal(Number((await instance.database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_routing_decision WHERE incident_id=$1", [incident.id])).count), 3);
});

it("keeps simulator routes unavailable when disabled", async () => {
  const instance = await buildMonitorServer({
    config: { nodeEnv: "test", cookieSecret: "phase-4b-disabled-secret-with-enough-entropy", allowMockAuth: true, enableScenarioLab: false, databaseMode: "pglite", pgliteDataDir: "memory://" },
  });
  servers.push(instance);
  assert.equal((await instance.app.inject({ method: "GET", url: "/api/dev/scenarios", headers: { authorization: "Bearer mock:plant-manager" } })).statusCode, 404);
});
