export const D02_QUERY_ID = "d02-delivered-reel-unconsumed";
export const D02_KEY_SCHEMA_VERSION = 1;

export type D02ReelDisposition = "at_machine" | "returned" | "reassigned";
const D02_REEL_DISPOSITIONS = new Set<D02ReelDisposition>(["at_machine", "returned", "reassigned"]);

export interface D02LaboratorySnapshot {
  workOrderId: number;
  articleSerialId: number;
  workOrderClosed: boolean | undefined;
  plannedProductionQuantity: string | undefined;
  goodOutputQuantity: string | undefined;
  productionQuantityUnit: string | undefined;
  reservedReelDelivered: boolean | undefined;
  consumedQuantity: string | undefined;
  reelDisposition: D02ReelDisposition | undefined;
  sourceValidRecurrenceEvidence?: boolean;
}

export type D02LaboratoryCycle =
  | { status: "healthy"; snapshot: D02LaboratorySnapshot }
  | { status: "failed"; workOrderId: number; articleSerialId: number; errorCode: string };

export type D02LaboratoryDisposition = "triggered" | "clear" | "insufficient" | "failed_preserved";
export type D02LaboratoryLifecycle = "open" | "resolved" | "closed_without_resolution";

export interface D02LaboratoryIncident {
  incidentId: string;
  conditionKey: string;
  occurrence: number;
  lifecycle: D02LaboratoryLifecycle;
  openedAt: string;
  updatedAt: string;
  workOrderId: number;
  articleSerialId: number;
  plannedProductionQuantity: string;
  goodOutputQuantity: string;
  productionQuantityUnit: string;
  consumedQuantity: string;
  reelDisposition: D02ReelDisposition;
  reasons: string[];
  resolutionEvidence: {
    type: "healthy_source_correction";
    consumedQuantity: string;
    reelDisposition: D02ReelDisposition;
    workOrderClosed: boolean;
    goodOutputQuantity: string;
    reservedReelDelivered: boolean;
  } | null;
  administrativeClosure: {
    actorReference: string;
    reason: string;
    comment: string;
    closedAt: string;
  } | null;
}

export interface D02LaboratoryResult {
  disposition: D02LaboratoryDisposition;
  reasons: string[];
  missingEvidence: string[];
  incident: D02LaboratoryIncident | null;
}

interface DecimalValue {
  coefficient: bigint;
  scale: number;
}

