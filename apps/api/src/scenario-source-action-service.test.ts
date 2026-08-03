import assert from "node:assert/strict";
import type { Principal } from "@monitor/contracts";
import { loadSourceActionContracts, type ScenarioSource, type ScenarioSourceAction, type ScenarioSourceActionInput, type ScenarioStatus, type SourceActionContract, type SourceActionEvidence } from "@monitor/detection";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { ScenarioSourceActionError, ScenarioSourceActionService } from "./scenario-source-action-service.js";

const root = resolve(import.meta.dirname, "../../..");
const admin: Principal = {
  sysUserId: 9001, displayName: "Admin", role: "FACTORY_MANAGER", plantIds: [1],
  scopes: ["monitor:read", "monitor:admin"], operationAuthorizations: [],
};
const operator: Principal = { ...admin, sysUserId: 9003, scopes: ["monitor:read"] };
const status = (ruleCode: "A02" | "A03" | "A05"): ScenarioStatus => ({
  ruleCode, scenarioClock: { currentAt: "2026-08-01T12:00:00.000Z" }, sourceRevision: `test_database.${ruleCode}.v2`,
  selectedCase: "test", lastAction: "test", lastActionAt: "2026-08-01T12:00:00.000Z",
  lastActionRecordedAt: "2026-08-01T12:00:00.000Z", sourceChangedAt: "2026-08-01T12:00:00.000Z",
  pendingFault: null, sourceState: { rowCount: 0, rows: [], evaluation: { status: "clear", reasons: [] } },
});
const sourceDiff = (table: string, field: string): SourceActionEvidence => ({
  writerIdentity: "alertas_fake",
  before: [{ table, key: 501, values: { [field]: 0 } }],
  after: [{ table, key: 501, values: { [field]: 1 } }],
  changes: [{ table, key: 501, field, before: 0, after: 1 }],
  changedTables: [table], changedFields: { [table]: [field] },
  unrelatedRows: {
    before: { algorithm: "sha256", digest: "stable", tables: [] },
    after: { algorithm: "sha256", digest: "stable", tables: [] },
  },
});
const consumptionDiff = sourceDiff("orden_trabajo_materiales", "cantidad_consumida");

async function service(error?: string | Error, candidate = 12199) {
  const calls: Array<{ code: string; action: ScenarioSourceAction; key?: number; input?: ScenarioSourceActionInput }> = [];
  const source = {
    sourceActionCandidate: async () => candidate || null,
    sourceAction: async (code: string, action: ScenarioSourceAction, key: number, _contract: SourceActionContract, input?: ScenarioSourceActionInput) => {
      calls.push({ code, action, key, ...(input ? { input } : {}) });
      if (error) throw typeof error === "string" ? new Error(error) : error;
      const mutation = _contract.mutations[0]!;
      return { status: status(code as "A02" | "A03" | "A05"), evidence: sourceDiff(mutation.table, mutation.fields[0]!) };
    },
  } as unknown as ScenarioSource;
  return { calls, value: new ScenarioSourceActionService(source, await loadSourceActionContracts(root)) };
}

async function rejects(action: Promise<unknown>, statusCode: number, code: string) {
  await assert.rejects(action, (error: unknown) => error instanceof ScenarioSourceActionError && error.statusCode === statusCode && error.message === code);
}

