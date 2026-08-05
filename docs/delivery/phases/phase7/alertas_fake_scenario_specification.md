# Phase 7 `alertas_fake` scenario specification

**Role:** Supporting preparation document only

**Status:** Supporting preparation; A01, B01, B02, B03, D01, D02, and D03 standalone laboratories integrated, connected boundaries deferred

**Execution authority:** [`README.md`](README.md)

**Project sequencing authority:** [`../../../roadmap.md`](../../../roadmap.md)

## Purpose and boundary

This document holds consistent laboratory scenario specifications for A01, B01, B02, B03, D01, D02, and D03 as each active alert is audited. D04 was retired into D01 on 2026-08-01. This document is not execution authority and does not by itself prove connected implementation or acceptance. Phase 6 completion and Phase 7 status remain owned by their respective phase README files and the roadmap.

Approved business rules remain authoritative only in [`../../../product/alert_catalog.md`](../../../product/alert_catalog.md). Standalone laboratory results remain distinct from connected `test_database`, Monitor polling and incident lifecycle, Dashboard, Chat, and production or Phase 10 evidence.

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

The standalone laboratory requires reason `physical_operation_outside_erp`, a non-empty comment, an administrator actor reference, and a closure timestamp. It preserves the source state and suppresses only the same uninterrupted A01 condition. It does not exercise connected Monitor authorization, persistence, audit, or incident writes.

### Recurrence and correlation

A healthy clear evaluation expires suppression; a later true evaluation creates the next occurrence. The standalone consequence selector admits only user-selected missing-dispatch or missing-consumption consequences with the same OT and material. A01 and D03 are unrelated and independent: A01 never selects, suppresses, resolves, or closes D03. Actual cross-alert incident selection and audited cascade closure remain deferred to connected Monitor evidence.

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
| A01-13 | A01 is open and physical work occurred outside ERP | Administratively close with actor, reason, comment, and timestamp; evaluate unchanged, clear, then recur | Source is not fabricated | Audited closure evidence is retained; suppression holds until clear; recurrence creates occurrence 2 | Authorization, audit, and incident cascade |
| A01-14 | A required evidence field is absent | Evaluate | Incomplete evidence remains | Insufficient; no lifecycle change | Contract validation and polling |
| A01-15 | A01 is open | Simulate failed evaluation | Corrected synthetic input is not committed as a healthy result | Prior occurrence is preserved | Source failure and Monitor polling |
| A01-16 | Mixed consequence candidates, including balance | Select consequences | No source change | Only same-OT, same-material missing-dispatch and missing-consumption consequences are selected; balance/D03 is excluded | Cross-alert Monitor closure |

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
- 2026-08-05 — The product manager clarified that material readiness and OT mass balance are unrelated. A01 never selects, suppresses, resolves, or closes D03.

## B01 — OT started outside the latest approved plan sequence

### Business objective

