ALTER TABLE monitor_scenario_experiment
  ADD COLUMN IF NOT EXISTS run_id TEXT,
  ADD COLUMN IF NOT EXISTS manifest_version TEXT NOT NULL DEFAULT 'unversioned',
  ADD COLUMN IF NOT EXISTS source_action_contract_version TEXT NOT NULL DEFAULT 'unversioned';

UPDATE monitor_scenario_experiment
SET run_id='legacy:' || id::text
WHERE run_id IS NULL OR run_id='legacy';

ALTER TABLE monitor_scenario_experiment
  ALTER COLUMN run_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS monitor_scenario_experiment_run_id_idx
  ON monitor_scenario_experiment (run_id);

ALTER TABLE monitor_scenario_snapshot
  ADD COLUMN IF NOT EXISTS schema_version TEXT NOT NULL DEFAULT 'legacy';

CREATE INDEX IF NOT EXISTS monitor_scenario_experiment_history_idx
  ON monitor_scenario_experiment (created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS monitor_scenario_snapshot_history_idx
  ON monitor_scenario_snapshot (experiment_id, captured_at, id);

CREATE INDEX IF NOT EXISTS monitor_scenario_result_history_idx
  ON monitor_scenario_acceptance_result (experiment_id, started_at, test_id);
