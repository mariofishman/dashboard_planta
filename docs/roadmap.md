# Monitor: Architecture and Production Roadmap

> **Scope:** This is the canonical delivery roadmap for the product defined in `product/product_definition.md`. It sequences engineering work; it does not redefine product, alert, UX/UI, architecture, or integration decisions.

**System:** Monitor — Dashboard, Chats, Errors, Alerts, and Operational Responsibility Roster

**Version:** 3.0

**Status:** Active; Phases 0–5 complete; Phase 6 in progress; Phase 7 is blocked by the Phase 6 exit gate

**Roadmap date:** 2026-07-27

**Supersedes:** [Version 2.1](../archive/docs/roadmaps/monitor_architecture_and_production_roadmap_v2.md)

**Architecture:** [system architecture](architecture/system_architecture.md)

**Open integration register:** [EmusaSoft integration register](integrations/emusasoft/integration_register.md)

## 1. Why Version Three exists

Version Two guided the dynamic source laboratory, roster, routing, and initial conversation implementation. Review of that work identified three corrections that materially change the remaining sequence:

1. The Phase 4B laboratory changed synthetic source tables stored inside Monitor's own local database. That proved lifecycle behavior, but it did not adequately reproduce Monitor reading a separate foreign database with the same engine, schema, indexes, collations, and SQL behavior as EmusaSoft.
2. The development scenario screen is difficult to understand and does not yet provide the clear, business-level control and evidence required for acceptance.
3. The initial Phase 6 chat implementation does not have accepted visual parity with the approved chat-list and chat-detail prototypes.

Version Three preserves the completed work from Phases 0–5 and treats Phase 4B as historical. It expands Phase 6 to correct the local source boundary, rebuild the scenario laboratory, complete the conversation product, and establish the testing foundation used by Phases 7–9.

## 2. Canonical names

- **`soft_database`** — EmusaSoft's original operational database or approved read replica.
- **`backup_database`** — the protected backup supplied in this workspace. It is evidence and seed input only and must never be modified.
- **`test_database`** — a disposable local database reconstructed to match the verified engine, schema, version, indexes, collations, and relevant SQL settings of `soft_database`.
- **`alertas_fake`** — the development/test-only application that changes controlled source records in `test_database`. It never creates or changes Monitor incidents directly.
- **Monitor database** — Monitor's independent PostgreSQL database containing incidents, routing, conversations, messages, audit, and other Monitor-owned state.

The project currently documents `soft_database` as Aurora MySQL. The database engine and compatibility details must be confirmed with authoritative EmusaSoft evidence before `test_database` is provisioned. PostgreSQL remains the approved Monitor-owned database.

## 3. Strategy

### Diagnosis

Monitor must prove that realistic changes in a separate EmusaSoft-shaped source database travel through scheduled read-only polling, evaluation, incident lifecycle, routing, conversations, and the visible product. The test interface must make that journey understandable, deterministic, resettable, and repeatable. The accepted prototypes must remain the visual baseline for the chat list, chat detail, and incident components.

### Guiding policies

- Preserve completed Phases 0–5; do not rewrite accepted roster, routing, incident, or dashboard foundations.
- Keep the source boundary real: `alertas_fake` writes `test_database`; Monitor only reads it.
- Keep Monitor's PostgreSQL database independent from all simulated EmusaSoft source records.
- Never mutate `backup_database`.
- Rebuild `test_database` through a versioned reset/import process rather than manual edits.
- Match `soft_database` only from verified evidence. Record every unknown or approximation explicitly.
- Use automatic scheduled polling as the normal path. A development-only “poll now” control may invoke the same poller, but it may not create, resolve, or reopen an incident directly.
- Keep scenarios deterministic, observable, and suitable for automated and manual testing.
- Keep UI review independent from unfinished source integration by using stable mock data where necessary. UI-only tests do not constitute backend acceptance.
- Explain every deviation from the approved chat prototypes before asking the user to accept it.
- Promote alert rules individually. A missing source contract blocks only the affected rule.
- Keep production credentials, networking, live authorization, Aurora behavior where applicable, replica behavior, production load, pilot, and deployment in Phase 10.

### Ordered actions

