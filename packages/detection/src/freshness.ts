import type { DetectionQueryDefinition, FreshnessProvider, FreshnessSignal } from "./types.js";
import type { TestDatabaseScenarioRepository } from "./test-database.js";

export class DisabledFreshnessProvider implements FreshnessProvider {
  async inspect(): Promise<FreshnessSignal> {
    return {
      status: "unknown",
      observedAt: new Date().toISOString(),
      lagMilliseconds: null,
      providerVersion: "source-disabled.v1",
      sourceRevision: null,
    };
  }
}

export class TestDatabaseFreshnessProvider implements FreshnessProvider {
  constructor(private readonly source: TestDatabaseScenarioRepository) {}
  async inspect(query: DetectionQueryDefinition): Promise<FreshnessSignal> {
    const fault = this.source.consumeFreshnessFault(query.ruleCode as "A02" | "A03" | "A05");
    return {
      status: fault === "stale" ? "stale" : fault === "unknown_freshness" ? "unknown" : "fresh",
      observedAt: new Date().toISOString(),
      lagMilliseconds: fault === "stale" ? 86_400_000 : fault === "unknown_freshness" ? null : 0,
      providerVersion: "test-database-controlled.v1",
      sourceRevision: this.source.pollMetadata(query.ruleCode as "A02" | "A03" | "A05").sourceRevision,
    };
  }
}
