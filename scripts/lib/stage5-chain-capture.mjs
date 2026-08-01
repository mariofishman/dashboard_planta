import { createHash } from "node:crypto";

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const TEST_ID = /^(SH-(?:0[1-9]|1[01])|A02-(?:0[0-7]|09)|A03-0[0-5]|A05-(?:0[0-6]|08))$/;
const ARTIFACT_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$)).+$/;
const ATTACHMENT_KINDS = new Set(["scheduling", "recovery", "browser", "human"]);

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value, keys) => isRecord(value) && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
const validTimestamp = (value) => typeof value === "string" && !Number.isNaN(Date.parse(value));
const clone = (value) => structuredClone(value);
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;

function validateIdentity(identity) {
  const keys = ["testId", "group", "experimentId", "runId", "manifestVersion", "sourceActionContractVersion", "startedAt"];
  if (!exactKeys(identity, keys)) throw new Error("invalid_chain_identity_shape");
  if (!TEST_ID.test(identity.testId) || !["shared", "A02", "A03", "A05"].includes(identity.group)) throw new Error("invalid_chain_test_identity");
  const expectedGroup = identity.testId.startsWith("SH-") ? "shared" : identity.testId.slice(0, 3);
  if (identity.group !== expectedGroup) throw new Error("chain_test_group_mismatch");
  for (const key of ["experimentId", "runId"]) if (!IDENTIFIER.test(identity[key])) throw new Error(`invalid_chain_identity:${key}`);
  for (const key of ["manifestVersion", "sourceActionContractVersion"]) if (typeof identity[key] !== "string" || identity[key].length === 0) throw new Error(`invalid_chain_identity:${key}`);
  if (!validTimestamp(identity.startedAt)) throw new Error("invalid_chain_identity:startedAt");
}

function validateAttachment(attachment, identity) {
  const keys = ["attachmentId", "kind", "identity", "artifactPaths", "payload"];
  if (!exactKeys(attachment, keys)) throw new Error("invalid_chain_attachment_shape");
  if (!IDENTIFIER.test(attachment.attachmentId) || !ATTACHMENT_KINDS.has(attachment.kind)) throw new Error("invalid_chain_attachment_identity");
  if (!exactKeys(attachment.identity, ["testId", "runId", "experimentId"])) throw new Error("invalid_chain_attachment_identity_shape");
  for (const key of ["testId", "runId", "experimentId"]) if (attachment.identity[key] !== identity[key]) throw new Error(`chain_attachment_identity_mismatch:${key}`);
  if (!Array.isArray(attachment.artifactPaths) || attachment.artifactPaths.length === 0
    || new Set(attachment.artifactPaths).size !== attachment.artifactPaths.length
    || attachment.artifactPaths.some((path) => typeof path !== "string" || !ARTIFACT_PATH.test(path))) throw new Error("invalid_chain_attachment_artifacts");
  if (!isRecord(attachment.payload)) throw new Error("invalid_chain_attachment_payload");
}

export class Stage5ChainCapture {
  #identity;
  #sections = new Map();
  #attachments = new Map();

  constructor(identity) {
    validateIdentity(identity);
    this.#identity = clone(identity);
  }

