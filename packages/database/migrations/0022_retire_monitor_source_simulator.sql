DELETE FROM monitor_condition_state
WHERE query_id IN (
  SELECT query_id FROM monitor_detection_query WHERE adapter_kind IN ('backup', 'fixture', 'simulator')
);

DELETE FROM monitor_poll_cycle
WHERE query_id IN (
  SELECT query_id FROM monitor_detection_query WHERE adapter_kind IN ('backup', 'fixture', 'simulator')
);

DELETE FROM monitor_detection_query WHERE adapter_kind IN ('backup', 'fixture', 'simulator');

ALTER TABLE monitor_detection_query DROP CONSTRAINT IF EXISTS monitor_detection_query_adapter_kind_check;
ALTER TABLE monitor_detection_query ADD CONSTRAINT monitor_detection_query_adapter_kind_check
  CHECK (adapter_kind IN ('test_database', 'emusionsoft'));

DROP TABLE IF EXISTS monitor_sim_a03_consumption;
DROP TABLE IF EXISTS monitor_sim_a03_work_order;
DROP TABLE IF EXISTS monitor_sim_a02_flow;
DROP TABLE IF EXISTS monitor_sim_a05_reel;
DROP TABLE IF EXISTS monitor_sim_scenario;
DROP TABLE IF EXISTS monitor_sim_clock;
