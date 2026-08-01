import { Cron } from "croner";
import pLimit from "p-limit";
import type { DetectionRunner } from "./runner.js";
import type { CycleResult, DetectionQueryDefinition, DetectionSourceAdapter } from "./types.js";

export class DetectionScheduler {
  private readonly jobs: Cron[] = [];
  private readonly limit;
  constructor(private readonly runner: DetectionRunner, concurrency = 2) {
    this.limit = pLimit(concurrency);
  }
  schedule(query: DetectionQueryDefinition, adapter: DetectionSourceAdapter): void {
    if (!query.enabled) return;
    const seconds = Math.max(1, Math.round(query.intervalMs / 1000));
    const pattern = seconds % 60 === 0 ? `*/${Math.max(1, seconds / 60)} * * * *` : `*/${Math.min(59, seconds)} * * * * *`;
    this.jobs.push(new Cron(pattern, { protect: true }, async () => { await this.runScheduled(query, adapter); }));
  }
  async runRecovery(query: DetectionQueryDefinition, adapter: DetectionSourceAdapter): Promise<void> {
    await this.limit(() => this.runner.run(query, adapter, true));
  }
  async runScheduled(query: DetectionQueryDefinition, adapter: DetectionSourceAdapter): Promise<CycleResult> {
    return this.limit(() => this.runner.run(query, adapter));
  }
  async runWhenDue(query: DetectionQueryDefinition, adapter: DetectionSourceAdapter, delayMs: number): Promise<CycleResult> {
    if (!query.enabled || !Number.isInteger(delayMs) || delayMs < 0) throw new Error("invalid_scheduled_due_run");
    await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    return this.runScheduled(query, adapter);
  }
  stop(): void { this.jobs.forEach((job) => job.stop()); }
}
