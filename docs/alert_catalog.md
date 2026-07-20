# Factory Alert Catalog

This is the canonical source for Monitor's approved alert rules within the product defined by `docs/product_definition.md`. The final browser publication is `prototype/alert-catalog/final/index.html`.

## Catalog structure

Alert codes identify the type of operational control:

- `A`: material, inventory, and production-data registration;
- `B`: production-plan adherence and machine activity;
- `C`: statistical or physical plausibility of recorded values;
- `D`: work-order closure and material balance;
- `E`: resin-container alerts shared by extrusion and extrusion lamination (`Exlam`).

Shared `A`, `C`, and `D` rules apply across operations whenever the same evidence and failure condition exists. Family `E` applies to both Extrusion and Exlam because they share the same resin-container controls. Additional families will be introduced only when approved rules exist that do not belong in the current catalog structure.

Each alert code defines its own descriptive alert label. Labels are presentation text for that rule, not shared lifecycle states and not a required global taxonomy. Current labels include:

- `Error`: a defined rule has already been violated.
- `Por vencer`: a deadline is approaching but has not yet been violated.
- `Alerta`: a monitoring threshold has passed, but the condition may still be legitimate and should close automatically when the expected action occurs.
- `Error posible`: available evidence suggests a problem but does not prove it.

The stored incident lifecycle is separate from these labels.

## One-incident rule

The dashboard must not create duplicate alerts for the same underlying problem.

- One incident is keyed by the affected OT, reel or material requirement, and workflow stage.
- Later evidence updates the existing incident with a more precise reason.
- A specific deterministic rule replaces or enriches a generic statistical warning.
- An OT-level balance warning must not appear separately when its imbalance has already been explained by a specific missing-consumption, missing-output, missing-waste, or weighing incident.

## Resolution and administrative closure model

Every incident has two distinct terminal outcomes:

- `Resolved`: the underlying ERP or physical condition was corrected and the detection rule now passes.
- `Closed without resolution`: an authorized administrator confirms that the historical operational record can no longer be reconstructed safely. Closure never invents reservations, movements, receipts, consumption, production, waste, scale, inventory, or OT events. Any later inventory, location, cost, valuation, or OT reconciliation adjustment belongs entirely to EmusaSoft.

Administrative closure requires a standardized reason, mandatory comment, administrator identity, timestamp, and preserved evidence. It stops reminders and escalations but does not state that the business condition was fixed. Before confirmation, show incidents correlated by OT, material or reel, machine, and time window. The administrator may close the root incident and selected consequences as one audited cascade with a shared closure reference. The same historical evidence must not reopen that chain automatically; genuinely new events may create a new incident.

Monitor does not create, submit, approve, track, or apply adjustment requests. It provides a read-only record of the closure, its evidence, and its EmusaSoft references. Any later adjustment workflow belongs entirely to EmusaSoft and remains outside Monitor.

For the A01 exception described during review, material may have been physically sent and consumed without reservation or EmusaSoft movements. Close A01 and only the selected downstream missing-dispatch, missing-consumption, and balance incidents for the same OT and material under reason `physical_operation_outside_erp`. Do not backfill transactions that cannot be proven. Preserve the evidence for EmusaSoft to handle any later adjustment outside Monitor.

| Code | Recommended resolution |
|---|---|
| A01 | Reserve, confirm availability, and dispatch; otherwise reschedule. If the material was already used outside the ERP and the history cannot be reconstructed safely, close the correlated chain without resolution. |
| A02 | Record the real receipt, or correct/cancel the movement. If the old handoff and physical location cannot be proven, close without resolution with the last known location. |
| A03 | Close automatically when the first valid consumption is declared. Consumption remains editable while `WorkOrder.readOnlyInput = false`; after input lock, preserve an unreconstructable condition without inventing consumption. |
| A04 | Declare missing output or correct input, output, waste, or weight. Close a verified false positive without resolution with physical evidence. |
| A05 | Weigh and move the reel or correct the scale/barcode/movement record. If the reel is no longer traceable, close without resolution with its last known location. |
| A06 | Declare or weigh waste and correct its category. If the missing quantity cannot be recovered, close without resolution and link the resulting D03 gap. |
| A07 | Declare missing consumption while OT input remains editable, or correct the output/waste evidence. If input is locked and cannot be reconstructed, close without resolution and link D03. |
| B01 | Update the current plan and record the reason for the sequence change. An already-started historical deviation is closed as explained or closed without resolution when it cannot be reconstructed. |
| B02 | Start, record the real pause, or reschedule and update the full plan. Close a historical unreconstructable delay without resolution with its affected plan version. |
| B03 | Start the next OT, record the pause, or update the expected production interval. Preserve unexplained historical downtime when closing without resolution. |
| C01 | Reweigh and correct unit, barcode, or scale association. Close a verified exceptional reel without resolution while preserving both measurements. |
| C02 | Reweigh or correct the waste category/unit. Close verified exceptional waste without resolution rather than changing a correct value to fit the model. |
| C06 | Correct production quantity, OT timing, or missing pauses. Close a verified exceptional rate without resolution with its evidence and model version. |
| D01 | Add missing consumption or correct meters/reel data. If the locked history cannot be recovered, close without resolution with the remaining meter difference. |
| D02 | Declare consumed material, return/reassign unused material, or correct completion/reservation. Preserve an unproven reel disposition as an inventory exception. |
| D03 | Resolve the specific upstream cause and recalculate. Close an unreconstructable or accepted residual gap without resolution with final gap, tolerance, evidence, and linked incidents. |
| D04 | Declare, weigh, label, and return the remnant reel or correct run-meter and reel data. If locked history cannot be reconstructed, close without resolution and preserve the discrepancy for EmusaSoft follow-up outside Monitor. |
| E01 | Replenish safety stock, use an approved substitute, or reschedule/cancel. Close a passed historical readiness window without resolution and record whether production continued. |
| E02 | Capture starting quantities or reconstruct them only from traceable records. Otherwise close without resolution and link E03/E04/D03. |
| E03 | Correct closing/opening quantity or the missing intervening movement. If neither side is provable, close without resolution for the OT pair and preserve the difference. |
| E04 | Correct inventory quantities, screw association, or recipe snapshot. Close an approved formulation exception without resolution with the authorizer and reason. |

