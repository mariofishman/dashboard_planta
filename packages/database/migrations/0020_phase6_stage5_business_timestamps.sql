WITH scenario_evidence AS (
  SELECT evidence.id, runtime.business_time
  FROM monitor_incident_evidence evidence
  JOIN monitor_scenario_runtime_event runtime
    ON runtime.event_type = 'poll_completed'
   AND runtime.payload->>'cycleId' = evidence.cycle_id::text
)
UPDATE monitor_incident_evidence evidence
SET observed_at = scenario_evidence.business_time
FROM scenario_evidence
WHERE evidence.id = scenario_evidence.id
  AND evidence.observed_at IS DISTINCT FROM scenario_evidence.business_time;

WITH scenario_transitions AS (
  SELECT transition.id, runtime.business_time
  FROM monitor_incident_transition transition
  JOIN monitor_scenario_runtime_event runtime
    ON runtime.event_type = 'poll_completed'
   AND runtime.payload->>'cycleId' = transition.cycle_id::text
)
UPDATE monitor_incident_transition transition
SET occurred_at = scenario_transitions.business_time
FROM scenario_transitions
WHERE transition.id = scenario_transitions.id
  AND transition.occurred_at IS DISTINCT FROM scenario_transitions.business_time;

WITH scenario_incident_times AS (
  SELECT evidence.incident_id, MIN(runtime.business_time) AS opened_at, MAX(runtime.business_time) AS updated_at
  FROM monitor_incident_evidence evidence
  JOIN monitor_scenario_runtime_event runtime
    ON runtime.event_type = 'poll_completed'
   AND runtime.payload->>'cycleId' = evidence.cycle_id::text
  GROUP BY evidence.incident_id
)
UPDATE monitor_incident incident
SET opened_at = scenario_incident_times.opened_at,
    updated_at = scenario_incident_times.updated_at,
    resolved_at = CASE WHEN incident.resolved_at IS NULL THEN NULL ELSE scenario_incident_times.updated_at END
FROM scenario_incident_times
WHERE incident.id = scenario_incident_times.incident_id
  AND (incident.opened_at IS DISTINCT FROM scenario_incident_times.opened_at
    OR incident.updated_at IS DISTINCT FROM scenario_incident_times.updated_at
    OR (incident.resolved_at IS NOT NULL AND incident.resolved_at IS DISTINCT FROM scenario_incident_times.updated_at));
