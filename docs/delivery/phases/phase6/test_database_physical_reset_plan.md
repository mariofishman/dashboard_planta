# Phase 6 `test_database` Physical Reset Plan

**Purpose:** Implement the approved sealed physical-template and prepared-standby reset for the fixed July 22 development baseline.

**Planned branch:** `codex/phase6-test-database-reset-performance`

**Status:** Discovery approved; implementation has not started.

## Branch instruction

Execute only on `codex/phase6-test-database-reset-performance` from the approved clean laboratory checkpoint. Keep all changes unmerged until separately reviewed.

Do not modify the laboratory UI, reset button, reset API route, API response shape, or Stage 8B behavior. Preserve the public contract:

`Reset database button -> existing API coordinator -> scripts/test-database-reset.sh -> progress/result returned to the same UI`

## Approved operating context

These decisions are fixed for this plan:

1. This reset is local development tooling for one user. It will never be used in production.
2. The accepted July 22 baseline never changes.
3. Laboratory activity intentionally makes the live database dirty with disposable synthetic transactions.
4. MySQL may stop and restart during reset.
5. Up to approximately 10 GB of additional storage is acceptable.
6. Normal resets are separated by enough testing time to prepare the next clean copy.
7. All expensive content validation happens before reset, in the background.
8. A healthy routine reset performs only fast identity, target, startup, and connectivity checks.
9. A healthy routine reset must make the laboratory usable within 30 seconds of the click.
10. The next clean copy is prepared immediately after reset at low priority.
11. The exact pinned MySQL version remains fixed for the lifetime of this reset system.
12. The same MySQL container name, port, image, and public connection contract remain in use; the container is recreated around the selected volume.
13. If no prepared copy is ready, reset waits for preparation. If physical recovery fails, the current SQL reconstruction remains the automatic final fallback.
14. MySQL binary logging is disabled for this isolated runtime because its change history is disposable and neither replication nor point-in-time recovery is required.

## Current behavior and measured problem

The current script does not copy an already-built database. It:

1. Attests the protected 2.9 GB SQL backup and runtime.
2. Locks application accounts and removes readiness.
3. Drops and recreates `test_database`.
4. streams the SQL through host-side transformations into one MySQL client.
5. Rebuilds approximately 10.3 million rows, 378 tables, 111 views, and all indexes.
6. Runs complete pre-unlock and baseline validation.

Working evidence attributes approximately 128 seconds to SQL import, 13 seconds to pre-unlock validation, and 16 seconds to baseline validation. This explains the approximately two-and-a-half-minute reset.

The active Docker volume is currently approximately 21 GB: approximately 4 GB is `test_database` and approximately 15 GB is MySQL binary history. Copying that volume unchanged would be slower, consume excessive storage, and defeat the approved design. The physical template must therefore be built fresh with binary logging disabled; the existing dirty volume must not be destructively modified before a replacement succeeds.

## Target architecture

The reset ecosystem has four distinct artifacts:

| Artifact | Purpose | May MySQL run from it? | May the laboratory modify it? |
| --- | --- | --- | --- |
| Protected July 22 SQL backup | Ultimate reconstruction authority and fallback | Only through the full restore process | No |
| Sealed physical template archive | Certified, compressed, cleanly shut-down MySQL data directory | No | No |
| Prepared standby volume | Fully restored and validated next working database | Only in an isolated validator, then shut down and sealed | No |
| Active working volume | Live database used by the laboratory | Yes | Yes |

The physical template is not the active database and is never mounted as the live MySQL data directory. Routine reset promotes the sealed prepared standby to active use. After promotion, laboratory writes are expected and the volume becomes dirty. A new standby is then built from the unchanged physical template.

## Safety invariants

1. Keep every existing safe-target guard, explicit reset authorization, Docker-context check, loopback-only port, pinned image, credential-file handling, reset lock, account lock, readiness rule, and failure-closed behavior.
2. Keep the original SQL and gzip files at their current protected canonical paths and mounted read-only.
3. Pin the physical template archive digest, manifest digest, source SQL digest, exact MySQL image digest, structural server arguments, database metadata digest, and table-checksum digest in version-controlled authority outside the artifact directory.
4. Treat the physical archive as sensitive because the MySQL data directory contains local credential hashes. Keep it ignored, mode `600`, and mounted read-only only by the preparation process.
5. Build the template only from a fresh disposable volume restored from the protected SQL backup. Do not convert or sanitize the current dirty volume in place.
6. Disable binary logging at server startup with an attested configuration. Keep InnoDB redo logging enabled. Preserve `local_infile=OFF`.
7. Create the archive only after a clean MySQL shutdown. Never archive a running data directory.
8. Never run MySQL directly from the sealed template archive.
9. Never expose a prepared volume to the laboratory. After complete validation, shut it down cleanly, remove its validator container, and seal its exact volume identity in external state.
10. Preserve the previous dirty volume until the promoted database passes all routine safety checks. Delete it only after success.
11. Publish readiness last. A failure leaves application accounts locked and readiness absent.
12. Never attempt to repair questionable physical database files in place and then call them the accepted baseline. Discard the failed copy and rebuild from a trusted source.
13. Background template and standby work must use candidate-specific state and evidence directories. It must never remove, replace, or trust the active runtime's public readiness file.

