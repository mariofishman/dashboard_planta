import type { DatabaseExecutor, DatabaseRuntime } from "@monitor/database";
import type { DetectionQueryDefinition, DetectionSourceAdapter, SourcePage } from "./types.js";

export type ScenarioRuleCode = "A02" | "A03" | "A05";
export type ScenarioFault = "timeout" | "source_error" | "partial" | "invalid_schema";
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
  | "suppressed_by_a07"
  | "past_threshold_not_weighed"
  | "past_threshold_still_at_machine"
  | "past_threshold_both"
  | "past_threshold_produced"
  | "past_threshold_remnant"
  | "movement_started";
export type ScenarioAction = "reset" | "prepare" | "correct" | "correct_weigh" | "correct_move" | "advance_time" | "recur";

export interface ScenarioContext {
  plantId: number;
  workOrderId: string;
  workOrderCode: string;
  machineCode: string;
  operationName: string;
  shiftName: string;
  responsibleName: string;
}

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

const codes: ScenarioRuleCode[] = ["A02", "A03", "A05"];
const allowedCases: Record<ScenarioRuleCode, ScenarioCase[]> = {
  A02: ["clean_baseline", "before_threshold", "at_threshold", "past_threshold"],
  A03: ["clean_baseline", "before_threshold", "at_threshold", "past_threshold", "suppressed_by_a07"],
  A05: [
    "clean_baseline", "before_threshold_not_weighed", "before_threshold_still_at_machine", "before_threshold",
    "at_threshold_not_weighed", "at_threshold_still_at_machine", "at_threshold",
    "past_threshold_not_weighed", "past_threshold_still_at_machine", "past_threshold_both",
    "past_threshold_produced", "past_threshold_remnant", "movement_started",
  ],
};

const assertCode = (code: string): ScenarioRuleCode => {
  if (!codes.includes(code as ScenarioRuleCode)) throw new Error("unknown_scenario_rule");
  return code as ScenarioRuleCode;
};

const assertCase = (code: ScenarioRuleCode, value: string): ScenarioCase => {
  if (!allowedCases[code].includes(value as ScenarioCase)) throw new Error("invalid_scenario_case");
  return value as ScenarioCase;
};

const context = (row: Record<string, unknown>): ScenarioContext => ({
  plantId: 1,
  workOrderId: String(row.work_order_id),
  workOrderCode: String(row.work_order_code),
  machineCode: String(row.machine_code),
  operationName: String(row.operation_name),
  shiftName: String(row.shift_name),
  responsibleName: String(row.responsible_name),
});

const minutesSince = (start: unknown, current: unknown) => Math.max(0, Math.floor((Date.parse(String(current)) - Date.parse(String(start))) / 60_000));
const minutesBefore = (iso: string, minutes: number) => new Date(Date.parse(iso) - minutes * 60_000).toISOString();

function evaluateSource(code: ScenarioRuleCode, rows: Record<string, unknown>[]) {
  const row = rows[0];
  if (!row) return { status: "clear" as const, reasons: [] as string[] };
  if (code === "A02") {
    const triggered = row.isWorkOrderReservation === true && row.state === "TRANSITO" && row.receivedAt === null && Number(row.elapsedMinutes) >= 30;
    return { status: triggered ? "triggered" as const : "clear" as const, reasons: triggered ? ["not_received"] : [] };
  }
  if (code === "A03") {
    const triggered = row.active === true && Number(row.elapsedMinutes) >= 15 && Number(row.consumptionCount) === 0 && row.strongerA07 === false;
    return { status: triggered ? "triggered" as const : "clear" as const, reasons: triggered ? ["no_first_consumption"] : [] };
  }
  const reasons: string[] = [];
  if (Number(row.declaredAgeMinutes) >= 30 && row.weighed === false) reasons.push("not_weighed");
  if (Number(row.declaredAgeMinutes) >= 30 && row.sourceWorkOrderFinished === true && row.movedFromMachine === false) reasons.push("still_at_machine");
  return { status: reasons.length ? "triggered" as const : "clear" as const, reasons };
}

export class ScenarioSourceRepository {
  constructor(private readonly database: DatabaseRuntime) {}

  supportedCases(code: string): ScenarioCase[] {
    return allowedCases[assertCode(code)];
  }

