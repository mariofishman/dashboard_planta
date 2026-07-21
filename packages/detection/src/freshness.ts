import type { DetectionQueryDefinition, FreshnessProvider, FreshnessSignal } from "./types.js";

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
