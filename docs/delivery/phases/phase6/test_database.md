# Phase 6 `test_database`

**Status:** Built, physically templated, and deterministically validated locally on 2026-08-02.

**Role:** Supporting database safety, operations, and validation record. It does not define current stage status; see [`README.md`](./README.md).

## Runtime and safety decision

`test_database` runs in the official Linux ARM64 MySQL Community Server 8.0.43 image, pinned as `mysql@sha256:3e646bcda0d9448ffa3d2024eef04e1bca95528ec19b9e8b76749da9d97d4a10`.

It runs in the isolated Colima profile and Docker context `monitor-test-db` / `colima-monitor-test-db`. The container remains `monitor-test-mysql`, its active named volume is recorded in ignored runtime state, and MySQL is published only on `127.0.0.1:3307`. This avoids a system-wide server and reproduces `lower_case_table_names=0`, which was not practical with native MySQL on the host filesystem.

Before use, scripts attest the pinned image reference, exact server arguments, loopback port, data volume, read-only backup mount, read-only secrets mount, and live server. A same-name container with different configuration is rejected. Missing credentials are not regenerated over an existing volume because new values would make that volume inaccessible.

Runtime data, secrets, readiness, import logs, query results, and validation evidence remain ignored under the canonical `/Users/mariofishman/projects/dashboard_planta/local-data/test-database/`. Reset scripts, host driver probes, the Monitor adapter, and connected-test gates all resolve this same location so worktrees cannot use stale or missing runtime state.

## Verified server configuration

- MySQL Community Server 8.0.43;
- `utf8mb4` with database default `utf8mb4_0900_ai_ci`;
- supplied table-level `utf8mb4_unicode_ci` collations preserved;
- `lower_case_table_names=0`;
- UTC global, session, and system time zones;
- global and session `REPEATABLE-READ`;
- empty global and session `sql_mode`;
- local infile disabled and name resolution skipped;
- binary logging disabled because this fixed, single-user, local-only reset system has no replication or point-in-time-recovery role;
- InnoDB redo logging enabled for crash safety;
- 16 KiB InnoDB pages and dynamic default row format; and
- no triggers, routines, or events.

## Protected input and controlled transformations

The only seed is:

```text
/Users/mariofishman/projects/dashboard_planta/local-data/database/staging_emusa_core-20260723-025548.sql
bytes: 2903569374
sha256: a6feb0d0a5619d06b03c6af0a532d93a17cd13ded14f9985e089a8e1c2e36f73
```

Every template build and SQL fallback checks the path, size, and SHA-256 before and after import. It also decompresses the protected `.sql.gz` and proves that it has the same SHA-256. The SQL is read through the container's read-only backup mount and is never edited. A healthy physical reset does not reread the SQL because its prepared volume was already completely validated in the background.

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

The audit independently confirms the restored empty-enum counts that MySQL produces. `empresa_banco_cuentas` is not a source table for A02, A03, or A05, so these conversions do not affect the three alert paths. The schema is not altered to silence the warnings because that would diverge from the backup. The SQL path remains the deterministic reconstruction authority; the routine physical path is a certified local copy of that exact result, not an Aurora clone.

## Physical template and reset lifecycle

The permanent physical authority is ignored at:

```text
/Users/mariofishman/projects/dashboard_planta/local-data/database/derived/test-database-physical-v1/
  template.tar.zst
  manifest.json
  certification.json
```

The template was built from a fresh binary-log-free SQL reconstruction, completely validated, cleanly shut down, archived, restored into a second volume, and completely validated again. The stopped data directory is approximately 6.08 GB and compresses to approximately 992 MB. Its versioned trust anchors are:

```text
manifest:      dad05948a29ce4412708d22c45acdd2939c5c1827d44efe738effc1ad9c974d0
archive:       2ce88ab7488a8f2aa72a94ab7d5c0380a1b7bc19442573181550890a39b5c797
certification: db1d0848e2717b23704172b29c785522fc1d9af507df0d97418f06f131877ccb
```

