# Factory Alert Catalog

This is the canonical source for Monitor's approved alert rules within the product defined by `docs/product/product_definition.md`. The approved browser publication is `reviews/alert-catalog/publication/index.html`; iteration 12 records the approved E02–E05 closure-snapshot guidance.

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

The dashboard normally avoids duplicate alerts for the same underlying problem. D03 is an explicit exception: when its own OT mass-balance predicate triggers, it remains a separate incident even if another alert describes the same source issue.

- Each alert defines a stable natural key from the affected OT, reel, material requirement, machine, container, or workflow stage. Architecture combines that key with the alert type, detection-query ID, and key-schema version to identify one continuing condition.
- A continuing condition updates the same incident occurrence with more precise evidence. After a healthy cycle proves it cleared, a later recurrence creates a new occurrence rather than reopening history.
- A specific deterministic rule may replace or enrich a generic statistical warning only where that alert's own rule explicitly permits it.
- D03 is never suppressed, resolved, or closed automatically through another alert. Correcting shared source evidence may independently make several alert predicates clear during the same healthy cycle.

## Resolution and administrative closure model

Every incident has two distinct terminal outcomes:

- `Resolved` (user-visible label: `Resuelta`): the underlying ERP or physical condition was corrected and the detection rule now passes.
- `Closed without resolution` (user-visible label: `Cerrada sin resolución`): an authorized administrator confirms that the historical operational record can no longer be reconstructed safely. Closure never invents reservations, movements, receipts, consumption, production, waste, scale, inventory, or OT records. Any later inventory, location, cost, valuation, or OT reconciliation adjustment belongs entirely to EmusaSoft.

Administrative closure requires a standardized reason, mandatory comment, administrator identity, timestamp, and preserved evidence. It stops reminders and escalations but does not state that the business condition was fixed. Before confirmation, show incidents correlated by OT, material or reel, machine, and time window. The administrator may close the root incident and selected consequences as one audited cascade with a shared closure reference, except that D03 requires its own audited closure action and is never cascade-closed. While the same uninterrupted ERP condition persists, Monitor suppresses reopening that closed occurrence. A healthy polling cycle that proves the condition cleared ends the suppression; if the condition later recurs, Monitor creates a new incident occurrence.

Monitor does not create, submit, approve, track, or apply adjustment requests. It provides a read-only record of the closure, its evidence, and its EmusaSoft references. Any later adjustment workflow belongs entirely to EmusaSoft and remains outside Monitor.

For the A01 exception described during review, material may have been physically sent and consumed without reservation or EmusaSoft movements. Close A01 and only the selected downstream missing-dispatch and missing-consumption incidents for the same OT and material under reason `physical_operation_outside_erp`. D03 remains independent and requires its own audited closure action if its history cannot be reconstructed. Do not backfill transactions that cannot be proven. Preserve the evidence for EmusaSoft to handle any later adjustment outside Monitor.

| Code | Recommended resolution |
|---|---|
| A01 | Reserve, confirm availability, and dispatch; otherwise reschedule. If the material was already used outside the ERP and the history cannot be reconstructed safely, close the correlated chain without resolution. |
| A02 | Record the real receipt, or correct, cancel, or reject the movement. If the old handoff cannot be reconstructed from source records, close without resolution with the last recorded movement state and destination; do not infer physical arrival or location. |
| A03 | Close automatically when the first valid consumption is declared or when the OT closes or is cancelled without consumption. An open OT permits consumption input; closing the OT blocks further input. Preserve an unreconstructable condition without inventing consumption. |
| A04 | Declare missing output or correct input, output, waste, or weight. Close a verified false positive without resolution with physical evidence. |
| A05 | Weigh and move the reel or correct the scale/barcode/movement record. If the reel is no longer traceable, close without resolution with its last known location. |
| A06 | Declare or weigh waste and correct its category. If the missing quantity cannot be recovered, close without resolution and link the resulting D03 gap. |
| A07 | Declare missing consumption while OT input remains editable, or correct the output/waste evidence. If input is locked and cannot be reconstructed, close without resolution and link D03. |
| B01 | Update the current plan and record the reason for the sequence change. An already-started historical deviation is closed as explained or closed without resolution when it cannot be reconstructed. |
| B02 | Start the OT or update the full plan to supersede the missed commitment. A pause alone does not resolve B02. Close a historical unreconstructable delay without resolution with its affected plan version. |
| B03 | Start the next OT, record the pause, or update the expected production interval. Preserve unexplained historical downtime when closing without resolution. |
| C01 | Reweigh and correct unit, barcode, or scale association. Close a verified exceptional reel without resolution while preserving both measurements. |
| C02 | Reweigh or correct the waste category/unit. Close verified exceptional waste without resolution rather than changing a correct value to fit the model. |
| C06 | Correct production quantity, OT timing, or missing pauses. Close a verified exceptional rate without resolution with its evidence and model version. |
| D01 | Add missing consumption, weigh a declared remnant, or correct run, layer, reel, weight, width, or grammage evidence. If locked history cannot be recovered, close without resolution with the remaining layer and pairwise meter differences. |
| D02 | Declare consumed material, return/reassign unused material, or correct completion/reservation. Preserve an unproven reel disposition as an inventory exception. |
| D03 | Resolve the specific upstream cause and recalculate. Close an unreconstructable or accepted residual gap without resolution with final gap, tolerance, evidence, and linked incidents. |
| E01 | Replenish safety stock, use an approved substitute, or reschedule/cancel. Close a passed historical readiness window without resolution and record whether production continued. |
| E02 | Capture starting quantities or reconstruct them only from traceable records. Otherwise close without resolution and link E03/E04/D03. |
| E03 | Correct closing/opening quantity or the missing intervening movement. If neither side is provable, close without resolution for the OT pair and preserve the difference. |
| E04 | Correct inventory quantities, screw association, or recipe snapshot. Close an approved formulation exception without resolution with the authorizer and reason. |
| E05 | Correct the opening inventory, recorded additions, or closing inventory that caused impossible negative calculated consumption. If the OT is locked, preserve the discrepancy for EmusaSoft follow-up outside Monitor. |

