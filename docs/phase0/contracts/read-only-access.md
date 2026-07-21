# Read-only EmusaSoft access contract 1.0.0

Production is disabled until ES-02 supplies and proves this contract.

## Required account properties

- Dedicated environment-specific MySQL account for Monitor.
- `SELECT` only on explicitly approved tables or views.
- No `INSERT`, `UPDATE`, `DELETE`, `REPLACE`, DDL, temporary-table creation, stored routine execution, file access, locks, replication commands, or privilege administration.
- TLS required; credentials supplied through backend secret management and never through browser configuration.
- Connection cap, query timeout, statement allowlist, and rotation procedure documented.

## Runtime enforcement

- SQL is loaded only from versioned query contracts at process start.
- The adapter accepts named values, compiles prepared statements, and rejects multiple statements, comments, and any first token other than `SELECT` or `WITH`.
- Runtime ad-hoc SQL is prohibited.
- The application connection uses read-only transaction mode where supported.
- A deployment smoke test attempts representative writes and must receive authorization errors. It never runs against production tables without EmusaSoft's approved isolated test target.

## Failure rule

Connection, timeout, contract, truncation, freshness, or persistence failure marks the cycle unhealthy and preserves incident state.
