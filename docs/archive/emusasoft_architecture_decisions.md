# EmusaSoft Architecture Decisions for Monitor

**Date:** 2026-07-19

**Status:** historical record superseded by `docs/emusasoft_integration_architecture.md` on 2026-07-20

The current integration contract is `docs/emusasoft_integration_architecture.md`. This file is retained only as historical evidence of the architect decision sequence and has no current authority.

## Confirmed answers retained for history

1. No EmusaSoft SSE service exists and EmusaSoft's internal Redis is not a Monitor integration boundary.
2. Monitor detects alerts through approved condition-based SQL queries against an Aurora MySQL read replica.
3. Monitor owns the scheduler, per-alert polling configuration, condition state, incident occurrences, and audit history.
4. EmusaSoft approves the replica access, query plans, required indexes, freshness signal, and load budget.
5. Monitor is a separate system with its own repository, service, deployment, database, Redis, and WebSockets.
6. Monitor has read-only EmusaSoft access and never performs operational corrections.