## Changes from iteration 1

- Former `A01` and `A02` are merged into new `A01` with 60-minute readiness and 30-minute dispatch checkpoints.
- Former `A03` becomes new `A02` and uses a confirmed 30-minute transit threshold.
- Former `A04` moves to production-plan family `B01`.
- Former `A05` becomes new `A03` with a confirmed 15-minute threshold.
- Former `A06` and `A07` become closure rules `D01` and `D02`.
- Former `A08` truncated-OT notice is removed because truncation is normal production, not a digital-versus-physical mismatch.
- Former `A09` becomes new `A04` with a clearer rewinder-capacity calculation.
- Former `A10` and `A11` are merged into new `A05`.
- Former `A12` and `A13` are merged into new `A06`.
- Former `A14` is removed. Its useful post-production movement condition is included in `A05`; transit after movement begins is covered by `A02`.

## Changes for iteration 3

- Added resolution behavior for rescheduling material-readiness and production-plan incidents.
- Clarified that A05 weighing and movement checks are OR conditions.
- Removed the unsupported generic process-loss subtraction from A04 and D03.
- Documented exact ERP sources for weight estimates, historical statistics, and quotation waste baselines.
- Corrected the purpose of waste weighing: OT balance and waste improvement, not raw-material cost allocation.
- Removed C03, C04, and C05 after reviewing system-controlled specifications, workflow ordering, and serial generation.
- Corrected C06 to use OT open/close execution timestamps and recorded pauses.
- Expanded extrusion, Exlam, and sealing into operation-specific candidate alerts for review.

## Changes for iteration 4

- Clarified A01 as one incident with two sequential conditions: readiness at 60 minutes and dispatch at 30 minutes.
- Named Miraflex as the faster printing-press family in the C06 example.
- Set the initial D03 mass-balance tolerance to 5% of total good-production mass, configurable in the future.
- Replaced generic extrusion candidates with safety-inventory, opening-stock, inventory-continuity, and formulation-balance rules grounded in the ERP container workflow.
- Removed duplicate extrusion, Exlam, and sealing alerts when an existing A, C, or D rule already covers the same condition.
- Reduced Exlam to its unique combined substrate-and-resin reconciliation rule.
- Reduced sealing to its unique bag-output and package-count reconciliation rules.

## Changes for iteration 5

- Corrected E01 terminology: readiness uses the machine-specific safety warehouse, while each extrusion container holds one resin for the current OT.
- Kept E04 as a separate formulation-proportion rule because a wrong resin mix can pass D03 aggregate mass balance.
- Applied E04 to both extrusion and Exlam and removed duplicate F01.
- Generalized A04 to cover missing or implausible output in reels or bags and removed duplicate G01.
- Removed G02 because ERP catalog review found stored bundle counters but did not establish an independently declared package total that could create the proposed mismatch.

## Changes for iteration 6 (then considered final; superseded by later iterations)

- Limited A02 to reserved material moving toward a work order; non-OT storage relocations are excluded.
- Restored the iteration-4 A04 rule for possible undeclared produced reels based only on rewinder capacity; bags are excluded.
- Changed the E01 safety-inventory horizon from 24 hours to 4 hours while retaining the 3-hour pre-start checkpoint.
- Removed bag-production declaration from A04. No replacement bag-specific alert is included without a separate supported rule.

## Changes for iteration 7

- Added an alert-distribution model based on `OT → machine → operation → shift → named operator` and the machine warehouse as a proxy into zones of influence.
- Added a distribution rule under every active alert card.
- Required runtime resolution of named people from the OT, shift roster, event actor, and live zone assignments instead of notifying every user in a zone.
- Added concrete named examples from current P15, AMP-001, Balanza PP, and KF1 configuration for review; these examples are not hard-coded recipients.

## Changes for iteration 8

- Consolidated alert distribution into seven general rules and a table containing only code-specific exceptions.
- Replaced personal-name examples with positions and runtime role resolution.
- Reclassified A03 as a warning that closes when first consumption is declared, and documented `WorkOrder.readOnlyInput` as the runtime editability check.
- Added A07 for possible raw material consumed but not declared when output and waste exceed recorded input consumption.
- Introduced an adjustment-queue proposal during iteration 8; the later architecture decision superseded it with a read-only closure view and no Monitor adjustment queue.

## Changes for iteration 9

- Clarified that A04 and A05 also cover partially consumed remnant, leftover, or remaining raw-material reels without changing their core logic.
- Added D04 for consumed-reel meters exceeding declared run meters after accounting for declared remnant reels.
- Applied E01–E04 to both Extrusion and Exlam.
- Added a separately reviewable glossary for every role and job description used in alert distribution.

## Changes for iteration 10

- Replaced `reservation owner` and short-term purchasing follow-up with the actual position name `material planner`.
- Removed `purchasing owner`, `receiving operator`, `pause owner`, `machine-safety-warehouse stock role`, `OT opening role`, and `OT closing role` as separate positions because their responsibilities belong to standardized positions.
- Combined process movement, scale operation, and work-in-process warehouse duties under `process-team operator`.
- Defined a deterministic primary-action-owner mapping for every active alert code and reason; no LLM selects operational recipients.

## Final publication

- Published the approved catalog at `prototype/alert-catalog/final/index.html` without annotation outlines, review states, or approval buttons.
- Named Monitor's routing master table the **Operational Responsibility Roster**.
- Required a Monitor administration UI for maintaining position assignments by operation, machine, shift, and effective date, including assignment history, temporary replacements, validity periods, and missing or conflicting assignment warnings.

## A — Material, inventory, and production-data registration

### A01 — Required material not ready before OT start

