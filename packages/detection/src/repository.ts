import type { DatabaseExecutor, DatabaseRuntime } from "@monitor/database";
import type { CycleResult, CycleStatus, DetectionQueryDefinition, FreshnessSignal } from "./types.js";

export class DetectionRepository {
  constructor(private readonly database: DatabaseRuntime) {}

  async register(query: DetectionQueryDefinition): Promise<void> {
    await this.database.execute(`
      INSERT INTO monitor_detection_query
        (query_id, rule_code, query_version, adapter_kind, interval_ms, timeout_ms, page_size, max_rows, enabled)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (query_id) DO UPDATE SET
        rule_code=EXCLUDED.rule_code, query_version=EXCLUDED.query_version, adapter_kind=EXCLUDED.adapter_kind,
        interval_ms=EXCLUDED.interval_ms, timeout_ms=EXCLUDED.timeout_ms, page_size=EXCLUDED.page_size,
        max_rows=EXCLUDED.max_rows, enabled=EXCLUDED.enabled, updated_at=now()`,
    [query.queryId, query.ruleCode, query.queryVersion, query.adapterKind, query.intervalMs, query.timeoutMs, query.pageSize, query.maxRows, query.enabled]);
  }

  async recordFailure(input: {
    cycleId: string; query: DetectionQueryDefinition; status: Exclude<CycleStatus, "healthy">;
    freshness: FreshnessSignal; pages: number; rows: number; startedAt: Date; finishedAt: Date; errorCode: string; recoveryRun: boolean;
  }): Promise<CycleResult> {
    await this.insertCycle(this.database, { ...input, complete: false, fullEvaluation: false, sourceRevision: input.freshness.sourceRevision });
    return this.result(input.cycleId, input.query.queryId, input.status, false, false, input.recoveryRun, input.pages, input.rows, input.errorCode);
  }

  async reconcileHealthy(input: {
    cycleId: string; query: DetectionQueryDefinition; freshness: FreshnessSignal; rows: Record<string, unknown>[];
    sourceRevision: string; pages: number; startedAt: Date; finishedAt: Date; recoveryRun: boolean;
  }): Promise<CycleResult> {
    await this.database.transaction(async (transaction) => {
      await this.insertCycle(transaction, {
        ...input, status: "healthy", complete: true, fullEvaluation: true, errorCode: null,
      });
      const observedAt = input.finishedAt.toISOString();
      const activeKeys = new Set<string>();
      for (const row of input.rows) {
        const key = `${input.query.queryId}:${input.query.queryVersion}:${String(row[input.query.keyField])}`;
        activeKeys.add(key);
        await transaction.execute(`
          INSERT INTO monitor_condition_state
            (query_id, condition_key, active, evidence, first_observed_at, last_observed_at, last_healthy_cycle_id)
          VALUES ($1,$2,TRUE,$3::jsonb,$4,$4,$5)
          ON CONFLICT (query_id, condition_key) DO UPDATE SET
            active=TRUE, evidence=EXCLUDED.evidence, last_observed_at=EXCLUDED.last_observed_at,
            last_healthy_cycle_id=EXCLUDED.last_healthy_cycle_id`,
        [input.query.queryId, key, JSON.stringify(row), observedAt, input.cycleId]);
      }
      const priorActive = await transaction.queryAll(
        "SELECT condition_key FROM monitor_condition_state WHERE query_id=$1 AND active=TRUE",
        [input.query.queryId],
      );
      for (const prior of priorActive) {
        if (!activeKeys.has(String(prior.condition_key))) {
          await transaction.execute(`UPDATE monitor_condition_state SET active=FALSE, last_observed_at=$3, last_healthy_cycle_id=$4
            WHERE query_id=$1 AND condition_key=$2`, [input.query.queryId, prior.condition_key, observedAt, input.cycleId]);
        }
      }
    });
    return this.result(input.cycleId, input.query.queryId, "healthy", true, true, input.recoveryRun, input.pages, input.rows.length, null);
  }

  async diagnostics(): Promise<Record<string, unknown>[]> {
    return this.database.queryAll(`
      SELECT q.query_id AS "queryId", q.rule_code AS "ruleCode", q.adapter_kind AS "adapterKind",
        c.status, c.complete, c.full_evaluation AS "fullEvaluation", c.row_count AS "rowCount",
        c.recovery_run AS "recoveryRun", c.page_count AS "pageCount", c.finished_at AS "finishedAt", c.error_code AS "errorCode",
        (SELECT COUNT(*)::int FROM monitor_condition_state s WHERE s.query_id=q.query_id AND s.active=TRUE) AS "activeConditions"
      FROM monitor_detection_query q
      LEFT JOIN LATERAL (
        SELECT * FROM monitor_poll_cycle pc WHERE pc.query_id=q.query_id ORDER BY pc.finished_at DESC LIMIT 1
      ) c ON TRUE
      ORDER BY q.rule_code`);
  }

  private async insertCycle(executor: DatabaseExecutor, input: {
    cycleId: string; query: DetectionQueryDefinition; status: CycleStatus; freshness: FreshnessSignal;
    sourceRevision: string | null; pages: number; rows?: number | Record<string, unknown>[]; complete: boolean;
    fullEvaluation: boolean; recoveryRun: boolean; errorCode: string | null; startedAt: Date; finishedAt: Date;
  }): Promise<void> {
    const rowCount = Array.isArray(input.rows) ? input.rows.length : (input.rows ?? 0);
    await executor.execute(`INSERT INTO monitor_poll_cycle
      (cycle_id,query_id,query_version,status,source_revision,freshness,page_count,row_count,complete,full_evaluation,recovery_run,error_code,started_at,finished_at)
      VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14)`, [
      input.cycleId, input.query.queryId, input.query.queryVersion, input.status, input.sourceRevision,
      JSON.stringify(input.freshness), input.pages, rowCount, input.complete, input.fullEvaluation, input.recoveryRun, input.errorCode,
      input.startedAt.toISOString(), input.finishedAt.toISOString(),
    ]);
  }

  private result(cycleId: string, queryId: string, status: CycleStatus, complete: boolean, fullEvaluation: boolean, recoveryRun: boolean, pageCount: number, rowCount: number, errorCode: string | null): CycleResult {
    return { cycleId, queryId, status, complete, fullEvaluation, recoveryRun, pageCount, rowCount, errorCode };
  }
}
