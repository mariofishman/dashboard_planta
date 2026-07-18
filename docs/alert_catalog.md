# Factory Alert Catalog

This is the editable source for reviewing the factory dashboard's alert rules. Browser annotations should be applied back to this file so decisions remain persistent.

## Catalog structure

Alert codes identify the type of operational control:

- `A`: material, inventory, and production-data registration;
- `B`: production-plan adherence and machine activity;
- `C`: statistical or physical plausibility of recorded values;
- `D`: work-order closure and material balance;
- `E`: extrusion-specific alerts, to be discovered later;
- `F`: extrusion-lamination (`Exlam`) alerts, to be discovered later; and
- `G`: sealing or bag-making alerts, to be discovered later.

The current `A` and `D` rules primarily apply to printing, lamination, adhesive lamination, and cutting. They must not be assumed to cover extrusion, Exlam, or sealing without separate discovery.

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

### A02 — Material flow not received within 30 minutes

**Status:** Error  
**Scope:** OT material movement and non-OT relocation

| Field | Definition |
|---|---|
| When it happens | A sent material flow remains in transit without digital receipt for more than 30 minutes. |
| Why the alert exists | The material may have arrived physically while the receiver failed to reproduce that action in EMUSA Soft, leaving the digital location incorrect. |
| Possible causes | Physical delivery occurred but the operator did not receive it digitally, or the physical movement itself is delayed. A wrong destination is not a valid cause for OT-reserved material because the workflow derives the relationship from the reservation and target work order. |
| Example | A reserved reel is sent to P15 at 09:00 and physically arrives, but at 09:31 its flow remains `En tránsito` because the operator has not recorded receipt. |

**Detection indicators and algorithm:** Find material-flow details with a sent or in-transit status, no `receivedAt`, and `current time - sent time > 30 minutes`. Show whether the flow is linked to a work order or is a relocation without a reservation. ERP catalog evidence includes `workOrderId`, `workOrderMaterialId`, origin, destination, status, receiver, and `receivedAt`. Once a movement is received, close this incident rather than creating another location alert.

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

### A04 — Possible undeclared produced reel

**Status:** Possible error  
**Scope:** Rewinder-based operations without PLC signals

| Field | Definition |
|---|---|
| When it happens | The estimated material still unaccounted for on the rewinder exceeds the maximum mass the rewinder can physically hold. |
| Why the alert exists | Enough raw material has been consumed that another finished reel should already have been declared. |
| Possible causes | The operator forgot or delayed a production declaration, or the statistical output-weight assumptions are inaccurate. |
| Example | The OT has consumed 1,500 kg. Declared output reels are estimated to represent 850 kg, declared waste represents 100 kg, and allowed process loss is 50 kg. The estimated remaining mass is 500 kg. If the rewinder limit is 400 kg, at least approximately 100 kg cannot remain on the machine and a produced reel may be missing. |

**Detection indicators and algorithm:** Calculate `estimated remaining mass = consumed input mass - estimated mass of declared output - declared or estimated waste mass - allowed process loss`. Use actual weights for weighed outputs. For declared but unweighed outputs, estimate weight from declared meters, width, basis weight, and historical data for comparable reels. Warn when `estimated remaining mass > maximum rewinder capacity + tolerance`. No PLC completion signal is available in version 1.

### A05 — Produced reel not weighed or not moved from the machine

**Status:** Por vencer, then Error  
**Scope:** Produced-reel handling

| Field | Definition |
|---|---|
| When it happens | A declared produced reel has no recorded weight within 30 minutes, or a reel from a finished OT remains at the machine for more than 30 minutes instead of being sent to its next OT or appropriate warehouse. |
| Why the alert exists | Without weight, EMUSA Soft cannot calculate the reel's cost or add the correct quantity to inventory. After an OT finishes, the reel must also leave the machine and enter the correct next workflow. |
| Possible causes | Process-team delay, missed weighing, missing scale record, failure to initiate the next movement, or failure to record that movement. |
| Example | CU-98421 was declared at 10:00. At 10:31 it has no weight and remains at P15. The dashboard shows one incident with reasons `not_weighed` and `still_at_machine`. |

