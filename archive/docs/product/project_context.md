# Archived Project Context

> **Deprecated historical document.** This handoff accumulated superseded scope and planning assumptions. Use `docs/product/product_definition.md` for the current product definition.

## Project goals

- Build a supervisory factory-operations dashboard for EMUSA Soft.
- Detect operational recording errors as soon as possible by comparing expected production and inventory workflows with recorded digital events.
- Prioritize missing, late, contradictory, and unbalanced events according to urgency and downstream impact.
- Give factory supervisors enough evidence and context to investigate and correct exceptions.
- Complement the existing ERP rather than replace its production or inventory screens.
- Begin with an exception-monitoring layer; a complete industrial digital twin is a longer-term direction, not the initial scope.

## Decisions already made

- The product is an operational exception dashboard, not a general KPI dashboard.
- The primary value is rapid detection, explanation, prioritization, and support for correcting factory errors through existing operational workflows.
- Initial scope follows the live work-order and material-flow lifecycle, from reservation and pre-start movement through consumption, production, weighing, downstream movement, and closure.
- The dashboard should preserve evidence and distinguish confirmed violations from suspected inconsistencies.
- Each alert code defines its own descriptive label for the condition it reports. Labels such as `Error`, `Por vencer`, `Warning`, or `Possible error` are code-specific presentation text, not a shared incident-state taxonomy and not a severity model.
- EMUSA Soft prevents a reel from being digitally consumed unless it was reserved for that specific work order. A consumed-versus-reserved reel mismatch is therefore not a valid dashboard exception; missing consumption declarations remain relevant.
- Current machines do not provide a rewinder-completion signal; PLC-based detection is a possible future capability, not currently available evidence.
- An inferred alert may compare cumulative raw-material kilograms with the rewinder's maximum retained mass and declared output. If the input mass cannot physically remain on the rewinder, one or more produced reels may be undeclared. Capacity source, waste, losses, partial-reel treatment, and tolerances remain unresolved.
- Exceptions should link directly to the relevant EMUSA Soft work order, reel, material transfer, machine, or user record.
- The first known candidate rules are:
  1. Work order started before required material transfer.
  2. Active work order without a consumption declaration after the configured interval. A production declaration may support this exception but must not create a duplicate alert.
  3. Closure errors: declared run meters exceed the estimated meters supported by consumed reels; consumed-reel meters exceed declared run meters plus declared remnant-reel meters; or a fully completed OT has delivered reserved reels that remain unconsumed.
  4. Produced or remnant reel not weighed within 30 minutes.
  5. Produced reel not moved from a finished OT's machine to the next OT or appropriate warehouse within 30 minutes, or remnant reel not returned to the raw-material warehouse within 30 minutes; once movement begins, an unreceived transfer is covered by the transit rule.
- Visual design should wait until users, evidence, rules, preventive-warning timing, and resolution workflows are sufficiently understood.
- The primary dashboard users are the factory manager, operation supervisors, technical operation leaders, and the process team with its supervisors.
- Known operations are extrusion, extrusion lamination (`Exlam`), printing, adhesive lamination, cutting, and bag making or sealing.
- Each operation has three rotating 12-hour shifts, with two shifts working each day.
- The factory manager should remain aware of all exceptions. Affected operation supervisors and leaders should be informed immediately, with the process team included when movement, pickup, weighing, or delivery is involved.
- Every alert code and reason has a deterministic Primary Action Owner mapping to a standardized position. An LLM does not select operational recipients.
- Standardized supporting positions include material planner, planner, raw-material warehouse dispatcher or sender, raw-material warehouse supervisor or leader, process-team operator, and process-team supervisor. OT receiving, opening, closing, pause, and production declarations belong to the OT machine operator.
- Monitor owns an Operational Responsibility Roster master table and administration UI that map standardized positions to actual people by operation, machine, shift, and effective date. It preserves history and temporary replacements and warns about missing or conflicting assignments.
- The current product direction supersedes the earlier informational-dashboard-only concept.
- The product has four main screens: Dashboard, Chat list, Chat detail, and the Operational Responsibility Roster. The first three have current prototypes; the roster remains conceptual and has no prototype yet.
- Monitor is a new system with its own repository and control database.
- Monitor owns its service, deployment, migrations, and database independently from EmusaSoft.
- Monitor consumes EmusaSoft events directly through SSE backed by Redis and reads the EmusaSoft database with read-only access.
- Monitor uses its own WebSockets for bidirectional client communication; SSE is only the inbound EmusaSoft channel.
- EmusaSoft remains the operational source of truth; Monitor owns incidents, evidence, conversations, messages, cursors, and audit history.
- Monitor provides a read-only view of incidents closed without resolution. Any later inventory, valued-kardex, or accounting adjustment belongs entirely to the EmusaSoft team.
- Monitor never receives SQL write access to EmusaSoft.
- Historical discovery findings are preserved in deprecated `docs/discovery.md`; current product authority begins at `docs/product/product_definition.md`.
- The approved alert catalog is maintained in `docs/product/alert_catalog.md`. Its final browser publication is `reviews/alert-catalog/publication/index.html`; review iterations 1–10 remain available for comparison.

## Current configuration

- Project directory: `/Users/mariofishman/projects/dashboard_planta`
- Git repository: initialized locally.
- Application scaffold: not created.
- Architecture: selected at system level; implementation ADRs for authentication, API, database/ORM and WebSocket library remain pending.
- EMUSA Soft MCP credential source: project-root `.env` using `EMUSASOFT_MCP_TOKEN`.
- Never print, log, quote, commit, or expose the MCP token.
- Verify only that the token exists and is non-empty before connecting.
- The EMUSA Soft MCP exposes:
  - ERP GraphQL catalog and read-only queries.
  - EMUSA UI design-system search.
