# Monitor

Monitor is an independent factory-alert and collaboration product with four screens: Dashboard, Chat list, Chat detail, and the Operational Responsibility Roster. EmusaSoft remains the operational system of record; Monitor observes it through read-only integration and never writes to it.

## Repository map

- `apps/` — Monitor API and web application.
- `packages/` — shared contracts, database, detection, incidents, and design system.
- `config/` — executable alert and detection contracts plus approved SQL.
- `tests/` — cross-package fixtures and contract tests.
- `docs/` — current product, architecture, integration, design, roadmap, and delivery evidence.
- `prototypes/current/` — current chat-list and chat-detail prototypes.
- `reviews/` — browser-reviewable documentation publications and iterations.
- `atlases/` — active UI reference research.
- `archive/` — historical documents, prototypes, and implementation material with no current authority.
- `local-data/` — ignored local databases and validation output.

Start with [`docs/README.md`](docs/README.md) for documentation authority and navigation.

## Run Monitor locally

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. Local development uses mock identity and local data; it does not connect to EmusaSoft.

Validate the repository with:

```sh
npm run db:migrate
npm run typecheck
npm test
npm run build
```

## Environment

Copy `.env.example` to `.env` and set only the local values required for the task. Never commit `.env`, database credentials, or `EMUSASOFT_MCP_TOKEN`.

Current delivery status is maintained only in [`docs/roadmap.md`](docs/roadmap.md).
