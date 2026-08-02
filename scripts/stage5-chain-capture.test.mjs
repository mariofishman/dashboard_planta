import assert from "node:assert/strict";
import { test } from "node:test";
import { assertValidStage5CoreChain, captureStage5LaboratoryActions, captureStage5MonitorChain, captureStage5ReadChain, captureStage5SourceChain, createStage5ChainCapture, validateStage5CoreChain } from "./lib/stage5-chain-capture.mjs";

const identity = Object.freeze({
  testId: "A02-01", group: "A02", experimentId: "experiment-1", runId: "run-1",
  manifestVersion: "2.0.0", sourceActionContractVersion: "1.1.0", startedAt: "2026-08-01T12:00:00.000Z",
});
const attachment = (overrides = {}) => ({
  attachmentId: "browser-1", kind: "browser",
  identity: { testId: identity.testId, runId: identity.runId, experimentId: identity.experimentId },
  artifactPaths: ["local-data/test-database/evidence/stage5/run-1/A02-01/dashboard.png"],
  payload: { viewport: 1440 }, ...overrides,
});

test("creates an immutable chain draft and records each core section once", () => {
  const capture = createStage5ChainCapture(identity).recordSection("sourceChain", { sourceRevision: "revision-1" });
  const snapshot = capture.snapshot();
  snapshot.identity.runId = "tampered";
  snapshot.sections.sourceChain.sourceRevision = "tampered";
  assert.equal(capture.identity.runId, "run-1");
  assert.equal(capture.snapshot().sections.sourceChain.sourceRevision, "revision-1");
  assert.throws(() => capture.recordSection("sourceChain", {}), /duplicate_chain_section/);
  assert.throws(() => capture.recordSection("visibleResult", {}), /unsupported_chain_section/);
});

test("attaches later evidence only with exact run, test, and experiment identity", () => {
  const capture = createStage5ChainCapture(identity).attach(attachment());
  assert.equal(capture.snapshot().attachments.length, 1);
  for (const key of ["testId", "runId", "experimentId"]) {
    assert.throws(() => createStage5ChainCapture(identity).attach(attachment({ attachmentId: `bad-${key}`, identity: { ...attachment().identity, [key]: "wrong" } })), new RegExp(`chain_attachment_identity_mismatch:${key}`));
  }
});

test("rejects unknown attachment kinds, unsafe artifacts, duplicates, and unknown fields", () => {
  assert.throws(() => createStage5ChainCapture(identity).attach(attachment({ kind: "technical" })), /invalid_chain_attachment_identity/);
  assert.throws(() => createStage5ChainCapture(identity).attach(attachment({ artifactPaths: ["../outside.json"] })), /invalid_chain_attachment_artifacts/);
  assert.throws(() => createStage5ChainCapture(identity).attach({ ...attachment(), unexpected: true }), /invalid_chain_attachment_shape/);
  const capture = createStage5ChainCapture(identity).attach(attachment());
  assert.throws(() => capture.attach(attachment()), /duplicate_chain_attachment/);
});

test("rejects malformed chain identity rather than accepting partial identity", () => {
  assert.throws(() => createStage5ChainCapture({ ...identity, testId: "A02-08" }), /invalid_chain_test_identity/);
  assert.throws(() => createStage5ChainCapture({ ...identity, group: "shared" }), /chain_test_group_mismatch/);
  const partial = { ...identity }; delete partial.experimentId;
  assert.throws(() => createStage5ChainCapture(partial), /invalid_chain_identity_shape/);
});

const sourceExecution = () => ({
  actionId: "a02.receive", actionSequence: 1, writerIdentity: "alertas_fake", sourceRevision: "source-r2",
  naturalKey: { field: "materialFlowDetailId", value: 42 },
  sourceDiff: {
    writerIdentity: "alertas_fake",
    before: [{ table: "flujo_materiales_detalles", key: 42, values: { estado: "TRANSITO" } }],
    after: [{ table: "flujo_materiales_detalles", key: 42, values: { estado: "RECIBIDO" } }],
    changes: [{ table: "flujo_materiales_detalles", key: 42, field: "estado", before: "TRANSITO", after: "RECIBIDO" }],
    unrelatedRows: { before: { digest: "a".repeat(64) }, after: { digest: "a".repeat(64) } },
  },
});
const chainEvidence = () => ({ finalSourceRevision: "source-r2", unrelatedRows: { before: "a".repeat(64), after: "a".repeat(64) } });

