CREATE TABLE IF NOT EXISTS monitor_incident (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code TEXT NOT NULL CHECK (rule_code IN ('A02', 'A03', 'A05')),
  condition_key TEXT NOT NULL,
  occurrence INTEGER NOT NULL CHECK (occurrence > 0),
  lifecycle TEXT NOT NULL CHECK (lifecycle IN ('open', 'resolved', 'closed_without_resolution')),
  label TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  plant_id BIGINT NOT NULL CHECK (plant_id > 0),
  work_order_id TEXT,
  work_order_code TEXT,
  machine_code TEXT,
  operation_name TEXT,
  shift_name TEXT,
  responsible_name TEXT,
  correlation_key TEXT,
  reasons JSONB NOT NULL CHECK (jsonb_typeof(reasons) = 'array'),
  opened_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolution_reason TEXT,
  CONSTRAINT monitor_incident_occurrence_uq UNIQUE (rule_code, condition_key, occurrence),
  CHECK ((lifecycle = 'open' AND resolved_at IS NULL) OR (lifecycle <> 'open' AND resolved_at IS NOT NULL)),
  CHECK (updated_at >= opened_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS monitor_incident_one_open_uq
  ON monitor_incident (rule_code, condition_key) WHERE lifecycle = 'open';
CREATE INDEX IF NOT EXISTS monitor_incident_dashboard_idx
  ON monitor_incident (plant_id, lifecycle, opened_at DESC);
CREATE INDEX IF NOT EXISTS monitor_incident_correlation_idx
  ON monitor_incident (correlation_key) WHERE correlation_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS monitor_incident_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES monitor_incident(id) ON DELETE CASCADE,
  cycle_id UUID,
  status TEXT NOT NULL CHECK (status IN ('triggered', 'clear')),
  reasons JSONB NOT NULL CHECK (jsonb_typeof(reasons) = 'array'),
  evidence JSONB NOT NULL CHECK (jsonb_typeof(evidence) = 'object'),
  observed_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS monitor_incident_evidence_incident_idx
  ON monitor_incident_evidence (incident_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS monitor_incident_transition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES monitor_incident(id) ON DELETE CASCADE,
  from_state TEXT CHECK (from_state IS NULL OR from_state IN ('open', 'resolved', 'closed_without_resolution')),
  to_state TEXT NOT NULL CHECK (to_state IN ('open', 'resolved', 'closed_without_resolution')),
  reason TEXT NOT NULL,
  cycle_id UUID,
  occurred_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS monitor_incident_transition_incident_idx
  ON monitor_incident_transition (incident_id, occurred_at);

ALTER TABLE monitor_change_event DROP CONSTRAINT IF EXISTS monitor_change_event_scope_type_check;
ALTER TABLE monitor_change_event ADD CONSTRAINT monitor_change_event_scope_type_check
  CHECK (scope_type IN ('user', 'plant', 'conversation', 'incident'));
