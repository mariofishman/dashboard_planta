export const D01_QUERY_ID = "d01-declared-meters-over-input";
export const D01_KEY_SCHEMA_VERSION = 1;
export const D01_TOLERANCE_FRACTION = 0.05;
export const D01_TOLERANCE_CAP_KG = 150;

export type D01RemnantState =
  | "no_remnant_declared"
  | "declared_remnant_weighed"
  | "declared_remnant_unweighed";

export type D01MeasurementPath =
  | "initial_gross_minus_core_tare"
  | "initial_gross_minus_weighed_remnant";

export type D01ReasonCode =
  | "declared_meters_exceed_layer_input"
  | "layer_input_exceeds_declared_meters"
  | "substrate_layers_do_not_match";

export interface D01UsedReel {
  reelId: string;
  remnantState: D01RemnantState;
  initialGrossKg: number | null;
  verifiedCoreTareKg: number | null;
  remnantGrossKg: number | null;
  widthM: number | null;
  grammageGM2: number | null;
}

export interface D01RequiredLayer {
  materialRequirementId: string;
  reels: D01UsedReel[];
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
  requiredLayers: D01RequiredLayer[];
}

export type D01Disposition =
  | "triggered"
  | "clear"
  | "not_applicable"
  | "insufficient"
  | "failed_preserved";
export type D01Lifecycle = "open" | "resolved" | "closed_without_resolution";

export interface D01ReelResult {
  reelId: string;
  measurementPath: D01MeasurementPath;
  netUsedKg: number;
  usedMeters: number;
}

export interface D01LayerResult {
  materialRequirementId: string;
  usedMeters: number;
  layerToRunGapMeters: number;
  reasonCodes: Array<
    "declared_meters_exceed_layer_input" | "layer_input_exceeds_declared_meters"
  >;
  reels: D01ReelResult[];
}

export interface D01PairwiseGapResult {
  leftMaterialRequirementId: string;
  rightMaterialRequirementId: string;
  gapMeters: number;
  exceedsTolerance: boolean;
}

export interface D01Evaluation {
  disposition: D01Disposition;
  conditionKey: string;
  reasonCodes: D01ReasonCode[];
  missingEvidence: string[];
  declaredRunMeters: number | null;
  totalOrderKg: number | null;
  allowedKg: number | null;
  allowedMeters: number | null;
  layers: D01LayerResult[];
  pairwiseGaps: D01PairwiseGapResult[];
}

export interface D01OccurrenceEvidence {
  reasonCodes: D01ReasonCode[];
  affectedMaterialRequirementIds: string[];
  declaredRunMeters: number;
  totalOrderKg: number;
  allowedKg: number;
  allowedMeters: number;
  layers: D01LayerResult[];
  pairwiseGaps: D01PairwiseGapResult[];
}

export interface D01Occurrence extends D01OccurrenceEvidence {
  incidentId: string;
  conditionKey: string;
  occurrence: number;
  lifecycle: D01Lifecycle;
  label: "Error";
  openedAt: string;
  updatedAt: string;
  observationCount: number;
  administrativeClosure: {
    reason: string;
    comment: string;
    actorReference: string;
    closedAt: string;
    frozenEvidence: D01OccurrenceEvidence;
  } | null;
}

export interface D01CorrelatedCondition {
  active: boolean;
  workOrderId: string;
  sameEvidenceChain: boolean;
}

export interface D01CorrelationClassification {
  A04: "not_active" | "independent_capacity_condition" | "replaced_or_enriched_by_d01";
  A05: "not_active" | "independent_reel_handling_condition";
  D03: "not_active" | "independent_mass_balance_condition" | "suppressed_duplicate";
}

const conditionKey = (workOrderId: string) =>
  `D01:${D01_QUERY_ID}:${D01_KEY_SCHEMA_VERSION}:workOrderId=${workOrderId}`;

