import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildStage5FixturePlans, prepareStage5FixtureLane, resolveFixtureSeed, runWithStage5FixtureLane, Stage5FixtureCleanupError } from "./lib/stage5-fixture-runner.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), "utf8"));
const registry = await readJson("config/detection/fixtures/stage5-fixture-contracts.v1.json");
const seeds = await readJson("config/detection/fixtures/test-database-stage5.v1.json");

test("resolves only versioned seed references", () => {
  assert.equal(resolveFixtureSeed(seeds, "a03.actionTemplate[0]"), 1415);
  assert.throws(() => resolveFixtureSeed(seeds, "a03.constructor[0]"), /fixture_seed_unavailable/);
  assert.throws(() => resolveFixtureSeed(seeds, "../secret"), /invalid_fixture_seed_ref/);
});

test("builds fresh lane-specific plans without cross-lane keys or actions", () => {
  const plans = buildStage5FixturePlans(registry, "A02-07", "run-1", seeds);
  assert.deepEqual(plans.map((plan) => plan.laneId), ["cancel", "reject"]);
  assert.equal(new Set(plans.map((plan) => plan.isolationId)).size, 2);
  assert.ok(plans[0].keys.every((key) => key.isolationLane === "cancel"));
  assert.ok(plans[1].keys.every((key) => key.isolationLane === "reject"));
  assert.ok(plans[0].actions.every((action) => action.isolationLane === "cancel"));
  assert.ok(plans[1].actions.every((action) => action.isolationLane === "reject"));
});

test("reserves action-created experiments and creates setup-owned experiments", async () => {
  const actionPlan = buildStage5FixturePlans(registry, "SH-01", "run-2", seeds)[0];
  const setupPlan = buildStage5FixturePlans(registry, "A02-00", "run-2", seeds)[0];
  assert.equal(actionPlan.experiment.creation, "action");
  assert.equal(setupPlan.experiment.creation, "setup");
  const created = [];
  const ports = {
    createMonitorRuntime: async ({ isolationId }) => ({ id: isolationId }),
    inspectMonitorRuntime: async () => ({ objectCount: 0, committedCursor: 0 }),
    createExperiment: async (experiment) => { created.push(experiment.identity.runId); return { id: `experiment-${created.length}` }; },
    applyFixtureMutation: async () => {},
    readSource: async () => ({ state: "template" }),
  };
  await prepareStage5FixtureLane(actionPlan, ports);
  await prepareStage5FixtureLane(setupPlan, ports);
  assert.deepEqual(created, ["run-2:A02-00"]);
});

test("applies deterministic population setup and verifies exact starting state", async () => {
  const plan = buildStage5FixturePlans(registry, "A02-06", "run-3", seeds)[0];
  const mutations = [];
  const rows = new Map([
    [23960, { state: "RECIBIDO", elapsedMinutes: 20 }],
    [24520, { state: "TRANSITO", elapsedMinutes: 31 }],
    [24559, { state: "TRANSITO", elapsedMinutes: 10 }],
  ]);
  const context = await prepareStage5FixtureLane(plan, {
    createMonitorRuntime: async ({ isolationId }) => ({ id: isolationId }),
    inspectMonitorRuntime: async () => ({ objectCount: 0, committedCursor: 0 }),
    createExperiment: async (experiment) => ({ id: experiment.identity.runId }),
    applyFixtureMutation: async (contractId, keys) => mutations.push({ contractId, keys }),
    readSource: async (key) => rows.get(key.value),
  });
  assert.equal(context.experiment.id, "run-3:A02-06");
  assert.deepEqual(mutations.map((mutation) => mutation.contractId), ["a02_mixed"]);
});

test("fails closed when a Monitor runtime is reused or a relationship drifts", async () => {
  const plan = buildStage5FixturePlans(registry, "A03-02", "run-4", seeds)[0];
  const base = {
    createMonitorRuntime: async ({ isolationId }) => ({ id: isolationId }),
    inspectMonitorRuntime: async () => ({ objectCount: 1, committedCursor: 0 }),
    createExperiment: async () => ({ id: "experiment" }), applyFixtureMutation: async () => {}, readSource: async () => ({}),
  };
  await assert.rejects(() => prepareStage5FixtureLane(plan, base), /monitor_runtime_not_empty/);
  const states = new Map(plan.keys.map((key) => [key.value, key.ref === "competingCandidate" ? { active: false, machineCode: "OTHER" } : key.ref === "eligible" ? { active: true, consumptionCount: 0, elapsedMinutes: 16, machineCode: "M1" } : key.ref === "consumed" ? { active: true, consumptionCount: 1 } : key.ref === "closed" ? { active: false } : { active: true, elapsedMinutes: 10 }]));
  await assert.rejects(() => prepareStage5FixtureLane(plan, { ...base, inspectMonitorRuntime: async () => ({ objectCount: 0, committedCursor: 0 }), readSource: async (key) => states.get(key.value) }), /fixture_relationship_mismatch/);
});

