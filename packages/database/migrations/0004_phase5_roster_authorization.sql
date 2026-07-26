CREATE TABLE IF NOT EXISTS monitor_identity_global_permission (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  identity_id BIGINT NOT NULL REFERENCES monitor_identity_subject(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission = 'monitor:admin'),
  source TEXT NOT NULL CHECK (source IN ('emusasoft_auth', 'mock')),
  source_revision TEXT,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ,
  synchronized_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT monitor_identity_global_permission_dates_ck CHECK (effective_to IS NULL OR effective_to > effective_from)
);
CREATE INDEX IF NOT EXISTS monitor_identity_global_permission_identity_idx
  ON monitor_identity_global_permission (identity_id, permission, effective_from);
CREATE UNIQUE INDEX IF NOT EXISTS monitor_identity_global_permission_current_uq
  ON monitor_identity_global_permission (identity_id, permission)
  WHERE effective_to IS NULL;

CREATE TABLE IF NOT EXISTS monitor_identity_operation_permission (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  identity_id BIGINT NOT NULL REFERENCES monitor_identity_subject(id) ON DELETE CASCADE,
  plant_id BIGINT NOT NULL CHECK (plant_id > 0),
  operation_id BIGINT NOT NULL CHECK (operation_id > 0),
  permission TEXT NOT NULL CHECK (permission = 'roster:rotation:manage'),
  source TEXT NOT NULL CHECK (source IN ('emusasoft_auth', 'mock')),
  source_revision TEXT,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ,
  synchronized_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT monitor_identity_operation_permission_dates_ck CHECK (effective_to IS NULL OR effective_to > effective_from)
);
CREATE INDEX IF NOT EXISTS monitor_identity_operation_permission_identity_idx
  ON monitor_identity_operation_permission (identity_id, permission, effective_from);
CREATE INDEX IF NOT EXISTS monitor_identity_operation_permission_operation_idx
  ON monitor_identity_operation_permission (plant_id, operation_id, permission, effective_from);
CREATE UNIQUE INDEX IF NOT EXISTS monitor_identity_operation_permission_current_uq
  ON monitor_identity_operation_permission (identity_id, plant_id, operation_id, permission)
  WHERE effective_to IS NULL;
