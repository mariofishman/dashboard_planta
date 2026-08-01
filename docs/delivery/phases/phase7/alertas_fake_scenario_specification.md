# Phase 7 `alertas_fake` scenario specification

**Role:** Supporting preparation document only

**Status:** B01 preparation recorded; Phase 7 remains blocked by the Phase 6 exit gate

**Execution authority:** [`../phase6/README.md`](../phase6/README.md) remains the current phase execution authority

**Project sequencing authority:** [`../../../roadmap.md`](../../../roadmap.md)

## Purpose and boundary

This document will hold consistent laboratory scenario specifications for A01, B01, B02, B03, D01, D02, D03, and D04 after each alert is audited individually. It is not current execution authority, does not start Phase 7, does not satisfy the Phase 6 exit gate, and is not evidence that Phase 7 or any alert has passed.

The B01 block below is Phase 7 preparation only. Add later alerts one at a time with `$monitor-alert-rule-workflow`, using the skill's reusable template and `<ALERT_CODE>-<NN>` scenario identifiers. Approved business rules remain authoritative only in [`../../../product/alert_catalog.md`](../../../product/alert_catalog.md); this document records laboratory preparation and evidence mapping without duplicating those rules.

Standalone laboratory results, when later added, must remain distinct from connected `test_database`, Monitor polling and incident lifecycle, Dashboard, Chat, and production or Phase 10 evidence.

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

The scenario matrix covers the catalog predicate: a started OT triggers when it differs from the next approved OT and no valid sequence update existed before start. It covers both non-trigger paths, missing evidence, and a valid late explanation. Detailed rule prose remains in the catalog.

### Thresholds, units, timing, and tolerances

B01 has no elapsed-time threshold, quantity, unit, or tolerance. The deterministic boundary is the EmusaSoft-derived fact `sequenceUpdatedBeforeStart`; the standalone laboratory does not invent timestamp precision or authorization semantics for that fact. Its clock is injected and fixed by each test.

### Persistence and duplicate prevention

The condition key is `B01 + b01-plan-sequence-deviation + key schema 1 + workOrderId`. Repeated evaluation of one continuing deviation retains one stable occurrence and incident ID. `reset()` returns the in-memory laboratory to the same empty baseline without touching any database.

### Correction and automatic resolution

Per the approved catalog rule, a valid late plan update with an actor reference and reason resolves the standalone B01 occurrence. The laboratory preserves the expected OT, started OT, actual start time, and late-update evidence; it does not rewrite the original deviation.

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
| B01-05 | One open B01 occurrence | Supply a valid late update, actor reference, and reason | Synthetic plan evidence now explains the deviation | Resolved; original deviation and late update both preserved | EmusaSoft correction workflow and Monitor resolution deferred |
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

This preparation does not change roadmap or phase status and cannot satisfy the Phase 6 or Phase 7 exit gate.

### Approval record

- 2026-07-31 — The user approved option A: when a valid plan update and reason are recorded after B01 has fired, resolve the incident while preserving the original deviation and audit history. Recorded in the B01 catalog resolution.
- 2026-07-31 — A proposed question about who may authorize an EmusaSoft plan change was withdrawn because it is an EmusaSoft business rule, not a Monitor decision. The source authorization and validity mapping remain deferred; Monitor adds no authorization rule.
