import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { B03StandaloneLaboratory, type B03LaboratorySnapshot } from "./b03-laboratory.js";

let observedAt = "2026-08-01T14:31:00.000Z";
let laboratory: B03StandaloneLaboratory;

const idle: B03LaboratorySnapshot = {
  equipmentId: 9,
  machineCode: "P09",
  scheduleWindowId: "P09-2026-08-01-day",
  planExpectation: { planVersionId: "plan-7", state: "production_expected" },
  activeWorkOrder: null,
  idleStartedAt: "2026-08-01T14:00:00.000Z",
};

beforeEach(() => {
  observedAt = "2026-08-01T14:31:00.000Z";
  laboratory = new B03StandaloneLaboratory(() => observedAt);
});

describe("B03 standalone deterministic laboratory", () => {
  it("B03-00 resets repeatably and remains clear before the threshold", () => {
    laboratory.evaluate({ status: "healthy", snapshot: idle });
    laboratory.reset();
    observedAt = "2026-08-01T14:29:59.999Z";
    const result = laboratory.evaluate({ status: "healthy", snapshot: idle });
    assert.equal(result.disposition, "clear");
    assert.equal(result.incident, null);
  });

  it("B03-01 remains clear exactly at 30 minutes", () => {
    observedAt = "2026-08-01T14:30:00.000Z";
    assert.equal(laboratory.evaluate({ status: "healthy", snapshot: idle }).disposition, "clear");
  });

  it("B03-02 triggers only after 30 continuous minutes without an active OT", () => {
    const result = laboratory.evaluate({ status: "healthy", snapshot: idle });
    assert.equal(result.disposition, "triggered");
    assert.deepEqual(result.reasons, ["unexplained_machine_idle"]);
    assert.equal(result.incident?.incidentId, "B03-LAB-9-P09-2026-08-01-day-01");
    assert.equal(result.incident?.conditionKey, "B03:b03-unexplained-machine-idle:1:equipmentId=9|scheduleWindowId=\"P09-2026-08-01-day\"");
  });

  it("B03-03 remains clear while an OT is running", () => {
    const result = laboratory.evaluate({
      status: "healthy",
      snapshot: { ...idle, activeWorkOrder: { workOrderId: 151230, state: "running" }, idleStartedAt: null },
    });
    assert.equal(result.disposition, "clear");
    assert.equal(result.incident, null);
  });

  it("B03-04 treats a pause inside an active OT as active-OT time", () => {
    const result = laboratory.evaluate({
      status: "healthy",
      snapshot: { ...idle, activeWorkOrder: { workOrderId: 151230, state: "paused" }, idleStartedAt: null },
    });
    assert.equal(result.disposition, "clear");
    assert.equal(result.incident, null);
  });

  it("B03-05 excludes an approved plan-level suspension", () => {
    const result = laboratory.evaluate({
      status: "healthy",
      snapshot: {
        ...idle,
        planExpectation: { planVersionId: "plan-8", state: "suspended" },
        idleStartedAt: null,
      },
    });
    assert.equal(result.disposition, "clear");
    assert.equal(result.incident, null);
  });

  it("B03-06 excludes an approved no-production plan period", () => {
    const result = laboratory.evaluate({
      status: "healthy",
      snapshot: {
        ...idle,
        planExpectation: { planVersionId: "plan-8", state: "no_production" },
        idleStartedAt: null,
      },
    });
    assert.equal(result.disposition, "clear");
  });

  it("B03-07 preserves one continuing occurrence on repeated evaluation", () => {
    const first = laboratory.evaluate({ status: "healthy", snapshot: idle });
    const repeated = laboratory.evaluate({ status: "healthy", snapshot: idle });
    assert.equal(repeated.incident?.incidentId, first.incident?.incidentId);
    assert.equal(repeated.incident?.occurrence, 1);
  });

  it("B03-08 updates elapsed evidence without duplicating the occurrence", () => {
    const first = laboratory.evaluate({ status: "healthy", snapshot: idle });
    observedAt = "2026-08-01T14:45:00.000Z";
    const repeated = laboratory.evaluate({ status: "healthy", snapshot: idle });
    assert.equal(repeated.incident?.incidentId, first.incident?.incidentId);
    assert.equal(repeated.incident?.unexplainedIdleMinutes, 45);
    assert.equal(repeated.incident?.updatedAt, observedAt);
  });

  it("B03-09 resolves when an OT starts, including when that OT is paused", () => {
    const opened = laboratory.evaluate({ status: "healthy", snapshot: idle });
    const resolved = laboratory.evaluate({
      status: "healthy",
      snapshot: { ...idle, activeWorkOrder: { workOrderId: 151231, state: "paused" }, idleStartedAt: null },
    });
    assert.equal(resolved.incident?.incidentId, opened.incident?.incidentId);
    assert.equal(resolved.incident?.lifecycle, "resolved");
    assert.deepEqual(resolved.incident?.resolutionEvidence, {
      type: "active_work_order",
      workOrder: { workOrderId: 151231, state: "paused" },
    });
  });

  it("B03-10 resolves immediately when the approved plan suspends production", () => {
    laboratory.evaluate({ status: "healthy", snapshot: idle });
    const resolved = laboratory.evaluate({
      status: "healthy",
      snapshot: {
        ...idle,
        planExpectation: { planVersionId: "plan-8", state: "suspended" },
        idleStartedAt: null,
      },
    });
    assert.equal(resolved.incident?.lifecycle, "resolved");
    assert.deepEqual(resolved.incident?.resolutionEvidence, {
      type: "approved_plan_state",
      expectation: { planVersionId: "plan-8", state: "suspended" },
    });
  });

  it("B03-11 preserves an open occurrence when required evidence is absent or invalid", () => {
    const opened = laboratory.evaluate({ status: "healthy", snapshot: idle });
    const missing = laboratory.evaluate({
      status: "healthy",
      snapshot: { ...idle, planExpectation: undefined },
    });
    assert.equal(missing.disposition, "insufficient");
    assert.deepEqual(missing.missingEvidence, ["planExpectation"]);
    assert.equal(missing.incident?.incidentId, opened.incident?.incidentId);

    const future = laboratory.evaluate({
      status: "healthy",
      snapshot: { ...idle, idleStartedAt: "2026-08-01T15:00:00.000Z" },
    });
    assert.deepEqual(future.missingEvidence, ["nonFutureIdleStartedAt"]);
    assert.equal(future.incident?.lifecycle, "open");
  });

  it("B03-12 preserves an open occurrence when the standalone evaluation cycle fails", () => {
    const opened = laboratory.evaluate({ status: "healthy", snapshot: idle });
    const result = laboratory.evaluate({
      status: "failed",
      equipmentId: idle.equipmentId,
      scheduleWindowId: idle.scheduleWindowId,
      errorCode: "fixture_read_failed",
    });
    assert.equal(result.disposition, "failed_preserved");
    assert.equal(result.incident?.incidentId, opened.incident?.incidentId);
    assert.equal(result.incident?.lifecycle, "open");
  });

  it("B03-13 requires complete administrative closure evidence and suppresses the uninterrupted condition", () => {
    laboratory.evaluate({ status: "healthy", snapshot: idle });
    assert.throws(() => laboratory.closeWithoutResolution({
      equipmentId: idle.equipmentId,
      scheduleWindowId: idle.scheduleWindowId,
      actorReference: "admin-1",
      reason: "historical_unexplained_downtime",
      comment: "",
    }), /requires actor, reason, and comment/);
    const closed = laboratory.closeWithoutResolution({
      equipmentId: idle.equipmentId,
      scheduleWindowId: idle.scheduleWindowId,
      actorReference: "admin-1",
      reason: "historical_unexplained_downtime",
      comment: "The historical cause cannot be reconstructed safely",
    });
    const repeated = laboratory.evaluate({ status: "healthy", snapshot: idle });
    assert.equal(closed.lifecycle, "closed_without_resolution");
    assert.equal(closed.administrativeClosure?.unexplainedIdleMinutes, 31);
    assert.equal(repeated.incident?.incidentId, closed.incidentId);
    assert.equal(repeated.incident?.lifecycle, "closed_without_resolution");
  });

  it("B03-14 expires closure suppression after a healthy clear and permits recurrence", () => {
    laboratory.evaluate({ status: "healthy", snapshot: idle });
    const closed = laboratory.closeWithoutResolution({
      equipmentId: idle.equipmentId,
      scheduleWindowId: idle.scheduleWindowId,
      actorReference: "admin-1",
      reason: "historical_unexplained_downtime",
      comment: "The historical cause cannot be reconstructed safely",
    });
    laboratory.evaluate({
      status: "healthy",
      snapshot: { ...idle, activeWorkOrder: { workOrderId: 151231, state: "running" }, idleStartedAt: null },
    });
    observedAt = "2026-08-01T16:31:00.000Z";
    const recurrence = laboratory.evaluate({
      status: "healthy",
      snapshot: { ...idle, idleStartedAt: "2026-08-01T16:00:00.000Z" },
    });
    assert.equal(closed.occurrence, 1);
    assert.equal(recurrence.incident?.occurrence, 2);
    assert.notEqual(recurrence.incident?.incidentId, closed.incidentId);
  });

  it("B03-15 keeps different approved schedule windows as independent conditions", () => {
    const first = laboratory.evaluate({ status: "healthy", snapshot: idle });
    const second = laboratory.evaluate({
      status: "healthy",
      snapshot: { ...idle, scheduleWindowId: "P09-2026-08-01-night" },
    });
    assert.notEqual(second.incident?.conditionKey, first.incident?.conditionKey);
    assert.equal(first.incident?.lifecycle, "open");
    assert.equal(second.incident?.lifecycle, "open");
  });
});
