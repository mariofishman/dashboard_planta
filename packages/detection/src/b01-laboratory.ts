export const B01_QUERY_ID = "b01-plan-sequence-deviation";
export const B01_KEY_SCHEMA_VERSION = 1;

export interface B01LateSequenceUpdate {
  recordedAt: string;
  actorReference: string;
  reason: string;
}

export interface B01LaboratorySnapshot {
  workOrderId: number;
  machineId: string;
  actualStarted: boolean | undefined;
  actualStartedAt: string | null | undefined;
  nextApprovedWorkOrderId: number | undefined;
  sequenceUpdatedBeforeStart: boolean | undefined;
  lateSequenceUpdate?: B01LateSequenceUpdate;
  correlatedAlertCodes?: string[];
}

export type B01LaboratoryCycle =
  | { status: "healthy"; snapshot: B01LaboratorySnapshot }
  | { status: "failed"; workOrderId: number; errorCode: string };

export type B01LaboratoryDisposition = "triggered" | "clear" | "insufficient" | "failed_preserved";
export type B01LaboratoryLifecycle = "open" | "resolved" | "closed_without_resolution";

export interface B01LaboratoryIncident {
  incidentId: string;
  conditionKey: string;
  occurrence: number;
  lifecycle: B01LaboratoryLifecycle;
  openedAt: string;
  updatedAt: string;
  expectedWorkOrderId: number;
  startedWorkOrderId: number;
  actualStartedAt: string;
  reasons: string[];
  correlatedAlertCodes: string[];
  resolutionEvidence: B01LateSequenceUpdate | null;
  administrativeClosure: {
    actorReference: string;
    reason: string;
    comment: string;
    closedAt: string;
  } | null;
}

export interface B01LaboratoryResult {
  disposition: B01LaboratoryDisposition;
  reasons: string[];
  missingEvidence: string[];
  incident: B01LaboratoryIncident | null;
}

function conditionKey(workOrderId: number): string {
  return `B01:${B01_QUERY_ID}:${B01_KEY_SCHEMA_VERSION}:workOrderId=${workOrderId}`;
}

function copyIncident(incident: B01LaboratoryIncident | undefined): B01LaboratoryIncident | null {
  return incident ? structuredClone(incident) : null;
}

/**
 * Pure Phase 7 preparation laboratory. It owns no database connection, scheduler,
 * Monitor incident record, routing delivery, Dashboard state, or Chat state.
 */
export class B01StandaloneLaboratory {
  private readonly incidents = new Map<number, B01LaboratoryIncident>();
  private readonly occurrenceByWorkOrder = new Map<number, number>();
  private readonly suppressed = new Set<number>();

  constructor(private readonly now: () => string) {}

  reset(): void {
    this.incidents.clear();
    this.occurrenceByWorkOrder.clear();
    this.suppressed.clear();
  }

  inspect(workOrderId: number): B01LaboratoryIncident | null {
    return copyIncident(this.incidents.get(workOrderId));
  }

