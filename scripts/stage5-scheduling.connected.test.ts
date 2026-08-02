import assert from "node:assert/strict";
import test, { after } from "node:test";
import { resolve } from "node:path";
import type { Principal } from "@monitor/contracts";
import {
  loadSourceActionContracts,
  ScenarioExperimentRepository,
  ScenarioExperimentRuntime,
  TestDatabaseConnections,
  TestDatabaseScenarioRepository,
  TestDatabaseSourceAdapter,
} from "@monitor/detection";
import { buildMonitorServer } from "../apps/api/src/server.js";
import { ScenarioSourceActionService } from "../apps/api/src/scenario-source-action-service.js";
import { createStep7SuiteRecorder, type Step7CaseEvidence } from "./lib/stage5-step7-evidence.mjs";

const repositoryRoot = resolve(import.meta.dirname, "..");
const schedulingEvidence = createStep7SuiteRecorder("scheduling");
after(async () => { await schedulingEvidence.finalize(); });
const manager: Principal = {
  sysUserId: 9001,
  displayName: "Gerencia de planta",
  role: "FACTORY_MANAGER",
  plantIds: [1],
  scopes: ["monitor:read", "monitor:admin"],
  operationAuthorizations: [],
};

async function waitFor<T>(read: () => Promise<T | null>, timeoutMs = 5_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await read();
    if (value !== null) return value;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 25));
  }
  throw new Error("automatic_scheduler_evidence_timeout");
}

function epoch(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string" || typeof value === "number") return new Date(value).getTime();
  return new Date(String(JSON.parse(JSON.stringify(value)))).getTime();
}

function iso(value: unknown): string {
  return new Date(epoch(value)).toISOString();
}

function payload(value: unknown): Record<string, unknown> {
  return typeof value === "string" ? JSON.parse(value) as Record<string, unknown> : value as Record<string, unknown>;
}

test("7.1a proves one real A02 poll is owned by the automatic due-time timer", { timeout: 10_000 }, async () => {
  const server = await buildMonitorServer({
    config: {
      nodeEnv: "development",
      cookieSecret: "stage5-scheduling-connected-secret",
      allowMockAuth: true,
      enableScenarioLab: true,
      scenarioSource: "test_database",
      databaseMode: "pglite",
      pgliteDataDir: "memory://",
    },
  });
  let evidenceCase: Omit<Step7CaseEvidence, "cleanup"> | null = null;
  try {
    const acceptance = server.acceptance;
    assert.ok(acceptance);
    const entry = acceptance.registry.get("A02");
    assert.ok(entry?.adapter instanceof TestDatabaseSourceAdapter);
    const before = await server.database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_poll_cycle WHERE query_id=$1", [entry.query.queryId]);
    const businessTime = "2026-08-01T09:00:00.000Z";
    const created = await acceptance.runtime.create({
      name: "Step 7.1a automatic due-time ownership",
      businessTime,
      frequencies: { A02: 1, A03: 60, A05: 60 },
      identity: { runId: "step-7-1a", manifestVersion: "stage5.v1", sourceActionContractVersion: "stage5-source-actions.v1" },
    });
    const configured = await acceptance.runtime.configure(created.experiment!.id, 60, { A02: 1, A03: 60, A05: 60 });
    const experimentId = configured.experiment!.id;
    const realDeadline = configured.nextAutomaticTickAt!;
    const dueAt = configured.experiment!.nextDue.A02;
    assert.equal(dueAt, "2026-08-01T09:01:00.000Z");

    const completed = await waitFor(async () => {
      const events = await server.database.queryAll(`SELECT id,event_type AS "eventType",rule_code AS "ruleCode",
        business_time AS "businessTime",payload,recorded_at AS "recordedAt" FROM monitor_scenario_runtime_event
        WHERE experiment_id=$1 ORDER BY sequence`, [experimentId]);
      return events.find((event) => event.eventType === "poll_completed" && event.ruleCode === "A02") ?? null;
    });
    await acceptance.runtime.pause(experimentId, true);

    const events = await server.database.queryAll(`SELECT id,event_type AS "eventType",rule_code AS "ruleCode",
      business_time AS "businessTime",payload,recorded_at AS "recordedAt" FROM monitor_scenario_runtime_event
      WHERE experiment_id=$1 ORDER BY sequence`, [experimentId]);
    const a02Events = events.filter((event) => event.ruleCode === "A02");
    assert.deepEqual(a02Events.map((event) => event.eventType), ["poll_started", "poll_completed"]);
    assert.ok(a02Events.every((event) => event.businessTime instanceof Date
      ? event.businessTime.toISOString() === dueAt : new Date(String(event.businessTime)).toISOString() === dueAt));
    const startedPayload = payload(a02Events[0]!.payload);
    const completedPayload = payload(completed.payload);
    assert.equal(startedPayload.trigger, "automatic_timer");
    assert.equal(completedPayload.trigger, "automatic_timer");
    assert.equal(completedPayload.timerDeadline, realDeadline);
    assert.ok(Date.parse(String(completedPayload.timerObservedAt)) >= Date.parse(realDeadline));
    assert.equal(startedPayload.queryId, entry.query.queryId);
    assert.equal(completedPayload.queryId, entry.query.queryId);
    assert.equal(completedPayload.status, "healthy");
    assert.equal(completedPayload.complete, true);
    assert.equal(completedPayload.fullEvaluation, true);
    assert.equal(typeof completedPayload.cycleId, "string");

    const cycle = await server.database.queryOne(`SELECT cycle_id AS "cycleId",query_id AS "queryId",status,source_revision AS "sourceRevision",
      started_at AS "startedAt",finished_at AS "finishedAt" FROM monitor_poll_cycle WHERE cycle_id=$1`, [completedPayload.cycleId]);
    assert.equal(cycle.cycleId, completedPayload.cycleId);
    assert.equal(cycle.queryId, entry.query.queryId);
    assert.equal(cycle.status, "healthy");
    assert.match(String(cycle.sourceRevision), /^test_database\.A02\.v\d+$/);
    assert.ok(epoch(cycle.startedAt) >= Date.parse(realDeadline), JSON.stringify({ startedAt: cycle.startedAt, realDeadline }));
    assert.ok(epoch(cycle.finishedAt) >= epoch(cycle.startedAt));
    const after = await server.database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_poll_cycle WHERE query_id=$1", [entry.query.queryId]);
    assert.equal(Number(after.count) - Number(before.count), 1);
    evidenceCase = {
      id: "7.1a", status: "passed", pollCycleIds: [String(completedPayload.cycleId)], queryIds: [entry.query.queryId],
      runtimeEventIds: a02Events.map((event) => String(event.id)), interruptionIds: [],
      timestamps: { dueAt: [dueAt], timerDeadline: [realDeadline], timerObservedAt: [String(completedPayload.timerObservedAt)] },
      objectIds: { experiments: [experimentId] },
      assertions: { timerOwned: true, exactlyOneCycle: true, healthyCompleteRead: true },
    };
  } finally {
    await server.close();
    if (evidenceCase) schedulingEvidence.record({ ...evidenceCase, cleanup: {
      executedInFinally: true, sourceRestored: true, beforeSourceIds: [], afterSourceIds: [],
    } });
  }
});

