import assert from "node:assert/strict";
import test from "node:test";
import type { DatabaseRuntime } from "@monitor/database";
import type { ScenarioExperimentRuntime } from "@monitor/detection";
import { TestDatabaseResetCoordinator } from "./test-database-reset.js";

const waitUntilFinished = async (coordinator: TestDatabaseResetCoordinator) => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const status = coordinator.status();
    if (status.stage === "succeeded" || status.stage === "failed") return status;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  throw new Error("reset_test_timeout");
};

test("restores test_database before clearing all local Monitor experiment and incident state", async () => {
  const calls: string[] = [];
  const database = {
    transaction: async (work: (transaction: { execute: (sql: string) => Promise<void> }) => Promise<void>) =>
      work({ execute: async (sql) => { calls.push(sql); } }),
  } as unknown as DatabaseRuntime;
  const runtime = {
    resetLocalState: async (work: () => Promise<void>) => {
      calls.push("runtime:stopped");
      await work();
      calls.push("runtime:source-refreshed");
    },
    initialize: async () => undefined,
  } as unknown as ScenarioExperimentRuntime;
  let identityCleared = false;
  let finishRestore: (() => void) | null = null;
  const restoreBarrier = new Promise<void>((resolve) => { finishRestore = resolve; });
  const coordinator = new TestDatabaseResetCoordinator(
    "/repository",
    database,
    runtime,
    () => { identityCleared = true; },
    async () => { calls.push("source:restored"); await restoreBarrier; },
  );

  assert.ok(["validating", "restoring_source"].includes(coordinator.start().stage));
  assert.throws(() => coordinator.start(), /test_database_reset_active/);
  finishRestore!();
  const result = await waitUntilFinished(coordinator);

  assert.equal(result.stage, "succeeded");
  assert.equal(identityCleared, true);
  assert.deepEqual(calls.slice(0, 2), ["runtime:stopped", "source:restored"]);
  assert.match(calls[2]!, /monitor_scenario_experiment/);
  assert.match(calls[2]!, /monitor_incident/);
  assert.match(calls[2]!, /monitor_conversation/);
  assert.match(calls[2]!, /monitor_poll_cycle/);
  assert.match(calls[2]!, /RESTART IDENTITY CASCADE/);
  assert.equal(calls[3], "runtime:source-refreshed");
});
