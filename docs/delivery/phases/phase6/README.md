# Phase 6 — Conversations and messages

**Status:** In progress; baseline implementation prepared for parallel Phase 6 work

## Authority

- `business_rules.md` records the approved product rules.
- `implementation_plan.md` records the implementation and validation plan.
- `test_database.md` records the local MySQL runtime, deterministic reset process, safety boundary, and validation evidence.

## Existing baseline

- Persistent incident-generated conversations with exact active-participant-set reuse.
- Audited administrator participant addition and removal for active roster workers.
- Persistent, cursor-paginated messages with idempotent sends, edits, deletion tombstones, receipts, unread counts, and attachment validation.
- Server-enforced participant authorization, global roster access blocking, committed realtime updates, presence, typing, and reconnect recovery.
- Initial dashboard, chat-list, and chat-detail connections.
- Automated conversation and API tests for the implemented baseline.

This baseline is intentionally incomplete. Its chat UI has not been accepted, and its alert path still uses the historical Phase 4B simulator rather than the separate `test_database` boundary required by Roadmap V3.

## Remaining Phase 6 work

1. Build the source-compatible `test_database` and its deterministic reset process from protected `backup_database` input.
2. Audit and correct the chat UI against the approved prototypes, using stable mock data while source integration remains incomplete.
3. Audit A02, A03, and A05 and redesign `alertas_fake` in business language.
4. Merge those workstreams, connect `alertas_fake` to `test_database`, and validate the complete source-to-dashboard-to-conversation path.
5. Remove Monitor's operational synthetic source tables and simulator adapter only after the replacement path passes.

## Completion boundary

Automated baseline checks do not complete Phase 6. Completion requires the Roadmap V3 acceptance gate: the separate source boundary, reset process, A02/A03/A05 lifecycle, routing, dashboard, conversations, and accepted chat UI must pass together.

Production EmusaSoft identity binding, production object storage, malware scanning, and deployment notification infrastructure remain Phase 10 integration concerns.