test("7.1c proves one delayed automatic timer executes every crossed poll in deterministic order", { timeout: 12_000 }, async () => {
  const server = await buildMonitorServer({
    config: {
      nodeEnv: "test",
      cookieSecret: "stage5-crossed-scheduling-secret",
      allowMockAuth: true,
      enableScenarioLab: true,
      scenarioSource: "test_database",
      databaseMode: "pglite",
      pgliteDataDir: "memory://",
    },
  });
  let controlledRuntime: ScenarioExperimentRuntime | null = null;
  let evidenceCase: Omit<Step7CaseEvidence, "cleanup"> | null = null;
  try {
    const acceptance = server.acceptance;
    assert.ok(acceptance);
    for (const code of ["A02", "A03", "A05"] as const) {
      assert.ok(acceptance.registry.get(code)?.adapter instanceof TestDatabaseSourceAdapter);
    }
    let controlledNow = Date.now();
    let runtimeError: unknown = null;
    controlledRuntime = new ScenarioExperimentRuntime(
      new ScenarioExperimentRepository(server.database),
      acceptance.source,
      acceptance.scheduler,
      acceptance.registry,
      true,
      (error) => { runtimeError = error; },
      () => controlledNow,
    );
    const created = await controlledRuntime.create({
      name: "Step 7.1c crossed automatic deadlines",
      businessTime: "2026-08-01T11:00:00.000Z",
      frequencies: { A02: 1, A03: 2, A05: 3 },
      identity: { runId: "step-7-1c", manifestVersion: "stage5.v1", sourceActionContractVersion: "stage5-source-actions.v1" },
    });
    const configured = await controlledRuntime.configure(created.experiment!.id, 60, { A02: 1, A03: 2, A05: 3 });
    const experimentId = configured.experiment!.id;
    const firstTimerDeadline = configured.nextAutomaticTickAt!;
    controlledNow += 3_200;

    await waitFor(async () => {
      const row = await server.database.queryOne(`SELECT COUNT(*)::int AS count FROM monitor_scenario_runtime_event
        WHERE experiment_id=$1 AND event_type='poll_completed'`, [experimentId]);
      return Number(row.count) >= 5 ? Number(row.count) : null;
    }, 7_000);
    await controlledRuntime.pause(experimentId, true);
    assert.equal(runtimeError, null);

    const allEvents = await server.database.queryAll(`SELECT id,event_type AS "eventType",rule_code AS "ruleCode",
      business_time AS "businessTime",payload,recorded_at AS "recordedAt" FROM monitor_scenario_runtime_event
      WHERE experiment_id=$1 ORDER BY sequence`, [experimentId]);
    const expectedPolls = [
      ["A02", "2026-08-01T11:01:00.000Z"],
      ["A02", "2026-08-01T11:02:00.000Z"],
      ["A03", "2026-08-01T11:02:00.000Z"],
      ["A02", "2026-08-01T11:03:00.000Z"],
      ["A05", "2026-08-01T11:03:00.000Z"],
    ];
    assert.deepEqual(allEvents.map((event) => [event.eventType, event.ruleCode, iso(event.businessTime)]), expectedPolls
      .flatMap(([ruleCode, dueAt]) => [["poll_started", ruleCode, dueAt], ["poll_completed", ruleCode, dueAt]]));
    const allPayloads = allEvents.map((event) => payload(event.payload));
    assert.ok(allPayloads.every((item) => item.trigger === "automatic_timer"));
    assert.ok(allPayloads.every((item) => item.timerDeadline === firstTimerDeadline));
    assert.equal(new Set(allPayloads.map((item) => item.timerObservedAt)).size, 1);
    const events = allEvents.filter((event) => event.eventType === "poll_completed");
    assert.equal(events.length, 5);
    assert.deepEqual(events.map((event) => [event.ruleCode, iso(event.businessTime)]), expectedPolls);
    const eventPayloads = events.map((event) => payload(event.payload));
    assert.ok(Date.parse(String(eventPayloads[0]!.timerObservedAt)) >= Date.parse(firstTimerDeadline) + 2_000);
    const cycleIds = eventPayloads.map((item) => String(item.cycleId));
    assert.equal(new Set(cycleIds).size, 5);
    const cycles = await server.database.queryAll(`SELECT cycle_id AS "cycleId",status,source_revision AS "sourceRevision"
      FROM monitor_poll_cycle WHERE cycle_id=ANY($1::uuid[])`, [cycleIds]);
    assert.equal(cycles.length, 5);
    assert.ok(cycles.every((cycle) => cycle.status === "healthy" && String(cycle.sourceRevision).startsWith("test_database.")));
    evidenceCase = {
      id: "7.1c", status: "passed", pollCycleIds: cycleIds,
      queryIds: [...new Set(allPayloads.map((item) => String(item.queryId)))],
      runtimeEventIds: allEvents.map((event) => String(event.id)), interruptionIds: [],
      timestamps: { dueAt: [...new Set(expectedPolls.map(([, dueAt]) => dueAt))], timerDeadline: [firstTimerDeadline], timerObservedAt: [String(eventPayloads[0]!.timerObservedAt)] },
      objectIds: { experiments: [experimentId] },
      assertions: { chronologicalOrder: true, uniqueCycles: true, completeEventPairs: true },
    };
  } finally {
    controlledRuntime?.stop();
    await server.close();
    if (evidenceCase) schedulingEvidence.record({ ...evidenceCase, cleanup: {
      executedInFinally: true, sourceRestored: true, beforeSourceIds: [], afterSourceIds: [],
    } });
  }
});

