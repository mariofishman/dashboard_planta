import { lstat } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { compileStage5LedgerSchema } from "./stage5-declaration-validator.mjs";
import { validateStage5CoreChain } from "./stage5-chain-capture.mjs";

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const artifactPaths = (result) => [
  ...(result.visibleResult?.applicability === "required" ? [
    ...(result.visibleResult.payload?.dashboardCardArtifacts ?? []),
    ...(result.visibleResult.payload?.chatListArtifacts ?? []),
    ...(result.visibleResult.payload?.chatDetailArtifacts ?? []),
  ] : []),
  ...(typeof result.cleanup?.artifactPath === "string" ? [result.cleanup.artifactPath] : []),
  ...(result.failure?.applicability === "required" ? result.failure.payload?.artifactPaths ?? [] : []),
];

async function artifactErrors(paths, root) {
  const errors = [];
  const normalizedRoot = resolve(root);
  for (const path of new Set(paths)) {
    const absolute = resolve(root, path);
    if (absolute !== normalizedRoot && !absolute.startsWith(`${normalizedRoot}${sep}`)) { errors.push(`artifact escapes root: ${path}`); continue; }
    try {
      const info = await lstat(absolute);
      if (!info.isFile() || info.isSymbolicLink()) errors.push(`artifact is not a regular file: ${path}`);
    } catch { errors.push(`artifact does not exist: ${path}`); }
  }
  return errors;
}

export async function validateStage5Result(result, { schema, manifest, artifactRoot }) {
  const errors = [];
  const validate = compileStage5LedgerSchema(schema);
  if (!validate(result)) errors.push(`result schema invalid: ${JSON.stringify(validate.errors)}`);
  if (!isRecord(result?.identity)) return [...new Set(errors.concat("result identity missing"))];
  const declaration = manifest.tests.find(({ id }) => id === result.identity.testId);
  if (!declaration) errors.push(`result ID is not approved: ${result.identity.testId}`);
  else {
    if (result.identity.group !== declaration.group) errors.push("result group mismatch");
    if (result.expectation?.declared !== declaration.expected) errors.push("declared outcome mismatch");
    if (result.expectation?.matched !== true) errors.push("observed outcome did not match declaration");
    const actionIds = result.laboratoryActions?.items?.map(({ actionId }) => actionId) ?? [];
    if (JSON.stringify(actionIds) !== JSON.stringify(declaration.requiredActionIds)) errors.push("laboratory action accounting mismatch");
    const definitions = declaration.requiredActionIds.map((id) => manifest.actionDefinitions[id]);
    if (definitions.some(({ kind }) => kind === "source") && result.sourceChain?.applicability !== "required") errors.push("source chain incorrectly marked not applicable");
    if (definitions.some(({ kind }) => kind === "scheduler") && (result.readChain?.applicability !== "required" || result.monitorChain?.applicability !== "required")) errors.push("scheduled read chain incorrectly marked not applicable");
    if (declaration.evidence.browser.length > 0 && result.visibleResult?.applicability !== "required") errors.push("browser evidence incorrectly marked not applicable");
    if (declaration.evidence.scheduling.length > 0 && result.schedulingRecovery?.scheduling?.applicability !== "required") errors.push("scheduling evidence incorrectly marked not applicable");
    if (declaration.evidence.recovery.length > 0 && result.schedulingRecovery?.recovery?.applicability !== "required") errors.push("recovery evidence incorrectly marked not applicable");
  }
  if (result.identity.manifestVersion !== manifest.manifestVersion) errors.push("result manifest version mismatch");
  if (result.identity.sourceActionContractVersion !== manifest.sourceActionContractVersion) errors.push("result source-action version mismatch");
  errors.push(...validateStage5CoreChain({ sections: {
    laboratoryActions: result.laboratoryActions, sourceChain: result.sourceChain,
    readChain: result.readChain, monitorChain: result.monitorChain,
  } }));
  if (result.cleanup?.sourceRestored !== true || result.cleanup?.beforeDigest !== result.cleanup?.afterDigest) errors.push("cleanup restoration evidence mismatch");
  if (result.identity.status === "passed" && result.failure?.applicability !== "not_applicable") errors.push("passed result contains failure evidence");
  if (result.identity.status !== "passed" && result.failure?.applicability !== "required") errors.push("non-passed result lacks failure evidence");
  errors.push(...await artifactErrors(artifactPaths(result), artifactRoot));
  return [...new Set(errors)];
}

export async function assertValidStage5Result(result, context) {
  const errors = await validateStage5Result(result, context);
  if (errors.length > 0) throw new Error(`Invalid Stage 5 result:\n- ${errors.join("\n- ")}`);
}

