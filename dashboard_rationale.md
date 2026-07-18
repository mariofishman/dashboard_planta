# Factory Operations Dashboard: Rationale and Operational Context

## Purpose of this document

This document explains why a new supervisory dashboard is needed for a factory production and inventory system. It describes the operating environment, the relationship between physical factory activity and digital records, the recurring human errors that have been observed, and the intended role of the dashboard.

The document is intended to be placed in the software project's workspace and used as persistent context for future product discovery, UX research, dashboard design, technical planning, and Codex sessions.

## Executive summary

A new production and inventory software system has been built and deployed for users working in a factory and its storage rooms. The users have been trained, but they continue to make operational data-entry and process-execution mistakes.

The central problem is not primarily a failure of the software's calculations. It is a mismatch between:

- what physically happened in the factory or storage room; and
- what users recorded in the software.

The software already captures many events that represent physical production activity, including the movement of raw-material reels, barcode scans, raw-material consumption, production declarations, generated product labels, work-order status changes, and weighing events. This makes it possible to compare the expected digital process with the events actually recorded.

The proposed dashboard should act as a supervisory exception-detection and operational-control interface. It should identify missing, late, contradictory, or unbalanced digital events and notify supervisors while the underlying physical situation can still be investigated and corrected.

The longer-term product idea resembles a digital twin of the factory: a digital representation of the current state of work orders, machines, raw materials, intermediate or finished reels, storage locations, and required process events. The dashboard should show where the physical and digital states appear to have diverged.

## Operating environment

The operation includes at least two connected physical areas:

1. Storage rooms or inventory locations, where raw materials are held.
2. The factory floor, where machines execute work orders and transform raw materials into produced reels.

The production process involves reels of material. One example is a polypropylene film reel used as a raw material. A machine consumes this material during a work order and produces a printed film reel as an output. A produced reel can later become an input to another work order.

The production and inventory software is intended to record this physical chain of custody and transformation.

## Core entities and concepts

### Work order

A work order represents a production run performed by a machine. It has a lifecycle that includes preparation, start, execution, production and consumption declarations, and closure.

In this context, a finished work order is also described as a closed work order.

### Raw-material reel

A raw-material reel is inventory sent from a storage room to the factory so that it can be consumed during a work order. A polypropylene film reel is one example.

### Produced reel

A produced reel is an output created by a work order, such as a reel of printed film. When the user declares this production, the software creates a label containing a barcode and information related to the production order.

### Barcode event

Users scan barcodes to identify reels and record physical events, including the movement or consumption of raw material and the creation or handling of produced reels.

### Consumption declaration

A consumption declaration records that a particular raw-material reel was physically used in a work order.

### Production declaration

A production declaration records that a work order produced a particular output reel. The software then generates the corresponding label and barcode information.

### Weighing event

A produced reel must be weighed shortly after production. Its weight is operationally important because that reel may later be consumed as raw material in another work order.

### Physical state and digital state

The physical state is what actually happened in the storage rooms and factory. The digital state is what the users recorded in the software.

The most important supervisory problem is detecting when these two states no longer agree.

## Why the dashboard is needed

The software has been deployed and users have received training, but human errors remain common. These mistakes can make the system's records an inaccurate representation of factory operations.

The dashboard is needed because supervisors should not have to discover these errors through manual investigation, delayed reconciliation, or downstream failures. The system should detect evidence of a divergence as soon as possible and present it as an actionable exception.

The dashboard should help answer questions such as:

- Which work orders are currently inconsistent with the expected physical process?
- Which required inventory movements were not recorded before production began?
- Which active work orders have exceeded the allowed interval without a consumption declaration?
- Which produced reels have not been weighed within the permitted time?
- Which closed work orders declare more run meters than their consumed reels support, or completed full production with delivered reserved reels still unconsumed?
- Which exceptions are urgent because they can affect another active or upcoming work order?
- Who needs to investigate or correct each exception?
- How long has each exception remained unresolved?
- Where did the divergence occur: storage, transfer, machine operation, production declaration, consumption declaration, weighing, or work-order closure?

## Fundamental control principle

The dashboard should compare the expected sequence of operational events with the digital events actually recorded.

