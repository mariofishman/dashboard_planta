ALTER TABLE monitor_detection_query DROP CONSTRAINT IF EXISTS monitor_detection_query_adapter_kind_check;
ALTER TABLE monitor_detection_query ADD CONSTRAINT monitor_detection_query_adapter_kind_check
  CHECK (adapter_kind IN ('fixture', 'backup', 'simulator', 'emusionsoft'));

CREATE TABLE IF NOT EXISTS monitor_sim_clock (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  current_at TIMESTAMPTZ NOT NULL,
  revision BIGINT NOT NULL DEFAULT 1 CHECK (revision > 0)
);

INSERT INTO monitor_sim_clock (singleton, current_at, revision)
VALUES (TRUE, now(), 1)
ON CONFLICT (singleton) DO NOTHING;

CREATE TABLE IF NOT EXISTS monitor_sim_scenario (
  rule_code TEXT PRIMARY KEY CHECK (rule_code IN ('A02', 'A03', 'A05')),
  last_action TEXT NOT NULL DEFAULT 'reset',
  last_action_at TIMESTAMPTZ NOT NULL,
  pending_fault TEXT CHECK (pending_fault IS NULL OR pending_fault IN ('timeout', 'source_error', 'partial', 'invalid_schema')),
  reset_at TIMESTAMPTZ NOT NULL
);

INSERT INTO monitor_sim_scenario (rule_code, last_action_at, reset_at)
VALUES ('A02', now(), now()), ('A03', now(), now()), ('A05', now(), now())
ON CONFLICT (rule_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS monitor_sim_a02_flow (
  material_flow_detail_id BIGINT PRIMARY KEY,
  is_work_order_reservation BOOLEAN NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('TRANSITO', 'RECIBIDO')),
  received_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL,
  work_order_id TEXT NOT NULL,
  work_order_code TEXT NOT NULL,
  machine_code TEXT NOT NULL,
  operation_name TEXT NOT NULL,
  shift_name TEXT NOT NULL,
  responsible_name TEXT NOT NULL,
  CHECK ((state = 'TRANSITO' AND received_at IS NULL) OR (state = 'RECIBIDO' AND received_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS monitor_sim_a03_work_order (
  work_order_id BIGINT PRIMARY KEY,
  active BOOLEAN NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  stronger_a07 BOOLEAN NOT NULL DEFAULT FALSE,
  work_order_code TEXT NOT NULL,
  machine_code TEXT NOT NULL,
  operation_name TEXT NOT NULL,
  shift_name TEXT NOT NULL,
  responsible_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS monitor_sim_a03_consumption (
  work_order_id BIGINT PRIMARY KEY REFERENCES monitor_sim_a03_work_order(work_order_id) ON DELETE CASCADE,
  consumption_count INTEGER NOT NULL CHECK (consumption_count >= 0),
  first_consumption_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS monitor_sim_a05_reel (
  article_serial_id BIGINT PRIMARY KEY,
  declared_at TIMESTAMPTZ NOT NULL,
  weighed BOOLEAN NOT NULL DEFAULT FALSE,
  source_work_order_finished BOOLEAN NOT NULL DEFAULT TRUE,
  moved_from_machine BOOLEAN NOT NULL DEFAULT FALSE,
  work_order_id TEXT NOT NULL,
  work_order_code TEXT NOT NULL,
  machine_code TEXT NOT NULL,
  operation_name TEXT NOT NULL,
  shift_name TEXT NOT NULL,
  responsible_name TEXT NOT NULL
);
