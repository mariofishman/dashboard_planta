# Phase 6 Stage 5 — Connected acceptance inventory

**Status:** Complete — 34/34 passed twice on 2026-08-01

**Executable manifest:** [`../../../../config/detection/stage5-connected-acceptance.v1.json`](../../../../config/detection/stage5-connected-acceptance.v1.json)
**Source authority:** [`alertas_fake_v2_edge_case_test_report_v2.md`](./alertas_fake_v2_edge_case_test_report_v2.md)
**Acceptance set:** 34 user-approved Stage 2 tests

Every row below preserves the approved Stage 2 intent and expected outcome while replacing browser-local synthetic counters with the connected path:

`alertas_fake → test_database → monitor_source_ro → normal scheduler → Monitor incidents → routing and deliveries → Dashboard → conversations → messages → Chat UI`

The inventory excludes `A02-08` and `A03-06` because recurrence is invalid for the same movement or OT, and excludes `A05-07` because no source-valid recurrence action is documented. Production Aurora, real authentication, failover, production load, deployment, and managed infrastructure remain Phase 10.

## Shared tests

| Stage 2 test | Connected equivalent and preserved expected outcome |
| --- | --- |
| `SH-01` — New experiment | Reset to the verified backup-derived baseline, start a new durable experiment, and confirm no laboratory source rows, completed poll, incident, delivery, card, conversation, or message exists before start. Earlier Monitor history remains queryable. |
| `SH-02` — Speed and frequency | Set speeds 1, 2, 3, and 60 and independent polling frequencies while paused; confirm conversion and next scheduled poll update immediately without a source or Monitor write. |
| `SH-03` — Jump and pause | At frequency 3, advance 29 simulated minutes through the normal scheduler; confirm nine serialized cycles at minutes 3–27 and that pause freezes business time and automatic polling. |
| `SH-04` — Automatic poll | At one real second per simulated minute, let the next poll become due; confirm exactly one normal scheduler execution, not a scenario-side incident mutation. |
| `SH-05` — Snapshots | Capture durable structured snapshots before and after a failed connected poll; confirm stable snapshot identity and source, clock, poll, incident, routing, conversation, message, card, audit-time, delay, and cursor state. |
| `SH-06` — Shared clock | Create A02, A03, and A05 source records at one simulated time, advance 15 minutes, and confirm all three age from the same business clock while audit time remains real server time. |
| `SH-07` — Action at poll time | Commit a complete 09:03 poll, then record an A02 receipt at 09:03; confirm the committed cycle is unchanged and the receipt remains pending until the 09:06 complete poll. |
| `SH-08` — New experiment after history | Open incidents and capture a snapshot, then start another experiment; confirm prior source observations, incidents, deliveries, conversations, messages, cards, and snapshots remain durably queryable. |
| `SH-09` — Duplicate prevention | Re-poll unchanged open A02, A03, and A05 conditions; confirm no duplicate evidence, incident occurrence, routing decision or delivery, conversation link, alert message, Dashboard card, or committed client event. |
| `SH-10` — Failed read preservation | Correct open source conditions, make the next connected cycle fail or become incomplete, then run a healthy cycle; confirm the last trustworthy state survives the failed cycle and the later healthy cycle reconciles and repairs downstream work without duplication. |
| `SH-11` — Responsive behavior | Verify the connected Dashboard, Chat list, Chat detail, and scenario evidence at 390, 768, and 1440 pixels, with keyboard, accessibility, reduced-motion, visual, overflow, and console checks; preserve the approved mobile cards and contained tablet/desktop layouts. |

## A02 tests

| Stage 2 test | Connected equivalent and preserved expected outcome |
| --- | --- |
| `A02-00` — Clean baseline | Dispatch in `test_database`, receive at minute 20, and let the next complete read run; confirm `Recibido a tiempo` history with 20-minute duration and no incident or downstream alert object. |
| `A02-01` — Concurrent movements | Create three independently keyed movements at staggered times and receive only the first; confirm the received row stays clean, only the overdue row opens A02, and the younger row stays clean. |
| `A02-02` — Threshold and persistence | Read one movement at 29 minutes, exactly 30 minutes, and later unchanged cycles; confirm no incident at 29, exactly one occurrence at 30, and no duplicate evidence or downstream object afterward. |
| `A02-03` — Receipt before detection | Use a 31-minute interval, receive after minute 30 but before the first complete read, and confirm source truth closes the movement without inventing a historical A02 incident. |
| `A02-04` — Correction, failure, and isolation | Correct one open movement, fail the next complete read, and recover while unrelated movements remain active; confirm the selected incident survives failure, resolves only on recovery, and unrelated outcomes do not change. |
| `A02-05` — Administrative closure | Close one open A02 through the authorized audited Monitor endpoint while its source remains `TRANSITO`; confirm no source write, read-only history, one `CLOSED_WITHOUT_RESOLUTION` occurrence, closed detail, and suppression across unchanged healthy polls for the same uninterrupted condition. |
| `A02-06` — Mixed population | Poll received-on-time, overdue, and still-young movements together; confirm independent history/incident outcomes and only the overdue condition reaches routing, Dashboard, conversation, message, and Chat UI. |
| `A02-07` — Cancel and reject | Execute origin cancellation and destination rejection in `test_database`; confirm each terminalizes the original, creates exactly one reversed `TRANSITO` movement with a new ID and reset clock, applies rejection precedence for both-zone authority, and resolves the original incident only after a later complete poll. |
| `A02-09` — Connected downstream expectations | Open A02 and verify exact deterministic recipients and deliveries, one Dashboard card, exact-participant conversation reuse, one Monitor alert message, committed cursor delivery, and stable Chat list/detail presentation through repeated polls. |

