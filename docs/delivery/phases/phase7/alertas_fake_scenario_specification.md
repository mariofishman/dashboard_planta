# Phase 7 `alertas_fake` scenario specification

**Role:** Supporting preparation document only

**Status:** A01 standalone preparation recorded; Phase 7 remains blocked by the Phase 6 exit gate

**Execution authority:** [`../phase6/README.md`](../phase6/README.md) remains the current phase execution authority

**Project sequencing authority:** [`../../../roadmap.md`](../../../roadmap.md)

## Purpose and boundary

This document will hold consistent laboratory scenario specifications for A01, B01, B02, B03, D01, D02, D03, and D04 after each alert is audited individually. It is not current execution authority, does not start Phase 7, does not satisfy the Phase 6 exit gate, and is not evidence that Phase 7 or any alert has passed.

Add one alert at a time with `$monitor-alert-rule-workflow`, using the skill's reusable template and `<ALERT_CODE>-<NN>` scenario identifiers. Approved business rules remain authoritative only in [`../../../product/alert_catalog.md`](../../../product/alert_catalog.md); this document records laboratory preparation and evidence mapping without duplicating those rules.

Standalone laboratory results, when later added, must remain distinct from connected `test_database`, Monitor polling and incident lifecycle, Dashboard, Chat, and production or Phase 10 evidence.

## A01 — Required material not ready before OT start

### Business objective

Prepare a deterministic, resettable standalone model of the A01 readiness checkpoints and competing-stock allocation defined in the alert catalog. This preparation does not start Phase 7 or prove a source or product boundary.

### Authority and existing evidence

- Business rule and routing authority: [`../../../product/alert_catalog.md`](../../../product/alert_catalog.md), A01 and shared lifecycle/distribution sections.
- Lifecycle, recurrence, failed-cycle, and source-boundary authority: [`../../../architecture/system_architecture.md`](../../../architecture/system_architecture.md).
- Executable contract and Phase 1 fixtures: `config/alerts/alert-rules.v1.json` and `tests/fixtures/alerts/rule-cases.v1.json`.
- Existing routing implementation: `apps/api/src/routing.ts`; its tests are prior routing evidence, not A01 connected acceptance.
- Standalone implementation: `packages/detection/src/a01-laboratory.ts` with controlled synthetic records only.

### Trigger and non-trigger conditions

Scenarios A01-01 through A01-08 cover the catalog checkpoints, competing-stock allocation, full reservation, full dispatch, and behavior after actual start. A01-10 through A01-12 cover correction, cancellation, and rescheduling. The laboratory does not infer supplier or purchasing state.

### Thresholds, units, timing, and tolerances

The controlled clock uses ISO-8601 instants. The 60- and 30-minute checkpoints are inclusive. Quantities are synthetic kilograms with exact comparisons and no tolerance: the full required quantity must be allocable, reserved, and, at the dispatch checkpoint, dispatched. Decimal-source representation and conversion remain unproven source mappings.

### Persistence and duplicate prevention

The standalone condition key is A01 plus query ID, key-schema version, OT ID, and material-requirement ID. Repeated identical evaluations preserve one open occurrence and do not add a duplicate observation. Stable laboratory occurrence IDs and repeatable reset state are synthetic evidence only.

### Correction and automatic resolution

Full correction resolves on the next complete laboratory evaluation. Cancellation resolves automatically. Rescheduling resolves the current occurrence, moves evaluation to the new checkpoints, and creates another occurrence only if a new checkpoint is breached.

### Administrative closure

The standalone laboratory requires reason `physical_operation_outside_erp` and a non-empty comment. It preserves the source state and suppresses only the same uninterrupted condition. It does not exercise Monitor authorization, persistence, audit, or incident writes.

### Recurrence and correlation

A healthy clear evaluation expires suppression; a later true evaluation creates the next occurrence. The standalone correlation selector admits only user-selected missing-dispatch, missing-consumption, or balance consequences with the same OT and material. Actual cross-alert incident selection and audited cascade closure remain deferred to connected Monitor evidence.

### Routing expectations

Catalog routing remains authoritative: insufficient allocable stock or incomplete reservation routes primarily to the material planner; a fully reserved but incompletely dispatched quantity routes primarily to the warehouse dispatcher or sender. The laboratory does not resolve roster users, route incidents, or deliver notifications.

### Scenario matrix