Iteration history is preserved in `archive/docs/product/alert_catalog_iteration_history.md`. It has no authority over the current rules below.

## A — Material, inventory, and production-data registration

### A01 — Required material not ready before OT start

**Alert label:** Error
**Scope:** Printing, lamination, adhesive lamination, and cutting

| Field | Definition |
|---|---|
| When it happens | At 60 minutes before planned OT start, the full required quantity is not allocable from warehouse stock or has not been fully reserved. At 30 minutes before start, the same incident is updated if the full required quantity has not been dispatched. |
| Why the alert exists | The OT is at risk of starting without the required material at the machine. |
| Possible causes | Allocable warehouse stock is insufficient, the material planner did not reserve the full quantity, or warehouse dispatch of the fully reserved quantity is incomplete. |
| Example | OT 151200.1 starts at 10:00. At 09:00, one substrate is not reserved because it is not in stock. At 09:30, the user-visible incident states: `No despachado porque el material no está reservado ni disponible en almacén`. |

**Detection indicators and algorithm:** At and after `planned start - 60 minutes`, evaluate each required material against the full remaining required quantity. Warehouse stock is allocated first to OTs with recorded material reservations, then to unreserved OTs by earliest planned start; equal planned starts use the permanent EmusaSoft OT ID as a deterministic tie-breaker. Stock committed to another OT is not available. `materialAvailable` is true only when the resulting allocable quantity covers the full requirement. A partial reservation is not reserved readiness. At and after `planned start - 30 minutes`, require the full quantity to be dispatched; partial dispatch does not pass. Maintain one incident per OT and material requirement, always labeled `Error`. Use `material_not_in_warehouse` when allocable stock is insufficient, `not_reserved_stock_available` when full stock is allocable but the full quantity is not reserved, and `reserved_not_dispatched` when the full quantity is reserved but has not been fully dispatched. Do not infer purchase or supplier-delivery status from unavailable evidence.

**Primary action owner:** `not_reserved_stock_available` or `material_not_in_warehouse` → **Material planner**. `reserved_not_dispatched` → **Warehouse dispatcher or sender**.

**Resolution:** Keep the same incident open, including after actual OT start, until every full-quantity condition required at the current checkpoint is satisfied. Cancellation resolves it on the next healthy evaluation. Rescheduling resolves the current occurrence, reevaluates only against the new 60- and 30-minute checkpoints, and creates a new occurrence only if the rescheduled OT breaches a new checkpoint. If the material was already physically sent and consumed outside EMUSA Soft and the missing historical transactions cannot be proven, an administrator closes A01 and selected same-material missing-dispatch or missing-consumption consequences without resolution; the system must not fabricate reservations, movements, receipts, or consumption. A01 never selects, suppresses, resolves, or closes D03 because material readiness and OT mass balance are independent conditions.


### A02 — Reserved OT material not received within 30 minutes

**Alert label:** Alerta
**Scope:** Reserved material moving toward a work order

| Field | Definition |
|---|---|
| When it happens | Material reserved for a work order remains in transit to that OT without digital receipt for 30 minutes or more. |
| Why the alert exists | A destination-bound material movement has remained `TRANSITO` longer than expected and needs operational follow-up. |
| Possible causes | The movement is delayed, or the destination has not recorded its digital receipt. Monitor cannot infer a separate physical-arrival state from EmusaSoft. |
| Example | A reel reserved for OT 151087.3 is sent to P15 at 09:00 and remains `En tránsito` at 09:31. |

**Detection indicators and algorithm:** Require a material flow linked to a work-order reservation, `TRANSITO` state, no digital receipt, and `current time - sent time >= 30 minutes`. Exclude movements that are not destination-bound material transfers. Once the original movement is received, cancelled, or rejected, close its incident after a complete healthy poll. A cancellation or rejection may create a separately identified reverse movement with its own dispatch clock; that reverse movement is evaluated independently and is not recurrence of the original movement.

**Primary action owner:** Start with the **warehouse dispatcher or sender** and notify the **machine operator** at the recorded destination. Monitor knows the recorded movement and destination but does not claim to know the material's physical location while the movement remains `TRANSITO`.


### A03 — Active OT without consumption after 15 minutes

**Alert label:** Alerta
**Scope:** Printing, lamination, adhesive lamination, and cutting

| Field | Definition |
|---|---|
| When it happens | An OT has been active for 15 minutes without a first consumption declaration. This is a warning, not proof of an error, because setup may legitimately take longer. |
| Why the alert exists | The first raw-material reel may already be in use but not yet represented digitally. |
| Possible causes | Machine setup took longer than expected, or the operator has not yet declared the first reel. |
| Example | OT 151087.3 starts at 09:00 and still has zero consumption at 09:15. Its first valid consumption is declared at 09:27, so the warning closes automatically. |

**Detection indicators and algorithm:** Open the warning when `OT active`, `current time - actual start >= 15 minutes`, and `consumption count = 0`. Close it immediately when the first valid consumption is recorded, even after 20 or 30 minutes, or when the OT closes or is cancelled without consumption. A03 is evaluated from OT activity and first-consumption state; another alert does not suppress it. EmusaSoft permits only one active OT per machine at a time, so concurrent A03 records must belong to different machines.

**Primary action owner:** **machine operator**.

**Resolution:** Close automatically when the first valid consumption is declared or when the OT closes or is cancelled without consumption. EmusaSoft permits consumption declarations while the OT is open; closing or finalizing the OT blocks further input. The technical mapping to `WorkOrder.readOnlyInput` must be verified against the deployed system in Phase 10, but the business rule is not optional in the laboratory: an active, open OT must not be presented as independently blocked. If closed history cannot be reconstructed, close without resolution rather than inventing consumption.


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

**Primary action owner:** **machine operator**, who declares produced and remnant reels.


### A05 — Produced or remnant reel not weighed or not moved from the machine

**Alert label:** Error
**Scope:** Produced- and remnant-reel handling

