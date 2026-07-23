import type { DatabaseExecutor, DatabaseRuntime } from "@monitor/database";

export type SupportedRuleCode = "A02" | "A03" | "A05";
export type EvaluationStatus = "triggered" | "clear" | "insufficient";
export type IncidentLifecycle = "open" | "resolved" | "closed_without_resolution";

export interface RuleContract {
  code: SupportedRuleCode;
  title: string;
  naturalKey: string[];
  requiredEvidence: string[];
  parameters: Record<string, { value: unknown }>;
  predicate: Expression;
  reasonRules: { code: string; when: Expression }[];
}
type Expression = Record<string, unknown>;

export interface RuleEvaluation {
  status: EvaluationStatus;
  reasons: string[];
  conditionKey: string | null;
}

function operand(value: unknown, input: Record<string, unknown>, parameters: RuleContract["parameters"]): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const expression = value as Expression;
  if ("var" in expression) return input[String(expression.var)];
  if ("param" in expression) return parameters[String(expression.param)]?.value;
  return evaluateExpression(expression, input, parameters);
}

function evaluateExpression(expression: Expression, input: Record<string, unknown>, parameters: RuleContract["parameters"]): unknown {
  if ("all" in expression) return (expression.all as Expression[]).every((item) => Boolean(evaluateExpression(item, input, parameters)));
  if ("any" in expression) return (expression.any as Expression[]).some((item) => Boolean(evaluateExpression(item, input, parameters)));
  if ("not" in expression) return !Boolean(evaluateExpression(expression.not as Expression, input, parameters));
  if ("var" in expression) return input[String(expression.var)];
  for (const operator of ["eq", "gt", "gte"] as const) {
    if (operator in expression) {
      const [left, right] = (expression[operator] as unknown[]).map((item) => operand(item, input, parameters));
      if (operator === "eq") return left === right;
      if (operator === "gt") return Number(left) > Number(right);
      return Number(left) >= Number(right);
    }
  }
  throw new Error("unsupported_rule_expression");
}

export function evaluateRule(rule: RuleContract, input: Record<string, unknown>): RuleEvaluation {
  if (rule.requiredEvidence.some((field) => input[field] === undefined)) return { status: "insufficient", reasons: [], conditionKey: null };
  const keyParts = rule.naturalKey.map((field) => String(input[field]));
  if (keyParts.some((value) => value === "undefined" || value === "null")) return { status: "insufficient", reasons: [], conditionKey: null };
  const triggered = Boolean(evaluateExpression(rule.predicate, input, rule.parameters));
  return {
    status: triggered ? "triggered" : "clear",
    reasons: triggered ? rule.reasonRules.filter((reason) => Boolean(evaluateExpression(reason.when, input, rule.parameters))).map((reason) => reason.code) : [],
    conditionKey: `${rule.code}:v1:${keyParts.join(":")}`,
  };
}

function stableEvidence(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableEvidence);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key]) => key !== "elapsedMinutes" && key !== "declaredAgeMinutes")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => [key, stableEvidence(item)]));
}

function jsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); }
  catch { return value; }
}

function evidenceFingerprint(status: string, reasons: unknown, evidence: unknown) {
  return JSON.stringify({ status, reasons: stableEvidence(jsonValue(reasons)), evidence: stableEvidence(jsonValue(evidence)) });
}

export interface IncidentContext {
  plantId: number;
  workOrderId?: string;
  workOrderCode?: string;
  machineCode?: string;
  operationName?: string;
  shiftName?: string;
  responsibleName?: string;
}

export interface IncidentChange {
  cursor: number;
  eventId: string;
  eventType: "incident.opened" | "incident.updated" | "incident.resolved";
  incidentId: string;
  lifecycle: IncidentLifecycle;
  plantId: number;
}

const presentation: Record<SupportedRuleCode, { label: string; title: string; summary: string }> = {
  A02: { label: "Alerta", title: "Material reservado sin recepción", summary: "El material de la OT continúa en tránsito después de 30 minutos." },
  A03: { label: "Alerta", title: "OT activa sin primer consumo", summary: "La OT lleva al menos 15 minutos activa sin consumo declarado." },
  A05: { label: "Error", title: "Bobina pendiente de pesar o mover", summary: "La bobina declarada requiere completar su pesaje o movimiento." },
};

export class IncidentService {
  constructor(private readonly database: DatabaseRuntime, private readonly publish: (change: IncidentChange) => void = () => undefined) {}

