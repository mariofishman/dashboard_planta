# A02, A03, and A05 audit and `alertas_fake` redesign

**Status:** Stage 1 complete locally on 2026-07-29; Stage 2 review in progress  
**Scope:** A02, A03, and A05 only  
**Interface:** `/dev/scenarios`  
**Current source:** Development-only synthetic source tables  
**Future source:** `test_database`

## 1. Main goal

Redesign the current `/dev/scenarios` interface so a tester can understand and verify A02, A03, and A05 from source change through the visible Monitor result.

The complete path is:

`alertas_fake changes source data → Monitor polls it → Monitor evaluates the rule → incident opens or resolves → recipients are selected → Dashboard and conversation update`

`alertas_fake` must never create, update, resolve, or reopen Monitor incidents, routing deliveries, conversations, messages, or incident cards directly. It changes source state only. Monitor-owned changes must occur through the normal read-only polling path.

## Agreed workstream stages

The stages must be completed in this order unless an explicit decision changes the plan.

1. **Stabilize the redesign — complete.** Finish the A02, A03, and A05 audit and scenario behavior; complete the interface, tests, documentation, and local technical validation.
2. **Review `/dev/scenarios` with the user — in progress.** Walk through an alert from source preparation to visible Monitor result, explain every section and control, and adjust terminology or workflow that is not understandable to the tester.
3. **Inspect the `test_database` handoff.** Verify the separate database work and classify it as ready, ready with specific gaps, or not yet safe to connect. Confirm reset safeguards and separate writer/read-only credentials.
4. **Connect the real testing boundary.** Make `alertas_fake` write A02, A03, and A05 source records to `test_database`; make Monitor read them through read-only MySQL adapters; retain synthetic tables until equivalent behavior passes.
5. **Run acceptance scenarios.** Verify every required baseline, threshold, persistence, failed-read, correction, resolution, recurrence, reset, routing, Dashboard, conversation, and duplicate-prevention result through the connected boundary.
6. **Finalize.** Reconcile implementation and documentation, record what is proved locally and what remains for Phase 10, perform the final requirement audit, and present the uncommitted changes for review.

Stage 2 is a usability review, not `test_database` integration. `test_database` readiness inspection begins in Stage 3, and connection begins in Stage 4.

## Stage 2 review findings

| Status | Finding | Required correction |
| --- | --- | --- |
| Open | A02 includes the source case “Después del umbral: pendiente de despacho.” Material that remains in the warehouse and has not started moving belongs to A01, not A02. | Remove this case from A02. A02 scenarios must begin only after material starts moving toward the machine and remains without digital reception. Update the scenario implementation, interface labels, tests, and requirement matrix together after the review. |
| Open | A02 includes “Después del umbral: llegó sin recepción digital” and a synthetic physical-arrival state. EmusaSoft cannot know that material physically arrived when no destination receipt was recorded. The interface also shows “Llegada física: Ubicación desconocida,” even though the intended destination is known, and does not make clear that elapsed minutes are measured from warehouse dispatch rather than from Monitor's last poll. | Replace the scenario with “Despachado hace más de 30 minutos, sin recepción registrada.” The authoritative A02 condition is a destination-bound EmusaSoft movement whose state remains `TRANSITO` for at least 30 minutes from its recorded warehouse dispatch. Evaluate every qualifying movement independently so simultaneous transfers cannot affect one another. Remove the physical-arrival field, display the known intended destination instead, and label elapsed time explicitly as time since warehouse dispatch. Never base evaluation or routing on an invented physical-arrival state. Update the implementation, interface, tests, audit, and requirement matrix together after the review. |
| Open | A02's “Reloj del caso” shows “Hora simulada” and “Hora de negocio” with the same value, so the second timestamp has no understandable purpose. | Show “Hora actual simulada,” “Hora de despacho,” and “Tiempo transcurrido desde el despacho.” The difference between the two timestamps must equal the displayed elapsed time. Remove the generic “Hora de negocio” label. Apply equivalent alert-specific timestamp labels to A03 and A05 during their reviews. |

## 2. Canonical boundaries

