# `alertas_fake` Stage 2 laboratory test report — Version 2

Date: 2026-07-30  
Branch: `codex/phase6-alertas-fake`  
Starting commit: `95164e3`  
Test surface: `prototypes/current/alertas-fake-v2/index.html`
Review status: Stage 2 complete and user-approved on 2026-07-31

## 1. Purpose

This report reruns the documented V2 scenario matrix after the prototype fixes. It is intentionally concise so each test can be reviewed with the user one at a time. The [archived first report](../../../../archive/docs/implementation/alertas_fake_v2_edge_case_test_report_v1.md) remains the pre-fix record.

Sections 3–6 retain the original 36 scenario IDs for traceability and add A05-08, producing 37 tracked IDs. After user review, three recurrence scenarios were removed from the Stage 2 acceptance set: A02 recurrence is invalid for one specific movement, A03 recurrence is invalid for one specific OT, and A05 lacks a documented source-valid recurrence workflow. The remaining 34 tests exercise the standalone HTML laboratory and the business rules represented there. They do not test a database connection, the real Monitor adapter, real PostgreSQL records, or real Dashboard and conversation delivery.

Codex's browser result is:

- 34 of the 34 remaining Stage 2 tests pass within the standalone prototype scope;
- 0 tests require rerun after the user-directed current-work/history corrections;
- 0 Stage 2 tests remain to be built or rerun;
- 2 invalid recurrence IDs (A02 and A03) and 1 deferred A05 recurrence ID do not count as Stage 2 passes or failures;
- 0 currently modeled Stage 2 behaviors fail; and
- all 34 Stage 2 tests are user-approved.

The previously unresolved A05 presentation decision was approved on 2026-07-31: A05 has no pre-threshold `Por vencer` state. The prototype's tested behavior—normal before 30 minutes and `Error` at `>= 30 minutes`—matches the approved rule.

This is not equivalent to saying that every earlier failure or `Not testable` result was independently fixed. Some defects were ordinary implementation work, some cases became implementable only because the user supplied missing EmusaSoft business rules, and later-stage requirements were excluded from the 34 valid Stage 2 acceptance tests rather than being declared fixed. Section 7 preserves the Stage 3–5 handoff.

## 2. Reconciliation with the first report

The first report recorded 12 passes, 14 partial results, 6 failures, and 4 cases still classified as `Not testable` after the cancellation/rejection follow-up. The table below accounts for every former failure, partial result, and `Not testable` result instead of silently replacing those findings.

