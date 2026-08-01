export const D01_QUERY_ID = "d01-declared-meters-over-input";
export const D01_KEY_SCHEMA_VERSION = 1;
export const D01_TOLERANCE_FRACTION = 0.05;
export const D01_TOLERANCE_CAP_KG = 150;

export type D01ConsumptionState =
  | "fully_consumed"
  | "partial_with_weighed_remnant"
  | "partial_unweighed_remnant";

export interface D01ConsumedReel {
  reelId: string;
  consumptionState: D01ConsumptionState;
  initialGrossKg: number | null;
  coreTareKg: number | null;
  remnantGrossKg: number | null;
  widthM: number | null;
  grammageGM2: number | null;
}

export interface D01MaterialLayer {
  materialRequirementId: string;
  reels: D01ConsumedReel[];
}

export interface D01DeclaredOutput {
  outputId: string;
  declaredMeters: number | null;
  widthM: number | null;
  grammageGM2: number | null;
}

export interface D01Snapshot {
  workOrderId: string;
  closed: boolean;
  outputs: D01DeclaredOutput[];
  layers: D01MaterialLayer[];
}

export type D01Disposition = "clear" | "triggered" | "insufficient" | "failed_preserved";
export type D01Lifecycle = "open" | "resolved" | "closed_without_resolution";

export interface D01LayerResult {
  materialRequirementId: string;
  consumedMeters: number;
  gapMeters: number;
  deficient: boolean;
}

export interface D01Evaluation {
  disposition: D01Disposition;
  conditionKey: string;
  reasonCodes: Array<"declared_meters_exceed_input">;
  missingEvidence: string[];
  declaredMeters: number | null;
  totalOrderKg: number | null;
  allowedKg: number | null;
  allowedMeters: number | null;
  layers: D01LayerResult[];
}

export interface D01Occurrence {
  incidentId: string;
  conditionKey: string;
  occurrence: number;
  lifecycle: D01Lifecycle;
  label: "Error";
  openedAt: string;
  updatedAt: string;
  observationCount: number;
  deficientMaterialRequirementIds: string[];
  declaredMeters: number;
  totalOrderKg: number;
  allowedKg: number;
  allowedMeters: number;
  administrativeClosure: {
    reason: string;
    comment: string;
    actorReference: string;
    closedAt: string;
    frozenDeficientMaterialRequirementIds: string[];
  } | null;
}

const conditionKey = (workOrderId: string) =>
  `D01:${D01_QUERY_ID}:${D01_KEY_SCHEMA_VERSION}:workOrderId=${workOrderId}`;

const positive = (value: number | null): value is number =>
  value !== null && Number.isFinite(value) && value > 0;

const nonnegative = (value: number | null): value is number =>
  value !== null && Number.isFinite(value) && value >= 0;

function missingOrInvalidReelEvidence(
  layerId: string,
  reel: D01ConsumedReel,
): string[] {
  const prefix = `layers.${layerId}.reels.${reel.reelId}`;
  const missing: string[] = [];
  if (!positive(reel.initialGrossKg)) missing.push(`${prefix}.initialGrossKg`);
  if (!positive(reel.widthM)) missing.push(`${prefix}.widthM`);
  if (!positive(reel.grammageGM2)) missing.push(`${prefix}.grammageGM2`);
  if (reel.consumptionState === "fully_consumed" && !nonnegative(reel.coreTareKg)) {
    missing.push(`${prefix}.coreTareKg`);
  }
  if (reel.consumptionState !== "fully_consumed" && !positive(reel.remnantGrossKg)) {
    missing.push(`${prefix}.remnantGrossKg`);
  }
  if (
    positive(reel.initialGrossKg)
    && positive(reel.remnantGrossKg)
    && reel.remnantGrossKg >= reel.initialGrossKg
  ) {
    missing.push(`${prefix}.validGrossWeightDifference`);
  }
  if (
    reel.consumptionState === "fully_consumed"
    && positive(reel.initialGrossKg)
    && nonnegative(reel.coreTareKg)
    && reel.coreTareKg >= reel.initialGrossKg
  ) {
    missing.push(`${prefix}.validCoreTareKg`);
  }
  return missing;
}

function netConsumedKg(reel: D01ConsumedReel): number {
  if (reel.consumptionState === "fully_consumed") {
    return reel.initialGrossKg! - reel.coreTareKg!;
  }
  return reel.initialGrossKg! - reel.remnantGrossKg!;
}

