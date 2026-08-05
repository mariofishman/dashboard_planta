export const B03_QUERY_ID = "b03-unexplained-machine-idle";
export const B03_KEY_SCHEMA_VERSION = 1;
export const B03_IDLE_THRESHOLD_MINUTES = 30;

export type B03PlanState = "production_expected" | "suspended" | "no_production";
export type B03WorkOrderState = "running" | "paused";

export interface B03PlanExpectation {
  planVersionId: string;
  state: B03PlanState;
}

export interface B03ActiveWorkOrder {
  workOrderId: number;
  state: B03WorkOrderState;
}

export interface B03LaboratorySnapshot {
  equipmentId: number;
  machineCode: string;
  scheduleWindowId: string;
  planExpectation: B03PlanExpectation | undefined;
  activeWorkOrder: B03ActiveWorkOrder | null | undefined;
  idleStartedAt: string | null | undefined;
}

export type B03LaboratoryCycle =
  | { status: "healthy"; snapshot: B03LaboratorySnapshot }
  | { status: "failed"; equipmentId: number; scheduleWindowId: string; errorCode: string };

export type B03LaboratoryDisposition = "triggered" | "clear" | "insufficient" | "failed_preserved";
export type B03LaboratoryLifecycle = "open" | "resolved" | "closed_without_resolution";

export type B03ResolutionEvidence =
  | { type: "active_work_order"; workOrder: B03ActiveWorkOrder }
  | { type: "approved_plan_state"; expectation: B03PlanExpectation }
  | { type: "idle_interval_below_threshold"; idleStartedAt: string };

export interface B03LaboratoryIncident {
  incidentId: string;
  conditionKey: string;
  occurrence: number;
  lifecycle: B03LaboratoryLifecycle;
  openedAt: string;
  updatedAt: string;
  equipmentId: number;
  machineCode: string;
  scheduleWindowId: string;
  planVersionId: string;
  idleStartedAt: string;
  unexplainedIdleMinutes: number;
  reasons: string[];
  resolutionEvidence: B03ResolutionEvidence | null;
  administrativeClosure: {
    actorReference: string;
    reason: string;
    comment: string;
    closedAt: string;
    unexplainedIdleMinutes: number;
  } | null;
}

export interface B03LaboratoryResult {
  disposition: B03LaboratoryDisposition;
  reasons: string[];
  missingEvidence: string[];
  incident: B03LaboratoryIncident | null;
}

function laboratoryKey(equipmentId: number, scheduleWindowId: string): string {
  return `${equipmentId}:${scheduleWindowId}`;
}

function conditionKey(equipmentId: number, scheduleWindowId: string): string {
  return `B03:${B03_QUERY_ID}:${B03_KEY_SCHEMA_VERSION}:equipmentId=${equipmentId}|scheduleWindowId=${JSON.stringify(scheduleWindowId)}`;
}

function validTimestamp(value: string): boolean {
  return value.trim().length > 0 && Number.isFinite(Date.parse(value));
}

function validPlanExpectation(value: B03PlanExpectation): boolean {
  return value.planVersionId.trim().length > 0
    && ["production_expected", "suspended", "no_production"].includes(value.state);
}

function validWorkOrder(value: B03ActiveWorkOrder): boolean {
  return Number.isInteger(value.workOrderId)
    && value.workOrderId > 0
    && ["running", "paused"].includes(value.state);
}

function copyIncident(incident: B03LaboratoryIncident | undefined): B03LaboratoryIncident | null {
  return incident ? structuredClone(incident) : null;
}

/**
 * Pure Phase 7 preparation laboratory. It owns no source database connection,
 * scheduler, Monitor incident record, routing delivery, Dashboard state, or Chat state.
 */
export class B03StandaloneLaboratory {
  private readonly incidents = new Map<string, B03LaboratoryIncident>();
  private readonly occurrenceByCondition = new Map<string, number>();
  private readonly suppressed = new Set<string>();

  constructor(private readonly now: () => string) {}

  reset(): void {
    this.incidents.clear();
    this.occurrenceByCondition.clear();
    this.suppressed.clear();
  }

  inspect(equipmentId: number, scheduleWindowId: string): B03LaboratoryIncident | null {
    return copyIncident(this.incidents.get(laboratoryKey(equipmentId, scheduleWindowId)));
  }