**Detection indicators and algorithm:** Maintain one incident per produced reel. Add `not_weighed` when `current time - production declaration >= 30 minutes` and no scale record exists. Add `still_at_machine` when the source OT is finished, 30 minutes have elapsed, and no movement to the required warehouse or next OT exists. If movement has begun but is not received within 30 minutes, use `A02` rather than creating another incident.

### A06 — Waste missing or not weighed

**Status:** Possible error or Error  
**Scope:** Waste registration and weighing

| Field | Definition |
|---|---|
| When it happens | A declared waste bag remains unweighed beyond the configured interval, or OT balance and historical expectations indicate that waste should exist but sufficient waste was not declared. |
| Why the alert exists | Missing or unweighed waste prevents correct material balance, costing, and inventory reconciliation. |
| Possible causes | Waste was produced but not declared, a declared bag was not weighed, the waste category is wrong, or statistical expectations do not fit this specific run. |
| Example | Comparable printing OTs of this size normally produce 70–100 kg of waste. The OT closes with only 5 kg declared, while input and good-output estimates leave an unexplained 80 kg gap. |

**Detection indicators and algorithm:** Use two evidence paths in one incident. First, for declared waste, alert when no scale record exists after the configured weighing interval. Second, at closure, compare actual or estimated good-output mass, declared waste, expected statistical waste for the operation and OT size, and allowed process loss against consumed input mass. When balance evidence points to missing waste, add reason `possible_waste_not_declared`. If the same imbalance already exists as `D03`, attach the waste reason to that incident instead of duplicating it.

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

### B02 — Planned OT has not started on time

**Status:** Error

| Field | Definition |
|---|---|
| When it happens | The planned start time has arrived but the expected OT has not started and the plan has not been updated. |
| Why the alert exists | The recorded plan and actual factory execution have diverged. |
| Possible causes | Setup delay, missing materials, unavailable operator, machine problem, or an unrecorded plan change. |
| Example | OT 151230.1 should start on P15 at 16:00, but at 16:01 it has not started and no revised plan exists. |

**Detection indicators and algorithm:** For each machine plan, find the first pending OT whose planned start is in the past. Alert when it has no actual start and no approved rescheduling event. If another specific incident explains the delay, link it as the reason rather than duplicating the operational problem.

### B03 — Machine has no active OT for more than 30 minutes

**Status:** Error

| Field | Definition |
|---|---|
| When it happens | A machine expected to be producing has no active OT for more than 30 minutes. |
| Why the alert exists | Planned production time is being lost without a corresponding active work order. |
| Possible causes | Disorganization, unrecorded machine stoppage, missing material, operator delay, maintenance, or a plan that was not updated. |
| Example | P09 is scheduled to produce during the shift but has no active OT between 14:00 and 14:31. |

**Detection indicators and algorithm:** Require that the machine is scheduled or expected to operate, has no active OT, and has remained in that state for more than 30 minutes. Exclude recorded maintenance, planned shutdown, approved pause, or no-production schedule periods.

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

**Detection indicators and algorithm:** Compare recorded net weight with hard physical limits and statistical percentiles for the same operation, machine, product family, width, basis weight, and OT size. Hard-limit violations are errors; statistical outliers are possible errors.

### C02 — Waste amount outside the plausible range

**Status:** Possible error

| Field | Definition |
|---|---|
| When it happens | Declared waste weight or waste percentage is materially below or above the expected range for comparable OTs. |
| Why the alert exists | Very low waste may indicate missing waste declarations; very high waste may indicate a wrong value or a real production problem. |
| Possible causes | Missing bag, incorrect weight, wrong waste category, unusual setup loss, quality problem, or atypical run conditions. |
| Example | Comparable 20,000-meter printing OTs normally produce 60–100 kg of waste, but the OT declares 5 kg or 450 kg. |

**Detection indicators and algorithm:** Build expected minimum and maximum waste by operation, machine, product family, OT-size band, width, basis weight, setup pattern, and historical distribution. Compare declared waste weight and percentage against those limits.

### C03 — Declared reel dimensions do not match the OT specification

**Status:** Error or Possible error

| Field | Definition |
|---|---|
| When it happens | A produced reel's declared width, basis weight, material, or other defining characteristic differs from the OT specification beyond tolerance. |
| Why the alert exists | The reel may be mislabeled, associated with the wrong OT, or represented incorrectly in inventory. |
| Possible causes | Wrong barcode, typing error, incorrect OT selection, master-data problem, or approved substitution not recorded. |
| Example | The OT specifies 1,200 mm width, but the output reel is recorded as 1,020 mm. |

