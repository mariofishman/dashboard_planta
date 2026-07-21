import { bigint, boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

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
