import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { validateStep7AggregateEvidence } from "./lib/stage5-step7-evidence.mjs";

const [runId, evidenceDirectory, startedAt, resetExitCode, baselineBefore, restoreExitCode, baselineAfter] = process.argv.slice(2);
if (!runId || !evidenceDirectory || !startedAt) throw new Error("step7_aggregate_arguments_required");
const evidenceDir = resolve(evidenceDirectory);
const readJson = async (name) => JSON.parse(await readFile(resolve(evidenceDir, name), "utf8"));
const [scheduling, recovery, checksText, schema] = await Promise.all([
  readJson("scheduling.json"),
  readJson("recovery.json"),
  readFile(resolve(evidenceDir, "checks.tsv"), "utf8"),
  readJson("../../../../../config/detection/schemas/stage5-step7-evidence.v1.schema.json"),
]);
const checks = checksText.trim().split("\n").filter(Boolean).map((line) => {
  const [name, exitCode, log] = line.split("\t");
  return { name, exitCode: Number(exitCode), log };
});
const aggregate = {
  schemaVersion: "1.0.0",
  kind: "aggregate",
  gate: "phase6-stage5-step7",
  runId,
  startedAt,
  completedAt: new Date().toISOString(),
  accepted: true,
  scheduling,
  recovery,
  sourceRestoration: {
    resetExitCode: Number(resetExitCode),
    baselineBefore: baselineBefore === "true",
    restoreExitCode: Number(restoreExitCode),
    baselineAfter: baselineAfter === "true",
    cleanupExecutedInFinally: true,
    log: `local-data/test-database/evidence/stage5-step7/${runId}/restore.log`,
  },
  checks,
};
const semanticErrors = validateStep7AggregateEvidence(aggregate);
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateSchema = ajv.compile(schema);
if (!validateSchema(aggregate)) semanticErrors.push(...(validateSchema.errors ?? []).map((error) => `schema ${error.instancePath} ${error.message}`));
if (semanticErrors.length) throw new Error(`invalid_step7_aggregate_evidence: ${semanticErrors.join(" | ")}`);
await writeFile(resolve(evidenceDir, "evidence.json"), `${JSON.stringify(aggregate, null, 2)}\n`, { flag: "wx" });
console.log(`evidence=${resolve(evidenceDir, "evidence.json")}`);
