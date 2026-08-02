import { Static, Type } from "@sinclair/typebox";

export const MonitorScopeSchema = Type.Union([
  Type.Literal("monitor:read"),
  Type.Literal("monitor:admin"),
  Type.Literal("chat:write"),
]);
export type MonitorScope = Static<typeof MonitorScopeSchema>;

export const OperationPermissionSchema = Type.Literal("roster:rotation:manage");
export type OperationPermission = Static<typeof OperationPermissionSchema>;

export const OperationAuthorizationSchema = Type.Object({
  operationId: Type.Integer({ minimum: 1 }),
  operationName: Type.String({ minLength: 1 }),
  permissions: Type.Array(OperationPermissionSchema, { minItems: 1, uniqueItems: true }),
}, { additionalProperties: false });
export type OperationAuthorization = Static<typeof OperationAuthorizationSchema>;

export const PrincipalSchema = Type.Object({
  sysUserId: Type.Integer({ minimum: 1 }),
  displayName: Type.String({ minLength: 1 }),
  role: Type.String({ minLength: 1 }),
  plantIds: Type.Array(Type.Integer({ minimum: 1 }), { minItems: 1, uniqueItems: true }),
  scopes: Type.Array(MonitorScopeSchema, { uniqueItems: true }),
  operationAuthorizations: Type.Array(OperationAuthorizationSchema),
}, { additionalProperties: false });
export type Principal = Static<typeof PrincipalSchema>;

export const FeatureFlagsSchema = Type.Object({
  dashboardShell: Type.Boolean(),
  chatShell: Type.Boolean(),
  rosterShell: Type.Boolean(),
}, { additionalProperties: false });
export type FeatureFlags = Static<typeof FeatureFlagsSchema>;

export const SessionResponseSchema = Type.Object({
  principal: PrincipalSchema,
  features: FeatureFlagsSchema,
}, { additionalProperties: false });
export type SessionResponse = Static<typeof SessionResponseSchema>;

export const MockLoginRequestSchema = Type.Object({
  identityId: Type.Union([
    Type.Literal("monitor-admin"),
    Type.Literal("plant-manager"),
    Type.Literal("shift-supervisor"),
    Type.Literal("machine-operator"),
    Type.Literal("operation-scheduler"),
  ]),
}, { additionalProperties: false });
export type MockLoginRequest = Static<typeof MockLoginRequestSchema>;

export const SocketSessionReadySchema = Type.Object({
  cursor: Type.Integer({ minimum: 0 }),
  principal: PrincipalSchema,
  features: FeatureFlagsSchema,
}, { additionalProperties: false });
export type SocketSessionReady = Static<typeof SocketSessionReadySchema>;

export type Stage5BrowserServiceName = "laboratory" | "api" | "scheduler" | "monitor_database" | "dashboard" | "chat";
export type Stage5BrowserSurfaceName = "laboratory" | "dashboard" | "chat_list" | "chat_detail";
export interface Stage5BrowserServiceIdentity {
  name: Stage5BrowserServiceName;
  instanceId: string;
  location: string;
  identityDigest: string;
}
export interface Stage5BrowserSurfaceIdentity {
  name: Stage5BrowserSurfaceName;
  url: string;
  identityUrl: string;
}
export interface Stage5BrowserRuntimeIdentity {
  schemaVersion: "1.0.0";
  kind: "stage5_browser_runtime_identity";
  identity: {
    runId: string;
    experimentId: string;
    runtimeId: string;
    captureNonce: string;
    manifestVersion: string;
    sourceActionContractVersion: string;
    startedAt: string;
  };
  runtime: {
    mode: "connected";
    sourceKind: "test_database";
    sourceAccount: "monitor_source_ro";
    apiOrigin: string;
    webOrigin: string;
    identityEndpoint: "/api/dev/stage5/runtime-identity";
    monitorDatabaseInstanceId: string;
    schedulerOwnerId: string;
    startedAt: string;
    services: Stage5BrowserServiceIdentity[];
    surfaces: Stage5BrowserSurfaceIdentity[];
  };
}

const RosterPositionSchema = Type.Union([
  Type.Literal(""),
  Type.Literal("Gerente de fábrica"),
  Type.Literal("Supervisor de turno de operación"),
  Type.Literal("Líder técnico"),
  Type.Literal("Operador de máquina"),
  Type.Literal("Planificador de materiales"),
  Type.Literal("Planificador"),
  Type.Literal("Despachador de almacén"),
  Type.Literal("Supervisor de almacén"),
  Type.Literal("Operador de proceso"),
  Type.Literal("Supervisor de proceso"),
]);

