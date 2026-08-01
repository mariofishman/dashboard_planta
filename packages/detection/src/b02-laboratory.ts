export const B02_QUERY_ID = "b02-planned-start-missed";
export const B02_KEY_SCHEMA_VERSION = 1;

export type B02PlanUpdateOutcome = "rescheduled" | "removed" | "cancelled";

export interface B02ApprovedPlanUpdate {
  approvedAt: string;
  newPlanVersionId: number;
  outcome: B02PlanUpdateOutcome;
  newPlannedStartAt?: string;
}

export interface B02LaboratorySnapshot {
  workOrderId: number;
  planVersionId: number;
  machineId: string;
  plannedStartAt: string | undefined;
  actualStartedAt: string | null | undefined;
  approvedPlanUpdate: B02ApprovedPlanUpdate | null | undefined;
}

export type B02LaboratoryCycle =
  | { status: "healthy"; snapshot: B02LaboratorySnapshot }
  | { status: "failed"; workOrderId: number; planVersionId: number; errorCode: string };

export type B02LaboratoryDisposition = "triggered" | "clear" | "insufficient" | "failed_preserved";
export type B02LaboratoryLifecycle = "open" | "resolved" | "closed_without_resolution";

export type B02ResolutionEvidence =
  | { type: "work_order_started"; actualStartedAt: string }
  | { type: "approved_plan_update"; update: B02ApprovedPlanUpdate };

export interface B02LaboratoryIncident {
  incidentId: string;
  conditionKey: string;
  occurrence: number;
  lifecycle: B02LaboratoryLifecycle;
  openedAt: string;
  updatedAt: string;
  workOrderId: number;
  planVersionId: number;
  machineId: string;
  plannedStartAt: string;
  reasons: string[];
  resolutionEvidence: B02ResolutionEvidence | null;
  administrativeClosure: {
    actorReference: string;
    reason: string;
    comment: string;
    closedAt: string;
  } | null;
}

export interface B02LaboratoryResult {
  disposition: B02LaboratoryDisposition;
  reasons: string[];
  missingEvidence: string[];
  incident: B02LaboratoryIncident | null;
}

function laboratoryKey(workOrderId: number, planVersionId: number): string {
  return `${workOrderId}:${planVersionId}`;
}

function conditionKey(workOrderId: number, planVersionId: number): string {
  return `B02:${B02_QUERY_ID}:${B02_KEY_SCHEMA_VERSION}:workOrderId=${workOrderId}|planVersionId=${planVersionId}`;
}

function copyIncident(incident: B02LaboratoryIncident | undefined): B02LaboratoryIncident | null {
  return incident ? structuredClone(incident) : null;
}

function validTimestamp(value: string): boolean {
  return value.trim().length > 0 && Number.isFinite(Date.parse(value));
}

function validPlanUpdate(update: B02ApprovedPlanUpdate, supersededPlanVersionId: number): boolean {
  if (
    !validTimestamp(update.approvedAt)
    || !Number.isInteger(update.newPlanVersionId)
    || update.newPlanVersionId === supersededPlanVersionId
  ) return false;
  if (update.outcome !== "rescheduled") return update.newPlannedStartAt === undefined;
  return update.newPlannedStartAt !== undefined && validTimestamp(update.newPlannedStartAt);
}

/**
 * Pure Phase 7 preparation laboratory. It owns no source database connection,
 * scheduler, Monitor incident record, routing delivery, Dashboard state, or Chat state.
 */
export class B02StandaloneLaboratory {
  private readonly incidents = new Map<string, B02LaboratoryIncident>();
  private readonly occurrenceByCondition = new Map<string, number>();
  private readonly suppressed = new Set<string>();

  constructor(private readonly now: () => string) {}

  reset(): void {
    this.incidents.clear();
    this.occurrenceByCondition.clear();
    this.suppressed.clear();
  }

  inspect(workOrderId: number, planVersionId: number): B02LaboratoryIncident | null {
    return copyIncident(this.incidents.get(laboratoryKey(workOrderId, planVersionId)));
  }

