import type { DatabaseRuntime } from "@monitor/database";

export type RoutingRole =
  | "factory_manager" | "operation_shift_supervisor" | "technical_leader" | "machine_operator"
  | "material_planner" | "planner" | "warehouse_dispatcher" | "warehouse_supervisor"
  | "process_operator" | "process_supervisor";

const positionForRole: Record<RoutingRole, string> = {
  factory_manager: "Gerente de fábrica",
  operation_shift_supervisor: "Supervisor de turno de operación",
  technical_leader: "Líder técnico",
  machine_operator: "Operador de máquina",
  material_planner: "Planificador de materiales",
  planner: "Planificador",
  warehouse_dispatcher: "Despachador de almacén",
  warehouse_supervisor: "Supervisor de almacén",
  process_operator: "Operador de proceso",
  process_supervisor: "Supervisor de proceso",
};

const machineExecutionCodes = new Set([
  "A02", "A03", "A04", "A05", "A06", "A07", "B01", "B02", "B03", "C01", "C02", "C06",
  "D01", "D02", "D03", "D04", "E02", "E03", "E04", "E05",
]);

const includesAny = (reasons: string[], values: string[]) => values.some((value) => reasons.includes(value));

/** Approved deterministic catalog mapping. Names are runtime roster results, never routing rules. */
export function requiredRolesFor(code: string, reasons: string[] = [], evidence: Record<string, unknown> = {}): RoutingRole[] {
  const roles = new Set<RoutingRole>(["factory_manager", "operation_shift_supervisor", "technical_leader"]);
  if (machineExecutionCodes.has(code)) roles.add("machine_operator");
  switch (code) {
    case "A01":
      if (reasons.includes("reserved_not_dispatched")) roles.add("warehouse_dispatcher");
      else roles.add("material_planner");
      roles.delete("machine_operator");
      break;
    case "A02":
      roles.add("warehouse_dispatcher"); roles.add("warehouse_supervisor"); roles.add("machine_operator");
      break;
    case "A05":
      roles.add("process_operator");
      if (evidence.reelKind === "produced" || evidence.sourceWorkOrderFinished === true) roles.add("process_supervisor");
      if (evidence.reelKind === "remnant") { roles.add("warehouse_dispatcher"); roles.add("warehouse_supervisor"); }
      break;
    case "A06":
      if (includesAny(reasons, ["not_weighed", "declared_waste_not_weighed", "missing_weight"])) {
        roles.add("process_operator"); roles.add("process_supervisor");
      }
      break;
    case "B02":
      if (!includesAny(reasons, ["nothing_running_no_pause", "machine_state_missing"])) roles.add("planner");
      break;
    case "B03":
      if (includesAny(reasons, ["valid_pause", "plan_expects_activity"])) roles.add("planner");
      break;
    case "C01": roles.add("process_operator"); break;
    case "C02":
      if (includesAny(reasons, ["weight", "scale", "physical_weight"])) roles.add("process_operator");
      break;
    case "D02":
      if (includesAny(reasons, ["reservation_quantity", "incorrect_reservation", "reel_selection"])) roles.add("material_planner");
      if (includesAny(reasons, ["delivery", "return"])) { roles.add("warehouse_dispatcher"); roles.add("warehouse_supervisor"); }
      break;
    case "D03":
      if (includesAny(reasons, ["weight", "scale", "weighing_evidence"])) roles.add("process_operator");
      break;
    case "D04":
      if (includesAny(reasons, ["remnant_not_weighed", "remnant_not_moved"])) roles.add("process_operator");
      break;
    case "E01":
      roles.delete("machine_operator"); roles.add("material_planner"); roles.add("warehouse_dispatcher");
      break;
    case "E03":
      if (evidence.processOperatorName || evidence.processInvolved === true) roles.add("process_operator");
      break;
  }
  return [...roles];
}

interface RosterRow {
  id: string; person: string; position: string; operations: string[]; warehouseType: string | null; group: string | null;
}

interface RoutingRecipient {
  key: string;
  name: string;
  role: RoutingRole | "recorded_actor";
  source: "roster" | "erp_evidence";
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") return JSON.parse(value) as Record<string, unknown>;
  return value as Record<string, unknown>;
}

function jsonArray(value: unknown): string[] {
  if (!value) return [];
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  return Array.isArray(parsed) ? parsed.map(String) : [];
}

function dateKey(value: unknown): string { return new Date(String(value)).toISOString().slice(0, 10); }
function dayNumber(value: string): number { return Math.floor(Date.parse(`${value}T12:00:00Z`) / 86_400_000); }
function mod(value: number, by: number) { return ((value % by) + by) % by; }

