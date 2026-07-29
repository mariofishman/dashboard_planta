# Phase 6 `test_database`

**Status:** Built, rebuilt, and deterministically validated locally on 2026-07-29.

## Runtime and safety decision

`test_database` runs in the official Linux ARM64 MySQL Community Server 8.0.43 image, pinned as `mysql@sha256:3e646bcda0d9448ffa3d2024eef04e1bca95528ec19b9e8b76749da9d97d4a10`.

It runs in the isolated Colima profile and Docker context `monitor-test-db` / `colima-monitor-test-db`. The container is `monitor-test-mysql`, its named data volume is `monitor-test-database-data`, and MySQL is published only on `127.0.0.1:3307`. This avoids a system-wide server and reproduces `lower_case_table_names=0`, which was not practical with native MySQL on the host filesystem.

Before use, scripts attest the pinned image reference, exact server arguments, loopback port, data volume, read-only backup mount, read-only secrets mount, and live server. A same-name container with different configuration is rejected. Missing credentials are not regenerated over an existing volume because new values would make that volume inaccessible.

Runtime data, secrets, readiness, import logs, query results, and validation evidence remain ignored under `local-data/test-database/`.

## Verified server configuration

- MySQL Community Server 8.0.43;
- `utf8mb4` with database default `utf8mb4_0900_ai_ci`;
- supplied table-level `utf8mb4_unicode_ci` collations preserved;
- `lower_case_table_names=0`;
- UTC global, session, and system time zones;
- global and session `REPEATABLE-READ`;
- empty global and session `sql_mode`;
- local infile disabled and name resolution skipped;
- 16 KiB InnoDB pages and dynamic default row format; and
- no triggers, routines, or events.

## Protected input and controlled transformations

The only seed is:

```text
/Users/mariofishman/projects/dashboard_planta/local-data/database/staging_emusa_core-20260723-025548.sql
bytes: 2903569374
sha256: a6feb0d0a5619d06b03c6af0a532d93a17cd13ded14f9985e089a8e1c2e36f73
```

Every reset checks the path, size, and SHA-256 before and after import. It also decompresses the protected `.sql.gz` and proves that it has the same SHA-256. The SQL is read through the container's read-only backup mount and is never edited.

The generated stream makes only these compatibility adaptations:

1. qualified `staging_emusa_core` identifiers become `test_database`;
2. unavailable `migbk@%` definers and `SQL SECURITY DEFINER` become `SQL SECURITY INVOKER`.

Business `SELECT` text and non-qualifier string literals are preserved. The dump's temporary placeholder views resolve view dependencies before its 111 final definitions. The separately supplied view CSV was absent at implementation time, but the protected dump independently contained all 111 definitions.

The dump is executable but not warning-free under its verified empty `sql_mode`. Every restore produces the same 624-warning profile:

- 460 deprecated integer-display-width warnings;
- 163 enum coercion warnings for `tipo` / `tipo_moneda`; and
- one duplicate-index deprecation warning.

Reset fails if this profile changes. The source audit identifies every conversion without recording the business values:

- 26 rows: `empresa_banco_cuentas.tipo`;
- 137 rows: `empresa_banco_cuentas.tipo_moneda`.

The audit independently confirms the restored empty-enum counts that MySQL produces. `empresa_banco_cuentas` is not a source table for A02, A03, or A05, so these conversions do not affect the three alert paths. The schema is not altered to silence the warnings because that would diverge from the backup. This remains a deterministic logical restoration rather than a physical Aurora clone.

## Accounts, readiness, and failure behavior

Local mode-600 credentials are generated for:

- `root`: container bootstrap only;
- `test_database_admin`: database-scoped reset and validation;
- `alertas_fake`: `SELECT`, `INSERT`, `UPDATE`, `DELETE` on `test_database.*` only;
- `monitor_source_ro`: `SELECT`, `SHOW VIEW` on `test_database.*` only and global `USAGE`.

Only one reset can run at a time. Before dropping the database, reset removes readiness, locks both application accounts, and terminates their sessions. A failure or interruption leaves readiness absent and both accounts locked. It unlocks them only after locked-account pre-validation and the full pristine-baseline suite pass, then writes readiness last. It also requires at least 8 GiB free on the data volume.

