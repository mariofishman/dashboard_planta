# Phase 6 Stage 5 checkpoint and corrective execution plan

**Artifact type:** Single authoritative Stage 5 corrective execution plan

**Authority rule:** This file is the only current Stage 5 plan, checkpoint assessment, requirement trace, and 34-test execution inventory. `README.md` and `docs/roadmap.md` only point to its current status. Archived checkpoint documents are historical evidence, not competing authority.

**Working branch:** `codex/phase6-stage5`

**Checkpoint under review:** `165abc1` (`feat(phase6): complete stage 5 connected acceptance`)

**Current classification:** Stage 5 is not accepted under the corrective prompt. Commit `165abc1` is a preserved implementation checkpoint, not an accepted stage exit.

## Objective

Correct and complete Stage 5 on the existing branch without discarding useful work, rewriting published history, or merging premature claims into `main`. The final result must satisfy the connected laboratory boundary, the exact 34-test Monitor acceptance set, durable chain-of-custody evidence, same-runtime browser and human acceptance, repeatability, and cleanup requirements consolidated in this file.

## How to use this plan

The twelve primary numbered sections are execution steps, not new Phase 6 stages. Complete them in order. Step 5 is divided into Steps 5.1–5.4 so the ledger framework exists before evidence-producing work begins. Steps 8B and 8C are required continuations of Step 8: 8B provides human acceptance, and 8C performs the authoritative 34-test execution and final ledger accounting.

Each step states:

- **Purpose:** why the step exists;
- **Actions:** what must be done;
- **Terms:** specialized language used in the step;
- **Artifacts:** what durable output it creates;
- **Exit:** objective conditions required to continue; and
- **Approval and Git effect:** where work stops and what may change in Git.

## Execution map

| Step | Outcome | Mandatory stop or approval |
| --- | --- | --- |
| 1 | Correct planning authority and classify checkpoint/gaps. | Stop uncommitted for user review. |
| 2 | Commit and push only the approved planning correction. | Explicit commit and push authorization. |
| 3 | Synchronize compatible accepted `main` changes into Stage 5. | Stop if Phase 7 work creates a sequencing conflict. |
| 4 | Complete the connected laboratory source boundary. | Stage 5A exit assertions must pass. |
| 5.1 | Define the exact acceptance inventory and versioned ledger schema. | Schema and manifest validate without claiming test completion. |
| 5.2 | Define isolated fixture and cleanup contracts for all 34 IDs. | Every approved ID has deterministic setup and restoration. |
| 5.3 | Build reusable source-to-UI chain capture. | Every mandatory chain link can be captured from authoritative systems. |
| 5.4 | Build JSON/Markdown rendering and strict ledger validation. | Dry-run fixtures prove formatting and failure behavior; no result is accepted yet. |
| 6 | Prove source isolation and real-adapter failures. | Every unsafe or synthetic path must fail closed. |
| 7 | Prove automatic scheduling, interruption, restart, and recovery. | No manual row deletion; repairs must be idempotent. |
| 8 | Complete same-runtime browser acceptance. | Run-specific visible evidence only. |
| 8B | Complete passive observability and human exploratory acceptance. | Explicit human acceptance after findings and retests. |
| 8C | Execute exactly 34 connected cases and finalize the acceptance ledgers. | Exactly 34 valid IDs; no failures, skips, extras, or excluded IDs. |
| 9 | Run the unchanged finished version twice from clean baselines. | Both complete independent runs must pass. |
| 10 | Audit evidence and prepare final Stage 5 authority. | Stop uncommitted for user review. |
| 11 | Commit and push the completed Stage 5 branch. | Explicit commit and push authorization. |
| 12 | Review and merge into `main`. | Explicit merge and `main` push authorization. |

## Non-negotiable rules

1. Continue on `codex/phase6-stage5`; do not create a second Stage 5 implementation branch.
2. Keep published checkpoint `165abc1` in history. Do not rebase, force-push, or treat it as accepted evidence.
3. Correct planning and status documents before corrective code work.
4. Do not merge any part of this branch into `main` until all corrective gates pass and the user approves the merge.
5. Preserve Stage 4 as complete only within its documented source-write, read-only-polling, and incident-lifecycle scope.
6. Keep `monitor_sim_*` and the simulator adapter operational until Stage 6 confirms every consumer has a connected replacement.
7. Keep protected backups, raw database evidence, runtime databases, secrets, and temporary review files out of Git.
8. Local evidence cannot claim Aurora, production authentication, failover, production load, deployment, pilot, or managed infrastructure; these remain Phase 10.
9. A code, authority, fixture, contract, or merge change after official validation invalidates both official runs.
10. Steps 2, 11, and 12 require separate user authorization and never happen automatically.

## Current Git state

```text
main and origin/main:       3d49bfe  Stage 4 complete
codex/phase6-stage5:        d966249  completed and validated Stage 5A source-boundary checkpoint
origin/codex/phase6-stage5: d966249  synchronized with the local Stage 5 branch
```

The correction uses additive commits on the existing branch. Later commits must explicitly correct the checkpoint's status and evidence classification.

## Step 1 — Correct and review the Stage 5 plan

### Purpose

Replace the premature completion claim with accurate authority and produce an actionable audit before changing implementation.

### Actions

1. Read the complete corrective prompt, Phase 6 authority, Stage 4 handoff, current Stage 5 documents, product/alert/UX/architecture/design/integration authority, checkpoint implementation, validator, fixtures, and evidence.
2. Compare `main..165abc1`.
3. Create a file-classification table for every checkpoint path with: path, disposition (`retain`, `revise`, `relocate`, `remove`, or `incomplete`), reason, corrective requirement IDs, planned destination, and verification command or artifact.
4. Assign stable IDs to every normative corrective-prompt requirement.
5. Create a requirement trace matrix with: requirement ID, prompt section, required behavior/evidence, checkpoint implementation reference, checkpoint evidence reference, gap classification, planned change, owning execution step, and exit assertion.
6. Do not accept `covered`, `pass`, or a file's existence as evidence. Every retained item must identify a concrete assertion and durable artifact; every incomplete item must name the missing implementation and proof.
7. Update `docs/delivery/phases/phase6/README.md` to Stage 5 corrective work in progress and Stage 6 pending.
8. Update `docs/roadmap.md` to make Stage 5 the current Phase 6 action.
9. Consolidate the end-to-end Stage 5A/5B execution inventory and mandatory per-test evidence fields into this file.
10. Make this file the single durable Stage 5 execution authority; do not create a second plan or status document.
11. Preserve Stage 4 handoff content and status unchanged.
12. Relocate the checkpoint inventory, report, and handoff into `archive/docs/implementation/` with their substantive content unchanged and filenames containing `checkpoint_165abc1`. Add an archive provenance note recording original commit/path and warning that the claims are historical and not accepted.
13. Record what the checkpoint proved, why it is not accepted, and what remains in this file's classification and trace sections; do not create a separate gap assessment.
14. Update all current links and run a local Markdown-link check.
15. Stop with all planning changes uncommitted and unpushed for user review.

### Terms

- **Authority:** current documents that control project status or execution.
- **Checkpoint:** a preserved implementation state that can be evaluated without being accepted.
- **Trace matrix:** a table connecting every requirement to implementation, evidence, gap, planned work, and final assertion.

### Artifacts

- corrected README and roadmap pointers;
- this single authoritative execution plan, including the inventory and checkpoint assessment;
- archived checkpoint inventory/report/handoff plus provenance;
- file-classification table; and
- requirement trace matrix.

### Exit

This authority says Stage 5 is not passed, every checkpoint file and prompt requirement is classified, no duplicate current Stage 5 authority exists, no implementation changed, links pass, and the user understands and approves the plan.

### Approval and Git effect

No commit, push, implementation, or merge. Proceed only after user review.

## Step 2 — Commit and push the approved planning correction

### Purpose

Create a durable authority checkpoint before corrective implementation begins.

### Actions

1. Stage only this reviewed authority file, the minimal README/roadmap pointers, and archived checkpoint files with provenance.
2. Confirm no implementation, protected data, raw evidence, secrets, or temporary `local-data` files are staged.
3. Run staged whitespace, link, and changed-file checks.
4. Commit as `docs(phase6): correct stage 5 status and execution authority`.
5. Push only `codex/phase6-stage5`.
6. Verify local and remote branch SHAs match and `main` is unchanged.

### Terms

- **Stage:** select files for the next Git commit.
- **Documentation-only commit:** a commit that changes authority and planning artifacts but no executable behavior.

### Artifacts

- one reviewed documentation commit on the Stage 5 branch; and
- recorded local/remote commit SHAs.

### Exit

The approved plan is durable on the branch and remote, no executable files were included, and `main` remains at its previously accepted state.

### Approval and Git effect

Requires explicit authorization to commit and push. Does not authorize implementation or merging into `main`.

## Step 3 — Synchronize the Stage 5 branch with `main`

### Purpose

Ensure corrective implementation starts from the latest accepted foundation without importing blocked Phase 7 work.

### Actions

1. Fetch `origin/main` and record its SHA.
2. Compare `origin/main` with the Stage 5 branch base.
3. If unchanged, record “no merge needed” with both SHAs.
4. If `main` contains ordinary accepted fixes, merge `origin/main` into `codex/phase6-stage5` with a normal merge commit. Do not rebase the published branch.
5. Resolve authority conflicts in favor of the reviewed corrective plan while reconciling unrelated accepted changes normally.
6. Do not merge or cherry-pick parallel Phase 7 branches into Stage 5 or use them as Stage 5 evidence.
7. If Phase 7 work unexpectedly reached `main`, stop and ask the user to reconcile the sequencing conflict before merging it.
8. Record fetched SHA, merge decision, conflicts, resolutions, and whether earlier validation was invalidated.

### Terms

- **Synchronize:** bring accepted changes from one branch into another before continuing.
- **Rebase:** rewrite commits on a different base; prohibited here because the branch is already published.
- **Merge commit:** a commit joining two histories without rewriting either.

### Artifacts

- synchronization log; and
- merge commit only if `main` advanced safely.

### Exit

The Stage 5 branch contains the latest compatible accepted `main`, no Phase 7 evidence entered Stage 5, and the synchronization decision is recorded.

### Approval and Git effect

No merge into `main`. A merge from `main` into Stage 5 is allowed only under the rules above.

## Step 4 — Complete Stage 5A: connected laboratory source boundary

### Purpose

Make the laboratory a legal, reusable source-event driver for humans and automation—not an alternative Monitor implementation.

### Actions

