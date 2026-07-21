export type CycleStatus = "healthy" | "timeout" | "partial" | "invalid_schema" | "stale" | "unknown_freshness" | "source_error" | "overlap_skipped";

export interface DetectionQueryDefinition {
  queryId: string;
  ruleCode: string;
  queryVersion: string;
  adapterKind: "fixture" | "backup" | "emusionsoft";
  keyField: string;
  requiredFields: string[];
  intervalMs: number;
  timeoutMs: number;
  pageSize: number;
  maxRows: number;
  maxAttempts: number;
  retryBaseMs: number;
  enabled: boolean;
}

export interface SourcePage {
  rows: Record<string, unknown>[];
  nextCursor: string | null;
  complete: boolean;
  sourceRevision: string;
  schemaVersion: string;
}

export interface DetectionSourceAdapter {
  readPage(input: {
    query: DetectionQueryDefinition;
    cursor: string | null;
    limit: number;
    signal: AbortSignal;
  }): Promise<SourcePage>;
}

export interface FreshnessSignal {
  status: "fresh" | "stale" | "unknown";
  observedAt: string;
  lagMilliseconds: number | null;
  providerVersion: string;
  sourceRevision: string | null;
}

export interface FreshnessProvider {
  inspect(query: DetectionQueryDefinition): Promise<FreshnessSignal>;
}

export interface CycleResult {
  cycleId: string;
  queryId: string;
  status: CycleStatus;
  complete: boolean;
  fullEvaluation: boolean;
  recoveryRun: boolean;
  pageCount: number;
  rowCount: number;
  errorCode: string | null;
}
