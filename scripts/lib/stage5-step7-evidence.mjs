import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export const STEP7_SCHEDULING_CASE_IDS = ["7.1a", "7.1b", "7.1c", "7.2a", "7.2b", "7.2c", "7.3a", "7.3b", "7.3c"];
export const STEP7_RECOVERY_CASE_IDS = ["7.4b", "7.4c", "7.5b-7.5d", "7.6b-7.6c", "7.7c", "7.7d"];

const plainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;
const validTimestamp = (value) => nonEmpty(value) && Number.isFinite(Date.parse(value));
const sorted = (values) => [...values].sort();

function identifierListErrors(value, path) {
  if (!Array.isArray(value)) return [`${path} must be an array`];
  const errors = [];
  if (value.some((item) => !nonEmpty(item))) errors.push(`${path} contains an invalid identifier`);
  if (new Set(value).size !== value.length) errors.push(`${path} contains duplicate identifiers`);
  return errors;
}

function caseErrors(value, path, suite) {
  if (!plainObject(value)) return [`${path} must be an object`];
  const errors = [];
  if (!nonEmpty(value.id)) errors.push(`${path}.id is required`);
  if (value.status !== "passed") errors.push(`${path}.status must be passed`);
  for (const field of ["pollCycleIds", "queryIds", "runtimeEventIds", "interruptionIds"]) {
    errors.push(...identifierListErrors(value[field], `${path}.${field}`));
  }
  if (!plainObject(value.timestamps)) errors.push(`${path}.timestamps must be an object`);
  else for (const [name, timestamps] of Object.entries(value.timestamps)) {
    errors.push(...identifierListErrors(timestamps, `${path}.timestamps.${name}`));
    if (Array.isArray(timestamps) && timestamps.some((timestamp) => !validTimestamp(timestamp))) errors.push(`${path}.timestamps.${name} contains an invalid timestamp`);
  }
  if (!plainObject(value.objectIds)) errors.push(`${path}.objectIds must be an object`);
  else for (const [name, identifiers] of Object.entries(value.objectIds)) errors.push(...identifierListErrors(identifiers, `${path}.objectIds.${name}`));
  if (!plainObject(value.assertions) || Object.keys(value.assertions).length === 0) errors.push(`${path}.assertions must be non-empty`);
  else for (const [name, passed] of Object.entries(value.assertions)) if (passed !== true) errors.push(`${path}.assertions.${name} must be true`);
  if (!plainObject(value.cleanup)) errors.push(`${path}.cleanup must be an object`);
  else {
    errors.push(...identifierListErrors(value.cleanup.beforeSourceIds, `${path}.cleanup.beforeSourceIds`));
    errors.push(...identifierListErrors(value.cleanup.afterSourceIds, `${path}.cleanup.afterSourceIds`));
    if (value.cleanup.executedInFinally !== true) errors.push(`${path}.cleanup.executedInFinally must be true`);
    if (value.cleanup.sourceRestored !== true) errors.push(`${path}.cleanup.sourceRestored must be true`);
    if (Array.isArray(value.cleanup.beforeSourceIds) && Array.isArray(value.cleanup.afterSourceIds)
      && JSON.stringify(value.cleanup.beforeSourceIds) !== JSON.stringify(value.cleanup.afterSourceIds)) {
      errors.push(`${path}.cleanup source identifiers do not match`);
    }
  }
  if (suite === "scheduling" && value.interruptionIds?.length) errors.push(`${path}.interruptionIds must be empty for scheduling evidence`);
  if (suite === "scheduling" && !value.queryIds?.length) errors.push(`${path}.queryIds must identify the scheduled query`);
  if (suite === "scheduling" && value.id !== "7.3a" && !value.pollCycleIds?.length) errors.push(`${path}.pollCycleIds must identify executed polls`);
  if (suite === "scheduling" && Object.values(value.timestamps ?? {}).flat().length === 0) errors.push(`${path}.timestamps must identify due or observed time`);
  if (suite === "scheduling" && value.id === "7.3a" && !Object.values(value.objectIds ?? {}).flat().length) errors.push(`${path}.objectIds must identify preserved runtime state`);
  if (suite === "recovery" && !value.interruptionIds?.length) errors.push(`${path}.interruptionIds must identify the exercised interruption`);
  if (suite === "recovery" && !value.pollCycleIds?.length) errors.push(`${path}.pollCycleIds must identify recovery polls`);
  if (suite === "recovery" && !value.queryIds?.length) errors.push(`${path}.queryIds must identify recovery queries`);
  if (suite === "recovery" && Object.values(value.objectIds ?? {}).flat().length === 0) errors.push(`${path}.objectIds must identify committed or repaired objects`);
  return errors;
}

export function validateStep7SuiteEvidence(value, expectedSuite) {
  if (!plainObject(value)) return ["suite evidence must be an object"];
  const errors = [];
  if (value.schemaVersion !== "1.0.0") errors.push("suite schemaVersion must be 1.0.0");
  if (value.kind !== "suite") errors.push("suite kind must be suite");
  if (value.suite !== expectedSuite) errors.push(`suite must be ${expectedSuite}`);
  if (!nonEmpty(value.runId)) errors.push("suite runId is required");
  if (!validTimestamp(value.startedAt) || !validTimestamp(value.completedAt)) errors.push("suite timestamps must be valid");
  if (!Array.isArray(value.cases)) errors.push("suite cases must be an array");
  else {
    value.cases.forEach((entry, index) => errors.push(...caseErrors(entry, `cases[${index}]`, expectedSuite)));
    const expected = expectedSuite === "scheduling" ? STEP7_SCHEDULING_CASE_IDS : STEP7_RECOVERY_CASE_IDS;
    const actual = value.cases.map((entry) => entry?.id);
    if (new Set(actual).size !== actual.length) errors.push("suite contains duplicate case IDs");
    const missing = expected.filter((id) => !actual.includes(id));
    const extra = actual.filter((id) => !expected.includes(id));
    if (missing.length) errors.push(`suite missing case IDs: ${missing.join(", ")}`);
    if (extra.length) errors.push(`suite contains unexpected case IDs: ${extra.join(", ")}`);
  }
  return errors;
}