- `soft_database` is EmusaSoft's operational database.
- `backup_database` is the protected immutable backup.
- `test_database` is the future disposable MySQL testing database.
- `alertas_fake` is the development-only scenario application that will eventually write only to `test_database`.
- The Monitor database is the independent PostgreSQL database containing incidents, routing, conversations, messages, and audit history.

This workstream does not claim that `test_database` integration is complete. The redesign must preserve the future boundary where `alertas_fake` writes source records and Monitor reads those records through its normal polling adapter.

## 3. Technical vocabulary

### Rule

The business condition defining when an alert should appear.

Example: A03 triggers when a work order has been active for the configured time without a first valid consumption declaration.

### Contract

The precise, versioned technical definition of the information a rule requires and the result shape it produces.

For A03, the required information includes whether the work order is active, elapsed time, consumption count, and whether stronger A07 evidence supersedes A03.

### Adapter

Code that reads records from a source database and translates them into the fields required by the rule contract.

The future adapter must read `test_database` using the same read-only boundary intended for `soft_database`.

### Evaluator

Code that applies the rule contract to one translated source record and returns:

- `triggered` — the condition currently qualifies for an alert;
- `clear` — the condition does not currently qualify; or
- `insufficient` — required information is missing, so Monitor cannot safely decide.

### Incident lifecycle

The history of one detected condition inside Monitor:

- the condition first becomes true and creates an open occurrence;
- continued detection preserves the same occurrence;
- a complete successful poll proves the condition cleared and resolves it; and
- the same condition becoming true again after resolution creates a new occurrence while preserving earlier history.

### Routing

The deterministic process that converts the alert code, reasons, operational context, and Operational Responsibility Roster into actual recipients and in-app deliveries.

An LLM never selects recipients.

### Conversation integration

The process that creates or reuses the correct conversation after routing and adds one structured Monitor alert message for the incident occurrence.

Repeated polling must not create duplicate conversations, messages, or alert cards.

### Poller

The Monitor process that periodically reads the source adapter. Only a complete, successful read may open, update, or resolve an incident.

### Scenario clock

Development-only business time used to test 15- and 30-minute conditions without waiting in real time. It is separate from real server time and Monitor timestamps.

## 4. What the audit covers

For A02, A03, and A05, the audit traces:

1. the approved catalog rule;
2. the machine-readable rule contract and fixtures;
3. the source query contract, when one exists;
4. the adapter output;
5. evaluator behavior;
6. incident creation, preservation, resolution, and recurrence;
7. routing decisions and delivery deduplication;
8. conversation creation or reuse and alert-message deduplication;
9. Dashboard and chat visibility; and
10. every existing `/dev/scenarios` action and the state it modifies.

The audit must distinguish:

- behavior that matches current authority;
- incorrect or confusing behavior;
- missing evidence or implementation;
- internal authority conflicts; and
- behavior that remains blocked until `test_database` or Phase 10 integration.

## 5. Existing controls to audit

The previous `/dev/scenarios` interface exposes these controls:

- `Restablecer`;
- `Generar problema`;
- `Avanzar tiempo`;
- `Corregir origen`;
- fault selection;
- `Fallo siguiente`;
- `Sondear ahora`.

For each control, the audit records:

- the source records changed;
- whether the scenario clock changes;
- whether poller state changes;
- whether it changes Monitor state directly;
- what the next successful poll should detect; and
- what a tester sees before and after polling.

## 6. Required scenario coverage

The following matrix is the minimum business-language coverage for each alert.

| Scenario | Source action | Expected next poll |
| --- | --- | --- |
| Clean baseline | Put the source records in a valid condition | No open incident is created; an existing open occurrence resolves only after a successful complete poll |
| Before threshold | Create the pending source condition immediately before its time limit | Behavior follows the approved comparison at that boundary |
| At threshold | Place the condition exactly at 15 or 30 minutes | Behavior follows the approved `>=` or `>` comparison |
| After threshold | Keep the qualifying source condition beyond its limit | Exactly one occurrence opens |
| Persistent condition | Poll the same unchanged qualifying source condition repeatedly | The same occurrence remains open without duplicate evidence or downstream objects |
| Correction | Correct the source records | The incident remains unchanged until a successful complete poll |
| Resolution | Poll successfully after correction | The open occurrence resolves |
| Failed read | Schedule a timeout or source error | The existing Monitor state is preserved |
| Incomplete read | Schedule a partial result or invalid result shape | The existing Monitor state is preserved |
| Recurrence | After resolution, make the same condition true again | A new occurrence opens and prior history remains preserved |
| Reset | Restore the clean source baseline | Source state resets; Monitor history is never deleted or rewritten directly |