  async reconcileHealthyCycle(input: {
    rule: RuleContract;
    rows: Record<string, unknown>[];
    contextFor: (row: Record<string, unknown>) => IncidentContext;
    cycleId: string;
    observedAt: Date;
  }): Promise<void> {
    const activeKeys = new Set<string>();
    for (const row of input.rows) {
      const evaluation = evaluateRule(input.rule, row);
      if (evaluation.status === "triggered" && evaluation.conditionKey) activeKeys.add(evaluation.conditionKey);
      await this.apply({ rule: input.rule, evidence: row, context: input.contextFor(row), cycleId: input.cycleId, observedAt: input.observedAt });
    }
    const open = await this.database.queryAll("SELECT id,condition_key,plant_id FROM monitor_incident WHERE rule_code=$1 AND lifecycle='open'", [input.rule.code]);
    for (const incident of open) {
      if (!activeKeys.has(String(incident.condition_key))) {
        await this.resolveAbsent(String(incident.id), Number(incident.plant_id), input.cycleId, input.observedAt);
      }
    }
  }

  async apply(input: {
    rule: RuleContract;
    evidence: Record<string, unknown>;
    context: IncidentContext;
    cycleId?: string;
    observedAt?: Date;
  }): Promise<IncidentChange | null> {
    const evaluated = evaluateRule(input.rule, input.evidence);
    if (evaluated.status === "insufficient" || !evaluated.conditionKey) return null;
    const observedAt = (input.observedAt ?? new Date()).toISOString();
    const change = await this.database.transaction(async (transaction) => {
      const open = await transaction.queryOne(
        `SELECT i.id,i.lifecycle,i.reasons,i.work_order_id AS "workOrderId",i.work_order_code AS "workOrderCode",
          i.machine_code AS "machineCode",i.operation_name AS "operationName",i.shift_name AS "shiftName",i.responsible_name AS "responsibleName",
          (SELECT status FROM monitor_incident_evidence e WHERE e.incident_id=i.id ORDER BY observed_at DESC LIMIT 1) AS "lastEvidenceStatus",
          (SELECT reasons FROM monitor_incident_evidence e WHERE e.incident_id=i.id ORDER BY observed_at DESC LIMIT 1) AS "lastEvidenceReasons",
          (SELECT evidence FROM monitor_incident_evidence e WHERE e.incident_id=i.id ORDER BY observed_at DESC LIMIT 1) AS "lastEvidence"
        FROM monitor_incident i WHERE rule_code=$1 AND condition_key=$2 AND lifecycle='open'`,
        [input.rule.code, evaluated.conditionKey],
      );
      if (evaluated.status === "clear") {
        if (!open.id) return null;
        await transaction.execute(`UPDATE monitor_incident SET lifecycle='resolved', updated_at=$2, resolved_at=$2,
          resolution_reason='condition_cleared' WHERE id=$1`, [open.id, observedAt]);
        await this.addEvidence(transaction, String(open.id), input, evaluated, observedAt);
        await this.addTransition(transaction, String(open.id), "open", "resolved", "condition_cleared", input.cycleId, observedAt);
        return this.addChangeEvent(transaction, String(open.id), "incident.resolved", "resolved", input.context.plantId, observedAt);
      }
      const details = presentation[input.rule.code];
      if (open.id) {
        const contextChanged = ([
          [open.workOrderId, input.context.workOrderId], [open.workOrderCode, input.context.workOrderCode],
          [open.machineCode, input.context.machineCode], [open.operationName, input.context.operationName],
          [open.shiftName, input.context.shiftName], [open.responsibleName, input.context.responsibleName],
        ] as Array<[unknown, unknown]>).some(([current, next]) => !current && Boolean(next));
        const evidenceChanged = evidenceFingerprint(String(open.lastEvidenceStatus), open.lastEvidenceReasons, open.lastEvidence)
          !== evidenceFingerprint(evaluated.status, evaluated.reasons, input.evidence);
        if (!contextChanged && !evidenceChanged) return null;
        await transaction.execute(`UPDATE monitor_incident SET updated_at=$2, reasons=$3::jsonb, summary=$4,
          work_order_id=COALESCE(work_order_id,$5),work_order_code=COALESCE(work_order_code,$6),machine_code=COALESCE(machine_code,$7),
          operation_name=COALESCE(operation_name,$8),shift_name=COALESCE(shift_name,$9),responsible_name=COALESCE(responsible_name,$10),
          correlation_key=COALESCE(correlation_key,$11) WHERE id=$1`, [open.id, observedAt, JSON.stringify(evaluated.reasons), details.summary,
          input.context.workOrderId ?? null, input.context.workOrderCode ?? null, input.context.machineCode ?? null,
          input.context.operationName ?? null, input.context.shiftName ?? null, input.context.responsibleName ?? null,
          input.context.workOrderId ? `work-order:${input.context.workOrderId}` : null]);
        await this.addEvidence(transaction, String(open.id), input, evaluated, observedAt);
        return this.addChangeEvent(transaction, String(open.id), "incident.updated", "open", input.context.plantId, observedAt);
      }
      const occurrenceRow = await transaction.queryOne(`SELECT COALESCE(MAX(occurrence),0)::int + 1 AS occurrence
        FROM monitor_incident WHERE rule_code=$1 AND condition_key=$2`, [input.rule.code, evaluated.conditionKey]);
      const incident = await transaction.queryOne(`INSERT INTO monitor_incident
        (rule_code,condition_key,occurrence,lifecycle,label,title,summary,plant_id,work_order_id,work_order_code,machine_code,
         operation_name,shift_name,responsible_name,correlation_key,reasons,opened_at,updated_at)
        VALUES ($1,$2,$3,'open',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,$16) RETURNING id`, [
        input.rule.code, evaluated.conditionKey, Number(occurrenceRow.occurrence), details.label, details.title, details.summary,
        input.context.plantId, input.context.workOrderId ?? null, input.context.workOrderCode ?? null, input.context.machineCode ?? null,
        input.context.operationName ?? null, input.context.shiftName ?? null, input.context.responsibleName ?? null,
        input.context.workOrderId ? `work-order:${input.context.workOrderId}` : null, JSON.stringify(evaluated.reasons), observedAt,
      ]);
      const incidentId = String(incident.id);
      await this.addEvidence(transaction, incidentId, input, evaluated, observedAt);
      await this.addTransition(transaction, incidentId, null, "open", "condition_triggered", input.cycleId, observedAt);
      return this.addChangeEvent(transaction, incidentId, "incident.opened", "open", input.context.plantId, observedAt);
    });
    if (change) this.publish(change);
    return change;
  }

