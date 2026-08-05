import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { D03StandaloneLaboratory, evaluateD03, type D03LaboratoryInput } from "./d03-laboratory.js";

const input = (overrides: Partial<D03LaboratoryInput> = {}): D03LaboratoryInput => ({
  workOrderId: "1513003",
  workOrderClosed: true,
  plannedProductionAreaM2: 1000,
  inkApplied: true,
  adhesiveApplied: true,
  weighedRawMaterials: [{ id: "film-1", weightKg: 1496 }],
  productionReels: [{ id: "reel-1", weightKg: 1300 }],
  wasteRecords: [{ id: "waste-1", weightKg: 90 }],
  containerBalanceValid: true,
  ...overrides,
});

const laboratory = (overrides: Partial<D03LaboratoryInput> = {}) => new D03StandaloneLaboratory({
  currentAt: "2026-08-01T18:00:00.000Z",
  input: input(overrides),
});

describe("D03 standalone deterministic laboratory", () => {
  it("D03-00 resets to the same controlled baseline", () => {
    const lab = laboratory();
    const baseline = lab.snapshot();
    lab.poll();
    lab.update({ wasteRecords: [{ id: "waste-1", weightKg: 200 }] });
    assert.deepEqual(lab.reset(), baseline);
  });

  it("D03-01 does not evaluate before OT closure", () => {
    const lab = laboratory({ workOrderClosed: false });
    assert.equal(lab.poll().status, "clear");
    assert.equal(lab.snapshot().occurrences.length, 0);
  });

  it("D03-02 requires every applicable weight and never emits Error posible", () => {
    for (const incomplete of [
      { weighedRawMaterials: [{ id: "film-1", weightKg: null }] },
      { productionReels: [{ id: "reel-1", weightKg: null }] },
      { wasteRecords: [{ id: "waste-1", weightKg: null }] },
    ]) {
      const lab = laboratory(incomplete);
      const result = lab.poll();
      assert.equal(result.status, "insufficient");
      assert.equal(result.label, null);
      assert.equal(result.missingFields.length, 1);
      assert.equal(lab.snapshot().occurrences.length, 0);
    }
  });

  it("D03-03 opens Error when input exceeds output plus waste beyond five percent", () => {
    const lab = laboratory();
    const result = lab.poll();
    assert.equal(result.status, "triggered");
    assert.equal(result.label, "Error");
    assert.equal(result.balanceGapKg, 110);
    assert.equal(result.allowedGapKg, 65);
  });

  it("D03-04 treats the absolute output-surplus gap symmetrically", () => {
    const result = evaluateD03(input({ weighedRawMaterials: [{ id: "film-1", weightKg: 1196 }] }));
    assert.equal(result.balanceGapKg, -190);
    assert.equal(result.status, "triggered");
  });

  it("D03-05 keeps exact tolerance equality clear", () => {
    const result = evaluateD03(input({ weighedRawMaterials: [{ id: "film-1", weightKg: 1451 }] }));
    assert.equal(result.balanceGapKg, 65);
    assert.equal(result.allowedGapKg, 65);
    assert.equal(result.status, "clear");
  });

  it("D03-06 keeps a gap inside tolerance clear", () => {
    assert.equal(evaluateD03(input({ weighedRawMaterials: [{ id: "film-1", weightKg: 1446 }] })).status, "clear");
  });

  it("D03-07 applies cumulative ink and adhesive to planned production area", () => {
    const both = evaluateD03(input());
    const inkOnly = evaluateD03(input({ adhesiveApplied: false }));
    assert.equal(both.theoreticalInkKg, 2);
    assert.equal(both.theoreticalAdhesiveKg, 2);
    assert.equal(both.adjustedInputKg, 1500);
    assert.equal(inkOnly.adjustedInputKg, 1498);
    assert.equal(evaluateD03(input({ productionReels: [{ id: "reel-1", weightKg: 900 }] })).theoreticalInkKg, 2);
  });

  it("D03-08 trusts scale net weight and does not subtract the core again", () => {
    const result = evaluateD03(input({ productionReels: [{ id: "reel-1", weightKg: 1300 }] }));
    assert.equal(result.goodOutputNetKg, 1300);
    assert.equal(result.balanceGapKg, 110);
  });

  it("D03-09 preserves one occurrence and deduplicates unchanged observations", () => {
    const lab = laboratory();
    lab.poll();
    lab.poll();
    const snapshot = lab.snapshot();
    assert.equal(snapshot.occurrences.length, 1);
    assert.equal(snapshot.occurrences[0]?.observationCount, 1);
  });

  it("D03-10 resolves automatically after corrected weighed evidence balances", () => {
    const lab = laboratory();
    lab.poll();
    lab.update({ wasteRecords: [{ id: "waste-1", weightKg: 200 }] });
    lab.poll();
    assert.equal(lab.snapshot().occurrences[0]?.lifecycle, "resolved");
  });

  it("D03-11 administratively closes and suppresses one uninterrupted condition", () => {
    const lab = laboratory();
    lab.poll();
    lab.closeWithoutResolution("unreconstructable_history", "The final evidence cannot be reconstructed.", "admin-7");
    lab.poll();
    const snapshot = lab.snapshot();
    assert.equal(snapshot.occurrences.length, 1);
    assert.equal(snapshot.occurrences[0]?.lifecycle, "closed_without_resolution");
    assert.equal(snapshot.occurrences[0]?.closureActorReference, "admin-7");
  });

  it("D03-12 creates recurrence only after a healthy clear evaluation", () => {
    const lab = laboratory();
    lab.poll();
    lab.closeWithoutResolution("unreconstructable_history", "The final evidence cannot be reconstructed.", "admin-7");
    lab.update({ wasteRecords: [{ id: "waste-1", weightKg: 200 }] });
    lab.poll();
    lab.update({ wasteRecords: [{ id: "waste-1", weightKg: 90 }] });
    lab.poll();
    assert.equal(lab.snapshot().occurrences.length, 2);
    assert.equal(lab.snapshot().occurrences[1]?.occurrence, 2);
  });

  it("D03-13 remains independent when other alerts describe the same issue", () => {
    const lab = laboratory({ activeOtherAlertCodes: ["A06", "D01", "D02"] });
    const result = lab.poll();
    assert.equal(result.status, "triggered");
    assert.equal(lab.snapshot().occurrences.length, 1);
  });

  it("D03-14 blocks on invalid E05 container evidence", () => {
    const lab = laboratory({ containerBalanceValid: false });
    const result = lab.poll();
    assert.equal(result.status, "insufficient");
    assert.deepEqual(result.blockers, ["e05_negative_container_consumption"]);
    assert.equal(lab.snapshot().occurrences.length, 0);
  });

  it("D03-15 preserves an open occurrence when later evidence is incomplete", () => {
    const lab = laboratory();
    lab.poll();
    lab.update({ wasteRecords: [{ id: "waste-1", weightKg: null }] });
    assert.equal(lab.poll().status, "insufficient");
    assert.equal(lab.snapshot().occurrences[0]?.lifecycle, "open");
  });

  it("D03-16 preserves an open occurrence after a failed cycle", () => {
    const lab = laboratory();
    lab.poll();
    lab.update({ wasteRecords: [{ id: "waste-1", weightKg: 200 }] });
    lab.poll(false);
    const snapshot = lab.snapshot();
    assert.equal(snapshot.occurrences[0]?.lifecycle, "open");
    assert.equal(snapshot.failedCycles, 1);
  });

  it("D03-17 requires planned area only when ink or adhesive applies", () => {
    assert.equal(evaluateD03(input({ plannedProductionAreaM2: null, inkApplied: false, adhesiveApplied: false })).status, "triggered");
    const missing = evaluateD03(input({ plannedProductionAreaM2: null, inkApplied: true, adhesiveApplied: false }));
    assert.equal(missing.status, "insufficient");
    assert.deepEqual(missing.missingFields, ["plannedProductionAreaM2"]);
  });
});
