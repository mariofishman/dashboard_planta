# EmusaSoft Architecture Decisions for Monitor

**Date:** 2026-07-19

**Status:** partially superseded on 2026-07-20 — see `emusasoft_integration_architecture.md`

> **Amendment (2026-07-20):** the EmusaSoft architect confirmed that no SSE service exists. Point 1 below is superseded. The agreed transport is condition-based SQL polling owned by Monitor, documented in `emusasoft_integration_architecture.md`.

## Confirmed answers

1. ~~EmusaSoft's real-time transport is **SSE**.~~ Superseded 2026-07-20: no SSE service exists; Monitor detects alerts via approved read-only SQL detection queries.
2. The event contract must be defined from Monitor's functional requirements.
3. EmusaSoft's real-time infrastructure uses **Redis**.
4. Monitor must consume EmusaSoft's real-time service directly.
5. Monitor is a new system with its own repository and control database, with read-only access to the EmusaSoft database.

## Consequences for Monitor

- Architecture: completely independent repository, service, deployment, and database.
- Input from EmusaSoft: SSE consumed by the Monitor backend.
- Recovery and context: read-only queries against the EmusaSoft database.
- Client communication: Monitor-owned WebSockets because communication is bidirectional.
- Monitor real-time coordination: Monitor-owned Redis; access to EmusaSoft's internal Redis is not assumed.
- Persistence: Monitor's database stores incidents, messages, cursors, and audit history.
- Prohibition: Monitor never writes to the EmusaSoft database.
- Unresolved closures: Monitor provides a read-only view with evidence and ERP references. Any later adjustment belongs to the EmusaSoft team and remains outside Monitor's scope.

## Contracts the Monitor team must define

- SSE endpoint, authentication, payloads, versioning, cursors, and replay;
- permitted read-only reconciliation queries and indexes;
- WebSocket protocol, authorization, idempotency, and API recovery;
- user authentication and mapping to `sysUserId`; and
- runtime, frameworks, and deployment topology for the new system.
