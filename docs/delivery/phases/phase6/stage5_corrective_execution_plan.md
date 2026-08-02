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

### Internal execution sequence

| Sub-step | Scope | Status |
| --- | --- | --- |
| 5.1a | Version the exact 34-ID inventory, group accounting, exclusions, required actions, outcomes, and evidence applicability in the acceptance manifest. | Complete — v2 declaration preserves the exact approved set, makes exclusions non-substitutable, orders every required action, and declares all four evidence dimensions. Second-pass review added missing clock advances and explicit human/automation invocation paths; exact action parameters remain correctly owned by Step 5.2. |
| 5.1b | Add the versioned ledger schema with explicit mandatory fields and conditional applicability rules. | Complete — Draft 2020-12 result schema v1 requires identity, ordered actions, source/read/Monitor/visible chains, independent scheduling and recovery applicability, cleanup, and failure state. Strict compilation and positive/negative fixtures pass; cross-file identity, ordering, digest, and chronology checks remain correctly assigned to 5.1c. |
| 5.1c | Add strict manifest/schema validation and a failure matrix covering missing, duplicate, extra, excluded, and structurally invalid declarations. | Complete — the repeatable declaration command strictly compiles the ledger schema, cross-validates manifest/source-action versions and boundaries, and rejects missing, duplicate, extra, excluded, malformed, misgrouped, undefined-action, and unsafe-writer declarations. Second-pass review made malformed collections fail closed with controlled errors; 11 focused tests pass. Final result-ledger accounting remains assigned to Step 5.4. |

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

### Internal execution sequence

The approved eight-part split was retained after an over-splitting challenge: schema and validation foundations were combined, as were deterministic setup and runtime isolation. The remaining boundaries protect four distinct fixture families plus independent setup, cleanup, and adversarial-proof results.

| Sub-step | Scope | Status |
| --- | --- | --- |
| 5.2a | Define the fixture/cleanup contract schema and validation foundation. | Complete — strict Draft 2020-12 schema plus semantic validation enforce independent identity, exact action order, natural-key references, allowed-mutation linkage, isolated experiment/runtime declarations, mandatory cleanup, and a closed action-parameter vocabulary. Second-pass review prohibited hidden SQL and cross-test parameters; 5 focused tests pass. |
| 5.2b | Define deterministic contracts for all 11 shared tests. | Complete — exact action order, parameters, fixture identities, seeded and produced natural keys, starting-state assertions, allowed mutation references, and isolated cleanup profiles are declared for every shared ID. Review replaced weak existence checks with exact clean or alert-ready source preconditions; exact 11-ID validation passes. |
| 5.2c | Define deterministic contracts for all 9 A02 tests. | Complete — every A02 case declares seeded templates, produced movements/reversals, exact chronology, poll boundaries, failure/closure actions, authority, mixed-population state, and allowed source contracts. Review added fresh cancel/reject isolation lanes so reversed movements cannot contaminate the other subcase; exact 9-ID validation passes. |
| 5.2d | Define deterministic contracts for all 6 A03 tests. | Complete — contracts cover clean consumption, threshold persistence, mixed concurrent OTs, failed-read correction, administrative closure, and post-closure denial. Review replaced dynamic competing-OT discovery with versioned keys and added machine-level start eligibility/relationship assertions; exact 6-ID validation passes. |
| 5.2e | Define deterministic contracts for all 8 A05 tests. | Complete — contracts declare machine location, weighing, source-OT closure state, produced/remnant kinds, partial-correction lanes, failure/closure behavior, A05→A02 handoff keys, and OT-closure survival. Review added explicit post-production serial-to-movement lineage assertions; exact 8-ID and complete 34-ID validation pass. |
| 5.2f | Build deterministic setup with per-test experiment identity and Monitor-runtime isolation. | Complete — the dependency-injected runner resolves only versioned seeds, creates lane-specific plans, applies declared population setup, verifies exact starting state/relationships, reserves or creates per-test experiments correctly, and requires fresh empty Monitor runtimes. Review added exact runtime and experiment identity checks; 6 runner tests and 5 contract-foundation tests pass. |
| 5.2g | Build mandatory `finally` cleanup, restoration, and digest verification. | Complete — the lifecycle captures a valid baseline before setup; restores in `finally` after setup or execution failure; compares source and unrelated-row SHA-256 digests; destroys and verifies Monitor isolation; writes cleanup evidence; and preserves the primary error inside cleanup failures. Second-pass tests cover artifact and Monitor-disposal failures; 11 runner tests pass. |
| 5.2h | Prove forced-failure restoration, test independence, and unrelated-row protection. | Complete — the strict validation command proves exact 34-ID manifest parity, valid versioned seeds, 37 unique execution-lane identities, and mandatory cleanup guarantees. An exhaustive forced-failure matrix executes every lane, mutates its synthetic source boundary, and proves `finally` restoration, unchanged unrelated-row digest, Monitor disposal, and cleanup evidence. The adversarial pass exposed and fixed incorrect setup reads of action-produced keys: only pre-action absence may now be asserted for such keys. All 17 fixture/runner tests pass, and the existing 25-test detection suite independently passes against `test_database`, including all connected source actions, unrelated-row tamper rejection, and final source restoration. These are contract/regression proofs, not accepted Stage 5 connected results. |

### Terms

- **Fixture contract:** deterministic starting records, actions, and allowed mutations for one test.
- **Cleanup contract:** mandatory restoration and verification performed whether the test passes or fails.

### Artifacts

- per-test fixture/setup contracts; and
- cleanup and restoration validators.

### Exit

Complete. All 34 approved IDs have independent setup and cleanup contracts across 37 isolated execution lanes, and forced-failure tests prove restoration still occurs. `npm run validate:phase6-stage5-fixtures` is the repeatable exit check.

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

### Internal execution sequence

The approved six-part split keeps the three authoritative capture boundaries separate, then validates their links before connected rehearsal. A seven-part version was rejected as over-split because later-evidence attachment interfaces belong with the foundational chain model; further merging would combine distinct authorities and failure modes.

| Sub-step | Scope | Status |
| --- | --- | --- |
| 5.3a | Define the reusable chain model, builders, and validated later-evidence attachment interfaces. | Complete — immutable chain drafts accept each core authority section once and later scheduling, recovery, browser, or human evidence only through strict attachment envelopes matching the exact run, test, and experiment identity. The adversarial pass found that a valid test ID could initially claim the wrong group; group derivation is now enforced. Four focused contract tests pass. |
| 5.3b | Capture laboratory actions and authoritative source mutations, writer identity, natural keys, revisions, and digests. | Complete — ordered action capture is derived from approved manifest definitions and authoritative execution timestamps; source capture derives exact before/after records, changed fields, natural keys, writer identity, final revision, and SHA-256 evidence from source-action responses plus chain-wide isolation evidence. The adversarial pass corrected an invalid assumption that every action in a multi-action chain shares one revision and unrelated-row scope: each action now retains local proof while the fixture lifecycle supplies the chain-wide unchanged digest. Seven focused tests pass. |
| 5.3c | Capture `monitor_source_ro` reads, query versions, pages, completeness, freshness, revisions, and poll cycles. | Complete — read capture accepts only the `test_database` adapter and `monitor_source_ro` account, records query/version, ordered page counts and revisions, poll-cycle IDs, completeness, and freshness, and fails on query, authority, pagination, or revision contradictions. Review corrected page numbering and revision stability from an invalid global assumption to the actual per-cycle boundary. Connected-rehearsal preparation then exposed that the runner returned only aggregate page counts; `CycleResult` now carries exact page number, row count, and revision directly from each authoritative adapter response. Nine focused chain tests plus the complete detection suite pass. |
| 5.3d | Capture Monitor incidents, evidence, routing, deliveries, conversations, messages, receipts, and cursors. | Complete — Monitor capture records authoritative downstream identifiers, producing poll-cycle IDs, and cursor boundaries for presence, absence, or history; presence requires the complete incident-to-message chain and a committed cursor, while absence rejects every downstream object. Review found that downstream objects were initially not tied to their poll cycles; the ledger schema and capture now require that link. Duplicate IDs and impossible cursor ranges fail closed. Eleven cumulative focused tests pass. |
| 5.3e | Cross-validate every source/read/Monitor link and fail closed on missing or contradictory identifiers. | Complete — the core validator requires all four capture sections and cross-links each source-writing laboratory action to exact mutation evidence, the final source revision to the read revision, Monitor objects to recorded poll cycles, and Monitor presence to a complete fresh read. The ledger mutation schema now carries action ID and sequence so the first custody edge is machine-verifiable. Missing sections and action, revision, cycle, or trust contradictions fail closed. Thirteen cumulative focused tests pass. |
| 5.3f | Run representative connected rehearsals and prove later scheduling, recovery, browser, and human evidence attaches only to matching identities. | Complete — a diagnostic A02 rehearsal uses the canonical source-action endpoint, advances the independent business clock, performs a real `monitor_source_ro` poll, captures actual page evidence and persisted Monitor identifiers, and validates the complete source-to-message chain before restoring the created source row in `finally`. Scheduling, recovery, browser, and human attachment envelopes accept only the same run/test/experiment identity. Review corrected an invalid assumption that audit time must follow simulated business time; both clocks remain independently validated. The rehearsal is explicitly diagnostic and creates no accepted result. |

