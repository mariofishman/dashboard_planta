import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { createDatabaseRuntime, migrateFoundation, type DatabaseRuntime } from "@monitor/database";
import type { DetectionScheduler } from "./scheduler.js";
import { ScenarioExperimentRuntime } from "./experiment-runtime.js";
import { ScenarioExperimentRepository, type ScenarioSnapshotPayloadV1 } from "./experiment.js";
import type { ScenarioSource } from "./scenario-source.js";
import type { CycleResult, DetectionQueryDefinition, DetectionSourceAdapter } from "./types.js";

const migrationRoot = resolve(import.meta.dirname, "../../database/migrations");
const pollingFrequencyMinutes = 3;
const legacyFrequencies = { A02: 3, A03: 6, A05: 9 } as const;
const identity = (runId: string) => ({ runId, manifestVersion: "1.0.0", sourceActionContractVersion: "1.0.0" });
const payload = (marker: string): ScenarioSnapshotPayloadV1 => ({
  source: { marker }, clock: { currentAt: "2026-08-01T09:00:00.000Z" }, poll: { status: "healthy" }, monitor: { incidentCount: 0 },
});

async function migrateThroughStage5Scaffold(database: DatabaseRuntime): Promise<void> {
  const files = (await readdir(migrationRoot)).filter((file) => /^\d{4}_.+\.sql$/.test(file) && file < "0014_").sort();
  for (const file of files) await database.execute(await readFile(resolve(migrationRoot, file), "utf8"));
}