const RosterOperationSchema = Type.Union([
  Type.Literal("Extrusión"),
  Type.Literal("Laminación"),
  Type.Literal("Corte"),
  Type.Literal("Impresión"),
  Type.Literal("Sellado"),
  Type.Literal("Exlam"),
  Type.Literal("Peletizado"),
  Type.Literal("Recuperación"),
  Type.Literal("Triturado"),
]);

export const RosterAssignmentSchema = Type.Object({
  id: Type.String({ minLength: 1, maxLength: 128 }),
  sysUserId: Type.Optional(Type.Integer({ minimum: 1 })),
  person: Type.String({ minLength: 1, maxLength: 200 }),
  position: RosterPositionSchema,
  operations: Type.Array(RosterOperationSchema, { uniqueItems: true, maxItems: 9 }),
  warehouseType: Type.Union([Type.Literal("Materias primas"), Type.Literal("Productos en proceso"), Type.Null()]),
  scope: Type.Union([
    Type.Literal("factory"),
    Type.Literal("operation"),
    Type.Literal("operation_group"),
    Type.Literal("machine_group"),
    Type.Literal("warehouse_group"),
    Type.Null(),
  ]),
  group: Type.Union([Type.String({ minLength: 1, maxLength: 40 }), Type.Null()]),
  validFrom: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
  validTo: Type.Union([Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }), Type.Null()]),
  state: Type.Union([Type.Literal("active"), Type.Literal("future"), Type.Literal("inactive")]),
  setupComplete: Type.Boolean(),
}, { additionalProperties: false });
export type RosterAssignment = Static<typeof RosterAssignmentSchema>;

export const RosterSnapshotSchema = Type.Object({
  revision: Type.Integer({ minimum: 0 }),
  assignments: Type.Array(RosterAssignmentSchema, { maxItems: 5000 }),
}, { additionalProperties: false });
export type RosterSnapshot = Static<typeof RosterSnapshotSchema>;

export const SaveRosterSnapshotSchema = Type.Object({
  revision: Type.Integer({ minimum: 0 }),
  assignments: Type.Array(RosterAssignmentSchema, { maxItems: 5000 }),
}, { additionalProperties: false });
export type SaveRosterSnapshot = Static<typeof SaveRosterSnapshotSchema>;

