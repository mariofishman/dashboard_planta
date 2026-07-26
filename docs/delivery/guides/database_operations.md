# Local Database Operations Runbook

This runbook applies to Monitor's disposable local PGlite database at `local-data/monitor/pglite`. It does not apply to the protected EmusaSoft backup, PostgreSQL staging, or production.

## Safety rules

1. Never copy, archive, synchronize, move, or restore a PGlite data directory while the API, a migration, a test, or any other process has it open.
2. Never run `npm run db:migrate` against the same directory while `npm run dev:api` or `npm run dev` is running.
3. Never remove `local-data/monitor/pglite.monitor-lock` merely to bypass the lock. Stop the owning process first. The runtime automatically archives a stale application lock when its recorded process no longer exists.
4. Never use Finder duplication, `cp`, `rsync`, a cloud-sync client, or a backup utility against the live directory. Copying individual PostgreSQL/PGlite files does not create a transactionally consistent backup.
5. Keep the protected EmusaSoft backup under `local-data/database/` immutable. Monitor's local database and the protected backup are different assets.
6. Treat `local-data/` as disposable and uncommitted. Do not commit PGlite data, archives, credentials, or recovered rows.

The application lock prevents two Monitor runtimes from opening the same file-backed PGlite directory. It does not make a live filesystem copy safe.

## Safe development commands

### Start the complete local application

```sh
npm run dev
```

This starts one API process and one web process. Do not start a second API or run a migration until the first API has stopped.

### Start only the web interface

```sh
npm run dev:web
```

This does not open PGlite and is safe for interface-only work.

### Start only the API

```sh
npm run dev:api
```

### Reset the local responsibility roster

Keep the local API running, then execute:

```sh
npm run db:reset-roster
```

The command refuses non-local servers, saves the current roster under
`local-data/monitor/roster-backups/`, restores the versioned 13-person original
fixture through the validated roster API, and verifies the restored count.
Refresh the browser before repeating an Excel-import test.

### Run migrations

Stop the API first, then run:

```sh
npm run db:migrate
```

The command opens the configured database, applies the idempotent migrations, checks readiness, closes the database, and releases the application lock.

### Use an isolated disposable database

Use a different directory when a second local API, experiment, or destructive test must run concurrently:

```sh
MONITOR_PGLITE_DATA_DIR=local-data/monitor/pglite-scratch npm run dev:api
```

Never point two processes at the same `MONITOR_PGLITE_DATA_DIR`.

## Create an offline backup

1. Stop every API, migration, and test process that can use the database.
2. Confirm that `local-data/monitor/pglite.monitor-lock` is absent. If it exists, identify and stop the recorded live process; do not delete a live lock.
3. Archive the closed directory as one unit:

```sh
test ! -e local-data/monitor/pglite.monitor-lock
tar -C local-data/monitor -czf "local-data/monitor/pglite-backup-$(date +%Y%m%d-%H%M%S).tgz" pglite
```

4. List the archive before relying on it:

```sh
tar -tzf local-data/monitor/pglite-backup-YYYYMMDD-HHMMSS.tgz | head
```

An archive produced while the database was open is invalid even when the command completed successfully.

## Recover a local database failure

Typical symptoms include the API failing during PGlite startup, repeated PostgreSQL/WASM storage errors, readiness failure, or a directory that cannot be reopened after an interrupted copy or process.

1. Stop all Monitor API, migration, and test processes.
2. Preserve the failed directory for diagnosis; do not copy files out of it into a healthy database:

```sh
mv local-data/monitor/pglite "local-data/monitor/pglite-corrupt-$(date +%Y%m%d-%H%M%S)"
```

3. Choose one recovery path:
   - restore a verified archive created while the database was closed; or
   - create a clean disposable database by running the migrations with no `local-data/monitor/pglite` directory present.
4. For a clean database, run:

```sh
npm run db:migrate
npm run dev:api
```

5. Verify readiness from another terminal:

```sh
curl --fail --silent http://127.0.0.1:3000/health/ready
```

6. Run the database and API tests before continuing work:

```sh
npm test --workspace @monitor/database
npm test --workspace @monitor/api
```

Do not merge the failed directory with the restored or newly migrated directory.

## Restore a verified offline archive

1. Stop all processes that may open PGlite.
2. Confirm that the target application lock is absent.
3. Preserve any existing target directory by renaming it.
4. Inspect and extract the verified archive into `local-data/monitor/`.
5. Run `npm run db:migrate`, start the API, and check `/health/ready`.
6. Keep the preserved directory until the restored database and required local records have been verified.

Never restore over an existing or open PGlite directory.

## Incident record: 2026-07-26 local PGlite failure

- The local PGlite directory stopped opening and was preserved as `local-data/monitor/pglite-corrupt-20260726-1054`.
- A clean local database was created and migrations restored service.
- The repository now acquires `local-data/monitor/pglite.monitor-lock` before opening a file-backed PGlite directory, rejects concurrent live use, archives stale application locks, and releases the lock on close.
- The exact low-level corruption mechanism was not proven. A live or incomplete filesystem copy is unsafe and is prohibited regardless of whether it caused this incident.
- The roster Excel flow was not the cause in this prototype: it currently updates React component state and has no database-write endpoint. When persistence is implemented, imports must use one server-side transaction and the API must repeat all validation and authorization.

## Escalation and evidence

When the clean database also fails, stop retrying and preserve:

- the failed directory without modifying it;
- the application error and stack trace;
- the command that opened the database;
- the configured `MONITOR_DATABASE_MODE` and `MONITOR_PGLITE_DATA_DIR` without secrets;
- whether another API, migration, test, copy, sync, or backup process was active; and
- the last known successful readiness check.

Do not print operational rows or credentials while collecting evidence.
