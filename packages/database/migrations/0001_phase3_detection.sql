CREATE TABLE IF NOT EXISTS monitor_detection_query (
  query_id TEXT PRIMARY KEY,
  rule_code TEXT NOT NULL,
  query_version TEXT NOT NULL,
  adapter_kind TEXT NOT NULL CHECK (adapter_kind IN ('fixture', 'backup', 'emusionsoft')),
  interval_ms INTEGER NOT NULL CHECK (interval_ms >= 1000),
  timeout_ms INTEGER NOT NULL CHECK (timeout_ms >= 1),
  page_size INTEGER NOT NULL CHECK (page_size BETWEEN 1 AND 1000),
  max_rows INTEGER NOT NULL CHECK (max_rows BETWEEN page_size AND 10000),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monitor_poll_cycle (
  cycle_id UUID PRIMARY KEY,
  query_id TEXT NOT NULL REFERENCES monitor_detection_query(query_id),
  query_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'timeout', 'partial', 'invalid_schema', 'stale', 'unknown_freshness', 'source_error', 'overlap_skipped')),
  source_revision TEXT,
  freshness JSONB NOT NULL,
  page_count INTEGER NOT NULL DEFAULT 0 CHECK (page_count >= 0),
  row_count INTEGER NOT NULL DEFAULT 0 CHECK (row_count >= 0),
  complete BOOLEAN NOT NULL DEFAULT FALSE,
  full_evaluation BOOLEAN NOT NULL DEFAULT FALSE,
  recovery_run BOOLEAN NOT NULL DEFAULT FALSE,
  error_code TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ NOT NULL,
  CHECK (finished_at >= started_at),
  CHECK ((status = 'healthy') = (complete AND full_evaluation))
);
ALTER TABLE monitor_poll_cycle ADD COLUMN IF NOT EXISTS recovery_run BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS monitor_poll_cycle_query_finished_idx ON monitor_poll_cycle (query_id, finished_at DESC);

CREATE TABLE IF NOT EXISTS monitor_condition_state (
  query_id TEXT NOT NULL REFERENCES monitor_detection_query(query_id),
  condition_key TEXT NOT NULL,
  active BOOLEAN NOT NULL,
  evidence JSONB NOT NULL CHECK (jsonb_typeof(evidence) = 'object'),
  first_observed_at TIMESTAMPTZ NOT NULL,
  last_observed_at TIMESTAMPTZ NOT NULL,
  last_healthy_cycle_id UUID NOT NULL REFERENCES monitor_poll_cycle(cycle_id),
  PRIMARY KEY (query_id, condition_key),
  CHECK (last_observed_at >= first_observed_at)
);
CREATE INDEX IF NOT EXISTS monitor_condition_state_active_idx ON monitor_condition_state (query_id, active);
