# Factory Alert Catalog

This is the editable source for reviewing the factory dashboard's alert rules. Browser annotations should be applied back to this file so decisions remain persistent.

## Catalog structure

Alert codes identify the type of operational control:

- `A`: material, inventory, and production-data registration;
- `B`: production-plan adherence and machine activity;
- `C`: statistical or physical plausibility of recorded values;
- `D`: work-order closure and material balance;
- `E`: extrusion-specific alerts;
- `F`: extrusion-lamination (`Exlam`) specific alerts; and
- `G`: sealing or bag-making specific alerts.

Shared `A`, `C`, and `D` rules apply across operations whenever the same evidence and failure condition exist. Families `E`, `F`, and `G` contain only genuinely operation-specific rules and explicitly reference shared rules instead of duplicating them.

Statuses describe timing or certainty, not severity:

- `Error`: a defined rule has already been violated.
- `Por vencer`: a deadline is approaching but has not yet been violated.
- `Possible error`: available evidence suggests a problem but does not prove it.

## One-incident rule

The dashboard must not create duplicate alerts for the same underlying problem.

- One incident is keyed by the affected OT, reel or material requirement, and workflow stage.
- Later evidence updates the existing incident with a more precise reason.
- A specific deterministic rule replaces or enriches a generic statistical warning.
- An OT-level balance warning must not appear separately when its imbalance has already been explained by a specific missing-consumption, missing-output, missing-waste, or weighing incident.

## Alert distribution model

Every alert in this catalog is associated with a work order. At the incident timestamp, resolve `OT → machine → operation → shift → named operator`. Then resolve `machine → associated warehouse → zone of influence → named users`. Alerts involving material movement may add the source warehouse, destination warehouse, weighing point, or next-machine warehouse. The current shift record decides which operator receives the alert; zone membership alone must not notify every person assigned to that warehouse.

The names used below are concrete examples from the current configuration, not permanent hard-coded recipients. David Alba is the confirmed reservation owner. For P15 examples, Jesus Lara is configured in both Impresión and the P15 zone, while Jackeline Pastor is configured as an administrator of Gerencia de Producción and Impresión and is also in the P15 zone. Alexander Chujandama Cahuaza is configured in AMP-001. J. Cubas is configured at Balanza PP. For KF1 extrusion examples, Claudio Yahuarcani Huayamba and Danitza Silvestre are configured in the KF1 zone, and Danitza is also configured in Extrusion. At runtime, use the actual OT, shift roster, event actor, and live zone assignments; if one person is reached through multiple paths, notify that person once.

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

## Changes for iteration 6 (final)

- Limited A02 to reserved material moving toward a work order; non-OT storage relocations are excluded.
- Restored the iteration-4 A04 rule for possible undeclared produced reels based only on rewinder capacity; bags are excluded.
- Changed the E01 safety-inventory horizon from 24 hours to 4 hours while retaining the 3-hour pre-start checkpoint.
- Removed bag-production declaration from A04. No replacement bag-specific alert is included without a separate supported rule.

## Changes for iteration 7

- Added an alert-distribution model based on `OT → machine → operation → shift → named operator` and the machine warehouse as a proxy into zones of influence.
- Added a distribution rule under every active alert card.
- Required runtime resolution of named people from the OT, shift roster, event actor, and live zone assignments instead of notifying every user in a zone.
- Added concrete named examples from current P15, AMP-001, Balanza PP, and KF1 configuration for review; these examples are not hard-coded recipients.

## A — Material, inventory, and production-data registration

### A01 — Required material not ready before OT start

**Status:** Por vencer, then Error
**Scope:** Printing, lamination, adhesive lamination, and cutting

| Field | Definition |
|---|---|
| When it happens | At 60 minutes before planned OT start, required material is unavailable in the warehouse or has not been reserved. At 30 minutes before start, the same incident is updated if the material has not been dispatched. |
| Why the alert exists | The OT is at risk of starting without the required material at the machine. |
| Possible causes | The reservation owner did not reserve the material; warehouse stock is unavailable; purchasing issued an order but the supplier has not delivered; the material was reserved but warehouse dispatch is late. |
| Example | OT 151200.1 starts at 10:00. At 09:00, one substrate is not reserved because it is not in stock. At 09:30, the incident states: `Not dispatched because material is not reserved and not available in the warehouse`. |

**Detection indicators and algorithm:** At `planned start - 60 minutes`, evaluate required materials, reservation records, warehouse availability, and open purchase or supplier-delivery status. At `planned start - 30 minutes`, add dispatch status. Maintain one incident per OT and required material. Use reason codes such as `not_reserved_stock_available`, `material_not_in_warehouse`, `purchase_or_supplier_pending`, and `reserved_not_dispatched`.