**Alert label:** Por vencer → Error
**Scope:** Printing, lamination, adhesive lamination, and cutting

| Field | Definition |
|---|---|
| When it happens | At 60 minutes before planned OT start, required material is unavailable in the warehouse or has not been reserved. At 30 minutes before start, the same incident is updated if the material has not been dispatched. |
| Why the alert exists | The OT is at risk of starting without the required material at the machine. |
| Possible causes | The material planner did not reserve the material or secure its short-term availability; a supplier has not delivered; or the material was reserved but warehouse dispatch is late. |
| Example | OT 151200.1 starts at 10:00. At 09:00, one substrate is not reserved because it is not in stock. At 09:30, the incident states: `Not dispatched because material is not reserved and not available in the warehouse`. |

**Detection indicators and algorithm:** At `planned start - 60 minutes`, evaluate required materials, reservation records, warehouse availability, and open purchase or supplier-delivery status. At `planned start - 30 minutes`, add dispatch status. Maintain one incident per OT and required material. Use reason codes such as `not_reserved_stock_available`, `material_not_in_warehouse`, `purchase_or_supplier_pending`, and `reserved_not_dispatched`.

**Primary action owner:** `not_reserved_stock_available`, `material_not_in_warehouse`, or `purchase_or_supplier_pending` → **Material planner**. `reserved_not_dispatched` → **Raw-material warehouse dispatcher or sender**.

**Resolution:** Keep one incident open until every condition required at the current checkpoint is satisfied. At the 60-minute checkpoint, the material must be available and reserved; at the 30-minute checkpoint it must also be sent. Rescheduling closes the current deadlines and creates new checkpoints. If the material was already physically sent and consumed outside EMUSA Soft and the missing historical transactions cannot be proven, an administrator closes A01 and selected correlated consequences without resolution; the system must not fabricate reservations, movements, receipts, or consumption.


### A02 — Reserved OT material not received within 30 minutes

**Alert label:** Alerta
**Scope:** Reserved material moving toward a work order

| Field | Definition |
|---|---|
| When it happens | Material reserved for a work order remains in transit to that OT without digital receipt for more than 30 minutes. |
| Why the alert exists | Reserved material may have arrived physically at the machine while the operator failed to record its receipt in EMUSA Soft. |
| Possible causes | Physical delivery occurred without digital receipt, or movement to the work-order machine is delayed. |
| Example | A reel reserved for OT 151087.3 is sent to P15 at 09:00 and remains `En tránsito` at 09:31. |

**Detection indicators and algorithm:** Require a material flow linked to a work-order reservation, a sent or in-transit status, no `receivedAt`, and `current time - sent time > 30 minutes`. Exclude relocations between warehouses or storage locations when the material is not moving toward a work order. Once reserved material is received, close the incident.

**Primary action owner:** Material still physically pending after dispatch → **Raw-material warehouse dispatcher or sender**. Material physically at the machine but missing digital receipt → **OT machine operator**. When physical arrival is unknown, start with the dispatcher or sender and notify the OT machine operator as the other end of the same transfer.


### A03 — Active OT without consumption after 15 minutes

**Alert label:** Alerta
**Scope:** Printing, lamination, adhesive lamination, and cutting

| Field | Definition |
|---|---|
| When it happens | An OT has been active for 15 minutes without a first consumption declaration. This is a warning, not proof of an error, because setup may legitimately take longer. |
| Why the alert exists | The first raw-material reel may already be in use but not yet represented digitally. |
| Possible causes | Machine setup took longer than expected, or the operator has not yet declared the first reel. |
| Example | OT 151087.3 starts at 09:00 and still has zero consumption at 09:15. Its first valid consumption is declared at 09:27, so the warning closes automatically. |

**Detection indicators and algorithm:** Open the warning when `OT active`, `current time - actual start >= 15 minutes`, and `consumption count = 0`. Close it immediately when the first valid consumption is recorded, even after 20 or 30 minutes. Do not open or retain A03 when stronger A07 evidence shows that produced output requires more input than has been declared.

**Primary action owner:** **OT machine operator**.

**Resolution:** Close automatically when the first valid consumption is declared. A consumption correction is permitted while `WorkOrder.readOnlyInput = false`. Once `readOnlyInput = true`—normally after OT closure or finalization—the input is locked. The ERP catalog exposes this flag but does not identify the exact backend transition that sets it. If locked history cannot be reconstructed, close without resolution and link A07, D01, or D03 rather than inventing consumption.


### A04 — Possible undeclared produced reel

**Alert label:** Error posible
**Scope:** Rewinder-based operations without PLC signals

**Remnant-reel scope:** A04 also covers an undeclared remnant, leftover, or remaining raw-material reel removed from the unwinder when an OT stops before consuming it completely. The existing missing-reel logic is unchanged: the remnant must be represented digitally so its remaining mass is accounted for.

| Field | Definition |
|---|---|
| When it happens | The estimated material still unaccounted for on the rewinder exceeds the maximum mass the rewinder can physically hold. |
| Why the alert exists | Enough raw material has been consumed that another finished reel should already have been declared. |
| Possible causes | The operator forgot or delayed a production declaration, or the statistical output-weight assumptions are inaccurate. |
| Example | The OT has consumed 1,500 kg. Declared output reels represent an actual or estimated 900 kg and declared or estimated waste represents 100 kg. The remaining 500 kg equals the rewinder limit. If more input is consumed without another output declaration, the remaining mass exceeds physical capacity and a produced reel may be missing. |

**Detection indicators and algorithm:** Calculate `estimated remaining mass = consumed input mass - actual or estimated declared-output mass - actual or estimated declared-waste mass`. Do not subtract a generic process loss. Use actual scale weight from `balanza_carga_detalle_registros.peso_neto` when available. For unweighed output, use `articulo_serial`, `orden_trabajo_salidas`, width, grammage, declared linear meters when present, and comparable weighed reels. The theoretical check is `kg ≈ grammage_g_m2 × width_m × length_m ÷ 1000`. If length is unavailable, use a historical model adjusted for width and mark the result as lower-confidence. Warn when the remaining mass exceeds configured rewinder capacity plus statistical tolerance. Bags are excluded from A04.