test("rejects mismatched Monitor and experiment identities", async () => {
  const plan = buildStage5FixturePlans(registry, "A02-00", "run-5", seeds)[0];
  const ports = {
    createMonitorRuntime: async () => ({ id: "another-runtime" }),
    inspectMonitorRuntime: async () => ({ objectCount: 0, committedCursor: 0 }),
    createExperiment: async () => ({ id: "experiment", runId: "another-run" }), applyFixtureMutation: async () => {}, readSource: async () => ({ state: "template" }),
  };
  await assert.rejects(() => prepareStage5FixtureLane(plan, ports), /invalid_monitor_isolation_handle/);
  await assert.rejects(() => prepareStage5FixtureLane(plan, { ...ports, createMonitorRuntime: async () => ({ id: plan.isolationId }) }), /invalid_fixture_experiment_identity/);
});

const digest = (character) => `sha256:${character.repeat(64)}`;
function lifecyclePorts(plan, overrides = {}) {
  const calls = [];
  const baseline = { sourceDigest: digest("a"), unrelatedRowsDigest: digest("b"), snapshot: { rows: [] } };
  return {
    calls,
    ports: {
      captureSourceBaseline: async () => { calls.push("capture-baseline"); return baseline; },
      createMonitorRuntime: async () => { calls.push("create-monitor"); return { id: plan.isolationId }; },
      inspectMonitorRuntime: async () => ({ objectCount: 0, committedCursor: 0 }),
      createExperiment: async (experiment) => ({ id: "experiment", runId: experiment.identity.runId }),
      applyFixtureMutation: async () => { calls.push("prepare-source"); },
      readSource: async () => ({ state: "RECIBIDO" }),
      restoreSourceBaseline: async () => { calls.push("restore-source"); },
      captureSourceDigest: async () => ({ sourceDigest: baseline.sourceDigest, unrelatedRowsDigest: baseline.unrelatedRowsDigest }),
      destroyMonitorRuntime: async () => { calls.push("destroy-monitor"); },
      verifyMonitorRuntimeDestroyed: async () => true,
      writeCleanupArtifact: async (_template, _plan, report) => { calls.push("write-cleanup"); assert.equal(report.executedInFinally, true); },
      ...overrides,
    },
  };
}

test("restores and verifies source and Monitor state after success", async () => {
  const plan = buildStage5FixturePlans(registry, "SH-01", "run-6", seeds)[0];
  const { ports, calls } = lifecyclePorts(plan);
  assert.equal(await runWithStage5FixtureLane(plan, ports, async () => "ok"), "ok");
  assert.deepEqual(calls, ["capture-baseline", "create-monitor", "restore-source", "destroy-monitor", "write-cleanup"]);
});

test("runs restoration in finally and preserves an execution failure", async () => {
  const plan = buildStage5FixturePlans(registry, "SH-01", "run-7", seeds)[0];
  const { ports, calls } = lifecyclePorts(plan);
  const failure = new Error("forced_execution_failure");
  await assert.rejects(() => runWithStage5FixtureLane(plan, ports, async () => { throw failure; }), (error) => error === failure);
  assert.ok(calls.includes("restore-source"));
  assert.ok(calls.includes("destroy-monitor"));
  assert.ok(calls.includes("write-cleanup"));
});

test("fails closed on restoration drift and retains the primary failure", async () => {
  const plan = buildStage5FixturePlans(registry, "SH-01", "run-8", seeds)[0];
  const primary = new Error("primary");
  const { ports } = lifecyclePorts(plan, { captureSourceDigest: async () => ({ sourceDigest: digest("c"), unrelatedRowsDigest: digest("d") }) });
  await assert.rejects(() => runWithStage5FixtureLane(plan, ports, async () => { throw primary; }), (error) => {
    assert.ok(error instanceof Stage5FixtureCleanupError);
    assert.equal(error.executionError, primary);
    assert.ok(error.cleanupFailures.includes("source_digest_mismatch"));
    assert.ok(error.cleanupFailures.includes("unrelated_rows_digest_mismatch"));
    return true;
  });
});

test("restores after setup fails partway through", async () => {
  const plan = buildStage5FixturePlans(registry, "A02-06", "run-9", seeds)[0];
  const setupFailure = new Error("forced_setup_failure");
  const { ports, calls } = lifecyclePorts(plan, { applyFixtureMutation: async () => { throw setupFailure; } });
  await assert.rejects(() => runWithStage5FixtureLane(plan, ports, async () => "unreachable"), (error) => error === setupFailure);
  assert.ok(calls.includes("restore-source"));
  assert.ok(calls.includes("destroy-monitor"));
});

