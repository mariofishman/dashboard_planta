# Phase 4B — Dynamic Local Source Validation Implementation Plan

**Status:** Completed locally on 2026-07-23  
**Roadmap version:** 2.1  
**Estimated effort:** 3–5 working days  
**Scope:** Phase 4B only. Phase 5 must not start.

## 1. Outcome

Prove that changes in a disposable local source—not seeded incident rows—travel through the existing scheduler, detection runner, rule evaluator, incident lifecycle, committed WebSocket event, recovery API, and Dashboard V2.

The proof covers A02, A03, and A05.

## 2. Binding boundaries

- Use mock identities, synthetic data, PGlite, and the existing TypeScript stack.
- Never modify or connect to EmusaSoft.
- Never mutate the protected local ERP backup.
- Scenario actions may write only to disposable simulator tables.
- Scenario endpoints and UI must never insert, update, resolve, reopen, or delete Monitor incidents directly.
- Only a complete healthy poll may open, update, or resolve an incident.
- Failed, partial, invalid, truncated, or timed-out polls preserve the last incident state.
- The laboratory must be impossible to enable in staging or production.
- Keep Dashboard V2 unchanged except for a small development-only navigation entry if needed. Prefer the direct development route `/dev/scenarios`.
- The scenario UI is a test instrument, not a fifth product screen. It uses the shared Material UI theme and compact design tokens.

## 3. Routine technical decisions

These are safe, reversible implementation choices and require no user approval:

1. Store simulator state in the same disposable local PGlite runtime, but in separate `monitor_sim_*` tables.
2. Model source concepts rather than storing prewritten incident evidence:
   - A02 material movement and receipt;
   - A03 work-order activation and first consumption;
   - A05 reel declaration, weighing, and movement.
3. Add `simulator` as a development adapter kind.
4. Use a simulator-owned clock so threshold tests do not wait 15 or 30 real minutes.
5. Run A02, A03, and A05 on a short local interval through the existing scheduler.
6. Provide an authenticated `run poll now` development action for deterministic tests and manual review. It invokes the normal runner; it never invokes the incident service directly.
7. Use one-shot fault injection for the next source read.
8. When the laboratory is enabled, replace the A02/A03/A05 fixture adapters and disable Phase 4 seeded incidents. Other local fixture rules remain unchanged.

## 4. Source model and scenarios

### 4.1 Database migration

Add `packages/database/migrations/0003_phase4b_simulator.sql` with:

- `monitor_sim_clock`
  - current simulated time;
  - monotonically increasing source revision.
- `monitor_sim_scenario`
  - rule code;
  - scenario state;
  - last source action;
  - last source-action timestamp;
  - pending one-shot fault;
  - reset timestamp.
- `monitor_sim_material_flow` for A02.
- `monitor_sim_work_order` and `monitor_sim_consumption` for A03.
- `monitor_sim_reel`, `monitor_sim_weighing`, and `monitor_sim_location` for A05.

Constraints must keep source keys unique and source times consistent. Simulator tables contain synthetic operational state only.

Update the detection-query adapter-kind constraint to permit `simulator`.

### 4.2 Scenario actions

Each rule exposes the same small action vocabulary:

| Action | A02 | A03 | A05 |
|---|---|---|---|
| Reset clean | No overdue unreceived transit | No overdue active OT without consumption | Reel is weighed and moved |
| Trigger problem | Start reservation transit without receipt | Activate OT without consumption | Declare unweighed reel at machine |
| Advance time | Cross 30-minute threshold | Reach 15-minute threshold | Cross 30-minute threshold |
| Correct source | Record receipt | Record first consumption | Record weighing and movement |
| Recur | Start a new unreceived transit after resolution | Remove consumption on a new occurrence after resolution | Declare a new unhandled occurrence after resolution |

`Reset clean` changes only simulated source state. The next healthy poll performs any required incident resolution. Existing incident history is preserved.

### 4.3 Fault actions

Support one-shot outcomes for the next poll:

- timeout;
- source error;
- partial result;
- invalid schema.

At least one failed or incomplete outcome must be exercised manually. Automated tests cover all four without duplicating the Phase 3 test matrix.

