> **Archive provenance:** Preserved from commit `165abc1`, original path `docs/delivery/phases/phase6/stage5_connected_acceptance_report.md`. The claims below describe the historical checkpoint and are not accepted current Stage 5 authority or evidence.

# Phase 6 Stage 5 — Connected acceptance report

**Execution date:** 2026-08-01

**Branch:** `codex/phase6-stage5`

**Starting HEAD:** `3d49bfe`
**Stage 5 exit:** **PASSED**

The exact 34-test inventory passed twice through the connected local path:

`alertas_fake → test_database → monitor_source_ro → normal scheduler → Monitor incidents → routing and deliveries → Dashboard → conversations → messages → Chat UI`

No invalid or deferred recurrence case was substituted. Production Aurora, real authentication, failover, production load, deployment, and managed infrastructure were not tested and remain Phase 10.

## Exact acceptance results

The executable authority is [`../../../../config/detection/stage5-connected-acceptance.v1.json`](../../../config/detection/stage5-connected-acceptance.v1.json), mapped from the approved definitions in [`stage5_connected_acceptance_inventory.md`](./stage5_connected_acceptance_inventory_checkpoint_165abc1.md).

| Corrected official run | Result | Durable local ledger |
| --- | --- | --- |
| `20260801T134848Z` | 34/34 passed | `local-data/test-database/evidence/stage5/20260801T134848Z-ledger.json` |
| `20260801T141110Z` | 34/34 passed | `local-data/test-database/evidence/stage5/20260801T141110Z-ledger.json` |

The earlier green runs are superseded because their clean A02/A03/A05 evidence described, but did not assert, the approved exact business timings. The corrected fixtures and ledgers assert A02 receipt at minute 20, A03 first consumption at minute 10, and A05 weighing and movement at minute 10.

The manifest contains exactly `SH-01`–`SH-11`, `A02-00`–`A02-07`, `A02-09`, `A03-00`–`A03-05`, `A05-00`–`A05-06`, and `A05-08`. It explicitly excludes invalid/deferred `A02-08`, `A03-06`, and `A05-07`.

## Connected findings

- Reset produced the verified backup-derived baseline before each run and restored it afterward.
- Source actions used the test-only writer and changed only `test_database`; Monitor polling used `monitor_source_ro`.
- Complete reads created or updated one natural incident occurrence; repeated reads did not duplicate evidence, incidents, routing decisions, deliveries, conversation links, alert messages, Dashboard cards, or committed cursors.
- Corrections resolved incidents only after a later complete healthy poll.
- Incomplete, partial-pagination, invalid-shape, duplicate-key, source-revision-change, stale, unknown-freshness, transport-error, timeout, and overlap cases preserved the last trustworthy state.
- A later healthy poll repaired deliberately incomplete conversation/message work without duplication.
- Dashboard APIs, exact-participant conversation reuse, Chat list, Chat detail, committed messages, and ordered client events were verified.
- Concurrent users, reconnect recovery, cursor ordering, duplicate sends, permissions, participant removal, pagination, unread counts, delivery receipts, and read receipts passed.
- Administrative closure preserved source truth and suppressed reopening only for the same uninterrupted condition.
- Business time, audit time, detection delay, and committed cursor remained independently recorded.

## Source lifecycle findings

- A02 cancellation and rejection terminalized the original movement and created exactly one reverse `TRANSITO` movement with a new ID; no terminal movement was made unreceived again.
- A03 positive consumption was not removed, OT closure blocked later consumption, and a competing active OT on the same machine was rejected.
- A05 used only weighing, movement, handoff, and OT-closure actions supported by source evidence; no recurrence action was invented.

## Manual UI evidence

The unchanged accepted UI code received one complete connected review in run `20260801T133002Z` at 390×844, 768×1024, and 1440×900. It passed Dashboard, Chat list, Chat detail, keyboard/focusability, accessible naming, reduced motion, responsive containment, visual inspection, and console review. The connected views showed exactly A02, A03, and A05, one backend conversation, one actual participant, three committed alert messages, no unnamed buttons, no duplicate IDs, no horizontal overflow, and zero console errors.

Each corrected run freshly revalidated the connected 390-pixel Chat list with one backend conversation and the exact A02/A03/A05 alert set. The in-app browser guard blocked fresh local detail-route navigation during those two repeats, so their `browser-review.json` explicitly reuses the full same-code review instead of claiming a new complete navigation. No UI code changed between the complete review and the corrected timing-only runs.

## Repeatable validation

Run:

```sh
npm run validate:phase6-stage5
```

The command resets and validates the source baseline, executes the exact manifest through the real adapter and downstream path, writes a per-test ledger, and restores and validates the baseline through an EXIT trap.

## Stage 6 simulator decision

Stage 6 may retire `monitor_sim_*` and the simulator adapter because every valid Stage 2 case now has a passing connected replacement. They remain present during Stage 5. Retirement must occur as a Stage 6 migration with a reference audit and rollback-safe preservation of historical evidence; it must not delete the accepted Stage 5 manifests or ledgers.
