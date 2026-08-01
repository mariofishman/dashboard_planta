const REF = /^([a-z][a-z0-9]*)\.([A-Za-z][A-Za-z0-9]*)\[(\d+)]$/;

const readPath = (value, path) => path.split(".").reduce((current, key) => current?.[key], value);

export function resolveFixtureSeed(seedDocument, seedRef) {
  const match = REF.exec(seedRef);
  if (!match) throw new Error(`invalid_fixture_seed_ref:${seedRef}`);
  const [, group, collection, rawIndex] = match;
  const values = seedDocument?.[group]?.[collection];
  const value = Array.isArray(values) ? values[Number(rawIndex)] : undefined;
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`fixture_seed_unavailable:${seedRef}`);
  return value;
}

function laneIds(contract) {
  return contract.executionLanes?.map((lane) => lane.id) ?? ["main"];
}

function belongsToLane(key, laneId, hasLanes) {
  return hasLanes ? key.isolationLane === laneId : true;
}

export function buildStage5FixturePlans(registry, testId, runId, seedDocument) {
  if (typeof runId !== "string" || runId.length === 0 || !/^[A-Za-z0-9._:-]+$/.test(runId)) throw new Error("invalid_fixture_run_id");
  const contract = registry.contracts.find((candidate) => candidate.testId === testId);
  if (!contract) throw new Error(`fixture_contract_unavailable:${testId}`);
  const experimentProfile = registry.profiles[contract.experimentProfile];
  const cleanupProfile = registry.profiles[contract.cleanupProfile];
  const hasLanes = Boolean(contract.executionLanes?.length);
  const keys = new Map((contract.source.naturalKeys ?? []).map((key) => [key.ref, {
    ...key,
    value: key.seedRef ? resolveFixtureSeed(seedDocument, key.seedRef) : null,
  }]));

  return laneIds(contract).map((laneId) => {
    const laneKeys = [...keys.values()].filter((key) => belongsToLane(key, laneId, hasLanes));
    const keyRefs = new Set(laneKeys.map((key) => key.ref));
    const actions = contract.actions.filter((action) => hasLanes ? action.isolationLane === laneId : true);
    const fixtureMutations = (contract.source.allowedMutations ?? [])
      .filter((mutation) => mutation.type === "fixture_population_contract")
      .map((mutation) => ({ ...mutation, keyRefs: mutation.keyRefs.filter((ref) => keyRefs.has(ref)) }))
      .filter((mutation) => mutation.keyRefs.length > 0);
    const isolationId = `${runId}:${testId}:${laneId}`;
    return {
      testId,
      group: contract.group,
      laneId,
      isolationId,
      runId: `${runId}:${testId}${hasLanes ? `:${laneId}` : ""}`,
      contractId: contract.fixtureIdentity.contractId,
      keys: laneKeys,
      startingState: (contract.source.startingState ?? []).filter((assertion) => keyRefs.has(assertion.keyRef)),
      relationships: (contract.source.relationships ?? []).filter((relationship) => relationship.phase === "starting_state" && keyRefs.has(relationship.leftKeyRef) && keyRefs.has(relationship.rightKeyRef)),
      fixtureMutations,
      actions,
      experiment: {
        name: experimentProfile.experimentNameTemplate.replace("{runId}", runId).replace("{testId}", `${testId}${hasLanes ? ` ${laneId}` : ""}`),
        businessTime: experimentProfile.businessTime,
        speed: experimentProfile.speed,
        frequencies: experimentProfile.frequencies,
        identity: {
          runId: experimentProfile.runIdTemplate.replace("{runId}", runId).replace("{testId}", `${testId}${hasLanes ? `:${laneId}` : ""}`),
          manifestVersion: registry.manifestVersion,
          sourceActionContractVersion: registry.sourceActionContractVersion,
        },
        creation: actions.some((action) => action.actionId === "experiment.create") ? "action" : "setup",
      },
      cleanupProfile,
    };
  });
}

function assertionPasses(actual, operator, expected) {
  if (operator === "equals") return actual === expected;
  if (operator === "not_equals") return actual !== expected;
  if (operator === "exists") return actual !== undefined && actual !== null;
  if (operator === "not_exists") return actual === undefined || actual === null;
  if (operator === "gt") return Number(actual) > Number(expected);
  if (operator === "gte") return Number(actual) >= Number(expected);
  if (operator === "lt") return Number(actual) < Number(expected);
  if (operator === "lte") return Number(actual) <= Number(expected);
  if (operator === "includes") return Array.isArray(actual) && actual.includes(expected);
  return false;
}

