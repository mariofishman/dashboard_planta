# EmusaSoft and MCP Preimplementation Responses

**Status:** discovery in progress

**Source:** answers provided by the Monitor project owner after discussion with the EmusaSoft architect
**Request register:** [`emusasoft_preimplementation_requests.md`](emusasoft_preimplementation_requests.md)

This document records the answer, resulting Monitor decision, remaining validation, and closure status for every ES and MCP request. An architect answer can settle a design decision, but staging or automated evidence remains required wherever the corresponding request defines a technical acceptance test.

Status meanings:

- **Pending:** no answer has been recorded.
- **Answered:** the intended solution is known, but required validation may remain.
- **Validated:** the acceptance evidence has passed.
- **Closed:** no further work remains.
- **Superseded:** a later decision removed the request.

## EmusaSoft product and engineering responses

### ES-01 — Detection-query ownership and approval

**Status:** Answered; staging validation pending

**Problem:** Monitor needs a safe way to detect current alert conditions without modifying or overloading EmusaSoft.

**Answer:** Monitor will use bounded read-only SQL polling. The Monitor team owns the detection-query design; EmusaSoft does not require separate approval of each query. The architect provided no fixed query-frequency, concurrency, timeout, or result-size limits. Monitor must apply conservative limits using its existing query contracts, then measure and adjust them during staging testing if problems are found.

**Decision:** External per-query approval is removed as a prerequisite. Each query must still remain versioned, bounded, measurable, and explainable. Staging validation determines acceptable operating limits before production use.

**Remaining validation:** Run each staging query against the approved read endpoint, record its plan and observed load, verify stable condition identity and lifecycle behavior, and correct any performance or safety problem before production enablement.

### ES-02 — Read-only detection access

**Status:** Answered; staging validation pending

**Problem:** Monitor needs an EmusaSoft database endpoint that supports detection reads while preventing operational writes.

**Answer:** Monitor will connect to the existing Aurora read replica using dedicated Monitor credentials that technically permit reads and reject writes. A dedicated Monitor replica and direct access to the primary database are not required. For Monitor, the replica is the authoritative and most current available operational source: a transaction becomes observable to Monitor when it appears on that replica. Monitor does not require a separate replica-lag signal to decide whether an alert is present or resolved.

**Decision:** Use the existing Aurora read replica as the Phase 10 detection source with a dedicated no-write account. Successful complete reads from that replica determine Monitor state. Replication delay may delay alert creation or resolution, and that delay is accepted as part of the observation boundary rather than treated as unknown freshness. Permitted schemas, connection limits, and credential rotation remain to be resolved.

**Failure behavior:** A timeout, connection failure, incomplete result, or otherwise unsuccessful query preserves existing incident state and exposes that the source is temporarily unavailable. Partial results are never treated as current truth and cannot resolve incidents.

**Access scope:** The dedicated Monitor account may read all EmusaSoft operational tables available through the existing Aurora read replica. The account remains technically unable to perform writes, DDL, procedure execution, or privilege changes.

**Environment separation:** Staging and production use separate endpoints and separate dedicated Monitor credentials.

**Remaining validation:** Provision both environments through secret management; prove write denial; confirm connectivity, time-zone and soft-delete handling; establish credential rotation; measure safe connection and query limits in staging; and verify that failed or incomplete cycles preserve incident state.

### ES-03 — Identity and session integration

**Status:** Answered; authentication contract validation pending

**Problem:** Monitor must authenticate users through a trusted identity and map them to their EmusaSoft user and permissions.

**Answer:** Monitor will reuse EmusaSoft's existing authentication or token service. Monitor will not maintain independent usernames and passwords.

**Decision:** Keep the existing replaceable identity adapter and replace the local mock provider with an EmusaSoft authentication adapter during Phase 10. The Monitor backend receives the EmusaSoft token and validates it through the EmusaSoft authentication service. Independent Monitor passwords, shared database authentication, and an assumed shared browser cookie are not required.

**Authorization ownership:** Monitor defines access to each alert type and manages its own roles and Operational Responsibility Roster. Existing EmusaSoft permissions and plant scopes do not determine Monitor authorization. The validated EmusaSoft identity supplies a stable `sysUserId`, which Monitor uses as its external person identifier. Authentication-revocation behavior remains to be resolved.