**Detection indicators and algorithm:** Compare each produced reel's defining fields with the OT output specification and configured tolerances. Treat approved substitutions separately.

### C04 — Impossible numeric or chronological value

**Status:** Error

| Field | Definition |
|---|---|
| When it happens | A recorded quantity is zero or negative when physically impossible, or timestamps occur in an impossible order. |
| Why the alert exists | These values cannot represent the physical process and will corrupt calculations. |
| Possible causes | Typing error, unit conversion error, integration defect, or incorrect device time. |
| Example | A reel has negative net weight, or its weighing timestamp precedes its production declaration. |

**Detection indicators and algorithm:** Apply field-level hard constraints and event-order rules such as `production <= movement <= weighing <= downstream receipt`, allowing only explicitly supported exceptions.

### C05 — Duplicate reel or duplicate operational event

**Status:** Error

| Field | Definition |
|---|---|
| When it happens | The same unique code or physical event is recorded more than once where only one record should exist. |
| Why the alert exists | Duplicate declarations can double inventory, weight, consumption, production, or cost. |
| Possible causes | Repeated scan, retry after a slow response, duplicate integration event, or reused barcode. |
| Example | CU-98421 receives two production declarations or two active weighing records. |

**Detection indicators and algorithm:** Enforce or monitor uniqueness by reel unique code and event type. Detect repeated events with the same source, OT, reel, quantity, and near-identical timestamp.

### C06 — Declared production rate outside the machine's plausible range

**Status:** Possible error

| Field | Definition |
|---|---|
| When it happens | Declared meters or kilograms divided by elapsed runtime imply a production rate outside the machine's physical or historical range. |
| Why the alert exists | The quantity, timestamps, or machine association may be incorrect. |
| Possible causes | Extra zero, wrong unit, wrong start or end time, wrong machine, or exceptional production requiring review. |
| Example | A press normally runs below 350 m/min, but the recorded OT implies 1,200 m/min. |

**Detection indicators and algorithm:** Compare `declared production / effective runtime` with machine hard limits and statistical ranges segmented by product and setup. Exclude recorded pauses and setup time according to the final runtime definition.

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

### D03 — OT input, good production, and waste do not balance

**Status:** Possible error or Error

| Field | Definition |
|---|---|
| When it happens | At closure, consumed input mass cannot be reconciled with good production, waste, and allowed process loss. |
| Why the alert exists | One or more production, waste, consumption, or weighing records may be missing or incorrect. |
| Possible causes | Undeclared produced reel, undeclared waste, unweighed output, wrong weight, missing consumption, or statistical assumptions that do not fit this OT. |
| Example | Consumed input is 1,500 kg. Actual and estimated good production totals 1,260 kg, waste totals 90 kg, and allowed process loss is 30 kg. The unexplained 120 kg exceeds tolerance. |

**Detection indicators and algorithm:** Calculate `balance gap = consumed input mass - good-output mass - waste mass - allowed process loss`. Use actual weights when available. For declared but unweighed good output, estimate weight from meters, width, basis weight, and comparable historical reels. For missing or unweighed waste, use the expected waste distribution for the operation and OT-size band as supporting evidence. Recalculate whenever actual weights arrive. Statistical gaps are possible errors; gaps that remain beyond tolerance after actual weights are available are errors. If evidence identifies a specific `A03`, `A04`, `A05`, `A06`, `D01`, or `D02` cause, enrich that incident and suppress a duplicate `D03` alert.

## Future operation-specific families

### E — Extrusion

Define separate alerts for resin and additive inputs, silos or containers, formulation or blend consistency, extrusion output, trim waste, and extrusion-specific mass balance. Do not reuse reel-based rules without validation.

### F — Extrusion lamination (`Exlam`)

Define separate alerts for paired or multi-layer inputs, coating or bonding materials, layer sequence, curing requirements, and Exlam-specific output and balance rules.

### G — Sealing or bag making

Define separate alerts for reel-to-bag conversion, unit and bundle counts, partial packages, sealing waste, packaging declarations, and count-versus-weight reconciliation.

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
