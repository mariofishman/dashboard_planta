# Phase 0 execution checklist

**Status:** completion snapshot; local exit gate passed

**Date:** 2026-07-20
**Scope:** Phase 0 only

This file records the Phase 0 result as of 2026-07-20. It does not define current project status or current external dependency status.

## 1. Monitor-owned work completed now

- [x] Accepted ADRs — `docs/architecture/decisions/`.
- [x] Versioned detection-query and incident-change contracts — `config/detection/contracts/`.
- [x] Candidate A02 and A05 SQL — `config/detection/queries/`.
- [x] Read-only, polling/load, and WebSocket contracts — `docs/architecture/contracts/`.
- [x] Environment, secrets, ownership, and operating boundaries — `operations.md`.
- [x] Audit of the design system and three prototypes that were current during Phase 0 — `prototype-audit.md`.
- [x] Operational Responsibility Roster design brief — `archive/docs/design/roster_design_brief.md`.
- [x] Initial threat model and browser credential boundary — `threat-model.md`.
- [x] Navigation fails safely to identifiers. MCP v5 later added route discovery; Phase 10 still must validate environment, authorization, compatibility, and browser behavior — `config/detection/contracts/deep-links.json`.
- [x] Local-backup extraction and query-validation tooling — `scripts/phase0/validate_detection_queries.py`.
- [x] API/WebSocket commit-and-recovery proof — `apps/api/src/server.test.ts` and `packages/incidents/src/incidents.test.ts`.

## 2. Decisions or access requiring owner approval

- [ ] **Production hosting spend:** approve an AWS deployment budget and account only before infrastructure is provisioned. The code remains container-portable; no paid resource was created in Phase 0.
- [x] **Independent read-only boundary:** approved by the owner on 2026-07-21. Monitor detects and discusses problems but never corrects EmusaSoft records.

No routine library, schema-format, local-test, or polling-safety choice requires owner approval.

## 3. External dependencies

Current EmusaSoft and MCP status is maintained only in `docs/integrations/emusasoft/integration_register.md`.

## Phase 0 exit criteria

| Exit criterion | Result | Evidence |
|---|---|---|
| A02 and A05 run against the local backup | Pass locally | `evidence/query-validation.md` |
| Queries are bounded, measured, and have proposed safe limits | Pass locally | `docs/architecture/contracts/polling-and-load-limits.md`, `evidence/query-validation.md` |
| Stable condition keys demonstrated | Pass locally | A02 uses `materialFlowDetailId`; A05 uses `articleSerialId`; contract tests reject missing keys |
| Safe failure behavior demonstrated | Pass locally | protocol proof preserves the last committed cursor and requires a complete healthy cycle before resolution |
| Committed incident change published by WebSocket | Pass locally | `apps/api/src/server.test.ts` |
| Missed change recovered by API cursor | Pass locally | `apps/api/src/server.test.ts` |
| Aurora/staging validation within an approved production budget | Later integration dependency, not a local Phase 0 exit criterion | ES2-01, ES2-02 |
| Replica observation behavior is explicit | Pass | successful complete reads are authoritative; no separate lag gate |
| Navigation is represented safely | Pass locally | identifiers remain the fallback until Phase 10 route validation |

**Gate result:** every local Phase 0 exit criterion passed. The owner approved the independent read-only boundary on 2026-07-21.
