# Phase 6 `test_database` Reset Performance Branch Plan

**Purpose:** This file is the execution prompt and branch context for improving the fixed Phase 6 development-database reset.

**Planned branch:** `codex/phase6-test-database-reset-performance`

**Status:** Ready to use only after the current laboratory UI and connected `test_database` work is tested, committed, and pushed. Create the performance branch from that exact clean checkpoint.

## Branch instruction

Execute this plan only on `codex/phase6-test-database-reset-performance`. Keep every change unmerged until separately reviewed. Do not modify the laboratory UI, its reset button, the reset API route, or Stage 8B behavior. Preserve the existing contract:

`Reset database button -> existing API endpoint -> test-database-reset.sh -> progress/result returned to the same UI`

The parallel Stage 8B branch must not modify the reset button or reset scripts. This branch must not modify unrelated Stage 8B files.

## Diagnosis

The current reset restores one 2.9 GB SQL file containing approximately 10.3 million rows, 378 tables, and 111 views through one sequential MySQL client. Recent evidence attributes approximately 128 seconds to that import, 13 seconds to pre-unlock validation, and 16 seconds to baseline validation. The sequential logical import is therefore the primary bottleneck. Repeated dump hashing, compressed-dump comparison, manifest regeneration, and duplicated validation add secondary delay.

This is a fixed Phase 6 development artifact. The approved baseline is not expected to change, and this reset system will not be used in production. The parallel baseline should be generated once from the verified development baseline.

## Guiding policies

1. Optimize the reset implementation, not the laboratory interface.
2. Reload the complete database; do not attempt reverse transactions or partial cleanup.
3. Preserve every existing destructive-action safeguard, account lock, reset lock, readiness rule, runtime attestation, and failure-closed behavior.
4. Keep the original protected SQL reset as the authoritative fallback.
5. Certify the parallel baseline once with the complete existing validation suite. Routine resets must still prove exact baseline equivalence.
6. Prefer the existing pinned MySQL server/client toolchain. The host has no `mysqlsh`, but the pinned MySQL 8.0.43 ARM64 container already contains `mysql`, `mysqldump`, `mysqlpump`, and `mysqlsh`. The default candidate uses `mysqldump`, `gzip`, and multiple `mysql` clients; it requires no host installation and keeps `local_infile=OFF`.
7. Do not weaken validation merely to improve the reported duration. Remove duplicate work only when equivalent evidence remains.
8. Do not delete or archive existing artifacts as part of implementation. Identify archive candidates after the new path is accepted.

## Proposed restore format

The first implementation candidate is a repository-defined, compressed SQL artifact generated once from the locked, verified baseline:

1. `schema.sql.gz` contains the deterministic schema and view definitions but no table data.
2. `data/` contains gzip-compressed `mysqldump --no-create-info` SQL chunks. Every chunk uses extended inserts, preserves binary values with `--hex-blob`, avoids table locks, contains no credentials, and is independently loadable by the existing `mysql` client.
3. Small tables use one chunk. Large tables with a single numeric primary key use complete, non-overlapping key ranges. The current database is materially skewed: `cotizacion_estructura_formulas` is approximately 1.2 GB despite only about 5,856 rows, while `cotizacion_rango_valores` has about 2.9 million rows. Chunk boundaries must therefore be balanced using measured uncompressed bytes, not row count alone.
4. The two tables without primary keys, currently `documento_relaciones` and `centro_costo_usuario`, remain single-table chunks and receive explicit row-count and checksum validation.
5. Each data worker runs `gzip -cd <chunk> | mysql ...` with shell `pipefail`, a unique log, session-scoped foreign-key and uniqueness checks disabled only for that worker, and automatic session closure on failure. The database-wide orphan, DDL, row-count, and checksum validations remain mandatory afterward.
6. The orchestrator starts a bounded worker pool, stops launching work after the first failure, terminates and waits for active siblings, records every completed chunk, and never advances to validation unless every manifest entry completed exactly once.
7. The manifest records phase, table, key-range predicate where applicable, expected rows, compressed and uncompressed bytes, file SHA-256, schema digest, expected final auto-increment values, and a deterministic payload-root digest.

