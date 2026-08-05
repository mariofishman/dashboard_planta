CREATE TABLE IF NOT EXISTS monitor_test_interruption (
  id UUID PRIMARY KEY,
  point TEXT NOT NULL CHECK (point IN (
    'after_incident_commit',
    'before_routing_decision',
    'after_routing_decision',
    'before_delivery_creation',
    'after_delivery_creation',
    'before_conversation_attachment',
    'after_conversation_attachment',
    'before_alert_message_creation',
    'after_alert_message_creation',
    'before_change_publication',
    'after_change_publication'
  )),
  status TEXT NOT NULL DEFAULT 'armed' CHECK (status IN ('armed','fired')),
  context JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(context) = 'object'),
  armed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fired_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS monitor_test_interruption_one_armed_point_idx
  ON monitor_test_interruption (point)
  WHERE status = 'armed';

CREATE INDEX IF NOT EXISTS monitor_test_interruption_history_idx
  ON monitor_test_interruption (armed_at, id);
