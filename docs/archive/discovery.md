# Archived EMUSA Soft Factory Operations Dashboard Discovery

> **Deprecated historical document.** This file preserves early discovery and has no current product authority. Use `docs/product_definition.md` for the current product definition and the active specialized documents it identifies.

## Purpose

This is the canonical detailed record of product-discovery findings for Monitor. It captures confirmed operating knowledge, candidate exception rules, available evidence, unresolved decisions, and the current product boundary.

Use this document for detailed discovery. Keep `project_context.md` as the concise project handoff and `dashboard_rationale.md` as the stable product rationale.

The canonical alert catalog is `docs/alert_catalog.md`. Its final browser publication is `prototype/alert-catalog/final/index.html`; annotated review iterations remain in `prototype/alert-catalog/v1/` through `prototype/alert-catalog/v10/`.

## Product direction

The product is a live operational exception dashboard. It should compare the expected production and material flow with events recorded in EMUSA Soft, then inform the relevant factory personnel when required events are missing, late, contradictory, or unbalanced.

The dashboard complements the ERP. It does not replace production, inventory, weighing, or work-order workflows.

### Current product boundary

The earlier informational-dashboard-only version was superseded through design iteration. The current product has four main screens:

- **Dashboard:** current and historical alert analysis, filtering, reporting, and drill-down.
- **Chat list:** conversations in which the current user participates.
- **Chat detail:** message history, replies, attachments, and structured alert objects.
- **Operational Responsibility Roster:** administration of position assignments used for deterministic alert routing; conceptual, with no approved prototype yet.

Monitor still does not edit EmusaSoft records or replace existing factory applications. The architecture roadmap may sequence engineering work, but those phases are not separate product releases and do not remove any of the four screens from the current product definition.

## Users and operational organization

### Primary users

- Factory manager: should have access to and remain aware of all exceptions.
- Operation supervisors: should monitor exceptions affecting their operation during their shift.
- Technical operation leaders: should receive exceptions affecting the operation they lead.
- Process-team supervisors and personnel: should receive exceptions involving movement, pickup, weighing, curing, or delivery between operations.

All authorized users need dashboard access. Visibility should be broad, while operational relevance determines who must be notified first.

### Factory operations

The known operations are:

1. Extrusion
2. Extrusion lamination (`Exlam`)
3. Printing presses
4. Adhesive lamination
5. Cutting
6. Bag making, also called sealing

Each operation has three rotating shifts. Shifts are 12 hours; two shifts work each day and the three shifts rotate so personnel rest on alternating days.

Some important operations also have technical leaders. Printing has one or two leaders whose responsibilities include the presses, cliché preparation, and ink preparation.

### Process team

The process team moves material within the factory. Its work is distinct from warehouse dispatch. For a produced reel, the process team may:

1. collect it from the machine;
2. take it to the scale;
3. weigh it; and
4. move it to a curing or waiting warehouse, or directly to the next operation.

The process team and its supervisors are important dashboard users whenever an exception depends on one of these actions.

## Notification and responsibility model

Ownership identifies the standardized operational position responsible for attention. The Operational Responsibility Roster maps that position to the applicable person by operation, machine, shift, and effective date.

- The factory manager should always be aware of every exception.
- Supervisors and technical leaders of the affected operation should be made aware immediately.
- Process personnel and their supervisors should be made aware when their movement, pickup, weighing, or delivery action is involved.
- All authorized users may see the dashboard simultaneously.
- The dashboard should not automatically blame an individual when the evidence could indicate a process delay, missing record, device issue, configuration problem, or software defect.

The exact external notification channels have not been selected.

## Current operational flow and candidate exceptions

The rules below are discovery findings, not yet implementation-ready specifications. Configurable thresholds and uncertain interpretations are identified explicitly.

### 1. Work-order planning and raw-material reservation

When a work order is planned, the material planner manually reserves the raw-material reels intended for it. Most raw materials are reels, and each reel has a unique code (`Código Único`).

The reservation tells warehouse personnel exactly which reels to send. Warehouse personnel should fulfill the reservation rather than decide independently which reels belong to a work order.

Candidate exception:

- At 60 minutes before planned start, required material is unavailable in the warehouse or has not been reserved. Missing stock may reflect a pending supplier delivery, not only a late reservation.

