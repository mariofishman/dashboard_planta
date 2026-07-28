# Phase 6 — Conversation business rules

**Status:** Approved for local implementation on 2026-07-27

## Conversation lifecycle

- Monitor creates conversations only from incidents. Users cannot create standalone direct or group conversations.
- Monitor does not offer `Responder en privado`; the first version keeps communication inside the incident-created group.
- Once a conversation exists, its participants may use it for ordinary group communication.
- One conversation may contain many incidents. Monitor reuses a conversation only when the new incident's resolved recipient set exactly matches the conversation's current active participant set.
- A partial or overlapping participant match never reuses a conversation.
- When every linked incident is resolved or closed without resolution, the conversation remains writable for one hour and then becomes read-only.
- A later incident with the exact participant set reopens the existing conversation and cancels the read-only state.

## Participants and authorization

- A worker who was legitimately added remains a participant despite later shift, group, operation, or routine roster-assignment changes. Newly responsible workers are added without removing existing participants from the active incident conversation.
- Monitor administrators can access every conversation and can manually add or remove active roster workers. Monitor automatically includes every active administrator as a participant in every active conversation.
- Administrative membership changes require an audit record. Removing a participant blocks future access but never removes that person's messages.
- An inactive worker or a worker removed from the roster cannot enter Monitor at all. Existing conversations, messages, receipts, and audit records remain preserved.
- Re-entering the roster restores product access but does not automatically restore conversation membership removed manually by an administrator.
- The local mock identity-to-roster binding remains replaceable by the EmusaSoft identity contract in Phase 10.

## Messages and history

- Conversations and messages persist indefinitely. There are no disappearing messages.
- Conversation lists and message histories use server-side cursor pagination.
- Message behavior follows the current familiar WhatsApp model: replies, reactions, attachments, delivery/read receipts, typing, presence, search, offline send, push-style notifications, and multi-device synchronization.
- A sender may edit their own message for 15 minutes. The message is visibly marked as edited and prior content remains auditable.
- A sender may delete their own message for everyone within the WhatsApp-compatible deletion window configured by Monitor. The visible message becomes a deletion tombstone; audit content remains restricted to authorized audit access.
- Duplicate sends are prevented with a sender-scoped `clientCommandId`. A successful acknowledgement is returned only after commit.
- Committed messages are ordered by server cursor. Reconnect recovery ignores already-applied cursors and never silently skips a gap.

## Notifications and offline behavior

- Phase 6 uses in-app notifications and browser/device push-style notifications. Ordinary unread chat messages do not generate email.
- Phase 5 administrator email for missing or conflicting routing remains a separate operational diagnostic.
- Offline clients may compose and queue sends. Pending, failed, sent, delivered, and read states remain visually distinct.
- Presence and typing are ephemeral and never alter durable conversation history.

## Attachments and moderation

- Attachment interaction follows WhatsApp conventions and the approved prototype: image library, camera capture, preview, caption, reply, forward, and message actions.
- Server authorization, file-type and size validation, content sanitization, malware-scanning integration points, and rate limits are mandatory. Local storage remains replaceable by production object storage.
- Administrators moderate membership. Message deletion never erases the audit trail.
- An administrator has one global chat list containing every conversation by default. There is no personal/global scope switch because the global list already includes the administrator's own conversations. Historical and read-only conversations remain accessible to administrators.
