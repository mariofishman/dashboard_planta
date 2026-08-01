import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertValidStage5FixtureRegistry, compileStage5FixtureRegistrySchema, fixtureRegistrySemanticErrors } from "./lib/stage5-fixture-contract-validator.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), "utf8"));
const schema = await readJson("config/detection/schemas/stage5-fixture-registry.v1.schema.json");
const manifest = await readJson("config/detection/stage5-connected-acceptance.v2.json");
const sourceActions = await readJson("config/detection/source-actions/stage5-source-actions.v1.json");
const cleanup = {
  strategy: "snapshot_replay", baselineScope: "natural_keys_created_descendants_and_unrelated_digest", digestAlgorithm: "sha256_full_rows",
  restoreInFinally: true, verifySourceDigest: true, verifyUnrelatedRowsDigest: true, verifyMonitorIsolation: true,
  artifactPathTemplate: "local-data/test-database/evidence/stage5/{runId}/{testId}/cleanup.json",
};
const experiment = {
  businessTime: "2026-08-01T09:00:00.000Z", speed: 1, frequencies: { A02: 3, A03: 3, A05: 3 },
  runIdTemplate: "{runId}:{testId}", experimentNameTemplate: "Stage 5 {runId} {testId}", experimentIdentity: "unique_per_test", monitorIsolation: "fresh_per_test",
};
const validRegistry = {
  registryVersion: "1.0.0", manifestVersion: "2.0.0", sourceActionContractVersion: "1.0.0", fixtureVersion: "1.0.0",
  sourceRevision: "staging_emusa_core-20260723-025548", writerIdentity: "alertas_fake",
  profiles: { isolated_per_test: experiment, restore_verified: cleanup },
  contracts: [{
    testId: "SH-01", group: "shared", fixtureIdentity: { contractId: "stage5:SH-01", fixtureVersion: "1.0.0", sourceRevision: "staging_emusa_core-20260723-025548" },
    dependencyTestIds: [], source: { applicability: "not_applicable", notApplicableReason: "experiment identity only" },
    actions: [{ sequence: 1, actionId: "experiment.create", keyRefs: [], parameters: {} }], experimentProfile: "isolated_per_test", cleanupProfile: "restore_verified",
  }],
};

test("strictly compiles the fixture registry schema and accepts a coherent contract", () => {
  assert.equal(typeof compileStage5FixtureRegistrySchema(schema), "function");
  assert.doesNotThrow(() => assertValidStage5FixtureRegistry(validRegistry, schema, manifest, sourceActions));
});

test("rejects cross-test dependencies and missing cleanup guarantees", () => {
  const invalid = structuredClone(validRegistry);
  invalid.contracts[0].dependencyTestIds = ["SH-02"];
  invalid.profiles.restore_verified.restoreInFinally = false;
  const validate = compileStage5FixtureRegistrySchema(schema);
  assert.equal(validate(invalid), false);
});

test("accepts produced natural keys but rejects an undefined producing action", () => {
  const valid = structuredClone(validRegistry);
  valid.contracts[0].testId = "SH-07";
  valid.contracts[0].fixtureIdentity.contractId = "stage5:SH-07";
  valid.contracts[0].source = {
    applicability: "required",
    naturalKeys: [{ ref: "movement", ruleCode: "A02", field: "materialFlowDetailId", producedByActionSequence: 1 }],
    startingState: [{ keyRef: "movement", path: "state", operator: "not_exists", expected: true }],
    allowedMutations: [
      { type: "source_action_contract", contractId: "a02.prepare_dispatch", keyRefs: ["movement"] },
      { type: "source_action_contract", contractId: "a02.receive", keyRefs: ["movement"] }
    ],
  };
  valid.contracts[0].actions = manifest.tests.find((entry) => entry.id === "SH-07").requiredActionIds.map((actionId, index) => ({ sequence: index + 1, actionId, keyRefs: actionId.startsWith("a02.") ? ["movement"] : [], parameters: {} }));
  assert.deepEqual(fixtureRegistrySemanticErrors(valid, manifest, sourceActions), []);
  valid.contracts[0].source.naturalKeys[0].producedByActionSequence = 99;
  assert.ok(fixtureRegistrySemanticErrors(valid, manifest, sourceActions).some((error) => error.includes("undefined action sequence")));
});

test("rejects action-order drift and undefined key references", () => {
  const invalid = structuredClone(validRegistry);
  invalid.contracts[0].actions[0].actionId = "experiment.pause";
  invalid.contracts[0].actions[0].keyRefs = ["missing"];
  const errors = fixtureRegistrySemanticErrors(invalid, manifest, sourceActions);
  assert.ok(errors.some((error) => error.includes("action order mismatch")));
  assert.ok(errors.some((error) => error.includes("key ref is undefined")));
});

test("rejects hidden SQL and cross-test dependency parameters", () => {
  const invalid = structuredClone(validRegistry);
  invalid.contracts[0].actions[0].parameters = { sql: "UPDATE source", previousTestId: "SH-02" };
  const validate = compileStage5FixtureRegistrySchema(schema);
  assert.equal(validate(invalid), false);
});
