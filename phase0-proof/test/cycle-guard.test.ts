import { describe, expect, it } from "vitest";
import { DetectionCycleGuard, type CycleHealth } from "../src/cycle-guard.js";

const healthyLocal: CycleHealth = {
  querySucceeded: true,
  schemaValid: true,
  complete: true,
  persistenceCommitted: true,
  sourceMode: "local-backup",
  freshness: "not-applicable",
};

describe("safe detection-cycle resolution", () => {
  it("preserves an open incident on query failure or truncation", () => {
    const guard = new DetectionCycleGuard();
    expect(guard.apply(healthyLocal, new Set(["A02:flow:1:42"])).get("A02:flow:1:42")).toBe("OPEN");
    expect(guard.apply({ ...healthyLocal, querySucceeded: false }, new Set()).get("A02:flow:1:42")).toBe("OPEN");
    expect(guard.apply({ ...healthyLocal, complete: false }, new Set()).get("A02:flow:1:42")).toBe("OPEN");
  });

  it("resolves only after a complete healthy absence", () => {
    const guard = new DetectionCycleGuard();
    guard.apply(healthyLocal, new Set(["A05:serial:1:77"]));
    expect(guard.apply(healthyLocal, new Set()).get("A05:serial:1:77")).toBe("RESOLVED");
  });

  it("requires acceptable freshness for a replica but not an immutable backup", () => {
    const guard = new DetectionCycleGuard();
    guard.apply(healthyLocal, new Set(["A02:flow:1:91"]));
    const unknownReplica = { ...healthyLocal, sourceMode: "replica", freshness: "unknown" } as const;
    expect(guard.apply(unknownReplica, new Set()).get("A02:flow:1:91")).toBe("OPEN");
  });
});
