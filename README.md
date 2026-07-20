# Monitor

Monitor is a factory alert and collaboration product with four main screens: Dashboard, Chat list, Chat detail, and the Operational Responsibility Roster. Its compact dashboard reports errors, alerts, and other factory conditions that require attention.

## Repository structure

- `docs/product_definition.md` — canonical current product summary and documentation authority map.
- `docs/archive/` — deprecated historical documents, including the former project context, rationale, discovery, and superseded architect decision record.
- `docs/` — current product definition and specialized product documentation.
- `docs/ux_ui_decisions.md` — canonical UX/UI decisions for the dashboard, chat list, and chat detail prototypes.
- `docs/emusasoft_preimplementation_requests.md` — owned delivery requests for the EmusaSoft and MCP implementation teams.
- `docs/emusasoft_integration_architecture.md` — approved read-only SQL polling contract between Monitor and EmusaSoft.
- `docs/codex_implementation_kickoff.md` — reusable prompts and phase-gated workflow for starting implementation with Codex.
- `prototype/chat-list-review/dashboard.html` — current dashboard prototype.
- `prototype/chat-list-review/chat-list-final.html` — current chat-list prototype.
- `prototype/chat-list-review/chat-detail.html` — current chat-detail prototype.
- Operational Responsibility Roster — fourth main screen; concept documented but not yet prototyped.
- `prototype/dashboard/` — deprecated historical dashboard retained only for reference or inspiration.
- `prototype/alert-catalog/final/` — approved documentation-review publication; not a Monitor product screen.
- `prototype/alert-catalog/v1/` through `v10/` — deprecated historical review iterations.
- `AGENTS.md` — project-specific agent instructions.

## Run the prototypes

From the repository root:

```sh
python3 -m http.server 8000
```

Open:

- Current dashboard: `http://localhost:8000/prototype/chat-list-review/dashboard.html`
- Deprecated historical dashboard: `http://localhost:8000/prototype/dashboard/`
- Approved alert catalog: `http://localhost:8000/prototype/alert-catalog/final/`
- Deprecated review history: `http://localhost:8000/prototype/alert-catalog/v1/` through `v10/`

## EMUSA Soft MCP configuration

Copy `.env.example` to `.env` and provide the project credential locally:

```sh
cp .env.example .env
```

Never commit `.env` or expose `EMUSASOFT_MCP_TOKEN`.

## Current status

The product definition and target architecture are internally consistent. The project is ready to begin Phase 0 contracts and ADRs for approved read-only SQL polling, identity, deep links, WebSockets, and the application foundation. External EmusaSoft and MCP dependencies are tracked explicitly in `docs/emusasoft_preimplementation_requests.md`.