| Earlier tests | Earlier result | What changed | Basis and current boundary |
| --- | --- | --- | --- |
| `SH-02` | Fail | Timing inputs now update the conversion and next scheduled poll while paused. | Ordinary prototype fix from the approved V2 clock specification. |
| `SH-05` | Partial | Snapshots can now be opened and inspected as structured state. | Ordinary prototype fix. Snapshot persistence after page reload remains deferred. |
| `SH-08` | Fail | A new experiment archives the current browser-session experiment and keeps its movements, incidents, and snapshots queryable. | Ordinary prototype fix. Durable storage after reload remains deferred. |
| `SH-09` | Partial | Integrity now exposes synthetic incident, evidence, delivery, conversation, message, and card counters, and repeated polls leave them stable. | Prototype duplicate prevention passes. Real downstream records still require the connected stack. |
| `SH-10` | Partial | The UI now shows the pending source correction and preserved incident together after the generic failed poll. | The understandable Stage 2 business guarantee now passes. Invalid shape, pagination, freshness, timeout, transport, and locking variants are excluded from the 34 valid Stage 2 acceptance tests and handed to Stages 3–5. |
| `SH-11` | Fail | Mobile rows render as labeled business cards; tablet overflow is contained. | Ordinary prototype UI fix. |
| `A02-00`, `A03-00`, `A05-00` | Partial | Histories now show business outcomes, relevant timestamps, durations, occurrence counts, and terminal incident state. | Ordinary prototype reporting fix. Real Dashboard and conversation verification is not claimed by these baseline tests. |
| `A02-02` | Fail from conflicting authority | The catalog and prototype now both use `>= 30 minutes`. | The user explicitly said the one-second distinction was operationally immaterial and should not block progress. The implementation and catalog were then standardized on `>= 30`; this was a documented project choice, not an independently discovered EmusaSoft fact. |
| `A02-04`, `A03-03`, `A05-04` | Partial | Pending source state no longer hides the last trustworthy open incident. | Ordinary prototype presentation fix. Technical failed-read variants remain under `SH-10`. |
| `A02-07` | Previously not testable, then passed after follow-up implementation in the first report | Added origin cancellation, destination rejection, both-zone rejection priority, reversed origin/destination, new movement ID, reset clock, and post-poll resolution of the original incident. | **User-supplied EmusaSoft business knowledge**, supported by screenshots and the user's operational explanation. This could not have been implemented correctly without that input. Mapping these synthetic actions to real EmusaSoft records remains future adapter work. |
| `A02-08` | Not testable | The artificial recurrence preparation was removed after user review. | **Invalid A02 scenario — user decision 2026-07-31.** A terminal movement cannot become unreceived or return to `TRANSITO`; a reverse shipment has a new movement ID and is evaluated independently. |
| `A02-09` | Not testable | The Stage 2 test now verifies that the prototype clearly presents synthetic recipient, delivery, Dashboard-card, conversation, and message expectations without claiming they are real records. | The Stage 2 presentation test passes. Real downstream verification is a separate Stage 5 requirement. |
| `A03-04`, `A05-05` | Partial | A later user-review correction moves closed rows to read-only history and closes their detail panel. | Both corrected administrative-closure presentations passed their reruns. Artificial recurrence preparation and source-changing history actions are no longer part of these tests. |
| `A03-05` | Fail | The invented editable/blocked selector was removed. Every active OT permits first-consumption entry; closing the OT is what blocks it. | User-supplied correction to match EmusaSoft behavior. |
| `A03-06` | Not testable | The artificial recurrence preparation was removed after user review. | **Invalid A03 scenario — user decision 2026-07-31.** A specific OT cannot lose a valid first consumption or become active again after closure; another OT is a new case. |
| `A05-01`, `A05-02`, `A05-03` | Partial | Incident detail now displays actual reason lists and deterministic synthetic recipients; both correction orders retain occurrence 1. | Prototype reason/routing display fix. Synthetic recipients do not prove production routing. |
| `A05-06` | Fail | Registering departure now creates exactly one destination-bound A02 movement. | Ordinary prototype fix from the approved A05-to-A02 ownership rule and required destination field. |
| `A05-07` | Not testable | The artificial recurrence preparation was removed after user review. | No documented EmusaSoft workflow makes a weighed and moved bobina become unweighed or unmoved; recurrence is deferred. |

The first report's separate 13 automated or integration requirements were not converted into prototype passes and are not part of the 34 valid Stage 2 acceptance tests. They remain explicitly listed in Section 7.

## 3. Shared experiment tests

