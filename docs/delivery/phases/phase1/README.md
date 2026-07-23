# Phase 1 execution checklist

**Status:** completion snapshot; local exit gate passed for the 21 rules approved at the time
**Date:** 2026-07-21
**Scope:** Phase 1 only

Phase 1 turned the 21 alerts approved on 2026-07-21 into machine-checkable specifications. E05 was approved later and remains pending in the executable contract and fixtures.

## 1. Monitor-owned work completed

- [x] Versioned JSON Schema for alert-rule contracts — `config/alerts/rule-contract.schema.json`.
- [x] One versioned executable contract for each of the 21 rules approved at Phase 1 completion — `config/alerts/alert-rules.v1.json`.
- [x] Query ID/version and source table/field mapping for every rule.
- [x] Stable natural key and key-schema version for every rule.
- [x] Final classification of every rule as deterministic, deadline, physical, statistical, or a declared combination.
- [x] Versioned approved, provisional, and fixture-only parameters without treating mock values as production facts.
- [x] Sufficient/insufficient evidence, units, timestamp, assumption, and production-dependency matrix — `evidence-matrix.md`.
- [x] Three sanitized fixture cases per implemented rule: triggered, clear, and insufficient — `tests/fixtures/alerts/rule-cases.v1.json`.
- [x] Reference evaluator that reproduces all fixture outcomes and verifies stable condition keys — `scripts/phase1/validate-rule-contracts.mjs`.
- [x] Local-backup schema validator that reads only DDL and prints no operational rows — `scripts/phase1/validate-source-mappings.py`.
- [x] Contract tests integrated into `packages/contracts/`.

## 2. Decisions or access requiring owner approval

None for Phase 1. No paid service, production credential, irreversible action, or new product boundary was introduced.

## 3. External dependencies

Current Phase 10 status belongs only in `docs/integrations/emusasoft/integration_register.md`.

## Exit criteria

| Exit criterion | Result | Evidence |
|---|---|---|
| Every rule approved at Phase 1 completion is represented | Pass | 21 unique contracts match A01–A07, B01–B03, C01, C02, C06, D01–D04, and E01–E04 |
| Every rule produces a reproducible result or is excluded | Pass | 63 fixtures: one triggered, one clear, and one insufficient case for every rule |
| Stable condition identity is defined | Pass | every rule has a natural key, query ID, and key-schema version; trigger and clear fixtures retain the same condition key |
| Missing evidence cannot create an alert | Pass | every rule's insufficient fixture returns `insufficient`, not `triggered` or `clear` |
| Local schema claims are checked against the backup | Pass | 76 fields across 17 backup-confirmed tables match the protected 2026-07-16 DDL |
| Mock assumptions are separated from production facts | Pass | provisional and fixture-only inputs are listed in `evidence-matrix.md`; production validation remains Phase 10 |

**Validation:** 3 Vitest tests passed, TypeScript type-checking passed, 21 contracts and 63 fixtures passed the reference evaluator, 76 mapped fields across 17 tables matched the backup DDL, and no production data rows were printed.

**Gate result:** Phase 1 passed locally for the 21-rule inventory that existed on 2026-07-21. E05 is a later catalog addition and is explicitly pending.
