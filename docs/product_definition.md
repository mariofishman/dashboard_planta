# Monitor Product Definition

**Status:** Canonical current-state summary
**Last consolidated:** 2026-07-19

This document is the primary entry point for the current Monitor product definition. Historical discovery and exploratory prototypes must not override it. Detailed documents remain authoritative only within the domains listed below.

## Product purpose

Monitor detects, explains, communicates, and analyzes operational alerts derived from factory activity recorded in EmusaSoft. It is not only a dashboard: its compact Dashboard screen reports errors, alerts, and other factory conditions that require attention, while its chat and responsibility screens support collaboration and deterministic routing. Monitor does not replace EmusaSoft's production, inventory, weighing, or correction workflows.

## Current product screens

Monitor has four main screens:

1. **Dashboard** — current and historical alert analysis, filters, reports, and drill-down. Current prototype: `prototype/chat-list-review/dashboard.html`.
2. **Chat list** — conversations in which the current user participates. Current prototype: `prototype/chat-list-review/chat-list-final.html`.
3. **Chat detail** — messages, replies, attachments, and structured alert objects. Current prototype: `prototype/chat-list-review/chat-detail.html`.
4. **Operational Responsibility Roster** — assigns people to standardized operational positions by operation, machine, shift, and effective date. It is required for deterministic routing but remains conceptual and has no approved prototype.

The earlier dashboard-only product direction is superseded. Technical implementation phases are sequencing tools, not separate product releases.

## System boundary

- EmusaSoft remains the operational system of record.
- Monitor is an independent system with its own repository, service, database, deployment, migrations, incidents, evidence, conversations, messages, cursors, and audit history.
- Monitor consumes EmusaSoft events through SSE, reads EmusaSoft data with read-only access, and uses its own WebSockets for clients.
- Monitor never writes to the EmusaSoft database.
- Monitor does not create, submit, approve, track, or apply adjustment requests.
- Incidents closed without resolution remain available through a read-only evidence view. Any later adjustment belongs entirely to EmusaSoft.

## Alert and routing model

- `docs/alert_catalog.md` defines every approved alert code, detection rule, evidence requirement, resolution, and routing rule.
- Each alert code may define its own descriptive label. Labels are presentation text, not a shared incident-state taxonomy.
- Incident lifecycle is separate from the alert label and contains exactly three user-visible states: open, resolved, and closed without resolution. Suppression and invalidation are internal evaluation dispositions, not incident states.
- Alert recipients are selected deterministically from the alert code and reason.
- The Operational Responsibility Roster resolves standardized positions to actual people. An LLM never selects operational recipients.

## Documentation authority

If documents disagree, use this order within the relevant domain:

1. **Current product definition:** this document.
2. **Alert logic and routing:** `docs/alert_catalog.md`.
3. **Screen behavior and UX/UI:** `docs/ux_ui_decisions.md`.
4. **Architecture and engineering plan:** `docs/monitor_architecture_and_production_roadmap.md`.
5. **Visual system and brand:** `docs/design/design.md`, `docs/design/brand_guidelines.md`, and `docs/design/design-system/`.
6. **Repository navigation:** `README.md`, which contains no product authority.

`docs/emusasoft_architecture_decisions.md` records confirmed integration inputs from the EmusaSoft architect. `AGENTS.md` contains tooling instructions rather than product requirements.

## Current product prototypes

- `prototype/chat-list-review/dashboard.html`
- `prototype/chat-list-review/chat-list-final.html`
- `prototype/chat-list-review/chat-detail.html`

The design system and the three currently prototyped product screens must continue improving as part of the engineering roadmap. The fourth screen, the Operational Responsibility Roster, must be designed and validated before implementation.

## Current documentation-review interface

- `prototype/alert-catalog/final/index.html` is the approved browser publication of the alert catalog. It is not a Monitor product screen.

## Deprecated historical material

The following files remain only for history or inspiration and have no current product authority:

- `docs/archive/project_context.md`;
- `docs/archive/dashboard_rationale.md`;
- `docs/archive/discovery.md`;
- `prototype/dashboard/`;
- `prototype/alert-catalog/v1/` through `v10/`; and
- `prototype/chat-list-review/01-familiar.html` through `04-pinned-focus.html`.

## Current open decisions

- Design the Operational Responsibility Roster screen, workflow, permissions, conflict handling, and audit presentation.
- Complete the concrete SSE contract, authentication, replay, reconciliation, and WebSocket contracts.
- Confirm unresolved alert formulas, tolerances, data mappings, and representative live evidence identified by the alert catalog and architecture roadmap.
- Define production policies for identity, permissions, retention, attachments, moderation, reporting, offline behavior, and external notification channels.

The documentation is internally consistent and implementation may begin with Phase 0. External EmusaSoft and MCP delivery dependencies are tracked in `docs/emusasoft_preimplementation_requests.md`; they are implementation gates for the affected features, not reasons to reopen the approved product boundary.
