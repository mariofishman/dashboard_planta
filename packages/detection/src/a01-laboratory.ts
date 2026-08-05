export type A01Reason =
  | "material_not_in_warehouse"
  | "not_reserved_stock_available"
  | "reserved_not_dispatched";

export type A01EvaluationStatus = "clear" | "triggered" | "insufficient";
export type A01Checkpoint = "none" | "readiness" | "dispatch";
export type A01LaboratoryLifecycle = "open" | "resolved" | "closed_without_resolution";

export interface A01Requirement {
  workOrderId: string;
  materialRequirementId: string;
  materialId: string;
  plannedStartAt: string;
  requiredKg: number;
  reservedKg: number;
  dispatchedKg: number;
  canceled: boolean;
  actualStartAt: string | null;
}

export interface A01WarehouseStock {
  materialId: string;
  quantityKg: number;
}

export interface A01Evaluation {
  conditionKey: string;
  correlationKey: string;
  status: A01EvaluationStatus;
  checkpoint: A01Checkpoint;
  label: "Error" | null;
  reasons: A01Reason[];
  allocatedKg: number | null;
  missingFields: string[];
}

export interface A01LaboratoryOccurrence {
  id: string;
  conditionKey: string;
  occurrence: number;
  lifecycle: A01LaboratoryLifecycle;
  label: "Error";
  reasons: A01Reason[];
  openedAt: string;
  lastChangedAt: string;
  observationCount: number;
  closureReason: "physical_operation_outside_erp" | null;
  closureComment: string | null;
  closureActorReference: string | null;
  closureAt: string | null;
}

export interface A01CorrelatedCandidate {
  id: string;
  workOrderId: string;
  materialId: string;
  consequence: "missing_dispatch" | "missing_consumption" | "balance" | "unrelated";
}

const REQUIRED_FIELDS: Array<keyof A01Requirement> = [
  "workOrderId",
  "materialRequirementId",
  "materialId",
  "plannedStartAt",
  "requiredKg",
  "reservedKg",
  "dispatchedKg",
  "canceled",
  "actualStartAt",
];

const consequenceTypes = new Set(["missing_dispatch", "missing_consumption"]);

const conditionKey = (requirement: Pick<A01Requirement, "workOrderId" | "materialRequirementId">) =>
  `A01:a01-material-readiness:1:workOrderId=${requirement.workOrderId}|materialRequirementId=${requirement.materialRequirementId}`;

const correlationKey = (requirement: Pick<A01Requirement, "workOrderId" | "materialId">) =>
  `workOrderId=${requirement.workOrderId}|materialId=${requirement.materialId}`;

const stableRequirementOrder = (left: A01Requirement, right: A01Requirement) => {
  const reservationPriority = Number(right.reservedKg > 0) - Number(left.reservedKg > 0);
  if (reservationPriority !== 0) return reservationPriority;
  const plannedStartPriority = Date.parse(left.plannedStartAt) - Date.parse(right.plannedStartAt);
  if (plannedStartPriority !== 0) return plannedStartPriority;
  const workOrderPriority = left.workOrderId.localeCompare(right.workOrderId, "en", { numeric: true });
  if (workOrderPriority !== 0) return workOrderPriority;
  return left.materialRequirementId.localeCompare(right.materialRequirementId, "en", { numeric: true });
};

const cloneRequirement = (requirement: A01Requirement): A01Requirement => ({ ...requirement });
const cloneOccurrence = (occurrence: A01LaboratoryOccurrence): A01LaboratoryOccurrence => ({
  ...occurrence,
  reasons: [...occurrence.reasons],
});

function missingFields(requirement: Partial<A01Requirement>): string[] {
  return REQUIRED_FIELDS.filter((field) => !Object.hasOwn(requirement, field) || requirement[field] === undefined);
}

function validRequirement(requirement: A01Requirement): boolean {
  return Number.isFinite(Date.parse(requirement.plannedStartAt))
    && [requirement.requiredKg, requirement.reservedKg, requirement.dispatchedKg]
      .every((value) => Number.isFinite(value) && value >= 0)
    && requirement.requiredKg > 0;
}

export function allocateA01Stock(
  requirements: A01Requirement[],
  stock: A01WarehouseStock[],
): Map<string, number> {
  const result = new Map<string, number>();
  const stockByMaterial = new Map<string, number>();
  for (const row of stock) {
    if (!Number.isFinite(row.quantityKg) || row.quantityKg < 0) throw new Error("invalid_a01_stock");
    stockByMaterial.set(row.materialId, (stockByMaterial.get(row.materialId) ?? 0) + row.quantityKg);
  }
  const materials = new Set(requirements.map((requirement) => requirement.materialId));
  for (const materialId of materials) {
    let remaining = stockByMaterial.get(materialId) ?? 0;
    const ordered = requirements
      .filter((requirement) => requirement.materialId === materialId && !requirement.canceled)
      .sort(stableRequirementOrder);
    for (const requirement of ordered) {
      const allocated = Math.min(requirement.requiredKg, remaining);
      result.set(conditionKey(requirement), allocated);
      remaining -= allocated;
    }
  }
  for (const requirement of requirements.filter((row) => row.canceled)) {
    result.set(conditionKey(requirement), 0);
  }
  return result;
}