Monitor denial tests require MySQL access-denied error codes; unrelated SQL errors do not count. Monitor was denied `INSERT`, `UPDATE`, `DELETE`, `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`, `SET GLOBAL`, `CREATE USER`, and `GRANT`. The writer passed insert/update/delete inside a rolled-back transaction. All 111 views compile as the Monitor account with `SELECT ... LIMIT 0`.

Container client files use port 3306. Separate ignored `*.host.cnf` files use `127.0.0.1:3307` for the later merged application branches, and the host listener is reachable. Actual `alertas_fake` and Monitor driver tests are intentionally deferred until those branches merge, as agreed.

Consumers added after merge must require readiness and must not poll during reset.

## Commands

```sh
npm run db:test-source:start
npm run db:test-source:status
npm run db:test-source:validate
npm run db:test-source:validate-baseline
npm run db:test-source:query-plans
npm run db:test-source:reset
npm run db:test-source:stop
```

`validate` is a non-mutating operational health check and remains usable after fake alerts change records. `validate-baseline` expects pristine reset data and includes rollback-only writer and denial probes. Reset runs baseline validation automatically. `query-plans` executes A02/A05 as real 1,000-row keyset pages through the Monitor account and saves local plans without printing rows.

Reset refuses an inexact database name, non-loopback host, wrong port or Docker context, changed input, writable backup mount, unattested/stopped runtime, concurrent reset, insufficient disk, or missing `ALLOW_TEST_DATABASE_RESET=yes`.

## Reconciliation evidence

The final guarded rebuild proved:

- 378 base tables, 111 views, 7,527 columns, 1,433 indexed-column entries, 1,394 constraints, and 829 foreign keys;
- all 378 table names and exact per-table counts match an independent manifest parsed directly from the immutable dump: 10,345,048 total rows;
- explicit source `AUTO_INCREMENT` counters are preserved as lower bounds, with MySQL advancing counters when inserted explicit keys are higher;
- all 378 restored `SHOW CREATE TABLE` definitions match definitions parsed directly from the protected SQL after normalizing only runtime `AUTO_INCREMENT` counters and equivalent explicit/inherited `utf8mb4` syntax;
- all 111 restored view business definitions match definitions parsed directly from the protected SQL; only the approved definer/security adaptation is excluded from that comparison;
- table engines, row formats, defaults, generated expressions, table/column collations, indexes and visibility, constraints, key mappings, foreign-key actions, checks, comments, and view definitions/security also match the repeatability metadata digest;
- all 382 enum columns have the source-expected restored empty-value counts, including the 163 documented coercions confined to `empresa_banco_cuentas`;
- all 111 views compile through Monitor;
- A02 has 1,249 unique keys in two keyset pages; A05 has 838 unique keys in one page;
- both MySQL plans use primary-key range scans and indexed `eq_ref` joins, with no full-table scan; and
- protected compressed and uncompressed backups have the same SHA-256.

Versioned reconciliation digests:

```text
independent dump manifest: 57fd1829dead0eb9078c19ddb00162bb3591782bc5bfdf02ba94742eef8cc939
expanded schema metadata:  6d4207d4d036cf9fdf91d35cd10667684c625efa710bae8e59c02e83ad96cdb9
table checksums:           a5df7f866bd4aad0f253fe0b7ee86801af3cf93b145d308fbd29a7036ddf5654
```

Two supplied tables intentionally lack primary keys: `centro_costo_usuario` and `documento_relaciones`. Their source unique constraints are preserved; no redesign was introduced.

A03 tables and relationships are present, but no A03 candidate query was invented because its active-state and consumption-timestamp contract is not approved in this branch.

## Aurora and branch boundaries

Local MySQL cannot prove Aurora replication, failover, managed credentials, replica lag, production authorization, production load, or production plans. These remain Phase 10 evidence.

This branch does not modify Monitor PostgreSQL, connect either application, change the chat UI, remove the synthetic simulator, or begin integrated A02/A03/A05 lifecycle testing.