This is a candidate until Step 3 proves that it is both exact and materially faster. MySQL Shell remains an alternative spike only if its `local_infile` requirement receives separate approval; it is not the default architecture.

## Performance and input-security model

Routine reset time must be reported as six separate phases: artifact attestation, drop/schema creation, parallel data load, locked integrity validation, post-unlock capability validation, and readiness publication. One-time artifact generation and certification are not part of routine reset timing and must be reported separately.

The implementation must satisfy these controls:

1. Compare the legacy reset, a one-worker load of the new artifact, and the selected parallel load. This separates gains from the new format, compression, removed duplicate work, and concurrency.
2. Balance chunks so the slowest worker is not dominated by the approximately 1.2 GB table. Record per-chunk wait, load, rows, bytes, and exit status without recording row values.
3. Parse the manifest with a strict JSON parser and schema validator. Never `source`, `eval`, or interpolate manifest values into shell commands.
4. Accept only normalized relative artifact paths matching a restrictive generated naming convention. Reject absolute paths, `..`, symlinks, hard links, devices, sockets, unexpected files, duplicate entries, overlapping ranges, and files outside the certified root.
5. Verify the certification marker, manifest hash, every compressed-file hash, expected compressed size, and `gzip -t` before dropping the database. Bound the declared uncompressed size of every chunk and the total artifact so a malformed artifact cannot create uncontrolled CPU, disk, or pipe consumption.
6. Treat SQL chunks as executable privileged input. Execute only files covered by the certified manifest, through the reset credential file, with credentials absent from arguments and logs.
7. Use a bounded worker pool with explicit process IDs. On the first nonzero pipeline status, stop dispatch, terminate remaining workers, wait for all children, preserve redacted diagnostics, and leave accounts locked and readiness absent.
8. Do not count a faster import as success if attestation, locked validation, capability validation, or cleanup becomes slower or less complete. Compare complete reset wall time and every phase across three runs.

## In scope

- `scripts/test-database-reset.sh`
- `scripts/test-database-common.sh`
- `scripts/test-database-runtime.sh` only if the loader/runtime contract requires it
- `scripts/test-database-validate.sh`
- `scripts/test-database-dump-manifest.py` and `scripts/test-database-compare-manifest.py` only where the fallback or certification contract requires changes
- New baseline-generation and reset-contract test scripts under `scripts/`
- New full and parallel restore backends plus a strict manifest parser under `scripts/`
- Reset commands in `package.json`
- `docs/delivery/phases/phase6/test_database.md`
- A new ignored artifact folder under `local-data/database/derived/`, recommended as `local-data/database/derived/test-database-parallel-v1/`

## Out of scope

- Laboratory HTML, CSS, JavaScript, interactions, annotations, or layout
- The reset button and its browser behavior
- Reset API routes, API response shape, and progress stages unless an unavoidable compatibility defect is first demonstrated
- A02, A03, A05 source actions or detection rules
- Stage 8B product work
- Monitor production architecture or deployment
- Reverse-transaction journals
- Production database reset tooling
- Cleanup, deletion, or archival of existing evidence, except the documented authority transition for this plan after acceptance

## Final ownership and filesystem contract

The branch must end with one owner for each responsibility:

