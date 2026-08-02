# Phase 6 Stage 5 recovery and completion plan — Version 2

**Status:** Current authoritative Stage 5 plan. The documentation-only authority transition was authorized, performed, reviewed, and approved for publication on 2026-08-02.

**Supersedes:** [Version 1](../../../../archive/docs/implementation/stage5_corrective_execution_plan_v1.md), preserved as historical planning and execution evidence only.

**Branch:** `codex/phase6-stage5`

**Safe recovery checkpoint:** `2319c80` is committed and pushed. `main` has not been changed. “Safe” means the work can be recovered; it does not mean Stage 5 or Step 8 is accepted.

**Current Stage 5 status:** In progress. Stage 5 is not accepted, Step 8 is not accepted, and Step 8B has not started.

## Start here

The project is not starting Stage 5 again. It is correcting one wrong interface, retiring the old workflow safely, and replacing the browser evidence affected by that correction.

### Recovery at a glance

| Order | Action | Result |
| --- | --- | --- |
| 1 | Approve Version 2, then separately authorize the documentation-only authority transition. | Complete — Version 1 is archived and Version 2 is the single current plan. |
| 2 | Complete Recovery 1–2. | Questionable files are classified and active documentation points to the correct laboratory and evidence. |
| 3 | Complete Recovery 3–4. | The approved V2 laboratory is connected and the obsolete executable workflow cannot be mistaken for current Stage 5 behavior. |
| 4 | Complete Recovery 5. | Every affected focused check passes and the development baseline is restored. |
| 5 | Complete Recovery 6. | New Step 8.2–8.7 evidence passes in one runtime using the approved laboratory. |
| 6 | Resume the original path at Step 8B. | Complete 8B, 8C, and Steps 9–12 under their separate gates. |

### Exact next action

1. Complete — the user approved this draft on 2026-08-02.
2. Complete — the user separately authorized the documentation-only authority transition on 2026-08-02.
3. Complete — Version 1 is archived, Version 2 has the official plan filename, and README and roadmap references are current.
4. Complete — the user reviewed this transition and separately authorized its commit and push on 2026-08-02.
5. Next — start `sequential-substep-review` for Recovery 1.

No implementation or code/command deletion begins before Step 5 above.

### What the approval and transition authorization mean

Approval confirms the current status, the eight recovery rules, the six recovery stages, and the post-recovery path through Steps 8B–12. The separate transition authorization allowed Version 1 to be archived and Version 2 to become current. Neither decision authorizes recovery implementation, code or command deletion, commit, push, or merge.

## 1. Current position and cause

Stage 5 was progressing through its approved corrective plan. Steps 1 through 7 were implemented, reviewed in smaller units, committed, and pushed. Step 8 was then run to validate the connected laboratory, Dashboard, and Chat together.

That Step 8 run exposed a planning and implementation mismatch: the connected `/dev/scenarios` page was not the tabbed V2 laboratory previously reviewed and approved. It was an older laboratory interface connected to the newer development system.

Because the wrong laboratory interface was used:

- Step 8.1, which built the shared browser-test and evidence foundation, remains useful.
- The previous Step 8.2–8.7 run cannot count as acceptance.
- Dashboard and Chat corrections discovered during that run remain useful implementation work, but their browser evidence must be generated again with the correct laboratory in one new shared run.
- Step 8B must wait until the approved V2 laboratory is connected and Step 8.2–8.7 passes again.

### Why the wrong page was used

The approved V2 laboratory is the tabbed interface with:

- separate A02, A03, A05, and Integrity tabs;
- one shared experiment clock;
- run, pause, speed, frequency, and time-jump controls;
- automatic scheduled reads;
- multiple active source records;
- history and snapshots; and
- clear pending-change and failed-read states.

The connected page instead retained the older dense card layout, canned case preparation, recurrence shortcuts, and `Sondear ahora`. Stage 4 and the early Stage 5 work connected this older page to the correct development data path, but the approved V2 interface itself was never ported.

The workspace audit also found two related risks:

