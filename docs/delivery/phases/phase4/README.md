# Phase 4 — Incident vertical slice

**Status:** completion snapshot; functional gate accepted on 2026-07-21 and Dashboard V2 accepted as a good first version on 2026-07-22

## What a beginner can test

Open `http://127.0.0.1:5173/`, sign in with any local test profile, and use the product dashboard. It contains local sample incidents for A02, A03, and A05. You can group the chart, combine lifecycle filters, search, choose a preset or custom date range, filter by open age, expand or collapse the incident results, and open an incident by selecting its complete row or card.

The incident detail presents compact operational data, meaningful lifecycle changes, and a concise evidence-grounded explanation. Work-order identifiers remain the safe fallback until Phase 10 validates the MCP-discovered route templates, environment base URL, authorization, compatibility, and browser behavior. Unexplained related-alert suggestions and repeated unchanged polling observations are not displayed.

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
- [x] Semantically unchanged healthy polls create no additional evidence row or incident-change event.
- [x] Approved Material UI Dashboard V2 uses local sample incidents and opens authorized evidence detail from the complete incident target.
- [x] Search, date, operation, lifecycle, chart segment, and open-age filters update both the chart and incident results.
- [x] Lifecycle filters are additive; each active lifecycle clears independently, and no selected lifecycle means all states.
- [x] The primary chart groups by date, worker, work order, machine, operation, shift, or error type without separate concentration or frequent-error cards.
- [x] Chart filtering preserves category positions and scale, reserves headroom above the tallest bar, and clears a selected segment on a second selection.
- [x] Custom date selection follows the start, end, restart cycle and provides an explicit compact clear action.
- [x] Incident results are collapsible, use relative time, and render as a compact four-column table on desktop/tablet and complete-target cards on mobile.
- [x] Desktop, tablet, and mobile layouts were browser-tested without page-level or incident-table horizontal overflow.
- [x] Edge-case matrix records concurrency, recurrence, recovery, and later-phase boundaries.
- [x] Desktop and tablet controls use the binding compact scale: 11 px routine type, 28 px visible height, 6 px radius, and normally 8 px horizontal padding.
- [x] Desktop search expands left over covered controls and exposes `Filtros avanzados`; Enter, Escape, or blur restores the compact row.
- [x] Mobile starts without a filter toolbar in document flow; top overscroll reveals one compact quick-filter row, while the persistent header action opens `Filtros avanzados`.
- [x] Dashboard V2 removes repeated KPI cards, the ambiguous context column, dedicated copy and detail icons, separate frequent-error/concentration panels, and unsupported related-alert presentation.
- [x] Incident detail presents operational data, meaningful lifecycle history, and a concise catalog-and-evidence-grounded explanation without inventing a named person.

## Exit criterion

- [x] Synthetic cases create, update, and resolve an explainable incident from detection result through API, live change, dashboard, and evidence detail.

## Validation

- `npm test` on 2026-07-22: 27 tests pass (11 API/platform, 3 design-system token/density contracts, 8 detection/polling, 5 incident lifecycle/evaluator); the protected local-backup adapter suite remains intentionally skipped without its external fixture.
- `npm run typecheck` on 2026-07-22: all workspaces pass.
- `npm run build` on 2026-07-22: API and web build pass; the web bundle is 639.25 KB before gzip and retains the non-blocking large-chunk warning.
- `npm audit` on 2026-07-22: zero known vulnerabilities.
- Browser: dashboard, incident detail, desktop 1440×1000, tablet 919×863, and mobile widths from 351–414 px verified. The chart, additive lifecycle filters, open-age filters, custom range picker, expandable search, advanced filters, collapsible results, and mobile quick-filter reveal were exercised without horizontal overflow.

## Deferred by roadmap

- Chats and routing: Phases 5–6.
- Administrative close-without-resolution workflow: Phase 7.
- Real EmusaSoft authentication, Aurora queries, production load and source-observation proof, and deployment: Phase 10.
- Production polling-diagnostic retention and contextual-explanation mechanism: roadmap Section 8.
- The current web bundle is 639.25 KB before gzip; code splitting is a production optimization, not a Phase 4 gate.