**Resolution:** Keep one incident open until every condition required at the current checkpoint is satisfied. At the 60-minute checkpoint, readiness is resolved only when the required material is both available in the warehouse and reserved for the OT; availability alone does not resolve a missing reservation, and reservation alone does not resolve missing stock. At the 30-minute checkpoint, the remaining dispatch condition is resolved only when the ready material is sent to the machine. Rescheduling the OT also closes the current incident because it removes the current deadlines and creates new 60-minute and 30-minute checkpoints. EMUSA Soft exposes `updateWorkOrderPlannedDates` and `recalculatePlannedDates`; the latter returns the affected work orders after recalculation.

**Alert distribution:** Notify David Alba when the reason is missing reservation. For an AMP-001 → P15 example, notify the named AMP-001 person on the source-warehouse shift, such as Alexander Chujandama Cahuaza when the roster selects him, and the named P15 operator on the OT shift, such as Jesus Lara when selected. Include Jackeline Pastor for P15/printing oversight. Change the primary recipient with the reason: David for reservation, AMP-001 for stock or dispatch, and the P15 operator when machine readiness is affected.

### A02 — Reserved OT material not received within 30 minutes

**Status:** Error  
**Scope:** Reserved material moving toward a work order

| Field | Definition |
|---|---|
| When it happens | Material reserved for a work order remains in transit to that OT without digital receipt for more than 30 minutes. |
| Why the alert exists | Reserved material may have arrived physically at the machine while the operator failed to record its receipt in EMUSA Soft. |
| Possible causes | Physical delivery occurred without digital receipt, or movement to the work-order machine is delayed. |
| Example | A reel reserved for OT 151087.3 is sent to P15 at 09:00 and remains `En tránsito` at 09:31. |

**Detection indicators and algorithm:** Require a material flow linked to a work-order reservation, a sent or in-transit status, no `receivedAt`, and `current time - sent time > 30 minutes`. Exclude relocations between warehouses or storage locations when the material is not moving toward a work order. Once reserved material is received, close the incident.

**Alert distribution:** Resolve both ends of the reserved OT movement. For an AMP-001 → P15 example, notify Alexander Chujandama Cahuaza only when he is the named source-shift sender, Jesus Lara only when he is the named P15 receiver for the OT shift, and Jackeline Pastor for printing oversight. The unresolved action determines the primary person: sender while dispatch or transport is pending, receiver after physical arrival requires digital receipt.

### A03 — Active OT without consumption after 15 minutes

**Status:** Error  
**Scope:** Printing, lamination, adhesive lamination, and cutting

| Field | Definition |
|---|---|
| When it happens | An OT has been active for 15 minutes without a first consumption declaration. |
| Why the alert exists | After 15 minutes of setup or operation, the first raw-material reel being used should already be represented digitally. |
| Possible causes | The operator started the OT, spent the initial setup period preparing the machine, and then failed to declare the first reel being used. |
| Example | OT 151087.3 starts at 09:00. At 09:15 it remains active with zero consumed reels. |

**Detection indicators and algorithm:** Require `OT active`, `current time - actual start >= 15 minutes`, and `consumption count = 0`. Production declarations may support the same incident but must not create a duplicate alert.

**Alert distribution:** Notify the exact operator assigned to the OT and shift and the affected operation supervisor. For a P15 example, Jesus Lara receives it only if the shift record identifies him as the operator; Jackeline Pastor receives the supervisory view. Do not notify AMP-001 personnel unless A01 or A02 is also open for the same material.

### A04 — Possible undeclared produced reel

**Status:** Possible error  
**Scope:** Rewinder-based operations without PLC signals

| Field | Definition |
|---|---|
| When it happens | The estimated material still unaccounted for on the rewinder exceeds the maximum mass the rewinder can physically hold. |
| Why the alert exists | Enough raw material has been consumed that another finished reel should already have been declared. |
| Possible causes | The operator forgot or delayed a production declaration, or the statistical output-weight assumptions are inaccurate. |
| Example | The OT has consumed 1,500 kg. Declared output reels represent an actual or estimated 900 kg and declared or estimated waste represents 100 kg. The remaining 500 kg equals the rewinder limit. If more input is consumed without another output declaration, the remaining mass exceeds physical capacity and a produced reel may be missing. |

