# Phase 6 Stage 5 recovery and completion plan — Version 2

**Status:** Current authoritative Stage 5 plan. The documentation-only authority transition was authorized, performed, reviewed, and approved for publication on 2026-08-02.

**Supersedes:** [Version 1](../../../../archive/docs/implementation/stage5_corrective_execution_plan_v1.md), preserved as historical planning and execution evidence only.

**Branch:** `codex/phase6-stage5`

**Latest pushed pre-Step-8B implementation checkpoint:** `27bd646`. The separate future instant-reset plan was added at `1b608b2`. The preserved pre-recovery implementation base is `2319c80`. `main` has not been changed. A pushed checkpoint means the work can be recovered; it does not mean Stage 5 or Step 8 is accepted.

**Current Stage 5 status:** In progress. Stage 5 is not accepted, Step 8 is not accepted, and Step 8B has not started.

## Start here

The project is not starting Stage 5 again. It is correcting one wrong interface, retiring the old workflow safely, and replacing the browser evidence affected by that correction.

### Recovery at a glance

| Order | Action | Result |
| --- | --- | --- |
| 1 | Approve Version 2, then separately authorize the documentation-only authority transition. | Complete — Version 1 is archived and Version 2 is the single current plan. |
| 2 | Complete Recovery 1–2. | Questionable files are classified and active documentation points to the correct laboratory and evidence. |
| 3 | Complete Recovery 3–4. | The approved V2 laboratory is connected and the obsolete executable workflow cannot be mistaken for current Stage 5 behavior. |
| 4 | Complete Recovery 5. | Complete — every affected focused check passes and the development baseline is independently restored and verified. |
| 5 | Complete Recovery 6. | Complete — new Step 8.2–8.7 evidence passes in one runtime using the approved laboratory. |
| 6 | Resume the original path at Step 8B. | Complete 8B, 8C, and Steps 9–12 under their separate gates. |

### Exact next action

1. Complete — the user approved this draft on 2026-08-02.
2. Complete — the user separately authorized the documentation-only authority transition on 2026-08-02.
3. Complete — Version 1 is archived, Version 2 has the official plan filename, and README and roadmap references are current.
4. Complete — the user reviewed this transition and separately authorized its commit and push on 2026-08-02.
5. Complete — `sequential-substep-review` classified Recovery 1 in four approved units on 2026-08-02.
6. Complete — Recovery 2.1–2.4 corrected and verified the active documentation on 2026-08-02.
7. Complete — Recovery 3 connected and reviewed the approved V2 laboratory on 2026-08-02.
8. Complete — Recovery 4 retired the obsolete executable workflow through five approved units on 2026-08-02.
9. Complete — Recovery 5 passed all five calibrated units and independently restored and verified the protected baseline on 2026-08-02.
10. Complete — Recovery 6 passed Steps 8.2a–8.7d in strengthened run `20260802-step8-recovery-v2-10`; the aggregate and adversarial gates passed and the protected baseline was independently restored on 2026-08-02.

Recovery 3–4 is committed and pushed at `30ed384`; Recovery 5 is committed and pushed at `d2ef6af`; Recovery 6 is committed and pushed at `5a9b28b`.

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
| Durable experiment identity, shared-clock serialization, due-poll replay, history, and snapshot persistence | Implemented and pushed as service foundations. Recovery 1 found that speed semantics, the polling-frequency shape, snapshot API exposure, and the approved V2 presentation still require correction or connection. |
| Exact 34-case declaration, independent setup/cleanup contracts, and evidence format | Complete and pushed as execution foundations. The final 34-case acceptance run has not happened. |
| Source isolation and read-only database failure handling | Complete and pushed. |
| Automatic scheduling, restart, interruption, and recovery without manual row deletion | Complete and pushed. |
| Step 8.1 browser runtime and evidence foundation | Complete and reusable. |
| Previous Step 8.2–8.7 browser run | Preserved as diagnostic history, not accepted evidence. |
| Step 8B passive Dashboard and Chat previews | Complete. The user accepted the implemented preview integration and focused UI changes on 2026-08-02, and automated passivity checks pass. Technical identifiers and links belong in Step 8C evidence rather than the preview. |
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
2. Keep the connected development services and database work that already passed Steps 4–7, while correcting the specific speed, frequency, snapshot-exposure, and UI gaps found by Recovery 1. Do not rebuild unaffected rules or boundaries merely because the UI was wrong.
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
| Recovery 1 | Complete — 2026-08-02 | Nothing; the candidate, behavior, caller, and classification audits are complete. |
| Recovery 2 | Complete — 2026-08-02 | Nothing; active status, specification, handoff, path, authority, and evidence wording is corrected and verified. |
| Recovery 3 | Complete — 2026-08-02 | Nothing; the connected V2 implementation and its focused review sequence are complete. |
| Recovery 4 | Complete — 2026-08-02 | Nothing; obsolete normal routes, destructive repair, rejected executables, and misleading command bindings are retired or isolated. |
| Recovery 5 | Complete — 2026-08-02 | Nothing; affected focused proof passes and the protected baseline is independently restored and verified. |
| Recovery 6 | Complete — 2026-08-02 | Nothing; strengthened run `20260802-step8-recovery-v2-10` and independent restoration checks pass. |
| Step 8B | Not started | Recovery is complete; Step 8B is now the next separately reviewed step. |

### Recovery 1 — Confirm what is current and what is obsolete

**Purpose:** Remove uncertainty before changing or archiving anything.

**Work:**

- Map every approved V2 screen behavior to the connected implementation or identify it as missing.
- Find every code path or test that uses the old laboratory endpoints, the old Stage 5 automated check, and the manual failure route.
- Classify questionable files as current, separately useful, historical-only, removable, or unresolved.
- Make no deletion, archive move, or implementation change during this stage.

#### Approved Recovery 1 substeps

##### Recovery 1a — Build the candidate inventory

- **Purpose:** Identify every potentially current, stale, duplicated, or historical UI, API, command, test, script, prototype, and documentation artifact in scope.
- **Artifact:** A bounded candidate register recorded below.
- **Dependency:** The current recovery plan, accepted V2 specification and prototype, repository entry points, and current worktree state.
- **Exit check:** Every artifact found through the documented searches is listed without changing or prematurely classifying its implementation.

##### Recovery 1b — Map approved V2 behavior

- **Purpose:** Compare every approved V2 behavior with the prototype, connected UI, API, and existing experiment services.
- **Artifact:** A behavior-to-implementation gap matrix recorded below.
- **Dependency:** Recovery 1a candidate register and the complete accepted V2 behavior authority.
- **Exit check:** Every approved behavior is classified as connected, service-only, missing, or conflicting.

##### Recovery 1c — Trace the obsolete workflow

- **Purpose:** Find every caller of the old polling, preparation, recurrence, failure-injection endpoints, and `validate:phase6-stage5` command.
- **Artifact:** A caller and dependency matrix recorded below.
- **Dependency:** Recovery 1a candidate register and repository-wide call-site evidence.
- **Exit check:** Every old executable surface has known callers and an explained remaining purpose.

##### Recovery 1d — Classify and reconcile

- **Purpose:** Classify every candidate as current, separately useful, historical-only, removable, or unresolved and hand the resulting work to the correct later recovery stage.
- **Artifact:** The final classification and Recovery 2–5 handoff recorded below.
- **Dependency:** Recovery 1a–1c evidence.
- **Exit check:** No candidate is unexplained and the complete V2-to-connected gap is documented without deletion, archival, or implementation changes.

#### Recovery 1 execution record

##### Recovery 1a result — candidate register

Search boundary: tracked application, package, configuration, migration, script, prototype, active-documentation, and archive paths plus the ignored `local-data/test-database/evidence/stage5/` evidence root. The search combined path enumeration, Stage 5 and scenario terms, exact route and command names, and symbol/import call sites so files without obvious names were still included.

| Candidate area | Artifacts included | Why it is in the register |
| --- | --- | --- |
| Accepted V2 authority and reference | `alertas_fake_audit_and_redesign_v2.md`, `alertas_fake_v2_edge_case_test_report_v2.md`, and `prototypes/current/alertas-fake-v2/{README.md,index.html}` | Defines the approved behavior and accepted standalone reference. |
| Connected web route | `apps/web/src/{App.tsx,ScenarioLab.tsx,api.ts}` | Owns `/dev/scenarios`, its visible controls, and browser API calls. |
| Scenario API boundary | `apps/api/src/{server.ts,routes/scenarios.ts,scenario-source-action-service.ts}` and their focused tests | Registers both the experiment services and older scenario endpoints. |
| Experiment services and persistence | `packages/detection/src/{experiment.ts,experiment-runtime.ts,experiment.test.ts}`, `packages/database/migrations/0013`–`0017` | Owns experiment identity, shared time, scheduling, history, snapshots, results, interruption state, and persistence. |
| Connected source boundary | `packages/detection/src/{test-database.ts,source-actions.ts,source-actions.connected.test.ts,source-actions.test.ts,freshness.ts}`, `apps/api/src/source-action-isolation.connected.ts`, and `config/detection/source-actions/stage5-source-actions.v1.json` | Owns versioned source actions, `test_database` access, read isolation, and source freshness. |
| Older simulator and canned-case boundary | `packages/detection/src/simulator.ts`, migrations `0003`, `0010`, and `0011`, plus the reset, trigger, prepare, advance-time, recurrence, direct-poll, population, and failure routes in `routes/scenarios.ts` | Contains old or mixed workflow surfaces that require caller-based classification before any removal. |
| Stage 5 declarations and evidence contracts | `config/detection/stage5-connected-acceptance.v2.json`, `config/detection/fixtures/stage5-fixture-contracts.v1.json`, both Stage 5 schemas, and `scripts/lib/stage5-*` with their focused tests and validators | Provides the reusable 34-case, chain, ledger, fixture, browser-harness, and evidence foundations. |
| Checkpoint and later validators | `package.json`; `scripts/validate-phase6-stage{4,5}.ts`; `scripts/validate-phase6-stage5{,a}.sh`; `scripts/validate-phase6-stage5-{source-isolation,step7}.sh`; `scripts/validate-phase6-stage5-{browser-runtime,step8}.ts` or `.mjs`; `scripts/run-phase6-stage5-browser-acceptance.ts`; and their connected/focused tests | Mixes the rejected checkpoint command with current recovery, scheduling, evidence, and browser foundations. |
| Cross-phase callers | `scripts/validate-phase5-routing.ts`, Phase 4 and Phase 5/API conversation tests, and other exact `/api/dev/scenarios` call sites | May retain legitimate regression value even when their direct-poll workflow is not valid acceptance evidence. |
| Active Stage 5 documentation | `docs/roadmap.md`, Phase 6 `README.md`, this plan, the V2 specification/report, `test_database.md`, and Stage 3/4 handoffs | May contain pointers or wording that Recovery 2 must correct. |
| Historical documentation | `archive/docs/implementation/alertas_fake_*_v1.md`, `phase4b_implementation_plan.md`, `phase6_implementation_plan.md`, the three `*_checkpoint_165abc1.md` records, and `stage5_corrective_execution_plan_v1.md` | Must remain distinguishable from current authority while preserving historical evidence. |
| Ignored local evidence | `local-data/test-database/evidence/stage5/`, including prior connected logs, ledgers, database runtime copies, browser target/review files, and prior Step 8 browser artifacts | May be useful diagnostic history but cannot become accepted replacement evidence or enter Git. |