test("fails closed when cleanup evidence cannot be written or Monitor disposal is incomplete", async () => {
  const plan = buildStage5FixturePlans(registry, "SH-01", "run-10", seeds)[0];
  const { ports } = lifecyclePorts(plan, {
    verifyMonitorRuntimeDestroyed: async () => false,
    writeCleanupArtifact: async () => { throw new Error("disk_failure"); },
  });
  await assert.rejects(() => runWithStage5FixtureLane(plan, ports, async () => "ok"), (error) => {
    assert.ok(error instanceof Stage5FixtureCleanupError);
    assert.ok(error.cleanupFailures.includes("monitor_isolation_not_destroyed"));
    assert.ok(error.cleanupFailures.includes("cleanup_artifact_write_failed"));
    return true;
  });
});

function assignPath(target, path, value) {
  const parts = path.split(".");
  let current = target;
  for (const part of parts.slice(0, -1)) current = current[part] ??= {};
  current[parts.at(-1)] = value;
}

function satisfyingValue(assertion) {
  if (assertion.operator === "equals" || assertion.operator === "gte" || assertion.operator === "lte") return assertion.expected;
  if (assertion.operator === "not_equals") return assertion.expected === "different" ? "another" : "different";
  if (assertion.operator === "exists") return "present";
  if (assertion.operator === "not_exists") return undefined;
  if (assertion.operator === "gt") return Number(assertion.expected) + 1;
  if (assertion.operator === "lt") return Number(assertion.expected) - 1;
  if (assertion.operator === "includes") return [assertion.expected];
  throw new Error(`unsupported_test_assertion:${assertion.operator}`);
}

function sourceStatesFor(plan) {
  const states = new Map(plan.keys.map(({ ref }) => [ref, {}]));
  for (const assertion of plan.startingState) assignPath(states.get(assertion.keyRef), assertion.path, satisfyingValue(assertion));
  for (const relationship of plan.relationships) {
    const right = relationship.rightPath.split(".").reduce((value, part) => value?.[part], states.get(relationship.rightKeyRef));
    assignPath(states.get(relationship.leftKeyRef), relationship.leftPath, right);
  }
  return states;
}

test("every approved fixture lane is independent and restores after a forced failure", async () => {
  const plans = registry.contracts.flatMap(({ testId }) => buildStage5FixturePlans(registry, testId, "forced-failure", seeds));
  assert.equal(registry.contracts.length, 34);
  assert.ok(plans.length >= 34);
  assert.equal(new Set(plans.map(({ isolationId }) => isolationId)).size, plans.length);
  for (const plan of plans) {
    const states = sourceStatesFor(plan);
    let source = "baseline";
    let monitorDestroyed = false;
    let artifact = null;
    const baseline = { sourceDigest: digest("a"), unrelatedRowsDigest: digest("b"), snapshot: { source } };
    const ports = {
      captureSourceBaseline: async () => baseline,
      createMonitorRuntime: async () => ({ id: plan.isolationId }),
      inspectMonitorRuntime: async () => ({ objectCount: 0, committedCursor: 0 }),
      createExperiment: async (experiment) => ({ id: plan.runId, runId: experiment.identity.runId }),
      applyFixtureMutation: async () => {},
      readSource: async (key) => states.get(key.ref),
      restoreSourceBaseline: async () => { source = baseline.snapshot.source; },
      captureSourceDigest: async () => source === "baseline"
        ? { sourceDigest: baseline.sourceDigest, unrelatedRowsDigest: baseline.unrelatedRowsDigest }
        : { sourceDigest: digest("c"), unrelatedRowsDigest: digest("d") },
      destroyMonitorRuntime: async () => { monitorDestroyed = true; },
      verifyMonitorRuntimeDestroyed: async () => monitorDestroyed,
      writeCleanupArtifact: async (_template, _plan, report) => { artifact = report; },
    };
    const failure = new Error(`forced_failure:${plan.testId}:${plan.laneId}`);
    await assert.rejects(() => runWithStage5FixtureLane(plan, ports, async () => {
      source = "mutated";
      throw failure;
    }), (error) => error === failure);
    assert.equal(source, "baseline", `${plan.isolationId} did not restore source`);
    assert.equal(artifact?.sourceRestored, true, `${plan.isolationId} lacks restoration evidence`);
    assert.equal(artifact?.monitorIsolationDestroyed, true, `${plan.isolationId} lacks Monitor disposal evidence`);
    assert.equal(artifact?.executionFailed, true, `${plan.isolationId} did not record the forced failure`);
  }
});