**Detection indicators and algorithm:** Calculate `estimated remaining mass = consumed input mass - actual or estimated declared-output mass - actual or estimated declared-waste mass`. Do not subtract a generic process loss. Use actual scale weight from `balanza_carga_detalle_registros.peso_neto` when available. For unweighed output, use `articulo_serial`, `orden_trabajo_salidas`, width, grammage, declared linear meters when present, and comparable weighed reels. The theoretical check is `kg ≈ grammage_g_m2 × width_m × length_m ÷ 1000`. If length is unavailable, use a historical model adjusted for width and mark the result as lower-confidence. Warn when the remaining mass exceeds configured rewinder capacity plus statistical tolerance. Bags are excluded from A04.

**Alert distribution:** Notify the exact operator on the OT shift because the missing declaration belongs to that machine run, plus the operation supervisor. For a P15 example, route to Jesus Lara only when the roster identifies him for that shift and to Jackeline Pastor for oversight. Add J. Cubas only when weighing evidence is part of the incident; do not notify the full P15 zone.

### A05 — Produced reel not weighed or not moved from the machine

**Status:** Por vencer, then Error  
**Scope:** Produced-reel handling

| Field | Definition |
|---|---|
| When it happens | A declared produced reel has no recorded weight within 30 minutes, or a reel from a finished OT remains at the machine for more than 30 minutes instead of being sent to its next OT or appropriate warehouse. |
| Why the alert exists | Without weight, EMUSA Soft cannot calculate the reel's cost or add the correct quantity to inventory. After an OT finishes, the reel must also leave the machine and enter the correct next workflow. |
| Possible causes | Process-team delay, missed weighing, missing scale record, failure to initiate the next movement, or failure to record that movement. |
| Example | CU-98421 was declared at 10:00. At 10:31 it has no weight and remains at P15. The dashboard shows one incident with reasons `not_weighed` and `still_at_machine`. |

**Detection indicators and algorithm:** Maintain one incident per produced reel. These are **OR conditions**, not AND conditions. Add `not_weighed` when `current time - production declaration >= 30 minutes` and no scale record exists. Independently add `still_at_machine` when the source OT is finished, 30 minutes have elapsed, and no movement to the required warehouse or next OT exists. The incident may contain either reason or both. If movement has begun but is not received within 30 minutes, use `A02` rather than creating another incident.

**Alert distribution:** Use the reason to name recipients. For a P15 example, notify the OT-shift operator such as Jesus Lara when the roster selects him; notify J. Cubas at Balanza PP for `not_weighed`; notify the named process or movement actor for `still_at_machine`; and include Jackeline Pastor for printing oversight. If both reasons exist, merge the recipient lists and notify each person once.

### A06 — Waste missing or not weighed

**Status:** Possible error or Error  
**Scope:** Waste registration and weighing

| Field | Definition |
|---|---|
| When it happens | A declared waste bag remains unweighed beyond the configured interval, or OT balance and historical expectations indicate that waste should exist but sufficient waste was not declared. |
| Why the alert exists | Missing or unweighed waste prevents reliable OT balance and waste-control analysis. Waste weight does not allocate the OT’s raw-material cost—the raw-material cost is divided across good production—but it is essential for controlling and later reducing waste. |
| Possible causes | Waste was produced but not declared, a declared bag was not weighed, the waste category is wrong, or statistical expectations do not fit this specific run. |
| Example | Comparable printing OTs of this size normally produce 70–100 kg of waste. The OT closes with only 5 kg declared, while input and good-output estimates leave an unexplained 80 kg gap. |

**Detection indicators and algorithm:** Use two evidence paths in one incident. First, for declared waste, alert when no scale record exists after the configured weighing interval. Second, at closure, compare actual or estimated good-output mass, declared waste, and expected waste against consumed input mass. Source theoretical waste from the quotation configuration chain: `operaciones` → `cotizacion_config_waste` → `cotizacion_config_valores`; use `cotizacion_config_rangos.valor_kg` and `cotizacion_config_rango_valores.valor` for lot-size bands, and `cotizacion_config_waste_gap` plus `cotizacion_config_waste_gap_detalle.id_taxon` for operation/substrate adjustments. Compare that baseline with historical actual waste by operation, substrate/taxon, machine, and OT-size band. A separate aggregate statistics table or materialized view may cache those historical distributions, but it must be derived from OT, waste-serial, and scale records rather than become a second source of truth. When balance evidence points to missing waste, add reason `possible_waste_not_declared`. If the same imbalance already exists as `D03`, attach the waste reason to that incident instead of duplicating it.