**Recovery 1a status:** Complete. The first pass relied too heavily on filenames and could have missed indirectly wired files. The improvement pass added exact symbol/import and route-call searches, which exposed `server.ts`, `freshness.ts`, cross-phase callers, and the ignored evidence tree. Further splitting would duplicate the caller analysis assigned to Recovery 1c.

##### Recovery 1b result — approved V2 behavior map

Status meanings: **connected** means the approved behavior is available through `/dev/scenarios` on the real development boundary; **service-only** means useful backend capability exists but the approved UI does not expose it; **missing** means the required connected capability or proof is absent; **conflicting** means an executable surface behaves contrary to V2 even when reusable services exist behind it.

| V2 requirement | Status | Connected evidence and exact gap |
| --- | --- | --- |
| 1. Business tester can operate each alert through the approved tabbed workflow | Conflicting | `/dev/scenarios` loads `ScenarioLab.tsx`, but it renders three simultaneous pipeline cards rather than A02, A03, A05, and Integrity tabs, operational tables, row inspection, and the accepted V2 hierarchy. |
| 2. Multiple A02 movements with SKU and optional unique identity | Service-only | Versioned `test_database` source actions create and change independently identified movements, including cancellation/rejection reversals. The UI exposes a technical record selector but not the V2 movement table, split dispatch action, editable form, required descriptive fields, row detail, or complete history. |
| 3. Multiple independently timed A03 OTs | Service-only | The source-action boundary enforces one active OT per machine and supports start, first consumption, close, and cancel. The UI lacks the V2 OT table, split start action, editable proposal, per-row history/detail, and business empty states. |
| 4. Multiple A05 produced/remnant reels with independent reasons | Service-only | Source actions and connected evaluation distinguish produced/remnant reels, weighing, movement, source-OT closure, and A02 handoff. The UI lacks the V2 reel table, split declaration form, independent reason checklist presentation, history, and row inspection. |
| 5. Speed is any integer from 1–60 seconds per simulated minute | Conflicting | `ExperimentSpeed` permits only `1`, `2`, `3`, or `60` and runtime timing uses `60_000 / speed`, treating the value as a multiplier rather than V2 seconds-per-minute. The page displays this multiplier and offers no editor. |
| 6. One independently editable polling frequency in simulated minutes | Conflicting | Experiment services persist separate A02/A03/A05 frequencies and the history drawer displays them per rule. The accepted shared header specifies one `Sondeo (min)` control; the connected page exposes no frequency editor. |
| 7. Deterministic new experiment, run/pause, running-only jumps, automatic polls, and snapshot | Service-only | Create, configure, pause, automatic scheduling, chronological due-poll replay, durable experiment history, and snapshot persistence exist in services. The web client exposes only status/history plus old per-rule `+1` and direct poll controls; it has no create/configure/pause/jump API clients, and no connected snapshot route or control. |
| 8. Source actions mutate only source; administrative closure mutates only Monitor | Service-only | `/api/dev/source-actions` uses the versioned `test_database` boundary, while the authorized audited incident-closure endpoint exists separately. The connected laboratory exposes source actions but not the V2 administrative-closure dialog and correlated-incident warning. |
| 9. Complete operational history remains distinct from incident history | Missing | Durable experiment, runtime-event, snapshot, result, incident, and source data exist, but `/dev/scenarios` provides only an experiment drawer. It does not provide the approved per-alert active/completed operational-history views, filters, compact outcomes, or read-only historical row inspection. |
| 10. Failed and incomplete reads preserve trustworthy state | Conflicting | The connected poller and focused tests preserve Monitor state, and the page shows a preservation notice. The normal page still exposes four technical fault choices and per-rule failure controls instead of the single understandable Integrity action and before/after proof. |
| 11. Repeated successful polls create no duplicate downstream objects | Service-only | Connected scheduler, incident, routing, conversation, message, and focused tests prove deduplication. The approved Integrity counters/viewers and V2 row-level proof are absent from the connected page. |
| 12. Later healthy polling repairs incomplete downstream work without duplication | Conflicting | Recovery logic and tests exist, but the old `inject-monitor-fault` route manufactures the condition by deleting selected downstream test rows. It is not an approved normal laboratory workflow and cannot serve as V2 evidence. |
| 13. Recurrence uses only a source-valid new qualifying occurrence | Conflicting | The normal page and API retain `Preparar recurrencia`/`recur`. V2 forbids recurrence for the same A02 movement and A03 OT and defers A05 until a valid source workflow exists. New independently identified records remain supported through source actions. |
| 14. Expected and actual results use plain business language | Conflicting | The current pipeline separates expected and actual and exposes mismatches, but it does so as five technical columns per rule rather than the reversible per-row incident panel with timestamps, evidence, recipients, links, and business-level mismatch detail. |
| 15. Dashboard and conversation results are verifiable for A02/A03/A05 | Service-only | Real incidents, routing, conversations, alert messages, Dashboard, and Chat exist and the scenario status returns counts. The V2 laboratory does not expose the approved linked conversation/card inspection from each selected row. |
| 16. Simulated business time, audit time, detection delay, and cursor stay distinct | Service-only | Experiment business time, runtime event audit timestamps, source-action detection delay, and committed cursor are persisted or returned. The current page partly displays them but mixes an old per-rule scenario clock with the shared experiment status and lacks the approved row-detail presentation. |
| 17. Scenarios use `test_database` and the normal read-only adapter | Connected | Server wiring selects `TestDatabaseScenarioRepository`, versioned source actions, `testDatabaseRegistry`, and the scheduler/read-only adapter when the Stage 5 environment is active. Existing isolation and scheduling checks cover this boundary. |
| 18. Responsive, keyboard, accessibility, overflow, reduced-motion, and console proof | Missing | The prior Step 8 run tested the wrong interface. No valid connected V2 evidence currently proves desktop, tablet, mobile, tab/focus/dialog behavior, accessible row controls, overflow containment, reduced motion, or console cleanliness. |

Blueprint-specific gaps covered by the matrix include the missing tab bar and persistent shared controls; split primary actions and editable dialogs; operational tables/cards; row eye toggles; per-alert history dialogs and scroll preservation; snapshot capture/view; Integrity metric viewers; administrative closure; loading/empty/running/paused/polling states; the floating pending-change notice; V2 responsive transformations; and backdrop-cancel dialog behavior. The useful connected implementation is concentrated in the experiment runtime, versioned source actions, read-only scheduler path, incident/downstream services, and durable identity/history foundations—not in the present page composition.

**Recovery 1b status:** Complete after one improvement pass. The initial acceptance-requirement mapping could have hidden detailed UI omissions inside broad rows. The improvement added the explicit blueprint-gap inventory and exposed two service-level conflicts, not merely presentation gaps: speed semantics and per-rule polling frequencies. These must be resolved during Recovery 3 rather than assumed reusable unchanged.

##### Recovery 1c result — legacy caller and dependency trace

| Executable surface | Callers | Remaining purpose or conflict |
| --- | --- | --- |
| `validate:phase6-stage5` | `package.json` → `scripts/validate-phase6-stage5.sh` → `scripts/validate-phase6-stage5.ts` | Runs the older 34-case checkpoint manifest, canned preparation/population, direct polls, technical faults, and row-deleting downstream fault simulation. No active CI or other command calls it. Its canonical name can be mistaken for final acceptance. |
| `GET /api/dev/scenarios` | `ScenarioLab.tsx` through `api.ts`; API, source-isolation, and connected tests | Still supplies useful connected source, poll, expected, and Monitor status, but its DTO and page composition must be reshaped for V2 rather than discarded blindly. |
| `POST .../:code/reset` | Current `ScenarioLab.tsx` through `api.ts`; `scenarios.test.ts` | Old condition reset. It conflicts with V2 `Nuevo experimento`, preserved history, and source-valid actions; no current connected test outside the route suite requires it. |
| `POST .../:code/trigger` | `conversations.test.ts`, `scenarios.test.ts`, and `validate-phase5-routing.ts`; retained in the broad `api.ts` action type but not called by the page | Old fixed-record problem generator. It retains cross-phase regression callers, all of which can migrate to versioned source actions. |
| `POST .../:code/prepare` | Current page, `scenarios.test.ts`, Stage 4 validator, and old Stage 5 validator | Canned case preparation remains heavily used by older contract/regression tests, but V2 explicitly replaces canned cases in the normal UI with source-valid record actions. |
| `POST .../:code/prepare-population` | `scenarios.test.ts`, old Stage 5 validator, and `stage5-shared-path.test.ts` source assertion | Creates fixed mixed populations for checkpoint evidence. No normal UI caller exists. Useful population assertions must migrate to repeated versioned source actions or isolated fixtures before removal. |
| `POST .../:code/inject-monitor-fault` | Old Stage 5 validator, `scenarios.test.ts`, and `stage5-shared-path.test.ts` | Deletes `monitor_conversation_incident` and the incident alert message to simulate incomplete downstream work. It is destructive test scaffolding, is not called by the page, and must be replaced by the approved interruption/recovery mechanism before removal. |
| `POST .../:code/correct` | Stage 4 validator and `scenarios.test.ts` | Legacy simulator correction. On the connected `test_database` source it already returns `410 source_action_endpoint_replaced`; remaining simulator tests can migrate or stay explicitly historical until their replacement assertions exist. |
| `POST .../:code/advance-time` | Current page; conversation/API tests; Phase 5 routing validator; old Stage 5 validator; chain test; prior browser runner | Hybrid compatibility wrapper: delegates to the shared experiment runtime when active and otherwise to the old per-rule clock. The runtime capability is useful, but V2 needs the experiment-level advance API and eight running-only jump controls; every caller must stop treating this as a per-rule acceptance action. |
| `POST .../:code/fail-next-poll` | Current page; API and source-isolation tests; Stage 4 and old Stage 5 validators | Technical test fault injection is still needed for focused automated coverage. It must leave the normal alert tabs, and any retained route must be explicitly test-only; the V2 UI exposes only one understandable Integrity action. |
| `POST .../:code/poll` | Current page; conversation/API/source-isolation tests; Phase 5 and Stage 4 validators; old Stage 5 validator; chain, recovery, source-isolation, and prior browser checks | Calls the normal scheduler but forces it immediately. It remains useful for deterministic focused tests. It cannot remain a normal UI control or prove automatic scheduling and connected browser acceptance. |
| `POST .../:code/recur` | Current page through `api.ts` and `scenarios.test.ts` | Conflicts with approved A02/A03 invariants and deferred A05 recurrence. Its only legitimate current assertion is rejection; source-valid recurrence uses a new independently identified record, not this shortcut. |
| `POST .../:code/source-action` | Route plus `scenarios.test.ts` | A deliberate `410` tombstone for the replaced unversioned path. Current callers use `POST /api/dev/source-actions`; the tombstone can disappear only after Recovery 4 decides whether compatibility proof is still valuable. |
| `POST /api/dev/source-actions` | Current page; old validator; connected chain, recovery, source-isolation, browser, declaration, and fixture checks | Current versioned source-write boundary. It is not part of the obsolete workflow and must be preserved and adapted to the V2 forms and tables. |
| Experiment runtime/history APIs | Current page reads status/history; scheduling tests and Stage 5 browser runtime use the complete service boundary | Current foundation, but the page does not call create, configure, pause, advance, or snapshot. Recovery 3 must expose the approved operations and correct the speed/frequency contract. |
| General administrative-closure API | Dashboard `App.tsx`, API tests, incident and conversation services | Current authorized Monitor-only action. V2 may reuse it from the incident panel; it must remain separate from source actions and requires the approved reason/comment flow. |