const defaultRoutingPattern: Record<string, unknown> = {
  effectiveFrom: "2026-07-25",
  schedules: [
    { id: "day", name: "Día" }, { id: "night", name: "Noche" }, { id: "rest", name: "Descanso" },
  ],
  groups: [
    { id: "A", anchorScheduleId: "rest", daysPerPhase: 2 },
    { id: "B", anchorScheduleId: "day", daysPerPhase: 2 },
    { id: "C", anchorScheduleId: "night", daysPerPhase: 2 },
  ],
};

function groupsForShift(pattern: Record<string, unknown>, incidentDate: string, shiftName: string | null, adjustments: Array<Record<string, unknown>> = []): string[] {
  if (!shiftName) return [];
  const schedules = Array.isArray(pattern.schedules) ? pattern.schedules as Array<Record<string, unknown>> : [];
  const groups = Array.isArray(pattern.groups) ? pattern.groups as Array<Record<string, unknown>> : [];
  const shift = shiftName.trim().toLocaleLowerCase("es-PE");
  return groups.filter((group) => {
    const days = Math.max(1, Number(group.daysPerPhase ?? 1));
    const anchor = schedules.findIndex((schedule) => schedule.id === group.anchorScheduleId);
    const shiftDays = adjustments.filter((item) => {
      const effective = item.createsGap === true ? dayNumber(String(item.date)) + Number(item.shiftDays) : dayNumber(String(item.date));
      return effective <= dayNumber(incidentDate);
    }).reduce((total, item) => total + Number(item.shiftDays), 0);
    const elapsed = dayNumber(incidentDate) - dayNumber(String(pattern.effectiveFrom)) - shiftDays;
    const schedule = schedules[mod(Math.max(anchor, 0) + Math.floor(elapsed / days), schedules.length)];
    return String(schedule?.name ?? "").trim().toLocaleLowerCase("es-PE") === shift;
  }).map((group) => String(group.id));
}

export class RoutingService {
  constructor(private readonly database: DatabaseRuntime) {}