**Presentation decision — 2026-07-31:** A05 has no pre-threshold `Por vencer` state. Before 30 minutes the condition is normal. At 30 elapsed minutes, an unmet weighing or movement condition becomes `Error` and creates or updates the A05 incident.

**Product decision — 2026-07-31:** Keep A05 as one incident per reel rather than splitting weighing and movement into separate alerts. Present `not_weighed` and `still_at_machine` as two independently clearing checklist items; resolve A05 only when neither reason remains. Reconsider splitting only if the reasons later acquire different owners, thresholds, escalation paths, or closure rules.

**Remnant-reel scope:** A05 uses the same declaration, weighing, labeling, and movement logic for produced reels and remnant raw-material reels. A partially consumed input reel must be declared with its remaining kilograms, weighed, labeled or ticketed, and returned to the raw-material warehouse. The 30-minute weighing and movement checks do not change.

| Field | Definition |
|---|---|
| When it happens | A declared produced or remnant reel has no recorded weight when 30 minutes have elapsed, or is still at the machine when 30 minutes have elapsed instead of being sent to its next OT or appropriate warehouse. |
| Why the alert exists | Without weight, EMUSA Soft cannot calculate the reel's cost or add the correct quantity to inventory. After an OT finishes, the reel must also leave the machine and enter the correct next workflow. |
| Possible causes | Process-team delay, missed weighing, missing scale record, failure to initiate the next movement, or failure to record that movement. |
| Example | CU-98421 was declared at 10:00. At 10:31 it has no weight and remains at P15. The dashboard shows one incident with reasons `not_weighed` and `still_at_machine`. |

**Detection indicators and algorithm:** Maintain one incident per produced or remnant reel. These are **OR conditions**, not AND conditions. Add `not_weighed` when 30 minutes have elapsed since the reel declaration and no scale record exists. Independently add `still_at_machine` when the source OT is finished, 30 minutes have elapsed, and no movement to the required warehouse or next OT exists. The incident may contain either reason or both. Closing the source OT does not resolve A05 and does not prevent a later valid weighing or movement; A05 resolves only when neither reason remains. If movement has begun but is not received within 30 minutes, use `A02` rather than creating another incident.

**Primary action owner:** **Process operator** for both `not_weighed` and `still_at_machine`. For a remnant reel, the warehouse dispatcher or sender is additionally notified as its receiving position.


### A06 — Waste missing or not weighed

**Alert label:** Error posible / Error
**Scope:** Waste registration and weighing

| Field | Definition |
|---|---|
| When it happens | A declared waste bag remains unweighed beyond the configured interval, or OT balance and historical expectations indicate that waste should exist but sufficient waste was not declared. |
| Why the alert exists | Missing or unweighed waste prevents reliable OT balance and waste-control analysis. Waste weight does not allocate the OT’s raw-material cost—the raw-material cost is divided across good production—but it is essential for controlling and later reducing waste. |
| Possible causes | Waste was produced but not declared, a declared bag was not weighed, the waste category is wrong, or statistical expectations do not fit this specific run. |
| Example | Comparable printing OTs of this size normally produce 70–100 kg of waste. The OT closes with only 5 kg declared, while input and good-output estimates leave an unexplained 80 kg gap. |

**Detection indicators and algorithm:** Use two evidence paths in one incident. First, for declared waste, alert when no scale record exists after the configured weighing interval. Second, at closure, compare actual or estimated good-output mass, declared waste, and expected waste against consumed input mass. Source theoretical waste from the quotation configuration chain: `operaciones` → `cotizacion_config_waste` → `cotizacion_config_valores`; use `cotizacion_config_rangos.valor_kg` and `cotizacion_config_rango_valores.valor` for lot-size bands, and `cotizacion_config_waste_gap` plus `cotizacion_config_waste_gap_detalle.id_taxon` for operation/substrate adjustments. Compare that baseline with historical actual waste by operation, substrate/taxon, machine, and OT-size band. A separate aggregate statistics table or materialized view may cache those historical distributions, but it must be derived from OT, waste-serial, and scale records rather than become a second source of truth. When balance evidence points to missing waste, add reason `possible_waste_not_declared`. If D03 also triggers from the same evidence, keep both incidents independent and link their evidence without suppressing either.

**Primary action owner:** Missing or incorrect waste declaration → **machine operator**. Declared waste missing a weight → **Process operator**.

### A07 — Possible raw material consumed but not declared

**Alert label:** Error posible → Error
**Scope:** Operations that produce weighed or statistically estimable output

| Field | Definition |
|---|---|
| When it happens | Actual or statistically estimated good output and waste require more raw-material mass than the OT records as consumed, beyond the configured tolerance. |
| Why the alert exists | Physical output cannot exceed its material input. The digital record probably omits consumption, although an output weight or estimate may also be wrong. |
| Possible causes | Missing consumption declaration, incorrect output weight or estimate, incorrect waste amount, or output associated with the wrong OT. |
| Example | Two produced reels are estimated at 350 kg each, or about 700 kg total, while the OT records only 500 kg of raw-material consumption. The unexplained 200 kg indicates possible undeclared consumption. |

**Detection indicators and algorithm:** Calculate `required input evidence = actual or estimated good-output mass + actual or estimated waste mass` and `consumption gap = required input evidence - declared input consumption`. Open A07 when the gap exceeds the configured tolerance. Prefer actual scale weights. For unweighed reels, estimate mass from meters, width, basis weight, and comparable weighed reels. Statistical evidence creates a possible error; actual verified weights can confirm an error. A07 is evaluated independently from A03. At OT closure, A07 and D03 remain independent; related evidence may be linked without merging or suppressing either incident.

**Primary action owner:** **machine operator**.

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

**Primary action owner:** **Operation shift supervisor**, who must confirm the valid sequence and ensure any floor resequencing is recorded. The machine operator remains an implicated recipient because that operator started the OT.