The expected sequence is approximately:

1. Required raw-material reels exist in inventory.
2. The reels are transferred from the correct storage location to the factory.
3. The reels are available at the correct machine or production location before the work order starts.
4. The work order starts in the software when production starts physically.
5. Each raw-material reel physically used is scanned and declared as consumed.
6. Each output reel physically produced is declared in the software.
7. The software generates the appropriate label and barcode for each output reel.
8. Each produced reel is weighed within the allowed period.
9. If the produced reel becomes an input to another work order, it has all required information before that downstream consumption begins.
10. Before the work order is closed, the recorded inputs, outputs, and relevant balances are complete and internally consistent.

Any missing, late, impossible, or contradictory event in this sequence may indicate an operational exception.

## Known error scenario 1: work order starts before required reels are digitally transferred

### Physical reality

A production work order begins on the factory floor.

### Expected digital state

Before the work order starts, all required raw-material reels should have been transferred in the inventory system from their storage location to the correct factory or machine location.

### Error condition

The physical work order starts, but one or more required reels were not digitally sent from inventory to the factory.

The physical production process is therefore ahead of the recorded inventory process. The software may show that the material is still in storage even though it is already being used or is present at the machine.

### Why it matters

- The inventory location becomes inaccurate.
- The system cannot reliably prove that the correct materials were available for the work order.
- Later consumption declarations may fail, be delayed, or appear impossible.
- Supervisors lose confidence in the digital representation of the factory.
- Downstream reconciliation becomes more difficult because the first missing event occurred before production began.

### Candidate dashboard exception

`Work order started with required reels missing from the expected production location.`

### Useful information for the supervisor

- Work-order identifier
- Machine or production line
- Actual and recorded start times
- Required reel identifiers
- Current recorded location of each reel
- Expected factory or machine location
- Responsible inventory or production user
- Duration since the work order started
- Whether any missing reel has already been scanned or consumed elsewhere
- Recommended corrective action

## Known error scenario 2: active work order without declared consumption

### Operational state

A work order is active beyond the allowed initial interval.

### Expected digital state

The operator records consumption of a reserved reel shortly after the work order starts.

### Error condition

The work order remains active beyond the configured interval without any recorded consumption.

If production is subsequently declared, that event may strengthen the evidence shown for this exception, but it must not generate a separate production-without-consumption alert.

### Why it matters

- Inventory incorrectly shows material that no longer physically exists in the recorded quantity or location.
- Work-order material usage is understated.
- Yield, waste, and production-efficiency calculations become unreliable.
- The work order may appear materially unbalanced.
- A reel may later appear available for another work order even though it was already consumed.

### Candidate dashboard exception

`Active work order without a consumption declaration.`

### Useful information for the supervisor

- Work-order identifier
- Machine
- Reserved reel identifiers
- Last known scans and locations
- Expected material requirements
- Declared consumption to date
- Production output to date
- Time since the reel was last seen or moved
- User responsible for the work order
- Supporting production events, when available

## Known error scenario 3: closure reconciliation errors

### Physical reality

The production run is finished and the work order is closed.

### Expected digital state

Before closure, users should confirm that:

- all production outputs have been declared;
- all raw materials physically used have been declared as consumed;
- declared run meters are supported, within tolerance, by the estimated meters in consumed reels;
- when the OT completed all planned production, every reserved reel delivered to the machine is declared as consumed; and
- the digital work-order record accurately represents the completed physical run.

### Error condition

The work order is closed with one or both of these conditions:

- declared run meters materially exceed the estimated meters supported by consumed reels; or
- the OT completed all planned production, but a reserved reel delivered to the machine remains unconsumed.

The first condition is the primary closure rule. The second applies only to fully completed production, not automatically to a legitimately truncated or partially completed OT.

### Why it matters

- The closed work order becomes an unreliable historical record.
- Inventory balances are incorrect.
- Input-output reconciliation is incomplete.
- Yield, waste, costing, traceability, and performance reporting may be distorted.
- Errors are harder to correct after people, materials, and production activity have moved on.

### Candidate dashboard exception

- `Declared run meters exceed the meters supported by consumed reels.`
- `Fully completed OT has a delivered reserved reel that remains unconsumed.`

