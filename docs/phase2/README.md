# Phase 2 — Platform foundation

**Status:** complete locally; Phase 3 is tracked separately

Phase 2 creates the reusable technical shell. It intentionally contains no alert detection or EmusaSoft integration.

## Tracked deliverables

- [x] TypeScript repository with separate API, web, contracts, database, and design-system workspaces.
- [x] Continuous-integration workflow for install, type checking, tests, and builds.
- [x] Local/test configuration with committed examples and ignored local secrets/data.
- [x] Fastify Monitor API with structured redacted logs.
- [x] Monitor-owned relational schema and versioned migration.
- [x] Replaceable identity-adapter contract and local mock provider.
- [x] Material UI mock login and authenticated application shell using canonical Monitor design tokens.
- [x] Server-calculated authorization scopes and protected-route checks.
- [x] Trace IDs, Prometheus-format metrics, liveness, and readiness checks.
- [x] Optional Redis Socket.IO adapter, with an explicit single-process in-memory local mode.
- [x] Authenticated cursor-based WebSocket connection and resume handshake.
- [x] Server-provided feature flags.
- [x] Contract test covering replacement of mock identity with the Phase 10 authentication adapter boundary.

## Exit criteria

- [x] Local test users authenticate through the mock provider.
- [x] The server, not the login page, calculates their scopes.
- [x] An authenticated user opens a WebSocket session and resumes from a cursor.
- [x] Application dependencies and source contain no EmusaSoft database driver, credential, or write endpoint.

## Safe local choices

- Local and test runs use PGlite, an embedded PostgreSQL-compatible database, because Docker, PostgreSQL, and Redis are not installed on this machine. This makes testing immediate and reversible. The same migration can run against PostgreSQL 17 through `MONITOR_DATABASE_MODE=postgres`.
- WebSocket fan-out uses in-process memory for one local server. Setting `MONITOR_REDIS_URL` activates the Redis adapter without changing application behavior.
- Mock authentication is enabled outside production only. Production startup requires a supplied cookie secret and disables mock login by default.
- EmusaSoft authentication and database adapters remain Phase 10 substitutions behind the tested boundaries.

## Local evidence

Run from the repository root:

```sh
npm install
npm run typecheck
npm test
npm run build
npm run dev
```

Then open `http://127.0.0.1:5173`. Choose any test role. The resulting page displays the server-assigned permissions and live-connection state.

The optional production-shaped services in `compose.yaml` are documentation and future integration support; they are not required for the local Phase 2 proof.

## Validation record — 2026-07-21

- `npm run db:migrate` passed and created the ignored local PGlite database.
- `npm run build` passed for the API and Material UI web application.
- `npm run typecheck` passed for all five workspaces.
- `npm test` passed 8/8 API, authorization, production fail-safe, adapter, database, safety, and WebSocket tests.
- `npm audit --audit-level=high` reported 0 vulnerabilities.
- Browser testing passed at 1280×720 and 390×844: mock login, authenticated shell, logout, server-assigned permissions, WebSocket connection, and no horizontal overflow.
- The GitHub Actions workflow repeats install, type checking, tests, and builds. It cannot run on GitHub until these files are pushed, but the same commands pass locally.
- A real Redis process was unavailable on this machine. The Redis adapter compiles and is configurable; the Phase 2 local gate uses and identifies the supported single-process memory adapter. Multi-server Redis validation belongs with deployment work.

## Gate result

Every Phase 2 exit criterion passes locally. No business approval, production credential, EmusaSoft access, or external architect answer was needed for this gate. Phase 3 was subsequently authorized.