**Resolution:** If the valid sequence and its reason are recorded after the OT has already started, resolve B01 as explained. Preserve the originally expected OT, the OT that actually started, the start time, and the later update's actor, timestamp, and reason in incident history; the late update must not rewrite the original deviation. If the historical sequence and reason cannot be reconstructed safely, an administrator closes the incident without resolution under the shared administrative-closure rules.

**EmusaSoft ownership boundary:** EmusaSoft determines who is authorized to change its production plan and whether a recorded change is valid. Monitor consumes the resulting approved-plan evidence; it does not define or enforce EmusaSoft plan-edit permissions. The current approved-plan source and validity mapping remain pending source-contract validation.


### B02 — Planned OT has not started on time

**Alert label:** Error

| Field | Definition |
|---|---|
| When it happens | The planned start time has arrived but the expected OT has not started and the plan has not been updated. |
| Why the alert exists | The recorded plan and actual factory execution have diverged. |
| Possible causes | Setup delay, missing materials, unavailable operator, machine problem, or an unrecorded plan change. |
| Example | OT 151230.1 should start on P15 at 16:00, but at 16:01 it has not started and no revised plan exists. |

**Detection indicators and algorithm:** For each machine plan, find the first pending OT whose planned start has arrived or is in the past. Alert when it has no actual start and no approved plan update that supersedes that planned commitment. Maintain one independent condition per `OT + approved plan version`. If the same OT is reprogrammed under a new approved plan version and misses the new start, create a separate B02 occurrence for that new missed commitment. Other alerts remain independent: Monitor does not infer that another alert caused B02, create a cross-alert link, suppress either alert, or couple their lifecycles.

**Primary action owner:** Previous OT still running or schedule simply delayed → **Planner**. Nothing running and no recorded pause → **machine operator** until the real machine state is recorded; after that, the **Planner** owns the plan update.

**Resolution:** B02 resolves only after a healthy evaluation observes either that the OT started or that an approved full-plan update superseded the missed commitment. A late start resolves B02 while its missed-start occurrence remains in history. An approved update may assign a later planned start, remove the OT, or cancel it; each outcome resolves the occurrence for the superseded plan version. If a later approved plan version also misses its start, it creates a separate occurrence. Recording an equipment pause, correcting another alert, or recording any other unrelated action does not resolve B02. If the historical delay can no longer be reconstructed, an administrator closes without resolution and preserves the observed delay and affected plan version.

**EmusaSoft ownership boundary:** EmusaSoft determines whether a production-plan update is approved and which plan version is current. Monitor consumes that evidence and does not infer approval, causality, or plan-edit authorization. The approved-plan version and update mapping remain pending source-contract validation.


### B03 — Machine has no active OT for more than 30 minutes

**Alert label:** Error

| Field | Definition |
|---|---|
| When it happens | The current approved production plan expects a machine to be producing, but the machine has no active OT for more than 30 continuous minutes. |
| Why the alert exists | Planned production time is being lost without a corresponding active work order. |
| Possible causes | Disorganization, missing material, operator delay, maintenance that was not recorded in the production plan, or a plan that was not updated. |
| Example | P09 is scheduled to produce during the shift but has no active OT between 14:00 and 14:31. |

**Detection indicators and algorithm:** Use the current approved production plan to establish one expected-production window for the machine. Within that window, start or continue the idle clock only while no OT is active. Trigger strictly after 30 continuous minutes; equality at 30 minutes does not trigger. An OT paused within its own execution remains an active OT and is outside B03. A planner- or supervisor-initiated whole-day or plan-level suspension, planned shutdown, or no-production period changes the approved plan so production is no longer expected and therefore excludes or clears B03. An equipment-pause record does not independently create that plan state. Maintain one condition per machine and approved expected-production window.

**Primary action owner:** **Planner**, who updates or restructures the approved production plan. The operation shift supervisor remains informed and may initiate the need for a plan-level suspension. The machine operator may be an implicated recipient but cannot resolve B03 by recording an in-OT or equipment pause.

**Resolution:** Close normally after a healthy evaluation observes that an OT is active or that an approved production-plan update makes production suspended or not expected for that interval. A plan-level suspension resolves B03 immediately; it is recorded through the production-planning workflow by an authorized planner or supervisor, not by a machine operator. Recording an in-OT or equipment pause does not resolve B03. If the interval is historical and its cause cannot be recovered, close without resolution and retain the unexplained downtime duration.


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

**Primary action owner:** **Process operator**, who verifies the physical weight, scale record, and reel barcode.


### C02 — Waste amount outside the plausible range

**Alert label:** Error posible

| Field | Definition |
|---|---|
| When it happens | Declared waste weight or waste percentage is materially below or above the expected range for comparable OTs. |
| Why the alert exists | Very low waste may indicate missing waste declarations; very high waste may indicate a wrong value or a real production problem. |
| Possible causes | Missing bag, incorrect weight, wrong waste category, unusual setup loss, quality problem, or atypical run conditions. |
| Example | Comparable 20,000-meter printing OTs normally produce 60–100 kg of waste, but the OT declares 5 kg or 450 kg. |

**Detection indicators and algorithm:** Use two sources. The theoretical source is the quotation matrix: `cotizacion_config_waste`, `cotizacion_config_valores`, kilogram bands in `cotizacion_config_rangos`, band values in `cotizacion_config_rango_valores`, and substrate/taxon adjustments in `cotizacion_config_waste_gap` and `cotizacion_config_waste_gap_detalle`. The empirical source is historical waste serials and their scale records grouped by operation, substrate/taxon, machine, and OT-size band. Store only derived aggregates—sample count, expected value, percentiles, source period, and model version—in a dedicated statistics table or materialized view. Compare current waste with both baselines and show which one triggered the warning.

**Primary action owner:** Suspected declaration or waste-category problem → **machine operator**. Suspected physical weight or scale-record problem → **Process operator**.


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

**Primary action owner:** **machine operator**, who owns the production declaration and the OT opening, pause, and closing records used by the rate calculation.


## D — Work-order closure and material balance

### D01 — OT longitudinal meters and substrate layers do not close

**Alert label:** Error
**Confirmed:** Yes

