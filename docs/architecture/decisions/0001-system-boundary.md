# ADR 0001: Independent, read-only Monitor boundary

**Status:** accepted  
**Date:** 2026-07-20

## Decision

Monitor is an independent application, API, database, Redis instance, scheduler, and deployment. It reads only approved, bounded SQL queries from an EmusaSoft replica and links users back to EmusaSoft for operational action.

Monitor owns incidents, evidence, condition state, administrative suppressions, conversations, messages, receipts, roster assignments, client cursors, and audit history. It never writes to EmusaSoft and contains no adjustment, outbox, queue, broker, or ERP correction path.

## Consequences

- EmusaSoft failures cannot be mistaken for a cleared condition.
- Monitor can evolve and be restored independently.
- Every cross-system dependency needs an explicit versioned contract.
- Operational corrections remain visible and authorized in one place: EmusaSoft.
