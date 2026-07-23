# Monitor Product Definition

**Status:** Canonical current-state summary
**Last consolidated:** 2026-07-22

This document is the primary entry point for the current Monitor product definition. Historical discovery and exploratory prototypes must not override it. Detailed documents remain authoritative only within the domains listed below.

## Product purpose

Monitor detects, explains, communicates, and analyzes operational alerts derived from factory activity recorded in EmusaSoft. It is not only a dashboard: its compact Dashboard screen reports errors, alerts, and other factory conditions that require attention, while its chat and responsibility screens support collaboration and deterministic routing. Monitor does not replace EmusaSoft's production, inventory, weighing, or correction workflows.

## Current product screens

Monitor has four main screens:

1. **Dashboard** — current and historical alert analysis, filters, reports, and drill-down. Approved local implementation: `apps/web/`.
2. **Chat list** — conversations in which the current user participates. Current prototype: `prototype/chat-list-review/chat-list-final.html`.
3. **Chat detail** — messages, replies, attachments, and structured alert objects. Current prototype: `prototype/chat-list-review/chat-detail.html`.
4. **Operational Responsibility Roster** — assigns people to standardized operational positions by operation, machine, shift, and effective date. It is required for deterministic routing but remains conceptual and has no approved prototype.

The earlier dashboard-only product direction is superseded. Technical implementation phases are sequencing tools, not separate product releases.

## System boundary

- EmusaSoft remains the operational system of record.
- Monitor is an independent system with its own repository, service, database, deployment, migrations, incidents, evidence, conversations, messages, client synchronization state, and audit history.
- Monitor detects current ERP conditions through approved read-only SQL queries against an EmusaSoft Aurora MySQL replica and uses its own WebSockets for clients. EmusaSoft provides no SSE service to Monitor.
- Monitor never writes to the EmusaSoft database.
- Monitor does not create, submit, approve, track, or apply adjustment requests.
- Monitor shows the ERP identifiers and evidence needed to locate relevant work orders or material reservations in EmusaSoft, where users perform every correction.
- Incidents closed without resolution remain available through a read-only evidence view. Any later adjustment belongs entirely to EmusaSoft.
- Closing without resolution suppresses only the same uninterrupted condition until a healthy polling cycle proves it cleared. A later recurrence creates a new incident occurrence.

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
4. **Architecture and engineering plan:** `docs/emusasoft_integration_architecture.md` for the EmusaSoft boundary and `docs/monitor_architecture_and_production_roadmap.md` for the complete system and sequencing.
5. **Visual system and brand:** `docs/design/design.md`, `docs/design/brand_guidelines.md`, and `docs/design/design-system/`.
6. **Repository navigation:** `README.md`, which contains no product authority.

The consolidated current integration contract is `docs/emusasoft_integration_architecture.md`. The earlier architect decision record is historical material in `docs/archive/`. `AGENTS.md` contains tooling instructions rather than product requirements.

## Current product implementations and prototypes

- `apps/web/` — approved Dashboard V2 local implementation;
- `prototype/chat-list-review/chat-list-final.html`
- `prototype/chat-list-review/chat-detail.html`

The design system, dashboard implementation, and two currently prototyped chat screens must continue improving as part of the engineering roadmap. The fourth screen, the Operational Responsibility Roster, must be designed and validated before implementation.

## Current documentation-review interface

- `prototype/alert-catalog/final/index.html` is the approved browser publication of the alert catalog. It is not a Monitor product screen.
- `prototype/alert-catalog/v11/index.html` records the review in which E05 was approved; the approved result is published in the final catalog.

## Deprecated historical material

The following files remain only for history or inspiration and have no current product authority:

- `docs/archive/project_context.md`;
- `docs/archive/dashboard_rationale.md`;
- `docs/archive/discovery.md`;
- `docs/archive/emusasoft_architecture_decisions.md`;
- `prototype/dashboard/`;
- `prototype/chat-list-review/dashboard.html`;
- `prototype/alert-catalog/v1/` through `v10/`; and
- `prototype/chat-list-review/01-familiar.html` through `04-pinned-focus.html`.

## Current open decisions

- Design the Operational Responsibility Roster screen, workflow, permissions, conflict handling, and audit presentation.
- Redesign and approve the dashboard in Phase 4A, then validate changing source scenarios through polling and the complete alert lifecycle in Phase 4B.
- Build and validate detection, authorization, safe incomplete-cycle behavior, and WebSocket contracts locally; integrate real EmusaSoft authentication, read-only access, current-schema validation, and replica observation behavior in Phase 10.
- Confirm unresolved alert formulas, tolerances, data mappings, and representative live evidence identified by the alert catalog and architecture roadmap.
- Define production policies for identity, permissions, retention, attachments, moderation, reporting, offline behavior, and external notification channels.

Phases 0–4 are complete locally. Every active alert has a versioned executable rule contract and reproducible triggered, clear, and insufficient fixture cases under `docs/phase1/`; A02, A03, and A05 also have a working incident vertical slice. The Phase 4 functional gate is accepted, but the dashboard design is not approved. Phase 4A redesigns it and Phase 4B adds dynamic local source scenarios before Phase 5. External EmusaSoft and MCP delivery dependencies gate the affected Phase 10 integration tests or rule promotions, not local product construction. EmusaSoft has not yet exposed a supported frontend-route contract, so Monitor shows ERP identifiers and evidence rather than promising deep links.