Caller-set consequences:

- Removing the old page controls alone is safe only after the replacement V2 calls exist; it does not authorize endpoint deletion.
- `poll` and `fail-next-poll` have substantial focused-test value, so Recovery 4 must isolate or rename them rather than assume they are obsolete everywhere.
- `trigger`, `prepare`, `correct`, and `advance-time` retain cross-phase regression callers that require migration or explicit historical isolation.
- `inject-monitor-fault` is the only audited route that directly deletes downstream Monitor test rows. Its useful repair assertion must move to the durable interruption/recovery tests before the route and its shared-path assertion are removed.
- The old validator owns no unique accepted evidence: current declaration, fixture, chain, ledger, isolation, scheduling, recovery, Step 7, and browser-foundation commands exist separately.

**Recovery 1c status:** Complete after one improvement pass. A raw endpoint-string search produced false positives and missed calls hidden behind `scenarioAction`. The improvement traced the web wrapper, exact route patterns, direct repository methods, package-script chain, and test-only assertions separately. Every old executable surface now has a known caller set and remaining purpose.

##### Recovery 1d result — final classification

| Candidate | Classification | Required disposition |
| --- | --- | --- |
| V2 specification, Stage 2 report, and tabbed prototype | Current | Keep as the approved behavior/reference authority; Recovery 2 corrects stale implementation-status wording only. |
| Current recovery plan, Phase 6 README, and roadmap | Current | Keep as the single execution/status chain; Recovery 2 applies the documentation corrections listed below. |
| Stage 3 and Stage 4 handoffs and `test_database.md` | Current supporting evidence | Preserve their completed boundary evidence; Recovery 2 must clarify that Stage 4 connected the older page composition, not the approved V2 interface. |
| `App.tsx` `/dev/scenarios` route | Current | Preserve the route and authentication boundary. It must continue loading one laboratory implementation. |
| `ScenarioLab.tsx` | Current file with obsolete composition | Replace its contents in place during Recovery 3. Do not create a second runnable laboratory or archive a copy of the old UI. Git history preserves the predecessor. |
| Scenario types and clients in `apps/web/src/api.ts` | Current mixed file | Preserve current status/source-action/history clients, add the approved runtime/snapshot/history operations, and remove UI dependencies on legacy actions only after the replacement works. |
| `routes/scenarios.ts` and server wiring | Current mixed file | Preserve status, experiment, versioned source-action, scheduler, and authorization paths. Treat each legacy endpoint by the endpoint-level disposition below; do not remove the whole route module. |
| Versioned source-action service, contract, `test_database` repository, freshness provider, and connected isolation tests | Current | Preserve as the only source-write and read-only Monitor boundary; adapt V2 forms/actions to it rather than duplicating business rules. |
| Experiment repository/runtime and migrations `0013`–`0017` | Current but requiring correction | Preserve identity, history, serialization, due-poll replay, event, result, and snapshot foundations. Recovery 3 corrects speed semantics, the shared frequency shape, and missing web/API exposure. |
| Simulator, `monitor_sim_*`, and migrations `0003`, `0010`, `0011` | Separately useful | Keep until connected V2 replacement acceptance proves no operational dependency, as required by the Phase 6 gate. Do not archive migrations or remove the fallback during recovery. |
| Incident, routing, Dashboard, conversation, message, and administrative-closure services | Current | Preserve. Recovery 3 reuses their existing read/action boundaries; no second downstream implementation is allowed. |
| V2 declarations, fixture contracts, source-action contract, schemas, chain/ledger/evidence libraries, scheduling/recovery/isolation checks, and Step 8.1 browser foundation | Current | Preserve and rerun when owned code changes. They are foundations, not proof that the connected V2 screen already exists. |
| Browser acceptance runner and Step 8 aggregate validators | Current but requiring correction | Preserve the same-runtime and provenance architecture. Recovery 3/6 must update surface expectations and generate a wholly new evidence run. |
| `validate:phase6-stage5`, its shell/TypeScript runner, and `stage5-connected-acceptance.v1.json` | Historical-only executable workflow | Recovery 4 removes the canonical command binding, preserves history in Git, and reserves the name for the later complete validator. Any unique assertion must first migrate to current focused tests. |
| `test-database-stage5.v1.json` fixture seeds | Separately useful | Retain while current chain, browser, fixture, and API tests reference its real seed identities; its `v1` name does not make it the rejected acceptance manifest. |
| Phase 4, Phase 5, conversation, and older scenario regression callers | Separately useful | Preserve their business regression intent, but migrate them from removed legacy actions or isolate them explicitly as simulator-only tests. They cannot prove Stage 5 acceptance. |
| Archived plans, reports, and checkpoint handoffs | Historical-only | Keep under `archive/` with no current authority. Do not copy their completion claims back into active documents. |
| Ignored prior connected/browser evidence under `local-data/` | Historical-only diagnostic evidence | Keep ignored and separate from the replacement run. It may explain earlier findings but cannot be reused, renamed into, or counted as Recovery 6 evidence. |

Endpoint-level disposition for the mixed scenario route:

| Surface | Classification | Recovery disposition |
| --- | --- | --- |
| Status, experiment history/runtime, and `POST /api/dev/source-actions` | Current | Preserve and extend for V2. |
| `reset`, `recur`, and the replaced `:code/source-action` tombstone | Removable | Remove after V2 clients exist and rejection/compatibility assertions are migrated or deliberately retired. |
| `trigger`, `prepare`, `prepare-population`, `correct`, and per-code `advance-time` | Separately useful during migration | Remove from normal UI immediately in Recovery 3; in Recovery 4 migrate cross-phase/current assertions, then retain only an explicitly isolated simulator/test contract if still needed. |
| `fail-next-poll` and direct `poll` | Separately useful test-only | Remove from normal tabs. Retain or rename behind a clear test-only boundary for focused deterministic checks; never use them as automatic-scheduling or browser-acceptance proof. |
| `inject-monitor-fault` | Removable after assertion migration | Replace its useful repair assertion with durable interruption/recovery coverage, then remove the row-deleting route and its shared-path requirement. |

There are **no unowned classifications**. “Separately useful” is intentional retention with a bounded purpose, not current acceptance authority. Retention and removal decisions labeled below as inferred must still be proven by the named recovery stage before any file or endpoint changes.

##### Recovery 1 evidence-strengthening pass — exact register

Evidence labels:

- **Verified static:** confirmed from an exact tracked path, import, route registration, package command, call site, or active/historical link in this worktree.
- **Inferred disposition:** the current evidence supports the proposed owner/action, but the owner stage must validate it through implementation and tests before changing or removing anything.
- **Historical path:** location and non-authoritative status are verified; content is not current execution evidence.

No runtime acceptance claim is made by this audit. It is a source-and-reference classification pass.

Every `Owner/action` entry below is an inferred disposition unless it simply says to preserve or make no change. The named recovery stage must verify each inferred action before modifying or removing its target.

<details>
<summary>Exact Recovery 1 file register and reference checks</summary>

###### Exact decision-bearing file register