| Scenario ID | Starting state | Laboratory action | Expected source state | Expected standalone result | Deferred connected evidence |
| --- | --- | --- | --- | --- | --- |
| A01-00 | Controlled baseline | Mutate clock and requirement, then reset | Original clock, requirement, and stock restored | Snapshot equals baseline | All connected boundaries |
| A01-01 | Unready OT, 61 minutes before start | Evaluate | No source change | Clear; no occurrence | `test_database` and polling |
| A01-02 | Full stock, no reservation, exactly 60 minutes before start | Evaluate | No source change | One `Error` with `not_reserved_stock_available` | `test_database` and polling |
| A01-03 | One later reserved OT and one earlier unreserved OT compete for 500 kg | Allocate | Reserved OT receives the allocable 500 kg | Reserved OT wins allocation | Source query and concurrency |
| A01-04 | Equal or different unreserved starts compete for 500 kg | Allocate | Earliest start wins; equal starts use permanent OT ID | One deterministic full allocation | Source query and concurrency |
| A01-05 | 500 kg required and allocable; 200 kg reserved | Evaluate at readiness checkpoint | Partial reservation remains | `not_reserved_stock_available` | Source reservation mapping |
| A01-06 | 500 kg reserved and not dispatched | Evaluate at 31 then 30 minutes | No source change | Clear at 31; `reserved_not_dispatched` at 30 | Poll timing and source mapping |
| A01-07 | 500 kg required; 200 kg dispatched | Evaluate at dispatch checkpoint | Partial dispatch remains | `reserved_not_dispatched` | Source dispatch mapping |
| A01-08 | A01 is open and OT starts unready | Record actual start and reevaluate | Same unready requirement | Same open `Error` occurrence | Monitor lifecycle |
| A01-09 | A01 is open with unchanged evidence | Evaluate repeatedly | No source change | One occurrence and one meaningful observation | Monitor deduplication |
| A01-10 | A01 is open at dispatch checkpoint | Reserve and dispatch the full quantity | Requirement passes | Automatic resolution | Source correction and polling |
| A01-11 | A01 is open | Cancel OT | OT no longer requires preparation | Automatic resolution | Cancellation mapping and polling |
| A01-12 | A01 is open for old planned start | Reschedule beyond 60 minutes, then reach new checkpoint | Planned start changes | Old occurrence resolves; new occurrence opens only at new breach | Source reschedule mapping and polling |
| A01-13 | A01 is open and physical work occurred outside ERP | Administratively close, evaluate unchanged, clear, then recur | Source is not fabricated | Suppression holds until clear; recurrence creates occurrence 2 | Authorization, audit, and incident cascade |
| A01-14 | A required evidence field is absent | Evaluate | Incomplete evidence remains | Insufficient; no lifecycle change | Contract validation and polling |
| A01-15 | A01 is open | Simulate failed evaluation | Corrected synthetic input is not committed as a healthy result | Prior occurrence is preserved | Source failure and Monitor polling |
| A01-16 | Mixed correlated candidates | Select consequences | No source change | Only same-OT, same-material allowed consequence types selected | Cross-alert Monitor closure |

### Automated test references

`packages/detection/src/a01-laboratory.test.ts` maps each A01-00 through A01-16 identifier to the test whose name begins with that identifier. The tests exercise only `packages/detection/src/a01-laboratory.ts`. The existing Phase 1 contract validator continues to cover the smaller triggered, clear, and insufficient executable fixtures. No connected test is claimed.

### Required source mappings

- Backup-confirmed structural evidence: `ordenes_trabajo.id`, `ordenes_trabajo.fecha_inicio_planificada`, and `pre_reserva_orden_trabajo` identifiers/state already named in the executable contract.
- Approved standalone fields: OT ID, material-requirement ID, material ID, planned start, required kg, allocable kg, reserved kg, dispatched kg, cancellation, and actual start.
- Blocked mapping: the exact `test_database` tables, joins, quantity units, reservation quantity/state semantics, dispatch quantity/state semantics, cancellation field, actual-start field, and bounded query are not established by this preparation.

### Blockers and deferred connected tests

- **Standalone deterministic laboratory:** implemented with synthetic records and deterministic tests; validation results are reported separately.
- **Connected `test_database` source boundary:** deferred; no query, fixture mutation, reset, or database connection was performed.
- **Connected Monitor polling and incident lifecycle:** deferred; no poller, Monitor incident, routing delivery, suppression persistence, or administrative authorization was exercised.
- **Dashboard:** deferred; no UI change or test.
- **Chat:** deferred; no conversation, incident-card, or message test.
- **Production or Phase 10:** exact source reconciliation, Aurora behavior, credentials, query plan/load, routing identities, and deployment remain deferred.

### Approval record

- 2026-07-31 — Full allocable quantity approved: stock committed to other OTs is excluded.
- 2026-07-31 — Competing stock approved: recorded reservations receive priority, then earliest planned start, with permanent ERP OT ID as the deterministic equal-start tie-breaker.
- 2026-07-31 — Rescheduling approved: resolve the current occurrence and reevaluate only at the new checkpoints.
- 2026-07-31 — Supplier status excluded: report insufficient stock without inferring purchasing or delivery state.
- 2026-07-31 — A01 label approved as always `Error`, including the 60-minute checkpoint and after actual start; the same occurrence remains open.
- 2026-07-31 — Full reservation quantity required; partial reservation does not pass.
- 2026-07-31 — Full dispatch quantity required; partial dispatch does not pass.
- 2026-07-31 — OT cancellation resolves A01 automatically on the next healthy evaluation.