1. Preserve the accepted foundation through Phase 5.
2. Complete Phase 6 in parallel workstreams: source-database discovery, `test_database` and `alertas_fake`, and chat UI correction.
3. Pass the complete A02, A03, and A05 source-to-dashboard-to-conversation gate.
4. Implement and dynamically validate the Phase 7 and Phase 8 rules against the same separate test-source boundary.
5. Complete local acceptance and hardening in Phase 9.
6. Reconcile the local test model with the current live EmusaSoft environment, pilot safely, and expand gradually in Phase 10.

## 4. Completed foundation

| Phase | Status | Result |
|---|---|---|
| 0 — Contracts and technical decisions | Complete | Independent read-only boundary and technical kit |
| 1 — Data and rule contracts | Complete | Versioned contracts and fixtures for approved rules; E05 remains a later executable-contract item |
| 2 — Platform foundation | Complete | API, Monitor database, mock identity, authorization, recovery, and application shell |
| 3 — Polling and recovery | Complete | Bounded scheduler, adapters, diagnostics, and safe incomplete-cycle behavior |
| 4 — Incident vertical slice | Complete | A02, A03, and A05 evaluator and incident lifecycle |
| 4A — Dashboard redesign | Complete and accepted | Connected Dashboard V2 |
| 4B — Dynamic local source validation | Historical completion | Synthetic source-to-screen lifecycle evidence; did not prove a separate source database equivalent to `soft_database` |
| 5 — Roster, routing, and notifications | Complete and approved | Durable roster, rotation, routing, delivery, retry, diagnostics, and multi-user evidence |

Phase 5 remains complete. Its dynamic routing behavior will receive additional end-to-end coverage through the new Phase 6 environment; that coverage does not reopen Phase 5.

## 5. Phase 6 — Source-compatible testing, conversations, and messages

**Status:** In progress. Conversation backend work exists locally; source-boundary correction, scenario redesign, UI acceptance, and complete integration evidence remain.

**Purpose:** Establish the correct separate-database testing architecture and deliver accepted conversations and messages driven by realistically detected A02, A03, and A05 incidents.

### 5.1 Workstream A — `soft_database` discovery

- Confirm the database product, engine, exact version, and Aurora compatibility/version where applicable.
- Obtain authoritative schema definitions for every table, view, and relationship needed by A02, A03, and A05.
- Obtain column types, defaults, generated values, primary keys, foreign keys, unique/check constraints, indexes, character sets, collations, case behavior, time zone, and relevant SQL settings.
- Identify relevant views, functions, procedures, triggers, or scheduled events that affect the source records Monitor reads.
- Obtain safe representative query-plan evidence and source lifecycle/soft-delete conventions.
- Prefer a sanitized schema-only dump and catalog metadata exports. Do not request production credentials or unnecessary personal or operational data.
- Record which claims come from documentation, MCP, `backup_database`, or direct database-master confirmation.

The EmusaSoft MCP is useful for discovering entities, fields, types, relationships, GraphQL operations, and examples. It does not currently prove the live database engine/version, complete SQL DDL, indexes, collations, character sets, or server settings.

### 5.2 Workstream B — Build and reset `test_database`

- Provision `test_database` using the verified database engine and compatibility version.
- Reproduce the required schema, constraints, indexes, collations, and relevant settings.
- Import the required protected source state from `backup_database` without modifying the backup.
- Provide a deterministic script that destroys and recreates only the explicitly configured disposable `test_database`, then restores the equivalent baseline state from `backup_database`.
- Validate row counts, keys, relationships, representative values, and checksums or equivalent reconciliation evidence after every reset.
- Use separate credentials: a test-only writer for `alertas_fake` and a technically read-only account for Monitor.
- Prove that the Monitor account cannot write, execute DDL, or change privileges in `test_database`.
- Document any unavoidable difference between `test_database` and `soft_database`.

### 5.3 Workstream C — Redesign `alertas_fake`

The redesign covers only A02, A03, and A05.

For each scenario, define in simple business language:

- the clean starting state;
- the action performed by the tester;
- the exact source records changed in `test_database`;
- the expected next successful poll;
- the expected incident, routing, dashboard, and conversation result;
- how correction and resolution work;
- how recurrence is created without losing history;
- how incomplete data and failed reads preserve the prior incident state; and
- how the scenario returns to its baseline.

