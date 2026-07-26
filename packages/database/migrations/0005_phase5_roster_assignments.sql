CREATE TABLE IF NOT EXISTS monitor_roster_revision (
  plant_id BIGINT PRIMARY KEY CHECK (plant_id > 0),
  revision BIGINT NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monitor_roster_assignment (
  id TEXT PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 128),
  plant_id BIGINT NOT NULL CHECK (plant_id > 0),
  person_name TEXT NOT NULL CHECK (length(trim(person_name)) BETWEEN 1 AND 200),
  position TEXT,
  scope TEXT CHECK (scope IS NULL OR scope IN ('factory', 'operation', 'operation_group', 'machine_group', 'warehouse_group')),
  warehouse_type TEXT CHECK (warehouse_type IS NULL OR warehouse_type IN ('Materias primas', 'Productos en proceso')),
  worker_group TEXT CHECK (worker_group IS NULL OR worker_group IN ('A', 'B', 'C')),
  valid_from DATE NOT NULL,
  valid_to DATE,
  state TEXT NOT NULL CHECK (state IN ('active', 'future', 'inactive')),
  setup_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT monitor_roster_assignment_dates_ck CHECK (valid_to IS NULL OR valid_to >= valid_from)
);
CREATE UNIQUE INDEX IF NOT EXISTS monitor_roster_assignment_plant_person_uq
  ON monitor_roster_assignment (plant_id, lower(trim(person_name)));
CREATE INDEX IF NOT EXISTS monitor_roster_assignment_plant_state_idx
  ON monitor_roster_assignment (plant_id, state, valid_from);
CREATE INDEX IF NOT EXISTS monitor_roster_assignment_plant_position_idx
  ON monitor_roster_assignment (plant_id, position, valid_from);

CREATE TABLE IF NOT EXISTS monitor_roster_assignment_operation (
  assignment_id TEXT NOT NULL REFERENCES monitor_roster_assignment(id) ON DELETE CASCADE,
  operation_name TEXT NOT NULL CHECK (operation_name IN ('Impresión', 'Extrusión', 'Exlam', 'Corte', 'Sellado')),
  PRIMARY KEY (assignment_id, operation_name)
);
CREATE INDEX IF NOT EXISTS monitor_roster_assignment_operation_name_idx
  ON monitor_roster_assignment_operation (operation_name, assignment_id);

CREATE TABLE IF NOT EXISTS monitor_roster_assignment_audit (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  plant_id BIGINT NOT NULL CHECK (plant_id > 0),
  revision BIGINT NOT NULL CHECK (revision > 0),
  assignment_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'removed')),
  before_value JSONB,
  after_value JSONB,
  changed_by_sys_user_id BIGINT NOT NULL CHECK (changed_by_sys_user_id > 0),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT monitor_roster_assignment_audit_value_ck CHECK (
    (action = 'created' AND before_value IS NULL AND after_value IS NOT NULL)
    OR (action = 'updated' AND before_value IS NOT NULL AND after_value IS NOT NULL)
    OR (action = 'removed' AND before_value IS NOT NULL AND after_value IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS monitor_roster_assignment_audit_plant_revision_idx
  ON monitor_roster_assignment_audit (plant_id, revision, id);
CREATE INDEX IF NOT EXISTS monitor_roster_assignment_audit_assignment_idx
  ON monitor_roster_assignment_audit (assignment_id, changed_at);
