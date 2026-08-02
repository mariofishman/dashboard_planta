# Phase 6 Instant `test_database` Reset Plan

**Purpose:** Execution prompt and branch context for replacing the user-blocking database rebuild with a validated active/standby switch.

**Planned branch:** `codex/phase6-test-database-instant-reset`

**Status:** Separate future project. It may use the current protected-SQL restore or a later accepted parallel restore. It does not depend on the parallel-loader project.

## User outcome

The laboratory reset button must return a clean, validated `test_database` to use within seconds. Restoration time may continue in the background because the user must not remain blocked while the replacement standby is rebuilt.

Both MySQL instances contain a schema named `test_database`. No schema or table is renamed. The system switches which isolated MySQL slot the laboratory writer and Monitor reader use.

## Project boundary

Create this branch only from a clean, reviewed checkpoint. Do not develop this branch concurrently with another unmerged branch that changes the reset scripts, `TestDatabaseConnections`, or the reset coordinator. If the parallel-loader project is completed first, create or rebase this branch from its accepted merge. If it is not, use the existing full SQL reset to replenish the standby.

This project may change the reset coordinator, test-database connection management, runtime scripts, reset scripts, local test-database configuration, and operational documentation. Preserve the existing laboratory button, confirmation text, and API endpoint unless a compatibility defect makes a small UI change unavoidable.

This is local Phase 6 development tooling. It is not production failover architecture.

## Current facts that constrain the design

- One attested MySQL 8.0.43 ARM64 container, `monitor-test-mysql`, currently owns `monitor-test-database-data` and publishes `127.0.0.1:3307`.
- The MySQL volume currently consumes approximately 21 GB, although the `test_database` schema itself occupies approximately 4 GB; InnoDB system and redo files account for substantial additional space.
- The Colima profile currently has 40 GB of disk and 8 GB of memory. A second equivalent volume does not safely fit, and two containers configured with 4 GB buffer pools do not have adequate memory headroom.
- `scripts/test-database-common.sh`, `scripts/test-database-runtime.sh`, and the validation/reset scripts assume one fixed container, volume, host port, readiness file, and reset lock.
- `TestDatabaseConnections` reads fixed mode-600 host files for port `3307`, creates two persistent `mysql2` pools, and currently cannot drain and reopen them on another endpoint.
- The reset coordinator serializes the experiment runtime, restores MySQL, transactionally clears local Monitor experiment/incident/conversation state, refreshes the source, and reports completion.
- The button starts `POST /api/dev/test-database-reset`; the UI polls the existing status endpoint and reloads after `stage=succeeded`.

## Chosen architecture

Use two complete MySQL slots:

| Slot | Container | Volume | Loopback port | Normal state |
| --- | --- | --- | --- | --- |
| A | `monitor-test-mysql` | `monitor-test-database-data` | `3307` | Existing running active; later active or stopped sealed standby |
| B | `monitor-test-mysql-b` | `monitor-test-database-data-b` | `3308` | Running active or stopped sealed standby |

The port-to-slot assignment is fixed in one tracked machine-readable registry, `config/test-database-slots.v1.json`. A separate strict local state document records which registered slot is active. Test-database clients resolve the active selector through the registry and connect to that slot. The schemas, users, grants, passwords, server settings, image digest, and baseline digest must be identical in both slots.

Preserve the existing container and volume names as Slot A. Do not rename, copy, recreate, or migrate the accepted active volume merely to make slot names symmetrical. Introduce Slot B additively, prove switching and emergency recovery, and retain the original protected dump as the independent reconstruction authority.

Do not add a TCP proxy or rename schemas in the first implementation. Direct A/B ports avoid a new proxy dependency. The API must explicitly drain its source pools and reopen them against the promoted slot, proving the MySQL identity before operations resume.

The inactive slot is a fully loaded, fully validated, cleanly stopped MySQL container and volume. Its writer and Monitor accounts are locked before shutdown, its readiness is absent from the global consumer path, and only guarded replenishment/validation scripts may start it with root or reset credentials. Keeping it stopped prevents undetected data drift, releases its normal memory allocation, and makes its full certification reusable at promotion. It is still preloaded; promotion performs server startup and bounded identity checks, not a database restore.

## Reset state machine

### Preconditions