  async list(filters: { plantIds: number[]; status?: string; operation?: string; search?: string }): Promise<Record<string, unknown>[]> {
    const conditions = ["plant_id = ANY($1::bigint[])"];
    const parameters: unknown[] = [filters.plantIds];
    const add = (sql: string, value: unknown) => { parameters.push(value); conditions.push(sql.replace("?", `$${parameters.length}`)); };
    if (filters.status && filters.status !== "all") add("lifecycle=?", filters.status);
    if (filters.operation && filters.operation !== "all") add("operation_name=?", filters.operation);
    if (filters.search) add(`(title ILIKE '%' || ? || '%' OR rule_code ILIKE '%' || ? || '%' OR work_order_code ILIKE '%' || ? || '%' OR machine_code ILIKE '%' || ? || '%' OR responsible_name ILIKE '%' || ? || '%')`, filters.search);
    // Search has five placeholders, so construct it separately to keep parameters correct.
    if (filters.search) {
      conditions.pop(); parameters.pop(); parameters.push(filters.search);
      const p = `$${parameters.length}`;
      conditions.push(`(title ILIKE '%' || ${p} || '%' OR rule_code ILIKE '%' || ${p} || '%' OR work_order_code ILIKE '%' || ${p} || '%' OR machine_code ILIKE '%' || ${p} || '%' OR responsible_name ILIKE '%' || ${p} || '%')`);
    }
    return this.database.queryAll(`SELECT id, rule_code AS "ruleCode", lifecycle, label, title, summary, plant_id AS "plantId",
      work_order_id AS "workOrderId", work_order_code AS "workOrderCode", machine_code AS "machineCode", operation_name AS "operationName",
      shift_name AS "shiftName", responsible_name AS "responsibleName", reasons, opened_at AS "openedAt", updated_at AS "updatedAt",
      resolved_at AS "resolvedAt", occurrence FROM monitor_incident WHERE ${conditions.join(" AND ")} ORDER BY opened_at DESC`, parameters);
  }

