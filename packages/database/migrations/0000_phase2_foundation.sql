CREATE TABLE IF NOT EXISTS monitor_identity_subject (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider TEXT NOT NULL,
  subject TEXT NOT NULL,
  sys_user_id BIGINT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT monitor_identity_subject_provider_subject_uq UNIQUE (provider, subject),
  CONSTRAINT monitor_identity_subject_provider_sys_user_uq UNIQUE (provider, sys_user_id)
);

CREATE TABLE IF NOT EXISTS monitor_identity_plant_scope (
  identity_id BIGINT NOT NULL REFERENCES monitor_identity_subject(id) ON DELETE CASCADE,
  plant_id BIGINT NOT NULL CHECK (plant_id > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT monitor_identity_plant_scope_pk PRIMARY KEY (identity_id, plant_id)
);
CREATE INDEX IF NOT EXISTS monitor_identity_plant_scope_plant_idx ON monitor_identity_plant_scope (plant_id);

CREATE TABLE IF NOT EXISTS monitor_feature_flag (
  key TEXT PRIMARY KEY CHECK (key ~ '^[a-z][a-z0-9._-]*$'),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT NOT NULL CHECK (length(description) > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monitor_change_event (
  cursor BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id UUID NOT NULL DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type ~ '^[a-z]+(?:[.][a-z]+)+$'),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('user', 'plant', 'conversation', 'incident')),
  scope_id TEXT NOT NULL CHECK (length(scope_id) > 0),
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT monitor_change_event_event_id_uq UNIQUE (event_id)
);
CREATE INDEX IF NOT EXISTS monitor_change_event_scope_cursor_idx ON monitor_change_event (scope_type, scope_id, cursor);
CREATE INDEX IF NOT EXISTS monitor_change_event_occurred_at_idx ON monitor_change_event (occurred_at);