The laboratory never mounts the archive. A one-shot low-priority background process extracts it into a candidate Docker volume, verifies the complete file inventory, starts an isolated MySQL validator without a published port, runs complete baseline and capability validation, relocks the application accounts, shuts down cleanly, removes the validator container, and publishes an external sealed-volume record. The certified SQL source manifest is reused; it is not regenerated from the unchanged 2.9 GB dump for every standby.

Routine reset preserves the dirty volume, recreates the same public container around the sealed standby, and performs only target, mount, image, runtime, startup, writer, read-only, and denial checks. Readiness is published last. The dirty volume is deleted only after success, and the next standby begins preparation immediately.

If preparation is still running, reset locks application access and waits. A missing, modified, blocked, or failed standby is discarded and rebuilt from the physical template. If physical recovery fails, the protected SQL is restored into a new candidate volume and completely validated. The dirty volume remains preserved until one clean candidate succeeds.

## Accounts, readiness, and failure behavior

Local mode-600 credentials are generated for:

- `root`: container bootstrap only;
- `test_database_admin`: database-scoped reset and validation;
- `alertas_fake`: `SELECT`, `INSERT`, `UPDATE`, `DELETE` on `test_database.*` only;
- `monitor_source_ro`: `SELECT`, `SHOW VIEW` on `test_database.*` only and global `USAGE`.

Only one reset can run at a time. Before switching volumes, reset removes readiness, locks both application accounts, and terminates their sessions. Complete pristine-baseline validation occurs before a standby is sealed. Promotion unlocks the accounts while readiness remains absent, runs quick application-capability checks, and then writes readiness last. If every clean replacement path fails, reset recreates the public runtime around the preserved previous dirty volume, verifies it, unlocks its accounts, and republishes readiness. Only a failed replacement plus failed rollback leaves readiness absent and accounts locked.

Monitor denial tests require MySQL access-denied error codes; unrelated SQL errors do not count. Monitor was denied `INSERT`, `UPDATE`, `DELETE`, `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`, `SET GLOBAL`, `CREATE USER`, and `GRANT`. The writer passed insert/update/delete inside a rolled-back transaction. All 111 views compile as the Monitor account with `SELECT ... LIMIT 0`.

Container client files use port 3306. Separate ignored `*.host.cnf` files use `127.0.0.1:3307` for host-side application access. Stage 3 added pinned `mysql2` driver access and proved writer DML in a rolled-back transaction, bounded A02/A05 reads through the parameterized text-query path, and a denied Monitor write through the host listener. The final classification and mappings are in [`test_database_stage3_handoff.md`](./test_database_stage3_handoff.md).

Consumers added after merge must require readiness and must not poll during reset.

## Commands

```sh
npm run db:test-source:start
npm run db:test-source:status
npm run db:test-source:validate
npm run db:test-source:validate-baseline
npm run db:test-source:driver-probe
npm run db:test-source:query-plans
npm run db:test-source:reset
npm run db:test-source:reset:full
npm run db:test-source:standby:prepare
npm run db:test-source:template:build
npm run db:test-source:stop
```

`validate` is a non-mutating operational health check and remains usable after fake alerts change records. `validate-baseline` expects pristine reset data and includes rollback-only writer and denial probes. `driver-probe` requires readiness, refuses an active reset, and verifies both host-side application accounts through pinned `mysql2` without retaining writes. Complete baseline validation runs while each standby is prepared; healthy promotion reuses that certification and runs only the fast safety and capability checks. `query-plans` executes A02/A03/A05 as real 1,000-row keyset pages through the Monitor account and saves local plans without printing rows.

`reset` promotes the sealed physical standby and starts preparation of its replacement. `reset:full` deliberately reconstructs a new candidate from the protected SQL and is the final recovery drill. `standby:prepare` prepares synchronously for diagnostics; normal resets use the one-shot low-priority background launcher. `template:build` is a separately authorized one-time command and refuses to overwrite the accepted template.

