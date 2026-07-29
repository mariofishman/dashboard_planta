# Phase 6 `test_database`

**Status:** Built and deterministically validated locally on 2026-07-28.

## Runtime decision

`test_database` runs in the official Linux ARM64 MySQL Community Server 8.0.43 image, pinned by digest:

```text
mysql@sha256:3e646bcda0d9448ffa3d2024eef04e1bca95528ec19b9e8b76749da9d97d4a10
```

The image runs in the isolated Colima profile `monitor-test-db`. The container is `monitor-test-mysql`, its data is in the named volume `monitor-test-database-data`, and MySQL is published only on `127.0.0.1:3307`.

This is safer and more compatible than the native macOS package. The official MySQL 8.0.43 macOS 15 ARM64 binary was checksum-verified but crashed during initialization on macOS 26.3. Native macOS also requires a case-sensitive data volume to enforce `lower_case_table_names=0`. The Linux container reproduces the verified setting directly and avoids a system-wide MySQL installation.

Homebrew-installed Colima and Docker CLI are host prerequisites. Runtime data, secrets, and evidence remain ignored under `local-data/test-database/`.

The start script creates or starts the isolated Colima profile when necessary. All database scripts set `DOCKER_CONTEXT=colima-monitor-test-db` for their own process, so they do not depend on or change the user's active global Docker context.

## Verified configuration

The running server validates as:

- MySQL Community Server 8.0.43;
- `utf8mb4` database character set;
- `utf8mb4_0900_ai_ci` database default collation;
- `lower_case_table_names=0`;
- UTC global and system time zones;
- `REPEATABLE-READ` global transaction isolation;
- empty global `sql_mode`;
- local infile disabled; and
- no triggers, routines, or events in `test_database`.

All 378 restored tables retain their supplied object-level `utf8mb4_unicode_ci` collation. This intentionally differs from the database default.

## Protected input and transformations

The only seed is the protected, immutable backup:

```text
/Users/mariofishman/projects/dashboard_planta/local-data/database/staging_emusa_core-20260723-025548.sql
bytes: 2903569374
sha256: a6feb0d0a5619d06b03c6af0a532d93a17cd13ded14f9985e089a8e1c2e36f73
```

Every reset verifies the path, byte count, and SHA-256 digest before doing anything destructive. The backup directory is mounted read-only inside the container. The reset streams from the host file and never edits or copies it into a mutable database directory.

The generated stream makes only two compatibility adaptations:

1. qualified `staging_emusa_core` identifiers become `test_database`;
2. the unavailable production definer `migbk@%` and `SQL SECURITY DEFINER` become `SQL SECURITY INVOKER`.

The business `SELECT` text is otherwise preserved. Environment-name string literals inside view logic are not schema qualifiers and remain unchanged. The dump creates temporary placeholder views before its 111 final definitions, which resolves view-to-view dependencies without rewriting those definitions.

The separately supplied `reporte de views.csv` was not present at its checkpoint Downloads path during implementation. The protected SQL dump independently contained exactly 111 temporary and 111 final view definitions and was sufficient for the validated reconstruction.

## Accounts and network boundary

Four credentials are generated locally with 48 hexadecimal characters and stored in mode-600 ignored files under `local-data/test-database/secrets/`:

- `root`: container bootstrap only;
- `test_database_admin`: reset and validation privileges scoped to `test_database.*`;
- `alertas_fake`: `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on `test_database.*` only;
- `monitor_source_ro`: `SELECT` and `SHOW VIEW` on `test_database.*` only, with global `USAGE` and no global privilege.

Docker-originated connections require the MySQL account host `%`; containment is enforced by binding the published port exclusively to host loopback and by the isolated local runtime. Credentials are not committed or printed.

`monitor_source_ro` passed `SELECT` and was denied all nine tested operations: `INSERT`, `UPDATE`, `DELETE`, `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`, `SET GLOBAL`, `CREATE USER`, and `GRANT`. The writer passed transactional insert/update/delete proof with a rollback. The reset account's exact schema grants are also reconciled.

## Commands

```sh
npm run db:test-source:start
npm run db:test-source:status
npm run db:test-source:validate
npm run db:test-source:reset
npm run db:test-source:stop
```

`db:test-source:reset` drops and recreates only `test_database`. The script refuses:

- any database name except exact `test_database`;
- any host except exact `127.0.0.1`;
- any port except exact `3307`;
- any Docker context except `colima-monitor-test-db`;
- a missing, moved, resized, or checksum-changed backup;
- a writable backup mount;
- a stopped runtime; and
- a reset without explicit `ALLOW_TEST_DATABASE_RESET=yes` authorization.

## Reconciliation result

The final guarded rebuild reproduced the saved baseline and the versioned expected digests:

- 378 base tables and 111 views;
- 7,527 columns;
- 1,433 indexed column entries;
- 1,394 constraints, including 829 foreign keys;
- zero missing referenced tables;
- zero checked A02, A03, or A05 relationship orphans;
- zero view errors and five non-fatal compatibility warnings;
- 57,232 material-flow details;
- 17,112 work orders;
- 17,181 work-order material rows;
- 122,991 article serials;
- 43 scale-detail rows;
- 78 warehouses;
- 1,249 A02 candidate rows and 838 A05 candidate rows, matching prior backup evidence;
- table checksum digest `a5df7f866bd4aad0f253fe0b7ee86801af3cf93b145d308fbd29a7036ddf5654`; and
- schema metadata digest `f53b654d62104eb94261f2ee9e397cd5ca883df8eac07bc93cbc196267e74fb6`.

The five view warnings are legacy integer display-width warnings in three quotation views and a deprecated slash-delimited date value in `vw_ordenes_compra`. All 111 views returned `CHECK TABLE` status `OK`.

Detailed reports and per-table checksums are local-only under `local-data/test-database/evidence/`. They intentionally contain no representative operational values.

A03 source-table row counts and relationship checks are included. No A03 MySQL candidate query was invented because its active-state and consumption-timestamp source semantics remain an approved later source-contract decision.

## Aurora differences and scope boundary

Local MySQL cannot establish Aurora replication, failover, managed credentials, replica lag, production authorization, production load, or production query plans. These remain Phase 10 evidence.

This work does not modify Monitor PostgreSQL, connect `alertas_fake`, connect Monitor's source adapter, change the chat UI, remove the synthetic simulator, or begin integrated A02/A03/A05 lifecycle testing.
