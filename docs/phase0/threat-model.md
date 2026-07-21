# Initial threat model

| Threat | Control | Phase 0 evidence |
|---|---|---|
| Monitor writes to EmusaSoft | SELECT-only account, allowlisted single statements, no mutation API, write-denial smoke test | `contracts/read-only-access.md` |
| Service or database secret reaches browser | Backend-only environment/secret store, build scan, response/event allowlists | `operations.md`, incident schema |
| Stolen or confused user token | Emusa auth verification, issuer/audience or introspection contract, short session, revocation test, TLS | ADR 0002; ES-03 pending |
| Browser expands its own scope | Server derives `sysUserId`, plant, conversation, and event rooms | ADR 0002 and WebSocket contract |
| Missed WebSocket event hides an incident | Commit before publish, monotonic cursor, REST gap recovery | ADR 0004 and proof tests |
| Failed or stale source resolves an incident | Complete healthy cycle plus production freshness gate | detection and freshness contracts |
| SQL injection or unbounded load | Versioned files, prepared values, timeout, result limit, concurrency cap | query contracts and load policy |
| Unsupported or fabricated EmusaSoft navigation | No external navigation action; identifiers and evidence stay in Monitor | `contracts/deep-links.json` |
| Sensitive backup enters Git/CI | ignored `local-data/database/`, derived database ignored, sanitized metrics only | `.gitignore`, validation script |
| Redis loss corrupts truth | PostgreSQL is canonical; Redis contains only ephemeral fan-out/presence | ADR 0004 |
| Message/attachment abuse | authorization, rate limits, content sanitization, malware scanning, size/type policy | deferred product policy; blocks relevant later phase |

## Browser credential proof

The Phase 0 proof's API and WebSocket envelopes contain only contract fields and no environment values. Automated tests scan serialized responses and events for secret-shaped field names. The production build must additionally inspect generated browser assets for forbidden environment-variable names before Phase 2 can pass.
