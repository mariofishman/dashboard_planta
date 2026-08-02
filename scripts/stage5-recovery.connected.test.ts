import assert from "node:assert/strict";
import test, { after } from "node:test";
import { resolve } from "node:path";
import { io as connectSocket, type Socket } from "socket.io-client";
import { TestDatabaseConnections, TestDatabaseScenarioRepository } from "@monitor/detection";
import { buildMonitorServer } from "../apps/api/src/server.js";
import { workerGroupForIncident } from "../apps/api/test/routing-fixtures.js";
import { createStep7SuiteRecorder, type Step7CaseEvidence } from "./lib/stage5-step7-evidence.mjs";

const repositoryRoot = resolve(import.meta.dirname, "..");
const recoveryEvidence = createStep7SuiteRecorder("recovery");
after(async () => { await recoveryEvidence.finalize(); });
const manager = { authorization: "Bearer mock:plant-manager" };

function interruptionPayload(value: unknown): Record<string, unknown> {
  return typeof value === "string" ? JSON.parse(value) as Record<string, unknown> : value as Record<string, unknown>;
}

async function connectTestSocket(baseUrl: string, token: string): Promise<Socket> {
  const socket = connectSocket(baseUrl, { auth: { token }, transports: ["websocket"] });
  await new Promise<void>((resolveReady, reject) => {
    socket.once("session.ready", () => resolveReady());
    socket.once("connect_error", reject);
  });
  return socket;
}

async function resumeSocket(socket: Socket, cursor: number): Promise<{
  incidents: Record<string, unknown>[];
  messages: Record<string, unknown>[];
  cursor: number;
}> {
  const incidents: Record<string, unknown>[] = [];
  const messages: Record<string, unknown>[] = [];
  const onIncident = (event: Record<string, unknown>) => incidents.push(event);
  const onMessage = (event: Record<string, unknown>) => messages.push(event);
  socket.on("incident.changed", onIncident);
  socket.on("message.created", onMessage);
  try {
    const ready = new Promise<Record<string, unknown>>((resolveReady) => socket.once("session.ready", resolveReady));
    socket.emit("sync.resume", { cursor });
    const session = await ready;
    return { incidents, messages, cursor: Number(session.cursor) };
  } finally {
    socket.off("incident.changed", onIncident);
    socket.off("message.created", onMessage);
  }
}

test("7.4b interrupts after incident commit and preserves the complete committed incident ledger", { timeout: 15_000 }, async () => {
  const connections = await TestDatabaseConnections.create(repositoryRoot);
  const server = await buildMonitorServer({
    config: {
      nodeEnv: "test",
      cookieSecret: "stage5-after-incident-commit-secret",
      allowMockAuth: true,
      enableScenarioLab: true,
      scenarioSource: "test_database",
      databaseMode: "pglite",
      pgliteDataDir: "memory://",
    },
  });
  let createdFlowId: number | null = null;
  let flowIdsBefore: number[] | null = null;
  let evidenceCase: Omit<Step7CaseEvidence, "cleanup"> | null = null;
  try {
    const acceptance = server.acceptance;
    assert.ok(acceptance);
    assert.ok(acceptance.source instanceof TestDatabaseScenarioRepository);
    const templateId = acceptance.source.fixtureIds.A02.flowId;
    const [existingFlows] = await connections.writer.query(`SELECT id FROM flujo_materiales_detalles
      WHERE observacion='MONITOR-STAGE5-A02-DISPATCH' ORDER BY id`);
    flowIdsBefore = (existingFlows as Array<{ id: number }>).map(({ id }) => Number(id));

    const experiment = await acceptance.runtime.create({
      name: "Step 7.4b after-incident-commit interruption",
      businessTime: "2026-08-01T18:00:00.000Z",
      pollingFrequencyMinutes: 60,
      identity: { runId: "step-7-4b", manifestVersion: "stage5.v1", sourceActionContractVersion: "stage5-source-actions.v1" },
    });
    await acceptance.runtime.pause(experiment.experiment!.id, false);
    const action = await server.app.inject({
      method: "POST", url: "/api/dev/source-actions", headers: manager,
      payload: { actionId: "a02.prepare_dispatch", key: templateId },
    });
    assert.equal(action.statusCode, 200, action.body);
    const execution = action.json().execution;
    createdFlowId = Number(execution.sourceDiff.after.find((record: { key: number }) => Number(record.key) !== templateId)?.key);
    assert.ok(createdFlowId > 0);
    acceptance.source.replaceTracked("A02", [createdFlowId]);
    await acceptance.runtime.advance(experiment.experiment!.id, 31);
    const scenario = await acceptance.source.status("A02");
    const workerGroup = workerGroupForIncident(scenario.scenarioClock.currentAt, "Día");
    const assignment = (id: string, sysUserId: number, person: string, position: string, scope: string,
      operations: string[] = [], warehouseType: string | null = null) => ({
      id, sysUserId, person, position, operations, warehouseType, scope,
      group: scope.endsWith("_group") ? workerGroup : null,
      validFrom: "2026-07-01", validTo: null, state: "active", setupComplete: true,
    });
    const roster = await server.app.inject({ method: "PUT", url: "/api/roster/assignments", headers: manager, payload: {
      revision: 0,
      assignments: [
        assignment("manager", 9001, "María Torres", "Gerente de fábrica", "factory"),
        assignment("supervisor", 9002, "Ana López", "Supervisor de turno de operación", "operation_group", ["Impresión"]),
        assignment("leader", 9004, "Rosa Paredes", "Líder técnico", "operation", ["Impresión"]),
        assignment("operator", 9003, "Jorge Acosta", "Operador de máquina", "machine_group", ["Impresión"]),
        assignment("dispatcher", 9010, "Carlos Mendoza", "Despachador de almacén", "warehouse_group", [], "Materias primas"),
        assignment("warehouse-supervisor", 9011, "Sofía Ramos", "Supervisor de almacén", "warehouse_group", [], "Materias primas"),
      ],
    } });
    assert.equal(roster.statusCode, 200, roster.body);

    const armed = await acceptance.interruptions.arm("after_incident_commit");
    const poll = await server.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
    assert.equal(poll.statusCode, 200, poll.body);
    assert.equal(poll.json().result.status, "healthy");
    const cycleId = String(poll.json().result.cycleId);
    const fired = await acceptance.interruptions.get(armed.id);
    assert.ok(fired);
    assert.equal(fired.status, "fired");
    assert.equal(fired.id, armed.id);
    assert.equal(fired.point, "after_incident_commit");
    assert.ok(fired.firedAt);
    assert.equal(fired.context.cycleId, cycleId);
    const persistedCycle = await server.database.queryOne(`SELECT cycle_id AS "cycleId",query_id AS "queryId",status,
      source_revision AS "sourceRevision",complete,full_evaluation AS "fullEvaluation"
      FROM monitor_poll_cycle WHERE cycle_id=$1`, [cycleId]);
    assert.equal(persistedCycle.cycleId, cycleId);
    assert.equal(persistedCycle.queryId, acceptance.registry.get("A02")!.query.queryId);
    assert.equal(persistedCycle.status, "healthy");
    assert.equal(persistedCycle.complete, true);
    assert.equal(persistedCycle.fullEvaluation, true);
    assert.match(String(persistedCycle.sourceRevision), /^test_database\.A02\.v\d+$/);

    const incident = await server.database.queryOne(`SELECT id,lifecycle,occurrence FROM monitor_incident
      WHERE rule_code='A02' AND condition_key LIKE $1`, [`%:${createdFlowId}`]);
    assert.ok(incident.id);
    assert.equal(incident.lifecycle, "open");
    assert.equal(Number(incident.occurrence), 1);
    assert.equal(fired.context.incidentId, incident.id);
    const evidence = await server.database.queryAll(`SELECT id,cycle_id AS "cycleId",status FROM monitor_incident_evidence
      WHERE incident_id=$1 ORDER BY observed_at,id`, [incident.id]);
    assert.equal(evidence.length, 1);
    assert.equal(evidence[0]!.cycleId, cycleId);
    assert.equal(evidence[0]!.status, "triggered");
    const transitions = await server.database.queryAll(`SELECT id,cycle_id AS "cycleId",from_state AS "fromState",to_state AS "toState"
      FROM monitor_incident_transition WHERE incident_id=$1 ORDER BY occurred_at,id`, [incident.id]);
    assert.equal(transitions.length, 1);
    assert.equal(transitions[0]!.cycleId, cycleId);
    assert.equal(transitions[0]!.fromState, null);
    assert.equal(transitions[0]!.toState, "open");
    const change = await server.database.queryOne(`SELECT cursor,event_id AS "eventId",event_type AS "eventType",payload
      FROM monitor_change_event WHERE payload->>'incidentId'=$1`, [incident.id]);
    assert.ok(Number(change.cursor) > 0);
    assert.equal(change.eventId, fired.context.changeEventId);
    assert.equal(Number(change.cursor), Number(fired.context.changeCursor));
    assert.equal(change.eventType, "incident.opened");
    assert.equal(interruptionPayload(change.payload).incidentId, incident.id);

    const downstream = await server.database.queryOne(`SELECT
      (SELECT COUNT(*)::int FROM monitor_routing_decision WHERE incident_id=$1) AS routing,
      (SELECT COUNT(*)::int FROM monitor_notification_delivery WHERE incident_id=$1) AS deliveries,
      (SELECT COUNT(*)::int FROM monitor_conversation_incident WHERE incident_id=$1) AS conversations,
      (SELECT COUNT(*)::int FROM monitor_message WHERE client_command_id=$2) AS messages`,
    [incident.id, `incident:${incident.id}`]);
    assert.deepEqual(Object.fromEntries(Object.entries(downstream).map(([key, value]) => [key, Number(value)])), {
      routing: 0, deliveries: 0, conversations: 0, messages: 0,
    });
    evidenceCase = {
      id: "7.4b", status: "passed", pollCycleIds: [cycleId], queryIds: [String(persistedCycle.queryId)], runtimeEventIds: [],
      interruptionIds: [armed.id], timestamps: { firedAt: [String(fired.firedAt)] },
      objectIds: {
        incidents: [String(incident.id)], evidence: evidence.map((row) => String(row.id)),
        transitions: transitions.map((row) => String(row.id)), changes: [String(change.eventId)],
      },
      assertions: { committedIncidentPreserved: true, downstreamAbsent: true, durableInterruptionIdentity: true },
    };
  } finally {
    if (createdFlowId) {
      await connections.writer.execute("DELETE FROM flujo_materiales_detalles WHERE id_padre=?", [createdFlowId]);
      await connections.writer.execute("DELETE FROM flujo_materiales_detalles WHERE id=?", [createdFlowId]);
    }
    if (flowIdsBefore) {
      const [restoredFlows] = await connections.writer.query(`SELECT id FROM flujo_materiales_detalles
        WHERE observacion='MONITOR-STAGE5-A02-DISPATCH' ORDER BY id`);
      const restoredFlowIds = (restoredFlows as Array<{ id: number }>).map(({ id }) => Number(id));
      assert.deepEqual(restoredFlowIds, flowIdsBefore);
      if (evidenceCase) recoveryEvidence.record({ ...evidenceCase, cleanup: {
        executedInFinally: true, sourceRestored: true,
        beforeSourceIds: flowIdsBefore.map(String), afterSourceIds: restoredFlowIds.map(String),
      } });
    }
    await server.close();
    await connections.close();
  }
});

