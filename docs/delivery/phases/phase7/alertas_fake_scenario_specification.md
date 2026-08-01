# Phase 7 `alertas_fake` scenario specification

**Role:** Supporting preparation document only

**Status:** D03 preparation recorded; Phase 7 remains blocked by the Phase 6 exit gate

**Execution authority:** [`../phase6/README.md`](../phase6/README.md) remains the current phase execution authority

**Project sequencing authority:** [`../../../roadmap.md`](../../../roadmap.md)

## Purpose and boundary

This document will hold consistent laboratory scenario specifications for A01, B01, B02, B03, D01, D02, D03, and D04 after each alert is audited individually. It is not current execution authority, does not start Phase 7, does not satisfy the Phase 6 exit gate, and is not evidence that Phase 7 or any alert has passed.

The D03 block below is Phase 7 preparation only. Add later alerts one at a time with `$monitor-alert-rule-workflow`, using the skill's reusable template and `<ALERT_CODE>-<NN>` scenario identifiers. Approved business rules remain authoritative only in [`../../../product/alert_catalog.md`](../../../product/alert_catalog.md); this document records laboratory preparation and evidence mapping without duplicating those rules.

Standalone laboratory results, when later added, must remain distinct from connected `test_database`, Monitor polling and incident lifecycle, Dashboard, Chat, and production or Phase 10 evidence.

## D03 — OT input, good production, and waste do not balance

### Business objective

Prepare deterministic D03 behavior against controlled, fully weighed OT evidence without starting Phase 7 or claiming source integration. The business objective and approved formula remain defined by the [D03 catalog rule](../../../product/alert_catalog.md#d03--ot-input-good-production-and-waste-do-not-balance).

### Authority and existing evidence

- `docs/product/alert_catalog.md` is authoritative for the trigger, all-weighed gate, formula, resolution, administrative closure, correlation, and routing rules.
- `config/alerts/alert-rules.v1.json` defines query `d03-work-order-mass-balance`, key-schema version 1, natural key `workOrderId`, reason `mass_balance_gap`, the 5% tolerance, and the two `0.002 kg/m²` theoretical inputs.
- `tests/fixtures/alerts/rule-cases.v1.json` and `scripts/phase1/validate-rule-contracts.mjs` cover one synthetic trigger, clear, and insufficient contract result.
- `docs/delivery/phases/phase1/evidence-matrix.md` classifies D03 as a closure mass-balance rule and records that connected production evidence remains pending.
- The protected July 23 schema confirms the named OT, material, output, serial, and scale fields. The current read-only mapping validation matched 97 fields across 18 tables without printing source rows. Schema presence does not prove the final bounded D03 query, completeness semantics, or deployed production behavior.
- `packages/detection/src/d03-laboratory.ts` and its test file are standalone deterministic code only. They do not call `test_database`, the Monitor poller, routing, Dashboard, Chat, staging, or production.

### Trigger and non-trigger conditions

The scenario matrix covers the catalog rule after OT closure and complete weighing: positive and negative gaps beyond tolerance trigger `Error`; equality and smaller gaps do not. Before closure, with any required weight missing, with invalid E05 container evidence, or when a specific alert owns the same cause, no D03 occurrence is created. Detailed rule prose remains in the catalog.

### Thresholds, units, timing, and tolerances

The tolerance is exactly 5% of net weighed good-production mass and the comparison is strict: equality is clear. The laboratory converts nonnegative kilogram evidence to integer grams, rounds each theoretical ink or adhesive contribution from planned square meters to the nearest gram, and compares `absolute gap grams × 100` with `good-output grams × 5`. Ink and adhesive each contribute `2 g/m²` of planned production area and accumulate to `4 g/m²` when both apply. The injected clock controls lifecycle timestamps but does not alter the closure formula.

### Persistence and duplicate prevention

The condition key is `D03 + d03-work-order-mass-balance + key schema 1 + workOrderId`. Repeated evaluation of one unchanged imbalance retains one stable occurrence and one evidence observation. Changed complete evidence updates the same open occurrence without changing condition identity. `reset()` restores the same in-memory baseline without touching any database.

### Correction and automatic resolution

Per the catalog, corrected material, production, waste, OT-association, or scale evidence resolves D03 automatically when a later healthy complete evaluation places the absolute gap at or below tolerance. Net reel weights already exclude cores; the laboratory never subtracts a core a second time.

### Administrative closure

The standalone closure action requires actor reference, standardized reason, and comment, freezes the final formula evidence on the occurrence, and suppresses the same uninterrupted imbalance. Only a later healthy clear evaluation expires suppression. This is simulated laboratory state and is not a Monitor incident write.

### Recurrence and correlation

A later source-valid correction may clear a closed OT imbalance; if a subsequent complete source-valid correction makes the same OT imbalanced again, the same condition key receives a new occurrence. The standalone laboratory models that sequence, but the connected correction workflow remains unverified. A03, A04, A05, A06, A07, D01, D02, or D04 owns a specifically explained cause and suppresses a duplicate D03. E05 invalid container evidence blocks D03 rather than contributing impossible negative consumption.

### Routing expectations

The catalog always routes D03 to the factory manager, affected operation shift supervisor, technical leader, and implicated machine operator. A specific linked alert inherits its deterministic owner; suspected scale evidence also adds the Process operator. The standalone laboratory records correlation codes only and does not resolve people or deliver notifications.

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
| D03-13 | Fully weighed gap with explanatory A06 evidence | Evaluate duplicate correlation codes | Specific synthetic cause owns the gap | Correlate once and create no D03 occurrence | Cross-rule incident correlation deferred |
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
- E05 validity and specific-cause correlations are controlled standalone inputs. Their connected ordering and joins are deferred.

### Blockers and deferred connected tests

- **Standalone deterministic laboratory:** implemented for the scenario matrix; passing tests are evidence only for pure in-memory behavior.
- **Connected `test_database` source boundary:** not executed. The bounded D03 query, all-weighed completeness, planned-area calculation, operation applicability, source joins, E05 ordering, and representative fixtures remain deferred.
- **Connected Monitor polling and incident lifecycle:** not executed; Phase 7 remains blocked by the Phase 6 exit gate.
- **Dashboard:** not executed.
- **Chat:** not executed.
- **Production or Phase 10:** not executed. Current source reconciliation, Aurora credentials, read-only enforcement, query plans/load, scale semantics, correction behavior, and any future authoritative EmusaSoft imbalance state remain unvalidated.

This preparation does not change roadmap or phase status and cannot satisfy the Phase 6 or Phase 7 exit gate.

### Approval record

- 2026-08-01 — The user approved that Monitor calculates D03 until an authoritative EmusaSoft OT-level imbalance state and its semantics are verified; there is no source fallback in the current rule.
- 2026-08-01 — The user approved that D03 waits for all applicable production, waste, and non-ink/non-adhesive raw-material weights, produces only `Error`, and has no `Error posible` path.
- 2026-08-01 — The user approved theoretical ink and adhesive at `2 g/m²` each because those two raw materials are not weighed. They accumulate to `4 g/m²` when both apply and use planned production area.
- 2026-08-01 — The user confirmed that the scale supplies production-reel weight net of the core; Monitor must not deduct core weight again.