## A03 tests

| Stage 2 test | Connected equivalent and preserved expected outcome |
| --- | --- |
| `A03-00` — Clean baseline | Start an OT and record positive first consumption at minute 10; confirm `Primer consumo a tiempo` history and no incident or downstream alert object. |
| `A03-01` — Threshold and persistence | Leave one active OT with zero valid consumption below, at, and after 15 minutes; confirm exactly one occurrence opens at 15 and remains the same occurrence across later polls. |
| `A03-02` — Concurrent mixed OTs | Run consumed, closed-without-consumption, and empty active OTs on different machines and reject a second active OT on the same machine; confirm only the empty active OT opens A03. |
| `A03-03` — Correction after failed poll | Record positive consumption for an alerted OT, fail the next complete read, then recover; confirm the incident and downstream state survive failure and resolve only after the healthy poll. |
| `A03-04` — Administrative closure | Close an open A03 through the authorized audited Monitor endpoint while the OT stays active with zero consumption; confirm read-only history and suppression for the same uninterrupted condition without a source write or reopening on unchanged polls. |
| `A03-05` — Open-OT consumption availability | Confirm an open OT accepts first consumption, closure blocks later consumption, and the next complete poll moves the closed OT to history and resolves any open A03 without inventing consumption. |

## A05 tests

| Stage 2 test | Connected equivalent and preserved expected outcome |
| --- | --- |
| `A05-00` — Clean baseline | Declare, weigh, and move a reel at minute 10, then poll; confirm `Pesada y movida a tiempo` history with weighing/departure timestamps and no incident or downstream alert object. |
| `A05-01` — Threshold, both reasons, persistence | Leave one declared reel unweighed and at the machine through 30 minutes and later polls; confirm exactly one occurrence containing `not_weighed` and `still_at_machine`, with no duplicate downstream objects. |
| `A05-02` — Independent reasons and reel kinds | Test a produced moved-but-unweighed reel and a remnant weighed-but-unmoved reel; confirm one reason per incident and the exact produced/remnant deterministic recipient sets. |
| `A05-03` — Partial correction both ways | Weigh first in one case and move first in another; confirm the same occurrence remains with only the outstanding reason and no new incident, delivery, conversation, message, or card. |
| `A05-04` — Correction after failed poll | Weigh and move an alerted reel, fail the next complete read, then recover; confirm the open incident and pending source truth survive failure and resolve only after the healthy poll. |
| `A05-05` — Administrative closure | Close one open A05 through the authorized audited Monitor endpoint while weighing and movement remain absent; confirm no source write, read-only history, one closed occurrence, closed detail, and suppression across unchanged healthy polls. |
| `A05-06` — A05-to-A02 handoff | Register one destination-bound departure, then leave the new movement unreceived past 30 minutes; confirm exactly one new A02 movement, removal of A05's movement reason, later A02 ownership, and no duplicate A05 movement alert. |
| `A05-08` — A05 survives OT closure | Open A05 with both reasons, close the source OT, poll, then legally weigh and move the reel and poll again; confirm the same occurrence survives OT closure and later resolves with preserved closure, weighing, departure, duration, A02 handoff, and downstream history. |

## Cross-cutting connected requirements

All applicable rows above also execute incomplete reads, invalid shapes, partial pagination, duplicate natural keys across pages, source-revision drift during pagination, stale and unknown freshness, adapter timeout and transport failures, overlapping-poll protection, source/Monitor write isolation, audit time, detection delay, committed cursor, Dashboard/conversation verification, the real `test_database` adapter, downstream repair, conversation reuse, concurrent users, reconnect recovery, cursor ordering, duplicate sends, permissions, participant removal, pagination, unread counts, delivery receipts, and read receipts.
