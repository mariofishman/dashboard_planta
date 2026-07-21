# Phase 4 incident edge cases

Ordinary path: a complete healthy local cycle evaluates A02, A03, or A05; a triggered condition creates or updates one incident and its evidence; a clear condition resolves it; the database commits the incident, transition, and change event together; only then is the live event published; the dashboard and detail view read the same committed record.

| Priority | Scenario | Expected behavior | Verification |
|---|---|---|---|
| P0 | First triggered observation | Create one open incident, evidence, opening transition, and change event | Automated lifecycle test |
| P0 | Same condition remains triggered | Update the existing occurrence and add evidence; do not duplicate it | Automated deduplication test |
| P0 | Complete healthy clear observation | Resolve the open occurrence automatically | Automated resolution test |
| P0 | Insufficient, failed, stale, partial, or truncated cycle | Preserve the incident; never infer resolution | Evaluator and Phase 3 recovery tests |
| P0 | Condition returns after resolution | Create a new occurrence, preserving the earlier history | Automated recurrence test |
| P0 | A05 has one or both valid reasons | Keep one incident per reel and record the current reasons | Evaluator test |
| P0 | A02 and A05 refer to the same OT | Correlate for navigation but do not merge distinct problems | Automated correlation test |
| P0 | Database transaction fails | Publish no WebSocket event | Post-commit publication test |
| P0 | Simultaneous evaluations of one condition | Database uniqueness prevents duplicate open occurrences | Schema constraint and service test |
| P1 | Client disconnects during a change | Recover committed changes from the API using the event cursor | API/WebSocket test |
| P1 | Filters return no rows | Show a useful empty state and preserve filter controls | Browser test |
| P1 | Narrow screen or wide evidence | Reflow panels; contain horizontal scrolling inside the table | Mobile browser test |
| Later | Human closes without resolution | Phase 7 administrative workflow, not Phase 4 | Roadmap gate |
| Later | Real EmusaSoft timing, load, freshness, and auth | Phase 10 integration | External gate |

The main remaining blind spot is production data behavior. Local fixtures prove Monitor's decisions and state handling, but Phase 10 must confirm that current EmusaSoft fields, timestamps, and read permissions satisfy the same contracts.
