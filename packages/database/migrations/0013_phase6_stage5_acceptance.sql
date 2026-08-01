CREATE TABLE IF NOT EXISTS monitor_incident_administrative_closure (
  incident_id UUID PRIMARY KEY REFERENCES monitor_incident(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 100),
  comment TEXT NOT NULL CHECK (length(trim(comment)) BETWEEN 1 AND 2000),
  actor_sys_user_id BIGINT NOT NULL CHECK (actor_sys_user_id > 0),
  frozen_evidence JSONB NOT NULL CHECK (jsonb_typeof(frozen_evidence) = 'object'),
  closed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monitor_condition_suppression (
  rule_code TEXT NOT NULL,
  condition_key TEXT NOT NULL,
  incident_id UUID NOT NULL REFERENCES monitor_incident(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expired_at TIMESTAMPTZ,
  PRIMARY KEY (rule_code, condition_key),
  CHECK ((active AND expired_at IS NULL) OR (NOT active AND expired_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS monitor_condition_suppression_active_idx
  ON monitor_condition_suppression (rule_code, condition_key) WHERE active = TRUE;

CREATE TABLE IF NOT EXISTS monitor_scenario_experiment (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running','paused','completed')),
  business_time TIMESTAMPTZ NOT NULL,
  speed INTEGER NOT NULL CHECK (speed IN (1,2,3,60)),
  frequencies JSONB NOT NULL CHECK (jsonb_typeof(frequencies) = 'object'),
  next_due JSONB NOT NULL CHECK (jsonb_typeof(next_due) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monitor_scenario_snapshot (
  id UUID PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES monitor_scenario_experiment(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  captured_business_time TIMESTAMPTZ NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (experiment_id, label)
);

CREATE TABLE IF NOT EXISTS monitor_scenario_acceptance_result (
  experiment_id UUID NOT NULL REFERENCES monitor_scenario_experiment(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('passed','failed','not_run')),
  evidence JSONB NOT NULL CHECK (jsonb_typeof(evidence) = 'object'),
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (experiment_id, test_id)
);
