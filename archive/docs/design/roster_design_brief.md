# Operational Responsibility Roster design brief

## User problem

Alerts must reach a named person based on the position responsible at the incident time. Missing, overlapping, or outdated assignments must be visible before they cause silent routing errors.

## Primary users

Authorized plant administrators maintain assignments. Supervisors review coverage and history. Ordinary recipients can see why they were included but cannot change assignments without permission.

## Required workflows

1. Filter by plant, operation, machine, shift, position, person, and effective date.
2. Create an effective-dated assignment with optional machine scope.
3. Add a temporary replacement without deleting the original history.
4. Detect missing and overlapping assignments before save.
5. Resolve a conflict explicitly and preserve both prior records in audit.
6. Inspect which assignment and ERP evidence produced an incident recipient.

## Data and rules

Assignment key: plant + operation + optional machine + shift + standardized position + validity interval. Store `sysUserId`, effective start/end, replacement relationship, reason, creator, timestamps, and immutable audit transitions.

No LLM selects recipients. Alert code and reason choose standardized positions; the roster resolves the person at the effective incident time. Ambiguity fails visibly and notifies the routing owner; it never broadcasts to all warehouse users.

## UX and accessibility

Use a dense Material UI table plus a side panel or dialog for editing. Show explicit missing/conflict labels, overlapping dates, keyboard-accessible date controls, confirmation for truncating an effective interval, mobile reflow, and an audit timeline. No layout is approved by this brief; prototype review remains required before implementation.
