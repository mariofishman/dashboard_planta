# Phase 1 execution checklist

**Status:** complete; local exit gate passes
**Date:** 2026-07-21
**Scope:** Phase 1 only

Phase 1 turns every active alert in `docs/alert_catalog.md` into a machine-checkable specification. It does not build the API, database, scheduler, authentication, or user interface; those begin in later phases.

## 1. Monitor-owned work completed

- [x] Versioned JSON Schema for alert-rule contracts — `contracts/rule-contract.schema.json`.
- [x] One versioned executable contract for each of the 21 active A–E rules — `contracts/alert-rules.v1.json`.
- [x] Query ID/version and source table/field mapping for every rule.
- [x] Stable natural key and key-schema version for every rule.
- [x] Final classification of every rule as deterministic, deadline, physical, statistical, or a declared combination.
- [x] Versioned approved, provisional, and fixture-only parameters without treating mock values as production facts.
- [x] Sufficient/insufficient evidence, units, timestamp, assumption, and production-dependency matrix — `evidence-matrix.md`.
- [x] Three sanitized fixture cases per rule: triggered, clear, and insufficient — `fixtures/rule-cases.v1.json`.
- [x] Reference evaluator that reproduces all fixture outcomes and verifies stable condition keys — `../../scripts/phase1/validate-rule-contracts.mjs`.
- [x] Local-backup schema validator that reads only DDL and prints no operational rows — `../../scripts/phase1/validate-source-mappings.py`.
- [x] Vitest and TypeScript contract-test kit — `../../phase1-contracts/`.

## 2. Decisions or access requiring owner approval

None for Phase 1. No paid service, production credential, irreversible action, or new product boundary was introduced.

## 3. External dependencies retained for Phase 10

- [ ] ES-01 and ES-02: approve and validate production queries, indexes, access, freshness, and load.
- [ ] ES-03: connect the real EmusaSoft authentication microservice.
- [ ] ES-04: confirm production actor and routing mappings.
- [ ] ES-05: confirm immutable extrusion opening inventory for E02–E04.
- [ ] MCP-01 through MCP-06: improve production discovery and validation evidence.

These items do not block Phases 2–9.

## Exit criteria

| Exit criterion | Result | Evidence |
|---|---|---|
| Every active candidate rule is represented | Pass | 21 unique contracts match A01–A07, B01–B03, C01, C02, C06, D01–D04, and E01–E04 |
| Every rule produces a reproducible result or is excluded | Pass | 63 fixtures: one triggered, one clear, and one insufficient case for every rule |
| Stable condition identity is defined | Pass | every rule has a natural key, query ID, and key-schema version; trigger and clear fixtures retain the same condition key |
| Missing evidence cannot create an alert | Pass | every rule's insufficient fixture returns `insufficient`, not `triggered` or `clear` |
| Local schema claims are checked against the backup | Pass | 76 fields across 17 backup-confirmed tables match the protected 2026-07-16 DDL |
| Mock assumptions are separated from production facts | Pass | provisional and fixture-only inputs are listed in `evidence-matrix.md`; production validation remains Phase 10 |

**Validation:** 3 Vitest tests passed, TypeScript type-checking passed, 21 contracts and 63 fixtures passed the reference evaluator, 76 mapped fields across 17 tables matched the backup DDL, and no production data rows were printed.

**Gate result:** Phase 1 is complete locally. Phase 2 has not begun.