`alertas_fake` must show the source state, most recent action, last poll result, expected result, actual incident state, and measured delay clearly. It may write only to `test_database`. It must never write Monitor incidents, conversations, or messages.

### 5.4 Workstream D — Remove the incorrect synthetic source boundary

- Run every A02, A03, and A05 lifecycle through `test_database` and the normal polling adapter.
- Compare the observed business outcomes with the approved rule contracts: trigger, persistence, deduplication, correction, resolution, failed-cycle preservation, and recurrence.
- Confirm routing, dashboard publication, conversation creation/reuse, and cursor recovery.
- Only after the replacement path passes, remove the operational simulator adapter and synthetic EmusaSoft source tables from Monitor's database.
- Keep small deterministic unit-test fixtures where useful; they are not an operational foreign-database simulator.

### 5.5 Workstream E — Conversation backend and business behavior

- Persistent incident conversations, messages, participants, unread counts, receipts, and cursor pagination.
- Exact-participant-set reuse so a new incident reuses an existing conversation with the same participant set.
- No one-conversation-per-incident rule; one conversation may contain multiple incident cards over time.
- Routine shift or assignment changes do not remove existing participants.
- Administrators can access all conversations through an explicit mode and can add or remove active workers.
- Removing a worker from the roster or making the worker inactive blocks Monitor access entirely.
- One-hour read-only delay after the last associated incident resolves; reopening or a matching new incident restores writing.
- Server-side authorization, duplicate-command protection, edit/delete policy, attachments, notifications, presence, typing, reconnect recovery, and audit behavior as defined in the Phase 6 business rules.

### 5.6 Workstream F — Chat UI audit, decisions, and correction

- Use the current `chat-list-final.html` and `chat-detail.html` prototypes as the requested visual baseline.
- Compare every graphical and interaction difference in the implemented chat list and chat detail.
- Include layout, density, dimensions, typography, colors, borders, shadows, spacing, controls, responsive behavior, chat rows, message bubbles, and incident components in both the list and message stream.
- Explain each divergence with evidence. Distinguish a binding product/technical requirement from an unsupported implementation choice or mistake.
- Present differences for user decisions before changing the design.
- Implement only the adaptations the user approves.
- Use stable mock data for visual testing while source integration is incomplete. Clearly label those results as UI-only evidence.

### 5.7 Phase 6 acceptance

A02, A03, and A05 must each prove:

1. a reset produces the verified baseline;
2. an `alertas_fake` action changes only `test_database`;
3. automatic Monitor polling reads through the read-only source adapter;
4. the next successful complete read creates or updates exactly one incident;
5. repeated successful polls do not duplicate evidence, incidents, routing delivery, conversations, or incident cards;
6. dashboard, chat list, and chat detail receive the committed update;
7. correction resolves the incident on a later successful poll;
8. incomplete or failed reads preserve prior state;
9. recurrence creates a new occurrence while preserving history;
10. exact participant sets reuse the correct conversation;
11. simultaneous users, reconnects, ordered recovery, duplicate sends, permissions, participant removal, pagination, unread counts, and receipts behave correctly; and
12. the accepted chat UI passes desktop, tablet, mobile, keyboard, accessibility, and visual review.

**Exit gate:** Phase 6 is complete only when the source-database boundary, reset process, A02/A03/A05 lifecycle, routing, dashboard, conversations, and accepted UI all pass automated and manual evidence and the user accepts the interfaces. Phase 7 may not start before this gate.

## 6. Phase 7 — Deterministic closure, deadline, and balance rules

**Alert codes:** A01, B01, B02, B03, D01, D02, D03, and D04

**Deliverables:**

- production-quality evaluators for every assigned code;
- explicit decimal, unit, tolerance, time-window, closure, correlation, and reason behavior;
- complete evidence and subject references;
- relevant closed-without-resolution administrator workflows and read-only reporting;
- an approved `alertas_fake` scenario for each code that changes realistic source records in `test_database`; and
- source-compatible query, lifecycle, routing, dashboard, and conversation evidence.

**Exit gate:** Every Phase 7 code passes triggered, persistent, corrected, resolved, insufficient, failed-cycle, recurrence, correlation, routing, dashboard, conversation, and browser scenarios through the separate `test_database` boundary.

## 7. Phase 8 — Capacity, statistical, physical, and operation-specific rules

