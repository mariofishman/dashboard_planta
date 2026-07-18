# EMUSA Factory Operations Dashboard

Supervisory dashboard discovery and prototypes for detecting operational recording errors in EMUSA Soft. The project focuses on live exceptions across material movement, production, weighing, inventory, and work-order closure.

## Repository structure

- `project_context.md` — concise project handoff, current decisions, and pending work.
- `dashboard_rationale.md` — stable product rationale and operational context.
- `docs/` — detailed discovery and the canonical alert catalog.
- `prototype/dashboard/` — current dashboard prototype.
- `prototype/alert-catalog/v2/` — current alert-catalog review prototype.
- `prototype/alert-catalog/v1/` — archived first alert-catalog iteration.
- `AGENTS.md` — project-specific agent instructions.

## Run the prototypes

From the repository root:

```sh
python3 -m http.server 8000
```

Open:

- Dashboard: `http://localhost:8000/prototype/dashboard/`
- Current alert catalog: `http://localhost:8000/prototype/alert-catalog/v2/`
- Archived alert catalog: `http://localhost:8000/prototype/alert-catalog/v1/`

## EMUSA Soft MCP configuration

Copy `.env.example` to `.env` and provide the project credential locally:

```sh
cp .env.example .env
```

Never commit `.env` or expose `EMUSASOFT_MCP_TOKEN`.

## Current status

The project is in discovery and interactive-prototype development. The production application architecture and scaffold have not yet been selected.
