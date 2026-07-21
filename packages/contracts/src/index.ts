import { Static, Type } from "@sinclair/typebox";

export const MonitorScopeSchema = Type.Union([
  Type.Literal("monitor:read"),
  Type.Literal("monitor:admin"),
  Type.Literal("chat:write"),
  Type.Literal("roster:manage"),
]);
export type MonitorScope = Static<typeof MonitorScopeSchema>;

export const PrincipalSchema = Type.Object({
  sysUserId: Type.Integer({ minimum: 1 }),
  displayName: Type.String({ minLength: 1 }),
  role: Type.String({ minLength: 1 }),
  plantIds: Type.Array(Type.Integer({ minimum: 1 }), { minItems: 1, uniqueItems: true }),
  scopes: Type.Array(MonitorScopeSchema, { uniqueItems: true }),
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
    Type.Literal("plant-manager"),
    Type.Literal("shift-supervisor"),
    Type.Literal("machine-operator"),
  ]),
}, { additionalProperties: false });
export type MockLoginRequest = Static<typeof MockLoginRequestSchema>;

export const SocketSessionReadySchema = Type.Object({
  cursor: Type.Integer({ minimum: 0 }),
  principal: PrincipalSchema,
  features: FeatureFlagsSchema,
}, { additionalProperties: false });
export type SocketSessionReady = Static<typeof SocketSessionReadySchema>;