1. Define versioned reusable source-action contracts for every approved A02, A03, and A05 lifecycle action.
2. Expose the same actions through the development UI/API used by humans and the automated runner.
3. For each action record action ID, writer identity, natural key, exact before/after source state, changed tables/fields, source revision, and unrelated-row digest.
4. Prove actions use the `alertas_fake` writer and change only intended `test_database` rows.
5. Prove actions cannot change Monitor incidents, routing, deliveries, conversations, messages, cards, or cursors before polling.
6. Reject illegal backward transitions: terminal A02 movement reversal, consumed A03 removal, closed OT reactivation/consumption, and invented A05 recurrence.
7. Complete durable experiment identity, shared business clock, speed/frequency, run/pause, chronological jumps, automatic due polling, poll-boundary ordering, snapshots, prior history, pending-source presentation, and failed-read presentation.
8. Validate every action through the same human and automated path.

### Internal execution sequence

| Sub-step | Scope | Status |
|---|---|---|
| 4.1 | Versioned A02/A03/A05 source-action contracts, legal `test_database` mutations, and forward-only lifecycle guards. | Implemented on `codex/phase6-stage5`; review pending. Contract, type, lifecycle, connected rollback, writer-identity, and source-restoration tests pass. |
| 4.2a | One shared development API/service action path with contract validation, authorization, and consistent errors. | Implemented on `codex/phase6-stage5`; review pending. Service, authorization, error, endpoint, and connected `test_database` tests pass. |
| 4.2b | Connect both the laboratory UI and automated runner exclusively to the 4.2a path. | Implemented on `codex/phase6-stage5`; review pending. The UI exposes all 14 versioned actions through the canonical endpoint, returns and selects newly created tracked records, separates source actions from laboratory controls, and provides lifecycle-specific rejection guidance. The Stage 5 runner uses the canonical endpoint for every business mutation, and connected legacy mutation routes are retired. Web/API/detection typechecks, web build, 21 detection tests, 42 API tests, connected create-select-chain execution/restoration, runner typecheck, static legacy-path checks, and 1280 px/390 px browser overflow checks pass. |
| 4.3a | Durable experiment identity, snapshots, and prior-run history. | Implemented and reviewed on `codex/phase6-stage5`; user review pending. Experiments persist unique run, manifest, and source-action contract identity. New snapshots enforce the `1.0.0` source/clock/poll/Monitor schema, remain immutable by label, and preserve pre-upgrade payloads explicitly as `legacy`. Experiment, snapshot, and result history use stable cursor pagination. A real file-backed PGlite test proves legacy upgrade, idempotent migration, immutable snapshots, pagination, close/reopen durability, and prior-history recovery; 2 database and 22 detection tests, API typecheck, and Stage 5 runner typecheck pass. |
| 4.3b | Shared business clock, speed/frequency controls, run/pause, chronological jumps, automatic due polling, and poll-boundary ordering. | Implemented and reviewed on `codex/phase6-stage5`; user review pending. One durable active experiment owns the common source clock, persists its millisecond-precise automatic deadline, converts speeds 1/2/3/60 to drift-free real-time cadence, supports independent frequencies and pause/resume, serializes every crossed due time through the normal scheduler, and completes a due boundary before accepting a same-time source action. A durable ordered ledger links poll starts/completions/failures and source actions to experiment business time while retaining real audit time. Generic scenario cron jobs are disabled so this runtime is the sole automatic owner. Focused runtime coverage proves configuration, a nine-cycle chronological jump, pause freezing, boundary ordering, restart restoration, and one automatic poll; all 23 detection tests, all 42 API tests, both typechecks, and diff checks pass. |
| 4.3c | Pending-source, failed-read, and experiment-history presentation in the laboratory UI. | Implemented and reviewed on `codex/phase6-stage5`; user review pending. The laboratory distinguishes source changes awaiting a trustworthy poll, failed or incomplete reads that preserve Monitor's last confirmed truth, and synchronized reads. A responsive history drawer exposes prior experiments, shared-clock identity, ordered business/audit events, paginated versioned snapshots, and paginated acceptance results without treating raw payloads as the primary view. Administrative history routes validate pagination and preserve the durable experiment repository as authority. Web/API typechecks, the web build, 21 web tests, 43 API tests, diff checks, and 1280 px/390 px browser checks pass for pending, failed-read, empty-history, populated timeline, structured snapshot disclosure, acceptance results, and both pagination controls. The populated mobile pass found and fixed a collapsed experiment-navigation row; the list and independently scrolling detail pane now remain visible without horizontal overflow. |
| 4.4a | Source-diff evidence for all 14 actions: writer identity, natural key, exact before/after fields, changed tables/fields, source revision, and unrelated-row digest. | Implemented and reviewed on `codex/phase6-stage5`; user review pending. The canonical action path returns the actual `alertas_fake` writer, contract natural key, exact before/after values for every column of each intended row, actual changed tables/fields, post-action source revision, and deterministic SHA-256 digests covering every column of every unrelated row. Digests use bounded 1,000-row keyset pages rather than size-limited aggregation. Execution fails closed on writer mismatch, undeclared changed fields, or unrelated-row drift. Connected coverage exercises all 14 action IDs, independently verifies schema-column coverage, detects an undeclared-column tamper beyond the first digest page, and restores the source baseline. Validation: 24 detection tests, 43 API tests, detection/API/web typechecks, and diff checks pass. |
| 4.4b | Pre-poll Monitor isolation: prove source actions cannot change incidents, routing decisions, deliveries, conversations, messages, cards, receipts, or committed cursors. | Implemented and reviewed on `codex/phase6-stage5`; user review pending. A connected black-box proof first creates non-empty Monitor incident, routing, delivery, conversation, alert-card/message, receipt, read-state, and committed-cursor records. It derives required action coverage from the versioned contract registry, discovers every current and future `monitor_*` table from PostgreSQL metadata, then executes every canonical API source action without polling and verifies exact before/after equality across the complete discovered Monitor inventory after each action. Cleanup runs in `finally`; full-row, all-column SHA-256 digests over every contract-owned source table prove exact restoration. The connected proof runs sequentially with the existing shared-fixture test. Validation: all 44 API tests, API typecheck, and diff checks pass. |
| 4.4c | Illegal-transition matrix: terminal A02 reversal, consumed A03 removal, closed-OT reactivation or consumption, invented A05 recurrence, and every other contract-prohibited backward transition must fail closed. | Implemented and reviewed on `codex/phase6-stage5`; user review pending. The connected database matrix verifies unchanged source rows for all terminal A02 receipt/cancel/reject combinations; started, closed, cancelled, unstarted, and competing A03 states; removal of consumed evidence; invalid A05 relationships, repeated movement, closed/cancelled source-OT closure, duplicate handoff, and invented recurrence. A05 source-OT closure now rejects already closed or cancelled work orders. A second pass proves canonical API 400/409 behavior and unchanged source state for terminal A02, closed-OT reactivation/consumption, consumption-removal, and A05 recurrence attempts. Validation: all 25 detection tests, all 44 API tests, both typechecks, and diff checks pass. |
| 4.4d | Shared-path proof: the laboratory UI and automated runner use only the canonical API/service contract, with no runner-side business SQL or connected legacy mutation route. | Implemented and reviewed on `codex/phase6-stage5`; user review pending. The runner's mixed-population setup and Monitor repair fault now traverse strict administrator-only development API contracts; the connected repository validates fixture identity and performs source setup transactionally. Static architecture coverage proves the UI and runner use the canonical source-action endpoint, rejects runner-side writer/Monitor SQL, and preserves legacy mutation endpoints only as explicit `410` tombstones. Connected tests execute both mixed populations through the API and restore every changed fixture field in `finally`. Validation: all 47 API tests, detection/API typechecks, and diff checks pass. |
| 4.4e | Focused Stage 5A exit gate: run the complete connected boundary suite from a validated baseline, capture black-box evidence, restore source state in `finally`, and accept only if every Step 4 exit assertion passes. This is not either official repeatability run required by Step 9. | Implemented and reviewed on `codex/phase6-stage5`; user review pending. `npm run validate:phase6-stage5a` resets and validates the protected baseline, executes the complete database, detection, API black-box, and web boundary suites plus all boundary typechecks, the laboratory build, and diff checks, then resets and independently revalidates the source in an exit trap. Run `20260801T204557Z` was accepted with 2 database, 25 detection, 47 API, and 21 web tests passing; restoration returned the verified baseline. Machine-readable evidence and per-check logs are under ignored `local-data/test-database/evidence/stage5a/20260801T204557Z/`. The artifact identifies itself as not being either Step 9 repeatability run. |

### Terms

- **Source-action contract:** versioned definition of a legal business action, exact source changes, and expected constraints.
- **Natural key:** source identifier Monitor uses to recognize one condition, such as movement, OT, or reel ID.
- **Business clock:** simulated operational time, distinct from real audit time.

### Artifacts

- source-action contracts;
- shared laboratory API/UI actions;
- black-box before/after and isolation evidence; and
- Stage 5A automated tests.

### Exit

Every required source action is versioned, human/automation accessible through one path, forward-only, isolated to the intended source rows, and independently verifiable.

### Approval and Git effect

Implementation commits stay on `codex/phase6-stage5`. Do not advance Stage 5 status.

## Step 5.1 — Define the exact inventory and ledger schema

### Purpose

Define, before execution, exactly what may run and what evidence every accepted result must contain.

### Actions

1. Version the exact manifest of 34 approved IDs: 11 shared, 9 A02, 6 A03, and 8 A05.
2. Keep `A02-08`, `A03-06`, and `A05-07` explicitly excluded and make execution or substitution of any excluded ID invalid.
3. Declare each test's required actions, expected outcome, applicable technical/browser/recovery evidence, and mandatory chain fields.
4. Version a ledger schema containing identity, action, source, read, Monitor, visible-result, scheduling/recovery, cleanup, and failure fields.
5. Encode conditional applicability without allowing a required field to be silently omitted.

### Terms

- **Acceptance manifest:** versioned declaration of the only test IDs and evidence obligations allowed in Stage 5B.
- **Ledger schema:** machine-validatable structure governing every result and its required chain evidence.

### Artifacts

- revised versioned 34-ID manifest; and
- versioned ledger schema.

### Exit

The manifest has the exact approved accounting, the schema represents every mandatory field in this authority, excluded IDs fail validation, and no test result is yet described as accepted.

### Approval and Git effect

Schema and manifest work may be committed on the Stage 5 branch. No test-completion claim.

## Step 5.2 — Define isolated fixture and cleanup contracts

