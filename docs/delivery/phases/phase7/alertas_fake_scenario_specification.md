# Phase 7 `alertas_fake` scenario specification

**Role:** Supporting preparation document only

**Status:** Supporting preparation; D01 standalone rules approved and implemented, connected boundaries deferred

**Execution authority:** [`../phase6/README.md`](../phase6/README.md) remains the current phase execution authority

**Project sequencing authority:** [`../../../roadmap.md`](../../../roadmap.md)

## Purpose and boundary

This document holds consistent laboratory scenario specifications for A01, B01, B02, B03, D01, D02, D03, and D04 as each alert is audited individually. It is not current execution authority, does not start Phase 7, does not satisfy the Phase 6 exit gate, and is not evidence that Phase 7 or any alert has passed.

Add one alert at a time with `$monitor-alert-rule-workflow`, using the skill's reusable template and `<ALERT_CODE>-<NN>` scenario identifiers. Approved business rules remain authoritative only in [`../../../product/alert_catalog.md`](../../../product/alert_catalog.md); this document records laboratory preparation and evidence mapping without duplicating those rules.

Standalone laboratory results recorded below remain distinct from connected `test_database`, Monitor polling and incident lifecycle, Dashboard, Chat, and production or Phase 10 evidence.

## D01 — Declared meters exceed consumed-reel meters

### Business objective

Prepare deterministic standalone coverage for the approved D01 closure rule in [`../../../product/alert_catalog.md`](../../../product/alert_catalog.md). The laboratory evaluates whether every required substrate layer can support the OT's declared run meters within the approved kilogram-derived tolerance. It does not prove any connected source, polling, incident, routing, or interface boundary.

### Authority and existing evidence

- The catalog owns D01 meaning, formulas, tolerance, resolution, administrative closure, correlation, and routing.
- [`../../../architecture/system_architecture.md`](../../../architecture/system_architecture.md) owns condition identity, occurrence lifecycle, healthy-cycle resolution, failed-cycle preservation, recurrence, and suppression.
- [`../../../../config/alerts/alert-rules.v1.json`](../../../../config/alerts/alert-rules.v1.json) provides query ID `d01-declared-meters-over-input`, OT natural key, key-schema version `1`, approved tolerance parameters, and the normalized executable predicate.
- [`../../../../tests/fixtures/alerts/rule-cases.v1.json`](../../../../tests/fixtures/alerts/rule-cases.v1.json) covers normalized triggered, equality-boundary clear, and insufficient outcomes.
- [`../../../../packages/detection/src/d01-laboratory.ts`](../../../../packages/detection/src/d01-laboratory.ts) is a pure in-memory Phase 7 preparation laboratory. It has no source adapter, scheduler, Monitor incident write, routing delivery, Dashboard state, or Chat state.
- The protected source-schema validator passed against `staging_emusa_core-20260723-025548` for the active contract's 104 fields across 20 tables without printing data rows. This confirms that candidate weight, tare, output-meter, width, and grammage columns exist; it does not prove their D01 semantics, complete coverage, or joins.
- An authenticated read-only EmusaSoft MCP audit on 2026-08-01 confirmed that `getWorkOrderClosureById` exposes `workOrderMaterials.consumedLinearMeters`, `quantityConsumed`, `reelWidth`, `grammage`, `differenceType`, and `closureActionType`. The catalog exposes consumption and return mutations whose inputs are quantities, not an explicit last-partial-reel meter declaration. It did not expose a closure mutation or form contract proving that the operator must declare the meters used from the last partially consumed reel.
- The MCP endpoint reported catalog schema version `1`, generated 2026-07-10, while the active integration evidence records catalog version `5` from 2026-07-23. This discrepancy blocks treating the 2026-08-01 MCP result as a current complete workflow contract.

### Trigger and non-trigger conditions

Scenarios reference the complete approved rule in the catalog. D01 evaluates only after OT closure. It triggers when at least one required substrate layer's declared-versus-consumed meter gap strictly exceeds the output-equivalent tolerance. Equality is clear. Different required layers are never summed together. One OT occurrence identifies every deficient layer.