### A05 reason coverage

A05 additionally requires separate scenarios for:

- `not_weighed` only;
- `still_at_machine` only; and
- both reasons simultaneously in one incident.

Movement that has already begun but remains unreceived belongs to A02 rather than producing a duplicate A05 movement incident.

### Supported business cases by alert

| Alert | Additional selectable cases |
| --- | --- |
| A02 | Physical delivery pending after dispatch; physically at the machine without digital receipt; physical arrival unknown |
| A03 | Stronger A07 evidence suppresses or resolves A03 without inventing consumption |
| A05 | Each reason independently and together before, at, and after the threshold; produced reel; remnant reel; movement already started and therefore handed to A02 |

## 7. Edge cases

An edge case is a boundary or less-obvious situation where software often behaves incorrectly.

The priority edge cases for this workstream are:

- exactly 15 minutes for A03;
- exactly 30 minutes for A02 and A05;
- one minute before and after each threshold;
- a successful poll repeated without any meaningful source change;
- correction followed by a failed or incomplete read;
- recurrence attempted before resolution;
- recurrence after a verified resolution;
- A05 with either reason independently and both together;
- one alert's scenario clock changing another alert's result;
- simulated business time being compared incorrectly with real Monitor time;
- routing or conversation work being repeated after an unchanged poll; and
- reset being mistaken for deletion of Monitor incident history.

## 8. Redesigned `/dev/scenarios` interface

The redesigned interface must clearly separate five states.

### 1. Source state

Shows the records controlled by `alertas_fake`, including their business identifiers and fields relevant to the rule.

Examples include material-transfer status, receipt time, work-order start, consumption count, reel age, weighing state, and movement state.

### 2. Scenario clock

Shows the simulated business time and the most recent source action. Each alert has an independent clock so advancing one alert cannot change another alert's result.

### 3. Poller state

Shows whether the next read has a scheduled failure and the status, completion time, and error code of the most recent poll.

### 4. Expected result

Explains in business language what the next poll should do to the incident, Dashboard, routing, and conversation.

### 5. Actual Monitor result

Shows what Monitor actually created or preserved:

- latest incident lifecycle and occurrence;
- total and open incident counts;
- evidence count;
- routing decisions and deliveries;
- conversation links;
- Monitor alert messages or cards;
- committed change cursor; and
- measured source-change-to-detection delay.

The interface must make a visible distinction between preparing source state and running a poll. Preparing a scenario does not mean Monitor has detected it.

## 9. Automated verification

Automated tests must prove:

### Threshold behavior

- A02 immediately before, exactly at, and after 30 minutes;
- A03 immediately before, exactly at, and after 15 minutes; and
- A05 immediately before, exactly at, and after 30 minutes for each reason combination.

### Failed-read preservation

Timeout, source error, partial result, and invalid schema cannot resolve an open incident or erase its prior state.

### Recurrence

Recurrence is rejected before resolution. After correction and a successful resolving poll, recurrence creates the next occurrence and retains the earlier occurrence.

### Duplicate prevention

Repeated successful polls of an unchanged condition cannot increase the count of:

- incident occurrences;
- meaningful evidence records;
- routing deliveries;
- conversation links;
- Monitor alert messages; or
- visible incident cards.

### State isolation

- advancing one scenario clock cannot change another alert's source age;
- simulated time and real Monitor timestamps remain separate; and
- scenario actions cannot write Monitor-owned tables directly.

## 10. Deliverables

### Audit record

A durable explanation of how A02, A03, A05, and every previous `/dev/scenarios` control work, including differences from the alert catalog.

### Implemented redesign

The improved `/dev/scenarios` interface, supporting API state, source controls, and tests.

### Findings

A categorized list of confusing labels, hidden state, duplicate risks, timestamp problems, source-contract gaps, and incorrect direct Monitor mutations, if any.