**Revocation behavior:** After successful validation, Monitor trusts the EmusaSoft token until its encoded expiration time. It does not revalidate every request, poll for revocation, or require a revocation event. A disabled user's existing Monitor access therefore ends when the current token expires; new or expired tokens must pass EmusaSoft validation again.

**Remaining validation:** Document the token claims and normal expiration lifetime; verify signature, issuer, audience, expiration, and stable `sysUserId`; provide staging identities; and prove that an expired token loses API and WebSocket access. The token lifetime is not yet known and must be obtained from the authentication contract rather than invented by Monitor.

### ES-04 — Operational actor and routing evidence

**Status:** Answered; local validation pending

**Problem:** Monitor must deterministically identify the people who receive each alert.

**Answer:** Apply all seven rules under `General alert distribution` in `alert_catalog.md` to every alert, including code-specific overrides. Monitor resolves standardized positions through its Operational Responsibility Roster and supplements them with the OT operator and actor recorded on relevant EmusaSoft evidence where the catalog requires it. It must notify every valid recipient it can resolve, deduplicate them, and never broadcast to unrelated warehouse or role users.

**Decision:** Each alert code and reason deterministically selects recipients according to the seven general rules and its documented exception. Effective roster assignments resolve standardized positions to Monitor users identified by `sysUserId`; relevant OT and ERP evidence may supply the recorded operator or actor. Authorized Monitor administrators create and maintain roster assignments through the Monitor UI. Automatic import of the complete roster from EmusaSoft is not required.

**Missing-assignment behavior:** Continue notifying every recipient that can be resolved. Do not show a routing error in the ordinary user alert experience. Send an email to authorized Monitor administrators identifying the missing or conflicting roster assignment so they can correct it. Retain an internal audited delivery/routing diagnostic without exposing it as an operational alert error.

**Remaining validation:** Test all seven general rules, every code-specific override, recipient deduplication, effective dates, temporary replacements, OT/actor supplementation, partial recipient resolution, administrator email delivery, and prevention of broad fallback notification.

### ES-05 — Immutable extrusion opening and closing inventory

**Status:** Open; EmusaSoft database redesign agreed, implementation and MCP verification pending

**Problem:** E02–E04 require immutable opening and closing resin quantities for each selected extrusion container. The current EmusaSoft implementation stores neither snapshot.

**Corrected operational answer:** Earlier explanations that `almacen_ubicacion_articulos` or `orden_trabajo_materiales.cantidad_entrante` provided a historical snapshot were incorrect and are superseded. EmusaSoft currently has no immutable opening snapshot and no immutable closing snapshot for extrusion work-order container inventory.

**MCP evidence checked on 2026-07-21:**

- `quickStartWorkOrder` exists and accepts `QuickStartWorkOrderInput`. Catalog v2 cannot describe the input type, but live read-only GraphQL introspection shows `workOrderId` and a required list of `QuickStartMaterialInput` values.
- Each `QuickStartMaterialInput` contains `articleId`, optional `articleSerialId`, required `quantityInventory`, required `refId`, and optional `refType`. The reference-type enum includes `WAREHOUSE_ITEM_LOCATION`, `WORK_ORDER_MATERIAL_STOCK`, and other material origins.
- `orden_trabajo_material_stock_contenedores` records the work order material stock, article, selected location/container, usage state, creation time, and creating user.
- `orden_trabajo_materiales` can link a material row to that selected container through `id_ot_material_stock_contenedor` and stores `cantidad_entrante` (`WorkOrderMaterial.quantityIncoming`) plus creation and update metadata.
- `almacen_ubicacion_articulos.cantidad` is the mutable current quantity and is not by itself acceptable opening evidence.

**Decision:** Current EmusaSoft data cannot support production evaluation of E02, E03, or E04. These rules may remain fixture-tested locally but must stay disabled for staging and production until the new evidence contract is implemented and validated. Monitor must not reconstruct either snapshot from mutable current inventory.

**Architect decision (2026-07-22):** The EmusaSoft architect agreed to modify the database structure so extrusion containers retain an initial-inventory snapshot and a final-inventory snapshot. ES-05 remains open until the database redesign is implemented, the MCP is updated, and Monitor can inspect and validate the resulting read contract.

**EmusaSoft patch:** The responsible developer is creating the database and application changes. The final table, fields, deployment version, and read contract are not yet available.

