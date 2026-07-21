# EmusaSoft and MCP Requests — Traceability Table

**Owner:** Product Owner
**Nature:** modeling and delivery-traceability deliverable — a Product Owner phase, not an architecture artifact. Populating state, contract versions, and mapping the referenced ERP/GraphQL types requires product and domain knowledge, not architectural decisions.

**Purpose:** operational traceability for the requests defined in `emusasoft_preimplementation_requests.md`. This artifact holds mutable delivery state only. It never redefines a request — the request contract lives in the pre-implementation register and the approved model lives in `emusasoft_integration_architecture.md`.

**Rule:** a verbal confirmation does not close an item. Closure requires the request's stated acceptance test and a versioned artifact. Responsible team is structural (ES-xx → EmusaSoft product/engineering; MCP-xx → EmusaSoft MCP team). Delivery date is set when the corresponding work is scheduled, not up front.

| ID | Request | Responsible team | Priority / blocking phase | State | Contract version | Delivery date | Evidence link | Validation result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ES-01 | Approve the detection query set | EmusaSoft product/eng | Blocking Phase 0 exit gate + Phase 3 | Open | — | — | — | — |
| ES-02 | Read-only detection access + freshness signal | EmusaSoft product/eng | Blocking Phase 0 exit gate + Phase 3 | Open | — | — | — | — |
| ES-03 | Identity and session integration | EmusaSoft product/eng | Blocking Phase 2 | Open | — | — | — | — |
| ES-04 | Operational actor and routing evidence | EmusaSoft product/eng | Blocking Phase 5 | Open | — | — | — | — |
| ES-05 | Immutable extrusion opening-inventory source | EmusaSoft product/eng | Blocking E02–E04 (Phase 8) | Open | — | — | — | — |
| ES-06 | Stable deep-link patterns | EmusaSoft product/eng | Blocking production navigation | Open | — | — | — | — |
| ES-07 | `emusa-ui` consumption contract | EmusaSoft product/eng | Required during Phase 0 | Open | — | — | — | — |
| MCP-01 | Regenerate and publish the ERP catalog | EmusaSoft MCP team | Immediate | Open | — | — | — | — |
| MCP-02 | Restore GraphQL document validation | EmusaSoft MCP team | Immediate | Open | — | — | — | — |
| MCP-03 | Describe GraphQL input/enum/union/helper types | EmusaSoft MCP team | Required before adapter implementation | Open | — | — | — | — |
| MCP-04 | Exact-name and domain search coverage | EmusaSoft MCP team | Normal | Open | — | — | — | — |
| MCP-05 | Versioned non-GraphQL integration resources | EmusaSoft MCP team | Blocking MCP-based verification of Phase 0 | Open | — | — | — | — |
| MCP-06 | Sanitized representative read examples | EmusaSoft MCP team | Required before Phase 1 fixtures | Open | — | — | — | — |

**State values:** `Open` → `In progress` → `Delivered` → `Closed`. A request may only reach `Closed` once its acceptance test passes against a versioned artifact.