**Alert distribution:** Notify the named OT-shift operator, the operation supervisor, and the named weighing or waste actor when their evidence is implicated. For a P15 example, this can resolve to Jesus Lara, Jackeline Pastor, and J. Cubas respectively. If the warning is only statistical, make Jackeline the primary reviewer; if a specific unweighed bag identifies an event actor, make that named actor primary.

## B — Production-plan adherence and machine activity

### B01 — OT started outside the latest approved plan sequence

**Status:** Error

| Field | Definition |
|---|---|
| When it happens | An operator starts an OT that is not next in the latest approved sequence. The floor may reorganize the planner's plan, but the change must be recorded before the OT starts. |
| Why the alert exists | The machine is no longer following the current recorded production plan created by the planner and subsequently adjusted, when necessary, on the factory floor. |
| Possible causes | Operator selected the wrong OT, the floor is disorganized, the previous OT's material did not arrive, or the operator skipped an OT without first updating the plan. |
| Example | The planner's current sequence is OT 151099.1 followed by OT 151104.1. The previous material is late, so the operator starts 151104.1 without recording a sequence change. |

**Detection indicators and algorithm:** At actual OT start, compare the started OT with the first pending OT in the latest recorded plan for that machine. Do not alert if an authorized floor update changed the sequence before start.

**Alert distribution:** Notify the person who started the OT, the named operator for that machine and shift, and the operation supervisor. For a P15 example, Jesus Lara receives it only when the shift or start event identifies him, and Jackeline Pastor receives the supervisory view. Notify David Alba only when a linked A01 readiness incident shows that reservation caused the sequence change; do not include him for an unrelated sequencing error.

### B02 — Planned OT has not started on time

**Status:** Error

| Field | Definition |
|---|---|
| When it happens | The planned start time has arrived but the expected OT has not started and the plan has not been updated. |
| Why the alert exists | The recorded plan and actual factory execution have diverged. |
| Possible causes | Setup delay, missing materials, unavailable operator, machine problem, or an unrecorded plan change. |
| Example | OT 151230.1 should start on P15 at 16:00, but at 16:01 it has not started and no revised plan exists. |

**Detection indicators and algorithm:** For each machine plan, find the first pending OT whose planned start is in the past. Alert when it has no actual start and no approved rescheduling event. If another specific incident explains the delay, link it as the reason rather than duplicating the operational problem.

**Resolution:** If the preceding OT is still running, the planner supplies the expected delay and selects `Update All Plan`; the system shifts every subsequent OT on that machine by that delay. This can use the existing planned-date operations `updateWorkOrderPlannedDates` and `recalculatePlannedDates`. If nothing is running, the user must record a categorized equipment pause—such as maintenance, intentional hold, or waiting for material—with an explanation when required, then update the plan by the expected delay. The ERP already exposes `equipo_pausa` with pause type, other reason, pause time, and resume time.

**Alert distribution:** Notify the named operator scheduled on the OT shift, the person who owns the current plan update, and the operation supervisor. For a P15 example, Jesus Lara is included only if the shift roster identifies him, while Jackeline Pastor receives the supervisory view. Add David Alba only when the delay is explained by a linked missing-reservation incident.

### B03 — Machine has no active OT for more than 30 minutes

**Status:** Error

| Field | Definition |
|---|---|
| When it happens | A machine expected to be producing has no active OT for more than 30 minutes. |
| Why the alert exists | Planned production time is being lost without a corresponding active work order. |
| Possible causes | Disorganization, unrecorded machine stoppage, missing material, operator delay, maintenance, or a plan that was not updated. |
| Example | P09 is scheduled to produce during the shift but has no active OT between 14:00 and 14:31. |

**Detection indicators and algorithm:** Require that the machine is scheduled or expected to operate, has no active OT, and has remained in that state for more than 30 minutes. Exclude recorded maintenance, planned shutdown, approved pause, or no-production schedule periods.

**Resolution:** Record the machine’s real state using the equipment-pause workflow, including category, explanation when required, and expected duration. Then shift the remaining plan using the same `Update All Plan` behavior described in `B02`. Close `B03` when an OT starts, a valid pause is recorded, or the plan is updated so the machine is no longer expected to be running during that interval.

**Alert distribution:** Notify the operator assigned to the machine and shift, the person recorded on any pause event, and the operation supervisor. For a P15 example, route to Jesus Lara only when the roster identifies him and to Jackeline Pastor for oversight. If a linked A01 or A02 incident explains the idle machine, keep that alert's named warehouse recipients and do not create a second broad warehouse notification.

## C — Statistical and physical plausibility

These rules detect values that are possible to enter but inconsistent with physical limits, OT specifications, or reliable historical distributions. Statistical limits must be segmented by relevant factors such as operation, machine, material, width, basis weight, and OT size.