Primary audience:

- Factory manager
- Affected operation's supervisor and technical leader
- Material planner

Expected evidence:

- Work-order identifier and operation
- Planned and actual start times
- Reserved reel unique codes
- Reservation status and timestamp
- Reservation creator

### 2. Pre-start warehouse dispatch

Reserved reels should be sent from the warehouse before the work order begins. The confirmed dispatch checkpoint is 30 minutes before planned start.

Candidate exception:

- At 30 minutes before planned start, one or more required reels have not been sent. This updates the existing material-readiness incident rather than creating a duplicate; for example, `not dispatched because not reserved`.

Primary audience:

- Factory manager
- Affected operation's supervisor and technical leader
- Warehouse personnel or supervisor

Expected evidence:

- Planned work-order start
- 30-minute dispatch checkpoint
- Reserved reels
- Dispatch status and timestamp for each reel
- Origin and intended destination

### 3. Material in transit and operator receipt

After the warehouse sends a reel, the operator must receive it in the `Flujo de Materiales` workflow. Until receipt is recorded, the reel remains in transit.

The warehouse is adjacent to the machines. A long transit state may mean the reel was delivered physically but the operator did not record digital receipt.

Candidate exception:

- A reel remains in transit for more than 30 minutes.

The confirmed transit threshold is 30 minutes.

Primary audience:

- Factory manager
- Receiving operation's supervisor and technical leader
- Warehouse personnel or supervisor
- Process team when it performed the movement

Expected evidence:

- Reel unique code
- Dispatch timestamp
- Elapsed transit time
- Origin and destination
- Sender
- Receipt status, receiver, and receipt timestamp
- Related work order and machine

### 4. Work-order sequence

Operators should start work orders according to the active production plan. Supervisors may reorganize the planner's proposed sequence during the day, so the rule must compare against the latest approved operational sequence rather than only the original plan.

Candidate exception:

- An operator starts a work order that is not next in the current approved sequence.

Primary audience:

- Factory manager
- Affected operation's supervisor and technical leader

Expected evidence:

- Machine or line
- Work order started
- Actual start time and starting user
- Current approved sequence and its last change
- Work order expected to start next

### 5. Consumption after work-order start

When a work order starts, the operator should begin declaring consumption of its reserved reels. A running work order cannot physically operate without raw material.

EMUSA Soft enforces the reservation relationship: the ERP does not allow a reel to be consumed by a work order unless that reel was previously reserved for that specific work order. Therefore, a digitally consumed reel differing from the work order's reserved reels is not a possible exception under the current ERP rules.

Candidate exceptions:

- A work order has been running beyond an allowed interval without any recorded consumption.

A production declaration without consumption must not create a second exception. If the work order is already active without recorded consumption, that existing exception covers the condition. Production declarations may be shown as supporting evidence on the same exception.

The allowed interval after work-order start has not been defined.

Primary audience:

- Factory manager
- Affected operation's supervisor and technical leader

Expected evidence:

- Work-order actual start time
- Reserved reel unique codes
- Consumed reel unique codes
- Consumption timestamps and users
- Elapsed time without consumption
- Reel locations

The exception is based on the deterministic absence of a required consumption declaration after the work order starts. It should not attempt to infer or separately alert that physical consumption occurred.

### 6. Work-order closure and material balance

`Cierre de OTs` is the process of declaring a work order finished. During closure, the operator declares how many meters the machine ran.

Expected reel length can be calculated approximately from:

- reel weight;
- reel width; and
- basis weight in grams per square meter (`g/m²`).

The declared run length can be compared with the approximate meters available in the consumed reels. For example, if three consumed reels represent approximately 30,000 meters but the operator declares 40,000 meters, another consumption declaration is missing or the closure data is incorrect. This meter-balance comparison is the most important closure rule identified so far.

A second closure rule applies only when the work order completed all planned production. If the reserved reels were delivered to the machine and full planned production was completed, all reserved reels should have been declared as consumed. Any delivered reserved reel that remains unconsumed indicates an error. This rule does not automatically apply to a legitimately truncated or partially completed work order.

Candidate exceptions:

- Declared run meters materially exceed, beyond the configured tolerance, the estimated meters supported by the consumed reels. This is the primary closure exception.
- The work order completed all planned production, but one or more reserved reels delivered to the machine remain unconsumed.
- Required production or consumption declarations are missing at closure.