“Sealed” has a precise local meaning: the prepared volume is stopped, has no container mount, carries the expected Docker labels, and is named by one atomically written external certification record. Project scripts refuse to mount it except for promotion or explicit disposal. Docker local volumes cannot be made globally immutable against a host administrator, so the threat model is accidental modification by this single-user development workflow, not a hostile user with Docker or root access. The read-only, fingerprinted physical template archive and protected SQL remain the recovery authorities if a standby seal is ever doubtful.

## Physical template format

Use one ignored derived artifact directory:

```text
local-data/database/derived/test-database-physical-v1/
  template.tar.zst
  manifest.json
  certification.json
```

`template.tar.zst` contains the complete cleanly shut-down MySQL data directory, created with the pinned container-provided `tar` and `zstd` tools.

`manifest.json` contains no credentials or row values. It records:

- format version;
- protected SQL SHA-256;
- exact MySQL image digest and version;
- required structural server arguments;
- binary logging disabled and InnoDB redo enabled;
- archive compressed and uncompressed sizes;
- archive SHA-256;
- deterministic inventory of archived relative paths, file types, modes, sizes, and SHA-256 values;
- accepted schema, table, view, row-count, auto-increment, permission, relationship, and table-checksum evidence digests.

`certification.json` records the manifest SHA-256, complete validation evidence digest, creation time, and the exact fresh build attempt. The version-controlled manifest and archive trust anchors must match these files; self-consistent files inside the derived directory are not sufficient.

A physical InnoDB rebuild is not required to produce byte-identical files because internal identifiers may differ. Certification proves database-level equivalence to the accepted July 22 baseline and then pins the exact accepted physical archive.

## Lifecycle A: one-time template build

1. Require the exact branch, safe target, Docker context, pinned image, explicit template-build authorization, enough disk space, and no reset or preparation lock.
2. Create a uniquely named temporary Docker volume and validator container. Do not touch the active working volume.
3. Start the temporary MySQL instance with the accepted runtime contract, `--skip-log-bin`, InnoDB redo enabled, `local_infile=OFF`, no public port, and the existing protected SQL and secrets mounted read-only.
4. Run the original full SQL restore into the temporary instance, including its exact transformation and warning-profile checks.
5. Run the complete existing baseline validation: runtime, schema, tables, views, rows, auto-increments, enums, permissions, application capabilities, relationships, and table checksums.
6. Relock application accounts, keep candidate-local readiness absent, and shut MySQL down cleanly with a bounded timeout. Abort if clean shutdown cannot be proved. Do not modify the live runtime's public readiness.
7. Mount the stopped volume read-only in a disposable archive helper using the pinned image. Generate the file inventory and `template.tar.zst` without following links or accepting unexpected file types.
8. Run the compression-format test and verify the archive and inventory digests. Then remove the first temporary volume before allocating the verification volume so the initial 16.5 GB of free Colima space is not exhausted.
9. Verify the archive by extracting it into a second temporary volume, verifying every inventoried file, starting MySQL, and rerunning complete validation.
10. Shut the verification instance down cleanly. Write the final manifest and certification marker, set restrictive permissions, and atomically publish the derived directory.
11. Pin the accepted manifest and archive digests in version-controlled reset authority.
12. Remove temporary containers and volumes only after certification succeeds. A failed build leaves the active database unchanged and publishes no template.

## Lifecycle B: background standby preparation

Run this automatically after template certification, after every successful reset, and at runtime startup when no valid standby exists.