test("experiment identity, versioned snapshots, and paginated history survive migration and restart", async () => {
  const root = await mkdtemp(join(tmpdir(), "monitor-experiment-history-"));
  const dataDir = join(root, "database");
  const legacyIds = [randomUUID(), randomUUID()];
  let database = await createDatabaseRuntime({ mode: "pglite", pgliteDataDir: dataDir });
  try {
    await migrateThroughStage5Scaffold(database);
    for (const [index, id] of legacyIds.entries()) {
      await database.execute(`INSERT INTO monitor_scenario_experiment
        (id,name,status,business_time,speed,frequencies,next_due) VALUES ($1,$2,'running',$3,1,$4::jsonb,$5::jsonb)`, [
        id, `Legacy ${index + 1}`, "2026-08-01T08:00:00.000Z", JSON.stringify(legacyFrequencies),
        JSON.stringify({ A02: "2026-08-01T08:03:00.000Z", A03: "2026-08-01T08:06:00.000Z", A05: "2026-08-01T08:09:00.000Z" }),
      ]);
    }
    await database.execute(`INSERT INTO monitor_scenario_snapshot
      (id,experiment_id,label,payload,captured_business_time) VALUES ($1,$2,'legacy-snapshot',$3::jsonb,$4)`,
    [randomUUID(), legacyIds[0], JSON.stringify({ unversioned: true }), "2026-08-01T08:00:00.000Z"]);
    await database.execute(await readFile(resolve(migrationRoot, "0014_phase6_stage5_experiment_history.sql"), "utf8"));
    await database.execute(await readFile(resolve(migrationRoot, "0018_phase6_stage5_v2_experiment_contract.sql"), "utf8"));
    await database.execute(await readFile(resolve(migrationRoot, "0019_phase6_stage5_source_cutoff.sql"), "utf8"));

    const legacyRows = await database.queryAll("SELECT id,run_id AS \"runId\" FROM monitor_scenario_experiment WHERE id=ANY($1::uuid[]) ORDER BY id", [legacyIds]);
    assert.equal(new Set(legacyRows.map((row) => row.runId)).size, 2);
    assert.ok(legacyRows.every((row) => row.runId === `legacy:${row.id}`));
    assert.equal(Number((await database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_scenario_experiment WHERE id=ANY($1::uuid[]) AND status='completed'", [legacyIds])).count), 2);
    assert.equal((await database.queryOne("SELECT schema_version AS version FROM monitor_scenario_snapshot WHERE experiment_id=$1", [legacyIds[0]])).version, "legacy");

    const repository = new ScenarioExperimentRepository(database);
    const experiment = await repository.create("Current run", "2026-08-01T09:00:00.000Z", pollingFrequencyMinutes, identity("stage5-current"));
    assert.equal(experiment.initialBusinessTime, "2026-08-01T09:00:00.000Z");
    assert.equal(experiment.sourceCutoffAt, "2026-07-02T09:00:00.000Z");
    const first = await repository.snapshot(experiment.id, "before", payload("before"));
    const retry = await repository.snapshot(experiment.id, "before", payload("before"));
    assert.equal(retry.id, first.id);
    await assert.rejects(repository.snapshot(experiment.id, "before", payload("changed")), /scenario_snapshot_label_conflict/);
    await assert.rejects(repository.snapshot(experiment.id, "invalid", { source: {}, monitor: {} }), /invalid_scenario_snapshot/);
    await assert.rejects(repository.snapshot(experiment.id, "future", payload("future"), "2.0.0"), /invalid_scenario_snapshot/);
    await repository.snapshot(experiment.id, "during", payload("during"));
    await repository.snapshot(experiment.id, "after", payload("after"));
    for (const testId of ["A02-00", "SH-01", "SH-05"]) await repository.record(experiment.id, testId, "passed", { testId }, "2026-08-01T09:00:00.000Z");
    await repository.create("Later one", "2026-08-01T10:00:00.000Z", pollingFrequencyMinutes, identity("stage5-later-1"));
    await repository.create("Later two", "2026-08-01T11:00:00.000Z", pollingFrequencyMinutes, identity("stage5-later-2"));

    await database.close();
    database = await createDatabaseRuntime({ mode: "pglite", pgliteDataDir: dataDir });
    await migrateFoundation(database);
    const reopened = new ScenarioExperimentRepository(database);
    assert.deepEqual(await reopened.get(experiment.id), { ...experiment, updatedAt: experiment.updatedAt });

    const experimentPage1 = await reopened.list({ limit: 2 });
    const experimentPage2 = await reopened.list({ limit: 2, cursor: experimentPage1.nextCursor! });
    const experimentPage3 = await reopened.list({ limit: 2, cursor: experimentPage2.nextCursor! });
    const pagedExperimentIds = [...experimentPage1.items, ...experimentPage2.items, ...experimentPage3.items].map((item) => item.id);
    assert.equal(new Set(pagedExperimentIds).size, 5);
    assert.equal(experimentPage3.nextCursor, null);

    const historyPage1 = await reopened.history(experiment.id, { snapshots: { limit: 2 }, results: { limit: 2 } });
    assert.equal(historyPage1.experiment.runId, "stage5-current");
    assert.deepEqual(historyPage1.snapshots.items.map((item) => item.label), ["before", "during"]);
    assert.deepEqual(historyPage1.results.items.map((item) => item.testId), ["A02-00", "SH-01"]);
    const snapshotsPage2 = await reopened.snapshots(experiment.id, { limit: 2, cursor: historyPage1.snapshots.nextCursor! });
    const resultsPage2 = await reopened.results(experiment.id, { limit: 2, cursor: historyPage1.results.nextCursor! });
    assert.deepEqual(snapshotsPage2.items.map((item) => item.label), ["after"]);
    assert.deepEqual(resultsPage2.items.map((item) => item.testId), ["SH-05"]);
    assert.equal(snapshotsPage2.nextCursor, null);
    assert.equal(resultsPage2.nextCursor, null);
    await assert.rejects(reopened.list({ cursor: "invalid" }), /invalid_scenario_history_cursor/);
  } finally {
    await database.close().catch(() => undefined);
    await rm(root, { recursive: true, force: true });
  }
});

test("experiment runtime preserves cadence, serializes crossed polls, freezes while paused, and records boundary order", { timeout: 5_000 }, async () => {
  const database = await createDatabaseRuntime({ mode: "pglite" });
  await migrateFoundation(database);
  const repository = new ScenarioExperimentRepository(database);
  let sourceClock = "2026-08-01T09:00:00.000Z";
  let sourceCutoff: string | null = "uninitialized";
  const source = {
    setBusinessTime: async (currentAt: string) => { sourceClock = currentAt; },
    setSourceCutoffAt: async (cutoffAt: string | null) => { sourceCutoff = cutoffAt; },
  } as ScenarioSource;
  const calls: Array<{ ruleCode: string; businessTime: string }> = [];
  let automaticPollResolved: (() => void) | null = null;
  const scheduler = {
    runScheduled: async (query: DetectionQueryDefinition): Promise<CycleResult> => {
      calls.push({ ruleCode: query.ruleCode, businessTime: sourceClock });
      if (automaticPollResolved) {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 150));
        automaticPollResolved();
        automaticPollResolved = null;
      }
      return {
        cycleId: randomUUID(), queryId: query.queryId, status: "healthy", complete: true, fullEvaluation: true,
        recoveryRun: false, pageCount: 1, rowCount: 1, errorCode: null, pageEvidence: [{ page: 1, rowCount: 1, revision: "revision-1" }],
      };
    },
  } as unknown as DetectionScheduler;
  const registry = new Map(["A02", "A03", "A05"].map((ruleCode) => [ruleCode, {
    query: {
      queryId: `${ruleCode.toLowerCase()}-runtime`, ruleCode, queryVersion: "1.0.0", adapterKind: "test_database",
      keyField: "id", requiredFields: ["id"], intervalMs: 1_000, timeoutMs: 500, pageSize: 10, maxRows: 100,
      maxAttempts: 1, retryBaseMs: 10, enabled: true,
    } as DetectionQueryDefinition,
    adapter: {} as DetectionSourceAdapter,
  }])) as ConstructorParameters<typeof ScenarioExperimentRuntime>[3];

  try {
    const runtime = new ScenarioExperimentRuntime(repository, source, scheduler, registry, false);
    await runtime.initialize();
    assert.equal(sourceCutoff, null);
    const created = await runtime.create({
      name: "Manual runtime", businessTime: sourceClock, pollingFrequencyMinutes: 3, identity: identity("runtime-manual"),
    });
    assert.equal(sourceCutoff, created.experiment!.sourceCutoffAt);
    const id = created.experiment!.id;
    const narrowed = await runtime.setSourceLookbackDays(id, -3);
    assert.equal(narrowed.experiment!.sourceCutoffAt, "2026-07-29T09:00:00.000Z");
    assert.equal(sourceCutoff, narrowed.experiment!.sourceCutoffAt);
    for (const seconds of [1, 2, 3, 17, 60] as const) {
      const configured = await runtime.configure(id, seconds, 3);
      assert.equal(configured.realMillisecondsPerSimulatedMinute, seconds * 1_000);
      assert.equal(configured.nextAutomaticTickAt, null);
      assert.deepEqual(configured.experiment!.nextDue, {
        A02: "2026-08-01T09:03:00.000Z", A03: "2026-08-01T09:03:00.000Z", A05: "2026-08-01T09:03:00.000Z",
      });
    }
    await runtime.configure(id, 1, 3);
    await runtime.pause(id, false);
    const jumped = await runtime.advance(id, 29);
    assert.equal(jumped.experiment.initialBusinessTime, "2026-08-01T09:00:00.000Z");
    assert.equal(jumped.experiment.businessTime, "2026-08-01T09:29:00.000Z");
    assert.deepEqual(jumped.polls.map(({ ruleCode, dueAt }) => [ruleCode, dueAt]), Array.from({ length: 9 }, (_, index) =>
      ["A02", "A03", "A05"].map((ruleCode) => [ruleCode, `2026-08-01T09:${String((index + 1) * 3).padStart(2, "0")}:00.000Z`])).flat());
    const paused = await runtime.pause(id, true);
    const frozen = await runtime.advance(id, 10);
    assert.equal(frozen.experiment.businessTime, paused.experiment!.businessTime);
    assert.equal(frozen.polls.length, 0);

    const boundary = await runtime.create({
      name: "Boundary runtime", businessTime: "2026-08-01T10:00:00.000Z", pollingFrequencyMinutes: 3, identity: identity("runtime-boundary"),
    });
    const boundaryId = boundary.experiment!.id;
    await runtime.pause(boundaryId, false);
    await runtime.advance(boundaryId, 3);
    await runtime.executeBeforeSourceAction(async () => ({ actionId: "a02.receive", ruleCode: "A02", naturalKey: { value: 4202 } }));
    const events = await repository.runtimeEvents(boundaryId);
    assert.deepEqual(events.map((event) => event.eventType), [
      "poll_started", "poll_completed", "poll_started", "poll_completed", "poll_started", "poll_completed", "source_action",
    ]);
    assert.ok(events.every((event) => event.businessTime === "2026-08-01T10:03:00.000Z"));
    assert.ok(events.every((event) => Date.parse(event.recordedAt) !== Date.parse(event.businessTime)));
    const operationalEvents = await repository.operationalEvents("A02");
    assert.deepEqual(operationalEvents.map((event) => [event.experimentId, event.experimentName, event.eventType]), [
      [boundaryId, "Boundary runtime", "source_action"],
    ]);

    const beforeRestart = await runtime.status();
    const restarted = new ScenarioExperimentRuntime(repository, source, scheduler, registry, false);
    const afterRestart = await restarted.initialize();
    assert.equal(afterRestart.experiment!.id, boundaryId);
    assert.equal(afterRestart.experiment!.businessTime, beforeRestart.experiment!.businessTime);
    assert.equal(afterRestart.nextAutomaticTickAt, beforeRestart.nextAutomaticTickAt);
    assert.equal(sourceClock, afterRestart.experiment!.businessTime);

    let rejectAutomaticPoll: ((error: unknown) => void) | null = null;
    const automaticFailure = new Promise<never>((_resolve, reject) => { rejectAutomaticPoll = reject; });
    const automatic = new ScenarioExperimentRuntime(repository, source, scheduler, registry, true, (error) => rejectAutomaticPoll?.(error));
    const autoCreated = await automatic.create({
      name: "Automatic runtime", businessTime: "2026-08-01T11:00:00.000Z", pollingFrequencyMinutes: 1, identity: identity("runtime-automatic"),
    });
    const automaticId = autoCreated.experiment!.id;
    const automaticPoll = new Promise<void>((resolvePoll) => { automaticPollResolved = resolvePoll; });
    await automatic.configure(automaticId, 1, 1);
    await automatic.pause(automaticId, false);
    const firstDeadline = (await automatic.status()).nextAutomaticTickAt!;
    let automaticTimeout: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      automaticPoll,
      automaticFailure,
      new Promise<never>((_resolve, reject) => { automaticTimeout = setTimeout(() => reject(new Error(`automatic_poll_timeout:${firstDeadline}:${new Date().toISOString()}:${JSON.stringify(calls.at(-1))}`)), 2_500); }),
    ]);
    if (automaticTimeout) clearTimeout(automaticTimeout);
    await automatic.executeSerialized(async () => undefined);
    const afterAutomaticPoll = await automatic.status();
    assert.equal(afterAutomaticPoll.experiment!.businessTime, "2026-08-01T11:01:00.000Z");
    assert.equal(afterAutomaticPoll.nextAutomaticTickAt, new Date(Date.parse(firstDeadline) + 1_000).toISOString());
    await automatic.pause(automaticId, true);
    automatic.stop();
  } finally {
    await database.close();
  }
});
