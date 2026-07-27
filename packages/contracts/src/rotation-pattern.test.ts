import assert from "node:assert/strict";
import { it } from "node:test";
import { firstRotationPatternConflict, type RotationPattern } from "./index.js";

const pattern = (): RotationPattern => ({
  effectiveFrom: "2026-07-25",
  schedules: [
    { id: "day", name: "Día", start: "07:00", end: "19:00", isRest: false },
    { id: "night", name: "Noche", start: "19:00", end: "07:00", isRest: false },
    { id: "rest", name: "Descanso", start: null, end: null, isRest: true },
  ],
  groups: [
    { id: "A", name: "A", anchorScheduleId: "rest", daysPerPhase: 2 },
    { id: "B", name: "B", anchorScheduleId: "day", daysPerPhase: 2 },
    { id: "C", name: "C", anchorScheduleId: "night", daysPerPhase: 2 },
  ],
});

it("accepts a rotation where working schedules never overlap", () => {
  assert.equal(firstRotationPatternConflict(pattern()), null);
});

it("finds the first shared working schedule but permits shared rest", () => {
  const conflicting = pattern();
  conflicting.groups[2] = { ...conflicting.groups[2]!, anchorScheduleId: "rest" };
  assert.deepEqual(firstRotationPatternConflict(conflicting), {
    dayOffset: 2,
    scheduleId: "day",
    groupIds: ["A", "C"],
  });
});