describe("scenario source-action service", () => {
  it("executes a versioned contract and returns stable execution metadata", async () => {
    const subject = await service();
    const result = await subject.value.execute({ actionId: "a03.record_first_consumption", key: 12198 }, admin);
    assert.deepEqual(subject.calls, [{ code: "A03", action: "record_first_consumption", key: 12198 }]);
    assert.deepEqual(result, {
      actionId: "a03.record_first_consumption", contractVersion: "1.1.0", ruleCode: "A03", writerIdentity: "alertas_fake",
      naturalKey: { field: "workOrderId", value: 12198 }, sourceRevision: "test_database.A03.v2", performedBySysUserId: 9001,
      sourceDiff: consumptionDiff,
      input: null,
    });
  });

  it("validates and preserves approved editable creation fields", async () => {
    const subject = await service();
    const input = { workOrderCode: "OT-LAB-12", operationId: 12, machineId: 8 };
    const result = await subject.value.execute({ actionId: "a03.start_work_order", key: 12198, input }, admin);
    assert.deepEqual(subject.calls, [{ code: "A03", action: "start_work_order", key: 12198, input }]);
    assert.deepEqual(result.input, input);
    await rejects(subject.value.execute({ actionId: "a03.start_work_order", key: 12198, input: { machineId: 0 } }, admin), 400, "invalid_source_action_input");
    await rejects(subject.value.execute({ actionId: "a03.close_work_order", key: 12198, input: { machineId: 8 } }, admin), 400, "invalid_source_action_input");
    await rejects(subject.value.execute({
      actionId: "a02.prepare_dispatch", key: 12198,
      input: { originWarehouseId: 7, destinationWarehouseId: 7 },
    }, admin), 400, "movement_warehouses_must_differ");
  });

  it("resolves a fresh source candidate for connected creation actions", async () => {
    const subject = await service();
    const a02 = await subject.value.execute({ actionId: "a02.prepare_dispatch" }, admin);
    const a03 = await subject.value.execute({ actionId: "a03.start_work_order" }, admin);
    assert.equal(a02.naturalKey.value, 12199);
    assert.equal(a03.naturalKey.value, 12199);
    assert.deepEqual(subject.calls, [
      { code: "A02", action: "prepare_dispatch", key: 12199 },
      { code: "A03", action: "start_work_order", key: 12199 },
    ]);
    const missing = await service(undefined, 0);
    await rejects(missing.value.execute({ actionId: "a05.declare_produced_reel" }, admin), 404, "source_action_candidate_unavailable");
  });

  it("enforces administrative access and A02 source-authority precedence", async () => {
    const subject = await service();
    await rejects(subject.value.execute({ actionId: "a03.close_work_order" }, operator), 403, "source_action_not_authorized");
    await rejects(subject.value.execute({ actionId: "a02.cancel", key: 23811 }, admin), 400, "source_action_authority_required");
    await rejects(subject.value.execute({ actionId: "a02.cancel", authority: "destination", key: 23811 }, admin), 403, "source_action_not_authorized");
    await rejects(subject.value.execute({ actionId: "a02.cancel", authority: "both", key: 23811 }, admin), 409, "source_action_rejection_precedence");
    await rejects(subject.value.execute({ actionId: "a02.reject", authority: "origin", key: 23811 }, admin), 403, "source_action_not_authorized");
    await subject.value.execute({ actionId: "a02.reject", authority: "both", key: 23811 }, admin);
    assert.deepEqual(subject.calls, [{ code: "A02", action: "reject", key: 23811 }]);
  });

  it("rejects malformed requests before invoking the source", async () => {
    const subject = await service();
    await rejects(subject.value.execute(null, admin), 400, "invalid_source_action_request");
    await rejects(subject.value.execute({ actionId: "missing" }, admin), 400, "invalid_source_action_id");
    await rejects(subject.value.execute({ actionId: "a03.close_work_order" }, admin), 400, "source_action_key_required");
    await rejects(subject.value.execute({ actionId: "a03.close_work_order", key: "12198" }, admin), 400, "invalid_source_action_key");
    await rejects(subject.value.execute({ actionId: "a03.close_work_order", authority: "both", key: 12198 }, admin), 400, "source_action_authority_not_applicable");
    await rejects(subject.value.execute({ actionId: "a03.close_work_order", extra: true }, admin), 400, "invalid_source_action_request");
    assert.deepEqual(subject.calls, []);
  });

  it("normalizes lifecycle conflicts and unavailable source adapters", async () => {
    const conflicting = await service("work_order_closed");
    await rejects(conflicting.value.execute({ actionId: "a03.record_first_consumption", key: 12198 }, admin), 409, "work_order_closed");
    const missing = await service("work_order_unavailable");
    await rejects(missing.value.execute({ actionId: "a03.close_work_order", key: 12198 }, admin), 404, "work_order_unavailable");
    const resetting = await service("test_database_reset_active");
    await rejects(resetting.value.execute({ actionId: "a03.close_work_order", key: 12198 }, admin), 503, "test_database_reset_active");
    const staleReference = await service(Object.assign(new Error("foreign key conflict"), { code: "ER_NO_REFERENCED_ROW_2" }));
    await rejects(staleReference.value.execute({ actionId: "a03.close_work_order", key: 12198 }, admin), 409, "source_action_reference_unavailable");
    const duplicateIdentity = await service(Object.assign(new Error("duplicate identity"), { code: "ER_DUP_ENTRY" }));
    await rejects(duplicateIdentity.value.execute({ actionId: "a03.close_work_order", key: 12198 }, admin), 409, "source_action_identity_conflict");
    const registry = await loadSourceActionContracts(root);
    const unavailable = new ScenarioSourceActionService({} as ScenarioSource, registry);
    await rejects(unavailable.execute({ actionId: "a03.close_work_order", key: 12198 }, admin), 501, "source_action_source_unavailable");
  });
});