Prepare deterministic B01 behavior against controlled evidence without starting Phase 7 or claiming source integration. The business objective remains defined by the [B01 catalog rule](../../../product/alert_catalog.md#b01--ot-started-outside-the-latest-approved-plan-sequence).

### Authority and existing evidence

- `docs/product/alert_catalog.md` is authoritative for the trigger, resolution, administrative closure, correlation, and routing rules.
- `config/alerts/alert-rules.v1.json` defines query `b01-plan-sequence-deviation`, key-schema version 1, natural key `workOrderId`, and reason `outside_approved_sequence`.
- `tests/fixtures/alerts/rule-cases.v1.json` and `scripts/phase1/validate-rule-contracts.mjs` already prove one synthetic trigger, clear, and insufficient contract result.
- `docs/delivery/phases/phase1/evidence-matrix.md` classifies B01 as deterministic and explicitly marks the approved-plan source as pending.
- `packages/detection/src/b01-laboratory.ts` and its test file are a standalone deterministic laboratory only. They do not call `test_database`, the Monitor poller, routing, Dashboard, Chat, staging, or production.

### Trigger and non-trigger conditions

The scenario matrix covers the catalog predicate: a started OT triggers when it differs from the next approved OT and no valid sequence update existed before start. An OT that has not started may correctly have no actual-start timestamp; a started OT requires that timestamp as incident evidence. It covers both non-trigger paths, missing evidence, and a valid late explanation. Detailed rule prose remains in the catalog.

### Thresholds, units, timing, and tolerances

B01 has no elapsed-time threshold, quantity, unit, or tolerance. The deterministic boundary is the EmusaSoft-derived fact `sequenceUpdatedBeforeStart`; the standalone laboratory does not invent timestamp precision or authorization semantics for that fact. Its clock is injected and fixed by each test.

### Persistence and duplicate prevention

The condition key is `B01 + b01-plan-sequence-deviation + key schema 1 + workOrderId`. Repeated evaluation of one continuing deviation retains one stable occurrence and incident ID. `reset()` returns the in-memory laboratory to the same empty baseline without touching any database.

### Correction and automatic resolution

Per the approved catalog rule, only a late plan update already marked valid by EmusaSoft evidence, with a valid timestamp, actor reference, and reason, resolves the standalone B01 occurrence. Monitor does not decide authorization or validity. The laboratory preserves the expected OT, started OT, actual start time, and late-update evidence; it does not rewrite the original deviation.

### Administrative closure

The standalone closure action requires actor reference, standardized reason, and comment, preserves the incident evidence, and suppresses the same uninterrupted condition. Only a later healthy clear evaluation expires that suppression. This is simulated laboratory state and is not a Monitor incident write.

### Recurrence and correlation

The repository does not establish a source-valid workflow in which the same OT legitimately starts again after B01 resolves. The laboratory therefore refuses to invent recurrence and reports missing `sourceValidRecurrenceEvidence`; connected recurrence is deferred until the EmusaSoft source contract proves a valid workflow. A01, B03, or other material or machine causes are linked as explanatory correlations and do not suppress the distinct B01 plan-compliance deviation.

### Routing expectations

The catalog routes B01 to the factory manager, affected operation shift supervisor, technical leader, and implicated machine operator; the operation shift supervisor is the primary action owner. The standalone laboratory does not resolve people or deliver notifications. Routing evidence remains a separate connected Monitor boundary.

### Scenario matrix

| Scenario ID | Starting state | Laboratory action | Expected source state | Expected standalone result | Deferred connected evidence |
| --- | --- | --- | --- | --- | --- |
| B01-00 | Dirty in-memory laboratory, then reset | Reset; evaluate an OT that has not started | Controlled fixture remains unchanged | Empty repeatable baseline; no incident | Source reset and all connected boundaries deferred |
| B01-01 | OT 151099 is next for P15 | Start OT 151104 without a prior sequence update | Synthetic start differs from synthetic approved sequence | One open B01 occurrence with stable identity | `test_database`, polling, routing, Dashboard, and Chat deferred |
| B01-02 | Controlled plan/start evidence | Evaluate matching next OT; separately evaluate prior-update fact | Synthetic evidence satisfies either non-trigger path | Clear; no incident | EmusaSoft ordering and validity mapping deferred |
| B01-03 | One open B01 occurrence | Re-evaluate the unchanged deviation at a later fixed time | Source fixture is unchanged | Same open occurrence persists | Normal polling persistence deferred |
| B01-04 | One open B01 occurrence | Repeat the same complete evaluation | Source fixture is unchanged | No duplicate occurrence or condition key | Monitor transaction and delivery deduplication deferred |
| B01-05 | One open B01 occurrence | Supply an invalid late update, then an EmusaSoft-valid late update with timestamp, actor reference, and reason | Only the valid synthetic plan evidence explains the deviation | Invalid update preserves B01; valid update resolves it while retaining the original deviation and update | EmusaSoft correction workflow and Monitor resolution deferred |
| B01-06 | One open B01 occurrence | Close administratively; repeat the unchanged trigger | Synthetic source remains unchanged | Closed without resolution; same uninterrupted condition suppressed | Monitor authorization, audit, and reporting deferred |
| B01-07 | Administratively closed uninterrupted condition | Supply a healthy clear evaluation | Synthetic source no longer qualifies | Suppression expires without rewriting closure history | Connected suppression expiry deferred |
| B01-08 | Deviating OT with explanatory A01/B03 evidence | Evaluate with repeated correlation codes | Synthetic B01 evidence remains qualifying | B01 opens; correlations are deduplicated and linked | Cross-rule incident correlation deferred |
| B01-09 | Existing open B01 occurrence | Omit the next-approved-OT evidence | Controlled evidence is incomplete | Insufficient; open occurrence preserved | Source schema validation and polling failure telemetry deferred |
| B01-10 | Existing open B01 occurrence | Return a deterministic failed laboratory cycle | Controlled source cannot be evaluated | Failed cycle preserves the open occurrence | Database, adapter, and Monitor failed-cycle evidence deferred |
| B01-11 | Resolved B01 occurrence for one OT | Present the same OT as qualifying again without a proven restart workflow | Source-valid recurrence evidence is absent | Insufficient; no invented recurrence or second occurrence | EmusaSoft recurrence workflow and connected recurrence deferred |

### Automated test references

`packages/detection/src/b01-laboratory.test.ts` maps test names directly to B01-00 through B01-11. B01-03 and B01-04 share one test because the same repeated evaluation proves persistence and duplicate prevention. All are standalone deterministic tests. Existing generic contract coverage remains in `packages/contracts/src/repository-contracts.test.ts` through the Phase 1 validator.

### Required source mappings

- `ordenes_trabajo.id`, `id_equipo`, `secuencia`, and `fecha_inicio_ejecucion`: backup-confirmed contract fields; no connected read was performed for this preparation.
- Latest approved plan version, next OT, approval time, pre-start update validity, late-update actor, and reason: controlled standalone inputs only. The current `approved_plan_contract` is explicitly Phase 10 pending and no real source is inferred.
- Monitor consumes EmusaSoft's validity result. EmusaSoft owns plan-edit authorization; this preparation adds no Monitor permission rule.

### Blockers and deferred connected tests

- **Standalone deterministic laboratory:** implemented for the scenario matrix; passing tests are evidence only for pure in-memory behavior.
- **Connected `test_database` source boundary:** blocked by the unverified approved-plan source, validity mapping, and source-valid recurrence workflow; not executed.
- **Connected Monitor polling and incident lifecycle:** deferred until Phase 7 is unblocked and the source contract is ready; not executed.
- **Dashboard:** deferred; not executed.
- **Chat:** deferred; not executed.
- **Production or Phase 10:** current source, authorization semantics, bounded SQL, query plan, load, credentials, Aurora behavior, staging correction, and recurrence remain unvalidated; not executed.

This standalone preparation cannot satisfy the Phase 7 connected exit gate.

### Approval record

- 2026-07-31 — The user approved option A: when a valid plan update and reason are recorded after B01 has fired, resolve the incident while preserving the original deviation and audit history. Recorded in the B01 catalog resolution.
- 2026-07-31 — A proposed question about who may authorize an EmusaSoft plan change was withdrawn because it is an EmusaSoft business rule, not a Monitor decision. The source authorization and validity mapping remain deferred; Monitor adds no authorization rule.

## B02 — Planned OT has not started on time

### Business objective

Prepare deterministic B02 behavior against controlled plan-version evidence without starting Phase 7 or claiming source integration. The business objective remains defined by the [B02 catalog rule](../../../product/alert_catalog.md#b02--planned-ot-has-not-started-on-time).

### Authority and existing evidence

- `docs/product/alert_catalog.md` is authoritative for B02 trigger, identity, resolution, administrative closure, independence, and routing.
- `config/alerts/alert-rules.v1.json` defines query `b02-planned-start-missed`, key-schema version 1, natural key `workOrderId + planVersionId`, and reason `planned_start_missed`.
- `tests/fixtures/alerts/rule-cases.v1.json` and `scripts/phase1/validate-rule-contracts.mjs` provide synthetic trigger, clear, and insufficient contract cases.
- `docs/delivery/phases/phase1/evidence-matrix.md` classifies B02 as deadline plus deterministic and marks plan-version semantics as source-pending.
- `packages/detection/src/b02-laboratory.ts` and its tests are a standalone deterministic laboratory only. They do not call `test_database`, the Monitor poller, routing, Dashboard, Chat, staging, or production.

### Trigger and non-trigger conditions

The matrix covers the catalog predicate at and after the planned start, before the deadline, and when the OT already started. It also covers approved plan updates, insufficient evidence, and failed-cycle preservation. Detailed rule prose remains in the catalog.

### Thresholds, units, timing, and tolerances

B02 triggers inclusively when the planned-start timestamp arrives and the approved plan-version commitment remains unmet. There is no grace period or quantity tolerance. Tests inject an ISO timestamp clock and never use wall-clock time. Production time-zone and source-timestamp interpretation remain part of the approved-plan source mapping.

### Persistence and duplicate prevention

The condition key is `B02 + b02-planned-start-missed + key schema 1 + workOrderId + planVersionId`. Repeated evaluation of one missed commitment retains one stable occurrence and incident ID. `reset()` restores the pure in-memory laboratory to an empty repeatable baseline. Different approved plan versions remain separate persisted situations even for the same OT.

### Correction and automatic resolution

The standalone scenarios exercise the catalog's two resolution paths: the OT starts, including a late start, or an approved full-plan update supersedes the missed commitment. A valid update may reschedule, remove, or cancel the OT. The old missed occurrence stays in history; a later missed start under a new plan version creates a separate occurrence.

### Administrative closure

The standalone closure action requires an actor reference, standardized reason, and comment, preserves the affected plan-version evidence, and suppresses only the same uninterrupted condition. A later healthy evaluation that observes an OT start or approved plan update clears that condition and expires suppression. This is simulated laboratory state and is not a Monitor incident write.

### Recurrence and correlation

Recurrence for the same superseded plan version is not source-valid and is not invented. A later missed commitment is represented by a new approved plan version and a distinct condition. B02 has no explicit cross-alert correlation: other alerts remain independent, and shared OT, machine, or timing evidence does not prove causation. No unrelated alert, equipment pause, notification, or other action suppresses or resolves B02.

### Routing expectations

Routing remains defined by the catalog: the factory manager, affected operation shift supervisor, and technical leader are always informed; the evidence selects the applicable planner or machine-operator action path. The standalone laboratory performs no roster lookup, recipient resolution, notification, or delivery and provides no connected routing evidence.

### Scenario matrix

| Scenario ID | Starting state | Laboratory action | Expected source state | Expected standalone result | Deferred connected evidence |
| --- | --- | --- | --- | --- | --- |
| B02-00 | Dirty laboratory, then reset; OT has not started but deadline is still future | Reset and evaluate at `plannedStartAt - 1 ms` | Current approved plan version remains unmet but not overdue | Clear; no incident; repeatable empty baseline | All connected boundaries deferred |
| B02-01 | Current plan version, no actual start, no approved update | Evaluate exactly at planned start | Missed commitment is current | One open occurrence with `planned_start_missed` | Source timestamp and poll observation deferred |
| B02-02 | OT started before planned start | Evaluate at deadline | Commitment was met | Clear; no incident | Actual-start mapping deferred |
| B02-03 | Open missed-start occurrence | Repeat healthy evaluation | Same plan-version condition persists | Same occurrence and incident ID | Monitor deduplication deferred |
| B02-04 | Open missed-start occurrence after time advances | Repeat healthy evaluation | Same plan-version condition persists | Update existing occurrence only | Polling persistence deferred |
| B02-05 | Open occurrence; OT starts late | Evaluate the late-start evidence | OT now has actual start | Resolve same occurrence and preserve history | Source and Monitor resolution deferred |
| B02-06 | Open occurrence; approved full-plan update assigns a later start | Evaluate superseding plan version | Old commitment superseded | Resolve old occurrence with update evidence | Approved-plan mapping deferred |
| B02-07 | Open occurrence; approved update removes or cancels OT | Evaluate each supported update outcome | Old commitment superseded | Resolve old occurrence | Removal/cancellation mapping deferred |
| B02-08 | Missed B02 exists independently of any possible operational cause | Evaluate only B02 contract evidence | No cause or unrelated action is inferred | B02 triggers with no cross-alert link or coupling | No causal infrastructure is claimed |
| B02-09 | Open occurrence with unreconstructable history | Attempt incomplete closure, then valid administrative closure | ERP state unchanged | Reject incomplete closure; close and suppress with complete audit evidence | Monitor closure UI and persistence deferred |
| B02-10 | Closed-without-resolution occurrence; OT later starts | Evaluate healthy cleared state, then impossible same-version return | Condition clears and suppression expires | Preserve closure; refuse invented recurrence | Connected suppression lifecycle deferred |
| B02-11 | Open occurrence; required approved-plan evidence absent or invalid | Evaluate incomplete evidence | Source result is insufficient | Preserve open occurrence; do not resolve | Source schema validation deferred |
| B02-12 | Open occurrence; evaluation cycle fails | Inject deterministic cycle failure | No healthy source conclusion | Preserve open occurrence unchanged | Poller failure telemetry deferred |
| B02-13 | One OT misses two separately approved planned starts | Resolve version 7 by rescheduling; evaluate missed version 8 | Two missed commitments exist in distinct versions | Preserve resolved version 7 and open distinct version 8 | Connected plan-version lifecycle deferred |
| B02-14 | Resolved occurrence for one plan version | Re-present impossible triggering state for the same version | No source-valid recurrence evidence exists | Report insufficient recurrence evidence; do not reopen | Current-source recurrence proof deferred |

### Automated test references

- Standalone: `packages/detection/src/b02-laboratory.test.ts` maps `B02-00` through `B02-14` to named deterministic tests.
- Contract fixtures: `tests/fixtures/alerts/rule-cases.v1.json` covers B02 trigger, clear-by-approved-plan-update, and insufficient evidence.
- Contract validator: `scripts/phase1/validate-rule-contracts.mjs` checks the B02 predicate, reason, required evidence, and stable condition key.
- No connected automated test is claimed by this preparation block.

### Required source mappings

- Backup-confirmed candidate fields: `ordenes_trabajo.id`, `id_equipo`, `fecha_inicio_planificada`, and `fecha_inicio_ejecucion`.
- Source-pending approved-plan contract: stable `planVersionId`, planned start for that version, current/superseded status, approval timestamp, and update outcome for reschedule, removal, or cancellation.
- EmusaSoft owns plan approval, authorization, and version validity. Monitor must consume rather than infer those facts.
- No source field currently establishes that another alert caused B02; no causal or cross-alert mapping is required.

### Blockers and deferred connected tests

- **Standalone deterministic laboratory:** implemented and eligible for local validation after this specification is saved.
- **Connected `test_database` source boundary:** deferred; no B02 query, writer scenario, plan-version mapping, or connected source evidence is produced here.
- **Connected Monitor polling and incident lifecycle:** deferred; no scheduler, incident, closure, suppression, recurrence, routing, or notification path is exercised.
- **Dashboard:** deferred; no B02 presentation or history evidence is produced.
- **Chat:** deferred; no conversation, message, recipient, or notification evidence is produced.
- **Production or Phase 10:** deferred; approved-plan source validity, authorization, Aurora query plans, load, credentials, time-zone behavior, and representative data remain unvalidated.
- This standalone preparation cannot change phase status or satisfy the Phase 7 connected exit gate.

### Approval record

- 2026-08-01 — Approved two independent alerts when another condition coexists with B02. Monitor must not infer causation, store a cross-alert link, bundle notifications, suppress either alert, or couple their lifecycles.
- 2026-08-01 — Approved one independent B02 situation per approved plan version. Rescheduling resolves the old missed commitment; missing the new commitment creates and preserves a separate occurrence.
- 2026-08-01 — Approved exactly two normal B02 resolution paths: the OT starts, even late, or an approved full-plan update supersedes the commitment. Equipment pauses and unrelated actions do not resolve it.
- 2026-08-01 — Approved an update that removes or cancels the OT as a superseding full-plan update that resolves the old B02 occurrence.

## B03 — Machine has no active OT for more than 30 minutes

### Business objective

Prepare deterministic B03 behavior against controlled approved-plan evidence without starting Phase 7 or claiming source integration. The business objective remains defined by the [B03 catalog rule](../../../product/alert_catalog.md#b03--machine-has-no-active-ot-for-more-than-30-minutes).

### Authority and existing evidence

- `docs/product/alert_catalog.md` is authoritative for B03 triggering, plan-state boundary, ownership, resolution, administrative closure, and routing.
- `config/alerts/alert-rules.v1.json` defines query `b03-unexplained-machine-idle`, key-schema version 1, natural key `equipmentId + scheduleWindowId`, and reason `unexplained_machine_idle`.
- `tests/fixtures/alerts/rule-cases.v1.json` and `scripts/phase1/validate-rule-contracts.mjs` provide synthetic trigger, clear-by-plan-suspension, and insufficient contract cases.
- `docs/delivery/phases/phase1/evidence-matrix.md` classifies B03 as deadline plus deterministic and marks the approved plan-window and suspension mapping as source-pending.
- The protected backup confirms OT execution timestamps and the existence of equipment-pause records. It does not establish an approved plan-level suspension contract; equipment pauses are not substituted for that missing source.
- `packages/detection/src/b03-laboratory.ts` and its tests are a standalone deterministic laboratory only. They do not call `test_database`, the Monitor poller, routing, Dashboard, Chat, staging, or production.

### Trigger and non-trigger conditions

The matrix covers the catalog predicate before, at, and after 30 continuous idle minutes. It separately proves that a running or paused active OT is not B03 and that approved plan-level suspension or no-production state excludes the rule. Detailed rule prose remains in the catalog.

### Thresholds, units, timing, and tolerances

B03 triggers strictly after 30 continuous minutes without an active OT while the approved plan expects production. Equality at 30 minutes is clear. Tests inject an ISO timestamp clock and derive elapsed minutes without wall-clock time. Production time-zone, schedule-window identity, and source-timestamp interpretation remain source-contract work.

### Persistence and duplicate prevention

The condition key is `B03 + b03-unexplained-machine-idle + key schema 1 + equipmentId + scheduleWindowId`. Repeated evaluation of one uninterrupted idle condition retains one stable occurrence and incident ID while updating elapsed evidence. `reset()` restores the pure in-memory laboratory to an empty repeatable baseline. Different approved schedule windows are independent conditions.

### Correction and automatic resolution

The standalone scenarios exercise the catalog's two resolution paths: an OT becomes active, including an OT paused within its own execution, or an approved production-plan update makes production suspended or not expected for the interval. An equipment-pause record alone is not a resolution action.

### Administrative closure

The standalone closure action requires an actor reference, standardized reason, and comment, preserves the unexplained downtime duration, and suppresses only the same uninterrupted condition. A later healthy evaluation that observes an active OT or a non-production plan state clears the condition and expires suppression. This is simulated laboratory state and is not a Monitor incident write.

### Recurrence and correlation

After a healthy clear, a later continuous idle breach creates a new occurrence while preserving history. Different approved schedule windows have different condition keys. B02 remains independently evaluated for a specific missed OT; the standalone B03 laboratory does not infer causation, link alerts, merge incidents, or couple their lifecycles.

### Routing expectations

Routing remains defined by the catalog: the Planner is primary; the factory manager, operation shift supervisor, and technical leader are informed; the planned shift operator may be included as an implicated recipient. The standalone laboratory performs no roster lookup, recipient resolution, notification, or delivery and provides no connected routing evidence.

### Scenario matrix

| Scenario ID | Starting state | Laboratory action | Expected source state | Expected standalone result | Deferred connected evidence |
| --- | --- | --- | --- | --- | --- |
| B03-00 | Dirty laboratory, then reset; idle duration is below threshold | Reset and evaluate at `idleStartedAt + 29:59.999` | Approved plan still expects production | Clear; no incident; repeatable empty baseline | All connected boundaries deferred |
| B03-01 | Expected production, no active OT | Evaluate exactly at 30 minutes | Idle interval remains continuous | Clear; equality does not trigger | Source timestamp and poll observation deferred |
| B03-02 | Expected production, no active OT for 31 minutes | Evaluate controlled snapshot | Unexplained idle condition exists | One open occurrence with `unexplained_machine_idle` | Source and Monitor creation deferred |
| B03-03 | Expected production with a running OT | Evaluate controlled snapshot | Active OT exists | Clear; no B03 | Active-OT source mapping deferred |
| B03-04 | Expected production with an OT paused inside its execution | Evaluate controlled snapshot | OT remains active | Clear; in-OT pause is outside B03 | OT/pause lifecycle mapping deferred |
| B03-05 | Approved plan-level suspension | Evaluate controlled snapshot | Production is not expected | Clear; no B03 | Approved suspension source mapping deferred |
| B03-06 | Approved no-production plan period | Evaluate controlled snapshot | Production is not expected | Clear; no B03 | Approved plan-period mapping deferred |
| B03-07 | Open idle occurrence | Repeat healthy evaluation | Same uninterrupted condition persists | Same occurrence and incident ID | Monitor deduplication deferred |
| B03-08 | Open idle occurrence after time advances | Repeat healthy evaluation | Same uninterrupted condition persists | Update elapsed evidence only | Polling persistence deferred |
| B03-09 | Open occurrence; an OT becomes active and is internally paused | Evaluate active-OT evidence | Machine has an active OT | Resolve same occurrence and preserve history | Source and Monitor resolution deferred |
| B03-10 | Open occurrence; approved plan is suspended | Evaluate new approved plan state | Production is no longer expected | Resolve immediately with plan-state evidence | Plan update and source mapping deferred |
| B03-11 | Open occurrence; required evidence is missing or internally invalid | Evaluate incomplete or future-dated evidence | Source conclusion is insufficient | Preserve open occurrence; do not resolve | Source schema validation deferred |
| B03-12 | Open occurrence; evaluation cycle fails | Inject deterministic cycle failure | No healthy source conclusion | Preserve open occurrence unchanged | Poller failure telemetry deferred |
| B03-13 | Open occurrence with unreconstructable historical cause | Attempt incomplete closure, then valid administrative closure | ERP state unchanged | Reject incomplete closure; close and suppress with audit evidence | Monitor closure UI and persistence deferred |
| B03-14 | Closed occurrence; active OT clears condition; later idle breach recurs | Evaluate clear, then new 31-minute idle interval | Healthy clear separates occurrences | Preserve occurrence 1 and open occurrence 2 | Connected suppression lifecycle deferred |
| B03-15 | Two approved expected-production windows for one machine | Evaluate each window | Two independently identified schedule windows | Two distinct condition keys | Approved window identity mapping deferred |

### Automated test references

- Standalone: `packages/detection/src/b03-laboratory.test.ts` maps `B03-00` through `B03-15` to named deterministic tests.
- Contract fixtures: `tests/fixtures/alerts/rule-cases.v1.json` covers B03 trigger, clear-by-plan-suspension, and insufficient evidence.
- Contract validator: `scripts/phase1/validate-rule-contracts.mjs` checks the B03 predicate, reason, required evidence, and stable condition key.
- No connected automated test is claimed by this preparation block.

### Required source mappings

- Backup-confirmed candidate OT fields: `ordenes_trabajo.id_equipo`, `fecha_inicio_ejecucion`, and `fecha_fin_ejecucion`.
- Source-pending approved-plan contract: stable `planVersionId`, `scheduleWindowId`, expected-production state, effective interval, and approved plan-level suspension or no-production state.
- `equipo_pausa` contains machine and optional origin-OT pause evidence, but it does not prove an approved whole-day or plan-level suspension and is not a B03 resolution substitute.
- EmusaSoft owns plan authorization and validity. Monitor consumes the approved plan state and does not infer it from an operator action or raw equipment pause.

### Blockers and deferred connected tests

- **Standalone deterministic laboratory:** implemented and eligible for local validation after this specification is saved.
- **Connected `test_database` source boundary:** deferred; no B03 query, writer scenario, approved-plan mapping, or connected source evidence is produced here.
- **Connected Monitor polling and incident lifecycle:** deferred; no scheduler, incident, closure, suppression, recurrence, routing, or notification path is exercised.
- **Dashboard:** deferred; no B03 presentation or history evidence is produced.
- **Chat:** deferred; no conversation, message, recipient, or notification evidence is produced.
- **Production or Phase 10:** deferred; approved-plan source validity, authorization, Aurora query plans, load, credentials, time-zone behavior, and representative data remain unvalidated.
- This standalone preparation cannot change phase status or satisfy the Phase 7 connected exit gate.

### Approval record

- 2026-08-01 — Confirmed that an in-OT pause remains an active OT and is outside B03.
- 2026-08-01 — Confirmed that B03 has no separate machine-downtime pause state between OTs: either an approved plan-level suspension makes production not expected, or no suspension exists and the continuous no-active-OT clock applies.
- 2026-08-01 — Confirmed that an approved whole-day or plan-level suspension resolves B03 immediately and is recorded at the production-planning level by a planner or supervisor, not by an operator.
- 2026-08-01 — Approved the Planner as B03 primary action owner.

## D01 — OT longitudinal meters and substrate layers do not close

### Business objective

Prepare deterministic standalone coverage for the consolidated D01 closure invariant defined in the alert catalog. The laboratory reconciles declared OT run meters, used meters for each required substrate layer, weighed remnants, and pairwise agreement between layers. It does not prove a connected source, poller, incident service, routing, or interface boundary.

### Authority and existing evidence

- The alert catalog owns the D01 formulas, evidence completeness, tolerance, reasons, resolution, administrative closure, correlation, and routing.
- [`../../../architecture/system_architecture.md`](../../../architecture/system_architecture.md) owns condition identity, occurrence lifecycle, healthy-cycle resolution, failed-cycle preservation, recurrence, and suppression.
- [`../../../../config/alerts/alert-rules.v1.json`](../../../../config/alerts/alert-rules.v1.json) retains query ID `d01-declared-meters-over-input`, OT natural key, and key-schema version `1`; D01 rule and candidate-query versions are `2.0.0` and `2.0.0-candidate`. One contract row represents one OT and carries the complete `layerResults`, `pairwiseLayerGaps`, and maximum gap for each of the three reason directions, so one evaluation can emit all applicable reasons without duplicate natural keys.
- [`../../../../tests/fixtures/alerts/rule-cases.v1.json`](../../../../tests/fixtures/alerts/rule-cases.v1.json) covers both layer-to-run directions, pairwise mismatch, all three reasons in one aggregated OT trigger, all three equality boundaries, and insufficient evidence with one stable OT identity. Every complete fixture carries contributing-reel and measurement-path evidence. The contract validator derives and reconciles all three maxima, layer reasons, pairwise results, unique layer and reel identities, and the complete layer-pair set before evaluating the predicate. The aggregate trigger is explicitly marked as the shared registry's canonical trigger.
- [`../../../../packages/detection/src/d01-laboratory.ts`](../../../../packages/detection/src/d01-laboratory.ts) is a pure in-memory Phase 7 supporting-preparation laboratory with no database, network, source adapter, scheduler, Monitor incident write, routing delivery, Dashboard state, or Chat state.
- Commit `b968ead493405682098dbb9fe06b535acec78852` recorded the predecessor one-direction D01 laboratory and source-schema existence evidence. That predecessor evidence does not prove the expanded source semantics, joins, or connected behavior.
- Candidate gross, tare, remnant, width, grammage, output-meter, and layer mappings remain unverified operational semantics. Similarly named EmusaSoft linear-meter fields are not treated as business authority.

### Trigger and non-trigger conditions

Scenarios reference the complete catalog rule. Coverage includes pre-closure non-applicability; declared run above a layer; a layer above declared run; pairwise layer mismatch; multiple simultaneous reasons; equality at every boundary; complete correction; insufficient evidence; and failed-cycle preservation. One OT occurrence contains all affected layers and reasons.

### Thresholds, units, timing, and tolerances

- Evaluate only at OT closure.
- Normalize kilograms, meters, width in meters, and grammage in grams per square meter.
- Derive theoretical order kilograms from declared outputs.
- Use `min(5% of theoretical order kg, 150 kg)` and convert it to output-equivalent meters.
- Use the same allowed meters for both signed layer-to-run and absolute pairwise comparisons; strict `>` triggers and equality is clear.
- The standalone clock is fixture-controlled and changes only through an explicit laboratory action.

### Persistence and duplicate prevention

The condition key remains `D01:d01-declared-meters-over-input:1:workOrderId=<id>`. Repeated unchanged complete evaluations preserve one occurrence and one evidence observation. Changed complete evidence updates that occurrence. Multiple reasons and layers never create multiple D01 incidents for the OT.

### Correction and automatic resolution

A later complete healthy evaluation resolves only when every required layer agrees with declared run meters and every other layer within tolerance. Missing, invalid, partial, or unweighed evidence cannot create or resolve an occurrence. A declared remnant becomes evaluable immediately after its weight completes the evidence.

### Administrative closure

The laboratory requires reason, mandatory comment, actor reference, and timestamp and freezes the complete run, tolerance, layer, reel measurement-path, signed-gap, pairwise-gap, and reason evidence. Closure suppresses only the same uninterrupted condition and does not alter source evidence.

### Recurrence and correlation

A healthy clear evaluation expires suppression or resolves an open occurrence. A later triggered evaluation creates a new occurrence. D01 replaces or enriches A04 only when the same OT evidence chain is deterministically explained. A05 handling and D03 mass-balance conditions remain distinct; D01 never suppresses D03.

### Routing expectations

The catalog keeps the machine operator as D01's primary action owner under general distribution rules. Routing execution, recipient resolution, and cleanup of the legacy D04 routing registry are connected implementation work and remain deferred.

### Scenario matrix

| Scenario ID | Starting state | Laboratory action | Expected source state | Expected standalone result | Deferred connected evidence |
| --- | --- | --- | --- | --- | --- |
| D01-00 | Controlled open OT baseline | Poll, mutate, then reset | No external mutation; fixture resets byte-for-byte | Pre-closure not applicable; repeatable reset | All connected boundaries |
| D01-01 | Closed OT; one layer is more than tolerance below run | Evaluate complete fixture | No external mutation | `declared_meters_exceed_layer_input` | Source query and lifecycle |
| D01-02 | Both layers exactly equal the 40,000 m run, plus signed and pairwise tolerance-boundary variants | Evaluate complete fixtures | No external mutation | Exact zero gaps and all equality boundaries are clear | Source boundary |
| D01-03 | Large OT whose 5% exceeds 150 kg | Evaluate complete fixture | No external mutation | Tolerance capped at 150 kg | Source boundary |
| D01-04 | Two required layers each below run | Evaluate independently | No external mutation | Both remain separate; never summed | Layer-source mapping |
| D01-05 | No remnant declared; verified core tare present | Convert initial gross minus tare | No external mutation | Full-use measurement path succeeds | Core-tare join and coverage |
| D01-06 | Declared partial reel has weighed remnant | Subtract remnant gross from initial gross | No external mutation | Core cancels and is not subtracted twice | Remnant lifecycle mapping |
| D01-07 | Open D01 followed by declared unweighed remnant | Evaluate incomplete fixture | No external mutation | Insufficient; prior occurrence unchanged | Weighing workflow and polling |
| D01-08 | Fully used reel has no verified core tare | Evaluate incomplete fixture | No external mutation | Insufficient; no invented tare | Core-tare source contract |
| D01-09 | Unchanged triggered condition | Poll twice | No external mutation | One occurrence and one evidence observation | Monitor deduplication |
| D01-10 | Open D01 followed by complete correction | Replace evidence and poll | No external mutation | Automatic resolution | Source correction and lifecycle |
| D01-11 | Open multi-layer D01 with unreconstructable history | Administratively close | No external mutation | Full layer and pair evidence frozen | Monitor authorization and audit |
| D01-12 | Closed occurrence, healthy clear, then return | Poll clear and later trigger | No external mutation | New occurrence only after proved clear interval | Source-valid recurrence |
| D01-13 | Open D01 followed by failed cycle | Poll failed cycle | No external mutation | Existing occurrence unchanged | Poller failure behavior |
| D01-14 | D01 and D03 candidates share the same OT and evidence chain | Classify independence | No external mutation | D01 and D03 both remain active under their own predicates | Connected independent lifecycle evidence |
| D01-15 | Multiple layers are below run on one OT | Poll complete fixture | No external mutation | One occurrence identifies every deficient layer | Monitor evidence persistence |
| D01-16 | One layer is more than tolerance above run | Evaluate complete fixture | No external mutation | `layer_input_exceeds_declared_meters` | Source query and lifecycle |
| D01-17 | Two layers each within run tolerance but apart beyond tolerance | Evaluate pairwise evidence | No external mutation | `substrate_layers_do_not_match` only | Pairwise source candidate generation |
| D01-18 | Layers fail in opposite directions | Poll complete fixture | No external mutation | One occurrence with all three reasons and both layers | Monitor evidence persistence |
| D01-19 | Closed OT with no remnant declared | Evaluate immediately | No external mutation | Zero remnant implied; full-use path runs | Remnant declaration semantics |
| D01-20 | Declared remnant becomes weighed | Evaluate before and after weight | No external mutation | Insufficient then immediate complete result | Weighing event observation |
| D01-21 | Invalid measurement or one reel assigned to multiple layers | Evaluate invalid fixtures | No external mutation | Insufficient with exact invalid or duplicate identity fields | Measurement and layer ownership authority |
| D01-22 | Incomplete evidence with no prior occurrence | Poll | No external mutation | No new occurrence | Source completeness contract |
| D01-23 | Open D01 with changed complete evidence | Poll changed fixture | No external mutation | Same occurrence receives one evidence update | Monitor evidence persistence |
| D01-24 | A04 candidate shares or does not share evidence chain | Classify correlation | No external mutation | Enrich/replace only when explained; otherwise distinct | Connected A04 correlation |
| D01-25 | A05 handling condition is active | Classify correlation | No external mutation | A05 remains distinct | Connected A05 correlation |
| D01-26 | Consolidated repository inventory | Inspect contracts, fixtures, and evaluator files | No external mutation | No active D04 contract, fixture, scenario block, or evaluator | Legacy connected routing cleanup |

### Automated test references

Standalone scenarios D01-00 through D01-26 map one-to-one to test names in [`../../../../packages/detection/src/d01-laboratory.test.ts`](../../../../packages/detection/src/d01-laboratory.test.ts). The aggregated OT executable cases are in [`../../../../tests/fixtures/alerts/rule-cases.v1.json`](../../../../tests/fixtures/alerts/rule-cases.v1.json). No connected automated test is claimed.

### Required source mappings

| Laboratory evidence | Candidate source | Current classification |
| --- | --- | --- |
| OT closure | `ordenes_trabajo.fecha_fin_ejecucion` | Column exists; closure semantics require connected validation |
| Declared run meters, output width, grammage | `orden_trabajo_salidas.metros_lineales_resultantes`, `ancho_bobina`, `gramaje` | Columns exist; eligibility, aggregation, and units require validation |
| Required layer and sequential reel identity | `orden_trabajo_materiales` plus material-requirement relationships | Layer ownership, sequencing, and coverage pending |
| Initial gross measurement | `balanza_carga_detalle_registros` and `articulo_serial` candidates | Input-reel linkage and measurement authority pending |
| Verified core tare | `balanza_cargas.id_tara_tuco`, `peso_tuco`, and `balanza_carga_taras` where `tipo = TUCO` | Applicable per-reel join, verification, and coverage pending |
| Remnant declaration and gross weight | Article serial, OT closure, and scale-record candidates | Declaration state, identity continuity, and timing pending |
| Candidate linear-meter fields | EmusaSoft closure and reel projections | Existence does not prove the neutral D01 business semantics |

### Blockers and deferred connected tests

- **Connected `test_database` source boundary:** deferred and untested. No D01 query, source fixture write, query plan, index, reset scenario, or source lifecycle was implemented or executed.
- **Connected Monitor polling and incident lifecycle:** deferred and untested. No scheduled poll, Monitor persistence, suppression, recurrence, correlation, routing, or legacy D04 routing cleanup was implemented or executed.
- **Dashboard:** deferred and untested.
- **Chat:** deferred and untested.
- **Production or Phase 10:** deferred and untested. Current source reconciliation, Aurora credentials, write denial, bounded query, load, units, required-layer coverage, core-tare verification, and remnant workflow remain unresolved.
- The protected source-schema validator may confirm only candidate table and column existence when its fixture is available. It cannot prove D01 semantics or connected behavior.

### Approval record

| Date | Explicit decision | Scope | Authoritative destination |
| --- | --- | --- | --- |
| 2026-08-01 | Consolidate both meter directions and pairwise layer disagreement into one OT-level D01; retire D04 without changing D01 key-schema version. | Ownership and identity | Alert catalog, roadmap, executable inventory |
| 2026-08-01 | Use original usable reel meters, used layer meters, declared run meters, and weighed remnant meters as neutral business concepts; do not infer EmusaSoft field semantics. | Terminology and mapping confidence | Alert catalog and executable contract |
| 2026-08-01 | Use initial gross minus verified core tare when no remnant is declared; use initial gross minus weighed remnant gross for a partial reel and never subtract core twice. | Reel conversion | Alert catalog |
| 2026-08-01 | Evaluate only at closure; a declared unweighed remnant is insufficient, while no declared remnant evaluates immediately as fully used. | Evidence timing | Alert catalog |
| 2026-08-01 | Evaluate every required layer independently and compare every layer pair; never sum different layers. | Layer behavior | Alert catalog |
| 2026-08-01 | Retain `min(5% of theoretical order kg, 150 kg)`, use one converted meter tolerance, and treat equality as clear. | Tolerance | Alert catalog and executable contract |
| 2026-08-01 | Use three deterministic reasons in one occurrence and preserve full signed layer and pairwise evidence. | Reasons and evidence | Alert catalog and standalone laboratory |
| 2026-08-01 | D01 may replace or enrich A04 only for the same explained evidence chain; A05 and D03 remain independent, and D01 never suppresses D03. | Correlation | Alert catalog and standalone laboratory |
| 2026-08-01 | Unchanged observations do not duplicate evidence; complete changes update; only complete healthy evidence resolves; insufficient or failed cycles preserve; recurrence requires a proved clear interval. | Lifecycle | Alert catalog and standalone laboratory |

## D02 — Completed OT has delivered reserved reels unconsumed

### Business objective

Prepare deterministic D02 behavior against controlled in-memory snapshots for the approved catalog objective. This block supports preparation only and does not establish connected Phase 7 implementation or prove any connected boundary.

### Authority and existing evidence

The business rule and routing authority is [`../../../product/alert_catalog.md`](../../../product/alert_catalog.md). The executable contract is `config/alerts/alert-rules.v1.json`; Phase 1 fixtures and evidence are `tests/fixtures/alerts/rule-cases.v1.json` and `docs/delivery/phases/phase1/evidence-matrix.md`. Condition lifecycle, healthy-cycle resolution, administrative suppression, and recurrence follow `docs/architecture/system_architecture.md`. The standalone implementation and tests are `packages/detection/src/d02-laboratory.ts` and `packages/detection/src/d02-laboratory.test.ts`.

### Trigger and non-trigger conditions

Scenarios cover the catalog's approved closed-OT completion boundary, exact delivered-reserved-reel identity, zero versus positive consumption, return or reassignment, delivery correction, and partial-production exclusion. Detailed rule prose remains in the catalog.

### Thresholds, units, timing, and tolerances

The standalone laboratory uses exact decimal-string arithmetic for the catalog's approved inclusive 10% production shortfall tolerance. Planned and verified good-output quantities share one non-empty production-unit reference. The injected clock is deterministic; D02 has no elapsed-time threshold.

### Persistence and duplicate prevention

The condition key is `D02:d02-delivered-reel-unconsumed:1:workOrderId=<id>|articleSerialId=<id>`. Repeated healthy trigger evaluations update one occurrence. Different delivered reel serials under the same OT remain separate conditions.

### Correction and automatic resolution

A later healthy standalone evaluation resolves the same occurrence when the approved catalog rule passes because of positive consumption, return or reassignment, corrected delivery or reservation evidence, or completion below the 90% boundary. Missing, invalid, failed, or partial evidence cannot resolve it.

### Administrative closure

Standalone closure requires actor reference, standardized reason, mandatory comment, timestamp, and frozen incident evidence. The same uninterrupted condition remains suppressed until a healthy clear evaluation; no source record is fabricated or changed.

### Recurrence and correlation

A new occurrence for the same key requires explicit source-valid correction evidence showing why a previously cleared reel is validly unconsumed again. Without that evidence, the laboratory returns insufficient. D02 and D03 remain independent even when the same missing-consumption evidence contributes to both predicates.

### Routing expectations

The catalog's general recipients and D02 overrides remain authoritative. The standalone laboratory records no people and sends no delivery: machine-operator ownership applies to missing consumption; material-planner and raw-material warehouse positions are added only when their catalog evidence is implicated. Connected routing evidence is deferred.

### Scenario matrix

| Scenario ID | Starting state | Laboratory action | Expected source state | Expected standalone result | Deferred connected evidence |
| --- | --- | --- | --- | --- | --- |
| D02-00 | Dirty in-memory history | Reset laboratory | Empty controlled state | Repeatable clear baseline | All connected boundaries |
| D02-01 | Closed OT at exactly 90%; delivered reserved reel unused | Evaluate healthy snapshot | Reel remains at machine with zero consumption | Trigger occurrence 1 | Source mapping and polling |
| D02-02 | Closed OT below 90% | Evaluate 89.999% snapshot | Partial production | Clear; D02 excluded | Actual output aggregation |
| D02-03 | OT not closed | Evaluate otherwise-triggering snapshot | OT remains open | Clear | Source closure mapping |
| D02-04 | Reserved reel not delivered | Evaluate healthy snapshot | No delivered reel condition | Clear | Reservation and delivery joins |
| D02-05 | Delivered reel partially consumed | Record any positive consumption | Reel was used partially | Clear | Consumption mapping |
| D02-06 | Unused reel returned | Record return disposition | Reel no longer pending at machine | Clear | Return workflow mapping |
| D02-07 | Unused reel reassigned | Record reassignment disposition | Reel belongs to another use | Clear | Reassignment mapping |
| D02-08 | One condition already open | Repeat unchanged healthy snapshot | Same source condition persists | Same occurrence; no duplicate | Monitor incident persistence |
| D02-09 | D02 occurrence open | Add positive partial consumption | Corrected source evidence | Same occurrence resolves | Normal poller lifecycle |
| D02-10 | D02 occurrence open | Correct completion or delivery evidence | Trigger predicate no longer holds | Same occurrence resolves | Source correction workflow |
| D02-11 | D02 occurrence open | Close administratively with complete audit input | ERP state unchanged | Closed without resolution and suppressed | Monitor authorization and audit |
| D02-12 | Administratively closed condition | Evaluate healthy clear state | Uninterrupted condition ended | Suppression expires | Monitor suppression persistence |
| D02-13 | Prior occurrence resolved | Supply source-valid reversal evidence and re-evaluate trigger | Corrected source again proves unused reel | New occurrence 2 | Source-valid correction mapping |
| D02-14 | Prior occurrence resolved | Recreate trigger without recurrence evidence | Reversal provenance absent | Insufficient; no invented occurrence | Source audit evidence |
| D02-15 | Open occurrence and incomplete/invalid snapshot | Evaluate missing or malformed quantity evidence | Source truth unproven | Insufficient; open state preserved | Query schema validation |
| D02-16 | Open occurrence | Fail evaluation cycle | No healthy source result | Failed state preserves occurrence | Polling and persistence failure |
| D02-17 | D02 trigger also explains a D03 balance gap | Evaluate both independent predicates | Specific missing consumption exists | D02 triggers without suppressing D03 | Connected independent lifecycle evidence |
| D02-18 | Two delivered reels under one OT | Evaluate each serial | Independent reel states | Independent condition keys | Bounded multi-row query |

### Automated test references

`packages/detection/src/d02-laboratory.test.ts` maps test names directly to D02-00 through D02-18. `scripts/phase1/validate-rule-contracts.mjs` validates the compact D02 contract fixtures. Both are standalone only.

### Required source mappings

Backup-confirmed candidates are `pre_reserva_orden_trabajo` for the reservation, `flujo_materiales_detalles` for delivered serial evidence, `orden_trabajo_materiales.cantidad_consumida` for consumption, and `ordenes_trabajo.fecha_fin_ejecucion` plus `cantidad_produccion_planificada` for closure and plan. The actual verified good-output quantity and common unit remain unmapped. Although `ordenes_trabajo.motivo_cierre` exists, its values, operator provenance, and complete-versus-truncated semantics are unverified and are not used by the standalone rule.

### Blockers and deferred connected tests

- Standalone deterministic laboratory: authorized and implemented by this preparation block; validation results must be reported separately.
- Connected `test_database` source boundary: deferred; actual good-output, unit, delivery, consumption, return, reassignment, and recurrence mappings are not validated here.
- Connected Monitor polling and incident lifecycle: deferred; no scheduler, poller, source adapter, incident write, routing, or delivery is exercised.
- Dashboard: deferred and unchanged.
- Chat: deferred and unchanged.
- Production or Phase 10: current schema reconciliation, closure-reason semantics, Aurora credentials, query plan, load, replica, staging, and production behavior remain deferred.

### Approval record

- 2026-08-01 — Product owner approved quantity-based completion: the OT must be closed and verified good output must reach at least 90% of planned production; the 10% shortfall tolerance is inclusive. Because no verified operator complete-versus-truncated signal exists, `motivo_cierre` is not used.
- 2026-08-01 — Product owner approved any valid positive consumption as proof that the delivered reserved reel was used; partial consumption qualifies and the alert does not require consuming the full reel.

## D03 — OT input, good production, and waste do not balance

### Business objective

Prepare deterministic D03 behavior against controlled, fully weighed OT evidence without starting Phase 7 or claiming source integration. The business objective and approved formula remain defined by the [D03 catalog rule](../../../product/alert_catalog.md#d03--ot-input-good-production-and-waste-do-not-balance).

### Authority and existing evidence

- `docs/product/alert_catalog.md` is authoritative for the trigger, all-weighed gate, formula, resolution, administrative closure, independence, and routing rules.
- `config/alerts/alert-rules.v1.json` defines query `d03-work-order-mass-balance`, key-schema version 1, natural key `workOrderId`, reason `mass_balance_gap`, the 5% tolerance, and the two `0.002 kg/m²` theoretical inputs.
- `tests/fixtures/alerts/rule-cases.v1.json` and `scripts/phase1/validate-rule-contracts.mjs` cover one synthetic trigger, clear, and insufficient contract result.
- `docs/delivery/phases/phase1/evidence-matrix.md` classifies D03 as a closure mass-balance rule and records that connected production evidence remains pending.
- The protected July 23 schema confirms the named OT, material, output, serial, and scale fields. The current read-only mapping validation matched 97 fields across 18 tables without printing source rows. Schema presence does not prove the final bounded D03 query, completeness semantics, or deployed production behavior.
- `packages/detection/src/d03-laboratory.ts` and its test file are standalone deterministic code only. They do not call `test_database`, the Monitor poller, routing, Dashboard, Chat, staging, or production.

### Trigger and non-trigger conditions

The scenario matrix covers the catalog rule after OT closure and complete weighing: positive and negative gaps beyond tolerance trigger `Error`; equality and smaller gaps do not. Before closure, with any required weight missing, or with invalid E05 container evidence, no D03 occurrence is created. Other active alerts never suppress D03. Detailed rule prose remains in the catalog.

### Thresholds, units, timing, and tolerances

The tolerance is exactly 5% of net weighed good-production mass and the comparison is strict: equality is clear. The laboratory converts nonnegative kilogram evidence to integer grams, rounds each theoretical ink or adhesive contribution from planned square meters to the nearest gram, and compares `absolute gap grams × 100` with `good-output grams × 5`. Ink and adhesive each contribute `2 g/m²` of planned production area and accumulate to `4 g/m²` when both apply. The injected clock controls lifecycle timestamps but does not alter the closure formula.

### Persistence and duplicate prevention

The condition key is `D03 + d03-work-order-mass-balance + key schema 1 + workOrderId`. Repeated evaluation of one unchanged imbalance retains one stable occurrence and one evidence observation. Changed complete evidence updates the same open occurrence without changing condition identity. `reset()` restores the same in-memory baseline without touching any database.

### Correction and automatic resolution

Per the catalog, corrected material, production, waste, OT-association, or scale evidence resolves D03 automatically when a later healthy complete evaluation places the absolute gap at or below tolerance. Net reel weights already exclude cores; the laboratory never subtracts a core a second time.

### Administrative closure

The standalone closure action requires actor reference, standardized reason, and comment, freezes the final formula evidence on the occurrence, and suppresses the same uninterrupted imbalance. Only a later healthy clear evaluation expires suppression. This is simulated laboratory state and is not a Monitor incident write.

### Recurrence and correlation

A later source-valid correction may clear a closed OT imbalance; if a subsequent complete source-valid correction makes the same OT imbalanced again, the same condition key receives a new occurrence. The standalone laboratory models that sequence, but the connected correction workflow remains unverified. D03 remains independent of every other alert, including when they describe the same source issue. Each alert resolves from its own predicate; one shared source correction may therefore resolve several alerts independently. E05 invalid container evidence blocks D03 rather than contributing impossible negative consumption.

### Routing expectations

The catalog always routes D03 to the factory manager, affected operation shift supervisor, technical leader, and implicated machine operator; suspected scale evidence also adds the Process operator. Other alerts retain their own routing. The standalone laboratory does not resolve people or deliver notifications.

### Scenario matrix

| Scenario ID | Starting state | Laboratory action | Expected source state | Expected standalone result | Deferred connected evidence |
| --- | --- | --- | --- | --- | --- |
| D03-00 | Dirty in-memory laboratory, then reset | Reset the laboratory | Controlled fixture returns to its original values | Repeatable empty occurrence baseline | Source reset and all connected boundaries deferred |
| D03-01 | Fully weighed OT still open | Evaluate before closure | Synthetic OT has no closure timestamp | Clear; no D03 occurrence | OT closure mapping deferred |
| D03-02 | Closed OT with one production reel lacking net weight | Evaluate | Synthetic weighing evidence is incomplete | Insufficient; no `Error posible` and no occurrence | Weighing-completeness query deferred |
| D03-03 | Closed, fully weighed OT; adjusted input exceeds output plus waste | Evaluate 110 kg gap against 65 kg tolerance | Synthetic evidence is complete | One open `Error` occurrence | Connected source and lifecycle deferred |
| D03-04 | Closed, fully weighed OT; output plus waste exceeds adjusted input | Evaluate the negative gap | Synthetic evidence is complete | Absolute gap triggers the same `mass_balance_gap` reason | Connected source and lifecycle deferred |
| D03-05 | Closed, fully weighed OT at exact 5% boundary | Evaluate | Synthetic evidence is complete | Clear because equality does not trigger | Decimal/source precision deferred |
| D03-06 | Closed, fully weighed OT inside tolerance | Evaluate | Synthetic evidence is complete | Clear; no occurrence | Connected non-trigger deferred |
| D03-07 | Printing and lamination both apply to 1,000 planned m² | Calculate theoretical inputs | Ink and adhesive remain unweighed by approved policy | Add 2 kg ink plus 2 kg adhesive cumulatively | Operation and planned-area mapping deferred |
| D03-08 | Weighed production reel reports 1,300 kg net | Evaluate output | Scale net weight already excludes the core | Use 1,300 kg once; no second core deduction | Scale semantics validation deferred |
| D03-09 | One open D03 occurrence | Repeat unchanged evaluation | Synthetic evidence is unchanged | Same occurrence; no duplicate observation | Monitor transaction/delivery deduplication deferred |
| D03-10 | One open D03 occurrence | Correct weighed waste so the gap is within tolerance | Synthetic evidence becomes balanced | Resolve automatically | EmusaSoft correction workflow and polling deferred |
| D03-11 | One open D03 occurrence | Close administratively, then repeat unchanged evaluation | Synthetic source remains imbalanced | Closed without resolution; same uninterrupted condition suppressed | Monitor authorization, audit, and reporting deferred |
| D03-12 | Administratively closed occurrence | Evaluate a healthy clear correction, then a later source-valid imbalance | Synthetic evidence clears and later requalifies | Suppression expires; occurrence 2 opens | Connected correction/recurrence validity deferred |
| D03-13 | Fully weighed gap while A06, D01, or D02 is also active | Evaluate D03 with other-alert context | Multiple predicates describe related evidence | D03 still triggers one independent occurrence | Connected independent lifecycle evidence deferred |
| D03-14 | Extrusion evidence would create negative container consumption | Evaluate with invalid container balance | E05 source invariant is unresolved | Insufficient and blocked by E05 | E05 source mapping and connected ordering deferred |
| D03-15 | One open D03 occurrence | Remove a required later weight | Synthetic cycle evidence becomes incomplete | Insufficient; prior occurrence remains open | Schema validation and incomplete-cycle telemetry deferred |
| D03-16 | One open D03 occurrence | Run a failed laboratory cycle after a balancing correction | Source evaluation fails | Prior occurrence remains open | Adapter, database, and Monitor failed-cycle evidence deferred |
| D03-17 | OT with and without theoretical inputs | Remove planned-area evidence | Area is absent | Required only when ink or adhesive applies; otherwise calculation proceeds | Planned-area source mapping deferred |

### Automated test references

`packages/detection/src/d03-laboratory.test.ts` maps test names directly to D03-00 through D03-17. All are standalone deterministic tests. Existing generic contract coverage remains in `packages/contracts/src/repository-contracts.test.ts` through the Phase 1 validator.

### Required source mappings

- OT identity and closure: `ordenes_trabajo.id` and `fecha_fin_ejecucion` are backup-confirmed; the final closure predicate remains unconnected.
- Planned production area: `ordenes_trabajo.metros_lineales_planificados` and `ancho_teorico_bobina` are backup-confirmed candidate inputs. Their multiplication, unit conversion, operation applicability, and completeness require the later query contract.
- Other measured raw material: `orden_trabajo_materiales.cantidad_consumida` and `tipo_materia_prima` are backup-confirmed candidate fields. Ink and adhesive use the approved theoretical contributions rather than measured weight.
- Production and waste identity/completeness: `orden_trabajo_salidas`, `articulo_serial`, and the output unweighed counters are backup-confirmed candidate fields.
- Production and waste kilograms: non-deleted `balanza_carga_detalle_registros.peso_neto` is the candidate measured source. Production net weight already excludes core by approved business rule.
- E05 validity is a controlled standalone input. Other-alert context proves D03 independence but does not affect its predicate; connected ordering and joins are deferred.

### Blockers and deferred connected tests

- **Standalone deterministic laboratory:** implemented for the scenario matrix; passing tests are evidence only for pure in-memory behavior.
- **Connected `test_database` source boundary:** not executed. The bounded D03 query, all-weighed completeness, planned-area calculation, operation applicability, source joins, E05 ordering, and representative fixtures remain deferred.
- **Connected Monitor polling and incident lifecycle:** not executed; it remains Phase 7 connected work after the completed Phase 6 baseline.
- **Dashboard:** not executed.
- **Chat:** not executed.
- **Production or Phase 10:** not executed. Current source reconciliation, Aurora credentials, read-only enforcement, query plans/load, scale semantics, correction behavior, and any future authoritative EmusaSoft imbalance state remain unvalidated.

This standalone preparation cannot satisfy the Phase 7 connected exit gate.

### Approval record

- 2026-08-05 — The product manager decided that D03 is never suppressed by another alert. Related incidents remain independent and resolve when their own predicates clear or through their own audited administrative closure.

- 2026-08-01 — The user approved that Monitor calculates D03 until an authoritative EmusaSoft OT-level imbalance state and its semantics are verified; there is no source fallback in the current rule.
- 2026-08-01 — The user approved that D03 waits for all applicable production, waste, and non-ink/non-adhesive raw-material weights, produces only `Error`, and has no `Error posible` path.
- 2026-08-01 — The user approved theoretical ink and adhesive at `2 g/m²` each because those two raw materials are not weighed. They accumulate to `4 g/m²` when both apply and use planned production area.
- 2026-08-01 — The user confirmed that the scale supplies production-reel weight net of the core; Monitor must not deduct core weight again.