### C01 — Produced reel weight outside the plausible range

**Status:** Possible error

| Field | Definition |
|---|---|
| When it happens | A produced reel's recorded weight is below the expected minimum or above the expected maximum for comparable production. |
| Why the alert exists | An implausible weight may corrupt inventory quantity, cost, yield, and downstream calculations. |
| Possible causes | Typing error, incorrect scale unit, wrong barcode, scale problem, or unusual production requiring review. |
| Example | A single reel is recorded as 3,000 kg when comparable reels normally fall between 250 and 600 kg. |

**Detection indicators and algorithm:** Read the actual net weight from `balanza_carga_detalle_registros.peso_neto`, joined through `id_articulo_serial`. Obtain OT, output, substrate/article, width, grammage, operation, and timestamps from `articulo_serial`, `orden_trabajo_salidas`, and `ordenes_trabajo`. When linear meters exist, calculate `expected kg = grammage_g_m2 × width_m × length_m ÷ 1000`. Build historical ranges from previously weighed serials using the same substrate and grammage, segmented by operation and machine, then normalize or filter by width. Prefer the previous 12 months when sample size is sufficient. A derived statistics table or materialized view may cache sample count, median, percentiles, and model version; raw serial and scale records remain authoritative. Hard physical-limit violations are errors; statistical outliers are possible errors.

**Alert distribution:** Notify the named person who created the scale record, the OT-shift operator, and the operation supervisor. For a P15/Balanza PP example, this can resolve to J. Cubas as the weighing actor, Jesus Lara as the on-shift operator, and Jackeline Pastor for oversight. Make the scale actor primary for a hard recording error and the supervisor primary for a statistical-only review.

### C02 — Waste amount outside the plausible range

**Status:** Possible error

| Field | Definition |
|---|---|
| When it happens | Declared waste weight or waste percentage is materially below or above the expected range for comparable OTs. |
| Why the alert exists | Very low waste may indicate missing waste declarations; very high waste may indicate a wrong value or a real production problem. |
| Possible causes | Missing bag, incorrect weight, wrong waste category, unusual setup loss, quality problem, or atypical run conditions. |
| Example | Comparable 20,000-meter printing OTs normally produce 60–100 kg of waste, but the OT declares 5 kg or 450 kg. |

**Detection indicators and algorithm:** Use two sources. The theoretical source is the quotation matrix: `cotizacion_config_waste`, `cotizacion_config_valores`, kilogram bands in `cotizacion_config_rangos`, band values in `cotizacion_config_rango_valores`, and substrate/taxon adjustments in `cotizacion_config_waste_gap` and `cotizacion_config_waste_gap_detalle`. The empirical source is historical waste serials and their scale records grouped by operation, substrate/taxon, machine, and OT-size band. Store only derived aggregates—sample count, expected value, percentiles, source period, and model version—in a dedicated statistics table or materialized view. Compare current waste with both baselines and show which one triggered the warning.

**Alert distribution:** Notify the named OT-shift operator, the person who weighed or declared the waste, and the operation supervisor. For a P15 example, the resolved names can be Jesus Lara, J. Cubas, and Jackeline Pastor. A statistical-only outlier goes first to Jackeline; a concrete wrong or missing record goes first to the named event actor.

### Removed after ERP review: C03, C04, and C05

- `C03` is removed because reel specifications are inherited from the work order and software; operators do not declare them independently.
- `C04` is removed because production-dependent records cannot be created before the production record in the current workflow, and specifications are system-derived.
- `C05` is removed because the system generates serial codes through the production workflow and production-series configuration. The MCP catalog confirms `produceArticleSerial` and `serie_producciones`; it does not expose backend constraint source code, so the current product rule supplied by EMUSA remains authoritative.

### C06 — Declared production rate outside the machine's plausible range

**Status:** Possible error

| Field | Definition |
|---|---|
| When it happens | Produced meters or kilograms divided by the OT’s recorded execution interval imply a production rate materially above or below the machine’s physical or historical range. |
| Why the alert exists | The declared production may be wrong, or the OT may have been opened too early or closed too late. |
| Possible causes | Incorrect production declaration, OT left open during a stoppage, OT closed late, unrecorded pause, or exceptional production requiring review. |
| Example | A Comexi press expected near 250 m/min or a faster Miraflex press expected near 350 m/min produces a recorded rate of 1,200 m/min or an abnormally low rate. |