  evaluate(cycle: B03LaboratoryCycle): B03LaboratoryResult {
    if (cycle.status === "failed") {
      return {
        disposition: "failed_preserved",
        reasons: [],
        missingEvidence: [],
        incident: this.inspect(cycle.equipmentId, cycle.scheduleWindowId),
      };
    }

    const snapshot = cycle.snapshot;
    const key = laboratoryKey(snapshot.equipmentId, snapshot.scheduleWindowId);
    const existing = this.incidents.get(key);
    const missingEvidence: string[] = [];

    if (!Number.isInteger(snapshot.equipmentId) || snapshot.equipmentId <= 0) missingEvidence.push("validEquipmentId");
    if (!snapshot.machineCode.trim()) missingEvidence.push("machineCode");
    if (!snapshot.scheduleWindowId.trim()) missingEvidence.push("scheduleWindowId");
    if (snapshot.planExpectation === undefined) missingEvidence.push("planExpectation");
    else if (!validPlanExpectation(snapshot.planExpectation)) missingEvidence.push("validPlanExpectation");
    if (snapshot.activeWorkOrder === undefined) missingEvidence.push("activeWorkOrder");
    else if (snapshot.activeWorkOrder !== null && !validWorkOrder(snapshot.activeWorkOrder)) missingEvidence.push("validActiveWorkOrder");
    if (snapshot.idleStartedAt === undefined) missingEvidence.push("idleStartedAt");

    const requiresIdleTimestamp = snapshot.planExpectation?.state === "production_expected"
      && snapshot.activeWorkOrder === null;
    if (requiresIdleTimestamp && (
      snapshot.idleStartedAt === undefined
      || snapshot.idleStartedAt === null
      || !validTimestamp(snapshot.idleStartedAt)
    )) {
      missingEvidence.push("validIdleStartedAt");
    } else if (snapshot.idleStartedAt !== undefined && snapshot.idleStartedAt !== null && !validTimestamp(snapshot.idleStartedAt)) {
      missingEvidence.push("validIdleStartedAt");
    }

    if (missingEvidence.length > 0) {
      return {
        disposition: "insufficient",
        reasons: [],
        missingEvidence: [...new Set(missingEvidence)],
        incident: copyIncident(existing),
      };
    }

    const observedAt = this.now();
    if (!validTimestamp(observedAt)) throw new Error("B03 laboratory clock must return a valid timestamp");

    const planExpectation = snapshot.planExpectation!;
    const planExcludesProduction = planExpectation.state !== "production_expected";
    const hasActiveWorkOrder = snapshot.activeWorkOrder !== null;

    if (planExcludesProduction || hasActiveWorkOrder) {
      this.suppressed.delete(key);
      if (existing?.lifecycle === "open") {
        existing.lifecycle = "resolved";
        existing.updatedAt = observedAt;
        existing.resolutionEvidence = hasActiveWorkOrder
          ? { type: "active_work_order", workOrder: structuredClone(snapshot.activeWorkOrder!) }
          : { type: "approved_plan_state", expectation: structuredClone(planExpectation) };
      }
      return { disposition: "clear", reasons: [], missingEvidence: [], incident: copyIncident(existing) };
    }

    const idleStartedAt = snapshot.idleStartedAt!;
    const elapsedMilliseconds = Date.parse(observedAt) - Date.parse(idleStartedAt);
    if (elapsedMilliseconds < 0) {
      return {
        disposition: "insufficient",
        reasons: [],
        missingEvidence: ["nonFutureIdleStartedAt"],
        incident: copyIncident(existing),
      };
    }
    const idleMinutes = elapsedMilliseconds / 60_000;
    const thresholdBreached = idleMinutes > B03_IDLE_THRESHOLD_MINUTES;

    if (!thresholdBreached) {
      this.suppressed.delete(key);
      if (existing?.lifecycle === "open") {
        existing.lifecycle = "resolved";
        existing.updatedAt = observedAt;
        existing.resolutionEvidence = { type: "idle_interval_below_threshold", idleStartedAt };
      }
      return { disposition: "clear", reasons: [], missingEvidence: [], incident: copyIncident(existing) };
    }

    if (this.suppressed.has(key)) {
      return {
        disposition: "triggered",
        reasons: ["unexplained_machine_idle"],
        missingEvidence: [],
        incident: copyIncident(existing),
      };
    }

    if (existing?.lifecycle === "open") {
      existing.updatedAt = observedAt;
      existing.unexplainedIdleMinutes = idleMinutes;
      return {
        disposition: "triggered",
        reasons: ["unexplained_machine_idle"],
        missingEvidence: [],
        incident: copyIncident(existing),
      };
    }

    const occurrence = (this.occurrenceByCondition.get(key) ?? 0) + 1;
    this.occurrenceByCondition.set(key, occurrence);
    const incident: B03LaboratoryIncident = {
      incidentId: `B03-LAB-${snapshot.equipmentId}-${snapshot.scheduleWindowId}-${String(occurrence).padStart(2, "0")}`,
      conditionKey: conditionKey(snapshot.equipmentId, snapshot.scheduleWindowId),
      occurrence,
      lifecycle: "open",
      openedAt: observedAt,
      updatedAt: observedAt,
      equipmentId: snapshot.equipmentId,
      machineCode: snapshot.machineCode,
      scheduleWindowId: snapshot.scheduleWindowId,
      planVersionId: planExpectation.planVersionId,
      idleStartedAt,
      unexplainedIdleMinutes: idleMinutes,
      reasons: ["unexplained_machine_idle"],
      resolutionEvidence: null,
      administrativeClosure: null,
    };
    this.incidents.set(key, incident);
    return {
      disposition: "triggered",
      reasons: ["unexplained_machine_idle"],
      missingEvidence: [],
      incident: copyIncident(incident),
    };
  }

  closeWithoutResolution(input: {
    equipmentId: number;
    scheduleWindowId: string;
    actorReference: string;
    reason: string;
    comment: string;
  }): B03LaboratoryIncident {
    const key = laboratoryKey(input.equipmentId, input.scheduleWindowId);
    const incident = this.incidents.get(key);
    if (!incident || incident.lifecycle !== "open") throw new Error("B03 open incident is required");
    if (!input.actorReference.trim() || !input.reason.trim() || !input.comment.trim()) {
      throw new Error("B03 administrative closure requires actor, reason, and comment");
    }

    const closedAt = this.now();
    incident.lifecycle = "closed_without_resolution";
    incident.updatedAt = closedAt;
    incident.administrativeClosure = {
      actorReference: input.actorReference,
      reason: input.reason,
      comment: input.comment,
      closedAt,
      unexplainedIdleMinutes: incident.unexplainedIdleMinutes,
    };
    this.suppressed.add(key);
    return structuredClone(incident);
  }
}