| Responsibility | Sole owner |
| --- | --- |
| Public reset lifecycle, locks, account state, readiness, backend selection and stdout compatibility | `scripts/test-database-reset.sh` |
| Original protected SQL import only | `scripts/test-database-restore-full.sh` |
| Certified chunk verification and bounded parallel load only | `scripts/test-database-restore-parallel.sh` |
| One-time artifact generation and certification | `scripts/test-database-build-parallel-baseline.sh` |
| Strict manifest schema, path validation and digest computation | `scripts/test-database-parallel-manifest.mjs` |
| Runtime/schema/data/capability validation | `scripts/test-database-validate.sh` |
| Constants, safe-target checks, runtime attestation and credential-preserving MySQL helpers | `scripts/test-database-common.sh` |
| Current operational documentation after acceptance | `docs/delivery/phases/phase6/test_database.md` |

Backends must not lock or unlock accounts, create readiness, remove lifecycle locks, select another backend, or call each other. They return success only after their restore stream finishes; the public orchestrator alone advances the lifecycle.

Use this final local-only layout:

```text
local-data/database/
  staging_emusa_core-20260723-025548.sql       # immutable original authority
  staging_emusa_core-20260723-025548.sql.gz    # verified compressed copy
  derived/                                     # reproducible development artifacts
    test-database-parallel-v1/                 # immutable after certification
      manifest.json
      certification.json
      schema/
        schema.sql.gz
      data/
        ...certified SQL chunks...
    .building-<attempt-id>/                     # same-filesystem temporary output

local-data/test-database/
  secrets/                                     # existing mode-600 credentials
  state/                                       # only ready and lifecycle locks
    ready
    reset.lock/                                # atomic mkdir lock directory
    generation.lock/                           # atomic mkdir lock directory
  tmp/                                         # disposable per-attempt worker state
    reset-<attempt-id>/
      progress.json
      worker-<n>.log
  evidence/
    reset-performance/<run-id>/                # timings and value-free validation
```

Keep the two original source files at their current canonical paths. Moving them would invalidate the existing read-only Docker mount and force an unrelated container reconfiguration without improving reset time. Put only derived artifacts under `derived/`; do not create compatibility symlinks or duplicate active source copies. Generate temporary artifacts under `derived/` so final publication can use an atomic rename on the same filesystem. Keep attempt progress under `tmp/`, not `state/`; `state/` must contain only durable readiness and exclusion-lock directories.

During execution, this file is the branch plan. After acceptance, consolidate all durable operating instructions and accepted digests into `test_database.md`, update any active Phase 6 pointer, move this completed plan to `archive/docs/implementation/`, and leave no second active reset authority.

## Execution plan

### 1. Establish the clean branch baseline

1. Verify the branch name is exactly `codex/phase6-test-database-reset-performance`.
2. Verify it starts from the approved laboratory checkpoint.
3. Require a clean worktree before implementation.
4. Record the exact starting commit and current reset command contract.
5. Stop if the laboratory checkpoint, branch, or cleanliness gate is wrong.

### 2. Measure the existing reset by phase

1. Add non-invasive monotonic timing around target validation, dump checks, manifest generation, database recreation, SQL import, pre-unlock validation, baseline validation, and readiness publication.
2. Emit one ignored machine-readable timing artifact without exposing credentials or source data.
3. Run the existing reset three times from comparable mutated states and retain every complete validation result. Use median phase and complete-reset times as the comparison baseline; a single run is insufficient.
4. Record CPU, memory pressure, database-volume free space, artifact filesystem free space, and worker count with each timing run so hardware contention is not mistaken for a code improvement.
5. Use these runs as the comparison baseline; do not estimate improvement from total wall time alone.

### 3. Prove the parallel loader before replacing anything