1. Acquire an atomic preparation lock and refuse concurrent preparation.
2. Verify the external trust anchors, archive size and digest, manifest schema, pinned image, binary-log policy, and available disk before creating anything.
3. Create a unique candidate Docker volume. Extract `template.tar.zst` into it with a single low-priority decompression worker.
4. Verify the extracted file inventory before MySQL starts.
5. Start an isolated validator container with no published port. Use the same structural MySQL settings as the live runtime; resource-only validation settings may be lower so the live laboratory remains responsive.
6. Confirm root credential compatibility without exposing credentials.
7. Run the complete baseline and capability validation while the active dirty database remains available.
8. Relock the application accounts, keep candidate-local readiness absent, and shut the validator down cleanly. Candidate validation must write only to its attempt-specific evidence directory and must not update the live runtime's `latest` evidence pointers.
9. Remove the validator container and verify the candidate volume has no container references or mounts.
10. Apply the approved sealed-standby Docker labels. Write an external sealed-standby record containing the exact volume name, Docker labels, template and manifest digests, validation-evidence digest, validation time, and clean-shutdown proof. Publish this record atomically only after every step succeeds.
11. On failure, remove the candidate volume, preserve value-free diagnostics, keep any previously sealed standby, and leave the active database unchanged.
12. Redirect all detached-process output before the API reset child exits. Use the preparation lock and state record rather than trusting a PID alone.

Background preparation may consume CPU, memory, and disk, but must run at low priority. Benchmark the chosen resource limits and prove that preparation cannot exhaust the 8 GB Colima runtime or make the live laboratory unusable.

## Lifecycle C: healthy routine reset

The API coordinator already pauses local laboratory runtime state and clears Monitor-side experiments, incidents, conversations, polling state, change events, and interruptions. Preserve that behavior.

1. Acquire the existing reset lock, refuse an active preparation publication, require explicit reset authorization, remove readiness, lock both application accounts, and terminate their sessions.
2. Verify that the selected standby record is sealed, matches the external trust anchors, names an existing unmounted volume, passed complete validation, and was cleanly shut down. Do not rescan its tables or rows.
3. Stop the current MySQL container cleanly. Preserve its dirty volume under the current reset-attempt identity.
4. Remove only the disposable container wrapper.
5. Recreate the same named container with the same pinned image, loopback port, secrets, protected-backup mount, structural arguments, and `--skip-log-bin`, but attach the prepared volume as `/var/lib/mysql`.
6. Start MySQL and perform only the approved fast checks:
   - exact safe target and Docker context;
   - correct sealed volume, pinned image, arguments, mounts, and loopback port;
   - binary logging off, InnoDB redo on, and `local_infile` off;
   - MySQL healthy and `test_database` present;
   - application accounts initially locked.
7. While readiness remains absent, unlock the application accounts and run the quick writer, read-only, and denial/connectivity probes. Relock them immediately if any probe fails.
8. Publish readiness last.
9. Return success to the existing API coordinator, which clears related Monitor state before reporting completion.
10. Delete the previous dirty source volume after the promoted source database passes its quick probes and readiness is published. Monitor-side cleanup remains owned by the existing coordinator and does not control source-volume safety.
11. Launch preparation of the next standby immediately at low priority.

Measure normal reset time from the confirmed button request until the laboratory can use the new database. Every accepted healthy run must complete within 30 seconds; background preparation time is reported separately.

## Lifecycle D: unavailable or failed standby

If reset is requested while preparation is still healthy and in progress:

1. Prevent new laboratory transactions.
2. Preserve the dirty active volume.
3. Wait for preparation and complete validation.
4. Promote the result through the healthy routine sequence.
5. Classify the longer duration separately from the 30-second healthy-reset target.

If the prepared copy is missing, corrupt, blocked, or fails a quick check:

1. Keep application access locked and readiness absent.
2. Preserve the dirty volume.
3. Discard the questionable prepared copy.
4. Recreate a physical candidate from the trusted archive and run complete validation in the foreground.
5. Retry promotion once.
6. If physical reconstruction or promotion still fails, create another new candidate volume and invoke the protected SQL reconstruction there with binary logging disabled. Never run fallback reconstruction inside the preserved dirty volume.
7. Run complete validation on the SQL-restored candidate, shut it down cleanly, and promote it through the same volume-switch sequence.
8. Publish readiness and delete the dirty volume only after one recovery path succeeds.
9. If every recovery path fails, leave readiness absent, accounts locked, and the dirty volume preserved for diagnosis. Report the exact failed phase without exposing data or credentials.

The slow SQL fallback is successful recovery, not a performance pass, and may take approximately two-and-a-half minutes.

## Script ownership

