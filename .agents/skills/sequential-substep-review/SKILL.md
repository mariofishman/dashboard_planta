---
name: sequential-substep-review
description: Analyze one approved plan step, calibrate and criticize the proposed substep count, propose the exact number of small, self-contained, independently verifiable units it conceptually requires, wait for user approval, then execute them sequentially, criticize and improve each unit, update the single authoritative plan, and stop before a named boundary. Use when the user asks to repeat the approval-gated implement-review-decide workflow used for phased substeps such as 5.1 or 5.2.
---

# Sequential Substep Review

Execute one approved plan step without losing review gates between its smaller units.

## Establish the boundary

1. Read the complete authoritative plan step, its exit conditions, adjacent dependencies, and the current worktree state.
2. Split the step into as many units as its concepts and result boundaries require. Apply no preset minimum or maximum.
3. Make every unit small enough to implement and review correctly in one focused cycle, while remaining self-contained and producing a meaningful result with an independent validation boundary.
4. Split again when a proposed unit contains separable concepts, artifacts, failure modes, or exit checks. Keep work together when separating it would create an incomplete or untestable intermediate state. Do not split by arbitrary file count.
5. Calibrate the proposed count before presenting it:
   - If it exceeds five, ask whether it is over-split. Try merging adjacent units, and keep the larger count only when each retained boundary protects a distinct concept, failure mode, or validation result.
   - If it is two or fewer, ask whether it is under-split. Try separating independent concepts, and keep the small count only when additional boundaries would create incomplete or artificial units.
   - Repeat this criticism and revision until another iteration would reduce correctness or create arbitrary boundaries.
6. Name units by extending the plan number, such as `5.2a`, `5.2b`, and onward.
7. State the exact proposed count, the count-calibration criticism, and each unit's purpose, artifact, dependency, and exit check. Verify that the complete set collectively satisfies the parent step's exit conditions without gaps or duplicated work.
8. Stop and wait for explicit user approval of the proposed split. Do not edit the authoritative plan or begin implementation before approval.
9. After approval, record the split only in the single authoritative plan. Do not create a duplicate plan or status document.

## Execute each unit

For each unit, in order:

1. Re-read its approved scope and inspect the target plus one level of surrounding architecture.
2. Implement only that unit. Preserve unrelated user changes and do not commit or push without explicit authorization.
3. Run the narrowest deterministic checks that prove the unit, followed by proportional integration checks.
4. Criticize the result adversarially:
   - identify the strongest realistic weakness;
   - challenge assumptions against the authoritative plan and nearby implementation;
   - distinguish missing proof from an implementation defect.
5. Decide explicitly:
   - improve the same unit when the criticism exposes a material weakness; or
   - advance when remaining limitations belong to a later approved unit and are guarded by the current contract.
6. If improving, apply one concrete correction, rerun affected checks, and review again. Stop after four improvement passes and report any unresolved limitation.
7. Update the authoritative plan with implemented behavior and validation evidence.
8. Give the user a concise criticism and decision before advancing. If the user preauthorized the full sequence, continue without requesting routine approval.

## Stop conditions

Stop immediately when:

- a product or business decision is missing;
- the planned unit conflicts with current authority or architecture;
- a destructive or externally binding action needs new authorization;
- validation cannot establish the unit's exit condition; or
- the requested stopping boundary has been reached.

At the final boundary, verify the worktree, run a final proportional check, summarize every completed unit and improvement decision, and state clearly that the next plan step was not started.