1. The command named `validate:phase6-stage5` still points to an older checkpoint validator. That validator can manually force reads and uses an obsolete failure simulation that deletes selected downstream test rows. A passing result could be mistaken for current Stage 5 acceptance.
2. Some active documentation still makes old and current material difficult to distinguish.

The audit did not find evidence of a second active A02, A03, or A05 rule path. The code that changes development source records, reads them without write permission, and produces Monitor results forms one active chain. However, every old command, endpoint, and similar-looking file must still be classified by the code or tests that use it before it is archived or removed. No broad cleanup or mass archive is planned.

## 2. Work that remains valid

| Work | Current standing |
| --- | --- |
| Planning correction and historical checkpoint preservation | Complete and pushed. |
| Connected source actions and legal A02/A03/A05 lifecycle rules | Complete and pushed. |
| Durable experiments, shared clock, scheduling controls, history, and snapshots | Complete and pushed at the service level. The approved V2 presentation still needs to be connected. |
| Exact 34-case declaration, independent setup/cleanup contracts, and evidence format | Complete and pushed as execution foundations. The final 34-case acceptance run has not happened. |
| Source isolation and read-only database failure handling | Complete and pushed. |
| Automatic scheduling, restart, interruption, and recovery without manual row deletion | Complete and pushed. |
| Step 8.1 browser runtime and evidence foundation | Complete and reusable. |
| Previous Step 8.2–8.7 browser run | Preserved as diagnostic history, not accepted evidence. |
| Step 8B passive Dashboard and Chat previews | Not started. |
| Step 8C final 34-case execution | Not started. |
| Steps 9–12 final repeatability, review, commit, and merge | Not started. |

### What we are not starting over

- Steps 4–7 remain completed unless the V2 connection changes code owned by one of their checks.
- Step 8.1 remains the browser-test foundation.
- Dashboard and Chat fixes from the previous browser run remain in the implementation.
- The 34-case declarations, setup/cleanup contracts, and evidence format remain available for Step 8C.
- Only affected focused checks are repeated during recovery; the full browser run is repeated because all its screens must share one runtime.

## 3. Recovery rules

1. The approved tabbed V2 laboratory remains the interface and workflow to implement.
2. Keep the connected development services and database work that has already passed Steps 4–7. Do not rebuild them merely because the UI was wrong.
3. Do not copy the old laboratory into another runnable archive. Git history and the existing historical audit are enough.
4. Remove manual polling, canned preparation, recurrence shortcuts, and normal-tab failure controls from the user-facing laboratory.
5. A direct-read helper may remain temporarily only when a named automated test requires it. It must be clearly test-only and cannot prove normal scheduling or browser acceptance.
6. Do not delete or archive a command, endpoint, test-data file, or other file until every code or test that uses it—and its remaining purpose—is known.
7. Preserve the old Step 8.2–8.7 records as clearly labeled diagnostic history. Do not combine their artifacts with the replacement run.
8. Do not start Step 8B until the recovery stages below are complete and a new Step 8.2–8.7 run passes.

## 4. How to execute without starting over

Use the `sequential-substep-review` skill on one recovery stage at a time:

1. Ask it to analyze the next recovery stage and propose the exact smaller units required.
2. Review and approve that split.
3. Let it record and execute the approved units, review each result, improve weaknesses, and stop before the following recovery stage.
4. Repeat until Recovery 5 is complete.
5. For Recovery 6, apply the skill separately to Steps 8.2, 8.3, 8.4, 8.5, 8.6, and 8.7. Reuse their existing substep structure when it still fits; do not recreate planning mechanically.

Recommended checkpoints, each requiring explicit approval and never authorizing a merge:

- Version 2 authority transition: documentation only;
- after Recovery 2: classification and active-documentation checkpoint;
- after Recovery 4: connected V2 and obsolete-workflow retirement checkpoint;
- after Recovery 5: focused-validation checkpoint; and
- after Recovery 6: replacement Step 8 evidence checkpoint.

## Part A — Immediate recovery before Step 8B

### Current recovery progress