### Purpose

Make every approved case independently repeatable without leaking source or Monitor state into another result.

### Actions

1. Give each approved ID a deterministic fixture/setup contract using the reusable Step 4 source actions.
2. Record fixture identity, natural keys, required starting state, and allowed source mutations.
3. Define Monitor-runtime isolation and per-test experiment identity.
4. Restore source state in `finally` and verify the restored digest even when execution fails.
5. Fail if setup depends on another test, cleanup is incomplete, or an unrelated source row changes.

### Terms

- **Fixture contract:** deterministic starting records, actions, and allowed mutations for one test.
- **Cleanup contract:** mandatory restoration and verification performed whether the test passes or fails.

### Artifacts

- per-test fixture/setup contracts; and
- cleanup and restoration validators.

### Exit

All 34 approved IDs have independent setup and cleanup contracts, and forced-failure tests prove restoration still occurs.

### Approval and Git effect

Fixture contracts and tests may be committed on the Stage 5 branch. No connected result is accepted.

## Step 5.3 — Build reusable chain-of-custody capture

### Purpose

Capture authoritative identifiers and state transitions consistently while Steps 6–8B produce the required evidence.

### Actions

1. Capture, in order:

   `action ID → source key/before/after → writer → monitor_source_ro read → query/version → source revision → poll cycle → incident → routing/deliveries → conversation/message → cursor → Dashboard/Chat artifact`

2. Read source, poll, Monitor, and visible-product evidence from their authoritative stores rather than laboratory expected counters.
3. Cross-validate natural keys, revisions, query versions, poll cycles, downstream IDs, cursors, and artifact metadata.
4. Capture source/read/Monitor links immediately and expose validated attachment interfaces for scheduling, recovery, browser, and human evidence that Steps 6–8B will produce later.
5. Fail capture for a missing or contradictory link rather than fabricating a placeholder.

### Terms

- **Ledger:** structured record of what happened and the identifiers connecting every stage.
- **Chain of custody:** trace proving that one source action produced the exact downstream objects being accepted.

### Artifacts

- shared chain-capture modules; and
- cross-link validation tests.

### Exit

Representative connected rehearsals prove source, read, and Monitor links can be captured and cross-validated. Contract tests prove later scheduling, recovery, browser, and human evidence can attach only with matching run/test identity. Rehearsals are diagnostic evidence only and cannot count as the authoritative 34-result ledger.

### Approval and Git effect

Capture implementation and tests may be committed on the Stage 5 branch. No completion claim.

## Step 5.4 — Build rendering and strict ledger validation

### Purpose

Make acceptance evidence reviewable by machines and humans while failing closed on incomplete or invalid accounting.

### Actions

1. Generate machine-readable JSON and readable Markdown from the same validated result objects.
2. Validate every result against the Step 5.1 schema.
3. Validate exact ID/group accounting, uniqueness, status, exclusions, chain completeness, artifact existence, and cleanup evidence.
4. Exit nonzero for a missing chain link, duplicate, failed/skipped/extra ID, excluded execution, mismatched outcome, or renderer divergence.
5. Use synthetic dry-run fixtures to prove every validation failure without presenting them as connected acceptance results.

### Terms

- **Strict accounting:** validation requiring the exact approved set and rejecting every missing, duplicate, extra, skipped, failed, or excluded result.
- **Renderer divergence:** JSON and Markdown outputs disagree about the same validated result.

### Artifacts

- JSON and Markdown renderers;
- strict accounting validator; and
- validator failure-matrix tests.

### Exit

Dry-run fixtures prove valid rendering and every required failure mode. The validator is ready for Step 8C, but no authoritative 34-result ledger exists yet.

### Approval and Git effect

Renderer and validator work may be committed on the Stage 5 branch. No completion claim.

## Step 6 — Prove source isolation and real-adapter failure handling

### Purpose

Demonstrate that Monitor changes only after a trustworthy read through the real read-only source boundary.

### Actions

Use the real `TestDatabaseSourceAdapter` to prove:

- incomplete and invalid reads;
- partial pagination;
- duplicate natural keys across pages;
- source-revision drift;
- stale and unknown freshness;
- timeout and transport error;
- overlapping-poll protection;
- direct approved fixture mutation detection;
- blocking source access prevents new source-derived incidents;
- disabling `monitor_sim_*` consumption does not break connected acceptance;
- browser-local state cannot create, resolve, or alter an incident;
- `monitor_source_ro` is technically denied writes; and
- source actions cannot write Monitor-owned tables.

Every negative test must fail if the system reads synthetic Monitor tables, browser memory, hard-coded incidents, or a non-read-only source path.

### Terms

- **Incomplete read:** source result that cannot safely represent the full current condition.
- **Freshness:** confidence that source data is current enough to reconcile Monitor state.
- **Negative proof:** test showing an unsafe or forbidden path cannot produce an accepted result.

### Artifacts

- real-adapter failure evidence;
- permission-denial evidence;
- simulator-disabled evidence; and
- negative-source regression tests.

### Exit

Only complete, valid, fresh reads through `monitor_source_ro` may reconcile Monitor state; every failed or incomplete read preserves the last trustworthy state.

### Approval and Git effect

Corrective tests and required implementation remain on the Stage 5 branch. No merge or completion claim.

## Step 7 — Prove scheduling and downstream recovery

### Purpose

Prove that normal automatic operation and recovery work without scenario-side shortcuts or manual database repair.

### Actions

1. Prove real due-time execution, independent frequencies, chronological crossed polls, pause/resume, serialization, action-at-poll ordering, overlap protection, restart, and recovery.
2. Add explicit test-only interruption points after incident commit and around routing, delivery creation, conversation attachment, alert-message creation, and committed change publication.
3. Interrupt each stage intentionally.
4. Run a later healthy poll.
5. Prove unfinished work is repaired without manually deleting rows and without duplicating completed work.
6. Record actual poll-cycle IDs, interruption IDs, repaired object IDs, and idempotency assertions.

### Terms

- **Due-time execution:** scheduler runs because configured time arrived, not because a test called “poll now.”
- **Interruption point:** controlled test-only stop used to simulate failure between committed stages.
- **Idempotent:** repeating recovery produces the same correct result without duplicates.

### Artifacts

- scheduler timeline evidence;
- restart/recovery evidence;
- interruption-point contracts; and
- downstream repair tests.

### Exit

Normal scheduling and restart are proven, and every interrupted downstream stage repairs idempotently through later healthy operation.

### Approval and Git effect

Implementation and tests stay on the Stage 5 branch. No completion claim.

## Step 8 — Run same-runtime browser acceptance

### Purpose

Verify the real visible product against the exact connected objects created by the acceptance run.

### Actions

1. Run laboratory, API, Monitor database, scheduler, Dashboard, conversations, messages, and Chat UI in one acceptance runtime.
2. Make browser artifacts reference exact incident, conversation, message, delivery, receipt, and cursor IDs from that run.
3. Capture durable Dashboard, Chat list, Chat detail, desktop, tablet, mobile, keyboard navigation/activation, focus order, accessible names, reduced motion, responsive overflow, console, and reconnect evidence.
4. Reject reused evidence, different-runtime evidence, mock conversations, and UI-only fixtures.

### Terms

- **Same runtime:** every tested service and UI uses the same Monitor database and acceptance-run state.
- **Browser artifact:** durable screenshot or structured browser evidence tied to exact run IDs.

### Artifacts

- run-specific browser manifest;
- Dashboard, Chat list, and Chat detail artifacts;
- accessibility, keyboard, responsive, console, and reconnect results.

### Exit

Every visible artifact is traceable to the same acceptance runtime and exact committed object chain.

### Approval and Git effect

No reused evidence may be approved. Corrections remain on the Stage 5 branch and invalidate affected evidence.

### Step 8B — Human observability workspace and exploratory acceptance

#### Purpose

Let the human watch connected alerts flow through the product in one laboratory screen and discover problems not anticipated by automated tests.

#### Actions

1. Redesign the laboratory screen to add visualization only:
   - passive, read-only Dashboard preview using real committed Monitor data;
   - passive, read-only Chat preview showing conversations and alert messages arriving for observed users;
   - visible incident, conversation, message, delivery, receipt, and cursor IDs; and
   - links to the real Dashboard and real Chat UI for interactive testing in dedicated user sessions.
2. Ensure previews cannot send messages, mutate incidents or routing, mark conversations read, create delivery/read receipts, change presence, switch business state, or write expected results.
3. Reuse real Monitor APIs and presentation components without creating a second Dashboard or Chat implementation.
4. Keep interactive Chat side effects confined to the linked real Chat UI.
5. Provide an open exploratory period beyond the 34 predefined scenarios.
6. Record every finding with identity, scenario, attempted behavior, expected/actual result, source and Monitor IDs, artifact, classification, correction, and retest status.
7. Convert valid repeatable findings into regression tests where practical without changing the approved 34-test accounting.
8. After any correction, rerun affected automated/browser gates and repeat human review.

#### Terms

- **Passive/read-only preview:** visualization that does not change the state being observed.
- **Exploratory testing:** human investigation beyond predefined scripts to discover unanticipated behavior or usability problems.

#### Artifacts

- unified observability workspace;
- passive-side-effect tests;
- human findings log; and
- correction/retest evidence.

#### Exit

The previews introduce no state-changing effects, findings are resolved or explicitly deferred, affected tests pass again, and the human explicitly accepts the workspace and real product behavior.

#### Approval and Git effect

Human acceptance is mandatory. No automatic test may substitute for it.

### Step 8C — Execute the exact connected acceptance set and finalize the ledgers

#### Purpose

After Steps 6–8B have completed the required negative, scheduling, recovery, browser, and human evidence capabilities, execute the authoritative Stage 5B set and produce the final reviewable chain-of-custody ledgers.

#### Actions

1. Start from a validated baseline and execute exactly 34 approved IDs: 11 shared, 9 A02, 6 A03, and 8 A05.
2. Never execute or substitute `A02-08`, `A03-06`, or `A05-07`.
3. Give every test an independent experiment/result and apply its Step 5.2 fixture and cleanup contract in `finally`.
4. Use the Step 5.3 capture path to derive acceptance from source records, `monitor_source_ro` reads, Monitor records, scheduling/recovery evidence, and the real same-runtime UI—never laboratory expected counters.
5. Include applicable Step 6, 7, 8, and 8B evidence and cross-validate every identifier against the current run.
6. Generate the machine-readable JSON and readable Markdown ledgers through Step 5.4.
7. Fail for a missing chain link, duplicate, failed/skipped/extra ID, excluded execution, different-runtime artifact, cleanup failure, or mismatched outcome.
8. If 8C exposes an implementation or evidence defect, return the correction to its owning Step 6, 7, 8, or 8B gate, rerun affected rehearsals, and restart 8C from a validated baseline. Do not repair evidence inside the ledger renderer.