**Detection indicators and algorithm:** Use `ordenes_trabajo.fecha_inicio_ejecucion` and `fecha_fin_ejecucion`, which come from opening and closing the OT rather than typed timestamps. Subtract recorded equipment pauses from `equipo_pausa`. Divide declared meters and kilograms by effective runtime. Compare against `equipos.velocidad_maquina` and historical rates for the same machine, operation, substrate/product, width, and setup. Detect both implausibly high and implausibly low rates. The alert should state whether the likely issue is production quantity or OT open/close timing.

**Alert distribution:** Notify the named OT opener or closer implicated by the calculation, the operator assigned to the shift, and the operation supervisor. For a P15 example, route to Jesus Lara only when the event or roster identifies him and to Jackeline Pastor for oversight. Do not add warehouse personnel because the machine warehouse is only the zone proxy for finding the correct production users.

## D — Work-order closure and material balance

### D01 — Declared meters exceed consumed-reel meters

**Status:** Error  
**Confirmed:** Yes

| Field | Definition |
|---|---|
| When it happens | At closure, declared run meters materially exceed the estimated meters provided by consumed reels. |
| Why the alert exists | The declared production cannot be explained by recorded consumption. |
| Possible causes | Missing consumption declaration, incorrect run meters, incorrect reel data, or incorrect closure. |
| Example | Consumed reels support approximately 30,000 m, but the operator declares 40,000 m. |

**Detection indicators and algorithm:** Estimate meters in every consumed reel from weight, width, and basis weight. Sum them and compare them with declared run meters. Alert when the difference exceeds the configured tolerance. This is the primary closure rule.

**Alert distribution:** Notify the named person who closed the OT, the operator assigned to the closing shift, and the operation supervisor. For a P15 example, use `closingUserId` and the shift roster to decide whether Jesus Lara is included, and include Jackeline Pastor for oversight. Add J. Cubas only when an incorrect or missing scale weight contributes to the discrepancy.

### D02 — Completed OT has delivered reserved reels unconsumed

**Status:** Error  
**Confirmed:** Yes

| Field | Definition |
|---|---|
| When it happens | An OT completes all planned production, but a reserved reel delivered to the machine remains unconsumed. |
| Why the alert exists | If full production was completed, the delivered reserved material should have been used and declared. |
| Possible causes | Missing consumption declaration, incorrect completion status, or incorrect reservation quantity. |
| Example | Four reels were reserved and delivered; full production was completed, but only three were consumed. |

**Detection indicators and algorithm:** Require all three conditions: full planned production completed, reserved reels delivered to the machine, and `delivered reserved reels - consumed reels` is not empty. Do not apply automatically to truncated OTs.

**Alert distribution:** Notify the named closing user, the operator on the closing shift, the operation supervisor, and David Alba because the incident may involve reservation quantity. For a P15 example, this can include Jesus Lara when identified by the shift and Jackeline Pastor for oversight. Notify AMP-001 personnel such as Alexander Chujandama Cahuaza only when the evidence shows a delivery or return action assigned to that source warehouse.

### D03 — OT input, good production, and waste do not balance

**Status:** Possible error or Error

| Field | Definition |
|---|---|
| When it happens | At closure, the absolute mass-balance gap exceeds 5% of total good-production mass. The percentage is an initial configurable parameter. |
| Why the alert exists | One or more production, waste, consumption, or weighing records may be missing or incorrect. |
| Possible causes | Undeclared produced reel, undeclared waste, unweighed output, wrong weight, missing consumption, or statistical assumptions that do not fit this OT. |
| Example | Consumed input is 1,500 kg, good production is 1,300 kg, and waste is 90 kg. The 110 kg gap exceeds the current tolerance of 65 kg, which is 5% of good production. |

**Detection indicators and algorithm:** Calculate `balance gap = consumed input mass - good-output mass - waste mass` and `allowed gap = 0.05 × total good-production mass`. Alert when `absolute balance gap > allowed gap`. Store `0.05` as a configurable parameter so it can change later. Do not subtract an undefined generic process-loss value. Use actual scale weights from `balanza_carga_detalle_registros` when available. For declared but unweighed output, estimate from `articulo_serial`, `orden_trabajo_salidas`, width, grammage, declared linear meters when present, and comparable weighed serials. For missing or unweighed waste, use both the quotation waste matrix (`cotizacion_config_waste`, kilogram ranges and substrate/taxon gaps) and historical waste distributions. Recalculate whenever actual weights arrive. Statistical gaps are possible errors; gaps that remain beyond tolerance after actual weights are available are errors. If evidence identifies a specific `A03`, `A04`, `A05`, `A06`, `D01`, or `D02` cause, enrich that incident and suppress a duplicate `D03` alert.

