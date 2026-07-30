# `alertas_fake` V2 documented edge-case test report

**Status:** Historical, superseded pre-fix report. Do not use its failures, recommendations, or review gate as current instructions. The active Stage 2 report is [`alertas_fake_v2_edge_case_test_report_v2.md`](../../../docs/delivery/phases/phase6/alertas_fake_v2_edge_case_test_report_v2.md).

**Date:** 2026-07-29  
**Scope:** A02, A03, A05, shared experiment controls, and the documented Phase 6 edge-case matrices  
**Test surface:** `prototypes/current/alertas-fake-v2/index.html` served at `http://127.0.0.1:5190/`  
**Boundary:** Standalone synthetic HTML prototype; not connected to `test_database`, Dashboard, conversations, or production adapters

## 1. Purpose and change boundary

This report tests the current prototype against the scenario matrices in:

- `archive/docs/implementation/alertas_fake_audit_and_redesign_v1.md`;
- `docs/delivery/phases/phase6/alertas_fake_audit_and_redesign_v2.md`; and
- the current A02, A03, and A05 rules in `docs/product/alert_catalog.md`.

No implementation fix was made while producing this report. The only new file is this report. Two implementation files were already modified before this test run: the V2 blueprint and prototype contain the corrected `Nuevo experimento` warning.

## 2. Result meanings

- **Pass:** The visible prototype proves the documented behavior.
- **Partial:** The simulated behavior appears correct, but required evidence is hidden or part of the requirement cannot be exercised.
- **Fail:** The visible behavior contradicts the documented requirement.
- **Not testable:** The prototype has no control, state transition, or evidence surface for the requirement.
- **Deferred:** The documents intentionally assign the requirement to a later integration stage.

## 3. Requirement traceability

Every test below comes from the documented matrices or their supporting UI and acceptance requirements:

| Test IDs | Document requirement |
| --- | --- |
| SH-01, SH-03, SH-04, SH-06, SH-07 | V2 sections 4.1–4.4 and 7.1: experiment identity, one shared clock, scheduled polling, pause, chronological time jumps, and source actions at poll boundaries |
| SH-02 | V2 sections 4.2–4.3 and 7.1: integer speed from 1 to 60 and editable polling frequency |
| SH-05 | V2 sections 4.4 and 7.1: immutable, identifiable, reproducible snapshots |
| SH-08 | V2 sections 4.5 and 7.1: a new experiment must preserve earlier Monitor history |
| SH-09 | Original sections 9 and 14, plus V2 sections 7.1 and 9: repeated polls must not duplicate downstream objects |
| SH-10 | Original sections 6, 7, and 9, plus V2 sections 7.1, 8, and 9: failed or incomplete reads preserve the last trustworthy result |
| SH-11 | V2 sections 6.9 and 9: required widths, mobile summary cards, and no page-level overflow |
| A02-00 through A02-08 | Original sections 6, 7, 11, and 16, plus V2 sections 7.2 and 8: complete A02 baseline, boundaries, concurrency, correction, failure preservation, administrative closure, recurrence, and reset behavior |
| A02-09 | V2 sections 6.6 and 9, plus `alert_catalog.md` A02: routing, Dashboard, conversation, evidence, and delivery results |
| A03-00 through A03-05 | Original sections 6, 7, 11, and 16, plus V2 sections 7.3 and 8: complete A03 baseline, boundaries, concurrency, A07, correction, failure preservation, closure, and locked-input behavior |
| A03-06 | V2 sections 6.6, 7.3, 8, and 9, plus `alert_catalog.md` A03: recurrence and downstream results |
| A05-00 through A05-05 | Original sections 6, 7, 11, and 16, plus V2 sections 7.4 and 8: complete A05 baseline, both OR reasons, produced/remnant reels, partial correction, failure preservation, and closure |
| A05-06 | V2 sections 5.1, 7.4, and 9: destination-bound A05-to-A02 handoff |
| A05-07 | V2 sections 7.4, 8, and 9: recurrence only after a resolved condition later becomes true again |

