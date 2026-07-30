# `alertas_fake` Stage 2 laboratory test report — Version 2

Date: 2026-07-30  
Branch: `codex/phase6-alertas-fake`  
Starting commit: `95164e3`  
Test surface: `prototypes/current/alertas-fake-v2/index.html`

## 1. Purpose

This report reruns the documented V2 scenario matrix after the prototype fixes. It is intentionally concise so each test can be reviewed with the user one at a time. The [archived first report](../../../../archive/docs/implementation/alertas_fake_v2_edge_case_test_report_v1.md) remains the pre-fix record.

The 36 tests in Sections 3–6 are Stage 2 tests only. They test the standalone HTML laboratory and the business rules represented there. They do not test a database connection, the real Monitor adapter, real PostgreSQL records, or real Dashboard and conversation delivery.

Codex's browser result for the same 36 Stage 2 scenario IDs is:

- 36 pass within the standalone prototype scope;
- 0 currently modeled Stage 2 behaviors fail; and
- all 36 remain pending one-test-at-a-time user review before Stage 2 acceptance.

One A05 presentation decision is outside those 36 modeled tests and remains unresolved: the catalog previously promised `Por vencer → Error`, but no pre-threshold `Por vencer` window is defined. The prototype currently tests only `Error` at `>= 30 minutes`; it does not claim that an undefined warning state passes.

This is not equivalent to saying that every earlier failure or `Not testable` result was independently fixed. Some defects were ordinary implementation work, some cases became implementable only because the user supplied missing EmusaSoft business rules, and later-stage requirements were removed from this 36-test matrix rather than being declared fixed. Section 7 preserves the Stage 3–5 handoff.

## 2. Reconciliation with the first report

The first report recorded 12 passes, 14 partial results, 6 failures, and 4 cases still classified as `Not testable` after the cancellation/rejection follow-up. The table below accounts for every former failure, partial result, and `Not testable` result instead of silently replacing those findings.

| Earlier tests | Earlier result | What changed | Basis and current boundary |
| --- | --- | --- | --- |
| `SH-02` | Fail | Timing inputs now update the conversion and next scheduled poll while paused. | Ordinary prototype fix from the approved V2 clock specification. |
| `SH-05` | Partial | Snapshots can now be opened and inspected as structured state. | Ordinary prototype fix. Snapshot persistence after page reload remains deferred. |
| `SH-08` | Fail | A new experiment archives the current browser-session experiment and keeps its movements, incidents, and snapshots queryable. | Ordinary prototype fix. Durable storage after reload remains deferred. |
| `SH-09` | Partial | Integrity now exposes synthetic incident, evidence, delivery, conversation, message, and card counters, and repeated polls leave them stable. | Prototype duplicate prevention passes. Real downstream records still require the connected stack. |
| `SH-10` | Partial | The UI now shows the pending source correction and preserved incident together after the generic failed poll. | The understandable Stage 2 business guarantee now passes. Invalid shape, pagination, freshness, timeout, transport, and locking variants are excluded from the 36-test matrix and handed to Stages 3–5. |
| `SH-11` | Fail | Mobile rows render as labeled business cards; tablet overflow is contained. | Ordinary prototype UI fix. |
| `A02-00`, `A03-00`, `A05-00` | Partial | Histories now show business outcomes, relevant timestamps, durations, occurrence counts, and terminal incident state. | Ordinary prototype reporting fix. Real Dashboard and conversation verification is not claimed by these baseline tests. |
| `A02-02` | Fail from conflicting authority | The catalog and prototype now both use `>= 30 minutes`. | The user explicitly said the one-second distinction was operationally immaterial and should not block progress. The implementation and catalog were then standardized on `>= 30`; this was a documented project choice, not an independently discovered EmusaSoft fact. |
| `A02-04`, `A03-03`, `A05-04` | Partial | Pending source state no longer hides the last trustworthy open incident. | Ordinary prototype presentation fix. Technical failed-read variants remain under `SH-10`. |
| `A02-07` | Previously not testable, then passed after follow-up implementation in the first report | Added origin cancellation, destination rejection, both-zone rejection priority, reversed origin/destination, new movement ID, reset clock, and post-poll resolution of the original incident. | **User-supplied EmusaSoft business knowledge**, supported by screenshots and the user's operational explanation. This could not have been implemented correctly without that input. Mapping these synthetic actions to real EmusaSoft records remains future adapter work. |
| `A02-08` | Not testable | Added recurrence preparation only after a terminal occurrence and a complete healthy clear. | Implemented from the already documented recurrence definition; no new EmusaSoft workflow was inferred. |
| `A02-09` | Not testable | The Stage 2 test now verifies that the prototype clearly presents synthetic recipient, delivery, Dashboard-card, conversation, and message expectations without claiming they are real records. | The Stage 2 presentation test passes. Real downstream verification is a separate Stage 5 requirement. |
| `A03-04`, `A05-05` | Partial | After administrative closure, the UI can prove a healthy clear and then prepare a later recurrence. | Ordinary lifecycle implementation from the documented suppression and recurrence rules. |
| `A03-05` | Fail | Locked OTs now expose a disabled action and reject forced consumption. | Ordinary prototype fix from existing A03 authority. |
| `A03-06` | Not testable | The recurrence portion can now create occurrence 2 while preserving occurrence 1, and the prototype presents its synthetic downstream expectations. | The Stage 2 recurrence and presentation test passes. Real downstream verification is a separate Stage 5 requirement. |
| `A05-01`, `A05-02`, `A05-03` | Partial | Incident detail now displays actual reason lists and deterministic synthetic recipients; both correction orders retain occurrence 1. | Prototype reason/routing display fix. Synthetic recipients do not prove production routing. |
| `A05-06` | Fail | Registering departure now creates exactly one destination-bound A02 movement. | Ordinary prototype fix from the approved A05-to-A02 ownership rule and required destination field. |
| `A05-07` | Not testable | Added valid later-condition preparation after resolution and healthy clear. | Implemented from the documented recurrence definition. |