  async reset(code: string): Promise<ScenarioStatus> {
    return this.prepare(code, "clean_baseline", "reset");
  }

  async trigger(code: string): Promise<ScenarioStatus> {
    const ruleCode = assertCode(code);
    return this.prepare(ruleCode, "before_threshold");
  }

  async prepare(code: string, scenarioCase: string, action: ScenarioAction = "prepare"): Promise<ScenarioStatus> {
    const ruleCode = assertCode(code);
    const selectedCase = assertCase(ruleCode, scenarioCase);
    await this.database.transaction(async (transaction) => {
      const clock = await this.clock(transaction, ruleCode);
      if (ruleCode === "A02") await this.prepareA02(transaction, clock.currentAt, selectedCase);
      if (ruleCode === "A03") await this.prepareA03(transaction, clock.currentAt, selectedCase);
      if (ruleCode === "A05") await this.prepareA05(transaction, clock.currentAt, selectedCase);
      await this.touch(transaction, ruleCode, action, selectedCase, true);
    });
    return this.status(ruleCode);
  }

  async correct(code: string, correction: ScenarioCorrection = "both"): Promise<ScenarioStatus> {
    const ruleCode = assertCode(code);
    await this.database.transaction(async (transaction) => {
      const clock = await this.clock(transaction, ruleCode);
      if (ruleCode === "A02") await transaction.execute("UPDATE monitor_sim_a02_flow SET state='RECIBIDO',received_at=$1 WHERE material_flow_detail_id=4202", [clock.currentAt]);
      if (ruleCode === "A03") await transaction.execute("UPDATE monitor_sim_a03_consumption SET consumption_count=1,first_consumption_at=$1 WHERE work_order_id=4103", [clock.currentAt]);
      if (ruleCode === "A05" && (correction === "weigh" || correction === "both")) await transaction.execute("UPDATE monitor_sim_a05_reel SET weighed=TRUE WHERE article_serial_id=4205");
      if (ruleCode === "A05" && (correction === "move" || correction === "both")) await transaction.execute("UPDATE monitor_sim_a05_reel SET moved_from_machine=TRUE WHERE article_serial_id=4205");
      const action = ruleCode === "A05" && correction === "weigh" ? "correct_weigh"
        : ruleCode === "A05" && correction === "move" ? "correct_move"
          : "correct";
      await this.touch(transaction, ruleCode, action, "corrected", true);
    });
    return this.status(ruleCode);
  }

  async recur(code: string): Promise<ScenarioStatus> {
    const ruleCode = assertCode(code);
    const latest = await this.database.queryOne("SELECT lifecycle FROM monitor_incident WHERE rule_code=$1 ORDER BY occurrence DESC LIMIT 1", [ruleCode]);
    if (latest.lifecycle !== "resolved") throw new Error("recurrence_requires_resolved_incident");
    await this.database.transaction(async (transaction) => {
      const clock = await this.clock(transaction, ruleCode);
      const advancedAt = new Date(Date.parse(clock.currentAt) + 60_000).toISOString();
      await transaction.execute("UPDATE monitor_sim_scenario SET current_at=$2 WHERE rule_code=$1", [ruleCode, advancedAt]);
      const recurrenceCase = ruleCode === "A05" ? "past_threshold_both" : "past_threshold";
      if (ruleCode === "A02") await this.prepareA02(transaction, advancedAt, recurrenceCase);
      if (ruleCode === "A03") await this.prepareA03(transaction, advancedAt, recurrenceCase);
      if (ruleCode === "A05") await this.prepareA05(transaction, advancedAt, recurrenceCase);
      await this.touch(transaction, ruleCode, "recur", "recurrence", true);
    });
    return this.status(ruleCode);
  }