### Remaining `test_database` work

A clear boundary statement identifying what remains before synthetic source tables can be replaced safely:

- build and reset `test_database` from `backup_database`;
- provide separate `alertas_fake` writer and read-only Monitor credentials;
- implement and validate the A02, A03, and A05 MySQL adapters;
- run the same scenarios through normal polling; and
- remove the old synthetic source boundary only after replacement acceptance.

## 11. Current rule audit

### A02 — Reserved OT material not received within 30 minutes

**Catalog intent:** A reserved material movement toward an OT remains in transit without a digital receipt for more than 30 minutes. Warehouse relocations that are not directed to an OT are excluded. Receipt, correction, or cancellation clears the condition.

**Current evaluator reads:**

- `materialFlowDetailId`;
- `isWorkOrderReservation`;
- `state`;
- `receivedAt`; and
- `elapsedMinutes`.

**Current evaluator decision:** `isWorkOrderReservation = true`, `state = TRANSITO`, no receipt, and `elapsedMinutes > 30` produces `triggered` with reason `not_received`. Exactly 30 minutes is clear.

**Condition identity:** `A02 + key schema version 1 + materialFlowDetailId`.

**Current simulator source:** one material-flow row with fixed ID `4202`. The row represents reserved material moving to OT `151087.3` on machine `P15`. It also carries `physicalArrivalState` so the laboratory can distinguish physical delivery pending, physical arrival without digital receipt, and unknown arrival.

**What Monitor creates:** the first successful poll after the threshold creates one open incident occurrence, one opening evidence record, one lifecycle transition, one committed change event, deterministic routing, one conversation link, and one Monitor alert message when routing resolves at least one participant.

**What persists:** repeated successful polls preserve the same open occurrence. Elapsed minutes are excluded from the meaningful-evidence fingerprint, so time passing alone does not append evidence.

**Resolution:** recording receipt changes the source to `RECIBIDO`. Only a later complete successful poll resolves the incident.

**Recurrence:** after resolution, the development scenario returns the same natural key to the qualifying transit state. A later successful poll creates the next occurrence and preserves the earlier one.

**Routing:** A02 notifies the factory manager, operation shift supervisor, technical leader, machine operator, warehouse dispatcher or sender, and warehouse supervisor or leader. The scenario evidence selects the warehouse dispatcher as primary when delivery is pending or arrival is unknown, and the machine operator as primary when the material is physically at the machine without digital receipt.

**Source-contract gap:** the SQL query contract outputs identifiers and source timestamp after filtering transit rows, but it does not output the evaluator's complete evidence shape. A future MySQL adapter must explicitly derive reservation scope, state, receipt, and elapsed minutes. The existing backup test proves bounded read-only pagination and stable keys, not the complete source-to-incident transformation.

### A03 — Active OT without consumption after 15 minutes

**Catalog intent:** an active OT with no first valid consumption opens a warning at 15 minutes. A03 closes when the first valid consumption is recorded and must be suppressed when stronger A07 evidence explains the undeclared input.

**Current evaluator reads:**

- `workOrderId`;
- `active`;
- `elapsedMinutes`;
- `consumptionCount`; and
- `strongerA07`.

**Current evaluator decision:** active, `elapsedMinutes >= 15`, zero consumption, and no stronger A07 produces `triggered` with reason `no_first_consumption`. Exactly 15 minutes triggers.

**Condition identity:** `A03 + key schema version 1 + workOrderId`.

**Current simulator source:** one active work-order row with fixed ID `4103` and one linked consumption row for OT `151056.1` on machine `P12`.

**What Monitor creates:** the first complete successful poll of a qualifying A03 source row creates one open incident occurrence, one opening evidence record, one lifecycle transition, one committed change event, one routing decision, deduplicated in-app deliveries, one conversation link, and one Monitor alert message when the routing result supplies participants.

**What Monitor preserves:** repeated successful polls of the same source evidence preserve that occurrence, routing deliveries, conversation link, and alert message. Elapsed minutes are excluded from the meaningful-evidence fingerprint, so time passing alone does not append evidence. Timeout, source error, incomplete results, and invalid result shape preserve the current incident and all downstream state.

