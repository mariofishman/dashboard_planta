# Phase 6 — Conversations and messages

**Status:** In progress; `test_database` and chat UI workstreams completed, integration pending

## Authority

- `business_rules.md` records the approved product rules.
- `implementation_plan.md` records the implementation and validation plan.
- `test_database.md` records the local MySQL runtime, deterministic reset process, safety boundary, and validation evidence.

## Existing baseline

- Persistent incident-generated conversations with exact active-participant-set reuse.
- Audited administrator participant addition and removal for active roster workers.
- Persistent, cursor-paginated messages with idempotent sends, edits, deletion tombstones, receipts, unread counts, and attachment validation.
- Server-enforced participant authorization, global roster access blocking, committed realtime updates, presence, typing, and reconnect recovery.
- Accepted chat-list and chat-detail corrections, including their approved element-review specifications and stable UI-only fixtures.
- Automated conversation and API tests for the implemented baseline.

The chat UI and local `test_database` workstreams are complete and validated within their separate scopes. Phase 6 remains incomplete because `alertas_fake`, the read-only source adapter, and the complete source-to-dashboard-to-conversation path have not yet been integrated and accepted together.

## Remaining Phase 6 work

1. Audit A02, A03, and A05 and redesign `alertas_fake` in business language.
2. Merge the completed workstreams, connect `alertas_fake` to `test_database`, and validate the complete source-to-dashboard-to-conversation path.
3. Remove Monitor's operational synthetic source tables and simulator adapter only after the replacement path passes.

## Completion boundary

Automated baseline checks do not complete Phase 6. Completion requires the Roadmap V3 acceptance gate: the separate source boundary, reset process, A02/A03/A05 lifecycle, routing, dashboard, conversations, and accepted chat UI must pass together.

Production EmusaSoft identity binding, production object storage, malware scanning, and deployment notification infrastructure remain Phase 10 integration concerns.