The tests are numbered for this report so each finding can be discussed and retested without ambiguity.

## 4. Executive findings

The prototype successfully demonstrates:

- the shared simulated clock;
- scheduled automatic polls;
- chronological poll replay during time jumps;
- pause behavior;
- independent concurrent source records;
- A02 receipt before detection and resolution after detection;
- A03 opening at 15 minutes, consumption resolution, and A07 suppression or resolution;
- A05 opening one occurrence and keeping it stable through repeated polls;
- A05 partial correction in either order; and
- administrative closure suppression while the same source condition persists.

The most important failures are:

1. A locked A03 OT still accepts `Registrar consumo`.
2. A05 `Registrar salida` does not create the A02 movement required for the handoff.
3. `Nuevo experimento` discards prior browser-local history instead of keeping it queryable.
4. The prototype opens A02 at 30 minutes, while the current alert catalog says more than 30 minutes.
5. The UI cannot prepare recurrence for A02, A03, or A05.
6. Complete histories omit required business outcomes and timestamps.
7. Actual A05 incident reasons and routing recipients are not shown.
8. Dashboard cards, conversations, evidence, routing deliveries, and message counts cannot be verified.
9. Only one generic failed-poll mode exists; incomplete reads and adapter boundary failures cannot be tested.
10. Mobile keeps a 1,050-pixel table instead of converting rows into business summary cards.

The 36 runnable-or-inspected scenarios now contain 12 passes, 14 partial results, 6 failures, and 4 cases that the prototype cannot exercise. Section 9 separately lists 13 automated or integration requirements outside the HTML prototype's executable boundary.

## 5. Shared experiment tests

### SH-01 — New experiment before start

**Why:** A new experiment must start deterministically and must not poll before the tester starts it.

**What was tested:** Reloaded the prototype, waited without starting, and inspected A02, A03, and A05.

**Expected:** Paused experiment, no completed poll, and empty source tables.

**Result: Pass.** The experiment remained paused, `Último` remained `Aún no ejecutado`, and all three alert tabs were empty.

### SH-02 — Speed and polling-frequency controls

**Why:** The matrix requires speed values 1, 2, 3, and 60, plus independently editable polling frequencies.

**What was tested:** Entered each required speed and several polling frequencies while paused, then inspected the field values, conversion summary, and next-poll time.

**Expected:** The entered values and the displayed conversion and next-poll time agree immediately.

**Result: Fail.** The fields accepted the values, but the conversion summary remained at the previous `2 seconds / 3 minutes` configuration while paused. Starting with frequency `31` changed the conversion text to 31 but left the next poll scheduled at minute 3. The prototype therefore cannot reliably demonstrate polling frequencies lower than, equal to, and greater than the remaining threshold time.

### SH-03 — Manual jump and pause

**Why:** A running time jump must execute every crossed poll, and pausing must freeze time and polling.

**What was tested:** With a slow real-time speed, advanced 29 simulated minutes at a polling frequency of 3, paused, and waited.

**Expected:** Polls at minutes 3 through 27, then no change while paused.

**Result: Pass.** The integrity screen showed nine completed polls. Time remained at 09:29 and the last poll remained at 09:27 while paused.

### SH-04 — Automatic scheduled poll

**Why:** Automatic time and manual jumps must use the same polling path.

**What was tested:** Used one real second per simulated minute and waited for minute 3 without a manual jump.

**Expected:** Exactly one complete poll at minute 3.

**Result: Pass.** The last poll was 09:03 and the integrity count was one.

### SH-05 — Snapshots while paused and after failure

**Why:** A snapshot should be immutable, identifiable, and sufficient to reproduce the visible experiment state.

**What was tested:** Captured `SNAP-001` while paused with an open A02 incident, failed the next poll, then captured `SNAP-002`.

**Expected:** Both snapshots remain available and can reproduce their recorded state.

**Result: Partial.** Both snapshot IDs and timestamps remained listed, including the snapshot after failure. There is no control to open a snapshot, inspect its contents, or reproduce its state.

