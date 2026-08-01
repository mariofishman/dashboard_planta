# Phase 7 `alertas_fake` scenario specification

**Role:** Supporting preparation document only

**Status:** Supporting preparation contains the approved D02 standalone laboratory specification; Phase 7 remains blocked

**Execution authority:** [`../phase6/README.md`](../phase6/README.md) remains the current phase execution authority

**Project sequencing authority:** [`../../../roadmap.md`](../../../roadmap.md)

## Purpose and boundary

This document will hold consistent laboratory scenario specifications for A01, B01, B02, B03, D01, D02, D03, and D04 after each alert is audited individually. It is not current execution authority, does not start Phase 7, does not satisfy the Phase 6 exit gate, and is not evidence that Phase 7 or any alert has passed.

Add one alert at a time with `$monitor-alert-rule-workflow`, using the skill's reusable template and `<ALERT_CODE>-<NN>` scenario identifiers. Approved business rules remain authoritative only in [`../../../product/alert_catalog.md`](../../../product/alert_catalog.md); this document records laboratory preparation and evidence mapping without duplicating those rules.

Standalone laboratory results, when later added, must remain distinct from connected `test_database`, Monitor polling and incident lifecycle, Dashboard, Chat, and production or Phase 10 evidence.

## D02 — Completed OT has delivered reserved reels unconsumed

### Business objective

Prepare deterministic D02 behavior against controlled in-memory snapshots for the approved catalog objective. This block supports preparation only and does not start Phase 7 or prove any connected boundary.

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

A new occurrence for the same key requires explicit source-valid correction evidence showing why a previously cleared reel is validly unconsumed again. Without that evidence, the laboratory returns insufficient. A triggered D02 emits the expected correlation instruction to suppress duplicate D03 for the same missing-consumption imbalance.

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
| D02-17 | D02 trigger also explains balance gap | Evaluate correlation | Specific missing consumption exists | D02 trigger plus duplicate-D03 suppression instruction | Cross-rule incident correlation |
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