export async function validateStage5Ledger(ledger, context) {
  const errors = [];
  const keys = ["classification", "ledgerVersion", "manifestVersion", "results", "runId"];
  if (!isRecord(ledger) || JSON.stringify(Object.keys(ledger).sort()) !== JSON.stringify(keys)) return ["ledger shape invalid"];
  if (ledger.ledgerVersion !== "1.0.0") errors.push("ledger version mismatch");
  if (!['synthetic_dry_run', 'connected_acceptance'].includes(ledger.classification)) errors.push("ledger classification invalid");
  if (ledger.manifestVersion !== context.manifest.manifestVersion) errors.push("ledger manifest version mismatch");
  if (typeof ledger.runId !== "string" || ledger.runId.length === 0) errors.push("ledger run ID invalid");
  if (!Array.isArray(ledger.results)) return [...new Set(errors.concat("ledger results must be an array"))];
  const approved = new Set(context.manifest.tests.map(({ id }) => id));
  const excluded = new Set(context.manifest.excluded.map(({ id }) => id));
  const seen = new Set();
  for (const result of ledger.results) {
    const id = result?.identity?.testId;
    if (seen.has(id)) errors.push(`duplicate result ID: ${id}`);
    seen.add(id);
    if (excluded.has(id)) errors.push(`excluded result ID: ${id}`);
    else if (!approved.has(id)) errors.push(`extra result ID: ${id}`);
    if (result?.identity?.runId !== ledger.runId) errors.push(`result run mismatch: ${id}`);
    if (result?.identity?.status !== "passed") errors.push(`result is not passed: ${id}`);
    for (const error of await validateStage5Result(result, context)) errors.push(`${id}: ${error}`);
  }
  for (const test of context.manifest.tests) if (!seen.has(test.id)) errors.push(`missing result ID: ${test.id}`);
  if (ledger.results.length !== context.manifest.requiredCount) errors.push(`ledger result count must be ${context.manifest.requiredCount}`);
  for (const [group, count] of Object.entries(context.manifest.groupCounts)) {
    if (ledger.results.filter((result) => result?.identity?.group === group).length !== count) errors.push(`ledger group count mismatch: ${group}`);
  }
  return [...new Set(errors)];
}

export async function assertValidStage5Ledger(ledger, context) {
  const errors = await validateStage5Ledger(ledger, context);
  if (errors.length > 0) throw new Error(`Invalid Stage 5 ledger:\n- ${errors.join("\n- ")}`);
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}

function ledgerSummary(ledger) {
  return { ledgerVersion: ledger.ledgerVersion, classification: ledger.classification, runId: ledger.runId,
    manifestVersion: ledger.manifestVersion, required: ledger.results.length,
    results: ledger.results.map((result) => ({ testId: result.identity.testId, group: result.identity.group, status: result.identity.status,
      declared: result.expectation.declared, observed: result.expectation.observed, matched: result.expectation.matched })) };
}

const markdownCell = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll("|", "\\|").replaceAll(/\r?\n/g, " ");
const markdownTable = (summary) => ["| Test | Group | Status | Matched | Observed |", "| --- | --- | --- | --- | --- |",
  ...summary.results.map((result) => `| ${result.testId} | ${result.group} | ${result.status} | ${result.matched ? "yes" : "no"} | ${markdownCell(result.observed)} |`)].join("\n");

export async function renderStage5Ledger(ledger, context) {
  await assertValidStage5Ledger(ledger, context);
  const json = `${JSON.stringify(canonical(ledger), null, 2)}\n`;
  const summary = ledgerSummary(ledger);
  const markdown = ["# Stage 5 acceptance ledger", "", `- Classification: \`${summary.classification}\``, `- Run: \`${summary.runId}\``,
    `- Manifest: \`${summary.manifestVersion}\``, `- Results: ${summary.required}`, "", markdownTable(summary),
    "", "```stage5-ledger-summary", JSON.stringify(canonical(summary)), "```", ""].join("\n");
  assertStage5RendererParity(json, markdown);
  return { json, markdown };
}

export function assertStage5RendererParity(json, markdown) {
  let ledger;
  try { ledger = JSON.parse(json); } catch { throw new Error("rendered JSON is invalid"); }
  const match = /```stage5-ledger-summary\n([^\n]+)\n```/.exec(markdown);
  if (!match) throw new Error("Markdown summary is missing");
  let summary;
  try { summary = JSON.parse(match[1]); } catch { throw new Error("Markdown summary is invalid"); }
  const expected = ledgerSummary(ledger);
  if (JSON.stringify(canonical(summary)) !== JSON.stringify(canonical(expected)) || !markdown.includes(markdownTable(expected))) throw new Error("renderer divergence");
}
