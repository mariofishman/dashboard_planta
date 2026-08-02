import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { validateStage5BrowserEvidence } from "./lib/stage5-browser-evidence.mjs";

const execFile = promisify(execFileCallback);
const root = resolve(import.meta.dirname, "..");
assert.ok(process.env.STEP8_EVIDENCE_ROOT, "STEP8_EVIDENCE_ROOT is required");
const evidenceRoot = resolve(process.env.STEP8_EVIDENCE_ROOT);
const expectedEvidenceBase = resolve(root, "local-data/test-database/evidence/stage5-step8");
const evidenceRelation = relative(expectedEvidenceBase, evidenceRoot);
assert.ok(evidenceRelation && evidenceRelation !== ".." && !evidenceRelation.startsWith(`..${sep}`), "STEP8_EVIDENCE_ROOT must select one run below the Stage 5 Step 8 evidence root");
const aggregateRoot = resolve(evidenceRoot, "aggregate-gate");
await mkdir(aggregateRoot, { recursive: true });

const commands = [
  ["npm", ["run", "validate:phase6-stage5-browser-evidence"]],
  ["npm", ["run", "validate:phase6-stage5-browser-harness"]],
  ["node", ["scripts/validate-phase6-stage5-step8-adversarial.mjs"]],
  ["npm", ["test", "-w", "@monitor/contracts"]],
  ["npm", ["test", "-w", "@monitor/conversations"]],
  ["npm", ["test", "-w", "@monitor/api"]],
  ["npm", ["test", "-w", "@monitor/web"]],
  ["npm", ["run", "typecheck", "-w", "@monitor/contracts"]],
  ["npm", ["run", "typecheck", "-w", "@monitor/conversations"]],
  ["npm", ["run", "typecheck", "-w", "@monitor/api"]],
  ["npm", ["run", "typecheck", "-w", "@monitor/web"]],
  ["npm", ["run", "build", "-w", "@monitor/web"]],
  ["git", ["diff", "--check"]],
];

const run = async (name, command, args) => {
  try {
    const result = await execFile(command, args, { cwd: root, maxBuffer: 16 * 1024 * 1024 });
    await writeFile(resolve(aggregateRoot, `${name}.log`), `${result.stdout}${result.stderr}`);
  } catch (error) {
    const output = error && typeof error === "object" ? `${error.stdout ?? ""}${error.stderr ?? ""}` : String(error);
    await writeFile(resolve(aggregateRoot, `${name}.log`), output);
    throw error;
  }
};

let commandFailure;
try {
  for (const [index, [command, args]] of commands.entries()) await run(`command-${String(index + 1).padStart(2, "0")}`, command, args);
  const schema = JSON.parse(await readFile(resolve(root, "config/detection/schemas/stage5-browser-evidence.v1.schema.json"), "utf8"));
  const manifest = JSON.parse(await readFile(resolve(evidenceRoot, "manifest.json"), "utf8"));
  const errors = await validateStage5BrowserEvidence(manifest, { schema, artifactRoot: evidenceRoot, expectedIdentity: manifest.identity });
  assert.deepEqual(errors, []);
  await writeFile(resolve(aggregateRoot, "manifest-validation.json"), `${JSON.stringify({ accepted: true, checkedAt: new Date().toISOString(), identity: manifest.identity, artifacts: manifest.artifacts.length }, null, 2)}\n`);
} catch (error) {
  commandFailure = error;
} finally {
  try {
    await run("protected-source-health", resolve(root, "scripts/test-database-validate.sh"), ["health"]);
  } catch (healthError) {
    commandFailure = commandFailure ? new AggregateError([commandFailure, healthError], "aggregate gate and protected-source health failed") : healthError;
  }
}

if (commandFailure) throw commandFailure;
process.stdout.write(`${JSON.stringify({ accepted: true, evidenceRoot, aggregateRoot })}\n`);