1. The target is the exact local Colima context and pinned MySQL image.
2. Exactly one slot is recorded active and is healthy.
3. The other slot has a valid sealed-standby certification for the accepted baseline, is stopped, and its volume is not mounted by any other container.
4. No switch or replenishment lock exists.
5. Both slot identities, container mounts, ports, volumes, schema name, accounts, and certification digests pass attestation.
6. The experiment runtime can be quiesced and no source action or poll remains in flight.

### User-blocking switch

1. Acquire the global switch lock and write a durable switch journal containing the attempt ID, source slot, target slot, baseline digest, and phase.
2. Stop and drain experiment scheduling through `ScenarioExperimentRuntime.resetLocalState`; reject new source actions and polls.
3. Remove global readiness. Attest the stopped container, exclusive volume attachment, clean-shutdown certification, and unchanged container configuration; start it and wait for bounded MySQL readiness.
4. Through root/reset access, verify server UUID, slot marker, runtime arguments, locked application accounts, schema metadata digest, and baseline certification identity. Do not rerun the complete table checksum during the user-blocking path because the stopped sealed volume could not legitimately change.
5. Lock the old active slot's writer and Monitor accounts and terminate their sessions.
6. Unlock the target slot's application accounts, close both existing `mysql2` pools, atomically replace `active-slot.json`, and create new pools for the target endpoint.
7. Prove through both new pools that the server UUID, slot marker, schema digest, baseline digest, grants, account state, and database name match the intended target.
8. In one Monitor-database transaction, clear experiment, incident, conversation, poll-cycle, condition, change-event, and interruption state, then insert the attempt ID, target slot, generation, and baseline digest into a dedicated activation-marker table. Clear the browser runtime identity only after that transaction commits.
9. Refresh the source repository, initialize the experiment runtime with no active experiment, publish global readiness last, and return `stage=succeeded`.
10. Release the switch lock. The user may immediately continue while replenishment runs separately.

The switch performance budget is measured from the accepted POST request until the first successful connected laboratory read after `stage=succeeded`. The initial target is 10 seconds or less; certification creation and background replenishment are excluded from that user-blocking budget.

### Commit point and rollback

Before the Monitor-state transaction commits, any failure must close target pools, restore `active-slot.json` to the prior slot, reopen and verify the prior pools, unlock the prior application accounts, relock the rejected target, restore readiness, restart the prior runtime, and report failure.

The committed Monitor-state transaction is the reset commit point. Its activation marker is the authoritative proof of commit: recovery treats the attempt as committed if and only if that exact attempt marker exists with the target slot, generation, and baseline digest. After that point, never restore the dirty prior slot automatically. If source refresh, runtime initialization, or readiness publication subsequently fails, keep the clean promoted slot active, keep readiness absent, stop the runtime, and require the explicit recovery command to finish activation safely.

Every journal transition must be written atomically and durably before its associated destructive or externally visible action. Startup recovery must read the journal, query the transactional activation marker, attest both slots, and either complete the committed clean activation or roll back a switch whose marker is absent. This closes the crash window between database commit and journal advancement. Recovery must never guess from container timestamps or names.

## Standby replenishment

After the switch succeeds, enqueue one background replenishment attempt for the former active slot:

1. Acquire a replenishment lock without taking global readiness away from the active slot.
2. Prove the target is the inactive slot. Refuse any command that resolves to the active container or volume.
3. Keep the inactive slot's application accounts locked and terminate any remaining application sessions.
4. Restore the accepted baseline using whichever certified backend is currently installed:
   - current full protected SQL restore; or
   - later accepted parallel restore.
5. Run the complete locked integrity validation against the inactive slot.
6. Temporarily perform capability validation through controlled slot-specific credentials without publishing it as active, then relock both application accounts.
7. Lock both application accounts, terminate their sessions, perform a clean MySQL shutdown, and prove the stopped container is the sole attachment of the volume.
8. Write a sealed-standby certification bound to the slot, volume, server UUID, image digest, container configuration digest, clean-shutdown evidence, schema/data baseline digests, restore backend, and validation evidence.
9. Mark standby ready only after certification and release the replenishment lock.

Replenishment failure must not interrupt the active laboratory. It leaves the inactive slot unavailable, reports `standby=failed`, and requires explicit retry or full repair. Until a standby is certified, another reset request must return `409 test_database_standby_not_ready` rather than rebuilding the active database or silently falling back to a blocking reset.