**Alert codes:** A04, A06, A07, C01, C02, C06, E01, E02, E03, E04, and E05

**Deliverables:**

- production-quality evaluators and `test_database` scenario extensions;
- versioned formulas, thresholds, model inputs, sample requirements, and explanations;
- backtesting and simulated shadow mode;
- false-positive, false-negative, and insufficient-evidence reporting;
- capacity and physical-source contracts; and
- rule-level enable, disable, rollback, and model-version controls.

If a rule's required source does not yet exist in `soft_database`, synthetic snapshots may be used for rule development only. They must be clearly separated from the source-compatible acceptance path and cannot satisfy a production-promotion gate.

E02, E03, and E04 remain disabled in staging and production until ES2-05 proves immutable opening and closing inventory at the required work-order, container, resin, quantity, unit, operator, and time granularity.

**Exit gate:** Each code passes the lifecycle gate and its additional statistical, physical, model-quality, capacity, and source-compatibility requirements. Unsupported rules remain explicitly blocked.

## 8. Phase 9 — Local acceptance and hardening

**Deliverables:**

- full journeys across Dashboard, Chats, Errors and Alerts, and the Operational Responsibility Roster;
- repeatable `test_database` reset, migration, reconciliation, and failure-recovery evidence;
- complete rule-promotion matrix and dependency evidence;
- cross-rule correlation, suppression, recurrence, and closed-without-resolution validation;
- routing, authorization, privacy, audit, and external-notification validation;
- accessibility, localization, responsive, and browser coverage;
- performance, recovery, load, fault-injection, and prolonged-downtime testing;
- Monitor database backup/restore, migration rollback, deployment rollback, and rule kill switches; and
- operational runbooks and local acceptance evidence.

Phase 9 uses mock identity, `test_database`, protected `backup_database`, and clearly labeled unit fixtures. It does not require production credentials, but it must not rely on synthetic source tables inside Monitor's database.

**Exit gate:** The complete local product is accepted, the resettable source-compatible environment is proven, every rule has an explicit promotion status, and Phase 10 prerequisites contain no hidden assumptions.

## 9. Phase 10 — EmusaSoft integration, pilot, and production

### Phase 10A — Live/staging integration

- replace mock identity with the EmusaSoft token-validation adapter;
- provision separate staging and production read-only Monitor credentials;
- confirm the current live database engine, version, schema, collations, settings, soft-delete behavior, time zones, and permitted objects;
- automatically compare the current live source contract with `test_database` and resolve material drift;
- prove the Monitor account cannot write, execute DDL/procedures, or change privileges;
- validate live query plans, indexes used, pagination, timeouts, concurrency, schedule, replica behavior, and measured load;
- replay approved scenarios through controlled staging mechanisms only where EmusaSoft authorizes them;
- validate routing with staging identities;
- run eligible statistical rules in shadow mode; and
- promote rules one at a time after source, quality, safety, and user-acceptance gates pass.

Local `test_database` evidence reduces Phase 10 uncertainty but cannot prove credentials, networking, managed-database behavior, replica freshness, production data distribution, permissions, or production load.

### Phase 10B — Controlled pilot

- enable an agreed subset of low-risk, fully validated rules;
- measure detection delay, query load, availability, routing success, false positives, false negatives, and recovery;
- complete user acceptance, training, support ownership, and rollback rehearsal; and
- hold the pilot for an agreed observation window before expansion.

### Phase 10C — Production expansion

- expand plants, operations, users, and rules gradually;
- retain per-rule kill switches and rollback criteria;
- review service levels and capacity after each expansion; and
- consider event-driven optimization only after the polling baseline is stable and measured.

**Exit gate:** The agreed production scope operates within approved safety, performance, detection, quality, and support limits, with rollback proven.

## 10. Alert-code implementation and promotion matrix