| Exact file | Evidence | Classification | Owner/action |
| --- | --- | --- | --- |
| `docs/delivery/phases/phase6/stage5_corrective_execution_plan.md` | Verified static | Current authority and Recovery 1–2 record | Recovery 3 begins only after its own approved split. |
| `docs/delivery/phases/phase6/README.md` | Verified static | Current status index with corrected Stage 4 UI boundary | No recovery change pending. |
| `docs/roadmap.md` | Verified static | Current sequencing authority | Recovery 2 verifies wording and current-plan link. |
| `docs/delivery/phases/phase6/alertas_fake_audit_and_redesign_v2.md` | Verified static | Current V2 behavior authority with corrected implementation metadata | Recovery 3 uses it as the behavior reference. |
| `docs/delivery/phases/phase6/alertas_fake_v2_edge_case_test_report_v2.md` | Verified static | Current standalone Stage 2 evidence | Recovery 2 verifies its standalone-only label; no status advance. |
| `docs/delivery/phases/phase6/test_database.md` | Verified static | Current supporting source-boundary evidence | Recovery 2 verifies links/status; Recovery 5 reruns owned checks. |
| `docs/delivery/phases/phase6/test_database_stage3_handoff.md` | Verified static | Current supporting handoff | Recovery 2 verifies it remains Stage 3 evidence only. |
| `docs/delivery/phases/phase6/test_database_stage4_handoff.md` | Verified static | Current supporting handoff with corrected connected-page boundary | Recovery 5 reruns owned checks. |
| `docs/delivery/phases/phase7/alertas_fake_scenario_specification.md` | Verified static | Current Phase 7 standalone specification, not a Stage 5 duplicate | No Recovery 1 change; Phase 7 remains blocked by Phase 6. |
| `prototypes/current/alertas-fake-v2/README.md` | Verified static | Current standalone V2 reference | Recovery 2 verifies pointer; Recovery 3 uses as reference only. |
| `prototypes/current/alertas-fake-v2/index.html` | Verified static | Current standalone V2 reference, not imported by the application | Recovery 3 ports behavior without making this a second app. |
| `apps/web/src/App.tsx` | Verified static | Current sole `/dev/scenarios` route plus Dashboard | Recovery 3 preserves route; Recovery 5 regression. |
| `apps/web/src/ScenarioLab.tsx` | Verified static | Current sole connected laboratory component with obsolete composition | Recovery 3 replaces in place. |
| `apps/web/src/api.ts` | Verified static | Current mixed client boundary | Recovery 3 adds V2 operations; Recovery 4 removes legacy clients after migration. |
| `apps/api/src/config.ts` | Verified static | Current local/test-only laboratory gate | Recovery 3 preserves; Recovery 5 regression. |
| `apps/api/src/server.ts` | Verified static | Current sole scenario-route registration and source selection | Recovery 3 preserves wiring; Recovery 5 regression. |
| `apps/api/src/routes/scenarios.ts` | Verified static | Current mixed route module | Recovery 3 extends current APIs; Recovery 4 applies endpoint-level dispositions. |
| `apps/api/src/scenarios.test.ts` | Verified static | Current mixed API suite with legacy callers | Recovery 4 migrates/splits; Recovery 5 reruns. |
| `apps/api/src/stage5-shared-path.test.ts` | Verified static | Current guard that incorrectly requires the obsolete row-deleting route | Recovery 4 replaces that assertion; Recovery 5 reruns. |
| `apps/api/src/conversations.test.ts` | Verified static | Current conversation regression using old trigger/direct-poll setup | Recovery 4 migrates setup; Recovery 5 reruns. |
| `apps/api/src/source-action-isolation.connected.ts` | Verified static | Current connected isolation proof using direct poll as a test helper | Recovery 4 isolates helper boundary; Recovery 5 reruns. |
| `packages/detection/src/experiment.ts` | Verified static | Current experiment model with conflicting speed/frequency types | Recovery 3 corrects contract and persistence migration. |
| `packages/detection/src/experiment-runtime.ts` | Verified static | Current serialized runtime with inverted V2 speed semantics | Recovery 3 corrects; Recovery 5 reruns scheduling. |
| `packages/detection/src/experiment.test.ts` | Verified static | Current tests encoding the existing runtime contract | Recovery 3 updates; Recovery 5 reruns. |
| `packages/detection/src/simulator.ts` | Verified static | Separately useful fallback and legacy action contract | Recovery 4 isolates; retain until Phase 6 replacement acceptance. |
| `packages/database/migrations/0003_phase4b_simulator.sql` | Historical path plus verified runtime dependency | Required migration history for retained fallback | Do not remove; Phase 6 gate owns eventual simulator retirement. |
| `packages/database/migrations/0010_phase6_alertas_fake_redesign.sql` | Historical path plus verified runtime dependency | Required migration history for retained fallback | Do not remove. |
| `packages/database/migrations/0011_phase6_a02_authority_reconciliation.sql` | Historical path plus verified runtime dependency | Required migration history for retained fallback | Do not remove. |
| `packages/database/migrations/0013_phase6_stage5_acceptance.sql` | Verified static | Current experiment persistence foundation | Recovery 3 migration follow-up if contract changes. |
| `packages/database/migrations/0014_phase6_stage5_experiment_history.sql` | Verified static | Current history foundation | Recovery 3. |
| `packages/database/migrations/0015_phase6_stage5_experiment_runtime.sql` | Verified static | Current runtime foundation | Recovery 3. |
| `packages/database/migrations/0016_phase6_stage5_test_interruptions.sql` | Verified static | Current durable test-interruption foundation | Recovery 4 replacement for row-deleting repair setup; Recovery 5 proof. |
| `packages/database/migrations/0017_phase6_stage5_snapshot_sequence.sql` | Verified static | Current snapshot-order foundation | Recovery 3 API/UI exposure. |
| `config/detection/stage5-connected-acceptance.v1.json` | Verified static | Historical checkpoint manifest called only by old validator | Recovery 4 removes executable binding; preserve in Git history. |
| `config/detection/stage5-connected-acceptance.v2.json` | Verified static | Current 34-case declaration | Preserve for Step 8C; Recovery 5 validates contracts. |
| `config/detection/fixtures/test-database-stage5.v1.json` | Verified static | Separately useful seed identities with several current callers | Preserve; Recovery 4 migrates only obsolete callers. |
| `package.json` | Verified static | Current command registry containing both current focused commands and obsolete canonical `validate:phase6-stage5` | Recovery 4 removes/replaces only the obsolete binding. |
| `scripts/validate-phase6-stage5.sh` | Verified static | Obsolete canonical checkpoint wrapper | Recovery 4 removes executable binding after assertion migration. |
| `scripts/validate-phase6-stage5.ts` | Verified static | Obsolete checkpoint runner | Recovery 4 mines/migrates unique assertions, then removes from active workflow. |
| `scripts/validate-phase6-stage4.ts` | Verified static | Separately useful Stage 4 regression with legacy callers | Recovery 4 migrates or isolates; Recovery 5 reruns if changed. |
| `scripts/validate-phase5-routing.ts` | Verified static | Separately useful Phase 5 regression with legacy callers | Recovery 4 migrates setup; Recovery 5 reruns. |
| `scripts/run-phase6-stage5-browser-acceptance.ts` | Verified static | Current same-runtime runner encoding the wrong laboratory interaction | Recovery 3 updates surface interaction; Recovery 6 creates new evidence. |
| `scripts/finalize-phase6-stage5-browser-evidence.mjs` | Verified static | Orphaned one-off recovery finalizer that can publish `accepted: true` from existing artifacts | Recovery 4 removes or makes non-runnable historical tooling; it cannot participate in replacement evidence. |
| `scripts/validate-phase6-stage5-step8.mjs` | Verified static | Current aggregate gate tied to prior surface artifacts | Recovery 6 updates and reruns after corrected surfaces. |
| `scripts/validate-phase6-stage5-step8-adversarial.mjs` | Verified static | Current adversarial evidence validator | Preserve; Recovery 6 updates only if corrected evidence contract requires it. |
| `local-data/test-database/evidence/stage5/browser-review.json` | Historical path | Diagnostic record that says `passed` for the wrong/earlier surface set | Keep ignored; never reuse as Recovery 6 evidence. |
| `local-data/test-database/evidence/stage5/browser-target.json` | Historical path | Diagnostic runtime target | Keep ignored and separate from replacement run. |
| `local-data/test-database/evidence/stage5/` timestamped logs, ledgers, database copies, debug roots, and browser-run roots | Historical path | Ignored diagnostic/runtime data, not source authority | Keep ignored; Recovery 5 restores baseline and Recovery 6 uses a new run root. |

###### Exact historical-document register

Every file below is verified historical and has no current authority. Recovery 2 checks only that active documents do not point to it as current:

- `archive/docs/README.md`
- `archive/docs/implementation/alertas_fake_audit_and_redesign_v1.md`
- `archive/docs/implementation/alertas_fake_v2_edge_case_test_report_v1.md`
- `archive/docs/implementation/phase4b_implementation_plan.md`
- `archive/docs/implementation/phase6_implementation_plan.md`
- `archive/docs/implementation/stage5_connected_acceptance_inventory_checkpoint_165abc1.md`
- `archive/docs/implementation/stage5_connected_acceptance_report_checkpoint_165abc1.md`
- `archive/docs/implementation/stage5_corrective_execution_plan_v1.md`
- `archive/docs/implementation/test_database_stage5_handoff_checkpoint_165abc1.md`

###### Exact stable-current foundation register

The following files were individually found through imports, package commands, config references, or exact Stage 5 symbols. Their current role is verified statically; none is evidence that V2 browser acceptance has passed. Recovery 3 or 4 changes them only if its scoped contract requires it, and Recovery 5 owns proportional regression:

- `apps/api/src/scenario-source-action-service.ts`
- `apps/api/src/scenario-source-action-service.test.ts`
- `apps/api/src/stage5-browser-runtime.ts`
- `apps/api/src/stage5-browser-runtime.test.ts`
- `packages/contracts/src/index.ts`
- `packages/database/src/index.ts`
- `packages/detection/src/freshness.ts`
- `packages/detection/src/source-actions.ts`
- `packages/detection/src/source-actions.test.ts`
- `packages/detection/src/source-actions.connected.test.ts`
- `packages/detection/src/test-database.ts`
- `config/detection/fixtures/stage5-fixture-contracts.v1.json`
- `config/detection/schemas/stage5-browser-evidence.v1.schema.json`
- `config/detection/schemas/stage5-connected-ledger-result.v1.schema.json`
- `config/detection/schemas/stage5-fixture-registry.v1.schema.json`
- `config/detection/schemas/stage5-step7-evidence.v1.schema.json`
- `config/detection/source-actions/stage5-source-actions.v1.json`
- `scripts/build-stage5-step7-aggregate.mjs`
- `scripts/lib/stage5-browser-evidence.d.mts`
- `scripts/lib/stage5-browser-evidence.mjs`
- `scripts/lib/stage5-browser-harness.d.mts`
- `scripts/lib/stage5-browser-harness.mjs`
- `scripts/lib/stage5-chain-capture.mjs`
- `scripts/lib/stage5-declaration-validator.mjs`
- `scripts/lib/stage5-fixture-contract-validator.mjs`
- `scripts/lib/stage5-fixture-runner.mjs`
- `scripts/lib/stage5-ledger.mjs`
- `scripts/lib/stage5-step7-evidence.d.mts`
- `scripts/lib/stage5-step7-evidence.mjs`
- `scripts/lib/stage5-synthetic-ledger.mjs`
- `scripts/stage5-browser-evidence.test.mjs`
- `scripts/stage5-browser-harness.test.mjs`
- `scripts/stage5-chain-capture.test.mjs`
- `scripts/stage5-chain-connected.test.ts`
- `scripts/stage5-declaration-validator.test.mjs`
- `scripts/stage5-fixture-contract-validator.test.mjs`
- `scripts/stage5-fixture-runner.test.mjs`
- `scripts/stage5-ledger.test.mjs`
- `scripts/stage5-recovery.connected.test.ts`
- `scripts/stage5-scheduling.connected.test.ts`
- `scripts/stage5-source-isolation.connected.test.ts`
- `scripts/stage5-step7-evidence.test.mjs`
- `scripts/test-database-reset.sh`
- `scripts/test-database-runtime.sh`
- `scripts/test-database-validate.sh`
- `scripts/validate-phase6-stage5-browser-runtime.ts`
- `scripts/validate-phase6-stage5-source-isolation.sh`
- `scripts/validate-phase6-stage5-step7.sh`
- `scripts/validate-phase6-stage5a.sh`
- `scripts/validate-stage5-declarations.mjs`
- `scripts/validate-stage5-fixture-contracts.mjs`
- `scripts/validate-stage5-ledger.mjs`

###### Duplicate, indirect-caller, and orphan result

- Exactly one active application component owns `/dev/scenarios`: `App.tsx` imports `ScenarioLab.tsx`. The standalone V2 prototype is not imported into the application.
- Exactly one scenario route module is registered by `server.ts`; exactly one experiment repository/runtime implementation and one connected `TestDatabaseScenarioRepository` implementation were found.
- Exact wrapper and route tracing accounts for every old endpoint caller recorded in Recovery 1c; no second active manual-poll route was found.
- The V1 and V2 acceptance manifests are not interchangeable duplicates: V1 is called only by the obsolete validator, while V2 is called by current declaration, fixture, ledger, chain, and browser-foundation tooling.
- `scripts/finalize-phase6-stage5-browser-evidence.mjs` is the only unbound executable candidate found. Its ability to construct an accepted manifest makes it unsafe to leave looking current.
- The three `.d.mts` files have no textual command callers because they are adjacent type declarations for imported `.mjs` modules; they are not treated as orphans.
- No active document points to an archived plan as current authority. Phase 7's `alertas_fake_scenario_specification.md` is a separately scoped, blocked-phase specification rather than a duplicate Stage 5 plan.

