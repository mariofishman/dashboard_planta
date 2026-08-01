# Phase 6 Stage 5 — test_database handoff

**Status:** Stage 5 connected acceptance passed

**Authority:** [`stage5_connected_acceptance_inventory.md`](./stage5_connected_acceptance_inventory.md)
**Evidence:** [`stage5_connected_acceptance_report.md`](./stage5_connected_acceptance_report.md)

## Delivered

- exact versioned 34-test manifest and backup-derived Stage 5 fixture map;
- durable experiment, snapshot, and per-test acceptance-result persistence;
- real MySQL adapter faults for incomplete reads, invalid shapes, partial pagination, duplicate natural keys, source-revision drift, stale/unknown freshness, timeout, and transport failure;
- scheduler ownership, overlap protection, source/Monitor write isolation, downstream repair, and committed-cursor evidence;
- source-valid A02 cancel/reject reversal, A03 closure/competing-OT protection, and A05 weigh/move/handoff/closure actions;
- connected routing, Dashboard, conversation, message, multi-user, receipt, and Chat UI evidence; and
- repeatable `npm run validate:phase6-stage5` with reset and baseline restoration.

## Corrected official evidence

- `20260801T134848Z`: 34/34 passed; final baseline restoration passed.
- `20260801T141110Z`: 34/34 passed; final baseline restoration passed.
- Full connected browser review: `20260801T133002Z`; corrected runs revalidated the live mobile Chat list and explicitly reused the unchanged-code full viewport review.
- Durable local artifacts are under `local-data/test-database/evidence/stage5/`.

Earlier green runs are superseded because they did not assert the exact approved clean-case timings. The fixture implementation now asserts A02 minute 20, A03 minute 10, and A05 minute 10.

## Re-run sequence

1. Ensure the isolated MySQL volume has at least 8 GiB free.
2. Run `npm run validate:phase6-stage5`.
3. Run `npm test`.
4. Run `npm run typecheck`.
5. Run `npm run build`.
6. Run `npm run validate:phase5-routing` and `npm run db:test-source:query-plans`.

The Stage 5 command changes only disposable local `test_database` fixtures and uses an EXIT trap to restore and validate the verified baseline.

## Stage 6 handoff

`monitor_sim_*` and the simulator adapter remain in place for Stage 5, as required. Stage 6 may retire them now that all 34 valid tests have connected replacements, subject to a reference audit, rollback-safe migration, and preservation of Stage 5 historical evidence.

Production Aurora, real authentication, failover, production load, deployment, and managed infrastructure remain Phase 10 and are not supported by this evidence.
