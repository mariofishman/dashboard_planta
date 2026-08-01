# Phase 7 `alertas_fake` scenario specification

**Role:** Supporting preparation document only

**Status:** Supporting preparation; consolidated D01 standalone laboratory prepared, connected boundaries deferred

**Execution authority:** [`../phase6/README.md`](../phase6/README.md) remains the current phase execution authority

**Project sequencing authority:** [`../../../roadmap.md`](../../../roadmap.md)

## Purpose and boundary

This document holds consistent laboratory scenario specifications for A01, B01, B02, B03, D01, D02, and D03 as each active alert is audited. D04 was retired into D01 on 2026-08-01. This document is not execution authority, does not start Phase 7, does not satisfy the Phase 6 exit gate, and is not evidence that Phase 7 or any alert has passed.

Approved business rules remain authoritative only in [`../../../product/alert_catalog.md`](../../../product/alert_catalog.md). Standalone laboratory results remain distinct from connected `test_database`, Monitor polling and incident lifecycle, Dashboard, Chat, and production or Phase 10 evidence.

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

A healthy clear evaluation expires suppression or resolves an open occurrence. A later triggered evaluation creates a new occurrence. D01 replaces or enriches A04 or D03 only when the same OT evidence chain is deterministically explained. Independent A04 capacity, A05 handling, and D03 mass-balance conditions remain distinct.

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
| D01-14 | D01 and D03 candidates | Classify correlation | No external mutation | Suppress D03 only for same OT and evidence chain | Connected incident correlation |
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
| 2026-08-01 | D01 replaces or enriches A04 or D03 only for the same explained evidence chain; independent A04, A05, and D03 conditions remain distinct. | Correlation | Alert catalog and standalone laboratory |
| 2026-08-01 | Unchanged observations do not duplicate evidence; complete changes update; only complete healthy evidence resolves; insufficient or failed cycles preserve; recurrence requires a proved clear interval. | Lifecycle | Alert catalog and standalone laboratory |
