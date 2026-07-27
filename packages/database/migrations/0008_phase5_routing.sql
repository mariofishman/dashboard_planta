CREATE TABLE IF NOT EXISTS monitor_rotation_pattern (
  plant_id BIGINT NOT NULL CHECK (plant_id > 0),
  operation_name TEXT NOT NULL,
  revision BIGINT NOT NULL DEFAULT 0 CHECK (revision >= 0),
  pattern JSONB NOT NULL CHECK (jsonb_typeof(pattern) = 'object'),
  updated_by_sys_user_id BIGINT NOT NULL CHECK (updated_by_sys_user_id > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (plant_id, operation_name)
);

CREATE TABLE IF NOT EXISTS monitor_rotation_pattern_audit (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  plant_id BIGINT NOT NULL CHECK (plant_id > 0),
  operation_name TEXT NOT NULL,
  revision BIGINT NOT NULL CHECK (revision > 0),
  before_value JSONB,
  after_value JSONB NOT NULL CHECK (jsonb_typeof(after_value) = 'object'),
  changed_by_sys_user_id BIGINT NOT NULL CHECK (changed_by_sys_user_id > 0),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plant_id, operation_name, revision)
);

CREATE TABLE IF NOT EXISTS monitor_rotation_calendar_state (
  plant_id BIGINT NOT NULL CHECK (plant_id > 0),
  operation_name TEXT NOT NULL,
  revision BIGINT NOT NULL DEFAULT 0 CHECK (revision >= 0),
  adjustments JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(adjustments) = 'array'),
  coverages JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(coverages) = 'array'),
  updated_by_sys_user_id BIGINT NOT NULL CHECK (updated_by_sys_user_id > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (plant_id, operation_name)
);

CREATE TABLE IF NOT EXISTS monitor_rotation_calendar_state_audit (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  plant_id BIGINT NOT NULL CHECK (plant_id > 0),
  operation_name TEXT NOT NULL,
  revision BIGINT NOT NULL CHECK (revision > 0),
  before_value JSONB,
  after_value JSONB NOT NULL CHECK (jsonb_typeof(after_value) = 'object'),
  changed_by_sys_user_id BIGINT NOT NULL CHECK (changed_by_sys_user_id > 0),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plant_id, operation_name, revision)
);

CREATE TABLE IF NOT EXISTS monitor_rotation_exception (
  id TEXT PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 200),
  plant_id BIGINT NOT NULL CHECK (plant_id > 0),
  operation_name TEXT NOT NULL,
  assignment_id TEXT NOT NULL REFERENCES monitor_roster_assignment(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('group', 'schedule', 'custom')),
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  target JSONB NOT NULL CHECK (jsonb_typeof(target) = 'object'),
  created_by_sys_user_id BIGINT NOT NULL CHECK (created_by_sys_user_id > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (valid_to >= valid_from)
);
CREATE INDEX IF NOT EXISTS monitor_rotation_exception_lookup_idx
  ON monitor_rotation_exception (plant_id, operation_name, assignment_id, valid_from, valid_to);

CREATE TABLE IF NOT EXISTS monitor_rotation_exception_audit (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  exception_id TEXT NOT NULL,
  plant_id BIGINT NOT NULL CHECK (plant_id > 0),
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'removed')),
  before_value JSONB,
  after_value JSONB,
  changed_by_sys_user_id BIGINT NOT NULL CHECK (changed_by_sys_user_id > 0),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monitor_routing_decision (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES monitor_incident(id) ON DELETE CASCADE,
  incident_fingerprint TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('complete', 'partial', 'conflict')),
  required_roles JSONB NOT NULL CHECK (jsonb_typeof(required_roles) = 'array'),
  resolved_recipients JSONB NOT NULL CHECK (jsonb_typeof(resolved_recipients) = 'array'),
  diagnostics JSONB NOT NULL CHECK (jsonb_typeof(diagnostics) = 'array'),
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (incident_id, incident_fingerprint)
);
CREATE INDEX IF NOT EXISTS monitor_routing_decision_incident_idx
  ON monitor_routing_decision (incident_id, evaluated_at DESC);

CREATE TABLE IF NOT EXISTS monitor_notification_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES monitor_incident(id) ON DELETE CASCADE,
  routing_decision_id UUID NOT NULL REFERENCES monitor_routing_decision(id) ON DELETE CASCADE,
  recipient_key TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email')),
  state TEXT NOT NULL CHECK (state IN ('pending', 'sent', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (incident_id, recipient_key, channel)
);
CREATE INDEX IF NOT EXISTS monitor_notification_delivery_retry_idx
  ON monitor_notification_delivery (state, next_attempt_at) WHERE state <> 'sent';

CREATE TABLE IF NOT EXISTS monitor_admin_email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES monitor_incident(id) ON DELETE CASCADE,
  routing_decision_id UUID NOT NULL REFERENCES monitor_routing_decision(id) ON DELETE CASCADE,
  administrator_sys_user_id BIGINT NOT NULL CHECK (administrator_sys_user_id > 0),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'sent', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  UNIQUE (incident_id, administrator_sys_user_id)
);