  async advanceTime(code: string, minutes: number): Promise<ScenarioStatus> {
    const ruleCode = assertCode(code);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) throw new Error("invalid_advance_minutes");
    await this.database.transaction(async (transaction) => {
      await transaction.execute("UPDATE monitor_sim_scenario SET current_at=current_at + ($2 * INTERVAL '1 minute') WHERE rule_code=$1", [ruleCode, minutes]);
      await this.touch(transaction, ruleCode, "advance_time", null, true);
    });
    return this.status(ruleCode);
  }

  async failNextPoll(code: string, fault: ScenarioFault): Promise<ScenarioStatus> {
    const ruleCode = assertCode(code);
    if (!["timeout", "source_error", "partial", "invalid_schema"].includes(fault)) throw new Error("invalid_scenario_fault");
    await this.database.execute(`UPDATE monitor_sim_scenario SET pending_fault=$2,last_action='fail_next_poll',
      last_action_at=current_at,last_action_recorded_at=now() WHERE rule_code=$1`, [ruleCode, fault]);
    return this.status(ruleCode);
  }

  async consumeFault(code: ScenarioRuleCode): Promise<ScenarioFault | null> {
    return this.database.transaction(async (transaction) => {
      const scenario = await transaction.queryOne("SELECT pending_fault FROM monitor_sim_scenario WHERE rule_code=$1", [code]);
      const fault = scenario.pending_fault as ScenarioFault | null;
      if (fault) await transaction.execute("UPDATE monitor_sim_scenario SET pending_fault=NULL WHERE rule_code=$1", [code]);
      return fault;
    });
  }

  async rows(code: ScenarioRuleCode): Promise<{ rows: Record<string, unknown>[]; sourceRevision: string }> {
    const clock = await this.clock(this.database, code);
    if (code === "A02") {
      const source = await this.database.queryAll("SELECT * FROM monitor_sim_a02_flow ORDER BY material_flow_detail_id");
      return { sourceRevision: `alertas_fake.${code}.v${clock.revision}`, rows: source.map((row) => ({
        materialFlowDetailId: Number(row.material_flow_detail_id), isWorkOrderReservation: Boolean(row.is_work_order_reservation),
        state: String(row.state), receivedAt: row.received_at ? String(row.received_at) : null,
        elapsedMinutes: minutesSince(row.started_at, clock.currentAt), scenarioContext: context(row),
      })) };
    }
    if (code === "A03") {
      const source = await this.database.queryAll(`SELECT wo.*,COALESCE(c.consumption_count,0) AS consumption_count
        FROM monitor_sim_a03_work_order wo LEFT JOIN monitor_sim_a03_consumption c ON c.work_order_id=wo.work_order_id ORDER BY wo.work_order_id`);
      return { sourceRevision: `alertas_fake.${code}.v${clock.revision}`, rows: source.map((row) => ({
        workOrderId: Number(row.work_order_id), active: Boolean(row.active), elapsedMinutes: minutesSince(row.started_at, clock.currentAt),
        consumptionCount: Number(row.consumption_count), strongerA07: Boolean(row.stronger_a07), scenarioContext: context(row),
      })) };
    }
    const source = await this.database.queryAll("SELECT * FROM monitor_sim_a05_reel ORDER BY article_serial_id");
    return { sourceRevision: `alertas_fake.${code}.v${clock.revision}`, rows: source.map((row) => ({
      articleSerialId: Number(row.article_serial_id), declaredAgeMinutes: minutesSince(row.declared_at, clock.currentAt),
      weighed: Boolean(row.weighed), sourceWorkOrderFinished: Boolean(row.source_work_order_finished), movedFromMachine: Boolean(row.moved_from_machine),
      reelKind: String(row.reel_kind),
      scenarioContext: context(row),
    })) };
  }

  async status(code: string): Promise<ScenarioStatus> {
    const ruleCode = assertCode(code);
    const clock = await this.clock(this.database, ruleCode);
    const scenario = await this.database.queryOne(`SELECT selected_case AS "selectedCase",last_action AS "lastAction",last_action_at AS "lastActionAt",
      last_action_recorded_at AS "lastActionRecordedAt",source_changed_at AS "sourceChangedAt",pending_fault AS "pendingFault"
      FROM monitor_sim_scenario WHERE rule_code=$1`, [ruleCode]);
    const source = await this.rows(ruleCode);
    return {
      ruleCode,
      scenarioClock: { currentAt: clock.currentAt },
      sourceRevision: source.sourceRevision,
      selectedCase: String(scenario.selectedCase),
      lastAction: String(scenario.lastAction),
      lastActionAt: String(scenario.lastActionAt),
      lastActionRecordedAt: String(scenario.lastActionRecordedAt),
      sourceChangedAt: String(scenario.sourceChangedAt),
      pendingFault: scenario.pendingFault as ScenarioFault | null,
      sourceState: { rowCount: source.rows.length, rows: source.rows, evaluation: evaluateSource(ruleCode, source.rows) },
    };
  }

  private async prepareA02(executor: DatabaseExecutor, currentAt: string, scenarioCase: ScenarioCase) {
    const age = scenarioCase === "before_threshold" ? 29 : scenarioCase === "at_threshold" ? 30 : 31;
    const clean = scenarioCase === "clean_baseline";
    await executor.execute(`INSERT INTO monitor_sim_a02_flow
      (material_flow_detail_id,is_work_order_reservation,state,received_at,started_at,work_order_id,work_order_code,machine_code,operation_name,shift_name,responsible_name)
      VALUES (4202,TRUE,$1,$2,$3,'1510873','151087.3','P15','Impresión','Día','Almacén de materia prima')
      ON CONFLICT (material_flow_detail_id) DO UPDATE SET state=EXCLUDED.state,received_at=EXCLUDED.received_at,started_at=EXCLUDED.started_at,
        work_order_id=EXCLUDED.work_order_id,machine_code=EXCLUDED.machine_code`,
    [clean ? "RECIBIDO" : "TRANSITO", clean ? currentAt : null, minutesBefore(currentAt, clean ? 10 : age)]);
  }

  private async prepareA03(executor: DatabaseExecutor, currentAt: string, scenarioCase: ScenarioCase) {
    const age = scenarioCase === "before_threshold" ? 14 : scenarioCase === "at_threshold" ? 15 : 16;
    const clean = scenarioCase === "clean_baseline";
    const strongerA07 = scenarioCase === "suppressed_by_a07";
    await executor.execute(`INSERT INTO monitor_sim_a03_work_order
      (work_order_id,active,started_at,stronger_a07,work_order_code,machine_code,operation_name,shift_name,responsible_name)
      VALUES (4103,TRUE,$1,$2,'151056.1','P12','Impresión','Día','Operación de máquina')
      ON CONFLICT (work_order_id) DO UPDATE SET active=TRUE,started_at=EXCLUDED.started_at,stronger_a07=EXCLUDED.stronger_a07`,
    [minutesBefore(currentAt, clean ? 20 : age), strongerA07]);
    await executor.execute(`INSERT INTO monitor_sim_a03_consumption (work_order_id,consumption_count,first_consumption_at)
      VALUES (4103,$1,$2) ON CONFLICT (work_order_id) DO UPDATE SET consumption_count=EXCLUDED.consumption_count,first_consumption_at=EXCLUDED.first_consumption_at`,
    [clean ? 1 : 0, clean ? minutesBefore(currentAt, 5) : null]);
  }

  private async prepareA05(executor: DatabaseExecutor, currentAt: string, scenarioCase: ScenarioCase) {
    const age = scenarioCase.startsWith("before_threshold") ? 29 : scenarioCase.startsWith("at_threshold") ? 30 : 31;
    const clean = scenarioCase === "clean_baseline";
    const notWeighed = scenarioCase.endsWith("not_weighed") || scenarioCase === "before_threshold" || scenarioCase === "at_threshold"
      || ["past_threshold_both", "past_threshold_produced", "past_threshold_remnant"].includes(scenarioCase);
    const stillAtMachine = scenarioCase.endsWith("still_at_machine") || scenarioCase === "before_threshold" || scenarioCase === "at_threshold"
      || ["past_threshold_both", "past_threshold_produced", "past_threshold_remnant"].includes(scenarioCase);
    const reelKind = scenarioCase === "past_threshold_remnant" ? "remnant" : "produced";
    const movementStarted = scenarioCase === "movement_started";
    await executor.execute(`INSERT INTO monitor_sim_a05_reel
      (article_serial_id,declared_at,weighed,source_work_order_finished,moved_from_machine,reel_kind,work_order_id,work_order_code,machine_code,operation_name,shift_name,responsible_name)
      VALUES (4205,$1,$2,TRUE,$3,$4,'1510873','151087.3','P15','Impresión','Día','Equipo de procesos')
      ON CONFLICT (article_serial_id) DO UPDATE SET declared_at=EXCLUDED.declared_at,weighed=EXCLUDED.weighed,
        source_work_order_finished=TRUE,moved_from_machine=EXCLUDED.moved_from_machine,reel_kind=EXCLUDED.reel_kind`,
    [minutesBefore(currentAt, clean ? 40 : age), clean || movementStarted ? true : !notWeighed, clean || movementStarted ? true : !stillAtMachine, reelKind]);
  }

  private async clock(executor: DatabaseExecutor, code: ScenarioRuleCode): Promise<{ currentAt: string; revision: number }> {
    const row = await executor.queryOne(`SELECT current_at AS "currentAt",source_revision AS revision FROM monitor_sim_scenario WHERE rule_code=$1`, [code]);
    const date = new Date(String(row.currentAt));
    if (Number.isNaN(date.getTime())) throw new Error("invalid_simulator_clock");
    return { currentAt: date.toISOString(), revision: Number(row.revision) };
  }

  private async touch(executor: DatabaseExecutor, code: ScenarioRuleCode, action: ScenarioAction, selectedCase: string | null, sourceChanged: boolean): Promise<void> {
    await executor.execute(`UPDATE monitor_sim_scenario SET last_action=$2,last_action_at=current_at,last_action_recorded_at=now(),
      selected_case=COALESCE($3,selected_case),pending_fault=NULL,
      source_revision=source_revision + CASE WHEN $4 THEN 1 ELSE 0 END,
      source_changed_at=CASE WHEN $4 THEN now() ELSE source_changed_at END,
      reset_at=CASE WHEN $2='reset' THEN current_at ELSE reset_at END WHERE rule_code=$1`, [code, action, selectedCase, sourceChanged]);
  }
}

