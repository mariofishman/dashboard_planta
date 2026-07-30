import assert from "node:assert/strict";
import { afterEach, it } from "node:test";
import { loadConfig } from "./config.js";
import { buildMonitorServer, type MonitorServer } from "./server.js";

const servers: MonitorServer[] = [];

function activeDayGroup(date = new Date()): string {
  const day = Math.floor(Date.parse(`${date.toISOString().slice(0, 10)}T12:00:00Z`) / 86_400_000);
  const start = Math.floor(Date.parse("2026-07-25T12:00:00Z") / 86_400_000);
  const phase = Math.floor(Math.max(0, day - start) / 2);
  return ([{ id: "A", anchor: 2 }, { id: "B", anchor: 0 }, { id: "C", anchor: 1 }].find((group) => (group.anchor + phase) % 3 === 0)?.id ?? "A");
}

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
  for (const [code, minutes] of [["A03", 15], ["A05", 30]] as const) {
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

it("preserves every open scenario alert through every simulator read failure", async () => {
  const instance = await scenarioServer();
  const manager = { authorization: "Bearer mock:plant-manager" };
  for (const code of ["A02", "A03", "A05"] as const) {
    const scenario = code === "A05" ? "past_threshold_both" : "past_threshold";
    for (const fault of ["timeout", "source_error", "partial", "invalid_schema"] as const) {
      await instance.app.inject({ method: "POST", url: `/api/dev/scenarios/${code}/reset`, headers: manager });
      await instance.app.inject({ method: "POST", url: `/api/dev/scenarios/${code}/poll`, headers: manager });
      await instance.app.inject({ method: "POST", url: `/api/dev/scenarios/${code}/prepare`, headers: manager, payload: { scenario } });
      await instance.app.inject({ method: "POST", url: `/api/dev/scenarios/${code}/poll`, headers: manager });
      await instance.app.inject({ method: "POST", url: `/api/dev/scenarios/${code}/correct`, headers: manager });
      const scheduled = await instance.app.inject({ method: "POST", url: `/api/dev/scenarios/${code}/fail-next-poll`, headers: manager, payload: { fault } });
      assert.equal(scheduled.json().expectedResult.incidentLifecycle, "open");
      assert.match(scheduled.json().expectedResult.conversation, /conservan/);
      const failed = await instance.app.inject({ method: "POST", url: `/api/dev/scenarios/${code}/poll`, headers: manager });
      assert.notEqual(failed.json().result.status, "healthy");
      const latest = (await instance.app.inject({ method: "GET", url: "/api/incidents", headers: manager })).json().incidents
        .filter((incident: { ruleCode: string }) => incident.ruleCode === code)
        .sort((a: { occurrence: number }, b: { occurrence: number }) => b.occurrence - a.occurrence)[0];
      assert.equal(latest.lifecycle, "open", `${code} ${fault} must preserve the open incident`);
      await instance.app.inject({ method: "POST", url: `/api/dev/scenarios/${code}/poll`, headers: manager });
    }
  }
});

it("exposes the threshold matrix, A05 reason variants, and isolated scenario clocks", async () => {
  const instance = await scenarioServer();
  const manager = { authorization: "Bearer mock:plant-manager" };
  const prepare = async (code: string, scenario: string) => {
    const response = await instance.app.inject({ method: "POST", url: `/api/dev/scenarios/${code}/prepare`, headers: manager, payload: { scenario } });
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

  const suppressed = await prepare("A03", "suppressed_by_a07");
  assert.equal(suppressed.sourceState.rows[0].strongerA07, true);
  assert.equal(suppressed.sourceState.evaluation.status, "clear");

  const before = (await instance.app.inject({ method: "GET", url: "/api/dev/scenarios", headers: manager })).json().scenarios;
  const a02Cases = before.find((item: { ruleCode: string }) => item.ruleCode === "A02").supportedCases;
  assert.deepEqual(a02Cases, ["clean_baseline", "before_threshold", "at_threshold", "past_threshold"]);
  const a03Clock = before.find((item: { ruleCode: string }) => item.ruleCode === "A03").scenarioClock.currentAt;
  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/advance-time", headers: manager, payload: { minutes: 1 } });
  const after = (await instance.app.inject({ method: "GET", url: "/api/dev/scenarios", headers: manager })).json().scenarios;
  assert.equal(after.find((item: { ruleCode: string }) => item.ruleCode === "A03").scenarioClock.currentAt, a03Clock, "one rule cannot advance another rule's clock");
});

it("keeps A05 open until weighing and movement are both complete in either order", async () => {
  const instance = await scenarioServer();
  const manager = { authorization: "Bearer mock:plant-manager" };

  for (const [index, corrections] of [[1, ["weigh", "move"]], [2, ["move", "weigh"]]] as const) {
    await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A05/prepare", headers: manager, payload: { scenario: "past_threshold_both" } });
    await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A05/poll", headers: manager });

    const partial = await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A05/correct", headers: manager, payload: { correction: corrections[0] } });
    assert.equal(partial.statusCode, 200, partial.body);
    assert.equal(partial.json().sourceState.evaluation.status, "triggered");
    assert.equal(partial.json().expectedResult.awaitingPoll, true);
    assert.deepEqual(partial.json().sourceState.evaluation.reasons, [corrections[0] === "weigh" ? "still_at_machine" : "not_weighed"]);
    const preserved = await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A05/poll", headers: manager });
    assert.equal(preserved.json().scenario.expectedResult.awaitingPoll, false);
    assert.equal(preserved.json().scenario.actualMonitor.latestIncident.lifecycle, "open");
    assert.equal(preserved.json().scenario.actualMonitor.latestIncident.occurrence, index);

    const complete = await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A05/correct", headers: manager, payload: { correction: corrections[1] } });
    assert.equal(complete.json().sourceState.evaluation.status, "clear");
    assert.equal(complete.json().expectedResult.incidentLifecycle, "resolved");
    const resolved = await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A05/poll", headers: manager });
    assert.equal(resolved.json().scenario.actualMonitor.latestIncident.lifecycle, "resolved");
    assert.equal(resolved.json().scenario.actualMonitor.latestIncident.occurrence, index);
  }
});

it("applies the complete persistent, duplicate, visible-integration, resolution, and recurrence path to every alert", async () => {
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
    assert.equal((await instance.app.inject({ method: "POST", url: `/api/dev/scenarios/${code}/recur`, headers: manager })).statusCode, 409);
    await instance.app.inject({ method: "POST", url: `/api/dev/scenarios/${code}/prepare`, headers: manager, payload: { scenario } });
    await instance.app.inject({ method: "POST", url: `/api/dev/scenarios/${code}/poll`, headers: manager });
    const first = (await instance.app.inject({ method: "GET", url: "/api/dev/scenarios", headers: manager })).json().scenarios.find((item: { ruleCode: string }) => item.ruleCode === code);
    assert.equal(first.comparison.matches, true, `${code} expected and actual state must match`);
    assert.equal(first.actualMonitor.openIncidentCount, 1);
    assert.equal(first.actualMonitor.conversationLinkCount, 1);
    assert.equal(first.actualMonitor.alertMessageCount, 1);

    const incidentId = String(first.actualMonitor.latestIncident.id);
    const dashboard = await instance.app.inject({ method: "GET", url: "/api/incidents?status=open", headers: manager });
    assert.equal(dashboard.json().incidents.filter((item: { ruleCode: string }) => item.ruleCode === code).length, 1);
    const conversation = await instance.app.inject({ method: "GET", url: `/api/incidents/${incidentId}/conversation`, headers: manager });
    assert.equal(conversation.statusCode, 200, `${code} must be reachable through the incident conversation route`);

    await instance.app.inject({ method: "POST", url: `/api/dev/scenarios/${code}/poll`, headers: manager });
    const repeated = (await instance.app.inject({ method: "GET", url: "/api/dev/scenarios", headers: manager })).json().scenarios.find((item: { ruleCode: string }) => item.ruleCode === code);
    for (const field of ["incidentCount", "evidenceCount", "routingDecisionCount", "routingDeliveryCount", "conversationLinkCount", "alertMessageCount"] as const) {
      assert.equal(repeated.actualMonitor[field], first.actualMonitor[field], `${code} ${field} must not grow on an unchanged poll`);
    }

    await instance.app.inject({ method: "POST", url: `/api/dev/scenarios/${code}/correct`, headers: manager });
    await instance.app.inject({ method: "POST", url: `/api/dev/scenarios/${code}/poll`, headers: manager });
    let state = (await instance.app.inject({ method: "GET", url: "/api/dev/scenarios", headers: manager })).json().scenarios.find((item: { ruleCode: string }) => item.ruleCode === code);
    assert.equal(state.actualMonitor.latestIncident.lifecycle, "resolved");
    assert.equal(state.actualMonitor.openIncidentCount, 0);

    assert.equal((await instance.app.inject({ method: "POST", url: `/api/dev/scenarios/${code}/recur`, headers: manager })).statusCode, 200);
    await instance.app.inject({ method: "POST", url: `/api/dev/scenarios/${code}/poll`, headers: manager });
    state = (await instance.app.inject({ method: "GET", url: "/api/dev/scenarios", headers: manager })).json().scenarios.find((item: { ruleCode: string }) => item.ruleCode === code);
    assert.equal(state.actualMonitor.incidentCount, 2);
    assert.equal(state.actualMonitor.openIncidentCount, 1);
    assert.equal(state.actualMonitor.latestIncident.occurrence, 2);
  }
});

it("covers A02 transfer-end routing, A03 suppression, A05 reel routing, and the A02 movement handoff", async () => {
  const instance = await scenarioServer();
  const manager = { authorization: "Bearer mock:plant-manager" };

  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/prepare", headers: manager, payload: { scenario: "past_threshold" } });
  let polled = await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/poll", headers: manager });
  assert.equal(polled.json().scenario.actualMonitor.primaryRole, "warehouse_dispatcher");
  let routing = await instance.app.inject({ method: "GET", url: `/api/internal/routing/${polled.json().scenario.actualMonitor.latestIncident.id}`, headers: manager });
  assert.equal(routing.json().requiredRoles.includes("warehouse_dispatcher"), true);
  assert.equal(routing.json().requiredRoles.includes("warehouse_supervisor"), true);
  assert.equal(routing.json().requiredRoles.includes("machine_operator"), true);

  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A03/prepare", headers: manager, payload: { scenario: "past_threshold" } });
  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A03/poll", headers: manager });
  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A03/prepare", headers: manager, payload: { scenario: "suppressed_by_a07" } });
  const suppressed = await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A03/poll", headers: manager });
  assert.equal(suppressed.json().scenario.actualMonitor.latestIncident.lifecycle, "resolved");

  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A05/prepare", headers: manager, payload: { scenario: "past_threshold_produced" } });
  polled = await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A05/poll", headers: manager });
  routing = await instance.app.inject({ method: "GET", url: `/api/internal/routing/${polled.json().scenario.actualMonitor.latestIncident.id}`, headers: manager });
  assert.equal(routing.json().primaryRole, "process_operator");
  assert.equal(routing.json().requiredRoles.includes("process_supervisor"), true);
  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A05/correct", headers: manager });
  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A05/poll", headers: manager });
  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A05/prepare", headers: manager, payload: { scenario: "past_threshold_remnant" } });
  polled = await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A05/poll", headers: manager });
  routing = await instance.app.inject({ method: "GET", url: `/api/internal/routing/${polled.json().scenario.actualMonitor.latestIncident.id}`, headers: manager });
  assert.equal(routing.json().requiredRoles.includes("warehouse_dispatcher"), true);
  assert.equal(routing.json().requiredRoles.includes("warehouse_supervisor"), true);

  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A05/correct", headers: manager });
  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A05/poll", headers: manager });
  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A05/prepare", headers: manager, payload: { scenario: "movement_started" } });
  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A05/poll", headers: manager });
  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/prepare", headers: manager, payload: { scenario: "past_threshold" } });
  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/poll", headers: manager });
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

  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/prepare", headers: manager, payload: { scenario: "past_threshold" } });
  const advanced = await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/advance-time", headers: manager, payload: { minutes: 60 } });
  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A05/correct", headers: manager });
  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A03/fail-next-poll", headers: manager, payload: { fault: "partial" } });
  const after = (await instance.app.inject({ method: "GET", url: "/api/dev/scenarios", headers: manager })).json().scenarios;
  const a03After = after.find((item: { ruleCode: string }) => item.ruleCode === "A03");
  assert.equal(a03After.scenarioClock.currentAt, a03.scenarioClock.currentAt);
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

it("keeps evidence, routing, conversations, and alert cards idempotent and gates recurrence", async () => {
  const instance = await scenarioServer();
  const manager = { authorization: "Bearer mock:plant-manager" };
  const assignment = (id: string, person: string, position: string, scope: string, operations: string[] = []) => ({
    id, person, position, operations, warehouseType: null, scope, group: null, validFrom: "2026-07-01", validTo: null, state: "active", setupComplete: true,
  });
  await instance.app.inject({ method: "PUT", url: "/api/roster/assignments", headers: manager, payload: { revision: 0, assignments: [
    assignment("manager", "María Torres", "Gerente de fábrica", "factory"),
    assignment("leader", "Rosa Paredes", "Líder técnico", "operation", ["Impresión"]),
  ] } });

  assert.equal((await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/recur", headers: manager })).statusCode, 409);
  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/prepare", headers: manager, payload: { scenario: "past_threshold" } });
  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/poll", headers: manager });
  const first = (await instance.app.inject({ method: "GET", url: "/api/dev/scenarios", headers: manager })).json().scenarios.find((item: { ruleCode: string }) => item.ruleCode === "A02");
  assert.equal(first.actualMonitor.openIncidentCount, 1);
  assert.equal(first.actualMonitor.conversationLinkCount, 1);
  assert.equal(first.actualMonitor.alertMessageCount, 1);

  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/poll", headers: manager });
  const repeated = (await instance.app.inject({ method: "GET", url: "/api/dev/scenarios", headers: manager })).json().scenarios.find((item: { ruleCode: string }) => item.ruleCode === "A02");
  for (const field of ["incidentCount", "evidenceCount", "routingDecisionCount", "routingDeliveryCount", "conversationLinkCount", "alertMessageCount"] as const) {
    assert.equal(repeated.actualMonitor[field], first.actualMonitor[field], `${field} must not grow on an unchanged successful poll`);
  }

  const incidentId = String(repeated.actualMonitor.latestIncident.id);
  await instance.database.transaction(async (transaction) => {
    await transaction.execute("DELETE FROM monitor_message WHERE client_command_id=$1", [`incident:${incidentId}`]);
    await transaction.execute("DELETE FROM monitor_conversation_incident WHERE incident_id=$1", [incidentId]);
  });
  const incomplete = (await instance.app.inject({ method: "GET", url: "/api/dev/scenarios", headers: manager })).json().scenarios.find((item: { ruleCode: string }) => item.ruleCode === "A02");
  assert.equal(incomplete.comparison.matches, false, "missing conversation results cannot be labeled as matching");
  assert.equal(incomplete.comparison.mismatches.includes("conversation_link_count"), true);
  assert.equal(incomplete.comparison.mismatches.includes("alert_message_count"), true);
  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/poll", headers: manager });
  const repaired = (await instance.app.inject({ method: "GET", url: "/api/dev/scenarios", headers: manager })).json().scenarios.find((item: { ruleCode: string }) => item.ruleCode === "A02");
  assert.equal(repaired.actualMonitor.conversationLinkCount, 1, "an unchanged successful poll repairs a missing conversation link");
  assert.equal(repaired.actualMonitor.alertMessageCount, 1, "an unchanged successful poll repairs a missing alert card");
  assert.equal(repaired.actualMonitor.routingDecisionCount, first.actualMonitor.routingDecisionCount, "downstream repair reuses the routing decision");
  assert.equal(repaired.actualMonitor.routingDeliveryCount, first.actualMonitor.routingDeliveryCount, "downstream repair does not duplicate deliveries");

  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/correct", headers: manager });
  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/poll", headers: manager });
  assert.equal((await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/recur", headers: manager })).statusCode, 200);
  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/poll", headers: manager });
  const recurred = (await instance.app.inject({ method: "GET", url: "/api/dev/scenarios", headers: manager })).json().scenarios.find((item: { ruleCode: string }) => item.ruleCode === "A02");
  assert.equal(recurred.actualMonitor.incidentCount, 2);
  assert.equal(recurred.actualMonitor.openIncidentCount, 1);
  assert.equal(recurred.actualMonitor.latestIncident.occurrence, 2);
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
  const assignment = (id: string, person: string, position: string, scope: string, group: string | null, operations: string[] = [], warehouseType: string | null = null) => ({
    id, person, position, operations, warehouseType, scope, group, validFrom: "2026-07-01", validTo: null, state: "active", setupComplete: true,
  });
  const activeGroup = activeDayGroup();
  const roster = [
    assignment("manager", "María Torres", "Gerente de fábrica", "factory", null),
    assignment("supervisor-a", "Luis Vargas", "Supervisor de turno de operación", "operation_group", activeGroup, ["Impresión"]),
    assignment("leader", "Rosa Paredes", "Líder técnico", "operation", null, ["Impresión"]),
    assignment("operator-a", "Jorge Acosta", "Operador de máquina", "machine_group", activeGroup, ["Impresión"]),
    assignment("dispatcher-a", "Carlos Mendoza", "Despachador de almacén", "warehouse_group", activeGroup, [], "Materias primas"),
    assignment("warehouse-supervisor-a", "Sofía Ramos", "Supervisor de almacén", "warehouse_group", activeGroup, [], "Materias primas"),
  ];
  assert.equal((await instance.app.inject({ method: "PUT", url: "/api/roster/assignments", headers: manager, payload: { revision: 0, assignments: roster } })).statusCode, 200);
  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/trigger", headers: manager });
  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/advance-time", headers: manager, payload: { minutes: 31 } });
  await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/poll", headers: manager });
  const incident = (await instance.app.inject({ url: "/api/incidents", headers: manager })).json().incidents.find((item: { ruleCode: string }) => item.ruleCode === "A02");
  const route = `/api/internal/routing/${incident.id}`;
  assert.equal((await instance.app.inject({ url: route, headers: operator })).statusCode, 403);
  const before = await instance.app.inject({ url: route, headers: manager });
  assert.equal(before.statusCode, 200, before.body);
  assert.ok(before.json().recipients.some((recipient: { name: string }) => recipient.name === "Carlos Mendoza"), before.body);

  const replacement = assignment("dispatcher-replacement", "Carmen Ríos", "Despachador de almacén", "warehouse_group", activeGroup, [], "Materias primas");
  const changed = roster.filter((item) => item.id !== "dispatcher-a").concat(replacement);
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
