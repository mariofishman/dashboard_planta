ALTER TABLE monitor_roster_assignment_operation
  DROP CONSTRAINT IF EXISTS monitor_roster_assignment_operation_name_ck;

ALTER TABLE monitor_roster_assignment_operation
  DROP CONSTRAINT IF EXISTS monitor_roster_assignment_operation_operation_name_check;

ALTER TABLE monitor_roster_assignment_operation
  ADD CONSTRAINT monitor_roster_assignment_operation_name_ck
  CHECK (operation_name IN (
    'Extrusión',
    'Laminación',
    'Corte',
    'Impresión',
    'Sellado',
    'Exlam',
    'Peletizado',
    'Recuperación',
    'Triturado'
  ));
