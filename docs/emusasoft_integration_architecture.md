# Monitor–EmusaSoft Integration Architecture

**Date:** 2026-07-20
**Status:** agreed with the EmusaSoft architect; supersedes the SSE transport decision recorded on 2026-07-19
**Owner:** Monitor project lead
**Counterpart:** EmusaSoft architecture

## 1. Recommended integration architecture

Monitor runs a **condition-based detection engine** against a read-only EmusaSoft database endpoint:

1. Each alert type in the alert catalog is backed by one approved **SQL detection query** (a predicate over current ERP state).
2. A Monitor-owned scheduler executes the query set every N minutes (N is configurable in Monitor).
3. Each detection is upserted into Monitor's incident table using the alert's declared natural key.
4. On every cycle the predicate is re-evaluated:
   - condition still holds → the incident stays open (no duplicate is created);
   - condition no longer holds → the incident is auto-resolved.
5. Human workflow (chats, assignments, administrative closures) is layered on top of the incident record inside Monitor's own database.
6. Corrective actions in the ERP are performed by users in EmusaSoft, never by Monitor. Monitor resolves the create/modify URL for the required ERP document through the MCP and links it from the incident.

Monitor never writes to the EmusaSoft database.

## 2. Transport choice and rejected alternatives

**Chosen: scheduled condition-based SQL polling.**

State is re-derived from the current database on every cycle, which makes the pipeline idempotent and self-healing: a missed cycle loses nothing because the next cycle observes the full current truth.

Rejected alternatives:

| Alternative | Reason for rejection |
| --- | --- |
| SSE event stream (former ES-01) | The service does not exist. Alerts are a Monitor-owned concept; EmusaSoft would have to build and operate new infrastructure that provides no value to EmusaSoft itself. |
| Row-stream polling with a cursor (new-rows query) | Misses updates to existing rows, can skip rows committed late by long transactions, and couples Monitor to the physical schema evolution. |
| Direct access to EmusaSoft's internal Redis | Internal infrastructure; access was never assumed and is not offered. |

Monitor-owned WebSockets remain the client-facing real-time channel for Monitor's own UI. That decision is unchanged.

## 3. Authentication method

- **Database access:** environment-specific read-only credentials provisioned by EmusaSoft, with a documented rotation procedure (ES-02). Write operations must be impossible at the privilege level, proven by automated tests.
- **MCP access:** authenticated MCP service credentials (`EMUSASOFT_MCP_TOKEN`, kept in `.env`, never committed).
- **User identity:** SSO or token exchange mapping each user to exactly one enabled `sysUserId` with server-calculated plant scope (ES-03).

## 4. Event contract, payload examples, and versioning

There are no push events. The contract is the **detection query set**. Each entry declares:

- `alertTypeCode` — catalog code (e.g. `A05`);
- `queryId` — stable identifier of the detection query;
- `naturalKey` — the columns that uniquely identify one emergency instance. The incident identity is `alertTypeCode + queryId + naturalKey values`. Every query MUST declare its unique key explicitly;
- `sourceTimestampColumn` — optional; the ERP-side timestamp of the underlying fact when one exists;
- `timestampPolicy` — `source` or `registration`; chosen by whoever configures the alert (see below);
- output schema — named, typed columns;
- `queryVersion` — semantic version, bumped on any change to predicate, key, or output schema;
- catalog/schema version the query was validated against.

Detection queries should be authored using the EmusaSoft MCP, whose ERP catalog exposes the full database schema (MCP-01, MCP-03, MCP-04): discover tables, columns, types, and relationships through catalog search and description tools instead of guessing schema shapes.

Detection record example (as materialized by Monitor):