### Useful information for the supervisor

- Work-order identifier
- Machine and production period
- Closure time and closing user
- Expected inputs
- Declared inputs or consumption
- Expected outputs
- Declared outputs
- Quantified imbalance
- Missing or suspicious reel events
- Severity and age of the exception
- Recommended investigation steps

## Known error scenario 4: produced reel not weighed within 30 minutes

### Physical reality

A printed reel is produced and leaves the work order. It should proceed to a scale and be weighed.

### Expected digital state

A weighing event should be recorded shortly after production. The current operational threshold is 30 minutes.

### Error condition

Thirty minutes pass after the reel is produced, but no weight has been recorded.

### Why it matters

- The reel does not have complete production information.
- The reel may be moved or consumed in a subsequent work order before its weight is known.
- Downstream material-consumption and balance calculations become unreliable.
- Traceability problems propagate from one work order to the next.
- The missing event becomes harder to correct after the reel leaves the scale area.

### Candidate dashboard exception

`Produced reel has not been weighed within 30 minutes.`

### Useful information for the supervisor

- Produced-reel identifier and barcode
- Source work order
- Source machine
- Production declaration time
- Time elapsed without a weight
- Current recorded location
- Whether the reel has been transferred or assigned downstream
- Whether the reel has already been scanned into another work order
- Responsible operator or area
- Recommended immediate action

## Error propagation and urgency

The importance of an exception depends not only on the original error but also on whether the affected reel or work order is about to participate in another process.

For example, a produced reel without a weight is already a problem. It becomes more urgent if the reel is transferred to another machine or consumed in a downstream work order. The dashboard should therefore consider both elapsed time and downstream operational impact when determining severity.

Candidate severity logic:

- **Informational:** A required event is approaching its deadline, but the process can still be completed normally.
- **Warning:** A deadline or expected sequence has been violated, but the affected material has not yet propagated downstream.
- **Critical:** The inconsistency is actively affecting another work order, inventory balance, machine process, or traceability chain.

The precise rules and thresholds still require validation.

## Intended dashboard role

The dashboard should not merely display general production statistics. Its primary value is to convert operational inconsistencies into a prioritized, explainable, and actionable queue for supervisors.

The dashboard should help supervisors:

1. See current exceptions immediately.
2. Understand what happened and why the system considers it abnormal.
3. Judge severity and downstream impact.
4. Identify the affected work order, machine, reel, location, and user.
5. Open the relevant record in the production or inventory system.
6. Investigate and correct the exception through the existing operational systems.
7. Confirm that the digital state once again matches the physical state.
8. Review recurring patterns to determine where additional training or workflow improvements are needed.

For version 1, the dashboard is an informative, live, socket-updated monitoring surface. Assignment, acknowledgment, correction, dismissal, and resolution inside the dashboard are deferred beyond version 1.

## Digital-twin direction

The broader idea is to build a digital twin of factory operations. In this context, the term means maintaining a sufficiently current digital representation of:

- each active machine;
- the work order assigned to each machine;
- the state of each work order;
- the raw-material reels expected, available, and consumed;
- the produced reels declared by each work order;
- the location and status of relevant reels;
- whether required barcode, transfer, consumption, production, weighing, and closure events have occurred;
- the balance between inputs and outputs; and
- any divergence between the expected process and recorded events.

The first dashboard does not need to implement a complete industrial digital-twin platform. It should begin with a reliable exception-monitoring layer built from existing production and inventory data.

## Recommended dashboard information architecture

This section is an initial hypothesis for design research, not a finalized specification.

### 1. Live exception queue

The main view should likely prioritize unresolved exceptions rather than generic charts.

Each exception row or card should show:

- severity
- exception type
- short human-readable explanation
- work order
- machine
- affected reel or reels
- location
- responsible area or user
- detection time
- elapsed time
- downstream impact
- current status
- recommended action

### 2. Factory state overview

A compact overview could show:

- active work orders
- work orders with exceptions
- machines operating normally
- machines with unresolved exceptions
- raw materials missing from expected locations
- produced reels awaiting weight
- closed work orders with imbalances
- critical exceptions affecting downstream work

### 3. Work-order detail

