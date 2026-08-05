import type { SourceActionContract, SourceActionEvidence } from "./source-actions.js";

export type ScenarioRuleCode = "A02" | "A03" | "A05";
export type ScenarioFault = "timeout" | "source_error" | "partial" | "invalid_schema" | "partial_pagination" | "duplicate_keys" | "revision_change" | "stale" | "unknown_freshness";
export type ScenarioCorrection = "weigh" | "move" | "both";
export type ScenarioCase =
  | "clean_baseline"
  | "before_threshold"
  | "before_threshold_not_weighed"
  | "before_threshold_still_at_machine"
  | "at_threshold"
  | "at_threshold_not_weighed"
  | "at_threshold_still_at_machine"
  | "past_threshold"
  | "past_threshold_not_weighed"
  | "past_threshold_still_at_machine"
  | "past_threshold_both"
  | "past_threshold_produced"
  | "past_threshold_remnant"
  | "movement_started";
export type ScenarioAction = "reset" | "prepare" | "correct" | "correct_weigh" | "correct_move" | "advance_time" | "recur";
export type ScenarioPopulation = "a02_mixed" | "a03_mixed";
export type ScenarioSourceAction =
  | "prepare_dispatch" | "receive" | "cancel" | "reject"
  | "start_work_order" | "record_first_consumption" | "close_work_order" | "cancel_work_order" | "start_competing_work_order"
  | "declare_produced_reel" | "declare_remnant_reel" | "register_weighing" | "register_movement" | "handoff";

export interface ScenarioStatus {
  ruleCode: ScenarioRuleCode;
  scenarioClock: { currentAt: string };
  sourceRevision: string;
  selectedCase: string;
  lastAction: string;
  lastActionAt: string;
  lastActionRecordedAt: string;
  sourceChangedAt: string;
  pendingFault: ScenarioFault | null;
  sourceState: {
    rowCount: number;
    rows: Record<string, unknown>[];
    evaluation: { status: "clear" | "triggered"; reasons: string[] };
  };
}

export interface ScenarioSourceActionOutcome {
  status: ScenarioStatus;
  evidence: SourceActionEvidence;
}

export type ScenarioSourceActionInput = Record<string, string | number | null>;

export interface ScenarioSource {
  supportedCases(code: string): ScenarioCase[];
  reset(code: string): Promise<ScenarioStatus>;
  trigger(code: string): Promise<ScenarioStatus>;
  prepare(code: string, scenarioCase: string, action?: ScenarioAction): Promise<ScenarioStatus>;
  preparePopulation?(code: ScenarioRuleCode, population: ScenarioPopulation, keys: number[]): Promise<ScenarioStatus>;
  correct(code: string, correction?: ScenarioCorrection): Promise<ScenarioStatus>;
  recur(code: string): Promise<ScenarioStatus>;
  advanceTime(code: string, minutes: number): Promise<ScenarioStatus>;
  setBusinessTime(currentAt: string): Promise<void>;
  setSourceCutoffAt?(cutoffAt: string | null): Promise<void>;
  latestSourceTimestamp?(): Promise<string>;
  isBaselineClean?(): boolean;
  failNextPoll(code: string, fault: ScenarioFault): Promise<ScenarioStatus>;
  consumeFault(code: ScenarioRuleCode): Promise<ScenarioFault | null>;
  rows(code: ScenarioRuleCode): Promise<{ rows: Record<string, unknown>[]; sourceRevision: string }>;
  status(code: string): Promise<ScenarioStatus>;
  sourceActionCandidate?(code: ScenarioRuleCode, action: ScenarioSourceAction): Promise<number | null>;
  sourceAction?(code: string, action: ScenarioSourceAction, key: number, contract: SourceActionContract, input?: ScenarioSourceActionInput): Promise<ScenarioSourceActionOutcome>;
  replaceTracked?(code: ScenarioRuleCode, keys: number[]): void;
  recordExternalSourceChange?(code: ScenarioRuleCode, action: string): void;
  resetAfterDatabaseRestore?(): Promise<void>;
  pollMetadata?(code: ScenarioRuleCode): { currentAt: string; sourceRevision: string };
}
