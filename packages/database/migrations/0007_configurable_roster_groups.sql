ALTER TABLE monitor_roster_assignment
  DROP CONSTRAINT IF EXISTS monitor_roster_assignment_group_ck;

ALTER TABLE monitor_roster_assignment
  DROP CONSTRAINT IF EXISTS monitor_roster_assignment_worker_group_check;

ALTER TABLE monitor_roster_assignment
  ADD CONSTRAINT monitor_roster_assignment_group_ck
  CHECK (worker_group IS NULL OR length(trim(worker_group)) BETWEEN 1 AND 40);