function consumedMeters(reel: D01ConsumedReel): number {
  return netConsumedKg(reel) * 1000 / (reel.widthM! * reel.grammageGM2!);
}

/**
 * Pure Phase 7 preparation evaluator. It owns no database connection, Monitor
 * poller, incident record, routing delivery, Dashboard state, or Chat state.
 */
export function evaluateD01(snapshot: D01Snapshot): D01Evaluation {
  const key = conditionKey(snapshot.workOrderId);
  if (!snapshot.closed) {
    return {
      disposition: "clear",
      conditionKey: key,
      reasonCodes: [],
      missingEvidence: [],
      declaredMeters: null,
      totalOrderKg: null,
      allowedKg: null,
      allowedMeters: null,
      layers: [],
    };
  }

  const missingEvidence: string[] = [];
  if (snapshot.outputs.length === 0) missingEvidence.push("outputs");
  if (snapshot.layers.length === 0) missingEvidence.push("layers");
  const layerIds = new Set<string>();
  for (const output of snapshot.outputs) {
    const prefix = `outputs.${output.outputId}`;
    if (!positive(output.declaredMeters)) missingEvidence.push(`${prefix}.declaredMeters`);
    if (!positive(output.widthM)) missingEvidence.push(`${prefix}.widthM`);
    if (!positive(output.grammageGM2)) missingEvidence.push(`${prefix}.grammageGM2`);
  }
  for (const layer of snapshot.layers) {
    if (!layer.materialRequirementId.trim() || layerIds.has(layer.materialRequirementId)) {
      missingEvidence.push(`layers.${layer.materialRequirementId || "missing"}.uniqueMaterialRequirementId`);
    }
    layerIds.add(layer.materialRequirementId);
    if (layer.reels.length === 0) missingEvidence.push(`layers.${layer.materialRequirementId}.reels`);
    for (const reel of layer.reels) {
      missingEvidence.push(...missingOrInvalidReelEvidence(layer.materialRequirementId, reel));
    }
  }
  if (missingEvidence.length > 0) {
    return {
      disposition: "insufficient",
      conditionKey: key,
      reasonCodes: [],
      missingEvidence: [...new Set(missingEvidence)].sort(),
      declaredMeters: null,
      totalOrderKg: null,
      allowedKg: null,
      allowedMeters: null,
      layers: [],
    };
  }

  const declaredMeters = snapshot.outputs.reduce((sum, output) => sum + output.declaredMeters!, 0);
  const totalOrderKg = snapshot.outputs.reduce(
    (sum, output) => sum + output.declaredMeters! * output.widthM! * output.grammageGM2! / 1000,
    0,
  );
  const allowedKg = Math.min(totalOrderKg * D01_TOLERANCE_FRACTION, D01_TOLERANCE_CAP_KG);
  const allowedMeters = allowedKg / (totalOrderKg / declaredMeters);
  const layers = snapshot.layers.map((layer): D01LayerResult => {
    const meters = layer.reels.reduce((sum, reel) => sum + consumedMeters(reel), 0);
    const gapMeters = declaredMeters - meters;
    return {
      materialRequirementId: layer.materialRequirementId,
      consumedMeters: meters,
      gapMeters,
      deficient: gapMeters > allowedMeters,
    };
  });
  const triggered = layers.some((layer) => layer.deficient);
  return {
    disposition: triggered ? "triggered" : "clear",
    conditionKey: key,
    reasonCodes: triggered ? ["declared_meters_exceed_input"] : [],
    missingEvidence: [],
    declaredMeters,
    totalOrderKg,
    allowedKg,
    allowedMeters,
    layers,
  };
}

const cloneSnapshot = (snapshot: D01Snapshot): D01Snapshot => structuredClone(snapshot);
const cloneOccurrence = (occurrence: D01Occurrence | undefined): D01Occurrence | null =>
  occurrence ? structuredClone(occurrence) : null;

export class D01StandaloneLaboratory {
  private currentAt: string;
  private snapshotState: D01Snapshot;
  private readonly occurrences: D01Occurrence[] = [];
  private suppressed = false;

  constructor(private readonly baseline: { currentAt: string; snapshot: D01Snapshot }) {
    this.currentAt = baseline.currentAt;
    this.snapshotState = cloneSnapshot(baseline.snapshot);
  }

  reset() {
    this.currentAt = this.baseline.currentAt;
    this.snapshotState = cloneSnapshot(this.baseline.snapshot);
    this.occurrences.splice(0);
    this.suppressed = false;
    return this.inspect();
  }

