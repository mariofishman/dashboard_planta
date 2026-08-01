import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { B01StandaloneLaboratory, type B01LaboratorySnapshot } from "./b01-laboratory.js";

let observedAt = "2026-07-31T15:00:00.000Z";
let laboratory: B01StandaloneLaboratory;

const trigger: B01LaboratorySnapshot = {
  workOrderId: 151104,
  machineId: "P15",
  actualStarted: true,
  actualStartedAt: "2026-07-31T14:00:00.000Z",
  nextApprovedWorkOrderId: 151099,
  sequenceUpdatedBeforeStart: false,
};

beforeEach(() => {
  observedAt = "2026-07-31T15:00:00.000Z";
  laboratory = new B01StandaloneLaboratory(() => observedAt);
});

describe("B01 standalone deterministic laboratory", () => {
  it("B01-00 resets repeatably and does not trigger before an OT starts", () => {
    laboratory.evaluate({ status: "healthy", snapshot: trigger });
    laboratory.reset();
    const result = laboratory.evaluate({
      status: "healthy",
      snapshot: { ...trigger, actualStarted: false, actualStartedAt: "2026-07-31T14:00:00.000Z" },
    });
    assert.equal(result.disposition, "clear");
    assert.equal(result.incident, null);
  });

  it("B01-01 triggers when the started OT is not next and no prior update exists", () => {
    const result = laboratory.evaluate({ status: "healthy", snapshot: trigger });
    assert.equal(result.disposition, "triggered");
    assert.equal(result.incident?.incidentId, "B01-LAB-151104-01");
    assert.equal(result.incident?.conditionKey, "B01:b01-plan-sequence-deviation:1:workOrderId=151104");
  });

  it("B01-02 does not trigger when the OT is next or the valid update preceded start", () => {
    assert.equal(laboratory.evaluate({
      status: "healthy", snapshot: { ...trigger, nextApprovedWorkOrderId: trigger.workOrderId },
    }).disposition, "clear");
    assert.equal(laboratory.evaluate({
      status: "healthy", snapshot: { ...trigger, sequenceUpdatedBeforeStart: true },
    }).disposition, "clear");
  });

  it("B01-03 and B01-04 preserve one continuing occurrence without duplicates", () => {
    const first = laboratory.evaluate({ status: "healthy", snapshot: trigger });
    observedAt = "2026-07-31T15:05:00.000Z";
    const repeated = laboratory.evaluate({ status: "healthy", snapshot: trigger });
    assert.equal(repeated.incident?.incidentId, first.incident?.incidentId);
    assert.equal(repeated.incident?.occurrence, 1);
    assert.equal(repeated.incident?.updatedAt, observedAt);
  });

  it("B01-05 resolves from a valid late update while preserving the original deviation", () => {
    laboratory.evaluate({ status: "healthy", snapshot: trigger });
    observedAt = "2026-07-31T15:10:00.000Z";
    const result = laboratory.evaluate({
      status: "healthy",
      snapshot: {
        ...trigger,
        lateSequenceUpdate: {
          recordedAt: "2026-07-31T14:10:00.000Z",
          actorReference: "emusasoft-user-42",
          reason: "Material for the planned OT was unavailable",
        },
      },
    });
    assert.equal(result.disposition, "clear");
    assert.equal(result.incident?.lifecycle, "resolved");
    assert.equal(result.incident?.expectedWorkOrderId, 151099);
    assert.equal(result.incident?.startedWorkOrderId, 151104);
    assert.equal(result.incident?.resolutionEvidence?.reason, "Material for the planned OT was unavailable");
  });

  it("B01-06 requires complete administrative closure evidence and suppresses the uninterrupted condition", () => {
    laboratory.evaluate({ status: "healthy", snapshot: trigger });
    assert.throws(() => laboratory.closeWithoutResolution({
      workOrderId: trigger.workOrderId, actorReference: "admin-1", reason: "historical_gap", comment: "",
    }), /requires actor, reason, and comment/);
    const closed = laboratory.closeWithoutResolution({
      workOrderId: trigger.workOrderId,
      actorReference: "admin-1",
      reason: "historical_gap",
      comment: "The former sequence cannot be reconstructed safely",
    });
    const repeated = laboratory.evaluate({ status: "healthy", snapshot: trigger });
    assert.equal(closed.lifecycle, "closed_without_resolution");
    assert.equal(repeated.incident?.incidentId, closed.incidentId);
    assert.equal(repeated.incident?.lifecycle, "closed_without_resolution");
  });

  it("B01-07 expires administrative suppression only after a healthy clear evaluation", () => {
    laboratory.evaluate({ status: "healthy", snapshot: trigger });
    laboratory.closeWithoutResolution({
      workOrderId: trigger.workOrderId,
      actorReference: "admin-1",
      reason: "historical_gap",
      comment: "The former sequence cannot be reconstructed safely",
    });
    laboratory.evaluate({
      status: "healthy", snapshot: { ...trigger, nextApprovedWorkOrderId: trigger.workOrderId },
    });
    assert.equal(laboratory.inspect(trigger.workOrderId)?.lifecycle, "closed_without_resolution");
    const recurrenceWithoutSourceProof = laboratory.evaluate({ status: "healthy", snapshot: trigger });
    assert.equal(recurrenceWithoutSourceProof.disposition, "insufficient");
    assert.deepEqual(recurrenceWithoutSourceProof.missingEvidence, ["sourceValidRecurrenceEvidence"]);
  });

  it("B01-08 links explanatory alerts without suppressing the B01 deviation", () => {
    const result = laboratory.evaluate({
      status: "healthy", snapshot: { ...trigger, correlatedAlertCodes: ["B03", "A01", "A01"] },
    });
    assert.equal(result.disposition, "triggered");
    assert.deepEqual(result.incident?.correlatedAlertCodes, ["A01", "B03"]);
  });

  it("B01-09 treats missing approved-plan evidence as insufficient and preserves an open incident", () => {
    const opened = laboratory.evaluate({ status: "healthy", snapshot: trigger });
    const result = laboratory.evaluate({
      status: "healthy", snapshot: { ...trigger, nextApprovedWorkOrderId: undefined },
    });
    assert.equal(result.disposition, "insufficient");
    assert.deepEqual(result.missingEvidence, ["nextApprovedWorkOrderId"]);
    assert.equal(result.incident?.incidentId, opened.incident?.incidentId);
    assert.equal(result.incident?.lifecycle, "open");
  });

  it("B01-10 preserves an open incident when the standalone evaluation cycle fails", () => {
    const opened = laboratory.evaluate({ status: "healthy", snapshot: trigger });
    const result = laboratory.evaluate({
      status: "failed", workOrderId: trigger.workOrderId, errorCode: "fixture_read_failed",
    });
    assert.equal(result.disposition, "failed_preserved");
    assert.equal(result.incident?.incidentId, opened.incident?.incidentId);
    assert.equal(result.incident?.lifecycle, "open");
  });

  it("B01-11 does not invent recurrence for the same OT after resolution", () => {
    laboratory.evaluate({ status: "healthy", snapshot: trigger });
    laboratory.evaluate({
      status: "healthy",
      snapshot: {
        ...trigger,
        lateSequenceUpdate: {
          recordedAt: "2026-07-31T14:10:00.000Z",
          actorReference: "emusasoft-user-42",
          reason: "Material for the planned OT was unavailable",
        },
      },
    });
    const result = laboratory.evaluate({ status: "healthy", snapshot: trigger });
    assert.equal(result.disposition, "insufficient");
    assert.deepEqual(result.missingEvidence, ["sourceValidRecurrenceEvidence"]);
    assert.equal(result.incident?.lifecycle, "resolved");
    assert.equal(result.incident?.occurrence, 1);
  });
});
