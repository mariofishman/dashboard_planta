# Monitor: Architecture and Production Roadmap

> **Scope:** This is the canonical technical roadmap for the product defined in `product_definition.md`. It sequences engineering work; it does not redefine the four main product screens or the alert rules in `alert_catalog.md`.

**System:** Monitor — Dashboard, Chats, Errors, Alerts, and Operational Responsibility Roster

**Version:** 2.1

**Status:** Active; Phases 0–4 and 4A complete locally; Phase 4B is next

**Roadmap date:** 2026-07-22

**Supersedes:** [Version 1.2](archive/monitor_architecture_and_production_roadmap_v1.md)

**Open integration register:** [requests](emusasoft_preimplementation_requests.md) and [responses](emusasoft_preimplementation_responses.md)

## 1. Why Version Two exists

Version One successfully guided the local foundation through Phase 4, but three facts now require a revised sequence:

1. Phase 4 proved the incident lifecycle with fixtures and seeded incidents, but it did not prove that a changing source record travels through polling, evaluation, incident creation, resolution, recurrence, and the live UI.
2. The original Phase 4 dashboard was functionally connected but required a complete visual and interaction redesign.
3. The first roadmap did not assign every remaining alert code, dynamic scenario extension, external dependency, and production-promotion gate precisely enough.

Version Two preserves completed work. It adds Phase 4A for the dashboard redesign, Phase 4B for a local dynamic source laboratory, and explicit implementation and promotion gates for every active alert code. Dashboard V2 completed Phase 4A and was accepted as a good first version on 2026-07-22; this approval does not start or modify Phase 4B.

## 2. Strategy

### Diagnosis

Monitor must detect operational problems from EmusaSoft without writing to EmusaSoft. Static fixtures prove rule calculations, but not the time-based behavior of an alert system. The remaining risk is the complete transition from a source change to a visible alert and back to resolution, including polling delay, failures, recurrence, routing, and multi-user updates. Several production contracts also remain dependent on EmusaSoft or MCP work that is not yet deployed.

### Guiding policies

- Preserve the accepted Phases 0–4 foundation; do not restart the implementation.
- Build Phases 1–9 locally with mock identities, synthetic fixtures, a disposable mutable source, and protected local/sample databases.
- Test dynamic behavior by changing the simulated source, never by inserting directly into Monitor's incident tables.
- Never mutate the protected EmusaSoft backup.
- Keep scenarios deterministic, resettable, observable, and suitable for both automated tests and simple manual testing.
- Promote rules individually. An unresolved source contract blocks only the affected rule, not unrelated local work.
- Treat a successful complete read from the EmusaSoft replica as current truth. Failed, partial, truncated, invalid, or timed-out reads preserve existing incident state.
- Keep the standard Phase 0 technical kit. Add no queue, broker, EmusaSoft write path, adjustment API, or EmusaSoft UI-library dependency.
- Defer real EmusaSoft authentication, Aurora access, current-schema/load validation, staging, pilot, and deployment to Phase 10.

### Ordered actions

1. Preserve the completed and approved Dashboard V2 work from Phase 4A.
2. Next, add the dynamic local scenario laboratory and validate the Phase 4 vertical slice in Phase 4B.
3. Build routing and the roster, then conversations, using those dynamic incidents.
4. Implement and dynamically validate the remaining deterministic and statistical rules.
5. Complete local acceptance and hardening.
6. Integrate with EmusaSoft staging, run a controlled pilot, and expand production gradually in Phase 10.

## 3. Architecture boundary

### 3.1 Ownership

- EmusaSoft owns operational transactions and corrections.
- Monitor owns detection schedules, condition state, incidents, evidence, conversations, routing, delivery records, reporting, and audit history.
- Monitor has its own database, API, client, deployment, and operational controls.
- Monitor never writes to EmusaSoft and never receives EmusaSoft write credentials.
- Users correct operational records in EmusaSoft. Monitor observes the later state and updates the incident accordingly.

### 3.2 Communication path

