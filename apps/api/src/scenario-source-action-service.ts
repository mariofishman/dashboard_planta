import type { Principal } from "@monitor/contracts";
import type {
  A02SourceAuthority,
  ScenarioRuleCode,
  ScenarioSource,
  ScenarioSourceAction,
  SourceActionContract,
  SourceActionContractRegistry,
  SourceActionEvidence,
  SourceActionId,
} from "@monitor/detection";

const conflictErrors = new Set([
  "consumption_already_recorded",
  "duplicate_active_scale_records",
  "handoff_already_exists",
  "invalid_consumption_state",
  "machine_has_active_work_order",
  "movement_terminal",
  "reel_already_moved",
  "reel_closing_work_order_missing",
  "reel_source_work_order_missing",
  "reel_unavailable",
  "source_lifecycle_recurrence_unsupported",
  "work_order_already_started",
  "work_order_cancelled",
  "work_order_closed",
  "work_order_not_started",
]);
const notFoundErrors = new Set(["movement_unavailable", "reel_unavailable", "work_order_material_unavailable", "work_order_unavailable"]);
const unavailableErrors = new Set(["test_database_not_ready", "test_database_reset_active"]);

const invocationActions = new Set<ScenarioSourceAction>([
  "prepare_dispatch", "receive", "cancel", "reject",
  "start_work_order", "record_first_consumption", "close_work_order", "cancel_work_order", "start_competing_work_order",
  "declare_produced_reel", "declare_remnant_reel", "register_weighing", "register_movement", "handoff",
]);

export class ScenarioSourceActionError extends Error {
  constructor(readonly statusCode: 400 | 403 | 404 | 409 | 501 | 503, code: string) {
    super(code);
    this.name = "ScenarioSourceActionError";
  }
}

export interface ScenarioSourceActionExecution {
  actionId: SourceActionId;
  contractVersion: string;
  ruleCode: ScenarioRuleCode;
  writerIdentity: string;
  naturalKey: { field: string; value: number };
  sourceRevision: string;
  performedBySysUserId: number;
  sourceDiff: SourceActionEvidence;
}

function requestObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ScenarioSourceActionError(400, "invalid_source_action_request");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !["actionId", "key", "authority"].includes(key))) throw new ScenarioSourceActionError(400, "invalid_source_action_request");
  return input;
}

function naturalKey(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) throw new ScenarioSourceActionError(400, "invalid_source_action_key");
  return value;
}

function a02Authority(value: unknown): A02SourceAuthority | undefined {
  if (value === undefined) return undefined;
  if (value !== "origin" && value !== "destination" && value !== "both") throw new ScenarioSourceActionError(400, "invalid_source_action_authority");
  return value;
}

function authorizeContract(contract: SourceActionContract, authority: A02SourceAuthority | undefined): void {
  if (contract.id === "a02.cancel") {
    if (!authority) throw new ScenarioSourceActionError(400, "source_action_authority_required");
    if (authority === "both") throw new ScenarioSourceActionError(409, "source_action_rejection_precedence");
    if (authority !== "origin") throw new ScenarioSourceActionError(403, "source_action_not_authorized");
    return;
  }
  if (contract.id === "a02.reject") {
    if (!authority) throw new ScenarioSourceActionError(400, "source_action_authority_required");
    if (authority === "origin") throw new ScenarioSourceActionError(403, "source_action_not_authorized");
    return;
  }
  if (authority !== undefined) throw new ScenarioSourceActionError(400, "source_action_authority_not_applicable");
}

function validateEvidence(contract: SourceActionContract, evidence: SourceActionEvidence, expectedWriter: string): void {
  if (evidence.writerIdentity !== expectedWriter || evidence.unrelatedRows.before.digest !== evidence.unrelatedRows.after.digest) {
    throw new Error("source_action_evidence_invalid");
  }
  const allowed = new Map<string, Set<string>>();
  for (const mutation of contract.mutations) {
    const fields = allowed.get(mutation.table) ?? new Set<string>();
    mutation.fields.forEach((field) => fields.add(field));
    allowed.set(mutation.table, fields);
  }
  for (const change of evidence.changes) {
    if (!allowed.get(change.table)?.has(change.field)) throw new Error("source_action_evidence_contract_mismatch");
  }
}

export class ScenarioSourceActionService {
  private readonly contracts: Map<string, SourceActionContract>;

  constructor(private readonly source: ScenarioSource, private readonly registry: SourceActionContractRegistry) {
    this.contracts = new Map(registry.actions.map((contract) => [contract.id, contract]));
  }

  async execute(value: unknown, principal: Principal): Promise<ScenarioSourceActionExecution> {
    if (!principal.scopes.includes("monitor:admin")) throw new ScenarioSourceActionError(403, "source_action_not_authorized");
    const input = requestObject(value);
    if (typeof input.actionId !== "string") throw new ScenarioSourceActionError(400, "invalid_source_action_id");
    const contract = this.contracts.get(input.actionId);
    if (!contract) throw new ScenarioSourceActionError(400, "invalid_source_action_id");
    if (contract.invocation.operation !== "sourceAction" || !invocationActions.has(contract.invocation.argument as ScenarioSourceAction)) {
      throw new ScenarioSourceActionError(501, "source_action_contract_not_executable");
    }
    const key = naturalKey(input.key);
    if (key === undefined) throw new ScenarioSourceActionError(400, "source_action_key_required");
    authorizeContract(contract, a02Authority(input.authority));
    if (!this.source.sourceAction) throw new ScenarioSourceActionError(501, "source_action_source_unavailable");
    try {
      const outcome = await this.source.sourceAction(contract.ruleCode, contract.invocation.argument as ScenarioSourceAction, key, contract);
      validateEvidence(contract, outcome.evidence, this.registry.writerIdentity);
      return {
        actionId: contract.id,
        contractVersion: this.registry.contractVersion,
        ruleCode: contract.ruleCode,
        writerIdentity: this.registry.writerIdentity,
        naturalKey: { field: contract.naturalKey, value: key },
        sourceRevision: outcome.status.sourceRevision,
        performedBySysUserId: principal.sysUserId,
        sourceDiff: outcome.evidence,
      };
    } catch (error) {
      if (error instanceof ScenarioSourceActionError) throw error;
      if (error instanceof Error && conflictErrors.has(error.message)) throw new ScenarioSourceActionError(409, error.message);
      if (error instanceof Error && notFoundErrors.has(error.message)) throw new ScenarioSourceActionError(404, error.message);
      if (error instanceof Error && unavailableErrors.has(error.message)) throw new ScenarioSourceActionError(503, error.message);
      if (error instanceof Error && ["invalid_source_action", "unknown_scenario_rule"].includes(error.message)) throw new ScenarioSourceActionError(400, error.message);
      throw error;
    }
  }
}
