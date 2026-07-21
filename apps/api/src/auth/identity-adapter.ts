import type { Principal } from "@monitor/contracts";

export interface IdentityAdapter {
  readonly kind: "mock" | "emusionsoft";
  verifyToken(token: string): Promise<Principal | null>;
}

export interface MockLoginIssuer {
  issueToken(identityId: string): Promise<string | null>;
  listIdentities(): Array<{ identityId: string; principal: Principal }>;
}

export function supportsMockLogin(adapter: IdentityAdapter): adapter is IdentityAdapter & MockLoginIssuer {
  return adapter.kind === "mock" && "issueToken" in adapter && "listIdentities" in adapter;
}
