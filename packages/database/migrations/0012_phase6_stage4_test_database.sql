ALTER TABLE monitor_detection_query DROP CONSTRAINT IF EXISTS monitor_detection_query_adapter_kind_check;
ALTER TABLE monitor_detection_query ADD CONSTRAINT monitor_detection_query_adapter_kind_check
  CHECK (adapter_kind IN ('fixture', 'backup', 'simulator', 'test_database', 'emusionsoft'));