test("7.4c later healthy polls repair downstream once without deleting interrupted state", { timeout: 15_000 }, async () => {
  const connections = await TestDatabaseConnections.create(repositoryRoot);
  const server = await buildMonitorServer({
    config: {
      nodeEnv: "test",
      cookieSecret: "stage5-after-incident-repair-secret",
      allowMockAuth: true,
      enableScenarioLab: true,
      scenarioSource: "test_database",
      databaseMode: "pglite",
      pgliteDataDir: "memory://",
    },
  });
  let createdFlowId: number | null = null;
  let flowIdsBefore: number[] | null = null;
  let evidenceCase: Omit<Step7CaseEvidence, "cleanup"> | null = null;
  try {
    const acceptance = server.acceptance;
    assert.ok(acceptance);
    assert.ok(acceptance.source instanceof TestDatabaseScenarioRepository);
    const templateId = acceptance.source.fixtureIds.A02.flowId;
    const [existingFlows] = await connections.writer.query(`SELECT id FROM flujo_materiales_detalles
      WHERE observacion='MONITOR-STAGE5-A02-DISPATCH' ORDER BY id`);
    flowIdsBefore = (existingFlows as Array<{ id: number }>).map(({ id }) => Number(id));
    const experiment = await acceptance.runtime.create({
      name: "Step 7.4c downstream repair",
      businessTime: "2026-08-01T19:00:00.000Z",
      pollingFrequencyMinutes: 60,
      identity: { runId: "step-7-4c", manifestVersion: "stage5.v1", sourceActionContractVersion: "stage5-source-actions.v1" },
    });
    await acceptance.runtime.pause(experiment.experiment!.id, false);
    const action = await server.app.inject({
      method: "POST", url: "/api/dev/source-actions", headers: manager,
      payload: { actionId: "a02.prepare_dispatch", key: templateId },
    });
    assert.equal(action.statusCode, 200, action.body);
    const execution = action.json().execution;
    createdFlowId = Number(execution.sourceDiff.after.find((record: { key: number }) => Number(record.key) !== templateId)?.key);
    assert.ok(createdFlowId > 0);
    acceptance.source.replaceTracked("A02", [createdFlowId]);
    await acceptance.runtime.advance(experiment.experiment!.id, 31);
    const scenario = await acceptance.source.status("A02");
    const workerGroup = workerGroupForIncident(scenario.scenarioClock.currentAt, "Día");
    const assignment = (id: string, sysUserId: number, person: string, position: string, scope: string,
      operations: string[] = [], warehouseType: string | null = null) => ({
      id, sysUserId, person, position, operations, warehouseType, scope,
      group: scope.endsWith("_group") ? workerGroup : null,
      validFrom: "2026-07-01", validTo: null, state: "active", setupComplete: true,
    });
    const roster = await server.app.inject({ method: "PUT", url: "/api/roster/assignments", headers: manager, payload: {
      revision: 0,
      assignments: [
        assignment("manager", 9001, "María Torres", "Gerente de fábrica", "factory"),
        assignment("supervisor", 9002, "Ana López", "Supervisor de turno de operación", "operation_group", ["Impresión"]),
        assignment("leader", 9004, "Rosa Paredes", "Líder técnico", "operation", ["Impresión"]),
        assignment("operator", 9003, "Jorge Acosta", "Operador de máquina", "machine_group", ["Impresión"]),
        assignment("dispatcher", 9010, "Carlos Mendoza", "Despachador de almacén", "warehouse_group", [], "Materias primas"),
        assignment("warehouse-supervisor", 9011, "Sofía Ramos", "Supervisor de almacén", "warehouse_group", [], "Materias primas"),
      ],
    } });
    assert.equal(roster.statusCode, 200, roster.body);

    const armed = await acceptance.interruptions.arm("after_incident_commit");
    const interruptedPoll = await server.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
    assert.equal(interruptedPoll.statusCode, 200, interruptedPoll.body);
    const interruptedCycleId = String(interruptedPoll.json().result.cycleId);
    const fired = await acceptance.interruptions.get(armed.id);
    assert.equal(fired?.status, "fired");
    const incidentId = String(fired?.context.incidentId);
    assert.ok(incidentId);

    const interruptedCounts = await server.database.queryOne(`SELECT
      (SELECT COUNT(*)::int FROM monitor_incident WHERE id=$1) AS incidents,
      (SELECT COUNT(*)::int FROM monitor_incident_evidence WHERE incident_id=$1) AS evidence,
      (SELECT COUNT(*)::int FROM monitor_incident_transition WHERE incident_id=$1) AS transitions,
      (SELECT COUNT(*)::int FROM monitor_change_event WHERE scope_type='plant' AND payload->>'incidentId'=$1::text) AS changes,
      (SELECT COUNT(*)::int FROM monitor_routing_decision WHERE incident_id=$1) AS routing,
      (SELECT COUNT(*)::int FROM monitor_notification_delivery WHERE incident_id=$1) AS deliveries,
      (SELECT COUNT(*)::int FROM monitor_conversation_incident WHERE incident_id=$1) AS conversations,
      (SELECT COUNT(*)::int FROM monitor_message WHERE client_command_id=$2) AS messages`, [incidentId, `incident:${incidentId}`]);
    assert.deepEqual(Object.fromEntries(Object.entries(interruptedCounts).map(([key, value]) => [key, Number(value)])), {
      incidents: 1, evidence: 1, transitions: 1, changes: 1, routing: 0, deliveries: 0, conversations: 0, messages: 0,
    });
    const committedIds = {
      incident: await server.database.queryAll("SELECT id FROM monitor_incident WHERE id=$1", [incidentId]),
      evidence: await server.database.queryAll("SELECT id FROM monitor_incident_evidence WHERE incident_id=$1 ORDER BY id", [incidentId]),
      transitions: await server.database.queryAll("SELECT id FROM monitor_incident_transition WHERE incident_id=$1 ORDER BY id", [incidentId]),
      changes: await server.database.queryAll("SELECT event_id AS id FROM monitor_change_event WHERE scope_type='plant' AND payload->>'incidentId'=$1 ORDER BY cursor", [incidentId]),
    };

    const repairPoll = await server.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
    assert.equal(repairPoll.statusCode, 200, repairPoll.body);
    assert.equal(repairPoll.json().result.status, "healthy");
    const repairCycleId = String(repairPoll.json().result.cycleId);
    assert.notEqual(repairCycleId, interruptedCycleId);
    const repaired = {
      incident: await server.database.queryAll("SELECT id FROM monitor_incident WHERE id=$1", [incidentId]),
      evidence: await server.database.queryAll("SELECT id FROM monitor_incident_evidence WHERE incident_id=$1 ORDER BY id", [incidentId]),
      transitions: await server.database.queryAll("SELECT id FROM monitor_incident_transition WHERE incident_id=$1 ORDER BY id", [incidentId]),
      changes: await server.database.queryAll("SELECT event_id AS id FROM monitor_change_event WHERE scope_type='plant' AND payload->>'incidentId'=$1 ORDER BY cursor", [incidentId]),
      messageChanges: await server.database.queryAll("SELECT event_id AS id FROM monitor_change_event WHERE scope_type='conversation' AND payload->>'incidentId'=$1 ORDER BY cursor", [incidentId]),
      routing: await server.database.queryAll("SELECT id FROM monitor_routing_decision WHERE incident_id=$1 ORDER BY id", [incidentId]),
      deliveries: await server.database.queryAll("SELECT id FROM monitor_notification_delivery WHERE incident_id=$1 ORDER BY id", [incidentId]),
      conversations: await server.database.queryAll("SELECT conversation_id AS id FROM monitor_conversation_incident WHERE incident_id=$1 ORDER BY conversation_id", [incidentId]),
      messages: await server.database.queryAll("SELECT id FROM monitor_message WHERE client_command_id=$1 ORDER BY id", [`incident:${incidentId}`]),
    };
    assert.equal(repaired.incident.length, 1);
    assert.equal(repaired.evidence.length, 1);
    assert.equal(repaired.transitions.length, 1);
    assert.equal(repaired.changes.length, 1);
    assert.equal(repaired.messageChanges.length, 1);
    assert.equal(repaired.routing.length, 1);
    assert.ok(repaired.deliveries.length > 0);
    assert.equal(repaired.conversations.length, 1);
    assert.equal(repaired.messages.length, 1);
    assert.deepEqual(repaired.incident, committedIds.incident);
    assert.deepEqual(repaired.evidence, committedIds.evidence);
    assert.deepEqual(repaired.transitions, committedIds.transitions);
    assert.deepEqual(repaired.changes, committedIds.changes);

    const repeatedPoll = await server.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
    assert.equal(repeatedPoll.statusCode, 200, repeatedPoll.body);
    const repeatedCycleId = String(repeatedPoll.json().result.cycleId);
    assert.equal(new Set([interruptedCycleId, repairCycleId, repeatedCycleId]).size, 3);
    const afterRepeat = {
      incident: await server.database.queryAll("SELECT id FROM monitor_incident WHERE id=$1", [incidentId]),
      evidence: await server.database.queryAll("SELECT id FROM monitor_incident_evidence WHERE incident_id=$1 ORDER BY id", [incidentId]),
      transitions: await server.database.queryAll("SELECT id FROM monitor_incident_transition WHERE incident_id=$1 ORDER BY id", [incidentId]),
      changes: await server.database.queryAll("SELECT event_id AS id FROM monitor_change_event WHERE scope_type='plant' AND payload->>'incidentId'=$1 ORDER BY cursor", [incidentId]),
      messageChanges: await server.database.queryAll("SELECT event_id AS id FROM monitor_change_event WHERE scope_type='conversation' AND payload->>'incidentId'=$1 ORDER BY cursor", [incidentId]),
      routing: await server.database.queryAll("SELECT id FROM monitor_routing_decision WHERE incident_id=$1 ORDER BY id", [incidentId]),
      deliveries: await server.database.queryAll("SELECT id FROM monitor_notification_delivery WHERE incident_id=$1 ORDER BY id", [incidentId]),
      conversations: await server.database.queryAll("SELECT conversation_id AS id FROM monitor_conversation_incident WHERE incident_id=$1 ORDER BY conversation_id", [incidentId]),
      messages: await server.database.queryAll("SELECT id FROM monitor_message WHERE client_command_id=$1 ORDER BY id", [`incident:${incidentId}`]),
    };
    assert.deepEqual(afterRepeat, repaired);
    assert.equal((await acceptance.interruptions.get(armed.id))?.status, "fired");
    assert.equal(Number((await server.database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_test_interruption")).count), 1);
    evidenceCase = {
      id: "7.4c", status: "passed", pollCycleIds: [interruptedCycleId, repairCycleId, repeatedCycleId],
      queryIds: [acceptance.registry.get("A02")!.query.queryId], runtimeEventIds: [], interruptionIds: [armed.id], timestamps: {},
      objectIds: {
        incidents: repaired.incident.map((row) => String(row.id)), evidence: repaired.evidence.map((row) => String(row.id)),
        transitions: repaired.transitions.map((row) => String(row.id)), incidentChanges: repaired.changes.map((row) => String(row.id)),
        messageChanges: repaired.messageChanges.map((row) => String(row.id)), routingDecisions: repaired.routing.map((row) => String(row.id)),
        deliveries: repaired.deliveries.map((row) => String(row.id)), conversations: repaired.conversations.map((row) => String(row.id)),
        messages: repaired.messages.map((row) => String(row.id)),
      },
      assertions: { committedIdsPreserved: true, downstreamRepairedOnce: true, completedReplayStable: true },
    };
  } finally {
    if (createdFlowId) {
      await connections.writer.execute("DELETE FROM flujo_materiales_detalles WHERE id_padre=?", [createdFlowId]);
      await connections.writer.execute("DELETE FROM flujo_materiales_detalles WHERE id=?", [createdFlowId]);
    }
    if (flowIdsBefore) {
      const [restoredFlows] = await connections.writer.query(`SELECT id FROM flujo_materiales_detalles
        WHERE observacion='MONITOR-STAGE5-A02-DISPATCH' ORDER BY id`);
      const restoredFlowIds = (restoredFlows as Array<{ id: number }>).map(({ id }) => Number(id));
      assert.deepEqual(restoredFlowIds, flowIdsBefore);
      if (evidenceCase) recoveryEvidence.record({ ...evidenceCase, cleanup: {
        executedInFinally: true, sourceRestored: true,
        beforeSourceIds: flowIdsBefore.map(String), afterSourceIds: restoredFlowIds.map(String),
      } });
    }
    await server.close();
    await connections.close();
  }
});

test("7.5b-7.5d repair routing and delivery interruptions and preserve completed delivery replay", { timeout: 15_000 }, async () => {
  const connections = await TestDatabaseConnections.create(repositoryRoot);
  const server = await buildMonitorServer({
    config: {
      nodeEnv: "test",
      cookieSecret: "stage5-routing-decision-recovery-secret",
      allowMockAuth: true,
      enableScenarioLab: true,
      scenarioSource: "test_database",
      databaseMode: "pglite",
      pgliteDataDir: "memory://",
    },
  });
  let createdFlowId: number | null = null;
  let flowIdsBefore: number[] | null = null;
  let evidenceCase: Omit<Step7CaseEvidence, "cleanup"> | null = null;
  try {
    const acceptance = server.acceptance;
    assert.ok(acceptance);
    assert.ok(acceptance.source instanceof TestDatabaseScenarioRepository);
    const templateId = acceptance.source.fixtureIds.A02.flowId;
    const [existingFlows] = await connections.writer.query(`SELECT id FROM flujo_materiales_detalles
      WHERE observacion='MONITOR-STAGE5-A02-DISPATCH' ORDER BY id`);
    flowIdsBefore = (existingFlows as Array<{ id: number }>).map(({ id }) => Number(id));
    const experiment = await acceptance.runtime.create({
      name: "Step 7.5 routing and delivery recovery",
      businessTime: "2026-08-01T20:00:00.000Z",
      pollingFrequencyMinutes: 60,
      identity: { runId: "step-7-5", manifestVersion: "stage5.v1", sourceActionContractVersion: "stage5-source-actions.v1" },
    });
    await acceptance.runtime.pause(experiment.experiment!.id, false);
    const action = await server.app.inject({
      method: "POST", url: "/api/dev/source-actions", headers: manager,
      payload: { actionId: "a02.prepare_dispatch", key: templateId },
    });
    assert.equal(action.statusCode, 200, action.body);
    const execution = action.json().execution;
    createdFlowId = Number(execution.sourceDiff.after.find((record: { key: number }) => Number(record.key) !== templateId)?.key);
    assert.ok(createdFlowId > 0);
    acceptance.source.replaceTracked("A02", [createdFlowId]);
    await acceptance.runtime.advance(experiment.experiment!.id, 31);
    const scenario = await acceptance.source.status("A02");
    const workerGroup = workerGroupForIncident(scenario.scenarioClock.currentAt, "Día");
    const assignment = (id: string, sysUserId: number, person: string, position: string, scope: string,
      operations: string[] = [], warehouseType: string | null = null) => ({
      id, sysUserId, person, position, operations, warehouseType, scope,
      group: scope.endsWith("_group") ? workerGroup : null,
      validFrom: "2026-07-01", validTo: null, state: "active", setupComplete: true,
    });
    const roster = await server.app.inject({ method: "PUT", url: "/api/roster/assignments", headers: manager, payload: {
      revision: 0,
      assignments: [
        assignment("manager", 9001, "María Torres", "Gerente de fábrica", "factory"),
        assignment("supervisor", 9002, "Ana López", "Supervisor de turno de operación", "operation_group", ["Impresión"]),
        assignment("leader", 9004, "Rosa Paredes", "Líder técnico", "operation", ["Impresión"]),
        assignment("operator", 9003, "Jorge Acosta", "Operador de máquina", "machine_group", ["Impresión"]),
        assignment("dispatcher", 9010, "Carlos Mendoza", "Despachador de almacén", "warehouse_group", [], "Materias primas"),
        assignment("warehouse-supervisor", 9011, "Sofía Ramos", "Supervisor de almacén", "warehouse_group", [], "Materias primas"),
      ],
    } });
    assert.equal(roster.statusCode, 200, roster.body);

    const beforeDecision = await acceptance.interruptions.arm("before_routing_decision");
    const firstPoll = await server.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
    assert.equal(firstPoll.statusCode, 200, firstPoll.body);
    const firstCycleId = String(firstPoll.json().result.cycleId);
    const beforeFired = await acceptance.interruptions.get(beforeDecision.id);
    assert.equal(beforeFired?.status, "fired");
    assert.equal(beforeFired?.context.cycleId, firstCycleId);
    const incidentId = String(beforeFired?.context.incidentId);
    assert.ok(incidentId);
    assert.deepEqual(await server.database.queryOne(`SELECT
      (SELECT COUNT(*)::int FROM monitor_routing_decision WHERE incident_id=$1) AS decisions,
      (SELECT COUNT(*)::int FROM monitor_notification_delivery WHERE incident_id=$1) AS deliveries`, [incidentId]),
    { decisions: 0, deliveries: 0 });

    const afterDecision = await acceptance.interruptions.arm("after_routing_decision");
    const secondPoll = await server.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
    assert.equal(secondPoll.statusCode, 200, secondPoll.body);
    const secondCycleId = String(secondPoll.json().result.cycleId);
    assert.notEqual(secondCycleId, firstCycleId);
    const afterFired = await acceptance.interruptions.get(afterDecision.id);
    assert.equal(afterFired?.status, "fired");
    assert.equal(afterFired?.context.cycleId, secondCycleId);
    assert.equal(afterFired?.context.incidentId, incidentId);
    const decisionId = String(afterFired?.context.routingDecisionId);
    assert.ok(decisionId);
    assert.deepEqual(await server.database.queryOne(`SELECT
      (SELECT COUNT(*)::int FROM monitor_routing_decision WHERE incident_id=$1) AS decisions,
      (SELECT COUNT(*)::int FROM monitor_routing_decision WHERE id=$2 AND incident_id=$1) AS exact_decision,
      (SELECT COUNT(*)::int FROM monitor_notification_delivery WHERE incident_id=$1) AS deliveries,
      (SELECT COUNT(*)::int FROM monitor_conversation_incident WHERE incident_id=$1) AS conversations,
      (SELECT COUNT(*)::int FROM monitor_message WHERE client_command_id=$3) AS messages`,
    [incidentId, decisionId, `incident:${incidentId}`]),
    { decisions: 1, exact_decision: 1, deliveries: 0, conversations: 0, messages: 0 });

    const beforeDelivery = await acceptance.interruptions.arm("before_delivery_creation");
    const thirdPoll = await server.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
    assert.equal(thirdPoll.statusCode, 200, thirdPoll.body);
    const thirdCycleId = String(thirdPoll.json().result.cycleId);
    const beforeDeliveryFired = await acceptance.interruptions.get(beforeDelivery.id);
    assert.equal(beforeDeliveryFired?.status, "fired");
    assert.equal(beforeDeliveryFired?.context.cycleId, thirdCycleId);
    assert.equal(beforeDeliveryFired?.context.routingDecisionId, decisionId);
    assert.equal(Number((await server.database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_notification_delivery WHERE incident_id=$1", [incidentId])).count), 0);

    const afterDelivery = await acceptance.interruptions.arm("after_delivery_creation");
    const fourthPoll = await server.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
    assert.equal(fourthPoll.statusCode, 200, fourthPoll.body);
    const fourthCycleId = String(fourthPoll.json().result.cycleId);
    const afterDeliveryFired = await acceptance.interruptions.get(afterDelivery.id);
    assert.equal(afterDeliveryFired?.status, "fired");
    assert.equal(afterDeliveryFired?.context.cycleId, fourthCycleId);
    assert.equal(afterDeliveryFired?.context.routingDecisionId, decisionId);
    assert.equal(Number(afterDeliveryFired?.context.completedDeliveryCount), 1);
    const partialDeliveries = await server.database.queryAll(`SELECT id,routing_decision_id AS "routingDecisionId",recipient_key AS "recipientKey"
      FROM monitor_notification_delivery WHERE incident_id=$1 ORDER BY recipient_key,id`, [incidentId]);
    assert.equal(partialDeliveries.length, 1);
    assert.equal(partialDeliveries[0]!.id, afterDeliveryFired?.context.deliveryId);
    assert.equal(partialDeliveries[0]!.routingDecisionId, decisionId);

    const repairPoll = await server.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
    assert.equal(repairPoll.statusCode, 200, repairPoll.body);
    const repairCycleId = String(repairPoll.json().result.cycleId);
    assert.equal(new Set([firstCycleId, secondCycleId, thirdCycleId, fourthCycleId, repairCycleId]).size, 5);
    const repairedDeliveries = await server.database.queryAll(`SELECT id,routing_decision_id AS "routingDecisionId",recipient_key AS "recipientKey"
      FROM monitor_notification_delivery WHERE incident_id=$1 ORDER BY recipient_key,id`, [incidentId]);
    assert.equal(repairedDeliveries.length, Number(afterFired?.context.recipientCount));
    assert.ok(repairedDeliveries.length > 0);
    assert.equal(repairedDeliveries.every((delivery) => delivery.routingDecisionId === decisionId), true);
    assert.equal(new Set(repairedDeliveries.map((delivery) => delivery.recipientKey)).size, repairedDeliveries.length);
    assert.ok(repairedDeliveries.some((delivery) => delivery.id === partialDeliveries[0]!.id));
    assert.equal(Number((await server.database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_routing_decision WHERE incident_id=$1", [incidentId])).count), 1);

    const completedSnapshot = {
      decisions: await server.database.queryAll(`SELECT id,incident_fingerprint AS "incidentFingerprint",status
        FROM monitor_routing_decision WHERE incident_id=$1 ORDER BY id`, [incidentId]),
      deliveries: await server.database.queryAll(`SELECT id,routing_decision_id AS "routingDecisionId",recipient_key AS "recipientKey",channel,state,attempt_count AS "attemptCount"
        FROM monitor_notification_delivery WHERE incident_id=$1 ORDER BY recipient_key,id`, [incidentId]),
    };
    const replayPoll = await server.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
    assert.equal(replayPoll.statusCode, 200, replayPoll.body);
    const replayCycleId = String(replayPoll.json().result.cycleId);
    assert.equal(new Set([firstCycleId, secondCycleId, thirdCycleId, fourthCycleId, repairCycleId, replayCycleId]).size, 6);
    const replayedSnapshot = {
      decisions: await server.database.queryAll(`SELECT id,incident_fingerprint AS "incidentFingerprint",status
        FROM monitor_routing_decision WHERE incident_id=$1 ORDER BY id`, [incidentId]),
      deliveries: await server.database.queryAll(`SELECT id,routing_decision_id AS "routingDecisionId",recipient_key AS "recipientKey",channel,state,attempt_count AS "attemptCount"
        FROM monitor_notification_delivery WHERE incident_id=$1 ORDER BY recipient_key,id`, [incidentId]),
    };
    assert.deepEqual(replayedSnapshot, completedSnapshot);
    const interruptionLedger = await server.database.queryAll(`SELECT id,point,status FROM monitor_test_interruption
      WHERE id=ANY($1::uuid[]) ORDER BY armed_at,id`, [[beforeDecision.id, afterDecision.id, beforeDelivery.id, afterDelivery.id]]);
    assert.equal(interruptionLedger.length, 4);
    assert.equal(interruptionLedger.every((row) => row.status === "fired"), true);
    assert.deepEqual(new Set(interruptionLedger.map((row) => row.id)), new Set([beforeDecision.id, afterDecision.id, beforeDelivery.id, afterDelivery.id]));
    evidenceCase = {
      id: "7.5b-7.5d", status: "passed",
      pollCycleIds: [firstCycleId, secondCycleId, thirdCycleId, fourthCycleId, repairCycleId, replayCycleId],
      queryIds: [acceptance.registry.get("A02")!.query.queryId], runtimeEventIds: [],
      interruptionIds: [beforeDecision.id, afterDecision.id, beforeDelivery.id, afterDelivery.id], timestamps: {},
      objectIds: {
        incidents: [incidentId], routingDecisions: completedSnapshot.decisions.map((row) => String(row.id)),
        deliveries: completedSnapshot.deliveries.map((row) => String(row.id)),
      },
      assertions: { zeroDecisionRecovered: true, partialDeliveryPreserved: true, requiredDeliveriesCompletedOnce: true, completedReplayStable: true },
    };
  } finally {
    if (createdFlowId) {
      await connections.writer.execute("DELETE FROM flujo_materiales_detalles WHERE id_padre=?", [createdFlowId]);
      await connections.writer.execute("DELETE FROM flujo_materiales_detalles WHERE id=?", [createdFlowId]);
    }
    if (flowIdsBefore) {
      const [restoredFlows] = await connections.writer.query(`SELECT id FROM flujo_materiales_detalles
        WHERE observacion='MONITOR-STAGE5-A02-DISPATCH' ORDER BY id`);
      const restoredFlowIds = (restoredFlows as Array<{ id: number }>).map(({ id }) => Number(id));
      assert.deepEqual(restoredFlowIds, flowIdsBefore);
      if (evidenceCase) recoveryEvidence.record({ ...evidenceCase, cleanup: {
        executedInFinally: true, sourceRestored: true,
        beforeSourceIds: flowIdsBefore.map(String), afterSourceIds: restoredFlowIds.map(String),
      } });
    }
    await server.close();
    await connections.close();
  }
});

test("7.6b-7.6c repair new and reused conversation transactions without duplicates", { timeout: 20_000 }, async () => {
  const connections = await TestDatabaseConnections.create(repositoryRoot);
  const server = await buildMonitorServer({
    config: {
      nodeEnv: "test",
      cookieSecret: "stage5-new-conversation-recovery-secret",
      allowMockAuth: true,
      enableScenarioLab: true,
      scenarioSource: "test_database",
      databaseMode: "pglite",
      pgliteDataDir: "memory://",
    },
  });
  let createdFlowId: number | null = null;
  let secondFlowId: number | null = null;
  let flowIdsBefore: number[] | null = null;
  let evidenceCase: Omit<Step7CaseEvidence, "cleanup"> | null = null;
  try {
    const acceptance = server.acceptance;
    assert.ok(acceptance);
    assert.ok(acceptance.source instanceof TestDatabaseScenarioRepository);
    const templateId = acceptance.source.fixtureIds.A02.flowId;
    const [existingFlows] = await connections.writer.query(`SELECT id FROM flujo_materiales_detalles
      WHERE observacion='MONITOR-STAGE5-A02-DISPATCH' ORDER BY id`);
    flowIdsBefore = (existingFlows as Array<{ id: number }>).map(({ id }) => Number(id));
    const experiment = await acceptance.runtime.create({
      name: "Step 7.6b new-conversation recovery",
      businessTime: "2026-08-01T21:00:00.000Z",
      pollingFrequencyMinutes: 60,
      identity: { runId: "step-7-6b", manifestVersion: "stage5.v1", sourceActionContractVersion: "stage5-source-actions.v1" },
    });
    await acceptance.runtime.pause(experiment.experiment!.id, false);
    const action = await server.app.inject({
      method: "POST", url: "/api/dev/source-actions", headers: manager,
      payload: { actionId: "a02.prepare_dispatch", key: templateId },
    });
    assert.equal(action.statusCode, 200, action.body);
    const execution = action.json().execution;
    createdFlowId = Number(execution.sourceDiff.after.find((record: { key: number }) => Number(record.key) !== templateId)?.key);
    assert.ok(createdFlowId > 0);
    acceptance.source.replaceTracked("A02", [createdFlowId]);
    await acceptance.runtime.advance(experiment.experiment!.id, 31);
    const scenario = await acceptance.source.status("A02");
    const workerGroup = workerGroupForIncident(scenario.scenarioClock.currentAt, "Día");
    const assignment = (id: string, sysUserId: number, person: string, position: string, scope: string,
      operations: string[] = [], warehouseType: string | null = null) => ({
      id, sysUserId, person, position, operations, warehouseType, scope,
      group: scope.endsWith("_group") ? workerGroup : null,
      validFrom: "2026-07-01", validTo: null, state: "active", setupComplete: true,
    });
    const roster = await server.app.inject({ method: "PUT", url: "/api/roster/assignments", headers: manager, payload: {
      revision: 0,
      assignments: [
        assignment("manager", 9001, "María Torres", "Gerente de fábrica", "factory"),
        assignment("supervisor", 9002, "Ana López", "Supervisor de turno de operación", "operation_group", ["Impresión"]),
        assignment("leader", 9004, "Rosa Paredes", "Líder técnico", "operation", ["Impresión"]),
        assignment("operator", 9003, "Jorge Acosta", "Operador de máquina", "machine_group", ["Impresión"]),
        assignment("dispatcher", 9010, "Carlos Mendoza", "Despachador de almacén", "warehouse_group", [], "Materias primas"),
        assignment("warehouse-supervisor", 9011, "Sofía Ramos", "Supervisor de almacén", "warehouse_group", [], "Materias primas"),
      ],
    } });
    assert.equal(roster.statusCode, 200, roster.body);

    const points = [
      "before_conversation_attachment",
      "after_conversation_attachment",
      "before_alert_message_creation",
      "after_alert_message_creation",
    ] as const;
    const interruptionIds: string[] = [];
    const cycleIds: string[] = [];
    let incidentId = "";
    let stableRouting: { decisions: Record<string, unknown>[]; deliveries: Record<string, unknown>[] } | null = null;
    for (const point of points) {
      const armed = await acceptance.interruptions.arm(point);
      interruptionIds.push(armed.id);
      const poll = await server.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
      assert.equal(poll.statusCode, 200, poll.body);
      const cycleId = String(poll.json().result.cycleId);
      cycleIds.push(cycleId);
      const fired = await acceptance.interruptions.get(armed.id);
      assert.equal(fired?.status, "fired");
      assert.equal(fired?.point, point);
      assert.equal(fired?.context.cycleId, cycleId);
      if (!incidentId) incidentId = String(fired?.context.incidentId);
      assert.equal(fired?.context.incidentId, incidentId);
      assert.ok(fired?.context.transactionConversationId);
      if (point === "after_alert_message_creation") assert.ok(fired?.context.transactionMessageId);
      assert.deepEqual(await server.database.queryOne(`SELECT
        (SELECT COUNT(*)::int FROM monitor_conversation) AS conversations,
        (SELECT COUNT(*)::int FROM monitor_conversation_participant) AS participants,
        (SELECT COUNT(*)::int FROM monitor_conversation_membership_audit) AS audits,
        (SELECT COUNT(*)::int FROM monitor_conversation_incident WHERE incident_id=$1) AS links,
        (SELECT COUNT(*)::int FROM monitor_message WHERE client_command_id=$2) AS messages`,
      [incidentId, `incident:${incidentId}`]),
      { conversations: 0, participants: 0, audits: 0, links: 0, messages: 0 });
      const routingSnapshot = {
        decisions: await server.database.queryAll("SELECT id,incident_fingerprint AS \"incidentFingerprint\",status FROM monitor_routing_decision WHERE incident_id=$1 ORDER BY id", [incidentId]),
        deliveries: await server.database.queryAll("SELECT id,routing_decision_id AS \"routingDecisionId\",recipient_key AS \"recipientKey\",state FROM monitor_notification_delivery WHERE incident_id=$1 ORDER BY recipient_key,id", [incidentId]),
      };
      assert.equal(routingSnapshot.decisions.length, 1);
      assert.ok(routingSnapshot.deliveries.length > 0);
      if (stableRouting) assert.deepEqual(routingSnapshot, stableRouting);
      else stableRouting = routingSnapshot;
    }
    assert.equal(new Set(cycleIds).size, 4);
    assert.equal(new Set(interruptionIds).size, 4);

    const repairPoll = await server.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
    assert.equal(repairPoll.statusCode, 200, repairPoll.body);
    const repairCycleId = String(repairPoll.json().result.cycleId);
    assert.equal(new Set([...cycleIds, repairCycleId]).size, 5);
    const repaired = {
      conversations: await server.database.queryAll("SELECT id,participant_fingerprint AS \"participantFingerprint\" FROM monitor_conversation ORDER BY id"),
      participants: await server.database.queryAll("SELECT conversation_id AS \"conversationId\",sys_user_id AS \"sysUserId\" FROM monitor_conversation_participant ORDER BY sys_user_id"),
      audits: await server.database.queryAll("SELECT conversation_id AS \"conversationId\",sys_user_id AS \"sysUserId\",action,reason FROM monitor_conversation_membership_audit ORDER BY id"),
      links: await server.database.queryAll("SELECT conversation_id AS \"conversationId\",incident_id AS \"incidentId\" FROM monitor_conversation_incident WHERE incident_id=$1", [incidentId]),
      messages: await server.database.queryAll("SELECT id,cursor,conversation_id AS \"conversationId\",sender_name AS \"senderName\",client_command_id AS \"clientCommandId\",kind,body,payload FROM monitor_message WHERE client_command_id=$1", [`incident:${incidentId}`]),
    };
    assert.equal(repaired.conversations.length, 1);
    const routing = await server.database.queryOne(`SELECT resolved_recipients AS recipients
      FROM monitor_routing_decision WHERE incident_id=$1 ORDER BY evaluated_at DESC LIMIT 1`, [incidentId]);
    const routingRecipients = (typeof routing.recipients === "string" ? JSON.parse(routing.recipients) : routing.recipients) as Array<{ sysUserId?: number | null }>;
    const expectedParticipantIds = routingRecipients
      .filter((recipient) => recipient.sysUserId !== null && recipient.sysUserId !== undefined && Number(recipient.sysUserId) > 0)
      .map((recipient) => Number(recipient.sysUserId))
      .sort((left, right) => left - right);
    assert.ok(expectedParticipantIds.length > 0);
    assert.deepEqual(repaired.participants.map((participant) => Number(participant.sysUserId)), expectedParticipantIds);
    assert.equal(repaired.audits.length, expectedParticipantIds.length);
    assert.equal(repaired.links.length, 1);
    assert.equal(repaired.messages.length, 1);
    assert.deepEqual({
      decisions: await server.database.queryAll("SELECT id,incident_fingerprint AS \"incidentFingerprint\",status FROM monitor_routing_decision WHERE incident_id=$1 ORDER BY id", [incidentId]),
      deliveries: await server.database.queryAll("SELECT id,routing_decision_id AS \"routingDecisionId\",recipient_key AS \"recipientKey\",state FROM monitor_notification_delivery WHERE incident_id=$1 ORDER BY recipient_key,id", [incidentId]),
    }, stableRouting);
    const conversationId = repaired.conversations[0]!.id;
    assert.equal(repaired.links[0]!.conversationId, conversationId);
    assert.equal(repaired.messages[0]!.conversationId, conversationId);

    const replayPoll = await server.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
    assert.equal(replayPoll.statusCode, 200, replayPoll.body);
    const replayCycleId = String(replayPoll.json().result.cycleId);
    assert.equal(new Set([...cycleIds, repairCycleId, replayCycleId]).size, 6);
    const replayed = {
      conversations: await server.database.queryAll("SELECT id,participant_fingerprint AS \"participantFingerprint\" FROM monitor_conversation ORDER BY id"),
      participants: await server.database.queryAll("SELECT conversation_id AS \"conversationId\",sys_user_id AS \"sysUserId\" FROM monitor_conversation_participant ORDER BY sys_user_id"),
      audits: await server.database.queryAll("SELECT conversation_id AS \"conversationId\",sys_user_id AS \"sysUserId\",action,reason FROM monitor_conversation_membership_audit ORDER BY id"),
      links: await server.database.queryAll("SELECT conversation_id AS \"conversationId\",incident_id AS \"incidentId\" FROM monitor_conversation_incident WHERE incident_id=$1", [incidentId]),
      messages: await server.database.queryAll("SELECT id,cursor,conversation_id AS \"conversationId\",sender_name AS \"senderName\",client_command_id AS \"clientCommandId\",kind,body,payload FROM monitor_message WHERE client_command_id=$1", [`incident:${incidentId}`]),
    };
    assert.deepEqual(replayed, repaired);

    const secondAction = await server.app.inject({
      method: "POST", url: "/api/dev/source-actions", headers: manager,
      payload: { actionId: "a02.prepare_dispatch", key: templateId },
    });
    assert.equal(secondAction.statusCode, 200, secondAction.body);
    const secondExecution = secondAction.json().execution;
    secondFlowId = Number(secondExecution.sourceDiff.after.find((record: { key: number }) =>
      Number(record.key) !== templateId && Number(record.key) !== createdFlowId)?.key);
    assert.ok(secondFlowId > 0);
    acceptance.source.replaceTracked("A02", [createdFlowId, secondFlowId]);
    await acceptance.runtime.configure(experiment.experiment!.id, 60, 99);
    const reuseInterruption = await acceptance.interruptions.arm("after_alert_message_creation");
    await acceptance.runtime.advance(experiment.experiment!.id, 31);
    const reuseInterruptedPoll = await server.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
    assert.equal(reuseInterruptedPoll.statusCode, 200, reuseInterruptedPoll.body);
    const reuseFired = await acceptance.interruptions.get(reuseInterruption.id);
    assert.equal(reuseFired?.status, "fired");
    const reuseCycleId = String(reuseFired?.context.cycleId);
    const persistedReuseCycle = await server.database.queryOne(`SELECT cycle_id AS "cycleId",query_id AS "queryId",status,complete,full_evaluation AS "fullEvaluation"
      FROM monitor_poll_cycle WHERE cycle_id=$1`, [reuseCycleId]);
    assert.equal(persistedReuseCycle.cycleId, reuseCycleId);
    assert.equal(persistedReuseCycle.queryId, acceptance.registry.get("A02")!.query.queryId);
    assert.equal(persistedReuseCycle.status, "healthy");
    assert.equal(persistedReuseCycle.complete, true);
    assert.equal(persistedReuseCycle.fullEvaluation, true);
    assert.equal(reuseFired?.context.transactionConversationId, conversationId);
    assert.equal(reuseFired?.context.conversationCreated, false);
    const secondIncidentId = String(reuseFired?.context.incidentId);
    assert.ok(secondIncidentId);
    assert.notEqual(secondIncidentId, incidentId);
    const afterReuseInterruption = {
      conversations: await server.database.queryAll("SELECT id,participant_fingerprint AS \"participantFingerprint\" FROM monitor_conversation ORDER BY id"),
      participants: await server.database.queryAll("SELECT conversation_id AS \"conversationId\",sys_user_id AS \"sysUserId\" FROM monitor_conversation_participant ORDER BY sys_user_id"),
      audits: await server.database.queryAll("SELECT conversation_id AS \"conversationId\",sys_user_id AS \"sysUserId\",action,reason FROM monitor_conversation_membership_audit ORDER BY id"),
      links: await server.database.queryAll("SELECT conversation_id AS \"conversationId\",incident_id AS \"incidentId\" FROM monitor_conversation_incident ORDER BY incident_id"),
      messages: await server.database.queryAll("SELECT id,cursor,conversation_id AS \"conversationId\",sender_name AS \"senderName\",client_command_id AS \"clientCommandId\",kind,body,payload FROM monitor_message WHERE kind='alert' ORDER BY client_command_id,id"),
    };
    assert.deepEqual(afterReuseInterruption.conversations, repaired.conversations);
    assert.deepEqual(afterReuseInterruption.participants, repaired.participants);
    assert.deepEqual(afterReuseInterruption.audits, repaired.audits);
    assert.deepEqual(afterReuseInterruption.links, repaired.links);
    assert.deepEqual(afterReuseInterruption.messages, repaired.messages);
    assert.equal(Number((await server.database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_conversation_incident WHERE incident_id=$1", [secondIncidentId])).count), 0);
    assert.equal(Number((await server.database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_message WHERE client_command_id=$1", [`incident:${secondIncidentId}`])).count), 0);

    const reuseRepairPoll = await server.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
    assert.equal(reuseRepairPoll.statusCode, 200, reuseRepairPoll.body);
    const reuseRepairCycleId = String(reuseRepairPoll.json().result.cycleId);
    assert.notEqual(reuseRepairCycleId, reuseCycleId);
    const reused = {
      conversations: await server.database.queryAll("SELECT id,participant_fingerprint AS \"participantFingerprint\" FROM monitor_conversation ORDER BY id"),
      participants: await server.database.queryAll("SELECT conversation_id AS \"conversationId\",sys_user_id AS \"sysUserId\" FROM monitor_conversation_participant ORDER BY sys_user_id"),
      audits: await server.database.queryAll("SELECT conversation_id AS \"conversationId\",sys_user_id AS \"sysUserId\",action,reason FROM monitor_conversation_membership_audit ORDER BY id"),
      links: await server.database.queryAll("SELECT conversation_id AS \"conversationId\",incident_id AS \"incidentId\" FROM monitor_conversation_incident ORDER BY incident_id"),
      messages: await server.database.queryAll("SELECT id,cursor,conversation_id AS \"conversationId\",sender_name AS \"senderName\",client_command_id AS \"clientCommandId\",kind,body,payload FROM monitor_message WHERE kind='alert' ORDER BY client_command_id,id"),
    };
    assert.deepEqual(reused.conversations, repaired.conversations);
    assert.deepEqual(reused.participants, repaired.participants);
    assert.deepEqual(reused.audits, repaired.audits);
    assert.equal(reused.links.length, 2);
    assert.equal(reused.messages.length, 2);
    assert.equal(reused.links.every((link) => link.conversationId === conversationId), true);
    assert.equal(reused.messages.every((message) => message.conversationId === conversationId), true);
    assert.ok(reused.links.some((link) => link.incidentId === secondIncidentId));
    assert.ok(reused.messages.some((message) => message.clientCommandId === `incident:${secondIncidentId}`));
    assert.ok(reused.messages.some((message) => message.id === repaired.messages[0]!.id));

    const reuseReplayPoll = await server.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
    assert.equal(reuseReplayPoll.statusCode, 200, reuseReplayPoll.body);
    const reuseReplayed = {
      conversations: await server.database.queryAll("SELECT id,participant_fingerprint AS \"participantFingerprint\" FROM monitor_conversation ORDER BY id"),
      participants: await server.database.queryAll("SELECT conversation_id AS \"conversationId\",sys_user_id AS \"sysUserId\" FROM monitor_conversation_participant ORDER BY sys_user_id"),
      audits: await server.database.queryAll("SELECT conversation_id AS \"conversationId\",sys_user_id AS \"sysUserId\",action,reason FROM monitor_conversation_membership_audit ORDER BY id"),
      links: await server.database.queryAll("SELECT conversation_id AS \"conversationId\",incident_id AS \"incidentId\" FROM monitor_conversation_incident ORDER BY incident_id"),
      messages: await server.database.queryAll("SELECT id,cursor,conversation_id AS \"conversationId\",sender_name AS \"senderName\",client_command_id AS \"clientCommandId\",kind,body,payload FROM monitor_message WHERE kind='alert' ORDER BY client_command_id,id"),
    };
    assert.deepEqual(reuseReplayed, reused);
    const allRoutingIds = await server.database.queryAll("SELECT id FROM monitor_routing_decision WHERE incident_id=ANY($1::uuid[]) ORDER BY id", [[incidentId, secondIncidentId]]);
    const allDeliveryIds = await server.database.queryAll("SELECT id FROM monitor_notification_delivery WHERE incident_id=ANY($1::uuid[]) ORDER BY id", [[incidentId, secondIncidentId]]);
    evidenceCase = {
      id: "7.6b-7.6c", status: "passed",
      pollCycleIds: [...cycleIds, repairCycleId, replayCycleId, reuseCycleId, reuseRepairCycleId, String(reuseReplayPoll.json().result.cycleId)],
      queryIds: [acceptance.registry.get("A02")!.query.queryId], runtimeEventIds: [],
      interruptionIds: [...interruptionIds, reuseInterruption.id], timestamps: {},
      objectIds: {
        incidents: [incidentId, secondIncidentId], conversations: reused.conversations.map((row) => String(row.id)),
        links: reused.links.map((row) => `${row.conversationId}:${row.incidentId}`), messages: reused.messages.map((row) => String(row.id)),
        routingDecisions: allRoutingIds.map((row) => String(row.id)), deliveries: allDeliveryIds.map((row) => String(row.id)),
      },
      assertions: { transactionRollbackComplete: true, newConversationRepairedOnce: true, existingConversationReused: true, completedReplayStable: true },
    };
  } finally {
    if (secondFlowId) {
      await connections.writer.execute("DELETE FROM flujo_materiales_detalles WHERE id_padre=?", [secondFlowId]);
      await connections.writer.execute("DELETE FROM flujo_materiales_detalles WHERE id=?", [secondFlowId]);
    }
    if (createdFlowId) {
      await connections.writer.execute("DELETE FROM flujo_materiales_detalles WHERE id_padre=?", [createdFlowId]);
      await connections.writer.execute("DELETE FROM flujo_materiales_detalles WHERE id=?", [createdFlowId]);
    }
    if (flowIdsBefore) {
      const [restoredFlows] = await connections.writer.query(`SELECT id FROM flujo_materiales_detalles
        WHERE observacion='MONITOR-STAGE5-A02-DISPATCH' ORDER BY id`);
      const restoredFlowIds = (restoredFlows as Array<{ id: number }>).map(({ id }) => Number(id));
      assert.deepEqual(restoredFlowIds, flowIdsBefore);
      if (evidenceCase) recoveryEvidence.record({ ...evidenceCase, cleanup: {
        executedInFinally: true, sourceRestored: true,
        beforeSourceIds: flowIdsBefore.map(String), afterSourceIds: restoredFlowIds.map(String),
      } });
    }
    await server.close();
    await connections.close();
  }
});

test("7.7c recovers connected incident publication exactly once across both interruption sides", { timeout: 25_000 }, async () => {
  const connections = await TestDatabaseConnections.create(repositoryRoot);
  const server = await buildMonitorServer({
    config: {
      nodeEnv: "test",
      cookieSecret: "stage5-incident-publication-recovery-secret",
      allowMockAuth: true,
      enableScenarioLab: true,
      scenarioSource: "test_database",
      databaseMode: "pglite",
      pgliteDataDir: "memory://",
    },
  });
  let firstFlowId: number | null = null;
  let secondFlowId: number | null = null;
  let flowIdsBefore: number[] | null = null;
  let socket: Socket | null = null;
  let evidenceCase: Omit<Step7CaseEvidence, "cleanup"> | null = null;
  try {
    const acceptance = server.acceptance;
    assert.ok(acceptance);
    assert.ok(acceptance.source instanceof TestDatabaseScenarioRepository);
    const templateId = acceptance.source.fixtureIds.A02.flowId;
    const [existingFlows] = await connections.writer.query(`SELECT id FROM flujo_materiales_detalles
      WHERE observacion='MONITOR-STAGE5-A02-DISPATCH' ORDER BY id`);
    flowIdsBefore = (existingFlows as Array<{ id: number }>).map(({ id }) => Number(id));
    const experiment = await acceptance.runtime.create({
      name: "Step 7.7c connected incident publication recovery",
      businessTime: "2026-08-01T22:00:00.000Z",
      pollingFrequencyMinutes: 60,
      identity: { runId: "step-7-7c", manifestVersion: "stage5.v1", sourceActionContractVersion: "stage5-source-actions.v1" },
    });
    await acceptance.runtime.pause(experiment.experiment!.id, false);
    const prepareDispatch = async () => {
      const response = await server.app.inject({
        method: "POST", url: "/api/dev/source-actions", headers: manager,
        payload: { actionId: "a02.prepare_dispatch", key: templateId },
      });
      assert.equal(response.statusCode, 200, response.body);
      const known = new Set([templateId, firstFlowId, secondFlowId].filter((value): value is number => Boolean(value)));
      const created = response.json().execution.sourceDiff.after.find((record: { key: number }) => !known.has(Number(record.key)));
      assert.ok(created);
      return Number(created.key);
    };
    firstFlowId = await prepareDispatch();
    acceptance.source.replaceTracked("A02", [firstFlowId]);
    await acceptance.runtime.advance(experiment.experiment!.id, 31);
    const scenario = await acceptance.source.status("A02");
    const workerGroup = workerGroupForIncident(scenario.scenarioClock.currentAt, "Día");
    const assignment = (id: string, sysUserId: number, person: string, position: string, scope: string,
      operations: string[] = [], warehouseType: string | null = null) => ({
      id, sysUserId, person, position, operations, warehouseType, scope,
      group: scope.endsWith("_group") ? workerGroup : null,
      validFrom: "2026-07-01", validTo: null, state: "active", setupComplete: true,
    });
    const roster = await server.app.inject({ method: "PUT", url: "/api/roster/assignments", headers: manager, payload: {
      revision: 0,
      assignments: [
        assignment("manager", 9001, "María Torres", "Gerente de fábrica", "factory"),
        assignment("supervisor", 9002, "Ana López", "Supervisor de turno de operación", "operation_group", ["Impresión"]),
        assignment("leader", 9004, "Rosa Paredes", "Líder técnico", "operation", ["Impresión"]),
        assignment("operator", 9003, "Jorge Acosta", "Operador de máquina", "machine_group", ["Impresión"]),
        assignment("dispatcher", 9010, "Carlos Mendoza", "Despachador de almacén", "warehouse_group", [], "Materias primas"),
        assignment("warehouse-supervisor", 9011, "Sofía Ramos", "Supervisor de almacén", "warehouse_group", [], "Materias primas"),
      ],
    } });
    assert.equal(roster.statusCode, 200, roster.body);
    await server.app.listen({ host: "127.0.0.1", port: 0 });
    const address = server.app.server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind to TCP");
    const baseUrl = `http://127.0.0.1:${address.port}`;
    socket = await connectTestSocket(baseUrl, "mock:plant-manager");

    const baseline = Number((await server.database.queryOne("SELECT COALESCE(MAX(cursor),0)::int AS cursor FROM monitor_change_event")).cursor);
    const liveIncidents: Record<string, unknown>[] = [];
    socket.on("incident.changed", (event: Record<string, unknown>) => liveIncidents.push(event));
    const before = await acceptance.interruptions.arm("before_change_publication");
    const beforePoll = await server.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
    assert.equal(beforePoll.statusCode, 200, beforePoll.body);
    const beforeFired = await acceptance.interruptions.get(before.id);
    assert.equal(beforeFired?.status, "fired");
    assert.equal(beforeFired?.context.channel, "incident.changed");
    assert.equal(liveIncidents.length, 0);
    const firstChange = await server.database.queryOne(`SELECT cursor,event_id AS "eventId",payload
      FROM monitor_change_event WHERE event_id=$1`, [beforeFired?.context.eventId]);
    const firstIncidentId = String(interruptionPayload(firstChange.payload).incidentId);
    assert.equal(Number(firstChange.cursor), Number(beforeFired?.context.cursor));
    socket.disconnect();
    socket = await connectTestSocket(baseUrl, "mock:plant-manager");
    const beforeReplay = await resumeSocket(socket, baseline);
    const recoveredFirst = beforeReplay.incidents.filter((event) => event.eventId === firstChange.eventId);
    assert.equal(recoveredFirst.length, 1);
    assert.equal(Number(recoveredFirst[0]!.cursor), Number(firstChange.cursor));
    const firstObjects = await server.database.queryOne(`SELECT
      (SELECT COUNT(*)::int FROM monitor_incident WHERE id=$1) AS incidents,
      (SELECT COUNT(*)::int FROM monitor_incident_evidence WHERE incident_id=$1) AS evidence,
      (SELECT COUNT(*)::int FROM monitor_incident_transition WHERE incident_id=$1) AS transitions,
      (SELECT COUNT(*)::int FROM monitor_change_event WHERE event_id=$2) AS changes,
      (SELECT COUNT(*)::int FROM monitor_routing_decision WHERE incident_id=$1) AS routing,
      (SELECT COUNT(*)::int FROM monitor_conversation_incident WHERE incident_id=$1) AS conversations,
      (SELECT COUNT(*)::int FROM monitor_message WHERE client_command_id=$3) AS messages`,
    [firstIncidentId, firstChange.eventId, `incident:${firstIncidentId}`]);
    assert.deepEqual(firstObjects, { incidents: 1, evidence: 1, transitions: 1, changes: 1, routing: 0, conversations: 0, messages: 0 });

    const repairFirst = await server.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
    assert.equal(repairFirst.statusCode, 200, repairFirst.body);
    secondFlowId = await prepareDispatch();
    acceptance.source.replaceTracked("A02", [firstFlowId, secondFlowId]);
    await acceptance.runtime.configure(experiment.experiment!.id, 60, 99);
    const after = await acceptance.interruptions.arm("after_change_publication");
    const liveAfter = new Promise<Record<string, unknown>>((resolveEvent) => socket!.once("incident.changed", resolveEvent));
    await acceptance.runtime.advance(experiment.experiment!.id, 31);
    const secondInterruptedPoll = await server.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
    assert.equal(secondInterruptedPoll.statusCode, 200, secondInterruptedPoll.body);
    const emittedSecond = await liveAfter;
    const afterFired = await acceptance.interruptions.get(after.id);
    assert.equal(afterFired?.status, "fired");
    assert.equal(afterFired?.context.channel, "incident.changed");
    assert.equal(emittedSecond.eventId, afterFired?.context.eventId);
    assert.equal(Number(emittedSecond.cursor), Number(afterFired?.context.cursor));
    const secondChange = await server.database.queryOne(`SELECT cursor,event_id AS "eventId",payload
      FROM monitor_change_event WHERE event_id=$1`, [afterFired?.context.eventId]);
    const secondIncidentId = String(interruptionPayload(secondChange.payload).incidentId);
    const secondObjects = await server.database.queryOne(`SELECT
      (SELECT COUNT(*)::int FROM monitor_incident WHERE id=$1) AS incidents,
      (SELECT COUNT(*)::int FROM monitor_incident_evidence WHERE incident_id=$1) AS evidence,
      (SELECT COUNT(*)::int FROM monitor_incident_transition WHERE incident_id=$1) AS transitions,
      (SELECT COUNT(*)::int FROM monitor_change_event WHERE event_id=$2) AS changes,
      (SELECT COUNT(*)::int FROM monitor_routing_decision WHERE incident_id=$1) AS routing,
      (SELECT COUNT(*)::int FROM monitor_conversation_incident WHERE incident_id=$1) AS conversations,
      (SELECT COUNT(*)::int FROM monitor_message WHERE client_command_id=$3) AS messages`,
    [secondIncidentId, secondChange.eventId, `incident:${secondIncidentId}`]);
    assert.deepEqual(secondObjects, { incidents: 1, evidence: 1, transitions: 1, changes: 1, routing: 0, conversations: 0, messages: 0 });
    socket.disconnect();
    socket = await connectTestSocket(baseUrl, "mock:plant-manager");
    const afterReplay = await resumeSocket(socket, Number(secondChange.cursor));
    assert.equal(afterReplay.incidents.some((event) => event.eventId === secondChange.eventId), false);
    assert.deepEqual(await server.database.queryOne(`SELECT
      (SELECT COUNT(*)::int FROM monitor_incident WHERE id=$1) AS incidents,
      (SELECT COUNT(*)::int FROM monitor_incident_evidence WHERE incident_id=$1) AS evidence,
      (SELECT COUNT(*)::int FROM monitor_incident_transition WHERE incident_id=$1) AS transitions,
      (SELECT COUNT(*)::int FROM monitor_change_event WHERE event_id=$2) AS changes,
      (SELECT COUNT(*)::int FROM monitor_routing_decision WHERE incident_id=$1) AS routing,
      (SELECT COUNT(*)::int FROM monitor_conversation_incident WHERE incident_id=$1) AS conversations,
      (SELECT COUNT(*)::int FROM monitor_message WHERE client_command_id=$3) AS messages`,
    [secondIncidentId, secondChange.eventId, `incident:${secondIncidentId}`]), secondObjects);
    const appliedIncidentCursors = new Set<number>();
    for (const event of [recoveredFirst[0]!, emittedSecond]) appliedIncidentCursors.add(Number(event.cursor));
    const replayAll = await resumeSocket(socket, baseline);
    for (const event of replayAll.incidents) appliedIncidentCursors.add(Number(event.cursor));
    assert.deepEqual(appliedIncidentCursors, new Set([Number(firstChange.cursor), Number(secondChange.cursor)]));
    const incidentRows = await server.database.queryAll(`SELECT i.id,e.id AS "evidenceId",t.id AS "transitionId",e.cycle_id AS "cycleId"
      FROM monitor_incident i JOIN monitor_incident_evidence e ON e.incident_id=i.id
      JOIN monitor_incident_transition t ON t.incident_id=i.id WHERE i.id=ANY($1::uuid[]) ORDER BY i.id`, [[firstIncidentId, secondIncidentId]]);
    evidenceCase = {
      id: "7.7c", status: "passed",
      pollCycleIds: [...new Set([String(beforePoll.json().result.cycleId), String(repairFirst.json().result.cycleId), ...incidentRows.map((row) => String(row.cycleId))])],
      queryIds: [acceptance.registry.get("A02")!.query.queryId], runtimeEventIds: [], interruptionIds: [before.id, after.id], timestamps: {},
      objectIds: {
        incidents: [firstIncidentId, secondIncidentId], evidence: incidentRows.map((row) => String(row.evidenceId)),
        transitions: incidentRows.map((row) => String(row.transitionId)), changes: [String(firstChange.eventId), String(secondChange.eventId)],
      },
      assertions: { beforeRecoveredOnReconnect: true, afterNotReplayedFromAppliedCursor: true, effectiveOnceByCursor: true, persistedObjectsUnchanged: true },
    };
  } finally {
    socket?.disconnect();
    if (secondFlowId) {
      await connections.writer.execute("DELETE FROM flujo_materiales_detalles WHERE id_padre=?", [secondFlowId]);
      await connections.writer.execute("DELETE FROM flujo_materiales_detalles WHERE id=?", [secondFlowId]);
    }
    if (firstFlowId) {
      await connections.writer.execute("DELETE FROM flujo_materiales_detalles WHERE id_padre=?", [firstFlowId]);
      await connections.writer.execute("DELETE FROM flujo_materiales_detalles WHERE id=?", [firstFlowId]);
    }
    if (flowIdsBefore) {
      const [restoredFlows] = await connections.writer.query(`SELECT id FROM flujo_materiales_detalles
        WHERE observacion='MONITOR-STAGE5-A02-DISPATCH' ORDER BY id`);
      const restoredFlowIds = (restoredFlows as Array<{ id: number }>).map(({ id }) => Number(id));
      assert.deepEqual(restoredFlowIds, flowIdsBefore);
      if (evidenceCase) recoveryEvidence.record({ ...evidenceCase, cleanup: {
        executedInFinally: true, sourceRestored: true,
        beforeSourceIds: flowIdsBefore.map(String), afterSourceIds: restoredFlowIds.map(String),
      } });
    }
    await server.close();
    await connections.close();
  }
});

test("7.7d recovers authorized alert-message publication without duplicating downstream objects", { timeout: 25_000 }, async () => {
  const connections = await TestDatabaseConnections.create(repositoryRoot);
  const server = await buildMonitorServer({
    config: {
      nodeEnv: "test",
      cookieSecret: "stage5-message-publication-recovery-secret",
      allowMockAuth: true,
      enableScenarioLab: true,
      scenarioSource: "test_database",
      databaseMode: "pglite",
      pgliteDataDir: "memory://",
    },
  });
  let firstFlowId: number | null = null;
  let secondFlowId: number | null = null;
  let flowIdsBefore: number[] | null = null;
  let authorizedSocket: Socket | null = null;
  let unauthorizedSocket: Socket | null = null;
  let evidenceCase: Omit<Step7CaseEvidence, "cleanup"> | null = null;
  try {
    const acceptance = server.acceptance;
    assert.ok(acceptance);
    assert.ok(acceptance.source instanceof TestDatabaseScenarioRepository);
    const templateId = acceptance.source.fixtureIds.A02.flowId;
    const [existingFlows] = await connections.writer.query(`SELECT id FROM flujo_materiales_detalles
      WHERE observacion='MONITOR-STAGE5-A02-DISPATCH' ORDER BY id`);
    flowIdsBefore = (existingFlows as Array<{ id: number }>).map(({ id }) => Number(id));
    const experiment = await acceptance.runtime.create({
      name: "Step 7.7d connected alert-message publication recovery",
      businessTime: "2026-08-01T23:00:00.000Z",
      pollingFrequencyMinutes: 60,
      identity: { runId: "step-7-7d", manifestVersion: "stage5.v1", sourceActionContractVersion: "stage5-source-actions.v1" },
    });
    await acceptance.runtime.pause(experiment.experiment!.id, false);
    const prepareDispatch = async () => {
      const response = await server.app.inject({
        method: "POST", url: "/api/dev/source-actions", headers: manager,
        payload: { actionId: "a02.prepare_dispatch", key: templateId },
      });
      assert.equal(response.statusCode, 200, response.body);
      const known = new Set([templateId, firstFlowId, secondFlowId].filter((value): value is number => Boolean(value)));
      const created = response.json().execution.sourceDiff.after.find((record: { key: number }) => !known.has(Number(record.key)));
      assert.ok(created);
      return Number(created.key);
    };
    firstFlowId = await prepareDispatch();
    acceptance.source.replaceTracked("A02", [firstFlowId]);
    await acceptance.runtime.advance(experiment.experiment!.id, 31);
    const scenario = await acceptance.source.status("A02");
    const workerGroup = workerGroupForIncident(scenario.scenarioClock.currentAt, "Día");
    const assignment = (id: string, sysUserId: number, person: string, position: string, scope: string,
      operations: string[] = [], warehouseType: string | null = null) => ({
      id, sysUserId, person, position, operations, warehouseType, scope,
      group: scope.endsWith("_group") ? workerGroup : null,
      validFrom: "2026-07-01", validTo: null, state: "active", setupComplete: true,
    });
    const roster = await server.app.inject({ method: "PUT", url: "/api/roster/assignments", headers: manager, payload: {
      revision: 0,
      assignments: [
        assignment("manager", 9001, "María Torres", "Gerente de fábrica", "factory"),
        assignment("supervisor", 9002, "Ana López", "Supervisor de turno de operación", "operation_group", ["Impresión"]),
        assignment("leader", 9004, "Rosa Paredes", "Líder técnico", "operation", ["Impresión"]),
        assignment("operator", 9013, "Jorge Acosta", "Operador de máquina", "machine_group", ["Impresión"]),
        assignment("dispatcher", 9010, "Carlos Mendoza", "Despachador de almacén", "warehouse_group", [], "Materias primas"),
        assignment("warehouse-supervisor", 9011, "Sofía Ramos", "Supervisor de almacén", "warehouse_group", [], "Materias primas"),
        assignment("excluded-user", 9003, "Operación de máquina", "Planificador", "factory"),
      ],
    } });
    assert.equal(roster.statusCode, 200, roster.body);
    await server.app.listen({ host: "127.0.0.1", port: 0 });
    const address = server.app.server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind to TCP");
    const baseUrl = `http://127.0.0.1:${address.port}`;
    authorizedSocket = await connectTestSocket(baseUrl, "mock:plant-manager");
    unauthorizedSocket = await connectTestSocket(baseUrl, "mock:machine-operator");

    const incidentBefore = await acceptance.interruptions.arm("before_change_publication");
    const incidentPoll = await server.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
    assert.equal(incidentPoll.statusCode, 200, incidentPoll.body);
    const incidentBeforeFired = await acceptance.interruptions.get(incidentBefore.id);
    assert.equal(incidentBeforeFired?.context.channel, "incident.changed");
    const firstIncidentCursor = Number(incidentBeforeFired?.context.cursor);
    const firstIncidentId = String((incidentBeforeFired?.context.payload as Record<string, unknown>).incidentId);

    const liveMessages: Record<string, unknown>[] = [];
    authorizedSocket.on("message.created", (event: Record<string, unknown>) => liveMessages.push(event));
    const beforeMessage = await acceptance.interruptions.arm("before_change_publication");
    const repairFirst = await server.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
    assert.equal(repairFirst.statusCode, 200, repairFirst.body);
    const beforeMessageFired = await acceptance.interruptions.get(beforeMessage.id);
    assert.equal(beforeMessageFired?.status, "fired");
    assert.equal(beforeMessageFired?.context.channel, "message.created");
    assert.equal(liveMessages.length, 0);
    const firstMessageChange = await server.database.queryOne(`SELECT cursor,event_id AS "eventId",scope_id AS "scopeId",payload
      FROM monitor_change_event WHERE event_id=$1`, [beforeMessageFired?.context.eventId]);
    const firstMessagePayload = interruptionPayload(firstMessageChange.payload);
    assert.equal(firstMessagePayload.incidentId, firstIncidentId);
    assert.equal(Number(firstMessageChange.cursor), Number(beforeMessageFired?.context.cursor));
    assert.equal(Number((await server.database.queryOne(`SELECT COUNT(*)::int AS count
      FROM monitor_conversation_participant WHERE conversation_id=$1 AND sys_user_id=9001 AND removed_at IS NULL`,
    [firstMessageChange.scopeId])).count), 1);
    authorizedSocket.disconnect();
    authorizedSocket = await connectTestSocket(baseUrl, "mock:plant-manager");
    const authorizedBeforeReplay = await resumeSocket(authorizedSocket, firstIncidentCursor);
    const recoveredFirstMessage = authorizedBeforeReplay.messages.filter((event) => event.eventId === firstMessageChange.eventId);
    assert.equal(recoveredFirstMessage.length, 1);
    assert.equal(Number(recoveredFirstMessage[0]!.cursor), Number(firstMessageChange.cursor));
    unauthorizedSocket.disconnect();
    unauthorizedSocket = await connectTestSocket(baseUrl, "mock:machine-operator");
    const unauthorizedBeforeReplay = await resumeSocket(unauthorizedSocket, firstIncidentCursor);
    assert.equal(unauthorizedBeforeReplay.messages.some((event) => event.eventId === firstMessageChange.eventId), false);

    secondFlowId = await prepareDispatch();
    acceptance.source.replaceTracked("A02", [firstFlowId, secondFlowId]);
    await acceptance.runtime.configure(experiment.experiment!.id, 60, 99);
    const secondIncidentBefore = await acceptance.interruptions.arm("before_change_publication");
    await acceptance.runtime.advance(experiment.experiment!.id, 31);
    const secondIncidentPoll = await server.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
    assert.equal(secondIncidentPoll.statusCode, 200, secondIncidentPoll.body);
    const secondIncidentFired = await acceptance.interruptions.get(secondIncidentBefore.id);
    assert.equal(secondIncidentFired?.status, "fired");
    assert.equal(secondIncidentFired?.context.channel, "incident.changed");
    const secondIncidentId = String((secondIncidentFired?.context.payload as Record<string, unknown>).incidentId);
    const secondIncidentCursor = Number(secondIncidentFired?.context.cursor);

    const afterMessage = await acceptance.interruptions.arm("after_change_publication");
    const emittedMessagePromise = new Promise<Record<string, unknown>>((resolveEvent) => authorizedSocket!.once("message.created", resolveEvent));
    const repairSecond = await server.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
    assert.equal(repairSecond.statusCode, 200, repairSecond.body);
    const emittedSecondMessage = await emittedMessagePromise;
    const afterMessageFired = await acceptance.interruptions.get(afterMessage.id);
    assert.equal(afterMessageFired?.status, "fired");
    assert.equal(afterMessageFired?.context.channel, "message.created");
    assert.equal(emittedSecondMessage.eventId, afterMessageFired?.context.eventId);
    assert.equal(Number(emittedSecondMessage.cursor), Number(afterMessageFired?.context.cursor));
    const secondMessageChange = await server.database.queryOne(`SELECT cursor,event_id AS "eventId",scope_id AS "scopeId",payload
      FROM monitor_change_event WHERE event_id=$1`, [afterMessageFired?.context.eventId]);
    const secondMessagePayload = interruptionPayload(secondMessageChange.payload);
    assert.equal(secondMessagePayload.incidentId, secondIncidentId);

    const stableObjects = await server.database.queryAll(`SELECT i.id AS "incidentId",rd.id AS "routingDecisionId",
      d.id AS "deliveryId",ci.conversation_id AS "conversationId",m.id AS "messageId",ce.event_id AS "messageEventId"
      FROM monitor_incident i
      JOIN monitor_routing_decision rd ON rd.incident_id=i.id
      JOIN monitor_notification_delivery d ON d.routing_decision_id=rd.id
      JOIN monitor_conversation_incident ci ON ci.incident_id=i.id
      JOIN monitor_message m ON m.client_command_id='incident:' || i.id::text
      JOIN monitor_change_event ce ON ce.scope_type='conversation' AND ce.payload->>'messageId'=m.id::text
      WHERE i.id=ANY($1::uuid[]) ORDER BY i.id,d.id`, [[firstIncidentId, secondIncidentId]]);
    assert.ok(stableObjects.length > 1);
    assert.equal(new Set(stableObjects.map((row) => row.incidentId)).size, 2);
    assert.equal(new Set(stableObjects.map((row) => row.messageId)).size, 2);
    assert.equal(new Set(stableObjects.map((row) => row.messageEventId)).size, 2);
    const exactCounts = await server.database.queryOne(`SELECT
      (SELECT COUNT(*)::int FROM monitor_conversation) AS conversations,
      (SELECT COUNT(*)::int FROM monitor_conversation_incident WHERE incident_id=ANY($1::uuid[])) AS links,
      (SELECT COUNT(*)::int FROM monitor_message WHERE client_command_id=ANY($2::text[])) AS messages,
      (SELECT COUNT(*)::int FROM monitor_change_event WHERE scope_type='conversation' AND payload->>'incidentId'=ANY($1::text[])) AS changes,
      (SELECT COUNT(*)::int FROM (SELECT incident_id,recipient_key FROM monitor_notification_delivery
        WHERE incident_id=ANY($1::uuid[]) GROUP BY incident_id,recipient_key HAVING COUNT(*)>1) duplicate) AS duplicate_deliveries`,
    [[firstIncidentId, secondIncidentId], [`incident:${firstIncidentId}`, `incident:${secondIncidentId}`]]);
    assert.deepEqual(exactCounts, { conversations: 1, links: 2, messages: 2, changes: 2, duplicate_deliveries: 0 });

    authorizedSocket.disconnect();
    authorizedSocket = await connectTestSocket(baseUrl, "mock:plant-manager");
    const authorizedAfterReplay = await resumeSocket(authorizedSocket, Number(secondMessageChange.cursor));
    assert.equal(authorizedAfterReplay.messages.some((event) => event.eventId === secondMessageChange.eventId), false);
    unauthorizedSocket.disconnect();
    unauthorizedSocket = await connectTestSocket(baseUrl, "mock:machine-operator");
    const unauthorizedAfterReplay = await resumeSocket(unauthorizedSocket, secondIncidentCursor);
    assert.equal(unauthorizedAfterReplay.messages.some((event) => event.eventId === secondMessageChange.eventId), false);
    const appliedMessageCursors = new Set([Number(firstMessageChange.cursor), Number(emittedSecondMessage.cursor)]);
    const authorizedReplayAll = await resumeSocket(authorizedSocket, firstIncidentCursor);
    for (const event of authorizedReplayAll.messages) appliedMessageCursors.add(Number(event.cursor));
    assert.deepEqual(appliedMessageCursors, new Set([Number(firstMessageChange.cursor), Number(secondMessageChange.cursor)]));

    const repeatPoll = await server.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
    assert.equal(repeatPoll.statusCode, 200, repeatPoll.body);
    assert.deepEqual(await server.database.queryAll(`SELECT i.id AS "incidentId",rd.id AS "routingDecisionId",
      d.id AS "deliveryId",ci.conversation_id AS "conversationId",m.id AS "messageId",ce.event_id AS "messageEventId"
      FROM monitor_incident i
      JOIN monitor_routing_decision rd ON rd.incident_id=i.id
      JOIN monitor_notification_delivery d ON d.routing_decision_id=rd.id
      JOIN monitor_conversation_incident ci ON ci.incident_id=i.id
      JOIN monitor_message m ON m.client_command_id='incident:' || i.id::text
      JOIN monitor_change_event ce ON ce.scope_type='conversation' AND ce.payload->>'messageId'=m.id::text
      WHERE i.id=ANY($1::uuid[]) ORDER BY i.id,d.id`, [[firstIncidentId, secondIncidentId]]), stableObjects);
    const incidentCycles = await server.database.queryAll("SELECT DISTINCT cycle_id AS \"cycleId\" FROM monitor_incident_evidence WHERE incident_id=ANY($1::uuid[]) ORDER BY cycle_id", [[firstIncidentId, secondIncidentId]]);
    const uniqueIds = (name: string) => [...new Set(stableObjects.map((row) => String(row[name])))];
    evidenceCase = {
      id: "7.7d", status: "passed",
      pollCycleIds: [...new Set([
        String(incidentPoll.json().result.cycleId), String(repairFirst.json().result.cycleId),
        String(repairSecond.json().result.cycleId), String(repeatPoll.json().result.cycleId),
        ...incidentCycles.map((row) => String(row.cycleId)),
      ])],
      queryIds: [acceptance.registry.get("A02")!.query.queryId], runtimeEventIds: [],
      interruptionIds: [incidentBefore.id, beforeMessage.id, secondIncidentBefore.id, afterMessage.id], timestamps: {},
      objectIds: {
        incidents: uniqueIds("incidentId"), routingDecisions: uniqueIds("routingDecisionId"), deliveries: uniqueIds("deliveryId"),
        conversations: uniqueIds("conversationId"), messages: uniqueIds("messageId"), messageChanges: uniqueIds("messageEventId"),
      },
      assertions: {
        beforeMessageRecoveredOnReconnect: true, afterMessageNotReplayedFromAppliedCursor: true,
        authorizedRecoveryOnly: true, effectiveOnceByCursor: true, downstreamObjectsNotDuplicated: true,
      },
    };
  } finally {
    authorizedSocket?.disconnect();
    unauthorizedSocket?.disconnect();
    if (secondFlowId) {
      await connections.writer.execute("DELETE FROM flujo_materiales_detalles WHERE id_padre=?", [secondFlowId]);
      await connections.writer.execute("DELETE FROM flujo_materiales_detalles WHERE id=?", [secondFlowId]);
    }
    if (firstFlowId) {
      await connections.writer.execute("DELETE FROM flujo_materiales_detalles WHERE id_padre=?", [firstFlowId]);
      await connections.writer.execute("DELETE FROM flujo_materiales_detalles WHERE id=?", [firstFlowId]);
    }
    if (flowIdsBefore) {
      const [restoredFlows] = await connections.writer.query(`SELECT id FROM flujo_materiales_detalles
        WHERE observacion='MONITOR-STAGE5-A02-DISPATCH' ORDER BY id`);
      const restoredFlowIds = (restoredFlows as Array<{ id: number }>).map(({ id }) => Number(id));
      assert.deepEqual(restoredFlowIds, flowIdsBefore);
      if (evidenceCase) recoveryEvidence.record({ ...evidenceCase, cleanup: {
        executedInFinally: true, sourceRestored: true,
        beforeSourceIds: flowIdsBefore.map(String), afterSourceIds: restoredFlowIds.map(String),
      } });
    }
    await server.close();
    await connections.close();
  }
});
