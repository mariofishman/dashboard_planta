import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { D02StandaloneLaboratory, type D02LaboratorySnapshot } from "./d02-laboratory.js";

let observedAt = "2026-08-01T15:00:00.000Z";
let laboratory: D02StandaloneLaboratory;

const unused: D02LaboratorySnapshot = {
  workOrderId: 152402,
  articleSerialId: 42001,
  workOrderClosed: true,
  plannedProductionQuantity: "10000",
  goodOutputQuantity: "9000",
  productionQuantityUnit: "m",
  reservedReelDelivered: true,
  consumedQuantity: "0",
  reelDisposition: "at_machine",
};

beforeEach(() => {
  observedAt = "2026-08-01T15:00:00.000Z";
  laboratory = new D02StandaloneLaboratory(() => observedAt);
});

describe("D02 standalone deterministic laboratory", () => {
  it("D02-00 resets repeatably to an empty baseline", () => {
    laboratory.evaluate({ status: "healthy", snapshot: unused });
    laboratory.reset();
    assert.equal(laboratory.inspect(unused.workOrderId, unused.articleSerialId), null);
    assert.deepEqual(laboratory.inspectHistory(unused.workOrderId, unused.articleSerialId), []);
  });

  it("D02-01 triggers inclusively at exactly 90% completion", () => {
    const result = laboratory.evaluate({ status: "healthy", snapshot: unused });
    assert.equal(result.disposition, "triggered");
    assert.deepEqual(result.reasons, ["delivered_reel_unconsumed"]);
    assert.equal(result.incident?.incidentId, "D02-LAB-152402-42001-01");
    assert.equal(result.incident?.conditionKey, "D02:d02-delivered-reel-unconsumed:1:workOrderId=152402|articleSerialId=42001");
  });

  it("D02-02 remains clear immediately below the 90% boundary", () => {
    const result = laboratory.evaluate({
      status: "healthy",
      snapshot: { ...unused, goodOutputQuantity: "8999.999" },
    });
    assert.equal(result.disposition, "clear");
    assert.equal(result.incident, null);
  });

  it("D02-03 remains clear while the OT is open", () => {
    const result = laboratory.evaluate({
      status: "healthy",
      snapshot: { ...unused, workOrderClosed: false, goodOutputQuantity: "10000" },
    });
    assert.equal(result.disposition, "clear");
  });

  it("D02-04 remains clear when the reserved reel was not delivered", () => {
    const result = laboratory.evaluate({
      status: "healthy",
      snapshot: { ...unused, reservedReelDelivered: false },
    });
    assert.equal(result.disposition, "clear");
  });

  it("D02-05 treats any positive partial consumption as use of the reel", () => {
    const result = laboratory.evaluate({
      status: "healthy",
      snapshot: { ...unused, consumedQuantity: "0.001" },
    });
    assert.equal(result.disposition, "clear");
    assert.equal(result.incident, null);
  });

  it("D02-06 remains clear when the unused reel was returned", () => {
    const result = laboratory.evaluate({
      status: "healthy",
      snapshot: { ...unused, reelDisposition: "returned" },
    });
    assert.equal(result.disposition, "clear");
  });

  it("D02-07 remains clear when the unused reel was reassigned", () => {
    const result = laboratory.evaluate({
      status: "healthy",
      snapshot: { ...unused, reelDisposition: "reassigned" },
    });
    assert.equal(result.disposition, "clear");
  });

  it("D02-08 preserves one occurrence on repeated healthy evaluation", () => {
    const first = laboratory.evaluate({ status: "healthy", snapshot: unused });
    observedAt = "2026-08-01T15:05:00.000Z";
    const repeated = laboratory.evaluate({ status: "healthy", snapshot: unused });
    assert.equal(repeated.incident?.incidentId, first.incident?.incidentId);
    assert.equal(repeated.incident?.occurrence, 1);
    assert.equal(repeated.incident?.updatedAt, observedAt);
    assert.equal(laboratory.inspectHistory(unused.workOrderId, unused.articleSerialId).length, 1);
  });

  it("D02-09 resolves the same occurrence after positive partial consumption", () => {
    const opened = laboratory.evaluate({ status: "healthy", snapshot: unused });
    observedAt = "2026-08-01T15:10:00.000Z";
    const resolved = laboratory.evaluate({
      status: "healthy",
      snapshot: { ...unused, consumedQuantity: "125.500" },
    });
    assert.equal(resolved.disposition, "clear");
    assert.equal(resolved.incident?.incidentId, opened.incident?.incidentId);
    assert.equal(resolved.incident?.lifecycle, "resolved");
    assert.equal(resolved.incident?.resolutionEvidence?.consumedQuantity, "125.500");
  });

  it("D02-10 resolves after completion or delivery evidence is corrected", () => {
    for (const correction of [
      { goodOutputQuantity: "8999.999" },
      { reservedReelDelivered: false },
    ]) {
      laboratory.reset();
      laboratory.evaluate({ status: "healthy", snapshot: unused });
      const resolved = laboratory.evaluate({
        status: "healthy",
        snapshot: { ...unused, ...correction },
      });
      assert.equal(resolved.incident?.lifecycle, "resolved");
    }
  });

  it("D02-11 requires complete administrative closure evidence and suppresses the uninterrupted condition", () => {
    laboratory.evaluate({ status: "healthy", snapshot: unused });
    assert.throws(() => laboratory.closeWithoutResolution({
      workOrderId: unused.workOrderId,
      articleSerialId: unused.articleSerialId,
      actorReference: "admin-1",
      reason: "unproven_reel_disposition",
      comment: "",
    }), /requires actor, reason, and comment/);
    const closed = laboratory.closeWithoutResolution({
      workOrderId: unused.workOrderId,
      articleSerialId: unused.articleSerialId,
      actorReference: "admin-1",
      reason: "unproven_reel_disposition",
      comment: "The reel disposition cannot be reconstructed safely",
    });
    const repeated = laboratory.evaluate({ status: "healthy", snapshot: unused });
    assert.equal(closed.lifecycle, "closed_without_resolution");
    assert.equal(repeated.disposition, "triggered");
    assert.equal(repeated.incident?.incidentId, closed.incidentId);
    assert.equal(repeated.incident?.lifecycle, "closed_without_resolution");
  });

  it("D02-12 expires administrative suppression after a healthy clear evaluation", () => {
    laboratory.evaluate({ status: "healthy", snapshot: unused });
    laboratory.closeWithoutResolution({
      workOrderId: unused.workOrderId,
      articleSerialId: unused.articleSerialId,
      actorReference: "admin-1",
      reason: "unproven_reel_disposition",
      comment: "The reel disposition cannot be reconstructed safely",
    });
    const clear = laboratory.evaluate({
      status: "healthy",
      snapshot: { ...unused, reelDisposition: "returned" },
    });
    assert.equal(clear.disposition, "clear");
    const withoutEvidence = laboratory.evaluate({ status: "healthy", snapshot: unused });
    assert.equal(withoutEvidence.disposition, "insufficient");
  });

  it("D02-13 creates occurrence 2 only with source-valid recurrence evidence", () => {
    laboratory.evaluate({ status: "healthy", snapshot: unused });
    laboratory.evaluate({
      status: "healthy",
      snapshot: { ...unused, consumedQuantity: "1" },
    });
    observedAt = "2026-08-01T15:20:00.000Z";
    const recurrence = laboratory.evaluate({
      status: "healthy",
      snapshot: { ...unused, sourceValidRecurrenceEvidence: true },
    });
    assert.equal(recurrence.disposition, "triggered");
    assert.equal(recurrence.incident?.occurrence, 2);
    assert.equal(laboratory.inspectHistory(unused.workOrderId, unused.articleSerialId).length, 2);
  });

  it("D02-14 refuses to invent recurrence without source-valid evidence", () => {
    laboratory.evaluate({ status: "healthy", snapshot: unused });
    laboratory.evaluate({
      status: "healthy",
      snapshot: { ...unused, consumedQuantity: "1" },
    });
    const recurrence = laboratory.evaluate({ status: "healthy", snapshot: unused });
    assert.equal(recurrence.disposition, "insufficient");
    assert.deepEqual(recurrence.missingEvidence, ["sourceValidRecurrenceEvidence"]);
    assert.equal(laboratory.inspectHistory(unused.workOrderId, unused.articleSerialId).length, 1);
  });

  it("D02-15 treats missing or invalid quantities as insufficient and preserves the open occurrence", () => {
    const opened = laboratory.evaluate({ status: "healthy", snapshot: unused });
    const missing = laboratory.evaluate({
      status: "healthy",
      snapshot: { ...unused, goodOutputQuantity: undefined },
    });
    assert.equal(missing.disposition, "insufficient");
    assert.deepEqual(missing.missingEvidence, ["validGoodOutputQuantity"]);
    assert.equal(missing.incident?.incidentId, opened.incident?.incidentId);
    assert.equal(missing.incident?.lifecycle, "open");
    const invalid = laboratory.evaluate({
      status: "healthy",
      snapshot: { ...unused, plannedProductionQuantity: "0", consumedQuantity: "-1" },
    });
    assert.deepEqual(invalid.missingEvidence, [
      "validPositivePlannedProductionQuantity",
      "validConsumedQuantity",
    ]);
    const malformedDisposition = laboratory.evaluate({
      status: "healthy",
      snapshot: { ...unused, reelDisposition: "unknown" as never },
    });
    assert.deepEqual(malformedDisposition.missingEvidence, ["validReelDisposition"]);
  });

  it("D02-16 preserves the open occurrence after a failed cycle", () => {
    const opened = laboratory.evaluate({ status: "healthy", snapshot: unused });
    const failed = laboratory.evaluate({
      status: "failed",
      workOrderId: unused.workOrderId,
      articleSerialId: unused.articleSerialId,
      errorCode: "fixture_read_failed",
    });
    assert.equal(failed.disposition, "failed_preserved");
    assert.equal(failed.incident?.incidentId, opened.incident?.incidentId);
    assert.equal(failed.incident?.lifecycle, "open");
  });

  it("D02-17 reports D02 as the specific cause that suppresses duplicate D03", () => {
    const result = laboratory.evaluate({ status: "healthy", snapshot: unused });
    assert.deepEqual(result.correlationInstructions, ["suppress_duplicate_D03"]);
    assert.deepEqual(result.incident?.correlationInstructions, ["suppress_duplicate_D03"]);
  });

  it("D02-18 keeps two delivered reels under one OT as independent conditions", () => {
    const first = laboratory.evaluate({ status: "healthy", snapshot: unused });
    const second = laboratory.evaluate({
      status: "healthy",
      snapshot: { ...unused, articleSerialId: 42002 },
    });
    assert.notEqual(first.incident?.conditionKey, second.incident?.conditionKey);
    assert.equal(first.incident?.occurrence, 1);
    assert.equal(second.incident?.occurrence, 1);
  });
});