1. A Monitor scheduler runs a bounded, versioned, read-only query at the interval assigned to an alert rule.
2. A successful complete result is evaluated and reconciled with Monitor's prior condition state.
3. Incident, evidence, lifecycle, and change-event records commit together in Monitor's database.
4. After commit, Monitor publishes the change to connected clients through WebSockets.
5. Clients recover missed committed changes through the API using a cursor.
6. Redis coordinates live fan-out and presence when Monitor runs more than one instance; it is not the source of truth.

WebSockets remain appropriate because Monitor also supports bidirectional chat, receipts, presence, typing, and commands. The one-way incident update could technically use SSE, but using the existing authenticated WebSocket channel avoids a second client synchronization system. This choice does not affect how Monitor receives EmusaSoft data.

### 3.3 Source authority and failure behavior

In Phase 10, the existing Aurora read replica is Monitor's operational observation boundary. If a transaction is present in a successful complete replica read, Monitor treats it as true. If it is not present, Monitor treats it as not yet observable. Monitor does not delay decisions waiting for a separate replica-lag signal.

Replication and polling can delay when a correction becomes visible. The practical detection delay is approximately:

`replication delay + time until the next poll + query/evaluation time + client delivery time`

A timeout, connection failure, partial result, invalid schema, truncation, or other incomplete cycle cannot create false certainty and cannot resolve an existing incident. Monitor retains the prior state and exposes source unavailability through diagnostics.

### 3.4 Future event optimization

After the polling system is operating safely in production, EmusaSoft may add a transactional outbox, webhook, or replica-side change-data-capture event. That event would request targeted re-evaluation immediately after a relevant transaction, eliminating most of the wait for the next scheduled poll. The event is a speed signal, not the source of truth: Monitor still reads the authoritative replica, and scheduled polling remains the recovery mechanism for missed or duplicated events.

This optimization does not require redesigning incidents, rules, APIs, WebSockets, or the UI.

## 4. Completed foundation: Phases 0–4

| Phase | Result | Evidence |
|---|---|---|
| 0 — Contracts and technical decisions | Independent, read-only boundary and concrete technical kit proved locally | `phase0/README.md` |
| 1 — Data and rule contracts | All 21 active rules have versioned contracts and triggered, clear, and insufficient fixtures | `phase1/README.md` |
| 2 — Platform foundation | API, Monitor database, mock identity, authorization, observability, Redis adapter, WebSocket recovery, and application shell | `phase2/README.md` |
| 3 — Polling and recovery | Bounded scheduler, adapters, diagnostics, safe incomplete-cycle behavior, and local query-plan checks | `phase3/README.md` |
| 4 — Incident vertical slice | A02, A03, and A05 flow through evaluation, lifecycle, evidence, API, committed live change, and dashboard | `phase4/README.md` |
| 4A — Dashboard redesign | Approved compact Dashboard V2 connected to the existing authorized APIs and incident lifecycle | `phase4/README.md`, `archive/dashboard_v2_design_handoff.md` |

The Phase 4 functional gate was accepted on 2026-07-21. Dashboard V2 was accepted as a good first version on 2026-07-22, completing Phase 4A. Phase 4B and Phase 5 have not started.

## 5. Revised implementation sequence

### Phase 4A — Dashboard redesign

**Status:** Complete; accepted as a good first version on 2026-07-22

**Purpose:** Replace the unapproved Phase 4 visual and interaction direction while preserving the working backend and incident behavior.

**Deliverables:**

- an explicit dashboard information hierarchy and design direction;
- browser-reviewable desktop, tablet, and mobile states;
- clear open/resolved/closed-without-resolution presentation;
- filtering, grouping, analytics, authorized evidence access, loading, empty, unavailable, and recovery states;
- Spanish product copy, keyboard use, focus order, contrast, responsive behavior, and screen-reader labels;
- implementation connected to the existing authorized incident APIs and recovery channel; and
- regression coverage proving the redesign does not change incident semantics.

**Decision record:** Reusable visual and interaction preferences are consolidated in `design/design.md`; Monitor-specific behavior is consolidated in `ux_ui_decisions.md`; the completed research and rejected alternatives are preserved in `archive/dashboard_v2_design_handoff.md`.

