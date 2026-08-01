# Phase 7 `alertas_fake` scenario specification

**Role:** Supporting preparation document only

**Status:** B03 preparation recorded; Phase 7 remains blocked by the Phase 6 exit gate

**Execution authority:** [`../phase6/README.md`](../phase6/README.md) remains the current phase execution authority

**Project sequencing authority:** [`../../../roadmap.md`](../../../roadmap.md)

## Purpose and boundary

This document will hold consistent laboratory scenario specifications for A01, B01, B02, B03, D01, D02, D03, and D04 after each alert is audited individually. It is not current execution authority, does not start Phase 7, does not satisfy the Phase 6 exit gate, and is not evidence that Phase 7 or any alert has passed.

The B03 block below is Phase 7 preparation only. Add later alerts one at a time with `$monitor-alert-rule-workflow`, using the skill's reusable template and `<ALERT_CODE>-<NN>` scenario identifiers. Approved business rules remain authoritative only in [`../../../product/alert_catalog.md`](../../../product/alert_catalog.md); this document records laboratory preparation and evidence mapping without duplicating those rules.

Standalone laboratory results, when later added, must remain distinct from connected `test_database`, Monitor polling and incident lifecycle, Dashboard, Chat, and production or Phase 10 evidence.

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
- Phase 7 remains blocked by the Phase 6 exit gate. This preparation cannot change phase status or satisfy any connected gate.

### Approval record

- 2026-08-01 — Confirmed that an in-OT pause remains an active OT and is outside B03.
- 2026-08-01 — Confirmed that B03 has no separate machine-downtime pause state between OTs: either an approved plan-level suspension makes production not expected, or no suspension exists and the continuous no-active-OT clock applies.
- 2026-08-01 — Confirmed that an approved whole-day or plan-level suspension resolves B03 immediately and is recorded at the production-planning level by a planner or supervisor, not by an operator.
- 2026-08-01 — Approved the Planner as B03 primary action owner.
