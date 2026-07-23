# Phase 3 — Polling, freshness, and recovery

**Status:** completion snapshot; local exit gate passed

Phase 3 builds the safe data-reading engine. It does not implement incidents or the approved product dashboard. The visible `/` screen is explicitly a local diagnostic tool.

## Tracked deliverables

- [x] Versioned detection-query registry populated from the 21 Phase 1 rule contracts. E05 was approved later and remains pending.
- [x] Croner scheduler with global concurrency limit, per-query overlap protection, timeouts, retry, and exponential backoff.
- [x] Primary-key cursor pagination with 1,000-row pages and 10,000-row complete-cycle ceiling.
- [x] Read-only local backup adapters for A02 work-order/material-flow data and A05 serial/weighing/warehouse data.
- [x] Fixture adapters covering the remaining work-order, material, flow, serial, weighing, pause, user, and statistical contracts without inventing production behavior.
- [x] Replaceable freshness-provider contract, fixed-snapshot local provider, and controllable fake provider.
- [x] Guards for freshness, required fields, schema version, duplicates, source-revision consistency, pagination completeness, and result bounds.
- [x] Monitor-owned poll-cycle and condition-state tables with versioned migration.
- [x] Failed-cycle diagnostics stored without a queue, broker, or incident resolution.
- [x] Healthy-cycle-only state reconciliation.
- [x] Full post-downtime evaluation through the scheduler recovery entry point.
- [x] Protected-backup schema, keyset-pagination, row-bound, stable-key, and query-plan regression tests for A02 and A05.
- [x] Authenticated source-diagnostics API and clearly labeled Material UI local diagnostic screen.
- [x] Replaceable source-observation provider retained for Phase 10; the approved architecture requires no separate replica-lag gate.

## Exit criteria

- [x] Timeout cannot clear an existing condition.
- [x] Partial or truncated results cannot clear an existing condition.
- [x] Invalid or drifted schemas cannot clear an existing condition.
- [x] Stale or unknown freshness cannot clear an existing condition.
- [x] Source-revision changes and duplicate keys invalidate the cycle.
- [x] Downtime preserves condition state.
- [x] The next complete, valid, fresh cycle recovers the correct current state.

## Safety choices

- Poll-cycle failures store a short internal error code, not source rows or credentials.
- Only a healthy cycle is marked both complete and a full evaluation; the database enforces this invariant.
- Condition state belongs to Monitor. No code connects to or writes to EmusaSoft.
- The local backup adapter opens the derived SQLite subset read-only.
- Local fixtures are marked as fixtures and the API reports `productionConnected: false`.
- The diagnostic screen says explicitly that it is not the product dashboard.

## Validation

Run from the repository root:

```sh
npm run db:migrate
npm run typecheck
npm test
npm run build
```

Local backup expectations refreshed from the protected 2026-07-23 staging snapshot:

- A02: 1,249 unique rows in 2 bounded pages using `a02_candidate_idx`.
- A05: 838 unique rows in 1 bounded page using `a05_candidate_idx`.

These local plans and timings do not predict or approve Aurora load. Current-schema, replica, and load validation remains Phase 10 work.

**Validation record — 2026-07-21:** migration passed; all six workspaces type-checked; 9 API/platform tests and 10 polling/source-observation tests passed; the production build passed; the dependency audit reported 0 vulnerabilities. Browser verification confirmed the authenticated diagnostic screen reported all 21 then-implemented fixture rules healthy, live updates connected, EmusaSoft not connected, and no horizontal overflow at 390 pixels.

## External dependencies

Current Phase 10 dependencies are maintained only in `docs/integrations/emusasoft/integration_register.md`.