test("7.1b proves independent connected A02, A03, and A05 automatic cadences", { timeout: 12_000 }, async () => {
  const server = await buildMonitorServer({
    config: {
      nodeEnv: "development",
      cookieSecret: "stage5-independent-scheduling-secret",
      allowMockAuth: true,
      enableScenarioLab: true,
      scenarioSource: "test_database",
      databaseMode: "pglite",
      pgliteDataDir: "memory://",
    },
  });
  let evidenceCase: Omit<Step7CaseEvidence, "cleanup"> | null = null;
  try {
    const acceptance = server.acceptance;
    assert.ok(acceptance);
    for (const code of ["A02", "A03", "A05"] as const) {
      assert.ok(acceptance.registry.get(code)?.adapter instanceof TestDatabaseSourceAdapter);
    }
    const businessTime = "2026-08-01T10:00:00.000Z";
    const created = await acceptance.runtime.create({
      name: "Step 7.1b independent automatic cadences",
      businessTime,
      frequencies: { A02: 1, A03: 2, A05: 3 },
      identity: { runId: "step-7-1b", manifestVersion: "stage5.v1", sourceActionContractVersion: "stage5-source-actions.v1" },
    });
    const configured = await acceptance.runtime.configure(created.experiment!.id, 60, { A02: 1, A03: 2, A05: 3 });
    const experimentId = configured.experiment!.id;
    await waitFor(async () => {
      const row = await server.database.queryOne(`SELECT COUNT(*)::int AS count FROM monitor_scenario_runtime_event
        WHERE experiment_id=$1 AND event_type='poll_completed'`, [experimentId]);
      return Number(row.count) >= 11 ? Number(row.count) : null;
    }, 10_000);
    await acceptance.runtime.pause(experimentId, true);

    const events = await server.database.queryAll(`SELECT id,event_type AS "eventType",rule_code AS "ruleCode",
      business_time AS "businessTime",payload,recorded_at AS "recordedAt" FROM monitor_scenario_runtime_event
      WHERE experiment_id=$1 AND event_type='poll_completed' ORDER BY sequence`, [experimentId]);
    assert.equal(events.length, 11);
    const matrix = Object.fromEntries((["A02", "A03", "A05"] as const).map((code) => [code, events
      .filter((event) => event.ruleCode === code)
      .map((event) => ({ dueAt: iso(event.businessTime), cycleId: String(payload(event.payload).cycleId) }))]));
    assert.deepEqual(Object.fromEntries(Object.entries(matrix).map(([code, items]) => [code, items.map((item) => item.dueAt)])), {
      A02: [1, 2, 3, 4, 5, 6].map((minute) => `2026-08-01T10:0${minute}:00.000Z`),
      A03: [2, 4, 6].map((minute) => `2026-08-01T10:0${minute}:00.000Z`),
      A05: [3, 6].map((minute) => `2026-08-01T10:0${minute}:00.000Z`),
    });
    const cycleIds = events.map((event) => String(payload(event.payload).cycleId));
    assert.equal(new Set(cycleIds).size, 11);
    assert.ok(events.every((event) => payload(event.payload).trigger === "automatic_timer"));
    const cycles = await server.database.queryAll(`SELECT cycle_id AS "cycleId",query_id AS "queryId",status,source_revision AS "sourceRevision"
      FROM monitor_poll_cycle WHERE cycle_id=ANY($1::uuid[]) ORDER BY started_at`, [cycleIds]);
    assert.equal(cycles.length, 11);
    assert.ok(cycles.every((cycle) => cycle.status === "healthy"));
    const expectedQueryByCode = Object.fromEntries((["A02", "A03", "A05"] as const)
      .map((code) => [code, acceptance.registry.get(code)!.query.queryId]));
    for (const event of events) {
      const eventPayload = payload(event.payload);
      const cycle = cycles.find((item) => item.cycleId === eventPayload.cycleId);
      assert.ok(cycle);
      assert.equal(cycle.queryId, expectedQueryByCode[String(event.ruleCode)]);
      assert.match(String(cycle.sourceRevision), new RegExp(`^test_database\\.${event.ruleCode}\\.v\\d+$`));
    }
    evidenceCase = {
      id: "7.1b", status: "passed", pollCycleIds: cycleIds,
      queryIds: [...new Set(cycles.map((cycle) => String(cycle.queryId)))],
      runtimeEventIds: events.map((event) => String(event.id)), interruptionIds: [],
      timestamps: { dueAt: [...new Set(events.map((event) => iso(event.businessTime)))] }, objectIds: { experiments: [experimentId] },
      assertions: { independentCadences: true, completeSixMinuteWindow: true, uniqueCycles: true },
    };
  } finally {
    await server.close();
    if (evidenceCase) schedulingEvidence.record({ ...evidenceCase, cleanup: {
      executedInFinally: true, sourceRestored: true, beforeSourceIds: [], afterSourceIds: [],
    } });
  }
});