**Resolution:** changing consumption count from zero to one and recording the first-consumption time clears the source condition. A later complete successful poll resolves the incident.

**Recurrence:** recurrence is rejected while the latest occurrence is open. After resolution, invalidating or removing the first valid consumption makes the same work-order condition true again. The next successful poll creates the next occurrence while retaining earlier evidence, transitions, routing, conversation, and message history.

**Routing:** A03 routes to the factory manager, operation shift supervisor, technical leader, and machine operator.

**A07 suppression:** the redesigned scenario can set `strongerA07 = true`. A complete successful poll then suppresses a new A03 or resolves an existing A03 without fabricating consumption.

**Source-contract gap:** A03 has a rule contract and fixtures but no versioned SQL detection-query contract or local read-only SQL file. The future MySQL adapter must define active-OT semantics, valid-consumption counting, source timestamps, input-lock behavior, and the real evidence mapping that sets A07 suppression.

### A05 — Produced or remnant reel not weighed or moved

**Catalog intent:** maintain one incident per produced or remnant reel. `not_weighed` and `still_at_machine` are independent OR conditions. A movement already started but unreceived belongs to A02 rather than creating a duplicate A05 movement incident.

**Current evaluator reads:**

- `articleSerialId`;
- `declaredAgeMinutes`;
- `weighed`;
- `sourceWorkOrderFinished`; and
- `movedFromMachine`.

**Current evaluator decision:** at or after the configured 30-minute threshold, missing weight adds `not_weighed`; independently, a finished source OT with no movement adds `still_at_machine`. Rule contract `1.0.1` uses `declaredAgeMinutes >= 30`.

**Condition identity:** `A05 + key schema version 1 + articleSerialId`.

**Current simulator source:** one reel row with fixed serial ID `4205` for OT `151087.3` on machine `P15`. It carries `reelKind = produced | remnant` so the laboratory exercises the catalog's routing distinction.

**Previous scenario limitation:** `Generar problema` always set both missing weight and missing movement. It could not test either reason independently, produced versus remnant routing, or the A02 handoff after movement begins.

**What Monitor creates:** the first complete successful poll of a qualifying reel creates one open occurrence for that reel, one opening evidence record, one lifecycle transition, one committed change event, deterministic routing, one conversation link, and one Monitor alert message when routing supplies participants. Both A05 reasons remain inside this one occurrence.

**What Monitor preserves:** declared age is excluded from the meaningful-evidence fingerprint. A meaningful reason or reel-kind change may update the same occurrence and rerun routing idempotently. An unchanged poll cannot add evidence, an occurrence, a delivery, a conversation link, or a Monitor alert message. Every failed or incomplete read preserves the existing state.

**Resolution:** the previous `Corregir origen` action set both weighed and moved to true. The redesign exposes `Registrar pesaje` and `Registrar salida de máquina` separately. Completing only one action preserves the same open occurrence with the remaining reason; a complete healthy poll resolves it only after both source conditions pass.

**Recurrence:** recurrence is rejected while the occurrence remains open. After resolution, removing or invalidating qualifying weighing or movement evidence creates the same condition again; the next successful poll creates the next occurrence and preserves prior history.

**Routing:** the process operator is always primary. A produced reel adds the process supervisor. A remnant reel additionally adds the raw-material warehouse dispatcher or sender and warehouse supervisor or leader. These variants are selectable and verified in the redesigned scenario application.

**A02 handoff:** the `movement_started` A05 case is clear once weighing and departure from the machine are complete. A corresponding movement that remains unreceived after its A02 threshold opens A02 without leaving a duplicate A05 movement occurrence open.

**Presentation gap:** the catalog labels A05 `Por vencer → Error`, while the incident presentation currently always uses `Error`. No pre-threshold `Por vencer` behavior is implemented.

**Source-contract gap:** the SQL query outputs `notWeighed` and `stillAtMachine`, while the rule evaluator requires age plus positive booleans `weighed`, `sourceWorkOrderFinished`, and `movedFromMachine`. The future MySQL adapter must define this transformation and emit reel kind, movement state, and routing evidence. The current backup test validates query bounds and keys only.

## 12. Previous `/dev/scenarios` control audit

