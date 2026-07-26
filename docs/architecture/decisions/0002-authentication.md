# ADR 0002: EmusaSoft authentication microservice and shared user token

**Status:** accepted with production contract pending ES2-03
**Date:** 2026-07-20

## Decision

Monitor uses the EmusaSoft authentication microservice. The same authenticated person presents the same authorization token to Monitor and EmusaSoft. Monitor does not create passwords or a separate operational identity.

The Monitor backend validates the token through the versioned EmusaSoft authentication contract, then calls the read-only `getUserContext` query to map the session to exactly one enabled, non-deleted `sysUserId`. EmusaSoft authentication is the source of global Monitor permissions and operation-scoped scheduling permissions. The browser never chooses or expands its own scope.

Monitor normalizes the current grants into its own database for server-side enforcement and audit. These records retain the external identity, permission, operation, source revision, synchronization time, and effective dates; they are a synchronized authorization snapshot, not a second permission administration system. Monitor exposes no UI or API that can grant a user more access than EmusaSoft authentication provides.

Roster authorization is fixed as follows:

- only a principal with the global `monitor:admin` permission may open or change `Responsables`;
- one or more principals may hold `roster:rotation:manage` for a specific operation;
- an operation-scoped scheduler may change `Rotación` only for operations explicitly included in their current grants; and
- a Monitor administrator may manage every operation's rotation.

The API enforces these rules on every read or write route that exposes protected roster data. Hiding a tab or disabling a control in the browser is only a presentation consequence, not the security boundary.

Until ES2-03 publishes issuer, audience, key-discovery or introspection details, the verifier is an adapter with a disabled production configuration. Tests use a fake verifier and synthetic grants; production must fail closed when verification or permission synchronization is unavailable. Tokens are redacted from logs and never stored in Monitor's relational database.

## Current evidence

The MCP catalog describes `getUserContext` as a zero-argument read query returning `id`, `role`, `roleSlug`, `sysUserId`, `sysUser`, and `requiredPingActive`. An authenticated minimal query succeeded and mapped the caller to one enabled, non-deleted `sysUserId`. Catalog validation remained unavailable. This supports the shared-token assumption but does not prove the production microservice verification contract.

## Browser session

Preferred web flow: Authorization Code with PKCE against the EmusaSoft authentication microservice, followed by a Secure, HttpOnly, SameSite session cookie for Monitor. If EmusaSoft instead requires direct bearer presentation, Monitor accepts it only over TLS and immediately validates it server-side. Service credentials, replica credentials, Redis credentials, and the MCP token are backend-only.