The first report's separate 13 automated or integration requirements were not converted into prototype passes and are not part of the 36 Stage 2 tests. They remain explicitly listed in Section 7.

## 3. Shared experiment tests

| Test | What and why | What was done | Result |
| --- | --- | --- | --- |
| SH-01 — New experiment | Verify a clean, deterministic start. | Opened a new experiment before starting it and inspected all three alert tabs. | **Pass.** No source rows or completed poll appeared before start. |
| SH-02 — Speed and frequency | Verify that clock speed and polling frequency can be edited independently. | Entered speeds 1, 2, 3, and 60 and changed polling frequencies while paused. | **Pass.** Conversion text and next-poll time updated immediately. |
| SH-03 — Jump and pause | Verify that a time jump runs every crossed poll and that pause freezes the experiment. | At frequency 3, advanced 29 minutes, then paused. | **Pass.** Nine chronological polls ran at minutes 3–27; paused time and polling remained frozen. |
| SH-04 — Automatic poll | Verify that real-time clock ticks use the normal poll path. | Used one real second per simulated minute and waited until the next scheduled poll. | **Pass.** Exactly one automatic poll completed at the due simulated time. |
| SH-05 — Snapshots | Verify that a tester can inspect a saved state, including after a failed poll. | Captured snapshots before and after a scheduled failure and opened them from Integrity. | **Pass.** Each snapshot kept its ID and structured experiment, clock, source, poll, and incident summary. |
| SH-06 — Shared clock | Verify that A02, A03, and A05 use one factory clock. | Created records in all three tabs at the same time and advanced 15 minutes. | **Pass.** All records aged by the same 15 minutes. |
| SH-07 — Action at poll time | Verify ordering when a source action happens at the same timestamp as a completed poll. | Completed the 09:03 poll, then registered receipt at 09:03. | **Pass.** The receipt stayed pending until the 09:06 poll; the earlier poll was not rewritten. |
| SH-08 — New experiment after history | Verify that starting again does not hide prior experiment evidence inside the running laboratory. | Created movements, an incident, and a snapshot, then started another experiment. | **Pass.** Prior movements remained in history; prior experiment and snapshot counts remained in Integrity. Reload durability remains outside standalone HTML. |
| SH-09 — Duplicate prevention | Verify repeated healthy polls do not duplicate downstream objects. | Re-polled unchanged open A02, A03, and A05 records and compared counters. | **Pass.** Incidents, evidence, deliveries, conversations, messages, and cards stayed unchanged; only poll count increased. |
| SH-10 — Failed read preservation | Verify the Stage 2 business rule that an unsuccessful read preserves the last trustworthy visible state. | Corrected open conditions, made the next generic poll fail, then ran a healthy poll. | **Pass.** Pending source changes and existing incidents remained together after failure; the later healthy poll reconciled them. Technical failure variants are outside this matrix. |
| SH-11 — Responsive behavior | Verify usable desktop, tablet, and mobile layouts without page overflow. | Inspected widths 390, 768, and 1,440 and checked browser warnings/errors. | **Pass.** Mobile rows became labeled business cards; tablet used a contained table region; no page overflow or console error appeared. |

## 4. A02 tests

