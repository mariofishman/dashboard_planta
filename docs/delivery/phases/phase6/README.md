# Phase 6 — Source-compatible testing, conversations, and messages

**Role:** Phase 6 status index; the linked Stage 5 recovery and completion plan is the sole Stage 5 execution and evidence authority

**Status:** In progress; Stages 1–4 complete; Stage 5 recovery work is current; Stage 6 is pending

**Project sequencing authority:** [`../../../roadmap.md`](../../../roadmap.md)

## Purpose

Complete the local path from realistic A02, A03, and A05 source changes through Monitor's normal read-only polling, incidents, routing, Dashboard, conversations, messages, and accepted Chat UI.

The three prerequisite workstreams are complete within their separate scopes:

- the conversation backend and accepted Chat UI;
- the guarded, resettable local `test_database`; and
- the approved standalone `alertas_fake` Stage 2 laboratory and its 34 valid tests.

They have not yet passed the complete Stage 5 connected-acceptance gate. Commit `165abc1` is a preserved implementation checkpoint whose useful code and evidence are being corrected and revalidated. Phase 7 remains blocked until Stage 5 and Stage 6 complete.

The three workstreams coexist on the Stage 5 branch. Stage 4 remains complete only within its documented separate-source write, read-only polling, and A02/A03/A05 incident-lifecycle scope. It connected that correct boundary behind the older scenario-screen composition; it did not port or accept the approved tabbed V2 laboratory on `/dev/scenarios`. The earlier Step 8.2–8.7 browser run therefore remains diagnostic history and is invalid for acceptance.

## Stage plan

| Stage | Status | Work | Exit condition |
| --- | --- | --- | --- |
| 1 — Stabilize requirements | Complete — 2026-07-29 | Audit A02, A03, A05 and define the redesigned laboratory and connected boundary. | Requirements and V2 specification recorded. |
| 2 — Approve the standalone laboratory | Complete — 2026-07-31 | Review the V2 laboratory one test at a time. | All 34 valid tests pass and are user-approved; invalid/deferred recurrence cases remain explicitly excluded. |
| 3 — Inspect the `test_database` handoff | Complete — 2026-07-31 | Verified the merged runtime, reset safeguards, readiness contract, credentials, Node driver access, and A02/A03/A05 source mappings. | **Ready with exact gaps.** The evidence, approved mappings, corrections, and Stage 4 gaps are recorded in the Stage 3 handoff. |
| 4 — Connect the testing boundary | Complete — 2026-07-31 | Reconciled contracts and fixtures; connected `alertas_fake` writes and Monitor read-only adapters through the normal scheduler; connected the older `/dev/scenarios` composition to `test_database`. | Source actions changed only `test_database`; complete polling opened, deduplicated, and resolved the correct Monitor incidents. This did not connect or accept the approved V2 interface. |
| 5 — Run connected acceptance | **Recovery work in progress** | Follow the single [Stage 5 recovery and completion plan](./stage5_corrective_execution_plan.md). | The plan's Stage 5 exit assertions pass and the user accepts the evidence. |
| 6 — Finalize Phase 6 | Pending | Audit the accepted Stage 5 evidence, reconcile authority and implementation, document Phase 10 exclusions, and decide whether the old operational source simulator can be retired. | The Phase 6 exit gate passes and the user accepts the integrated local result. |

## Immediate next action — Stage 5 recovery

Use the single [Stage 5 recovery and completion plan](./stage5_corrective_execution_plan.md). It owns the replacement of the older connected screen with the approved V2 laboratory, the new Step 8.2–8.7 evidence run, and the return to Steps 8B–12. Prior Step 8.2–8.7 artifacts remain ignored diagnostic history and cannot be counted as acceptance evidence.

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
