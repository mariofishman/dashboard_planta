# Phase 6 — Source-compatible testing, conversations, and messages

**Role:** Current Phase 6 execution and stage authority

**Status:** In progress; Stages 1–2 complete; Stage 3 is next

**Project sequencing authority:** [`../../../roadmap.md`](../../../roadmap.md)

## Purpose

Complete the local path from realistic A02, A03, and A05 source changes through Monitor's normal read-only polling, incidents, routing, Dashboard, conversations, messages, and accepted Chat UI.

The three prerequisite workstreams are complete within their separate scopes:

- the conversation backend and accepted Chat UI;
- the guarded, resettable local `test_database`; and
- the approved standalone `alertas_fake` Stage 2 laboratory and its 34 valid tests.

They have not yet passed as one connected system. Phase 7 remains blocked until the Phase 6 exit gate passes.

The three workstreams now coexist on `main`; Stage 3 begins from this combined baseline rather than from another parallel branch.

## Stage plan

| Stage | Status | Work | Exit condition |
| --- | --- | --- | --- |
| 1 — Stabilize requirements | Complete — 2026-07-29 | Audit A02, A03, A05 and define the redesigned laboratory and connected boundary. | Requirements and V2 specification recorded. |
| 2 — Approve the standalone laboratory | Complete — 2026-07-31 | Review the V2 laboratory one test at a time. | All 34 valid tests pass and are user-approved; invalid/deferred recurrence cases remain explicitly excluded. |
| 3 — Inspect the `test_database` handoff | **Next** | Verify the merged runtime, reset safeguards, readiness contract, credentials, driver access, and A02/A03/A05 source mappings. | Classify the handoff as ready, ready with exact gaps, or unsafe; record every approved mapping and blocker. |
| 4 — Connect the testing boundary | Not started | Reconcile contracts and fixtures; connect `alertas_fake` writes and Monitor read-only adapters through the normal scheduler; implement the accepted laboratory in `/dev/scenarios`. | Source actions change only `test_database`; complete polling produces the correct Monitor-owned state. |
| 5 — Run connected acceptance | Not started | Execute business lifecycles and technical failure cases through routing, Dashboard, conversations, messages, and Chat UI. | A02, A03, and A05 satisfy the connected acceptance matrix without duplicate or unsafe state changes. |
| 6 — Finalize Phase 6 | Pending | Reconcile authority and implementation, document Phase 10 exclusions, complete the final audit, and retire the old operational source simulator. | The Phase 6 exit gate passes and the user accepts the integrated local result. |

## Immediate next action — Stage 3

Inspect the merged `test_database` handoff and record whether it is ready, ready with exact gaps, or unsafe for Stage 4. The database record and laboratory specification below define the detailed inspection and mapping requirements.

## Supporting specifications and evidence

These documents support execution but do not define current project or stage status:

- [`alertas_fake_audit_and_redesign_v2.md`](./alertas_fake_audit_and_redesign_v2.md) — accepted A02/A03/A05 laboratory specification and preserved audit findings.
- [`alertas_fake_v2_edge_case_test_report_v2.md`](./alertas_fake_v2_edge_case_test_report_v2.md) — Stage 2 standalone evidence.
- [`test_database.md`](./test_database.md) — local MySQL safety, reset, commands, and validation evidence.
- [`../../../product/product_definition.md`](../../../product/product_definition.md) — product boundaries and conversation policy.
- [`../../../product/alert_catalog.md`](../../../product/alert_catalog.md) — alert rules and routing.
- [`../../../product/ux_ui_decisions.md`](../../../product/ux_ui_decisions.md) — accepted screen and interaction decisions.
- [`../../../architecture/system_architecture.md`](../../../architecture/system_architecture.md) — polling, lifecycle, authorization, persistence, delivery, ownership, and source boundary.
- [`../../../integrations/emusasoft/integration_register.md`](../../../integrations/emusasoft/integration_register.md) — external Phase 10 dependencies.

Completed and superseded Phase 6 plans, audits, and earlier reports are preserved under [`../../../../archive/docs/implementation/`](../../../../archive/docs/implementation/) as historical evidence only.

## Phase 6 exit gate

Phase 6 completes only when the separate source boundary, deterministic reset, A02/A03/A05 lifecycle, routing, Dashboard, conversations, messages, and accepted Chat UI pass together through automated and manual evidence. The synthetic operational source boundary may be removed only after that replacement acceptance.