**Exit gate:** Satisfied on 2026-07-22. The user approved Dashboard V2 as a good first version, and the connected implementation passed functional, responsive, token-contract, and recovery regression checks.

### Phase 4B — Dynamic local source validation

**Estimated effort:** 3–5 working days

**Purpose:** Prove that source changes, not prewritten incident rows, drive the complete alert lifecycle.

**Deliverables:**

- a disposable mutable EmusaSoft source simulator behind the existing read-adapter boundary;
- local scenarios for A02, A03, and A05;
- an extremely simple development/test-only scenario UI;
- controls to trigger a problem, correct it, reset the scenario, and advance simulated time where required;
- visible source-action time, latest poll result, incident state, and measured detection delay;
- deterministic automated lifecycle tests; and
- manual browser validation of live delivery and cursor recovery.

The scenario UI may, for example, create an opening work order without required material, move its scheduled start time, provide the missing material evidence, or create a closing mismatch. Each action changes the simulated source tables. The normal scheduler must then poll, evaluate, persist, and publish the result. The UI must never create, resolve, or reopen an incident directly.

Every scenario must prove:

1. clean source state produces no open incident;
2. a source change creates a problem;
3. the next successful poll opens one incident;
4. repeated polls do not duplicate it;
5. a source correction resolves it on a later successful poll;
6. an incomplete or failed poll does not resolve it; and
7. recurrence after correction creates a new occurrence with preserved history.

The simulator and scenario endpoints must be impossible to enable in staging or production. The protected backup remains read-only.

**Exit gate:** Automated and manual tests prove the full source-to-screen lifecycle for A02, A03, and A05, including failure preservation, recurrence, live updates, reconnect, and resettable scenarios.

### Phase 5 — Operational Responsibility Roster, routing, and notifications

**Estimated effort:** 2–4 weeks

**Prerequisite:** Phases 4A and 4B complete. The roster screen and workflow must be designed and approved before implementation.

**Deliverables:**

- Monitor-owned roles and per-alert access;
- roster assignments for standardized operational positions;
- effective dates, temporary replacements, conflicts, and audit history;
- deterministic application of all seven `General alert distribution` rules in `alert_catalog.md` and every code-specific override;
- OT operator or recorded actor supplementation where required;
- deduplication and delivery records;
- email to authorized Monitor administrators when a required roster assignment is missing or conflicting; and
- internal routing diagnostics without an ordinary user-facing error or broad fallback notification.

Monitor notifies every valid recipient it can resolve. It does not notify unrelated users merely because an assignment is missing.

**Dynamic validation:** Phase 4B scenarios must prove recipient changes, partial resolution, replacement dates, administrator email, retry, deduplication, and authorization.

**Exit gate:** Every catalog routing rule has deterministic automated evidence and a manual multi-user scenario.

### Phase 6 — Conversations and messages

**Estimated effort:** 3–5 weeks

**Deliverables:**

- incident conversations, messages, participants, and unread counts;
- committed message fan-out, cursor recovery, and multi-device consistency;
- read receipts, presence, and typing as policy permits;
- authorized history and server-side participant checks;
- notification integration; and
- dashboard, chat list, and chat detail synchronization.

**Entry decisions:** Before implementation, settle retention, attachments, moderation, edit/delete behavior, receipts, presence, search, offline behavior, and external notification policy. Provisional local implementations must remain replaceable until those decisions are recorded.

**Dynamic validation:** Generate conversations from Phase 4B incidents and test simultaneous users, reconnects, duplicate sends, authorization changes, and ordered recovery.

**Exit gate:** Authorized users can communicate around a dynamically created incident without losing or duplicating committed messages.

### Phase 7 — Deterministic closure, deadline, and balance rules

**Estimated effort:** 5–7 weeks

**Alert codes:** A01, B01, B02, B03, D01, D02, D03, and D04

**Deliverables:**

- production-quality evaluators for every assigned code;
- explicit decimal, unit, tolerance, time-window, closure, correlation, and reason behavior;
- complete evidence and subject references;
- relevant closed-without-resolution administrator workflows and read-only reporting; and
- a Phase 4B scenario extension for each code.

**Exit gate:** Every Phase 7 code passes triggered, persistent, corrected, resolved, insufficient, failed-cycle, recurrence, correlation, routing, and browser scenarios.

