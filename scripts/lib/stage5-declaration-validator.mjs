import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

export const APPROVED_IDS_BY_GROUP = Object.freeze({
  shared: Object.freeze(Array.from({ length: 11 }, (_, index) => `SH-${String(index + 1).padStart(2, "0")}`)),
  A02: Object.freeze(["A02-00", "A02-01", "A02-02", "A02-03", "A02-04", "A02-05", "A02-06", "A02-07", "A02-09"]),
  A03: Object.freeze(["A03-00", "A03-01", "A03-02", "A03-03", "A03-04", "A03-05"]),
  A05: Object.freeze(["A05-00", "A05-01", "A05-02", "A05-03", "A05-04", "A05-05", "A05-06", "A05-08"]),
});

export const EXCLUDED_IDS = Object.freeze(["A02-08", "A03-06", "A05-07"]);
const CHAIN_SECTIONS = Object.freeze(["identity", "laboratoryActions", "sourceChain", "readChain", "monitorChain", "visibleResult", "schedulingRecovery", "cleanup"]);
const EVIDENCE_KEYS = Object.freeze(["browser", "recovery", "scheduling", "technical"]);
const MANIFEST_KEYS = Object.freeze(["actionDefinitions", "chainSections", "excluded", "groupCounts", "manifestVersion", "requiredCount", "sourceActionContractVersion", "stage", "status", "tests"]);
const TEST_KEYS = Object.freeze(["evidence", "expected", "group", "id", "requiredActionIds", "title"]);
const ACTION_KEYS = new Set(["endpoint", "invocationPath", "kind", "name", "writerIdentity"]);
const APPROVED_IDS = Object.values(APPROVED_IDS_BY_GROUP).flat();
const APPROVED_ID_SET = new Set(APPROVED_IDS);
const EXCLUDED_ID_SET = new Set(EXCLUDED_IDS);

const sortedKeys = (value) => Object.keys(value).sort();
const sameArray = (left, right) => Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, index) => value === right[index]);
const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const push = (errors, condition, message) => { if (!condition) errors.push(message); };

