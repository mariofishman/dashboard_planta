# Monitor–EmusaSoft Integration Architecture

**Date:** 2026-07-23
**Status:** approved integration architecture; supersedes the SSE transport decision recorded on 2026-07-19
**Owner:** Monitor project lead
**Counterpart:** EmusaSoft architecture

## 1. Integration model

Monitor runs a condition-based detection engine against an approved read-only EmusaSoft Aurora MySQL replica:

1. Each alert type has one approved SQL detection-query contract: a bounded predicate over current ERP state.
2. A Monitor-owned scheduler runs each query at its configured interval.
3. Local development assigns a provisional interval from alert urgency and measured sample-data performance. Phase 10 reconciles it with EmusaSoft's approved replica load budget. The interval remains versioned Monitor configuration, not an alert-catalog rule or user-facing setting.
4. Each returned row identifies one active condition through its alert type, query ID, and declared natural-key values.
5. A continuing condition retains the same open incident occurrence. A condition that clears resolves that occurrence. If it later returns, Monitor creates a new occurrence.
6. Chats, assignments, evidence, administrative closures, and audit history live only in Monitor.
7. Monitor shows the relevant ERP identifiers and evidence. MCP v5 exposes frontend route templates, but Monitor enables links only after the Phase 10 environment, authorization, compatibility, and browser checks pass. Users perform every operational correction in EmusaSoft.

Monitor never writes to the EmusaSoft database.

## 2. Transport decision

**Chosen: scheduled condition-based SQL polling.**

Every successful cycle re-derives the alert's current state. A missed cycle does not lose a durable event because the next successful cycle evaluates current ERP truth again.

| Rejected alternative | Reason |
| --- | --- |
| SSE event stream | No EmusaSoft SSE service exists. Building one only for Monitor would add infrastructure that EmusaSoft does not otherwise need. |
| Row-stream polling with a cursor | New-row queries miss updates to existing rows and can skip late commits. |
| EmusaSoft internal Redis | It is private EmusaSoft infrastructure and is not an integration boundary. |

Monitor-owned WebSockets remain the bidirectional real-time channel between Monitor's backend and its clients.

## 3. Authentication and access

- **Database:** EmusaSoft provisions environment-specific no-write credentials and a documented rotation procedure. Automated tests must prove that write operations are impossible.
- **MCP:** authenticated with `EMUSASOFT_MCP_TOKEN`, loaded from the repository-root `.env` and never committed or logged.
- **Users:** SSO or token exchange maps each person to exactly one enabled `sysUserId`; the Monitor backend calculates plant and operational scope.

## 4. Detection-query contract

There are no inbound push events. Each versioned detection-query contract declares:

- `alertTypeCode` — the catalog code, such as `A05`;
- `queryId` — a stable identifier;
- `queryVersion` — changed whenever the predicate, key, joins, or output schema changes;
- `keySchemaVersion` — changed only when the meaning or structure of the natural key changes;
- `naturalKey` — named columns that identify one condition independently of its recurrence;
- output schema — named and typed evidence and routing fields;
- `sourceTimestamp` — optional authoritative ERP timestamp for when the condition began;
- required indexes and representative query plan;
- schema/catalog revision against which the query was validated; and
- configured polling interval and measured load.

The EmusaSoft MCP is a discovery aid for tables, fields, types, relationships, routes, and examples. Its catalog does not prove the live database schema. Every production query must also be validated against the approved current schema and staging replica during Phase 10.

Example materialized detection:

```json
{
  "alertTypeCode": "A05",
  "queryId": "a05-coil-without-weighing",
  "queryVersion": "1.0.0",
  "keySchemaVersion": 1,
  "naturalKey": { "workOrderId": 88231, "articleSerialId": 51002 },
  "detectionCycleAt": "2026-07-20T14:05:00Z",
  "firstSeenAt": "2026-07-20T13:35:00Z",
  "sourceTimestamp": "2026-07-20T13:22:41Z",
  "payload": { "locationId": 12, "articleId": 4407, "quantity": 830.5 }
}
```

The incident's effective start time follows one universal rule: use an authoritative `sourceTimestamp` when the query can supply one; otherwise use Monitor's `firstSeenAt`. There is no user-configurable timestamp policy and no timestamp setting in `docs/product/alert_catalog.md`.

## 5. Condition identity, occurrences, and lifecycle

The **condition key** is `alertTypeCode + queryId + keySchemaVersion + normalized naturalKey values`. A predicate or evidence-only `queryVersion` change does not split a continuing condition. A changed key meaning requires a new `keySchemaVersion`. The condition key identifies the ERP condition evaluated across polling cycles; it is not the incident primary key.

Every activation creates a distinct **incident occurrence** with its own immutable ID:

- first successful detection creates an `OPEN` occurrence;
- continued detection updates `lastSeenAt` without creating a duplicate;
- disappearance from a complete, healthy cycle changes the occurrence to `RESOLVED`;
- reappearance after resolution creates a new occurrence for the same condition key; and
- occurrence history remains available for reporting and audit.