**Pending clarification:** It is not yet known whether the patch stores separate snapshots for every work order + container + resin combination or only aggregate work-order quantities. Per-container and per-resin granularity is required to support the current E02–E04 evidence contracts.

**Required snapshot contract:** Each opening and closing snapshot must be read-visible and historically reproducible by work-order ID, container/location ID, resin article ID, quantity and unit, operator, source timestamp, and audit identifiers. Later consumption, closure calculations, and inventory adjustments must not overwrite either snapshot.

**Remaining validation:** After the EmusaSoft repository and MCP catalog are updated, inspect the implemented solution through MCP; obtain the schema and contract version; verify controlled staging opening and closure transactions; prove both snapshots remain unchanged after later inventory updates; and demonstrate that E02–E04 can reproduce opening, additions, closing, and recipe proportions from read-only evidence.

### ES-06 — Frontend deep-link contract

**Status:** Open; claimed MCP upgrade not visible

**Problem:** Monitor needs a supported contract for building stable EmusaSoft frontend links to work orders and other ERP records. GraphQL operation names are not browser routes.

**Reported change:** The MCP owner reported that the MCP had been upgraded to expose link information.

**Verification on 2026-07-22:** The authenticated MCP still reports catalog v2 generated on 2026-07-13 with 1,034 operations, 345 entities, and 345 SQL tables. Searches for frontend routes, deep links, browser routes, navigation contracts, and work-order URLs returned no supported route contract. The server exposes no MCP resources or resource templates, and its available tools remain limited to ERP catalog discovery, GraphQL validation/execution, and UI search. Live GraphQL introspection exposes menu and file-URL queries but no operation that defines stable entity-to-frontend route patterns.

**Decision:** ES-06 remains open. Monitor must continue displaying ERP identifiers and evidence without creating assumed links.

**Required MCP change:** Publish a versioned frontend-navigation resource or catalog surface that maps supported entity types to route templates, required identifiers, environment base URLs, authorization behavior, and compatibility guarantees. The MCP catalog metadata must identify the updated version and generation time so Monitor can prove it is reading the new contract.

**Remaining validation:** After the MCP owner confirms deployment, refresh the MCP connection, verify the new catalog/resource version, construct representative staging links for a work order and every supported subject type, and confirm that authorized users land on the intended EmusaSoft record.

### ES-07 — UI-library dependency

**Status:** Closed as superseded

**Answer:** Monitor uses Material UI through its own component layer and Monitor-owned design tokens. It does not import, connect to, or depend on EmusaSoft's internal UI library.

**Decision:** No EmusaSoft or MCP delivery is required for Monitor's component library. ES-07 remains superseded by the approved Material UI direction.

## EmusaSoft MCP implementation responses

**Verification hold (2026-07-22):** MCP-02 through MCP-06 will not be evaluated against the currently deployed July 13 catalog. Resume the MCP review only after the MCP owner deploys the pending improvements and the project owner requests a fresh verification. The next pass must begin by validating MCP-01 version metadata, then assess MCP-02 through MCP-06 against that same deployed revision.

### MCP-01 — Current catalog generation

**Status:** Open; update developed but not deployed

**Answer:** The MCP owner has developed the catalog update, but it has not yet been deployed to the endpoint Monitor uses. The project owner will request re-verification after deployment.

**Current evidence:** On 2026-07-22 the authenticated endpoint still reported catalog v2 generated on 2026-07-13, with 1,034 GraphQL operations, 345 entities, 345 SQL tables, and 1,034 examples.

**Remaining validation:** After deployment, verify the new catalog version, generation timestamp, generator version, object counts, source revision, and drift summary against the restructured EmusaSoft schema. MCP-01 remains open until that evidence reconciles.

### MCP-02 — GraphQL document validation

**Status:** Deferred pending MCP-01 deployment

### MCP-03 — Input and helper type descriptions

**Status:** Deferred pending MCP-01 deployment

### MCP-04 — Exact-name and domain search

**Status:** Deferred pending MCP-01 deployment

### MCP-05 — Versioned non-GraphQL integration resources

**Status:** Deferred pending MCP-01 deployment

### MCP-06 — Sanitized representative reads

**Status:** Deferred pending MCP-01 deployment

## Completion and archive rule

When every item is closed, superseded, or explicitly accepted with its required evidence, reconcile the final decisions into the authoritative architecture and roadmap. Then move this response register and its paired request register to `docs/archive/` together.