| Test | What and why | What was done | Result |
| --- | --- | --- | --- |
| SH-01 — New experiment | Verify a clean, deterministic start. | Opened a new experiment before starting it and inspected all three alert tabs. | **Pass — user approved 2026-07-30.** No source rows or completed poll appeared before start. |
| SH-02 — Speed and frequency | Verify that clock speed and polling frequency can be edited independently. | Entered speeds 1, 2, 3, and 60 and changed polling frequencies while paused. | **Pass — user approved 2026-07-30.** Conversion text and next-poll time updated immediately. |
| SH-03 — Jump and pause | Verify that a time jump runs every crossed poll and that pause freezes the experiment. | At frequency 3, advanced 29 minutes, then paused. | **Pass — user approved 2026-07-30.** Nine chronological polls ran at minutes 3–27; paused time and polling remained frozen. |
| SH-04 — Automatic poll | Verify that real-time clock ticks use the normal poll path. | Used one real second per simulated minute and waited until the next scheduled poll. | **Pass — user approved 2026-07-30.** Exactly one automatic poll completed at the due simulated time. |
| SH-05 — Snapshots | Verify that a tester can inspect a saved state, including after a failed poll. | Captured snapshots before and after a scheduled failure and opened them from Integrity. | **Pass — user approved 2026-07-31.** Each snapshot kept its ID and structured experiment, clock, source, poll, and incident summary. |
| SH-06 — Shared clock | Verify that A02, A03, and A05 use one factory clock. | Created records in all three tabs at the same time and advanced 15 minutes. | **Pass — user approved 2026-07-31.** All records aged by the same 15 minutes. |
| SH-07 — Action at poll time | Verify ordering when a source action happens at the same timestamp as a completed poll. | Completed the 09:03 poll, then registered receipt at 09:03. | **Pass — user approved 2026-07-31.** The receipt stayed pending until the 09:06 poll; the earlier poll was not rewritten. |
| SH-08 — New experiment after history | Verify that starting again does not hide prior experiment evidence inside the running laboratory. | Created movements, an incident, and a snapshot, then started another experiment. | **Pass — user approved 2026-07-31.** Prior movements remained in history; prior experiment and snapshot counts remained in Integrity. Reload durability remains outside standalone HTML. |
| SH-09 — Duplicate prevention | Verify repeated healthy polls do not duplicate downstream objects. | Re-polled unchanged open A02, A03, and A05 records and compared counters. | **Pass — user approved 2026-07-31.** Incidents, evidence, deliveries, conversations, messages, and cards stayed unchanged; only poll count increased. |
| SH-10 — Failed read preservation | Verify the Stage 2 business rule that an unsuccessful read preserves the last trustworthy visible state. | Corrected open conditions, made the next generic poll fail, then ran a healthy poll. | **Pass — user approved 2026-07-31.** Pending source changes and existing incidents remained together after failure; the later healthy poll reconciled them. Technical failure variants are outside this matrix. |
| SH-11 — Responsive behavior | Verify usable desktop, tablet, and mobile layouts without page overflow. | Inspected widths 390, 768, and 1,440 and checked browser warnings/errors. | **Pass — user approved 2026-07-31.** Mobile rows became labeled business cards; tablet used a contained table region; no page overflow or console error appeared. |

## 4. A02 tests

