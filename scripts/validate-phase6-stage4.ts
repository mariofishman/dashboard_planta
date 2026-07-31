import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadTestDatabaseFixtureSeeds } from "@monitor/detection";
import { buildMonitorServer } from "../apps/api/src/server.js";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const fixtureSeedIds = await loadTestDatabaseFixtureSeeds(repositoryRoot);

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
  const fixtureKeys = { A02: ["materialFlowDetailId", fixtureSeedIds.A02], A03: ["workOrderId", fixtureSeedIds.A03], A05: ["articleSerialId", fixtureSeedIds.A05] } as const;
  for (const [code, scenario] of [["A02", "past_threshold"], ["A03", "past_threshold"], ["A05", "past_threshold_both"]] as const) {
    const beforeSourceAction = await monitorCounts();
    let response = await server.app.inject({ method: "POST", url: `/api/dev/scenarios/${code}/prepare`, headers, payload: { scenario } });
    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(await monitorCounts(), beforeSourceAction, `${code} source preparation wrote Monitor-owned state`);
    const [fixtureKey, fixtureId] = fixtureKeys[code];
    assert.equal(response.json().sourceState.rows[0]?.[fixtureKey], fixtureId, `${code} did not reuse its fixed source fixture`);

    response = await server.app.inject({ method: "POST", url: `/api/dev/scenarios/${code}/poll`, headers });
    assert.equal(response.statusCode, 200, response.body);
    const opened = response.json().scenario;
    assert.equal(response.json().result.status, "healthy", `${code} poll was not healthy`);
    assert.equal(opened.actualMonitor.latestIncident?.lifecycle, "open", `${code} did not open`);
    assert.equal(opened.actualMonitor.openIncidentCount, 1, `${code} open count`);
    const evidenceCount = opened.actualMonitor.evidenceCount;

    response = await server.app.inject({ method: "POST", url: `/api/dev/scenarios/${code}/poll`, headers });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().scenario.actualMonitor.evidenceCount, evidenceCount, `${code} duplicated unchanged evidence`);

    if (code === "A03") {
      for (const [fault, expectedStatus] of [["source_error", "source_error"], ["partial", "partial"], ["invalid_schema", "invalid_schema"], ["timeout", "timeout"]] as const) {
        response = await server.app.inject({ method: "POST", url: `/api/dev/scenarios/${code}/fail-next-poll`, headers, payload: { fault } });
        assert.equal(response.statusCode, 200, response.body);
        response = await server.app.inject({ method: "POST", url: `/api/dev/scenarios/${code}/poll`, headers });
        assert.equal(response.statusCode, 200, response.body);
        assert.equal(response.json().result.status, expectedStatus, `${code} ${fault} did not fail the complete poll`);
        assert.equal(response.json().scenario.actualMonitor.latestIncident?.lifecycle, "open", `${code} ${fault} changed incident lifecycle`);
        assert.equal(response.json().scenario.actualMonitor.evidenceCount, evidenceCount, `${code} ${fault} changed incident evidence`);
      }
    }

    const beforeCorrection = await monitorCounts();
    response = await server.app.inject({ method: "POST", url: `/api/dev/scenarios/${code}/correct`, headers });
    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(await monitorCounts(), beforeCorrection, `${code} source correction wrote Monitor-owned state`);

    response = await server.app.inject({ method: "POST", url: `/api/dev/scenarios/${code}/poll`, headers });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().result.status, "healthy", `${code} resolution poll was not healthy`);
    assert.equal(response.json().scenario.actualMonitor.latestIncident?.lifecycle, "resolved", `${code} did not resolve`);
  }

  const diagnostics = await server.database.queryAll("SELECT query_id AS \"queryId\",adapter_kind AS \"adapterKind\" FROM monitor_detection_query WHERE rule_code IN ('A02','A03','A05') ORDER BY rule_code");
  assert.deepEqual(diagnostics.map((row) => row.adapterKind), ["test_database", "test_database", "test_database"]);
  console.log("Phase 6 Stage 4 connected source-to-incident validation passed");
} finally {
  await server.close();
}
