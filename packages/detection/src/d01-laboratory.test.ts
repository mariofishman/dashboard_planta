import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  D01StandaloneLaboratory,
  classifyD01Correlations,
  evaluateD01,
  type D01Snapshot,
  type D01UsedReel,
} from "./d01-laboratory.js";

const usedMetersToInitialGrossKg = (meters: number, coreTareKg = 10) =>
  meters * 1.5 * 20 / 1000 + coreTareKg;

const fullReel = (overrides: Partial<D01UsedReel> = {}): D01UsedReel => ({
  reelId: "reel-1",
  remnantState: "no_remnant_declared",
  initialGrossKg: usedMetersToInitialGrossKg(37_000),
  verifiedCoreTareKg: 10,
  remnantGrossKg: null,
  widthM: 1.5,
  grammageGM2: 20,
  ...overrides,
});

const layerAt = (materialRequirementId: string, meters: number) => ({
  materialRequirementId,
  reels: [fullReel({
    reelId: `${materialRequirementId}-reel`,
    initialGrossKg: usedMetersToInitialGrossKg(meters),
  })],
});

const snapshot = (overrides: Partial<D01Snapshot> = {}): D01Snapshot => ({
  workOrderId: "401",
  closed: true,
  outputs: [{ outputId: "output-1", declaredMeters: 40_000, widthM: 1.5, grammageGM2: 20 }],
  requiredLayers: [layerAt("layer-1", 37_000)],
  ...overrides,
});

const laboratory = (initial = snapshot()) => new D01StandaloneLaboratory({
  currentAt: "2026-08-01T15:00:00.000Z",
  snapshot: initial,
});

