# Phase 6 — Source-compatible testing, conversations, and messages

**Role:** Current Phase 6 execution and stage authority

**Status:** In progress; Stages 1–5 complete; Stage 6 is next

**Project sequencing authority:** [`../../../roadmap.md`](../../../roadmap.md)

## Purpose

Complete the local path from realistic A02, A03, and A05 source changes through Monitor's normal read-only polling, incidents, routing, Dashboard, conversations, messages, and accepted Chat UI.

The three prerequisite workstreams are complete within their separate scopes:

- the conversation backend and accepted Chat UI;
- the guarded, resettable local `test_database`; and
- the approved standalone `alertas_fake` Stage 2 laboratory and its 34 valid tests.

They have now passed together through Stage 5 connected acceptance. Phase 7 remains blocked until Stage 6 completes the final Phase 6 audit and retirement work.

The three workstreams now coexist on `main`. Stage 4 connected the separate source boundary; Stage 5 validated the exact 34-test downstream path twice.

## Stage plan

| Stage | Status | Work | Exit condition |
| --- | --- | --- | --- |
| 1 — Stabilize requirements | Complete — 2026-07-29 | Audit A02, A03, A05 and define the redesigned laboratory and connected boundary. | Requirements and V2 specification recorded. |
| 2 — Approve the standalone laboratory | Complete — 2026-07-31 | Review the V2 laboratory one test at a time. | All 34 valid tests pass and are user-approved; invalid/deferred recurrence cases remain explicitly excluded. |
| 3 — Inspect the `test_database` handoff | Complete — 2026-07-31 | Verified the merged runtime, reset safeguards, readiness contract, credentials, Node driver access, and A02/A03/A05 source mappings. | **Ready with exact gaps.** The evidence, approved mappings, corrections, and Stage 4 gaps are recorded in the Stage 3 handoff. |
| 4 — Connect the testing boundary | Complete — 2026-07-31 | Reconciled contracts and fixtures; connected `alertas_fake` writes and Monitor read-only adapters through the normal scheduler; connected `/dev/scenarios` to `test_database`. | Source actions changed only `test_database`; complete polling opened, deduplicated, and resolved the correct Monitor incidents. |
| 5 — Run connected acceptance | Complete — 2026-08-01 | Executed all 34 valid business and technical cases twice through routing, Dashboard, conversations, messages, and Chat UI. | A02, A03, and A05 satisfied the connected matrix without duplicate or unsafe state changes. |
| 6 — Finalize Phase 6 | **Next** | Reconcile authority and implementation, document Phase 10 exclusions, complete the final audit, and retire the old operational source simulator. | The Phase 6 exit gate passes and the user accepts the integrated local result. |

## Immediate next action — Stage 6

Use the [Stage 5 handoff](./test_database_stage5_handoff.md) and [connected acceptance report](./stage5_connected_acceptance_report.md) to perform the final authority audit and retire the simulator through a rollback-safe migration. Keep Aurora behavior, production authorization, production plans, load, and deployment in Phase 10.

## Supporting specifications and evidence

These documents support execution but do not define current project or stage status:

- [`alertas_fake_audit_and_redesign_v2.md`](./alertas_fake_audit_and_redesign_v2.md) — accepted A02/A03/A05 laboratory specification and preserved audit findings.
- [`alertas_fake_v2_edge_case_test_report_v2.md`](./alertas_fake_v2_edge_case_test_report_v2.md) — Stage 2 standalone evidence.
- [`test_database.md`](./test_database.md) — local MySQL safety, reset, commands, and validation evidence.
- [`test_database_stage3_handoff.md`](./test_database_stage3_handoff.md) — final Stage 3 classification, driver/access evidence, approved source mappings, corrections, and exact Stage 4 gaps.
- [`test_database_stage4_handoff.md`](./test_database_stage4_handoff.md) — connected source-boundary implementation, safeguards, and lifecycle evidence.
- [`stage5_connected_acceptance_inventory.md`](./stage5_connected_acceptance_inventory.md) — exact approved 34-test connected mapping.
- [`stage5_connected_acceptance_report.md`](./stage5_connected_acceptance_report.md) — corrected two-pass connected evidence and Stage 6 retirement decision.
- [`test_database_stage5_handoff.md`](./test_database_stage5_handoff.md) — repeatable command, evidence locations, exclusions, and Stage 6 handoff.
- [`../../../product/product_definition.md`](../../../product/product_definition.md) — product boundaries and conversation policy.
- [`../../../product/alert_catalog.md`](../../../product/alert_catalog.md) — alert rules and routing.
- [`../../../product/ux_ui_decisions.md`](../../../product/ux_ui_decisions.md) — accepted screen and interaction decisions.
- [`../../../architecture/system_architecture.md`](../../../architecture/system_architecture.md) — polling, lifecycle, authorization, persistence, delivery, ownership, and source boundary.
- [`../../../integrations/emusasoft/integration_register.md`](../../../integrations/emusasoft/integration_register.md) — external Phase 10 dependencies.

Completed and superseded Phase 6 plans, audits, and earlier reports are preserved under [`../../../../archive/docs/implementation/`](../../../../archive/docs/implementation/) as historical evidence only.

## Phase 6 exit gate

Phase 6 completes only when the separate source boundary, deterministic reset, A02/A03/A05 lifecycle, routing, Dashboard, conversations, messages, and accepted Chat UI pass together through automated and manual evidence. The synthetic operational source boundary may be removed only after that replacement acceptance.