export function validateStep7AggregateEvidence(value) {
  if (!plainObject(value)) return ["aggregate evidence must be an object"];
  const errors = [];
  if (value.schemaVersion !== "1.0.0") errors.push("aggregate schemaVersion must be 1.0.0");
  if (value.kind !== "aggregate") errors.push("aggregate kind must be aggregate");
  if (value.gate !== "phase6-stage5-step7") errors.push("aggregate gate must be phase6-stage5-step7");
  if (!nonEmpty(value.runId)) errors.push("aggregate runId is required");
  if (!validTimestamp(value.startedAt) || !validTimestamp(value.completedAt)) errors.push("aggregate timestamps must be valid");
  if (value.accepted !== true) errors.push("aggregate accepted must be true");
  errors.push(...validateStep7SuiteEvidence(value.scheduling, "scheduling").map((error) => `scheduling: ${error}`));
  errors.push(...validateStep7SuiteEvidence(value.recovery, "recovery").map((error) => `recovery: ${error}`));
  if (plainObject(value.scheduling) && plainObject(value.recovery)
    && (value.scheduling.runId !== value.runId || value.recovery.runId !== value.runId)) errors.push("aggregate and suite run IDs must match");
  if (!plainObject(value.sourceRestoration)) errors.push("aggregate sourceRestoration must be an object");
  else {
    for (const field of ["resetExitCode", "restoreExitCode"]) if (value.sourceRestoration[field] !== 0) errors.push(`sourceRestoration.${field} must be zero`);
    for (const field of ["baselineBefore", "baselineAfter", "cleanupExecutedInFinally"]) if (value.sourceRestoration[field] !== true) errors.push(`sourceRestoration.${field} must be true`);
    if (!nonEmpty(value.sourceRestoration.log)) errors.push("sourceRestoration.log is required");
  }
  if (!Array.isArray(value.checks) || value.checks.length === 0) errors.push("aggregate checks must be non-empty");
  else {
    const names = value.checks.map((check) => check?.name);
    if (new Set(names).size !== names.length) errors.push("aggregate checks contain duplicate names");
    for (const [index, check] of value.checks.entries()) {
      if (!plainObject(check) || !nonEmpty(check.name) || !nonEmpty(check.log)) errors.push(`checks[${index}] is invalid`);
      else if (check.exitCode !== 0) errors.push(`checks[${index}].exitCode must be zero`);
    }
  }
  return errors;
}

export function assertStep7SuiteEvidence(value, expectedSuite) {
  const errors = validateStep7SuiteEvidence(value, expectedSuite);
  if (errors.length) throw new Error(`invalid_step7_${expectedSuite}_evidence: ${errors.join(" | ")}`);
}

export function assertStep7AggregateEvidence(value) {
  const errors = validateStep7AggregateEvidence(value);
  if (errors.length) throw new Error(`invalid_step7_aggregate_evidence: ${errors.join(" | ")}`);
}

export function canonicalizeStep7SuiteEvidence(value) {
  return {
    ...value,
    cases: [...value.cases].sort((left, right) => left.id.localeCompare(right.id)).map((entry) => ({
      ...entry,
      pollCycleIds: sorted(entry.pollCycleIds),
      queryIds: sorted(entry.queryIds),
      runtimeEventIds: sorted(entry.runtimeEventIds),
      interruptionIds: sorted(entry.interruptionIds),
      timestamps: Object.fromEntries(Object.entries(entry.timestamps).sort(([left], [right]) => left.localeCompare(right))
        .map(([name, timestamps]) => [name, sorted(timestamps)])),
      objectIds: Object.fromEntries(Object.entries(entry.objectIds).sort(([left], [right]) => left.localeCompare(right))
        .map(([name, identifiers]) => [name, sorted(identifiers)])),
    })),
  };
}

export function createStep7SuiteRecorder(suite, options = {}) {
  const startedAt = new Date().toISOString();
  const cases = [];
  const runId = options.runId ?? process.env.STEP7_RUN_ID ?? `standalone-${suite}`;
  const outputPath = options.outputPath ?? process.env.STEP7_EVIDENCE_PATH;
  return {
    record(entry) {
      if (cases.some((candidate) => candidate.id === entry.id)) throw new Error(`duplicate_step7_case_evidence:${entry.id}`);
      cases.push(structuredClone(entry));
    },
    async finalize() {
      const evidence = canonicalizeStep7SuiteEvidence({
        schemaVersion: "1.0.0",
        kind: "suite",
        suite,
        runId,
        startedAt,
        completedAt: new Date().toISOString(),
        cases,
      });
      assertStep7SuiteEvidence(evidence, suite);
      if (outputPath) {
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, { flag: "wx" });
      }
      return evidence;
    },
  };
}