  get identity() { return clone(this.#identity); }

  recordSection(name, payload) {
    if (!["laboratoryActions", "sourceChain", "readChain", "monitorChain"].includes(name)) throw new Error(`unsupported_chain_section:${name}`);
    if (this.#sections.has(name)) throw new Error(`duplicate_chain_section:${name}`);
    if (!isRecord(payload)) throw new Error(`invalid_chain_section:${name}`);
    this.#sections.set(name, clone(payload));
    return this;
  }

  attach(attachment) {
    validateAttachment(attachment, this.#identity);
    if (this.#attachments.has(attachment.attachmentId)) throw new Error(`duplicate_chain_attachment:${attachment.attachmentId}`);
    this.#attachments.set(attachment.attachmentId, clone(attachment));
    return this;
  }

  snapshot() {
    return clone({
      identity: this.#identity,
      sections: Object.fromEntries(this.#sections),
      attachments: [...this.#attachments.values()],
    });
  }
}

export function createStage5ChainCapture(identity) {
  return new Stage5ChainCapture(identity);
}

export function captureStage5LaboratoryActions(requiredActionIds, actionDefinitions, executions) {
  if (!Array.isArray(requiredActionIds) || !Array.isArray(executions) || requiredActionIds.length !== executions.length) throw new Error("laboratory_action_count_mismatch");
  const items = executions.map((execution, index) => {
    const actionId = requiredActionIds[index];
    const definition = actionDefinitions?.[actionId];
    if (!isRecord(definition) || execution?.actionId !== actionId || execution.sequence !== index + 1) throw new Error(`laboratory_action_order_mismatch:${index + 1}`);
    if (!validTimestamp(execution.businessTime) || !validTimestamp(execution.auditTime)) throw new Error(`laboratory_action_time_invalid:${actionId}`);
    return {
      sequence: execution.sequence, actionId, actionName: definition.name, invocationPath: definition.invocationPath,
      endpoint: definition.endpoint, writerIdentity: definition.writerIdentity ?? "not_applicable",
      businessTime: execution.businessTime, auditTime: execution.auditTime,
    };
  });
  return { applicability: "required", items };
}

export function captureStage5SourceChain(sourceExecutions, chainEvidence) {
  if (!Array.isArray(sourceExecutions) || sourceExecutions.length === 0) throw new Error("source_execution_required");
  if (!isRecord(chainEvidence) || typeof chainEvidence.finalSourceRevision !== "string" || chainEvidence.finalSourceRevision.length === 0
    || !isRecord(chainEvidence.unrelatedRows) || !/^[a-f0-9]{64}$/.test(chainEvidence.unrelatedRows.before)
    || !/^[a-f0-9]{64}$/.test(chainEvidence.unrelatedRows.after)) throw new Error("invalid_source_chain_evidence");
  if (chainEvidence.unrelatedRows.before !== chainEvidence.unrelatedRows.after) throw new Error("chain_unrelated_source_rows_changed");
  const mutations = [];
  for (let executionIndex = 0; executionIndex < sourceExecutions.length; executionIndex += 1) {
    const execution = sourceExecutions[executionIndex];
    if (execution?.writerIdentity !== "alertas_fake" || execution.sourceDiff?.writerIdentity !== "alertas_fake") throw new Error("source_writer_identity_mismatch");
    if (typeof execution.sourceRevision !== "string" || execution.sourceRevision.length === 0) throw new Error("source_revision_missing");
    const unrelated = execution.sourceDiff?.unrelatedRows;
    if (!unrelated || unrelated.before?.digest !== unrelated.after?.digest) throw new Error("unrelated_source_rows_changed");
    const before = new Map((execution.sourceDiff.before ?? []).map((record) => [`${record.table}:${record.key}`, record]));
    const after = new Map((execution.sourceDiff.after ?? []).map((record) => [`${record.table}:${record.key}`, record]));
    const changed = new Map();
    for (const change of execution.sourceDiff.changes ?? []) {
      const key = `${change.table}:${change.key}`;
      const fields = changed.get(key) ?? new Set(); fields.add(change.field); changed.set(key, fields);
    }
    if (changed.size === 0) throw new Error(`source_action_has_no_changes:${execution.actionId}`);
    for (const [key, fields] of changed) {
      const prior = before.get(key) ?? null;
      const next = after.get(key) ?? null;
      const [table, naturalValue] = key.split(":");
      mutations.push({
        actionId: execution.actionId, actionSequence: execution.actionSequence,
        naturalKey: `${execution.naturalKey.field}:${naturalValue}`, table, fields: [...fields].sort(),
        before: prior, after: next, beforeDigest: digest(prior), afterDigest: digest(next),
      });
    }
  }
  if (sourceExecutions.at(-1).sourceRevision !== chainEvidence.finalSourceRevision) throw new Error("source_revision_mismatch");
  return {
    applicability: "required",
    payload: {
      database: "test_database", writerIdentity: "alertas_fake", mutations,
      unrelatedRowsDigestBefore: `sha256:${chainEvidence.unrelatedRows.before}`, unrelatedRowsDigestAfter: `sha256:${chainEvidence.unrelatedRows.after}`,
      sourceRevision: chainEvidence.finalSourceRevision,
    },
  };
}

export function validateStage5CoreChain(snapshot) {
  if (!isRecord(snapshot) || !isRecord(snapshot.sections)) return ["chain snapshot is invalid"];
  const errors = [];
  for (const section of ["laboratoryActions", "sourceChain", "readChain", "monitorChain"]) if (!isRecord(snapshot.sections[section])) errors.push(`missing chain section: ${section}`);
  if (errors.length > 0) return errors;
  const actions = snapshot.sections.laboratoryActions.items ?? [];
  const source = snapshot.sections.sourceChain;
  const read = snapshot.sections.readChain;
  const monitor = snapshot.sections.monitorChain;
  if (source.applicability === "required") {
    const sourceActions = actions.filter(({ writerIdentity }) => writerIdentity === "alertas_fake");
    const mutations = source.payload?.mutations ?? [];
    for (const action of sourceActions) if (!mutations.some((mutation) => mutation.actionSequence === action.sequence && mutation.actionId === action.actionId)) errors.push(`source action lacks mutation evidence: ${action.sequence}:${action.actionId}`);
    for (const mutation of mutations) if (!sourceActions.some((action) => action.sequence === mutation.actionSequence && action.actionId === mutation.actionId)) errors.push(`source mutation lacks matching action: ${mutation.actionSequence}:${mutation.actionId}`);
  }
  if (source.applicability === "required" && read.applicability === "required" && source.payload.sourceRevision !== read.payload.sourceRevision) errors.push("source/read revision mismatch");
  if (read.applicability === "required" && monitor.applicability === "required") {
    const readCycles = new Set(read.payload.pollCycleIds);
    for (const cycleId of monitor.payload.pollCycleIds) if (!readCycles.has(cycleId)) errors.push(`Monitor references an unrecorded poll cycle: ${cycleId}`);
    if (monitor.payload.outcome === "presence" && (read.payload.completeness !== "complete" || read.payload.freshness !== "fresh")) errors.push("Monitor presence came from an untrustworthy read");
  }
  return [...new Set(errors)];
}

export function assertValidStage5CoreChain(snapshot) {
  const errors = validateStage5CoreChain(snapshot);
  if (errors.length > 0) throw new Error(`Invalid Stage 5 core chain:\n- ${errors.join("\n- ")}`);
}

export function captureStage5ReadChain(query, cycles) {
  if (!isRecord(query) || query.adapterKind !== "test_database" || typeof query.queryId !== "string" || typeof query.queryVersion !== "string") throw new Error("invalid_read_query_identity");
  if (!Array.isArray(cycles) || cycles.length === 0) throw new Error("poll_cycle_required");
  const pages = [];
  let revision = null;
  for (const cycle of cycles) {
    if (cycle.queryId !== query.queryId || cycle.queryVersion !== query.queryVersion) throw new Error("poll_query_identity_mismatch");
    if (cycle.sourceAccount !== "monitor_source_ro") throw new Error("poll_source_account_mismatch");
    if (!IDENTIFIER.test(cycle.cycleId) || !Array.isArray(cycle.pages) || cycle.pages.length === 0) throw new Error("invalid_poll_cycle_evidence");
    let cycleRevision = null;
    for (let index = 0; index < cycle.pages.length; index += 1) {
      const page = cycle.pages[index];
      if (!Number.isInteger(page.page) || page.page !== index + 1 || !Number.isInteger(page.rowCount) || page.rowCount < 0 || typeof page.revision !== "string") throw new Error("invalid_poll_page_evidence");
      if (cycleRevision !== null && page.revision !== cycleRevision) throw new Error("poll_source_revision_drift");
      cycleRevision = page.revision; pages.push({ page: page.page, rowCount: page.rowCount, revision: page.revision });
    }
    revision = cycleRevision;
  }
  const final = cycles.at(-1);
  const completeness = final.completeness;
  const freshness = final.freshness;
  if (!["complete", "incomplete", "invalid_shape", "partial_pagination", "duplicate_keys", "revision_drift", "timeout", "transport_error", "overlap_rejected"].includes(completeness)) throw new Error("invalid_poll_completeness");
  if (!["fresh", "stale", "unknown"].includes(freshness)) throw new Error("invalid_poll_freshness");
  return { applicability: "required", payload: {
    adapterKind: "test_database", sourceAccount: "monitor_source_ro", queryId: query.queryId, queryVersion: query.queryVersion,
    pages, sourceRevision: revision, pollCycleIds: cycles.map(({ cycleId }) => cycleId), completeness, freshness,
  } };
}

const MONITOR_ID_FIELDS = ["incidentIds", "evidenceIds", "routingDecisionIds", "deliveryIds", "conversationIds", "messageIds", "receiptIds"];
export function captureStage5MonitorChain(observation) {
  if (!isRecord(observation) || !["presence", "absence", "history"].includes(observation.outcome)) throw new Error("invalid_monitor_outcome");
  const payload = { outcome: observation.outcome };
  if (!Array.isArray(observation.pollCycleIds) || observation.pollCycleIds.length === 0 || new Set(observation.pollCycleIds).size !== observation.pollCycleIds.length
    || observation.pollCycleIds.some((value) => !IDENTIFIER.test(value))) throw new Error("invalid_monitor_poll_cycles");
  payload.pollCycleIds = [...observation.pollCycleIds];
  for (const field of MONITOR_ID_FIELDS) {
    const values = observation[field];
    if (!Array.isArray(values) || new Set(values).size !== values.length || values.some((value) => !IDENTIFIER.test(value))) throw new Error(`invalid_monitor_ids:${field}`);
    payload[field] = [...values];
  }
  if (!Number.isInteger(observation.cursorStart) || !Number.isInteger(observation.cursorEnd) || observation.cursorStart < 0 || observation.cursorEnd < observation.cursorStart) throw new Error("invalid_monitor_cursor_range");
  payload.cursorStart = observation.cursorStart; payload.cursorEnd = observation.cursorEnd;
  if (observation.outcome === "presence" && MONITOR_ID_FIELDS.slice(0, 6).some((field) => payload[field].length === 0)) throw new Error("incomplete_monitor_presence_chain");
  if (observation.outcome === "absence" && MONITOR_ID_FIELDS.some((field) => payload[field].length > 0)) throw new Error("contradictory_monitor_absence_chain");
  if (observation.outcome === "presence" && observation.cursorEnd === observation.cursorStart) throw new Error("monitor_presence_without_committed_cursor");
  return { applicability: "required", payload };
}