  evaluate(cycle: B01LaboratoryCycle): B01LaboratoryResult {
    if (cycle.status === "failed") {
      return {
        disposition: "failed_preserved",
        reasons: [],
        missingEvidence: [],
        incident: this.inspect(cycle.workOrderId),
      };
    }

    const snapshot = cycle.snapshot;
    const missingEvidence: string[] = [];
    if (snapshot.actualStarted === undefined) missingEvidence.push("actualStarted");
    if (snapshot.actualStartedAt === undefined || snapshot.actualStartedAt === null) missingEvidence.push("actualStartedAt");
    if (snapshot.nextApprovedWorkOrderId === undefined) missingEvidence.push("nextApprovedWorkOrderId");
    if (snapshot.sequenceUpdatedBeforeStart === undefined) missingEvidence.push("sequenceUpdatedBeforeStart");

    if (
      snapshot.actualStarted === undefined
      || snapshot.actualStartedAt === undefined
      || snapshot.actualStartedAt === null
      || snapshot.nextApprovedWorkOrderId === undefined
      || snapshot.sequenceUpdatedBeforeStart === undefined
    ) {
      return {
        disposition: "insufficient",
        reasons: [],
        missingEvidence,
        incident: this.inspect(snapshot.workOrderId),
      };
    }

    const existing = this.incidents.get(snapshot.workOrderId);
    const update = snapshot.lateSequenceUpdate;
    const hasValidLateExplanation = Boolean(
      existing
      && update
      && update.actorReference.trim()
      && update.reason.trim()
      && update.recordedAt.trim(),
    );

    if (hasValidLateExplanation && existing && update) {
      existing.lifecycle = "resolved";
      existing.updatedAt = this.now();
      existing.resolutionEvidence = structuredClone(update);
      this.suppressed.delete(snapshot.workOrderId);
      return { disposition: "clear", reasons: [], missingEvidence: [], incident: copyIncident(existing) };
    }

    const triggered = snapshot.actualStarted === true
      && snapshot.workOrderId !== snapshot.nextApprovedWorkOrderId
      && snapshot.sequenceUpdatedBeforeStart === false;

    if (!triggered) {
      if (existing?.lifecycle === "closed_without_resolution") this.suppressed.delete(snapshot.workOrderId);
      return { disposition: "clear", reasons: [], missingEvidence: [], incident: copyIncident(existing) };
    }

    if (this.suppressed.has(snapshot.workOrderId)) {
      return {
        disposition: "triggered",
        reasons: ["outside_approved_sequence"],
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

    const observedAt = this.now();
    if (existing?.lifecycle === "open") {
      existing.updatedAt = observedAt;
      existing.correlatedAlertCodes = [...new Set(snapshot.correlatedAlertCodes ?? [])].sort();
      return {
        disposition: "triggered",
        reasons: ["outside_approved_sequence"],
        missingEvidence: [],
        incident: copyIncident(existing),
      };
    }

    const occurrence = (this.occurrenceByWorkOrder.get(snapshot.workOrderId) ?? 0) + 1;
    this.occurrenceByWorkOrder.set(snapshot.workOrderId, occurrence);
    const incident: B01LaboratoryIncident = {
      incidentId: `B01-LAB-${snapshot.workOrderId}-${String(occurrence).padStart(2, "0")}`,
      conditionKey: conditionKey(snapshot.workOrderId),
      occurrence,
      lifecycle: "open",
      openedAt: observedAt,
      updatedAt: observedAt,
      expectedWorkOrderId: snapshot.nextApprovedWorkOrderId,
      startedWorkOrderId: snapshot.workOrderId,
      actualStartedAt: snapshot.actualStartedAt,
      reasons: ["outside_approved_sequence"],
      correlatedAlertCodes: [...new Set(snapshot.correlatedAlertCodes ?? [])].sort(),
      resolutionEvidence: null,
      administrativeClosure: null,
    };
    this.incidents.set(snapshot.workOrderId, incident);
    return {
      disposition: "triggered",
      reasons: ["outside_approved_sequence"],
      missingEvidence: [],
      incident: copyIncident(incident),
    };
  }

  closeWithoutResolution(input: {
    workOrderId: number;
    actorReference: string;
    reason: string;
    comment: string;
  }): B01LaboratoryIncident {
    const incident = this.incidents.get(input.workOrderId);
    if (!incident || incident.lifecycle !== "open") throw new Error("B01 open incident is required");
    if (!input.actorReference.trim() || !input.reason.trim() || !input.comment.trim()) {
      throw new Error("B01 administrative closure requires actor, reason, and comment");
    }
    const closedAt = this.now();
    incident.lifecycle = "closed_without_resolution";
    incident.updatedAt = closedAt;
    incident.administrativeClosure = { ...input, closedAt };
    this.suppressed.add(input.workOrderId);
    return structuredClone(incident);
  }
}