1. Start with the proposed compressed SQL artifact using the existing pinned `mysqldump`, `gzip`, and `mysql` tools. Do not introduce a new executable unless this candidate fails its proof.
2. Preserve `local_infile=OFF`. MySQL Shell `util.loadDump()` requires `LOAD DATA LOCAL INFILE`, so it is incompatible with the current default safety contract. Do not enable `local_infile`, even temporarily, unless the user separately approves that security-boundary change after reviewing its failure behavior. Without that decision, MySQL Shell is disqualified.
3. Record the selected executable or image digest, version, license, ARM64 support, invocation, credential-file handling, and artifact ownership. Never place passwords in command arguments, manifests, timing output, or logs.
4. Confirm compatibility with MySQL 8.0.43, the isolated Colima context, loopback-only host exposure, fixed schema, views, collations, generated columns, enum values, packet limits, and the existing four-account permission model.
5. Create a disposable spike outside the active reset path. Do not modify the default reset or approved artifact directory during the spike.
6. Inventory exact table bytes, row counts, primary keys, maximum row size, foreign-key dependencies, and dump output sizes before defining chunks. Load schema deterministically first; partition data so concurrent workers never overlap key ranges; and handle the two identified no-primary-key tables explicitly.
7. Demonstrate consistent export and reload semantics, including foreign-key handling, indexes, views, generated columns, table options, auto-increments, warnings, resumability state, and cleanup after worker failure. Treat any new coercion or truncation warning as failure; the generated baseline must not depend on silently changed values.
8. Benchmark worker counts `1`, `2`, and `4` on the same hardware and artifact. Select the fastest count that remains repeatable and does not exhaust memory, disk, connections, or I/O; do not hard-code four merely because four CPUs are allocated.
9. Compare exact row counts, auto-increments, schema metadata, table definitions, view definitions, enum audit counts, table checksums, permissions, and source-specific integrity checks with the current accepted baseline.
10. If dependency safety, exact equivalence, or a meaningful speed improvement cannot be proved, stop without changing the default reset.

### 4. Build the fixed parallel baseline artifact

1. Add a one-time generator, recommended as `scripts/test-database-build-parallel-baseline.sh`.
2. Require the exact safe target, attested runtime, explicit generation authorization, and an absent reset or generation lock.
3. The generator owns the generation lifecycle: atomically acquire `generation.lock/`, refuse an existing `reset.lock/`, remove readiness, atomically acquire `reset.lock/` on behalf of its internal restore, lock both application accounts, and terminate their sessions. Routine reset must symmetrically refuse `generation.lock/`.
4. Invoke the full restore backend through the shared lifecycle without the ordinary success unlock. Run locked integrity validation and keep readiness absent and both accounts locked.
5. Open one persistent root session, execute `FLUSH TABLES WITH READ LOCK`, and keep that exact session alive throughout export. Abort if the lock session exits. Export only while this database-level read lock is held; application-account locks alone are not sufficient protection against a privileged or manual write.
6. Release the database read lock only after every chunk process has finished and its output has been closed, hashed, and inventoried.
7. Refuse to overwrite an existing certified parallel baseline. Replacement is outside this fixed-baseline plan and requires separate authorization.
8. Generate into a unique temporary sibling directory, never directly into `local-data/database/derived/test-database-parallel-v1/`. Remove an incomplete temporary directory on ordinary failure while preserving a diagnostic record.
9. Write a value-free manifest containing the format version, generator and MySQL versions, source SQL SHA-256, table/view counts, complete payload inventory, individual file hashes, a deterministic payload-root digest that excludes the manifest itself, creation time, and accepted baseline digests.
10. Reload the temporary artifact into a newly recreated `test_database`, run both validation phases, and compare it with the accepted SQL baseline before publication. Relock accounts after the capability phase while publication is pending.
11. After certification, write a separate final certification marker containing the manifest SHA-256 and validation evidence digest. Publish the artifact through one atomic rename. The loader must reject temporary directories, unexpected extra files, and any artifact whose payload, manifest, or certification marker does not match.
12. Set the published folder to mode `700` and regular artifact files to mode `600`; expose it read-only during routine reset.
13. Unlock accounts and restore readiness only after publication and a final capability check against the published artifact. Release both lifecycle locks only through one cleanup path. Any generation or certification failure leaves readiness absent and accounts locked until an explicit full recovery reset succeeds.

### 5. Refactor reset restoration without changing its public contract