### Terms

- **Ledger:** structured record of what happened and the identifiers connecting every stage.
- **Chain of custody:** trace proving that one source action produced the exact downstream objects being accepted.

### Artifacts

- shared chain-capture modules; and
- cross-link validation tests.

### Exit

Complete. A representative connected rehearsal proves source, read, and Monitor links can be captured and cross-validated, while contract tests prove later scheduling, recovery, browser, and human evidence can attach only with matching run/test/experiment identity. `npm run validate:phase6-stage5-chain` is the repeatable exit check. Rehearsals are diagnostic evidence only and cannot count as the authoritative 34-result ledger.

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

### Internal execution sequence

The approved four-part split combines artifact checks with per-result validation and keeps JSON and Markdown rendering together because they must derive from the same validated object. A six-part version was rejected as over-split; further merging would combine validation, accounting, rendering, and executable failure-proof boundaries.

| Sub-step | Scope | Status |
| --- | --- | --- |
| 5.4a | Build strict per-result validation covering the Step 5.1 schema, chain completeness, expected outcome, cleanup, and artifact existence. | Complete — asynchronous result validation compiles the strict Step 5.1 schema, matches identity/version/action order to manifest v2, enforces source/read/Monitor/browser/scheduling/recovery applicability from declared actions and evidence, validates core custody links, requires matched declared-versus-observed outcomes, verifies cleanup digests, and accepts only existing regular artifact files under the evidence root. Review exposed the missing machine-checkable outcome contract and a macOS `/var` containment bug; the schema now requires explicit expectation evidence and path checks preserve traversal/symlink protection without false rejection. Three focused tests pass. |
| 5.4b | Build exact ledger accounting for IDs, groups, uniqueness, exclusions, and passed status. | Complete — the ledger envelope is strict and versioned, distinguishes synthetic dry runs from connected acceptance, requires the manifest run/version, validates every result, enforces exactly 34 approved unique IDs and exact group counts, rejects all exclusions and extras, and requires every result to be passed and tied to the same run. The 34-result synthetic ledger passes while missing, duplicate, extra, excluded, and skipped mutations fail. Four cumulative tests pass. |
| 5.4c | Render deterministic JSON and readable Markdown from the same validated ledger and verify semantic parity. | Complete — one validated ledger produces canonical recursively key-sorted JSON and a readable Markdown summary/table. Markdown embeds a generated machine-readable semantic summary, and the parity guard compares both that summary and the complete rendered table to the full JSON ledger before output; repeated rendering is byte-stable and deliberate summary or table tampering fails as renderer divergence. Review added newline, table-delimiter, and raw-HTML escaping, then closed a table-only divergence gap. Five cumulative tests pass. |
| 5.4d | Add the repeatable CLI and exhaustive synthetic failure matrix without presenting dry runs as connected evidence. | Complete — the reusable synthetic builder creates all 34 structurally complete dry-run results and real temporary artifacts, and the CLI validates and renders them while asserting and reporting `synthetic_dry_run`; it cannot claim connected acceptance. The failure matrix covers missing chain links, missing/duplicate/extra/excluded IDs, failed/skipped status, group/run mismatch, outcome mismatch, cleanup failure, missing/escaping artifacts, and renderer divergence. `npm run validate:phase6-stage5-ledger` runs the matrix and dry-run CLI. |

### Terms

- **Strict accounting:** validation requiring the exact approved set and rejecting every missing, duplicate, extra, skipped, failed, or excluded result.
- **Renderer divergence:** JSON and Markdown outputs disagree about the same validated result.

### Artifacts

- JSON and Markdown renderers;
- strict accounting validator; and
- validator failure-matrix tests.

### Exit

Complete. Synthetic dry-run fixtures prove valid rendering and every required failure mode through `npm run validate:phase6-stage5-ledger`. The validator is ready for Step 8C, but no authoritative 34-result ledger exists yet.

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

### Internal execution sequence

The approved six-part split was retained after challenging whether it was over-split. A five-part version placed database permissions, source-action isolation, browser authority, and final integration into one oversized unit. Database/source-writer authority and browser-local authority remain separate because they operate at different trust boundaries; further merging would weaken independent validation.

| Sub-step | Scope | Status |
| --- | --- | --- |
| 6.1 | Establish the real-adapter healthy baseline, prove approved fixture mutation detection, and prove connected operation with `monitor_sim_*` consumption disabled. | Complete — three focused connected tests prove the exact real-adapter baseline, direct approved fixture detection with pre-poll Monitor isolation, and real A02/A03/A05 incident reconciliation after simulator tables are made unavailable. `npm run validate:phase6-stage5-source-isolation:focused` is the repeatable focused gate. Final regression evidence: 25 detection tests, 47 API tests, both relevant typechecks, and source health validation pass. |
| 6.2 | Prove incomplete, invalid-shape, partial-pagination, duplicate-natural-key, and source-revision-drift handling. | Complete — five independent real-adapter boundaries prove every listed read-integrity failure preserves the last trustworthy Monitor authority and only a later complete healthy poll becomes authoritative. `npm run validate:phase6-stage5-source-isolation:focused` is the repeatable focused gate for 6.1–6.2. Final regression evidence: 8 focused connected tests, 25 detection tests, 47 API tests, both relevant typechecks, and source health validation pass. |
| 6.3 | Prove stale and unknown freshness, timeout, and transport-error handling. | Complete — four independent connected proofs cover stale and unknown freshness at both runner gates plus bounded timeout and transport retry exhaustion. Every failure preserves the last trustworthy Monitor authority, persists exact failure evidence, and requires a later healthy cycle before authority advances. Final regression evidence: 12 focused connected tests, 25 detection tests, 47 API tests, both relevant typechecks, and source health validation pass. The final adversarial pass corrected two time-sensitive API fixtures that selected rotation groups from simulated business time instead of the persisted incident timestamp used by routing; both isolated files and the aggregate API suite now pass across UTC date boundaries. |
| 6.4 | Prove overlapping-poll protection and blocked-source behavior. | Complete — two independent connected proofs show a concurrent same-query run is skipped before any additional real-adapter read or authority change, while an actual reset-safety lock blocks all source-derived incident creation until access returns. The in-flight winner and post-unblock recovery alone become authoritative. Final regression evidence: 14 focused connected tests, 25 detection tests, 47 API tests, both relevant typechecks, source health validation, and diff checks pass. |
| 6.5 | Prove database authority boundaries: `monitor_source_ro` is denied writes and source actions cannot modify Monitor-owned tables. | Complete — the live Monitor source account has only the exact approved read grants and fails closed on direct DML plus the full nine-operation DML/DDL/administrative denial matrix, with the approved source checksum preserved. Independently, all 14 canonical source actions change only contracted `test_database` fields while every dynamically discovered Monitor table remains exactly unchanged before polling; the source-action service has no Monitor database capability and cleanup restores the source exactly. Final regression evidence: 16 focused connected tests, 25 detection tests, 47 API tests, both relevant typechecks, fresh baseline and health validation, and diff checks pass. |
| 6.6 | Prove browser-local state cannot create, resolve, or alter incidents, then run the aggregate Step 6 validation. | Complete — browser storage is explicitly limited to synchronization cursor, chat presentation context, and pending outbound messages; a same-runtime connected tamper proof showed forged incident authority cannot change Monitor or its UI, while a valid source correction plus healthy poll can. The final aggregate command starts and ends from the exact protected baseline, includes the full denial matrix and every Step 6 regression boundary, and leaves no reset lock or diff error. |

#### Step 6.1 internal execution sequence

The approved three-part split keeps the healthy real-adapter baseline, direct source-mutation detection, and simulator-disabled replacement proof independently reviewable. A two-part version would combine distinct failure boundaries; a four-part version would artificially separate simulator-path exclusion from proving the real replacement still works.