test("captures ordered laboratory actions from approved definitions", () => {
  const captured = captureStage5LaboratoryActions(["a02.receive"], {
    "a02.receive": { name: "Receive", invocationPath: "human_and_automation", endpoint: "POST /api/dev/source-actions", writerIdentity: "alertas_fake" },
  }, [{ sequence: 1, actionId: "a02.receive", businessTime: "2026-08-01T12:00:00.000Z", auditTime: "2026-08-01T12:00:01.000Z" }]);
  assert.equal(captured.items[0].writerIdentity, "alertas_fake");
  assert.throws(() => captureStage5LaboratoryActions(["a02.receive"], {}, []), /laboratory_action_count_mismatch/);
});

test("captures authoritative source mutations and stable unrelated-row evidence", () => {
  const captured = captureStage5SourceChain([sourceExecution()], chainEvidence());
  assert.equal(captured.payload.mutations[0].naturalKey, "materialFlowDetailId:42");
  assert.equal(captured.payload.unrelatedRowsDigestBefore, `sha256:${"a".repeat(64)}`);
  assert.match(captured.payload.mutations[0].beforeDigest, /^sha256:[a-f0-9]{64}$/);
});

test("rejects source writer, revision, unrelated-row, and empty-diff contradictions", () => {
  assert.throws(() => captureStage5SourceChain([{ ...sourceExecution(), writerIdentity: "monitor_source_ro" }], chainEvidence()), /source_writer_identity_mismatch/);
  assert.throws(() => captureStage5SourceChain([sourceExecution()], { ...chainEvidence(), finalSourceRevision: "wrong" }), /source_revision_mismatch/);
  const unrelated = sourceExecution(); unrelated.sourceDiff.unrelatedRows.after.digest = "b".repeat(64);
  assert.throws(() => captureStage5SourceChain([unrelated], chainEvidence()), /unrelated_source_rows_changed/);
  const chainDrift = chainEvidence(); chainDrift.unrelatedRows.after = "b".repeat(64);
  assert.throws(() => captureStage5SourceChain([sourceExecution()], chainDrift), /chain_unrelated_source_rows_changed/);
  const empty = sourceExecution(); empty.sourceDiff.changes = [];
  assert.throws(() => captureStage5SourceChain([empty], chainEvidence()), /source_action_has_no_changes/);
});

test("captures authoritative read and poll provenance", () => {
  const captured = captureStage5ReadChain({ adapterKind: "test_database", queryId: "a02-runtime", queryVersion: "1.1.0" }, [{
    cycleId: "cycle-1", queryId: "a02-runtime", queryVersion: "1.1.0", sourceAccount: "monitor_source_ro",
    pages: [{ page: 1, rowCount: 2, revision: "source-r2" }], completeness: "complete", freshness: "fresh",
  }]);
  assert.equal(captured.payload.pollCycleIds[0], "cycle-1");
  assert.equal(captured.payload.sourceRevision, "source-r2");
});

test("rejects read authority, query, page, and revision contradictions", () => {
  const query = { adapterKind: "test_database", queryId: "a02-runtime", queryVersion: "1.1.0" };
  const cycle = { cycleId: "cycle-1", queryId: "a02-runtime", queryVersion: "1.1.0", sourceAccount: "monitor_source_ro", pages: [{ page: 1, rowCount: 1, revision: "r1" }], completeness: "complete", freshness: "fresh" };
  assert.throws(() => captureStage5ReadChain(query, [{ ...cycle, sourceAccount: "alertas_fake" }]), /poll_source_account_mismatch/);
  assert.throws(() => captureStage5ReadChain(query, [{ ...cycle, queryVersion: "wrong" }]), /poll_query_identity_mismatch/);
  assert.throws(() => captureStage5ReadChain(query, [{ ...cycle, pages: [{ ...cycle.pages[0], page: 2 }] }]), /invalid_poll_page_evidence/);
  assert.throws(() => captureStage5ReadChain(query, [{ ...cycle, pages: [cycle.pages[0], { page: 2, rowCount: 1, revision: "r2" }] }]), /poll_source_revision_drift/);
});

