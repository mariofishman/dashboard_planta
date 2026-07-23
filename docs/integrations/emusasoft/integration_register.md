# EmusaSoft Integration Register

**Status:** Active Phase 10 dependency register

**Last reconciled:** 2026-07-23
**Current evidence:** [`evidence/database_and_mcp_compatibility_audit_2026-07-23.md`](evidence/database_and_mcp_compatibility_audit_2026-07-23.md)

**Previous audit:** [`evidence/mcp_audit_2026-07-22.md`](evidence/mcp_audit_2026-07-22.md)

This is the only active status register for EmusaSoft and MCP work. The system boundary is defined in [`../../architecture/system_architecture.md`](../../architecture/system_architecture.md); the roadmap only sequences delivery.

## EmusaSoft product and engineering

| Item | Current status | Remaining acceptance evidence | Effect |
| --- | --- | --- | --- |
| ES2-01 — Detection queries | Answered; Phase 10 validation remains | Staging plans, indexes, duration, bounds, timeouts, concurrency, schedule, and measured load | Blocks production promotion of the affected rule only |
| ES2-02 — Read-only access | Architecture agreed; provisioning remains | Separate staging/production endpoints and no-write credentials, write-denial tests, schema scope, limits, time zone, soft-delete rules, and rotation | Blocks real staging/Aurora integration |
| ES2-03 — Authentication | Architecture agreed; contract validation remains | Claims, issuer, audience, signature validation, lifetime, disabled-user behavior, test identities, expiration and revocation tests | Blocks real authentication in Phase 10 |
| ES2-04 — Routing | Product rules defined; validation remains | Deterministic recipient, deduplication, replacement, effective-date, conflict, and fallback tests | Blocks production notifications |
| ES2-05 — Extrusion snapshots | Product rules clarified; local dump and MCP structure agree | Phase 10 verifies deployed capture at OT opening/closure, kg units, required container ID, one opening/closing snapshot per OT, recorded-addition mapping, correction behavior, and representative staging evidence | Keeps E02–E05 disabled outside fixtures until mapping and staging tests pass |
| ES2-06 — Frontend links | Product route examples confirmed for `https://erp-web.apps.emusa.dev` | Phase 10 verifies authorization, environment configuration, compatibility, opaque `searchParams` behavior, and browser tests; material reservation is a manual route while APS owns automatic reservation | Identifiers remain the safe fallback |
| ES2-07 — UI library | Closed as superseded | None; Monitor uses Material UI and its own design tokens | No dependency |

The existing Aurora read replica is the Phase 10 observation boundary. Monitor does not require a separate replica-lag gate. A successful complete read may change incident state; failed, partial, invalid, truncated, or uncommitted cycles preserve the prior state.

## MCP implementation

| Item | Current status | Remaining work |
| --- | --- | --- |
| MCP2-01 — Catalog provenance | Partially delivered | Replace empty GraphQL source revision and `dev` generator identifier; live structural drift reporting now passes |
| MCP2-02 — GraphQL validation | Closed | Valid and invalid acceptance documents behave correctly against schema version 5 |
| MCP2-03 — Type metadata | Acceptance samples pass | Required/nullability metadata and explicit zero-union count pass; defaults were not present in sampled types |
| MCP2-04 — Search aliases | Partially delivered | Fix Spanish article-serial ranking and reservation-domain ranking; preserve the corrected English searches |
| MCP2-05 — Non-GraphQL resources | Closed | `erp://integration/read-capability` publishes the agreed sanitized MCP capability contract |
| MCP2-06 — Examples | Closed as clarified | MCP explicitly defines examples as structural skeletons rather than representative ERP data |

## Closure rule

An item closes only when its remaining evidence is linked here and its acceptance test passes in the stated environment. Chat statements, generated catalog metadata, and local-backup timings are not production acceptance evidence.