const positive = (value: number | null): value is number =>
  value !== null && Number.isFinite(value) && value > 0;

const nonnegative = (value: number | null): value is number =>
  value !== null && Number.isFinite(value) && value >= 0;

function missingOrInvalidReelEvidence(layerId: string, reel: D01UsedReel): string[] {
  const prefix = `requiredLayers.${layerId}.reels.${reel.reelId}`;
  const invalid: string[] = [];
  if (!positive(reel.initialGrossKg)) invalid.push(`${prefix}.initialGrossKg`);
  if (!positive(reel.widthM)) invalid.push(`${prefix}.widthM`);
  if (!positive(reel.grammageGM2)) invalid.push(`${prefix}.grammageGM2`);

  if (reel.remnantState === "declared_remnant_unweighed") {
    invalid.push(`${prefix}.remnantGrossKg`);
  } else if (reel.remnantState === "no_remnant_declared") {
    if (!nonnegative(reel.verifiedCoreTareKg)) invalid.push(`${prefix}.verifiedCoreTareKg`);
    if (
      positive(reel.initialGrossKg)
      && nonnegative(reel.verifiedCoreTareKg)
      && reel.verifiedCoreTareKg >= reel.initialGrossKg
    ) {
      invalid.push(`${prefix}.validVerifiedCoreTareKg`);
    }
  } else {
    if (!positive(reel.remnantGrossKg)) invalid.push(`${prefix}.remnantGrossKg`);
    if (
      positive(reel.initialGrossKg)
      && positive(reel.remnantGrossKg)
      && reel.remnantGrossKg >= reel.initialGrossKg
    ) {
      invalid.push(`${prefix}.validGrossWeightDifference`);
    }
  }
  return invalid;
}

function evaluateReel(reel: D01UsedReel): D01ReelResult {
  const measurementPath: D01MeasurementPath = reel.remnantState === "no_remnant_declared"
    ? "initial_gross_minus_core_tare"
    : "initial_gross_minus_weighed_remnant";
  const netUsedKg = measurementPath === "initial_gross_minus_core_tare"
    ? reel.initialGrossKg! - reel.verifiedCoreTareKg!
    : reel.initialGrossKg! - reel.remnantGrossKg!;
  return {
    reelId: reel.reelId,
    measurementPath,
    netUsedKg,
    usedMeters: netUsedKg * 1000 / (reel.widthM! * reel.grammageGM2!),
  };
}

function emptyEvaluation(
  snapshot: D01Snapshot,
  disposition: "clear" | "not_applicable" | "insufficient" | "failed_preserved",
  missingEvidence: string[] = [],
): D01Evaluation {
  return {
    disposition,
    conditionKey: conditionKey(snapshot.workOrderId),
    reasonCodes: [],
    missingEvidence,
    declaredRunMeters: null,
    totalOrderKg: null,
    allowedKg: null,
    allowedMeters: null,
    layers: [],
    pairwiseGaps: [],
  };
}

/**
 * Pure Phase 7 supporting-preparation evaluator. It owns no database connection,
 * Monitor poller, incident record, routing delivery, Dashboard state, or Chat state.
 */