- Catalog inspected on 2026-07-17:
  - Schema version 2.
  - Generated 2026-07-13.
  - 1,034 GraphQL operations.
  - 345 entities.
  - 345 SQL tables.
  - 1,034 examples.

## Completed work

- Wrote the project rationale and operational context.
- Established the distinction between physical factory state and recorded digital state.
- Documented five initial exception candidates and their operational rationale.
- Defined an initial exception-first information architecture.
- Identified relevant ERP domains and entities, including:
  - factories, warehouses, equipment, and operations;
  - work productions and work orders;
  - work-order materials and outputs;
  - article serials, batches, locations, and material flows;
  - production declarations, consumption, weighing, pauses, waste, and dispatch.
- Inspected work order `13525` through the ERP API:
  - Work-order number: `151056.1`.
  - Operation: printing (`IMPRESION`).
  - Machine: `P15`.
  - Planned quantity: `6,879.085`.
  - Planned linear meters: `304,924`.
  - Planned millares: `2,450`.
  - The API record lacked executed dates and actual production values at inspection time, despite being opened through a `/closed/` route. This requires clarification before defining closure rules.
- Reviewed the rationale document; it is clear and suitable as persistent discovery context.
- Preserved the original users, operating structure, scope boundary, workflow discovery, candidate rules, evidence hypotheses, and unresolved questions in deprecated `docs/discovery.md`.
- Created a persistent alert catalog and browser review surface for line-by-line annotations.
- Organized the dashboard and versioned alert-catalog prototypes into separate directories.
- Added a GitHub-facing `README.md` and a credential-safe `.env.example`.
- Finalized architecture v1.0: independent Monitor repository/service/database, SSE plus read-only EmusaSoft access, Monitor WebSockets, and no adjustment queue or write integration.
- Defined a read-only closed-without-resolution view as the handoff surface for the EmusaSoft team.

## Pending work

- Validate dashboard access and notification routing for every affected operational role.
- Define the investigation, correction, and escalation behavior across the four current product screens.
- Confirm the exact ERP conditions that mean a work order is started, finished, or closed.
- Validate each candidate exception with factory stakeholders.
- Map every exception to available ERP fields, events, timestamps, and relationships.
- Separate deterministic violations from inferred or suspicious conditions.
- Define balance calculations, units, tolerances, waste, remnants, partial reels, and setup losses.
- Determine the source of each machine's maximum rewinder capacity and validate the inferred undeclared-production formula.
- Validate whether the 30-minute weighing threshold is universal.
- Define preventive-warning timing, notification escalation, and operational responsibility rules.
- Define the SSE event contract, read-only reconciliation queries, WebSocket protocol, and external notification channels.
- Define the filters, evidence fields, permissions, and controlled export for the closed-without-resolution view.
- Create the remaining foundational files after discovery provides enough detail:
  - expanded `AGENTS.md`
  - `project.md`, if still useful alongside this file
  - `todo.md`
  - `decisions.md`
- Complete Phase 0 contracts in `docs/roadmap.md` before scaffolding the application.

## Important paths and commands

### Paths

- Project root: `/Users/mariofishman/projects/dashboard_planta`
- Canonical product definition: `/Users/mariofishman/projects/dashboard_planta/docs/product/product_definition.md`
- Deprecated historical rationale: `/Users/mariofishman/projects/dashboard_planta/dashboard_rationale.md`
- Alert catalog: `/Users/mariofishman/projects/dashboard_planta/docs/product/alert_catalog.md`
- Current dashboard prototype: `/Users/mariofishman/projects/dashboard_planta/archive/prototypes/chat-list-explorations/dashboard.html`
- Current chat-list prototype: `/Users/mariofishman/projects/dashboard_planta/prototypes/current/chat/chat-list-final.html`
- Current chat-detail prototype: `/Users/mariofishman/projects/dashboard_planta/prototypes/current/chat/chat-detail.html`
- Operational Responsibility Roster: conceptual fourth screen; prototype pending.
- Deprecated historical dashboard: `/Users/mariofishman/projects/dashboard_planta/archive/prototypes/dashboard-pre-v2/index.html` — retained only for reference or inspiration and must not guide current implementation.
- Final alert catalog: `/Users/mariofishman/projects/dashboard_planta/reviews/alert-catalog/publication/index.html`
- Deprecated historical alert-catalog reviews: `/Users/mariofishman/projects/dashboard_planta/reviews/alert-catalog/iterations/v1/` through `/Users/mariofishman/projects/dashboard_planta/reviews/alert-catalog/iterations/v10/`
- Agent instructions: `/Users/mariofishman/projects/dashboard_planta/AGENTS.md`
- Credential file: `/Users/mariofishman/projects/dashboard_planta/.env`
- Project handoff: `/Users/mariofishman/projects/dashboard_planta/project_context.md`
- Closed work-order example: `https://erp-web.apps.emusa.dev/work-orders/closed/13525`
- Material-flow example: `https://erp-web.apps.emusa.dev/inventory-transfer`
- EMUSA UI Storybook: `https://emusa-ui.krowdy.com`

### Commands

```sh
cd /Users/mariofishman/projects/dashboard_planta
```

```sh
test -s .env
```

```sh
git status --short
```

```sh
rg --files -g '!.git' -g '!.env'
```

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/archive/prototypes/chat-list-explorations/dashboard.html` or `http://localhost:8000/reviews/alert-catalog/publication/`.

Do not display `.env` contents or run commands that print `EMUSASOFT_MCP_TOKEN`.
