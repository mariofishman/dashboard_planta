ALTER TABLE monitor_roster_assignment ADD COLUMN IF NOT EXISTS sys_user_id BIGINT;
CREATE UNIQUE INDEX IF NOT EXISTS monitor_roster_assignment_plant_sys_user_uq
  ON monitor_roster_assignment (plant_id, sys_user_id) WHERE sys_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS monitor_conversation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id BIGINT NOT NULL CHECK (plant_id > 0),
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
  participant_fingerprint TEXT NOT NULL,
  writable_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS monitor_conversation_fingerprint_idx
  ON monitor_conversation (plant_id, participant_fingerprint, updated_at DESC);

CREATE TABLE IF NOT EXISTS monitor_conversation_participant (
  conversation_id UUID NOT NULL REFERENCES monitor_conversation(id) ON DELETE CASCADE,
  sys_user_id BIGINT NOT NULL CHECK (sys_user_id > 0),
  display_name TEXT NOT NULL,
  source_key TEXT NOT NULL,
  added_by_sys_user_id BIGINT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_by_sys_user_id BIGINT,
  removed_at TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, sys_user_id)
);
CREATE INDEX IF NOT EXISTS monitor_conversation_participant_user_idx
  ON monitor_conversation_participant (sys_user_id, conversation_id) WHERE removed_at IS NULL;

CREATE TABLE IF NOT EXISTS monitor_conversation_membership_audit (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES monitor_conversation(id) ON DELETE CASCADE,
  sys_user_id BIGINT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('added', 'removed')),
  actor_sys_user_id BIGINT,
  reason TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monitor_conversation_incident (
  conversation_id UUID NOT NULL REFERENCES monitor_conversation(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES monitor_incident(id) ON DELETE CASCADE,
  attached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, incident_id),
  UNIQUE (incident_id)
);

CREATE TABLE IF NOT EXISTS monitor_message (
  cursor BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  conversation_id UUID NOT NULL REFERENCES monitor_conversation(id) ON DELETE CASCADE,
  sender_sys_user_id BIGINT,
  sender_name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('text', 'alert', 'attachment')),
  body TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
  reply_to_message_id UUID REFERENCES monitor_message(id),
  client_command_id TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  UNIQUE (sender_sys_user_id, client_command_id)
);
CREATE INDEX IF NOT EXISTS monitor_message_conversation_cursor_idx
  ON monitor_message (conversation_id, cursor DESC);

CREATE TABLE IF NOT EXISTS monitor_message_revision (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES monitor_message(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('edited', 'deleted')),
  prior_body TEXT NOT NULL,
  prior_payload JSONB NOT NULL,
  actor_sys_user_id BIGINT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monitor_message_receipt (
  message_id UUID NOT NULL REFERENCES monitor_message(id) ON DELETE CASCADE,
  sys_user_id BIGINT NOT NULL CHECK (sys_user_id > 0),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  PRIMARY KEY (message_id, sys_user_id)
);

CREATE TABLE IF NOT EXISTS monitor_conversation_user_state (
  conversation_id UUID NOT NULL REFERENCES monitor_conversation(id) ON DELETE CASCADE,
  sys_user_id BIGINT NOT NULL CHECK (sys_user_id > 0),
  last_read_cursor BIGINT NOT NULL DEFAULT 0 CHECK (last_read_cursor >= 0),
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, sys_user_id)
);