**Primary action owner:** **OT machine operator**, who declares produced and remnant reels.


### A05 — Produced or remnant reel not weighed or not moved from the machine

**Alert label:** Por vencer → Error
**Scope:** Produced- and remnant-reel handling

**Remnant-reel scope:** A05 uses the same declaration, weighing, labeling, and movement logic for produced reels and remnant raw-material reels. A partially consumed input reel must be declared with its remaining kilograms, weighed, labeled or ticketed, and returned to the raw-material warehouse. The 30-minute weighing and movement checks do not change.

| Field | Definition |
|---|---|
| When it happens | A declared produced or remnant reel has no recorded weight within 30 minutes, or remains at the machine for more than 30 minutes instead of being sent to its next OT or appropriate warehouse. |
| Why the alert exists | Without weight, EMUSA Soft cannot calculate the reel's cost or add the correct quantity to inventory. After an OT finishes, the reel must also leave the machine and enter the correct next workflow. |
| Possible causes | Process-team delay, missed weighing, missing scale record, failure to initiate the next movement, or failure to record that movement. |
| Example | CU-98421 was declared at 10:00. At 10:31 it has no weight and remains at P15. The dashboard shows one incident with reasons `not_weighed` and `still_at_machine`. |

**Detection indicators and algorithm:** Maintain one incident per produced or remnant reel. These are **OR conditions**, not AND conditions. Add `not_weighed` when 30 minutes have elapsed since the reel declaration and no scale record exists. Independently add `still_at_machine` when the source OT is finished, 30 minutes have elapsed, and no movement to the required warehouse or next OT exists. The incident may contain either reason or both. If movement has begun but is not received within 30 minutes, use `A02` rather than creating another incident.

**Primary action owner:** **Process-team operator** for both `not_weighed` and `still_at_machine`. For a remnant reel, the raw-material warehouse dispatcher or sender is additionally notified as its receiving position.


### A06 — Waste missing or not weighed

**Alert label:** Error posible / Error
**Scope:** Waste registration and weighing

| Field | Definition |
|---|---|
| When it happens | A declared waste bag remains unweighed beyond the configured interval, or OT balance and historical expectations indicate that waste should exist but sufficient waste was not declared. |
| Why the alert exists | Missing or unweighed waste prevents reliable OT balance and waste-control analysis. Waste weight does not allocate the OT’s raw-material cost—the raw-material cost is divided across good production—but it is essential for controlling and later reducing waste. |
| Possible causes | Waste was produced but not declared, a declared bag was not weighed, the waste category is wrong, or statistical expectations do not fit this specific run. |
| Example | Comparable printing OTs of this size normally produce 70–100 kg of waste. The OT closes with only 5 kg declared, while input and good-output estimates leave an unexplained 80 kg gap. |

**Detection indicators and algorithm:** Use two evidence paths in one incident. First, for declared waste, alert when no scale record exists after the configured weighing interval. Second, at closure, compare actual or estimated good-output mass, declared waste, and expected waste against consumed input mass. Source theoretical waste from the quotation configuration chain: `operaciones` → `cotizacion_config_waste` → `cotizacion_config_valores`; use `cotizacion_config_rangos.valor_kg` and `cotizacion_config_rango_valores.valor` for lot-size bands, and `cotizacion_config_waste_gap` plus `cotizacion_config_waste_gap_detalle.id_taxon` for operation/substrate adjustments. Compare that baseline with historical actual waste by operation, substrate/taxon, machine, and OT-size band. A separate aggregate statistics table or materialized view may cache those historical distributions, but it must be derived from OT, waste-serial, and scale records rather than become a second source of truth. When balance evidence points to missing waste, add reason `possible_waste_not_declared`. If the same imbalance already exists as `D03`, attach the waste reason to that incident instead of duplicating it.

**Primary action owner:** Missing or incorrect waste declaration → **OT machine operator**. Declared waste missing a weight → **Process-team operator**.

### A07 — Possible raw material consumed but not declared

**Alert label:** Error posible → Error when verified weights confirm the gap
**Scope:** Operations that produce weighed or statistically estimable output

| Field | Definition |
|---|---|
| When it happens | Actual or statistically estimated good output and waste require more raw-material mass than the OT records as consumed, beyond the configured tolerance. |
| Why the alert exists | Physical output cannot exceed its material input. The digital record probably omits consumption, although an output weight or estimate may also be wrong. |
| Possible causes | Missing consumption declaration, incorrect output weight or estimate, incorrect waste amount, or output associated with the wrong OT. |
| Example | Two produced reels are estimated at 350 kg each, or about 700 kg total, while the OT records only 500 kg of raw-material consumption. The unexplained 200 kg indicates possible undeclared consumption. |

**Detection indicators and algorithm:** Calculate `required input evidence = actual or estimated good-output mass + actual or estimated waste mass` and `consumption gap = required input evidence - declared input consumption`. Open A07 when the gap exceeds the configured tolerance. Prefer actual scale weights. For unweighed reels, estimate mass from meters, width, basis weight, and comparable weighed reels. Statistical evidence creates a possible error; actual verified weights can confirm an error. Suppress A03 when A07 supplies the stronger explanation. At OT closure, link or merge A07 with D03 instead of creating duplicate incidents.

**Primary action owner:** **OT machine operator**.

**Resolution:** Declare the missing consumed reel while `WorkOrder.readOnlyInput = false`, or correct the output, waste, or estimate that created the gap. Close when declared consumption covers output and waste within tolerance. If `readOnlyInput = true` and the exact input cannot be reconstructed, close without resolution, preserve the quantified gap, and link D03.


## B — Production-plan adherence and machine activity

### B01 — OT started outside the latest approved plan sequence

**Alert label:** Error

