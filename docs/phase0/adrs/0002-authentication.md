# ADR 0002: EmusaSoft authentication microservice and shared user token

**Status:** accepted with production contract pending ES-03  
**Date:** 2026-07-20

## Decision

Monitor uses the EmusaSoft authentication microservice. The same authenticated person presents the same authorization token to Monitor and EmusaSoft. Monitor does not create passwords or a separate operational identity.

The Monitor backend validates the token through the versioned EmusaSoft authentication contract, then calls the read-only `getUserContext` query to map the session to exactly one enabled, non-deleted `sysUserId`. The backend calculates plant and operational scope. The browser never chooses or expands its own scope.

Until ES-03 publishes issuer, audience, key-discovery or introspection details, the verifier is an adapter with a disabled production configuration. Tests use a fake verifier; production must fail closed when verification is unavailable. Tokens are redacted from logs and never stored in Monitor's relational database.

## Current evidence

The MCP catalog describes `getUserContext` as a zero-argument read query returning `id`, `role`, `roleSlug`, `sysUserId`, `sysUser`, and `requiredPingActive`. An authenticated minimal query succeeded and mapped the caller to one enabled, non-deleted `sysUserId`. Catalog validation remained unavailable. This supports the shared-token assumption but does not prove the production microservice verification contract.

## Browser session

Preferred web flow: Authorization Code with PKCE against the EmusaSoft authentication microservice, followed by a Secure, HttpOnly, SameSite session cookie for Monitor. If EmusaSoft instead requires direct bearer presentation, Monitor accepts it only over TLS and immediately validates it server-side. Service credentials, replica credentials, Redis credentials, and the MCP token are backend-only.