| Field | Definition |
|---|---|
| When it happens | At OT closure, declared run meters and the used meters of every required substrate layer do not agree within tolerance, or required layers disagree with one another. |
| Why the alert exists | Every required substrate layer should represent the same longitudinal production run. A material discrepancy means the closure evidence is internally inconsistent. |
| Possible causes | Missing or excess consumption declaration, incorrect run meters, incorrect layer or reel association, missing or incorrect remnant evidence, or incorrect weight, core tare, width, or grammage. |
| Example | The OT declares 40,000 m. One layer supports 37,000 m and another supports 43,000 m. D01 records both signed layer gaps and the layer-to-layer mismatch in one occurrence. |

**Detection indicators and algorithm:** D01 is the single deterministic longitudinal closure rule and is evaluated only at OT closure. Estimate meters actually used from every assigned input reel, sum sequential reels only within the same required substrate layer, compare every layer with declared run meters, and compare every pair of required layers. Keep one OT-level occurrence containing every applicable reason and affected layer.

Use neutral business terms: `original usable reel meters` means usable substrate originally present before production; `used layer meters` means meters actually consumed from all reels assigned sequentially to one required layer; `declared run meters` means the OT run meters declared at closure; and `weighed remnant meters` means usable meters remaining on a declared partial reel after weighing. Similar EmusaSoft linear-meter field names do not have verified operational semantics and remain production-mapping dependencies.

Evaluate every required substrate layer independently. Reels used sequentially for the same layer may be summed, but meters from different layers must never be summed into one input total. The same physical reel identity must never contribute to more than one layer in the same OT; a duplicate cross-layer association is insufficient evidence rather than a valid closure result. Every required layer represents the same run and is compared separately with declared run meters and pairwise with every other required layer.

For a reel with no remnant declared at closure, treat it as fully used and calculate `net used kg = measured initial gross kg - verified core tare kg`; zero remnant meters are implicit. If verified core tare is missing, negative, or not smaller than initial gross weight, evidence for that layer is insufficient. The source schema contains core-tare candidates, but a connected source contract must still prove the applicable value and its relationship to each reel.

For a declared partial reel with a weighed remnant, calculate `net used kg = measured initial gross kg - measured remnant gross kg`. The core remains in both measurements and cancels; do not subtract it twice. Equivalently, calculate original usable reel meters from `initial gross kg - verified core tare kg`, calculate weighed remnant meters from `remnant gross kg - the same verified core tare kg`, and subtract the latter from the former. Both paths must agree. Initial and remnant gross weights must be positive, and remnant gross must be smaller than initial gross.

If a remnant is declared but not yet weighed, evidence is incomplete: do not create a new D01 occurrence and do not resolve or change an existing occurrence. Evaluate immediately when the remnant is weighed and all other evidence is complete. A05 independently owns the declared remnant's 30-minute weighing and movement obligations. Do not substitute an unverified stored linear-meter value for missing weight evidence.

Convert each reel's net used mass to meters using `used meters = net used kg / (width m × grammage kg/m²)`, equivalent to `net used kg × 1000 / (width m × grammage g/m²)`. Width and grammage must be positive and normalized before evaluation.

Calculate theoretical order mass from declared outputs without waiting for produced reels to be weighed: `total order kg = Σ(declared output meters × output width m × output grammage g/m² / 1000)`. Calculate `allowed kg = min(0.05 × total order kg, 150 kg)` and `allowed meters = allowed kg / (total order kg / total declared output meters)`. The `0.05` fraction and `150 kg` cap are approved configurable parameters. Use the same allowed meters for all layer-to-run and pairwise comparisons.

D01 triggers when any required layer satisfies `declared run meters - used layer meters > allowed meters`, any layer satisfies `used layer meters - declared run meters > allowed meters`, or any pair satisfies `absolute(used layer A meters - used layer B meters) > allowed meters`. Equality at every tolerance boundary is clear. Pairwise checks are required because two layers may each be within run tolerance in opposite directions while differing from each other beyond tolerance.

Reasons are `declared_meters_exceed_layer_input`, `layer_input_exceeds_declared_meters`, and `substrate_layers_do_not_match`. The former D04 reason `unexplained_consumed_meters` is retired historical metadata, not an active rule reason.

Evidence records declared run meters, theoretical order kilograms, allowed kilograms and meters, every required layer and its used meters, every signed layer-to-run gap, every pairwise gap beyond tolerance, and the contributing reels and measurement path. Missing and invalid fields are reported when evidence is insufficient. Repeated unchanged complete evaluations do not duplicate an occurrence or evidence. Changed complete evidence updates the same open occurrence. A later complete healthy evaluation resolves only when every layer agrees with the run and every other layer within tolerance. Failed, partial, invalid, or insufficient cycles preserve an existing occurrence unchanged. A later recurrence after a proved clear interval creates a new occurrence.

D01 is a specific deterministic explanation. When its evidence explains the same chain, it may replace or enrich generic A04 evidence and prevent a duplicate A04 incident for the same discrepancy. A04 remains the earlier physical/statistical rewinder-capacity warning, A05 remains the per-reel handling incident, and D03 remains the independent aggregate OT kilogram balance. D01 never suppresses D03.

**Primary action owner:** **machine operator**.

**Resolution:** Weigh a declared partial remnant, add or correct consumption, or correct gross weight, core tare, layer/reel association, width, grammage, declared run meters, or output dimensions in EmusaSoft. If locked history cannot be reconstructed safely, an administrator closes without resolution with mandatory reason, comment, administrator reference, timestamp, and frozen run, layer, reel, signed-gap, pairwise-gap, tolerance, and source evidence. Administrative closure suppresses only the same uninterrupted condition until a healthy clear evaluation expires suppression.

**Consolidation record — 2026-08-01:** D04 was retired from the active catalog and executable inventory because its useful opposite-direction meter check is part of this same invariant. D01 retains its OT natural key and key-schema version; its rule and candidate-query versions change for the expanded predicate and evidence schema. Historical D04 records remain historical and are not production evidence.