export function evaluateA01(
  requirement: Partial<A01Requirement>,
  allocatedKg: number | undefined,
  currentAt: string,
): A01Evaluation {
  const missing = missingFields(requirement);
  if (missing.length > 0 || allocatedKg === undefined) {
    return {
      conditionKey: missing.includes("workOrderId") || missing.includes("materialRequirementId")
        ? "A01:insufficient"
        : conditionKey(requirement as A01Requirement),
      correlationKey: missing.includes("workOrderId") || missing.includes("materialId")
        ? "A01:insufficient"
        : correlationKey(requirement as A01Requirement),
      status: "insufficient",
      checkpoint: "none",
      label: null,
      reasons: [],
      allocatedKg: allocatedKg ?? null,
      missingFields: missing.length > 0 ? missing : ["allocatedKg"],
    };
  }
  const complete = requirement as A01Requirement;
  if (!validRequirement(complete) || !Number.isFinite(Date.parse(currentAt)) || !Number.isFinite(allocatedKg) || allocatedKg < 0) {
    return {
      conditionKey: conditionKey(complete),
      correlationKey: correlationKey(complete),
      status: "insufficient",
      checkpoint: "none",
      label: null,
      reasons: [],
      allocatedKg,
      missingFields: ["validEvidence"],
    };
  }
  const minutesToPlannedStart = (Date.parse(complete.plannedStartAt) - Date.parse(currentAt)) / 60_000;
  const checkpoint: A01Checkpoint = minutesToPlannedStart > 60
    ? "none"
    : minutesToPlannedStart > 30 ? "readiness" : "dispatch";
  if (complete.canceled || checkpoint === "none") {
    return {
      conditionKey: conditionKey(complete), correlationKey: correlationKey(complete), status: "clear",
      checkpoint, label: null, reasons: [], allocatedKg, missingFields: [],
    };
  }
  const reasons: A01Reason[] = [];
  if (allocatedKg < complete.requiredKg) reasons.push("material_not_in_warehouse");
  if (allocatedKg >= complete.requiredKg && complete.reservedKg < complete.requiredKg) {
    reasons.push("not_reserved_stock_available");
  }
  if (checkpoint === "dispatch" && complete.reservedKg >= complete.requiredKg && complete.dispatchedKg < complete.requiredKg) {
    reasons.push("reserved_not_dispatched");
  }
  return {
    conditionKey: conditionKey(complete),
    correlationKey: correlationKey(complete),
    status: reasons.length > 0 ? "triggered" : "clear",
    checkpoint,
    label: reasons.length > 0 ? "Error" : null,
    reasons,
    allocatedKg,
    missingFields: [],
  };
}

export function selectA01CorrelatedConsequences(
  root: Pick<A01Requirement, "workOrderId" | "materialId">,
  candidates: A01CorrelatedCandidate[],
): string[] {
  return candidates
    .filter((candidate) => candidate.workOrderId === root.workOrderId
      && candidate.materialId === root.materialId
      && consequenceTypes.has(candidate.consequence))
    .map((candidate) => candidate.id);
}

export class A01StandaloneLaboratory {
  private currentAt: string;
  private requirements: A01Requirement[];
  private stock: A01WarehouseStock[];
  private occurrences: A01LaboratoryOccurrence[] = [];
  private suppressed = new Set<string>();

  constructor(private readonly baseline: {
    currentAt: string;
    requirements: A01Requirement[];
    stock: A01WarehouseStock[];
  }) {
    this.currentAt = baseline.currentAt;
    this.requirements = baseline.requirements.map(cloneRequirement);
    this.stock = baseline.stock.map((row) => ({ ...row }));
  }

  reset() {
    this.currentAt = this.baseline.currentAt;
    this.requirements = this.baseline.requirements.map(cloneRequirement);
    this.stock = this.baseline.stock.map((row) => ({ ...row }));
    this.occurrences = [];
    this.suppressed.clear();
    return this.snapshot();
  }

  setClock(currentAt: string) {
    if (!Number.isFinite(Date.parse(currentAt))) throw new Error("invalid_a01_clock");
    this.currentAt = currentAt;
  }

  updateRequirement(workOrderId: string, materialRequirementId: string, patch: Partial<A01Requirement>) {
    const requirement = this.findRequirement(workOrderId, materialRequirementId);
    Object.assign(requirement, patch);
  }