test("7.2a proves pause freezes automatic work and resume starts a fresh deadline", { timeout: 12_000 }, async () => {
  const server = await buildMonitorServer({
    config: {
      nodeEnv: "test",
      cookieSecret: "stage5-pause-resume-secret",
      allowMockAuth: true,
      enableScenarioLab: true,
      scenarioSource: "test_database",
      databaseMode: "pglite",
      pgliteDataDir: "memory://",
    },
  });
  let runtime: ScenarioExperimentRuntime | null = null;
  let runtimeError: unknown = null;
  let evidenceCase: Omit<Step7CaseEvidence, "cleanup"> | null = null;
  try {
    const acceptance = server.acceptance;
    assert.ok(acceptance);
    const entry = acceptance.registry.get("A02")!;
    assert.ok(entry.adapter instanceof TestDatabaseSourceAdapter);
    const cyclesBeforePause = await server.database.queryOne(
      "SELECT COUNT(*)::int AS count FROM monitor_poll_cycle WHERE query_id=$1", [entry.query.queryId],
    );
    let clockOffsetMs = 0;
    runtime = new ScenarioExperimentRuntime(
      new ScenarioExperimentRepository(server.database),
      acceptance.source,
      acceptance.scheduler,
      acceptance.registry,
      true,
      (error) => { runtimeError = error; },
      () => Date.now() + clockOffsetMs,
    );
    const created = await runtime.create({
      name: "Step 7.2a automatic pause and resume",
      businessTime: "2026-08-01T12:00:00.000Z",
      frequencies: { A02: 1, A03: 60, A05: 60 },
      identity: { runId: "step-7-2a", manifestVersion: "stage5.v1", sourceActionContractVersion: "stage5-source-actions.v1" },
    });
    const configured = await runtime.configure(created.experiment!.id, 60, { A02: 1, A03: 60, A05: 60 });
    const experimentId = configured.experiment!.id;
    const cancelledDeadline = configured.nextAutomaticTickAt!;
    const paused = await runtime.pause(experimentId, true);
    assert.equal(paused.experiment!.status, "paused");
    assert.equal(paused.nextAutomaticTickAt, null);
    assert.equal(paused.experiment!.businessTime, "2026-08-01T12:00:00.000Z");

    clockOffsetMs += 5_000;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_200));
    const whilePaused = await runtime.status();
    assert.equal(whilePaused.experiment!.businessTime, paused.experiment!.businessTime);
    assert.equal(whilePaused.nextAutomaticTickAt, null);
    assert.deepEqual(await new ScenarioExperimentRepository(server.database).runtimeEvents(experimentId), []);
    const cyclesWhilePaused = await server.database.queryOne(
      "SELECT COUNT(*)::int AS count FROM monitor_poll_cycle WHERE query_id=$1", [entry.query.queryId],
    );
    assert.equal(Number(cyclesWhilePaused.count), Number(cyclesBeforePause.count));

    const resumedAt = Date.now() + clockOffsetMs;
    const resumed = await runtime.pause(experimentId, false);
    assert.equal(resumed.experiment!.status, "running");
    assert.ok(Date.parse(resumed.nextAutomaticTickAt!) >= resumedAt + 950);
    assert.ok(Date.parse(resumed.nextAutomaticTickAt!) > Date.parse(cancelledDeadline) + 4_000);

    const completed = await waitFor(async () => {
      const events = await new ScenarioExperimentRepository(server.database).runtimeEvents(experimentId);
      return events.find((event) => event.eventType === "poll_completed") ?? null;
    }, 5_000);
    const stopped = await runtime.pause(experimentId, true);
    assert.equal(stopped.experiment!.businessTime, "2026-08-01T12:01:00.000Z");
    assert.equal(stopped.experiment!.nextDue.A02, "2026-08-01T12:02:00.000Z");
    const events = await new ScenarioExperimentRepository(server.database).runtimeEvents(experimentId);
    assert.deepEqual(events.map((event) => [event.eventType, event.ruleCode, event.businessTime]), [
      ["poll_started", "A02", "2026-08-01T12:01:00.000Z"],
      ["poll_completed", "A02", "2026-08-01T12:01:00.000Z"],
    ]);
    const completedPayload = payload(completed.payload);
    assert.equal(completedPayload.trigger, "automatic_timer");
    assert.equal(completedPayload.timerDeadline, resumed.nextAutomaticTickAt);
    assert.notEqual(completedPayload.timerDeadline, cancelledDeadline);
    assert.equal(new Set(events.filter((event) => event.eventType === "poll_completed")
      .map((event) => payload(event.payload).cycleId)).size, 1);
    const cyclesAfterResume = await server.database.queryOne(
      "SELECT COUNT(*)::int AS count FROM monitor_poll_cycle WHERE query_id=$1", [entry.query.queryId],
    );
    assert.equal(Number(cyclesAfterResume.count) - Number(cyclesBeforePause.count), 1);
    assert.equal(runtimeError, null);
    evidenceCase = {
      id: "7.2a", status: "passed", pollCycleIds: [String(completedPayload.cycleId)], queryIds: [entry.query.queryId],
      runtimeEventIds: events.map((event) => String(event.id)), interruptionIds: [],
      timestamps: { cancelledDeadline: [cancelledDeadline], resumedDeadline: [resumed.nextAutomaticTickAt!], dueAt: [completed.businessTime] },
      objectIds: { experiments: [experimentId] },
      assertions: { pausedClockFrozen: true, noRetroactiveCatchup: true, oneResumedCycle: true },
    };
  } finally {
    runtime?.stop();
    await server.close();
    if (evidenceCase) schedulingEvidence.record({ ...evidenceCase, cleanup: {
      executedInFinally: true, sourceRestored: true, beforeSourceIds: [], afterSourceIds: [],
    } });
  }
});

test("7.2b proves timer, manual poll, and controls share one non-overlapping runtime queue", { timeout: 12_000 }, async () => {
  const server = await buildMonitorServer({
    config: {
      nodeEnv: "test",
      cookieSecret: "stage5-runtime-serialization-secret",
      allowMockAuth: true,
      enableScenarioLab: true,
      scenarioSource: "test_database",
      databaseMode: "pglite",
      pgliteDataDir: "memory://",
    },
  });
  let runtime: ScenarioExperimentRuntime | null = null;
  let releaseAutomatic: (() => void) | null = null;
  let runtimeError: unknown = null;
  let evidenceCase: Omit<Step7CaseEvidence, "cleanup"> | null = null;
  try {
    const acceptance = server.acceptance;
    assert.ok(acceptance);
    const a02 = acceptance.registry.get("A02")!;
    const a03 = acceptance.registry.get("A03")!;
    assert.ok(a02.adapter instanceof TestDatabaseSourceAdapter);
    assert.ok(a03.adapter instanceof TestDatabaseSourceAdapter);
    const automaticBlocked = new Promise<void>((resolveBlocked) => { releaseAutomatic = resolveBlocked; });
    let signalAutomaticStarted: (() => void) | null = null;
    const automaticStarted = new Promise<void>((resolveStarted) => { signalAutomaticStarted = resolveStarted; });
    const timeline: string[] = [];
    let activePolls = 0;
    let maximumActivePolls = 0;
    let blockFirstA02 = true;
    const scheduler = {
      runScheduled: async (query: typeof a02.query, adapter: typeof a02.adapter) => {
        activePolls += 1;
        maximumActivePolls = Math.max(maximumActivePolls, activePolls);
        timeline.push(`${query.ruleCode}:started`);
        try {
          if (query.ruleCode === "A02" && blockFirstA02) {
            blockFirstA02 = false;
            signalAutomaticStarted?.();
            await automaticBlocked;
          }
          const result = await acceptance.scheduler.runScheduled(query, adapter);
          timeline.push(`${query.ruleCode}:completed`);
          return result;
        } finally {
          activePolls -= 1;
        }
      },
    } as typeof acceptance.scheduler;
    runtime = new ScenarioExperimentRuntime(
      new ScenarioExperimentRepository(server.database), acceptance.source, scheduler, acceptance.registry, true,
      (error) => { runtimeError = error; },
    );
    const created = await runtime.create({
      name: "Step 7.2b serialized runtime contention",
      businessTime: "2026-08-01T13:00:00.000Z",
      frequencies: { A02: 1, A03: 60, A05: 60 },
      identity: { runId: "step-7-2b", manifestVersion: "stage5.v1", sourceActionContractVersion: "stage5-source-actions.v1" },
    });
    const configured = await runtime.configure(created.experiment!.id, 60, { A02: 1, A03: 60, A05: 60 });
    const experimentId = configured.experiment!.id;
    await automaticStarted;

    const manualPoll = runtime.executeSerialized(() => scheduler.runScheduled(a03.query, a03.adapter));
    const reconfigure = runtime.configure(experimentId, 60, { A02: 2, A03: 3, A05: 5 }).then((value) => {
      timeline.push("configure:completed");
      return value;
    });
    const pause = runtime.pause(experimentId, true).then((value) => {
      timeline.push("pause:completed");
      return value;
    });
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
    assert.deepEqual(timeline, ["A02:started"]);
    releaseAutomatic?.();
    const [manualResult, configuredAfterContention, paused] = await Promise.all([manualPoll, reconfigure, pause]);

    assert.equal(maximumActivePolls, 1);
    assert.deepEqual(timeline, [
      "A02:started", "A02:completed", "A03:started", "A03:completed", "configure:completed", "pause:completed",
    ]);
    assert.equal(configuredAfterContention.experiment!.frequencies.A02, 2);
    assert.equal(paused.experiment!.status, "paused");
    assert.equal(paused.nextAutomaticTickAt, null);
    const events = await new ScenarioExperimentRepository(server.database).runtimeEvents(experimentId);
    assert.deepEqual(events.map((event) => [event.eventType, event.ruleCode, event.businessTime]), [
      ["poll_started", "A02", "2026-08-01T13:01:00.000Z"],
      ["poll_completed", "A02", "2026-08-01T13:01:00.000Z"],
    ]);
    const automaticCycleId = String(payload(events[1]!.payload).cycleId);
    assert.notEqual(manualResult.cycleId, automaticCycleId);
    const cycles = await server.database.queryAll(`SELECT cycle_id AS "cycleId",query_id AS "queryId",status
      FROM monitor_poll_cycle WHERE cycle_id=ANY($1::uuid[])`, [[automaticCycleId, manualResult.cycleId]]);
    assert.equal(cycles.length, 2);
    assert.equal(new Set(cycles.map((cycle) => cycle.cycleId)).size, 2);
    assert.ok(cycles.every((cycle) => cycle.status === "healthy"));
    assert.deepEqual(new Set(cycles.map((cycle) => cycle.queryId)), new Set([a02.query.queryId, a03.query.queryId]));
    assert.equal(runtimeError, null);
    evidenceCase = {
      id: "7.2b", status: "passed", pollCycleIds: [automaticCycleId, String(manualResult.cycleId)],
      queryIds: [a02.query.queryId, a03.query.queryId], runtimeEventIds: events.map((event) => String(event.id)), interruptionIds: [],
      timestamps: { dueAt: [...new Set(events.map((event) => event.businessTime))] }, objectIds: { experiments: [experimentId] },
      assertions: { maximumOneActivePoll: true, authorityQueueOrdered: true, uniqueCycles: true },
    };
  } finally {
    releaseAutomatic?.();
    runtime?.stop();
    await server.close();
    if (evidenceCase) schedulingEvidence.record({ ...evidenceCase, cleanup: {
      executedInFinally: true, sourceRestored: true, beforeSourceIds: [], afterSourceIds: [],
    } });
  }
});