### SH-06 — Shared clock across A02, A03, and A05

**Why:** V2 defines one factory clock so records created at the same instant age together.

**What was tested:** Created one A02 movement, one A03 OT, and one A05 reel at 09:00, then advanced 15 minutes from one tab.

**Expected:** All three records show 15 elapsed minutes.

**Result: Pass.** A02, A03, and A05 all showed 15 minutes.

### SH-07 — Source action at the same timestamp as a poll

**Why:** The poll and source action must have an understandable order and must not merge incorrectly.

**What was tested:** Polling completed at 09:03; receipt was then recorded at the same simulated timestamp.

**Expected:** The 09:03 poll remains committed, receipt is marked pending, and the 09:06 poll commits the receipt.

**Result: Pass.** The last poll stayed at 09:03 while receipt showed `Cambio pendiente de sondeo`; the movement left the active table after the 09:06 poll.

### SH-08 — New experiment after prior history

**Why:** The V2 matrix requires earlier observations and incidents to remain queryable after starting another experiment.

**What was tested:** Reviewed the visible reset behavior and the implementation boundary after an experiment with movements, incidents, and snapshots.

**Expected:** A new experiment identity with prior Monitor history still queryable.

**Result: Fail.** The standalone prototype replaces its entire in-memory state. Its corrected confirmation now accurately warns that all browser-local movements, incidents, and snapshots are discarded. The warning is correct, but the documented preservation requirement is not implemented.

### SH-09 — Duplicate prevention across all downstream objects

**Why:** Repeated unchanged polls must not create duplicate incidents, evidence, deliveries, conversations, messages, or cards.

**What was tested:** Repeated successful polls for unchanged open A02, A03, and A05 conditions.

**Expected:** Every downstream count remains stable.

**Result: Partial.** The occurrence count remained 1 and the total incident count remained stable. The UI does not expose evidence, delivery, conversation-link, message, or Dashboard-card counts, so the complete requirement cannot be proven.

### SH-10 — Failed and incomplete source reads

**Why:** Timeout, source error, incomplete results, and invalid shapes must preserve the last trustworthy Monitor state.

**What was tested:** Used `Hacer fallar el próximo sondeo` after correcting open incidents in each alert.

**Expected:** The failed poll preserves the incident until a later complete poll resolves it.

**Result: Partial.** The generic failed poll preserved state for A02, A03, and A05. There are no separate controls for timeout, source error, incomplete data, invalid result shape, pagination, stale freshness, or unknown freshness.

### SH-11 — Responsive behavior and console

**Why:** Acceptance requires usable layouts and no page-level overflow at 390, 768, and 1,440 pixels.

**What was tested:** Rendered an active movement at each required width and measured page and table overflow; checked browser warnings and errors.

**Expected:** No page overflow; mobile rows become business summary cards.

**Result: Fail.** There was no page-level overflow and no console warning or error. However, at 390 pixels the UI retained a 1,050-pixel table inside a 338-pixel horizontal scroller instead of rendering business summary cards. Tablet also retained the wide table.

## 6. A02 tests

### A02-00 — Complete clean received-on-time baseline

**Why:** A clean business baseline is a real dispatched movement received digitally on time, not merely an empty screen.

**What was tested:** Dispatched one material, recorded receipt before 30 minutes, and allowed a complete poll.

**Expected:** The movement leaves active transit, remains in history as received on time, and creates no incident, card, or conversation alert.

**Result: Partial.** The movement left the active table, history showed `RECIBIDO` and `Sin incidente`, and incident/open counts remained zero. History did not show `Recibido a tiempo`, receipt time, total transit duration, occurrence count, Dashboard result, or conversation result.

### A02-01 — Concurrent staggered movements

**Why:** Dozens or hundreds of movements may coexist and must be evaluated independently.

**What was tested:** Dispatched three different materials five minutes apart, including a uniquely coded reel and materials without unique codes.

