ALTER TABLE monitor_scenario_experiment
  ADD COLUMN IF NOT EXISTS seconds_per_simulated_minute INTEGER,
  ADD COLUMN IF NOT EXISTS polling_frequency_minutes INTEGER;

-- A pre-V2 active experiment cannot safely resume under the corrected clock
-- semantics. Preserve it as history and require a new V2 experiment.
UPDATE monitor_scenario_experiment
SET status='completed', updated_at=now()
WHERE seconds_per_simulated_minute IS NULL AND status<>'completed';

UPDATE monitor_scenario_experiment
SET seconds_per_simulated_minute = CASE speed
      WHEN 1 THEN 60
      WHEN 2 THEN 30
      WHEN 3 THEN 20
      WHEN 60 THEN 1
      ELSE 1
    END,
    polling_frequency_minutes = LEAST(99, GREATEST(1, COALESCE((frequencies->>'A02')::INTEGER, 3)))
WHERE seconds_per_simulated_minute IS NULL OR polling_frequency_minutes IS NULL;

ALTER TABLE monitor_scenario_experiment
  ALTER COLUMN seconds_per_simulated_minute SET NOT NULL,
  ALTER COLUMN polling_frequency_minutes SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE monitor_scenario_experiment ADD CONSTRAINT monitor_scenario_seconds_per_minute_check
    CHECK (seconds_per_simulated_minute BETWEEN 1 AND 60);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE monitor_scenario_experiment ADD CONSTRAINT monitor_scenario_polling_frequency_check
    CHECK (polling_frequency_minutes BETWEEN 1 AND 99);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN monitor_scenario_experiment.speed IS
  'Legacy pre-V2 multiplier retained for historical traceability; V2 runtime uses seconds_per_simulated_minute.';
COMMENT ON COLUMN monitor_scenario_experiment.frequencies IS
  'Legacy pre-V2 per-rule frequencies retained for historical traceability; V2 runtime uses polling_frequency_minutes.';