1. Preserve `npm run db:test-source:reset` and `scripts/test-database-reset.sh` as the public entry points.
2. Keep the existing target guard, authorization, exclusive lock, free-space check, account locking, connection termination, readiness removal, failure cleanup, warning/error reporting, validation, account unlocking, and readiness publication.
3. Preserve the stdout milestones currently consumed by `apps/api/src/test-database-reset.ts`: `Dropping and recreating`, `Streaming the read-only protected backup`, and `Rebuild passed`. Treat them as compatibility markers even when the middle marker represents the certified parallel artifact; document that legacy wording until the API contract is changed on a separately authorized branch.
4. Add an internal parallel restore backend that verifies the complete artifact before dropping the database and loads it with the worker count accepted by Step 3.
5. Keep loader progress and resume metadata in `local-data/test-database/tmp/reset-<attempt-id>/`, never in durable `state/` or inside the read-only certified artifact. Bind progress to the artifact digest and reset attempt ID; refuse stale progress from another artifact or attempt.
6. Preserve the current SQL restore as an explicit full fallback, recommended through `TEST_DB_RESET_MODE=full` or a clearly named package command.
7. Never silently fall back after a partial parallel load. Fail closed, leave readiness absent and application accounts locked, then require an explicit full recovery reset.
8. Do not change the button, endpoint, response shape, or API progress contract.

### 6. Remove duplicate work without removing evidence

1. Hash and attest each input artifact once per reset execution, then reuse that trusted result within the same process.
2. Do not regenerate the legacy SQL manifest during a routine parallel reset.
3. Refactor validation into two explicit phases rather than trying to run the current `baseline` mode unchanged while accounts are locked:
   - **Locked integrity phase:** using only root/reset credentials, prove runtime configuration, schema metadata, exact rows, auto-increments, table and view definitions, enum audits, orphan checks, source-specific counts, table checksums, grants, and that both application accounts remain locked.
   - **Post-unlock capability phase:** unlock the accounts while readiness remains absent, compile all views as `monitor_source_ro`, prove writer DML inside a rollback transaction, run the complete read-only denial matrix, and confirm account state.
4. If the post-unlock capability phase fails, the reset cleanup must immediately relock both accounts, keep readiness absent, and fail. Publish readiness only after both phases pass.
5. Make `health` validation require the final readiness record and independently recheck runtime attestation, account state, schema metadata digest, grants, and application connectivity without regenerating or trusting a new baseline manifest.
6. Batch independent scalar validation queries where this changes only process overhead and each failed assertion remains individually identifiable in evidence.
7. Keep exact row reconciliation, auto-increment checks, schema/view comparison, enum audits, orphan checks, table checksums, writer proof, monitor denial proof, account state, and readiness proof.
8. Keep legacy SQL-specific transformations and warning checks inside the full fallback path rather than the parallel routine path.

### 7. Add failure and equivalence tests

Cover at minimum:

1. Missing artifact folder.
2. Missing or malformed manifest.
3. Modified chunk or digest mismatch.
4. Unexpected extra artifact file, overlapping or missing key range, duplicated chunk, missing table, or wrong load phase.
5. Wrong target database, host, port, Docker context, image, volume, or mounts.
6. Concurrent reset or generation lock.
7. Insufficient disk.
8. Interrupted or failed parallel worker, including stale progress from a prior attempt.
9. Absolute path, traversal path, symlink, hard link, unexpected file type, duplicate manifest entry, manifest command injection, decompression-size violation, or gzip corruption.
10. `local_infile` is still `OFF` before and after every routine and failed reset.
11. Application accounts remain locked and readiness remains absent after failure.
12. Successful reset unlocks accounts and writes readiness last.
13. Full fallback restores the same accepted baseline.
14. The existing API coordinator can execute the unchanged shell contract.
15. No laboratory or Stage 8B file changes.

### 8. Benchmark repeatability

