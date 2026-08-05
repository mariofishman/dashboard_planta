CREATE TABLE IF NOT EXISTS monitor_scenario_runtime (
  runtime_key TEXT PRIMARY KEY CHECK (runtime_key = 'stage5'),
  active_experiment_id UUID REFERENCES monitor_scenario_experiment(id) ON DELETE SET NULL,
  next_tick_epoch_ms BIGINT CHECK (next_tick_epoch_ms IS NULL OR next_tick_epoch_ms > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monitor_scenario_runtime_event (
  id UUID PRIMARY KEY,
  sequence BIGSERIAL NOT NULL UNIQUE,
  experiment_id UUID NOT NULL REFERENCES monitor_scenario_experiment(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('poll_started','poll_completed','poll_failed','source_action')),
  rule_code TEXT NOT NULL CHECK (rule_code IN ('A02','A03','A05')),
  business_time TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS monitor_scenario_runtime_event_history_idx
  ON monitor_scenario_runtime_event (experiment_id, sequence);

CREATE UNIQUE INDEX IF NOT EXISTS monitor_scenario_runtime_completed_poll_idx
  ON monitor_scenario_runtime_event (experiment_id, rule_code, business_time)
  WHERE event_type = 'poll_completed';