test("7.2c proves an exactly due poll completes before a racing canonical source action", { timeout: 12_000 }, async () => {
  const connections = await TestDatabaseConnections.create(repositoryRoot);
  const server = await buildMonitorServer({
    config: {
      nodeEnv: "test",
      cookieSecret: "stage5-poll-action-boundary-secret",
      allowMockAuth: true,
      enableScenarioLab: true,
      scenarioSource: "test_database",
      databaseMode: "pglite",
      pgliteDataDir: "memory://",
    },
  });
  let runtime: ScenarioExperimentRuntime | null = null;
  let releasePoll: (() => void) | null = null;
  let createdFlowId: number | null = null;
  let flowIdsBefore: number[] | null = null;
  let runtimeError: unknown = null;
  let evidenceCase: Omit<Step7CaseEvidence, "cleanup"> | null = null;
  try {
    const acceptance = server.acceptance;
    assert.ok(acceptance);
    assert.ok(acceptance.source instanceof TestDatabaseScenarioRepository);
    const a02 = acceptance.registry.get("A02")!;
    assert.ok(a02.adapter instanceof TestDatabaseSourceAdapter);
    const templateId = acceptance.source.fixtureIds.A02.flowId;
    const [existingFlowRows] = await connections.writer.query(`SELECT id FROM flujo_materiales_detalles
      WHERE observacion='MONITOR-STAGE5-A02-DISPATCH' ORDER BY id`);
    flowIdsBefore = (existingFlowRows as Array<{ id: number }>).map(({ id }) => Number(id));
    let signalPollStarted: (() => void) | null = null;
    const pollStarted = new Promise<void>((resolveStarted) => { signalPollStarted = resolveStarted; });
    const pollBlocked = new Promise<void>((resolvePoll) => { releasePoll = resolvePoll; });
    const timeline: string[] = [];
    let pollInFlight = false;
    let blockFirstA02 = true;
    const scheduler = {
      runScheduled: async (query: typeof a02.query, adapter: typeof a02.adapter) => {
        if (query.ruleCode === "A02" && blockFirstA02) {
          blockFirstA02 = false;
          pollInFlight = true;
          timeline.push("poll:started");
          signalPollStarted?.();
          await pollBlocked;
          try {
            const result = await acceptance.scheduler.runScheduled(query, adapter);
            timeline.push("poll:completed");
            return result;
          } finally {
            pollInFlight = false;
          }
        }
        return acceptance.scheduler.runScheduled(query, adapter);
      },
    } as typeof acceptance.scheduler;
    const canonicalSourceAction = acceptance.source.sourceAction!.bind(acceptance.source);
    let actionCalls = 0;
    const actionSource = {
      sourceAction: async (...args: Parameters<typeof canonicalSourceAction>) => {
        assert.equal(pollInFlight, false);
        actionCalls += 1;
        timeline.push("action:started");
        const result = await canonicalSourceAction(...args);
        timeline.push("action:completed");
        return result;
      },
    } as unknown as typeof acceptance.source;
    const actionService = new ScenarioSourceActionService(actionSource, await loadSourceActionContracts(repositoryRoot));
    runtime = new ScenarioExperimentRuntime(
      new ScenarioExperimentRepository(server.database), acceptance.source, scheduler, acceptance.registry, true,
      (error) => { runtimeError = error; },
    );
    const created = await runtime.create({
      name: "Step 7.2c exact poll and source-action boundary",
      businessTime: "2026-08-01T14:00:00.000Z",
      frequencies: { A02: 1, A03: 60, A05: 60 },
      identity: { runId: "step-7-2c", manifestVersion: "stage5.v1", sourceActionContractVersion: "stage5-source-actions.v1" },
    });
    const configured = await runtime.configure(created.experiment!.id, 60, { A02: 1, A03: 60, A05: 60 });
    const experimentId = configured.experiment!.id;
    await pollStarted;

    const action = runtime.executeBeforeSourceAction(() => actionService.execute({
      actionId: "a02.prepare_dispatch", key: templateId,
    }, manager));
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
    assert.deepEqual(timeline, ["poll:started"]);
    releasePoll?.();
    const execution = await action;
    createdFlowId = Number(execution.sourceDiff.after.find((record) => Number(record.key) !== templateId)?.key);
    assert.ok(createdFlowId > 0);
    await runtime.pause(experimentId, true);

    assert.deepEqual(timeline, ["poll:started", "poll:completed", "action:started", "action:completed"]);
    assert.equal(actionCalls, 1);
    assert.equal(runtimeError, null);
    const events = await new ScenarioExperimentRepository(server.database).runtimeEvents(experimentId);
    assert.deepEqual(events.map((event) => [event.eventType, event.ruleCode, event.businessTime]), [
      ["poll_started", "A02", "2026-08-01T14:01:00.000Z"],
      ["poll_completed", "A02", "2026-08-01T14:01:00.000Z"],
      ["source_action", "A02", "2026-08-01T14:01:00.000Z"],
    ]);
    assert.equal(payload(events[0]!.payload).trigger, "automatic_timer");
    assert.equal(payload(events[1]!.payload).trigger, "automatic_timer");
    assert.equal(payload(events[2]!.payload).actionId, "a02.prepare_dispatch");
    assert.equal(payload(events[2]!.payload).sourceRevision, execution.sourceRevision);
    assert.equal(events.filter((event) => event.eventType === "poll_completed").length, 1);
    assert.equal(events.filter((event) => event.eventType === "source_action").length, 1);
    const createdRows = await connections.writer.query(`SELECT id FROM flujo_materiales_detalles WHERE id=?`, [createdFlowId]);
    assert.equal((createdRows[0] as unknown[]).length, 1);
    evidenceCase = {
      id: "7.2c", status: "passed", pollCycleIds: [String(payload(events[1]!.payload).cycleId)], queryIds: [a02.query.queryId],
      runtimeEventIds: events.map((event) => String(event.id)), interruptionIds: [],
      timestamps: { dueAt: [...new Set(events.map((event) => event.businessTime))] },
      objectIds: { experiments: [experimentId], sourceActions: [String(events[2]!.id)] },
      assertions: { pollCompletedBeforeAction: true, noOverlap: true, oneSourceMutation: true },
    };
  } finally {
    releasePoll?.();
    runtime?.stop();
    if (createdFlowId) {
      await connections.writer.execute("DELETE FROM flujo_materiales_detalles WHERE id_padre=?", [createdFlowId]);
      await connections.writer.execute("DELETE FROM flujo_materiales_detalles WHERE id=?", [createdFlowId]);
    }
    if (flowIdsBefore) {
      const [restoredFlowRows] = await connections.writer.query(`SELECT id FROM flujo_materiales_detalles
        WHERE observacion='MONITOR-STAGE5-A02-DISPATCH' ORDER BY id`);
      const restoredFlowIds = (restoredFlowRows as Array<{ id: number }>).map(({ id }) => Number(id));
      assert.deepEqual(restoredFlowIds, flowIdsBefore);
      if (evidenceCase) schedulingEvidence.record({ ...evidenceCase, cleanup: {
        executedInFinally: true, sourceRestored: true,
        beforeSourceIds: flowIdsBefore.map(String), afterSourceIds: restoredFlowIds.map(String),
      } });
    }
    await server.close();
    await connections.close();
  }
});