## Resource policy

The accepted extra-storage cost does not remove the need for a capacity gate. Before creating Slot B:

1. Record actual volume, schema, InnoDB-system, redo, binary-log, image, and free-space usage.
2. Resize the isolated Colima profile to a reviewed capacity that holds two worst-case slot volumes, both restore artifacts, temporary restore growth, evidence, and at least 20% free headroom after replenishment.
3. Increase memory or reduce per-slot MySQL memory limits so active workload plus standby restoration cannot exhaust the VM. Do not assume two 4 GB buffer pools are safe inside the current 8 GB profile.
4. Benchmark foreground latency during background restore. Bound replenishment CPU, I/O, connections, and worker count; pause or reduce it when active-source latency crosses the accepted threshold.
5. Refuse replenishment before it begins if predicted disk headroom is insufficient.

Changing Colima disk or memory allocation is a separately visible environment operation. Record the prior and new values and prove the existing active volume before proceeding.

## Connection and readiness contract

Add one strictly parsed, mode-600 active-slot document under ignored local state. It contains only schema-versioned identifiers and digests, never credentials. `endpoint` is recorded as switch evidence but must exactly equal the selected slot in the tracked registry:

```json
{
  "contractVersion": "1.0.0",
  "generation": 12,
  "activeSlot": "a",
  "endpoint": { "host": "127.0.0.1", "port": 3307 },
  "serverUuid": "<uuid>",
  "baselineDigest": "<digest>",
  "activatedAt": "<UTC timestamp>"
}
```

Write it through a same-directory temporary file, `fsync` the file, atomic rename, then `fsync` the directory. Reject unknown fields, wrong modes, symlinks, absolute paths, unsupported versions, non-loopback hosts, endpoints not exactly present in the tracked registry, invalid generations, or mismatched slot/container identity. Parse both registry and active selector with the same strict module; do not parse JSON with shell text tools.

Refactor `TestDatabaseConnections` so endpoint switching is an explicit serialized operation:

- prevent new pool leases;
- wait for or cancel bounded in-flight work;
- close both old pools;
- read and attest the new active-slot document;
- create writer and Monitor pools for that endpoint;
- validate both identities before exposing them;
- publish the pair together so reads and writes cannot use different slots.

`requireReady()` must require global readiness, an absent switch lock, a valid active-slot document, and matching generation. The reset coordinator is the only application owner allowed to switch pools. Other scripts consume the same strict slot resolver rather than duplicating active-slot logic.

## API and user-visible status

Keep `POST /api/dev/test-database-reset` and its confirmation phrase. Preserve existing status fields and stages needed by the UI, adding backward-compatible fields:

- `activeSlot`
- `standbySlot`
- `standbyState`: `ready | replenishing | failed | unavailable`
- `standbyError`: redacted error code or `null`
- `lastSwitchDurationMs`

Return `stage=succeeded` when the promoted source, cleared Monitor state, refreshed runtime, and global readiness are usable. Do not keep the reset dialog blocking while replenishment runs. Display standby replenishment separately; disable the reset button while standby is unavailable but keep all ordinary laboratory actions available.

Never report success merely because the pointer changed. The post-switch connected read is part of success.

## Files and ownership

| Responsibility | Sole owner after acceptance |
| --- | --- |
| Static A/B container, volume, and endpoint identities | `config/test-database-slots.v1.json` |
| Strict registry/selector parsing, atomic selector writes, exact target resolution | `scripts/test-database-slot-state.mjs` |
| Shell adapters for resolved safe slot operations | `scripts/test-database-slots.sh` |
| Slot container lifecycle and attestation | `scripts/test-database-runtime.sh` |
| Restore one explicitly inactive slot | `scripts/test-database-reset.sh` plus its installed restore backend |
| User-blocking switch and durable recovery journal | `scripts/test-database-switch.sh` |
| Background replenish/retry | `scripts/test-database-replenish.sh` |
| API state machine and Monitor-state coordination | `apps/api/src/test-database-reset.ts` |
| Atomic writer/Monitor pool switching | `packages/detection/src/test-database.ts` |
| Transactional reset commit marker | A new numbered migration under `packages/database/migrations/` |
| Current operating authority after acceptance | `docs/delivery/phases/phase6/test_database.md` |

