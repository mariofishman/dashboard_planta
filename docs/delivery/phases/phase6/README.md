# Phase 6 — Conversations and messages

**Status:** In progress; the `alertas_fake` workstream is finishing Stage 2 user review before Stage 3

## Authority

- `business_rules.md` records the approved product rules.
- `implementation_plan.md` records the implementation and validation plan.
- [`alertas_fake_audit_and_redesign_v2.md`](./alertas_fake_audit_and_redesign_v2.md) owns the A02/A03/A05 workstream stages, preserved V1 audit summary, redesigned laboratory and architecture blueprint, and current Stage 2 status.
- [`alertas_fake_v2_edge_case_test_report_v2.md`](./alertas_fake_v2_edge_case_test_report_v2.md) is the current standalone-prototype test report. It distinguishes passing prototype behavior from requirements deferred to the connected `test_database` and Monitor stack.
- The [archived first test report](../../../../archive/docs/implementation/alertas_fake_v2_edge_case_test_report_v1.md) is historical pre-fix evidence only. Its failures and review gate are not current instructions.

## Existing baseline

- Persistent incident-generated conversations with exact active-participant-set reuse.
- Audited administrator participant addition and removal for active roster workers.
- Persistent, cursor-paginated messages with idempotent sends, edits, deletion tombstones, receipts, unread counts, and attachment validation.
- Server-enforced participant authorization, global roster access blocking, committed realtime updates, presence, typing, and reconnect recovery.
- Initial dashboard, chat-list, and chat-detail connections.
- Automated conversation and API tests for the implemented baseline.

This baseline is intentionally incomplete. Its chat UI has not been accepted, and its alert path still uses the historical Phase 4B simulator rather than the separate `test_database` boundary required by Roadmap V3.

## Remaining Phase 6 work

1. Finish the one-test-at-a-time Stage 2 user review of the implemented standalone V2 laboratory, resolve the pending A05 presentation decision, and record acceptance of its business rules and UI behavior.
2. Continue the independent `test_database` and chat-UI workstreams required by Roadmap V3.
3. In Stage 3, inspect the `test_database` handoff, guarded reset process, source mappings, and separate writer/read-only credentials.
4. In Stage 4, connect `alertas_fake` to `test_database` and Monitor's normal read-only polling path.
5. In Stage 5, validate A02, A03, and A05 through the complete source-to-dashboard-to-conversation path.
6. Remove Monitor's operational synthetic source tables and simulator adapter only after the replacement path passes.

## Completion boundary

Automated baseline checks do not complete Phase 6. Completion requires the Roadmap V3 acceptance gate: the separate source boundary, reset process, A02/A03/A05 lifecycle, routing, dashboard, conversations, and accepted chat UI must pass together.

Production EmusaSoft identity binding, production object storage, malware scanning, and deployment notification infrastructure remain Phase 10 integration concerns.