| Sub-step | Scope | Status |
| --- | --- | --- |
| 6.1a | Establish a connected healthy baseline for A02, A03, and A05 through `TestDatabaseSourceAdapter`, with exact source identity and revision evidence. | Complete — a focused connected test proves all three registry entries use the real adapter and exact approved query contracts, the live MySQL session is `monitor_source_ro` against `test_database`, every poll is complete and healthy with stable ordered page revisions, and the persisted cycle retains the same query, version, revision, and adapter identity. The adversarial pass added the live session assertion after identifying that class and metadata checks alone could not prove the database identity. API and detection typechecks plus the focused connected test pass. |
| 6.1b | Prove a direct approved source-fixture mutation is detected through the real adapter, leaves Monitor unchanged before polling, and produces the expected reconciliation only after polling. | Complete — a focused black-box test changes the approved A02 source row directly through `alertas_fake`, proves every Monitor-owned table is byte-equivalent before polling, then proves the next complete real-adapter cycle opens the exact natural-key incident and links its evidence to that cycle. The adversarial pass strengthened cleanup from attempted restoration to an exact post-restore row comparison while preserving connection closure. API and detection typechecks plus both focused connected tests pass. |
| 6.1c | Prove connected A02, A03, and A05 operation succeeds while `monitor_sim_*` consumption and simulator adapters are disabled. | Complete — the test proves the runtime registry contains only the three `test_database` entries and no simulator adapter, makes approved A02/A03/A05 fixtures independently triggerable, removes every retained `monitor_sim_*` table from the isolated Monitor database, and then links three complete healthy cycles to three exact natural-key incidents and their evidence. Every persisted query identifies `test_database`, no simulator query is registered, and all changed source rows are restored and compared exactly in `finally`. The first adversarial pass correctly kept startup table retention within Stage 6 retirement; the second exposed that healthy cycles alone did not prove A03/A05 reconciliation, so exact three-rule incident assertions were added. API and detection typechecks plus all three focused connected tests pass. |

#### Step 6.2 internal execution sequence

The approved five-part split keeps each distinct read-integrity failure independently reviewable. A four-part version would combine duplicate-key and revision-drift failures despite their different statuses and validators; a six-part version would unnecessarily separate schema-version and required-field violations that share one invalid-shape boundary.

| Sub-step | Scope | Status |
| --- | --- | --- |
| 6.2a | Prove an incomplete single-page read fails closed, establish reusable preservation/recovery assertions, and verify the next healthy poll recovers. | Complete — a reusable connected harness first opens one trustworthy A02 incident through the real adapter, captures every Monitor authority table except expected query/cycle audit rows, injects an incomplete page, and proves `partial`/`missing_next_cursor` with one recorded page and no authority change. The next healthy poll preserves the same incident and becomes the condition's exact `last_healthy_cycle_id`; the source fixture is restored and compared exactly in `finally`. The adversarial pass added that recovery-authority link after finding that an open incident alone did not prove recovery. Four focused connected tests and both relevant typechecks pass. |
| 6.2b | Prove invalid schema-version and missing-required-field shapes fail closed and recover only through a later healthy poll. | Complete — the connected harness separately proves a real-adapter schema-version mismatch fails as `invalid_schema`/`query_schema_version_mismatch` and a real-adapter page with its required A02 state field removed fails as `invalid_schema`/`required_field_missing`. Both preserve every Monitor authority table and the same open incident; one later healthy cycle becomes authoritative. Review retained the missing-field corruption as a test-only wrapper around the real `TestDatabaseSourceAdapter` rather than exposing an unsafe user-facing fault mode. Five focused connected tests and both relevant typechecks pass. |
| 6.2c | Prove true partial pagination after at least one valid page remains incomplete and preserves Monitor authority. | Complete — `TestDatabaseSourceAdapter` now returns one normal authoritative page with a real cursor and stable revision before a second incomplete page omits its continuation cursor. The runner records two ordered pages, fails as `partial`/`missing_next_cursor`, preserves all Monitor authority, and accepts a later healthy cycle as authoritative. Review confirmed that a structurally valid first database page need not contain the tracked fixture because filtering occurs after source pagination. Six focused connected tests and both relevant typechecks pass. |
| 6.2d | Prove duplicate natural keys across pages are rejected as invalid without reconciling Monitor. | Complete — the real adapter returns one authoritative tracked A02 row and deliberately repeats that exact natural key on page two with the same source revision. The runner records both pages, fails as `invalid_schema`/`duplicate_condition_key_across_pages`, preserves every Monitor authority table, and recovers through a later healthy cycle without creating another incident. Seven focused connected tests and both relevant typechecks pass. |
| 6.2e | Prove source-revision drift across pages is rejected as partial without reconciling Monitor. | Complete — the real adapter returns one authoritative A02 page and a second page with a different source revision. The runner records both revisions, fails as `partial`/`source_revision_changed`, preserves every Monitor authority table and the existing incident, then accepts the next healthy cycle as authoritative. Review confirmed controlled revision metadata is the correct fault boundary because direct source-row mutation detection is already owned by 6.1. Eight focused connected tests and both relevant typechecks pass. |

#### Step 6.3 internal execution sequence

The approved four-part split keeps stale freshness, unknown freshness, timeout, and transport failure independently reviewable. A three-part version would combine stale and unknown signals despite their distinct meanings and statuses; a five-part version would artificially separate pre-read and post-read checks that belong to the same freshness boundary.

| Sub-step | Scope | Status |
| --- | --- | --- |
| 6.3a | Prove stale freshness before reading and after a completed read fails closed, preserves Monitor authority, and permits later healthy recovery. | Complete — controlled real-source freshness faults prove both runner gates: pre-read failure records `stale`/`source_stale` with zero pages, while post-read deterioration records `stale`/`source_became_stale` after the same complete page count as the trusted baseline. Both persist the exact stale signal, 86,400,000 ms lag, provider version, and source revision, preserve every Monitor authority table, and recover through a later healthy authoritative cycle. The adversarial pass added persisted freshness evidence rather than relying only on status/error codes. Nine focused connected tests and both relevant typechecks pass. |
| 6.3b | Prove unknown freshness before reading and after a completed read fails closed, preserves Monitor authority, and permits later healthy recovery. | Complete — controlled real-source freshness faults prove both runner gates: pre-read failure records `unknown_freshness`/`freshness_unknown` with zero pages, while post-read deterioration records `unknown_freshness`/`freshness_became_unknown` after the trusted page count. Both persist an unknown signal with null lag, the exact provider version and source revision, preserve all Monitor authority, and recover through a later healthy authoritative cycle. Review retained separate stale and unknown proofs because their persisted lag semantics and error codes differ. Ten focused connected tests and both relevant typechecks pass. |
| 6.3c | Prove timeout handling exhausts the bounded real-adapter retry limit, preserves Monitor authority, and permits later healthy recovery. | Complete — a counting wrapper delegates every call to the real `TestDatabaseSourceAdapter` and proves one injected timeout consumes exactly two configured attempts. The second attempt cannot begin before the first deadline; the failed cycle records `timeout`/`query_timeout`, zero pages and rows, and the exact fresh-source evidence while preserving every Monitor authority table. Query settings and the adapter are restored before a healthy recovery becomes authoritative. Review assigned explicit retry-backoff evidence to 6.3d rather than duplicating it here. Eleven focused connected tests and both relevant typechecks pass. |
| 6.3d | Prove transport-error handling performs bounded retry/backoff, preserves Monitor authority, and permits later healthy recovery. | Complete — a counting wrapper delegates every attempt to the real `TestDatabaseSourceAdapter` and proves one injected transport error consumes exactly two configured attempts with a measured bounded backoff before the second. The failed cycle records `source_error`/`source_query_failed`, zero pages and rows, and exact fresh-source evidence while preserving every Monitor authority table. Query settings and the adapter are restored before a healthy recovery becomes authoritative. Review retained the monotonic timing proof with tolerance because it is paired with the exact attempt count and avoids a brittle exact-duration assertion. Twelve focused connected tests and both relevant typechecks pass. |

#### Step 6.4 internal execution sequence

The approved two-part split retains the two distinct failure boundaries: concurrent execution of one registered query and complete loss of source-read access. The count was challenged as potentially under-split. Separating either failure from its successful completion or recovery would leave an incomplete proof and duplicate the same controlled setup; a third unit would therefore be artificial. Database permission enforcement remains exclusively in Step 6.5.

