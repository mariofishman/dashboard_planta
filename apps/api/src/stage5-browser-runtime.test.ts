import assert from "node:assert/strict";
import test from "node:test";
import type { DatabaseRuntime } from "@monitor/database";
import type { ScenarioExperimentRuntime } from "@monitor/detection";
import { browserServiceIdentityDigest } from "../../../scripts/lib/stage5-browser-evidence.mjs";
import { createStage5BrowserRuntimeIdentity, type Stage5BrowserRuntimeSeed } from "./stage5-browser-runtime.js";

const seed: Stage5BrowserRuntimeSeed = {
  runId: "browser-run-1",
  experimentId: "11111111-1111-4111-8111-111111111111",
  runtimeId: "browser-runtime-1",
  captureNonce: "abcdefghijklmnop",
  manifestVersion: "2.0.0",
  sourceActionContractVersion: "1.1.0",
  startedAt: "2026-08-02T13:00:00.000Z",
};

function dependencies(overrides: { activeExperimentId?: string; runId?: string } = {}) {
  const experiment = {
    id: overrides.activeExperimentId ?? seed.experimentId,
    runId: overrides.runId ?? seed.runId,
    manifestVersion: seed.manifestVersion,
    sourceActionContractVersion: seed.sourceActionContractVersion,
    name: "Browser diagnostic",
    status: "running" as const,
    businessTime: seed.startedAt,
    secondsPerSimulatedMinute: 1,
    pollingFrequencyMinutes: 1,
    nextDue: { A02: seed.startedAt, A03: seed.startedAt, A05: seed.startedAt },
    createdAt: seed.startedAt,
    updatedAt: seed.startedAt,
  };
  const database = {
    mode: "pglite",
    queryOne: async () => ({
      activeExperimentId: overrides.activeExperimentId ?? seed.experimentId,
      runId: overrides.runId ?? seed.runId,
      manifestVersion: seed.manifestVersion,
      sourceActionContractVersion: seed.sourceActionContractVersion,
    }),
  } as unknown as DatabaseRuntime;
  const runtime = { status: async () => ({ experiment, automaticScheduling: true, realMillisecondsPerSimulatedMinute: 60_000, nextAutomaticTickAt: null }) } as unknown as ScenarioExperimentRuntime;
  return { database, runtime };
}

test("builds one connected runtime identity from the active persisted experiment", async () => {
  const identity = await createStage5BrowserRuntimeIdentity({ seed, ...dependencies(), apiOrigin: "http://127.0.0.1:3010", webOrigin: "http://127.0.0.1:5180" });
  assert.equal(identity.identity.experimentId, seed.experimentId);
  assert.equal(identity.runtime.sourceKind, "test_database");
  assert.equal(identity.runtime.sourceAccount, "monitor_source_ro");
  assert.deepEqual(identity.runtime.services.map(({ name }) => name), ["laboratory", "api", "scheduler", "monitor_database", "dashboard", "chat"]);
  assert.deepEqual(identity.runtime.surfaces.map(({ name }) => name), ["laboratory", "dashboard", "chat_list", "chat_detail"]);
  for (const service of identity.runtime.services) assert.equal(service.identityDigest, browserServiceIdentityDigest(identity.identity, service));
});

test("rejects an inactive, substituted, or contract-drifted experiment", async () => {
  await assert.rejects(createStage5BrowserRuntimeIdentity({ seed, ...dependencies({ activeExperimentId: "22222222-2222-4222-8222-222222222222" }), apiOrigin: "http://127.0.0.1:3010", webOrigin: "http://127.0.0.1:5180" }), /stage5_browser_runtime_experiment_mismatch/);
  const mismatchedDatabase = dependencies();
  mismatchedDatabase.database.queryOne = async () => ({ activeExperimentId: seed.experimentId, runId: "other-run", manifestVersion: seed.manifestVersion, sourceActionContractVersion: seed.sourceActionContractVersion });
  await assert.rejects(createStage5BrowserRuntimeIdentity({ seed, ...mismatchedDatabase, apiOrigin: "http://127.0.0.1:3010", webOrigin: "http://127.0.0.1:5180" }), /stage5_browser_monitor_database_mismatch/);
});

test("rejects invalid runtime seeds and non-origin URLs", async () => {
  await assert.rejects(createStage5BrowserRuntimeIdentity({ seed: { ...seed, captureNonce: "short" }, ...dependencies(), apiOrigin: "http://127.0.0.1:3010", webOrigin: "http://127.0.0.1:5180" }), /captureNonce/);
  await assert.rejects(createStage5BrowserRuntimeIdentity({ seed, ...dependencies(), apiOrigin: "http://127.0.0.1:3010/path", webOrigin: "http://127.0.0.1:5180" }), /invalid_stage5_browser_runtime_origin/);
});
