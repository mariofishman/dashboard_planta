# EmusaSoft Integration Register

**Status:** Active Phase 10 dependency register

**Last reconciled:** 2026-07-23
**Evidence:** [`evidence/mcp_audit_2026-07-22.md`](evidence/mcp_audit_2026-07-22.md)

This is the only active status register for EmusaSoft and MCP work. The system boundary is defined in [`../../architecture/system_architecture.md`](../../architecture/system_architecture.md); the roadmap only sequences delivery.

## EmusaSoft product and engineering

| Item | Current status | Remaining acceptance evidence | Effect |
| --- | --- | --- | --- |
| ES2-01 — Detection queries | Answered; Phase 10 validation remains | Staging plans, indexes, duration, bounds, timeouts, concurrency, schedule, and measured load | Blocks production promotion of the affected rule only |
| ES2-02 — Read-only access | Architecture agreed; provisioning remains | Separate staging/production endpoints and no-write credentials, write-denial tests, schema scope, limits, time zone, soft-delete rules, and rotation | Blocks real staging/Aurora integration |
| ES2-03 — Authentication | Architecture agreed; contract validation remains | Claims, issuer, audience, signature validation, lifetime, disabled-user behavior, test identities, expiration and revocation tests | Blocks real authentication in Phase 10 |
| ES2-04 — Routing | Product rules defined; validation remains | Deterministic recipient, deduplication, replacement, effective-date, conflict, and fallback tests | Blocks production notifications |
| ES2-05 — Extrusion snapshots | Partially confirmed in MCP v5 | Field semantics, resin/unit mapping, natural key, immutability, corrections, and controlled lifecycle evidence | Keeps E02–E04 disabled outside fixtures |
| ES2-06 — Frontend links | Route discovery confirmed; contract validation remains | Environment base URLs, active/closed route choice, parameter values, authorization, compatibility policy, and browser tests | Identifiers remain the safe fallback |
| ES2-07 — UI library | Closed as superseded | None; Monitor uses Material UI and its own design tokens | No dependency |

The existing Aurora read replica is the Phase 10 observation boundary. Monitor does not require a separate replica-lag gate. A successful complete read may change incident state; failed, partial, invalid, truncated, or uncommitted cycles preserve the prior state.

## MCP implementation

| Item | Current status | Remaining work |
| --- | --- | --- |
| MCP2-01 — Catalog provenance | Mostly delivered | Populate or explicitly mark unavailable the GraphQL source revision, stable generator build, and drift summary |
| MCP2-02 — GraphQL validation | Open | Valid documents must pass and invalid fields must return schema errors without execution |
| MCP2-03 — Type metadata | Mostly delivered | Align `required` with GraphQL nullability, expose defaults, and clarify union coverage |
| MCP2-04 — Search aliases | Partially delivered | Add deterministic English and Spanish domain-search fixtures |
| MCP2-05 — Non-GraphQL resources | Decision pending | Publish a sanitized read-endpoint capability resource or identify the authoritative external contract |
| MCP2-06 — Examples | Structural examples delivered | Decide whether generated skeletons are sufficient or provide curated synthetic representative fixtures |

## Closure rule

An item closes only when its remaining evidence is linked here and its acceptance test passes in the stated environment. Chat statements, generated catalog metadata, and local-backup timings are not production acceptance evidence.
