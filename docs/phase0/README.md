# Phase 0 execution checklist

**Status:** complete; local exit gate passes and Phase 1 is authorized  
**Date:** 2026-07-20  
**Scope:** Phase 0 only

This file is the tracked Phase 0 record. A checked item has repository evidence. External acceptance remains unchecked until the named owner supplies a versioned artifact and the stated test passes.

## 1. Monitor-owned work completed now

- [x] Boundary ADR — `adrs/0001-system-boundary.md`.
- [x] Authentication ADR and current MCP evidence — `adrs/0002-authentication.md` and `evidence/emusasoft_mcp.md`.
- [x] Concrete TypeScript technical-kit ADR — `adrs/0003-technical-kit.md`.
- [x] API/WebSocket protocol ADR — `adrs/0004-api-websocket-protocol.md`.
- [x] Material UI and Monitor token ADR; no `emusa-ui` dependency — `adrs/0005-material-ui.md`.
- [x] Versioned detection-query, natural-key, key-schema, and result contracts — `contracts/detection-query.schema.json`, `contracts/a02.query.json`, and `contracts/a05.query.json`.
- [x] Candidate A02 and A05 SQL — `queries/a02-reserved-material-in-transit.v1.sql` and `queries/a05-reel-handling.v1.sql`.
- [x] Read-only access and production freshness contracts — `contracts/read-only-access.md` and `contracts/replica-freshness.md`.
- [x] Initial polling and load policy — `contracts/polling-and-load-limits.md`.
- [x] Canonical incident-change schema and WebSocket protocol — `contracts/incident-change.schema.json` and `contracts/websocket-protocol.md`.
- [x] Environment, secrets, ownership, and operating boundaries — `operations.md`.
- [x] Audit of the design system and three prototypes that were current during Phase 0 — `prototype-audit.md`.
- [x] Operational Responsibility Roster design brief — `roster-design-brief.md`.
- [x] Initial threat model and browser credential boundary — `threat-model.md`.
- [x] Navigation contract records that EmusaSoft exposes no supported frontend route patterns; Monitor shows identifiers and evidence locally — `contracts/deep-links.json`.
- [x] Local-backup extraction and query-validation tooling — `scripts/phase0/validate_detection_queries.py`.
- [x] API/WebSocket commit-and-recovery proof — `phase0-proof/`.

## 2. Decisions or access requiring owner approval

- [ ] **Production hosting spend:** approve an AWS deployment budget and account only before infrastructure is provisioned. The code remains container-portable; no paid resource was created in Phase 0.
- [x] **Independent read-only boundary:** approved by the owner on 2026-07-21. Monitor detects and discusses problems but never corrects EmusaSoft records.

No routine library, schema-format, local-test, or polling-safety choice requires owner approval.

## 3. External dependencies already assigned

- [ ] **ES-01:** EmusaSoft approves production predicates, natural keys, indexes, plans, bounds, timeouts, staging results, and replica load budget in Phase 10.
- [ ] **ES-02:** EmusaSoft supplies staging read-only credentials, proves denial of all writes, and supplies the production replica-freshness signal and limits in Phase 10.
- [ ] **ES-03:** EmusaSoft publishes the authentication-microservice verification contract, revocation behavior, and test identities for Phase 10.
- [ ] **ES-04:** EmusaSoft confirms operational actor and routing evidence for final integration. Local development uses explicit mock assignments.
- [ ] **ES-05:** EmusaSoft confirms immutable extrusion opening inventory for final integration. Unsupported rules remain fixture-only or excluded.
- [x] **ES-06 answered:** the architect reports no supported frontend route patterns. Monitor will show ERP identifiers and evidence instead of promising deep links.
- [x] **ES-07 superseded by current product direction:** Monitor must use Material UI and must not connect to or depend on `emusa-ui`. No external delivery is required.
- [ ] **MCP-01 through MCP-06:** remain assigned to the MCP team. Catalog drift and unavailable validation prevent MCP evidence from being treated as current production proof.

## Phase 0 exit criteria

| Exit criterion | Result | Evidence |
|---|---|---|
| A02 and A05 run against the local backup | Pass locally | `evidence/query-validation.md` |
| Queries are bounded, measured, and have proposed safe limits | Pass locally | `contracts/polling-and-load-limits.md`, `evidence/query-validation.md` |
| Stable condition keys demonstrated | Pass locally | A02 uses `materialFlowDetailId`; A05 uses `articleSerialId`; contract tests reject missing keys |
| Safe failure behavior demonstrated | Pass locally | protocol proof preserves the last committed cursor and requires a complete healthy cycle before resolution |
| Committed incident change published by WebSocket | Pass locally | `phase0-proof/test/incident-stream.test.ts` |
| Missed change recovered by API cursor | Pass locally | `phase0-proof/test/incident-stream.test.ts` |
| Aurora/staging validation within an approved production budget | Later integration dependency, not a local Phase 0 exit criterion | ES-01, ES-02 |
| Production replica freshness can prevent unsafe resolution | Contract complete; later integration proof pending | ES-02 |
| Unsupported navigation is represented safely | Pass locally | navigation actions remain absent; ERP identifiers remain visible |

**Gate result:** every local Phase 0 exit criterion passes. The owner approved the only Phase 0 business decision—the independent read-only boundary—on 2026-07-21. Pending EmusaSoft answers and production access now gate Phase 10 only. Phase 1 is authorized; no vague second approval is required.