| Item | Status | What unlocks it |
| --- | --- | --- |
| Make Version 2 current and Version 1 historical | Complete | Nothing; the authority transition is finished. |
| Recovery 1 | Next | Approved Recovery 1 substep split. |
| Recovery 2 | Not started | Recovery 1 classification complete. |
| Recovery 3 | Not started | Active documentation corrected. |
| Recovery 4 | Not started | Connected V2 implementation available and old callers classified. |
| Recovery 5 | Not started | V2 connection and legacy retirement complete. |
| Recovery 6 | Not started | Focused recovery checks pass and baseline is restored. |
| Step 8B | Blocked | New Step 8.2–8.7 run passes. |

### Recovery 1 — Confirm what is current and what is obsolete

**Purpose:** Remove uncertainty before changing or archiving anything.

**Work:**

- Map every approved V2 screen behavior to the connected implementation or identify it as missing.
- Find every code path or test that uses the old laboratory endpoints, the old Stage 5 automated check, and the manual failure route.
- Classify questionable files as current, separately useful, historical-only, removable, or unresolved.
- Make no deletion, archive move, or implementation change during this stage.

**Done when:** Every questionable item has an explained classification and the complete V2-to-connected gap is known.

### Recovery 2 — Correct the active documentation

**Purpose:** Ensure nobody can select the wrong UI, command, or evidence while implementation continues.

**Work:**

- Correct README, roadmap, prototype, and application pointers found by Recovery 1.
- Mark the previous Step 8.2–8.7 run as diagnostic and invalid for acceptance.
- Correct stale paths and status wording found by Recovery 1.

**Done when:** Active documentation points to one plan and one approved laboratory, while historical material is clearly non-authoritative.

### Recovery 3 — Connect the approved V2 laboratory

**Purpose:** Put the approved interface on `/dev/scenarios` without recreating rules already implemented behind the screen.

**Work:**

- Connect the V2 shared experiment controls and tab structure to the existing experiment services.
- Connect A02, A03, and A05 one at a time to the existing versioned source actions and real Monitor results.
- Connect Integrity, history, snapshots, pending changes, and safe failed-read presentation.
- Preserve the approved desktop, tablet, mobile, keyboard, and accessibility behavior.
- Keep expected explanations visibly separate from real Monitor evidence.

**Done when:** `/dev/scenarios` matches the approved V2 workflow, uses real connected identities, and contains no manual-poll or canned-case acceptance shortcut.

### Recovery 4 — Retire the obsolete executable workflow safely

**Purpose:** Prevent old tools from being mistaken for current Stage 5 behavior.

**Work:**

- Remove the old controls from the connected UI.
- Migrate any still-useful automated assertions away from the checkpoint validator.
- Rename or isolate the old validator so `validate:phase6-stage5` cannot run the rejected checkpoint workflow.
- Remove the row-deleting failure route after its last caller is migrated.
- Remove other old preparation, recurrence, or direct-read endpoints only after Recovery 1 proves they have no legitimate caller.
- Reserve the canonical `validate:phase6-stage5` name for the later complete Stage 5 validator.

**Done when:** No normal UI or canonical validation command can invoke the obsolete workflow, and no required test has been silently lost.

### Recovery 5 — Prove the correction without accepting Step 8 yet

**Purpose:** Catch implementation defects before creating expensive browser evidence.

**Work:**

- Run focused V2 interface tests.
- Rerun any Step 4–7 checks whose owned code changed.
- Run the source-action, scheduler, recovery, API, Dashboard, Chat, accessibility, responsive, build, and restoration checks affected by the correction.
- Restore and verify the protected development baseline.

**Done when:** Every affected focused check passes and the source baseline is restored. This stage still does not accept Step 8.

### Recovery 6 — Repeat Step 8.2 through Step 8.7

**Purpose:** Replace the invalid browser run with one coherent run using the approved V2 laboratory.

Run in this order:

1. Step 8.2 — approved connected V2 laboratory;
2. Step 8.3 — Dashboard;
3. Step 8.4 — Chat list;
4. Step 8.5 — Chat detail;
5. Step 8.6 — disconnect and reconnect; and
6. Step 8.7 — combined evidence and cleanup gate.

