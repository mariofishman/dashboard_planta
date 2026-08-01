export const D03_QUERY_ID = "d03-work-order-mass-balance";
export const D03_KEY_SCHEMA_VERSION = 1;
export const D03_BALANCE_TOLERANCE_FRACTION = 0.05;
export const D03_INK_GRAMS_PER_PLANNED_M2 = 2;
export const D03_ADHESIVE_GRAMS_PER_PLANNED_M2 = 2;

const SPECIFIC_CAUSE_CODES = new Set(["A03", "A04", "A05", "A06", "A07", "D01", "D02", "D04"]);

export interface D03WeightEvidence {
  id: string;
  weightKg: number | null;
}

export interface D03LaboratoryInput {
  workOrderId: string;
  workOrderClosed: boolean;
  plannedProductionAreaM2: number | null;
  inkApplied: boolean;
  adhesiveApplied: boolean;
  weighedRawMaterials: D03WeightEvidence[];
  productionReels: D03WeightEvidence[];
  wasteRecords: D03WeightEvidence[];
  containerBalanceValid: boolean;
  explainingSpecificAlertCodes: string[];
}

export type D03EvaluationStatus = "clear" | "triggered" | "insufficient" | "correlated";
export type D03LaboratoryLifecycle = "open" | "resolved" | "closed_without_resolution";

export interface D03Evaluation {
  conditionKey: string;
  correlationKey: string;
  status: D03EvaluationStatus;
  label: "Error" | null;
  reasons: string[];
  missingFields: string[];
  blockers: string[];
  correlatedAlertCodes: string[];
  weighedRawMaterialsKg: number | null;
  theoreticalInkKg: number | null;
  theoreticalAdhesiveKg: number | null;
  adjustedInputKg: number | null;
  goodOutputNetKg: number | null;
  weighedWasteKg: number | null;
  balanceGapKg: number | null;
  allowedGapKg: number | null;
}

export interface D03LaboratoryOccurrence {
  incidentId: string;
  conditionKey: string;
  occurrence: number;
  lifecycle: D03LaboratoryLifecycle;
  label: "Error";
  reasons: string[];
  openedAt: string;
  updatedAt: string;
  observationCount: number;
  balanceGapKg: number;
  allowedGapKg: number;
  adjustedInputKg: number;
  goodOutputNetKg: number;
  weighedWasteKg: number;
  correlatedAlertCodes: string[];
  closureReason: string | null;
  closureComment: string | null;
  closureActorReference: string | null;
}

const conditionKey = (workOrderId: string) =>
  `D03:${D03_QUERY_ID}:${D03_KEY_SCHEMA_VERSION}:workOrderId=${workOrderId}`;

const cloneInput = (input: D03LaboratoryInput): D03LaboratoryInput => ({
  ...input,
  weighedRawMaterials: input.weighedRawMaterials.map((row) => ({ ...row })),
  productionReels: input.productionReels.map((row) => ({ ...row })),
  wasteRecords: input.wasteRecords.map((row) => ({ ...row })),
  explainingSpecificAlertCodes: [...input.explainingSpecificAlertCodes],
});

const cloneOccurrence = (occurrence: D03LaboratoryOccurrence): D03LaboratoryOccurrence => ({
  ...occurrence,
  reasons: [...occurrence.reasons],
  correlatedAlertCodes: [...occurrence.correlatedAlertCodes],
});

const roundKg = (grams: number) => Number((grams / 1000).toFixed(3));
const kgToGrams = (kg: number) => Math.round(kg * 1000);

function weightTotal(
  rows: D03WeightEvidence[],
  field: keyof Pick<D03LaboratoryInput, "weighedRawMaterials" | "productionReels" | "wasteRecords">,
): { grams: number; missing: string[]; invalid: string[] } {
  let grams = 0;
  const missing: string[] = [];
  const invalid: string[] = [];
  rows.forEach((row, index) => {
    if (row.weightKg === null || row.weightKg === undefined) {
      missing.push(`${field}[${index}].weightKg`);
    } else if (!Number.isFinite(row.weightKg) || row.weightKg < 0) {
      invalid.push(`${field}[${index}].weightKg`);
    } else {
      grams += kgToGrams(row.weightKg);
    }
  });
  return { grams, missing, invalid };
}