  async routeIncident(incidentId: string): Promise<Record<string, unknown> | null> {
    const incident = await this.database.queryOne(`SELECT id,rule_code,plant_id,operation_name,shift_name,responsible_name,reasons,opened_at,updated_at
      FROM monitor_incident WHERE id=$1`, [incidentId]);
    if (!incident.id) return null;
    const evidenceRow = await this.database.queryOne("SELECT evidence FROM monitor_incident_evidence WHERE incident_id=$1 ORDER BY observed_at DESC LIMIT 1", [incidentId]);
    const evidence = jsonObject(evidenceRow.evidence);
    const reasons = jsonArray(incident.reasons);
    const roles = requiredRolesFor(String(incident.rule_code), reasons, evidence);
    const plantId = Number(incident.plant_id);
    const operation = incident.operation_name ? String(incident.operation_name) : null;
    const incidentDate = dateKey(incident.opened_at);
    const patternRow = operation ? await this.database.queryOne("SELECT revision,pattern FROM monitor_rotation_pattern WHERE plant_id=$1 AND operation_name=$2", [plantId, operation]) : {};
    const pattern = operation ? (patternRow.pattern ? jsonObject(patternRow.pattern) : defaultRoutingPattern) : null;
    const calendarRow = operation ? await this.database.queryOne("SELECT revision,adjustments FROM monitor_rotation_calendar_state WHERE plant_id=$1 AND operation_name=$2", [plantId, operation]) : {};
    const adjustments = calendarRow.adjustments ? (typeof calendarRow.adjustments === "string" ? JSON.parse(calendarRow.adjustments) : calendarRow.adjustments) as Array<Record<string, unknown>> : [];
    const activeGroups = pattern ? groupsForShift(pattern, incidentDate, incident.shift_name ? String(incident.shift_name) : null, adjustments) : [];
    const rosterRevision = await this.database.queryOne("SELECT revision FROM monitor_roster_revision WHERE plant_id=$1", [plantId]);
    const exceptionRevision = await this.database.queryOne("SELECT COALESCE(MAX(updated_at),'epoch') AS updated_at FROM monitor_rotation_exception WHERE plant_id=$1", [plantId]);
    const fingerprint = [incident.updated_at, rosterRevision.revision ?? 0, patternRow.revision ?? 0, calendarRow.revision ?? 0, exceptionRevision.updated_at].join("|");
    const prior = await this.database.queryOne("SELECT id,status,resolved_recipients AS recipients,diagnostics FROM monitor_routing_decision WHERE incident_id=$1 AND incident_fingerprint=$2", [incidentId, fingerprint]);
    if (prior.id) return { id: prior.id, status: prior.status, recipients: prior.recipients, diagnostics: prior.diagnostics, deduplicated: true };

    const rosterRows = await this.database.queryAll(`SELECT a.id,a.person_name,a.position,a.warehouse_type,a.worker_group,
      COALESCE(jsonb_agg(o.operation_name) FILTER (WHERE o.operation_name IS NOT NULL),'[]'::jsonb) AS operations
      FROM monitor_roster_assignment a LEFT JOIN monitor_roster_assignment_operation o ON o.assignment_id=a.id
      WHERE a.plant_id=$1 AND a.setup_complete=TRUE AND a.state='active' AND a.valid_from<=$2
        AND (a.valid_to IS NULL OR a.valid_to>=$2) GROUP BY a.id`, [plantId, incidentDate]);
    const roster: RosterRow[] = rosterRows.map((row) => ({ id: String(row.id), person: String(row.person_name), position: String(row.position),
      operations: jsonArray(row.operations), warehouseType: row.warehouse_type ? String(row.warehouse_type) : null,
      group: row.worker_group ? String(row.worker_group) : null }));
    const exceptionRows = operation ? await this.database.queryAll(`SELECT assignment_id,kind,target FROM monitor_rotation_exception
      WHERE plant_id=$1 AND operation_name=$2 AND valid_from<=$3 AND valid_to>=$3`, [plantId, operation, incidentDate]) : [];
    const exceptionByAssignment = new Map(exceptionRows.map((row) => [String(row.assignment_id), { kind: String(row.kind), target: jsonObject(row.target) }]));
    const assignmentMatchesShift = (row: RosterRow) => {
      const exception = exceptionByAssignment.get(row.id);
      if (!exception) return activeGroups.length === 1 && row.group === activeGroups[0];
      if (exception.kind === "group") return activeGroups.length === 1 && exception.target.groupId === activeGroups[0];
      const scheduleName = exception.kind === "custom" ? exception.target.customScheduleName : pattern
        ? (pattern.schedules as Array<Record<string, unknown>>).find((schedule) => schedule.id === exception.target.scheduleId)?.name
        : null;
      return typeof scheduleName === "string" && typeof incident.shift_name === "string"
        && scheduleName.trim().toLocaleLowerCase("es-PE") === incident.shift_name.trim().toLocaleLowerCase("es-PE");
    };
    const recipients: RoutingRecipient[] = [];
    const diagnostics: Array<{ code: "missing_assignment" | "conflicting_assignments" | "unknown_shift_group"; role?: RoutingRole; detail: string }> = [];

    if (roles.some((role) => ["operation_shift_supervisor", "machine_operator", "warehouse_dispatcher", "warehouse_supervisor", "process_operator", "process_supervisor"].includes(role)) && activeGroups.length !== 1) {
      diagnostics.push({ code: "unknown_shift_group", detail: activeGroups.length ? `El turno coincide con ${activeGroups.length} grupos.` : "No se pudo determinar el grupo activo del turno." });
    }
    for (const role of roles) {
      let candidates = roster.filter((row) => row.position === positionForRole[role]);
      if (["operation_shift_supervisor", "technical_leader", "machine_operator"].includes(role)) {
        candidates = operation ? candidates.filter((row) => row.operations.includes(operation)) : [];
      }
      if (["operation_shift_supervisor", "machine_operator", "warehouse_dispatcher", "warehouse_supervisor", "process_operator", "process_supervisor"].includes(role)) {
        candidates = candidates.filter(assignmentMatchesShift);
      }
      if (role === "warehouse_dispatcher" || role === "warehouse_supervisor") {
        const warehouse = String(evidence.warehouseType ?? (String(incident.rule_code).startsWith("A") || String(incident.rule_code).startsWith("E") ? "Materias primas" : "Productos en proceso"));
        candidates = candidates.filter((row) => row.warehouseType === warehouse);
      }
      if (!candidates.length) diagnostics.push({ code: "missing_assignment", role, detail: `No hay una asignación vigente para ${positionForRole[role]}.` });
      if (candidates.length > 1) diagnostics.push({ code: "conflicting_assignments", role, detail: `Hay ${candidates.length} asignaciones vigentes para ${positionForRole[role]}.` });
      candidates.forEach((candidate) => recipients.push({ key: `assignment:${candidate.id}`, name: candidate.person, role, source: "roster" }));
    }

    const actorNames = new Set<string>();
    for (const key of ["actorName", "operatorName", "plannedOperatorName", "previousOperatorName", "currentOperatorName"]) {
      if (typeof evidence[key] === "string" && String(evidence[key]).trim()) actorNames.add(String(evidence[key]).trim());
    }
    if (typeof incident.responsible_name === "string" && incident.responsible_name.trim() && evidence.recordedActor === true) actorNames.add(incident.responsible_name.trim());
    actorNames.forEach((name) => recipients.push({ key: `actor:${name.normalize("NFC").toLocaleLowerCase("es-PE")}`, name, role: "recorded_actor", source: "erp_evidence" }));
    const recipientsByName = new Map<string, RoutingRecipient>();
    recipients.forEach((recipient) => {
      const name = recipient.name.normalize("NFC").trim().toLocaleLowerCase("es-PE");
      if (!recipientsByName.has(name) || recipient.source === "roster") recipientsByName.set(name, recipient);
    });
    const deduplicated = [...recipientsByName.values()];
    const status = diagnostics.some((item) => item.code === "conflicting_assignments") ? "conflict" : diagnostics.length ? "partial" : "complete";

    const decision = await this.database.queryOne(`INSERT INTO monitor_routing_decision
      (incident_id,incident_fingerprint,status,required_roles,resolved_recipients,diagnostics)
      VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb) RETURNING id`,
    [incidentId, fingerprint, status, JSON.stringify(roles), JSON.stringify(deduplicated), JSON.stringify(diagnostics)]);
    for (const recipient of deduplicated) {
      await this.database.execute(`INSERT INTO monitor_notification_delivery
        (incident_id,routing_decision_id,recipient_key,recipient_name,channel,state,attempt_count,sent_at)
        VALUES ($1,$2,$3,$4,'in_app','sent',1,now()) ON CONFLICT (incident_id,recipient_key,channel) DO NOTHING`,
      [incidentId, decision.id, recipient.key, recipient.name]);
    }
    if (diagnostics.length) {
      const administrators = await this.database.queryAll(`SELECT DISTINCT s.sys_user_id FROM monitor_identity_subject s
        JOIN monitor_identity_plant_scope p ON p.identity_id=s.id WHERE p.plant_id=$1 AND s.enabled=TRUE
        AND s.role IN ('MONITOR_ADMIN','FACTORY_MANAGER')`, [plantId]);
      const ids = administrators.length ? administrators.map((row) => Number(row.sys_user_id)) : [9000];
      for (const administratorId of ids) {
        await this.database.execute(`INSERT INTO monitor_admin_email_outbox
          (incident_id,routing_decision_id,administrator_sys_user_id,subject,body,state,attempt_count,sent_at)
          VALUES ($1,$2,$3,$4,$5,'sent',1,now()) ON CONFLICT (incident_id,administrator_sys_user_id) DO NOTHING`,
        [incidentId, decision.id, administratorId, `Monitor: asignación incompleta para ${incident.rule_code}`,
          diagnostics.map((item) => item.detail).join(" ")]);
      }
    }
    return { id: decision.id, status, recipients: deduplicated, diagnostics, deduplicated: false };
  }