test("7.3a proves restart preserves a future deadline without premature polling", { timeout: 10_000 }, async () => {
  const server = await buildMonitorServer({
    config: {
      nodeEnv: "test",
      cookieSecret: "stage5-restart-state-secret",
      allowMockAuth: true,
      enableScenarioLab: true,
      scenarioSource: "test_database",
      databaseMode: "pglite",
      pgliteDataDir: "memory://",
    },
  });
  let original: ScenarioExperimentRuntime | null = null;
  let replacement: ScenarioExperimentRuntime | null = null;
  let runtimeError: unknown = null;
  let evidenceCase: Omit<Step7CaseEvidence, "cleanup"> | null = null;
  try {
    const acceptance = server.acceptance;
    assert.ok(acceptance);
    const a02 = acceptance.registry.get("A02")!;
    assert.ok(a02.adapter instanceof TestDatabaseSourceAdapter);
    const queryIds = [...acceptance.registry.values()].map((entry) => entry.query.queryId);
    const repository = new ScenarioExperimentRepository(server.database);
    const now = () => Date.now();
    original = new ScenarioExperimentRuntime(repository, acceptance.source, acceptance.scheduler, acceptance.registry, true,
      (error) => { runtimeError = error; }, now);
    const created = await original.create({
      name: "Step 7.3a future-deadline restart",
      businessTime: "2026-08-01T15:00:00.000Z",
      frequencies: { A02: 1, A03: 2, A05: 3 },
      identity: { runId: "step-7-3a", manifestVersion: "stage5.v1", sourceActionContractVersion: "stage5-source-actions.v1" },
    });
    const beforeRestart = await original.configure(created.experiment!.id, 3, { A02: 1, A03: 2, A05: 3 });
    const experimentId = beforeRestart.experiment!.id;
    const deadline = beforeRestart.nextAutomaticTickAt!;
    assert.ok(Date.parse(deadline) - Date.now() > 19_000);
    const cyclesBefore = await server.database.queryOne(
      "SELECT COUNT(*)::int AS count FROM monitor_poll_cycle WHERE query_id=ANY($1::text[])", [queryIds],
    );
    original.stop();
    original = null;

    replacement = new ScenarioExperimentRuntime(repository, acceptance.source, acceptance.scheduler, acceptance.registry, true,
      (error) => { runtimeError = error; }, now);
    const afterRestart = await replacement.initialize();
    assert.equal(afterRestart.experiment!.id, experimentId);
    assert.equal(afterRestart.experiment!.runId, "step-7-3a");
    assert.equal(afterRestart.experiment!.businessTime, beforeRestart.experiment!.businessTime);
    assert.deepEqual(afterRestart.experiment!.nextDue, beforeRestart.experiment!.nextDue);
    assert.deepEqual(afterRestart.experiment!.frequencies, beforeRestart.experiment!.frequencies);
    assert.equal(afterRestart.experiment!.speed, beforeRestart.experiment!.speed);
    assert.equal(afterRestart.nextAutomaticTickAt, deadline);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 300));
    assert.deepEqual(await repository.runtimeEvents(experimentId), []);
    const cyclesAfter = await server.database.queryOne(
      "SELECT COUNT(*)::int AS count FROM monitor_poll_cycle WHERE query_id=ANY($1::text[])", [queryIds],
    );
    assert.equal(Number(cyclesAfter.count), Number(cyclesBefore.count));
    assert.equal(runtimeError, null);
    evidenceCase = {
      id: "7.3a", status: "passed", pollCycleIds: [], queryIds,
      runtimeEventIds: [], interruptionIds: [], timestamps: { preservedDeadline: [deadline] },
      objectIds: { experiments: [experimentId] },
      assertions: { experimentIdentityPreserved: true, exactDeadlinePreserved: true, noPrematurePoll: true },
    };
  } finally {
    original?.stop();
    replacement?.stop();
    await server.close();
    if (evidenceCase) schedulingEvidence.record({ ...evidenceCase, cleanup: {
      executedInFinally: true, sourceRestored: true, beforeSourceIds: [], afterSourceIds: [],
    } });
  }
});

