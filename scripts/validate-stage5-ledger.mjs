import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderStage5Ledger } from "./lib/stage5-ledger.mjs";
import { buildSyntheticStage5Ledger } from "./lib/stage5-synthetic-ledger.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), "utf8"));
const [schema, manifest] = await Promise.all([
  readJson("config/detection/schemas/stage5-connected-ledger-result.v1.schema.json"),
  readJson("config/detection/stage5-connected-acceptance.v2.json"),
]);
const artifactRoot = await mkdtemp(join(tmpdir(), "stage5-ledger-dry-run-"));
const ledger = await buildSyntheticStage5Ledger(manifest, artifactRoot);
assert.equal(ledger.classification, "synthetic_dry_run");
const rendered = await renderStage5Ledger(ledger, { schema, manifest, artifactRoot });
assert.match(rendered.markdown, /Classification: `synthetic_dry_run`/);
console.log("Stage 5.4 ledger validator ready: 34-result synthetic dry run rendered with JSON/Markdown parity; no connected result was created.");