### D02 — Completed OT has delivered reserved reels unconsumed

**Alert label:** Error
**Confirmed:** Yes

| Field | Definition |
|---|---|
| When it happens | An OT completes all planned production, but a reserved reel delivered to the machine remains unconsumed. |
| Why the alert exists | If full production was completed, the delivered reserved material should have been used and declared. |
| Possible causes | Missing consumption declaration, incorrect completion status, or incorrect reservation quantity. |
| Example | Four reels were reserved and delivered; full production was completed, but only three were consumed. |

**Detection indicators and algorithm:** Evaluate one delivered reserved reel per `OT + article serial`. Require all three conditions: the OT is closed with verified good output at or above 90% of its planned production quantity, the reserved reel was delivered to the machine, and the reel has no valid positive consumption quantity. The 10% shortfall tolerance is inclusive: exactly 90% counts as full production, while any lower result is treated as partial or truncated production and does not trigger D02. Planned and good-output quantities must be positive or non-negative respectively and expressed in the same verified production unit; missing or invalid quantity evidence is insufficient rather than clear. Any valid positive consumption means the reel was used for D02, even when only part of the reserved reel was consumed. A returned or reassigned unused reel clears the condition. `ordenes_trabajo.motivo_cierre` exists in the current source mapping, but its values, operator provenance, and complete-versus-truncated meaning are not verified, so D02 must not use it as a completion signal until that contract is established.

**Resolution and recurrence:** Resolve the current occurrence after a healthy evaluation proves positive consumption, return or reassignment of the unused reel, correction of the delivery or reservation, or correction showing that the OT did not meet the 90% completion boundary. A later occurrence for the same `OT + article serial` requires source-valid evidence that an earlier consumption or disposition record was corrected or invalidated; Monitor must not invent recurrence from a synthetic state reversal. D02 and D03 remain independent even when the same missing-consumption evidence contributes to both predicates.

**Primary action owner:** Missing consumption declaration → **machine operator**. Incorrect reservation quantity or reel selection → **Material planner**.


### D03 — OT input, good production, and waste do not balance

**Alert label:** Error

| Field | Definition |
|---|---|
| When it happens | After the OT closes and every applicable non-ink/non-adhesive raw material, production reel, and waste record has a measured weight, the absolute mass-balance gap exceeds 5% of total net good-production mass. The percentage is an initial configurable parameter. |
| Why the alert exists | The completed, fully weighed OT still contains an unexplained physical mass difference. |
| Possible causes | Missing or incorrect material consumption, production, waste, OT association, or scale evidence. |
| Example | Measured raw-material input plus theoretical ink and adhesive is 1,500 kg, net weighed good production is 1,300 kg, and weighed waste is 90 kg. The 110 kg gap exceeds the current tolerance of 65 kg, which is 5% of net good production. |

**Detection indicators and algorithm — approved 2026-08-01; independence clarified 2026-08-05:** Monitor calculates D03; EmusaSoft does not currently provide a verified authoritative OT-level imbalance state. A later source-owned replacement is permitted only after its state and semantics are verified. Do not evaluate D03 until the OT is closed and every applicable non-ink/non-adhesive raw material, production reel, and waste record has a measured weight. Missing required weights are insufficient evidence and must not create D03. Use the scale's net production-reel weight; it already excludes the core, so Monitor must not subtract core weight again. Ink and adhesive are the only approved unweighed raw-material inputs: calculate each applicable contribution from the OT's planned production area at `2 g/m²`. Apply both cumulatively when the OT includes both printing and lamination. Calculate `adjusted input kg = measured other raw-material kg + theoretical ink kg + theoretical adhesive kg`, `balance gap = adjusted input kg - net weighed good-production kg - weighed waste kg`, and `allowed gap = 0.05 × net weighed good-production kg`. Open `Error` only when `absolute balance gap > allowed gap`; equality does not trigger. D03 has no `Error posible` or estimated-output path. Do not subtract an undefined generic process-loss value. If E05 makes an extrusion-container consumption negative, D03 is blocked until that source evidence is corrected. D03 is never suppressed by another alert. When another alert describes the same source issue, both incidents remain independent and each resolves only when its own predicate becomes clear or through its own audited administrative closure.

**Primary action owner:** Missing or incorrect OT declarations → **machine operator**; suspected weighing evidence → **Process operator**. Other alerts keep their own owners and do not replace D03 routing.

**Resolution:** Correct the specific material, production, waste, OT-association, or scale evidence and recalculate after all required weights remain present. Resolve automatically only when D03's own absolute gap is at or below the configured tolerance. A shared source correction may independently resolve D03 and other alerts in the same healthy cycle. If the historical evidence cannot be reconstructed safely, an administrator may close D03 without resolution through D03's own audited closure action, preserving the final input, output, waste, theoretical additions, gap, tolerance, and linked incidents.

## E — Extrusion and Exlam resin-container alerts

Every E01–E05 rule applies to both Extrusion and Exlam. Both operations use resin recipes and material containers. Operation-specific machine, recipe, warehouse, container, and shift assignments supply the runtime evidence and recipients. Each container holds one specific resin used by the current OT. Separately, every applicable machine has a machine-specific safety warehouse holding resin for current and near-term orders. General output handling, weighing, movement, rate, and aggregate closure still use A04/A05, C06, consolidated D01, and D03. E04 is separate because resin proportions can be wrong even when total mass balances. E05 is a hard same-OT container invariant that prevents negative calculated consumption from contaminating E04 or D03.

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

**Primary action owner:** Replenishment was not requested or short-term demand was not covered → **Material planner**. Replenishment was requested but resin has not reached the machine-specific safety warehouse → **Warehouse dispatcher or sender** assigned to resins.


### E02 — Extrusion OT opened without complete starting-container inventory

**Alert label:** Error

| Field | Definition |
|---|---|
| When it happens | `quickStartWorkOrder` opens an extrusion OT but the operator has not declared starting kilograms for every required resin container associated with the recipe. |
| Why the alert exists | Actual resin consumption cannot be calculated without a complete opening inventory for every container. |
| Possible causes | The operator omitted a container, omitted its starting quantity, or did not complete the opening declaration. |
| Example | The recipe uses three resins, but the OT opens with starting kilograms recorded for only two associated containers. |