test("7.3b proves restart recovers every missed deadline once in chronological order", { timeout: 12_000 }, async () => {
  const server = await buildMonitorServer({
    config: {
      nodeEnv: "test",
      cookieSecret: "stage5-missed-deadline-recovery-secret",
      allowMockAuth: true,
      enableScenarioLab: true,
      scenarioSource: "test_database",
      databaseMode: "pglite",
      pgliteDataDir: "memory://",
    },
  });
  let original: ScenarioExperimentRuntime | null = null;
  let replacement: ScenarioExperimentRuntime | null = null;
  let runtimeError: unknown = null;
  let evidenceCase: Omit<Step7CaseEvidence, "cleanup"> | null = null;
  try {
    const acceptance = server.acceptance;
    assert.ok(acceptance);
    for (const code of ["A02", "A03", "A05"] as const) {
      assert.ok(acceptance.registry.get(code)?.adapter instanceof TestDatabaseSourceAdapter);
    }
    const repository = new ScenarioExperimentRepository(server.database);
    let logicalNow = Date.now();
    const now = () => logicalNow;
    original = new ScenarioExperimentRuntime(repository, acceptance.source, acceptance.scheduler, acceptance.registry, true,
      (error) => { runtimeError = error; }, now);
    const created = await original.create({
      name: "Step 7.3b missed-deadline recovery",
      businessTime: "2026-08-01T16:00:00.000Z",
      frequencies: { A02: 1, A03: 2, A05: 3 },
      identity: { runId: "step-7-3b", manifestVersion: "stage5.v1", sourceActionContractVersion: "stage5-source-actions.v1" },
    });
    const configured = await original.configure(created.experiment!.id, 60, { A02: 1, A03: 2, A05: 3 });
    const experimentId = configured.experiment!.id;
    const missedDeadline = configured.nextAutomaticTickAt!;
    original.stop();
    original = null;

    logicalNow += 3_200;
    replacement = new ScenarioExperimentRuntime(repository, acceptance.source, acceptance.scheduler, acceptance.registry, true,
      (error) => { runtimeError = error; }, now);
    const initialized = await replacement.initialize();
    assert.equal(initialized.experiment!.id, experimentId);
    assert.equal(initialized.nextAutomaticTickAt, missedDeadline);
    await waitFor(async () => {
      const events = await repository.runtimeEvents(experimentId);
      return events.filter((event) => event.eventType === "poll_completed").length === 5 ? events : null;
    }, 7_000);
    await replacement.executeSerialized(async () => undefined);
    const recovered = await replacement.pause(experimentId, true);

    const expectedPolls = [
      ["A02", "2026-08-01T16:01:00.000Z"],
      ["A02", "2026-08-01T16:02:00.000Z"],
      ["A03", "2026-08-01T16:02:00.000Z"],
      ["A02", "2026-08-01T16:03:00.000Z"],
      ["A05", "2026-08-01T16:03:00.000Z"],
    ];
    const events = await repository.runtimeEvents(experimentId);
    assert.deepEqual(events.map((event) => [event.eventType, event.ruleCode, event.businessTime]), expectedPolls
      .flatMap(([ruleCode, dueAt]) => [["poll_started", ruleCode, dueAt], ["poll_completed", ruleCode, dueAt]]));
    const eventPayloads = events.map((event) => payload(event.payload));
    assert.ok(eventPayloads.every((item) => item.trigger === "automatic_timer"));
    assert.ok(eventPayloads.every((item) => item.timerDeadline === missedDeadline));
    assert.ok(eventPayloads.every((item) => item.timerObservedAt === new Date(logicalNow).toISOString()));
    const completed = events.filter((event) => event.eventType === "poll_completed");
    const cycleIds = completed.map((event) => String(payload(event.payload).cycleId));
    assert.equal(new Set(cycleIds).size, 5);
    const cycles = await server.database.queryAll(`SELECT cycle_id AS "cycleId",query_id AS "queryId",status,
      source_revision AS "sourceRevision" FROM monitor_poll_cycle WHERE cycle_id=ANY($1::uuid[])`, [cycleIds]);
    assert.equal(cycles.length, 5);
    const expectedQueryByCode = Object.fromEntries((["A02", "A03", "A05"] as const)
      .map((code) => [code, acceptance.registry.get(code)!.query.queryId]));
    for (const event of completed) {
      const cycle = cycles.find((candidate) => candidate.cycleId === payload(event.payload).cycleId);
      assert.ok(cycle);
      assert.equal(cycle.status, "healthy");
      assert.equal(cycle.queryId, expectedQueryByCode[event.ruleCode]);
      assert.match(String(cycle.sourceRevision), new RegExp(`^test_database\\.${event.ruleCode}\\.v\\d+$`));
    }
    assert.equal(recovered.experiment!.businessTime, "2026-08-01T16:03:00.000Z");
    assert.deepEqual(recovered.experiment!.nextDue, {
      A02: "2026-08-01T16:04:00.000Z",
      A03: "2026-08-01T16:04:00.000Z",
      A05: "2026-08-01T16:06:00.000Z",
    });
    assert.equal(runtimeError, null);
    evidenceCase = {
      id: "7.3b", status: "passed", pollCycleIds: cycleIds,
      queryIds: [...new Set(cycles.map((cycle) => String(cycle.queryId)))],
      runtimeEventIds: events.map((event) => String(event.id)), interruptionIds: [],
      timestamps: {
        missedDeadline: [missedDeadline],
        observedAt: [new Date(logicalNow).toISOString()],
        dueAt: [...new Set(completed.map((event) => event.businessTime))],
      },
      objectIds: { experiments: [experimentId] },
      assertions: { chronologicalRecovery: true, uniqueCycles: true, exactMissedWork: true },
    };
  } finally {
    original?.stop();
    replacement?.stop();
    await server.close();
    if (evidenceCase) schedulingEvidence.record({ ...evidenceCase, cleanup: {
      executedInFinally: true, sourceRestored: true, beforeSourceIds: [], afterSourceIds: [],
    } });
  }
});

