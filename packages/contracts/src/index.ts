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