| Responsibility | Sole owner |
| --- | --- |
| Public reset locks, account state, volume promotion, fallback selection, readiness, and stdout compatibility | `scripts/test-database-reset.sh` |
| Original protected SQL reconstruction into an orchestrator-selected candidate volume | `scripts/test-database-restore-full.sh` |
| One-time fresh-volume template build and certification | `scripts/test-database-build-physical-template.sh` |
| Archive verification, extraction, validation, sealing, and background preparation | `scripts/test-database-prepare-standby.sh` |
| Strict manifest, inventory, and sealed-state validation | `scripts/test-database-physical-manifest.mjs` |
| Container creation, clean shutdown, volume attestation, and pinned runtime arguments | `scripts/test-database-runtime.sh` |
| Full certification and fast promoted-volume validation modes | `scripts/test-database-validate.sh` |
| Constants, safe-target checks, credentials, paths, and shared helpers | `scripts/test-database-common.sh` |
| Current operating instructions after acceptance | `docs/delivery/phases/phase6/test_database.md` |

Backends must not unlock accounts, publish readiness, remove lifecycle locks, or silently call a different backend. The public reset orchestrator owns those transitions.

## Files in scope

- `scripts/test-database-reset.sh`
- `scripts/test-database-common.sh`
- `scripts/test-database-runtime.sh`
- `scripts/test-database-validate.sh`
- `scripts/test-database-restore-full.sh`
- New physical-template, standby-preparation, manifest, and contract-test scripts under `scripts/`
- `package.json` commands
- `docs/delivery/phases/phase6/test_database.md`
- The ignored physical template under `local-data/database/derived/`
- Ignored reset, standby, and evidence state under `local-data/test-database/`

## Out of scope

- Laboratory HTML, CSS, JavaScript, reset dialog, and browser behavior
- Reset API routes, response shape, and progress-stage types
- Alert source actions, detection rules, and Stage 8B work
- Production database architecture or deployment
- Reverse transactions or preservation of successful synthetic laboratory history
- Changing the July 22 baseline
- Upgrading the pinned MySQL version
- Cleanup of unrelated evidence

Preserve stdout milestones currently consumed by `apps/api/src/test-database-reset.ts`, including `Dropping and recreating`, `Streaming the read-only protected backup`, and `Rebuild passed`, even if the first two are compatibility messages for the physical path. Document this temporary wording rather than changing the API contract on this branch.

## Implementation sequence

### 1. Capture the legacy baseline

1. Verify the exact branch, approved starting commit, clean worktree, public reset command, and protected artifacts.
2. Add monotonic timing without changing reset behavior.
3. Run at least three comparable complete legacy resets from representative dirty states.
4. Record each phase, total time, validation results, CPU, memory, free space, active volume size, and binary-log bytes.
5. Preserve the current implementation as the full SQL fallback before changing the default.

### 2. Add and attest the local-only runtime policy

1. Add `--skip-log-bin` to every physical-template, prepared-standby, live, and SQL-fallback MySQL start.
2. Extend runtime attestation and validation to require binary logging off, InnoDB redo on, `local_infile=OFF`, the pinned image, and the approved server arguments.
3. Prove no replication, GTID, audit, or point-in-time-recovery dependency exists in this isolated environment.
4. Do not purge or rewrite the current 21 GB dirty volume. Reclaim it only by deleting that volume after a successful replacement.

### 3. Build and certify the physical template

Implement Lifecycle A. Record build duration and artifact sizes separately from routine reset time. Stop without changing the default reset if database equivalence, clean shutdown, archive integrity, or restoration cannot be proved.

### 4. Build and certify standby preparation

Implement Lifecycle B. Prove complete validation occurs before sealing and that a sealed standby cannot remain mounted or be selected after its identity changes.

### 5. Implement atomic promotion and recovery

Implement Lifecycles C and D without changing the UI or API contract. Keep the previous dirty volume until success. Test interruption after every destructive or state-changing boundary.

### 6. Remove routine duplicate work

1. Do not hash or parse the protected 2.9 GB SQL during a healthy physical reset.
2. Do not generate the SQL source manifest during a healthy physical reset.
3. Do not rerun complete database-content validation during promotion.
4. Reuse the completed, externally pinned standby certification.
5. Keep only the fast target, identity, runtime, startup, credential, and connectivity checks in the measured reset path.
6. Keep complete validation mandatory for template certification, every prepared standby, foreground physical recovery, and SQL fallback.

### 7. Add deterministic contract tests

Cover at minimum:

