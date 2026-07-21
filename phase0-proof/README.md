# Phase 0 incident-stream proof

This is a narrow contract proof, not the Phase 2 application scaffold. It verifies the Phase 0 exit behavior:

- a change receives its cursor at commit;
- only a committed change is published live;
- a missed live publication remains recoverable through the REST cursor endpoint;
- failed, truncated, invalid, uncommitted, or stale replica cycles cannot resolve an incident;
- serialized API/WebSocket envelopes contain no secret-shaped fields.

It intentionally uses an in-memory committed-change store. PostgreSQL, Redis, production authentication, and deployment belong to later phases after the external contracts and Phase 0 gate are approved.
