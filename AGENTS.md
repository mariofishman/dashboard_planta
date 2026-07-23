# EmusaSoft MCP

- Whenever the user asks to connect, test, or use the EmusaSoft MCP, first load `EMUSASOFT_MCP_TOKEN` from the project-root `.env` file.
- Use `/Users/mariofishman/projects/dashboard_planta/.env` as the canonical credential source.
- Never print, log, quote, commit, or expose the token value.
- Verify only that the variable exists and is non-empty before connecting.
- If the native MCP connection cannot access the project `.env`, perform the authenticated MCP request through a process that explicitly loads the `.env` file.

# Approval and delivery workflow

- Do not ask the user to approve routine, reversible implementation choices or successful test results.
- Ask for approval only for product or business boundaries, paid commitments, credentials or external access, irreversible actions, or externally binding decisions. Explain the practical consequence in plain language.
- Record an explicit user decision in the authoritative project documents and do not ask for a second vague “overall” approval of the same decision.
- Phases 1 through 9 are local-first and use mock identities, synthetic fixtures, and protected local/sample databases. Real EmusaSoft authentication, Aurora access, production-query validation, and deployment integration belong to Phase 10.

# Atlas research

- Use the `$atlas` skill for UI inspiration research.
- Store the shared Atlas application and every research instance under the project-root `atlases/` directory.
- Add new search rounds to the same instance when the research objective is unchanged. Create a new instance when the screen, feature, or research objective changes materially.
- Use the Atlas lobby to create, open, rename, close as complete, reopen, or archive research. Do not delete an instance without explicit permission.
- Treat each instance's `review-state.json` as the durable source for reference feedback, predefined-region notes, custom regions, and screen position; do not rely on browser-only storage or task-local browser comments.
- Preserve later research rounds and their images when migrating or reconciling an Atlas. Verify saved annotations and numbered markers after a reload and in a separate browser session.

# Monitor interface density

- Before any Monitor UI design, implementation, or review, read completely and follow this active authority set: `docs/product/product_definition.md`, `docs/product/ux_ui_decisions.md`, `docs/design/design.md`, `docs/design/brand_guidelines.md`, `docs/design/design-system/tokens.json`, `docs/design/design-system/tokens.css`, and `.interface-design/system.md`.
- Before styling or changing a component, inspect `packages/design-system/src/index.ts` and reuse its shared Material UI defaults. Before changing the dashboard, also inspect the current implementation in `apps/web/src/App.tsx` rather than an older static prototype.
- Treat the active authority set's compact text, control-height, padding, radius, dialog, composition, responsive, and interaction measurements as binding. Do not fall back to MUI default sizing or introduce a private component scale.
- Dashboard V2 was accepted as a good first version on 2026-07-22. Its completed design record is archived at `archive/docs/design/dashboard_v2_design_handoff.md`; it preserves research and rejected alternatives but has no current design authority. New decisions belong in the active authority set above rather than in the archive.
