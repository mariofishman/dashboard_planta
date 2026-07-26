# Phase 5 — Operational Responsibility Roster, routing, and notifications

**Status:** In progress  
**Started:** 2026-07-26

## Completed locally

- [x] Monitor-owned PostgreSQL/PGlite tables for current roster assignments, operation membership, revisions, and append-only audit records.
- [x] Monitor-admin-only roster read and write API.
- [x] Server-side validation of standardized positions, derived coverage, applicable operation or warehouse area, group, dates, state, and setup completeness.
- [x] Atomic snapshot writes for Excel imports and UI edits.
- [x] Revision-conflict rejection prevents one browser session from silently overwriting a newer saved roster.
- [x] Frontend loads the roster from Monitor's database and persists manual additions, Excel imports, detail edits, activation, deactivation, and bulk edits.
- [x] Automated restart test proves saved assignments survive a complete API shutdown and restart.
- [x] Browser test proves a bulk area change survives page reload.

## Remaining Phase 5 work

- [ ] Effective-date conflict and temporary-replacement workflows.
- [ ] Rotation schedule persistence and audit.
- [ ] Deterministic recipient resolution for every alert-catalog rule and override.
- [ ] OT operator or recorded-actor supplementation where required.
- [ ] Delivery records, deduplication, retry, and routing diagnostics.
- [ ] Administrator email for missing or conflicting required assignments.
- [ ] Phase 4B dynamic routing scenarios and the manual multi-user exit scenario.

Phase 5 is not complete until every remaining item and the roadmap exit gate pass.