**Detection indicators and algorithm:** At OT opening, compare required recipe materials from `orden_trabajo_receta_snapshot` with the associated containers. Use `orden_trabajo_contenedor_cierre_snapshot.saldo_apertura` as the opening quantity and map `id_contenedor` through `orden_trabajo_material_stock_contenedores.id_articulo` to obtain the resin. Require one actual opening quantity in kilograms for every required container and resin. Product rules require `saldo_apertura` to be recorded when the OT opens and every snapshot to have `id_contenedor`. Product rules also require one opening and one closing snapshot per OT. Phase 10 will test that the deployed implementation follows those rules; Monitor does not substitute mutable current inventory.

**Primary action owner:** **machine operator**, who opens the OT and declares starting container inventory.


### E03 — Previous closing stock does not match the next opening stock

**Alert label:** Error

| Field | Definition |
|---|---|
| When it happens | For the same physical extrusion container and resin, the previous closed OT’s ending kilograms differ from the next OT’s declared starting kilograms beyond the configured container-measurement tolerance. |
| Why the alert exists | Inventory continuity between consecutive work orders is broken, so at least one opening, closing, addition, or removal was recorded incorrectly. |
| Possible causes | Incorrect previous ending stock, incorrect current starting stock, or an unrecorded resin addition or removal between OTs. |
| Example | OT 151300 closes container C-04 with 420 kg of resin R-17. The next OT opens the same container and resin with 365 kg and no intervening movement. |

**Detection indicators and algorithm:** Identify consecutive OTs for the same machine and compare the same container and resin. Use `orden_trabajo_contenedor_cierre_snapshot.saldo_final` from the previous OT and `saldo_apertura` from the current OT, mapping resin through `id_contenedor`. Alert when `absolute(previous closing kg - current opening kg)` exceeds the configured container-measurement tolerance and no traceable intervening movement explains the difference. All balances are kilograms. Monitor evaluates the values supplied by EmusaSoft; Phase 10 will test deployed capture and correction behavior. Show both OT codes, both declarations, the container, resin, elapsed interval, and intervening movements.

**Primary action owner:** **machine operator**. Route to the previous OT's operator when its closing value is identified as wrong, or to the current OT's operator when its opening value is identified as wrong. Until the incorrect side is known, notify both operators and make the current OT's operator primary.


### E04 — Consumed resin proportions do not match the recipe

**Alert label:** Error posible / Error

| Field | Definition |
|---|---|
| When it happens | Total resin mass may balance production plus waste, but one or more actual resin or screw percentages differ from the recipe beyond a configurable ingredient tolerance. |
| Why the alert exists | Aggregate balance cannot detect a wrong formulation: excess of one resin can offset a shortage of another while total kilograms remain correct. |
| Possible causes | Incorrect starting or ending container inventory, undeclared sack addition, resin associated with the wrong screw, or the wrong recipe snapshot. |
| Example | The recipe requires 5% resin A and 95% resin B. Actual calculated consumption is 10% and 90%. Total resin kilograms still balance output plus waste, so D03 passes but E04 alerts. |

**Detection indicators and algorithm:** For every container, calculate `actual consumed kg = opening kg + recorded resin additions kg - ending kg`, using `saldo_apertura`, all additions recorded while the OT runs, and `saldo_final`. The only business inputs to consumption are the opening quantity, recorded resin additions, and ending quantity. `ajuste_inicial`, `ingreso_contenedor`, `ajuste_final`, and `consumo_real` are delivered fields whose implementation meaning remains unconfirmed, so Monitor must not assign them a formula without Phase 10 evidence. Map resin through `id_contenedor`; compare the resulting resin/screw percentages with `orden_trabajo_receta_snapshot` using a separately configurable ingredient tolerance. Apply the same E04 code to extrusion and Exlam. Run D03 independently; E04 and D03 may pass or fail independently and must not become duplicate incidents.

**Primary action owner:** **machine operator**, who owns the opening, added, ending, screw-association, and closing declarations used to calculate actual resin proportions.


### E05 — Closing container inventory exceeds available inventory

**Alert label:** Error

| Field | Definition |
|---|---|
| When it happens | At OT closure, a resin container's declared ending kilograms exceed its declared opening kilograms plus every addition recorded during that OT beyond the configured container-measurement tolerance. |
| Why the alert exists | The calculation would produce negative resin consumption, which is physically impossible. At least one opening, addition, or ending value is wrong or an inbound addition was not recorded. |
| Possible causes | Opening inventory was understated, ending inventory was overstated, a resin addition was omitted, or an addition was associated with the wrong container or resin. |
| Example | The OT opens a container with 50 kg and records a 10 kg addition. At closure the operator declares 400 kg remaining. `50 + 10 - 400 = -340 kg` calculated consumption, so E05 opens. If the real opening inventory was 500 kg and 100 kg were consumed with no addition, the correct ending inventory is 400 kg. |

**Detection indicators and algorithm:** At OT closure, calculate `available kg = opening kg + recorded resin additions kg` and `calculated consumption kg = available kg - ending kg` for every `OT + container + resin`. Use `saldo_apertura`, additions recorded during the OT, and `saldo_final`. Do not treat `ajuste_inicial`, `ingreso_contenedor`, `ajuste_final`, or `consumo_real` as additions or as the authoritative formula until Phase 10 tests establish their deployed behavior. Open E05 when calculated consumption is below the negative container-measurement tolerance. Equality means zero consumption and does not trigger E05. Do not use a container with negative calculated consumption in E04 formulation percentages or D03 aggregate balance; mark those dependent calculations as blocked until the container data is corrected. If E03 already proves that the same current-OT opening quantity is wrong, add the E05 invariant breach as evidence and reason to E03 instead of creating a duplicate notification.

**Primary action owner:** **machine operator**, who declares opening inventory, additions, and ending inventory for the OT.

