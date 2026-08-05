# Phase 6 — Source-compatible testing, conversations, and messages

**Role:** Phase 6 status index; the linked Stage 5 recovery and completion plan is the sole Stage 5 execution and evidence authority

**Status:** Complete, accepted, merged, verified, and published — 2026-08-05

**Project sequencing authority:** [`../../../roadmap.md`](../../../roadmap.md)

## Purpose

Complete the local path from realistic A02, A03, and A05 source changes through Monitor's normal read-only polling, incidents, routing, Dashboard, conversations, messages, and accepted Chat UI.

The three prerequisite workstreams are complete within their separate scopes:

- the conversation backend and accepted Chat UI;
- the guarded, resettable local `test_database`; and
- the approved standalone `alertas_fake` Stage 2 laboratory and its 34 valid tests.

Commit `165abc1` remains a preserved pre-recovery checkpoint; its useful implementation was corrected and revalidated through Recovery 1–6. Step 8B is complete and approved. On 2026-08-05, all 34 Step 8C case bodies executed successfully across 37 lanes and the source was restored, but the final evidence ledger failed validation. The product manager explicitly accepted that limitation, waived Step 9's two additional complete runs, and completed the Step 10 evidence review. Step 11 completed at `f142ae6`. The reviewed Stage 5 branch then merged without conflicts into `main` at `6aa83da`, focused post-merge checks passed, and the completion record was published at `e05684b`. Stage 6 retirement commit `af8ce41` was pushed, merged without conflicts into `main` at `504ee50`, and passed proportional post-merge database, API, typecheck, build, and diff validation. Phase 6 is complete without changing the accepted Stage 5 evidence limitations.

The three workstreams coexist on published `main` through the completed Phase 6 delivery. Stage 4 remains complete only within its documented separate-source write, read-only polling, and A02/A03/A05 incident-lifecycle scope. It originally connected that correct boundary behind the older scenario-screen composition. Recovery 3 later connected the approved tabbed V2 laboratory on `/dev/scenarios`, and Recovery 6 produced the passing replacement Step 8.2–8.7 evidence. The earlier browser run remains diagnostic history and is invalid for acceptance.

## Stage plan

| Stage | Status | Work | Exit condition |
| --- | --- | --- | --- |
| 1 — Stabilize requirements | Complete — 2026-07-29 | Audit A02, A03, A05 and define the redesigned laboratory and connected boundary. | Requirements and V2 specification recorded. |
| 2 — Approve the standalone laboratory | Complete — 2026-07-31 | Review the V2 laboratory one test at a time. | All 34 valid tests pass and are user-approved; invalid/deferred recurrence cases remain explicitly excluded. |
| 3 — Inspect the `test_database` handoff | Complete — 2026-07-31 | Verified the merged runtime, reset safeguards, readiness contract, credentials, Node driver access, and A02/A03/A05 source mappings. | **Ready with exact gaps.** The evidence, approved mappings, corrections, and Stage 4 gaps are recorded in the Stage 3 handoff. |
| 4 — Connect the testing boundary | Complete — 2026-07-31 | Reconciled contracts and fixtures; connected `alertas_fake` writes and Monitor read-only adapters through the normal scheduler; connected the older `/dev/scenarios` composition to `test_database`. | Source actions changed only `test_database`; complete polling opened, deduplicated, and resolved the correct Monitor incidents. This did not connect or accept the approved V2 interface. |
| 5 — Run connected acceptance | **Complete and published — 2026-08-05** | Step 8B is approved; all 34 Step 8C cases executed; the final ledger limitation and Step 9 waiver are explicitly accepted; Steps 10–12 are complete. | Complete — merge `6aa83da` passed focused post-merge checks and `origin/main` contains the final record at `e05684b`. |
| 6 — Finalize Phase 6 | **Complete and published — 2026-08-05** | Audited the accepted Stage 5 result. Retired the Monitor-owned source simulator, runtime fixture and backup sources, fake source tables and registrations, hardcoded Phase 4 incidents, and tests that manufactured EmusaSoft facts inside Monitor. | Complete — merge `504ee50` passed proportional post-merge validation and the product manager's final acceptance preserves the recorded Stage 5 limitations. |

## Immediate next action — Phase 7

Begin Phase 7 from the published Phase 6 result. Phase 7 must continue using the Laboratory → `test_database` → Monitor polling boundary and must not restore a Monitor-owned operational source simulator.

Local retirement evidence: the migrated Monitor database contains zero `monitor_sim_*` tables, zero fixture/simulator/backup query registrations, three `test_database` query registrations, and no hardcoded incidents or conversations. Database tests pass 3/3, focused API server tests pass 12/12, detection tests pass 15/15 including six connected source-action cases, workspace typecheck and build pass, and `git diff --check` passes. The complete 34-case Stage 5 suite was not rerun.

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

Stage 5 supplied that replacement acceptance. Stage 6 therefore removes the synthetic source boundary without reopening or overstating the accepted Stage 5 evidence limitations. Phase 10 remains responsible for real EmusaSoft authentication, Aurora access, production-query validation, and deployment integration.

**Exit decision — 2026-08-05:** The product manager confirmed that no further product questions remain and directed Phase 6 to be marked complete. The local exit gate is accepted with the already recorded Stage 5 ledger limitation and Step 9 waiver unchanged. Git delivery remains a separate workflow action and does not reopen the product decision.
