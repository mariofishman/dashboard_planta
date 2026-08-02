ALTER TABLE monitor_scenario_snapshot
  ADD COLUMN IF NOT EXISTS snapshot_sequence BIGSERIAL;

ALTER TABLE monitor_scenario_snapshot
  ALTER COLUMN snapshot_sequence SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS monitor_scenario_snapshot_experiment_sequence_uidx
  ON monitor_scenario_snapshot(experiment_id, snapshot_sequence);