  setStock(materialId: string, quantityKg: number) {
    if (!Number.isFinite(quantityKg) || quantityKg < 0) throw new Error("invalid_a01_stock");
    const existing = this.stock.find((row) => row.materialId === materialId);
    if (existing) existing.quantityKg = quantityKg;
    else this.stock.push({ materialId, quantityKg });
  }

  poll(healthy = true): A01Evaluation[] {
    const allocations = allocateA01Stock(this.requirements, this.stock);
    const evaluations = this.requirements.map((requirement) =>
      evaluateA01(requirement, allocations.get(conditionKey(requirement)), this.currentAt));
    if (!healthy) return evaluations;
    for (const evaluation of evaluations) this.applyEvaluation(evaluation);
    return evaluations;
  }

  pollWithMissingEvidence(fields: Array<keyof A01Requirement>): A01Evaluation[] {
    const allocations = allocateA01Stock(this.requirements, this.stock);
    const evaluations = this.requirements.map((requirement) => {
      const incomplete: Partial<A01Requirement> = { ...requirement };
      for (const field of fields) delete incomplete[field];
      return evaluateA01(incomplete, allocations.get(conditionKey(requirement)), this.currentAt);
    });
    for (const evaluation of evaluations) this.applyEvaluation(evaluation);
    return evaluations;
  }

  reschedule(workOrderId: string, materialRequirementId: string, plannedStartAt: string) {
    const requirement = this.findRequirement(workOrderId, materialRequirementId);
    const key = conditionKey(requirement);
    const open = this.latestOpen(key);
    if (open) this.transition(open, "resolved");
    this.suppressed.delete(key);
    requirement.plannedStartAt = plannedStartAt;
    return this.poll(true);
  }

  closeWithoutResolution(
    workOrderId: string,
    materialRequirementId: string,
    comment: string,
    actorReference: string,
  ) {
    if (comment.trim().length === 0 || actorReference.trim().length === 0) {
      throw new Error("a01_closure_evidence_required");
    }
    const requirement = this.findRequirement(workOrderId, materialRequirementId);
    const key = conditionKey(requirement);
    const open = this.latestOpen(key);
    if (!open) throw new Error("a01_open_occurrence_required");
    open.lifecycle = "closed_without_resolution";
    open.closureReason = "physical_operation_outside_erp";
    open.closureComment = comment.trim();
    open.closureActorReference = actorReference.trim();
    open.closureAt = this.currentAt;
    open.lastChangedAt = this.currentAt;
    this.suppressed.add(key);
    return cloneOccurrence(open);
  }

  snapshot() {
    return {
      currentAt: this.currentAt,
      requirements: this.requirements.map(cloneRequirement),
      stock: this.stock.map((row) => ({ ...row })),
      occurrences: this.occurrences.map(cloneOccurrence),
      suppressedConditionKeys: [...this.suppressed].sort(),
    };
  }

  private applyEvaluation(evaluation: A01Evaluation) {
    if (evaluation.status === "insufficient") return;
    const open = this.latestOpen(evaluation.conditionKey);
    if (evaluation.status === "clear") {
      if (open) this.transition(open, "resolved");
      this.suppressed.delete(evaluation.conditionKey);
      return;
    }
    if (this.suppressed.has(evaluation.conditionKey)) return;
    if (open) {
      if (JSON.stringify(open.reasons) !== JSON.stringify(evaluation.reasons)) {
        open.reasons = [...evaluation.reasons];
        open.lastChangedAt = this.currentAt;
        open.observationCount += 1;
      }
      return;
    }
    const occurrence = this.occurrences.filter((row) => row.conditionKey === evaluation.conditionKey).length + 1;
    this.occurrences.push({
      id: `A01-LAB-${occurrence}-${this.occurrences.length + 1}`,
      conditionKey: evaluation.conditionKey,
      occurrence,
      lifecycle: "open",
      label: "Error",
      reasons: [...evaluation.reasons],
      openedAt: this.currentAt,
      lastChangedAt: this.currentAt,
      observationCount: 1,
      closureReason: null,
      closureComment: null,
      closureActorReference: null,
      closureAt: null,
    });
  }

  private transition(occurrence: A01LaboratoryOccurrence, lifecycle: "resolved") {
    occurrence.lifecycle = lifecycle;
    occurrence.lastChangedAt = this.currentAt;
  }

  private latestOpen(key: string) {
    return [...this.occurrences].reverse().find((row) => row.conditionKey === key && row.lifecycle === "open");
  }

  private findRequirement(workOrderId: string, materialRequirementId: string) {
    const requirement = this.requirements.find((row) =>
      row.workOrderId === workOrderId && row.materialRequirementId === materialRequirementId);
    if (!requirement) throw new Error("unknown_a01_requirement");
    return requirement;
  }
}
