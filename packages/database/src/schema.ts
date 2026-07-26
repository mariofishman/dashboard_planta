import { sql } from "drizzle-orm";
import { bigint, boolean, check, date, index, integer, jsonb, pgTable, primaryKey, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const identitySubject = pgTable("monitor_identity_subject", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  provider: text("provider").notNull(),
  subject: text("subject").notNull(),
  sysUserId: bigint("sys_user_id", { mode: "number" }).notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("monitor_identity_subject_provider_subject_uq").on(table.provider, table.subject),
  unique("monitor_identity_subject_provider_sys_user_uq").on(table.provider, table.sysUserId),
]);

export const identityPlantScope = pgTable("monitor_identity_plant_scope", {
  identityId: bigint("identity_id", { mode: "number" }).notNull().references(() => identitySubject.id, { onDelete: "cascade" }),
  plantId: bigint("plant_id", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ name: "monitor_identity_plant_scope_pk", columns: [table.identityId, table.plantId] }),
  index("monitor_identity_plant_scope_plant_idx").on(table.plantId),
]);

export const identityGlobalPermission = pgTable("monitor_identity_global_permission", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  identityId: bigint("identity_id", { mode: "number" }).notNull().references(() => identitySubject.id, { onDelete: "cascade" }),
  permission: text("permission").notNull(),
  source: text("source").notNull(),
  sourceRevision: text("source_revision"),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
  effectiveTo: timestamp("effective_to", { withTimezone: true }),
  synchronizedAt: timestamp("synchronized_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("monitor_identity_global_permission_name_ck", sql`${table.permission} = 'monitor:admin'`),
  check("monitor_identity_global_permission_source_ck", sql`${table.source} IN ('emusasoft_auth', 'mock')`),
  check("monitor_identity_global_permission_dates_ck", sql`${table.effectiveTo} IS NULL OR ${table.effectiveTo} > ${table.effectiveFrom}`),
  index("monitor_identity_global_permission_identity_idx").on(table.identityId, table.permission, table.effectiveFrom),
  uniqueIndex("monitor_identity_global_permission_current_uq").on(table.identityId, table.permission).where(sql`${table.effectiveTo} IS NULL`),
]);

export const identityOperationPermission = pgTable("monitor_identity_operation_permission", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  identityId: bigint("identity_id", { mode: "number" }).notNull().references(() => identitySubject.id, { onDelete: "cascade" }),
  plantId: bigint("plant_id", { mode: "number" }).notNull(),
  operationId: bigint("operation_id", { mode: "number" }).notNull(),
  permission: text("permission").notNull(),
  source: text("source").notNull(),
  sourceRevision: text("source_revision"),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
  effectiveTo: timestamp("effective_to", { withTimezone: true }),
  synchronizedAt: timestamp("synchronized_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("monitor_identity_operation_permission_plant_ck", sql`${table.plantId} > 0`),
  check("monitor_identity_operation_permission_operation_ck", sql`${table.operationId} > 0`),
  check("monitor_identity_operation_permission_name_ck", sql`${table.permission} = 'roster:rotation:manage'`),
  check("monitor_identity_operation_permission_source_ck", sql`${table.source} IN ('emusasoft_auth', 'mock')`),
  check("monitor_identity_operation_permission_dates_ck", sql`${table.effectiveTo} IS NULL OR ${table.effectiveTo} > ${table.effectiveFrom}`),
  index("monitor_identity_operation_permission_identity_idx").on(table.identityId, table.permission, table.effectiveFrom),
  index("monitor_identity_operation_permission_operation_idx").on(table.plantId, table.operationId, table.permission, table.effectiveFrom),
  uniqueIndex("monitor_identity_operation_permission_current_uq").on(table.identityId, table.plantId, table.operationId, table.permission).where(sql`${table.effectiveTo} IS NULL`),
]);

export const rosterRevision = pgTable("monitor_roster_revision", {
  plantId: bigint("plant_id", { mode: "number" }).primaryKey(),
  revision: bigint("revision", { mode: "number" }).notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("monitor_roster_revision_plant_ck", sql`${table.plantId} > 0`),
  check("monitor_roster_revision_value_ck", sql`${table.revision} >= 0`),
]);

export const rosterAssignment = pgTable("monitor_roster_assignment", {
  id: text("id").primaryKey(),
  plantId: bigint("plant_id", { mode: "number" }).notNull(),
  personName: text("person_name").notNull(),
  position: text("position"),
  scope: text("scope"),
  warehouseType: text("warehouse_type"),
  workerGroup: text("worker_group"),
  validFrom: date("valid_from").notNull(),
  validTo: date("valid_to"),
  state: text("state").notNull(),
  setupComplete: boolean("setup_complete").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("monitor_roster_assignment_plant_ck", sql`${table.plantId} > 0`),
  check("monitor_roster_assignment_scope_ck", sql`${table.scope} IS NULL OR ${table.scope} IN ('factory', 'operation', 'operation_group', 'machine_group', 'warehouse_group')`),
  check("monitor_roster_assignment_warehouse_ck", sql`${table.warehouseType} IS NULL OR ${table.warehouseType} IN ('Materias primas', 'Productos en proceso')`),
  check("monitor_roster_assignment_group_ck", sql`${table.workerGroup} IS NULL OR length(trim(${table.workerGroup})) BETWEEN 1 AND 40`),
  check("monitor_roster_assignment_state_ck", sql`${table.state} IN ('active', 'future', 'inactive')`),
  check("monitor_roster_assignment_dates_ck", sql`${table.validTo} IS NULL OR ${table.validTo} >= ${table.validFrom}`),
  uniqueIndex("monitor_roster_assignment_plant_person_uq").on(table.plantId, sql`lower(trim(${table.personName}))`),
  index("monitor_roster_assignment_plant_state_idx").on(table.plantId, table.state, table.validFrom),
  index("monitor_roster_assignment_plant_position_idx").on(table.plantId, table.position, table.validFrom),
]);

