---
name: monitor-alert-rule-workflow
description: Audit and prepare exactly one Monitor alert code on one dedicated branch through authority review, sequential business-rule approval, catalog and alertas_fake scenario specification updates, deterministic standalone laboratory implementation, tests, and evidence classification. Use when asked to audit, dry-run, define, prepare, validate, or implement one alert such as "Use $monitor-alert-rule-workflow for A01."
---

# Monitor Alert Rule Workflow

Process one alert code without crossing the repository's phase gates or evidence boundaries.

## Enforce the request boundary

1. Extract alert codes matching `[A-E][0-9]{2}` from the request.
2. Continue only when exactly one unique code is present. If there are zero or multiple codes, ask for exactly one code and stop.
3. Read `AGENTS.md`, `docs/README.md`, and the alert's phase assignment in `docs/roadmap.md` before editing.
4. Derive the required branch as `codex/phase<phase>-<lowercase-alert-code>-laboratory`. Require the exact derived name, not merely a name matching `^codex/phase[0-9]+-[a-e][0-9]{2}-laboratory$`.
5. Verify the current worktree, branch, status, and branch-specific diff. If the branch name does not match exactly, stop without editing and provide this exact rename instruction with resolved values:

   ```bash
   git branch -m codex/phase<phase>-<lowercase-alert-code>-laboratory
   ```

   For A01 in Phase 7, provide exactly `git branch -m codex/phase7-a01-laboratory`. Do not rename or switch the branch for the user.
6. Require one dedicated alert branch for any alert-specific work:
   - compare the branch with its base and inspect existing uncommitted changes;
   - continue only when no alert-specific work for another code exists;
   - if work for another code exists, stop and request a clean dedicated branch;
   - never add a second alert's catalog, specification, fixture, test, or implementation changes to the branch.
7. Allow maintenance of this reusable skill without an alert-dedicated branch, but do not perform an alert audit or create an alert-specific artifact during that exception.

## Apply the authorization boundary

Invoking this skill for one alert authorizes its audit, authoritative documentation, phase-specific scenario specification, and standalone deterministic laboratory implementation after its business rules are approved.

It does not authorize connected `test_database`, Monitor polling or incident lifecycle, Dashboard, Chat, staging, or production integration. It also does not authorize claiming that a blocked phase has started, advanced, or passed.

## Establish the alert context before asking questions

1. Determine the assigned phase from `docs/roadmap.md`, using the alert-code phase section and implementation/promotion matrix. Do not infer phase status from a specification or test report.
2. Read the complete catalog entry and shared lifecycle/routing rules in `docs/product/alert_catalog.md`.
3. Read every relevant authority, contract, test, and implementation file before asking a question. For a large shared authority, read the complete alert-specific section and every shared section that governs lifecycle, routing, evidence, or delivery. Include:
   - `docs/product/product_definition.md`;
   - `docs/architecture/system_architecture.md`;
   - the assigned phase README, if it exists;
   - the active phase README and phase gate;
   - `docs/integrations/emusasoft/integration_register.md` when a source or production dependency is involved;
   - relevant files under `docs/architecture/contracts/`.
4. Inspect existing rule contracts, source mappings, fixtures, tests, laboratory code, evaluator code, routing code, migrations, and reports by searching for the alert code, query ID, natural key, reason codes, and source names. Read every relevant match before drawing conclusions.
5. If the alert scope changes a Monitor UI, read the complete UI authority set named in `AGENTS.md`, the shared design-system defaults, and the current implementation before designing or editing it.
6. Treat archived files and earlier review iterations as history only unless a current authority explicitly incorporates them.
7. Build a private checklist of documented facts, conflicts, missing evidence, and unresolved business decisions. Do not ask for information already answered by current authority or implementation.

## Resolve business decisions sequentially

1. Identify the highest-impact unresolved business decision that blocks a deterministic scenario or rule.
2. Ask one concise question about that decision only.
3. Wait for the user's answer. Do not combine decisions, implement speculative behavior, or ask for overall approval.
4. After each answer, reconcile it against the remaining open decisions and repeat one at a time.
5. Record an approved rule once; do not ask the user to approve the same decision again.

## Maintain authority without duplication

After the relevant decisions are approved:

1. Record approved business rules in `docs/product/alert_catalog.md`. Keep detection meaning, business thresholds, resolution, administrative closure, correlation, and routing authority there.
2. Record laboratory preparation in `docs/delivery/phases/phase<N>/alertas_fake_scenario_specification.md`, where `<N>` is the assigned roadmap phase.
3. Copy the alert block from `assets/alert_specification_template.md` and preserve every heading exactly.
4. Use scenario identifiers `<ALERT_CODE>-<NN>`, with a two-digit sequence starting at `00`, for example `A01-00`. Keep identifiers unique within the alert block; never reuse an identifier for a different scenario.
5. In the phase specification, reference catalog rules instead of restating their detailed prose. Record only laboratory scenarios, expected results, automated test references, source mappings, blockers, deferred connected tests, and the approval record.
6. Separate verified facts, approved decisions, assumptions, blockers, and deferred work explicitly.
7. Keep the phase specification labeled as supporting preparation. It cannot start or complete a phase, satisfy a phase gate, or prove integration.

## Gate implementation

Implement deterministic standalone laboratory logic and tests only after the applicable business rules are approved and recorded.

1. Use controlled fixtures, a deterministic clock, stable identifiers, and repeatable reset behavior.
2. Exercise trigger, non-trigger, boundary, persistence, duplicate prevention, correction, automatic resolution, administrative closure, recurrence or its documented inapplicability, correlation, insufficient evidence, and failed-cycle preservation where applicable.
3. Do not invent source behavior. If the source workflow is unverified, record a blocker and defer the connected scenario.
4. Do not bypass the normal Monitor poller or write Monitor incidents directly when connected work is later authorized.
5. When the assigned phase is blocked, treat the authorized audit, documentation, scenario specification, and standalone deterministic laboratory as preparation only. Do not change phase status or claim that the phase has started, advanced, or passed.

## Classify evidence

Report each result under exactly one boundary:

- standalone deterministic laboratory;
- connected `test_database` source boundary;
- connected Monitor polling and incident lifecycle;
- Dashboard;
- Chat;
- production or Phase 10.

Never use success in one boundary as evidence for another. Synthetic expectations are not connected evidence. Local MySQL does not prove Aurora, replica, load, credentials, staging, or production behavior.

## Validate and stop for review

1. Validate the alert block before describing it as structurally ready for integration review:

   ```bash
   npm run validate:alert-specification -- docs/delivery/phases/phase<N>/alertas_fake_scenario_specification.md <ALERT_CODE>
   ```

2. Run the relevant rule-contract, fixture, unit, integration, type, and build validations that exist for the changed scope.
3. Report every failure, skipped test, blocker, and untested evidence boundary honestly.
4. A passing specification validator proves only required structure and scenario-ID validity. It does not approve rule content or prove any connected boundary.
5. Show the changed files and results, then stop for user review before committing or pushing. Upfront commit or push authorization does not replace this review checkpoint; act only after the user reviews the completed alert scope and explicitly continues.

## Resources

- `assets/alert_specification_template.md` — canonical reusable per-alert section structure.
- `scripts/validate_alert_specification.py` — deterministic structure and scenario-ID validator; run with `--self-test` when changing the validator.
