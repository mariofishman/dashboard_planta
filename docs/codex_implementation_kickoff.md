# Codex Implementation Kickoff

## Recommended workflow

Use one direct kickoff prompt for Phase 0. Codex should make safe, reversible technical decisions autonomously and present the completed Phase 0 gate in plain language. After Phase 0 is complete and any actual business boundary is approved, use the installed `$microplan-workflow` skill for each bounded implementation unit only when explicitly requested. Do not use `$microplan-workflow` to execute an entire roadmap phase.

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
2. business decisions, credentials, external access, costly commitments, or irreversible decisions that genuinely require my approval;
3. external dependencies already assigned in docs/emusasoft_preimplementation_requests.md.

I am not an experienced programmer. Make safe, reversible technical choices yourself, document the reasons briefly, and validate them. Do not ask me to approve routine implementation details or choose between technologies I cannot reasonably evaluate. Escalate only the decisions described above, explaining their user or business consequences in plain language.

Use the local EmusaSoft database backup for development and Phase 0 query validation. Design and optimize the detection queries, measure them locally, and propose safe polling and database-load limits. Production validation against Aurora remains later integration work. Replica-lag monitoring is not required while using the local backup; retain it only as a production-integration requirement.

Inspect the EmusaSoft authentication contract through the MCP and define a replaceable adapter contract. Use mock authentication locally; real authentication is a Phase 10 integration. Do not infer browser links from GraphQL operations. If EmusaSoft provides no supported frontend-route contract, show ERP identifiers and evidence without an external navigation action.

Monitor must not depend on or connect to emusa-ui. Build its interface with Material UI and the colors, tokens, and design rules in docs/design/.

Do not invent missing production credentials, external access, or unsupported ERP behavior. Use versioned placeholders and contract tests only where external artifacts are genuinely pending.

Treat the EmusaSoft MCP as schema-discovery evidence, not as proof that its drifted catalog is current. Validate every production detection query against the approved current schema and staging replica.

For the technical-kit ADR, select one concrete TypeScript stack for the Monitor API, relational database, ORM, scheduler/query runner, WebSocket layer, Redis integration, testing, and deployment. Explain the decision briefly in plain language, then continue without waiting unless it creates a costly, irreversible, or externally binding commitment.

Implement every unblocked Phase 0 artifact, validate it, update the roadmap/checklist with evidence, and report exactly which exit criteria pass or remain externally blocked. Summarize the result for a non-expert, including what was tested, important risks, and anything that requires outside help. Ask only for a specific unresolved business decision; do not request approval of successful tests or a vague overall gate.
```

## Implementation-unit prompt

After Phase 0 is complete, start each bounded unit with this pattern when the user explicitly requests the microplan workflow:

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
