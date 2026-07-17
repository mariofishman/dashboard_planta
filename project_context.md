# Project Context

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
- Version 1 will treat every violated rule as an error rather than distinguishing critical and non-critical exceptions. Approaching-deadline warnings remain separate because the error has not happened yet.
- Exceptions should link directly to the relevant EMUSA Soft work order, reel, material transfer, machine, or user record.
- The first known candidate rules are:
  1. Work order started before required material transfer.
  2. Possible physical consumption without a digital consumption declaration.
  3. Closed work order with incomplete or unbalanced declarations.
  4. Produced reel not weighed within 30 minutes.
  5. Downstream use of a reel with incomplete required information.
- Visual design should wait until users, evidence, rules, preventive-warning timing, and resolution workflows are sufficiently understood.
- The primary dashboard users are the factory manager, operation supervisors, technical operation leaders, and the process team with its supervisors.
- Known operations are extrusion, extrusion lamination (`Exlam`), printing, adhesive lamination, cutting, and bag making or sealing.
- Each operation has three rotating 12-hour shifts, with two shifts working each day.
- The factory manager should remain aware of all exceptions. Affected operation supervisors and leaders should be informed immediately, with the process team included when movement, pickup, weighing, or delivery is involved.
- Version 1 is a live, socket-updated informational dashboard. It will not acknowledge, assign, resolve, dismiss, override, or correct exceptions inside the dashboard.
- Detailed discovery findings are maintained in `docs/discovery.md`.

## Current configuration

- Project directory: `/Users/mariofishman/projects/dashboard_planta`
- Git repository: initialized locally.
- Application scaffold and technical stack: not selected or created.
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
- Documented the confirmed users, operating structure, first-release boundary, end-to-end flow discovered so far, candidate rules, evidence hypotheses, and unresolved questions in `docs/discovery.md`.

## Pending work

- Validate dashboard access and notification routing for every affected operational role.
- Define the out-of-dashboard investigation, correction, and escalation process used in version 1.
- Confirm the exact ERP conditions that mean a work order is started, finished, or closed.
- Validate each candidate exception with factory stakeholders.
- Map every exception to available ERP fields, events, timestamps, and relationships.
- Separate deterministic violations from inferred or suspicious conditions.
- Define balance calculations, units, tolerances, waste, remnants, partial reels, and setup losses.
- Validate whether the 30-minute weighing threshold is universal.
- Define preventive-warning timing, notification escalation, and operational responsibility rules.
- Confirm socket event coverage, fallback refresh needs, and external notification channels.
- Create the remaining foundational files after discovery provides enough detail:
  - `readme.md`
  - expanded `AGENTS.md`
  - `project.md`, if still useful alongside this file
  - `todo.md`
  - `decisions.md`
  - `.env.example`
- Select the technical architecture and scaffold the application only after requirements are sufficiently defined.

## Important paths and commands

### Paths

- Project root: `/Users/mariofishman/projects/dashboard_planta`
- Rationale: `/Users/mariofishman/projects/dashboard_planta/dashboard_rationale.md`
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

Do not display `.env` contents or run commands that print `EMUSASOFT_MCP_TOKEN`.
