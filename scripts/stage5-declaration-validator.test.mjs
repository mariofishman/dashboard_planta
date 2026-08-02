import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { compileStage5LedgerSchema, validateStage5Manifest } from "./lib/stage5-declaration-validator.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), "utf8"));
const manifest = await readJson("config/detection/stage5-connected-acceptance.v2.json");
const sourceContract = await readJson("config/detection/source-actions/stage5-source-actions.v1.json");
const ledgerSchema = await readJson("config/detection/schemas/stage5-connected-ledger-result.v1.schema.json");
const mutate = (callback) => { const value = structuredClone(manifest); callback(value); return value; };
const errorsFor = (value) => validateStage5Manifest(value, sourceContract);
const hasError = (errors, fragment) => assert.ok(errors.some((error) => error.includes(fragment)), `${fragment} not found in ${errors.join(" | ")}`);

test("accepts the exact declaration manifest and strict ledger schema", () => {
  assert.deepEqual(errorsFor(manifest), []);
  assert.equal(typeof compileStage5LedgerSchema(ledgerSchema), "function");
});

test("rejects a missing approved ID", () => {
  const errors = errorsFor(mutate((value) => value.tests.pop()));
  hasError(errors, "exactly 34 tests");
  hasError(errors, "missing approved test ID");
});

test("rejects a duplicate ID", () => {
  const errors = errorsFor(mutate((value) => { value.tests[33] = structuredClone(value.tests[32]); }));
  hasError(errors, "duplicate test ID");
  hasError(errors, "missing approved test ID: A05-08");
});

test("rejects an extra ID", () => {
  const errors = errorsFor(mutate((value) => { value.tests[33].id = "A05-99"; }));
  hasError(errors, "extra test ID: A05-99");
  hasError(errors, "missing approved test ID: A05-08");
});

test("rejects an excluded ID even when used as a substitution", () => {
  const errors = errorsFor(mutate((value) => { value.tests[33].id = "A05-07"; }));
  hasError(errors, "excluded test ID executed or substituted: A05-07");
});

test("rejects structurally invalid declarations", () => {
  const errors = errorsFor(mutate((value) => { value.tests[0].expected = ""; value.tests[0].unexpected = true; }));
  hasError(errors, "missing or unknown fields");
  hasError(errors, "needs an expected outcome");
});

test("fails closed on malformed collection fields without throwing", () => {
  const malformed = mutate((value) => {
    value.chainSections = "identity";
    value.excluded = null;
    value.tests[0].evidence = [];
    value.actionDefinitions = [];
  });
  assert.doesNotThrow(() => errorsFor(malformed));
  const errors = errorsFor(malformed);
  hasError(errors, "chainSections");
  hasError(errors, "excluded list");
  hasError(errors, "four evidence dimensions");
  hasError(errors, "undefined required action");
});

test("rejects invalid group accounting", () => {
  const errors = errorsFor(mutate((value) => { value.tests[0].group = "A02"; }));
  hasError(errors, "invalid group");
  hasError(errors, "actual shared count");
});

test("rejects an undefined required action", () => {
  const errors = errorsFor(mutate((value) => { value.tests[0].requiredActionIds.push("experiment.unknown"); }));
  hasError(errors, "undefined required action: experiment.unknown");
});

test("rejects source actions outside the shared writer and endpoint boundary", () => {
  const errors = errorsFor(mutate((value) => { value.actionDefinitions["a02.receive"].writerIdentity = "monitor_source_ro"; value.actionDefinitions["a02.receive"].endpoint = "direct SQL"; }));
  hasError(errors, "must use alertas_fake");
  hasError(errors, "must use the shared endpoint");
});

test("schema rejects silently omitted required payloads and passed cleanup failures", () => {
  const validate = compileStage5LedgerSchema(ledgerSchema);
  const digest = `sha256:${"a".repeat(64)}`;
  const timestamp = "2026-08-01T12:00:00.000Z";
  const notApplicable = (reason) => ({ applicability: "not_applicable", notApplicableReason: reason });
  const result = {
    schemaVersion: "1.0.0",
    identity: { testId: "SH-01", group: "shared", status: "passed", experimentId: "exp-1", runId: "run-1", manifestVersion: "2.0.0", sourceActionContractVersion: "1.1.0", startedAt: timestamp, completedAt: timestamp },
    expectation: { declared: "A new durable experiment starts empty while prior history remains queryable.", observed: "Experiment started empty and prior history remained available.", matched: true },
    laboratoryActions: { applicability: "required", items: [{ sequence: 1, actionId: "experiment.create", actionName: "Create durable experiment", invocationPath: "human_and_automation", endpoint: "POST /api/dev/scenario-runtime", writerIdentity: "not_applicable", businessTime: timestamp, auditTime: timestamp }] },
    sourceChain: notApplicable("no_source_action"), readChain: notApplicable("no_poll"), monitorChain: notApplicable("no_monitor_observation"), visibleResult: notApplicable("covered_by_later_browser_case"),
    schedulingRecovery: { scheduling: notApplicable("no_due_event"), recovery: notApplicable("no_interruption") },
    cleanup: { fixtureContractVersion: "1.0.0", resetContractVersion: "1.0.0", executedInFinally: true, sourceRestored: true, beforeDigest: digest, afterDigest: digest, artifactPath: "evidence/cleanup.json" },
    failure: notApplicable("result_passed"),
  };
  assert.equal(validate(result), true, JSON.stringify(validate.errors));
  const missingPayload = structuredClone(result); missingPayload.sourceChain = { applicability: "required" };
  assert.equal(validate(missingPayload), false);
  const failedCleanup = structuredClone(result); failedCleanup.cleanup.sourceRestored = false;
  assert.equal(validate(failedCleanup), false);
});