#### Terms

- **Authoritative execution:** the one complete 34-case run whose results populate the pre-official acceptance ledger; earlier rehearsals do not count.
- **Owning gate:** the earlier step responsible for the behavior or evidence capability that failed.

#### Artifacts

- one schema-valid 34-result JSON ledger;
- one equivalent readable Markdown ledger;
- per-test chain-of-custody artifacts; and
- complete execution and restoration evidence.

#### Exit

The ledgers contain exactly 34 independently reported results: 34 passed, zero failed, zero skipped, zero extras, and zero excluded IDs. Every applicable chain is complete, all artifacts belong to the same run, and source restoration passes.

#### Approval and Git effect

No Stage 5 completion claim. Ledger structure, execution corrections, and pre-official evidence may remain on the Stage 5 branch. Step 9 still requires two independent official runs of the unchanged finished version.

## Step 9 — Perform the complete final examination twice

### Purpose

Prove the finished implementation is repeatable from a clean starting state rather than passing once by chance.

### Actions

1. Fetch and compare the latest `origin/main` again.
2. Merge compatible accepted changes into Stage 5 under Step 3 rules. Stop for user reconciliation if blocked Phase 7 work reached `main`.
3. Record the exact Git commit to be tested and voluntarily stop changing code, authority, contracts, fixtures, and evidence logic.
4. Restore and validate the protected baseline.
5. Run Stage 5A, real-adapter failures, scheduling/recovery, same-runtime browser acceptance, and observability checks.
6. Execute Step 8C to run the exact 34 connected cases and generate fresh schema-valid JSON and Markdown ledgers for that official run.
7. Run automated tests, typecheck, production build, dependency security audit, routing regression, and query-plan validation.
8. Restore and validate the baseline in `finally`, whether the run passes or fails.
9. Repeat the entire process independently from the restored baseline without reusing incidents, conversations, messages, browser artifacts, or results.
10. If anything changes or fails, fix it and repeat both runs from the beginning.

### Terms

- **Freeze implementation:** voluntarily stop changing the tested version; it is not a technical lock.
- **Baseline:** verified clean source state used to start every run.
- **Regression:** previously working behavior broken by new work.
- **Finally:** cleanup that runs whether validation succeeds or fails.
- **Independent repeat:** second run starts clean and does not reuse first-run state or evidence.

### Artifacts

- exact validation commit SHA;
- two independent run IDs;
- two complete ledger/evidence sets;
- regression/build/audit results; and
- two successful reset/restore records.

### Exit

Both complete runs pass against the same unchanged commit, both baselines restore successfully, and no required evidence is missing.

### Approval and Git effect

Any subsequent change invalidates both runs. Do not update completion status until Step 10 review.

## Step 10 — Review and document the final Stage 5 evidence

### Purpose

Decide whether the evidence genuinely supports Stage 5 completion before making the claim durable.

### Actions

1. Confirm both runs tested the same commit.
2. Confirm exactly 34 passed, zero failed, zero skipped, and zero excluded cases executed in both runs.
3. Audit ledgers, chain-of-custody fields, browser artifacts, human findings, and reset/restore evidence.
4. Confirm Phase 10 exclusions remain explicit.
5. Record the final Stage 5 evidence and handoff in this authority file; immutable ledgers and browser artifacts remain separate evidence, not separate authority documents.
6. Record validation commit, run IDs, manifest/fixture/query/source-action versions and digests, browser artifact paths, human acceptance, restoration, and exclusions.
7. Update this file, README, and roadmap to Stage 5 complete and Stage 6 next only if every condition passes.
8. Preserve the checkpoint inventory, report, and handoff as historical evidence.
9. Present all final documentation changes uncommitted for user review.

### Terms

- **Handoff:** document explaining completed work, evidence, boundaries, rerun instructions, and what comes next.
- **Canonical report:** current accepted evidence document, distinct from archived checkpoint evidence.

### Artifacts

- final evidence and handoff section in this file; and
- reconciled README/roadmap pointers and historical links.

### Exit

The user agrees the evidence supports Stage 5 completion and approves the final documentation.

### Approval and Git effect

Stop uncommitted. No push or merge until explicit approval.

## Step 11 — Commit and push the completed Stage 5 branch

### Purpose

Create the final reviewable branch without contaminating it with raw or unrelated files.

### Actions

1. Stage only intended implementation, tests, contracts, evidence manifests/summaries, and approved documents.
2. Exclude protected backups, raw local evidence, runtime databases, secrets, temporary plans, and unrelated files.
3. Review staged file names, staged diff, whitespace, links, tests, and evidence references.
4. Create final corrective commit or commits.
5. Push only `codex/phase6-stage5`.
6. Verify local and remote branch SHAs match.
7. Present `main...codex/phase6-stage5` commits, changed files, validation SHA, two run IDs, and remaining untracked files.

### Terms

- **Staged diff:** exact content selected for the next commit.
- **Remote branch:** branch stored on GitHub rather than only locally.

### Artifacts

- final corrective commits;
- synchronized remote Stage 5 branch; and
- merge-review packet.

### Exit

The remote branch contains only approved final work and is ready for merge review.

### Approval and Git effect

Requires explicit commit and push authorization. Does not authorize merging into `main`.

## Step 12 — Review and merge Stage 5 into `main`

### Purpose

Make the completed Stage 5 result part of the canonical project only after explicit final approval.

### Actions

1. Present every Stage 5 commit, changed file, validation commit, both run IDs, unresolved/deferred item, and Phase 10 exclusion.
2. Confirm Stage 6 remains next and Phase 6 is not prematurely marked complete.
3. Obtain explicit user approval for the merge method and merge.
4. Recommend a normal non-squash merge commit so checkpoint and corrective history remain auditable; the user makes the final merge-method decision.
5. Verify `main` contains the approved implementation and authority state.
6. Run proportional post-merge verification.
7. Push `main` only with explicit authorization.
8. Keep the Stage 5 branch until post-merge verification is complete.

### Terms

- **Non-squash merge:** preserve branch commits rather than combining them into one commit.
- **Post-merge verification:** confirm the merged `main` tree and important checks still match the approved branch.

### Artifacts

- reviewed merge commit;
- post-merge verification record; and
- synchronized `main` only if pushing was authorized.

### Exit

Stage 5 is merged, verified, and accurately documented on `main`. The corrective Stage 5 plan is complete.

### Approval and Git effect

Merge and push require explicit user authorization. Without it, `main` remains unchanged.

## What happens after Step 12

Stage 5 is complete. Phase 6 remains in progress. Stage 6 requires a separate reviewed plan to audit the merged result, reconcile authority/implementation, confirm connected replacements, decide simulator retirement, preserve useful deterministic fixtures, and perform the final Phase 6 exit review.

## Cross-step commit sequence

Expected commit groups are:

1. `docs(phase6): correct stage 5 status and execution authority`
2. `feat(phase6): complete connected laboratory boundary`
3. `test(phase6): add ledger framework and negative-source acceptance`
4. `test(phase6): add scheduler and downstream recovery acceptance`
5. `feat(phase6): add same-runtime observability and browser acceptance`
6. `test(phase6): finalize exact connected acceptance ledgers`
7. `docs(phase6): record final stage 5 evidence and handoff`

Split commits further when a unit needs independent review. Never combine the initial status correction with corrective implementation.

## Cross-step failure and rollback rules

- A failed planning review changes no code and is corrected on the same branch.
- A failed implementation gate leaves Stage 5 in progress and records the failed run without overwriting earlier evidence.
- A failed reset or restore blocks later work and leaves application readiness disabled until verified recovery.
- A merge conflict after official validation invalidates both runs.
- If checkpoint code proves unsafe, revert it with a new commit; do not rewrite published history.
- If the final branch is rejected, `main` remains at the last accepted Phase 6 stage.
- Parallel Phase 7 branches remain outside Stage 5 and cannot satisfy Stage 5 evidence.

## Final merge checklist

- [ ] Step 1 planning correction reviewed before implementation;
- [ ] latest compatible `main` synchronized before official validation;
- [ ] published history not rebased or force-pushed;
- [ ] exactly 34 approved IDs passed twice;
- [ ] every ledger chain complete and schema-valid;
- [ ] browser artifacts from the same runtime and exact IDs;
- [ ] passive previews produce no state-changing effects;
- [ ] human exploratory findings resolved, explicitly deferred, or converted to regression coverage;
- [ ] no recovery test uses manual row deletion;
- [ ] raw local/protected data not staged;
- [ ] reset and restore healthy twice;
- [ ] tests, typecheck, build, audit, routing, and query plans pass;
- [ ] Phase 10 exclusions explicit;
- [ ] Stage 6, Phase 6, and Phase 7 status not advanced beyond evidence; and
- [ ] user approved the final merge.

## Review history

The earlier gate-first draft received four review and improvement passes:

1. **Sequencing challenge:** Added an uncommitted planning-review stop and separate authorization before commit, push, or implementation.
2. **Authority-lifecycle challenge:** Added archive provenance, checkpoint assessment, current-link reconciliation, and link validation.
3. **Executability challenge:** Added file and requirement trace matrices, stable requirement IDs, concrete exit assertions, and schema-validated ledgers.
4. **Branch-integration challenge:** Isolated parallel Phase 7 work, defined synchronization decisions, and required an auditable final merge review.

The present revision keeps the twelve reviewed execution steps and consolidates all current Stage 5 planning, status, trace, and inventory content into this one authority file.

## Checkpoint assessment

Checkpoint `165abc1` proved that the development API can use the `test_database` source, several legal lifecycle guards exist, healthy polling can create downstream Monitor objects, the manifest names the exact 34 approved IDs, reset/restore logs exist, and one connected browser review was performed. It is not accepted because the validator bypasses laboratory actions with direct SQL, relies on manual polling, deletes rows to simulate recovery, emits incomplete chain-of-custody ledgers, reuses browser evidence, and lacks the required passive human observability review. The classification and trace below define every remaining correction.

## Checkpoint classification and requirement trace

There is no separate gap-assessment or inventory authority.

## Checkpoint file classification

Every path changed by `main..165abc1` is classified below. `Revise` means useful work remains but must be corrected; `incomplete` means the artifact cannot satisfy its intended Stage 5 role without substantial additions.