| Test | What and why | What was done | Result |
| --- | --- | --- | --- |
| A02-00 — Clean baseline | Verify a real movement received on time creates history but no alert. | Dispatched, advanced 20 minutes, received, and completed the next poll. | **Pass — user approved 2026-07-31.** History showed `Recibido a tiempo`, 20-minute duration, and no incident. |
| A02-01 — Concurrent movements | Verify many staggered movements are evaluated independently. | Dispatched three materials at different times and received only the first. | **Pass — user approved 2026-07-31.** The received row stayed clean, one older row alerted, and the younger row remained clean. |
| A02-02 — Threshold and persistence | Verify below 30, exactly 30, after 30, and repeated polls. | Observed one movement at 29 and 30 minutes and through later unchanged polls. | **Pass — user approved 2026-07-31.** No alert at 29; one occurrence at 30; persistence did not create another occurrence. |
| A02-03 — Receipt before detection | Verify Monitor follows source truth at the complete poll instead of inventing a missed alert. | Used frequency 31, received after minute 30 but before the minute-31 poll. | **Pass — user approved 2026-07-31.** The movement closed without an A02 incident. |
| A02-04 — Correction, failure, and isolation | Verify a corrected row is preserved through failure and unrelated rows do not change. | Corrected one open movement, failed the next poll, then completed a healthy poll while other rows remained active. | **Pass — user approved 2026-07-31.** The selected incident stayed open after failure, resolved after success, and other movement outcomes were unchanged. |
| A02-05 — Administrative closure | Verify Monitor can close an incident without changing EmusaSoft source truth. | Closed an open A02 with a required reason and comment while leaving the movement `TRANSITO`, inspected history, and completed another unchanged poll. | **Pass — user approved 2026-07-31.** The row left current work, remained in read-only history as one `Cerrada sin resolución` alert, closed its detail panel, preserved the pending source truth, and did not reopen after the later complete poll. |
| A02-06 — Mixed population | Verify received-on-time, overdue, and still-young movements coexist correctly. | Created a mixed staggered population and polled it. | **Pass — user approved 2026-07-31.** Each movement displayed its own correct history or active incident state. |
| A02-07 — Cancel and reject | Verify the two EmusaSoft source workflows and their permission precedence. | Tested `Anular envío` with origin authority and `Rechazar recepción` with destination/both authority. | **Pass — user approved 2026-07-31.** Each closed the original, created exactly one reversed `TRANSITO` movement with a new ID and reset clock, and resolved any original alert after polling. With both zones, reject replaced cancel. Receipt remained available. |
| A02-08 — Recurrence | Previously attempted to make a resolved movement qualify again. | The previous test rewrote a completed movement as `TRANSITO`. | **Invalid; not tested — user decision 2026-07-31.** A specific A02 movement cannot become unreceived after reaching a terminal state. Cancellation or rejection creates a separately identified reverse movement, not recurrence. |
| A02-09 — Synthetic downstream expectations | Verify that a business tester can understand whom A02 should notify and what Dashboard/conversation result is expected without mistaking the prototype for connected evidence. | Opened A02 and inspected the synthetic recipients, deliveries, card, conversation, and message counts through repeated polls. | **Pass — user approved 2026-07-31.** The expected synthetic result was visible and stable, and the page remained explicitly labeled as simulated. Real delivery is not part of this Stage 2 test and will be tested during Chat UI integration. |

## 5. A03 tests

| Test | What and why | What was done | Result |
| --- | --- | --- | --- |
| A03-00 — Clean baseline | Verify valid first consumption before 15 minutes produces history without an alert. | Started an OT and registered consumption at minute 10. | **Pass — user approved 2026-07-31.** History showed `Primer consumo a tiempo` and no incident. |
| A03-01 — Threshold and persistence | Verify below 15, exactly 15, after 15, and repeated polls. | Left an active OT without consumption across the boundary and subsequent polls. | **Pass — user approved 2026-07-31.** One occurrence opened at 15 and remained one occurrence. |
| A03-02 — Concurrent mixed OTs | Verify independent results for consumed, empty, and closed OTs on different machines, while rejecting two active OTs on the same machine. | Ran three OTs on EX-04, IM-02, and LA-01: one consumed, one closed without consumption, and one left empty through minute 15; also attempted a second active OT on EX-04. | **Pass — user approved 2026-07-31.** The consumed and closed OTs remained alert-free, the empty active OT opened exactly one A03, and the duplicate-machine OT was rejected. |
| A03-03 — Correction after failed poll | Verify a failed read cannot resolve an alert after source consumption changes. | Registered consumption on an alerted OT, failed the next poll, then completed a healthy poll. | **Pass — user approved 2026-07-31.** The alert survived the failed read and resolved only after success. |
| A03-04 — Administrative closure | Verify administrative closure suppresses reopening while the same active/no-consumption condition persists. | Closed an open incident, confirmed it moved to read-only history, and completed another unchanged healthy poll. | **Pass — user approved 2026-07-31.** The detail panel closed, the OT remained active with zero consumption, and the incident stayed `Cerrada sin resolución` as occurrence 1 after the later poll. |
| A03-05 — Open-OT consumption availability | Verify the laboratory matches EmusaSoft: an open OT always permits consumption input, while closure is what blocks it. | Created and polled an active OT, inspected its source actions, closed the OT, and completed the next poll. | **Pass — user approved 2026-07-31.** The active OT offered `Registrar consumo`; closure removed all source actions, and the next complete poll moved the closed OT to read-only history. |
| A03-06 — Recurrence and synthetic downstream expectations | Previously attempted to make the same OT qualify again after valid consumption or closure. | The previous test reverted terminal source evidence on the same OT to make it qualify again. | **Invalid; not tested — user decision 2026-07-31.** A specific OT cannot lose a valid first consumption or become active again after closure. A different OT is a new case, not recurrence. Synthetic downstream presentation remains covered elsewhere; real delivery belongs to Stage 5. |