export async function prepareStage5FixtureLane(plan, ports) {
  const monitorRuntime = await ports.createMonitorRuntime({ isolationId: plan.isolationId, testId: plan.testId, laneId: plan.laneId });
  if (!monitorRuntime || monitorRuntime.id !== plan.isolationId) throw new Error("invalid_monitor_isolation_handle");
  const monitorState = await ports.inspectMonitorRuntime(monitorRuntime);
  if (!monitorState || monitorState.objectCount !== 0 || monitorState.committedCursor !== 0) throw new Error(`monitor_runtime_not_empty:${plan.isolationId}`);

  let experiment = null;
  if (plan.experiment.creation === "setup") experiment = await ports.createExperiment(plan.experiment, monitorRuntime);
  if (plan.experiment.creation === "setup" && (!experiment || typeof experiment.id !== "string" || experiment.id.length === 0
    || (experiment.runId !== undefined && experiment.runId !== plan.experiment.identity.runId))) throw new Error("invalid_fixture_experiment_identity");
  for (const mutation of plan.fixtureMutations) {
    const mutationKeys = mutation.keyRefs.map((ref) => {
      const key = plan.keys.find((candidate) => candidate.ref === ref);
      if (!key || key.value === null) throw new Error(`fixture_mutation_key_unavailable:${plan.testId}:${ref}`);
      return { ref, value: key.value, ruleCode: key.ruleCode, field: key.field };
    });
    await ports.applyFixtureMutation(mutation.contractId, mutationKeys);
  }

  const sourceByRef = new Map();
  for (const key of plan.keys) sourceByRef.set(key.ref, key.value === null ? {} : await ports.readSource(key));
  for (const assertion of plan.startingState) {
    const actual = readPath(sourceByRef.get(assertion.keyRef), assertion.path);
    if (!assertionPasses(actual, assertion.operator, assertion.expected)) throw new Error(`fixture_starting_state_mismatch:${plan.testId}:${plan.laneId}:${assertion.keyRef}:${assertion.path}`);
  }
  for (const relationship of plan.relationships) {
    const left = readPath(sourceByRef.get(relationship.leftKeyRef), relationship.leftPath);
    const right = readPath(sourceByRef.get(relationship.rightKeyRef), relationship.rightPath);
    if (!assertionPasses(left, relationship.operator, right)) throw new Error(`fixture_relationship_mismatch:${plan.testId}:${plan.laneId}`);
  }
  return { plan, monitorRuntime, experiment, sourceByRef };
}

const DIGEST = /^sha256:[a-f0-9]{64}$/;

export class Stage5FixtureCleanupError extends Error {
  constructor(cleanupFailures, executionError = null) {
    super(`stage5_fixture_cleanup_failed:${cleanupFailures.join(",")}`);
    this.name = "Stage5FixtureCleanupError";
    this.cleanupFailures = cleanupFailures;
    this.executionError = executionError;
  }
}

function validBaseline(value) {
  return value && DIGEST.test(value.sourceDigest) && DIGEST.test(value.unrelatedRowsDigest) && value.snapshot !== undefined;
}

export async function runWithStage5FixtureLane(plan, ports, execute) {
  if (typeof execute !== "function") throw new Error("fixture_execute_callback_required");
  const baseline = await ports.captureSourceBaseline(plan);
  if (!validBaseline(baseline)) throw new Error("invalid_fixture_source_baseline");
  let context = null;
  let monitorRuntime = null;
  let executionError = null;
  let result;
  const cleanupFailures = [];
  const wrappedPorts = {
    ...ports,
    createMonitorRuntime: async (input) => {
      monitorRuntime = await ports.createMonitorRuntime(input);
      return monitorRuntime;
    },
  };
  try {
    context = await prepareStage5FixtureLane(plan, wrappedPorts);
    result = await execute(context);
  } catch (error) {
    executionError = error;
  } finally {
    try { await ports.restoreSourceBaseline(plan, baseline); }
    catch { cleanupFailures.push("source_restore_failed"); }
    let restored = null;
    try { restored = await ports.captureSourceDigest(plan); }
    catch { cleanupFailures.push("restored_digest_unavailable"); }
    if (!restored || restored.sourceDigest !== baseline.sourceDigest) cleanupFailures.push("source_digest_mismatch");
    if (!restored || restored.unrelatedRowsDigest !== baseline.unrelatedRowsDigest) cleanupFailures.push("unrelated_rows_digest_mismatch");
    if (monitorRuntime) {
      try { await ports.destroyMonitorRuntime(monitorRuntime); }
      catch { cleanupFailures.push("monitor_destroy_failed"); }
      try {
        if (!await ports.verifyMonitorRuntimeDestroyed(monitorRuntime)) cleanupFailures.push("monitor_isolation_not_destroyed");
      } catch { cleanupFailures.push("monitor_destroy_verification_failed"); }
    }
    const report = {
      testId: plan.testId,
      laneId: plan.laneId,
      isolationId: plan.isolationId,
      executedInFinally: true,
      sourceRestored: !cleanupFailures.some((failure) => failure.includes("source") || failure.includes("digest")),
      beforeDigest: baseline.sourceDigest,
      afterDigest: restored?.sourceDigest ?? null,
      unrelatedBeforeDigest: baseline.unrelatedRowsDigest,
      unrelatedAfterDigest: restored?.unrelatedRowsDigest ?? null,
      monitorIsolationDestroyed: monitorRuntime ? !cleanupFailures.some((failure) => failure.startsWith("monitor_")) : true,
      executionFailed: executionError !== null,
      cleanupFailures,
    };
    try { await ports.writeCleanupArtifact(plan.cleanupProfile.artifactPathTemplate, plan, report); }
    catch { cleanupFailures.push("cleanup_artifact_write_failed"); }
  }
  if (cleanupFailures.length > 0) throw new Stage5FixtureCleanupError([...new Set(cleanupFailures)], executionError);
  if (executionError) throw executionError;
  return result;
}