| Test | What and why | What was done | Result |
| --- | --- | --- | --- |
| A02-00 — Clean baseline | Verify a real movement received on time creates history but no alert. | Dispatched, advanced 20 minutes, received, and completed the next poll. | **Pass.** History showed `Recibido a tiempo`, 20-minute duration, and no incident. |
| A02-01 — Concurrent movements | Verify many staggered movements are evaluated independently. | Dispatched three materials at different times and received only the first. | **Pass.** The received row stayed clean, one older row alerted, and the younger row remained clean. |
| A02-02 — Threshold and persistence | Verify below 30, exactly 30, after 30, and repeated polls. | Observed one movement at 29 and 30 minutes and through later unchanged polls. | **Pass.** No alert at 29; one occurrence at 30; persistence did not create another occurrence. |
| A02-03 — Receipt before detection | Verify Monitor follows source truth at the complete poll instead of inventing a missed alert. | Used frequency 31, received after minute 30 but before the minute-31 poll. | **Pass.** The movement closed without an A02 incident. |
| A02-04 — Correction, failure, and isolation | Verify a corrected row is preserved through failure and unrelated rows do not change. | Corrected one open movement, failed the next poll, then completed a healthy poll while other rows remained active. | **Pass.** The selected incident stayed open after failure, resolved after success, and other movement outcomes were unchanged. |
| A02-05 — Administrative closure | Verify Monitor can close an incident without changing EmusaSoft source truth. | Closed an open A02 with reason/comment, left the movement `TRANSITO`, and crossed another poll. | **Pass.** The movement remained active and the incident remained `Cerrada sin resolución` without reopening. |
| A02-06 — Mixed population | Verify received-on-time, overdue, and still-young movements coexist correctly. | Created a mixed staggered population and polled it. | **Pass.** Each movement displayed its own correct history or active incident state. |
| A02-07 — Cancel and reject | Verify the two EmusaSoft source workflows and their permission precedence. | Tested `Anular envío` with origin authority and `Rechazar recepción` with destination/both authority. | **Pass.** Each closed the original, created exactly one reversed `TRANSITO` movement with a new ID and reset clock, and resolved any original alert after polling. With both zones, reject replaced cancel. Receipt remained available. |
| A02-08 — Recurrence | Verify recurrence means resolved first occurrence followed by a later qualifying condition. | Resolved occurrence 1, prepared the same natural key again, and crossed the threshold. | **Pass.** Occurrence 2 opened with a new incident ID while occurrence 1 remained in history. |
| A02-09 — Synthetic downstream expectations | Verify that a business tester can understand whom A02 should notify and what Dashboard/conversation result is expected without mistaking the prototype for connected evidence. | Opened A02 and inspected the synthetic recipients, deliveries, card, conversation, and message counts through repeated polls. | **Pass.** The expected synthetic result was visible and stable, and the page remained explicitly labeled as simulated. Real delivery is not part of this Stage 2 test. |

## 5. A03 tests

| Test | What and why | What was done | Result |
| --- | --- | --- | --- |
| A03-00 — Clean baseline | Verify valid first consumption before 15 minutes produces history without an alert. | Started an OT and registered consumption at minute 10. | **Pass.** History showed `Primer consumo a tiempo` and no incident. |
| A03-01 — Threshold and persistence | Verify below 15, exactly 15, after 15, and repeated polls. | Left an active OT without consumption across the boundary and subsequent polls. | **Pass.** One occurrence opened at 15 and remained one occurrence. |
| A03-02 — Concurrent mixed OTs | Verify independent results for consumed, empty, and A07-proven OTs. | Ran three OTs: one consumed, one left empty, and one given A07 evidence. | **Pass.** The three OTs reconciled independently with clean, open, and suppressed outcomes. |
| A03-03 — Correction after failed poll | Verify a failed read cannot resolve an alert after source consumption changes. | Registered consumption on an alerted OT, failed the next poll, then completed a healthy poll. | **Pass.** The alert survived the failed read and resolved only after success. |
| A03-04 — Administrative closure | Verify closure suppresses reopening while the same condition persists and allows later recurrence after clear. | Closed an open incident, polled unchanged source, applied A07, polled healthy, and prepared recurrence. | **Pass.** No immediate reopen occurred; recurrence became available only after the healthy clear. |
| A03-05 — Locked input | Verify the laboratory cannot invent consumption where the source input is locked. | Created a locked OT and inspected/attempted its action. | **Pass.** Only disabled `Consumo bloqueado` was available; no consumption timestamp was written. |
| A03-06 — Recurrence and synthetic downstream expectations | Verify occurrence 2, preserved occurrence 1, and understandable synthetic recipients and expected visible results. | Resolved occurrence 1 with A07, prepared the same OT again, crossed the threshold, and inspected the prototype result. | **Pass.** Occurrence 2 opened, occurrence 1 remained in history, and the simulated downstream expectations were visible. Real delivery is not part of this Stage 2 test. |