export function evaluateD03(input: Partial<D03LaboratoryInput>): D03Evaluation {
  const missingFields: string[] = [];
  for (const field of [
    "workOrderId", "workOrderClosed", "inkApplied", "adhesiveApplied", "weighedRawMaterials",
    "productionReels", "wasteRecords", "containerBalanceValid", "explainingSpecificAlertCodes",
  ] as const) {
    if (!Object.hasOwn(input, field) || input[field] === undefined) missingFields.push(field);
  }
  const plannedAreaRequired = input.inkApplied === true || input.adhesiveApplied === true;
  if (plannedAreaRequired && (input.plannedProductionAreaM2 === null || input.plannedProductionAreaM2 === undefined)) {
    missingFields.push("plannedProductionAreaM2");
  }
  const key = typeof input.workOrderId === "string" && input.workOrderId.length > 0
    ? conditionKey(input.workOrderId)
    : "D03:insufficient";
  const base = {
    conditionKey: key,
    correlationKey: typeof input.workOrderId === "string" ? `workOrderId=${input.workOrderId}` : "D03:insufficient",
    label: null,
    reasons: [],
    blockers: [],
    correlatedAlertCodes: [],
    weighedRawMaterialsKg: null,
    theoreticalInkKg: null,
    theoreticalAdhesiveKg: null,
    adjustedInputKg: null,
    goodOutputNetKg: null,
    weighedWasteKg: null,
    balanceGapKg: null,
    allowedGapKg: null,
  } satisfies Omit<D03Evaluation, "status" | "missingFields">;
  if (missingFields.length > 0) return { ...base, status: "insufficient", missingFields };

  const complete = input as D03LaboratoryInput;
  const raw = weightTotal(complete.weighedRawMaterials, "weighedRawMaterials");
  const output = weightTotal(complete.productionReels, "productionReels");
  const waste = weightTotal(complete.wasteRecords, "wasteRecords");
  const invalid = [...raw.invalid, ...output.invalid, ...waste.invalid];
  const missingWeights = [...raw.missing, ...output.missing, ...waste.missing];
  if (invalid.length > 0 || missingWeights.length > 0) {
    return { ...base, status: "insufficient", missingFields: [...missingWeights, ...invalid] };
  }
  const plannedArea = complete.plannedProductionAreaM2 ?? 0;
  if (!Number.isFinite(plannedArea) || plannedArea < 0 || complete.workOrderId.length === 0) {
    return { ...base, status: "insufficient", missingFields: ["validEvidence"] };
  }

  const inkGrams = complete.inkApplied ? Math.round(plannedArea * D03_INK_GRAMS_PER_PLANNED_M2) : 0;
  const adhesiveGrams = complete.adhesiveApplied ? Math.round(plannedArea * D03_ADHESIVE_GRAMS_PER_PLANNED_M2) : 0;
  const adjustedInputGrams = raw.grams + inkGrams + adhesiveGrams;
  const gapGrams = adjustedInputGrams - output.grams - waste.grams;
  const common = {
    ...base,
    weighedRawMaterialsKg: roundKg(raw.grams),
    theoreticalInkKg: roundKg(inkGrams),
    theoreticalAdhesiveKg: roundKg(adhesiveGrams),
    adjustedInputKg: roundKg(adjustedInputGrams),
    goodOutputNetKg: roundKg(output.grams),
    weighedWasteKg: roundKg(waste.grams),
    balanceGapKg: roundKg(gapGrams),
    allowedGapKg: Number((roundKg(output.grams) * D03_BALANCE_TOLERANCE_FRACTION).toFixed(3)),
  };
  if (!complete.workOrderClosed) return { ...common, status: "clear", missingFields: [] };
  if (!complete.containerBalanceValid) {
    return { ...common, status: "insufficient", missingFields: [], blockers: ["e05_negative_container_consumption"] };
  }
  const correlatedAlertCodes = [...new Set(complete.explainingSpecificAlertCodes.filter((code) => SPECIFIC_CAUSE_CODES.has(code)))].sort();
  if (correlatedAlertCodes.length > 0) {
    return { ...common, status: "correlated", missingFields: [], correlatedAlertCodes };
  }
  const triggered = Math.abs(gapGrams) * 100 > output.grams * 5;
  return {
    ...common,
    status: triggered ? "triggered" : "clear",
    label: triggered ? "Error" : null,
    reasons: triggered ? ["mass_balance_gap"] : [],
    missingFields: [],
  };
}

