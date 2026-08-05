# Phase 1 evidence, units, timestamps, and assumptions

## Universal contract rules

- Evidence is sufficient only when every field in a rule's `requiredEvidence` list is present. A legitimate `null`, such as a missing receipt timestamp, is still evidence; an absent field is not.
- Insufficient evidence produces `insufficient`. It must not create an incident and must not be treated as proof that an existing condition cleared.
- The condition key is `alert code + query ID + key-schema version + normalized natural-key values`.
- A continuing condition keeps one occurrence. A complete healthy evaluation that passes resolves it. A later recurrence creates a new occurrence.
- `sourceTimestamp` uses the authoritative operational event when the mapping is confirmed. Otherwise Monitor records `firstSeenAt` and keeps the timestamp mapping pending for Phase 10.
- Quantities are normalized before evaluation: kilograms, meters, minutes, and fractions. Production code must use decimal arithmetic for auditable quantity calculations.

## Per-rule matrix

| Rule | Final classification | Natural key | Sufficient evidence | Timestamp and units | Local status |
|---|---|---|---|---|---|
| A01 | Deadline + deterministic | OT + material requirement | Planned start, availability, reservation, dispatch | Planned start; minutes | Fixture proven; availability/dispatch mapping pending |
| A02 | Deadline + deterministic | Material-flow detail | OT reservation, transit state, receipt value, elapsed time | Flow creation as candidate send time; minutes | Query and fixture proven locally |
| A03 | Deadline + deterministic | OT | Active state, actual start age, consumption count, A07 state | Actual start; minutes | Fixture proven; active-state semantics pending |
| A04 | Physical + statistical | OT | Input, output, waste, rewinder capacity, tolerance | Evaluation time; kilograms | Fixture proven; capacity/tolerance pending |
| A05 | Deadline + deterministic | Article serial | Declaration age, weight, OT completion, movement | Serial declaration; minutes | Query and fixture proven locally |
| A06 | Deadline + deterministic + statistical | OT | Waste declaration/age/weight and balance signal | Waste declaration or OT closure; minutes and kilograms | Fixture proven; undeclared-waste signal pending; D03 remains independent |
| A07 | Physical + statistical | OT | Good output, waste, declared input, tolerance | Latest contributing evidence; kilograms | Fixture proven; tolerance/evidence policy pending |
| B01 | Deterministic | OT | Actual start, latest-plan next OT, prior sequence update | Actual OT start | Fixture proven; approved-plan source pending |
| B02 | Deadline + deterministic | OT + plan version | Planned deadline, actual start, approved reschedule | Planned start | Fixture proven; plan-version semantics pending |
| B03 | Deadline + deterministic | Machine + schedule window | Expected operation, active OT, exclusions, idle age | Start of unexplained interval; minutes | Fixture proven; schedule/exclusion source pending |
| C01 | Physical + statistical | Article serial | Weight, bounds, sample size | Scale record; kilograms | Fixture proven; model segmentation pending |
| C02 | Statistical | OT | Waste weight, bounds, sample size | OT closure/latest waste weight; kilograms | Fixture proven; baseline version pending |
| C06 | Physical + statistical | OT | Output, effective runtime, rate bounds | OT execution interval; meters/minute | Fixture proven; pause completeness pending |
| D01 | Deterministic + physical | OT | Closure, declared outputs, per-layer initial gross/core or weighed-remnant evidence, required-layer identity, width, grammage, approved tolerance | OT closure; kilograms and meters | Post-Phase-1 consolidation proves both layer-to-run directions, pairwise layer checks, complete-evidence lifecycle, and tolerance standalone; connected mappings pending |
| D02 | Deterministic | OT + article serial | Closed OT, planned and good-output quantities in one unit, delivery, positive consumption, return/reassignment | OT completion; production quantity ratio | Fixture proven; 90% criterion approved, actual good-output and closure-reason mappings pending |
| D03 | Deterministic + physical | OT | Fully weighed input, net output, weighed waste, planned-area ink/adhesive, and E05 state | OT closure/latest required weight; kilograms, square meters | Fixture proven; all-weighed, planned-area, and operation-applicability query mapping pending; other alerts never suppress D03 |
| D04 | Historical Phase 1 contract; retired into D01 on 2026-08-01 | OT | Historical consumed, run, remnant, and tolerance inputs | OT closure; meters | No active contract or fixture; the useful opposite-direction check is now D01 and historical evidence is not production evidence |
| E01 | Deadline + deterministic | OT + article | Warehouse mapping, start horizon, stock, four-hour demand | Planned start; minutes, hours, kilograms | Fixture proven; stock mapping pending |
| E02 | Deterministic | OT + container + article | OT open, recipe requirement, `saldo_apertura` presence, container-to-article mapping | OT opening; kilograms | Product rules define capture at opening, kilograms, a required container ID, and one opening/closing snapshot; Phase 10 validates deployed behavior |
| E03 | Deterministic + physical | Previous OT + current OT + container + article | Previous `saldo_final`, current `saldo_apertura`, intervening movement, tolerance | Consecutive OT boundary; kilograms | Product rules define the expected values; Phase 10 validates deployed capture, correction, and movement behavior |
| E04 | Deterministic + physical | OT + container + article + screw | Opening, recorded additions, final balance, recipe and tolerance | OT closure; kilograms and fractions | Product formula is opening + recorded additions − ending; Phase 10 maps delivered fields and validates screw mapping |

## Explicit mock assumptions

- A04 fixtures supply a machine-specific rewinder capacity and tolerance. They are not production defaults.
- A06 uses a provisional 30-minute waste-weighing interval only for local fixtures. The production interval remains configurable and pending confirmation.
- A07 fixtures supply an effective tolerance and do not decide whether estimated evidence is strong enough for a production `Error` label.
- B01 uses a mock latest-approved-plan record. No production plan-version source is inferred.
- The current D01 JSON fixtures supply one aggregated OT result with complete layer, contributing-reel, measurement-path, and pairwise evidence plus maximum gaps for all three reason directions. The contract validator recomputes every maximum, signed layer reason, pairwise result, and required pair from that detail while enforcing unique layers and OT-wide reels. One canonical aggregate trigger exercises all three reasons through the shared fixture registry. The Phase 7 standalone laboratory proves gross/core or weighed-remnant conversion, OT-wide reel uniqueness, per-layer isolation, both signed directions, pairwise comparison, lifecycle, and kilogram-derived tolerance with controlled fixtures; connected source semantics and joins remain pending.
- E02–E04 use opening, recorded-addition, and ending values supplied by fixtures. Mutable current inventory is not accepted as a substitute. Phase 10 will verify deployed snapshot capture and correction behavior.
- A01, B02, B03, C01, C02, C06, D02, D03, and E01 also retain the production dependencies named in their contracts. D04's former dependencies are subsumed by D01's unverified connected mapping. D02 does not treat `motivo_cierre` as complete-versus-truncated evidence because its values and operator provenance are unverified. Local fixtures prove rule behavior, not ERP availability.

## Exclusions

All 21 rules approved at Phase 1 completion reproduced triggered, clear, and insufficient outcomes at that historical gate. On 2026-08-01, D04 was retired into D01, leaving 20 active executable contracts; this later consolidation does not alter the original Phase 1 result. E05 was approved later and remains pending in the executable contract, evidence matrix, and fixtures.

Removed C03, C04, and C05 are intentionally absent because `docs/product/alert_catalog.md` does not define them as active rules.
