UPDATE monitor_sim_scenario
SET selected_case = 'past_threshold'
WHERE rule_code = 'A02'
  AND selected_case IN (
    'past_threshold_pending_dispatch',
    'past_threshold_at_machine',
    'past_threshold_unknown_arrival'
  );

ALTER TABLE monitor_sim_scenario
  DROP CONSTRAINT IF EXISTS monitor_sim_scenario_selected_case_check;

ALTER TABLE monitor_sim_scenario
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

ALTER TABLE monitor_sim_a02_flow
  DROP COLUMN IF EXISTS physical_arrival_state;