### Thresholds, units, timing, and tolerances

- Kilograms, meters, width in meters, and grammage in grams per square meter are normalized before evaluation.
- Theoretical order kilograms are derived from declared output meters, width, and grammage without waiting for produced reels to be weighed.
- Allowed kilograms are the lower of 5% of theoretical order kilograms and 150 kg.
- Allowed kilograms are converted to output-equivalent meters before comparison with the layer meter gap.
- The standalone clock is fixed by each fixture and changes only through an explicit laboratory action.

### Persistence and duplicate prevention

The condition key is `D01:d01-declared-meters-over-input:1:workOrderId=<id>`. Repeated unchanged complete evaluations preserve one open occurrence. Evidence changes update that occurrence without creating a duplicate. Multiple deficient layers remain evidence on one OT-level occurrence.

### Correction and automatic resolution

Complete corrected weight, tare, remnant, width, grammage, or output evidence resolves D01 on a later healthy evaluation when every layer is within tolerance. A partial reel without a weighed remnant is insufficient and cannot resolve an existing occurrence.

### Administrative closure

The standalone laboratory requires reason, mandatory comment, actor reference, timestamp, and frozen deficient-layer evidence. Closure suppresses only the same uninterrupted condition. It does not alter or fabricate source evidence.

### Recurrence and correlation

A healthy clear evaluation expires administrative suppression or resolves an open occurrence. A later triggered evaluation creates a new occurrence. A triggered D01 is the specific deterministic explanation that suppresses a duplicate D03 for the same OT; the correlation remains visible.

### Routing expectations

The catalog routes D01 through the general distribution rules with the machine operator as primary action owner. Routing execution and recipient resolution are not part of this standalone laboratory and remain deferred.

### Scenario matrix

| Scenario ID | Starting state | Laboratory action | Expected source state | Expected standalone result | Deferred connected evidence |
| --- | --- | --- | --- | --- | --- |
| D01-00 | Controlled open OT baseline | Poll, mutate, then reset | Fixture returns byte-for-byte to baseline | No pre-closure trigger; repeatable reset | All connected boundaries |
| D01-01 | Closed OT; one layer exceeds tolerance | Evaluate complete fixture | No external source mutation | One triggered D01 with normalized totals | Source query and lifecycle |
| D01-02 | Layer gap equals allowed meters | Evaluate complete fixture | No external source mutation | Clear because threshold is strict `>` | Source boundary |
| D01-03 | Large OT whose 5% value exceeds 150 kg | Evaluate complete fixture | No external source mutation | Tolerance capped at 150 kg | Source boundary |
| D01-04 | Two required layers each short | Evaluate layers independently | No external source mutation | Both layers deficient; meters are not summed across layers | Layer-source mapping |
| D01-05 | Fully consumed reel with verified core tare | Convert gross minus tare | No external source mutation | Correct net mass and consumed meters | Core-tare join and coverage |
| D01-06 | Partially consumed reel with weighed remnant | Subtract remnant gross from initial gross | No external source mutation | Core cancels; correct consumed meters | Remnant lifecycle mapping |
| D01-07 | Open D01 followed by an unweighed partial remnant | Evaluate incomplete evidence | No external source mutation | Insufficient; prior occurrence preserved | Weighing workflow and polling |
| D01-08 | Fully consumed reel without core tare | Evaluate incomplete evidence | No external source mutation | Insufficient; no invented tare | Core-tare source contract |
| D01-09 | Unchanged triggered condition | Poll twice | No external source mutation | One occurrence and one unchanged observation | Monitor deduplication |
| D01-10 | Open D01 followed by complete correction | Replace fixture evidence and poll | No external source mutation | Automatic resolution | Source correction and lifecycle |
| D01-11 | Open D01 with unreconstructable locked history | Administratively close | No external source mutation | Required audit fields frozen; uninterrupted condition suppressed | Monitor authorization and audit |
| D01-12 | Administratively closed D01, then healthy clear, then return | Poll clear and later trigger | No external source mutation | New occurrence only after proved clear interval | Source-valid recurrence |
| D01-13 | Open D01 followed by failed cycle | Poll failed cycle | No external source mutation | Existing occurrence preserved | Poller failure behavior |
| D01-14 | Triggered D01 with possible D03 | Evaluate correlation | No external source mutation | Suppress duplicate D03 only for same OT | Connected incident correlation |
| D01-15 | Multiple deficient layers on one OT | Poll complete fixture | No external source mutation | One OT occurrence lists all deficient layers | Monitor evidence persistence |

