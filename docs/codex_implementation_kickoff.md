# Codex Implementation Kickoff

## Recommended workflow

Use one direct kickoff prompt for Phase 0. After the Phase 0 ADRs and contracts are approved, use the installed `$microplan-workflow` skill for each bounded implementation unit. Do not ask one task to implement the entire roadmap without phase gates; the external contracts and architectural approvals require explicit evidence.

## Phase 0 kickoff prompt

Copy this prompt into a new Codex task opened at the repository root:

```text
Start the Monitor project by executing Phase 0 of the approved roadmap.

Before acting, read these current authoritative files completely:
- AGENTS.md
- README.md
- docs/product_definition.md
- docs/monitor_architecture_and_production_roadmap.md
- docs/emusasoft_integration_architecture.md
- docs/emusasoft_preimplementation_requests.md
- docs/alert_catalog.md
- docs/ux_ui_decisions.md
- docs/design/design.md
- docs/design/brand_guidelines.md

Treat docs/archive/, prototype/dashboard/, prototype/alert-catalog/v1 through v10, and prototype/chat-list-review/01 through 04 as deprecated historical material with no product authority.

Use the EmusaSoft MCP for current ERP evidence. First load EMUSASOFT_MCP_TOKEN from the repository-root .env without printing or exposing it. Follow catalog discovery order before querying. Never run or design Monitor code that writes to EmusaSoft.

Execute only Phase 0. Create a tracked checklist mapped to every Phase 0 deliverable and exit criterion. Separate:
1. Monitor-owned work that can be completed now;
2. decisions that require my approval;
3. external dependencies already assigned in docs/emusasoft_preimplementation_requests.md.

Do not invent missing detection queries, natural keys, read-only access, replica-freshness, load-budget, authentication, identity, deep-link, extrusion-snapshot, or emusa-ui contracts. Use versioned placeholders and contract tests where external artifacts are pending.

Treat the EmusaSoft MCP as schema-discovery evidence, not as proof that its drifted catalog is current. Validate every production detection query against the approved current schema and staging replica.

For the technical-kit ADR, recommend one concrete TypeScript stack for the Monitor API, relational database, ORM, scheduler/query runner, WebSocket layer, Redis integration, testing, and deployment. Explain only material tradeoffs and stop for my approval before scaffolding the application.

Once I approve the ADRs, implement every unblocked Phase 0 artifact, validate it, update the roadmap/checklist with evidence, and report exactly which exit criteria pass or remain externally blocked. Do not begin Phase 1 until I approve the Phase 0 gate.
```

## Implementation-unit prompt

After Phase 0 is approved, start each bounded unit with this pattern:

```text
Use $microplan-workflow to implement the next approved unit from Phase [number] of docs/monitor_architecture_and_production_roadmap.md.

Unit: [one specific adapter, schema, detector, endpoint, UI surface, or test suite]

Read the authoritative product, architecture, alert, UX/UI, and design documents that govern this unit. Confirm its roadmap exit criterion, dependencies, data boundary, and tests. Stop for approval of the micro-plan before implementation. After approval, implement, review, test, and report the evidence. Do not expand into the next unit automatically.
```

## Operating rules

- One Codex task should own one phase or one clearly bounded implementation unit.
- Phase gates require tests and evidence, not a statement that work is complete.
- Commit after a coherent reviewed unit passes its checks.
- Keep all user-visible labels in Spanish and all documentation prose in English.
- Preserve Monitor's independent, read-only relationship with EmusaSoft.
- Update current documents when an approved decision changes; never restore authority to deprecated documents.