| Sub-step | Scope | Status |
| --- | --- | --- |
| 6.4a | Hold one real-adapter poll open, prove a concurrent poll for the same query is skipped without reading or reconciling, and prove the original poll alone completes authoritatively. | Complete — a controlled wrapper holds the first scheduled A02 read inside the real `TestDatabaseSourceAdapter`; a concurrent scheduled run records `overlap_skipped`/`query_already_running`, zero pages and rows, performs no additional adapter read, and leaves every Monitor authority table unchanged. Releasing the original run produces the only healthy cycle and makes its cycle ID the condition's exact `last_healthy_cycle_id`. Review confirmed direct scheduler invocation is required because manual scenario commands are separately serialized and cannot exercise automatic scheduler overlap. Thirteen focused connected tests and both relevant typechecks pass. |
| 6.4b | Block real source-read access while a triggerable source condition exists, prove the failed poll creates no incident or downstream state, then restore access and prove the next healthy poll creates the exact source-derived incident. | Complete — with a triggerable A02 row and no prior incident, the test creates the real reset-safety lock and independently proves the registry uses `TestDatabaseSourceAdapter`. The automatic scheduler records `source_error`/`source_query_failed`, zero pages and rows, and no change to any Monitor authority table. Only after removing the lock does a healthy real-adapter poll create the exact natural-key incident and cycle-linked evidence; the source fixture and lock are restored in `finally`. The first review corrected the blocked proof from the development API, whose scenario-status lookup is unavailable during reset, to the automatic scheduler boundary; the second added the self-contained real-adapter assertion. Fourteen focused connected tests and both relevant typechecks pass. |

#### Step 6.5 internal execution sequence

The approved two-part split preserves the two independent database trust boundaries: the Monitor source account cannot write `test_database`, and the source-action path cannot write Monitor-owned state. The count was challenged as potentially under-split. Grant metadata without functional denials would be incomplete, while static source-action architecture without runtime table equality would also be incomplete; separating either pair would duplicate setup rather than create another meaningful result boundary.

| Sub-step | Scope | Status |
| --- | --- | --- |
| 6.5a | Prove the live `monitor_source_ro` identity has only the approved read capabilities, rejects safe DML probes, and is covered by the existing DDL and administrative denial gate without changing source data. | Complete — the focused connected test authenticates as `monitor_source_ro`, verifies the exact `USAGE` plus schema-level `SELECT, SHOW VIEW` grants, and receives access-denied errors for safe no-op INSERT, UPDATE, and DELETE attacks while the complete migration table remains byte-equivalent. A fresh protected baseline validation independently proves all nine DML, DDL, global-setting, user, and grant attacks are denied, then reproduces the approved full-database checksum. Review correctly required the baseline gate because the lighter health mode does not execute the nine-operation denial matrix. Fifteen focused connected tests, both relevant typechecks, and baseline validation pass. |
| 6.5b | Prove every canonical source action changes only its declared `test_database` records, cannot change any discovered Monitor-owned table before polling, exposes no Monitor-write architecture path, and restores the source exactly. | Complete — the focused Step 6 gate now invokes the reusable black-box isolation harness for all 14 versioned source actions. Before every action it dynamically discovers and snapshots every Monitor-owned table; after the canonical API action, every table remains exactly equal until polling. Contract evidence restricts changed source tables and fields, all unrelated source rows retain their digests, the complete source baseline is restored, and the source-action service imports neither Monitor database capability nor Monitor-table SQL. Review retained the architecture assertion only in combination with complete runtime action coverage because neither proof is sufficient alone. Sixteen focused connected tests and both relevant typechecks pass. |

#### Step 6.6 internal execution sequence

The approved three-part split separates the durable browser-storage authority contract, a connected same-runtime tamper proof, and the repeatable aggregate Step 6 gate. A two-part version would overload one browser unit with aggregate orchestration; a four-part version would separate gate construction from execution even though an unexecuted gate is not an independently meaningful result.

| Sub-step | Scope | Status |
| --- | --- | --- |
| 6.6a | Classify every browser storage use and enforce that only cursors, chat presentation context, and pending messages are stored locally; incident lifecycle, evidence, routing, and source state must remain server-authoritative. | Complete — one browser-storage authority module now classifies the only permitted local values: the synchronization cursor, chat presentation context, and pending outbound messages. App and chat components use its typed helpers; malformed cursor, context, and queue values fail safely; pending-message helpers reject non-queue namespaces. A recursive source-wide regression test forbids direct Web Storage, IndexedDB, cookie, or Cache Storage access outside this authority boundary, preventing incident lifecycle, evidence, routing, or source state from becoming browser-authoritative. The adversarial pass corrected a top-level-only scan and an unconstrained generic queue key. All 25 web tests and the web typecheck pass. |
| 6.6b | In one connected runtime, attempt to create a fake incident and locally resolve or alter a real incident through browser storage, prove Monitor and authoritative UI data remain unchanged, then prove only a valid source change followed by a healthy poll changes lifecycle. | Complete — in one connected API, web, scenario-laboratory, and browser runtime, A03 began as one open incident. A valid first-consumption source correction remained pending, then the same-origin tamper fixture wrote a fake incident and forged resolved A03 lifecycle, evidence, routing, and source-state records. The dashboard still showed exactly six server incidents, the real A03 row remained open, and no fake rule or incident appeared. Only the following healthy A03 poll synchronized the source revision, resolved the real row, and reduced the open chart count from three to one; forged records still did not appear. The tamper records were cleared and A02 was restored and healthily polled to its clean baseline. The adversarial review retained the same-runtime UI proof in addition to unit-level storage validation because either alone would be insufficient. All 25 web tests and the web typecheck pass. |
| 6.6c | Add and execute one aggregate Step 6 validation command covering focused isolation, browser authority, database denials, detection, API, web, typechecks, baseline/health, cleanup, and diff checks. | Complete — `npm run validate:phase6-stage5-source-isolation` is the aggregate Step 6 gate. Its first adversarial execution rejected a source database with one extra `flujo_materiales_detalles` row, exposing an invalid clean-baseline assumption; the corrected gate begins and ends with the guarded exact-target reset, complete baseline reconciliation, and nine-operation denial matrix, and an exit/signal trap restores the baseline after interruption. Final run `20260802T002123Z` passed 16 focused connected tests, 4 targeted browser-authority tests, 25 detection tests, 47 API tests, 25 web tests, all four boundary typechecks, initial and final protected baseline rebuilds, final health, reset-lock cleanup, and diff checks. Its machine-readable execution record is accepted. |

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

### Internal execution sequence

The approved eight-part split was retained after explicitly challenging whether more than five units was excessive. Merging 7.1–7.3 would combine timer behavior, concurrency controls, and process restart despite their different failure boundaries. The interruption mechanism is introduced with its first meaningful connected use in 7.4 rather than as an unused standalone scaffold. Routing and deliveries remain together because they share one service pipeline; conversation attachment and alert-message creation remain together because they share one transaction boundary. Post-commit publication remains separate because it requires a different recovery mechanism, and the aggregate evidence gate remains independent. Further merging would weaken verification; further splitting would create incomplete intermediate work.