export class SimulatorSourceAdapter implements DetectionSourceAdapter {
  constructor(private readonly source: ScenarioSourceRepository, private readonly code: ScenarioRuleCode) {}

  async readPage(input: { query: DetectionQueryDefinition; cursor: string | null; limit: number; signal: AbortSignal }): Promise<SourcePage> {
    if (input.signal.aborted) throw new Error("aborted");
    const fault = await this.source.consumeFault(this.code);
    if (fault === "source_error") throw new Error("simulated_source_failure");
    if (fault === "timeout") return new Promise((_resolve, reject) => input.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true }));
    const source = await this.source.rows(this.code);
    if (fault === "partial") return { rows: source.rows.slice(0, input.limit), nextCursor: null, complete: false, sourceRevision: source.sourceRevision, schemaVersion: input.query.queryVersion };
    if (fault === "invalid_schema") return { rows: source.rows, nextCursor: null, complete: true, sourceRevision: source.sourceRevision, schemaVersion: "simulator.invalid" };
    return { rows: source.rows.slice(0, input.limit), nextCursor: null, complete: true, sourceRevision: source.sourceRevision, schemaVersion: input.query.queryVersion };
  }
}

const query = (ruleCode: ScenarioRuleCode, queryId: string, keyField: string, requiredFields: string[]): DetectionQueryDefinition => ({
  queryId, ruleCode, queryVersion: "1.0.0-candidate", adapterKind: "simulator", keyField, requiredFields,
  intervalMs: 1_000, timeoutMs: 500, pageSize: 100, maxRows: 1_000, maxAttempts: 1, retryBaseMs: 10, enabled: true,
});

export function simulatorRegistry(source: ScenarioSourceRepository) {
  const definitions = [
    query("A02", "a02-reserved-material-in-transit", "materialFlowDetailId", ["materialFlowDetailId", "isWorkOrderReservation", "state", "receivedAt", "elapsedMinutes"]),
    query("A03", "a03-active-without-consumption", "workOrderId", ["workOrderId", "active", "elapsedMinutes", "consumptionCount", "strongerA07"]),
    query("A05", "a05-reel-handling", "articleSerialId", ["articleSerialId", "declaredAgeMinutes", "weighed", "sourceWorkOrderFinished", "movedFromMachine"]),
  ];
  return definitions.map((definition) => ({ query: definition, adapter: new SimulatorSourceAdapter(source, definition.ruleCode as ScenarioRuleCode) }));
}

export function scenarioContextFor(row: Record<string, unknown>): ScenarioContext {
  const value = row.scenarioContext;
  if (!value || typeof value !== "object") return { plantId: 1, workOrderId: "", workOrderCode: "", machineCode: "", operationName: "", shiftName: "", responsibleName: "" };
  return value as ScenarioContext;
}
