import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ScenarioRuleCode } from "./simulator.js";

export const sourceActionIds = [
  "a02.prepare_dispatch", "a02.receive", "a02.cancel", "a02.reject",
  "a03.start_work_order", "a03.record_first_consumption", "a03.close_work_order", "a03.cancel_work_order",
  "a05.declare_produced_reel", "a05.declare_remnant_reel", "a05.register_weighing", "a05.register_movement",
  "a05.close_source_work_order", "a05.handoff_to_a02",
] as const;

export type SourceActionId = typeof sourceActionIds[number];
export type SourceActionOperation = "prepare" | "correct" | "sourceAction";
export type A02SourceAuthority = "origin" | "destination" | "both";

const invocationById: Record<SourceActionId, string> = {
  "a02.prepare_dispatch": "prepare_dispatch",
  "a02.receive": "receive",
  "a02.cancel": "cancel",
  "a02.reject": "reject",
  "a03.start_work_order": "start_work_order",
  "a03.record_first_consumption": "record_first_consumption",
  "a03.close_work_order": "close_work_order",
  "a03.cancel_work_order": "cancel_work_order",
  "a05.declare_produced_reel": "declare_produced_reel",
  "a05.declare_remnant_reel": "declare_remnant_reel",
  "a05.register_weighing": "register_weighing",
  "a05.register_movement": "register_movement",
  "a05.close_source_work_order": "close_work_order",
  "a05.handoff_to_a02": "handoff",
};

export interface SourceActionMutation {
  table: string;
  fields: string[];
}

export interface SourceActionContract {
  id: SourceActionId;
  ruleCode: ScenarioRuleCode;
  naturalKey: string;
  invocation: { operation: SourceActionOperation; argument: string };
  mutations: SourceActionMutation[];
  preconditions: string[];
  postconditions: string[];
  rejects: string[];
}

export interface SourceActionContractRegistry {
  contractVersion: "1.1.0";
  sourceDatabase: "test_database";
  writerIdentity: "alertas_fake";
  actions: SourceActionContract[];
}

export interface SourceActionEvidenceRecord {
  table: string;
  key: number;
  values: Record<string, unknown>;
}

export interface SourceActionFieldChange {
  table: string;
  key: number;
  field: string;
  before: unknown;
  after: unknown;
}

export interface SourceActionUnrelatedTableDigest {
  table: string;
  columns: string[];
  rowCount: number;
  digest: string;
}

export interface SourceActionUnrelatedDigest {
  algorithm: "sha256";
  digest: string;
  tables: SourceActionUnrelatedTableDigest[];
}

export interface SourceActionEvidence {
  writerIdentity: string;
  before: SourceActionEvidenceRecord[];
  after: SourceActionEvidenceRecord[];
  changes: SourceActionFieldChange[];
  changedTables: string[];
  changedFields: Record<string, string[]>;
  unrelatedRows: { before: SourceActionUnrelatedDigest; after: SourceActionUnrelatedDigest };
}

const expectedIds = new Set<string>(sourceActionIds);
const ruleCodes = new Set<string>(["A02", "A03", "A05"]);
const operations = new Set<string>(["prepare", "correct", "sourceAction"]);

export function validateSourceActionContracts(value: unknown): SourceActionContractRegistry {
  if (!value || typeof value !== "object") throw new Error("invalid_source_action_contract");
  const registry = value as Partial<SourceActionContractRegistry>;
  if (registry.contractVersion !== "1.1.0" || registry.sourceDatabase !== "test_database" || registry.writerIdentity !== "alertas_fake") {
    throw new Error("invalid_source_action_contract_header");
  }
  if (!Array.isArray(registry.actions) || registry.actions.length !== sourceActionIds.length) throw new Error("invalid_source_action_contract_count");
  const seen = new Set<string>();
  for (const action of registry.actions) {
    if (!action || !expectedIds.has(action.id) || seen.has(action.id)) throw new Error("invalid_source_action_contract_id");
    seen.add(action.id);
    if (!ruleCodes.has(action.ruleCode) || action.id.slice(0, 3).toUpperCase() !== action.ruleCode) throw new Error("invalid_source_action_contract_rule");
    if (!action.naturalKey || !operations.has(action.invocation?.operation) || action.invocation.operation !== "sourceAction"
      || action.invocation.argument !== invocationById[action.id]) throw new Error("invalid_source_action_contract_invocation");
    if (!Array.isArray(action.mutations) || action.mutations.length === 0
      || action.mutations.some((mutation) => !mutation.table || !Array.isArray(mutation.fields) || mutation.fields.length === 0 || new Set(mutation.fields).size !== mutation.fields.length)) {
      throw new Error("invalid_source_action_contract_mutation");
    }
    if (![action.preconditions, action.postconditions, action.rejects].every((items) => Array.isArray(items) && items.length > 0 && items.every(Boolean))) {
      throw new Error("invalid_source_action_contract_constraints");
    }
  }
  if (seen.size !== expectedIds.size) throw new Error("incomplete_source_action_contract");
  return registry as SourceActionContractRegistry;
}

export async function loadSourceActionContracts(repositoryRoot: string): Promise<SourceActionContractRegistry> {
  const path = resolve(repositoryRoot, "config/detection/source-actions/stage5-source-actions.v1.json");
  return validateSourceActionContracts(JSON.parse(await readFile(path, "utf8")));
}

export function assertA02MovementOpen(state: unknown): void {
  if (state !== "TRANSITO") throw new Error("movement_terminal");
}

export function a02TerminalActionFor(authority: A02SourceAuthority): "cancel" | "reject" {
  return authority === "origin" ? "cancel" : "reject";
}

export function nextFirstConsumption(current: unknown, workOrder: { started: boolean; closed: boolean; cancelled: boolean }): number {
  if (!workOrder.started) throw new Error("work_order_not_started");
  if (workOrder.closed) throw new Error("work_order_closed");
  if (workOrder.cancelled) throw new Error("work_order_cancelled");
  const amount = Number(current ?? 0);
  if (!Number.isFinite(amount) || amount < 0) throw new Error("invalid_consumption_state");
  return Math.max(amount, 1);
}

export function assertA03MayStart(workOrder: { started: boolean; closed: boolean; cancelled: boolean; otherActiveCount: number }): void {
  if (workOrder.closed) throw new Error("work_order_closed");
  if (workOrder.cancelled) throw new Error("work_order_cancelled");
  if (workOrder.started) throw new Error("work_order_already_started");
  if (workOrder.otherActiveCount > 0) throw new Error("machine_has_active_work_order");
}