## 5. Work packages

### WP1 — Configuration and production lockout

Files:

- `apps/api/src/config.ts`
- `.env.monitor.example`
- API configuration tests

Implement:

- `MONITOR_ENABLE_SCENARIO_LAB`;
- enabled only in local development and tests;
- startup failure if explicitly enabled in staging or production;
- no scenario routes, adapters, scheduler jobs, or UI capability when disabled.

Verification:

- development can enable it;
- production rejects it;
- disabled mode preserves the completed Phase 4 behavior.

### WP2 — Simulator persistence and repository

Files:

- `packages/database/migrations/0003_phase4b_simulator.sql`
- `packages/database/src/index.ts`
- new `packages/detection/src/simulator/` modules

Implement:

- migration and resettable initial state;
- transactional scenario actions;
- simulated clock advancement;
- monotonically increasing source revision;
- one-shot fault storage and consumption;
- read-only status projections for the UI.

Verification:

- database constraints;
- deterministic resets;
- source revision changes exactly once per source action;
- no simulator repository method references incident tables.

### WP3 — A02, A03, and A05 source adapters

Files:

- new simulator adapters under `packages/detection/src/simulator/`
- `packages/detection/src/types.ts`
- registry wiring

Implement:

- adapters derive existing versioned evidence fields from simulator domain tables;
- bounded keyset pagination and current query limits remain active;
- stable natural keys remain:
  - A02 `materialFlowDetailId`;
  - A03 `workOrderId`;
  - A05 `articleSerialId`;
- adapter rows include the context needed for plant, OT, machine, operation, shift, and responsible area;
- source revision and schema version satisfy the existing runner contract;
- fault injection passes through the runner's ordinary failure paths.

Verification:

- threshold boundaries;
- triggered, clear, and insufficient evidence;
- pagination, duplicate-key, schema, revision, and completeness guards remain effective.

### WP4 — Scheduler-to-incident integration

Files:

- `apps/api/src/server.ts`
- detection registry/context contracts
- incident integration tests

Implement:

- replace A02/A03/A05 fixture sources with simulator sources when the lab is enabled;
- do not seed Phase 4 incidents in laboratory mode;
- connect healthy simulator cycles to `IncidentService.reconcileHealthyCycle`;
- preserve post-commit WebSocket publication;
- expose a normal-runner `poll now` hook for development tests;
- keep the short automatic scheduler interval active for manual validation.

Verification:

- no incident exists before a source problem;
- source action alone creates no incident;
- the next healthy poll creates or resolves it;
- repeat polls do not duplicate incidents, evidence, transitions, or client events when nothing meaningful changed.

### WP5 — Development-only API

Files:

- new `apps/api/src/routes/scenarios.ts`
- API schemas/contracts
- API authorization tests

Routes, registered only when enabled:

- `GET /api/dev/scenarios`
- `POST /api/dev/scenarios/:code/reset`
- `POST /api/dev/scenarios/:code/trigger`
- `POST /api/dev/scenarios/:code/correct`
- `POST /api/dev/scenarios/:code/advance-time`
- `POST /api/dev/scenarios/:code/fail-next-poll`
- `POST /api/dev/scenarios/:code/poll`

All mutation routes require `monitor:admin`. Inputs use an allowlist; arbitrary SQL, JSON evidence, incident IDs, and table names are rejected.

The status response includes:

- synthetic source state;
- simulated time;
- last source action and time;
- latest poll status and finish time;
- current incident lifecycle and occurrence;
- last committed change cursor;
- measured source-action-to-detection delay.

Verification:

- unauthenticated request: `401`;
- non-administrator: `403`;
- disabled laboratory: `404`;
- invalid rule/action: `400` or `404`;
- action endpoint changes source only;
- poll endpoint traverses the ordinary runner.

### WP6 — Minimal scenario laboratory UI

Files:

- development-only route/components in `apps/web/src/`
- `apps/web/src/api.ts`
- shared `packages/design-system/`

Route:

- `/dev/scenarios`

Presentation:

- explicit `Laboratorio local` and `No disponible en producción` labeling;
- one compact section each for A02, A03, and A05;
- buttons for reset, trigger, advance time, correct, fail next poll, and poll now;
- source state, latest poll, incident state, occurrence, cursor, and detection delay;
- link back to Dashboard;
- loading, empty, forbidden, unavailable, running, success, and failure states.

UI constraints:

- use the shared Material UI theme and semantic tokens;
- use compact 28 px visible controls with accessible hit targets;
- no dashboard KPI cards, decorative redesign, nested cards, or new private scale;
- keyboard operation, visible focus, Spanish copy, reduced motion, and narrow-screen reflow;
- the route must not appear in production navigation or production builds as an enabled capability.

### WP7 — Automated lifecycle proof

Add deterministic tests for each of A02, A03, and A05:

1. reset to clean;
2. healthy poll produces no open incident;
3. trigger source problem;
4. verify no incident before polling;
5. healthy poll opens occurrence 1;
6. repeat healthy poll creates no duplicate;
7. correct source;
8. inject failed or incomplete poll and verify incident remains open;
9. next healthy poll resolves occurrence 1;
10. recur from source;
11. healthy poll creates occurrence 2 while occurrence 1 remains in history.

Additional tests:

- emitted live event exists only after commit;
- cursor recovery returns the missed committed changes in order;
- concurrent poll protection still works;
- reset is deterministic;
- production lockout cannot be bypassed;
- scenario endpoints cannot accept incident mutations;
- existing Phase 0–4 tests remain green.

### WP8 — Manual browser validation

Use the manager mock identity and two browser sessions:

1. Open Dashboard V2 in session A.
2. Open `/dev/scenarios` in session B.
3. Reset A02 and poll; confirm no open A02.
4. Trigger A02, advance time, and wait for or run the next poll.
5. Confirm one A02 appears live in Dashboard V2.
6. Poll repeatedly; confirm no duplicate.
7. Correct the source and inject a failed poll; confirm A02 remains open.
8. Run a healthy poll; confirm A02 resolves live.
9. Trigger recurrence; confirm a new occurrence with prior history preserved.
10. Disconnect Dashboard V2, perform a source change and healthy poll, reconnect, and confirm cursor recovery.
11. Repeat the core open/resolution path for A03 and A05.
12. Verify desktop, tablet, and mobile laboratory layouts without page overflow.

Record:

- action time;
- poll completion time;
- incident transition time;
- measured detection delay;
- event cursor;
- browser sizes;
- console/network errors.

## 6. Deliverable traceability

| Roadmap deliverable | Work package | Evidence |
|---|---|---|
| Disposable mutable source simulator | WP2 | Migration and repository tests |
| A02/A03/A05 scenarios | WP3–WP4 | Adapter and lifecycle tests |
| Development/test-only scenario UI | WP1, WP5, WP6 | Lockout, authorization, and browser tests |
| Trigger, correct, reset, and advance time | WP2, WP5, WP6 | API and browser scenarios |
| Visible source action, poll, incident, and delay | WP5–WP6 | API contract and browser evidence |
| Deterministic automated lifecycle tests | WP7 | Test report |
| Live delivery and cursor recovery | WP7–WP8 | WebSocket/API and two-session browser evidence |

## 7. Validation commands

Run from the repository root:

```sh
npm run db:migrate
npm run typecheck
npm test
npm run build
npm audit
```

Also verify:

- no EmusaSoft driver, credential, connection, or write path was introduced;
- the protected backup remains unchanged;
- scenario routes return `404` when disabled;
- production startup rejects scenario enablement;
- browser console contains no application errors;
- source-to-screen delay is measured rather than estimated.

## 8. Exit gate checklist

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
- [x] Phase 4B evidence is recorded in `docs/delivery/phases/phase4b/README.md`.

## 9. Approval and dependency status

No business decision, production credential, EmusaSoft access, paid commitment, or irreversible choice is required for Phase 4B.

External EmusaSoft items do not block this phase. They remain Phase 10 integration dependencies.

The phase ends when the checklist passes. Do not begin Phase 5 until the Phase 4B result has been reported and the roadmap prerequisite is satisfied.