The work-order view should reconstruct the expected and recorded event sequence. A timeline may show:

- material transfer
- arrival at production location
- work-order start
- raw-material scans
- consumption declarations
- production declarations
- label creation
- weighing events
- work-order closure

Missing or late events should be visible in context.

### 4. Reel traceability detail

The reel view should show:

- reel identity and barcode
- material or product type
- origin
- current recorded location
- source work order, if produced internally
- destination or downstream work order
- movement history
- consumption status
- weighing status
- related exceptions

### 5. Machine or line view

The machine view could show:

- current work order
- start time and duration
- expected raw materials
- materials physically or digitally present
- declared consumption
- declared output
- unresolved exceptions
- status of downstream produced reels

### 6. Historical error and training analysis

Although immediate exception resolution is likely the operational priority, historical analysis can help improve user adoption and training. Potential views include:

- errors by user
- errors by role or area
- errors by shift
- errors by machine
- errors by work-order type
- repeated error categories
- average detection and resolution time
- exceptions corrected before downstream impact
- users or processes requiring additional training

Historical views should avoid becoming a punitive employee-ranking system without appropriate context. The purpose should be process improvement, targeted training, and prevention.

## UX principles

### Prioritize action over decoration

The most important information is what requires attention now. Large decorative charts should not displace the exception queue.

### Explain every exception

The dashboard should state:

- what was expected;
- what was recorded;
- what is missing or inconsistent;
- why the condition matters; and
- what the supervisor can do next.

### Preserve evidence

Supervisors should be able to inspect the event history that caused an exception. An alert without supporting evidence will be difficult to trust.

### Distinguish detection from certainty

Some rules will detect definite violations, while others will detect suspicious patterns. The interface should distinguish confirmed errors from possible inconsistencies that require investigation.

### Use operational severity

Severity should reflect time sensitivity and downstream consequences, not only the category of error.

### Make ownership explicit

Every actionable exception should have a responsible person, role, team, or operational area when that information is available.

### Support rapid navigation

The dashboard should link directly to the affected work order, reel, inventory transfer, machine, or user record in the underlying software.

### Show event time clearly

Operational exceptions depend heavily on timing. The interface should show timestamps, elapsed time, deadlines, and shift context clearly.

## Functional concepts to validate

Potential exception-management functions include:

- automatic detection
- real-time or near-real-time refresh
- severity assignment
- notification to supervisors
- filtering by machine, line, location, shift, error type, status, or user
- acknowledgment
- assignment
- investigation notes
- correction links
- resolution confirmation
- dismissal with reason
- escalation after a threshold
- audit history
- historical reporting

These are candidates, not confirmed requirements.

## Important distinctions

### Operational exception dashboard versus general analytics dashboard

A general analytics dashboard summarizes performance. This proposed product must primarily help supervisors identify and resolve mismatches between physical operations and digital records.

Analytics may support the product, but they should not obscure the action-oriented purpose.

### Human error versus software failure

The observed problems are currently understood to be human process or data-entry errors. However, the dashboard should preserve enough evidence to distinguish:

- a user failing to perform a required digital action;
- a physical process violating the intended workflow;
- a delayed device or integration event;
- incorrect master data or configuration; and
- a genuine software defect.

The dashboard should not automatically blame a user when the evidence supports several possible causes.

### Physical truth versus inferred physical truth

The software does not directly observe every physical event. It infers physical activity from barcode scans, inventory movements, work-order events, production declarations, weights, and other available signals.

The system should communicate when an exception is based on a deterministic rule and when it is an inference.

## Current known detection rules

The following rules are the initial known candidates:

1. **Missing pre-start material transfer:** A work order starts before all required reels are recorded in the correct factory or machine location.
2. **Active work order without consumption:** A work order remains active beyond the configured interval without a consumption declaration. Production events may support this exception but do not create another alert.
3. **Closure reconciliation error:** Declared run meters exceed the estimated meters supported by consumed reels, or a fully completed OT has a delivered reserved reel that remains unconsumed.
4. **Late weighing:** A produced reel has no recorded weight 30 minutes after its production declaration.
5. **Downstream use of incomplete reel:** A produced reel is transferred to or consumed by another work order while required information, such as weight, is missing.