**Alert distribution:** Notify the named closing user, the OT-shift operator, and the operation supervisor. Add only the people implicated by the reason that explains the gap: J. Cubas for weighing, David Alba for reservation, or the named source-warehouse person for material movement. For a P15 example, Jesus Lara and Jackeline Pastor are included only when the OT and current configuration resolve to them; deduplicate recipients already notified by the specific A or D incident.

## E — Extrusion-specific alerts

Extrusion containers each hold one specific resin used by the current OT. Separately, every extrusion machine has a machine-specific safety warehouse holding resin for current and near-term orders. General output handling, weighing, movement, rate, and aggregate closure still use A04/A05, C06, and D03. E04 is separate because resin proportions can be wrong even when total mass balances.

### E01 — Required extrusion safety inventory is incomplete

**Status:** Por vencer, then Error
**Initial parameters:** 4-hour safety horizon; alert 3 hours before the affected OT starts. Both values may become configurable.

| Field | Definition |
|---|---|
| When it happens | Three hours before an extrusion OT starts, a required resin or additive is missing from the machine-specific safety warehouse or its stock is insufficient for the next 4 hours of scheduled demand. Extrusion materials are not reserved per OT. |
| Why the alert exists | The affected or following OT may stop because required formulation material is not available near the machine. |
| Possible causes | The planner or supervisor did not request replenishment of the machine-specific safety warehouse on time. |
| Example | At 11:00, an extrusion OT planned for 14:00 requires resin R-17, but the safety warehouse assigned to that machine has insufficient R-17 for scheduled demand through the next 4 hours. |

**Detection indicators and algorithm:** Read recipe demand from `orden_trabajo_receta_snapshot` and planned production from the affected and following extrusion OTs. Calculate demand for every recipe material across the next 4 hours. Compare it with resin stock in the warehouse assigned to that machine, using `Warehouse` and `ArticleWarehouseStock` or the equivalent stock query after confirming the machine-to-warehouse mapping. Do not use `getExtrusionContainersInventory` as the safety-stock source: those containers represent the resins loaded for the current OT. Do not use A01 reservation or dispatch logic.

**Alert distribution:** Notify the named extrusion operator scheduled for the affected OT and shift, the named users of the machine-specific safety warehouse, and the extrusion supervisor. For a KF1 example, this can resolve to Claudio Yahuarcani Huayamba as the shift/zone recipient and Danitza Silvestre as the configured KF1 and Extrusion oversight recipient. Do not notify David Alba because extrusion safety stock is not reserved per OT.

### E02 — Extrusion OT opened without complete starting-container inventory

**Status:** Error

| Field | Definition |
|---|---|
| When it happens | `quickStartWorkOrder` opens an extrusion OT but the operator has not declared starting kilograms for every required resin container associated with the recipe. |
| Why the alert exists | Actual resin consumption cannot be calculated without a complete opening inventory for every container. |
| Possible causes | The operator omitted a container, omitted its starting quantity, or did not complete the opening declaration. |
| Example | The recipe uses three resins, but the OT opens with starting kilograms recorded for only two associated containers. |

**Detection indicators and algorithm:** At OT opening, compare required recipe materials from `orden_trabajo_receta_snapshot` with the containers associated through `quickStartWorkOrder`. Require one actual opening quantity for every `locationId + articleId`. The ERP catalog confirms container association and current inventory but does not expose an explicitly named persisted opening-quantity field. Before implementation, verify whether the opening snapshot is stored through `WorkOrderMaterial.quantityIncoming`, the linked `locationItem.quantity`, or another backend field. If no immutable opening snapshot exists, add one; current mutable inventory alone is insufficient evidence.

**Alert distribution:** Notify the named person who opened the extrusion OT, the operator assigned to that shift, and the extrusion supervisor. For a KF1 example, route to Claudio Yahuarcani Huayamba only when the opening event or shift roster identifies him and to Danitza Silvestre for KF1/Extrusion oversight. The KF1 warehouse zone is the proxy used to find these named production users.

### E03 — Previous closing stock does not match the next opening stock

**Status:** Error

| Field | Definition |
|---|---|
| When it happens | For the same physical extrusion container and resin, the previous closed OT’s ending kilograms differ from the next OT’s declared starting kilograms beyond the configured container-measurement tolerance. |
| Why the alert exists | Inventory continuity between consecutive work orders is broken, so at least one opening, closing, addition, or removal was recorded incorrectly. |
| Possible causes | Incorrect previous ending stock, incorrect current starting stock, or an unrecorded resin addition or removal between OTs. |
| Example | OT 151300 closes container C-04 with 420 kg of resin R-17. The next OT opens the same container and resin with 365 kg and no intervening movement. |

