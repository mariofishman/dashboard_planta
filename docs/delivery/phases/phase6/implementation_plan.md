# Phase 6 — Implementation plan

**Status:** In progress; conversation, `test_database`, accepted chat UI, and approved `alertas_fake` Stage 2 workstreams implemented; Roadmap V3 integration pending

## Diagnosis

Monitor has durable incidents, deterministic recipient routing, committed change cursors, Socket.IO recovery, mock identities, and an initial conversation implementation. That baseline includes Monitor-owned conversation persistence, participant authorization, messages, receipts, unread state, APIs, automated tests, and connected chat screens.

Phase 6 is not complete. The chat UI has been corrected and accepted against the approved prototypes, and the separate source-compatible `test_database` has been built and locally validated. A02, A03, and A05 still depend on the historical Phase 4B simulator until `alertas_fake`, the read-only source adapter, and the completed workstreams are integrated and validated together. Production identity binding remains a Phase 10 concern.

## Guiding policies

1. Reuse the existing TypeScript, Fastify, PostgreSQL/PGlite, Socket.IO, React, and Material UI kit.
2. Commit conversation state before publication; PostgreSQL remains canonical and Redis remains ephemeral.
3. Derive every conversation room and history query on the server. A client cannot name an unauthorized scope.
4. Reuse conversations only by exact active-participant fingerprint.
5. Preserve messages and membership history indefinitely while paginating every unbounded collection.
6. Keep local identity binding replaceable for Phase 10 without weakening local authorization tests.
7. Implement the approved compact chat prototypes through the shared design system, including loading, empty, offline, reconnecting, and denied states.

## Existing conversation baseline

### 1. Persistence and contracts

- Add conversations, participants, linked incidents, messages, message revisions, attachments, receipts, per-user state, membership audit, and durable conversation change events.
- Add indexes for participant lookup, exact-set fingerprint reuse, message cursor pagination, unread counts, search, and idempotent commands.
- Add shared request/response contracts for lists, history pages, sends, edits, deletion, receipts, and participant administration.

### 2. Conversation service and routing integration

- Convert a committed routing decision into a participant set and exact-set fingerprint.
- Reuse or create the appropriate conversation and attach the incident once.
- Post one idempotent Monitor alert message per incident occurrence.
- Add newly responsible recipients to an ongoing incident conversation without removing prior legitimate participants.
- Reopen a read-only conversation when an exactly matching new incident arrives.
- Apply the one-hour writable grace period after the last linked incident closes.

### 3. APIs and realtime synchronization

- Add paginated conversation list and message history endpoints, search, unread state, sends, edits, deletion, receipts, and admin membership endpoints.
- Require active product access plus participant membership. Automatically include every active administrator in active conversations and return every conversation in the administrator's single global chat list, including historical and read-only conversations.
- Publish committed `conversation.updated`, `message.created`, `message.updated`, and `receipt.updated` events to server-derived rooms.
- Recover durable events by cursor and keep typing/presence ephemeral.

### 4. Frontend

- Enable Chats in primary navigation.
- Connect the chat list to server pagination, search, filters, unread counts, open-alert summaries, and live updates.
- Connect chat detail to paginated history, structured alert messages, replies, composer state, receipts, reconnect recovery, and the one-hour read-only state.
- Open the linked conversation from a Dashboard incident.
- Reuse shared Material UI defaults and active Monitor tokens.

### 5. Baseline validation

- Test simultaneous mock users, exact-set reuse, nonmatching-set separation, roster changes, admin add/remove, inactive access, duplicate command IDs, edit/delete windows, pagination, unread counts, ordered reconnect recovery, and authorization changes.
- Test browser behavior at desktop, tablet, and mobile widths, including loading, empty, error, offline, reconnecting, read-only, and denied states.
- Run the complete test, typecheck, and production-build suites.

Baseline validation proves that this commit is a stable starting point. It does not constitute Phase 6 acceptance.

## Roadmap V3 workstream status

### 6. Build and reset `test_database`

**Status:** Completed and deterministically validated locally. Integration with Monitor and `alertas_fake` remains in action 9.

- Confirm the required `soft_database` engine, version, schema, indexes, collations, and SQL settings from authoritative evidence.
- Build the disposable `test_database` from protected `backup_database` input.
- Provide a deterministic reset script that recreates only the configured disposable database and verifies the restored baseline.
- Give Monitor technically read-only access and give `alertas_fake` separate test-only write access.

### 7. Correct the chat UI

**Status:** Completed, approved, and validated as UI-only evidence. Integrated source-to-screen acceptance remains in action 9.

- Audit the initial chat list, chat detail, and incident components against the approved prototypes.
- Explain material differences before changing the design.
- Implement and validate only approved adaptations, using stable mock data where source integration is unavailable.

### 8. Completed review of the implemented A02, A03, and A05 `alertas_fake` redesign

- The standalone V2 laboratory and business-language scenario matrix are implemented. The one-test-at-a-time Stage 2 review was completed and approved on 2026-07-31; all 34 valid acceptance tests passed.
- Preserve the connected boundary for the later integration step: `alertas_fake` changes only `test_database` and never writes Monitor incidents, conversations, or messages.

### 9. Integrate and validate

- Merge the three workstreams into one Phase 6 integration baseline.
- Connect `alertas_fake` to `test_database` and Monitor's read-only poller to the same source.
- Validate A02, A03, and A05 through polling, incident lifecycle, routing, dashboard, conversation reuse, messages, reconnects, permissions, duplicates, pagination, unread counts, and receipts.
- Remove the operational synthetic source tables and simulator adapter from Monitor only after the replacement path passes.

## Exit gate

Phase 6 is complete only when the Roadmap V3 source-database boundary, reset process, A02/A03/A05 lifecycle, routing, dashboard, conversations, and accepted UI pass together. Until then, the current implementation remains an incomplete but usable baseline and Phase 7 remains blocked.