| Checkpoint path | Disposition | Reason | Corrective IDs | Planned destination | Verification command or artifact |
| --- | --- | --- | --- | --- | --- |
| `apps/api/src/routes/scenarios.ts` | Revise | Useful shared endpoints exist, but source actions lack versioned action IDs/contracts and polling remains manually callable as acceptance proof. | A-01–A-08, LAB-01–LAB-06, SCHED-01 | Same path | API contract tests plus Stage 5A action ledger. |
| `apps/api/src/scenarios.test.ts` | Revise | Covers guards and lifecycle behavior, but is not a complete black-box Stage 5A contract suite. | A-02–A-08, ISO-01–ISO-05 | Same path | Focused API tests and Stage 5A boundary command. |
| `apps/api/src/server.ts` | Revise | Connects the real adapter and exposes acceptance internals, but needs one durable experiment runtime and explicit interruption points. | ARCH-01–ARCH-04, LAB-01–LAB-06, REC-01 | Same path | Server integration tests and restart/recovery artifacts. |
| `apps/web/src/App.tsx` | Revise | Adds administrative closure and connected incident display; the required passive observability workspace is absent. | BROWSER-01–BROWSER-04 | Same path or shared presentation component | Browser side-effect and same-runtime evidence. |
| `apps/web/src/Chats.tsx` | Revise | Reduces fixture mixing, but the required passive Chat preview and exact-ID observability are absent. | BROWSER-01–BROWSER-04 | Same path or shared presentation component | Same-runtime Chat list/detail artifacts. |
| `apps/web/src/api.ts` | Revise | Adds useful connected fields and closure API; observability and experiment APIs remain incomplete. | LAB-05, BROWSER-01–BROWSER-04 | Same path | API typecheck and browser contract tests. |
| `apps/web/src/chatUi.test.mjs` | Revise | Covers presentation mapping only, not passive-preview side effects or run-specific IDs. | BROWSER-02–BROWSER-04 | Same path | UI unit tests plus browser evidence. |
| `apps/web/src/chatUi.ts` | Revise | Connected alert metadata is useful, but it does not prove same-runtime chain of custody. | CHAIN-01–CHAIN-03, BROWSER-01–BROWSER-04 | Same path | Exact-ID browser manifest. |
| `config/detection/contracts/a02.query.json` | Revise | Added routing fields and version, but final query/action version coupling and connected drift evidence are absent. | CHAIN-01, ISO-05, P9-01 | Same path | Contract validation and query-plan evidence. |
| `config/detection/contracts/a03.query.json` | Revise | Same limitation as A02. | CHAIN-01, ISO-05, P9-01 | Same path | Contract validation and query-plan evidence. |
| `config/detection/contracts/a05.query.json` | Revise | Same limitation as A02. | CHAIN-01, ISO-05, P9-01 | Same path | Contract validation and query-plan evidence. |
| `config/detection/fixtures/test-database-stage5.v1.json` | Incomplete | Lists source IDs but has no isolated reset contract, natural-key/action mapping, version digest, or unrelated-row proof. | A-04, B-03, VALID-02 | Revised versioned fixture artifact | Fixture schema validation and baseline digest. |
| `config/detection/stage5-connected-acceptance.v1.json` | Incomplete | Contains exact IDs/titles only; mandatory per-test actions, source, scheduler, downstream, browser, and cleanup fields are missing. | B-01–B-05, LEDGER-01–LEDGER-03 | Revised versioned manifest | Manifest schema and exact-set validator. |
| `docs/delivery/phases/phase6/README.md` | Revise | Prematurely declared Stage 5 complete and Stage 6 next. | DOC-01, PASS-01 | Same path | Link check and authority review. |
| `docs/delivery/phases/phase6/stage5_connected_acceptance_inventory.md` | Relocate | Exact cases are useful, but its completion claim is historical; the corrected inventory now lives only in this authority file. | DOC-02, B-01–B-05 | `archive/docs/implementation/stage5_connected_acceptance_inventory_checkpoint_165abc1.md` | Link check and exact-set comparison. |
| `docs/delivery/phases/phase6/stage5_connected_acceptance_report.md` | Relocate | Historical checkpoint claim must remain unchanged but cannot stay current. | DOC-03, PASS-01 | `archive/docs/implementation/stage5_connected_acceptance_report_checkpoint_165abc1.md` | Link check and provenance note. |
| `docs/delivery/phases/phase6/test_database_stage5_handoff.md` | Relocate | Historical handoff prematurely authorized Stage 6 simulator retirement. | DOC-03, ST6-01–ST6-02 | `archive/docs/implementation/test_database_stage5_handoff_checkpoint_165abc1.md` | Link check and provenance note. |
| `docs/roadmap.md` | Revise | Prematurely made Stage 6 current and omitted clarified Phase 9 hardening. | DOC-01, P9-01, PASS-01 | Same path | Authority review and link check. |
| `package.json` | Revise | Command exists but does not yet run the complete corrective examination. | VALID-01–VALID-04 | Same path | `npm run validate:phase6-stage5`. |
| `packages/conversations/src/index.ts` | Revise | Useful connected conversation metadata, but interruption/recovery and exact chain evidence are incomplete. | CHAIN-02, REC-01–REC-02 | Same path | Conversation recovery tests and ledger IDs. |
| `packages/database/migrations/0013_phase6_stage5_acceptance.sql` | Incomplete | Adds experiments/snapshots/results and closure state, but lacks complete action/ledger/interruption contracts and upgrade evidence. | LAB-01, LEDGER-01, REC-01 | Revised migration(s) | Migration tests and schema inspection. |
| `packages/database/src/index.ts` | Retain | Correctly includes the checkpoint migration; later migration additions may extend it. | LAB-01, LEDGER-01 | Same path | Migration test suite. |
| `packages/detection/src/backup-adapter.test.ts` | Revise | Query-version assertions are useful; connected drift and full real-adapter failures remain incomplete. | FAIL-01–FAIL-03, P9-01 | Same path | Real-adapter suite and contract digests. |
| `packages/detection/src/experiment.ts` | Incomplete | Durable clock/configuration primitives exist, but no scheduler-owned runtime, restart/recovery, prior-history completeness, or action ledger. | LAB-01–LAB-06, SCHED-01–SCHED-03 | Same module or focused experiment modules | Experiment runtime and restart tests. |
| `packages/detection/src/freshness.ts` | Revise | Adds test-database freshness modes, but durable failure evidence and real revision semantics need completion. | FAIL-01–FAIL-03 | Same path | Real-adapter failure artifacts. |
| `packages/detection/src/index.ts` | Revise | Export surface must follow final contracts. | A-01, LAB-01 | Same path | Typecheck and public API review. |
| `packages/detection/src/scheduler.ts` | Revise | Adds scheduled/overlap helpers, but automatic business-clock scheduling, crossed times, restart, and recovery are not proven. | SCHED-01–SCHED-03 | Same path | Scheduler timeline and restart artifacts. |
| `packages/detection/src/simulator.ts` | Revise | Correctly rejects invalid recurrence; operational simulator must remain until Stage 6 and connected replacement proof. | ST6-01–ST6-02 | Same path through Stage 5 | Simulator-disabled Stage 5 proof, then Stage 6 audit. |
| `packages/detection/src/test-database.ts` | Revise | Contains valuable source actions and real fault injection, but contracts, exact before/after evidence, unrelated digests, and one shared action path are incomplete. | A-01–A05-07, ISO-01–ISO-05, FAIL-01–FAIL-03 | Same module plus versioned contracts | Stage 5A contract and isolation artifacts. |
| `packages/incidents/src/incidents.test.ts` | Revise | Covers administrative closure suppression but not interruption-point recovery. | REC-01–REC-02 | Same path | Incident interruption/recovery tests. |
| `packages/incidents/src/index.ts` | Revise | Closure and downstream behavior are useful; explicit interruption points and repair chain are missing. | REC-01–REC-02, CHAIN-02 | Same path | Recovery artifacts without row deletion. |
| `scripts/test-database-common.sh` | Retain | Improves runtime-inspection failure reporting and does not create a corrective gap. | VALID-02 | Same path | Shell syntax and database validation. |
| `scripts/validate-phase5-routing.ts` | Revise | Dynamic group selection is useful, but Stage 5 must preserve this as a separate regression rather than substitute it for per-test routing evidence. | CHAIN-02, VALID-03 | Same path | `npm run validate:phase5-routing`. |
| `scripts/validate-phase6-stage5.sh` | Incomplete | Resets, runs one script, and restores, but omits branch/clean checks and most required gates. | VALID-01–VALID-04 | Same path | Complete command run twice. |
| `scripts/validate-phase6-stage5.ts` | Incomplete | Runs 34 named functions but bypasses laboratory actions, manually polls, deletes rows for recovery, bundles failures, and emits summary ledgers. | B-01–B-05, CHAIN-01–CHAIN-03, SCHED-01–SCHED-03, REC-01–REC-02, LEDGER-01–LEDGER-03 | Decompose into contracted runner, schemas, and focused validators | Exact 34-row JSON/Markdown ledgers and exit code. |

## Corrective requirement trace matrix

Gap values are `partial`, `missing`, or `contradicted`. No checkpoint item is marked covered merely because a file or passing summary exists.