| Sub-step | Purpose and artifact | Dependency | Exit check | Status |
| --- | --- | --- | --- | --- |
| 7.1 | Prove real automatic due-time execution, independent A02/A03/A05 frequencies, and chronological crossed polls; produce a scheduler timeline with exact due times and poll-cycle IDs. | Step 6 aggregate gate. | Polls are timer-owned rather than manually invoked, every rule follows its configured frequency, and crossed polls execute once in chronological order. | Complete — three connected proofs use the production automatic runtime and real A02/A03/A05 adapters to establish timer ownership, independent 1/2/3-minute recurrence through a full six-minute cadence window, and deterministic catch-up after one delayed timer crosses three minutes with simultaneous deadlines. Durable runtime events identify trigger, real timer deadline, observed callback time, business due time, query ID, and unique poll-cycle ID. Final regression evidence: 3 focused scheduling tests, 25 detection tests, 47 API tests, both relevant typechecks, and source health pass. |
| 7.2 | Prove pause/resume, runtime serialization, source-action ordering at poll boundaries, and overlap protection; produce a deterministic control/event timeline. | 7.1 scheduler timeline. | Paused time produces no polls, resumed time continues correctly, actions and polls retain the required order, and concurrent work cannot duplicate authority changes. | Complete — three connected proofs establish paused-clock freezing with a fresh resume deadline, one non-overlapping queue across timer/manual/control contention, and exact automatic-poll-before-source-action ordering at a shared due boundary. The durable event timelines contain unique healthy poll cycles and exactly one canonical source action; asynchronous runtime errors are rejected and the created source row is removed with pre/post dispatch-row equality. Final regression evidence: 6 focused scheduling tests, 25 detection tests, 47 API tests, both relevant typechecks, source health, and diff checks pass. |
| 7.3 | Prove restart and missed-deadline recovery; produce restart evidence tied to persisted scheduler state and recovered poll cycles. | 7.1–7.2 scheduling contracts. | A restarted runtime resumes the same cadence, executes missed due work exactly once and in order, and creates no duplicate cycles. | Complete — three connected restart proofs preserve future runtime state without premature work, recover three missed intervals as the exact five-poll A02/A03/A05 chronology, and restart again without replay before continuing the normal minute-4 cadence. Every recovered and continued event maps to one unique healthy real-adapter cycle with the correct query and source revision. Final regression evidence: 9 focused scheduling tests, 25 detection tests, 47 API tests, both relevant typechecks, source health, and diff checks pass. |
| 7.4 | Add the test-only interruption contract and use it after incident commit but before downstream work; produce the first connected interruption and repair proof. | 7.3 healthy restart/recovery path. | The interruption is impossible outside tests, has a durable interruption ID, leaves the committed incident intact, and a later healthy poll repairs downstream work without row deletion or duplication. | Complete — a reusable environment-guarded one-shot interruption ledger is wired to a generic post-incident-commit hook. Connected A02 proof preserves the healthy cycle, incident, evidence, transition, and change event while blocking all downstream writes; a later unchanged healthy poll reuses those exact committed IDs and creates routing, deliveries, one conversation link, and one alert message exactly once. A third poll changes none of those objects, and source cleanup restores the dispatch baseline. Final regression evidence: 2 recovery tests, 9 scheduling tests, 2 database tests, 6 incident tests, 25 detection tests, 49 API tests, all relevant typechecks, source health, and diff checks pass. |
| 7.5 | Interrupt routing-decision and notification-delivery stages; produce connected repair evidence for zero, partial, and completed delivery states. | 7.4 interruption contract. | Later healthy operation reuses the correct routing decision, completes each required delivery exactly once, and records repaired object IDs plus idempotency assertions. | Complete — resumable routing now preserves the matching decision and completed deliveries across all four approved routing/delivery interruptions. One progressive connected A02 run proves zero-decision, decision-only, zero-delivery, partial-delivery, completed-delivery, and completed replay states across six unique healthy cycles, with exact durable interruption, incident, decision, delivery, and recipient identities and no Monitor deletion. Final regression evidence: 3 recovery tests, 9 scheduling tests, 6 incident tests, 50 API tests, all four relevant typechecks, source health, and diff checks pass. |
| 7.6 | Interrupt conversation attachment and alert-message creation; produce transaction-boundary and connected repair evidence. | 7.4 interruption contract and 7.5 stable routing output. | Partial conversation state cannot commit, and later healthy operation creates or reuses exactly one conversation link and one alert message without duplicates. | Complete — all four approved transaction boundaries roll back conversation, participant, audit, incident-link, and alert-message work before the durable interruption firing is persisted. Connected A02 evidence proves both new-conversation creation and exact participant-matched conversation reuse, with precise cycle/interruption/object IDs, preserved routing and existing message contents, one repaired link/message per incident, stable replay, source-baseline restoration, and no Monitor deletion. Final regression evidence: 4 recovery tests, 9 scheduling tests, 2 database tests, 6 incident tests, 8 conversation tests, 51 API tests, all five relevant typechecks, source health, and diff checks pass. |
| 7.7 | Interrupt committed incident and message change publication; produce durable publication-recovery and replay evidence. | 7.4 interruption contract and 7.6 committed downstream objects. | Restart or later healthy operation republishes or replays each committed change exactly once to consumers without duplicating database objects. | Complete — one canonical mixed-scope ledger, one interruption-aware publication gateway, and connected incident/message recovery tests now prove both sides of publication. Exact committed event IDs and global cursors survive interruption, authenticated reconnect recovery applies missed events once, applied cursors suppress replay, conversation recovery enforces authorization, and repeated healthy operation preserves the complete downstream object set. Final proportional regressions pass; Step 7.8 remains the separate aggregate gate. |
| 7.8 | Add and execute the aggregate Step 7 validation command; produce machine-readable scheduling and recovery evidence containing poll-cycle IDs, interruption IDs, repaired object IDs, idempotency assertions, baseline restoration, cleanup, and diff checks. | 7.1–7.7 complete. | Normal scheduling and restart pass, every interruption repairs idempotently, the exact protected baseline is restored, and all aggregate checks are accepted. | Complete — the approved four-part sequence produced a fail-closed evidence contract, exact scheduling and recovery reporters, and one serial baseline-safe aggregate gate. Accepted run `20260801-step7-review-4` contains 9 scheduling cases, 6 recovery cases, 33 scheduling and 27 recovery poll-cycle IDs, 54 runtime-event IDs, 17 durable interruption IDs, exact committed/repaired object identities, all-true behavior and idempotency assertions, 14 zero-exit checks, and independently validated source restoration. |

#### Step 7.1 internal execution sequence

The approved three-part split separates timer ownership, independent per-rule cadence, and delayed crossed-deadline chronology. A two-part version would combine cadence isolation with catch-up ordering despite their different failure modes. A four-part version would separate evidence recording from the behavior it proves or isolate simultaneous-deadline ordering from the crossed-poll chronology that gives it meaning.

| Sub-step | Purpose and artifact | Dependency | Exit check | Status |
| --- | --- | --- | --- | --- |
| 7.1a | Prove one connected A02 poll is triggered by the real automatic timer rather than `advance`, the manual poll route, `runWhenDue`, or direct scheduler invocation; record its exact deadline, execution time, cycle ID, query ID, and source revision. | Step 6 aggregate gate. | Exactly one healthy A02 cycle occurs after its persisted deadline with no manual trigger. | Complete — runtime events now durably classify automatic timer, manual advance, and source-action-boundary triggers. A connected development runtime configured at 60× produced exactly one complete healthy A02 cycle through the real `TestDatabaseSourceAdapter`; its started/completed events carry `automatic_timer`, the exact query and cycle IDs, due business time, real deadline, execution timestamps, and `test_database.A02` source revision. The first review hardened early timer callbacks to re-arm instead of polling and corrected database timestamp normalization before the final deadline assertion. The focused connected test, all 25 detection tests, and detection/API typechecks pass. |
| 7.1b | Run connected A02, A03, and A05 automatic scheduling at different frequencies in one runtime; record a per-rule cadence matrix with due times and cycle IDs. | 7.1a timer-ownership proof. | Every rule follows only its configured frequency without coupling, missing polls, or duplicates. | Complete — one connected automatic runtime uses the three real `TestDatabaseSourceAdapter` entries at frequencies 1, 2, and 3 minutes. Across the complete six-minute least-common-multiple window it persists exactly 6 A02, 3 A03, and 2 A05 healthy cycles at their expected due times; all 11 cycle IDs are unique, carry `automatic_timer`, match the rule's query ID and source revision, and contain no coupled, missing, or duplicate execution. The adversarial pass extended the initial three-minute observation because one A03/A05 occurrence did not prove recurrence. Both focused scheduling tests and both relevant typechecks pass. |
| 7.1c | Delay one automatic timer across multiple deadlines, including simultaneous rule deadlines; record the complete ordered scheduler timeline with exact due times and unique cycle IDs. | 7.1b independent-cadence proof. | Every crossed poll executes exactly once in deterministic chronological order with no gaps or duplicate cycle IDs. | Complete — a deterministically delayed real automatic timer observes one callback more than two intervals after its persisted deadline and executes the five crossed real-adapter polls in exact order: A02 at minutes 1, 2, and 3; A03 at minute 2; and A05 at minute 3. All ten persisted runtime events form exact started/completed pairs sharing the same `automatic_timer` deadline and callback observation; all five healthy cycle IDs are unique and source-derived. The adversarial pass expanded the proof from completed rows to the complete event-pair sequence so unmatched starts, failures, gaps, and extras cannot be hidden. All 3 focused scheduling tests and final proportional regressions pass. |

#### Step 7.2 internal execution sequence

The approved three-part split separates pause/resume clock ownership, concurrent runtime serialization, and the exact source-action/poll boundary. A two-part version would overload concurrency coverage with boundary ordering despite their distinct failure modes. A four-part version would separate serialization from overlap protection even though the queue is the shared production mechanism that must prove both together.

