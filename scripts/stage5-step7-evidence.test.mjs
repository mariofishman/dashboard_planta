import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {
  STEP7_RECOVERY_CASE_IDS,
  STEP7_SCHEDULING_CASE_IDS,
  canonicalizeStep7SuiteEvidence,
  validateStep7AggregateEvidence,
  validateStep7SuiteEvidence,
} from "./lib/stage5-step7-evidence.mjs";

const timestamp = "2026-08-01T12:00:00.000Z";
const schema = JSON.parse(await readFile(resolve("config/detection/schemas/stage5-step7-evidence.v1.schema.json"), "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateSchema = ajv.compile(schema);
const cleanup = { executedInFinally: true, sourceRestored: true, beforeSourceIds: ["source-1"], afterSourceIds: ["source-1"] };
const scheduling = {
  schemaVersion: "1.0.0", kind: "suite", suite: "scheduling", runId: "run-1", startedAt: timestamp, completedAt: timestamp,
  cases: STEP7_SCHEDULING_CASE_IDS.map((id) => ({ id, status: "passed", pollCycleIds: [`cycle-${id}`], queryIds: [`query-${id}`],
    runtimeEventIds: [`event-${id}`], interruptionIds: [], timestamps: { dueAt: [timestamp] },
    objectIds: id === "7.3a" ? { experiments: ["experiment-7.3a"] } : {}, assertions: { uniqueCycles: true }, cleanup })),
};
const recovery = {
  schemaVersion: "1.0.0", kind: "suite", suite: "recovery", runId: "run-1", startedAt: timestamp, completedAt: timestamp,
  cases: STEP7_RECOVERY_CASE_IDS.map((id) => ({ id, status: "passed", pollCycleIds: [`cycle-${id}`], queryIds: [`query-${id}`], runtimeEventIds: [],
    interruptionIds: [`interruption-${id}`], timestamps: {}, objectIds: { incidents: [`incident-${id}`] }, assertions: { repairedOnce: true }, cleanup })),
};
const aggregate = {
  schemaVersion: "1.0.0", kind: "aggregate", gate: "phase6-stage5-step7", runId: "run-1", startedAt: timestamp, completedAt: timestamp,
  accepted: true, scheduling, recovery,
  sourceRestoration: { resetExitCode: 0, baselineBefore: true, restoreExitCode: 0, baselineAfter: true, cleanupExecutedInFinally: true, log: "restore.log" },
  checks: [{ name: "diff_check", exitCode: 0, log: "diff.log" }],
};

test("accepts complete scheduling, recovery, and aggregate evidence", () => {
  assert.deepEqual(validateStep7SuiteEvidence(scheduling, "scheduling"), []);
  assert.deepEqual(validateStep7SuiteEvidence(recovery, "recovery"), []);
  assert.deepEqual(validateStep7AggregateEvidence(aggregate), []);
  for (const value of [scheduling, recovery, aggregate]) assert.equal(validateSchema(value), true, JSON.stringify(validateSchema.errors));
});

test("rejects missing, duplicate, unexpected, and non-passing suite evidence", () => {
  const missing = structuredClone(scheduling); missing.cases.pop();
  assert.ok(validateStep7SuiteEvidence(missing, "scheduling").some((error) => error.includes("missing case IDs")));
  const duplicate = structuredClone(scheduling); duplicate.cases[1].id = duplicate.cases[0].id;
  assert.ok(validateStep7SuiteEvidence(duplicate, "scheduling").some((error) => error.includes("duplicate case IDs")));
  const extra = structuredClone(scheduling); extra.cases[0].id = "7.9";
  assert.ok(validateStep7SuiteEvidence(extra, "scheduling").some((error) => error.includes("unexpected case IDs")));
  const failed = structuredClone(scheduling); failed.cases[0].assertions.uniqueCycles = false;
  assert.ok(validateStep7SuiteEvidence(failed, "scheduling").some((error) => error.includes("must be true")));
});

test("rejects incomplete identifiers and cleanup that did not restore source state", () => {
  const identifiers = structuredClone(recovery); identifiers.cases[0].interruptionIds = [];
  assert.ok(validateStep7SuiteEvidence(identifiers, "recovery").some((error) => error.includes("identify the exercised interruption")));
  const cleanupFailure = structuredClone(recovery); cleanupFailure.cases[0].cleanup.afterSourceIds = ["source-2"];
  assert.ok(validateStep7SuiteEvidence(cleanupFailure, "recovery").some((error) => error.includes("do not match")));
  const notFinally = structuredClone(recovery); notFinally.cases[0].cleanup.executedInFinally = false;
  assert.ok(validateStep7SuiteEvidence(notFinally, "recovery").some((error) => error.includes("executedInFinally")));
  const noDeadline = structuredClone(scheduling); noDeadline.cases[0].timestamps = {};
  assert.ok(validateStep7SuiteEvidence(noDeadline, "scheduling").some((error) => error.includes("due or observed time")));
  const noObjects = structuredClone(recovery); noObjects.cases[0].objectIds = {};
  assert.ok(validateStep7SuiteEvidence(noObjects, "recovery").some((error) => error.includes("committed or repaired objects")));
});

test("rejects aggregate run drift, failed restoration, and failed or duplicate checks", () => {
  const drift = structuredClone(aggregate); drift.recovery.runId = "other-run";
  assert.ok(validateStep7AggregateEvidence(drift).some((error) => error.includes("run IDs must match")));
  const restoration = structuredClone(aggregate); restoration.sourceRestoration.baselineAfter = false;
  assert.ok(validateStep7AggregateEvidence(restoration).some((error) => error.includes("baselineAfter")));
  const failedCheck = structuredClone(aggregate); failedCheck.checks[0].exitCode = 1;
  assert.ok(validateStep7AggregateEvidence(failedCheck).some((error) => error.includes("exitCode")));
  const duplicateCheck = structuredClone(aggregate); duplicateCheck.checks.push(structuredClone(duplicateCheck.checks[0]));
  assert.ok(validateStep7AggregateEvidence(duplicateCheck).some((error) => error.includes("duplicate names")));
});

test("canonicalizes unordered suite identifiers deterministically", () => {
  const value = structuredClone(recovery);
  value.cases.reverse();
  value.cases[0].interruptionIds = ["z", "a"];
  value.cases[0].timestamps = { observedAt: ["2026-08-01T13:00:00.000Z", timestamp] };
  const first = canonicalizeStep7SuiteEvidence(value);
  const second = canonicalizeStep7SuiteEvidence(structuredClone(value));
  assert.deepEqual(first, second);
  assert.deepEqual(first.cases.map((entry) => entry.id), [...STEP7_RECOVERY_CASE_IDS].sort());
  assert.deepEqual(first.cases.find((entry) => entry.id === value.cases[0].id).interruptionIds, ["a", "z"]);
  assert.deepEqual(first.cases.find((entry) => entry.id === value.cases[0].id).timestamps.observedAt, [timestamp, "2026-08-01T13:00:00.000Z"]);
});