The existing substeps may be reused when their purpose still applies. Each one must be reassessed against the corrected laboratory before execution. New evidence must use one new runtime and one exact connected object chain. Old artifacts remain diagnostic history and cannot be reused.

**Done when:** A new Step 8.2–8.7 run passes completely with the approved laboratory, Dashboard, Chat, reconnect, evidence validation, and source restoration.

## Part B — Work after recovery

Recovery does not replace the rest of Stage 5. It returns the project to the point immediately before Step 8B.

| Remaining step | Outcome | Required approval or stop |
| --- | --- | --- |
| 8B | Add passive Dashboard and Chat previews to the approved laboratory and review them with the user. | User must accept the usefulness, accuracy, and passivity of the previews. |
| 8C | Execute the exact 34 connected acceptance cases and produce final result records. | All 34 must pass; no failures, skips, extras, or excluded cases. |
| 9 | Run the complete finished version twice from clean starting states. | Both runs must pass without changing the tested version or reusing evidence. |
| 10 | Review all final evidence and decide whether Stage 5 is genuinely complete. | Stop with documentation uncommitted for user review. |
| 11 | Commit and push the completed Stage 5 branch. | Separate explicit commit and push authorization; no merge. |
| 12 | Review and merge Stage 5 into `main`. | Separate explicit merge approval and separate approval before pushing `main`. |

### Step 8B — Add passive Dashboard and Chat previews

**Purpose:** Let the user watch the real Dashboard and Chat results beside the laboratory controls without creating a second Dashboard or Chat implementation.

**Work:**

- Add a read-only Dashboard preview showing the real Monitor incidents from the selected experiment.
- Add a read-only Chat preview showing the real conversations and alert messages for the selected user.
- Display the applicable incident, conversation, message, delivery, receipt, and update-position identifiers so the previews can be matched to the connected run.
- Provide links to open the real Dashboard and Chat when interactive inspection is needed.
- Read existing Monitor information; do not recalculate Dashboard or Chat business rules inside the laboratory.
- Prevent the previews from sending messages, changing incidents or routing, marking conversations read, creating receipts, changing presence, or changing source state.
- Compare the relevant Monitor records before and after loading, refreshing, switching users, and following links to prove the previews caused no change.
- Perform one focused human review and record the user's acceptance or the exact correction required.

**Done when:** Both previews show the correct connected objects and identifiers, their links work, automated checks prove no side effects, and the user accepts the integration.

**If a defect is found:** Correct it, rerun the affected Step 8 check, and repeat the focused human review. Do not continue to Step 8C with an unresolved mismatch.

### Step 8C — Execute the exact 34 connected acceptance cases

**Purpose:** Produce the first complete, reviewable Stage 5 acceptance result set after all required capabilities exist.

**Work:**

- Start from the verified clean development baseline.
- Execute exactly 34 approved cases: 11 shared cases, 9 A02 cases, 6 A03 cases, and 8 A05 cases.
- Do not run or substitute the excluded cases `A02-08`, `A03-06`, or `A05-07`.
- Give each case its own experiment, setup, result, cleanup, and restoration proof.
- Trace each applicable result from the laboratory action, through the changed source record and read-only Monitor read, to the incident, routing, Dashboard, conversation, message, and Chat result.
- Include the scheduling, recovery, browser, and Step 8B evidence required for that case.
- Generate one machine-readable result file and one equivalent human-readable result file from the same validated information.
- Fail the complete execution if any case is missing, duplicated, skipped, failed, excluded, tied to another runtime, missing evidence, or not cleaned up correctly.

**Done when:** The result set contains exactly 34 independent passes, zero failures, zero skips, zero extras, and zero excluded cases, with complete connected evidence and successful source restoration.

**If a defect is found:** Return it to the recovery or earlier Stage 5 step that owns the behavior, correct and revalidate that area, then restart Step 8C from a clean baseline. Do not edit the result files to hide the failure.

### Step 9 — Run the finished version twice

**Purpose:** Prove Stage 5 is repeatable and did not pass once by chance.

**Work:**

