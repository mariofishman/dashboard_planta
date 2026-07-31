# Monitor Documentation

All current documentation is written in English. User-visible product labels remain in Spanish.

## Authority

| Subject | Current authority |
| --- | --- |
| Product purpose, boundaries, and four screens | [`product/product_definition.md`](product/product_definition.md) |
| Alert inventory, evidence, resolution, and routing | [`product/alert_catalog.md`](product/alert_catalog.md) |
| Screen behavior and UX/UI | [`product/ux_ui_decisions.md`](product/ux_ui_decisions.md) |
| Stable system and EmusaSoft boundary | [`architecture/system_architecture.md`](architecture/system_architecture.md) |
| Current phases and sequencing | [`roadmap.md`](roadmap.md) |
| External EmusaSoft and MCP work | [`integrations/emusasoft/integration_register.md`](integrations/emusasoft/integration_register.md) |
| Visual usage rules | [`design/design.md`](design/design.md) |
| Design values | [`design/design-system/tokens.json`](design/design-system/tokens.json) |

## Progress hierarchy

Only two documents control delivery progress:

1. [`roadmap.md`](roadmap.md) records the project phases, their exit gates, and the path through Phase 10.
2. The README for the active phase records its ordered stages, current stage, immediate next action, and phase exit gate. The current execution authority is [`delivery/phases/phase6/README.md`](delivery/phases/phase6/README.md).

Subject authorities define what must be true; they do not report implementation progress. Specifications explain how one surface or subsystem should behave. Test reports, audits, and validation records are evidence and cannot advance a phase by themselves.

## Supporting material

- `architecture/decisions/` — accepted architecture decision records.
- `architecture/contracts/` — active human-readable integration contracts.
- `delivery/phases/` — one execution README per phase plus supporting specifications and dated evidence. Only the active phase README defines current stage status; the roadmap remains the project-level status authority.
- `delivery/guides/database_operations.md` — safe local PGlite startup, migration, backup, restore, and failure recovery.
- `integrations/emusasoft/evidence/` — dated audit evidence supporting the integration register.
- `design/brand_guidelines.md` — brand voice and identity.

Historical material lives under [`../archive/`](../archive/) and cannot override current documentation.