test("7.3c proves a second restart does not replay recovery and continues normal cadence", { timeout: 12_000 }, async () => {
  const server = await buildMonitorServer({
    config: {
      nodeEnv: "test",
      cookieSecret: "stage5-recovery-replay-secret",
      allowMockAuth: true,
      enableScenarioLab: true,
      scenarioSource: "test_database",
      databaseMode: "pglite",
      pgliteDataDir: "memory://",
    },
  });
  let original: ScenarioExperimentRuntime | null = null;
  let recovery: ScenarioExperimentRuntime | null = null;
  let continuation: ScenarioExperimentRuntime | null = null;
  let runtimeError: unknown = null;
  let evidenceCase: Omit<Step7CaseEvidence, "cleanup"> | null = null;
  try {
    const acceptance = server.acceptance;
    assert.ok(acceptance);
    for (const code of ["A02", "A03", "A05"] as const) {
      assert.ok(acceptance.registry.get(code)?.adapter instanceof TestDatabaseSourceAdapter);
    }
    const repository = new ScenarioExperimentRepository(server.database);
    let logicalNow = Date.now();
    const now = () => logicalNow;
    const runtime = () => new ScenarioExperimentRuntime(
      repository, acceptance.source, acceptance.scheduler, acceptance.registry, true,
      (error) => { runtimeError = error; }, now,
    );
    original = runtime();
    const created = await original.create({
      name: "Step 7.3c recovery replay protection",
      businessTime: "2026-08-01T17:00:00.000Z",
      frequencies: { A02: 1, A03: 2, A05: 3 },
      identity: { runId: "step-7-3c", manifestVersion: "stage5.v1", sourceActionContractVersion: "stage5-source-actions.v1" },
    });
    const configured = await original.configure(created.experiment!.id, 60, { A02: 1, A03: 2, A05: 3 });
    const experimentId = configured.experiment!.id;
    const firstDeadline = configured.nextAutomaticTickAt!;
    original.stop();
    original = null;

    logicalNow += 3_200;
    recovery = runtime();
    await recovery.initialize();
    await waitFor(async () => {
      const events = await repository.runtimeEvents(experimentId);
      return events.filter((event) => event.eventType === "poll_completed").length === 5 ? events : null;
    }, 7_000);
    await recovery.executeSerialized(async () => undefined);
    const recovered = await recovery.status();
    const nextDeadline = recovered.nextAutomaticTickAt!;
    assert.equal(nextDeadline, new Date(Date.parse(firstDeadline) + 3_000).toISOString());
    const recoveredEvents = await repository.runtimeEvents(experimentId);
    const recoveredCycleIds = recoveredEvents.filter((event) => event.eventType === "poll_completed")
      .map((event) => String(payload(event.payload).cycleId));
    assert.equal(recoveredCycleIds.length, 5);
    recovery.stop();
    recovery = null;

    continuation = runtime();
    const initialized = await continuation.initialize();
    assert.equal(initialized.experiment!.id, experimentId);
    assert.equal(initialized.experiment!.businessTime, "2026-08-01T17:03:00.000Z");
    assert.equal(initialized.nextAutomaticTickAt, nextDeadline);
    await continuation.executeSerialized(async () => undefined);
    assert.deepEqual(await repository.runtimeEvents(experimentId), recoveredEvents);
    logicalNow = Date.parse(nextDeadline);

    await waitFor(async () => {
      const events = await repository.runtimeEvents(experimentId);
      return events.filter((event) => event.eventType === "poll_completed").length === 7 ? events : null;
    }, 5_000);
    await continuation.executeSerialized(async () => undefined);
    const stopped = await continuation.pause(experimentId, true);
    const events = await repository.runtimeEvents(experimentId);
    const expectedPolls = [
      ["A02", "2026-08-01T17:01:00.000Z"],
      ["A02", "2026-08-01T17:02:00.000Z"],
      ["A03", "2026-08-01T17:02:00.000Z"],
      ["A02", "2026-08-01T17:03:00.000Z"],
      ["A05", "2026-08-01T17:03:00.000Z"],
      ["A02", "2026-08-01T17:04:00.000Z"],
      ["A03", "2026-08-01T17:04:00.000Z"],
    ];
    assert.deepEqual(events.map((event) => [event.eventType, event.ruleCode, event.businessTime]), expectedPolls
      .flatMap(([ruleCode, dueAt]) => [["poll_started", ruleCode, dueAt], ["poll_completed", ruleCode, dueAt]]));
    const completed = events.filter((event) => event.eventType === "poll_completed");
    const allCycleIds = completed.map((event) => String(payload(event.payload).cycleId));
    assert.equal(new Set(allCycleIds).size, 7);
    assert.deepEqual(allCycleIds.slice(0, 5), recoveredCycleIds);
    const cycles = await server.database.queryAll(`SELECT cycle_id AS "cycleId",query_id AS "queryId",status,
      source_revision AS "sourceRevision" FROM monitor_poll_cycle WHERE cycle_id=ANY($1::uuid[])`, [allCycleIds]);
    assert.equal(cycles.length, 7);
    const expectedQueryByCode = Object.fromEntries((["A02", "A03", "A05"] as const)
      .map((code) => [code, acceptance.registry.get(code)!.query.queryId]));
    for (const event of completed) {
      const cycle = cycles.find((candidate) => candidate.cycleId === payload(event.payload).cycleId);
      assert.ok(cycle);
      assert.equal(cycle.status, "healthy");
      assert.equal(cycle.queryId, expectedQueryByCode[event.ruleCode]);
      assert.match(String(cycle.sourceRevision), new RegExp(`^test_database\\.${event.ruleCode}\\.v\\d+$`));
    }
    assert.ok(events.slice(0, 10).every((event) => payload(event.payload).timerDeadline === firstDeadline));
    assert.ok(events.slice(10).every((event) => payload(event.payload).timerDeadline === nextDeadline));
    assert.equal(stopped.experiment!.businessTime, "2026-08-01T17:04:00.000Z");
    assert.deepEqual(stopped.experiment!.nextDue, {
      A02: "2026-08-01T17:05:00.000Z",
      A03: "2026-08-01T17:06:00.000Z",
      A05: "2026-08-01T17:06:00.000Z",
    });
    assert.equal(runtimeError, null);
    evidenceCase = {
      id: "7.3c", status: "passed", pollCycleIds: allCycleIds,
      queryIds: [...new Set(cycles.map((cycle) => String(cycle.queryId)))],
      runtimeEventIds: events.map((event) => String(event.id)), interruptionIds: [],
      timestamps: { firstDeadline: [firstDeadline], nextDeadline: [nextDeadline], dueAt: [...new Set(completed.map((event) => event.businessTime))] },
      objectIds: { experiments: [experimentId] },
      assertions: { recoveredCyclesNotReplayed: true, normalCadenceContinued: true, uniqueCycles: true },
    };
  } finally {
    original?.stop();
    recovery?.stop();
    continuation?.stop();
    await server.close();
    if (evidenceCase) schedulingEvidence.record({ ...evidenceCase, cleanup: {
      executedInFinally: true, sourceRestored: true, beforeSourceIds: [], afterSourceIds: [],
    } });
  }
});
