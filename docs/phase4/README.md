# Phase 4 — Incident vertical slice

Status: functional gate accepted by the user on 2026-07-21. Dashboard design is not approved. Work is stopped pending a roadmap revision; Phase 5 has not started.

## What a beginner can test

Open `http://127.0.0.1:5173/`, sign in with any local test profile, and use the product dashboard. It contains local sample incidents for A02, A03, and A05. You can filter them, copy an OT identifier, and select `Ver detalles` to inspect the evidence and lifecycle history.

The data is intentionally local. Monitor is not connected to production EmusaSoft and cannot change EmusaSoft records.

The clean local seed contains five synthetic incident histories: three open incidents (A02, A03, and A05) and two resolved incidents (A02 and A03). They are created by `apps/api/src/server.ts`; their rule names and explanations come from `packages/incidents/src/index.ts`. These dashboard records are not copied from EmusaSoft or from the local ERP backup. The backup is used separately for detection-query validation.

## Deliverables and evidence

- [x] Rule evaluator distinguishes triggered, clear, and insufficient evidence for A02, A03, and A05.
- [x] Incident, immutable evidence, lifecycle transition, recurrence, and correlation storage.
- [x] Deduplication keeps one open occurrence per rule and condition key.
- [x] Complete healthy clear evidence resolves an incident automatically.
- [x] Insufficient or failed reads cannot resolve an incident.
- [x] Incident list, detail, and cursor-recovery APIs require server-side authorization.
- [x] Incident changes are stored in the same transaction and published only after commit.
- [x] Approved Material UI dashboard uses local sample incidents and opens evidence detail.
- [x] Global search, status, operation, and date-range filters update the visible dashboard.
- [x] Desktop and 390 px mobile layouts were browser-tested without page-level horizontal overflow.
- [x] Edge-case matrix records concurrency, recurrence, recovery, and later-phase boundaries.
- [x] Tablet filter controls use a compact single row with 40 px fields; the 919 px layout was measured in-browser without horizontal overflow.
- [x] Summary metrics and the date chart use the prototype's compact density instead of oversized status cards.
- [x] Date bars display exact totals, and the incident-list action exposes `Ver detalles` before horizontally scrollable context columns.
- [x] Date bars and summary metrics filter the incident table in place without forcing a scroll; incident detail presents context, lifecycle history, translated evidence, identifiers, and related alerts.

## Exit criterion

- [x] Synthetic cases create, update, and resolve an explainable incident from detection result through API, live change, dashboard, and evidence detail.

## Validation

- `npm test`: 26 tests pass (11 API/platform, 10 detection, 5 incident lifecycle/evaluator).
- `npm run typecheck`: all workspaces pass.
- `npm run build`: API and web build pass.
- `npm audit`: zero known vulnerabilities after installing the new workspace package.
- Browser: dashboard, detail drawer, evidence, desktop 1440×1000, tablet 919×863, and mobile 390×844 verified. Date filtering preserved the current scroll position and returned the expected single result.

## Deferred by roadmap

- Chats and routing: Phases 5–6.
- Administrative close-without-resolution workflow: Phase 7.
- Real EmusaSoft authentication, Aurora queries, production load/freshness proof, and deployment: Phase 10.
- The current web bundle is about 567 KB before gzip; code splitting is a production optimization, not a Phase 4 gate.
