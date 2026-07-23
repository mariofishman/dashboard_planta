import type { DatabaseExecutor, DatabaseRuntime } from "@monitor/database";
import type { DetectionQueryDefinition, DetectionSourceAdapter, SourcePage } from "./types.js";

export type ScenarioRuleCode = "A02" | "A03" | "A05";
export type ScenarioFault = "timeout" | "source_error" | "partial" | "invalid_schema";
export type ScenarioAction = "reset" | "trigger" | "correct" | "advance_time";

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
  simulatedAt: string;
  sourceRevision: string;
  lastAction: string;
  lastActionAt: string;
  pendingFault: ScenarioFault | null;
  sourceState: Record<string, unknown>;
}

const codes: ScenarioRuleCode[] = ["A02", "A03", "A05"];
const assertCode = (code: string): ScenarioRuleCode => {
  if (!codes.includes(code as ScenarioRuleCode)) throw new Error("unknown_scenario_rule");
  return code as ScenarioRuleCode;
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

export class ScenarioSourceRepository {
  constructor(private readonly database: DatabaseRuntime) {}

  async reset(code: string): Promise<ScenarioStatus> {
    const ruleCode = assertCode(code);
    await this.database.transaction(async (transaction) => {
      if (ruleCode === "A02") await transaction.execute("DELETE FROM monitor_sim_a02_flow");
      if (ruleCode === "A03") await transaction.execute("DELETE FROM monitor_sim_a03_work_order");
      if (ruleCode === "A05") await transaction.execute("DELETE FROM monitor_sim_a05_reel");
      await this.touch(transaction, ruleCode, "reset");
    });
    return this.status(ruleCode);
  }

  async trigger(code: string): Promise<ScenarioStatus> {
    const ruleCode = assertCode(code);
    await this.database.transaction(async (transaction) => {
      const now = await this.clock(transaction);
      if (ruleCode === "A02") {
        await transaction.execute(`INSERT INTO monitor_sim_a02_flow
          (material_flow_detail_id,is_work_order_reservation,state,received_at,started_at,work_order_id,work_order_code,machine_code,operation_name,shift_name,responsible_name)
          VALUES (4202,TRUE,'TRANSITO',NULL,$1,'1510873','151087.3','P15','Impresión','Día','Almacén de materia prima')
          ON CONFLICT (material_flow_detail_id) DO UPDATE SET state='TRANSITO',received_at=NULL,started_at=EXCLUDED.started_at`, [now.currentAt]);
      }
      if (ruleCode === "A03") {
        await transaction.execute(`INSERT INTO monitor_sim_a03_work_order
          (work_order_id,active,started_at,stronger_a07,work_order_code,machine_code,operation_name,shift_name,responsible_name)
          VALUES (4103,TRUE,$1,FALSE,'151056.1','P12','Impresión','Día','Operación de máquina')
          ON CONFLICT (work_order_id) DO UPDATE SET active=TRUE,started_at=EXCLUDED.started_at,stronger_a07=FALSE`, [now.currentAt]);
        await transaction.execute(`INSERT INTO monitor_sim_a03_consumption (work_order_id,consumption_count,first_consumption_at)
          VALUES (4103,0,NULL) ON CONFLICT (work_order_id) DO UPDATE SET consumption_count=0,first_consumption_at=NULL`);
      }
      if (ruleCode === "A05") {
        await transaction.execute(`INSERT INTO monitor_sim_a05_reel
          (article_serial_id,declared_at,weighed,source_work_order_finished,moved_from_machine,work_order_id,work_order_code,machine_code,operation_name,shift_name,responsible_name)
          VALUES (4205,$1,FALSE,TRUE,FALSE,'1510873','151087.3','P15','Impresión','Día','Equipo de procesos')
          ON CONFLICT (article_serial_id) DO UPDATE SET declared_at=EXCLUDED.declared_at,weighed=FALSE,source_work_order_finished=TRUE,moved_from_machine=FALSE`, [now.currentAt]);
      }
      await this.touch(transaction, ruleCode, "trigger");
    });
    return this.status(ruleCode);
  }

  async correct(code: string): Promise<ScenarioStatus> {
    const ruleCode = assertCode(code);
    await this.database.transaction(async (transaction) => {
      const now = await this.clock(transaction);
      if (ruleCode === "A02") await transaction.execute("UPDATE monitor_sim_a02_flow SET state='RECIBIDO',received_at=$1 WHERE material_flow_detail_id=4202", [now.currentAt]);
      if (ruleCode === "A03") await transaction.execute("UPDATE monitor_sim_a03_consumption SET consumption_count=1,first_consumption_at=$1 WHERE work_order_id=4103", [now.currentAt]);
      if (ruleCode === "A05") await transaction.execute("UPDATE monitor_sim_a05_reel SET weighed=TRUE,moved_from_machine=TRUE WHERE article_serial_id=4205");
      await this.touch(transaction, ruleCode, "correct");
    });
    return this.status(ruleCode);
  }

  async advanceTime(code: string, minutes: number): Promise<ScenarioStatus> {
    const ruleCode = assertCode(code);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) throw new Error("invalid_advance_minutes");
    await this.database.transaction(async (transaction) => {
      await transaction.execute("UPDATE monitor_sim_clock SET current_at=current_at + ($1 * INTERVAL '1 minute'),revision=revision+1 WHERE singleton=TRUE", [minutes]);
      await this.touch(transaction, ruleCode, "advance_time");
    });
    return this.status(ruleCode);
  }

  async failNextPoll(code: string, fault: ScenarioFault): Promise<ScenarioStatus> {
    const ruleCode = assertCode(code);
    if (!["timeout", "source_error", "partial", "invalid_schema"].includes(fault)) throw new Error("invalid_scenario_fault");
    await this.database.transaction(async (transaction) => {
      const now = await this.clock(transaction);
      await transaction.execute("UPDATE monitor_sim_scenario SET pending_fault=$2,last_action='fail_next_poll',last_action_at=$3 WHERE rule_code=$1", [ruleCode, fault, now.currentAt]);
    });
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
    const clock = await this.clock(this.database);
    if (code === "A02") {
      const source = await this.database.queryAll("SELECT * FROM monitor_sim_a02_flow ORDER BY material_flow_detail_id");
      return { sourceRevision: `simulator.v${clock.revision}`, rows: source.map((row) => ({
        materialFlowDetailId: Number(row.material_flow_detail_id), isWorkOrderReservation: Boolean(row.is_work_order_reservation),
        state: String(row.state), receivedAt: row.received_at ? String(row.received_at) : null,
        elapsedMinutes: minutesSince(row.started_at, clock.currentAt), scenarioContext: context(row),
      })) };
    }
    if (code === "A03") {
      const source = await this.database.queryAll(`SELECT wo.*,COALESCE(c.consumption_count,0) AS consumption_count
        FROM monitor_sim_a03_work_order wo LEFT JOIN monitor_sim_a03_consumption c ON c.work_order_id=wo.work_order_id ORDER BY wo.work_order_id`);
      return { sourceRevision: `simulator.v${clock.revision}`, rows: source.map((row) => ({
        workOrderId: Number(row.work_order_id), active: Boolean(row.active), elapsedMinutes: minutesSince(row.started_at, clock.currentAt),
        consumptionCount: Number(row.consumption_count), strongerA07: Boolean(row.stronger_a07), scenarioContext: context(row),
      })) };
    }
    const source = await this.database.queryAll("SELECT * FROM monitor_sim_a05_reel ORDER BY article_serial_id");
    return { sourceRevision: `simulator.v${clock.revision}`, rows: source.map((row) => ({
      articleSerialId: Number(row.article_serial_id), declaredAgeMinutes: minutesSince(row.declared_at, clock.currentAt),
      weighed: Boolean(row.weighed), sourceWorkOrderFinished: Boolean(row.source_work_order_finished), movedFromMachine: Boolean(row.moved_from_machine),
      scenarioContext: context(row),
    })) };
  }

  async status(code: string): Promise<ScenarioStatus> {
    const ruleCode = assertCode(code);
    const clock = await this.clock(this.database);
    const scenario = await this.database.queryOne("SELECT last_action AS \"lastAction\",last_action_at AS \"lastActionAt\",pending_fault AS \"pendingFault\" FROM monitor_sim_scenario WHERE rule_code=$1", [ruleCode]);
    const source = await this.rows(ruleCode);
    return {
      ruleCode, simulatedAt: clock.currentAt, sourceRevision: source.sourceRevision, lastAction: String(scenario.lastAction),
      lastActionAt: String(scenario.lastActionAt), pendingFault: scenario.pendingFault as ScenarioFault | null,
      sourceState: { rowCount: source.rows.length, rows: source.rows },
    };
  }

  private async clock(executor: DatabaseExecutor): Promise<{ currentAt: string; revision: number }> {
    const row = await executor.queryOne("SELECT current_at AS \"currentAt\",revision FROM monitor_sim_clock WHERE singleton=TRUE");
    const date = new Date(String(row.currentAt));
    if (Number.isNaN(date.getTime())) throw new Error("invalid_simulator_clock");
    return { currentAt: date.toISOString(), revision: Number(row.revision) };
  }

  private async touch(executor: DatabaseExecutor, code: ScenarioRuleCode, action: ScenarioAction): Promise<void> {
    const clock = await this.clock(executor);
    await executor.execute("UPDATE monitor_sim_clock SET revision=revision+1 WHERE singleton=TRUE");
    await executor.execute("UPDATE monitor_sim_scenario SET last_action=$2,last_action_at=$3,pending_fault=NULL,reset_at=CASE WHEN $2='reset' THEN $3 ELSE reset_at END WHERE rule_code=$1", [code, action, clock.currentAt]);
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