</details>

##### Recovery 2–5 handoff

| Recovery stage | Exact work handed forward from Recovery 1 |
| --- | --- |
| Recovery 2 — documentation | Correct the V2 specification's stale `Existing application source`, “future `test_database` adapter,” isolated-clock, and implementation-status wording; clarify in the Phase 6 README and Stage 4 handoff that Stage 4 connected the correct boundary behind the older interface; retain the current plan's explicit invalidation of the prior Step 8.2–8.7 run; keep the old local artifacts diagnostic and ignored; create no second status or audit document. |
| Recovery 3 — connected V2 | Replace `ScenarioLab.tsx` in place with the approved tabs, persistent shared controls, operational tables/cards, row details, history dialogs, Integrity tab, snapshots, administrative closure, states, and responsive/accessibility behavior. Extend `api.ts` and the existing API/services rather than creating a parallel application. Correct speed to every integer 1–60 seconds per simulated minute and reconcile one shared polling frequency before wiring the controls. |
| Recovery 4 — obsolete workflow retirement | Remove old normal-page controls; migrate cross-phase and scenario tests from `reset`, `trigger`, canned preparation, legacy correction, recurrence, and per-code advance where appropriate; isolate direct poll/fault helpers as test-only if still required; replace row-deleting repair simulation; remove the obsolete canonical command; remove or make non-runnable the orphaned browser-evidence finalizer; preserve `monitor_sim_*` until the Phase 6 replacement gate, not merely until the UI rewrite. |
| Recovery 5 — focused proof | Run changed web/API/detection tests and type checks; V2 interface, experiment runtime, source-action/isolation, scheduler, recovery, incident/routing, Dashboard/Chat, accessibility/responsive, browser-harness, build, and diff checks; rerun any migrated Phase 4/5 regression; restore and independently validate the protected `test_database` baseline. Do not accept Step 8 from these focused checks. |

**Recovery 1d status:** Complete after two improvement passes. The first classification grouped mixed files such as `routes/scenarios.ts` and `api.ts`, which could have encouraged whole-file deletion or retention. The first improvement added endpoint-level dispositions and separated the rejected V1 acceptance manifest from the still-used V1 fixture seeds. The second added exact paths, evidence strength, indirect-reference and duplicate checks, and found the unbound browser-evidence finalizer. Every Recovery 1a candidate is now explicit, no classification is unowned, and inferred dispositions remain gated by their named recovery stage.

**Recovery 1 final decision:** Advance to Recovery 2 only. Recovery 1 changed no application, endpoint, command, archive, evidence, or supporting document; it recorded the approved split and audit results only in this authoritative plan.

**Done when:** Every questionable item has an explained classification and the complete V2-to-connected gap is known.

### Recovery 2 — Correct the active documentation

**Purpose:** Ensure nobody can select the wrong UI, command, or evidence while implementation continues.

**Work:**

- Correct README, roadmap, prototype, and application pointers found by Recovery 1.
- Mark the previous Step 8.2–8.7 run as diagnostic and invalid for acceptance.
- Correct stale paths and status wording found by Recovery 1.

#### Approved Recovery 2 substeps

1. **Recovery 2.1 — Correct status and sequencing.** Clarify in the Phase 6 README, roadmap, and this plan that Stage 4 connected the correct database boundary behind the older interface, the approved V2 prototype is the required replacement interface, and the previous Step 8.2–8.7 evidence is diagnostic rather than accepted. Exit: the active status chain cannot be read as claiming that connected V2 acceptance already occurred.
2. **Recovery 2.2 — Correct the V2 specification.** Replace stale source, adapter, clock, and implementation-status wording without changing approved Stage 2 behavior. Exit: the specification accurately distinguishes the standalone V2 reference, the older connected interface, and the existing connected services that Recovery 3 will reuse.
3. **Recovery 2.3 — Correct supporting handoffs.** Clarify the Stage 4 handoff and verify the Stage 2 report, `test_database` record, Stage 3 handoff, and prototype README retain their exact supporting-evidence boundaries. Exit: no supporting document implies that V2 was connected or that prior Step 8 evidence was accepted.
4. **Recovery 2.4 — Verify authority and links.** Scan active documentation for contradictory status, stale paths, duplicate authority, and misleading evidence; record the result only here. Exit: active documentation points to one current plan and one approved laboratory, historical material is non-authoritative, and Recovery 3 has not started.

**Recovery 2.1 result:** Complete after one improvement pass. The Phase 6 README and roadmap now state that Stage 4 connected the correct source boundary behind the older screen, that the approved tabbed V2 prototype remains the required replacement interface, and that the earlier Step 8.2–8.7 browser run is diagnostic and invalid for acceptance. The adversarial pass found that this plan's exact-next-action line still described Recovery 2 as awaiting its split; it was corrected to show the approved four-unit execution in progress.

**Recovery 2.2 result:** Complete after one improvement pass. The V2 specification now distinguishes the browser-local approved prototype, the existing `test_database` and Monitor service boundary behind the older screen, the retained fallback simulator, and the Recovery 3 UI connection still required. The adversarial pass found that its execution-status section still assigned the current action to the Phase 6 README; it was corrected so this plan alone owns Stage 5 execution and evidence status.

**Recovery 2.3 result:** Complete. The Stage 4 handoff now limits its claim to the correct connected services behind the older screen and explicitly rejects connected V2 and prior Step 8 acceptance claims. The Stage 2 report's stale “future adapter” wording and the prototype README's obsolete worktree paths were corrected. The `test_database` record and Stage 3 handoff already state supporting-only boundaries and required no change. The strongest remaining limitation is that the Stage 2 report retains its original later-stage handoff table; this is intentional traceability, and its standalone-only role prevents it from acting as current execution evidence.

**Recovery 2.4 result:** Complete after two improvement passes. All local Markdown targets in the nine active Recovery 2 documents resolve; no active document points to a Version 2 draft or obsolete worktree path; the roadmap, Phase 6 README, V2 specification, and this plan consistently assign Stage 5 execution authority to this file; and prior Step 8.2–8.7 evidence remains diagnostic and invalid. The first adversarial scan found stale classifications inside Recovery 1's file register that still described already-corrected documents as ambiguous or stale. The second found that the V2 specification's header still assigned current execution status to the Phase 6 README despite its corrected execution-status section. The classifications, progress table, and header authority pointer were corrected. Recovery 3 implementation has not started.

**Recovery 2 final decision:** Advance only to approval-gated planning for Recovery 3. Recovery 2 changed documentation only, created no duplicate plan or audit file, and did not modify application code, commands, archives, or ignored evidence.

**Done when:** Active documentation points to one plan and one approved laboratory, while historical material is clearly non-authoritative.

### Recovery 3 — Connect the approved V2 laboratory

**Purpose:** Put the approved interface on `/dev/scenarios` without recreating rules already implemented behind the screen.

**Work:**

- Connect the V2 shared experiment controls and tab structure to the existing experiment services.
- Connect A02, A03, and A05 one at a time to the existing versioned source actions and real Monitor results.
- Connect Integrity, history, snapshots, pending changes, and safe failed-read presentation.
- Preserve the approved desktop, tablet, mobile, keyboard, and accessibility behavior.
- Keep expected explanations visibly separate from real Monitor evidence.

#### Approved Recovery 3 substeps

1. **Recovery 3a — Correct the shared experiment contract.** Migrate and test speed as every integer from 1–60 seconds per simulated minute, one shared polling frequency from 1–99 simulated minutes, paused creation, explicit start, and chronological scheduled-poll replay. Exit: the connected runtime matches the approved shared-clock semantics without losing historical experiments.
2. **Recovery 3b — Build the connected V2 API contract.** Provide typed per-record source, pending-change, incident, history, and downstream-evidence data plus the experiment-control clients V2 requires. Exit: route tests associate presentation data with real source identities through the existing connected boundary.
3. **Recovery 3c — Replace the page shell and shared controls.** Put the approved persistent experiment header, shared controls, four tabs, automatic-poll status, and eight running-only time jumps on `/dev/scenarios`. Exit: the normal page contains no manual-poll, canned-case, recurrence, or per-rule-clock control.
4. **Recovery 3d — Connect the complete A02 tab.** Implement quick/editable dispatch, current table/cards, influence-zone actions, pending state, row inspection entry, and read-only history against real connected movement identities. Exit: receipt, cancellation, rejection, and reverse movements preserve independently traceable source history.
5. **Recovery 3e — Connect the complete A03 tab.** Implement quick/editable OT start, first consumption, closure/cancellation, current table/cards, inspection entry, and history. Exit: machine exclusivity and consumption/closure rules pass through the connected source boundary.
6. **Recovery 3f — Connect the complete A05 tab.** Implement quick/editable reel declaration, independent weighing/movement reasons, source-OT closure, A02 handoff, current table/cards, inspection entry, and history. Exit: one reel owns one A05 incident and its destination movement becomes a separately identified A02 record.
7. **Recovery 3g — Connect incident inspection and administrative closure.** Show expected behavior separately from actual Monitor evidence, including evidence, recipients, deliveries, conversation/card links, cursor, delay, mismatches, and authorized closure. Exit: closing without resolution changes only Monitor state and remains visible in read-only history.
8. **Recovery 3h — Connect Integrity and snapshots.** Provide one understandable failed-poll action, before/after counts, immutable snapshot capture/viewing, and evidence/delivery/conversation viewers. Exit: the UI demonstrates preservation and later healthy recovery without duplicate downstream objects.
9. **Recovery 3i — Harden the complete interface.** Cover loading, empty, running, paused, polling, failure, and pending states plus desktop/tablet/mobile, keyboard, focus, dialog, reduced-motion, overflow, and console behavior. Exit: the connected V2 interface meets the approved responsive and accessibility contract.

The nine-unit count is intentional. A smaller split would combine the shared domain migration, per-record API model, three explicitly sequential alert integrations, two different evidence surfaces, or cross-interface hardening despite their independent failure and validation boundaries.

**Recovery 3a result:** Complete after one improvement pass. Migration `0018` preserves legacy speed/frequency columns for historical traceability while adding the V2 seconds-per-simulated-minute and single polling-frequency fields. New experiments begin paused, configuration accepts every integer speed 1–60 and frequency 1–99, resume resets the shared next-poll schedule, and manual or automatic advances serialize every crossed A02/A03/A05 poll. Focused repository/runtime tests pass. The adversarial pass found that silently resuming a pre-V2 active experiment under transformed timing semantics would be unsafe; the migration now marks such experiments completed while preserving their records and requires a new V2 experiment.

**Recovery 3b result:** Complete after a corrective improvement pass. The existing scenario route now returns a typed `records` collection keyed by the real A02 movement, A03 work-order, or A05 reel identity, with expected reasons/lifecycle, latest exact-condition incident, downstream counts, cursor, and comparison. Pending state is derived per record from durable source-action and successful scheduled-poll event order: one changed record does not mark its peers, a failed poll does not clear it, and the next complete successful scheduled poll does. The web client exposes the corrected create/configure/start-pause/advance contract. API, detection, and web type checks pass, and connected API coverage verifies record identity, isolation, pending-state clearing, and corrected runtime endpoints.

