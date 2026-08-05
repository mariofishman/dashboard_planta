import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { B02StandaloneLaboratory, type B02LaboratorySnapshot } from "./b02-laboratory.js";

let observedAt = "2026-08-01T16:00:00.000Z";
let laboratory: B02StandaloneLaboratory;

const missed: B02LaboratorySnapshot = {
  workOrderId: 151230,
  planVersionId: 7,
  machineId: "P15",
  plannedStartAt: "2026-08-01T16:00:00.000Z",
  actualStartedAt: null,
  approvedPlanUpdate: null,
};

beforeEach(() => {
  observedAt = "2026-08-01T16:00:00.000Z";
  laboratory = new B02StandaloneLaboratory(() => observedAt);
});

describe("B02 standalone deterministic laboratory", () => {
  it("B02-00 resets repeatably and remains clear before the planned start", () => {
    laboratory.evaluate({ status: "healthy", snapshot: missed });
    laboratory.reset();
    observedAt = "2026-08-01T15:59:59.999Z";
    const result = laboratory.evaluate({ status: "healthy", snapshot: missed });
    assert.equal(result.disposition, "clear");
    assert.equal(result.incident, null);
  });

  it("B02-01 triggers inclusively when the planned start arrives", () => {
    const result = laboratory.evaluate({ status: "healthy", snapshot: missed });
    assert.equal(result.disposition, "triggered");
    assert.deepEqual(result.reasons, ["planned_start_missed"]);
    assert.equal(result.incident?.incidentId, "B02-LAB-151230-7-01");
    assert.equal(result.incident?.conditionKey, "B02:b02-planned-start-missed:1:workOrderId=151230|planVersionId=7");
  });

  it("B02-02 remains clear when the OT started before its deadline", () => {
    const result = laboratory.evaluate({
      status: "healthy",
      snapshot: { ...missed, actualStartedAt: "2026-08-01T15:58:00.000Z" },
    });
    assert.equal(result.disposition, "clear");
    assert.equal(result.incident, null);
  });

  it("B02-03 preserves one continuing occurrence on repeated evaluation", () => {
    const first = laboratory.evaluate({ status: "healthy", snapshot: missed });
    const repeated = laboratory.evaluate({ status: "healthy", snapshot: missed });
    assert.equal(repeated.incident?.incidentId, first.incident?.incidentId);
    assert.equal(repeated.incident?.occurrence, 1);
  });

  it("B02-04 advances the same occurrence without creating a duplicate", () => {
    const first = laboratory.evaluate({ status: "healthy", snapshot: missed });
    observedAt = "2026-08-01T16:05:00.000Z";
    const repeated = laboratory.evaluate({ status: "healthy", snapshot: missed });
    assert.equal(repeated.incident?.incidentId, first.incident?.incidentId);
    assert.equal(repeated.incident?.occurrence, 1);
    assert.equal(repeated.incident?.updatedAt, observedAt);
  });

  it("B02-05 resolves when the OT starts late and preserves the missed occurrence", () => {
    const opened = laboratory.evaluate({ status: "healthy", snapshot: missed });
    observedAt = "2026-08-01T16:12:00.000Z";
    const resolved = laboratory.evaluate({
      status: "healthy",
      snapshot: { ...missed, actualStartedAt: "2026-08-01T16:11:00.000Z" },
    });
    assert.equal(resolved.disposition, "clear");
    assert.equal(resolved.incident?.incidentId, opened.incident?.incidentId);
    assert.equal(resolved.incident?.lifecycle, "resolved");
    assert.deepEqual(resolved.incident?.resolutionEvidence, {
      type: "work_order_started", actualStartedAt: "2026-08-01T16:11:00.000Z",
    });
  });

  it("B02-06 resolves the old plan version when an approved reschedule supersedes it", () => {
    laboratory.evaluate({ status: "healthy", snapshot: missed });
    const resolved = laboratory.evaluate({
      status: "healthy",
      snapshot: {
        ...missed,
        approvedPlanUpdate: {
          approvedAt: "2026-08-01T16:06:00.000Z",
          newPlanVersionId: 8,
          outcome: "rescheduled",
          newPlannedStartAt: "2026-08-01T18:00:00.000Z",
        },
      },
    });
    assert.equal(resolved.incident?.lifecycle, "resolved");
    assert.equal(resolved.incident?.resolutionEvidence?.type, "approved_plan_update");
  });

  it("B02-07 accepts approved removal or cancellation as plan-update resolution", () => {
    for (const outcome of ["removed", "cancelled"] as const) {
      laboratory.reset();
      laboratory.evaluate({ status: "healthy", snapshot: missed });
      const resolved = laboratory.evaluate({
        status: "healthy",
        snapshot: {
          ...missed,
          approvedPlanUpdate: {
            approvedAt: "2026-08-01T16:06:00.000Z",
            newPlanVersionId: 8,
            outcome,
          },
        },
      });
      assert.equal(resolved.incident?.lifecycle, "resolved");
    }
  });

  it("B02-08 keeps unrelated actions and alerts outside the B02 evidence contract", () => {
    const snapshotFields = Object.keys(missed).sort();
    assert.deepEqual(snapshotFields, [
      "actualStartedAt", "approvedPlanUpdate", "machineId", "planVersionId", "plannedStartAt", "workOrderId",
    ]);
    assert.equal(laboratory.evaluate({ status: "healthy", snapshot: missed }).disposition, "triggered");
  });

  it("B02-09 requires complete administrative closure evidence and suppresses the uninterrupted condition", () => {
    laboratory.evaluate({ status: "healthy", snapshot: missed });
    assert.throws(() => laboratory.closeWithoutResolution({
      workOrderId: missed.workOrderId,
      planVersionId: missed.planVersionId,
      actorReference: "admin-1",
      reason: "historical_gap",
      comment: "",
    }), /requires actor, reason, and comment/);
    const closed = laboratory.closeWithoutResolution({
      workOrderId: missed.workOrderId,
      planVersionId: missed.planVersionId,
      actorReference: "admin-1",
      reason: "historical_gap",
      comment: "The historical delay cannot be reconstructed safely",
    });
    const repeated = laboratory.evaluate({ status: "healthy", snapshot: missed });
    assert.equal(closed.lifecycle, "closed_without_resolution");
    assert.equal(repeated.incident?.incidentId, closed.incidentId);
    assert.equal(repeated.incident?.lifecycle, "closed_without_resolution");
  });

  it("B02-10 expires administrative suppression after the condition clears", () => {
    laboratory.evaluate({ status: "healthy", snapshot: missed });
    laboratory.closeWithoutResolution({
      workOrderId: missed.workOrderId,
      planVersionId: missed.planVersionId,
      actorReference: "admin-1",
      reason: "historical_gap",
      comment: "The historical delay cannot be reconstructed safely",
    });
    laboratory.evaluate({
      status: "healthy",
      snapshot: { ...missed, actualStartedAt: "2026-08-01T16:20:00.000Z" },
    });
    const impossibleSameVersionRecurrence = laboratory.evaluate({ status: "healthy", snapshot: missed });
    assert.equal(impossibleSameVersionRecurrence.disposition, "insufficient");
    assert.deepEqual(impossibleSameVersionRecurrence.missingEvidence, ["sourceValidRecurrenceEvidence"]);
  });

  it("B02-11 treats missing or invalid plan evidence as insufficient and preserves the incident", () => {
    const opened = laboratory.evaluate({ status: "healthy", snapshot: missed });
    const missing = laboratory.evaluate({
      status: "healthy",
      snapshot: { ...missed, approvedPlanUpdate: undefined },
    });
    assert.equal(missing.disposition, "insufficient");
    assert.deepEqual(missing.missingEvidence, ["approvedPlanUpdate"]);
    const invalid = laboratory.evaluate({
      status: "healthy",
      snapshot: {
        ...missed,
        approvedPlanUpdate: {
          approvedAt: "2026-08-01T16:06:00.000Z",
          newPlanVersionId: missed.planVersionId,
          outcome: "rescheduled",
          newPlannedStartAt: "2026-08-01T18:00:00.000Z",
        },
      },
    });
    assert.deepEqual(invalid.missingEvidence, ["validApprovedPlanUpdate"]);
    assert.equal(invalid.incident?.incidentId, opened.incident?.incidentId);
    assert.equal(invalid.incident?.lifecycle, "open");
  });

  it("B02-12 preserves an open incident when the standalone evaluation cycle fails", () => {
    const opened = laboratory.evaluate({ status: "healthy", snapshot: missed });
    const result = laboratory.evaluate({
      status: "failed",
      workOrderId: missed.workOrderId,
      planVersionId: missed.planVersionId,
      errorCode: "fixture_read_failed",
    });
    assert.equal(result.disposition, "failed_preserved");
    assert.equal(result.incident?.incidentId, opened.incident?.incidentId);
    assert.equal(result.incident?.lifecycle, "open");
  });

  it("B02-13 persists missed commitments from two plan versions as independent situations", () => {
    const first = laboratory.evaluate({ status: "healthy", snapshot: missed });
    laboratory.evaluate({
      status: "healthy",
      snapshot: {
        ...missed,
        approvedPlanUpdate: {
          approvedAt: "2026-08-01T16:06:00.000Z",
          newPlanVersionId: 8,
          outcome: "rescheduled",
          newPlannedStartAt: "2026-08-01T18:00:00.000Z",
        },
      },
    });
    observedAt = "2026-08-01T18:00:00.000Z";
    const second = laboratory.evaluate({
      status: "healthy",
      snapshot: { ...missed, planVersionId: 8, plannedStartAt: "2026-08-01T18:00:00.000Z" },
    });
    assert.equal(first.incident?.lifecycle, "open");
    assert.equal(laboratory.inspect(151230, 7)?.lifecycle, "resolved");
    assert.equal(second.incident?.lifecycle, "open");
    assert.notEqual(second.incident?.conditionKey, first.incident?.conditionKey);
  });

  it("B02-14 refuses to invent recurrence for one superseded plan version", () => {
    laboratory.evaluate({ status: "healthy", snapshot: missed });
    laboratory.evaluate({
      status: "healthy",
      snapshot: { ...missed, actualStartedAt: "2026-08-01T16:11:00.000Z" },
    });
    const result = laboratory.evaluate({ status: "healthy", snapshot: missed });
    assert.equal(result.disposition, "insufficient");
    assert.deepEqual(result.missingEvidence, ["sourceValidRecurrenceEvidence"]);
    assert.equal(result.incident?.lifecycle, "resolved");
  });
});