1. Mutate the disposable database through representative inserts, updates, and deletes before each run.
2. Execute three complete parallel resets.
3. Require every run to pass the full equivalence and safety contract.
4. Compare median phase timings with the recorded sequential baseline.
5. Switch the parallel loader to the default only if its median complete reset is at least 30% faster and no safety or equivalence assertion is weakened. Record a preferred target of 60 seconds or less, but do not falsify acceptance if the hardware cannot reach it.
6. Execute one explicit full SQL fallback reset after the repeatability runs and prove it reaches the same baseline.

### 9. Update documentation and prepare review

1. Update `test_database.md` with the fixed development-only artifact, one-time generation command, routine parallel reset, full fallback, timing evidence, failure recovery, and non-production boundary.
2. Update `package.json` commands without renaming the existing public reset command.
   - `db:test-source:reset` runs the certified parallel backend.
   - `db:test-source:reset:full` runs the protected original SQL backend.
   - `db:test-source:baseline:build` performs the separately authorized one-time artifact build.
3. Record exact files added or changed, artifact location and size, tool/image digests, benchmark results, validation results, and remaining limitations.
4. List evidence files eligible for later archival, but do not move or delete them on this branch without separate authorization.
5. After acceptance, make `test_database.md` the sole active operational authority and archive this completed plan as specified by the filesystem contract. Do not archive execution evidence as part of that authority transition.
6. Run shell syntax checks, focused tests, reset contract tests, three parallel resets, one full fallback reset, complete baseline validation, source health, relevant Stage 5 reset consumers, and `git diff --check`.
7. Stop with the branch unmerged for review. Do not push or merge unless separately instructed.

## Acceptance criteria

The branch is acceptable only when all of the following are true:

- The laboratory reset button and API contract are unchanged.
- Stage 8B files are untouched.
- The fixed parallel artifact is reproducible, completely attested, ignored, and development-only.
- Three parallel resets restore the exact accepted baseline.
- The complete safety and validation contract remains effective.
- `local_infile` remains `OFF` throughout successful and failed routine resets.
- Failure leaves accounts locked and readiness absent.
- The original SQL reset remains usable and proves the same baseline.
- The median complete reset improves by at least 30% over the recorded sequential baseline.
- Documentation explains routine reset, full recovery, artifact location, and non-production scope.
- The final filesystem contains one certified parallel artifact, no duplicate active source dump, no stale build or reset-attempt directory, and no compatibility symlink.
- `test_database.md` is the sole active operational authority after acceptance; this plan is historical and no contradictory reset instructions remain active elsewhere.
- All changes remain unmerged pending separate review.

## Expected workspace organization

```text
scripts/
  test-database-common.sh
  test-database-runtime.sh
  test-database-reset.sh
  test-database-restore-full.sh                 # legacy SQL backend
  test-database-restore-parallel.sh             # routine parallel backend
  test-database-validate.sh
  test-database-build-parallel-baseline.sh     # new
  test-database-parallel-manifest.mjs           # strict artifact parser
  test-database-reset-contract.test.mjs

local-data/database/
  staging_emusa_core-20260723-025548.sql       # original protected authority
  staging_emusa_core-20260723-025548.sql.gz
  derived/test-database-parallel-v1/           # certified development artifact

docs/delivery/phases/phase6/
  test_database.md                             # updated operational authority

archive/docs/implementation/
  test_database_reset_performance_plan.md      # this plan after acceptance
```

## Stop conditions

Stop and report without replacing the default reset if:

- the starting branch or checkpoint is wrong;
- the worktree is dirty before branch implementation;
- the parallel tool is incompatible or requires an unapproved external dependency;
- the selected loader requires `local_infile=ON` without a separate explicit user decision;
- exact baseline equivalence fails;
- any existing safety guard would need to be removed;
- the API or UI contract would need redesign;
- the parallel path is not materially faster;
- the full SQL fallback cannot independently restore the accepted baseline.