**Expected:** Three independent rows with distinct ages and identities.

**Result: Pass.** The rows showed ages 10, 5, and 0 minutes; every row had an SKU; optional unique codes were handled as `No aplica`; the newest source write remained pending until polling.

### A02-02 — Before, at, after, and persistent threshold

**Why:** Threshold comparison and persistence determine when the first occurrence opens and whether duplicates appear.

**What was tested:** Kept one movement in `TRANSITO` at minutes 29 and 30, then repeated successful polls without changing it.

**Expected:** Minute 29 is clean; the current versioned A02 comparator controls minute 30; later polls preserve occurrence 1.

**Result: Fail because authority and implementation disagree.** Minute 29 had no incident. The prototype opened occurrence 1 at minute 30 and kept occurrence 1 through repeated polls. The current alert catalog says `current time - sent time > 30 minutes`, which implies opening after minute 30. The prototype uses `>= 30`. The operational difference is small, but the versioned authority is inconsistent and cannot yield one unambiguous acceptance result.

### A02-03 — Receipt after threshold but before the next poll

**Why:** Monitor must follow source truth at the next complete poll and must not invent an incident that was never observed.

**What was tested:** Dispatched at minute 1, allowed the movement to reach 31 minutes after dispatch while the last poll still saw 29 minutes, then recorded receipt before the next poll.

**Expected:** No retrospective A02 occurrence.

**Result: Pass.** The movement was `TRANSITO` for 31 minutes with no incident because no qualifying poll had occurred. The next poll saw `RECIBIDO`; history showed `Sin incidente`; incident counts remained zero.

### A02-04 — Correction, failed poll, resolution, and row isolation

**Why:** A failed read must preserve the old incident, and a later healthy poll must resolve only the corrected movement.

**What was tested:** Opened A02 for two movements, received only the first, failed the next poll, then ran a healthy poll.

**Expected:** Both incidents remain open after failure; the later healthy poll resolves only the received movement.

**Result: Partial.** The failed poll preserved the trustworthy state and the later healthy poll moved only the first movement to history as `Resuelta`; the second remained open. While the correction was pending, the row badge showed only `Cambio pendiente de sondeo`, hiding the preserved open incident from the table.

### A02-05 — Administrative closure while source condition persists

**Why:** Administrative closure must change Monitor state without fabricating receipt or changing EmusaSoft source state.

**What was tested:** Closed an open A02 with reason and mandatory comment, then polled the unchanged `TRANSITO` movement again.

**Expected:** Source remains `TRANSITO`; occurrence 1 becomes `Cerrada sin resolución`; repeated polls do not reopen it.

**Result: Pass within the prototype.** The row remained `TRANSITO`, stayed `Cerrada sin resolución`, and occurrence remained 1.

### A02-06 — Mixed movement population

**Why:** On-time, late, and still-moving records must not affect one another.

**What was tested:** Created three staggered movements; received one; left one overdue; left another below threshold.

**Expected:** Received movement has no incident, overdue movement is open, and younger movement remains clean.

**Result: Pass.** The three outcomes reconciled independently.

### A02-07 — Cancellation and reception rejection

**Why:** EmusaSoft permits an origin-authorized user to cancel a shipment and a destination-authorized user to reject reception. Either action must close the original tracking and create a separately tracked reverse movement.

**What was tested:** With `Solo origen`, opened A02 and selected `Anular envío`. With `Origen y destino`, verified that cancellation disappeared, opened another A02, and selected `Rechazar recepción`. A successful poll followed each source action.

**Expected:** The original movement receives a terminal source state; one new movement starts in `TRANSITO` with a new ID, reversed origin and destination, and a clock starting at the action time. The original A02 remains open until the next successful poll and then resolves. With both zones, rejection is available and cancellation is hidden.

**Result: Pass after follow-up implementation on 2026-07-30.** Both actions immediately created exactly one reverse movement without a confirmation popup. The new movement had a new ID, swapped endpoints, age 0, and `TRANSITO` state. The original incident stayed open while the source change was pending and became `Resuelta` after the next successful poll. Under `Origen y destino`, `Rechazar recepción` was visible and `Anular envío` was absent.