### Phase 8 — Capacity, statistical, physical, and operation-specific rules

**Estimated effort:** 5–9 weeks

**Alert codes:** A04, A06, A07, C01, C02, C06, E01, E02, E03, and E04

**Deliverables:**

- production-quality evaluators and scenario extensions;
- versioned formulas, thresholds, model inputs, sample requirements, and explanations;
- backtesting and simulated shadow mode;
- false-positive, false-negative, and insufficient-evidence reporting;
- capacity and physical-source contracts; and
- rule-level enable, disable, rollback, and model-version controls.

E02, E03, and E04 may be implemented and tested with synthetic snapshots, but they must remain disabled in staging and production until ES-05 proves immutable opening and closing inventory at the required work-order, container, resin, quantity, unit, operator, and time granularity.

**Exit gate:** Each code passes lifecycle validation and its additional statistical, physical, model-quality, or capacity gate. No unsupported rule is promoted merely because its local fixture passes.

### Phase 9 — Local acceptance and hardening

**Estimated effort:** 3–5 weeks

**Deliverables:**

- full journeys across Dashboard, Chats, Errors and Alerts, and the Operational Responsibility Roster;
- complete rule-promotion matrix and dependency evidence;
- cross-rule correlation, suppression, recurrence, and closed-without-resolution validation;
- routing, authorization, privacy, audit, and external-notification validation;
- dashboard report export in the approved format;
- accessibility, localization, responsive, and browser coverage;
- performance, recovery, load, fault-injection, and prolonged-downtime testing;
- backup, restore, migration rollback, deployment rollback, and rule kill switches; and
- operational runbooks and local acceptance evidence.

All Phase 9 acceptance uses mock identity, synthetic fixtures, the mutable local simulator, and protected local/sample data. It does not require real EmusaSoft credentials.

**Exit gate:** The complete local product is accepted, every rule has an explicit promotion status, and Phase 10 prerequisites are documented without hidden assumptions.

### Phase 10 — EmusaSoft integration, pilot, and production

**Estimated effort:** 5–9 weeks for integration and the initial pilot, followed by controlled expansion

#### Phase 10A — Staging integration

- replace mock identity with the EmusaSoft token-validation adapter;
- provision separate staging and production Monitor credentials for the existing Aurora read replica;
- prove the Monitor database account cannot write, execute DDL/procedures, or change privileges;
- validate current schema, soft-delete handling, time zones, stable keys, query plans, pagination, timeouts, concurrency, and observed load;
- use successful complete replica reads as authoritative without a separate lag gate;
- replay the dynamic scenarios through controlled staging transactions;
- validate all seven routing rules with staging identities;
- validate supported EmusaSoft deep links only if ES-06 is closed; otherwise display identifiers and evidence;
- run eligible statistical rules in shadow mode; and
- promote rules one at a time only after their source and quality gates pass.

ES-01 removes external approval of every individual query. Monitor still owns conservative bounded queries and must fix any safety or performance problem found in staging.

ES-03 requires a stable `sysUserId` and validation of token signature, issuer, audience, expiration, and ordinary lifetime. Monitor owns roles, per-alert access, and the roster. A validated token is trusted until its encoded expiry unless the contract later provides a stronger revocation mechanism.

#### Phase 10B — Controlled pilot

- enable an agreed subset of low-risk, fully validated rules;
- measure detection delay, query load, availability, routing success, false positives, false negatives, and recovery;
- complete user acceptance, training, support ownership, and rollback rehearsal; and
- hold the pilot for an agreed observation window before expansion.

#### Phase 10C — Production expansion

- expand plants, operations, users, and rules gradually;
- retain per-rule kill switches and rollback criteria;
- review service levels and capacity after each expansion; and
- consider the optional EmusaSoft event trigger only after the polling baseline is stable and measured.

**Exit gate:** The agreed production scope operates within approved safety, performance, detection, quality, and support limits, with rollback proven.

## 6. Alert-code implementation and promotion matrix