**Recovery 3c result:** Complete after one improvement pass. `/dev/scenarios` now uses the approved V2 page hierarchy: persistent experiment identity/time/status, compact shared speed and frequency controls, explicit start/pause, eight running-only jumps, automatic-poll timing, and scrollable A02/A03/A05/Integrity tabs. The normal page no longer calls or displays manual poll, canned preparation, reset, recurrence, technical-fault selection, or per-rule clock controls. Desktop controls and a mobile `Controles` drawer share one implementation. The adversarial pass found that `Nuevo experimento` initially created immediately and did not expose the approved reproducible start settings or confirmation. It now opens a backdrop-cancellable dialog, records start time/speed/frequency, explains history preservation, and creates the experiment paused without polling.

**Recovery 3d result:** Complete after two improvement passes. A02 now provides quick dispatch plus editable connected dispatch fields for SKU, unique code, description, quantity/unit, origin, destination, and OT; origin/destination influence controls; active desktop rows/mobile cards; row-specific pending markers; real receipt/cancel/reject actions; row inspection; and durable read-only history keyed by each movement ID across experiments. The first pass removed invalid influence authority from receipt and dispatch. The second replaced template-only editing, current-record-only history, and alert-global pending state with validated business inputs, cross-experiment event history and filters, and per-record poll acknowledgement.

**Recovery 3e result:** Complete after two improvement passes. A03 provides quick OT start and an editable start dialog for OT code, operation, and machine; independent active rows/cards; first-consumption, closure, and cancellation actions; inspection; and durable cross-experiment history keyed by the real work-order ID. Quick start prefers an inactive connected OT, while source-valid identifiers and machine exclusivity remain enforced at the connected source boundary.

**Recovery 3f result:** Complete after two improvement passes. A05 provides produced/remnant declaration with editable reel code, SKU, and source OT; independent weighing and movement actions; source-OT closure; A02 handoff; current rows/cards; inspection; and durable cross-experiment history keyed by the real reel ID. The selected serial is used throughout handoff and the generated A02 movement receives its own tracked identity. History keeps declaration, weighing, and departure events separate and does not incorrectly treat weighing alone as final departure.

**Recovery 3g result:** Complete. Row inspection keeps expected behavior in a separate column from actual Monitor state and exposes incident lifecycle/occurrence, evidence, recipients and delivery IDs, conversation/card IDs, cursor, detection delay, related-incident warning, and mismatches. Authorized administrative closure requires a reason and comment, warns that source state is unchanged, and uses the existing incident service; operational history remains read-only.

**Recovery 3h result:** Complete after one improvement pass. Integrity now exposes one understandable failed-next-poll action, captures before/current incident and downstream counts, and reads immutable structured snapshots created through the existing experiment repository. Snapshot API coverage and the existing failed-read/recovery suites prove preservation and idempotent healthy recovery. The adversarial pass removed a misleading unloaded snapshot count and prevents capture or fault arming against a completed experiment.

**Recovery 3i result:** Complete after two improvement passes. The interface now covers loading, busy, empty, pending, paused, running, completed, and failure states; desktop tables become mobile cards; shared controls move to a keyboard-dismissible mobile drawer; dialogs and tabs expose semantic roles; horizontal overflow is absent at the tested desktop and 390-pixel mobile widths. The first browser pass caught a crash when an already-running API process temporarily lacked the new `records` field, so the client now normalizes that transition safely. The second caught completed experiments presented as paused and actionable plus a cramped mobile header; completed actions are now disabled and labeled accurately, and the mobile composition was corrected. A clean new browser page reported no console warnings or errors.

**Recovery 3 corrective review:** The initial completion claim was challenged and found three real omissions: editable creation exposed only template selection, history showed only current experiment rows, and pending state was alert-global. The corrective pass closes all three without creating a parallel application or history store. Source-action contract `1.1.0` records the expanded editable mutation surface; durable experiment events remain the single history source. A final usability pass replaced raw source identifiers with selectors populated from the connected records, retained free editing only for true business values, and translates stale-reference and duplicate-identity conflicts into actionable operator guidance.

**Recovery 3 final decision:** Complete after the corrective review and usability pass. The API suite passes 57/57, the detection suite passes 25/25, web/API/detection type checks pass, the web production build passes, and `git diff --check` passes. A fresh connected browser review verified the changed creation and history dialogs at the default desktop viewport and at 390 × 844: source selectors showed understandable connected values, labels remained persistent, dialogs had no horizontal overflow, and the mobile layouts remained usable. Recovery 4 has not started. All Recovery 3 changes remain uncommitted and unpushed for review.

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

#### Approved Recovery 4 substeps

1. **Recovery 4a — Preserve useful validator assertions.** Move every unique useful assertion owned only by the rejected checkpoint validator into the current focused suites. Exit: the old validator owns no unique required coverage.
2. **Recovery 4b — Migrate legacy callers.** Move scenario, conversation, Phase 4, Phase 5, chain, and browser regressions from reset, trigger, canned preparation, legacy correction, recurrence, and per-code time advancement to versioned source actions, experiment runtime, or an explicitly bounded simulator-only fixture. Exit: no current regression depends on obsolete Stage 5 behavior.
3. **Recovery 4c — Remove destructive repair simulation.** Replace `inject-monitor-fault` and its row deletion with the durable interruption/recovery contract, then remove the route and its obsolete shared-path requirement. Exit: downstream repair remains proven without deleting Monitor-owned rows.
4. **Recovery 4d — Retire or isolate legacy endpoints.** Remove unused legacy routes and web clients; keep direct poll and fault helpers only behind an explicit test-only boundary; preserve `monitor_sim_*` until the Phase 6 replacement gate. Exit: normal application behavior cannot invoke the obsolete workflow.
5. **Recovery 4e — Retire obsolete executables and audit coverage.** Remove or make non-runnable the rejected canonical validator and orphan evidence finalizer, reserve `validate:phase6-stage5` for the later complete validator, and verify caller and coverage closure. Exit: no obsolete executable entry remains and no required test was silently lost.

**Recovery 4a result:** Complete after one adversarial pass. The rejected validator's assertion families are already owned by current focused suites: declaration and ledger validators own exact test accounting; fixture contracts and the fixture runner own deterministic setup and restoration; source-isolation owns source/Monitor separation and read failures; scheduling owns automatic cadence, pause, overlap, and restart; recovery owns interruption and idempotent downstream repair; API and routing regressions own authorization, conversations, cards, and recipients. Its A02/A03/A05 case bodies are rejected checkpoint execution, not accepted proof to copy; the V2 declaration and later Step 8C remain their execution owners. The adversarial pass challenged whether direct assertions should be copied merely because they exist and rejected that approach because it would preserve the obsolete canned workflow and duplicate stronger current owners. No required assertion remains uniquely owned by the rejected validator.

**Recovery 4b result:** Complete after two improvement passes. Legacy scenario helpers used by focused regressions now live under the explicit `/api/dev/test/scenarios/:code/*` boundary; the normal route namespace no longer hosts their callers. The connected browser and chain runners use the experiment runtime for shared time advancement, and the Phase 4 regression uses versioned source actions for correction. The first adversarial pass found that scheduling, recovery, browser-runtime, and fixture contracts still encoded pre-V2 immediate start, inverted speed, per-rule frequencies, and source-action contract `1.0.0`. They now use paused creation, explicit resume, seconds per simulated minute, one shared polling frequency, and contract `1.1.0`. The second found that shared automatic polls contaminated recovery assertions that were intended to isolate one A02 interruption; those checks now advance the shared clock without a due automatic cycle and invoke the explicitly test-only A02 poll. Scheduling passes 9/9, recovery passes 6/6, fixture validation passes 17/17 plus all 34 contracts across 37 lanes, and the Phase 5 routing and Phase 6 Stage 4 regressions pass.

**Recovery 4c result:** Complete after one adversarial pass. The `inject-monitor-fault` route and every active caller/assertion were removed. Downstream repair remains owned by the durable interruption suite, which preserves committed state and proves later idempotent repair without deleting conversations or alert messages. The shared-path guard now rejects reintroduction of the destructive route and requires the durable `after_incident_commit` interruption contract. The adversarial pass searched active application and script sources for the route, fault name, and its two deletion statements; no executable occurrence remains outside the rejected validator awaiting removal in Recovery 4e. The focused shared-path test passes.

**Recovery 4d result:** Complete after one adversarial pass. Reset, trigger, canned preparation/population, legacy correction, per-code advancement, recurrence, direct poll, and next-poll fault helpers are absent from the normal `/api/dev/scenarios/:code/*` action namespace. Still-useful focused regressions call them only through `/api/dev/test/scenarios/:code/*`; the approved Integrity action is the sole web client of that boundary and exposes only the understandable one-shot failure action. The unused broad `scenarioAction` client and replaced unversioned source-action tombstone were removed. The adversarial pass confirmed no normal route or web client can call the legacy actions, while `monitor_sim_*` tables, migrations, and fallback implementation remain preserved until the Phase 6 replacement gate.

**Recovery 4e result:** Complete after one adversarial pass. The rejected `validate:phase6-stage5` package command, its shell and TypeScript runners, the rejected V1 acceptance manifest, and the orphan browser-evidence finalizer were removed from the active tree; Git history remains their historical record. A current guard now requires those files and the canonical command binding to remain absent, while preserving the dedicated declaration, fixture, chain, ledger, isolation, scheduling, recovery, browser-harness, and browser-evidence commands. The adversarial caller scan found no active reference outside the guard and this historical record. The canonical name is intentionally unbound until the later complete validator exists.

**Recovery 4 final decision:** Complete. API tests pass 57/57, detection tests pass 25/25, scheduling passes 9/9, recovery passes 6/6, source isolation passes 16/16, declarations pass 11/11, fixture checks pass 17/17 and validate all 34 contracts across 37 lanes, chain checks pass 13/13 plus the connected rehearsal, ledger checks pass 5/5, browser harness passes 3/3 plus 3/3 runtime tests, and browser-evidence checks pass 9/9. Phase 5 routing and Phase 6 Stage 4 regressions pass; web/API/detection type checks, the web production build, and `git diff --check` pass. Recovery 5 and its baseline restoration have not started. All Recovery 3–4 changes remain uncommitted and unpushed.

### Recovery 5 — Prove the correction without accepting Step 8 yet

**Purpose:** Catch implementation defects before creating expensive browser evidence.

**Work:**

- Run focused V2 interface tests.
- Rerun any Step 4–7 checks whose owned code changed.
- Run the source-action, scheduler, recovery, API, Dashboard, Chat, accessibility, responsive, build, and restoration checks affected by the correction.
- Restore and verify the protected development baseline.

**Done when:** Every affected focused check passes and the source baseline is restored. This stage still does not accept Step 8.

#### Approved Recovery 5 substeps