function parseNonNegativeDecimal(value: string | undefined): DecimalValue | null {
  if (value === undefined || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return { coefficient: BigInt(`${whole}${fraction}`), scale: fraction.length };
}

function compare(left: DecimalValue, right: DecimalValue): number {
  const scale = Math.max(left.scale, right.scale);
  const leftValue = left.coefficient * (10n ** BigInt(scale - left.scale));
  const rightValue = right.coefficient * (10n ** BigInt(scale - right.scale));
  return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
}

function reachesNinetyPercent(actual: DecimalValue, planned: DecimalValue): boolean {
  const scale = Math.max(actual.scale, planned.scale);
  const actualValue = actual.coefficient * (10n ** BigInt(scale - actual.scale));
  const plannedValue = planned.coefficient * (10n ** BigInt(scale - planned.scale));
  return actualValue * 10n >= plannedValue * 9n;
}

function laboratoryKey(workOrderId: number, articleSerialId: number): string {
  return `${workOrderId}:${articleSerialId}`;
}

function conditionKey(workOrderId: number, articleSerialId: number): string {
  return `D02:${D02_QUERY_ID}:${D02_KEY_SCHEMA_VERSION}:workOrderId=${workOrderId}|articleSerialId=${articleSerialId}`;
}

function copyIncident(incident: D02LaboratoryIncident | undefined): D02LaboratoryIncident | null {
  return incident ? structuredClone(incident) : null;
}

function result(
  disposition: D02LaboratoryDisposition,
  incident: D02LaboratoryIncident | undefined,
  missingEvidence: string[] = [],
): D02LaboratoryResult {
  const triggered = disposition === "triggered";
  return {
    disposition,
    reasons: triggered ? ["delivered_reel_unconsumed"] : [],
    missingEvidence,
    incident: copyIncident(incident),
  };
}

/**
 * Pure Phase 7 preparation laboratory. It owns no source database connection,
 * scheduler, Monitor incident record, routing delivery, Dashboard state, or Chat state.
 */
export class D02StandaloneLaboratory {
  private readonly historyByKey = new Map<string, D02LaboratoryIncident[]>();
  private readonly suppressed = new Set<string>();

  constructor(private readonly now: () => string) {}

  reset(): void {
    this.historyByKey.clear();
    this.suppressed.clear();
  }

  inspect(workOrderId: number, articleSerialId: number): D02LaboratoryIncident | null {
    const history = this.historyByKey.get(laboratoryKey(workOrderId, articleSerialId));
    return copyIncident(history?.at(-1));
  }

  inspectHistory(workOrderId: number, articleSerialId: number): D02LaboratoryIncident[] {
    return structuredClone(this.historyByKey.get(laboratoryKey(workOrderId, articleSerialId)) ?? []);
  }

  evaluate(cycle: D02LaboratoryCycle): D02LaboratoryResult {
    if (cycle.status === "failed") {
      const incident = this.inspect(cycle.workOrderId, cycle.articleSerialId) ?? undefined;
      return result("failed_preserved", incident);
    }

    const snapshot = cycle.snapshot;
    const key = laboratoryKey(snapshot.workOrderId, snapshot.articleSerialId);
    const history = this.historyByKey.get(key) ?? [];
    const latest = history.at(-1);
    const missingEvidence: string[] = [];

    if (!Number.isInteger(snapshot.workOrderId) || snapshot.workOrderId <= 0) missingEvidence.push("validWorkOrderId");
    if (!Number.isInteger(snapshot.articleSerialId) || snapshot.articleSerialId <= 0) missingEvidence.push("validArticleSerialId");
    if (typeof snapshot.workOrderClosed !== "boolean") missingEvidence.push("workOrderClosed");
    if (typeof snapshot.reservedReelDelivered !== "boolean") missingEvidence.push("reservedReelDelivered");
    if (typeof snapshot.productionQuantityUnit !== "string" || !snapshot.productionQuantityUnit.trim()) {
      missingEvidence.push("productionQuantityUnit");
    }
    if (!D02_REEL_DISPOSITIONS.has(snapshot.reelDisposition as D02ReelDisposition)) {
      missingEvidence.push("validReelDisposition");
    }
    if (
      snapshot.sourceValidRecurrenceEvidence !== undefined
      && typeof snapshot.sourceValidRecurrenceEvidence !== "boolean"
    ) missingEvidence.push("validSourceRecurrenceEvidence");

    const planned = parseNonNegativeDecimal(snapshot.plannedProductionQuantity);
    const goodOutput = parseNonNegativeDecimal(snapshot.goodOutputQuantity);
    const consumed = parseNonNegativeDecimal(snapshot.consumedQuantity);
    if (!planned || planned.coefficient === 0n) missingEvidence.push("validPositivePlannedProductionQuantity");
    if (!goodOutput) missingEvidence.push("validGoodOutputQuantity");
    if (!consumed) missingEvidence.push("validConsumedQuantity");

    if (missingEvidence.length > 0) return result("insufficient", latest, missingEvidence);

    const fullProductionCompleted = snapshot.workOrderClosed!
      && reachesNinetyPercent(goodOutput!, planned!);
    const reelUsed = compare(consumed!, { coefficient: 0n, scale: 0 }) > 0;
    const triggers = fullProductionCompleted
      && snapshot.reservedReelDelivered!
      && !reelUsed
      && snapshot.reelDisposition === "at_machine";
    const observedAt = this.now();

    if (!triggers) {
      this.suppressed.delete(key);
      if (latest?.lifecycle === "open") {
        latest.lifecycle = "resolved";
        latest.updatedAt = observedAt;
        latest.resolutionEvidence = {
          type: "healthy_source_correction",
          consumedQuantity: snapshot.consumedQuantity!,
          reelDisposition: snapshot.reelDisposition!,
          workOrderClosed: snapshot.workOrderClosed!,
          goodOutputQuantity: snapshot.goodOutputQuantity!,
          reservedReelDelivered: snapshot.reservedReelDelivered!,
        };
      }
      return result("clear", latest);
    }

    if (this.suppressed.has(key)) return result("triggered", latest);

    if (latest && latest.lifecycle !== "open" && snapshot.sourceValidRecurrenceEvidence !== true) {
      return result("insufficient", latest, ["sourceValidRecurrenceEvidence"]);
    }

    if (latest?.lifecycle === "open") {
      latest.updatedAt = observedAt;
      latest.goodOutputQuantity = snapshot.goodOutputQuantity!;
      latest.consumedQuantity = snapshot.consumedQuantity!;
      latest.reelDisposition = snapshot.reelDisposition!;
      return result("triggered", latest);
    }

    const occurrence = history.length + 1;
    const incident: D02LaboratoryIncident = {
      incidentId: `D02-LAB-${snapshot.workOrderId}-${snapshot.articleSerialId}-${String(occurrence).padStart(2, "0")}`,
      conditionKey: conditionKey(snapshot.workOrderId, snapshot.articleSerialId),
      occurrence,
      lifecycle: "open",
      openedAt: observedAt,
      updatedAt: observedAt,
      workOrderId: snapshot.workOrderId,
      articleSerialId: snapshot.articleSerialId,
      plannedProductionQuantity: snapshot.plannedProductionQuantity!,
      goodOutputQuantity: snapshot.goodOutputQuantity!,
      productionQuantityUnit: snapshot.productionQuantityUnit!,
      consumedQuantity: snapshot.consumedQuantity!,
      reelDisposition: snapshot.reelDisposition!,
      reasons: ["delivered_reel_unconsumed"],
      resolutionEvidence: null,
      administrativeClosure: null,
    };
    history.push(incident);
    this.historyByKey.set(key, history);
    return result("triggered", incident);
  }

  closeWithoutResolution(input: {
    workOrderId: number;
    articleSerialId: number;
    actorReference: string;
    reason: string;
    comment: string;
  }): D02LaboratoryIncident {
    const key = laboratoryKey(input.workOrderId, input.articleSerialId);
    const history = this.historyByKey.get(key);
    const incident = history?.at(-1);
    if (!incident || incident.lifecycle !== "open") throw new Error("D02 open incident is required");
    if (!input.actorReference.trim() || !input.reason.trim() || !input.comment.trim()) {
      throw new Error("D02 administrative closure requires actor, reason, and comment");
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