| Code | Implementation phase | Current local state | Additional staging/production gate |
|---|---:|---|---|
| A01 | 7 | Contract and fixtures complete | Current schema and bounded-query validation |
| A02 | 4 / 4B | Implemented; dynamic validation pending | Current schema and bounded-query validation |
| A03 | 4 / 4B | Implemented; dynamic validation pending | Current schema and bounded-query validation |
| A04 | 8 | Contract and fixtures complete | Capacity contract and current-schema validation |
| A05 | 4 / 4B | Implemented; dynamic validation pending | Current schema and bounded-query validation |
| A06 | 8 | Contract and fixtures complete | Formula/source and current-schema validation |
| A07 | 8 | Contract and fixtures complete | Formula/source and current-schema validation |
| B01 | 7 | Contract and fixtures complete | Current schema and bounded-query validation |
| B02 | 7 | Contract and fixtures complete | Current schema and bounded-query validation |
| B03 | 7 | Contract and fixtures complete | Current schema and bounded-query validation |
| C01 | 8 | Contract and fixtures complete | Model-quality, sample-size, and shadow-mode gate |
| C02 | 8 | Contract and fixtures complete | Model-quality, sample-size, and shadow-mode gate |
| C06 | 8 | Contract and fixtures complete | Model-quality, sample-size, and shadow-mode gate |
| D01 | 7 | Contract and fixtures complete | Current schema and bounded-query validation |
| D02 | 7 | Contract and fixtures complete | Current schema and bounded-query validation |
| D03 | 7 | Contract and fixtures complete | Current schema and bounded-query validation |
| D04 | 7 | Contract and fixtures complete | Current schema and bounded-query validation |
| E01 | 8 | Contract and fixtures complete | Physical-source and current-schema validation |
| E02 | 8 | Contract and synthetic fixtures complete | ES-05 immutable snapshots and current-schema validation |
| E03 | 8 | Contract and synthetic fixtures complete | ES-05 immutable snapshots and current-schema validation |
| E04 | 8 | Contract and synthetic fixtures complete | ES-05 immutable snapshots and current-schema validation |

All rules additionally require Phase 10 read access, safe-load evidence, identity/routing validation, and current MCP/schema reconciliation where relevant.

## 7. External dependency register

| Request | Current status | Roadmap consequence |
|---|---|---|
| ES-01 | Answered; staging validation pending | No external per-query approval; validate and tune in Phase 10A |
| ES-02 | Answered; staging validation pending | Existing Aurora replica, dedicated no-write credentials, no replica-lag gate |
| ES-03 | Answered; authentication validation pending | Mock adapter remains through Phase 9; replace and validate in Phase 10A |
| ES-04 | Answered; local validation pending | Implement all seven routing rules in Phase 5 |
| ES-05 | Open; database redesign and MCP verification pending | Blocks staging/production enablement of E02–E04 only |
| ES-06 | Open; MCP upgrade not visible | Blocks deep links only; identifiers and evidence remain supported |
| ES-07 | Closed as superseded | Monitor continues with its own Material UI layer |
| MCP-01 | Update developed, not deployed | Reverify version and schema after deployment |
| MCP-02–06 | Deferred until MCP-01 deployment | Reassess together against the same deployed catalog revision |

These open requests do not block Phases 4A–9. They gate only their affected Phase 10 validation or feature promotion.

## 8. Cross-cutting decisions before production

### 8.1 Polling persistence and retention

A frequent EmusaSoft polling interval can produce hundreds of identical observations for one unchanged condition. Those consultations are not useful incident history and must not create a new evidence row, lifecycle transition, or client change event when the condition and meaningful context have not changed. Elapsed age is derived from timestamps rather than repeated snapshots.

Monitor may update the condition state's latest healthy observation metadata without appending business history. Poll-cycle diagnostics are operational telemetry, not incident evidence, and require a bounded retention or aggregation policy rather than indefinite storage. Failed, partial, invalid, truncated, timed-out, or uncommitted cycles still preserve the last known incident state and enough diagnostic information to investigate recovery.

Before Phase 10 production polling:

1. write an ADR defining which fields belong in incident evidence, condition state, poll diagnostics, metrics, and logs;
2. define retention, aggregation, and deletion periods for successful and failed poll diagnostics;
3. estimate storage volume at proposed production polling cadences and validate it against the production budget;
4. retain regression tests proving unchanged healthy polls create no evidence row, transition, or incident-change event; and
5. prove operational diagnostics remain bounded without weakening freshness or lifecycle safety.

### 8.2 Contextual incident explanations

Catalog text explains a rule, but an operator also needs the specific work order, machine, shift, elapsed condition, and responsible role that caused the current occurrence. Static catalog copy may be too generic, while unconstrained generated text could invent facts or obscure evidence.

Every displayed explanation must be grounded only in the approved alert catalog, versioned rule result, and authorized incident evidence. It must distinguish unavailable facts from known facts, never infer a named person from a role or area, remain read-only, and retain a deterministic catalog-grounded fallback. Deterministic composition, an LLM, and a hybrid remain alternatives for evaluation; none is approved as the production mechanism yet.

Before selecting a production mechanism:

1. define a structured, versioned explanation input and output contract;
2. compare deterministic rule-specific composition, LLM-assisted generation, and a hybrid;
3. test representative A02, A03, and A05 cases followed by every production candidate rule;
4. score factual grounding, omissions, invented facts, readability, latency, cost, and incomplete-evidence behavior;
5. decide whether output is generated on read or change and whether it is cached, persisted, versioned, or regenerated; and
6. approve an ADR covering privacy, security, latency, cost, auditability, fallback behavior, and factual acceptance thresholds before any production LLM use.

## 9. Decision gates

- **Phase 4A exit:** satisfied by explicit user approval of Dashboard V2 on 2026-07-22.
- **Before Phase 5 implementation:** approval of the roster screen, workflows, permissions, effective-date behavior, and conflict presentation.
- **Before Phase 6 implementation:** decisions on retention, attachments, moderation, message mutation, receipts, presence, search, offline behavior, and external channels.
- **Before each Phase 10 rule promotion:** verified current schema, read-only access, bounded-query behavior, source completeness, routing, and rule-specific quality evidence.
- **Before E02–E04 staging or production:** ES-05 closed with immutable opening and closing snapshot evidence.
- **Before deep links:** ES-06 closed with a supported, versioned navigation contract.

No overall approval substitutes for these specific gates, and no unresolved MCP request requires local development to stop.

## 10. Initial production Definition of Done

The initial production implementation is complete only when:

- the agreed rules run against the existing Aurora replica using technically enforced read-only credentials;
- every enabled query is bounded, measured, observable, and safe under staging and pilot load;
- successful complete reads drive deterministic incident state, while failed or incomplete reads preserve prior state;
- unchanged healthy polling creates no repeated incident evidence, lifecycle transition, or client change event, and operational diagnostics follow an approved bounded retention policy;
- incidents retain explainable evidence, lifecycle, recurrence, correlation, and audit history;
- contextual explanations pass an approved grounding contract and deterministic fallback without requiring an unapproved generative service;
- authorized users receive committed updates and can recover missed changes;
- routing follows the catalog and roster without broad fallback notification;
- conversations remain ordered, authorized, durable, and recoverable;
- the four approved screens pass responsive and accessibility acceptance;
- detection delay, availability, delivery, false-positive, and false-negative objectives are measured and accepted;
- backup, restore, rollback, kill switches, monitoring, support, and incident-response procedures are proven; and
- Monitor contains no EmusaSoft write path, adjustment workflow, or unsupported link or source assumption.

## 11. Document control

- Version 1.2 is retained unchanged except for its archived status at `archive/monitor_architecture_and_production_roadmap_v1.md`.
- Version 2.1 is canonical at `monitor_architecture_and_production_roadmap.md`.
- `product_definition.md` governs product boundaries.
- `alert_catalog.md` governs alert logic, evidence, resolution, and distribution.
- `ux_ui_decisions.md` and approved design artifacts govern screen behavior and presentation.
- `emusasoft_preimplementation_requests.md` and `emusasoft_preimplementation_responses.md` remain active until their completion rule is met; they are not archived with Version One.
- Material changes to architecture, phase gates, or production scope require a dated roadmap revision rather than silent reinterpretation.