Do not create separate copies of shared constants in shell, TypeScript, and documentation. The tracked slot registry owns static runtime identities; the ignored active selector owns only the current choice and activation evidence. Shell and TypeScript adapters call the same strict resolver. Documentation explains the contract but is not executable configuration.

## Filesystem and Docker organization

```text
local-data/test-database/
  secrets/                              # shared passwords and per-slot mode-600 client files
    monitor.a.host.cnf
    monitor.b.host.cnf
    writer.a.host.cnf
    writer.b.host.cnf
  state/
    active-slot.json                    # sole active endpoint authority, mode 600
    ready                               # global consumer readiness, mode 600
    switch.lock/                        # atomic mkdir exclusion lock
    replenish.lock/                     # atomic mkdir exclusion lock
    switch-journal.json                 # present only for incomplete/recoverable switch
  slots/
    a/
      certification.json               # sealed baseline identity
      ready                             # standby/slot certification readiness
    b/
      certification.json
      ready
  tmp/
    switch-<attempt-id>/
    replenish-<attempt-id>/
  evidence/
    instant-reset/<run-id>/

Docker context: colima-monitor-test-db
  monitor-test-mysql -> monitor-test-database-data -> 127.0.0.1:3307
  monitor-test-mysql-b -> monitor-test-database-data-b -> 127.0.0.1:3308
```

The per-slot host client files use the same account passwords but their registered fixed ports. They are generated locally, never committed, and selected only after the slot resolver validates the active selector. Do not rewrite one shared host client file during a switch.

Per-slot `ready` means certified baseline eligibility for a stopped sealed slot; global `state/ready` means the running active endpoint is available to consumers. No other file may select the active slot. Temporary state belongs in `tmp/`, not `state/`. Evidence contains timing, digests, and redacted diagnostics, never row values or credentials.

After acceptance, consolidate durable instructions into `test_database.md`, update active Phase 6 links, archive this plan under `archive/docs/implementation/`, and remove or archive superseded single-slot instructions. Keep historical evidence but ensure it cannot be mistaken for current operational authority.

## Execution plan

### 1. Establish branch and preserve recovery

1. Verify the exact branch and clean starting checkpoint.
2. Capture the active container, volume, image, mounts, runtime arguments, credentials contract, baseline validation, and current reset result.
3. Preserve the existing container and volume unchanged as Slot A; record their exact identities and a tested rollback command sequence.
4. Prove the protected dump and original single-slot reset command remain sufficient for emergency reconstruction until A/B acceptance. Do not consume another full volume merely as a temporary migration copy.

### 2. Prove capacity and two-slot feasibility

1. Measure actual storage and peak memory during one current reset.
2. Calculate reviewed disk and memory targets with required headroom.
3. Stop if the environment cannot safely host both running slots and one replenishment.
4. Apply the separately authorized Colima resource change and re-attest the original slot.

### 3. Introduce explicit slot contracts

1. Add the tracked A/B registry, strict shared resolver, atomic selector writer, locks, journal schema, and tests.
2. Parameterize runtime, reset, and validation helpers by an enumerated slot; reject arbitrary container, volume, port, or database values.
3. Preserve the exact `test_database` schema and existing account/grant model in both slots.
4. Make destructive helpers prove the target slot is inactive immediately before every drop or volume-affecting action.

### 4. Build and seal the initial standby

1. Keep current Slot A active and create Slot B on its fixed loopback port.
2. Restore Slot B through the currently accepted full or parallel backend.
3. Validate exact schema, rows, auto-increments, views, checksums, grants, runtime settings, source queries, writer capability, and Monitor write denial.
4. Lock Slot B application accounts, cleanly stop it, and publish its certification and slot readiness.
5. Prove ordinary laboratory traffic still reaches Slot A only.

### 5. Add atomic connection switching

1. Refactor the connection holder to switch writer and Monitor pools as one serialized pair.
2. Add bounded drain behavior and reject new operations during the switch.
3. Verify pool generations so a stale lease cannot execute after activation.
4. Test failed connection, wrong server UUID, mismatched port, one-pool failure, slow in-flight query, and rollback to the prior pair.

### 6. Implement the switch coordinator