| Field | Definition |
|---|---|
| When it happens | An operator starts an OT that is not next in the latest approved sequence. The floor may reorganize the planner's plan, but the change must be recorded before the OT starts. |
| Why the alert exists | The machine is no longer following the current recorded production plan created by the planner and subsequently adjusted, when necessary, on the factory floor. |
| Possible causes | Operator selected the wrong OT, the floor is disorganized, the previous OT's material did not arrive, or the operator skipped an OT without first updating the plan. |
| Example | The planner's current sequence is OT 151099.1 followed by OT 151104.1. The previous material is late, so the operator starts 151104.1 without recording a sequence change. |

**Detection indicators and algorithm:** At actual OT start, compare the started OT with the first pending OT in the latest recorded plan for that machine. Do not alert if an authorized floor update changed the sequence before start.

**Primary action owner:** **Operation shift supervisor**, who must confirm the valid sequence and ensure any floor resequencing is recorded. The OT machine operator remains an implicated recipient because that operator started the OT.


### B02 — Planned OT has not started on time

**Alert label:** Error

| Field | Definition |
|---|---|
| When it happens | The planned start time has arrived but the expected OT has not started and the plan has not been updated. |
| Why the alert exists | The recorded plan and actual factory execution have diverged. |
| Possible causes | Setup delay, missing materials, unavailable operator, machine problem, or an unrecorded plan change. |
| Example | OT 151230.1 should start on P15 at 16:00, but at 16:01 it has not started and no revised plan exists. |

**Detection indicators and algorithm:** For each machine plan, find the first pending OT whose planned start is in the past. Alert when it has no actual start and no approved rescheduling event. If another specific incident explains the delay, link it as the reason rather than duplicating the operational problem.

**Primary action owner:** Previous OT still running or schedule simply delayed → **Planner**. Nothing running and no recorded pause → **OT machine operator** until the real machine state is recorded; after that, the **Planner** owns the plan update.

**Resolution:** If the preceding OT is still running, the planner supplies the expected delay and selects `Update All Plan`; the system shifts every subsequent OT on that machine. If nothing is running, record a categorized equipment pause and then update the plan. If the historical delay can no longer be reconstructed, an administrator closes without resolution and preserves the observed delay and affected plan version.


### B03 — Machine has no active OT for more than 30 minutes

**Alert label:** Error

| Field | Definition |
|---|---|
| When it happens | A machine expected to be producing has no active OT for more than 30 minutes. |
| Why the alert exists | Planned production time is being lost without a corresponding active work order. |
| Possible causes | Disorganization, unrecorded machine stoppage, missing material, operator delay, maintenance, or a plan that was not updated. |
| Example | P09 is scheduled to produce during the shift but has no active OT between 14:00 and 14:31. |

**Detection indicators and algorithm:** Require that the machine is scheduled or expected to operate, has no active OT, and has remained in that state for more than 30 minutes. Exclude recorded maintenance, planned shutdown, approved pause, or no-production schedule periods.

**Primary action owner:** No machine-state or pause record → **OT machine operator**. Valid pause exists but the production plan still expects activity → **Planner**.

**Resolution:** Record the machine’s real state using the equipment-pause workflow, including category, explanation when required, and expected duration. Then shift the remaining plan using the same `Update All Plan` behavior described in `B02`. Close normally when an OT starts, a valid pause is recorded, or the plan no longer expects production. If the interval is historical and its cause cannot be recovered, close without resolution and retain the unexplained downtime duration.


## C — Statistical and physical plausibility

These rules detect values that are possible to enter but inconsistent with physical limits, OT specifications, or reliable historical distributions. Statistical limits must be segmented by relevant factors such as operation, machine, material, width, basis weight, and OT size.

### C01 — Produced reel weight outside the plausible range

**Alert label:** Error posible

| Field | Definition |
|---|---|
| When it happens | A produced reel's recorded weight is below the expected minimum or above the expected maximum for comparable production. |
| Why the alert exists | An implausible weight may corrupt inventory quantity, cost, yield, and downstream calculations. |
| Possible causes | Typing error, incorrect scale unit, wrong barcode, scale problem, or unusual production requiring review. |
| Example | A single reel is recorded as 3,000 kg when comparable reels normally fall between 250 and 600 kg. |

**Detection indicators and algorithm:** Read the actual net weight from `balanza_carga_detalle_registros.peso_neto`, joined through `id_articulo_serial`. Obtain OT, output, substrate/article, width, grammage, operation, and timestamps from `articulo_serial`, `orden_trabajo_salidas`, and `ordenes_trabajo`. When linear meters exist, calculate `expected kg = grammage_g_m2 × width_m × length_m ÷ 1000`. Build historical ranges from previously weighed serials using the same substrate and grammage, segmented by operation and machine, then normalize or filter by width. Prefer the previous 12 months when sample size is sufficient. A derived statistics table or materialized view may cache sample count, median, percentiles, and model version; raw serial and scale records remain authoritative. Hard physical-limit violations are errors; statistical outliers are possible errors.

**Primary action owner:** **Process-team operator**, who verifies the physical weight, scale record, and reel barcode.


### C02 — Waste amount outside the plausible range

**Alert label:** Error posible

| Field | Definition |
|---|---|
| When it happens | Declared waste weight or waste percentage is materially below or above the expected range for comparable OTs. |
| Why the alert exists | Very low waste may indicate missing waste declarations; very high waste may indicate a wrong value or a real production problem. |
| Possible causes | Missing bag, incorrect weight, wrong waste category, unusual setup loss, quality problem, or atypical run conditions. |
| Example | Comparable 20,000-meter printing OTs normally produce 60–100 kg of waste, but the OT declares 5 kg or 450 kg. |