### A02-08 — Recurrence

**Why:** Recurrence must create occurrence 2 only after occurrence 1 resolved and a later condition became true again.

**What was tested:** Resolved an A02 occurrence, then inspected the available creation and row actions for a valid later movement with the same natural key.

**Expected:** The UI rejects recurrence before resolution and permits a later qualifying lifecycle after resolution, creating occurrence 2 while preserving occurrence 1.

**Result: Not testable.** A received movement cannot be returned to a later valid `TRANSITO` lifecycle, and the UI cannot create a later movement using the same natural key.

### A02-09 — Routing, Dashboard, and conversation

**Why:** The alert must notify both ends of the transfer and produce exactly one visible incident card and linked conversation alert.

**What was tested:** Opened an A02 occurrence and inspected the incident panel, integrity tab, and available navigation for actual recipients, deliveries, Dashboard cards, conversations, and messages.

**Expected:** Exactly one incident card and linked conversation alert, with both transfer ends and each routing delivery visibly verifiable.

**Result: Not testable.** The prototype shows synthetic statements such as `Una tarjeta abierta` but does not expose actual recipients, delivery status, Dashboard cards, conversations, or messages.

## 7. A03 tests

### A03-00 — Complete clean first-consumption baseline

**Why:** A valid A03 baseline is an active OT with a first valid consumption before 15 minutes.

**What was tested:** Started an OT, registered consumption at minute 10, and completed a poll.

**Expected:** The OT leaves the waiting table, remains in history, and creates no incident.

**Result: Partial.** History showed one consumption and `Sin incidente`; incident counts remained zero. It did not show consumption time, an explicit on-time outcome, Dashboard result, or conversation result.

### A03-01 — Before, exactly at, after, and persistent threshold

**Why:** A03 authority explicitly uses `>= 15 minutes`.

**What was tested:** Held one OT at minute 14, minute 15, and through repeated later polls without consumption.

**Expected:** Clean at 14; occurrence 1 opens at 15 and remains occurrence 1.

**Result: Pass.** The exact boundary and persistence matched the catalog.

### A03-02 — Concurrent OTs, mixed outcomes, and A07

**Why:** OTs start at different times and stronger A07 evidence must suppress or resolve A03 without inventing consumption.

**What was tested:** Started three OTs five minutes apart; gave one a valid consumption; left one overdue; applied A07 before opening on the third; later applied A07 to the open second OT.

**Expected:** Clean consumed OT, one open OT, one A07-suppressed OT, and A07 resolution of the open occurrence.

**Result: Pass.** All three reconciled independently. A07 did not invent a consumption and resolved the open occurrence when applied later.

### A03-03 — Consumption after incident with failed poll

**Why:** Correction must not resolve an incident until a successful complete poll.

**What was tested:** Opened A03, recorded consumption, failed the next poll, then ran a healthy poll.

**Expected:** Failure preserves the incident; healthy poll resolves it.

**Result: Partial.** The later healthy poll moved the OT to history as `Resuelta`. During the failed-read interval, the row showed only `Cambio pendiente de sondeo`, hiding the preserved open incident.

### A03-04 — Administrative closure and suppression

**Why:** Locked unreconstructable history may be closed without inventing consumption.

**What was tested:** Created a locked OT, opened A03, closed it administratively, and repeated polling while consumption remained missing.

**Expected:** `Cerrada sin resolución` remains suppressed while the uninterrupted source condition persists.

**Result: Partial.** Closure and suppression worked. The UI cannot later prove clear and recreate the same natural key, so recurrence cannot be tested.

### A03-05 — Locked input protection

**Why:** The alert catalog permits consumption correction only while the OT input is editable.

**What was tested:** Selected `Registrar consumo` on an OT visibly marked `Bloqueada`.

**Expected:** The action is unavailable or rejected.

