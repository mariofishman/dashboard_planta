# Alert Catalog Iteration History

**Status:** Historical; the current authority is `docs/product/alert_catalog.md`.

## Changes from iteration 1

- Former `A01` and `A02` were merged into new `A01` with 60-minute readiness and 30-minute dispatch checkpoints.
- Former `A03` became new `A02` with a confirmed 30-minute transit threshold.
- Former `A04` moved to `B01`; former `A05` became `A03` with a 15-minute threshold.
- Former `A06` and `A07` became `D01` and `D02`.
- Former `A08` was removed because truncation is normal production.
- Former `A09` became `A04`; `A10` and `A11` became `A05`; `A12` and `A13` became `A06`.
- Former `A14` was removed; its useful conditions are covered by `A05` and `A02`.

## Iteration 3

- Added resolution behavior for rescheduling readiness and plan incidents.
- Clarified A05 weighing and movement as OR conditions.
- Removed unsupported generic process-loss subtraction from A04 and D03.
- Documented ERP sources for estimates, statistics, and quotation waste baselines.
- Clarified waste weighing as OT balance and improvement evidence.
- Removed C03, C04, and C05 after ERP review.
- Corrected C06 timestamps and pauses.
- Added operation-specific candidates for review.

## Iteration 4

- Clarified A01 as one incident with two checkpoints.
- Named Miraflex in the C06 example.
- Set the initial D03 tolerance to 5% of good-production mass.
- Replaced generic extrusion candidates with container-workflow rules.
- Removed operation-specific duplicates already covered by A, C, or D rules.
- Reduced Exlam and sealing candidates to unique reconciliation ideas.

## Iteration 5

- Corrected E01 safety-warehouse and container terminology.
- Kept E04 separate because a wrong resin mix can pass D03.
- Applied E04 to Extrusion and Exlam.
- Temporarily generalized A04 to reels or bags.
- Removed an unsupported package-count candidate.

## Iteration 6

- Limited A02 to reserved material moving toward an OT.
- Restored A04 to possible undeclared produced reels; bags were excluded.
- Changed the E01 horizon from 24 hours to 4 hours while retaining the 3-hour checkpoint.
- Removed bag-production declaration from A04.

## Iteration 7

- Added routing through OT, machine, operation, shift, named operator, and machine warehouse.
- Added distribution rules to alert cards.
- Required runtime person resolution instead of notifying every user in a zone.
- Added review examples that were never hard-coded recipients.

## Iteration 8

- Consolidated distribution into seven general rules and code-specific exceptions.
- Replaced personal names with positions.
- Reclassified A03 as a warning closing on first consumption and documented `WorkOrder.readOnlyInput`.
- Added A07.
- Proposed an adjustment queue, later superseded by the read-only architecture.

## Iteration 9

- Clarified A04 and A05 treatment of remnant reels.
- Added D04.
- Applied E01–E04 to Extrusion and Exlam.
- Added a distribution role glossary.

## Iteration 10

- Standardized `material planner`.
- Removed redundant owner/role names.
- Combined movement, scale, and work-in-process duties under `process-team operator`.
- Defined deterministic primary-action-owner mappings; no LLM selects recipients.

## Iteration 11

- Added E05 for impossible negative calculated consumption.
- Gave E05 precedence over derivative E04 and D03 calculations.
- Required E05 to enrich an existing E03 incident when both prove the same opening-inventory error.

## Publication

- Published the approved catalog under `reviews/alert-catalog/publication/`.
- Named the routing master table the Operational Responsibility Roster.
- Required an administration UI with assignment history, temporary replacements, validity periods, and conflict warnings.
