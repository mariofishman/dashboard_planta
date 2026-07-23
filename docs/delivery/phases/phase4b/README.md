# Phase 4B — Dynamic Local Source Validation

**Status:** Complete locally on 2026-07-23

## What was delivered

- A disposable PGlite source simulator for A02, A03, and A05 in isolated `monitor_sim_*` tables.
- A simulated clock, deterministic source actions, and one-shot failures: timeout, source error, partial result, and invalid schema.
- The existing bounded detection runner, evaluator, incident lifecycle, committed Socket.IO publication, and cursor-recovery API remain the only path to change an incident.
- An administrator-only local route at `/dev/scenarios`, with compact Spanish controls and visible source action, poll, incident, cursor, and delay status.
- A production lockout: the laboratory cannot be enabled outside development or test.

## Validation evidence

| Check | Evidence | Result |
|---|---|---|
| A02 lifecycle and recurrence | `apps/api/src/scenarios.test.ts` | Pass |
| A03 and A05 lifecycle | `apps/api/src/scenarios.test.ts` | Pass |
| All four failed-read outcomes preserve an open alert | `apps/api/src/scenarios.test.ts` | Pass |
| Source action does not write an incident | `apps/api/src/scenarios.test.ts` | Pass |
| No duplicate evidence on unchanged poll | `apps/api/src/scenarios.test.ts` | Pass |
| Committed change and cursor recovery | `apps/api/src/scenarios.test.ts`, `apps/api/src/server.test.ts` | Pass |
| Production lockout, authorization, disabled route, invalid rule | `apps/api/src/scenarios.test.ts` | Pass |
| Browser route and responsive reflow | `/dev/scenarios` at desktop, 768 px, and 390 px | Pass; no horizontal overflow |
| Type-check, full test suite, production build | `npm run typecheck`, `npm test`, `npm run build` | Pass |
| Production dependency audit | `npm audit --omit=dev` | Pass; 0 vulnerabilities |

## Exit checklist

- [x] A02 completes clean → trigger → open → persistent → failed-poll preservation → resolve → recurrence.
- [x] A03 completes the same lifecycle.
- [x] A05 completes the same lifecycle.
- [x] Source actions never mutate Monitor incidents directly.
- [x] Repeated healthy polls create no duplicate incident, evidence, transition, or change event.
- [x] Failed and incomplete polls preserve open incidents.
- [x] WebSocket delivery occurs after commit.
- [x] A disconnected client recovers missed committed changes by cursor.
- [x] Scenarios reset deterministically.
- [x] Source action, poll status, incident state, cursor, and detection delay are visible.
- [x] Scenario APIs and UI are unavailable outside local development/test.
- [x] Automated tests, type-checking, build, audit, and responsive browser checks pass.
- [x] Phase 4B evidence is recorded here.

## Local review route

Run the local application, sign in as **Gerencia de planta**, then open `/dev/scenarios`. This development-only screen changes synthetic source records. It does not connect to, read from, or write to EmusaSoft.

Phase 5 has not started.
