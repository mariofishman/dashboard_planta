import assert from "node:assert/strict";
import { afterEach, it } from "node:test";
import { loadConfig } from "./config.js";
import { buildMonitorServer, type MonitorServer } from "./server.js";
import { workerGroupForIncident } from "../test/routing-fixtures.js";

const servers: MonitorServer[] = [];

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

it("locks the scenario laboratory out of production", () => {
  assert.throws(() => loadConfig({
    nodeEnv: "production", cookieSecret: "phase-4b-production-secret-with-enough-entropy", allowMockAuth: false, enableScenarioLab: true,
  }), /Scenario laboratory is local development and test only/);
});

it("drives A02 through source changes, failure preservation, resolution, and recurrence", async () => {
  const instance = await scenarioServer();
  const manager = { authorization: "Bearer mock:plant-manager" };
  const operator = { authorization: "Bearer mock:machine-operator" };
  assert.equal((await instance.app.inject({ method: "GET", url: "/api/dev/scenarios" })).statusCode, 401);
  assert.equal((await instance.app.inject({ method: "GET", url: "/api/dev/scenarios", headers: operator })).statusCode, 403);
  assert.equal((await instance.app.inject({ method: "GET", url: "/api/incidents", headers: manager })).json().incidents.length, 0);

  const reset = await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/reset", headers: manager });
  assert.equal(reset.statusCode, 200, reset.body);
  assert.equal((await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/trigger", headers: manager })).statusCode, 200);
  assert.equal((await instance.app.inject({ method: "GET", url: "/api/incidents", headers: manager })).json().incidents.length, 0, "source actions cannot directly create incidents");
  assert.equal((await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/advance-time", headers: manager, payload: { minutes: 31 } })).statusCode, 200);
  const firstPoll = await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/poll", headers: manager });
  assert.equal(firstPoll.statusCode, 200);
  assert.equal(firstPoll.json().result.status, "healthy");
  let incidents = (await instance.app.inject({ method: "GET", url: "/api/incidents", headers: manager })).json().incidents;
  assert.equal(incidents.length, 1);
  assert.equal(incidents[0].ruleCode, "A02");
  assert.equal(incidents[0].lifecycle, "open");
  assert.equal(incidents[0].occurrence, 1);

  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/poll", headers: manager });
  assert.equal(Number((await instance.database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_incident_evidence")).count), 1, "unchanged polls do not append evidence");

  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/correct", headers: manager });
  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/fail-next-poll", headers: manager, payload: { fault: "partial" } });
  const failed = await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/poll", headers: manager });
  assert.equal(failed.json().result.status, "partial");
  incidents = (await instance.app.inject({ method: "GET", url: "/api/incidents", headers: manager })).json().incidents;
  assert.equal(incidents[0].lifecycle, "open", "an incomplete poll cannot resolve an incident");

  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/poll", headers: manager });
  incidents = (await instance.app.inject({ method: "GET", url: "/api/incidents", headers: manager })).json().incidents;
  assert.equal(incidents[0].lifecycle, "resolved");

  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/trigger", headers: manager });
  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/advance-time", headers: manager, payload: { minutes: 31 } });
  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/poll", headers: manager });
  incidents = (await instance.app.inject({ method: "GET", url: "/api/incidents", headers: manager })).json().incidents;
  assert.equal(incidents.length, 2);
  assert.equal(incidents.filter((incident: { lifecycle: string }) => incident.lifecycle === "open").length, 1);
  assert.deepEqual(incidents.map((incident: { occurrence: number }) => incident.occurrence).sort(), [1, 2]);
});

it("drives A03 and A05 through their local source thresholds and healthy resolution", async () => {
  const instance = await scenarioServer();
  const manager = { authorization: "Bearer mock:plant-manager" };
  for (const [code, minutes] of [["A03", 15], ["A05", 31]] as const) {
    await instance.app.inject({ method: "POST", url: `/api/dev/scenarios/${code}/reset`, headers: manager });
    await instance.app.inject({ method: "POST", url: `/api/dev/scenarios/${code}/trigger`, headers: manager });
    await instance.app.inject({ method: "POST", url: `/api/dev/scenarios/${code}/advance-time`, headers: manager, payload: { minutes } });
    const opened = await instance.app.inject({ method: "POST", url: `/api/dev/scenarios/${code}/poll`, headers: manager });
    assert.equal(opened.json().result.status, "healthy");
    let incidents = (await instance.app.inject({ method: "GET", url: "/api/incidents", headers: manager })).json().incidents;
    assert.equal(incidents.find((incident: { ruleCode: string }) => incident.ruleCode === code)?.lifecycle, "open");
    await instance.app.inject({ method: "POST", url: `/api/dev/scenarios/${code}/correct`, headers: manager });
    await instance.app.inject({ method: "POST", url: `/api/dev/scenarios/${code}/poll`, headers: manager });
    incidents = (await instance.app.inject({ method: "GET", url: "/api/incidents", headers: manager })).json().incidents;
    assert.equal(incidents.find((incident: { ruleCode: string }) => incident.ruleCode === code)?.lifecycle, "resolved");
  }
});

it("preserves an open A03 incident through every simulator read failure", async () => {
  const instance = await scenarioServer();
  const manager = { authorization: "Bearer mock:plant-manager" };
  for (const fault of ["timeout", "source_error", "partial", "invalid_schema"] as const) {
    await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A03/reset", headers: manager });
    await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A03/trigger", headers: manager });
    await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A03/advance-time", headers: manager, payload: { minutes: 15 } });
    await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A03/poll", headers: manager });
    await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A03/correct", headers: manager });
    await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A03/fail-next-poll", headers: manager, payload: { fault } });
    const failed = await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A03/poll", headers: manager });
    assert.notEqual(failed.json().result.status, "healthy");
    const latest = (await instance.app.inject({ method: "GET", url: "/api/incidents", headers: manager })).json().incidents
      .filter((incident: { ruleCode: string }) => incident.ruleCode === "A03")
      .sort((a: { occurrence: number }, b: { occurrence: number }) => b.occurrence - a.occurrence)[0];
    assert.equal(latest.lifecycle, "open", `${fault} must not resolve an open incident`);
    await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A03/poll", headers: manager });
  }
});

it("publishes a simulator-created incident as a cursor-recoverable committed change", async () => {
  const instance = await scenarioServer();
  const manager = { authorization: "Bearer mock:plant-manager" };
  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A05/trigger", headers: manager });
  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A05/advance-time", headers: manager, payload: { minutes: 31 } });
  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A05/poll", headers: manager });
  const changes = await instance.app.inject({ method: "GET", url: "/api/changes?after=0", headers: manager });
  assert.equal(changes.statusCode, 200);
  const matching = changes.json().changes.filter((change: { payload: { incidentId?: string } }) => change.payload.incidentId);
  assert.equal(matching.length, 1);
  assert.equal(matching[0].eventType, "incident.opened");
  assert.equal(Number(matching[0].cursor) > 0, true);
});

it("rejects an unknown scenario rule with a usable 404", async () => {
  const instance = await scenarioServer();
  const response = await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A99/poll", headers: { authorization: "Bearer mock:plant-manager" } });
  assert.equal(response.statusCode, 404);
  assert.equal(response.json().error, "unknown_scenario_rule");
});

it("reroutes an open Phase 4B incident when the roster changes and protects diagnostics by user role", async () => {
  const instance = await scenarioServer();
  const manager = { authorization: "Bearer mock:plant-manager" };
  const operator = { authorization: "Bearer mock:machine-operator" };
  const trigger = await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/trigger", headers: manager });
  assert.equal(trigger.statusCode, 200, trigger.body);
  const advance = await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/advance-time", headers: manager, payload: { minutes: 31 } });
  assert.equal(advance.statusCode, 200, advance.body);
  const incidentWorkerGroup = workerGroupForIncident(advance.json().simulatedAt, "Día");
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
  const poll = await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/poll", headers: manager });
  assert.equal(poll.statusCode, 200, poll.body);
  assert.equal(poll.json().scenario.simulatedAt, advance.json().simulatedAt);
  const incident = (await instance.app.inject({ url: "/api/incidents", headers: manager })).json().incidents.find((item: { ruleCode: string }) => item.ruleCode === "A02");
  const route = `/api/internal/routing/${incident.id}`;
  assert.equal((await instance.app.inject({ url: route, headers: operator })).statusCode, 403);
  const before = await instance.app.inject({ url: route, headers: manager });
  assert.equal(before.statusCode, 200, before.body);
  assert.ok(before.json().recipients.some((recipient: { name: string }) => recipient.name === "Carlos Mendoza"), before.body);

  const replacement = assignment("dispatcher-replacement", "Carmen Ríos", "Despachador de almacén", "warehouse_group", incidentWorkerGroup, [], "Materias primas");
  const changed = roster.filter((item) => item.id !== "dispatcher-active").concat(replacement);
  assert.equal((await instance.app.inject({ method: "PUT", url: "/api/roster/assignments", headers: manager, payload: { revision: 1, assignments: changed } })).statusCode, 200);
  const after = await instance.app.inject({ url: route, headers: manager });
  assert.ok(after.json().recipients.some((recipient: { name: string }) => recipient.name === "Carmen Ríos"));
  assert.equal(after.json().recipients.some((recipient: { name: string }) => recipient.name === "Carlos Mendoza"), false);
  assert.equal(Number((await instance.database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_routing_decision WHERE incident_id=$1", [incident.id])).count), 2);
});

it("keeps simulator routes unavailable when disabled", async () => {
  const instance = await buildMonitorServer({
    config: { nodeEnv: "test", cookieSecret: "phase-4b-disabled-secret-with-enough-entropy", allowMockAuth: true, enableScenarioLab: false, databaseMode: "pglite", pgliteDataDir: "memory://" },
  });
  servers.push(instance);
  assert.equal((await instance.app.inject({ method: "GET", url: "/api/dev/scenarios", headers: { authorization: "Bearer mock:plant-manager" } })).statusCode, 404);
});
