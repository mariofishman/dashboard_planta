# Phase 7 `alertas_fake` scenario specification

**Role:** Supporting preparation document only

**Status:** B02 preparation recorded; Phase 7 remains blocked by the Phase 6 exit gate

**Execution authority:** [`../phase6/README.md`](../phase6/README.md) remains the current phase execution authority

**Project sequencing authority:** [`../../../roadmap.md`](../../../roadmap.md)

## Purpose and boundary

This document will hold consistent laboratory scenario specifications for A01, B01, B02, B03, D01, D02, D03, and D04 after each alert is audited individually. It is not current execution authority, does not start Phase 7, does not satisfy the Phase 6 exit gate, and is not evidence that Phase 7 or any alert has passed.

The B02 block below is Phase 7 preparation only. Add later alerts one at a time with `$monitor-alert-rule-workflow`, using the skill's reusable template and `<ALERT_CODE>-<NN>` scenario identifiers. Approved business rules remain authoritative only in [`../../../product/alert_catalog.md`](../../../product/alert_catalog.md); this document records laboratory preparation and evidence mapping without duplicating those rules.

Standalone laboratory results, when later added, must remain distinct from connected `test_database`, Monitor polling and incident lifecycle, Dashboard, Chat, and production or Phase 10 evidence.

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
- Phase 7 remains blocked by the Phase 6 exit gate. This preparation cannot change phase status or satisfy any connected gate.

### Approval record

- 2026-08-01 — Approved two independent alerts when another condition coexists with B02. Monitor must not infer causation, store a cross-alert link, bundle notifications, suppress either alert, or couple their lifecycles.
- 2026-08-01 — Approved one independent B02 situation per approved plan version. Rescheduling resolves the old missed commitment; missing the new commitment creates and preserves a separate occurrence.
- 2026-08-01 — Approved exactly two normal B02 resolution paths: the OT starts, even late, or an approved full-plan update supersedes the commitment. Equipment pauses and unrelated actions do not resolve it.
- 2026-08-01 — Approved an update that removes or cancels the OT as a superseding full-plan update that resolves the old B02 occurrence.