## 6. A05 tests

| Test | What and why | What was done | Result |
| --- | --- | --- | --- |
| A05-00 — Clean baseline | Verify weighing and movement before threshold produce history without an alert. | Declared, weighed, and moved a reel at minute 10, then polled. | **Pass.** History showed `Pesada y movida a tiempo` with weighing and departure times and no incident. |
| A05-01 — Threshold, both reasons, persistence | Verify one occurrence contains both missing requirements and does not duplicate. | Left a declared reel unweighed and at the machine through the threshold and later polls. | **Pass.** One incident contained `Sin pesar` and `Sigue en máquina`; later polls kept occurrence 1. |
| A05-02 — Independent reasons and reel kinds | Verify each OR reason and produced/remnant routing independently. | Tested produced moved-but-unweighed and remnant weighed-but-unmoved records. | **Pass.** Each incident showed only its remaining reason and the correct deterministic recipient set. |
| A05-03 — Partial correction both ways | Verify correction order does not create a new incident. | Weighed first in one case and moved first in another. | **Pass.** The same occurrence remained with only the outstanding reason in both orders. |
| A05-04 — Correction after failed poll | Verify source corrections cannot resolve A05 through an unsuccessful read. | Weighed and moved an alerted reel, failed the next poll, then completed a healthy poll. | **Pass.** The open alert and pending source change remained after failure; the healthy poll resolved it. |
| A05-05 — Administrative closure | Verify closure does not invent source weighing or movement. | Closed an open A05, polled while unchanged, then genuinely corrected and cleared it. | **Pass.** Closure persisted without source fabrication; recurrence became available only after the healthy clear. |
| A05-06 — A05-to-A02 handoff | Verify movement leaves A05 ownership and starts destination-bound A02 tracking exactly once. | Registered departure with a destination and later left the new movement unreceived past 30 minutes. | **Pass.** One A02 movement was created; A05 resolved its movement reason; A02 later opened for transit non-receipt. |
| A05-07 — Recurrence | Verify a new later qualifying condition creates occurrence 2, not a duplicate of occurrence 1. | Resolved the first A05, prepared recurrence, and crossed the threshold again. | **Pass.** A new incident ID and occurrence 2 appeared while the first remained in history. |

## 7. Stage 3–5 handoff — excluded from the 36 Stage 2 tests

These requirements are still mandatory, but they do not decide whether the Stage 2 HTML laboratory and its represented business rules are acceptable. The 13 requirements listed separately in the first report remain assigned to later stages as follows:

| Requirement from first report | Current status | Where it must be proved |
| --- | --- | --- |
| Incomplete read | Later-stage handoff; only generic business preservation is modeled in Stage 2 | Stage 4 adapter tests and Stage 5 acceptance |
| Invalid result shape | Later-stage handoff | Stage 4 adapter tests and Stage 5 acceptance |
| Partial pagination | Later-stage handoff | Stage 4 adapter tests and Stage 5 acceptance |
| Duplicate natural keys across pages | Later-stage handoff | Stage 4 adapter tests and Stage 5 acceptance |
| Source revision changes during pagination | Later-stage handoff | Stage 4 adapter tests and Stage 5 acceptance |
| Stale or unknown freshness | Later-stage handoff | Stage 4 adapter tests and Stage 5 acceptance |
| Adapter timeout and transport-specific errors | Later-stage handoff | Stage 4 adapter tests and Stage 5 acceptance |
| Overlapping poll lock | Later-stage handoff | Stage 4 poller tests and Stage 5 acceptance |
| Source-versus-Monitor database write isolation | Later-stage handoff | Stage 3 readiness inspection, Stage 4 connection, and Stage 5 acceptance |
| Real audit time, detection delay, and cursor | Later-stage handoff | Stage 4 normal polling and Stage 5 acceptance |
| Dashboard and conversation verification | Later-stage handoff | Stage 5 connected acceptance |
| `test_database` adapter path | Later-stage handoff | Stage 3 readiness inspection, Stage 4 connection, and Stage 5 acceptance |
| Production Aurora, authentication, failover, load, and deployment | Later Phase 10 evidence | Production integration |

Durable experiment history after reloading the standalone page is also not implemented. The prototype preserves prior experiments only for the current browser session; durable history belongs to the connected application.

## 8. Review order

Review one test at a time in this order: SH-01 through SH-11, A02-00 through A02-09, A03-00 through A03-06, then A05-00 through A05-07. Resolve questions about the current test before advancing.
