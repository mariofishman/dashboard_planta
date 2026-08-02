ALTER TABLE monitor_scenario_experiment
  ADD COLUMN IF NOT EXISTS source_cutoff_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS initial_business_time TIMESTAMPTZ;

UPDATE monitor_scenario_experiment
SET source_cutoff_at = business_time - INTERVAL '30 days'
WHERE source_cutoff_at IS NULL;

UPDATE monitor_scenario_experiment
SET initial_business_time = business_time
WHERE initial_business_time IS NULL;

ALTER TABLE monitor_scenario_experiment
  ALTER COLUMN source_cutoff_at SET NOT NULL,
  ALTER COLUMN initial_business_time SET NOT NULL;

COMMENT ON COLUMN monitor_scenario_experiment.source_cutoff_at IS
  'Immutable lower source-time boundary for the connected Stage 5 experiment.';

COMMENT ON COLUMN monitor_scenario_experiment.initial_business_time IS
  'Immutable starting clock for the experiment; business_time advances independently.';
