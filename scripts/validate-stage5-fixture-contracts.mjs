import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertValidStage5FixtureRegistry } from "./lib/stage5-fixture-contract-validator.mjs";
import { buildStage5FixturePlans } from "./lib/stage5-fixture-runner.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), "utf8"));
const [registry, schema, manifest, sourceActions, seeds] = await Promise.all([
  readJson("config/detection/fixtures/stage5-fixture-contracts.v1.json"),
  readJson("config/detection/schemas/stage5-fixture-registry.v1.schema.json"),
  readJson("config/detection/stage5-connected-acceptance.v2.json"),
  readJson("config/detection/source-actions/stage5-source-actions.v1.json"),
  readJson("config/detection/fixtures/test-database-stage5.v1.json"),
]);

assertValidStage5FixtureRegistry(registry, schema, manifest, sourceActions);
assert.equal(registry.contracts.length, 34, "fixture registry must contain exactly 34 contracts");
assert.deepEqual(
  registry.contracts.map(({ testId }) => testId).sort(),
  manifest.tests.map(({ id }) => id).sort(),
  "fixture registry IDs must exactly equal the approved manifest",
);
const plans = manifest.tests.flatMap(({ id }) => buildStage5FixturePlans(registry, id, "validation", seeds));
assert.equal(new Set(plans.map(({ isolationId }) => isolationId)).size, plans.length, "fixture isolation identities must be unique");
assert.ok(plans.every(({ cleanupProfile }) => cleanupProfile.restoreInFinally === true
  && cleanupProfile.verifySourceDigest === true
  && cleanupProfile.verifyUnrelatedRowsDigest === true
  && cleanupProfile.verifyMonitorIsolation === true
  && typeof cleanupProfile.artifactPathTemplate === "string"), "every fixture lane must use complete cleanup");

console.log(`Stage 5.2 fixture contracts valid: 34 independent contracts across ${plans.length} isolated execution lanes.`);