A truncated work order is not an alert. It is a normal production condition and does not by itself indicate a digital-versus-physical mismatch. Closure rules that require full planned production must not apply automatically to truncated OTs.

Primary audience:

- Factory manager
- Affected operation's supervisor and technical leader
- Reconciliation personnel, if applicable

Expected evidence:

- Declared run meters
- Reserved and consumed reel unique codes
- Weight, width, basis weight, and estimated meters for each reel
- Total planned, consumed, and declared meters
- Configured tolerance
- Closure time and closing user
- Truncation status, reason, requester, and approval information

The exact formula, units, core-weight treatment, tolerances, waste treatment, remnants, and partial-reel rules remain unresolved.

### 7. Good-production declaration

During a running work order, the operator should declare each produced reel when the machine's rewinder is full and the reel is unloaded to the floor.

The declaration prints a label with a barcode and unique code. The new reel initially has an unweighed status because there is no scale at the machine.

Current machinery does not report rewinder completion to EMUSA Soft. A PLC could provide that signal in the future, but it is not currently available evidence. The ERP also cannot prove that a physical label was printed unless it records a separate print-job acknowledgment or failure.

Candidate inferred warning:

- The cumulative kilograms of raw material loaded or declared consumed since the last produced-reel declaration exceed the mass that could still remain on the rewinder, after accounting for allowed waste and process variation. This suggests that one or more completed reels may not have been declared.

Example: if the rewinder can hold at most 500 kg and 1,500 kg of raw material has been loaded, it is not physically possible for all 1,500 kg to remain on the rewinder. After applicable allowances, some finished output should already have been removed and declared.

This is evidence of a possible error, not deterministic proof. The exact formula must account for the current partial reel, declared output, declared waste, setup loss, operation-specific material additions, and an agreed tolerance.

Primary audience:

- Factory manager
- Affected operation's supervisor and technical leader
- Process team when pickup should have occurred

Expected evidence:

- Source work order and machine
- Maximum rewinder capacity for the machine
- Raw-material kilograms loaded or declared consumed since the last output declaration
- Declared output kilograms and reel count
- Declared waste and allowed process loss
- Production declaration time
- Produced reel unique code and barcode
- Declaring operator
- Weighing status

### 8. Produced-reel pickup and weighing

After declaration, the process team should collect the reel, take it to the scale, weigh it, and move it to its next location.

Candidate exceptions:

- A declared reel has not been collected or moved away from the machine within the allowed time.
- A declared reel has not been weighed within the allowed time.

Thirty minutes is the current proposed threshold for pickup and weighing. Whether these are one combined deadline or separate deadlines remains unresolved.

Primary audience:

- Factory manager
- Source operation's supervisor and technical leader
- Process team and process supervisor

Expected evidence:

- Produced reel unique code
- Source work order and machine
- Production declaration timestamp
- Current location or movement state
- Pickup or movement timestamp
- Scale record and weighing timestamp
- Elapsed time
- Destination operation or warehouse

### 9. Waste declaration and weighing

Bad production may accumulate in a waste bag. When the bag is full and closed, it should receive a printed barcode label and be weighed promptly.

Candidate exceptions:

- A closed waste bag was not declared and labeled promptly.
- A declared waste bag was not weighed within the allowed time.

Primary audience:

- Factory manager
- Affected operation's supervisor and technical leader
- Process team and process supervisor when pickup or weighing is involved

Expected evidence:

- Source work order, operation, and machine
- Waste declaration and label timestamps
- Waste bag unique code or barcode
- Scale record and weighing timestamp
- Weight and waste category
- Elapsed time

The signal proving that a physical waste bag was closed but not declared remains unresolved.

### 10. Downstream movement after weighing

A weighed good-production reel may be moved to a warehouse to cure or wait for the next shift, or it may go directly to a downstream operation such as lamination.

Candidate exceptions for this stage have not yet been elicited. Discovery should continue from this point.

## Initial rule classification

### Likely deterministic rules

These conditions can likely be evaluated directly if the required timestamps and relationships are available:

- Work order reaches its start without required reservations.
- Reserved reel is not dispatched by the configured pre-start deadline.
- Reel remains in transit beyond the configured threshold.
- Work order starts out of the latest approved sequence.
- Running work order has no recorded consumption after the configured interval.
- Declared run meters exceed, beyond tolerance, the estimated meters supported by consumed reels at closure.
- Fully completed work order has delivered reserved reels that remain unconsumed.
- Declared produced reel or waste bag remains unweighed beyond the configured threshold.
- A reel from a finished OT remains at the machine for more than 30 minutes without a recorded movement to the next OT or appropriate warehouse.

### Inferred or context-dependent conditions

These conditions require corroborating evidence or human interpretation:

- Raw-material mass exceeds what the rewinder could retain without enough produced-reel declarations, suggesting undeclared good production.
- A physical waste bag was closed but not digitally declared.
- Unused reserved material caused by legitimate truncation rather than an error.
- A long transit state reflects missing digital receipt rather than delayed physical movement.

The interface must distinguish confirmed rule violations from suspected inconsistencies.

## ERP evidence identified so far

The EMUSA ERP catalog inspected on 2026-07-17 is schema version 2, generated on 2026-07-13, with 1,034 GraphQL operations, 345 entities, 345 SQL tables, and 1,034 examples.

Catalog discovery identified the following likely data sources. Their precise GraphQL operations, relationships, and live values still require description and validation before implementation:

- `pre_reserva_orden_trabajo`: work-order pre-reservation status and audit timestamps.
- `ordenes_produccion`: planned and executed production dates and status.
- `orden_produccion_borrador_trabajos`: planned work-order order within a production draft.
- `ordenes_trabajo`: planned and executed dates, consumed and planned totals, closure, truncation, and reel tolerances.
- `orden_trabajo_materiales`: reservation state, incoming and consumed quantities, linear meters, closure actions, and flow relationships.
- `articulo_serial`: reel serial code, quantities, dimensions, basis weight, scans, operation, and audit timestamps.
- `flujo_materiales` and `flujo_materiales_detalles`: origins, destinations, transit and received quantities, status, receiver, and receipt time.
- `orden_trabajo_salidas` and `orden_trabajo_salida_detalles`: output quantities and weighed, unweighed, partial, or observed output state.
- `balanza_cargas` and `balanza_carga_detalle_registros`: serial codes, weighing mode, weights, and weighing audit timestamps.
- `operaciones`: operation configuration, reel tolerances, waste threshold, and minimum process duration.

Do not assume that catalog field availability proves that a rule is implementable. Each rule still needs an exact GraphQL data mapping, timestamp semantics, join path, latency check, and representative live-record validation.

## Alert labels and incident lifecycle

Each alert code defines the descriptive label that best explains its condition. Labels such as `Error`, `Por vencer`, `Warning`, and `Possible error` are not a shared state taxonomy and do not determine the incident lifecycle.

The lifecycle is recorded separately, including whether an incident is open, resolved, or closed without resolution. Each code's label and thresholds remain governed by `docs/alert_catalog.md`.

## Unresolved discovery questions

Highest-priority unresolved issues are:

1. What happens to good reels and waste after weighing, and which failures occur in the downstream flow?
2. What remaining exception scenarios should the current product include?
3. Which proposed time thresholds are universal, and which vary by operation, shift, machine, or material?
4. What is the exact latest-approved production sequence and how is a factory-floor update to the planner's plan recorded?
5. Where should each machine's maximum rewinder capacity come from, and what waste, process-loss, partial-reel, and operation-specific allowances should the inferred warning use?
6. What formulas, units, tolerances, remnants, core weights, partial reels, and waste rules define a balanced closure?
7. Which external notification channels are required in addition to the live dashboard?
8. When should preventive warnings appear, and when should unresolved errors trigger external escalation?
9. How quickly do relevant ERP events become available, and can sockets expose every required state change?
10. Which GraphQL operations and relationships expose the evidence for each rule?

## Documentation organization

The project does not need to move every Markdown file into `docs/`.

- Keep `AGENTS.md` at the repository root because tooling expects project instructions there.
- Keep `project_context.md` at the root as the main handoff entry point.
- Keep `dashboard_rationale.md` at the root as the stable product rationale and prominent project reference.
- Store detailed, growing documentation such as this discovery record under `docs/`.

This separates root-level entry documents from detailed working documentation without breaking their established roles.
