# Phase 7 — Deterministic closure, deadline, and balance rules

**Role:** Phase 7 status, sequencing, and exit authority

**Status:** Active; standalone laboratory consolidation in progress

**Project sequencing authority:** [`../../../roadmap.md`](../../../roadmap.md)

## Purpose and preserved baseline

Integrate the reviewed A01, B01, B02, B03, D01, D02, and D03 standalone rule preparations onto the published Phase 6 baseline, then implement and validate each rule through the connected source boundary in a later stage.

Phase 6 behavior, architecture, tests, and accepted evidence remain the authoritative baseline. Reconciliation must preserve them unless a later explicit product decision requires a functional change. The clarified Phase 7 business rules and their authoritative documentation take precedence over stale laboratory test assumptions. Standalone evidence must never be described as connected `test_database`, polling, incident, routing, Dashboard, Chat, browser, staging, production, or Phase 10 evidence.

D04 is retired into consolidated D01. Historical D04 incidents and current compatibility behavior remain untouched during standalone consolidation; connected cleanup is deferred.

## Stage plan

| Stage | Status | Work | Exit condition |
| --- | --- | --- | --- |
| 1 — Consolidate reviewed standalone laboratories | **In progress** | Merge one alert branch at a time in dependency order: D01, D02, D03, A01, B01, B02, B03. Preserve reviewed business rules while adapting stale implementation assumptions to the completed Phase 6 baseline. | All seven alert preparations coexist; focused specifications, contracts, tests, typecheck, build, and aggregate review pass with exclusions reported accurately. |
| 2 — Connect Phase 7 source and lifecycle behavior | Pending | Implement Laboratory actions, `test_database` mappings, bounded read-only queries, polling, occurrence lifecycle, routing, Dashboard, and conversations for each rule. | Every rule passes its connected automated lifecycle and source-boundary gate. |
| 3 — Complete Phase 7 acceptance | Pending | Run aggregate browser, recurrence, correlation, recovery, routing, Dashboard, and Chat evidence. | The roadmap Phase 7 exit gate passes and the product manager accepts the result. |

## Stage 1 integration protocol

- Use one `--no-ff` merge commit for each alert branch so its reviewed ancestry remains traceable.
- Before each alert, inspect its functional conflicts and validation plan and obtain one product-manager approval.
- Resolve obvious non-functional conflicts without another approval. Stop when a conflict could change functionality, approved business semantics, evidence meaning, or validation scope.
- Validate before committing. A test incompatible with the completed Phase 6 architecture may be adapted or retired, but its failure must not erase or weaken an approved business rule.
- Do not push, merge to `main`, or claim connected Phase 7 completion from an individual standalone checkpoint.

## Completed Stage 1 checkpoints

- **D01:** consolidated OT-level longitudinal invariant integrated; D04 retired from active catalog, executable contracts, fixtures, publication, and Phase 7 inventory. The completed Phase 6 source boundary remains unchanged.
- **D02:** closed-OT delivered-reel invariant integrated with its inclusive 90% completion boundary, any-positive-consumption clearance rule, unverified `motivo_cierre` boundary, and per-reel condition identity.
- **D03:** closed-OT mass-balance invariant integrated with its all-weighed gate, theoretical ink and adhesive inputs, strict 5% boundary, E05 blocker, and explicit independence from every other alert. D03 is never suppressed or cascade-resolved through another alert.
- **A01:** material-readiness invariant integrated with full-quantity allocation, reservation, and dispatch checks; reservation-first competing-stock allocation; inclusive 60- and 30-minute checkpoints; cancellation and rescheduling lifecycle; and explicit independence from D03.
- **B01:** approved-plan sequence invariant integrated with EmusaSoft-owned update validity, preservation of the originally expected and actually started OTs, audited late explanations, independent explanatory links, and no Monitor-defined plan authorization rule.
- **B02:** planned-start invariant integrated with inclusive deadline evaluation, one condition per OT and approved plan version, late-start resolution, approved superseding full-plan updates, and complete independence from equipment pauses and other alerts.
- **B03:** unexplained machine-idle invariant integrated with strict post-30-minute triggering, approved expected-production windows, active paused-OT exclusion, plan-level suspension/no-production resolution, independent B02 lifecycle, and Planner ownership.

## Immediate next action

Run the aggregate Stage 1 review across all seven integrated laboratories, cumulative documentation, executable contracts, focused suites, repository tests, typecheck, and build; then present the integration-to-`main` checkpoint separately.

## Phase 7 exit gate

Every active Phase 7 code must pass triggered, persistent, corrected, resolved, insufficient, failed-cycle, recurrence, correlation, routing, Dashboard, conversation, and browser scenarios through the separate `test_database` boundary. Stage 1 consolidation alone cannot satisfy this gate.
