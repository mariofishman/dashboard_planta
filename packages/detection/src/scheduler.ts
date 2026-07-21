import { Cron } from "croner";
import pLimit from "p-limit";
import type { DetectionRunner } from "./runner.js";
import type { DetectionQueryDefinition, DetectionSourceAdapter } from "./types.js";

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
    this.jobs.push(new Cron(pattern, { protect: true }, async () => { await this.limit(() => this.runner.run(query, adapter)); }));
  }
  async runRecovery(query: DetectionQueryDefinition, adapter: DetectionSourceAdapter): Promise<void> {
    await this.limit(() => this.runner.run(query, adapter, true));
  }
  stop(): void { this.jobs.forEach((job) => job.stop()); }
}
