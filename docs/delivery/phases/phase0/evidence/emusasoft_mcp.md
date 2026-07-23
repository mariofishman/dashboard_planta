# EmusaSoft MCP evidence

**Status:** Phase 0 evidence snapshot, refreshed 2026-07-23

- Project `.env` was loaded and the MCP token was verified as non-empty without printing it.
- Catalog discovery order was followed: catalog info, search, describe, example, validate, then read-only execution.
- Staging catalog v5 was generated 2026-07-23 and reports 1,065 GraphQL operations, 361 entities, 400 cataloged SQL tables, 121 frontend routes, 1,688 GraphQL types, and 1,065 examples.
- `getUserContext` remains a zero-argument query returning stable `sysUserId`, role information, `sysUser`, and `requiredPingActive`.
- GraphQL validation now works: a valid identity query passed and an invalid field failed with a source location against schema version 5.
- A02 and A05 source surfaces remain discoverable, and their SQL mappings still validate against the protected 2026-07-23 staging backup.
- The closure-snapshot table, entity, GraphQL query, recipe snapshot, and active, closed, and reservation work-order routes are discoverable.
- A live structural drift check found no type or field-name drift between catalog v5 and the live GraphQL schema at audit time.
- `erp://integration/read-capability` defines MCP live reads as bearer-authenticated queries only; mutations and subscriptions are rejected.
- MCP examples are explicitly structural skeletons, not representative or real ERP data.
- Catalog evidence is discovery evidence, not proof of Aurora access, load limits, authentication lifecycle, or business-field semantics.
- No write was attempted.

Current evidence and remaining items are maintained in `docs/integrations/emusasoft/integration_register.md`.