  evaluate(cycle: B02LaboratoryCycle): B02LaboratoryResult {
    if (cycle.status === "failed") {
      return {
        disposition: "failed_preserved",
        reasons: [],
        missingEvidence: [],
        incident: this.inspect(cycle.workOrderId, cycle.planVersionId),
      };
    }

    const snapshot = cycle.snapshot;
    const key = laboratoryKey(snapshot.workOrderId, snapshot.planVersionId);
    const existing = this.incidents.get(key);
    const missingEvidence: string[] = [];
    if (snapshot.plannedStartAt === undefined || !validTimestamp(snapshot.plannedStartAt)) missingEvidence.push("plannedStartAt");
    if (snapshot.actualStartedAt === undefined) missingEvidence.push("actualStartedAt");
    if (snapshot.actualStartedAt !== undefined && snapshot.actualStartedAt !== null && !validTimestamp(snapshot.actualStartedAt)) missingEvidence.push("validActualStartedAt");
    if (snapshot.approvedPlanUpdate === undefined) missingEvidence.push("approvedPlanUpdate");
    if (snapshot.approvedPlanUpdate && !validPlanUpdate(snapshot.approvedPlanUpdate, snapshot.planVersionId)) missingEvidence.push("validApprovedPlanUpdate");

    if (missingEvidence.length > 0) {
      return {
        disposition: "insufficient",
        reasons: [],
        missingEvidence,
        incident: copyIncident(existing),
      };
    }

    const observedAt = this.now();
    const started = snapshot.actualStartedAt !== null;
    const planUpdated = snapshot.approvedPlanUpdate !== null;
    const deadlineReached = Date.parse(observedAt) >= Date.parse(snapshot.plannedStartAt!);

    if (started || planUpdated || !deadlineReached) {
      this.suppressed.delete(key);
      if (existing?.lifecycle === "open") {
        existing.lifecycle = "resolved";
        existing.updatedAt = observedAt;
        existing.resolutionEvidence = started
          ? { type: "work_order_started", actualStartedAt: snapshot.actualStartedAt! }
          : { type: "approved_plan_update", update: structuredClone(snapshot.approvedPlanUpdate!) };
      }
      return { disposition: "clear", reasons: [], missingEvidence: [], incident: copyIncident(existing) };
    }

    if (this.suppressed.has(key)) {
      return {
        disposition: "triggered",
        reasons: ["planned_start_missed"],
        missingEvidence: [],
        incident: copyIncident(existing),
      };
    }

    if (existing && existing.lifecycle !== "open") {
      return {
        disposition: "insufficient",
        reasons: [],
        missingEvidence: ["sourceValidRecurrenceEvidence"],
        incident: copyIncident(existing),
      };
    }

    if (existing?.lifecycle === "open") {
      existing.updatedAt = observedAt;
      return {
        disposition: "triggered",
        reasons: ["planned_start_missed"],
        missingEvidence: [],
        incident: copyIncident(existing),
      };
    }

    const occurrence = (this.occurrenceByCondition.get(key) ?? 0) + 1;
    this.occurrenceByCondition.set(key, occurrence);
    const incident: B02LaboratoryIncident = {
      incidentId: `B02-LAB-${snapshot.workOrderId}-${snapshot.planVersionId}-${String(occurrence).padStart(2, "0")}`,
      conditionKey: conditionKey(snapshot.workOrderId, snapshot.planVersionId),
      occurrence,
      lifecycle: "open",
      openedAt: observedAt,
      updatedAt: observedAt,
      workOrderId: snapshot.workOrderId,
      planVersionId: snapshot.planVersionId,
      machineId: snapshot.machineId,
      plannedStartAt: snapshot.plannedStartAt!,
      reasons: ["planned_start_missed"],
      resolutionEvidence: null,
      administrativeClosure: null,
    };
    this.incidents.set(key, incident);
    return {
      disposition: "triggered",
      reasons: ["planned_start_missed"],
      missingEvidence: [],
      incident: copyIncident(incident),
    };
  }

  closeWithoutResolution(input: {
    workOrderId: number;
    planVersionId: number;
    actorReference: string;
    reason: string;
    comment: string;
  }): B02LaboratoryIncident {
    const key = laboratoryKey(input.workOrderId, input.planVersionId);
    const incident = this.incidents.get(key);
    if (!incident || incident.lifecycle !== "open") throw new Error("B02 open incident is required");
    if (!input.actorReference.trim() || !input.reason.trim() || !input.comment.trim()) {
      throw new Error("B02 administrative closure requires actor, reason, and comment");
    }
    const closedAt = this.now();
    incident.lifecycle = "closed_without_resolution";
    incident.updatedAt = closedAt;
    incident.administrativeClosure = {
      actorReference: input.actorReference,
      reason: input.reason,
      comment: input.comment,
      closedAt,
    };
    this.suppressed.add(key);
    return structuredClone(incident);
  }
}
