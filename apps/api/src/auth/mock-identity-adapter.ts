import type { Principal } from "@monitor/contracts";
import type { IdentityAdapter, MockLoginIssuer } from "./identity-adapter.js";

const identities: Record<string, Principal> = {
  "monitor-admin": {
    sysUserId: 9000,
    displayName: "Administración de Monitor",
    role: "MONITOR_ADMIN",
    plantIds: [1],
    scopes: ["monitor:read", "monitor:admin", "chat:write"],
    operationAuthorizations: [],
  },
  "plant-manager": {
    sysUserId: 9001,
    displayName: "Gerencia de planta",
    role: "FACTORY_MANAGER",
    plantIds: [1],
    scopes: ["monitor:read", "monitor:admin", "chat:write"],
    operationAuthorizations: [],
  },
  "shift-supervisor": {
    sysUserId: 9002,
    displayName: "Supervisión de turno",
    role: "SHIFT_SUPERVISOR",
    plantIds: [1],
    scopes: ["monitor:read", "chat:write"],
    operationAuthorizations: [],
  },
  "machine-operator": {
    sysUserId: 9003,
    displayName: "Operación de máquina",
    role: "MACHINE_OPERATOR",
    plantIds: [1],
    scopes: ["monitor:read", "chat:write"],
    operationAuthorizations: [],
  },
  "operation-scheduler": {
    sysUserId: 9004,
    displayName: "Programación de Impresión",
    role: "OPERATION_SCHEDULER",
    plantIds: [1],
    scopes: ["monitor:read"],
    operationAuthorizations: [
      { operationId: 10, operationName: "Impresión", permissions: ["roster:rotation:manage"] },
    ],
  },
};

export class MockIdentityAdapter implements IdentityAdapter, MockLoginIssuer {
  readonly kind = "mock" as const;

  async issueToken(identityId: string): Promise<string | null> {
    return identities[identityId] ? `mock:${identityId}` : null;
  }

  async verifyToken(token: string): Promise<Principal | null> {
    if (!token.startsWith("mock:")) return null;
    const principal = identities[token.slice(5)];
    return principal ? structuredClone(principal) : null;
  }

  listIdentities() {
    return Object.entries(identities).map(([identityId, principal]) => ({ identityId, principal: structuredClone(principal) }));
  }
}