1. Check whether `main` has changed and bring in only compatible accepted changes. Stop if unrelated later-phase work creates a conflict.
2. Record the exact Stage 5 commit to be tested and stop changing the implementation, rules, setup data, or evidence logic.
3. Restore and verify the clean development baseline.
4. Run the complete Stage 5 validation, including source boundaries, failures, scheduling, recovery, browser checks, Step 8B passivity/observability checks, Step 8C, tests, type checks, build, dependency audit, routing regression, and query-plan checks. The accepted Step 8B human review does not need to be repeated unless the reviewed interface changes.
5. Restore and verify the source baseline even if the run fails.
6. Repeat the entire examination independently from another clean baseline without reusing incidents, conversations, messages, screenshots, or results.
7. If anything changes or fails, correct it and restart both runs from the beginning.

**Done when:** Two complete independent runs pass against the same unchanged commit, both baselines restore successfully, and neither run is missing required evidence.

**Important:** Any later change to code, rules, setup data, evidence logic, or branch integration invalidates both runs.

### Step 10 — Review and document the final evidence

**Purpose:** Decide whether the evidence genuinely supports saying Stage 5 is complete.

**Work:**

- Confirm both Step 9 runs tested the same commit.
- Confirm both runs contain exactly 34 passes, zero failures, zero skips, zero extras, and zero excluded cases.
- Review the connected trace, browser evidence, focused Step 8B human review, and both restoration records.
- Confirm the plan still excludes production authentication, Aurora, deployment, production load, and other Phase 10 work.
- Record the final commit, run identifiers, contract and fixture versions, browser evidence, human decision, restoration, and remaining exclusions in this single authority file.
- Update the Phase 6 README and roadmap to Stage 5 complete and Stage 6 next only when every requirement passes.
- Preserve earlier checkpoint and invalidated-run material as clearly historical evidence.
- Present the final documentation changes uncommitted for user review.

**Done when:** The user agrees that the recorded evidence supports Stage 5 completion and approves the final documentation.

**Stop:** Do not commit, push, or merge during Step 10.

### Step 11 — Commit and push the completed Stage 5 branch

**Purpose:** Create the final remote review checkpoint without including raw, protected, temporary, or unrelated files.

**Work:**

- Stage only the intended implementation, tests, contracts, approved evidence summaries, and approved documentation.
- Exclude protected backups, raw local evidence, runtime databases, secrets, temporary review files, and unrelated work.
- Review the exact staged files and changes, check links and formatting, and rerun the required final checks.
- Create the final Stage 5 corrective commit or commits.
- Push only `codex/phase6-stage5`.
- Verify that the local and remote branch point to the same commit.
- Present the commits, changed files, tested commit, two final run identifiers, and any remaining untracked files.

**Done when:** The remote Stage 5 branch contains only the approved final work and is ready for merge review.

**Approval:** Committing and pushing require explicit authorization. Step 11 never authorizes merging into `main`.

### Step 12 — Review and merge Stage 5 into `main`

**Purpose:** Make Stage 5 part of the canonical project only after final review.

**Work:**

- Present all Stage 5 commits, changed files, the tested commit, both final run identifiers, remaining exclusions, and unresolved or deferred items.
- Confirm that Stage 6 is next and that Phase 6 is not being marked complete prematurely.
- Obtain explicit approval for the merge method.
- Prefer a normal merge commit so the checkpoint and corrective history remain visible; the user makes the final decision.
- Merge only the reviewed Stage 5 branch into `main`.
- Verify the merged result and run proportional post-merge checks.
- Push `main` only with separate explicit authorization.
- Keep the Stage 5 branch until the merged result is verified.

**Done when:** Stage 5 is merged, verified, and accurately documented on `main`.

**Approval:** Merge approval and permission to push `main` are separate decisions.

### After Step 12

Stage 5 is complete, but Phase 6 remains in progress. Stage 6 then audits the merged result, confirms which connected components replace the simulator, preserves useful deterministic test tools, decides what can be retired, and performs the final Phase 6 exit review.

No recovery stage or remaining step advances status before its own completion and approval conditions are met.