| Sub-step | Purpose and artifact | Dependency | Exit check | Status |
| --- | --- | --- | --- | --- |
| 7.2a | Prove automatic pause/resume behavior and record the control, clock, and timer timeline. | 7.1 scheduler timeline. | Pausing cancels automatic polling and freezes business time; resuming establishes the correct next deadline without retroactive catch-up or duplicate cycles. | Complete — a connected production runtime is paused before its first automatic A02 deadline, held past that cancelled deadline, and resumed against a newly anchored real deadline. While paused, business time and the due schedule remain frozen, the durable timer deadline is null, the runtime-event ledger stays empty, and the persisted A02 poll-cycle count remains unchanged. Resume produces exactly one healthy real-adapter A02 cycle at the first business minute rather than retroactively catching up the five paused minutes; its automatic trigger references only the resumed deadline. Review added explicit asynchronous-error rejection and direct pre-pause/paused/post-resume poll-cycle accounting. All 6 focused scheduling tests pass. |
| 7.2b | Prove runtime serialization and overlap protection when timer, control, and manual-poll requests contend; record the complete ordered execution timeline and cycle identities. | 7.2a pause/resume contract. | Contending work executes through one authority queue, every cycle ID is unique, and no poll or authority mutation overlaps or duplicates. | Complete — one connected automatic A02 poll is deliberately held in flight while a real manual A03 poll, reconfiguration, and pause request contend for the production runtime queue. Nothing advances while the automatic poll is blocked; after release, the exact order is automatic A02 completion, manual A03 completion, configuration, then pause. Instrumentation proves a maximum of one active poll, the two healthy persisted cycles have distinct IDs and correct query identities, and final paused state has no timer. The first run exposed and corrected a test cleanup scope defect; the adversarial pass added explicit capture and rejection of asynchronous timer errors. All 5 focused scheduling tests and detection typecheck pass. |
| 7.2c | Prove source-action ordering when an action races an exactly due poll; record one deterministic combined poll/action timeline. | 7.2b serialization and overlap proof. | The due poll completes before the source action, with no overlap, reordered event, duplicate poll, or duplicate source mutation. | Complete — a real automatic A02 poll is held after its durable start while a canonical versioned `a02.prepare_dispatch` request enters the same production boundary queue. Before release, no action begins; afterward, the instrumented and durable timelines are exactly poll start, poll completion, source-action start, and source-action completion at the same business minute. There is one healthy automatic cycle, one source-action event, one source invocation, no overlap, and no asynchronous runtime error. The adversarial pass strengthened cleanup from deleting the created row to proving the complete ordered set of Stage 5 A02 dispatch IDs equals its pre-test baseline. All 6 focused scheduling tests and both relevant typechecks pass. |

#### Step 7.3 internal execution sequence

The approved three-part split separates restart-state preservation, missed-deadline catch-up, and post-recovery replay protection. A two-part version would combine missed-work execution with the independent requirement that later initialization and normal cadence cannot replay it. A four-part version would separate experiment identity from timer-deadline preservation even though both are one durable restart-state contract.

| Sub-step | Purpose and artifact | Dependency | Exit check | Status |
| --- | --- | --- | --- | --- |
| 7.3a | Restart before the persisted automatic deadline; record experiment identity, business time, due schedule, timer deadline, runtime events, and poll-cycle counts before and after initialization. | 7.2 scheduling and concurrency contracts. | The replacement runtime preserves the same experiment and exact deadline without premature polling or cadence reset. | Complete — an automatic connected runtime stops with a persisted deadline more than nineteen seconds in the future, then a replacement runtime initializes from the same repository. Experiment ID and run identity, business time, per-rule due schedule, frequencies, speed, and the exact real deadline remain identical. Observation before that deadline produces no runtime event and leaves the aggregate A02/A03/A05 poll-cycle count unchanged. The adversarial pass expanded direct cycle accounting from A02 alone to all three scheduled queries. All 7 focused scheduling tests pass. |
| 7.3b | Restart after multiple missed deadlines; record the complete recovered A02/A03/A05 event timeline and poll-cycle identities. | 7.3a restart-state contract. | Every missed poll executes exactly once through real adapters in deterministic chronological order. | Complete — the original connected runtime stops, its controlled real clock moves 3.2 intervals beyond the persisted deadline, and a replacement initializes against that overdue state. It executes exactly five real-adapter polls in order: A02 at minutes 1, 2, and 3; A03 at minute 2; and A05 at minute 3. All ten durable events share the persisted missed deadline and replacement observation time; the five unique healthy cycle IDs map to the correct query IDs and rule-specific source revisions. Business time and per-rule next-due state advance through minute 3 exactly once. The adversarial pass added the event-to-cycle query/revision identity chain. All 8 focused scheduling tests pass. |
| 7.3c | Restart again after missed-deadline recovery and observe the next normal automatic deadline; record replay and cadence-continuation evidence. | 7.3b missed-deadline recovery. | Completed deadlines are not replayed, all cycle IDs remain unique, and the next normal cadence executes exactly once. | Complete — after the first replacement recovers five polls through minute 3, it stops with the next persisted timer deadline. A second replacement initializes with the same experiment, minute-3 business time, and deadline while the complete ten-event recovery ledger remains byte-for-byte unchanged. Advancing only to that deadline adds exactly A02 and A03 at minute 4; no recovered due time replays, all seven cycle IDs remain unique, and due state advances normally to minutes 5 and 6. The adversarial pass cross-checked all seven event IDs against persisted healthy cycles with correct query IDs and rule-specific source revisions. All 9 focused scheduling tests pass. |

#### Step 7.4 internal execution sequence

The approved three-part split separates the reusable test-only interruption contract, preservation of the committed incident boundary, and later repair/idempotency. A two-part version would combine the interrupted-state proof with the independent recovery result. A four-part version would separate environment enforcement from one-shot durable interruption identity even though both are inseparable parts of the same safety contract.

| Sub-step | Purpose and artifact | Dependency | Exit check | Status |
| --- | --- | --- | --- | --- |
| 7.4a | Implement the reusable test-only interruption contract with named points, one-shot arming, durable interruption IDs, and environment enforcement. | 7.3 restart/recovery contract. | Production and development cannot arm interruptions; test mode records exactly one durable firing for one armed point. | Complete — migration `0016` adds a durable interruption ledger with the complete approved point vocabulary, one armed record per point, one-shot `armed` to `fired` transitions, JSON context, and audit timestamps. The reusable controller derives availability internally from `nodeEnv === "test"`; outside test mode arming fails and firing is inert. A firing atomically preserves one UUID in storage and in the thrown interruption error, and repeated firing does nothing. The first validation exposed and corrected omission of migration `0016` from the explicit migration runner; the adversarial pass replaced caller-controlled boolean enablement with internal environment derivation. Two focused tests and API/database typechecks pass. |
| 7.4b | Fire `after_incident_commit` during a connected poll and capture the poll cycle, interruption, incident, evidence, transition, and committed change-event identities. | 7.4a interruption contract. | The interruption occurs before downstream work while the committed incident and its evidence remain intact and routing/conversation objects do not exist. | Complete — a canonical A02 dispatch is created in `test_database`, aged through the shared business clock, and read by the real adapter. The healthy cycle commits one open incident, one triggered evidence row, one opening transition, and one committed change event before the armed `after_incident_commit` point fires. The durable interruption retains the same UUID and records the exact poll cycle, incident, change-event ID, and cursor; routing decisions, deliveries, conversation links, and alert messages remain zero. Source cleanup restores the complete ordered dispatch-ID baseline. The adversarial pass added direct verification that the referenced poll cycle is persisted, healthy, complete, full, correctly queried, and source-revisioned. One connected recovery test and all relevant typechecks pass. |
| 7.4c | Run later healthy polls and capture repaired downstream object IDs plus idempotency evidence. | 7.4b committed interrupted state. | The existing incident is reused, downstream work is created exactly once, another healthy poll adds nothing, and no row is manually deleted. | Complete — starting from a durable `after_incident_commit` firing with one incident/evidence/transition/change and zero downstream objects, the next unchanged real-adapter poll keeps every committed ID and creates one routing decision, its delivery set, one conversation link, and one alert message. A third healthy poll has a distinct cycle ID but leaves the complete ordered object-ID snapshot unchanged; the interruption remains a single fired record. Recovery performs no Monitor deletion, and `finally` restores only the disposable source dispatch with exact pre/post ID equality. The first run corrected a test-only UUID/text parameter cast; the adversarial pass added exact committed-ID equality across repair. Both connected recovery tests and final proportional regressions pass. |