  async detail(id: string, plantIds: number[]): Promise<Record<string, unknown> | null> {
    const incident = await this.database.queryOne(`SELECT id, rule_code AS "ruleCode", lifecycle, label, title, summary,
      work_order_id AS "workOrderId", work_order_code AS "workOrderCode", machine_code AS "machineCode", operation_name AS "operationName",
      shift_name AS "shiftName", responsible_name AS "responsibleName", reasons, opened_at AS "openedAt", updated_at AS "updatedAt",
      resolved_at AS "resolvedAt", occurrence, correlation_key AS "correlationKey" FROM monitor_incident
      WHERE id=$1 AND plant_id=ANY($2::bigint[])`, [id, plantIds]);
    if (!incident.id) return null;
    const evidence = await this.database.queryAll(`SELECT id,status,reasons,evidence,observed_at AS "observedAt"
      FROM monitor_incident_evidence WHERE incident_id=$1 ORDER BY observed_at DESC`, [id]);
    const transitions = await this.database.queryAll(`SELECT from_state AS "fromState",to_state AS "toState",reason,occurred_at AS "occurredAt"
      FROM monitor_incident_transition WHERE incident_id=$1 ORDER BY occurred_at`, [id]);
    const related = incident.correlationKey ? await this.database.queryAll(`SELECT id,rule_code AS "ruleCode",title,lifecycle
      FROM monitor_incident WHERE correlation_key=$1 AND id<>$2 ORDER BY opened_at DESC`, [incident.correlationKey, id]) : [];
    return { ...incident, evidence, transitions, related };
  }

  async changesAfter(cursor: number, plantIds: number[]): Promise<Record<string, unknown>[]> {
    return this.database.queryAll(`SELECT cursor,event_id AS "eventId",event_type AS "eventType",payload,occurred_at AS "occurredAt"
      FROM monitor_change_event WHERE cursor>$1 AND scope_type='plant' AND scope_id=ANY($2::text[]) ORDER BY cursor LIMIT 200`,
      [cursor, plantIds.map(String)]);
  }

  private async addEvidence(transaction: DatabaseExecutor, incidentId: string, input: { evidence: Record<string, unknown>; cycleId?: string }, evaluation: RuleEvaluation, observedAt: string) {
    await transaction.execute(`INSERT INTO monitor_incident_evidence (incident_id,cycle_id,status,reasons,evidence,observed_at)
      VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6)`, [incidentId, input.cycleId ?? null, evaluation.status, JSON.stringify(evaluation.reasons), JSON.stringify(input.evidence), observedAt]);
  }

  private async resolveAbsent(incidentId: string, plantId: number, cycleId: string, observedAt: Date): Promise<void> {
    const timestamp = observedAt.toISOString();
    const change = await this.database.transaction(async (transaction) => {
      const current = await transaction.queryOne("SELECT lifecycle FROM monitor_incident WHERE id=$1", [incidentId]);
      if (current.lifecycle !== "open") return null;
      await transaction.execute("UPDATE monitor_incident SET lifecycle='resolved',updated_at=$2,resolved_at=$2,resolution_reason='absent_from_healthy_cycle' WHERE id=$1", [incidentId, timestamp]);
      await transaction.execute(`INSERT INTO monitor_incident_evidence (incident_id,cycle_id,status,reasons,evidence,observed_at)
        VALUES ($1,$2,'clear','[]'::jsonb,$3::jsonb,$4)`, [incidentId, cycleId, JSON.stringify({ absentFromCompleteHealthyCycle: true }), timestamp]);
      await this.addTransition(transaction, incidentId, "open", "resolved", "absent_from_healthy_cycle", cycleId, timestamp);
      return this.addChangeEvent(transaction, incidentId, "incident.resolved", "resolved", plantId, timestamp);
    });
    if (change) this.publish(change);
  }

  private async addTransition(transaction: DatabaseExecutor, incidentId: string, from: IncidentLifecycle | null, to: IncidentLifecycle, reason: string, cycleId: string | undefined, observedAt: string) {
    await transaction.execute(`INSERT INTO monitor_incident_transition (incident_id,from_state,to_state,reason,cycle_id,occurred_at)
      VALUES ($1,$2,$3,$4,$5,$6)`, [incidentId, from, to, reason, cycleId ?? null, observedAt]);
  }

  private async addChangeEvent(transaction: DatabaseExecutor, incidentId: string, eventType: IncidentChange["eventType"], lifecycle: IncidentLifecycle, plantId: number, observedAt: string): Promise<IncidentChange> {
    const event = await transaction.queryOne(`INSERT INTO monitor_change_event (event_type,scope_type,scope_id,payload,occurred_at)
      VALUES ($1,'plant',$2,$3::jsonb,$4) RETURNING cursor,event_id`, [eventType, String(plantId), JSON.stringify({ incidentId, lifecycle }), observedAt]);
    return { cursor: Number(event.cursor), eventId: String(event.event_id), eventType, incidentId, lifecycle, plantId };
  }
}
