# Monitor

Monitor is a factory alert and collaboration product with four main screens: Dashboard, Chat list, Chat detail, and the Operational Responsibility Roster. Its compact dashboard reports errors, alerts, and other factory conditions that require attention.

## Repository structure

- `docs/product_definition.md` — canonical current product summary and documentation authority map.
- `docs/archive/` — deprecated historical documents, including the former project context, rationale, discovery, and superseded architect decision record.
- `docs/` — current product definition and specialized product documentation.
- `docs/ux_ui_decisions.md` — canonical UX/UI decisions for the dashboard implementation and chat prototypes.
- `docs/emusasoft_preimplementation_requests.md` — owned delivery requests for the EmusaSoft and MCP implementation teams.
- `docs/emusasoft_integration_architecture.md` — approved read-only SQL polling contract between Monitor and EmusaSoft.
- `docs/codex_implementation_kickoff.md` — reusable prompts and phase-gated workflow for starting implementation with Codex.
- `apps/api/` — Monitor API, mock identity boundary, authorization, health, metrics, and WebSocket gateway.
- `apps/web/` — Material UI mock login and approved local incident dashboard.
- `packages/` — shared contracts, database migrations, detection, incident lifecycle, and design-system theme.
- `docs/phase0/` through `docs/phase4/` — phase checklists and validation evidence.
- `prototype/chat-list-review/dashboard.html` — deprecated pre-V2 dashboard prototype retained as historical design evidence.
- `prototype/chat-list-review/chat-list-final.html` — current chat-list prototype.
- `prototype/chat-list-review/chat-detail.html` — current chat-detail prototype.
- Operational Responsibility Roster — fourth main screen; concept documented but not yet prototyped.
- `prototype/dashboard/` — deprecated historical dashboard retained only for reference or inspiration.
- `prototype/alert-catalog/final/` — approved documentation-review publication; not a Monitor product screen.
- `prototype/alert-catalog/v11/` — approved E05 documentation-review iteration.
- `prototype/alert-catalog/v1/` through `v10/` — deprecated historical review iterations.
- `AGENTS.md` — project-specific agent instructions.

## Review historical prototypes

From the repository root:

```sh
python3 -m http.server 8000
```

Open:

- Deprecated pre-V2 dashboard: `http://localhost:8000/prototype/chat-list-review/dashboard.html`
- Deprecated historical dashboard: `http://localhost:8000/prototype/dashboard/`
- Approved alert catalog: `http://localhost:8000/prototype/alert-catalog/final/`
- Approved E05 review record: `http://localhost:8000/prototype/alert-catalog/v11/`
- Deprecated review history: `http://localhost:8000/prototype/alert-catalog/v1/` through `v10/`

## EMUSA Soft MCP configuration

Copy `.env.example` to `.env` and provide the project credential locally:

```sh
cp .env.example .env
```

Never commit `.env` or expose `EMUSASOFT_MCP_TOKEN`.

## Run Monitor locally

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:5173` and choose a mock role. This local application uses an embedded Monitor database and does not connect to EmusaSoft.

Validate the foundation with:

```sh
npm run db:migrate
npm run typecheck
npm test
npm run build
```

## Current status

Phases 0–4 are complete locally. Monitor now has a mock login, server-controlled permissions, safe local detection, an incident lifecycle with evidence and recurrence, authorized APIs, recoverable live changes, and a functional dashboard connected to sample incidents. The dashboard design is not approved: Version Two adds Phase 4A for its redesign and Phase 4B for dynamic local source validation before Phase 5. Real authentication, Aurora access, current-schema and load validation, staging, pilot, and production deployment remain consolidated in Phase 10.