```json
{
  "alertTypeCode": "A05",
  "queryId": "a05-coil-without-weighing",
  "queryVersion": "1.0.0",
  "naturalKey": { "workOrderId": 88231, "articleSerialId": 51002 },
  "detectionCycleAt": "2026-07-20T14:05:00Z",
  "firstSeenAt": "2026-07-20T13:35:00Z",
  "sourceTimestamp": "2026-07-20T13:22:41Z",
  "payload": { "locationId": 12, "articleId": 4407, "quantity": 830.5 }
}
```

`firstSeenAt` is assigned by Monitor when the incident row is first registered in Monitor's database. The incident start time used for metrics is governed by the alert's `timestampPolicy`, a per-alert configuration rule: `source` takes the date returned by the detection query (the ERP-side fact timestamp); `registration` takes Monitor's registration date. The person configuring the alert selects the policy; `sourceTimestamp` is always attached as evidence when the query can provide it.

## 5. Ordering, duplication, retention, replay, and recovery guarantees

- **Ordering:** not required. Every cycle evaluates full current state; there is no event sequence to preserve.
- **Duplication:** prevented by upsert on the incident natural key. A condition persisting across cycles maps to the same open incident. A condition that reappears after resolution creates a new incident.
- **Retention and replay:** not applicable at the transport level. Incident history is retained in Monitor's database under Monitor's own retention policy.
- **Recovery:** after any outage (Monitor, network, or replica), the next successful cycle fully reconstructs the open-alert state. No cursor, no replay window, no backfill procedure.
- **Flapping and human-closure conflicts:** when an administrator closes an incident without resolution while the condition still holds in the ERP, the recurrence is handled by one of three mechanisms, selectable per alert type:
  1. **Exclusion rules (configurable):** the closed condition's key or criteria is recorded as an exclusion rule in Monitor; matching detections are filtered on subsequent cycles and do not reopen the incident.
  2. **Detection-query amendment:** when an exclusion is systematic rather than case-by-case, the detection query itself is modified to exclude the whole class (published as a new `queryVersion`), cleaning every matching detection at the source.
  3. **Document-request flow:** Monitor opens a linked follow-up ticket requesting the ERP document associated with the original incident. The original ticket closes only when that document is produced in EmusaSoft (verified by a detection query or MCP lookup).

## 6. Read-only reconciliation approach

Detection and reconciliation now share the same channel: bounded, approved read-only queries (ES-02). EmusaSoft provides:

- an approved replica or endpoint with environment-specific no-write credentials;
- the permitted schemas, tables, and views;
- indexed fields required by the detection predicates, with representative query plans;
- connection limits, time zone, soft-delete semantics, and maintenance windows.

The polling interval N and the per-cycle query cost must fit inside the connection and load budget EmusaSoft defines for the endpoint.

The endpoint is an **Aurora MySQL read replica**. There is no fixed lag SLA; replica lag is observable through Aurora's replica statistics — in-band via `information_schema.replica_host_status` (`REPLICA_LAG_IN_MILLISECONDS`), which Monitor can query over the same read-only connection, or through the `AuroraReplicaLag` CloudWatch metric. Monitor records the observed lag on each detection cycle and defers auto-resolution while lag exceeds a configured threshold, so incidents are never resolved against stale data.

## 7. Identity integration

Unchanged from ES-03: SSO or token exchange, stable mapping to `sysUserId`, plant membership and scope calculated server-side, disabled-user behavior and revocation timing documented, non-production test identities available.

## 8. Infrastructure ownership

| Component | Owner |
| --- | --- |
| Monitor repository, service, deployment, database, scheduler, Redis, WebSockets | Monitor |
| Incident store, rejected-criteria table, audit history, chats, roster | Monitor |
| Detection query definitions and natural-key declarations | Monitor authors; EmusaSoft approves indexes and load |
| Read-only replica/endpoint, credentials, indexes | EmusaSoft |
| MCP server, ERP catalog, deep-link and document-creation URL patterns | EmusaSoft MCP team |
| ERP corrective actions (creating/fixing documents) | EmusaSoft users, in EmusaSoft |

## 9. Security and operational constraints

