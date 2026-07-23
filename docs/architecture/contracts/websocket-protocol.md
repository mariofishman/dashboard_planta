# Monitor WebSocket protocol 1.0.0

## Connection

- Transport: TLS Socket.IO connection to `/monitor`.
- Authentication: Monitor session established through ADR 0002.
- Authorization: the server derives user, plant, and conversation rooms; clients cannot name arbitrary scopes.
- Server handshake returns `protocolVersion`, `connectionId`, `currentCursor`, and `heartbeatSeconds`.

## Durable server events

- `incident.created`
- `incident.updated`
- `incident.resolved`
- `incident.closed_without_resolution`
- `message.created`
- `message.updated`
- `receipt.updated`
- `source.freshness.changed`

Incident events use `incident-change.schema.json`. Every durable event is committed before publication and has a cursor. Unknown major versions are rejected; additive compatible changes use a new minor contract version.

## Client commands

Persistent commands carry `clientCommandId` and receive an acknowledgement only after commit. The API remains the recovery source. Ephemeral `typing` and `presence` signals have no cursor and never change incident truth.

## Recovery

1. Client reconnects with its last applied cursor.
2. Client calls `GET /v1/changes?after=<cursor>&limit=500` until `hasMore` is false.
3. Client applies events in cursor order and ignores an already-applied cursor.
4. Client resumes live delivery from the returned cursor.

A limit reached, gap, authorization change, or expired retention window returns an explicit resynchronization response; it never silently skips history.