export function evaluateD01(snapshot: D01Snapshot): D01Evaluation {
  if (!snapshot.closed) return emptyEvaluation(snapshot, "not_applicable");

  const missingEvidence: string[] = [];
  if (snapshot.outputs.length === 0) missingEvidence.push("outputs");
  if (snapshot.requiredLayers.length === 0) missingEvidence.push("requiredLayers");
  const layerIds = new Set<string>();
  const workOrderReelIds = new Set<string>();
  for (const output of snapshot.outputs) {
    const prefix = `outputs.${output.outputId}`;
    if (!positive(output.declaredMeters)) missingEvidence.push(`${prefix}.declaredMeters`);
    if (!positive(output.widthM)) missingEvidence.push(`${prefix}.widthM`);
    if (!positive(output.grammageGM2)) missingEvidence.push(`${prefix}.grammageGM2`);
  }
  for (const layer of snapshot.requiredLayers) {
    if (!layer.materialRequirementId.trim() || layerIds.has(layer.materialRequirementId)) {
      missingEvidence.push(
        `requiredLayers.${layer.materialRequirementId || "missing"}.uniqueMaterialRequirementId`,
      );
    }
    layerIds.add(layer.materialRequirementId);
    if (layer.reels.length === 0) {
      missingEvidence.push(`requiredLayers.${layer.materialRequirementId}.reels`);
    }
    const reelIds = new Set<string>();
    for (const reel of layer.reels) {
      if (!reel.reelId.trim() || reelIds.has(reel.reelId)) {
        missingEvidence.push(
          `requiredLayers.${layer.materialRequirementId}.reels.${reel.reelId || "missing"}.uniqueReelId`,
        );
      }
      reelIds.add(reel.reelId);
      if (reel.reelId.trim() && workOrderReelIds.has(reel.reelId)) {
        missingEvidence.push(
          `requiredLayers.${layer.materialRequirementId}.reels.${reel.reelId}.uniqueAcrossWorkOrder`,
        );
      }
      workOrderReelIds.add(reel.reelId);
      missingEvidence.push(...missingOrInvalidReelEvidence(layer.materialRequirementId, reel));
    }
  }
  if (missingEvidence.length > 0) {
    return emptyEvaluation(snapshot, "insufficient", [...new Set(missingEvidence)].sort());
  }

  const declaredRunMeters = snapshot.outputs.reduce(
    (sum, output) => sum + output.declaredMeters!,
    0,
  );
  const totalOrderKg = snapshot.outputs.reduce(
    (sum, output) => sum + output.declaredMeters! * output.widthM! * output.grammageGM2! / 1000,
    0,
  );
  const allowedKg = Math.min(totalOrderKg * D01_TOLERANCE_FRACTION, D01_TOLERANCE_CAP_KG);
  const allowedMeters = allowedKg / (totalOrderKg / declaredRunMeters);
  const layers = [...snapshot.requiredLayers]
    .sort((left, right) => left.materialRequirementId.localeCompare(right.materialRequirementId))
    .map((layer): D01LayerResult => {
    const reels = [...layer.reels]
      .sort((left, right) => left.reelId.localeCompare(right.reelId))
      .map(evaluateReel);
    const usedMeters = reels.reduce((sum, reel) => sum + reel.usedMeters, 0);
    const layerToRunGapMeters = usedMeters - declaredRunMeters;
    const reasonCodes: D01LayerResult["reasonCodes"] = [];
    if (layerToRunGapMeters < -allowedMeters) {
      reasonCodes.push("declared_meters_exceed_layer_input");
    }
    if (layerToRunGapMeters > allowedMeters) {
      reasonCodes.push("layer_input_exceeds_declared_meters");
    }
    return { materialRequirementId: layer.materialRequirementId, usedMeters, layerToRunGapMeters, reasonCodes, reels };
    });
  const pairwiseGaps: D01PairwiseGapResult[] = [];
  for (let leftIndex = 0; leftIndex < layers.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < layers.length; rightIndex += 1) {
      const left = layers[leftIndex]!;
      const right = layers[rightIndex]!;
      const gapMeters = left.usedMeters - right.usedMeters;
      pairwiseGaps.push({
        leftMaterialRequirementId: left.materialRequirementId,
        rightMaterialRequirementId: right.materialRequirementId,
        gapMeters,
        exceedsTolerance: Math.abs(gapMeters) > allowedMeters,
      });
    }
  }

  const reasonCodes: D01ReasonCode[] = [];
  if (layers.some((layer) => layer.reasonCodes.includes("declared_meters_exceed_layer_input"))) {
    reasonCodes.push("declared_meters_exceed_layer_input");
  }
  if (layers.some((layer) => layer.reasonCodes.includes("layer_input_exceeds_declared_meters"))) {
    reasonCodes.push("layer_input_exceeds_declared_meters");
  }
  if (pairwiseGaps.some((pair) => pair.exceedsTolerance)) {
    reasonCodes.push("substrate_layers_do_not_match");
  }
  return {
    disposition: reasonCodes.length > 0 ? "triggered" : "clear",
    conditionKey: conditionKey(snapshot.workOrderId),
    reasonCodes,
    missingEvidence: [],
    declaredRunMeters,
    totalOrderKg,
    allowedKg,
    allowedMeters,
    layers,
    pairwiseGaps,
  };
}

