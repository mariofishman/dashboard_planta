# EmusaSoft and MCP Final-integration Requests

**Status:** active answer and Phase 10 delivery register

**Owner:** Monitor project lead
**Purpose:** give the EmusaSoft product/engineering team and the EmusaSoft MCP implementation team a finite, testable list of answers and inputs required when the locally completed Monitor is integrated in Phase 10.

These requests do not change Monitor's approved boundary. Monitor remains an independent system, never writes to EmusaSoft, and owns its incidents, evidence, conversations, messages, roster, and audit history. None of these open items blocks Phases 1 through 9: those phases use mock authentication, explicit fixture assumptions, and protected local/sample databases. Open items block only the affected Phase 10 staging or production acceptance test. Architect answers may be recorded here as they arrive; Monitor must not invent an answer.

## EmusaSoft product and engineering team

### ES-01 — Approve the detection query set (supersedes the SSE contract, 2026-07-20)

**Priority:** required for Phase 10 EmusaSoft integration; local implementation uses the protected backup and fixtures
**Provide:** review and approval of Monitor's bounded SQL detection queries — one per implemented alert type — including each predicate, declared natural key and key-schema version, output schema, required indexes, representative query plan, result bound, timeout, and load budget. See `emusasoft_integration_architecture.md`. No SSE service exists or will be built.

**Acceptance:** each implemented alert type has an approved query that runs within budget on staging, detects a seeded condition, preserves one occurrence while it persists, resolves only after a complete healthy cycle proves it cleared, and creates a new occurrence if it later returns.

### ES-02 — Provision and document read-only detection access

**Priority:** required for Phase 10 EmusaSoft integration; local implementation uses a fake freshness provider
**Provide:** environment-specific no-write credentials, approved Aurora MySQL replica or endpoint, permitted schemas/tables/views, connection and concurrency limits, time zone, soft-delete rules, representative query plans, maintenance expectations, credential rotation procedure, and a testable replica-freshness signal. Confirm access to `information_schema.replica_host_status` or provide CloudWatch `AuroraReplicaLag` access or another approved alternative.

**Acceptance:** automated tests prove that Monitor can execute approved bounded reads, measure or retrieve freshness, and cannot perform inserts, updates, deletes, DDL, procedures, or privilege changes. Failed, partial, invalid, or stale cycles must not resolve incidents.

### ES-03 — Confirm the identity and session integration

**Priority:** required for Phase 10 EmusaSoft integration; Phases 1–9 use a mock identity provider and mock claims
**Provide:** supported SSO or token-exchange flow, identity claims, stable mapping to `sysUserId`, plant membership and scope rules, disabled-user behavior, permission-revocation timing, service-to-service verification, and non-production test identities.

**Acceptance:** a staging user authenticates into Monitor, maps to exactly one enabled `sysUserId`, receives server-calculated plant scope, and loses access after revocation within the agreed interval.

### ES-04 — Confirm operational actor and routing evidence

**Priority:** required for Phase 10 routing acceptance; local routing uses explicit effective-dated mock assignments
**Provide:** authoritative sources for the active OT operator, actor recorded on relevant ERP evidence, operation supervisor, technical leader, material planner, warehouse sender or dispatcher, process-team positions, shifts, and effective time. Identify which values already exist in EmusaSoft and which must be maintained only in Monitor's Operational Responsibility Roster.

**Acceptance:** anonymized cases resolve each required standardized position to evidence or explicitly to the Monitor roster, without notifying every user in a warehouse or inferred zone.

### ES-05 — Resolve the immutable extrusion opening-inventory source

**Priority:** required for Phase 10 acceptance of E02–E04; local work uses fixtures and excludes unsupported production rules
**Provide:** confirm whether the opening quantity for each `locationId + articleId` is persisted immutably through `WorkOrderMaterial.quantityIncoming`, a separate snapshot, or another stored field or record. If it does not exist, the EmusaSoft team must expose an immutable read-visible record; Monitor will not write it.