| Previous control | What it actually changed | Did it change Monitor directly? | Confusing or unsafe behavior |
| --- | --- | --- | --- |
| `Restablecer` | Deleted the selected rule's synthetic source row and updated scenario metadata | No | An empty table was presented as a clean business condition. Existing Monitor history remained, but the UI could show the latest resolved incident as if it were current source state. A later healthy poll was still required to resolve an open incident. |
| `Generar problema` | Inserted or rewrote one fixed source row at the current simulated time; A05 always set both reasons | No | The label implied that a Monitor problem had already been generated, although the condition was initially below threshold and no poll had run. Reusing it while an incident was open reset source age and could make the condition temporarily clear. |
| `Avanzar tiempo` | Advanced one global simulated clock by 15 or 31 minutes | No | Advancing A02 also aged A03 and A05. The global source revision increased twice for one action. The fixed 31-minute action hid the exact 30-minute boundary. |
| `Corregir origen` | A02 recorded receipt; A03 recorded one consumption; A05 set weighed and moved to true | No | If the source row had been deleted by reset, the update changed no source record but the UI still reported a correction action. A05 could not apply a partial correction. |
| Fault selection | Changed browser-local selection only | No | The selected value was not the scheduled poll outcome until `Fallo siguiente` was pressed. The interface did not explain this distinction. |
| `Fallo siguiente` | Stored a one-shot timeout, source error, partial result, or invalid schema for the selected rule's next adapter read | No | The fault was hidden in scenario metadata and consumed by the next read. Another source action silently cleared it. |
| `Sondear ahora` | Invoked the ordinary detection runner for that rule; the adapter consumed any pending one-shot fault | Indirectly, through the approved poller path | It was the only laboratory action allowed to cause incident lifecycle changes, routing, conversations, messages, and visible updates. The UI did not separate expected downstream result from actual committed result. |

## 13. Findings and redesign response

| Finding | Consequence | Redesign response |
| --- | --- | --- |
| One global scenario clock | Actions for one rule silently changed the other rules | Store an independent clock and revision for A02, A03, and A05 |
| Simulated action time was compared with real Monitor incident time | Detection delay could be blank or misleading | Store real source-action recording time separately from simulated business time |
| Empty tables represented a clean baseline | Testers could not see a valid source record | Reset each rule to an explicit valid source record |
| An upgraded worktree could initially claim a clean baseline before source rows existed | The first visible state contradicted its own source facts | Seed explicit clean A02, A03, and A05 source rows during the redesign migration |
| Generic `Generar problema` label | Source preparation was confused with Monitor detection | Select a named business case and use `Preparar caso`; keep polling separate |
| Background refresh replaced or closed pending form selections | A tester could prepare a different case than the one selected | Refresh on initial load, explicit `Actualizar`, and completed actions; keep pending browser selections independent |
| Threshold jump skipped boundaries | Exact comparator behavior was hidden | Provide before-threshold, at-threshold, and after-threshold cases plus one-minute clock advancement |
| A05 always combined both reasons and corrected both at once | OR behavior and partial correction were untestable | Provide separate A05 reason cases, show current reasons, and expose weighing and movement corrections separately |
| Expected and actual states were mixed | A tester could not tell whether behavior was correct | Present source, clock, poller, expected result, and actual Monitor result as separate stages |
| A source change could look matched before Monitor read it | The tester could mistake source preparation for detection | Compare the current source revision with the latest healthy poll revision and show `Sondeo pendiente` until they match |
| Latest incident alone hid duplicate counts | Duplicate incidents or downstream objects were difficult to detect | Show total/open incidents, evidence, routing, conversation links, and alert-message counts |
| `Coincide` accepted missing downstream objects | Zero conversation links or alert messages could be presented as successful | Compare exact expected incident, open, conversation-link, and alert-message counts; show named differences when they do not match |
| Recurrence used ordinary trigger controls | A tester could create an implausible sequence before resolution | Add a recurrence action that is rejected unless the latest occurrence is resolved |
| Existing routing tests assumed group A forever | Tests became date-dependent as the configured rotation advanced | Resolve the active day group for the current incident date in integration fixtures |
| A healthy source cycle can outlive a failed downstream callback | An incident may commit while routing or conversation work remains incomplete | Show downstream actual counts and make successful polls retry idempotent downstream reconciliation |

