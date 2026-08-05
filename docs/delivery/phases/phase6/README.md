# Phase 6 — Source-compatible testing, conversations, and messages

**Role:** Phase 6 status index; the linked Stage 5 recovery and completion plan is the sole Stage 5 execution and evidence authority

**Status:** In progress; Stages 1–4 complete; Stage 5 is complete and merged into local `main` at `6aa83da`, with its final-ledger limitation and Step 9 waiver recorded; `origin/main` publication awaits separate authorization; Stage 6 is next

**Project sequencing authority:** [`../../../roadmap.md`](../../../roadmap.md)

## Purpose

Complete the local path from realistic A02, A03, and A05 source changes through Monitor's normal read-only polling, incidents, routing, Dashboard, conversations, messages, and accepted Chat UI.

The three prerequisite workstreams are complete within their separate scopes:

- the conversation backend and accepted Chat UI;
- the guarded, resettable local `test_database`; and
- the approved standalone `alertas_fake` Stage 2 laboratory and its 34 valid tests.

Commit `165abc1` remains a preserved pre-recovery checkpoint; its useful implementation was corrected and revalidated through Recovery 1–6. Step 8B is complete and approved. On 2026-08-05, all 34 Step 8C case bodies executed successfully across 37 lanes and the source was restored, but the final evidence ledger failed validation. The product manager explicitly accepted that limitation, waived Step 9's two additional complete runs, and completed the Step 10 evidence review. Step 11 completed at `f142ae6`. The reviewed branch then merged without conflicts into local `main` at `6aa83da`, and focused post-merge checks passed. Stage 5 is complete without claiming that the missing evidence passed. Publishing `main` remains separately gated, and Stage 6 is next.

The three workstreams now coexist on local `main` through the Stage 5 merge. Stage 4 remains complete only within its documented separate-source write, read-only polling, and A02/A03/A05 incident-lifecycle scope. It originally connected that correct boundary behind the older scenario-screen composition. Recovery 3 later connected the approved tabbed V2 laboratory on `/dev/scenarios`, and Recovery 6 produced the passing replacement Step 8.2–8.7 evidence. The earlier browser run remains diagnostic history and is invalid for acceptance.

## Stage plan

| Stage | Status | Work | Exit condition |
| --- | --- | --- | --- |
| 1 — Stabilize requirements | Complete — 2026-07-29 | Audit A02, A03, A05 and define the redesigned laboratory and connected boundary. | Requirements and V2 specification recorded. |
| 2 — Approve the standalone laboratory | Complete — 2026-07-31 | Review the V2 laboratory one test at a time. | All 34 valid tests pass and are user-approved; invalid/deferred recurrence cases remain explicitly excluded. |
| 3 — Inspect the `test_database` handoff | Complete — 2026-07-31 | Verified the merged runtime, reset safeguards, readiness contract, credentials, Node driver access, and A02/A03/A05 source mappings. | **Ready with exact gaps.** The evidence, approved mappings, corrections, and Stage 4 gaps are recorded in the Stage 3 handoff. |
| 4 — Connect the testing boundary | Complete — 2026-07-31 | Reconciled contracts and fixtures; connected `alertas_fake` writes and Monitor read-only adapters through the normal scheduler; connected the older `/dev/scenarios` composition to `test_database`. | Source actions changed only `test_database`; complete polling opened, deduplicated, and resolved the correct Monitor incidents. This did not connect or accept the approved V2 interface. |
| 5 — Run connected acceptance | **Complete and merged locally — 2026-08-05** | Step 8B is approved; all 34 Step 8C cases executed; the final ledger limitation and Step 9 waiver are explicitly accepted; Steps 10–12 are complete locally. | Complete — merge `6aa83da` passed focused post-merge checks; remote publication remains separately gated. |
| 6 — Finalize Phase 6 | Pending | Audit the accepted Stage 5 evidence, reconcile authority and implementation, document Phase 10 exclusions, and decide whether the old operational source simulator can be retired. | The Phase 6 exit gate passes and the user accepts the integrated local result. |

## Immediate next action — Publish `main`, then Stage 6

Obtain separate authorization before pushing local `main` to `origin/main`. After publication, Stage 6 audits the accepted Stage 5 result, reconciles authority and implementation, documents Phase 10 exclusions, and decides which old simulator components can be retired. Continue to preserve the accepted invalid-ledger and repeatability limitations accurately.

## Supporting specifications and evidence

These documents support execution but do not define current project or stage status:

- [`alertas_fake_audit_and_redesign_v2.md`](./alertas_fake_audit_and_redesign_v2.md) — accepted A02/A03/A05 laboratory specification and preserved audit findings.
- [`alertas_fake_v2_edge_case_test_report_v2.md`](./alertas_fake_v2_edge_case_test_report_v2.md) — Stage 2 standalone evidence.
- [`test_database.md`](./test_database.md) — local MySQL safety, reset, commands, and validation evidence.
- [`test_database_stage3_handoff.md`](./test_database_stage3_handoff.md) — final Stage 3 classification, driver/access evidence, approved source mappings, corrections, and exact Stage 4 gaps.
- [`test_database_stage4_handoff.md`](./test_database_stage4_handoff.md) — connected source-boundary implementation, safeguards, and lifecycle evidence.
- [`stage5_corrective_execution_plan.md`](./stage5_corrective_execution_plan.md) — the only current Stage 5 recovery, execution, and evidence authority.
- [`../../../product/product_definition.md`](../../../product/product_definition.md) — product boundaries and conversation policy.
- [`../../../product/alert_catalog.md`](../../../product/alert_catalog.md) — alert rules and routing.
- [`../../../product/ux_ui_decisions.md`](../../../product/ux_ui_decisions.md) — accepted screen and interaction decisions.
- [`../../../architecture/system_architecture.md`](../../../architecture/system_architecture.md) — polling, lifecycle, authorization, persistence, delivery, ownership, and source boundary.
- [`../../../integrations/emusasoft/integration_register.md`](../../../integrations/emusasoft/integration_register.md) — external Phase 10 dependencies.

Completed and superseded Phase 6 plans, audits, and earlier reports are preserved under [`../../../../archive/docs/implementation/`](../../../../archive/docs/implementation/) as historical evidence only.

The historical checkpoint inventory, completion report, and handoff are preserved as [`stage5_connected_acceptance_inventory_checkpoint_165abc1.md`](../../../../archive/docs/implementation/stage5_connected_acceptance_inventory_checkpoint_165abc1.md), [`stage5_connected_acceptance_report_checkpoint_165abc1.md`](../../../../archive/docs/implementation/stage5_connected_acceptance_report_checkpoint_165abc1.md), and [`test_database_stage5_handoff_checkpoint_165abc1.md`](../../../../archive/docs/implementation/test_database_stage5_handoff_checkpoint_165abc1.md). Their completion claims are not accepted current authority.

The superseded Stage 5 plan is preserved as [`stage5_corrective_execution_plan_v1.md`](../../../../archive/docs/implementation/stage5_corrective_execution_plan_v1.md). It is historical evidence only and has no current authority.

## Phase 6 exit gate

Phase 6 completes only when the separate source boundary, deterministic reset, A02/A03/A05 lifecycle, routing, Dashboard, conversations, messages, and accepted Chat UI pass together through automated and manual evidence. The synthetic operational source boundary may be removed only after that replacement acceptance.