#### Step 7.5 internal execution sequence

The approved four-part split separates the production recovery contract, the routing-decision commit boundary, delivery creation with zero or partial progress, and replay against a completed delivery set. An initial five-part split over-separated the before/after sides of one routing-decision boundary; a three-part split would combine zero, partial, and completed delivery failure modes too heavily. Four units preserve distinct implementation and validation boundaries without duplicating the aggregate Step 7 gate reserved for 7.8.

| Sub-step | Purpose and artifact | Dependency | Exit check | Status |
| --- | --- | --- | --- | --- |
| 7.5a | Make routing re-entry resumable and wire the approved routing-decision and delivery-creation interruption points; produce focused service tests for missing-delivery repair. | 7.4 interruption contract. | Re-entering an existing routing decision creates only its missing deliveries, preserves completed delivery IDs, and every approved interruption point fires at its exact persistence boundary. | Complete — `RoutingService` now exposes the four approved routing/delivery boundaries through a generic hook, resumes a persisted matching decision, inserts only missing in-app deliveries, preserves completed delivery IDs, and also resumes pending administrative diagnostics. The server connects those boundaries to the environment-guarded durable interruption controller. One focused service test crosses before/after routing commit and before/after delivery creation, preserving one decision and the first partial-delivery ID through completion and replay. The first run exposed structured recipient JSON being decoded as strings; the correction added object-array decoding, restoring delivery keys and conversation participants. Three focused routing tests and API typecheck pass. |
| 7.5b | Interrupt before and after routing-decision commit in connected real-adapter polls; produce zero-decision and decision-only recovery evidence. | 7.5a resumable routing contract. | A later healthy poll creates or reuses exactly one correct routing decision, completes its required deliveries once, and records exact cycle, interruption, decision, and delivery IDs without deleting state. | Complete — one connected A02 real-adapter run progressively fires `before_routing_decision` and `after_routing_decision` in two distinct healthy poll cycles. The first leaves the committed incident with zero decisions and deliveries; the second creates exactly one durable decision with its interruption context tied to the exact cycle and decision IDs while deliveries, conversation links, and messages remain zero. Later healthy cycles continue from that decision and ultimately create the complete unique recipient delivery set, with every delivery referencing the same decision and no Monitor deletion. The adversarial review retained the successive-failure design because it proves harder progressive recovery rather than isolated clean retries. The focused connected test passes. |
| 7.5c | Interrupt before and after individual delivery creation in connected real-adapter polls; produce zero-delivery and partial-delivery recovery evidence. | 7.5b stable routing-decision recovery. | Existing decision and delivery IDs survive, every missing required delivery is created exactly once, and no completed delivery is replaced or duplicated. | Complete — continuing the same progressive A02 recovery run, `before_delivery_creation` fires with the existing decision and leaves its delivery count at zero; the next distinct healthy cycle fires `after_delivery_creation` after exactly one durable delivery. Both interruption records contain the exact cycle, incident, decision, recipient, and progress identities. A later healthy cycle preserves that partial delivery ID, creates every remaining unique recipient delivery against the same decision, and reaches the required count without deletion. The adversarial review accepted one connected partial cardinality because the shared resumable loop and focused service test cover every remaining recipient through the same branch. The focused connected test passes. |
| 7.5d | Re-run healthy operation after the required delivery set is complete; produce completed-state replay and idempotency evidence. | 7.5c delivery repair paths. | New healthy cycle IDs are recorded while the exact routing-decision ID and complete ordered delivery-ID set remain unchanged, with no Monitor-row deletion. | Complete — after the partial-delivery recovery reaches the decision's exact required recipient count, a sixth distinct healthy poll runs against the completed state. The complete ordered snapshot of decision ID, fingerprint, status, delivery IDs, decision references, recipient keys, channels, states, and attempt counts remains unchanged. All four durable interruption records remain fired under their original UUIDs, and cleanup deletes only the disposable `test_database` source dispatch before proving exact source-ID baseline restoration. The adversarial pass tied stable snapshot equality to the decision's required recipient count so a consistently incomplete set cannot pass. Final proportional validation passes. |

#### Step 7.6 internal execution sequence

The approved three-part split separates the transactional interruption contract, connected creation of a new conversation, and connected reuse of an existing participant-matched conversation. A two-part split would combine new and reused conversation failure modes despite their different object-preservation checks. A four-part split would separate completed replay from the connected path that must establish it. Three units cover every approved interruption point and both recovery branches without duplicating the aggregate Step 7 gate reserved for 7.8.

| Sub-step | Purpose and artifact | Dependency | Exit check | Status |
| --- | --- | --- | --- | --- |
| 7.6a | Add transaction-scoped conversation-attachment and alert-message interruption hooks; produce focused rollback tests for all four approved boundaries. | 7.5 stable routing and durable interruption contract. | Every interruption rolls back the target conversation, participants, membership audit, incident link, and alert message as one unit while preserving durable interruption evidence outside that transaction. | Complete — `ConversationService` now snapshots armed test-only boundaries before entering its transaction, raises the selected boundary inside the transaction, rolls back, and only then persists the durable firing through an injected coordinator. Exact contexts carry cycle, incident, plant, participant fingerprint, attempted conversation identity, and attempted message identity/cursor when available. A focused conversation test proves all four boundaries roll back conversation, participant, audit, incident-link, and message rows together before external firing. The first review identified that an in-memory coordinator alone did not prove durability; an added real-controller integration test proves the transaction is empty while the original interruption UUID remains durably fired. Conversation/API typechecks pass. |
| 7.6b | Exercise all four conversation/message boundaries in connected real-adapter polls that require a new conversation; produce exact rollback, repair, and replay evidence. | 7.6a transaction contract. | No partial target state commits; a later healthy poll creates exactly one conversation, incident link, and alert message with exact IDs, and another healthy poll changes none of them. | Complete — one progressive connected A02 real-adapter run fires all four approved boundaries across four unique healthy cycles. Every firing retains its durable UUID and exact cycle/incident/attempted-object context while conversation, participant, audit, target link, and target message counts remain zero. A fifth healthy cycle creates one conversation, the exact routed participant set and audits, one incident link, and one alert message; a sixth healthy cycle leaves their complete ordered ID snapshot unchanged. The first review replaced a hardcoded participant count with exact persisted routing identities. The second added exact routing-decision and delivery snapshots, proving upstream objects remain unchanged through every rollback, repair, and replay. The focused connected test passes. |
| 7.6c | Exercise connected recovery when an exact participant-matched conversation already exists; produce conversation-reuse, content-preservation, repair, and replay evidence. | 7.6b connected new-conversation recovery. | Recovery preserves the existing conversation and contents, adds exactly one target incident link and alert message, and subsequent healthy operation creates no duplicate object. | Complete — after the first connected A02 incident creates its accepted conversation, a second legal A02 source dispatch with the same routed participant set is introduced. An `after_alert_message_creation` interruption rolls back the second incident's attempted link and message while retaining the original conversation, participant/audit set, link, and complete message identity/content. A later healthy poll reuses the exact conversation ID, preserves the first alert message, and adds exactly one second incident link and alert message; another poll leaves the full object snapshot unchanged. The first run exposed an unrelated A03 automatic poll consuming the globally armed point; the correction reconfigured the experiment to an A02-only due window and tied the interruption to its persisted healthy A02 cycle. The adversarial pass expanded message snapshots to cursor, sender, body, payload, and client-command identity. The focused connected test passes. |

#### Step 7.7 internal execution sequence

The approved four-part split separates the canonical mixed change ledger, the interruption-aware publication gateway, connected incident recovery, and connected alert-message recovery. A three-part split would combine incident and message replay despite their different authorization scopes and object identities. A five-part split would separate effective consumer deduplication from the connected cases that must prove it. Four units cover both committed event families and both sides of publication without duplicating the aggregate Step 7 gate reserved for 7.8.