No previous scenario action was found that wrote Monitor incident, routing, conversation, or message tables directly. The boundary defect was understandability and source realism, not a direct incident-mutation endpoint.

## 14. Duplicate and recurrence controls

The current Monitor implementation uses multiple independent idempotency controls:

- one open incident is selected by rule code and condition key;
- unchanged elapsed time or declared age is excluded from the meaningful-evidence fingerprint;
- routing decisions deduplicate the same incident fingerprint;
- notification delivery uniqueness is scoped to incident, recipient, and channel;
- one incident may link to a conversation only once;
- the Monitor alert message uses `incident:<incidentId>` as its command ID; and
- recurrence increments occurrence only when no open occurrence exists for the condition key.

The redesigned integration test records downstream counts after the first successful poll, repeats the same successful poll, and proves that none of those counts increase. It then proves recurrence is rejected before resolution and creates occurrence two only after correction and a complete resolving poll.

## 15. A05 threshold convention

A05 becomes eligible when 30 minutes have elapsed. The executable rule therefore uses `declaredAgeMinutes >= 30`, matching the catalog's plain-language algorithm.

This is an implementation convention rather than a material factory-policy distinction. Monitor opens the incident on the first complete healthy poll at or after the threshold; normal polling cadence determines the actual visible second. The operational requirement is that the alert goes off around the configured 30-minute limit and remains open until both weighing and required movement are complete.

## 16. Requirement traceability

| Requirement | A02 | A03 | A05 | Evidence |
| --- | --- | --- | --- | --- |
| Clean, before, at, and after threshold | Complete | Complete | Complete for each reason combination | `apps/api/src/scenarios.test.ts` threshold matrix |
| Persistent unchanged successful polls | Complete | Complete | Complete | Three-alert lifecycle and duplicate test |
| Correction and successful resolution | Receipt | First valid consumption | Weighing and movement in either order | Scenario integration tests |
| Timeout, source error, incomplete read, invalid shape | Complete | Complete | Complete | Three-alert failed-read matrix |
| No duplicate incidents, evidence, deliveries, conversation links, messages, or cards | Complete | Complete | Complete | Repeated-poll count assertions and database uniqueness controls |
| Recurrence rejected before resolution and accepted afterward | Complete | Complete | Complete | Three-alert lifecycle test |
| Catalog-specific cases | Physical-location primary owner | A07 suppression | Produced/remnant routing and A02 handoff | Catalog-case integration test |
| Source actions cannot mutate Monitor-owned tables | Complete | Complete | Complete | Source-action table-count isolation test |
| Independent clock, revision, and real timestamp | Complete | Complete | Complete | Clock and timestamp-isolation tests |
| Dashboard and conversation integration | Complete | Complete | Complete | API route assertions plus browser Dashboard and chat verification |
| `test_database` adapter path | Deferred | Deferred | Deferred | Later integration stage; current implementation remains synthetic |

## 17. Validation evidence

Completed through 2026-07-29:

- full workspace type checking passed;
- all 36 API tests passed, including the complete three-alert threshold, failed-read, persistent-condition, duplicate, visible-integration, resolution, recurrence, catalog-case, and state-isolation matrices;
- the focused executable alert-contract fixture suite passed with A05 triggering at exactly 30 minutes;
- the production build passed;
- browser validation at 390, 768, and 1440 pixels found all three alert sections and no horizontal overflow;
- browser console validation found no warning or error messages; and
- an A02 browser run proved physical arrival at the machine, visible pending-poll state, machine-operator primary ownership, and an exact expected-versus-actual match;
- an A03 browser run proved stronger-A07 suppression, visible pending-poll state, successful resolution, and an exact expected-versus-actual match;
- an A05 browser run proved remnant-reel source state, both reasons, process-operator primary ownership, and an exact expected-versus-actual match; and
- the Dashboard and Chats browser views showed the resulting A02, A03, and A05 incident history and Monitor alert cards.

The complete workspace test command has one environment failure unrelated to this redesign: the contracts package expects the protected local backup at `local-data/database/staging_emusa_core-20260723-025548.sql`, which is not present in this worktree. Every other executed workspace test passed.