**Acceptance:** two consecutive extrusion or Exlam OTs can reproduce opening, additions, closing, and recipe proportions from immutable evidence.

### ES-06 — No supported frontend deep-link contract

**Status:** answered by the architect through the product owner on 2026-07-21

EmusaSoft exposes GraphQL data operations but no supported frontend route patterns for Monitor. GraphQL operations are not browser links. Monitor therefore displays ERP identifiers and evidence inside Monitor and does not promise `Ver orden de trabajo` or similar navigation. A future supported navigation contract would be optional new scope, not a Phase 1–9 dependency.

### ES-07 — Superseded: no `emusa-ui` dependency

**Status:** closed as superseded by the 2026-07-20 product direction

Monitor must use Material UI with the Monitor-owned tokens and rules in `docs/design/`. It must not import, connect to, or depend on `emusa-ui`. No EmusaSoft delivery is required for this item.

## EmusaSoft MCP implementation team

### MCP-01 — Regenerate and publish the ERP catalog

**Priority:** immediate
**Fix:** regenerate the catalog from the current production schema and GraphQL contract. The catalog generated on 2026-07-13 contains 345 SQL tables, while the 2026-07-16 production dump contains 363. Include source revision, schema source, generation timestamp, generator version, and a machine-readable drift summary.

**Acceptance:** catalog counts and named objects reconcile with the approved current schema, or every intentional exclusion is documented.

### MCP-02 — Restore GraphQL document validation

**Priority:** immediate
**Fix:** `erp_validate_graphql` currently returns `schema unavailable` even though authenticated `erp_run_graphql` succeeds. Load the same versioned schema used to build the catalog and report its version in validation results.

**Acceptance:** valid catalog examples pass; invalid fields, arguments, enums, and nullability fail with source locations; validation performs no network mutation or execution.

### MCP-03 — Describe GraphQL input objects, enums, unions, and returned helper types

**Priority:** required before adapter implementation
**Fix:** make `erp_describe` resolve types such as `QueryGetWorkOrdersInput`, `OptionsInput`, and operation-specific return/helper types such as `ExtrusionContainerInventory`, including fields, nullability, defaults, and enum values.

**Acceptance:** a developer can construct and validate a nontrivial query using only catalog discovery, without guessing input shapes.

### MCP-04 — Improve exact-name and domain search coverage

**Priority:** normal
**Fix:** exact searches for known work-order, scale-load, material-flow, and article-serial surfaces should rank the exact operation or entity first. Preserve natural-language search but add deterministic exact-name matching and aliases for SQL, GraphQL, and English/Spanish domain terms.

**Acceptance:** a published search fixture suite returns the expected exact object first for Monitor's documented source inventory.

### MCP-05 — Expose versioned non-GraphQL integration resources

**Priority:** useful for Phase 10 verification
**Fix:** publish read-only MCP resources or catalog entries for the approved detection-query contract format, current schema/catalog revision, read-endpoint capability summary, and replica-freshness mechanism. Do not expose credentials or internal Redis details.

**Acceptance:** MCP identifies the current versions and retrieves sanitized examples matching ES-01 and ES-02 without claiming that a stale generated catalog proves the live schema.

### MCP-06 — Add sanitized representative read examples

**Priority:** useful for Phase 10 contract reconciliation; Phase 1 fixtures come from protected local/sample data
**Fix:** provide non-production examples for identity, work orders, material reservations and consumption, material flows, article serials, scale records, equipment pauses, warehouses, recipe snapshots, and extrusion containers.

**Acceptance:** each example validates against the same catalog version, contains no personal or operational secrets, and can seed Monitor's contract-test fixtures.

## Monitor-team tracking rule

Each implementation item must record owner, target environment, delivery date, contract version, evidence link, validation result, and the affected Phase 10 acceptance test. A verbal confirmation can settle a product constraint such as the absence of frontend routes, but access, schema, query, authentication, and data claims require the stated acceptance test and a versioned artifact suitable for automated contract tests.