**Result: Fail.** The prototype accepted the consumption and changed the count from 0 to 1.

### A03-06 — Recurrence, routing, Dashboard, and conversation

**Why:** A later qualifying A03 condition may create occurrence 2 only after the first occurrence resolved, and each occurrence must have verifiable downstream results.

**What was tested:** Resolved A03, then inspected OT actions, the incident panel, and the integrity tab for recurrence preparation, recipients, deliveries, Dashboard cards, conversations, and messages.

**Expected:** A valid later lifecycle creates occurrence 2 without changing occurrence 1, and exactly one set of downstream objects is visible for each occurrence.

**Result: Not testable.** The same OT cannot be returned to a later qualifying no-consumption state, and routing recipients, Dashboard cards, conversations, and messages are not exposed.

## 8. A05 tests

### A05-00 — Complete clean weighed-and-moved baseline

**Why:** A valid A05 baseline is a declared reel weighed and moved before 30 minutes.

**What was tested:** Declared a produced reel, weighed it, moved it at minute 10, and completed a poll.

**Expected:** No A05 occurrence; completed reel remains in history.

**Result: Partial.** History showed `Pesada: Sí`, `Salida: Sí`, and `Sin incidente`; incident counts remained zero. It omitted weighing time, movement time and destination, explicit on-time outcome, Dashboard result, and conversation result.

### A05-01 — Before, exactly at, both reasons, and persistence

**Why:** A05 has two independent OR reasons and at most one occurrence per reel.

**What was tested:** Left one reel unweighed and unmoved at minutes 29 and 30, then repeated polls.

**Expected:** Clean at 29; one occurrence at 30 containing both reasons; no duplicate occurrence.

**Result: Partial.** One occurrence opened at 30 and remained occurrence 1. The expected-result text said `sin pesar y sigue en máquina`, but the actual Monitor panel did not display its stored reason list.

### A05-02 — Each reason independently and produced versus remnant

**Why:** `not_weighed` and `still_at_machine` must work independently for produced and remnant reels, with deterministic routing.

**What was tested:** Created concurrent produced and remnant reels; moved but did not weigh the produced reel; weighed but did not move the remnant reel; polled at 30 minutes.

**Expected:** One occurrence per reel with only the applicable reason and correct recipients.

**Result: Partial.** Each reel opened one occurrence and the expected-result text identified only the correct remaining reason. Actual reason codes, recipients, and delivery routing were not visible. This run proved independent concurrent rows but did not separately repeat the case with declaration times staggered by several minutes.

### A05-03 — Partial correction in both orders

**Why:** Weighing first and moving first must keep the same occurrence with only the remaining reason.

**What was tested:** Opened two both-reason incidents; weighed the first and moved the second; polled; then completed the remaining action on each and polled again.

**Expected:** Occurrence 1 remains open with one reason, then resolves after both source facts are complete.

**Result: Partial.** Both occurrences stayed at 1 and later resolved. Expected-result text showed the remaining reason, but actual Monitor reasons were hidden.

### A05-04 — Correction followed by failed poll

**Why:** A failed poll must preserve the open A05 until a later healthy poll sees both corrections.

**What was tested:** Opened A05, recorded weighing and movement, failed the next poll, then ran a healthy poll.

**Expected:** Failure preserves the occurrence; later poll resolves it.

**Result: Partial.** The healthy poll resolved the incident. During failure, the pending badge hid the preserved open incident.

### A05-05 — Administrative closure while source condition persists

**Why:** An untraceable reel may close without invented scale or movement records.

**What was tested:** Closed an unweighed, unmoved remnant reel and repeated polling.

**Expected:** Source facts remain missing; incident stays closed and suppressed.

**Result: Partial.** Closure remained stable without source correction. The UI cannot prepare the later clear-and-recur sequence.

### A05-06 — A05-to-A02 handoff

**Why:** Once a reel starts a destination-bound movement, A05 must stop owning `still_at_machine`; an unreceived transfer later belongs to A02.

