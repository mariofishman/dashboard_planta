# Phase 0 environments, secrets, ownership, and operating boundaries

## Environments

| Environment | EmusaSoft source | Observation boundary | Purpose |
|---|---|---|---|
| Local | Protected 2026-07-23 staging SQL backup subset | Not applicable; immutable snapshot | Query shape, fixture, and timing validation |
| Test | Synthetic/anonymized data only | Fake provider | Deterministic contracts and failures |
| Staging | Approved Aurora read replica | Successful complete read | Phase 10 EmusaSoft integration and acceptance |
| Production | Approved Aurora read replica | Successful complete read | Phase 10 deployment; disabled until all production gates pass |

## Secrets

- Local MCP authentication reads `EMUSASOFT_MCP_TOKEN` only from the ignored repository `.env`.
- Production user authentication, MySQL, PostgreSQL, Redis, object storage, and external-provider secrets use backend secret management with separate values per environment.
- No secret is compiled into JavaScript, returned by an API, placed in a WebSocket event, written to logs, committed, or copied into test fixtures.

## Ownership

- Monitor team: repository, deployments, Monitor database, scheduler, contracts, incidents, WebSockets, Redis, UI, audit, and on-call.
- EmusaSoft team: authentication microservice, ERP authorization semantics, read replica, credentials, query/index evidence, and load limits for Phase 10.
- MCP team: current catalog, validator, discovery resources, and sanitized examples.

## Hard operating boundary

Monitor reads EmusaSoft and writes only Monitor-owned stores. There is no dependency or connection to `emusa-ui`, no use of EmusaSoft Redis, no ERP mutation, and no adjustment workflow.