| Requirement ID | Prompt section | Required behavior or evidence | Checkpoint implementation reference | Checkpoint evidence reference | Gap | Planned change | Owning step | Exit assertion |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ARCH-01 | Core architecture | Preserve the exact laboratory → `test_database` → read-only poll → Monitor → Dashboard → conversations/messages → Chat flow. | Server real-adapter selection and detection runner. | Checkpoint ledgers contain partial downstream IDs. | Partial | Make every scenario traverse and record every link. | 4/5.3/8C | Each ledger row has a complete connected chain. |
| ARCH-02 | Core architecture | Laboratory simulates source actions only; acceptance comes from Monitor and its UI. | Scenario API plus direct writer calls in validator. | Summary counters and browser JSON. | Contradicted | Remove runner-side source SQL and expected-result acceptance. | 4/5.3/8C | Same human/automation action path; independent downstream assertions. |
| ARCH-03 | Core architecture | Reuse connected actions rather than 34 database pathways. | Mixed endpoint/code/direct-SQL setup. | No action contract ledger. | Partial | Define reusable action catalog referenced by all tests. | 4 | Every test references contracted actions. |
| ARCH-04 | Core architecture | Do not advance, merge, push, or claim completion before review. | Completion docs at checkpoint. | Commit `165abc1`. | Contradicted | Correct authority and preserve checkpoint historically. | 1–2 | Current authority says corrective work in progress. |
| S4-01 | Stage 4 boundary | Preserve Stage 4 as complete only for source writes, read-only polling, and incident lifecycle. | Stage 4 handoff. | Stage 4 evidence. | Partial | State narrow scope in current authority without changing handoff. | 1 | README and roadmap preserve narrow scope. |
| S4-02 | Stage 4 boundary | Record missing complete laboratory capability as a Stage 5 prerequisite gap. | No checkpoint classification. | Stage 5 summary claims. | Missing | Record in this checkpoint assessment and trace. | 1 | Gap is explicit and not attributed as Stage 4 failure. |
| S4-03 | Stage 4 boundary | Keep `monitor_sim_*` operational until Stage 6 confirms replacements. | Simulator remains present. | No simulator-disabled complete proof. | Partial | Add negative proof; defer retirement decision to Stage 6. | 6/12 | Stage 5 passes without simulator consumption; Stage 6 decides retirement. |
| A-01 | Stage 5A general | Version every reusable source-action contract. | Actions embedded in `test-database.ts`. | None. | Missing | Add action schemas/registry/version digest. | 4 | Contract validator passes. |
| A-02 | Stage 5A general | Modify only intended `test_database` records. | Writer queries and transactions. | Aggregate counts only. | Partial | Record exact before/after and unrelated-row digest. | 4 | Intended diff matches contract; unrelated digest stable. |
| A-03 | Stage 5A general | Use the `alertas_fake` writer. | `TestDatabaseConnections.writer`. | Writer identity absent from ledgers. | Partial | Capture authenticated writer identity per action. | 4 | Ledger says `alertas_fake` and permission checks pass. |
| A-04 | Stage 5A general | Never write Monitor-owned incident/downstream state from source actions. | Count comparison before poll. | Aggregate table counts. | Partial | Add exact monitored-table digests and denied cross-boundary write tests. | 4/6 | All Monitor digests stable before poll. |
| A-05 | Stage 5A general | Preserve forward-only source lifecycles. | Several 409 guards. | Some tests. | Partial | Contract every legal/illegal transition. | 4 | Full lifecycle-negative matrix passes. |
| A-06 | Stage 5A general | Expose source before/after evidence and source revision. | Status endpoint. | Ledgers omit complete diffs/revisions. | Partial | Persist action records and digests. | 4 | Every action artifact has exact before/after/revision. |
| A-07 | Stage 5A general | Use the same UI/API for humans and automation. | API exists; validator also writes SQL directly. | Direct SQL visible in validator. | Contradicted | Route all scenario actions through API/service contract. | 4 | No runner-side business SQL. |
| A-08 | Stage 5A general | Browser memory is presentation only. | No business browser store in connected path. | No negative proof. | Partial | Add browser-state tamper test. | 6 | Browser changes cannot alter incidents. |
| A02-01 | A02 actions | Create or prepare destination-bound dispatch. | `prepare` cases. | Partial source state. | Partial | Contract exact insert/update fields. | 4 | Dispatch action diff passes. |
| A02-02 | A02 actions | Receive a movement. | `correct` endpoint. | Lifecycle tests. | Partial | Contract receipt and terminal guard. | 4 | Receipt diff and no backward transition pass. |
| A02-03 | A02 actions | Cancel at origin. | `sourceAction(cancel)`. | Reverse-row count. | Partial | Record permission, original terminal state, and reverse row fields. | 4 | Exact cancel chain passes. |
| A02-04 | A02 actions | Reject at destination with precedence. | `sourceAction(reject)`. | Reverse-row count; precedence not durable. | Partial | Contract destination permission and both-zone precedence. | 4 | Reject/preference matrix passes. |
| A02-05 | A02 actions | Create exactly one new reversed movement with reset time/endpoints. | Reverse movement implementation. | Only ID/state asserted. | Partial | Assert all fields and idempotency. | 4 | One exact reverse-row diff. |
| A02-06 | A02 actions | Never make a terminal movement unreceived. | Recurrence rejected. | API 409 tests. | Partial | Add all terminal-state negative cases. | 4 | Backward-transition matrix passes. |
| A02-07 | A02 actions | Preserve independent A02 ownership after A05 handoff. | Handoff case. | Partial incident IDs. | Partial | Contract one-time handoff and ownership transition. | 4/8C | One new movement; no duplicate A05 movement reason. |
| A03-01 | A03 actions | Start an OT. | Source action support is partial. | No action ledger. | Partial | Add contracted start action. | 4 | Exact source diff passes. |
| A03-02 | A03 actions | Enforce one active OT per machine. | Competing start returns 409. | Test response. | Partial | Record machine/natural keys and unchanged digest. | 4 | Competing OT denial artifact passes. |
| A03-03 | A03 actions | Record positive first consumption while open. | `correct` endpoint. | Clean and correction tests. | Partial | Contract exact material-row change. | 4 | Positive consumption diff passes. |
| A03-04 | A03 actions | Close/cancel without inventing consumption. | Close source action. | Partial lifecycle result. | Partial | Assert closure and consumption digest. | 4 | Closure leaves consumption unchanged. |
| A03-05 | A03 actions | Reject post-closure consumption. | 409 guard. | A03-05 summary. | Partial | Persist exact denial evidence. | 4 | Post-closure attempt fails closed. |
| A03-06 | A03 actions | Prevent consumed evidence removal. | No full negative contract. | None. | Missing | Add denial at API/service/database contract level. | 4 | Removal attempt rejected; row digest stable. |
| A03-07 | A03 actions | Prevent closed OT reactivation. | Recurrence rejected generally. | No exact reactivation proof. | Missing | Add explicit reactivation denial. | 4 | Reactivation attempt fails closed. |
| A05-01 | A05 actions | Declare produced and remnant reels. | Prepare variants. | Partial. | Partial | Contract both reel kinds and fields. | 4 | Both declaration diffs pass. |
| A05-02 | A05 actions | Register weighing. | Partial correction. | A05 summaries. | Partial | Contract exact weighing fields and idempotency. | 4 | Exact weighing diff passes. |
| A05-03 | A05 actions | Register movement from machine. | Partial correction. | A05 summaries. | Partial | Contract exact movement fields and idempotency. | 4 | Exact movement diff passes. |
| A05-04 | A05 actions | Preserve A05 across OT closure. | A05-08 implementation. | Incident ID/cycles. | Partial | Add source and downstream chain. | 4/8C | Same occurrence survives closure. |
| A05-05 | A05 actions | Create destination-bound A02 movement exactly once. | Handoff implementation. | Incident IDs only. | Partial | Assert full movement diff and retry idempotency. | 4/8C | One movement and one ownership transition. |
| A05-06 | A05 actions | Remove movement delay from A05 after A02 ownership. | A05-06 checks one reason. | Partial. | Partial | Persist reason transition and A02 chain. | 8C | A05 reason removed; A02 owns delay. |
| A05-07 | A05 actions | Do not invent A05 recurrence. | Recurrence rejected. | Excluded ID list. | Partial | Keep excluded and add source-validity negative assertion. | 4/8C | No A05-07 execution or hidden recurrence. |
| LAB-01 | Experiment controls | Durable experiment identity and prior history. | Experiment tables/repository. | Experiment IDs; snapshot history weak. | Partial | Complete history contracts and persistence. | 4 | Restart preserves experiments and history. |
| LAB-02 | Experiment controls | Shared business clock distinct from audit time. | Shared clock code. | SH-06 summary. | Partial | Tie clock to action/poll ledger. | 4/7 | Timeline artifacts distinguish both times. |
| LAB-03 | Experiment controls | Independent speed/frequency, run/pause, deterministic jumps. | Repository configure/advance. | SH-02/SH-03 summaries. | Partial | Connect controls to scheduler-owned runtime. | 4/7 | Due timeline matches all crossed times. |
| LAB-04 | Experiment controls | Automatic due polling and poll-boundary ordering. | Internal scheduler calls/manual polls. | SH-04/SH-07 summaries. | Contradicted | Drive actual scheduler runtime and action ordering. | 7 | No manual poll is used as automatic proof. |
| LAB-05 | Experiment controls | Structured snapshots and pending-source/failed-read presentation. | Snapshot payloads and status. | Snapshot IDs only. | Partial | Version snapshot schema and visible presentation. | 4/8 | Snapshot schema and UI artifacts pass. |
| LAB-06 | Experiment controls | Shared human and automation action path. | Mixed API/direct SQL. | Direct SQL in validator. | Contradicted | Remove bypasses and add endpoint identity to ledger. | 4/5.1/8C | All 34 reference contracted endpoints. |
| B-01 | Stage 5B set | Execute exactly 11 shared, 9 A02, 6 A03, and 8 A05 IDs. | Manifest has exact IDs. | Ledger has 34 summaries. | Partial | Schema-validate groups and independent results. | 5.1/8C | Exact set/count passes. |
| B-02 | Stage 5B set | Exclude A02-08, A03-06, A05-07. | Manifest exclusion list. | Ledger exclusion list. | Partial | Fail on any excluded execution or substitution. | 5.1/8C | Zero excluded IDs executed. |
| B-03 | Stage 5B cases | Give every test an isolated fixture/reset contract. | Servers often share source mutations; fixture IDs listed. | No per-test reset artifact. | Missing | Add isolated source baseline contract per test. | 5.2/8C | Each row names and proves cleanup/reset. |
| B-04 | Stage 5B cases | Accept from Monitor and real UI, never laboratory counters. | `actualMonitor` counts and one browser row. | Mostly summary counters. | Partial | Query independent records and exact UI objects. | 5.3/8/8C | Per-test chain and artifacts pass. |
| B-05 | Stage 5B cases | Declare complete action/source/scheduler/downstream/UI/cursor/cleanup expectations. | Manifest has title/expected only. | Ledger varies by test. | Missing | Expand manifest schema with mandatory fields. | 5.1 | Manifest validator passes all 34. |
| CHAIN-01 | Chain of custody | Record action → source key/diff/writer → read/query/version/revision/poll. | Scattered code variables. | Missing from ledger. | Missing | Persist ordered source/read chain. | 5.3/8C | Every row validates source/read links. |
| CHAIN-02 | Chain of custody | Record incident/evidence → routing/deliveries → conversation/message/receipts. | Objects are created. | Some tests return a subset. | Partial | Capture exact IDs for every applicable test. | 5.3/8C | Every downstream link is present and cross-validates. |
| CHAIN-03 | Chain of custody | Record cursor range and exact Dashboard/Chat artifacts. | Cursor sometimes returned; browser summary generic. | Reused browser JSON. | Missing | Generate run/test-specific artifact manifest. | 5.3/8/8C | Exact IDs visible in artifact metadata. |
| ISO-01 | Isolation proofs | Source action changes source while Monitor remains unchanged before poll; healthy poll then changes Monitor. | Aggregate count check. | No exact digests. | Partial | Add black-box before/action/poll snapshots. | 6 | Exact source diff and Monitor stability/change pass. |
| ISO-02 | Isolation proofs | Failed/incomplete poll preserves trustworthy state; direct fixture mutation is detected. | Fault tests; some direct SQL. | Bundled SH-10 result. | Partial | Separate black-box cases and artifacts. | 6 | Both cases pass independently. |
| ISO-03 | Isolation proofs | Blocking source access prevents incidents; disabling simulator consumption does not break acceptance. | Not fully tested. | None. | Missing | Add network/credential block and simulator-disabled runs. | 6 | Both negative proofs pass. |
| ISO-04 | Isolation proofs | Browser state cannot mutate incidents; Monitor denied source writes; source actions denied Monitor writes. | Monitor account denial exists in database validation. | No Stage 5 chain. | Partial | Add Stage 5-specific cross-boundary denials. | 6 | All three attacks fail closed. |
| ISO-05 | Isolation proofs | Every query records `adapterKind=test_database` and `monitor_source_ro`; synthetic paths fail. | Registry uses adapter kind. | Ledgers omit it. | Partial | Include and validate adapter/account per poll. | 6 | No accepted row has another adapter/account. |
| FAIL-01 | Technical failures | Real adapter covers incomplete, invalid shape, partial pagination, duplicate keys, revision drift. | Real fault injection modes. | Bundled status map. | Partial | Separate durable artifacts and assertions. | 6 | Each failure preserves state through real adapter. |
| FAIL-02 | Technical failures | Real adapter covers stale/unknown freshness, timeout, transport error, overlap. | Implemented fault flags/runner overlap. | Bundled status map. | Partial | Add contract-level setup and chain evidence. | 6 | Each case passes independently. |
| FAIL-03 | Technical failures | Memory adapters cannot satisfy Stage 5. | Mixed unit and connected tests. | No validator prohibition. | Missing | Validate adapter provenance in ledger/schema. | 6 | Gate rejects memory/simulator evidence. |
| SCHED-01 | Scheduler | Prove due time, independent frequencies, chronological crossed times, pause, serialization. | Experiment arithmetic plus internal scheduler. | Summary values only. | Partial | Run actual scheduler timeline. | 7 | Durable timeline matches configured due events. |
| SCHED-02 | Scheduler | Prove overlap, action-at-poll ordering, restart, and recovery. | Overlap and action tests; no restart. | Partial IDs. | Partial | Add restartable experiment scheduler tests. | 7 | Restart resumes without loss/duplication. |
| SCHED-03 | Scheduler | Manual poll/poll-now cannot prove automation. | Validator relies on manual poll endpoint. | Most ledger rows. | Contradicted | Remove manual polling from scheduler acceptance cases. | 7 | Automatic proof has scheduler-owned trigger. |
| BROWSER-01 | Same runtime | API, Monitor DB, lab, tests, Dashboard, and Chat use one runtime. | SH-11 starts one API; web evidence externally supplied. | One complete run, later reuse. | Partial | Orchestrate one run-specific runtime. | 8 | Runtime manifest lists matching IDs/origins/database. |
| BROWSER-02 | Same runtime | Inspect exact incident/conversation/message/cursor IDs. | Browser summary counts. | No exact ID manifest. | Missing | Inject run/test IDs into browser assertions/artifacts. | 8 | Exact chain IDs cross-match ledger. |
| BROWSER-03 | Same runtime | Save Dashboard, Chat, three viewports, keyboard, accessibility, reduced motion, overflow, console, reconnect. | Generic passed fields. | Reused JSON and no artifact paths. | Partial | Capture fresh durable artifacts per official run. | 8 | All required artifact paths exist and validate. |
| BROWSER-04 | Human review | Passive previews, no side effects, real links, exploratory findings/retests, explicit acceptance. | Absent. | None. | Missing | Build observability workspace and findings ledger. | 8B | Side-effect tests pass and user accepts. |
| REC-01 | Recovery | Add interruption points around incident, routing, delivery, attachment, message, publication. | No explicit points. | None. | Missing | Add test-only fault contracts. | 7 | Every interruption is independently exercised. |
| REC-02 | Recovery | Later healthy poll repairs idempotently without row deletion. | Validator deletes conversation/message rows. | SH-10 summary. | Contradicted | Replace deletion with controlled interruption and retry. | 7 | Repair produces no duplicates across repeated polls. |
| LEDGER-01 | Durable ledger | Version a schema with all mandatory identity, source, read, downstream, cursor, browser, cleanup, and failure fields. | Result type is open-ended evidence object. | JSON only, inconsistent rows. | Missing | Add JSON schema and Markdown renderer. | 5.1/5.4 | Schema validates every result. |
| LEDGER-02 | Durable ledger | Exactly one independent result per approved ID; fail missing/duplicate/extra/excluded. | Count/unique checks exist. | 34 rows. | Partial | Validate groups, status, all fields, and exclusions. | 5.4/8C | Exactly 34 passed; zero invalid states. |
| LEDGER-03 | Durable ledger | Validator exits nonzero unless 34 passed, 0 failed/skipped/excluded. | Throws on failures; no skipped type. | Summary counts. | Partial | Add strict accounting and schema failures. | 5.4/8C | Exit gate matches exact accounting. |
| VALID-01 | Repeatable command | Verify correct branch and clean start. | Shell omits both. | None. | Missing | Add hard preflight. | 9 | Wrong/dirty state fails before mutation. |
| VALID-02 | Repeatable command | Validate source readiness, reset baseline, fixtures/contracts/Stage 5A, and restore in `finally`. | Reset/restore trap exists. | Reset/restore logs. | Partial | Add readiness/contracts/A gate and robust finally evidence. | 9 | Reset and restore validate for both runs. |
| VALID-03 | Repeatable command | Run exact 34, failures, scheduler/recovery, browser, tests, typecheck, build, audit, routing, query plans. | Only Stage 5 script runs. | Connected log only. | Missing | Orchestrate all commands and collect statuses. | 9 | Complete command passes. |
| VALID-04 | Repeatability | Run unchanged finished version twice from restored baselines; any change invalidates both. | Two checkpoint runs, but browser reused and gate incomplete. | `134848Z`, `141110Z`. | Contradicted | Freeze SHA and execute two independent complete runs. | 9 | Same SHA, two full fresh evidence sets. |
| ST6-01 | Stage 6 boundary | Stage 6 audits accepted evidence and decides simulator retirement only after replacements. | Checkpoint handoff authorizes retirement. | Incomplete Stage 5 evidence. | Contradicted | Return Stage 6 to pending and retain simulator. | 1/12 | No retirement claim before Stage 6 audit. |
| ST6-02 | Stage 6 boundary | Stage 6 cannot supply missing Stage 5 evidence. | Completion docs defer only audit. | Missing Stage 5 proof. | Contradicted | Make all corrective proof Stage 5 work. | 1–10 | Stage 5 exit stands independently. |
| P9-01 | Phase 9 | Add full-product isolation, no simulator/browser truth, versioned contracts, drift comparison, source portability, promotion matrix. | Roadmap lacked clarified paragraph. | None. | Missing | Update roadmap. | 1 | Phase 9 requirements are explicit. |
| P10-01 | Phase 10 | Keep real auth/Aurora/schema/plans/replica/load/deployment/pilot/managed behavior excluded. | Docs list exclusions. | Checkpoint report lists most. | Partial | Preserve exact exclusion set in all final artifacts. | 1/10 | No local evidence claims Phase 10 results. |
| DOC-01 | Documentation | Keep README and roadmap as minimal status pointers: Stage 5 current, Stage 6 pending. | Premature completion. | Current docs. | Contradicted | Point both to this single Stage 5 authority. | 1 | Status/link review passes without duplicated requirements. |
| DOC-02 | Documentation | Consolidate the Stage 5A/5B inventory and mandatory fields into this authority file. | Exact test descriptions only. | Checkpoint inventory. | Partial | Archive the checkpoint inventory and keep the corrected set here. | 1 | This file contains the exact set, gates, fields, and accounting. |
| DOC-03 | Documentation | Preserve historical checkpoint inventory/report/handoff unchanged with provenance. | Current files. | Checkpoint claims. | Missing | Relocate all three and add provenance warnings. | 1 | Historical paths resolve; no current completion links. |
| DOC-04 | Documentation | Maintain one current Stage 5 authority file; do not create separate plans, assessments, inventories, reports, or handoffs. | Multiple proposed current files. | Step 1 review finding. | Contradicted | Consolidate all current Stage 5 information here. | 1/10 | Only this file owns current Stage 5 execution and evidence status. |
| PASS-01 | Required first pass | Classify implementation, show changes/reasons, sequence/gates, decisions, and do not implement. | No corrective documents. | Checkpoint only. | Missing | Complete Step 1 documents only. | 1 | User receives reviewable uncommitted planning diff. |
| PASS-02 | Required first pass | Stop uncommitted and unpushed for review. | Not applicable. | Git state. | Missing | Run link/status checks and stop. | 1 | No implementation change, commit, or push after Step 1. |

