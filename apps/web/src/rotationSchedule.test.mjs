import assert from "node:assert/strict";
import test from "node:test";
import {
  cumulativeRotationShift,
  moveRotationCoverages,
  moveRotationPattern,
  rotationGapForDate,
} from "./rotationSchedule.ts";

const operation = "Impresión";

test("a backward move applies the source schedule at the earlier target", () => {
  const moved = moveRotationPattern([], operation, "2026-08-01", "2026-07-31");
  assert.equal(cumulativeRotationShift(operation, "2026-07-31", moved), -1);
  assert.equal(rotationGapForDate(operation, "2026-07-31", moved), null);
});

test("consecutive backward moves accumulate instead of replacing the first move", () => {
  const first = moveRotationPattern([], operation, "2026-08-01", "2026-07-31");
  const second = moveRotationPattern(first, operation, "2026-07-31", "2026-07-30");
  assert.equal(cumulativeRotationShift(operation, "2026-07-30", second), -2);
  assert.equal(cumulativeRotationShift(operation, "2026-08-01", second), -2);
});

test("three repeated backward moves remain cumulative across a month boundary", () => {
  let moved = moveRotationPattern([], operation, "2026-08-02", "2026-08-01");
  moved = moveRotationPattern(moved, operation, "2026-08-01", "2026-07-31");
  moved = moveRotationPattern(moved, operation, "2026-07-31", "2026-07-30");
  assert.equal(cumulativeRotationShift(operation, "2026-07-30", moved), -3);
});

test("a forward move creates only the expected uncovered interval", () => {
  const moved = moveRotationPattern([], operation, "2026-07-27", "2026-07-30");
  assert.ok(rotationGapForDate(operation, "2026-07-27", moved));
  assert.ok(rotationGapForDate(operation, "2026-07-29", moved));
  assert.equal(rotationGapForDate(operation, "2026-07-30", moved), null);
  assert.equal(cumulativeRotationShift(operation, "2026-07-30", moved), 3);
});

test("a scheduled day can be moved backward onto the start of an uncovered interval", () => {
  const delayed = moveRotationPattern([], operation, "2026-07-27", "2026-07-30");
  const filled = moveRotationPattern(delayed, operation, "2026-07-30", "2026-07-27");
  assert.equal(rotationGapForDate(operation, "2026-07-27", filled), null);
  assert.equal(cumulativeRotationShift(operation, "2026-07-27", filled), 0);
});

test("dropping inside an uncovered interval preserves only the earlier uncovered dates", () => {
  const delayed = moveRotationPattern([], operation, "2026-07-27", "2026-08-01");
  const filledFrom = moveRotationPattern(delayed, operation, "2026-08-01", "2026-07-30");
  assert.ok(rotationGapForDate(operation, "2026-07-27", filledFrom));
  assert.ok(rotationGapForDate(operation, "2026-07-29", filledFrom));
  assert.equal(rotationGapForDate(operation, "2026-07-30", filledFrom), null);
  assert.equal(cumulativeRotationShift(operation, "2026-07-30", filledFrom), 3);
});

test("moving forward after a prior backward move preserves the schedule at the source", () => {
  const advanced = moveRotationPattern([], operation, "2026-08-01", "2026-07-30");
  const delayed = moveRotationPattern(advanced, operation, "2026-07-30", "2026-08-01");
  assert.ok(rotationGapForDate(operation, "2026-07-30", delayed));
  assert.ok(rotationGapForDate(operation, "2026-07-31", delayed));
  assert.equal(cumulativeRotationShift(operation, "2026-08-01", delayed), 0);
});

test("moves do not alter another operation", () => {
  const extrusion = [{ id: "existing", operation: "Extrusión", date: "2026-07-29", shiftDays: -2, createsGap: false }];
  const moved = moveRotationPattern(extrusion, operation, "2026-08-01", "2026-07-31");
  assert.deepEqual(moved.filter((item) => item.operation === "Extrusión"), extrusion);
});

test("same-date moves are a no-op", () => {
  const existing = [{ id: "existing", operation, date: "2026-07-29", shiftDays: -2, createsGap: false }];
  assert.strictEqual(moveRotationPattern(existing, operation, "2026-08-01", "2026-08-01"), existing);
});

test("overwritten gap coverage is removed from the new pattern boundary onward", () => {
  const coverages = [
    { id: "early", operation, startDate: "2026-07-25", days: 3, dayGroup: "A", nightGroup: "B" },
    { id: "late", operation, startDate: "2026-07-30", days: 4, dayGroup: "B", nightGroup: "C" },
    { id: "other", operation: "Extrusión", startDate: "2026-07-30", days: 4, dayGroup: "B", nightGroup: "C" },
  ];
  const moved = moveRotationCoverages(coverages, operation, "2026-08-03", "2026-07-31");
  assert.deepEqual(moved.find((item) => item.id === "early"), coverages[0]);
  assert.equal(moved.find((item) => item.id === "late")?.days, 1);
  assert.deepEqual(moved.find((item) => item.id === "other"), coverages[2]);
});
