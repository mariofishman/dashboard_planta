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
| A06 | Deadline + deterministic + statistical | OT | Waste declaration/age/weight, balance signal, D03 state | Waste declaration or OT closure; minutes and kilograms | Fixture proven; undeclared-waste signal pending |
| A07 | Physical + statistical | OT | Good output, waste, declared input, tolerance | Latest contributing evidence; kilograms | Fixture proven; tolerance/evidence policy pending |
| B01 | Deterministic | OT | Actual start, latest-plan next OT, prior sequence update | Actual OT start | Fixture proven; approved-plan source pending |
| B02 | Deadline + deterministic | OT + plan version | Planned deadline, actual start, approved reschedule | Planned start | Fixture proven; plan-version semantics pending |
| B03 | Deadline + deterministic | Machine + schedule window | Expected operation, active OT, exclusions, idle age | Start of unexplained interval; minutes | Fixture proven; schedule/exclusion source pending |
| C01 | Physical + statistical | Article serial | Weight, bounds, sample size | Scale record; kilograms | Fixture proven; model segmentation pending |
| C02 | Statistical | OT | Waste weight, bounds, sample size | OT closure/latest waste weight; kilograms | Fixture proven; baseline version pending |
| C06 | Physical + statistical | OT | Output, effective runtime, rate bounds | OT execution interval; meters/minute | Fixture proven; pause completeness pending |
| D01 | Deterministic + physical | OT | Consumed-reel meters, run meters, tolerance | OT closure; meters | Fixture proven; conversion formula pending |
| D02 | Deterministic | OT + article serial | Full completion, delivery, consumption, truncation | OT completion | Fixture proven; full-completion criterion pending |
| D03 | Deterministic + statistical + physical | OT | Input, output, waste, specific-cause state | OT closure/latest weight; kilograms | Fixture proven; verified/estimated policy pending |
| D04 | Deterministic + physical | OT | Consumed, run and remnant meters, tolerance | OT closure; meters | Fixture proven; remnant conversion pending |
| E01 | Deadline + deterministic | OT + article | Warehouse mapping, start horizon, stock, four-hour demand | Planned start; minutes, hours, kilograms | Fixture proven; stock mapping pending |
| E02 | Deterministic | OT + location + article | OT open, recipe requirement, immutable opening quantity presence | OT opening; kilograms | Fixture proven; ES2-05 blocks production use |
| E03 | Deterministic + physical | Previous OT + current OT + location + article | Closing, opening, intervening movement, tolerance | Consecutive OT boundary; kilograms | Fixture proven; ES2-05 blocks production use |
| E04 | Deterministic + physical | OT + article + screw | Opening, additions, ending, total consumption, recipe and tolerance | OT closure/latest container event; kilograms and fractions | Fixture proven; ES2-05 blocks production use |

## Explicit mock assumptions

- A04 fixtures supply a machine-specific rewinder capacity and tolerance. They are not production defaults.
- A06 uses a provisional 30-minute waste-weighing interval only for local fixtures. The production interval remains configurable and pending confirmation.
- A07 fixtures supply an effective tolerance and do not decide whether estimated evidence is strong enough for a production `Error` label.
- B01 uses a mock latest-approved-plan record. No production plan-version source is inferred.
- D01 fixtures supply already-normalized consumed-reel meters and tolerance. Core weight and conversion rules remain pending.
- E02–E04 use immutable opening, addition, and ending values supplied by fixtures. Mutable current inventory is not accepted as a substitute.
- A01, B02, B03, C01, C02, C06, D02, D03, D04, and E01 also retain the production dependencies named in their contracts. Local fixtures prove rule behavior, not ERP availability.

## Exclusions

All 21 rules approved at Phase 1 completion reproduce triggered, clear, and insufficient outcomes. This does not enable them for production. E05 was approved later and is not represented by this snapshot; its executable contract, evidence matrix row, and fixtures remain pending.

Removed C03, C04, and C05 are intentionally absent because `docs/product/alert_catalog.md` does not define them as active rules.