export const rosterAssignmentOperation = pgTable("monitor_roster_assignment_operation", {
  assignmentId: text("assignment_id").notNull().references(() => rosterAssignment.id, { onDelete: "cascade" }),
  operationName: text("operation_name").notNull(),
}, (table) => [
  primaryKey({ name: "monitor_roster_assignment_operation_pk", columns: [table.assignmentId, table.operationName] }),
  check("monitor_roster_assignment_operation_name_ck", sql`${table.operationName} IN ('Extrusión', 'Laminación', 'Corte', 'Impresión', 'Sellado', 'Exlam', 'Peletizado', 'Recuperación', 'Triturado')`),
  index("monitor_roster_assignment_operation_name_idx").on(table.operationName, table.assignmentId),
]);

export const rosterAssignmentAudit = pgTable("monitor_roster_assignment_audit", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  plantId: bigint("plant_id", { mode: "number" }).notNull(),
  revision: bigint("revision", { mode: "number" }).notNull(),
  assignmentId: text("assignment_id").notNull(),
  action: text("action").notNull(),
  beforeValue: jsonb("before_value"),
  afterValue: jsonb("after_value"),
  changedBySysUserId: bigint("changed_by_sys_user_id", { mode: "number" }).notNull(),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("monitor_roster_assignment_audit_plant_ck", sql`${table.plantId} > 0`),
  check("monitor_roster_assignment_audit_revision_ck", sql`${table.revision} > 0`),
  check("monitor_roster_assignment_audit_actor_ck", sql`${table.changedBySysUserId} > 0`),
  check("monitor_roster_assignment_audit_action_ck", sql`${table.action} IN ('created', 'updated', 'removed')`),
  index("monitor_roster_assignment_audit_plant_revision_idx").on(table.plantId, table.revision, table.id),
  index("monitor_roster_assignment_audit_assignment_idx").on(table.assignmentId, table.changedAt),
]);

export const featureFlag = pgTable("monitor_feature_flag", {
  key: text("key").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  description: text("description").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const changeEvent = pgTable("monitor_change_event", {
  cursor: bigint("cursor", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  eventId: uuid("event_id").notNull().defaultRandom(),
  eventType: text("event_type").notNull(),
  scopeType: text("scope_type").notNull(),
  scopeId: text("scope_id").notNull(),
  payload: jsonb("payload").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("monitor_change_event_event_id_uq").on(table.eventId),
  index("monitor_change_event_scope_cursor_idx").on(table.scopeType, table.scopeId, table.cursor),
  index("monitor_change_event_occurred_at_idx").on(table.occurredAt),
]);

export const detectionQuery = pgTable("monitor_detection_query", {
  queryId: text("query_id").primaryKey(),
  ruleCode: text("rule_code").notNull(),
  queryVersion: text("query_version").notNull(),
  adapterKind: text("adapter_kind").notNull(),
  intervalMs: integer("interval_ms").notNull(),
  timeoutMs: integer("timeout_ms").notNull(),
  pageSize: integer("page_size").notNull(),
  maxRows: integer("max_rows").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pollCycle = pgTable("monitor_poll_cycle", {
  cycleId: uuid("cycle_id").primaryKey(),
  queryId: text("query_id").notNull().references(() => detectionQuery.queryId),
  queryVersion: text("query_version").notNull(),
  status: text("status").notNull(),
  sourceRevision: text("source_revision"),
  freshness: jsonb("freshness").notNull(),
  pageCount: integer("page_count").notNull().default(0),
  rowCount: integer("row_count").notNull().default(0),
  complete: boolean("complete").notNull().default(false),
  fullEvaluation: boolean("full_evaluation").notNull().default(false),
  recoveryRun: boolean("recovery_run").notNull().default(false),
  errorCode: text("error_code"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }).notNull(),
}, (table) => [index("monitor_poll_cycle_query_finished_idx").on(table.queryId, table.finishedAt)]);

export const conditionState = pgTable("monitor_condition_state", {
  queryId: text("query_id").notNull().references(() => detectionQuery.queryId),
  conditionKey: text("condition_key").notNull(),
  active: boolean("active").notNull(),
  evidence: jsonb("evidence").notNull(),
  firstObservedAt: timestamp("first_observed_at", { withTimezone: true }).notNull(),
  lastObservedAt: timestamp("last_observed_at", { withTimezone: true }).notNull(),
  lastHealthyCycleId: uuid("last_healthy_cycle_id").notNull().references(() => pollCycle.cycleId),
}, (table) => [
  primaryKey({ name: "monitor_condition_state_pk", columns: [table.queryId, table.conditionKey] }),
  index("monitor_condition_state_active_idx").on(table.queryId, table.active),
]);