This tooling is intentionally local, single-user, development-only, and tied permanently to the July 22 baseline and pinned MySQL image. It has no production, replication, point-in-time-recovery, baseline-update, or MySQL-upgrade path. If either permanent input must change, build and review a new reset system rather than modifying this accepted template in place.

## Physical-reset acceptance measurements

Five representative dirty-to-clean routine resets completed in 4.798, 4.735, 5.096, 4.493, and 4.669 seconds. Median time was 4.735 seconds and worst time was 5.096 seconds, compared with the previous approximately 150-second SQL reconstruction. Every run removed its committed synthetic dirty row and restored the accepted baseline.

Median measured phases were 0.401 seconds before container switching, 3.441 seconds for MySQL startup, 0.395 seconds for locked checks, 0.381 seconds for writer/read-only/denial capability checks, and 0.024 seconds to publish readiness. The worst observed MySQL startup was 3.818 seconds; every healthy end-to-end run stayed below the 30-second contract.

Low-priority standby extraction and complete validation ran after each reset while the live database remained ready. Observed preparation was approximately two minutes on the 8 GB Colima runtime and completed before the next manual reset. The LaunchAgent ran once per request with `KeepAlive=false` and did not restart after success. An explicit protected-SQL reconstruction, complete validation, and promotion took 276.240 seconds. A separate drill injected an invalid physical certification anchor; physical preparation failed without modifying the live database, automatic SQL fallback succeeded, and promotion completed in 278.990 seconds. These are recovery results, not healthy-reset performance results.

The stopped baseline occupies approximately 6.08 GiB, its compressed template archive occupies 1,040,341,248 bytes, and an active Docker volume reports approximately 6.536 GB. Normal steady state contains one active volume, one similarly sized sealed standby, and the archive, keeping additional reset storage within the approved approximately 10 GB allowance.

Reset refuses an inexact database name, non-loopback host, wrong port or Docker context, changed runtime identity, writable backup mount, unattested/stopped runtime, concurrent reset, invalid standby seal, or missing `ALLOW_TEST_DATABASE_RESET=yes`. Template and standby preparation additionally refuse changed source, archive, manifest, certification, file inventory, MySQL image, or safety configuration.

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
- A02 has 1,249 unique keys in two keyset pages; A03 has 7 unique keys in one page; A05 has 838 unique keys in one page;
- all three MySQL plans use indexed access with no full-table scan; and
- protected compressed and uncompressed backups have the same SHA-256.

Versioned reconciliation digests:

```text
independent dump manifest: 57fd1829dead0eb9078c19ddb00162bb3591782bc5bfdf02ba94742eef8cc939
expanded schema metadata:  6d4207d4d036cf9fdf91d35cd10667684c625efa710bae8e59c02e83ad96cdb9
table checksums:           a5df7f866bd4aad0f253fe0b7ee86801af3cf93b145d308fbd29a7036ddf5654
```

Two supplied tables intentionally lack primary keys: `centro_costo_usuario` and `documento_relaciones`. Their source unique constraints are preserved; no redesign was introduced.

A03 uses an active, nondeleted OT whose actual start is at least 15 minutes old and has no nondeleted material row with `cantidad_consumida > 0`. Any positive consumption prevents A03; zero, null, absent, or deleted consumption does not. This approved Stage 4 predicate is versioned in the A03 query contract and does not infer a first-consumption timestamp.

## Aurora and branch boundaries

Local MySQL cannot prove Aurora replication, failover, managed credentials, replica lag, production authorization, production load, or production plans. These remain Phase 10 evidence.

Stage 4 connected both application accounts through readiness/reset guards and the normal scheduler, while retaining the synthetic simulator until Stage 5 replacement acceptance. It validated incident lifecycle only; routing, Dashboard, conversation, message, and Chat UI acceptance remains in Stage 5.
