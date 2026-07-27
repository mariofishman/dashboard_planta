# Phase 5 — Operational Responsibility Roster, routing, and notifications

**Status:** Complete locally
**Started:** 2026-07-26
**Completed:** 2026-07-26

## Completed locally

- [x] Monitor-owned PostgreSQL/PGlite tables for current roster assignments, operation membership, revisions, and append-only audit records.
- [x] Monitor-admin-only roster read and write API.
- [x] Server-side validation of standardized positions, derived coverage, applicable operation or warehouse area, group, dates, state, and setup completeness.
- [x] Atomic snapshot writes for Excel imports and UI edits.
- [x] Revision-conflict rejection prevents one browser session from silently overwriting a newer saved roster.
- [x] Frontend loads the roster from Monitor's database and persists manual additions, Excel imports, detail edits, activation, deactivation, and bulk edits.
- [x] Automated restart test proves saved assignments survive a complete API shutdown and restart.
- [x] Browser test proves a bulk area change survives page reload.

## Completed routing, rotation, and notification work

- [x] Effective-date conflicts, temporary schedule/group exceptions, and explicit reversion.
- [x] Rotation patterns, calendar adjustments, gap coverage, revisions, and append-only audit history persist in Monitor's database.
- [x] Deterministic recipient resolution implements all seven general alert-distribution rules and every code-specific catalog override.
- [x] Recorded ERP actor/operator evidence supplements roster recipients where the catalog requires it, with identity deduplication.
- [x] Durable in-app delivery records provide idempotent fan-out, bounded retry, and internal routing diagnostics.
- [x] Missing or conflicting required assignments retain every valid recipient, create an administrator email outbox record, and never trigger a broad fallback notification.
- [x] Phase 4B incidents reroute when roster assignments change.
- [x] The manual multi-user scenario verifies that an ordinary operator cannot read internal routing diagnostics, an administrator can, and a changed assignment reroutes the open incident.

## Validation evidence

- `npm test`: 66 tests passed across API, web, contracts, database, design system, detection, and incidents.
- `npm run typecheck`: passed for every workspace.
- `npm run build`: passed; the existing bundle-size advisory remains non-blocking.
- `npm run validate:phase5-routing`: passed the isolated manual manager/operator scenario and dynamic recipient replacement.
- Browser reload at `/roster`: `Responsables` loaded without an error; `Rotación` retained its existing operation selector, calendars, and `Editar patrón` control without an error.
- The roster and rotation visual design was not redesigned during the backend completion; only persistence calls were connected to the existing controls.

## Exit gate

- [x] Every alert-catalog routing rule has deterministic automated evidence.
- [x] The local manual multi-user scenario passes.

Production authentication, EmusaSoft access, Aurora validation, external email transport, and deployment remain Phase 10 work and do not block this local Phase 5 gate.
