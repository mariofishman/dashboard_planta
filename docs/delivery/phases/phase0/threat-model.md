# Initial threat model

| Threat | Control | Phase 0 evidence |
|---|---|---|
| Monitor writes to EmusaSoft | SELECT-only account, allowlisted single statements, no mutation API, write-denial smoke test | `docs/architecture/contracts/read-only-access.md` |
| Service or database secret reaches browser | Backend-only environment/secret store, build scan, response/event allowlists | `operations.md`, incident schema |
| Stolen or confused user token | Emusa auth verification, issuer/audience or introspection contract, short session, revocation test, TLS | ADR 0002; ES2-03 pending |
| Browser expands its own scope | Server derives `sysUserId`, plant, conversation, and event rooms | ADR 0002 and WebSocket contract |
| Missed WebSocket event hides an incident | Commit before publish, monotonic cursor, REST gap recovery | ADR 0004 and proof tests |
| Failed, partial, invalid, truncated, or uncommitted source cycle resolves an incident | Only a successful complete committed cycle may resolve | detection contracts and system architecture |
| SQL injection or unbounded load | Versioned files, prepared values, timeout, result limit, concurrency cap | query contracts and load policy |
| Unsupported or fabricated EmusaSoft navigation | Route adapter remains disabled until Phase 10 validation; identifiers remain the fallback | `config/detection/contracts/deep-links.json` |
| Sensitive backup enters Git/CI | ignored `local-data/database/`, derived database ignored, sanitized metrics only | `.gitignore`, validation script |
| Redis loss corrupts truth | PostgreSQL is canonical; Redis contains only ephemeral fan-out/presence | ADR 0004 |
| Message/attachment abuse | authorization, rate limits, content sanitization, malware scanning, size/type policy | deferred product policy; blocks relevant later phase |

## Browser credential proof

The API and WebSocket envelopes contain only contract fields and no environment values. Current API tests cover protected access and serialized event recovery. Production builds must also inspect generated browser assets for forbidden environment-variable names.