| Code | Implementation phase | Current local state | Additional live gate |
|---|---:|---|---|
| A01 | 7 | Contract and fixtures complete | Current source and bounded-query validation |
| A02 | 4 / 6 | Evaluator implemented; `test_database` validation pending | Live source reconciliation and load validation |
| A03 | 4 / 6 | Evaluator implemented; `test_database` validation pending | Live source reconciliation and load validation |
| A04 | 8 | Contract and fixtures complete | Capacity contract and current-source validation |
| A05 | 4 / 6 | Evaluator implemented; `test_database` validation pending | Live source reconciliation and load validation |
| A06 | 8 | Contract and fixtures complete | Formula/source and current-source validation |
| A07 | 8 | Contract and fixtures complete | Formula/source and current-source validation |
| B01 | 7 | Contract and fixtures complete | Current source and bounded-query validation |
| B02 | 7 | Contract and fixtures complete | Current source and bounded-query validation |
| B03 | 7 | Contract and fixtures complete | Current source and bounded-query validation |
| C01 | 8 | Contract and fixtures complete | Model-quality, sample-size, and shadow-mode gate |
| C02 | 8 | Contract and fixtures complete | Model-quality, sample-size, and shadow-mode gate |
| C06 | 8 | Contract and fixtures complete | Model-quality, sample-size, and shadow-mode gate |
| D01 | 7 | Contract and fixtures complete | Current source and bounded-query validation |
| D02 | 7 | Contract and fixtures complete | Current source and bounded-query validation |
| D03 | 7 | Contract and fixtures complete | Current source and bounded-query validation |
| D04 | 7 | Contract and fixtures complete | Current source and bounded-query validation |
| E01 | 8 | Contract and fixtures complete | Physical-source and current-source validation |
| E02 | 8 | Contract and synthetic fixtures complete | ES2-05 immutable snapshots and current-source validation |
| E03 | 8 | Contract and synthetic fixtures complete | ES2-05 immutable snapshots and current-source validation |
| E04 | 8 | Contract and synthetic fixtures complete | ES2-05 immutable snapshots and current-source validation |
| E05 | 8 | Approved catalog rule; executable contract pending | Closure-snapshot semantics and current-source validation |

All enabled rules additionally require live read access, safe-load evidence, identity/routing validation, and current source reconciliation.

## 11. External dependencies and decision gates

The EmusaSoft integration register remains the authority for external work.

- Database-engine, version, DDL, index, collation, and settings evidence now gates faithful construction of `test_database`.
- Missing source metadata does not block the parallel Phase 6 UI audit.
- Before removing Monitor's synthetic source tables, the replacement A02/A03/A05 path must pass.
- Before Phase 7, the complete Phase 6 exit gate must pass.
- Before each live rule promotion, current source, read-only access, bounded-query behavior, source completeness, routing, and rule-specific quality must pass.
- Before E02–E04 staging or production, ES2-05 must close.
- Before supported deep links, ES2-06 must close.

No overall approval substitutes for these specific gates.

## 12. Initial production Definition of Done

The initial production implementation is complete only when:

- the agreed rules run against the approved EmusaSoft source using technically enforced read-only credentials;
- every enabled query is source-compatible, bounded, measured, observable, and safe under staging and pilot load;
- successful complete reads drive deterministic incident state while failed or incomplete reads preserve prior state;
- unchanged healthy polling creates no repeated incident evidence, transition, delivery, conversation, or client event;
- incidents retain explainable evidence, lifecycle, recurrence, correlation, routing, and audit history;
- authorized users receive committed updates and recover missed changes;
- conversations remain ordered, authorized, durable, paginated, and recoverable;
- the approved screens pass responsive, accessibility, localization, and visual acceptance;
- detection delay, availability, delivery, false-positive, and false-negative objectives are measured and accepted;
- backup, restore, reset, rollback, kill switches, monitoring, support, and incident-response procedures are proven; and
- Monitor contains no EmusaSoft write path, production simulator, adjustment workflow, unsupported link, or unsupported source assumption.

## 13. Document control

- Version 1.2 is historical at `../archive/docs/roadmaps/monitor_architecture_and_production_roadmap_v1.md`.
- Version 2.1 is historical at `../archive/docs/roadmaps/monitor_architecture_and_production_roadmap_v2.md`.
- Version 3.0 is canonical at `roadmap.md`.
- `product/product_definition.md` governs product boundaries.
- `product/alert_catalog.md` governs alert logic, evidence, resolution, and distribution.
- `product/ux_ui_decisions.md` and approved design artifacts govern screen behavior and presentation.
- `architecture/system_architecture.md` governs the stable system boundary.
- `integrations/emusasoft/integration_register.md` governs external dependency status.
- Material changes to architecture, phase gates, or production scope require a dated roadmap revision rather than silent reinterpretation.