  async markDeliveryFailed(incidentId: string, recipientKey: string, error: string) {
    await this.database.execute(`UPDATE monitor_notification_delivery SET state='failed',attempt_count=attempt_count+1,
      next_attempt_at=now(),last_error=$3,updated_at=now() WHERE incident_id=$1 AND recipient_key=$2`, [incidentId, recipientKey, error]);
  }

  async retryDue(limit = 100): Promise<number> {
    const rows = await this.database.queryAll(`SELECT id FROM monitor_notification_delivery WHERE state='failed'
      AND next_attempt_at<=now() AND attempt_count<4 ORDER BY next_attempt_at LIMIT $1`, [limit]);
    for (const row of rows) await this.database.execute(`UPDATE monitor_notification_delivery SET state='sent',attempt_count=attempt_count+1,
      next_attempt_at=NULL,last_error=NULL,sent_at=now(),updated_at=now() WHERE id=$1`, [row.id]);
    return rows.length;
  }

  async diagnostics(incidentId: string) {
    const decision = await this.database.queryOne(`SELECT id,status,required_roles AS "requiredRoles",resolved_recipients AS recipients,
      diagnostics,evaluated_at AS "evaluatedAt" FROM monitor_routing_decision WHERE incident_id=$1 ORDER BY evaluated_at DESC LIMIT 1`, [incidentId]);
    if (!decision.id) return null;
    const deliveries = await this.database.queryAll(`SELECT recipient_key AS "recipientKey",recipient_name AS "recipientName",channel,state,
      attempt_count AS "attemptCount",last_error AS "lastError",sent_at AS "sentAt" FROM monitor_notification_delivery WHERE incident_id=$1 ORDER BY recipient_key`, [incidentId]);
    return { ...decision, deliveries };
  }
}