**Detection indicators and algorithm:** Use two sources. The theoretical source is the quotation matrix: `cotizacion_config_waste`, `cotizacion_config_valores`, kilogram bands in `cotizacion_config_rangos`, band values in `cotizacion_config_rango_valores`, and substrate/taxon adjustments in `cotizacion_config_waste_gap` and `cotizacion_config_waste_gap_detalle`. The empirical source is historical waste serials and their scale records grouped by operation, substrate/taxon, machine, and OT-size band. Store only derived aggregates—sample count, expected value, percentiles, source period, and model version—in a dedicated statistics table or materialized view. Compare current waste with both baselines and show which one triggered the warning.

**Primary action owner:** Suspected declaration or waste-category problem → **OT machine operator**. Suspected physical weight or scale-record problem → **Process-team operator**.


### Removed after ERP review: C03, C04, and C05

- `C03` is removed because reel specifications are inherited from the work order and software; operators do not declare them independently.
- `C04` is removed because production-dependent records cannot be created before the production record in the current workflow, and specifications are system-derived.
- `C05` is removed because the system generates serial codes through the production workflow and production-series configuration. The MCP catalog confirms `produceArticleSerial` and `serie_producciones`; it does not expose backend constraint source code, so the current product rule supplied by EMUSA remains authoritative.

### C06 — Declared production rate outside the machine's plausible range

**Alert label:** Error posible

| Field | Definition |
|---|---|
| When it happens | Produced meters or kilograms divided by the OT’s recorded execution interval imply a production rate materially above or below the machine’s physical or historical range. |
| Why the alert exists | The declared production may be wrong, or the OT may have been opened too early or closed too late. |
| Possible causes | Incorrect production declaration, OT left open during a stoppage, OT closed late, unrecorded pause, or exceptional production requiring review. |
| Example | A Comexi press expected near 250 m/min or a faster Miraflex press expected near 350 m/min produces a recorded rate of 1,200 m/min or an abnormally low rate. |

**Detection indicators and algorithm:** Use `ordenes_trabajo.fecha_inicio_ejecucion` and `fecha_fin_ejecucion`, which come from opening and closing the OT rather than typed timestamps. Subtract recorded equipment pauses from `equipo_pausa`. Divide declared meters and kilograms by effective runtime. Compare against `equipos.velocidad_maquina` and historical rates for the same machine, operation, substrate/product, width, and setup. Detect both implausibly high and implausibly low rates. The alert should state whether the likely issue is production quantity or OT open/close timing.

**Primary action owner:** **OT machine operator**, who owns the production declaration and the OT opening, pause, and closing records used by the rate calculation.


## D — Work-order closure and material balance

### D01 — Declared meters exceed consumed-reel meters

**Alert label:** Error
**Confirmed:** Yes

| Field | Definition |
|---|---|
| When it happens | At closure, declared run meters materially exceed the estimated meters provided by consumed reels. |
| Why the alert exists | The declared production cannot be explained by recorded consumption. |
| Possible causes | Missing consumption declaration, incorrect run meters, incorrect reel data, or incorrect closure. |
| Example | Consumed reels support approximately 30,000 m, but the operator declares 40,000 m. |

**Detection indicators and algorithm:** Estimate meters in every consumed reel from weight, width, and basis weight. Sum them and compare them with declared run meters. Alert when the difference exceeds the configured tolerance. This is the primary closure rule.

**Primary action owner:** **OT machine operator**.


### D02 — Completed OT has delivered reserved reels unconsumed

**Alert label:** Error
**Confirmed:** Yes

| Field | Definition |
|---|---|
| When it happens | An OT completes all planned production, but a reserved reel delivered to the machine remains unconsumed. |
| Why the alert exists | If full production was completed, the delivered reserved material should have been used and declared. |
| Possible causes | Missing consumption declaration, incorrect completion status, or incorrect reservation quantity. |
| Example | Four reels were reserved and delivered; full production was completed, but only three were consumed. |

**Detection indicators and algorithm:** Require all three conditions: full planned production completed, reserved reels delivered to the machine, and `delivered reserved reels - consumed reels` is not empty. Do not apply automatically to truncated OTs.

**Primary action owner:** Missing consumption declaration → **OT machine operator**. Incorrect reservation quantity or reel selection → **Material planner**.


### D03 — OT input, good production, and waste do not balance

**Alert label:** Error posible / Error

| Field | Definition |
|---|---|
| When it happens | At closure, the absolute mass-balance gap exceeds 5% of total good-production mass. The percentage is an initial configurable parameter. |
| Why the alert exists | One or more production, waste, consumption, or weighing records may be missing or incorrect. |
| Possible causes | Undeclared produced reel, undeclared waste, unweighed output, wrong weight, missing consumption, or statistical assumptions that do not fit this OT. |
| Example | Consumed input is 1,500 kg, good production is 1,300 kg, and waste is 90 kg. The 110 kg gap exceeds the current tolerance of 65 kg, which is 5% of good production. |

**Detection indicators and algorithm:** Calculate `balance gap = consumed input mass - good-output mass - waste mass` and `allowed gap = 0.05 × total good-production mass`. Alert when `absolute balance gap > allowed gap`. Store `0.05` as a configurable parameter so it can change later. Do not subtract an undefined generic process-loss value. Use actual scale weights from `balanza_carga_detalle_registros` when available. For declared but unweighed output, estimate from `articulo_serial`, `orden_trabajo_salidas`, width, grammage, declared linear meters when present, and comparable weighed serials. For missing or unweighed waste, use both the quotation waste matrix (`cotizacion_config_waste`, kilogram ranges and substrate/taxon gaps) and historical waste distributions. Recalculate whenever actual weights arrive. Statistical gaps are possible errors; gaps that remain beyond tolerance after actual weights are available are errors. If evidence identifies a specific `A03`, `A04`, `A05`, `A06`, `D01`, `D02`, or `D04` cause, enrich that incident and suppress a duplicate `D03` alert.

**Primary action owner:** When a specific linked alert explains the gap, inherit that alert's deterministic owner. Otherwise, missing or incorrect OT declarations → **OT machine operator**; suspected weighing evidence → **Process-team operator**.

