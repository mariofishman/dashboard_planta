import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  D01StandaloneLaboratory,
  d01SuppressesDuplicateD03,
  evaluateD01,
  type D01ConsumedReel,
  type D01Snapshot,
} from "./d01-laboratory.js";

const fullReel = (overrides: Partial<D01ConsumedReel> = {}): D01ConsumedReel => ({
  reelId: "reel-1",
  consumptionState: "fully_consumed",
  initialGrossKg: 1_120,
  coreTareKg: 10,
  remnantGrossKg: null,
  widthM: 1.5,
  grammageGM2: 20,
  ...overrides,
});

const snapshot = (overrides: Partial<D01Snapshot> = {}): D01Snapshot => ({
  workOrderId: "401",
  closed: true,
  outputs: [{ outputId: "output-1", declaredMeters: 40_000, widthM: 1.5, grammageGM2: 20 }],
  layers: [{ materialRequirementId: "layer-1", reels: [fullReel()] }],
  ...overrides,
});

const laboratory = (initial = snapshot()) => new D01StandaloneLaboratory({
  currentAt: "2026-08-01T15:00:00.000Z",
  snapshot: initial,
});

describe("D01 standalone deterministic laboratory", () => {
  it("D01-00 resets repeatably and does not evaluate before closure", () => {
    const lab = laboratory(snapshot({ closed: false }));
    const baseline = lab.inspect();
    assert.equal(lab.poll().disposition, "clear");
    lab.setClock("2026-08-01T16:00:00.000Z");
    lab.replaceSnapshot(snapshot());
    lab.poll();
    assert.deepEqual(lab.reset(), baseline);
    assert.throws(
      () => lab.replaceSnapshot(snapshot({ workOrderId: "different-ot" })),
      /scoped to one work order/,
    );
  });

  it("D01-01 triggers when a layer's meter gap exceeds the kilogram-derived tolerance", () => {
    const result = evaluateD01(snapshot());
    assert.equal(result.disposition, "triggered");
    assert.equal(result.declaredMeters, 40_000);
    assert.equal(result.totalOrderKg, 1_200);
    assert.equal(result.allowedKg, 60);
    assert.equal(result.allowedMeters, 2_000);
    assert.deepEqual(result.reasonCodes, ["declared_meters_exceed_input"]);
  });

  it("D01-02 treats equality at the tolerance boundary as clear", () => {
    const result = evaluateD01(snapshot({
      layers: [{ materialRequirementId: "layer-1", reels: [fullReel({ initialGrossKg: 1_150 })] }],
    }));
    assert.equal(result.layers[0]?.consumedMeters, 38_000);
    assert.equal(result.layers[0]?.gapMeters, 2_000);
    assert.equal(result.disposition, "clear");
  });

  it("D01-03 caps tolerance at 150 kilograms", () => {
    const result = evaluateD01(snapshot({
      outputs: [{ outputId: "large-output", declaredMeters: 200_000, widthM: 2, grammageGM2: 50 }],
      layers: [{ materialRequirementId: "layer-1", reels: [fullReel({
        initialGrossKg: 19_860,
        coreTareKg: 10,
        widthM: 2,
        grammageGM2: 50,
      })] }],
    }));
    assert.equal(result.totalOrderKg, 20_000);
    assert.equal(result.allowedKg, 150);
    assert.equal(result.allowedMeters, 1_500);
    assert.equal(result.disposition, "clear");
  });

  it("D01-04 evaluates required substrate layers independently", () => {
    const result = evaluateD01(snapshot({
      layers: [
        { materialRequirementId: "printed-layer", reels: [fullReel({ reelId: "printed", initialGrossKg: 910 })] },
        { materialRequirementId: "laminating-layer", reels: [fullReel({ reelId: "laminating", initialGrossKg: 910 })] },
      ],
    }));
    assert.equal(result.disposition, "triggered");
    assert.deepEqual(result.layers.map((layer) => layer.consumedMeters), [30_000, 30_000]);
    assert.deepEqual(result.layers.map((layer) => layer.deficient), [true, true]);
  });

  it("D01-05 subtracts verified core tare from a fully consumed reel", () => {
    const result = evaluateD01(snapshot({
      layers: [{ materialRequirementId: "layer-1", reels: [fullReel({ initialGrossKg: 910, coreTareKg: 10 })] }],
    }));
    assert.equal(result.layers[0]?.consumedMeters, 30_000);
  });

  it("D01-06 uses gross-weight difference for a weighed partial remnant", () => {
    const result = evaluateD01(snapshot({
      layers: [{ materialRequirementId: "layer-1", reels: [fullReel({
        consumptionState: "partial_with_weighed_remnant",
        initialGrossKg: 1_440,
        coreTareKg: 10,
        remnantGrossKg: 300,
      })] }],
    }));
    assert.equal(result.layers[0]?.consumedMeters, 38_000);
    assert.equal(result.disposition, "clear");
  });

  it("D01-07 treats an unweighed partial remnant as insufficient and preserves an open occurrence", () => {
    const lab = laboratory();
    lab.poll();
    lab.replaceSnapshot(snapshot({
      layers: [{ materialRequirementId: "layer-1", reels: [fullReel({
        consumptionState: "partial_unweighed_remnant",
        remnantGrossKg: null,
      })] }],
    }));
    const result = lab.poll();
    assert.equal(result.disposition, "insufficient");
    assert.deepEqual(result.missingEvidence, ["layers.layer-1.reels.reel-1.remnantGrossKg"]);
    assert.equal(lab.inspect().occurrences[0]?.lifecycle, "open");
  });

  it("D01-08 treats missing full-reel core tare as insufficient", () => {
    const result = evaluateD01(snapshot({
      layers: [{ materialRequirementId: "layer-1", reels: [fullReel({ coreTareKg: null })] }],
    }));
    assert.equal(result.disposition, "insufficient");
    assert.deepEqual(result.missingEvidence, ["layers.layer-1.reels.reel-1.coreTareKg"]);
  });

  it("D01-09 keeps one occurrence for unchanged healthy observations", () => {
    const lab = laboratory();
    lab.poll();
    lab.poll();
    assert.equal(lab.inspect().occurrences.length, 1);
    assert.equal(lab.inspect().occurrences[0]?.observationCount, 1);
  });

  it("D01-10 resolves automatically after complete correction", () => {
    const lab = laboratory();
    lab.poll();
    lab.replaceSnapshot(snapshot({
      layers: [{ materialRequirementId: "layer-1", reels: [fullReel({ initialGrossKg: 1_150 })] }],
    }));
    assert.equal(lab.poll().disposition, "clear");
    assert.equal(lab.inspect().occurrences[0]?.lifecycle, "resolved");
  });

  it("D01-11 requires complete administrative closure evidence and suppresses the uninterrupted condition", () => {
    const lab = laboratory();
    lab.poll();
    assert.throws(() => lab.closeWithoutResolution({
      reason: "locked_history", comment: "", actorReference: "admin-1",
    }), /requires reason, comment, and actor/);
    const closed = lab.closeWithoutResolution({
      reason: "locked_history",
      comment: "The historical partial reel cannot be reconstructed safely.",
      actorReference: "admin-1",
    });
    lab.poll();
    assert.equal(closed.lifecycle, "closed_without_resolution");
    assert.equal(lab.inspect().occurrences.length, 1);
    assert.deepEqual(
      closed.administrativeClosure?.frozenDeficientMaterialRequirementIds,
      ["layer-1"],
    );
  });

  it("D01-12 permits recurrence only after a healthy clear evaluation", () => {
    const lab = laboratory();
    lab.poll();
    lab.closeWithoutResolution({
      reason: "locked_history",
      comment: "The historical partial reel cannot be reconstructed safely.",
      actorReference: "admin-1",
    });
    lab.replaceSnapshot(snapshot({
      layers: [{ materialRequirementId: "layer-1", reels: [fullReel({ initialGrossKg: 1_150 })] }],
    }));
    lab.poll();
    lab.replaceSnapshot(snapshot());
    lab.poll();
    assert.equal(lab.inspect().occurrences.length, 2);
    assert.equal(lab.inspect().occurrences[1]?.occurrence, 2);
  });

  it("D01-13 preserves the prior occurrence on a failed cycle", () => {
    const lab = laboratory();
    lab.poll();
    const result = lab.poll("failed");
    assert.equal(result.disposition, "failed_preserved");
    assert.equal(lab.inspect().occurrences[0]?.lifecycle, "open");
  });

  it("D01-14 suppresses a duplicate D03 only for the same triggered OT", () => {
    const result = evaluateD01(snapshot());
    assert.equal(d01SuppressesDuplicateD03(result, "401"), true);
    assert.equal(d01SuppressesDuplicateD03(result, "999"), false);
    assert.equal(d01SuppressesDuplicateD03(evaluateD01(snapshot({ closed: false })), "401"), false);
  });

  it("D01-15 keeps one OT occurrence while identifying every deficient layer", () => {
    const lab = laboratory(snapshot({
      layers: [
        { materialRequirementId: "layer-b", reels: [fullReel({ reelId: "reel-b", initialGrossKg: 910 })] },
        { materialRequirementId: "layer-a", reels: [fullReel({ reelId: "reel-a", initialGrossKg: 910 })] },
      ],
    }));
    lab.poll();
    assert.equal(lab.inspect().occurrences.length, 1);
    assert.deepEqual(
      lab.inspect().occurrences[0]?.deficientMaterialRequirementIds,
      ["layer-a", "layer-b"],
    );
  });
});
