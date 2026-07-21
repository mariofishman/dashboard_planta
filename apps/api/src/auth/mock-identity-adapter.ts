import type { Principal } from "@monitor/contracts";
import type { IdentityAdapter, MockLoginIssuer } from "./identity-adapter.js";

const identities: Record<string, Principal> = {
  "plant-manager": {
    sysUserId: 9001,
    displayName: "Gerencia de planta",
    role: "FACTORY_MANAGER",
    plantIds: [1],
    scopes: ["monitor:read", "monitor:admin", "chat:write", "roster:manage"],
  },
  "shift-supervisor": {
    sysUserId: 9002,
    displayName: "Supervisión de turno",
    role: "SHIFT_SUPERVISOR",
    plantIds: [1],
    scopes: ["monitor:read", "chat:write"],
  },
  "machine-operator": {
    sysUserId: 9003,
    displayName: "Operación de máquina",
    role: "MACHINE_OPERATOR",
    plantIds: [1],
    scopes: ["monitor:read", "chat:write"],
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