### D04 — Consumed-reel meters exceed declared meters

**Alert label:** Error

| Field | Definition |
|---|---|
| When it happens | At OT closure, consumed-reel meters exceed declared run meters plus the meters represented by any declared remnant reels beyond the configured tolerance. |
| Why the alert exists | The excess material must be explained. It may still exist physically as a partially consumed remnant reel that must return to inventory. |
| Possible causes | Undeclared remnant reel, incorrect run meters, incorrect consumed-reel weight, width, or grammage, or an unrecorded warehouse return. |
| Example | A consumed reel supports 10,000 m, but the OT declares 5,000 run meters and no remnant. The remaining equivalent of 5,000 m should exist as a declared, weighed, labeled, and returned remnant reel. |

**Detection indicators and algorithm:** Calculate `unexplained meters = consumed-reel meters - declared run meters - declared remnant-reel meters`. Alert when unexplained meters exceed the configured tolerance. Estimate remnant meters from its measured kilograms, width, and grammage. Link A04 when the remnant declaration is missing and A05 when the declared remnant is not weighed or moved; do not create duplicate incidents.

**Primary action owner:** Missing remnant declaration or incorrect run meters → **OT machine operator**. A declared remnant that is not weighed or moved inherits A05 and routes to the **Process-team operator**.

**Resolution:** Declare the remnant reel, record its remaining kilograms, weigh it, print or attach its identifying label, and return it to the raw-material warehouse. Otherwise correct run meters or reel data. If the OT is locked and the history cannot be reconstructed, close without resolution and preserve the discrepancy for EmusaSoft follow-up outside Monitor.


## E — Extrusion and Exlam resin-container alerts

Every E01–E04 rule applies to both Extrusion and Exlam. Both operations use resin recipes and material containers. Operation-specific machine, recipe, warehouse, container, and shift assignments supply the runtime evidence and recipients. Each container holds one specific resin used by the current OT. Separately, every applicable machine has a machine-specific safety warehouse holding resin for current and near-term orders. General output handling, weighing, movement, rate, and aggregate closure still use A04/A05, C06, D03, and D04. E04 is separate because resin proportions can be wrong even when total mass balances.

### E01 — Required extrusion safety inventory is incomplete

**Alert label:** Por vencer → Error
**Initial parameters:** 4-hour safety horizon; alert 3 hours before the affected OT starts. Both values may become configurable.

| Field | Definition |
|---|---|
| When it happens | Three hours before an extrusion OT starts, a required resin or additive is missing from the machine-specific safety warehouse or its stock is insufficient for the next 4 hours of scheduled demand. Extrusion materials are not reserved per OT. |
| Why the alert exists | The affected or following OT may stop because required formulation material is not available near the machine. |
| Possible causes | The planner or supervisor did not request replenishment of the machine-specific safety warehouse on time. |
| Example | At 11:00, an extrusion OT planned for 14:00 requires resin R-17, but the safety warehouse assigned to that machine has insufficient R-17 for scheduled demand through the next 4 hours. |

**Detection indicators and algorithm:** Read recipe demand from `orden_trabajo_receta_snapshot` and planned production from the affected and following extrusion OTs. Calculate demand for every recipe material across the next 4 hours. Compare it with resin stock in the warehouse assigned to that machine, using `Warehouse` and `ArticleWarehouseStock` or the equivalent stock query after confirming the machine-to-warehouse mapping. Do not use `getExtrusionContainersInventory` as the safety-stock source: those containers represent the resins loaded for the current OT. Do not use A01 reservation or dispatch logic.

**Primary action owner:** Replenishment was not requested or short-term demand was not covered → **Material planner**. Replenishment was requested but resin has not reached the machine-specific safety warehouse → **Raw-material warehouse dispatcher or sender** assigned to resins.


### E02 — Extrusion OT opened without complete starting-container inventory

**Alert label:** Error

| Field | Definition |
|---|---|
| When it happens | `quickStartWorkOrder` opens an extrusion OT but the operator has not declared starting kilograms for every required resin container associated with the recipe. |
| Why the alert exists | Actual resin consumption cannot be calculated without a complete opening inventory for every container. |
| Possible causes | The operator omitted a container, omitted its starting quantity, or did not complete the opening declaration. |
| Example | The recipe uses three resins, but the OT opens with starting kilograms recorded for only two associated containers. |

**Detection indicators and algorithm:** At OT opening, compare required recipe materials from `orden_trabajo_receta_snapshot` with the containers associated through `quickStartWorkOrder`. Require one actual opening quantity for every `locationId + articleId`. The ERP catalog confirms container association and current inventory but does not expose an explicitly named persisted opening-quantity field. Before implementation, verify whether the opening snapshot is stored through `WorkOrderMaterial.quantityIncoming`, the linked `locationItem.quantity`, or another backend field. If no immutable opening snapshot exists, add one; current mutable inventory alone is insufficient evidence.

**Primary action owner:** **OT machine operator**, who opens the OT and declares starting container inventory.


### E03 — Previous closing stock does not match the next opening stock

**Alert label:** Error

| Field | Definition |
|---|---|
| When it happens | For the same physical extrusion container and resin, the previous closed OT’s ending kilograms differ from the next OT’s declared starting kilograms beyond the configured container-measurement tolerance. |
| Why the alert exists | Inventory continuity between consecutive work orders is broken, so at least one opening, closing, addition, or removal was recorded incorrectly. |
| Possible causes | Incorrect previous ending stock, incorrect current starting stock, or an unrecorded resin addition or removal between OTs. |
| Example | OT 151300 closes container C-04 with 420 kg of resin R-17. The next OT opens the same container and resin with 365 kg and no intervening movement. |

**Detection indicators and algorithm:** Identify consecutive OTs for the same machine and compare the same `locationId + articleId`. Use `WorkOrderMaterialStockContainer.closeQuantityReturnedReal` from the previous OT and the immutable opening quantity captured for the current OT. Alert when `absolute(previous closing kg - current opening kg)` exceeds the configured container-measurement tolerance. Show both OT codes, both declarations, the container, resin, elapsed interval, and any intervening material movements.