export const RotationScheduleSchema = Type.Object({
  id: Type.String({ minLength: 1, maxLength: 80 }),
  name: Type.String({ minLength: 1, maxLength: 80 }),
  start: Type.Union([Type.String({ pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" }), Type.Null()]),
  end: Type.Union([Type.String({ pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" }), Type.Null()]),
  isRest: Type.Boolean(),
}, { additionalProperties: false });

export const RotationPatternGroupSchema = Type.Object({
  id: Type.String({ minLength: 1, maxLength: 40 }),
  name: Type.String({ minLength: 1, maxLength: 80 }),
  anchorScheduleId: Type.String({ minLength: 1, maxLength: 80 }),
  daysPerPhase: Type.Integer({ minimum: 1, maximum: 60 }),
}, { additionalProperties: false });

export const RotationPatternSchema = Type.Object({
  effectiveFrom: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
  schedules: Type.Array(RotationScheduleSchema, { minItems: 1, maxItems: 20 }),
  groups: Type.Array(RotationPatternGroupSchema, { minItems: 1, maxItems: 20 }),
}, { additionalProperties: false });
export type RotationPattern = Static<typeof RotationPatternSchema>;

export interface RotationPatternConflict {
  dayOffset: number;
  scheduleId: string;
  groupIds: [string, string];
}

function greatestCommonDivisor(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function leastCommonMultiple(left: number, right: number): number {
  return Math.abs(left * right) / greatestCommonDivisor(left, right);
}

export function firstRotationPatternConflict(pattern: RotationPattern): RotationPatternConflict | null {
  const restIds = new Set(pattern.schedules.filter((schedule) => schedule.isRest).map((schedule) => schedule.id));
  const scheduleIndex = new Map(pattern.schedules.map((schedule, index) => [schedule.id, index]));
  const scheduleCount = pattern.schedules.length;
  for (let leftIndex = 0; leftIndex < pattern.groups.length; leftIndex += 1) {
    const left = pattern.groups[leftIndex]!;
    const leftAnchor = scheduleIndex.get(left.anchorScheduleId);
    if (leftAnchor === undefined) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < pattern.groups.length; rightIndex += 1) {
      const right = pattern.groups[rightIndex]!;
      const rightAnchor = scheduleIndex.get(right.anchorScheduleId);
      if (rightAnchor === undefined) continue;
      const pairCycle = leastCommonMultiple(scheduleCount * left.daysPerPhase, scheduleCount * right.daysPerPhase);
      for (let dayOffset = 0; dayOffset < pairCycle; dayOffset += 1) {
        const leftSchedule = pattern.schedules[(leftAnchor + Math.floor(dayOffset / left.daysPerPhase)) % scheduleCount]!.id;
        const rightSchedule = pattern.schedules[(rightAnchor + Math.floor(dayOffset / right.daysPerPhase)) % scheduleCount]!.id;
        if (leftSchedule === rightSchedule && !restIds.has(leftSchedule)) {
          return { dayOffset, scheduleId: leftSchedule, groupIds: [left.id, right.id] };
        }
      }
    }
  }
  return null;
}

export const RotationPatternSnapshotSchema = Type.Object({
  operation: RosterOperationSchema,
  revision: Type.Integer({ minimum: 0 }),
  pattern: RotationPatternSchema,
}, { additionalProperties: false });
export type RotationPatternSnapshot = Static<typeof RotationPatternSnapshotSchema>;

export const SaveRotationPatternSchema = Type.Object({
  revision: Type.Integer({ minimum: 0 }),
  pattern: RotationPatternSchema,
}, { additionalProperties: false });

export const RotationExceptionSchema = Type.Object({
  id: Type.String({ minLength: 1, maxLength: 200 }),
  operation: RosterOperationSchema,
  workerId: Type.String({ minLength: 1, maxLength: 128 }),
  kind: Type.Union([Type.Literal("group"), Type.Literal("schedule"), Type.Literal("custom")]),
  startDate: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
  endDate: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
  groupId: Type.Union([Type.String({ minLength: 1, maxLength: 40 }), Type.Null()]),
  groupName: Type.Union([Type.String({ minLength: 1, maxLength: 80 }), Type.Null()]),
  scheduleId: Type.Union([Type.String({ minLength: 1, maxLength: 80 }), Type.Null()]),
  customScheduleName: Type.Union([Type.String({ minLength: 1, maxLength: 80 }), Type.Null()]),
  customStart: Type.Union([Type.String({ pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" }), Type.Null()]),
  customEnd: Type.Union([Type.String({ pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" }), Type.Null()]),
}, { additionalProperties: false });
export type RotationException = Static<typeof RotationExceptionSchema>;

export const RotationAdjustmentSchema = Type.Object({
  id: Type.String({ minLength: 1, maxLength: 200 }),
  operation: RosterOperationSchema,
  date: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
  shiftDays: Type.Integer({ minimum: -366, maximum: 366 }),
  createsGap: Type.Optional(Type.Boolean()),
}, { additionalProperties: false });

export const RotationGapCoverageSchema = Type.Object({
  id: Type.String({ minLength: 1, maxLength: 200 }),
  operation: RosterOperationSchema,
  startDate: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
  days: Type.Integer({ minimum: 1, maximum: 366 }),
  dayGroup: Type.String({ minLength: 1, maxLength: 40 }),
  nightGroup: Type.String({ minLength: 1, maxLength: 40 }),
}, { additionalProperties: false });

export const RotationCalendarStateSchema = Type.Object({
  operation: RosterOperationSchema,
  revision: Type.Integer({ minimum: 0 }),
  adjustments: Type.Array(RotationAdjustmentSchema, { maxItems: 5000 }),
  coverages: Type.Array(RotationGapCoverageSchema, { maxItems: 5000 }),
}, { additionalProperties: false });
export type RotationCalendarState = Static<typeof RotationCalendarStateSchema>;

export const SaveRotationCalendarStateSchema = Type.Object({
  revision: Type.Integer({ minimum: 0 }),
  adjustments: Type.Array(RotationAdjustmentSchema, { maxItems: 5000 }),
  coverages: Type.Array(RotationGapCoverageSchema, { maxItems: 5000 }),
}, { additionalProperties: false });