The exact data conditions and tolerances for these rules have not yet been specified.

## Open questions requiring discovery

This is the original discovery agenda. Current answers, first-release decisions, and remaining questions are maintained in `docs/discovery.md`.

### Users and responsibility

- Who is the primary dashboard user?
- Which supervisors are responsible for production, inventory, weighing, and reconciliation?
- Should operators see their own exceptions, or only supervisors?
- Who is authorized to correct, dismiss, or override an exception?

### Operational timing

- How quickly do production and inventory events appear in the database?
- Is the dashboard expected to be real-time, near-real-time, or periodically refreshed?
- Is the 30-minute weighing rule universal?
- Do thresholds vary by machine, product, shift, or process?

### Work-order balance

- How is a work order considered balanced?
- Which units are used: count, gross weight, net weight, length, area, or another measure?
- What tolerances are acceptable?
- How are waste, scrap, remnants, partial reels, setup loss, and measurement variation handled?

### Material requirements

- How does the software know which reels are required before a work order starts?
- Can substitutions occur?
- Can production begin with only part of the planned material available?
- What location hierarchy is used for storage, factory, machine, and staging areas?

### Evidence and detection

- Which ERP status and timestamp definitively establish that a work order is active?
- What interval after work-order start should be allowed before the missing-consumption exception appears?
- Which exceptions can be proven deterministically?
- Which exceptions are only suspected?

### Resolution workflow

- What exact corrective actions can supervisors perform?
- Should corrections occur inside the dashboard or through deep links to the existing systems?
- Is approval required to change closed work orders?
- Must every correction preserve an audit trail?

### Notification and escalation

- Should the dashboard be passively monitored, or should it push notifications?
- Which channels are appropriate?
- When should an unresolved warning become critical?
- Who receives escalations?

### Historical analysis

- Is the first release primarily a live exception dashboard, a user-training dashboard, or both?
- Which historical measures are fair and useful for training?
- How should errors be attributed when several users or areas participated in a process?

## Proposed product statement

Build a supervisory factory-operations dashboard that continuously compares expected production and inventory workflows with the digital events recorded by users. The dashboard should detect missing, late, contradictory, and unbalanced events; prioritize them according to urgency and downstream impact; explain the supporting evidence; and help supervisors restore alignment between the physical factory and its digital representation.

## Proposed success criteria

The dashboard should eventually be considered successful if it measurably:

- reduces the time between an operational recording error and its detection;
- reduces the time required to investigate and correct an error;
- prevents incomplete reels or incorrect inventory states from propagating into downstream work orders;
- decreases the number of closed work orders with unresolved balances;
- increases the percentage of produced reels weighed within the required period;
- improves confidence that digital inventory matches physical inventory;
- reveals recurring training and workflow problems; and
- provides supervisors with a trusted, prioritized operational control surface.

## Scope boundary for the initial design

The initial design should focus on understanding and supervising operational exceptions derived from existing production and inventory data.

It should not assume that the first release must include:

- a complete industrial digital-twin simulation;
- predictive maintenance;
- automated machine control;
- advanced optimization;
- employee scoring;
- a replacement for the existing production software; or
- a replacement for the existing inventory software.

The dashboard should complement the existing systems by making cross-system inconsistencies visible and actionable.

## Guidance for future Codex sessions

Consult `docs/discovery.md` before using the sequence below; some items have already been answered or narrowed.

When using this document as context, do not jump directly to visual design. First determine:

1. the primary supervisor and operational decisions;
2. the complete catalog of exception types;
3. the data and evidence available for each exception;
4. severity and escalation logic;
5. the resolution workflow; and
6. whether the first release prioritizes live operations, historical training analysis, or both.

When searching for UX references, prioritize products and patterns involving:

- operational exception management
- incident queues
- anomaly detection
- quality-control dashboards
- manufacturing execution systems
- warehouse operations
- inventory reconciliation
- logistics control towers
- machine or fleet monitoring
- work-order lifecycle monitoring
- alert triage
- audit timelines
- digital-twin operations

Do not limit reference research to generic KPI dashboards. The target experience is an operational control interface centered on detection, explanation, prioritization, and resolution.