**What was tested:** Declared, weighed, and recorded the departure of a produced reel, then inspected A02.

**Expected:** A corresponding A02 movement exists and can age toward non-receipt detection.

**Result: Fail.** A05 became complete, but A02 remained empty. `Registrar salida` does not create a destination-bound movement.

### A05-07 — Recurrence

**Why:** A05 recurrence must be a later business event after resolution, not continued persistence or a manual reopening.

**What was tested:** Resolved an A05 occurrence, then inspected the available reel actions and creation form for a valid later lifecycle with the same natural key.

**Expected:** Recurrence is unavailable before resolution and creates occurrence 2 only after a later qualifying source event, while occurrence 1 remains preserved.

**Result: Not testable.** A completed reel cannot later be returned to a valid new qualifying lifecycle with the same natural key.

## 9. Automated-only and integration requirements

For each item below, I inspected the visible controls and the prototype's in-memory polling path. The purpose was to determine whether the documented adapter or integration condition could be created and whether its preservation or isolation result could be observed. None has an executable control or supporting boundary in this standalone HTML, so no simulated pass is claimed:

| Requirement | Result | Reason |
| --- | --- | --- |
| Incomplete read | Not testable | Only one generic complete failure is available |
| Invalid result shape | Not testable | No adapter or invalid-shape control exists |
| Partial pagination | Not testable | No paginated source adapter exists |
| Duplicate natural keys across pages | Not testable | No pagination or adapter boundary exists |
| Source revision changes during pagination | Not testable | No revision-aware paginated read exists |
| Stale or unknown freshness | Not testable | Freshness is not modeled in the UI |
| Adapter timeout and transport-specific errors | Not testable | Generic failure does not identify error type |
| Overlapping poll lock | Not testable | The UI exposes no concurrent poll evidence |
| Source-versus-Monitor database write isolation | Not testable | State is one in-memory JavaScript object, not separate databases |
| Real audit time, detection delay, and cursor | Not testable | Only simulated time and last-poll time are visible |
| Dashboard and conversation verification | Not testable | No linked Dashboard or conversation implementation exists |
| `test_database` adapter path | Deferred | The prototype remains synthetic |
| Production Aurora, authentication, failover, load, and deployment | Deferred | Assigned to later integration phases |

## 10. Historical pre-fix recommendations

The following list records what this report recommended at the time. It is preserved as historical evidence and has been superseded by the fixes and reclassifications in the [active Version 2 report](../../../docs/delivery/phases/phase6/alertas_fake_v2_edge_case_test_report_v2.md).

Recommended order for the next implementation pass:

1. Prevent consumption writes when A03 input is locked.
2. Implement A05 departure as a real destination-bound movement that appears in A02 without a duplicate A05 reason.
3. Resolve the A02 `> 30` versus `>= 30` authority conflict in the catalog and executable rule.
4. Add explicit recurrence preparation for the same natural key after a healthy clearing poll.
5. Preserve earlier experiment history outside the current browser-local experiment.
6. Complete all three history dialogs with timestamps, durations, business outcomes, occurrence counts, and terminal incident states.
7. Show actual incident reasons, recipients, delivery status, conversation link, message count, card count, and expected-versus-actual mismatch.
8. Keep source pending state and actual Monitor incident state visible simultaneously, especially after failed reads.
9. Add distinct failure controls or automated evidence for timeout, incomplete result, invalid shape, freshness, pagination, source-revision change, and poll locking.
10. Make polling-frequency changes update the displayed next poll deterministically before the experiment starts.
11. Add snapshot inspection or replay.
12. Implement mobile business-summary cards and tablet disclosure behavior.
13. Connect `alertas_fake` to `test_database`, then rerun the same matrix through normal read-only polling.

## 11. Historical review gate

At the time of this report, no fixes were to be implemented until its findings were reviewed. That gate is no longer active: the reviewed fixes and scope reclassifications are recorded in the [active Version 2 report](../../../docs/delivery/phases/phase6/alertas_fake_v2_edge_case_test_report_v2.md).
