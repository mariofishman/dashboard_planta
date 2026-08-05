import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { assertStage5RendererParity, renderStage5Ledger, validateStage5Ledger, validateStage5Result } from "./lib/stage5-ledger.mjs";
import { buildSyntheticStage5Ledger } from "./lib/stage5-synthetic-ledger.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), "utf8"));
const [schema, manifest] = await Promise.all([
  readJson("config/detection/schemas/stage5-connected-ledger-result.v1.schema.json"),
  readJson("config/detection/stage5-connected-acceptance.v2.json"),
]);
const digest = `sha256:${"a".repeat(64)}`;
const timestamp = "2026-08-01T12:00:00.000Z";
const notApplicable = (reason) => ({ applicability: "not_applicable", notApplicableReason: reason });

function validResult(artifactPath) {
  return {
    schemaVersion: "1.0.0",
    identity: { testId: "SH-01", group: "shared", status: "passed", experimentId: "exp-1", runId: "run-1", manifestVersion: "2.0.0", sourceActionContractVersion: "1.1.0", startedAt: timestamp, completedAt: timestamp },
    expectation: { declared: manifest.tests[0].expected, observed: "Experiment starts empty and prior history remains queryable.", matched: true },
    laboratoryActions: { applicability: "required", items: [{ sequence: 1, actionId: "experiment.create", actionName: "Create durable experiment", invocationPath: "human_and_automation", endpoint: "POST /api/dev/scenario-runtime", writerIdentity: "not_applicable", businessTime: timestamp, auditTime: timestamp }] },
    sourceChain: notApplicable("no_source_action"), readChain: notApplicable("no_poll"), monitorChain: notApplicable("no_monitor_observation"),
    visibleResult: { applicability: "required", payload: { outcome: "absence", dashboardCardArtifacts: ["evidence/dashboard.json"], chatListArtifacts: ["evidence/chat-list.json"], chatDetailArtifacts: [], connectedIds: [] } },
    schedulingRecovery: { scheduling: notApplicable("no_due_event"), recovery: notApplicable("no_interruption") },
    cleanup: { fixtureContractVersion: "1.0.0", resetContractVersion: "1.0.0", executedInFinally: true, sourceRestored: true, beforeDigest: digest, afterDigest: digest, artifactPath },
    failure: notApplicable("result_passed"),
  };
}

test("validates one schema-complete result and its real artifact", async () => {
  const artifactRoot = await mkdtemp(join(tmpdir(), "stage5-ledger-"));
  await mkdir(join(artifactRoot, "evidence"));
  await Promise.all(["cleanup.json", "dashboard.json", "chat-list.json"].map((name) => writeFile(join(artifactRoot, `evidence/${name}`), "{}\n")));
  assert.deepEqual(await validateStage5Result(validResult("evidence/cleanup.json"), { schema, manifest, artifactRoot }), []);
});

test("rejects schema, outcome, cleanup, and artifact failures", async () => {
  const artifactRoot = await mkdtemp(join(tmpdir(), "stage5-ledger-"));
  const result = validResult("missing.json");
  result.expectation.declared = "wrong";
  result.expectation.matched = false;
  result.cleanup.afterDigest = `sha256:${"b".repeat(64)}`;
  const errors = await validateStage5Result(result, { schema, manifest, artifactRoot });
  for (const fragment of ["declared outcome mismatch", "observed outcome did not match", "cleanup restoration evidence mismatch", "artifact does not exist"]) assert.ok(errors.some((error) => error.includes(fragment)), fragment);
});

test("rejects paths escaping the artifact root", async () => {
  const artifactRoot = await mkdtemp(join(tmpdir(), "stage5-ledger-"));
  const errors = await validateStage5Result(validResult("../outside.json"), { schema, manifest, artifactRoot });
  assert.ok(errors.some((error) => error.includes("artifact escapes root")));
});

test("accepts exact 34-result accounting and rejects missing, duplicate, extra, excluded, and non-passed results", async () => {
  const artifactRoot = await mkdtemp(join(tmpdir(), "stage5-ledger-"));
  const ledger = await buildSyntheticStage5Ledger(manifest, artifactRoot);
  assert.deepEqual(await validateStage5Ledger(ledger, { schema, manifest, artifactRoot }), []);
  const cases = [
    { fragment: "missing result ID", mutate: (value) => value.results.pop() },
    { fragment: "duplicate result ID", mutate: (value) => { value.results[33] = structuredClone(value.results[32]); } },
    { fragment: "extra result ID", mutate: (value) => { value.results[33].identity.testId = "A05-99"; } },
    { fragment: "excluded result ID", mutate: (value) => { value.results[33].identity.testId = "A05-07"; } },
    { fragment: "result is not passed", mutate: (value) => { value.results[0].identity.status = "skipped"; } },
    { fragment: "result is not passed", mutate: (value) => { value.results[0].identity.status = "failed"; } },
    { fragment: "result group mismatch", mutate: (value) => { value.results[0].identity.group = "A02"; } },
    { fragment: "result run mismatch", mutate: (value) => { value.results[0].identity.runId = "other-run"; } },
    { fragment: "missing chain section", mutate: (value) => { delete value.results[0].monitorChain; } },
  ];
  for (const { fragment, mutate } of cases) {
    const value = structuredClone(ledger); mutate(value);
    const errors = await validateStage5Ledger(value, { schema, manifest, artifactRoot });
    assert.ok(errors.some((error) => error.includes(fragment)), `${fragment}: ${errors.join(" | ")}`);
  }
});

test("renders deterministic JSON and readable Markdown with semantic parity", async () => {
  const artifactRoot = await mkdtemp(join(tmpdir(), "stage5-ledger-"));
  const ledger = await buildSyntheticStage5Ledger(manifest, artifactRoot);
  ledger.results[0].expectation.observed = "Safe | multiline\n<script>";
  const first = await renderStage5Ledger(ledger, { schema, manifest, artifactRoot });
  const second = await renderStage5Ledger(structuredClone(ledger), { schema, manifest, artifactRoot });
  assert.deepEqual(first, second);
  assert.match(first.markdown, /\| A02-00 \| A02 \| passed \| yes \|/);
  assert.match(first.markdown, /Safe \\| multiline &lt;script>/);
  assert.doesNotThrow(() => assertStage5RendererParity(first.json, first.markdown));
  const divergent = first.markdown.replace('"required":34', '"required":33');
  assert.throws(() => assertStage5RendererParity(first.json, divergent), /renderer divergence/);
  const tableDivergent = first.markdown.replace("| A02-00 |", "| A02-X | ");
  assert.throws(() => assertStage5RendererParity(first.json, tableDivergent), /renderer divergence/);
});
