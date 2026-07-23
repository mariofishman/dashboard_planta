# ADR 0004: REST recovery plus WebSocket live delivery

**Status:** accepted  
**Date:** 2026-07-20

## Decision

Persistent commands and history/recovery use REST. Socket.IO publishes committed domain changes and accepts only explicitly defined real-time commands. PostgreSQL is canonical; Redis is transport only.

Every committed change receives a monotonically increasing cursor inside the same database transaction as the domain change. After commit, the gateway publishes the canonical envelope in `contracts/incident-change.schema.json`. A reconnecting client calls `GET /v1/changes?after=<cursor>&limit=<n>`, applies ordered results, then resumes its authorized WebSocket stream.

If publication fails after commit, API recovery still returns the change. If persistence fails, nothing is published. The server rejects unknown event versions and scopes every delivery from server-side authorization.