- Monitor never writes to the EmusaSoft database; enforced by credential privileges and proven by automated tests (ES-02 acceptance).
- No secrets in the repository: `.env` stays local, `EMUSASOFT_MCP_TOKEN` is never committed or logged.
- Detection queries are read-only, bounded, and reviewed before deployment; ad-hoc unapproved queries against the replica are prohibited.
- The polling interval is configurable but bounded below by the replica load budget agreed with EmusaSoft.
- Incident records minimize personal data; evidence links point into EmusaSoft rather than copying documents.
- All state transitions (detection, auto-resolution, administrative closure, rejected-criteria entries) are audit-logged in Monitor.

## 10. Required EmusaSoft changes

- **ES-01 (SSE contract) is withdrawn.** Replaced by: review and approve the detection query set — predicates, natural keys, required indexes, and load budget. Acceptance: each catalog alert type has an approved query whose plan runs within the agreed budget on the replica.
- **ES-02 becomes the critical-path dependency** for live data. Same content as registered, plus the indexes required by the detection predicates.
- ES-03 (identity), ES-04 (operational actors), ES-05 (immutable extrusion opening inventory), ES-06 (deep links), ES-07 (`emusa-ui`) remain unchanged.

## 11. MCP changes needed

- MCP-01 through MCP-06 remain as registered (catalog regeneration, GraphQL validation, type description, search coverage, versioned integration resources, sanitized examples).
- **Extension to ES-06/MCP-05:** expose the URL patterns that open the ERP screen to **create or modify the document** required to fix an incident, so Monitor can link the corrective action directly from the ticket. Patterns must be versioned and testable; verbal confirmation does not close the item.

## 12. Confirmed decisions, assumptions, and unresolved questions

**Confirmed (2026-07-20, with the EmusaSoft architect):**

1. No SSE service exists; the 2026-07-19 register entry naming SSE as the transport is superseded.
2. Detection is condition-based SQL polling owned by Monitor; the interval N is configurable in Monitor.
3. Incident identity is resolved in Monitor: alert type + query ID + the unique key each query declares.
4. Auto-resolution: if the condition no longer holds on a cycle, the incident is resolved; if it persists, nothing changes.
5. Administrative closures against persisting conditions are handled via the rejected-criteria table or the document-request follow-up ticket.
6. The incident start timestamp is assigned by Monitor's database at first registration, unless the alert's `timestampPolicy` selects the query's source date (decision 12).
7. Monitor has no write access; corrective actions happen in EmusaSoft via MCP-resolved URLs.

**Confirmed (2026-07-20, second round):**

8. The read endpoint is an **Aurora MySQL** replica. No fixed lag SLA; Monitor observes Aurora replica statistics and adapts its cycle behavior to the measured lag.
9. The polling interval N is configured **per alert type**, not globally.
10. Recurrence suppression uses configurable exclusion rules per alert; systematic exclusions are instead folded into the detection query as a new `queryVersion`.
11. Incident history, statistics, and exclusion rules live in **Monitor's database**, retained for history and statistics — not for operational management in EmusaSoft.
12. Timestamp policy is a per-alert rule: the alert configurator chooses between the query's source date (`source`) and Monitor's registration date (`registration`).

**Assumptions (to validate):**

- Aurora replica lag stays within minute-level bounds compatible with per-alert detection latency targets.
- Every catalog alert type can be expressed as a bounded SQL predicate with a stable natural key.
- The replica can absorb the full query set at the chosen intervals.

**Unresolved questions:**

- Confirm that the read-only credentials can query `information_schema.replica_host_status` for in-band lag; otherwise agree on CloudWatch metric access.
- Expiry and scoping rules for exclusion rules — an exclusion without expiry silences that condition permanently; per-OT scoping or a review date should be considered.
- Default N per alert type — to be recorded alert by alert in the catalog.
- The load budget for the replica, still owed by EmusaSoft under ES-02.