The user-visible lifecycle remains exactly `OPEN`, `RESOLVED`, and `CLOSED_WITHOUT_RESOLUTION`.

## 6. Close without resolution

When an authorized administrator closes an incident without resolution while its ERP condition still exists:

1. Monitor records the reason, comment, actor, timestamp, condition key, occurrence ID, and frozen evidence.
2. Monitor suppresses reopening only for that same uninterrupted condition.
3. A healthy cycle that proves the condition has cleared automatically expires the suppression.
4. A later recurrence creates a new incident occurrence.

Suppression is internal detection state, not a fourth incident lifecycle state. It is not permanent, it is not a user-maintained exclusion list, and it does not create a follow-up ticket. Systematic changes to what qualifies as an alert must be made through an approved, versioned detection-query change.

## 7. Cycle health and safe resolution

A polling cycle may resolve an incident only when all of the following are true:

- the approved query completed successfully within its limits;
- its result schema and required fields validated;
- the result set was complete rather than truncated or partially processed;
- the cycle transaction committed successfully in Monitor.

Timeouts, connection failures, invalid results, partial result sets, and Monitor persistence failures preserve the current incident state. They create source-availability telemetry and operational diagnostics; they never count as evidence that a condition cleared.

After an outage, each query performs a complete bounded evaluation of current state. No EmusaSoft cursor, replay window, or failed-event queue exists.

## 8. Read-only endpoint and observation delay

EmusaSoft provides:

- an approved Aurora MySQL replica or endpoint and environment-specific no-write credentials;
- permitted schemas, tables, and views;
- connection and concurrency limits;
- time-zone, soft-delete, and maintenance semantics;
- required indexes and representative query plans; and
- an approved load budget.

The existing Aurora read replica is Monitor's authoritative and most current available operational source. A transaction becomes observable to Monitor when it appears in a successful complete replica read. Monitor does not require a separate replica-lag signal before creating or resolving an incident. Replication delay is accepted as part of the observation delay and is measured where operational telemetry makes that possible.

## 9. Ownership

| Component | Owner |
| --- | --- |
| Monitor repository, service, deployment, database, scheduler, Redis, and WebSockets | Monitor |
| Detection-query definitions, condition state, incident occurrences, temporary suppressions, evidence, chats, roster, and audit history | Monitor |
| Replica, credentials, indexes, environment limits, and load budget | EmusaSoft |
| MCP server and ERP catalog | EmusaSoft MCP team |
| Work orders, reservations, documents, and all operational corrections | EmusaSoft users in EmusaSoft |

## 10. Security and operational constraints

- Detection queries are bounded, indexed, read-only, versioned, reviewed, and deployed from an allowlist; runtime ad-hoc SQL is prohibited.
- The browser never receives database or MCP service credentials.
- Polling concurrency and minimum intervals must remain within EmusaSoft's approved load budget.
- Incident evidence minimizes copied personal and operational data and retains the ERP references needed to identify source records.
- Detection, resolution, administrative closure, suppression creation/expiry, and recurrence are audit-logged.
- Monitor has no queue, outbox, broker, adjustment API, document-request workflow, or EmusaSoft write path.

## 11. External deliveries

The current status, remaining evidence, ownership, and closure rules for every EmusaSoft and MCP dependency are maintained only in `docs/integrations/emusasoft/integration_register.md`.

## 12. Confirmed decisions and Phase 0 validation

Confirmed on 2026-07-20:

1. No EmusaSoft SSE service exists.
2. Monitor uses scheduled condition-based SQL polling against an Aurora MySQL read replica.
3. Polling intervals are configurable per alert and are selected during Phase 0 from urgency, measured performance, and the replica load budget.
4. The condition key and incident occurrence ID are separate so a later recurrence creates new history.
5. A healthy cycle automatically resolves a condition that has cleared.
6. Closing without resolution suppresses only the same uninterrupted condition until a healthy cycle proves it cleared.
7. Monitor does not create a document-request follow-up ticket.
8. The incident start time uses authoritative ERP time when available and otherwise Monitor's first-detection time.
9. Monitor displays relevant ERP identifiers and evidence; users perform all corrections in EmusaSoft.
10. Monitor remains fully independent and has no EmusaSoft write access.

Phase 0 validated locally:

- representative detection queries and stable natural keys, starting with A05 and A02;
- query plans, indexes, result bounds, timeouts, and failure behavior;
- incomplete-cycle behavior that blocks unsafe resolution;
- provisional polling limits for each implemented query;
- local-backup schema compatibility despite MCP catalog drift; and
- a safe no-navigation fallback that displays ERP identifiers without inventing browser routes.

Phase 10 must validate real authentication, current schema, Aurora access, no-write enforcement, query plans and load budget, observation delay, and staging behavior before pilot or production use.