The user preauthorized the complete sequence without the skill's usual split-approval pause. Five units are retained after count calibration. Merging them would combine distinct static, connected-runtime, cross-phase, browser/UI, and destructive-restoration failure boundaries; splitting further would duplicate command ownership without producing a more meaningful independently verifiable result.

1. **Recovery 5a — Prove static and unit contracts.** Run changed web, API, and detection unit suites; Stage 5 declaration, fixture, chain-capture, ledger, browser-harness, and browser-evidence contract tests; and type checks. Exit: changed contracts and evidence foundations pass without relying on connected browser acceptance.
2. **Recovery 5b — Prove connected source and runtime behavior.** Run the connected chain rehearsal, source isolation, scheduling, and durable recovery suites against the corrected experiment contract. Exit: real source identities, automatic shared-clock polling, isolation, and idempotent recovery pass without obsolete normal routes or destructive repair.
3. **Recovery 5c — Prove API and cross-phase regressions.** Run the complete API suite plus the affected Phase 5 routing and Phase 6 Stage 4 connected regressions. Exit: V2/API changes preserve conversations, routing, incidents, Dashboard and Chat data paths, and the earlier connected boundary.
4. **Recovery 5d — Prove the focused V2 browser/UI boundary.** Run focused V2 browser-runtime/harness checks, web tests, production build, static accessibility/responsive/obsolete-control checks, and a clean connected desktop/mobile browser review with console inspection. Exit: the approved V2 surface is usable and clean at representative desktop and mobile sizes; no Step 8 evidence is accepted or reused.
5. **Recovery 5e — Restore and independently verify the protected baseline.** Reset from the immutable protected dump, then separately run pristine-baseline validation, operational health, driver, and query-plan checks; verify Git diff integrity and the Recovery 5 evidence boundary. Exit: the source baseline is pristine and independently verified, every affected focused check passes, and Recovery 6 remains not started.

**Recovery 5a result:** Complete. Web tests pass 25/25, detection tests pass 25/25, focused changed API tests pass 29/29, declarations pass 11/11, fixture checks pass 17/17 and validate all 34 contracts across 37 lanes, chain-capture tests pass 13/13, ledger checks pass 5/5, browser-harness checks pass 3/3 plus 3/3 runtime tests, browser-evidence checks pass 9/9, and web/API/detection type checks pass. No test was skipped. The adversarial review challenged whether connected-capable source and API tests could be mistaken for Recovery 5's coordinated connected proof; they cannot, because this unit's ledger validator explicitly created only a synthetic dry run and Recovery 5b separately owns connected chain, isolation, scheduling, and recovery behavior. No correction was required.

**Recovery 5b result:** Complete. The connected chain rehearsal passes 1/1, source isolation passes 16/16, shared-clock scheduling passes 9/9, durable interruption recovery passes 6/6, no test is skipped, and a following operational source-health check passes. The suites ran sequentially to avoid false interference through the shared protected runtime. The adversarial review identified that operational health does not prove a pristine source baseline; this is missing proof rather than an implementation defect, and Recovery 5e owns the destructive reset and independent baseline verification. No correction was required in this unit.

**Recovery 5c result:** Complete after two improvement passes. The complete API suite passes 57/57 and the Phase 5 multi-user routing regression passes. The initial Phase 6 Stage 4 rerun correctly failed because its fixed A02 fixture had been left terminal by a prior run; the regression mutated source fixtures without restoring them and therefore could not prove repeatability. The first correction added exact `finally` restoration for its A02, A03, A05, related work-order, material, and weighing records. Its first cleanup attempt then exposed an over-restrictive identifier guard that rejected valid MySQL column names containing digits; the second correction accepts only valid alphanumeric SQL identifiers. After resetting the already-contaminated source, the Stage 4 regression passes twice consecutively, Phase 5 routing still passes, and source health remains green. The repeated run proves cleanup rather than relying on a fresh dump to mask contamination.

**Recovery 5d result:** Complete. Focused web tests pass 25/25, the web type check and production build pass, obsolete manual-poll and fault-injection controls are absent, and `git diff --check` passes. A connected browser review at 1440×900 and 390×844 confirms all four V2 experiment tabs, the mobile controls drawer, and the new-experiment dialog work without horizontal overflow; the persistent floated labels remain in the shared position, visible controls retain the approved compact sizing, and browser warning/error logs are empty. The adversarial review challenged the compact 28-pixel controls and the absence of `name`/`autocomplete` on the two numeric experiment-setup fields. The compact sizing is explicit Monitor authority, while those local-only numeric controls neither identify a user nor benefit from browser autofill and already have associated persistent labels. Changing either would conflict with the approved interface or add no accessibility value, so no correction was required. This is focused regression proof only; it does not create or accept Step 8 browser evidence.

**Recovery 5e result:** Complete. With the application runtime stopped, the protected development source was rebuilt from the immutable dump. The reset's internal pre-unlock and baseline checks passed, and the separately invoked pristine-baseline validator then passed independently. Operational health, the application-driver probe, polling query-plan checks, container readiness, and the correctly unlocked `alertas_fake` and `monitor_source_ro` application accounts all pass. Final web and API type checks and `git diff --check` pass. Git contains only the authoritative plan update and the Stage 4 regression cleanup correction; ignored local runtime evidence remains outside the tracked change set. The adversarial review challenged whether the reset's own checks were being counted twice and whether the Stage 4 validator should be rerun after the final reset. They are not: the standalone baseline invocation is the independent proof, and the validator already passed twice consecutively before this final reset. Running it again would mutate a newly restored baseline without adding a distinct guarantee. No further correction was required.

**Recovery 5 final decision:** Complete. All five units meet their exits, the discovered non-repeatable Stage 4 cleanup defect is corrected and proved by two consecutive runs, the protected baseline is independently restored and verified, and no Step 8 evidence was created, reused, or accepted. Recovery 6 remains not started. Recovery 5 changes are uncommitted and unpushed.

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

#### Approved Recovery 6 substeps

The user preauthorized all six splits and their sequential execution without routine pauses. Each step retains four units after count calibration. Three would combine authoritative object proof, behavior or authorization, interaction/accessibility, and evidence closure; five would split shared viewport or artifact work without a distinct result. The 24 units below collectively cover Recovery 6 once, keep every surface in the same runtime, and reserve aggregate publication and restoration for Step 8.7.

##### Step 8.2 — Connected V2 laboratory

| Unit | Purpose and artifact | Dependency | Exit check | Status |
| --- | --- | --- | --- | --- |
| 8.2a | Bind the visible V2 laboratory to one fresh experiment and its exact source, poll, incident, route, delivery, conversation, message, and cursor chain. | Step 8.1 harness and Recovery 5 baseline. | Connected truth is visible without simulator or expected-counter substitution. | Complete |
| 8.2b | Exercise a pending connected operation and a failed read while preserving the last committed Monitor truth. | 8.2a exact chain. | Pending and untrusted states are explicit; a healthy poll restores confirmed state without object drift. | Complete |
| 8.2c | Verify tabs, history, controls, keyboard/focus, accessible names, reduced motion, overflow, console, and 1440/768/390 layouts. | 8.2a–8.2b states. | Structured checks and captures pass at all three viewports. | Complete |
| 8.2d | Stage and independently inspect the laboratory artifact set and exact references. | 8.2a–8.2c. | Every laboratory artifact belongs to the fresh runtime and is ready for 8.7 byte binding. | Complete |

##### Step 8.3 — Dashboard

| Unit | Purpose and artifact | Dependency | Exit check | Status |
| --- | --- | --- | --- | --- |
| 8.3a | Bind Dashboard and incident detail to the exact connected incident, routing, delivery, and cursor chain. | 8.2 connected chain. | Open state and detail match the same Monitor objects without fixture substitution. | Complete |
| 8.3b | Prove honest absence filtering and resolve the exact incident through the legal source action and scheduler path. | 8.3a open state. | The same incident resolves with no duplicate route, delivery, conversation, or message. | Complete |
| 8.3c | Verify chart/detail interactions, keyboard/focus, names, reduced motion, overflow, console, and 1440/768/390 layouts. | 8.3a–8.3b lifecycle states. | Dashboard interaction and responsive checks pass at all three viewports. | Complete |
| 8.3d | Stage and independently inspect Dashboard artifacts and provenance references. | 8.3a–8.3c. | Lifecycle, absence, detail, interaction, accessibility, console, and viewport evidence is complete for 8.7. | Complete |

##### Step 8.4 — Chat list

| Unit | Purpose and artifact | Dependency | Exit check | Status |
| --- | --- | --- | --- | --- |
| 8.4a | Bind the authorized list, ordering, unread state, alert metadata, and cursor to the exact conversation. | 8.2 chain. | The routed participant sees only the exact connected conversation and authoritative ordering. | Complete |
| 8.4b | Authenticate a nonparticipant and prove list and direct-detail denial without data leakage. | 8.4a authorized state. | Unauthorized access fails closed and exposes no connected or fixture content. | Complete |
| 8.4c | Verify filters, row/menu behavior, keyboard/focus, names, reduced motion, overflow, console, and 1440/768/390 layouts. | 8.4a–8.4b authorization states. | Chat-list interaction and responsive checks pass at all three viewports. | Complete |
| 8.4d | Stage and independently inspect Chat-list artifacts and provenance references. | 8.4a–8.4c. | Authorization, identity, interaction, accessibility, console, and viewport evidence is complete for 8.7. | Complete |

##### Step 8.5 — Chat detail

| Unit | Purpose and artifact | Dependency | Exit check | Status |
| --- | --- | --- | --- | --- |
| 8.5a | Bind detail to the exact conversation, alert message, incident, delivery, receipt, and cursors. | 8.4 authorized conversation. | The exact message loads, receipt state is authoritative, and no fixture message appears. | Complete |
| 8.5b | Verify alert jump/expansion, work-order copy target, message menu, and conversation search without object mutation. | 8.5a exact detail. | Every interaction targets the same alert message and preserves connected state. | Complete |
| 8.5c | Verify history/composer keyboard/focus, names, reduced motion, overflow, console, and 1440/768/390 layouts. | 8.5a–8.5b. | Chat detail remains accessible and usable at all three viewports. | Complete |
| 8.5d | Stage and independently inspect Chat-detail artifacts and provenance references. | 8.5a–8.5c. | Message, receipt, interaction, accessibility, console, and viewport evidence is complete for 8.7. | Complete |

##### Step 8.6 — Disconnect and reconnect

| Unit | Purpose and artifact | Dependency | Exit check | Status |
| --- | --- | --- | --- | --- |
| 8.6a | Capture the exact pre-disconnect runtime, object, authorization, ordering, read-state, and cursor baseline. | 8.2–8.5 accepted surfaces. | One complete invariant snapshot covers all four surfaces. | Complete |
| 8.6b | Perform real reload/socket reconnects on laboratory, Dashboard, Chat list, and Chat detail. | 8.6a baseline. | Every surface returns through the same runtime and connected data path. | Complete |
| 8.6c | Compare post-reconnect objects, cursors, authorization, ordering, read state, replay, and console output. | 8.6b reconnects. | Nothing is missing, duplicated, leaked, or mutated and applied-cursor replay is empty. | Complete |
| 8.6d | Stage and independently inspect four surface reconnect records plus one aggregate comparison. | 8.6a–8.6c. | Reconnect evidence carries the exact runtime and stable-object references for 8.7. | Complete |