1. Implement the switch journal and state machine exactly as specified.
2. Preserve the experiment-runtime serialization boundary.
3. Add the activation-marker migration and coordinate account locking, session termination, pool drain, pointer publication, Monitor transaction and marker, runtime refresh, and readiness.
4. Add deterministic interruption hooks at every journal phase and prove startup recovery.

### 7. Add background replenishment

1. Start replenishment only after user-visible success.
2. Rebuild only the proven inactive slot and never remove active readiness.
3. Apply resource limits and publish progress separately from reset success.
4. Seal the rebuilt slot only after full validation; leave it unavailable on any failure.
5. Add explicit retry and repair commands that cannot target the active slot.

### 8. Integrate API status without blocking the UI

1. Preserve the reset POST and confirmation contract.
2. Return switch success independently from replenishment status.
3. Keep laboratory actions enabled after switch success.
4. Prevent another reset until standby certification is ready.
5. Provide clear failed-standby recovery without exposing internal paths or credentials.

### 9. Validate, benchmark, and hand off

1. Perform at least five alternating A-to-B and B-to-A resets from independently mutated active slots.
2. Require exact baseline, empty Monitor experiment/incident state, fresh runtime identity, correct pool generation, and a successful connected read after every switch.
3. Measure user-blocking duration and active-source latency during replenishment.
4. Run crash recovery at every state-machine boundary, API restart recovery, Colima restart recovery, disk exhaustion, replenishment failure, and stale/malformed state tests.
5. Run one emergency single-slot recovery and prove it can rebuild a usable active slot when no standby exists.
6. Update `test_database.md`, archive superseded active instructions, run relevant Stage 5 connected tests, and stop unmerged for review.

## Required failure tests

- Missing, malformed, stale, symlinked, or mode-incorrect active-slot document.
- Both slots claim active, neither claims active, pointer and port disagree, or generation regresses.
- Wrong container, volume, image, mount, server UUID, schema, grants, or baseline digest.
- Standby is unexpectedly running, its volume is attached elsewhere, or its clean-shutdown/container-configuration evidence differs.
- Switch requested while standby is missing, replenishing, failed, or uncertified.
- Source action or poll already in flight when quiescing exceeds its timeout.
- Writer pool switches but Monitor pool fails, or a stale pooled connection survives.
- Failure before pointer publication, after pointer publication, before Monitor commit, immediately after Monitor commit but before journal advancement, and before readiness publication.
- API, Docker, or Colima restart during each switch phase.
- Background restore exhausts its resource allowance or active latency crosses its limit.
- Replenishment command is pointed at the active slot.
- Replenishment fails after destroying the old dirty slot but before certification.
- A second reset is requested during replenishment.
- Emergency recovery with no certified standby.

## Acceptance criteria

- Both slots use the same `test_database` schema; no schema renaming is used.
- Exactly one strictly attested slot is active and the other is either sealed standby or explicitly unavailable.
- Five alternating switches restore the exact baseline and clear associated Monitor state.
- Median user-blocking reset time is 10 seconds or less, measured through the first successful connected laboratory read.
- Ordinary laboratory work remains available during replenishment.
- Active-source latency remains within the reviewed bound during background restoration.
- No active-slot destructive command can target the active volume.
- Pre-commit failures roll back to the prior usable state; post-commit failures remain clean and fail closed.
- Crash recovery is deterministic from the journal and never guesses.
- A failed or missing standby prevents another reset but does not interrupt the active laboratory.
- The current full restore works as replenishment and emergency recovery; a parallel backend is optional.
- Disk and memory headroom are measured and enforced.
- Credentials remain out of state, logs, process arguments, and evidence.
- `test_database.md` becomes the sole active operating authority after acceptance, with no contradictory single-slot instructions left active.
- The branch remains unmerged until separately reviewed.

## Stop conditions

Stop without replacing the current reset when:

- the branch or starting checkpoint is wrong;
- the worktree is dirty before implementation;
- safe two-slot disk or memory capacity is unavailable;
- exact standby equivalence cannot be proved;
- source work cannot be drained safely;
- writer and Monitor pools cannot be switched atomically;
- crash recovery is ambiguous at any state-machine boundary;
- the active slot can be targeted by replenishment or destructive helpers;
- Monitor-state clearing cannot be coordinated with a deterministic commit point;
- foreground latency during replenishment is unacceptable;
- emergency single-slot recovery is not independently usable.