const cloneSnapshot = (snapshot: D01Snapshot): D01Snapshot => structuredClone(snapshot);
const cloneOccurrence = (occurrence: D01Occurrence | undefined): D01Occurrence | null =>
  occurrence ? structuredClone(occurrence) : null;

function occurrenceEvidence(evaluation: D01Evaluation | D01OccurrenceEvidence): D01OccurrenceEvidence {
  const affected = new Set<string>();
  for (const layer of evaluation.layers) {
    if (layer.reasonCodes.length > 0) affected.add(layer.materialRequirementId);
  }
  for (const pair of evaluation.pairwiseGaps.filter((candidate) => candidate.exceedsTolerance)) {
    affected.add(pair.leftMaterialRequirementId);
    affected.add(pair.rightMaterialRequirementId);
  }
  return {
    reasonCodes: structuredClone(evaluation.reasonCodes),
    affectedMaterialRequirementIds: [...affected].sort(),
    declaredRunMeters: evaluation.declaredRunMeters!,
    totalOrderKg: evaluation.totalOrderKg!,
    allowedKg: evaluation.allowedKg!,
    allowedMeters: evaluation.allowedMeters!,
    layers: structuredClone(evaluation.layers),
    pairwiseGaps: structuredClone(evaluation.pairwiseGaps),
  };
}

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
    if (cycle === "failed") return emptyEvaluation(this.snapshotState, "failed_preserved");
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
      frozenEvidence: occurrenceEvidence(occurrence),
    };
    this.suppressed = true;
    return cloneOccurrence(occurrence)!;
  }

  private apply(evaluation: D01Evaluation) {
    if (evaluation.disposition === "insufficient" || evaluation.disposition === "not_applicable") return;
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
    const evidence = occurrenceEvidence(evaluation);
    if (open) {
      const previous = occurrenceEvidence(open);
      if (JSON.stringify(previous) !== JSON.stringify(evidence)) {
        Object.assign(open, evidence, { updatedAt: this.currentAt });
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
      ...evidence,
      administrativeClosure: null,
    });
  }

  private latestOpen() {
    return [...this.occurrences].reverse().find((occurrence) => occurrence.lifecycle === "open");
  }
}

export function classifyD01Correlations(
  evaluation: D01Evaluation,
  conditions: { A04?: D01CorrelatedCondition; A05?: D01CorrelatedCondition; D03?: D01CorrelatedCondition },
): D01CorrelationClassification {
  const explains = (condition: D01CorrelatedCondition | undefined) => {
    if (!condition) return false;
    return evaluation.disposition === "triggered"
      && condition.active
      && conditionKey(condition.workOrderId) === evaluation.conditionKey
      && condition.sameEvidenceChain;
  };
  return {
    A04: !conditions.A04?.active
      ? "not_active"
      : explains(conditions.A04) ? "replaced_or_enriched_by_d01" : "independent_capacity_condition",
    A05: !conditions.A05?.active ? "not_active" : "independent_reel_handling_condition",
    D03: !conditions.D03?.active
      ? "not_active"
      : explains(conditions.D03) ? "suppressed_duplicate" : "independent_mass_balance_condition",
  };
}
