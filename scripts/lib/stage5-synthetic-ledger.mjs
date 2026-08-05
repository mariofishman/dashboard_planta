import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const digest = `sha256:${"a".repeat(64)}`;
const timestamp = "2026-08-01T12:00:00.000Z";
const notApplicable = (reason) => ({ applicability: "not_applicable", notApplicableReason: reason });

export async function buildSyntheticStage5Ledger(manifest, artifactRoot) {
  const results = [];
  for (const declaration of manifest.tests) {
    const evidenceDir = join(artifactRoot, "evidence", declaration.id);
    await mkdir(evidenceDir, { recursive: true });
    await Promise.all(["cleanup.json", "dashboard.json", "chat-list.json"].map((name) => writeFile(join(evidenceDir, name), "{}\n")));
    const actions = declaration.requiredActionIds.map((actionId, index) => {
      const definition = manifest.actionDefinitions[actionId];
      return { sequence: index + 1, actionId, actionName: definition.name, invocationPath: definition.invocationPath, endpoint: definition.endpoint,
        writerIdentity: definition.writerIdentity ?? "not_applicable", businessTime: timestamp, auditTime: timestamp };
    });
    const sourceActions = actions.filter(({ writerIdentity }) => writerIdentity === "alertas_fake");
    const scheduled = declaration.requiredActionIds.some((id) => manifest.actionDefinitions[id].kind === "scheduler");
    const cycleId = `cycle-${declaration.id}`;
    const sourceChain = sourceActions.length ? { applicability: "required", payload: { database: "test_database", writerIdentity: "alertas_fake", sourceRevision: "source-r1",
      unrelatedRowsDigestBefore: digest, unrelatedRowsDigestAfter: digest, mutations: sourceActions.map((action) => ({ actionId: action.actionId, actionSequence: action.sequence,
        naturalKey: `synthetic:${action.sequence}`, table: "synthetic_table", fields: ["state"], before: null, after: { state: "synthetic" }, beforeDigest: digest, afterDigest: digest })) } } : notApplicable("no_source_action");
    const readChain = scheduled ? { applicability: "required", payload: { adapterKind: "test_database", sourceAccount: "monitor_source_ro", queryId: `query-${declaration.id}`,
      queryVersion: "1.0.0", pages: [{ page: 1, rowCount: 1, revision: "source-r1" }], sourceRevision: "source-r1", pollCycleIds: [cycleId], completeness: "complete", freshness: "fresh" } } : notApplicable("no_poll");
    const monitorChain = scheduled ? { applicability: "required", payload: { outcome: "presence", pollCycleIds: [cycleId], incidentIds: [`incident-${declaration.id}`], evidenceIds: [`evidence-${declaration.id}`],
      routingDecisionIds: [`routing-${declaration.id}`], deliveryIds: [`delivery-${declaration.id}`], conversationIds: [`conversation-${declaration.id}`], messageIds: [`message-${declaration.id}`], receiptIds: [], cursorStart: 0, cursorEnd: 1 } } : notApplicable("no_monitor_observation");
    const path = (name) => `evidence/${declaration.id}/${name}`;
    results.push({ schemaVersion: "1.0.0", identity: { testId: declaration.id, group: declaration.group, status: "passed", experimentId: `experiment-${declaration.id}`, runId: "synthetic-run",
      manifestVersion: manifest.manifestVersion, sourceActionContractVersion: manifest.sourceActionContractVersion, startedAt: timestamp, completedAt: timestamp },
    expectation: { declared: declaration.expected, observed: `Synthetic observation for ${declaration.id}`, matched: true }, laboratoryActions: { applicability: "required", items: actions }, sourceChain, readChain, monitorChain,
    visibleResult: { applicability: "required", payload: { outcome: "absence", dashboardCardArtifacts: [path("dashboard.json")], chatListArtifacts: [path("chat-list.json")], chatDetailArtifacts: [], connectedIds: [] } },
    schedulingRecovery: {
      scheduling: declaration.evidence.scheduling.length ? { applicability: "required", events: [{ kind: "synthetic.event", businessTime: timestamp, auditTime: timestamp, pollCycleId: cycleId }] } : notApplicable("not_required"),
      recovery: declaration.evidence.recovery.length ? { applicability: "required", interruptionPoint: "synthetic", repairCycleId: cycleId, idempotencyAssertions: ["synthetic"] } : notApplicable("not_required"),
    }, cleanup: { fixtureContractVersion: "1.0.0", resetContractVersion: "1.0.0", executedInFinally: true, sourceRestored: true, beforeDigest: digest, afterDigest: digest, artifactPath: path("cleanup.json") }, failure: notApplicable("result_passed") });
  }
  return { ledgerVersion: "1.0.0", classification: "synthetic_dry_run", runId: "synthetic-run", manifestVersion: manifest.manifestVersion, results };
}
