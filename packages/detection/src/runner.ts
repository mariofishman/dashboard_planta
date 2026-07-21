import { randomUUID } from "node:crypto";
import type { DetectionRepository } from "./repository.js";
import type { CycleResult, CycleStatus, DetectionQueryDefinition, DetectionSourceAdapter, FreshnessProvider, FreshnessSignal, SourcePage } from "./types.js";

class CycleFailure extends Error {
  constructor(public readonly status: Exclude<CycleStatus, "healthy" | "overlap_skipped">, public readonly code: string) { super(code); }
}

export class DetectionRunner {
  private readonly running = new Set<string>();
  constructor(
    private readonly repository: DetectionRepository,
    private readonly freshness: FreshnessProvider,
    private readonly sleep: (milliseconds: number) => Promise<void> = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
    private readonly onHealthyCycle?: (input: { cycleId: string; query: DetectionQueryDefinition; rows: Record<string, unknown>[]; observedAt: Date }) => Promise<void>,
  ) {}

  async run(query: DetectionQueryDefinition, adapter: DetectionSourceAdapter, recoveryRun = false): Promise<CycleResult> {
    await this.repository.register(query);
    const cycleId = randomUUID();
    const startedAt = new Date();
    if (this.running.has(query.queryId)) {
      const signal = await this.freshness.inspect(query);
      return this.repository.recordFailure({ cycleId, query, status: "overlap_skipped", freshness: signal, pages: 0, rows: 0, startedAt, finishedAt: new Date(), errorCode: "query_already_running", recoveryRun });
    }
    this.running.add(query.queryId);
    let pages = 0;
    let rows: Record<string, unknown>[] = [];
    let freshnessSignal: FreshnessSignal = { status: "unknown", observedAt: startedAt.toISOString(), lagMilliseconds: null, providerVersion: "unavailable", sourceRevision: null };
    try {
      freshnessSignal = await this.freshness.inspect(query);
      if (freshnessSignal.status === "stale") throw new CycleFailure("stale", "source_stale");
      if (freshnessSignal.status !== "fresh") throw new CycleFailure("unknown_freshness", "freshness_unknown");
      let cursor: string | null = null;
      let revision: string | null = null;
      const observedKeys = new Set<string>();
      while (true) {
        const sourcePage = await this.readWithRetry(query, adapter, cursor);
        pages += 1;
        this.validatePage(query, sourcePage);
        if (revision !== null && sourcePage.sourceRevision !== revision) throw new CycleFailure("partial", "source_revision_changed");
        revision = sourcePage.sourceRevision;
        for (const row of sourcePage.rows) {
          const key = String(row[query.keyField]);
          if (observedKeys.has(key)) throw new CycleFailure("invalid_schema", "duplicate_condition_key_across_pages");
          observedKeys.add(key);
        }
        rows = rows.concat(sourcePage.rows);
        if (rows.length > query.maxRows) throw new CycleFailure("partial", "cycle_row_limit_exceeded");
        if (sourcePage.complete) break;
        if (!sourcePage.nextCursor) throw new CycleFailure("partial", "missing_next_cursor");
        cursor = sourcePage.nextCursor;
      }
      const finalFreshness = await this.freshness.inspect(query);
      freshnessSignal = finalFreshness;
      if (finalFreshness.status === "stale") throw new CycleFailure("stale", "source_became_stale");
      if (finalFreshness.status !== "fresh") throw new CycleFailure("unknown_freshness", "freshness_became_unknown");
      const observedAt = new Date();
      const result = await this.repository.reconcileHealthy({
        cycleId, query, freshness: finalFreshness, rows, sourceRevision: revision!, pages,
        startedAt, finishedAt: observedAt, recoveryRun,
      });
      if (this.onHealthyCycle) {
        try { await this.onHealthyCycle({ cycleId, query, rows, observedAt }); }
        catch { /* The source cycle remains healthy; the incident transaction preserves its prior state. */ }
      }
      return result;
    } catch (error) {
      const failure = error instanceof CycleFailure ? error : new CycleFailure("source_error", "source_query_failed");
      return this.repository.recordFailure({
        cycleId, query, status: failure.status, freshness: freshnessSignal, pages, rows: rows.length,
        startedAt, finishedAt: new Date(), errorCode: failure.code, recoveryRun,
      });
    } finally {
      this.running.delete(query.queryId);
    }
  }

  private async readWithRetry(query: DetectionQueryDefinition, adapter: DetectionSourceAdapter, cursor: string | null): Promise<SourcePage> {
    for (let attempt = 1; attempt <= query.maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), query.timeoutMs);
      try {
        return await adapter.readPage({ query, cursor, limit: query.pageSize, signal: controller.signal });
      } catch (error) {
        if (attempt === query.maxAttempts) {
          if (controller.signal.aborted) throw new CycleFailure("timeout", "query_timeout");
          throw error;
        }
        await this.sleep(query.retryBaseMs * 2 ** (attempt - 1));
      } finally {
        clearTimeout(timeout);
      }
    }
    throw new CycleFailure("source_error", "unreachable_retry_state");
  }

  private validatePage(query: DetectionQueryDefinition, sourcePage: SourcePage): void {
    if (sourcePage.schemaVersion !== query.queryVersion) throw new CycleFailure("invalid_schema", "query_schema_version_mismatch");
    if (sourcePage.rows.length > query.pageSize) throw new CycleFailure("partial", "page_size_exceeded");
    const keys = new Set<string>();
    for (const row of sourcePage.rows) {
      if (query.requiredFields.some((field) => !Object.hasOwn(row, field))) throw new CycleFailure("invalid_schema", "required_field_missing");
      const key = row[query.keyField];
      if (key === null || key === undefined || String(key).length === 0) throw new CycleFailure("invalid_schema", "condition_key_missing");
      if (keys.has(String(key))) throw new CycleFailure("invalid_schema", "duplicate_condition_key_in_page");
      keys.add(String(key));
    }
  }
}