## Step 1 completion conditions

- current README and roadmap point to this file and state Stage 5 corrective work in progress and Stage 6 pending;
- the Stage 4 handoff is byte-for-byte unchanged;
- all 35 checkpoint paths have one disposition;
- every corrective-prompt requirement has a stable trace ID and exit assertion;
- this file defines Stage 5A/5B and mandatory evidence fields;
- checkpoint inventory/report/handoff exist only in the archive with provenance warnings;
- no separate current Stage 5 plan, gap assessment, inventory, report, or handoff exists;
- current links resolve; and
- all Step 1 changes remain uncommitted and unpushed for user review.

## Exact 34-test acceptance inventory

**Status:** No Stage 5 result is currently accepted.

**Checkpoint manifest:** [`stage5-connected-acceptance.v1.json`](../../../../config/detection/stage5-connected-acceptance.v1.json) — incomplete and subject to revision.

**Source authority:** [`alertas_fake_v2_edge_case_test_report_v2.md`](./alertas_fake_v2_edge_case_test_report_v2.md)

Stage 5A is defined by Step 4 and its exit assertions. Stage 5B must execute exactly the 34 approved cases below through reusable Stage 5A actions and accept results only from independent Monitor records and the real UI. Synthetic counters or rendered expectations are not evidence. `A02-08`, `A03-06`, and `A05-07` remain excluded.