describe("D01 consolidated standalone deterministic laboratory", () => {
  it("D01-00 resets repeatably and does not evaluate before closure", () => {
    const lab = laboratory(snapshot({ closed: false }));
    const baseline = lab.inspect();
    assert.equal(lab.poll().disposition, "not_applicable");
    lab.setClock("2026-08-01T16:00:00.000Z");
    lab.replaceSnapshot(snapshot());
    lab.poll();
    assert.deepEqual(lab.reset(), baseline);
    assert.throws(() => lab.replaceSnapshot(snapshot({ workOrderId: "different-ot" })), /scoped/);
  });

  it("D01-01 detects declared run meters above a required layer", () => {
    const result = evaluateD01(snapshot());
    assert.equal(result.disposition, "triggered");
    assert.equal(result.declaredRunMeters, 40_000);
    assert.equal(result.totalOrderKg, 1_200);
    assert.equal(result.allowedKg, 60);
    assert.equal(result.allowedMeters, 2_000);
    assert.equal(result.layers[0]?.layerToRunGapMeters, -3_000);
    assert.deepEqual(result.reasonCodes, ["declared_meters_exceed_layer_input"]);
  });

  it("D01-02 treats equality at both signed and pairwise tolerance boundaries as clear", () => {
    for (const meters of [38_000, 42_000]) {
      assert.equal(evaluateD01(snapshot({ requiredLayers: [layerAt("layer-1", meters)] })).disposition, "clear");
    }
    const pairwise = evaluateD01(snapshot({
      requiredLayers: [layerAt("layer-a", 39_000), layerAt("layer-b", 41_000)],
    }));
    assert.equal(pairwise.pairwiseGaps[0]?.gapMeters, -2_000);
    assert.equal(pairwise.disposition, "clear");
    const exact = evaluateD01(snapshot({
      requiredLayers: [layerAt("layer-a", 40_000), layerAt("layer-b", 40_000)],
    }));
    assert.equal(exact.disposition, "clear");
    assert.deepEqual(exact.layers.map((layer) => layer.layerToRunGapMeters), [0, 0]);
    assert.equal(exact.pairwiseGaps[0]?.gapMeters, 0);
    assert.equal(exact.pairwiseGaps[0]?.exceedsTolerance, false);
  });

  it("D01-03 caps tolerance at 150 kilograms", () => {
    const result = evaluateD01(snapshot({
      outputs: [{ outputId: "large", declaredMeters: 200_000, widthM: 2, grammageGM2: 50 }],
      requiredLayers: [{
        materialRequirementId: "layer-1",
        reels: [fullReel({ initialGrossKg: 19_860, verifiedCoreTareKg: 10, widthM: 2, grammageGM2: 50 })],
      }],
    }));
    assert.equal(result.totalOrderKg, 20_000);
    assert.equal(result.allowedKg, 150);
    assert.equal(result.allowedMeters, 1_500);
    assert.equal(result.disposition, "clear");
  });

  it("D01-04 evaluates required layers independently and never sums them", () => {
    const result = evaluateD01(snapshot({
      requiredLayers: [
        {
          materialRequirementId: "printed",
          reels: [
            fullReel({ reelId: "printed-1", initialGrossKg: usedMetersToInitialGrossKg(15_000) }),
            fullReel({ reelId: "printed-2", initialGrossKg: usedMetersToInitialGrossKg(15_000) }),
          ],
        },
        layerAt("laminating", 30_000),
      ],
    }));
    assert.deepEqual(result.layers.map((layer) => layer.usedMeters), [30_000, 30_000]);
    assert.deepEqual(result.layers.map((layer) => layer.layerToRunGapMeters), [-10_000, -10_000]);
    assert.equal(result.disposition, "triggered");
  });

  it("D01-05 requires verified core tare for a fully used reel", () => {
    const valid = evaluateD01(snapshot({ requiredLayers: [layerAt("layer-1", 30_000)] }));
    assert.equal(valid.layers[0]?.reels[0]?.measurementPath, "initial_gross_minus_core_tare");
    assert.equal(valid.layers[0]?.usedMeters, 30_000);
    const missing = evaluateD01(snapshot({
      requiredLayers: [{ materialRequirementId: "layer-1", reels: [fullReel({ verifiedCoreTareKg: null })] }],
    }));
    assert.equal(missing.disposition, "insufficient");
  });

  it("D01-06 subtracts a weighed partial remnant once and does not subtract core tare twice", () => {
    const result = evaluateD01(snapshot({
      requiredLayers: [{ materialRequirementId: "layer-1", reels: [fullReel({
        remnantState: "declared_remnant_weighed",
        initialGrossKg: 1_440,
        verifiedCoreTareKg: 10,
        remnantGrossKg: 300,
      })] }],
    }));
    assert.equal(result.layers[0]?.reels[0]?.netUsedKg, 1_140);
    assert.equal(result.layers[0]?.usedMeters, 38_000);
    assert.equal(result.disposition, "clear");
  });

  it("D01-07 preserves an open occurrence when a declared remnant is unweighed", () => {
    const lab = laboratory();
    lab.poll();
    lab.replaceSnapshot(snapshot({
      requiredLayers: [{ materialRequirementId: "layer-1", reels: [fullReel({
        remnantState: "declared_remnant_unweighed",
        remnantGrossKg: null,
      })] }],
    }));
    assert.equal(lab.poll().disposition, "insufficient");
    assert.equal(lab.inspect().occurrences[0]?.lifecycle, "open");
  });

  it("D01-08 treats a fully used reel without verified core tare as insufficient", () => {
    const result = evaluateD01(snapshot({
      requiredLayers: [{ materialRequirementId: "layer-1", reels: [fullReel({
        verifiedCoreTareKg: null,
      })] }],
    }));
    assert.equal(result.disposition, "insufficient");
    assert.deepEqual(result.missingEvidence, [
      "requiredLayers.layer-1.reels.reel-1.verifiedCoreTareKg",
    ]);
  });

  it("D01-09 does not duplicate an occurrence or evidence for identical observations", () => {
    const lab = laboratory(snapshot({
      requiredLayers: [layerAt("layer-b", 37_000), layerAt("layer-a", 37_000)],
    }));
    lab.poll();
    lab.replaceSnapshot(snapshot({
      requiredLayers: [layerAt("layer-a", 37_000), layerAt("layer-b", 37_000)],
    }));
    lab.poll();
    assert.equal(lab.inspect().occurrences.length, 1);
    assert.equal(lab.inspect().occurrences[0]?.observationCount, 1);
  });

  it("D01-10 resolves only after a complete healthy correction", () => {
    const lab = laboratory();
    lab.poll();
    lab.replaceSnapshot(snapshot({ requiredLayers: [layerAt("layer-1", 40_000)] }));
    assert.equal(lab.poll().disposition, "clear");
    assert.equal(lab.inspect().occurrences[0]?.lifecycle, "resolved");
  });

  it("D01-11 freezes full layer and pairwise evidence on administrative closure", () => {
    const lab = laboratory(snapshot({
      requiredLayers: [layerAt("layer-a", 37_000), layerAt("layer-b", 43_000)],
    }));
    lab.poll();
    assert.throws(() => lab.closeWithoutResolution({ reason: "locked", comment: "", actorReference: "admin" }), /requires/);
    const closed = lab.closeWithoutResolution({
      reason: "locked_history",
      comment: "The source history cannot be reconstructed safely.",
      actorReference: "admin-1",
    });
    assert.equal(closed.lifecycle, "closed_without_resolution");
    assert.equal(closed.administrativeClosure?.frozenEvidence.layers.length, 2);
    assert.equal(closed.administrativeClosure?.frozenEvidence.pairwiseGaps.length, 1);
    assert.deepEqual(closed.administrativeClosure?.frozenEvidence.reasonCodes, [
      "declared_meters_exceed_layer_input",
      "layer_input_exceeds_declared_meters",
      "substrate_layers_do_not_match",
    ]);
  });

  it("D01-12 creates a recurrence only after a proved clear interval", () => {
    const lab = laboratory();
    lab.poll();
    lab.closeWithoutResolution({ reason: "locked", comment: "Unrecoverable history.", actorReference: "admin" });
    lab.poll();
    assert.equal(lab.inspect().occurrences.length, 1);
    lab.replaceSnapshot(snapshot({ requiredLayers: [layerAt("layer-1", 40_000)] }));
    lab.poll();
    lab.replaceSnapshot(snapshot());
    lab.poll();
    assert.equal(lab.inspect().occurrences.length, 2);
  });

  it("D01-13 preserves an existing occurrence on a failed cycle", () => {
    const lab = laboratory();
    lab.poll();
    assert.equal(lab.poll("failed").disposition, "failed_preserved");
    assert.equal(lab.inspect().occurrences[0]?.lifecycle, "open");
  });

  it("D01-14 keeps D03 independent without inspecting D03 evidence", () => {
    const result = evaluateD01(snapshot());
    assert.equal(classifyD01Correlations(result, {
      D03: { active: true },
    }).D03, "independent_mass_balance_condition");
  });

  it("D01-15 keeps one occurrence while identifying every deficient layer", () => {
    const lab = laboratory(snapshot({
      requiredLayers: [layerAt("layer-b", 37_000), layerAt("layer-a", 37_000)],
    }));
    const result = lab.poll();
    assert.deepEqual(result.reasonCodes, ["declared_meters_exceed_layer_input"]);
    assert.equal(lab.inspect().occurrences.length, 1);
    assert.deepEqual(lab.inspect().occurrences[0]?.affectedMaterialRequirementIds, ["layer-a", "layer-b"]);
  });

  it("D01-16 detects used layer meters above declared run meters", () => {
    const result = evaluateD01(snapshot({ requiredLayers: [layerAt("layer-1", 43_000)] }));
    assert.equal(result.layers[0]?.layerToRunGapMeters, 3_000);
    assert.deepEqual(result.reasonCodes, ["layer_input_exceeds_declared_meters"]);
  });

  it("D01-17 detects pairwise mismatch when both layers are within run tolerance", () => {
    const result = evaluateD01(snapshot({
      requiredLayers: [layerAt("layer-a", 38_999), layerAt("layer-b", 41_001)],
    }));
    assert.deepEqual(result.layers.map((layer) => layer.reasonCodes), [[], []]);
    assert.equal(result.pairwiseGaps[0]?.exceedsTolerance, true);
    assert.deepEqual(result.reasonCodes, ["substrate_layers_do_not_match"]);
  });

  it("D01-18 keeps multiple directions and pairwise mismatch in one occurrence", () => {
    const lab = laboratory(snapshot({
      requiredLayers: [layerAt("layer-b", 43_000), layerAt("layer-a", 37_000)],
    }));
    const result = lab.poll();
    assert.deepEqual(result.reasonCodes, [
      "declared_meters_exceed_layer_input",
      "layer_input_exceeds_declared_meters",
      "substrate_layers_do_not_match",
    ]);
    assert.equal(lab.inspect().occurrences.length, 1);
  });

  it("D01-19 evaluates immediately at closure when no remnant is declared", () => {
    const result = evaluateD01(snapshot());
    assert.equal(result.disposition, "triggered");
    assert.equal(result.layers[0]?.reels[0]?.measurementPath, "initial_gross_minus_core_tare");
  });

  it("D01-20 evaluates as soon as a declared remnant is weighed", () => {
    const lab = laboratory(snapshot({
      requiredLayers: [{ materialRequirementId: "layer-1", reels: [fullReel({
        remnantState: "declared_remnant_unweighed",
      })] }],
    }));
    assert.equal(lab.poll().disposition, "insufficient");
    lab.replaceSnapshot(snapshot({
      requiredLayers: [{ materialRequirementId: "layer-1", reels: [fullReel({
        remnantState: "declared_remnant_weighed",
        initialGrossKg: 1_440,
        remnantGrossKg: 300,
      })] }],
    }));
    assert.equal(lab.poll().disposition, "clear");
  });

  it("D01-21 rejects invalid measurements and cross-layer reel reuse", () => {
    const invalidTare = evaluateD01(snapshot({
      requiredLayers: [{ materialRequirementId: "layer-1", reels: [fullReel({
        initialGrossKg: 10,
        verifiedCoreTareKg: 10,
      })] }],
    }));
    assert.match(invalidTare.missingEvidence.join(" "), /validVerifiedCoreTareKg/);
    const invalidRemnant = evaluateD01(snapshot({
      requiredLayers: [{ materialRequirementId: "layer-1", reels: [fullReel({
        remnantState: "declared_remnant_weighed",
        remnantGrossKg: fullReel().initialGrossKg,
      })] }],
    }));
    assert.match(invalidRemnant.missingEvidence.join(" "), /validGrossWeightDifference/);
    const duplicatedReel = evaluateD01(snapshot({
      requiredLayers: [
        { materialRequirementId: "layer-a", reels: [fullReel({ reelId: "shared-reel" })] },
        { materialRequirementId: "layer-b", reels: [fullReel({ reelId: "shared-reel" })] },
      ],
    }));
    assert.equal(duplicatedReel.disposition, "insufficient");
    assert.match(duplicatedReel.missingEvidence.join(" "), /uniqueAcrossWorkOrder/);
  });

  it("D01-22 incomplete evidence creates no new occurrence", () => {
    const lab = laboratory(snapshot({
      requiredLayers: [{ materialRequirementId: "layer-1", reels: [fullReel({ verifiedCoreTareKg: null })] }],
    }));
    assert.equal(lab.poll().disposition, "insufficient");
    assert.equal(lab.inspect().occurrences.length, 0);
  });

  it("D01-23 changed complete evidence updates the same occurrence", () => {
    const lab = laboratory();
    lab.poll();
    lab.replaceSnapshot(snapshot({ requiredLayers: [layerAt("layer-1", 36_000)] }));
    lab.poll();
    assert.equal(lab.inspect().occurrences.length, 1);
    assert.equal(lab.inspect().occurrences[0]?.observationCount, 2);
    assert.equal(lab.inspect().occurrences[0]?.layers[0]?.usedMeters, 36_000);
  });

  it("D01-24 replaces or enriches A04 only for the same explained evidence chain", () => {
    const result = evaluateD01(snapshot());
    assert.equal(classifyD01Correlations(result, {
      A04: { active: true, workOrderId: "401", sameEvidenceChain: true },
    }).A04, "replaced_or_enriched_by_d01");
    assert.equal(classifyD01Correlations(result, {
      A04: { active: true, workOrderId: "401", sameEvidenceChain: false },
    }).A04, "independent_capacity_condition");
  });

  it("D01-25 keeps an independently active A05 handling condition distinct", () => {
    const classification = classifyD01Correlations(evaluateD01(snapshot()), {
      A05: { active: true, workOrderId: "401", sameEvidenceChain: true },
    });
    assert.equal(classification.A05, "independent_reel_handling_condition");
  });

  it("D01-26 leaves no active D04 contract, fixture, or evaluator", async () => {
    const root = resolve(import.meta.dirname, "../../..");
    const contracts = JSON.parse(await readFile(resolve(root, "config/alerts/alert-rules.v1.json"), "utf8"));
    const fixtures = JSON.parse(await readFile(resolve(root, "tests/fixtures/alerts/rule-cases.v1.json"), "utf8"));
    const detectionFiles = await readdir(resolve(root, "packages/detection/src"));
    assert.equal(contracts.rules.some((rule: { code: string }) => rule.code === "D04"), false);
    assert.equal(fixtures.cases.some((fixture: { ruleCode: string }) => fixture.ruleCode === "D04"), false);
    assert.equal(detectionFiles.some((filename) => filename.startsWith("d04-")), false);
  });
});