| Sub-step | Purpose and artifact | Dependency | Exit check | Status |
| --- | --- | --- | --- | --- |
| 7.7a | Commit message events to the canonical global change ledger and extend authorized cursor recovery across plant and conversation scopes; produce focused persistence and authorization tests. | 7.6 committed conversation/message transaction. | Incident and message changes receive one global cursor in the same transaction as their domain object, and recovery returns only events authorized for the requesting user in strict cursor order. | Complete — alert and user-created messages now insert one `message.created` envelope into the canonical `monitor_change_event` ledger inside the same transaction as the message. Live envelopes use the global change cursor while retaining the message-history cursor separately. Mixed recovery returns plant incident and authorized conversation events in strict global order with scope metadata; duplicate client commands create no second message or change. Focused conversation and incident tests prove transactional identity, order, deduplication, and scope resolution. The first review added a public `/api/changes` test proving participant inclusion, nonparticipant exclusion, and plant-administrator access. Conversation/incident/API typechecks pass. |
| 7.7b | Add an interruption-aware publication gateway around committed live emission; produce focused before/after publication and cursor-deduplication tests. | 7.7a canonical mixed ledger. | Publication never precedes commit, both approved interruption points preserve the committed event, and cursor replay yields effective exactly-once consumer application. | Complete — a single committed-change gateway now wraps live incident and `message.created` emission with the two approved durable interruption points. Context records channel, global event ID/cursor, event type, authorization scope, scope ID, and payload. A focused real-ledger test proves a before-publication firing emits nothing but remains replayable, while an after-publication firing emits once and replay from the applied cursor yields nothing; both retain one committed event row. The adversarial review identified live Socket.IO and authorization as unproven here; those remain explicitly guarded by connected 7.7c–7.7d rather than duplicated in the gateway unit. API typecheck passes. |
| 7.7c | Interrupt connected incident publication before and after live emission; produce exact live/reconnect recovery evidence. | 7.7b publication gateway and 7.6 stable downstream objects. | The exact committed incident event is recovered and applied once after consumer reconnect while incident, evidence, routing, conversation, and message objects remain unchanged. | Complete — the connected `test_database` test now drives two legal A02 incidents through the real API and Socket.IO server. Before-publication interruption commits the incident event without a live emission, then a newly authenticated socket recovers that exact event ID and cursor once. After-publication interruption emits the exact committed event once, and a newly authenticated socket resuming from the applied cursor receives no duplicate. A replay from the baseline proves cursor-keyed effective-once application, while snapshots prove reconnect changes no incident, evidence, transition, change, routing, conversation, or message object. The first review found that resume had used the existing connection; the second pass replaced both recovery checks with actual disconnect/reconnect cycles. It also corrected the older 7.4c ledger assertion to distinguish the preserved incident change from the newly canonical alert-message change. All five connected recovery tests pass. |
| 7.7d | Interrupt connected alert-message publication before and after live emission; produce authorized conversation replay and consumer-deduplication evidence. | 7.7c connected incident publication recovery. | The exact committed message event is recovered and applied once by authorized consumers, excluded from unauthorized recovery, and no conversation, link, message, or delivery object is duplicated. | Complete — two connected legal A02 incidents isolate alert-message publication on both sides of live emission. Before-publication interruption commits one message and global change without emitting; an authenticated reconnect recovers the exact event ID/cursor once. After-publication interruption emits the exact committed message once; reconnect from its applied cursor returns no duplicate, and baseline replay remains effectively once under cursor deduplication. A routed plant-manager connection receives authorized replay while a separately roster-bound, nonparticipant machine-operator connection is excluded on fresh reconnects. Exact assertions prove one reused conversation, two incident links, two alert messages, two message-change rows, and no duplicate delivery recipient per incident; another healthy poll leaves every joined object ID unchanged. The adversarial pass replaced implicit joined-snapshot assumptions with direct uniqueness counts and deterministic authorized/excluded identities. All six connected recovery tests pass. |

#### Step 7.8 internal execution sequence

The approved four-part split separates the fail-closed evidence contract, scheduling/restart evidence production, interruption/recovery evidence production, and the aggregate orchestration gate. A three-part version would overload recovery instrumentation with baseline-safe orchestration and final acceptance. A five-part version would separate implementing the aggregate command from executing the same command that proves its contract, creating an artificial checkpoint. Four units cover every Step 7 exit field without duplicating Step 8 browser acceptance or Step 9 official repeatability.

| Sub-step | Purpose and artifact | Dependency | Exit check | Status |
| --- | --- | --- | --- | --- |
| 7.8a | Define and test the machine-readable Step 7 evidence contract and fail-closed validator. | 7.1–7.7 accepted behavior and identifiers. | Missing or invalid scheduling IDs, recovery IDs, idempotency assertions, restoration results, cleanup results, or check outcomes fail validation. | Complete — versioned JSON Schema and semantic validation now define exact scheduling/recovery case accounting, unique identifier arrays, due/observed timestamps, committed/repaired object identities, all-true assertions, `finally` cleanup, exact source-ID restoration, matching aggregate/suite run identity, baseline reset/restore results, and zero-exit named checks. The first pass accepted structurally empty timing and object evidence and did not compile the JSON Schema; the adversarial pass added per-suite substantive identity requirements and schema/semantic parity checks. Five focused contract tests and diff checks pass. |
| 7.8b | Make the connected scheduling and restart suite emit exact machine-readable deadlines, runtime events, query IDs, poll-cycle IDs, and uniqueness assertions. | 7.8a evidence contract. | All nine scheduling cases pass and produce contract-valid evidence tied to their exact connected objects. | Complete — the connected scheduling suite now records one contract-valid case for each 7.1a–7.3c boundary after its `finally` cleanup. The artifact contains all 9 cases, 33 exact poll-cycle IDs, 62 runtime-event IDs, query IDs, experiment IDs, due/observed/deadline timestamps, and all-true timer ownership, cadence, chronology, pause/resume, serialization, action-ordering, restart, missed-work, and replay assertions. The first evidence run passed all behavioral tests but failed the reporter because simultaneous polls produced duplicate due timestamps; the correction canonicalized those times as unique evidence identities without losing the ordered behavior assertions. Scheduling 9/9, contract 5/5, detection/API typechecks, artifact semantic validation, and diff checks pass. |
| 7.8c | Make the connected interruption and recovery suite emit exact machine-readable interruption IDs, committed and repaired object IDs, replay results, idempotency assertions, and cleanup evidence. | 7.8a evidence contract and 7.8b reporting pattern. | All six recovery cases pass and produce contract-valid evidence covering every approved interruption and repair boundary. | Complete — the connected recovery suite now records one contract-valid case for each 7.4b–7.7d boundary only after disposable source cleanup proves exact pre/post dispatch-ID equality. The artifact contains all 6 cases, 27 exact poll-cycle IDs, 17 durable interruption IDs, committed incident/evidence/transition/change identities, repaired routing/delivery/conversation/link/message identities, replay and authorization results, and all-true preservation/idempotency assertions. The adversarial review found no missing Step 7 recovery boundary after cross-checking the combined 7.5 and 7.6 cases against every approved interruption point. Recovery 6/6, contract 5/5, API typecheck, artifact semantic validation, and diff checks pass. |
| 7.8d | Add and execute one serial aggregate Step 7 command that validates and resets the baseline, runs scheduling and recovery evidence, runs proportional regressions/typechecks/diff checks, restores and independently revalidates the baseline in `finally`, and publishes one accepted aggregate artifact. | 7.8a–7.8c valid evidence producers. | The complete command passes, its aggregate artifact validates, cleanup completes, and the exact protected baseline is restored. | Complete — `npm run validate:phase6-stage5-step7` serializes the guarded baseline reset/validation, evidence contract, connected scheduling/recovery suites, package regressions, five boundary typechecks, diff check, and exit-handler restoration/revalidation before publishing one schema- and semantic-valid artifact. The first aggregate run failed safely on nondeterministic snapshot pagination when equal timestamps fell back to random UUID order; an additive database sequence and cursor correction fixed it, and the formerly flaky upgrade/pagination test passed three consecutive targeted runs. The next run failed safely at the 8 GiB database-volume guard because inactive local binary logs had exhausted free space; those inactive logs were purged while the active log and database data were retained. The adversarial pass then found that normal success called restoration directly despite claiming `finally`; orchestration was corrected so success, failure, and signals all restore through the registered exit handler. Accepted run `20260801-step7-review-4` passed 5 contract, 9 scheduling, 6 recovery, 2 database, 25 detection, 7 incident, 9 conversation, and 53 API tests; all five boundary typechecks; diff checks; initial and final baseline validation; and aggregate validation. Its ignored local artifact is `local-data/test-database/evidence/stage5-step7/20260801-step7-review-4/evidence.json`. |

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

**Current declaration manifest:** [`stage5-connected-acceptance.v2.json`](../../../../config/detection/stage5-connected-acceptance.v2.json) — Step 5.1 declaration authority; it records required work but contains no acceptance results.

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