## Stage 5B — Exact connected Monitor acceptance

Every test below must declare and later report these mandatory fields:

| Field | Required content |
| --- | --- |
| Identity | Test ID, status, experiment ID, run ID, manifest version, source-action contract version. |
| Laboratory actions | Ordered action IDs, action names, writer identity, and human/automation endpoint. |
| Source chain | Natural keys, exact source tables/fields, before/after state and digests, unrelated-row digest, source revision. |
| Read chain | `adapterKind = test_database`, `monitor_source_ro`, query ID/version, page/revision evidence, poll-cycle IDs, completeness/freshness outcome. |
| Monitor chain | Incident and evidence IDs, routing-decision and delivery IDs, conversation and message IDs, receipt IDs, committed cursor range. |
| Visible result | Run-specific Dashboard card, Chat list, and Chat detail artifact paths containing the exact connected IDs. |
| Scheduling/recovery | Due-time events, interruption point when applicable, repair cycle, and idempotency assertions. |
| Cleanup | Isolated fixture/reset contract, final source restoration result, and failure details when not passed. |

One missing chain link fails that test. A test cannot be passed because a file exists or a summary counter matches.

### Shared tests

| Stage 2 test | Connected equivalent and preserved expected outcome |
| --- | --- |
| `SH-01` — New experiment | Reset to the verified backup-derived baseline, start a new durable experiment, and confirm no laboratory source rows, completed poll, incident, delivery, card, conversation, or message exists before start. Earlier Monitor history remains queryable. |
| `SH-02` — Speed and frequency | Set speeds 1, 2, 3, and 60 and independent polling frequencies while paused; confirm conversion and next scheduled poll update immediately without a source or Monitor write. |
| `SH-03` — Jump and pause | At frequency 3, advance 29 simulated minutes through the normal scheduler; confirm nine serialized cycles at minutes 3–27 and that pause freezes business time and automatic polling. |
| `SH-04` — Automatic poll | At one real second per simulated minute, let the next poll become due; confirm exactly one normal scheduler execution, not a scenario-side incident mutation. |
| `SH-05` — Snapshots | Capture durable structured snapshots before and after a failed connected poll; confirm stable snapshot identity and source, clock, poll, incident, routing, conversation, message, card, audit-time, delay, and cursor state. |
| `SH-06` — Shared clock | Create A02, A03, and A05 source records at one simulated time, advance 15 minutes, and confirm all three age from the same business clock while audit time remains real server time. |
| `SH-07` — Action at poll time | Commit a complete 09:03 poll, then record an A02 receipt at 09:03; confirm the committed cycle is unchanged and the receipt remains pending until the 09:06 complete poll. |
| `SH-08` — New experiment after history | Open incidents and capture a snapshot, then start another experiment; confirm prior source observations, incidents, deliveries, conversations, messages, cards, and snapshots remain durably queryable. |
| `SH-09` — Duplicate prevention | Re-poll unchanged open A02, A03, and A05 conditions; confirm no duplicate evidence, incident occurrence, routing decision or delivery, conversation link, alert message, Dashboard card, or committed client event. |
| `SH-10` — Failed read preservation | Correct open source conditions, make the next connected cycle fail or become incomplete, then run a healthy cycle; confirm the last trustworthy state survives the failed cycle and the later healthy cycle reconciles and repairs downstream work without duplication. |
| `SH-11` — Responsive behavior | Verify the connected Dashboard, Chat list, Chat detail, and scenario evidence at 390, 768, and 1440 pixels, with keyboard, accessibility, reduced-motion, visual, overflow, and console checks; preserve the approved mobile cards and contained tablet/desktop layouts. |

### A02 tests

| Stage 2 test | Connected equivalent and preserved expected outcome |
| --- | --- |
| `A02-00` — Clean baseline | Dispatch in `test_database`, receive at minute 20, and let the next complete read run; confirm `Recibido a tiempo` history with 20-minute duration and no incident or downstream alert object. |
| `A02-01` — Concurrent movements | Create three independently keyed movements at staggered times and receive only the first; confirm the received row stays clean, only the overdue row opens A02, and the younger row stays clean. |
| `A02-02` — Threshold and persistence | Read one movement at 29 minutes, exactly 30 minutes, and later unchanged cycles; confirm no incident at 29, exactly one occurrence at 30, and no duplicate evidence or downstream object afterward. |
| `A02-03` — Receipt before detection | Use a 31-minute interval, receive after minute 30 but before the first complete read, and confirm source truth closes the movement without inventing a historical A02 incident. |
| `A02-04` — Correction, failure, and isolation | Correct one open movement, fail the next complete read, and recover while unrelated movements remain active; confirm the selected incident survives failure, resolves only on recovery, and unrelated outcomes do not change. |
| `A02-05` — Administrative closure | Close one open A02 through the authorized audited Monitor endpoint while its source remains `TRANSITO`; confirm no source write, read-only history, one `CLOSED_WITHOUT_RESOLUTION` occurrence, closed detail, and suppression across unchanged healthy polls for the same uninterrupted condition. |
| `A02-06` — Mixed population | Poll received-on-time, overdue, and still-young movements together; confirm independent history/incident outcomes and only the overdue condition reaches routing, Dashboard, conversation, message, and Chat UI. |
| `A02-07` — Cancel and reject | Execute origin cancellation and destination rejection in `test_database`; confirm each terminalizes the original, creates exactly one reversed `TRANSITO` movement with a new ID and reset clock, applies rejection precedence for both-zone authority, and resolves the original incident only after a later complete poll. |
| `A02-09` — Connected downstream expectations | Open A02 and verify exact deterministic recipients and deliveries, one Dashboard card, exact-participant conversation reuse, one Monitor alert message, committed cursor delivery, and stable Chat list/detail presentation through repeated polls. |

### A03 tests

| Stage 2 test | Connected equivalent and preserved expected outcome |
| --- | --- |
| `A03-00` — Clean baseline | Start an OT and record positive first consumption at minute 10; confirm `Primer consumo a tiempo` history and no incident or downstream alert object. |
| `A03-01` — Threshold and persistence | Leave one active OT with zero valid consumption below, at, and after 15 minutes; confirm exactly one occurrence opens at 15 and remains the same occurrence across later polls. |
| `A03-02` — Concurrent mixed OTs | Run consumed, closed-without-consumption, and empty active OTs on different machines and reject a second active OT on the same machine; confirm only the empty active OT opens A03. |
| `A03-03` — Correction after failed poll | Record positive consumption for an alerted OT, fail the next complete read, then recover; confirm the incident and downstream state survive failure and resolve only after the healthy poll. |
| `A03-04` — Administrative closure | Close an open A03 through the authorized audited Monitor endpoint while the OT stays active with zero consumption; confirm read-only history and suppression for the same uninterrupted condition without a source write or reopening on unchanged polls. |
| `A03-05` — Open-OT consumption availability | Confirm an open OT accepts first consumption, closure blocks later consumption, and the next complete poll moves the closed OT to history and resolves any open A03 without inventing consumption. |

### A05 tests

| Stage 2 test | Connected equivalent and preserved expected outcome |
| --- | --- |
| `A05-00` — Clean baseline | Declare, weigh, and move a reel at minute 10, then poll; confirm `Pesada y movida a tiempo` history with weighing/departure timestamps and no incident or downstream alert object. |
| `A05-01` — Threshold, both reasons, persistence | Leave one declared reel unweighed and at the machine through 30 minutes and later polls; confirm exactly one occurrence containing `not_weighed` and `still_at_machine`, with no duplicate downstream objects. |
| `A05-02` — Independent reasons and reel kinds | Test a produced moved-but-unweighed reel and a remnant weighed-but-unmoved reel; confirm one reason per incident and the exact produced/remnant deterministic recipient sets. |
| `A05-03` — Partial correction both ways | Weigh first in one case and move first in another; confirm the same occurrence remains with only the outstanding reason and no new incident, delivery, conversation, message, or card. |
| `A05-04` — Correction after failed poll | Weigh and move an alerted reel, fail the next complete read, then recover; confirm the open incident and pending source truth survive failure and resolve only after the healthy poll. |
| `A05-05` — Administrative closure | Close one open A05 through the authorized audited Monitor endpoint while weighing and movement remain absent; confirm no source write, read-only history, one closed occurrence, closed detail, and suppression across unchanged healthy polls. |
| `A05-06` — A05-to-A02 handoff | Register one destination-bound departure, then leave the new movement unreceived past 30 minutes; confirm exactly one new A02 movement, removal of A05's movement reason, later A02 ownership, and no duplicate A05 movement alert. |
| `A05-08` — A05 survives OT closure | Open A05 with both reasons, close the source OT, poll, then legally weigh and move the reel and poll again; confirm the same occurrence survives OT closure and later resolves with preserved closure, weighing, departure, duration, A02 handoff, and downstream history. |

## Cross-cutting connected requirements and exit gate

All applicable rows above must exercise the real `TestDatabaseSourceAdapter` for incomplete reads, invalid shapes, partial pagination, duplicate natural keys across pages, source-revision drift, stale and unknown freshness, timeout, transport failures, and overlapping-poll protection. Memory adapters may support unit tests but cannot satisfy Stage 5.

Automatic scheduling must prove due-time execution, independent frequencies, chronological crossed polls, pause/resume, serialization, poll-boundary ordering, overlap protection, restart, and recovery. Recovery must use explicit test-only interruption points around incident commit, routing, delivery creation, conversation attachment, alert-message creation, and committed change publication; manual row deletion is prohibited.

The API, Monitor database, laboratory, scheduler, Dashboard, Chat, and browser must share one acceptance runtime. Evidence must include exact connected IDs for Dashboard, Chat list, Chat detail, desktop, tablet, mobile, keyboard, accessible names/focus order, reduced motion, responsive overflow, console state, and reconnect recovery. Reused or different-runtime evidence does not pass.

The human observability workspace must remain passive and read-only, expose connected IDs and links to the real Dashboard and Chat, introduce no receipts or other side effects, and support an exploratory findings/retest log. Human acceptance is mandatory.

The machine-readable JSON and readable Markdown ledgers must contain exactly 34 independent results: 34 passed, zero failed, zero skipped, zero extras, and zero excluded IDs. The finished unchanged version must pass the complete validation twice from independently restored baselines, with source restoration in `finally`. Any code, authority, contract, fixture, evidence-logic, or merge change invalidates both runs.