**Primary action owner:** **OT machine operator**. Route to the previous OT's operator when its closing value is identified as wrong, or to the current OT's operator when its opening value is identified as wrong. Until the incorrect side is known, notify both operators and make the current OT's operator primary.


### E04 — Consumed resin proportions do not match the recipe

**Alert label:** Error posible / Error

| Field | Definition |
|---|---|
| When it happens | Total resin mass may balance production plus waste, but one or more actual resin or screw percentages differ from the recipe beyond a configurable ingredient tolerance. |
| Why the alert exists | Aggregate balance cannot detect a wrong formulation: excess of one resin can offset a shortage of another while total kilograms remain correct. |
| Possible causes | Incorrect starting or ending container inventory, undeclared sack addition, resin associated with the wrong screw, or the wrong recipe snapshot. |
| Example | The recipe requires 5% resin A and 95% resin B. Actual calculated consumption is 10% and 90%. Total resin kilograms still balance output plus waste, so D03 passes but E04 alerts. |

**Detection indicators and algorithm:** For every resin and screw, calculate `actual consumed kg = opening kg + added kg - ending kg`. Divide each resin amount by total actual resin consumption to obtain its percentage. Compare it with the corresponding percentage in `orden_trabajo_receta_snapshot` using a separately configurable ingredient tolerance. Apply the same E04 code to extrusion and Exlam. Run D03 independently for total input-versus-output-plus-waste balance; E04 and D03 may pass or fail independently and must not become duplicate incidents.

**Primary action owner:** **OT machine operator**, who owns the opening, added, ending, screw-association, and closing declarations used to calculate actual resin proportions.

## General alert distribution

Apply these rules to every alert:

1. Always inform the factory manager.
2. Always inform the affected operation's shift supervisor and its configured technical leader.
3. Inform the operator assigned to the OT, machine, and shift when the exception concerns machine execution or production.
4. Determine the primary action owner from the alert code and reason mapping documented under each alert. This routing is deterministic and configurable; an LLM never selects operational recipients.
5. Add only implicated supporting positions: material planner, planner, raw-material warehouse dispatcher or sender, raw-material warehouse supervisor or leader, process-team operator, or process-team supervisor. Include them only when the evidence or required action implicates their area.
6. Resolve actual people through Monitor's Operational Responsibility Roster, supplemented by the OT and event actor. Positions define routing; personal names are runtime results, never hard-coded rules.
7. Deduplicate recipients and correlated incidents so each person receives one notification for the same incident chain.

### Operational Responsibility Roster

Monitor must own a master table and administration UI that assign people to standardized positions by operation, machine, shift, and effective date. It must preserve assignment history, support temporary replacements and validity periods, and warn about missing or conflicting assignments. Alert routing uses this table deterministically to translate every required position into an actual recipient.

### Distribution exceptions and overrides

Codes not listed use the seven general rules without modification.

| Code | Override or exception |
|---|---|
| A01 | Do not notify the OT machine operator. Short-term availability, reservation, and supplier follow-up route to the material planner; ready reserved material awaiting dispatch routes to the raw-material warehouse dispatcher or sender. The operation shift supervisor and technical leader still receive the alert. |
| A02 | The material has already been sent. Notify both the raw-material warehouse dispatcher or sender and the OT machine operator, plus their applicable shift supervisors. The reason determines which position is primary. |
| A05 | The process-team operator owns both weighing and movement. A produced reel also notifies the process-team supervisor. A remnant raw-material reel additionally notifies the raw-material warehouse dispatcher or sender and its supervisor or leader. |
| A06 | The OT machine operator owns waste declaration. When weighing is implicated, also notify the process-team operator and process-team supervisor. |
| B03 | When no active OT exists, use the planned shift operator if known; otherwise the machine shift supervisor and technical leader are the actionable production recipients. |
| D02 | Add the material planner only when reservation quantity or reel selection is implicated. Add raw-material warehouse positions only when delivery or return evidence implicates them. |
| E01 | Do not use OT reservation routing. Notify the material planner and the raw-material warehouse dispatcher or sender assigned to resins, not every user in that warehouse zone. |
| E03 | This incident spans two OTs: notify the OT machine operators for the previous and current OTs and any identified process-team operator involved between them. |

## Distribution role glossary

These are positions, not personal names. Actual people are resolved through the Operational Responsibility Roster, supplemented by the OT and event actor.

| Position | Working definition |
|---|---|
| Factory manager | Plant-wide operational authority who receives every alert for awareness, regardless of the action owner. |
| Operation shift supervisor | Supervisor responsible for the affected operation during the incident's shift. |
| Technical leader | Configured leader responsible for technical oversight of the entire affected operation, when that operation has this position. |
| OT machine operator | Operator assigned to the affected work order, machine, and shift. This position opens and closes the OT, receives material digitally, declares consumption, production, remnant reels, waste, starting and ending container inventory, and equipment pauses. |
| Material planner | Position responsible for selecting and reserving raw-material reels and managing short-term material availability, including supplier follow-up when required material is not available in-house. |
| Planner | Position responsible for the production plan, OT sequence, planned dates, and plan-wide delay updates. |
| Raw-material warehouse dispatcher or sender | Shift position responsible for dispatching reserved input material, receiving returned remnant raw-material reels, and replenishing machine-specific resin safety warehouses when assigned to resins. |
| Raw-material warehouse supervisor or leader | Supervisor responsible for the raw-material warehouse shift and its dispatch, receipt, and inventory actions. |
| Process-team operator | Interchangeable process-team position that collects, weighs, moves, receives, and stores produced or remnant reels and waste within the work-in-process flow. This combines the former process or movement actor, scale operator, and processed-material or work-in-process warehouse role. |
| Process-team supervisor | Supervisor or leader responsible for the process team, scale work, and processed-material or work-in-process warehouse activities. |
