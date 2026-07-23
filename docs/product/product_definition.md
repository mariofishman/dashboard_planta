# Monitor Product Definition

**Status:** Canonical current-state summary
**Last consolidated:** 2026-07-23

This document is the primary entry point for the current Monitor product definition. Historical discovery and exploratory prototypes must not override it. Detailed documents remain authoritative only within the domains listed below.

## Product purpose

Monitor detects, explains, communicates, and analyzes operational alerts derived from factory activity recorded in EmusaSoft. It is not only a dashboard: its compact Dashboard screen reports errors, alerts, and other factory conditions that require attention, while its chat and responsibility screens support collaboration and deterministic routing. Monitor does not replace EmusaSoft's production, inventory, weighing, or correction workflows.

## Current product screens

Monitor has four main screens:

1. **Dashboard** — current and historical alert analysis, filters, reports, and drill-down. Approved local implementation: `apps/web/`.
2. **Chat list** — conversations in which the current user participates. Current prototype: `prototypes/current/chat/chat-list-final.html`.
3. **Chat detail** — messages, replies, attachments, and structured alert objects. Current prototype: `prototypes/current/chat/chat-detail.html`.
4. **Operational Responsibility Roster** — assigns people to standardized operational positions by operation, machine, shift, and effective date. It is required for deterministic routing but remains conceptual and has no approved prototype.

The earlier dashboard-only product direction is superseded. Technical implementation phases are sequencing tools, not separate product releases.

## System boundary

- EmusaSoft remains the operational system of record.
- Monitor is an independent system with its own repository, service, database, deployment, migrations, incidents, evidence, conversations, messages, client synchronization state, and audit history.
- Monitor detects current ERP conditions through approved read-only SQL queries against an EmusaSoft Aurora MySQL replica and uses its own WebSockets for clients. EmusaSoft provides no SSE service to Monitor.
- Monitor never writes to the EmusaSoft database.
- Monitor does not create, submit, approve, track, or apply adjustment requests.
- Monitor shows ERP identifiers and evidence and may link to supported EmusaSoft routes after the Phase 10 navigation contract passes. Users perform every correction in EmusaSoft.
- Incidents closed without resolution remain available through a read-only evidence view. Any later adjustment belongs entirely to EmusaSoft.
- Closing without resolution suppresses only the same uninterrupted condition until a healthy polling cycle proves it cleared. A later recurrence creates a new incident occurrence.

## Alert and routing model

- `docs/product/alert_catalog.md` defines every approved alert code, detection rule, evidence requirement, resolution, and routing rule.
- Each alert code may define its own descriptive label. Labels are presentation text, not a shared incident-state taxonomy.
- Incident lifecycle is separate from the alert label and contains exactly three user-visible states: open, resolved, and closed without resolution. Suppression and invalidation are internal evaluation dispositions, not incident states.
- Alert recipients are selected deterministically from the alert code and reason.
- The Operational Responsibility Roster resolves standardized positions to actual people. An LLM never selects operational recipients.

## Documentation authority

If documents disagree, use this order within the relevant domain:

1. **Current product definition:** this document.
2. **Alert logic and routing:** `docs/product/alert_catalog.md`.
3. **Screen behavior and UX/UI:** `docs/product/ux_ui_decisions.md`.
4. **Architecture:** `docs/architecture/system_architecture.md`.
5. **Delivery status and sequencing:** `docs/roadmap.md`.
6. **Visual system and brand:** `docs/design/design.md`, `docs/design/brand_guidelines.md`, and `docs/design/design-system/`.
7. **Repository navigation:** `README.md`, which contains no product authority.

The active external-delivery status is maintained only in `docs/integrations/emusasoft/integration_register.md`. Historical records under `archive/` have no current authority. `AGENTS.md` contains tooling instructions rather than product requirements.

## Current product implementations and prototypes

- `apps/web/` — approved Dashboard V2 local implementation;
- `prototypes/current/chat/chat-list-final.html`
- `prototypes/current/chat/chat-detail.html`

The design system, dashboard implementation, and two currently prototyped chat screens must continue improving as part of the engineering roadmap. The fourth screen, the Operational Responsibility Roster, must be designed and validated before implementation.

## Current documentation-review interface

- `reviews/alert-catalog/publication/index.html` is the approved browser publication of the alert catalog. It is not a Monitor product screen.
- `reviews/alert-catalog/iterations/v12/index.html` records the review in which the E02–E05 closure-snapshot guidance was approved; the approved result is published in the final catalog.

## Deprecated historical material

The following files remain only for history or inspiration and have no current product authority:

- `archive/docs/product/project_context.md`;
- `archive/docs/product/dashboard_rationale.md`;
- `archive/docs/product/discovery.md`;
- `archive/docs/implementation/emusasoft_architecture_decisions.md`;
- `archive/prototypes/dashboard-pre-v2/`;
- `archive/prototypes/chat-list-explorations/dashboard.html`;
- `reviews/alert-catalog/iterations/v1/` through `v10/`; and
- `archive/prototypes/chat-list-explorations/01-familiar.html` through `04-pinned-focus.html`.

## Unresolved product decisions

- Design the Operational Responsibility Roster screen, workflow, permissions, conflict handling, and audit presentation.
- Confirm unresolved alert formulas, tolerances, data mappings, and representative live evidence identified by the alert catalog and architecture roadmap.
- Define production policies for identity, permissions, retention, attachments, moderation, reporting, offline behavior, and external notification channels.

Current phase status belongs only in `docs/roadmap.md`. The approved catalog contains 22 alerts; 21 have executable contracts and fixtures, while E05 remains pending implementation. The MCP exposes frontend route templates, but Monitor must use identifiers as the fallback until the Phase 10 base-URL, authorization, compatibility, and browser checks pass.