**Detection indicators and algorithm:** Identify consecutive OTs for the same machine and compare the same `locationId + articleId`. Use `WorkOrderMaterialStockContainer.closeQuantityReturnedReal` from the previous OT and the immutable opening quantity captured for the current OT. Alert when `absolute(previous closing kg - current opening kg)` exceeds the configured container-measurement tolerance. Show both OT codes, both declarations, the container, resin, elapsed interval, and any intervening material movements.

**Alert distribution:** Notify the named closing user of the previous OT, the named opening user and shift operator of the current OT, and the extrusion supervisor. For a KF1 example, Claudio Yahuarcani Huayamba is included only when one of those records identifies him, and Danitza Silvestre receives the oversight view. If an intervening material movement identifies another actor, include that named person instead of all KF1-zone users.

### E04 — Consumed resin proportions do not match the recipe

**Status:** Possible error or Error

| Field | Definition |
|---|---|
| When it happens | Total resin mass may balance production plus waste, but one or more actual resin or screw percentages differ from the recipe beyond a configurable ingredient tolerance. |
| Why the alert exists | Aggregate balance cannot detect a wrong formulation: excess of one resin can offset a shortage of another while total kilograms remain correct. |
| Possible causes | Incorrect starting or ending container inventory, undeclared sack addition, resin associated with the wrong screw, or the wrong recipe snapshot. |
| Example | The recipe requires 5% resin A and 95% resin B. Actual calculated consumption is 10% and 90%. Total resin kilograms still balance output plus waste, so D03 passes but E04 alerts. |

**Detection indicators and algorithm:** For every resin and screw, calculate `actual consumed kg = opening kg + added kg - ending kg`. Divide each resin amount by total actual resin consumption to obtain its percentage. Compare it with the corresponding percentage in `orden_trabajo_receta_snapshot` using a separately configurable ingredient tolerance. Apply the same E04 code to extrusion and Exlam. Run D03 independently for total input-versus-output-plus-waste balance; E04 and D03 may pass or fail independently and must not become duplicate incidents.

**Alert distribution:** Notify the named OT-shift operator, the people who recorded opening, additions, and ending inventory when their values are implicated, and the extrusion or Exlam supervisor. For a KF1 extrusion example, this can resolve to Claudio Yahuarcani Huayamba and Danitza Silvestre. If D03 is also open, merge the named recipient lists and send one notification per person.

## F — Extrusion-lamination (`Exlam`)

Exlam consumes one or two substrate reels and uses resins instead of adhesive. Reuse A01/A02/A03 for substrate flow, A04/A05 for output, C06 for rate, D01/D03 for closure, and E01–E04 for resin inventory and formulation. Former F01 is removed because wrong resin proportions are the same E04 condition in extrusion and Exlam.

## G — Sealing or bag making

Sealing consumes reels and produces bags measured in units or thousands. Reuse A01/A02/A03 for input reels, A05 for output handling where applicable, A06/C02 for waste, C06 for rate, and D01/D03 for closure. A04 remains specific to rewinder-capacity evidence for produced reels and does not apply to bags handled by workers and placed into boxes. No bag-production declaration alert is included until a separate rule is defined and supported by ERP evidence.

Former G02 is removed. ERP catalog review confirms that `WorkOrderOutput` stores `quantityResult`, full/partial bundle counters, and `quantityPerPackage`, but no independently declared bundle-total operation was found. Therefore the proposed 9,250-versus-10,250 mismatch is not established as a possible user error. Revisit only if the actual sealing UI proves those values are entered independently.

## Excluded rules

| Rule | Reason |
|---|---|
| Consumed reel was not reserved for the OT | Impossible: EMUSA Soft prevents this consumption. |
| Reserved OT material sent to an arbitrary destination | The current workflow derives the OT/material relationship and destination; relocation without a reservation is a separate non-OT flow. |
| Production declared while an active OT has no consumption | Duplicate: `A03` already covers the active OT without consumption. |
| Rewinder completion detected directly | No PLC or machine-completion signal currently exists. |
| Physical label was not printed | Not observable without printer acknowledgment or print-job failure data. |
| Scale discovers an undeclared reel | Useful as late reconciliation evidence, but too late to be the primary warning. |
| Truncated OT | Normal production condition; not inherently a digital-versus-physical mismatch. |
| Incomplete reel used downstream | Removed as a separate alert. Correct upstream registration, weighing, movement, and balance controls should prevent it. |
