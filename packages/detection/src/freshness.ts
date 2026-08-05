import type { DetectionQueryDefinition, FreshnessProvider, FreshnessSignal } from "./types.js";
import type { TestDatabaseScenarioRepository } from "./test-database.js";

export class FixedBackupFreshnessProvider implements FreshnessProvider {
  constructor(private readonly revision: string) {}
  async inspect(): Promise<FreshnessSignal> {
    return {
      status: "fresh",
      observedAt: new Date().toISOString(),
      lagMilliseconds: 0,
      providerVersion: "fixed-backup.v1",
      sourceRevision: this.revision,
    };
  }
}

export class FakeFreshnessProvider implements FreshnessProvider {
  constructor(public signal: FreshnessSignal) {}
  async inspect(_query: DetectionQueryDefinition): Promise<FreshnessSignal> {
    return structuredClone(this.signal);
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
