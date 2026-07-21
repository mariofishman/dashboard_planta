export interface CycleHealth {
  querySucceeded: boolean;
  schemaValid: boolean;
  complete: boolean;
  persistenceCommitted: boolean;
  sourceMode: "local-backup" | "replica";
  freshness: "acceptable" | "stale" | "unknown" | "not-applicable";
}

export type ConditionState = "OPEN" | "RESOLVED";

export class DetectionCycleGuard {
  #conditions = new Map<string, ConditionState>();

  apply(health: CycleHealth, presentConditionKeys: Set<string>): ReadonlyMap<string, ConditionState> {
    const freshnessOkay = health.sourceMode === "local-backup"
      ? health.freshness === "not-applicable"
      : health.freshness === "acceptable";
    const healthy = health.querySucceeded
      && health.schemaValid
      && health.complete
      && health.persistenceCommitted
      && freshnessOkay;

    if (!healthy) return new Map(this.#conditions);

    for (const key of presentConditionKeys) this.#conditions.set(key, "OPEN");
    for (const [key, state] of this.#conditions) {
      if (state === "OPEN" && !presentConditionKeys.has(key)) this.#conditions.set(key, "RESOLVED");
    }
    return new Map(this.#conditions);
  }
}