- wrong target, host, port, Docker context, image, arguments, mount, or database name;
- binary logging unexpectedly enabled, InnoDB redo disabled, or `local_infile` enabled;
- missing, modified, oversized, malformed, or self-consistent-but-untrusted archive and manifest;
- unsafe archive path, link, device, socket, extra file, missing file, wrong mode, size, or digest;
- template build or verification interrupted before publication;
- standby extraction, complete validation, clean shutdown, or seal publication failure;
- sealed standby unexpectedly mounted, modified, missing, or already active;
- reset and preparation lock races;
- insufficient disk space;
- container stop, removal, recreation, startup, mount, health, credential, or connectivity failure;
- crash after stopping the dirty database but before promotion;
- quick-check failure followed by successful physical recovery;
- physical recovery failure followed by successful SQL fallback;
- total recovery failure preserving the dirty volume while accounts remain locked and readiness remains absent;
- successful reset publishing readiness last and deleting the dirty volume only after complete success;
- background preparation starting after success without retaining API child output descriptors;
- unchanged API coordinator, reset route, laboratory UI, and Stage 8B files.

Tests must use disposable volumes and synthetic fixtures where practical. Never point a failure test at the protected SQL files or an accepted physical template with write access.

### 8. Benchmark acceptance

1. Create one certified template and one fully validated sealed standby.
2. Before each run, make the active database dirty through the same representative synthetic inserts, updates, and deletes.
3. Execute at least five healthy routine resets, preparing and validating the next standby between runs.
4. Require every run to pass all safety checks and become laboratory-usable within 30 seconds.
5. Report median, worst, and phase timings for stop, container replacement, MySQL startup, quick checks, readiness, and coordinator cleanup.
6. Report background extraction and full-validation time separately. Prove it finishes before the next expected reset and does not make the laboratory unusable.
7. Execute failure drills for physical rebuild and automatic SQL fallback.
8. Execute one explicit full SQL fallback and prove it reaches the identical accepted baseline.
9. Compare the final complete user wait with the legacy two-and-a-half-minute reset. Do not claim success from copy time alone.

### 9. Document and prepare review

1. Keep `npm run db:test-source:reset` and `scripts/test-database-reset.sh` as the public entry points.
2. Add clearly named commands for one-time template build, explicit standby preparation, and explicit full SQL recovery.
3. Update `test_database.md` with the artifact roles, normal reset, background preparation, 30-second contract, failure recovery, binary-log policy, disk use, template rebuild procedure, and non-production boundary.
4. Record exact files, ignored artifacts, image and artifact digests, timings, validation evidence, disk use, and limitations.
5. Run shell syntax checks, focused contract tests, API coordinator tests, Stage 5 reset consumers, five accepted routine resets, failure drills, one SQL fallback, source health, and `git diff --check`.
6. After implementation acceptance and transfer of durable operating instructions to `test_database.md`, delete this execution plan. Do not archive it.
7. Stop with the branch unmerged. Do not push or merge without separate instruction.

## Acceptance criteria

The branch is acceptable only when all of the following are true:

- The laboratory UI, reset button behavior, API route, response shape, and Stage 8B files are unchanged.
- The original protected SQL reset remains an independently usable automatic fallback.
- The physical template comes from a fresh SQL reconstruction, matches the July 22 baseline, is cleanly shut down, completely inventoried, externally pinned, ignored, and never run directly.
- Binary logging is disabled and attested; InnoDB redo remains enabled; `local_infile` remains off.
- Every prepared standby is extracted from the trusted template, fully validated, cleanly shut down, unmounted, and sealed before selection.
- A healthy reset performs no SQL import or complete database-content validation.
- The old dirty volume survives every failed switch and is deleted only after success.
- Every accepted healthy reset makes the laboratory usable within 30 seconds.
- Missing or failed preparation waits or rebuilds physically before automatically using the protected SQL fallback.
- Failure leaves readiness absent and application accounts locked.
- Background preparation runs at low priority, completes before the next expected reset, and does not make the laboratory unusable.
- Normal and recovery paths restore the same schema, rows, permissions, relationships, and application capabilities.
- The final filesystem and Docker environment contain only the active volume, one sealed standby, one sealed physical template archive, protected SQL sources, required evidence, and no stale temporary resources.
- `test_database.md` becomes the sole active operational authority after acceptance, and this execution plan is deleted rather than archived.
- All changes remain unmerged pending separate review.

## Stop conditions

Stop without replacing the default reset if:

- the branch, approved checkpoint, or clean-worktree gate is wrong;
- the protected SQL source or pinned MySQL image differs;
- a fresh binary-log-free physical template cannot be restored and validated exactly;
- archive integrity, clean shutdown, credential compatibility, or standby sealing cannot be proved;
- the 8 GB Colima runtime cannot prepare and validate a standby without making the laboratory unusable;
- a healthy reset cannot reliably meet 30 seconds;
- any current safe-target, account-lock, readiness, or failure-closed guarantee would need removal;
- the SQL fallback cannot independently restore the accepted baseline;
- implementation would require a laboratory UI, reset API, Stage 8B, production, or MySQL-version change.
