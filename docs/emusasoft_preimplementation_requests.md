# EmusaSoft and MCP Pre-implementation Requests

**Status:** active delivery-dependency register

**Owner:** Monitor project lead
**Purpose:** give the EmusaSoft product/engineering team and the EmusaSoft MCP implementation team a finite, testable list of inputs required by the Monitor roadmap.

These requests do not change Monitor's approved boundary. Monitor remains an independent system, never writes to EmusaSoft, and owns its incidents, evidence, conversations, messages, roster, and audit history. Phase 0 may begin immediately; a dependent feature may not pass its roadmap exit gate until its listed acceptance criteria are satisfied.

## EmusaSoft product and engineering team

### ES-01 — Publish the SSE contract

**Priority:** blocking Phase 3
**Provide:** endpoint by environment, service authentication, event type and version, globally unique event ID, affected entity and ID, plant ID, occurrence and publication timestamps, cursor or `Last-Event-ID`, heartbeat behavior, ordering and duplicate guarantees, retention and replay limits, reconnection expectations, payload examples, ownership, and change procedure.

**Acceptance:** Monitor can consume a staging event, disconnect, resume from its cursor, deduplicate a replayed event, and reconcile the affected record through read-only access.

### ES-02 — Provision and document read-only reconciliation access

**Priority:** blocking Phase 3
**Provide:** environment-specific no-write credentials, approved replica or endpoint, permitted schemas/tables/views, connection limits, time zone, soft-delete rules, indexed incremental-query fields, representative query plans, maintenance expectations, and credential rotation procedure.

**Acceptance:** automated tests prove that Monitor can execute approved bounded reads and cannot perform inserts, updates, deletes, DDL, procedures, or privilege changes.

### ES-03 — Confirm the identity and session integration

**Priority:** blocking Phase 2
**Provide:** supported SSO or token-exchange flow, identity claims, stable mapping to `sysUserId`, plant membership and scope rules, disabled-user behavior, permission-revocation timing, service-to-service verification, and non-production test identities.

**Acceptance:** a staging user authenticates into Monitor, maps to exactly one enabled `sysUserId`, receives server-calculated plant scope, and loses access after revocation within the agreed interval.

### ES-04 — Confirm operational actor and routing evidence

**Priority:** blocking Phase 5
**Provide:** authoritative sources for the active OT operator, event actor, operation supervisor, technical leader, material planner, warehouse sender or dispatcher, process-team positions, shifts, and effective time. Identify which values already exist in EmusaSoft and which must be maintained only in Monitor's Operational Responsibility Roster.

**Acceptance:** anonymized cases resolve each required standardized position to evidence or explicitly to the Monitor roster, without notifying every user in a warehouse or inferred zone.

### ES-05 — Resolve the immutable extrusion opening-inventory source

**Priority:** blocking E02–E04 in Phase 8
**Provide:** confirm whether the opening quantity for each `locationId + articleId` is persisted immutably through `WorkOrderMaterial.quantityIncoming`, a separate snapshot, or another field/event. If it does not exist, the EmusaSoft team must expose an immutable read-visible record or event; Monitor will not write it.

**Acceptance:** two consecutive extrusion or Exlam OTs can reproduce opening, additions, closing, and recipe proportions from immutable evidence.

### ES-06 — Publish stable deep-link patterns

**Priority:** blocking production navigation
**Provide:** environment-aware URL patterns and authorization behavior for work orders, production orders, documents, material flows, serials, scale loads, warehouses, and equipment.

**Acceptance:** every supported Monitor evidence link opens the correct authorized EmusaSoft record and handles missing or inaccessible records safely.

### ES-07 — Publish the `emusa-ui` consumption contract

**Priority:** required during Phase 0
**Provide:** package or registry access, supported framework/runtime versions, semantic-version policy, Storybook access, theme and token extension points, accessibility support level, release notes, deprecation policy, and an owner for component defects.

**Acceptance:** Monitor imports a pinned core component through its adapter layer, applies Monitor tokens without forking the component, and passes a basic accessibility and production-build check.

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

**Priority:** blocking reliable MCP-based verification of Phase 0
**Fix:** publish read-only MCP resources or catalog entries for the approved SSE schema, example events, authentication summary, replay contract, deep-link patterns, and `emusa-ui` package/version metadata. Do not expose secrets or internal Redis credentials.

**Acceptance:** MCP can identify the current contract version and retrieve sanitized examples that match the contracts supplied under ES-01, ES-06, and ES-07.

### MCP-06 — Add sanitized representative read examples

**Priority:** required before Phase 1 fixtures
**Fix:** provide non-production examples for identity, work orders, material reservations and consumption, material flows, article serials, scale records, equipment pauses, warehouses, recipe snapshots, and extrusion containers.

**Acceptance:** each example validates against the same catalog version, contains no personal or operational secrets, and can seed Monitor's contract-test fixtures.

## Monitor-team tracking rule

Each item must record owner, target environment, delivery date, contract version, evidence link, validation result, and affected roadmap phase. A verbal confirmation does not close an item. Closure requires the stated acceptance test and a versioned artifact suitable for automated contract tests.