**Resolution:** Correct the opening inventory, missing or incorrect addition, container/resin association, or ending inventory in EmusaSoft. Recalculate E05 first, then resume E04 and D03 only after every affected container has nonnegative calculated consumption. If the OT is locked and the exact quantities cannot be reconstructed, close without resolution and preserve the container discrepancy for EmusaSoft follow-up outside Monitor.

## General alert distribution

Apply these rules to every alert:

1. Always inform the factory manager.
2. Always inform the affected operation's shift supervisor and its configured technical leader.
3. Inform the operator assigned to the OT, machine, and shift when the exception concerns machine execution or production.
4. Determine the primary action owner from the alert code and reason mapping documented under each alert. This routing is deterministic and configurable; an LLM never selects operational recipients.
5. Add only implicated supporting positions: material planner, planner, warehouse dispatcher or sender, warehouse supervisor or leader, process operator, or process supervisor. Include them only when the evidence or required action implicates their area.
6. Resolve actual people through Monitor's Operational Responsibility Roster, supplemented by the OT and actor recorded on the relevant ERP evidence. Positions define routing; personal names are runtime results, never hard-coded rules.
7. Deduplicate recipients and correlated incidents so each person receives one notification for the same incident chain.

### Operational Responsibility Roster

Monitor must own a master table and administration UI that assign people to standardized positions, applicable operations or warehouse type, rotating group, and effective date. It must preserve assignment history, support temporary replacements and validity periods, and warn about missing or conflicting assignments. Alert routing uses this table deterministically to translate every required position into an actual recipient.

Coverage and applicable fields are determined by the selected standardized position. Administrators do not choose a separate coverage rule. Machine and work-order assignments are operational runtime data resolved from EmusaSoft evidence and are not stored in this people master.

| Standardized position | Derived coverage | Operation requirement | Warehouse requirement | Group requirement |
|---|---|---|---|---|
| Factory manager | Entire factory | Blocked | Blocked | Blocked |
| Operation shift supervisor | Operation + group | One or more operations, required | Blocked | One of A, B, or C, required |
| Technical leader | Operation | One or more operations, required | Blocked | Blocked |
| Machine operator | Machine + group | Exactly one operation, required | Blocked | One of A, B, or C, required |
| Material planner | Entire factory | Blocked | Blocked | Blocked |
| Planner | Entire factory | Blocked | Blocked | Blocked |
| Warehouse dispatcher or sender | Warehouse + group | Blocked | Raw materials or work in process, required | One of A, B, or C, required |
| Warehouse supervisor or leader | Warehouse + group | Blocked | Raw materials or work in process, required | One of A, B, or C, required |
| Process operator | Warehouse + group | Blocked | Work in process, fixed | One of A, B, or C, required |
| Process supervisor | Warehouse + group | Blocked | Work in process, fixed | One of A, B, or C, required |

### Distribution exceptions and overrides

Codes not listed use the seven general rules without modification.

| Code | Override or exception |
|---|---|
| A01 | Do not notify the machine operator. Insufficient allocable stock or incomplete reservation routes to the material planner; ready reserved material awaiting full dispatch routes to the warehouse dispatcher or sender. The operation shift supervisor and technical leader still receive the alert. |
| A02 | The material has already been sent. Notify both the warehouse dispatcher or sender and the machine operator, plus their applicable shift supervisors. The reason determines which position is primary. |
| A05 | The process operator owns both weighing and movement. A produced reel also notifies the process supervisor. A remnant raw-material reel additionally notifies the warehouse dispatcher or sender and its supervisor or leader. |
| A06 | The machine operator owns waste declaration. When weighing is implicated, also notify the process operator and process supervisor. |
| B03 | The Planner is the primary action owner. Inform the operation shift supervisor and technical leader; include the planned shift operator when known as an implicated recipient, but an operator cannot resolve B03 by recording an in-OT or equipment pause. |
| D02 | Add the material planner only when reservation quantity or reel selection is implicated. Add raw-material warehouse positions only when delivery or return evidence implicates them. |
| E01 | Do not use OT reservation routing. Notify the material planner and the warehouse dispatcher or sender assigned to resins, not every user in that warehouse zone. |
| E03 | This incident spans two OTs: notify the machine operators for the previous and current OTs and any identified process operator involved between them. |

## Distribution role glossary

These are positions, not personal names. Actual people are resolved through the Operational Responsibility Roster, supplemented by the OT and actor recorded on the relevant ERP evidence.

| Position | Working definition |
|---|---|
| Factory manager | Plant-wide operational authority who receives every alert for awareness, regardless of the action owner. |
| Operation shift supervisor | Supervisor responsible for the affected operation during the incident's shift. |
| Technical leader | Configured leader responsible for technical oversight of the entire affected operation, when that operation has this position. |
| Machine operator | Operator whose position, operation, and rotating group are maintained in the roster. The affected work order and machine are resolved dynamically from the operational record. This position opens and closes the OT, receives material digitally, declares consumption, production, remnant reels, waste, starting and ending container inventory, and equipment pauses. |
| Material planner | Position responsible for selecting and reserving raw-material reels and managing short-term material availability, including supplier follow-up when required material is not available in-house. |
| Planner | Position responsible for the production plan, OT sequence, planned dates, and plan-wide delay updates. |
| Warehouse dispatcher or sender | Shift position assigned to either the raw-material or work-in-process warehouse. For raw materials, the position dispatches reserved input material, receives returned remnant reels, and replenishes machine-specific resin safety warehouses when assigned to resins. |
| Warehouse supervisor or leader | Supervisor assigned to either the raw-material or work-in-process warehouse and responsible for that warehouse group's dispatch, receipt, and inventory actions. |
| Process operator | Position assigned to the work-in-process warehouse that collects, weighs, moves, receives, and stores produced or remnant reels and waste. This combines the former process or movement actor, scale operator, and processed-material or work-in-process warehouse role. |
| Process supervisor | Supervisor assigned to the work-in-process warehouse and responsible for process work, scale work, and processed-material warehouse activities. |