##### Step 8.7 — Aggregate evidence and cleanup gate

| Unit | Purpose and artifact | Dependency | Exit check | Status |
| --- | --- | --- | --- | --- |
| 8.7a | Revalidate aggregate manifest semantics for required surfaces, viewports, evidence kinds, reconnect proof, and exact reference classes. | Step 8.1 contract and 8.2–8.6 artifacts. | Omission, unclean state, or incomplete exact-chain coverage fails closed. | Complete |
| 8.7b | Revalidate the serial aggregate command and its `finally` source-health behavior. | 8.7a semantics. | One command owns regressions, manifest validation, logs, and protected-source health. | Complete |
| 8.7c | Finalize the fresh manifest, execute the aggregate command, and preserve only this run's evidence. | 8.7a–8.7b. | Bytes, provenance, cleanup, tests, type checks, build, diff, and source health pass. | Complete |
| 8.7d | Run tamper, omission, reuse, and different-runtime attacks, then independently revalidate the untouched manifest and baseline. | 8.7c accepted run. | Every invalid variant fails; the original remains valid and the protected baseline is independently pristine. | Complete |

#### Recovery 6 execution and review record

- **Accepted run after second review:** `20260802-step8-recovery-v2-10`, experiment `7bdaa0cf-7df6-4824-a9a5-2d3b07417e2b`, with 37 byte-bound artifacts. It alone supplies the replacement evidence; `v2-1` through `v2-9`, including the formerly accepted but under-proved `v2-8`, are ignored diagnostics and are not counted.
- **8.2 second review:** The first accepted record contradicted itself: history dismissal was false in interaction evidence but true in accessibility evidence, and early artifacts inherited a receipt created later. A rejected attempt to synthesize pending source rows correctly produced independent alerts, proving that such rows cannot be used as a no-duplicate test. The improvement uses the laboratory's real pending connected-operation state and requires true keyboard dismissal, ordered approved tabs, failed/healthy count equality, normal scheduling, responsive bounds, accessible names, reduced-motion review, console-review provenance, and capture-time object-reference snapshots. Failed and healthy counts both remained exactly `1/1/1/1/1`.
- **8.3 second review:** The prior record asserted rather than proved chart interaction and singular lifecycle continuity. The improvement exercised the chart's selected state, honest empty search, detail keyboard dismissal, exact legal source action, normal scheduler resolution, and one incident/route/delivery/conversation/message chain; all three viewport bounds passed.
- **8.4 second review:** The prior record omitted filter results, ordering/cursor proof, and row-menu keyboard behavior. The improvement exercised Todas, No leídas, and Fijadas; proved cursor `1` ordering; dismissed the row menu with Escape; and reconfirmed that an active nonparticipant saw zero list/detail data, no operational text, and no composer.
- **8.5 second review:** The prior record did not exercise message-menu dismissal or conversation-search absence. The improvement bound the exact message and composite receipt, verified read and delivery counts, expanded the alert guide, copied OT `146293.2`, dismissed the message menu with Escape, proved the search empty state, and checked responsive element bounds.
- **8.6 second review:** The prior reconnect files were self-asserted booleans without a reproducible comparison. The improvement hashes a normalized runtime, incident, conversation, message, receipt/read, ordering, cursor, and replay snapshot before and after all four reloads. The digests are identical, authorization/order/read state is stable, and applied-cursor replay after cursor `3` is empty.
- **8.7 second review:** The validator previously accepted contradictory interaction records and temporally impossible receipt references. It now validates artifact-specific semantic claims, exact object binding, console-review provenance, reconnect digests, and receipt scope. The strengthened aggregate passed; omission, tamper, reuse, and different-runtime attacks all failed while the untouched manifest revalidated. The browser-result timeout remains configurable with a 90-minute default.
- **Independent closure:** The protected dump reset passed, followed separately by baseline, health, MySQL application-driver, polling-query, readiness, typecheck, focused 20-test scenario, production build, and Git diff-integrity checks. The build review found a validation-only `*.connected.ts` file entering the production API build; excluding that diagnostic class from `tsconfig.build.json` restored the intended build boundary without changing runtime behavior.

**Recovery 6 final decision:** Complete. The accepted replacement evidence uses the approved connected V2 laboratory and one exact runtime; the protected source is independently pristine. Stage 5 remains in progress and Step 8B has not started. Recovery 6 was subsequently committed and pushed at `5a9b28b`.

#### Final Recovery 1–6 checkup — 2026-08-02

| Recovery | Adversarial conclusion | Improvement made in this checkup |
| --- | --- | --- |
| 1 | The candidate classification still resolves to one active laboratory, route module, experiment runtime, and connected source boundary. Generated `apps/api/dist` was omitted from the original file register, but it is ignored build output, newer than its source, and contains the same isolated test-only routes rather than a second authority. | Recorded this bounded generated-output check; no source classification changed. |
| 2 | The single-authority structure remains correct, but the roadmap, Phase 6 README, supporting V2 handoff wording, and this plan's checkpoint metadata had not advanced after Recovery 6. | Updated those current-status pointers to say Recovery 1–6 is complete, replacement Steps 8.2–8.7 passed, and Step 8B is next. Historical descriptions of what Stage 4 originally connected remain unchanged. |
| 3 | The V2 contract and connected UI still match: paused creation, integer speed 1–60, one frequency 1–99, shared automatic clock, four tabs, source-valid actions, history, snapshots, Integrity, administrative closure, responsive behavior, and separated expected/actual evidence. Web tests pass 25/25; web typecheck and build pass; detection tests pass 25/25. | No implementation change required. Browser evidence, rather than a parallel synthetic component harness, remains the authoritative connected UI proof. |
| 4 | Rejected executables, the misleading canonical validator, the destructive fault route, and normal-path legacy actions remain absent. Remaining legacy helpers are confined to `/api/dev/test/scenarios` and still have named regression callers. API tests pass 57/57; Phase 5 routing and Phase 6 Stage 4 regressions pass. | No implementation change required; broader deletion would remove useful isolated regression support. |
| 5 | Declarations pass 11/11, fixture checks pass 17/17 across all 34 contracts and 37 lanes, chain checks pass 13/13 plus the connected rehearsal, ledger checks pass 5/5, isolation and restoration pass, scheduling passes 9/9, recovery passes 6/6, browser harness passes 3/3 plus 3/3 runtime tests, and browser-evidence checks pass 10/10. Independent baseline, health, driver, query-plan, API typecheck/build, and diff checks pass. | No implementation change required. The protected source was left at its independently verified baseline. |
| 6 | The exact `20260802-step8-recovery-v2-10` manifest and 37 byte-bound artifacts remain intact. The serial aggregate gate re-passed, including omission, tamper, reuse, different-runtime, regression, typecheck, build, diff, and protected-source-health checks. | Corrected checkpoint/status documentation only; no new browser run or evidence substitution was created. |

## Part B — Work after recovery

Recovery does not replace the rest of Stage 5. It returns the project to the point immediately before Step 8B.

| Remaining step | Outcome | Required approval or stop |
| --- | --- | --- |
| 8B | Add passive Dashboard and Chat previews to the approved laboratory and review them with the user. | Complete. Focused human acceptance and automated passivity evidence were recorded on 2026-08-02. |
| 8C | Execute the exact 34 connected acceptance cases and produce final result records. | All 34 must pass; no failures, skips, extras, or excluded cases. |
| 9 | Run the complete finished version twice from clean starting states. | Both runs must pass without changing the tested version or reusing evidence. |
| 10 | Review all final evidence and decide whether Stage 5 is genuinely complete. | Stop with documentation uncommitted for user review. |
| 11 | Commit and push the completed Stage 5 branch. | Separate explicit commit and push authorization; no merge. |
| 12 | Review and merge Stage 5 into `main`. | Separate explicit merge approval and separate approval before pushing `main`. |

### Step 8B — Add passive Dashboard and Chat previews

**Purpose:** Let the user watch the real Dashboard and Chat results beside the laboratory controls without creating a second Dashboard or Chat implementation.

**Work:**

- Add a read-only Dashboard preview showing the real Monitor incidents from the selected experiment.
- Add a read-only Chat preview showing the real alert messages and recipients for the selected transaction.
- Read existing Monitor information; do not recalculate Dashboard or Chat business rules inside the laboratory.
- Prevent the previews from sending messages, changing incidents or routing, marking conversations read, creating receipts, changing presence, or changing source state.
- Compare the relevant Monitor records before and after loading, refreshing, changing selections or identities, and switching preview surfaces to prove the previews caused no change.
- Perform one focused human review and record the user's acceptance or the exact correction required.

**Done when:** Both previews show the correct connected information, automated checks prove no side effects, and the user accepts the integration.

**If a defect is found:** Correct it, rerun the affected Step 8 check, and repeat the focused human review. Do not continue to Step 8C with an unresolved mismatch.

**Focused human acceptance — 2026-08-02:** The user explicitly accepted the Step 8B implementation and UI changes. This satisfies the focused human-review requirement for the reviewed version. The user subsequently decided that technical identifiers and direct links are unnecessary in the preview; Step 8C must record that traceability in its evidence instead.

**Automated passivity evidence — 2026-08-02:** Repeated alert-preview opening, refresh, A02/A03/A05 selection changes, identity changes, session reads, Dashboard reads, and authenticated socket open/resume/disconnect left the complete Monitor table snapshot unchanged. A non-administrator remains unable to access the laboratory message projection. The connected run also left checksums unchanged for all five reset-managed `test_database` tables: `articulo_serial`, `balanza_carga_detalle_registros`, `flujo_materiales_detalles`, `orden_trabajo_materiales`, and `ordenes_trabajo`. Focused frontend checks confirm that preview selection and surface switching remain local and that the alert preview exposes only the read-only scenario-message API.

### Step 8C — Execute the exact 34 connected acceptance cases

**Purpose:** Produce the first complete, reviewable Stage 5 acceptance result set after all required capabilities exist.

**Work:**

- Start from the verified clean development baseline.
- Execute exactly 34 approved cases: 11 shared cases, 9 A02 cases, 6 A03 cases, and 8 A05 cases.
- Do not run or substitute the excluded cases `A02-08`, `A03-06`, or `A05-07`.
- Give each case its own experiment, setup, result, cleanup, and restoration proof.
- Trace each applicable result from the laboratory action, through the changed source record and read-only Monitor read, to the incident, routing, Dashboard, conversation, message, and Chat result.
- Record the applicable incident, conversation, message, delivery, receipt, and update-position identifiers, together with direct Dashboard and Chat URLs, in the machine-readable and human-readable evidence rather than displaying them in the Step 8B preview.
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