### Automated test references

Standalone scenarios D01-00 through D01-15 map one-to-one to test names in [`../../../../packages/detection/src/d01-laboratory.test.ts`](../../../../packages/detection/src/d01-laboratory.test.ts). The Phase 1 normalized predicate fixtures remain in [`../../../../tests/fixtures/alerts/rule-cases.v1.json`](../../../../tests/fixtures/alerts/rule-cases.v1.json). No connected automated test is claimed.

### Required source mappings

| Laboratory evidence | Candidate source | Current classification |
| --- | --- | --- |
| OT closure | `ordenes_trabajo.fecha_fin_ejecucion` | Column exists; closure semantics require connected contract validation |
| Declared output meters, width, grammage | `orden_trabajo_salidas.metros_lineales_resultantes`, `ancho_bobina`, `gramaje` | Columns exist; row eligibility and units require validation |
| Required substrate-layer identity | `orden_trabajo_materiales` plus material-requirement relationships | Relationship semantics pending |
| Reel gross, tare, and net measurements | `balanza_carga_detalle_registros` and `articulo_serial` candidates | Columns exist; input-reel linkage and measurement authority pending |
| Core tare | `balanza_cargas.id_tara_tuco`, `peso_tuco`, and `balanza_carga_taras` where `tipo = TUCO` | Schema candidate exists; applicable per-reel join and coverage pending |
| Partial remnant gross weight | Article serial and scale records for the returned remnant | Exact source-valid lifecycle mapping pending |
| MCP closure projection | `getWorkOrderClosureById.workOrderMaterials` | Fields exposed; manual last-reel meter declaration not proven |

### Blockers and deferred connected tests

- **Connected `test_database` source boundary:** deferred. No D01 query, fixture write, query plan, index, reset scenario, or source lifecycle was executed.
- **Connected Monitor polling and incident lifecycle:** deferred. No scheduled poll, Monitor persistence, suppression, recurrence, routing, or D03 correlation was executed.
- **Dashboard:** deferred.
- **Chat:** deferred.
- **Production or Phase 10:** deferred. Current source reconciliation, Aurora credentials, write denial, bounded query, load, units, core-tare coverage, remnant workflow, and MCP catalog-version discrepancy remain unresolved.
- The EmusaSoft MCP does not currently prove that OT closure requires a manual declaration of meters used from the final partially consumed reel. Until a current workflow contract proves otherwise, D01 requires a weighed remnant for exact partial-reel consumption and treats an unweighed remnant as insufficient.

### Approval record

| Date | Explicit decision | Scope | Authoritative destination |
| --- | --- | --- | --- |
| 2026-08-01 | Convert net kilograms to meters using width and grammage normalized to kg/m². | D01 consumed-reel conversion | Alert catalog |
| 2026-08-01 | For a fully consumed reel, use measured gross mass minus verified core tare when the source provides it. | D01 core treatment | Alert catalog |
| 2026-08-01 | Derive total order kilograms from declared closure meters, output width, and output grammage because finished reels may remain unweighed. | D01 tolerance basis | Alert catalog |
| 2026-08-01 | Use `min(5% of total order kg, 150 kg)` and convert it to equivalent output meters. | D01 tolerance | Alert catalog and executable contract |
| 2026-08-01 | Evaluate every required substrate layer independently; summing meters across layers is invalid. | D01 layer behavior | Alert catalog |
| 2026-08-01 | For a partial reel, exact consumption requires the remnant gross weight; without a weighed remnant D01 is insufficient. | D01 partial-reel behavior | Alert catalog |