export class D03StandaloneLaboratory {
  private currentAt: string;
  private input: D03LaboratoryInput;
  private occurrences: D03LaboratoryOccurrence[] = [];
  private suppressed = new Set<string>();
  private failedCycles = 0;

  constructor(private readonly baseline: { currentAt: string; input: D03LaboratoryInput }) {
    this.currentAt = baseline.currentAt;
    this.input = cloneInput(baseline.input);
  }

  reset() {
    this.currentAt = this.baseline.currentAt;
    this.input = cloneInput(this.baseline.input);
    this.occurrences = [];
    this.suppressed.clear();
    this.failedCycles = 0;
    return this.snapshot();
  }

  setClock(currentAt: string) {
    if (!Number.isFinite(Date.parse(currentAt))) throw new Error("invalid_d03_clock");
    this.currentAt = currentAt;
  }

  update(patch: Partial<D03LaboratoryInput>) {
    this.input = cloneInput({ ...this.input, ...patch });
  }

  poll(healthy = true): D03Evaluation {
    const evaluation = evaluateD03(this.input);
    if (!healthy) {
      this.failedCycles += 1;
      return evaluation;
    }
    this.applyEvaluation(evaluation);
    return evaluation;
  }

  closeWithoutResolution(reason: string, comment: string, actorReference: string) {
    if (!reason.trim() || !comment.trim() || !actorReference.trim()) throw new Error("d03_closure_evidence_required");
    const open = this.latestOpen(conditionKey(this.input.workOrderId));
    if (!open) throw new Error("d03_open_occurrence_required");
    open.lifecycle = "closed_without_resolution";
    open.updatedAt = this.currentAt;
    open.closureReason = reason;
    open.closureComment = comment;
    open.closureActorReference = actorReference;
    this.suppressed.add(open.conditionKey);
  }

  snapshot() {
    return {
      currentAt: this.currentAt,
      input: cloneInput(this.input),
      occurrences: this.occurrences.map(cloneOccurrence),
      suppressedConditionKeys: [...this.suppressed].sort(),
      failedCycles: this.failedCycles,
    };
  }

  private latestOpen(key: string) {
    return [...this.occurrences].reverse().find((row) => row.conditionKey === key && row.lifecycle === "open");
  }

  private applyEvaluation(evaluation: D03Evaluation) {
    if (evaluation.status === "insufficient") return;
    const open = this.latestOpen(evaluation.conditionKey);
    if (evaluation.status === "clear" || evaluation.status === "correlated") {
      if (open) {
        open.lifecycle = "resolved";
        open.updatedAt = this.currentAt;
        open.correlatedAlertCodes = [...evaluation.correlatedAlertCodes];
      }
      if (evaluation.status === "clear") this.suppressed.delete(evaluation.conditionKey);
      return;
    }
    if (this.suppressed.has(evaluation.conditionKey)) return;
    if (open) {
      if (open.balanceGapKg !== evaluation.balanceGapKg || open.allowedGapKg !== evaluation.allowedGapKg) {
        open.balanceGapKg = evaluation.balanceGapKg!;
        open.allowedGapKg = evaluation.allowedGapKg!;
        open.adjustedInputKg = evaluation.adjustedInputKg!;
        open.goodOutputNetKg = evaluation.goodOutputNetKg!;
        open.weighedWasteKg = evaluation.weighedWasteKg!;
        open.updatedAt = this.currentAt;
        open.observationCount += 1;
      }
      return;
    }
    const occurrence = this.occurrences.filter((row) => row.conditionKey === evaluation.conditionKey).length + 1;
    this.occurrences.push({
      incidentId: `d03-lab-${this.input.workOrderId}-${occurrence}`,
      conditionKey: evaluation.conditionKey,
      occurrence,
      lifecycle: "open",
      label: "Error",
      reasons: ["mass_balance_gap"],
      openedAt: this.currentAt,
      updatedAt: this.currentAt,
      observationCount: 1,
      balanceGapKg: evaluation.balanceGapKg!,
      allowedGapKg: evaluation.allowedGapKg!,
      adjustedInputKg: evaluation.adjustedInputKg!,
      goodOutputNetKg: evaluation.goodOutputNetKg!,
      weighedWasteKg: evaluation.weighedWasteKg!,
      correlatedAlertCodes: [],
      closureReason: null,
      closureComment: null,
      closureActorReference: null,
    });
  }
}