## 6. A05 tests

| Test | What and why | What was done | Result |
| --- | --- | --- | --- |
| A05-00 — Clean baseline | Verify weighing and movement before threshold produce history without an alert. | Declared, weighed, and moved a reel at minute 10, then polled. | **Pass — user approved 2026-07-31.** History showed `Pesada y movida a tiempo` with weighing and departure times and no incident. |
| A05-01 — Threshold, both reasons, persistence | Verify one occurrence contains both missing requirements and does not duplicate. | Left a declared reel unweighed and at the machine through the threshold and later polls. | **Pass — user approved 2026-07-31.** One incident contained `Sin pesar` and `Sigue en máquina`; later polls kept occurrence 1. |
| A05-02 — Independent reasons and reel kinds | Verify each OR reason and produced/remnant routing independently. | Tested produced moved-but-unweighed and remnant weighed-but-unmoved records. | **Pass — user approved 2026-07-31.** Each incident showed only its remaining reason and the correct deterministic recipient set. |
| A05-03 — Partial correction both ways | Verify correction order does not create a new incident. | Weighed first in one case and moved first in another. | **Pass — user approved 2026-07-31.** The same occurrence remained with only the outstanding reason in both orders. |
| A05-04 — Correction after failed poll | Verify source corrections cannot resolve A05 through an unsuccessful read. | Weighed and moved an alerted reel, failed the next poll, then completed a healthy poll. | **Pass — user approved 2026-07-31.** The open alert and pending source change remained after failure; the healthy poll resolved it. |
| A05-05 — Administrative closure | Verify closure does not invent source weighing or movement. | Closed an open A05, confirmed it moved to read-only history, then completed a later poll while the source remained unchanged. | **Pass — user approved 2026-07-31.** The detail panel closed immediately; history preserved pending weighing and departure, one closed occurrence, and `Cerrada sin resolución`; the later poll did not reopen it. |
| A05-06 — A05-to-A02 handoff | Verify movement leaves A05 ownership and starts destination-bound A02 tracking exactly once. | Registered departure with a destination and later left the new movement unreceived past 30 minutes. | **Pass — user approved 2026-07-31.** One A02 movement was created; A05 resolved its movement reason; A02 later opened for transit non-receipt. |
| A05-07 — Recurrence | Verify a new later qualifying condition creates occurrence 2, not a duplicate of occurrence 1. | The previous test removed completed weighing and movement from the same bobina. | **Deferred; removed from Stage 2 acceptance.** The setup was not a documented EmusaSoft source workflow. |
| A05-08 — A05 survives OT closure | Verify closing the source OT neither resolves A05 nor prevents later legal weighing and movement. | Opened A05 with both reasons, closed its source OT, completed another poll, then weighed and moved the bobina and polled again. | **Pass — user approved 2026-07-31.** The same open occurrence survived OT closure with both reasons; later legal weighing and departure resolved occurrence 1. History preserved the OT closure, weighing, departure, duration, A02 handoff, and resolved A05. |

## 7. Stage 3–5 handoff — excluded from the 34 valid Stage 2 acceptance tests

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