const monitorObservation = (outcome = "presence") => ({ outcome,
  pollCycleIds: ["cycle-1"],
  incidentIds: ["incident-1"], evidenceIds: ["evidence-1"], routingDecisionIds: ["routing-1"], deliveryIds: ["delivery-1"],
  conversationIds: ["conversation-1"], messageIds: ["message-1"], receiptIds: [], cursorStart: 0, cursorEnd: 1,
});

test("captures a complete authoritative Monitor downstream chain", () => {
  const captured = captureStage5MonitorChain(monitorObservation());
  assert.equal(captured.payload.incidentIds[0], "incident-1");
  assert.equal(captured.payload.cursorEnd, 1);
});

test("rejects incomplete presence, contradictory absence, duplicate IDs, and invalid cursors", () => {
  assert.throws(() => captureStage5MonitorChain({ ...monitorObservation(), messageIds: [] }), /incomplete_monitor_presence_chain/);
  assert.throws(() => captureStage5MonitorChain({ ...monitorObservation("absence"), cursorEnd: 0 }), /contradictory_monitor_absence_chain/);
  assert.throws(() => captureStage5MonitorChain({ ...monitorObservation(), incidentIds: ["incident-1", "incident-1"] }), /invalid_monitor_ids/);
  assert.throws(() => captureStage5MonitorChain({ ...monitorObservation(), cursorStart: 2, cursorEnd: 1 }), /invalid_monitor_cursor_range/);
});

function completeCoreCapture() {
  const capture = createStage5ChainCapture(identity);
  capture.recordSection("laboratoryActions", captureStage5LaboratoryActions(["a02.receive"], {
    "a02.receive": { name: "Receive", invocationPath: "human_and_automation", endpoint: "POST /api/dev/source-actions", writerIdentity: "alertas_fake" },
  }, [{ sequence: 1, actionId: "a02.receive", businessTime: identity.startedAt, auditTime: identity.startedAt }]));
  capture.recordSection("sourceChain", captureStage5SourceChain([sourceExecution()], chainEvidence()));
  capture.recordSection("readChain", captureStage5ReadChain({ adapterKind: "test_database", queryId: "a02-runtime", queryVersion: "1.1.0" }, [{ cycleId: "cycle-1", queryId: "a02-runtime", queryVersion: "1.1.0", sourceAccount: "monitor_source_ro", pages: [{ page: 1, rowCount: 1, revision: "source-r2" }], completeness: "complete", freshness: "fresh" }]));
  capture.recordSection("monitorChain", captureStage5MonitorChain(monitorObservation()));
  return capture;
}

test("cross-validates the complete action-to-Monitor custody chain", () => {
  assert.doesNotThrow(() => assertValidStage5CoreChain(completeCoreCapture().snapshot()));
});

test("fails closed on missing sections, action, revision, poll-cycle, and trustworthy-read contradictions", () => {
  assert.ok(validateStage5CoreChain(createStage5ChainCapture(identity).snapshot()).some((error) => error.includes("missing chain section")));
  for (const mutate of [
    (value) => { value.sections.sourceChain.payload.mutations[0].actionId = "a02.reject"; },
    (value) => { value.sections.readChain.payload.sourceRevision = "wrong"; },
    (value) => { value.sections.monitorChain.payload.pollCycleIds = ["cycle-missing"]; },
    (value) => { value.sections.readChain.payload.completeness = "partial_pagination"; },
  ]) {
    const value = completeCoreCapture().snapshot(); mutate(value);
    assert.ok(validateStage5CoreChain(value).length > 0);
  }
});
