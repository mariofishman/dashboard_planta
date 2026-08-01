import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  A01StandaloneLaboratory,
  allocateA01Stock,
  selectA01CorrelatedConsequences,
  type A01Requirement,
} from "./a01-laboratory.js";

const requirement = (overrides: Partial<A01Requirement> = {}): A01Requirement => ({
  workOrderId: "1512001",
  materialRequirementId: "11",
  materialId: "substrate-7",
  plannedStartAt: "2026-08-01T10:00:00.000Z",
  requiredKg: 500,
  reservedKg: 0,
  dispatchedKg: 0,
  canceled: false,
  actualStartAt: null,
  ...overrides,
});

const laboratory = (overrides: Partial<A01Requirement> = {}, currentAt = "2026-08-01T09:00:00.000Z") =>
  new A01StandaloneLaboratory({
    currentAt,
    requirements: [requirement(overrides)],
    stock: [{ materialId: "substrate-7", quantityKg: 500 }],
  });

describe("A01 standalone deterministic laboratory", () => {
  it("A01-00 resets to the same controlled baseline", () => {
    const lab = laboratory();
    const baseline = lab.snapshot();
    lab.setClock("2026-08-01T09:30:00.000Z");
    lab.updateRequirement("1512001", "11", { reservedKg: 500 });
    lab.poll();
    assert.deepEqual(lab.reset(), baseline);
  });

  it("A01-01 does not trigger before the 60-minute checkpoint", () => {
    const lab = laboratory({}, "2026-08-01T08:59:00.000Z");
    assert.equal(lab.poll()[0]?.status, "clear");
    assert.equal(lab.snapshot().occurrences.length, 0);
  });

  it("A01-02 triggers at exactly 60 minutes and always labels the occurrence Error", () => {
    const lab = laboratory();
    const result = lab.poll()[0];
    assert.equal(result?.checkpoint, "readiness");
    assert.equal(result?.status, "triggered");
    assert.deepEqual(result?.reasons, ["not_reserved_stock_available"]);
    assert.equal(lab.snapshot().occurrences[0]?.label, "Error");
  });

  it("A01-03 allocates stock to reserved OTs before earlier unreserved OTs", () => {
    const reserved = requirement({ workOrderId: "200", materialRequirementId: "20", plannedStartAt: "2026-08-01T11:00:00.000Z", reservedKg: 500 });
    const earlier = requirement({ workOrderId: "100", materialRequirementId: "10", plannedStartAt: "2026-08-01T10:00:00.000Z" });
    const allocation = allocateA01Stock([earlier, reserved], [{ materialId: "substrate-7", quantityKg: 500 }]);
    assert.equal([...allocation.entries()].find(([key]) => key.includes("workOrderId=200"))?.[1], 500);
    assert.equal([...allocation.entries()].find(([key]) => key.includes("workOrderId=100"))?.[1], 0);
  });

  it("A01-04 allocates remaining unreserved stock by planned start and stable OT ID", () => {
    const later = requirement({ workOrderId: "300", materialRequirementId: "30", plannedStartAt: "2026-08-01T11:00:00.000Z" });
    const tiedSecond = requirement({ workOrderId: "200", materialRequirementId: "20" });
    const tiedFirst = requirement({ workOrderId: "100", materialRequirementId: "10" });
    const allocation = allocateA01Stock([later, tiedSecond, tiedFirst], [{ materialId: "substrate-7", quantityKg: 500 }]);
    assert.equal([...allocation.entries()].find(([key]) => key.includes("workOrderId=100"))?.[1], 500);
    assert.equal([...allocation.entries()].find(([key]) => key.includes("workOrderId=200"))?.[1], 0);
    assert.equal([...allocation.entries()].find(([key]) => key.includes("workOrderId=300"))?.[1], 0);
  });

  it("A01-05 requires the full reservation quantity", () => {
    const lab = laboratory({ reservedKg: 200 });
    assert.deepEqual(lab.poll()[0]?.reasons, ["not_reserved_stock_available"]);
  });

  it("A01-06 adds dispatch only at the inclusive 30-minute checkpoint", () => {
    const lab = laboratory({ reservedKg: 500 });
    lab.setClock("2026-08-01T09:29:00.000Z");
    assert.equal(lab.poll()[0]?.status, "clear");
    lab.setClock("2026-08-01T09:30:00.000Z");
    assert.deepEqual(lab.poll()[0]?.reasons, ["reserved_not_dispatched"]);
  });

  it("A01-07 requires the full dispatch quantity", () => {
    const lab = laboratory({ reservedKg: 500, dispatchedKg: 200 }, "2026-08-01T09:30:00.000Z");
    assert.deepEqual(lab.poll()[0]?.reasons, ["reserved_not_dispatched"]);
  });

  it("A01-08 keeps the same Error occurrence after actual OT start", () => {
    const lab = laboratory();
    lab.poll();
    lab.setClock("2026-08-01T10:01:00.000Z");
    lab.updateRequirement("1512001", "11", { actualStartAt: "2026-08-01T10:00:00.000Z" });
    lab.poll();
    assert.equal(lab.snapshot().occurrences.length, 1);
    assert.equal(lab.snapshot().occurrences[0]?.lifecycle, "open");
  });

  it("A01-09 preserves one occurrence and does not duplicate unchanged observations", () => {
    const lab = laboratory();
    lab.poll();
    lab.poll();
    assert.equal(lab.snapshot().occurrences.length, 1);
    assert.equal(lab.snapshot().occurrences[0]?.observationCount, 1);
  });

  it("A01-10 resolves automatically after full correction", () => {
    const lab = laboratory({}, "2026-08-01T09:30:00.000Z");
    lab.poll();
    lab.updateRequirement("1512001", "11", { reservedKg: 500, dispatchedKg: 500 });
    lab.poll();
    assert.equal(lab.snapshot().occurrences[0]?.lifecycle, "resolved");
  });

  it("A01-11 resolves automatically when the OT is cancelled", () => {
    const lab = laboratory();
    lab.poll();
    lab.updateRequirement("1512001", "11", { canceled: true });
    lab.poll();
    assert.equal(lab.snapshot().occurrences[0]?.lifecycle, "resolved");
  });

  it("A01-12 resolves on reschedule and creates a new occurrence only at the new checkpoint", () => {
    const lab = laboratory();
    lab.poll();
    lab.reschedule("1512001", "11", "2026-08-01T13:00:00.000Z");
    assert.equal(lab.snapshot().occurrences.length, 1);
    assert.equal(lab.snapshot().occurrences[0]?.lifecycle, "resolved");
    lab.setClock("2026-08-01T12:00:00.000Z");
    lab.poll();
    assert.equal(lab.snapshot().occurrences.length, 2);
    assert.equal(lab.snapshot().occurrences[1]?.occurrence, 2);
  });

  it("A01-13 suppresses one uninterrupted condition after administrative closure and permits recurrence", () => {
    const lab = laboratory();
    lab.poll();
    lab.closeWithoutResolution("1512001", "11", "Material was physically used outside ERP.");
    lab.poll();
    assert.equal(lab.snapshot().occurrences.length, 1);
    assert.equal(lab.snapshot().occurrences[0]?.closureReason, "physical_operation_outside_erp");
    lab.updateRequirement("1512001", "11", { reservedKg: 500 });
    lab.poll();
    lab.updateRequirement("1512001", "11", { reservedKg: 0 });
    lab.poll();
    assert.equal(lab.snapshot().occurrences.length, 2);
  });

  it("A01-14 treats missing evidence as insufficient and preserves the open occurrence", () => {
    const lab = laboratory();
    lab.poll();
    const result = lab.pollWithMissingEvidence(["dispatchedKg"])[0]!;
    assert.equal(result.status, "insufficient");
    assert.deepEqual(result.missingFields, ["dispatchedKg"]);
    assert.equal(lab.snapshot().occurrences[0]?.lifecycle, "open");
  });

  it("A01-15 preserves the prior occurrence on a failed cycle", () => {
    const lab = laboratory();
    lab.poll();
    lab.updateRequirement("1512001", "11", { reservedKg: 500 });
    lab.poll(false);
    assert.equal(lab.snapshot().occurrences[0]?.lifecycle, "open");
    assert.deepEqual(lab.snapshot().occurrences[0]?.reasons, ["not_reserved_stock_available"]);
  });

  it("A01-16 selects only same-OT, same-material downstream consequences", () => {
    assert.deepEqual(selectA01CorrelatedConsequences(requirement(), [
      { id: "same-dispatch", workOrderId: "1512001", materialId: "substrate-7", consequence: "missing_dispatch" },
      { id: "same-balance", workOrderId: "1512001", materialId: "substrate-7", consequence: "balance" },
      { id: "other-material", workOrderId: "1512001", materialId: "substrate-8", consequence: "balance" },
      { id: "unrelated", workOrderId: "1512001", materialId: "substrate-7", consequence: "unrelated" },
    ]), ["same-dispatch", "same-balance"]);
  });
});