export function validateStage5Manifest(manifest, sourceActionContract) {
  const errors = [];
  if (!isRecord(manifest)) return ["manifest must be an object"];
  push(errors, sameArray(sortedKeys(manifest), MANIFEST_KEYS), "manifest has missing or unknown top-level fields");
  push(errors, manifest.manifestVersion === "2.0.0", "manifestVersion must be 2.0.0");
  push(errors, manifest.stage === "phase6-stage5b", "stage must be phase6-stage5b");
  push(errors, manifest.status === "declaration_only", "status must remain declaration_only");
  push(errors, manifest.requiredCount === 34, "requiredCount must be 34");
  push(errors, manifest.sourceActionContractVersion === sourceActionContract?.contractVersion, "source-action contract version mismatch");
  push(errors, sameArray(manifest.chainSections, CHAIN_SECTIONS), "chainSections must contain the exact mandatory chain in order");

  const excluded = Array.isArray(manifest.excluded) ? manifest.excluded : [];
  push(errors, excluded.length === EXCLUDED_IDS.length, "excluded list must contain exactly three IDs");
  push(errors, sameArray(excluded.map((item) => item?.id), EXCLUDED_IDS), "excluded list does not match the approved exclusions");
  for (const item of excluded) {
    push(errors, isRecord(item) && sameArray(sortedKeys(item), ["id", "reason", "substitutionAllowed"]), `excluded declaration ${item?.id ?? "unknown"} is structurally invalid`);
    push(errors, nonEmpty(item?.reason), `excluded declaration ${item?.id ?? "unknown"} needs a reason`);
    push(errors, item?.substitutionAllowed === false, `excluded declaration ${item?.id ?? "unknown"} must prohibit substitution`);
  }

  const tests = Array.isArray(manifest.tests) ? manifest.tests : [];
  push(errors, tests.length === 34, "manifest must contain exactly 34 tests");
  const seen = new Set();
  for (const test of tests) {
    if (!isRecord(test)) { errors.push("test declaration must be an object"); continue; }
    const id = test.id;
    push(errors, sameArray(sortedKeys(test), TEST_KEYS), `test ${id ?? "unknown"} has missing or unknown fields`);
    push(errors, nonEmpty(id), "test ID must be non-empty");
    if (seen.has(id)) errors.push(`duplicate test ID: ${id}`);
    seen.add(id);
    if (EXCLUDED_ID_SET.has(id)) errors.push(`excluded test ID executed or substituted: ${id}`);
    else if (!APPROVED_ID_SET.has(id)) errors.push(`extra test ID: ${id}`);
    const approvedGroup = Object.entries(APPROVED_IDS_BY_GROUP).find(([, ids]) => ids.includes(id))?.[0];
    push(errors, test.group === approvedGroup, `test ${id} has invalid group ${test.group}`);
    push(errors, nonEmpty(test.title), `test ${id} needs a title`);
    push(errors, nonEmpty(test.expected), `test ${id} needs an expected outcome`);
    push(errors, Array.isArray(test.requiredActionIds) && test.requiredActionIds.length > 0, `test ${id} needs required actions`);
    push(errors, isRecord(test.evidence) && sameArray(sortedKeys(test.evidence), EVIDENCE_KEYS), `test ${id} must declare exactly four evidence dimensions`);
    if (isRecord(test.evidence)) for (const key of EVIDENCE_KEYS) push(errors, Array.isArray(test.evidence[key]) && test.evidence[key].every(nonEmpty), `test ${id} evidence.${key} must be an array of non-empty strings`);
  }
  for (const id of APPROVED_IDS) if (!seen.has(id)) errors.push(`missing approved test ID: ${id}`);

  const counts = isRecord(manifest.groupCounts) ? manifest.groupCounts : {};
  push(errors, sameArray(sortedKeys(counts), Object.keys(APPROVED_IDS_BY_GROUP).sort()), "groupCounts must contain exactly shared, A02, A03, and A05");
  for (const [group, ids] of Object.entries(APPROVED_IDS_BY_GROUP)) {
    push(errors, counts[group] === ids.length, `declared ${group} count must be ${ids.length}`);
    push(errors, tests.filter((test) => test?.group === group).length === ids.length, `actual ${group} count must be ${ids.length}`);
  }

  const definitions = isRecord(manifest.actionDefinitions) ? manifest.actionDefinitions : {};
  const referenced = new Set(tests.flatMap((test) => Array.isArray(test?.requiredActionIds) ? test.requiredActionIds : []));
  for (const actionId of referenced) {
    const definition = definitions[actionId];
    push(errors, isRecord(definition), `undefined required action: ${actionId}`);
    if (!isRecord(definition)) continue;
    push(errors, sortedKeys(definition).every((key) => ACTION_KEYS.has(key)), `action ${actionId} has unknown fields`);
    for (const key of ["name", "kind", "invocationPath", "endpoint"]) push(errors, nonEmpty(definition[key]), `action ${actionId} needs ${key}`);
    push(errors, ["human_and_automation", "automation_only"].includes(definition.invocationPath), `action ${actionId} has invalid invocationPath`);
    if (/^a\d{2}\./.test(actionId)) {
      push(errors, definition.kind === "source", `source action ${actionId} must have kind source`);
      push(errors, definition.writerIdentity === "alertas_fake", `source action ${actionId} must use alertas_fake`);
      push(errors, definition.endpoint === "POST /api/dev/source-actions", `source action ${actionId} must use the shared endpoint`);
      push(errors, definition.invocationPath === "human_and_automation", `source action ${actionId} must share the human/automation path`);
      push(errors, sourceActionContract?.actions?.some((action) => action.id === actionId), `source action ${actionId} is absent from the source-action contract`);
    }
  }
  for (const actionId of Object.keys(definitions)) if (!referenced.has(actionId)) errors.push(`unused action definition: ${actionId}`);
  return [...new Set(errors)];
}

export function compileStage5LedgerSchema(schema) {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  return ajv.compile(schema);
}

export function assertValidStage5Declarations(manifest, sourceActionContract, ledgerSchema) {
  const errors = validateStage5Manifest(manifest, sourceActionContract);
  if (errors.length > 0) throw new Error(`Invalid Stage 5 manifest:\n- ${errors.join("\n- ")}`);
  compileStage5LedgerSchema(ledgerSchema);
}