  setClock(currentAt: string) {
    if (!Number.isFinite(Date.parse(currentAt))) throw new Error("invalid_d01_clock");
    this.currentAt = currentAt;
  }

  replaceSnapshot(snapshot: D01Snapshot) {
    if (snapshot.workOrderId !== this.baseline.snapshot.workOrderId) {
      throw new Error("D01 laboratory is scoped to one work order");
    }
    this.snapshotState = cloneSnapshot(snapshot);
  }

  inspect() {
    return {
      currentAt: this.currentAt,
      snapshot: cloneSnapshot(this.snapshotState),
      occurrences: structuredClone(this.occurrences),
      suppressed: this.suppressed,
    };
  }

  poll(cycle: "healthy" | "failed" = "healthy"): D01Evaluation {
    if (cycle === "failed") {
      return {
        disposition: "failed_preserved",
        conditionKey: conditionKey(this.snapshotState.workOrderId),
        reasonCodes: [],
        missingEvidence: [],
        declaredMeters: null,
        totalOrderKg: null,
        allowedKg: null,
        allowedMeters: null,
        layers: [],
      };
    }
    const evaluation = evaluateD01(this.snapshotState);
    this.apply(evaluation);
    return evaluation;
  }

  closeWithoutResolution(input: { reason: string; comment: string; actorReference: string }) {
    const occurrence = this.latestOpen();
    if (!occurrence) throw new Error("D01 open occurrence is required");
    if (!input.reason.trim() || !input.comment.trim() || !input.actorReference.trim()) {
      throw new Error("D01 administrative closure requires reason, comment, and actor");
    }
    occurrence.lifecycle = "closed_without_resolution";
    occurrence.updatedAt = this.currentAt;
    occurrence.administrativeClosure = {
      reason: input.reason.trim(),
      comment: input.comment.trim(),
      actorReference: input.actorReference.trim(),
      closedAt: this.currentAt,
      frozenDeficientMaterialRequirementIds: [...occurrence.deficientMaterialRequirementIds],
    };
    this.suppressed = true;
    return cloneOccurrence(occurrence)!;
  }

  private apply(evaluation: D01Evaluation) {
    if (evaluation.disposition === "insufficient") return;
    const open = this.latestOpen();
    if (evaluation.disposition === "clear") {
      if (open) {
        open.lifecycle = "resolved";
        open.updatedAt = this.currentAt;
      }
      this.suppressed = false;
      return;
    }
    if (this.suppressed) return;
    const deficientIds = evaluation.layers
      .filter((layer) => layer.deficient)
      .map((layer) => layer.materialRequirementId)
      .sort();
    if (open) {
      const changed = JSON.stringify(open.deficientMaterialRequirementIds) !== JSON.stringify(deficientIds)
        || open.declaredMeters !== evaluation.declaredMeters
        || open.allowedMeters !== evaluation.allowedMeters;
      if (changed) {
        open.deficientMaterialRequirementIds = deficientIds;
        open.declaredMeters = evaluation.declaredMeters!;
        open.totalOrderKg = evaluation.totalOrderKg!;
        open.allowedKg = evaluation.allowedKg!;
        open.allowedMeters = evaluation.allowedMeters!;
        open.updatedAt = this.currentAt;
        open.observationCount += 1;
      }
      return;
    }
    const occurrence = this.occurrences.length + 1;
    this.occurrences.push({
      incidentId: `D01-LAB-${this.snapshotState.workOrderId}-${String(occurrence).padStart(2, "0")}`,
      conditionKey: evaluation.conditionKey,
      occurrence,
      lifecycle: "open",
      label: "Error",
      openedAt: this.currentAt,
      updatedAt: this.currentAt,
      observationCount: 1,
      deficientMaterialRequirementIds: deficientIds,
      declaredMeters: evaluation.declaredMeters!,
      totalOrderKg: evaluation.totalOrderKg!,
      allowedKg: evaluation.allowedKg!,
      allowedMeters: evaluation.allowedMeters!,
      administrativeClosure: null,
    });
  }

  private latestOpen() {
    return [...this.occurrences].reverse().find((occurrence) => occurrence.lifecycle === "open");
  }
}

export function d01SuppressesDuplicateD03(evaluation: D01Evaluation, d03WorkOrderId: string): boolean {
  return evaluation.disposition === "triggered"
    && evaluation.conditionKey === conditionKey(d03WorkOrderId);
}
