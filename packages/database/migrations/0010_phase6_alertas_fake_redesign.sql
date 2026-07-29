ALTER TABLE monitor_sim_scenario
  ADD COLUMN IF NOT EXISTS current_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_revision BIGINT,
  ADD COLUMN IF NOT EXISTS selected_case TEXT,
  ADD COLUMN IF NOT EXISTS last_action_recorded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_changed_at TIMESTAMPTZ;

ALTER TABLE monitor_sim_a02_flow
  ADD COLUMN IF NOT EXISTS physical_arrival_state TEXT NOT NULL DEFAULT 'unknown';

ALTER TABLE monitor_sim_a05_reel
  ADD COLUMN IF NOT EXISTS reel_kind TEXT NOT NULL DEFAULT 'produced';

ALTER TABLE monitor_routing_decision
  ADD COLUMN IF NOT EXISTS primary_role TEXT;

UPDATE monitor_sim_scenario AS scenario
SET current_at = COALESCE(scenario.current_at, clock.current_at),
    source_revision = COALESCE(scenario.source_revision, clock.revision),
    selected_case = COALESCE(scenario.selected_case, 'clean_baseline'),
    last_action_recorded_at = COALESCE(scenario.last_action_recorded_at, scenario.last_action_at),
    source_changed_at = COALESCE(scenario.source_changed_at, scenario.last_action_at)
FROM monitor_sim_clock AS clock
WHERE clock.singleton = TRUE;

ALTER TABLE monitor_sim_scenario
  ALTER COLUMN current_at SET NOT NULL,
  ALTER COLUMN current_at SET DEFAULT now(),
  ALTER COLUMN source_revision SET NOT NULL,
  ALTER COLUMN source_revision SET DEFAULT 1,
  ALTER COLUMN selected_case SET NOT NULL,
  ALTER COLUMN selected_case SET DEFAULT 'clean_baseline',
  ALTER COLUMN last_action_recorded_at SET NOT NULL,
  ALTER COLUMN last_action_recorded_at SET DEFAULT now(),
  ALTER COLUMN source_changed_at SET NOT NULL,
  ALTER COLUMN source_changed_at SET DEFAULT now();

ALTER TABLE monitor_sim_scenario
  DROP CONSTRAINT IF EXISTS monitor_sim_scenario_source_revision_check,
  DROP CONSTRAINT IF EXISTS monitor_sim_scenario_selected_case_check;

ALTER TABLE monitor_sim_scenario
  ADD CONSTRAINT monitor_sim_scenario_source_revision_check CHECK (source_revision > 0),
  ADD CONSTRAINT monitor_sim_scenario_selected_case_check CHECK (
    selected_case IN (
      'clean_baseline',
      'before_threshold',
      'at_threshold',
      'before_threshold_not_weighed',
      'before_threshold_still_at_machine',
      'at_threshold_not_weighed',
      'at_threshold_still_at_machine',
      'past_threshold',
      'past_threshold_pending_dispatch',
      'past_threshold_at_machine',
      'past_threshold_unknown_arrival',
      'suppressed_by_a07',
      'past_threshold_not_weighed',
      'past_threshold_still_at_machine',
      'past_threshold_both',
      'past_threshold_produced',
      'past_threshold_remnant',
      'movement_started',
      'corrected',
      'recurrence'
    )
  );

INSERT INTO monitor_sim_a02_flow (
  material_flow_detail_id,
  is_work_order_reservation,
  state,
  received_at,
  started_at,
  physical_arrival_state,
  work_order_id,
  work_order_code,
  machine_code,
  operation_name,
  shift_name,
  responsible_name
)
SELECT
  4202,
  TRUE,
  'RECIBIDO',
  scenario.current_at,
  scenario.current_at - INTERVAL '10 minutes',
  'unknown',
  '1510873',
  '151087.3',
  'P15',
  'Impresión',
  'Día',
  'Almacén de materia prima'
FROM monitor_sim_scenario AS scenario
WHERE scenario.rule_code = 'A02'
ON CONFLICT (material_flow_detail_id) DO NOTHING;

INSERT INTO monitor_sim_a03_work_order (
  work_order_id,
  active,
  started_at,
  stronger_a07,
  work_order_code,
  machine_code,
  operation_name,
  shift_name,
  responsible_name
)
SELECT
  4103,
  TRUE,
  scenario.current_at - INTERVAL '20 minutes',
  FALSE,
  '151056.1',
  'P12',
  'Impresión',
  'Día',
  'Operación de máquina'
FROM monitor_sim_scenario AS scenario
WHERE scenario.rule_code = 'A03'
ON CONFLICT (work_order_id) DO NOTHING;

INSERT INTO monitor_sim_a03_consumption (work_order_id, consumption_count, first_consumption_at)
SELECT 4103, 1, scenario.current_at - INTERVAL '5 minutes'
FROM monitor_sim_scenario AS scenario
WHERE scenario.rule_code = 'A03'
ON CONFLICT (work_order_id) DO NOTHING;

INSERT INTO monitor_sim_a05_reel (
  article_serial_id,
  declared_at,
  weighed,
  source_work_order_finished,
  moved_from_machine,
  reel_kind,
  work_order_id,
  work_order_code,
  machine_code,
  operation_name,
  shift_name,
  responsible_name
)
SELECT
  4205,
  scenario.current_at - INTERVAL '40 minutes',
  TRUE,
  TRUE,
  TRUE,
  'produced',
  '1510873',
  '151087.3',
  'P15',
  'Impresión',
  'Día',
  'Equipo de procesos'
FROM monitor_sim_scenario AS scenario
WHERE scenario.rule_code = 'A05'
ON CONFLICT (article_serial_id) DO NOTHING;
