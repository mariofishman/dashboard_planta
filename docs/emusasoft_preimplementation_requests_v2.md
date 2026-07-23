# EmusaSoft and MCP Final-integration Requests — Version 2

**Status:** architect review requested; evidence refreshed against the staging MCP on 2026-07-22

**Audit endpoint:** `https://emusa-mcp-tasks-stg-api.emusa.dev/mcp`

**Audit time:** 2026-07-22 19:08 PET (`UTC-05:00`)

**Purpose:** replace stale MCP assumptions with evidence from the currently deployed staging MCP, record what is now present, and narrow the remaining requests to specific missing behavior, metadata, clarification, or acceptance evidence.

**Related registers:**

- [`emusasoft_preimplementation_requests.md`](emusasoft_preimplementation_requests.md) — original request register
- [`emusasoft_preimplementation_responses.md`](emusasoft_preimplementation_responses.md) — responses recorded before this refreshed audit
- [`emusasoft_integration_architecture.md`](emusasoft_integration_architecture.md) — approved integration boundary
- [`monitor_architecture_and_production_roadmap.md`](monitor_architecture_and_production_roadmap.md) — current delivery and Phase 10 gates

**Document control:** this Version 2 file is the refreshed request proposed for architect review. Until the architect's responses are recorded and the architecture and roadmap cross-references are reconciled, the original request and response registers remain the current decision history. Do not archive or silently overwrite them.

This version corrects the earlier conclusion that the MCP upgrade was not deployed. The new staging endpoint exposes catalog v5, frontend routes, GraphQL type descriptions, catalog provenance, recipe snapshots, and an extrusion-container closure-snapshot contract. Those capabilities are acknowledged below and are not requested again as if they were absent.

This file does not treat product decisions, database provisioning, or staging acceptance tests as MCP defects. It distinguishes:

- **confirmed in MCP:** the current catalog or live read-only GraphQL surface exposes the capability;
- **partially confirmed:** the surface exists, but a required semantic, metadata, or verification detail is unresolved;
- **not found in MCP:** the audited tools and resources did not expose the requested artifact;
- **outside MCP:** the item requires an architect answer, environment provisioning, source artifact, or staging test rather than another catalog feature.

## 1. Executive status

| Item | Refreshed status | What changed or remains |
| --- | --- | --- |
| ES-01 | Answered; outside MCP validation remains | Monitor owns bounded detection queries. Staging plans, load, limits, and lifecycle behavior still require Phase 10 evidence. |
| ES-02 | Answered; outside MCP provisioning remains | Existing Aurora replica and dedicated no-write credentials are the agreed design. Credentials, write denial, limits, time zone, soft deletes, and rotation still require environment evidence. |
| ES-03 | Answered; outside MCP contract validation remains | Reuse EmusaSoft authentication and stable `sysUserId`. Token claims, lifetime, staging identities, and expiry/revocation tests remain. |
| ES-04 | Answered; Monitor validation remains | The seven routing rules and Monitor roster are defined. Deterministic recipient-resolution tests remain. |
| ES-05 | **Partially confirmed in the latest MCP** | A new closure-snapshot table, entity, GraphQL type, query, and recipe-snapshot table are present. Field semantics, immutability, per-resin/unit mapping, and real lifecycle evidence remain. |
| ES-06 | **Partially confirmed in the latest MCP** | Frontend-route search and description now expose work-order route templates and parameters. Environment base URL, authorization interpretation, compatibility policy, and browser validation remain. |
| ES-07 | Superseded | Monitor has no `emusa-ui` dependency. |
| MCP-01 | Mostly delivered; metadata follow-up remains | Catalog v5 is deployed with current timestamp, counts, schema hash, Prisma revision, route count, and GraphQL-type count. GraphQL source revision is empty and no drift summary was found. |
| MCP-02 | Open | Both a valid and intentionally invalid document return `schema unavailable`; validation is still not operating. |
| MCP-03 | Mostly delivered; metadata consistency follow-up remains | Input objects, enums, and helper types are describable. Non-null fields are returned with `required: false`, and union coverage could not be demonstrated. |
| MCP-04 | Partially delivered | Exact-name matching works. Several English and Spanish domain searches still rank unrelated objects ahead of expected Monitor surfaces. |
| MCP-05 | Partially delivered | `erp://catalog/revision` exists. No resource templates, detection-query contract, or read-endpoint capability resource were found. Some earlier requested resources may now be unnecessary and should be explicitly retired or redirected. |
| MCP-06 | Structurally delivered; representative-data intent unresolved | Examples exist for every GraphQL operation tested, but they are generated skeletons with typed placeholder responses, explicitly not representative ERP records. |

## 2. Exact audit method

### 2.1 Connection and credential handling

1. Loaded `EMUSASOFT_MCP_TOKEN` from the project-root `.env` file.
2. Verified only that the credential was present and non-empty.
3. Did not print, copy into this document, commit, or otherwise expose the token.
4. Sent authenticated requests only to the architect-provided staging MCP endpoint.
5. Used the MCP route `/mcp`; the bare host root is not the MCP protocol route.

### 2.2 Protocol checks

The audit used JSON-RPC over the MCP HTTP endpoint and executed:

- `initialize`
- `tools/list`
- `resources/list`
- `resources/templates/list`
- `resources/read`
- read-only `tools/call` requests

Initialization succeeded with HTTP 200 and reported:

- server name: `emusa-mcp`
- server version: `0.1.0`
- MCP protocol version: `2025-03-26`
- tool-list and resource-list capabilities enabled

### 2.3 Latest-version check

`erp_get_catalog_info` and `erp://catalog/revision` returned the same deployed revision:

| Field | Value observed |
| --- | --- |
| Schema version | `5` |
| Generated at | `2026-07-22T23:33:44Z` |
| Generator version | `dev` |
| GraphQL operations | `1,065` |
| Entities | `361` |
| SQL tables | `400` |
| Frontend routes | `121` |
| GraphQL types | `1,688` |
| Examples | `1,065` |
| Schema SHA | `205d80285fc95d078ca7e95ca468c0ecd961bb9a94affc7b714be79fb071ad7a` |
| ERP Prisma SHA | `20cf2c5de35d30b348e9d3f3448676a4f17c1c23` |
| ERP GraphQL SHA | empty string |

The resource correctly warns that the generated catalog does not prove the live ERP schema. The audit therefore also executed one minimal live, read-only query as described in section 3.2.

### 2.4 Tools and resources inspected

The deployed tool list contains:

- `erp_get_catalog_info`
- `erp_search`
- `erp_describe`
- `erp_get_example`
- `erp_validate_graphql`
- `erp_run_graphql`
- `frontend_routes_search`
- `frontend_route_describe`
- `ui_search`

The resource inventory contains one resource:

- `erp://catalog/revision`

`resources/templates/list` returned an empty list.

### 2.5 Discovery sequences used

The audit did not rely on one search term. It used exact names, English domain terms, Spanish domain terms, table descriptions, GraphQL type descriptions, examples, route descriptions, validation attempts, and one minimal live query.

The tool and resource inventories were enumerated completely through `tools/list`, `resources/list`, and `resources/templates/list`. Catalog-content searches were targeted rather than an exhaustive manual review of all 1,065 operations, 400 tables, and 1,688 GraphQL types. Therefore, “not found” means not exposed by the complete tool/resource inventory or not returned by the documented targeted checks; it does not mean the feature cannot exist in EmusaSoft source code or another external artifact.

Checks included:

- work orders: `getWorkOrders`, `ordenes_trabajo`, `work order`, `work order detail`
- materials and flow: `getWorkOrderMaterials`, `material flow`, `flujo material`, `reservation work order material`
- article serials: `getArticleSerials`, `article serial`, `serial articulo`
- scale records: `scale load`, `balanza cargas`
- equipment pauses: `GetWorkOrderEquipmentPauseListFlat`, `equipment pause`
- warehouses: `getWarehouses`, `warehouse`
- extrusion snapshots: `contenedor extrusion inventario inicial final`, `snapshot opening closing container quantity`, `saldo_apertura saldo_inicio_cierre`
- exact schema objects: `orden_trabajo_material_stock_contenedores`, `orden_trabajo_materiales`, `orden_trabajo_contenedor_cierre_snapshot`, `orden_trabajo_receta_snapshot`
- GraphQL types: `QuickStartWorkOrderInput`, `QuickStartMaterialInput`, `SearchArticleWarehouseLocationType`, `QueryGetWorkOrdersInput`, `OptionsInput`, `WorkOrderPagination`, `ExtrusionContainerInventory`, `ExtrusionContainerItem`, and `WorkOrderContainerClosureSnapshot`
- frontend routes: `/work-orders/:workOrderId` and `/work-orders/closed/:workOrderId`

## 3. Corrections to the earlier review

### 3.1 The current catalog upgrade is deployed

The earlier response register described catalog v2 generated on 2026-07-13. That is not the catalog served by the architect-provided staging endpoint during this audit. The current endpoint returned catalog v5 generated on 2026-07-22.

The following should therefore no longer be described as absent:

- refreshed catalog counts and hashes;
- GraphQL input-object and helper-type descriptions;
- frontend-route search and description;
- a versioned catalog-revision resource;
- the extrusion-container closure-snapshot table, entity, GraphQL type, and query;
- the work-order recipe-snapshot table.

### 3.2 The extrusion closure-snapshot contract exists

The catalog exposes SQL table `orden_trabajo_contenedor_cierre_snapshot` with:

- `id_orden_trabajo`
- nullable `id_contenedor`
- `id_ubicacion`
- `saldo_apertura`
- `saldo_inicio_cierre`
- `consumo_teorico`
- `ajuste_negativo`
- `consumo_real`
- `saldo_final`
- creation and update timestamps and user identifiers

The entity maps those values to:

- `workOrderId`
- `containerId`
- `locationId`
- `openingBalance`
- `closingBalance`
- `theoreticalConsumption`
- `negativeAdjustment`
- `realConsumption`
- `finalBalance`
- creation and update audit fields

The GraphQL catalog exposes:

```graphql
getWorkOrderContainerClosureSnapshots(
  workOrderId: Int!
): [WorkOrderContainerClosureSnapshot!]!
```

A minimal authenticated read-only call using a deliberately non-existent work-order ID executed successfully and returned an empty list. This proves that the operation is accepted by the live GraphQL endpoint; it does not prove snapshot contents or lifecycle behavior for a real work order.

The catalog also exposes `orden_trabajo_receta_snapshot`, including work-order, output-structure, article, screw quantity/percentage/position, raw-material structure/name, unit, value, soft-delete, and audit fields.

### 3.3 Frontend route discovery exists

`frontend_routes_search` returned work-order route templates including:

- `/work-orders/:workOrderId`
- `/work-orders/closed/:workOrderId`
- `/work-orders/:workOrderId/detail/:itemType/:itemId`
- `/work-orders/closed/:workOrderId/detail/:itemType/:itemId`
- corresponding `kardex` and `process/:action` routes

`frontend_route_describe` identified the `workOrderId` path parameter and page components for active and closed work-order routes. This corrects the earlier statement that the MCP exposed no frontend navigation catalog.

### 3.4 GraphQL type description is materially improved

The current MCP successfully described:

- `QuickStartWorkOrderInput` and nested `QuickStartMaterialInput`;
- the `SearchArticleWarehouseLocationType` enum and all 15 values;
- `QueryGetWorkOrdersInput` and `OptionsInput`;
- helper/output types such as `WorkOrderPagination`, `ExtrusionContainerInventory`, `ExtrusionContainerItem`, and `WorkOrderContainerClosureSnapshot`.

MCP-03 is therefore no longer an unqualified missing-feature request.

## 4. Revised requests to the EmusaSoft architect and product/engineering team

### ES2-01 — Provide Phase 10 detection-query acceptance evidence

**Classification:** outside MCP

**Already answered:** Monitor owns bounded read-only detection queries; EmusaSoft does not need to approve each query in advance.

**Still required:** for each enabled production rule, record the staging query plan, indexes used, observed duration, result bound, timeout, concurrency, schedule, and load effect. Demonstrate stable condition identity, healthy-cycle resolution, and recurrence behavior.

**Why this remains:** none of the MCP tools is intended to prove Aurora execution plans or staging load behavior.

### ES2-02 — Complete read-only environment provisioning evidence

**Classification:** outside MCP

**Already answered:** Monitor will use the existing Aurora read replica with separate dedicated no-write credentials for staging and production. Replica observation time is the accepted source boundary; a replica-lag gate is not required.

**Still required:** provide the endpoints through secret management, permitted schema scope, connection limits, time zone, soft-delete rules, credential rotation procedure, and automated proof that writes, DDL, procedures, and privilege changes are denied.

**Revision from Version 1:** do not request a replica-freshness mechanism unless the architect reopens that decision.

### ES2-03 — Complete the authentication contract artifact

**Classification:** outside MCP

**Already answered:** Monitor uses EmusaSoft authentication, validates the EmusaSoft token through the authentication service, and maps the identity to stable `sysUserId`.

**Still required:** provide the versioned claims contract, issuer, audience, signature verification method, normal token lifetime, disabled-user behavior at refresh, non-production identities, and evidence that expiration removes API and WebSocket access.

**Why this remains:** `getUserContext` proves an identity query exists, but its generated example is not an authentication protocol or token-lifecycle contract.

### ES2-04 — Complete routing acceptance evidence

**Classification:** Monitor and staging validation, not an MCP catalog defect

**Already answered:** apply the seven general distribution rules, code-specific overrides, Monitor's effective-dated roster, and relevant recorded ERP actors.

**Still required:** demonstrate recipient resolution, deduplication, temporary replacement, effective dates, partial resolution, administrator notification, and prevention of broad fallback notification across representative anonymized cases.

### ES2-05 — Confirm the semantics and lifecycle of the new closure snapshots

**Classification:** partially confirmed in MCP

**Confirmed present:**

- SQL table `orden_trabajo_contenedor_cierre_snapshot`;
- entity and GraphQL type `WorkOrderContainerClosureSnapshot`;
- live read-only query `getWorkOrderContainerClosureSnapshots(workOrderId: Int!)`;
- opening, start-of-close, theoretical-consumption, adjustment, real-consumption, and final-balance fields;
- work-order, container, location, creation, update, and user audit references;
- recipe table `orden_trabajo_receta_snapshot`.

**Architect clarification requested:**

1. Define the exact business moment represented by `saldo_apertura`, `saldo_inicio_cierre`, and `saldo_final`.
2. Confirm whether these values are immutable snapshots. If corrections are allowed, define whether corrections create a new version or overwrite `fecha_actualizacion` on the same row.
3. Confirm how a snapshot maps to one resin article. The snapshot has no direct article column; the apparent path is through nullable `id_contenedor` to the container's `id_articulo`.
4. Explain valid rows where `id_contenedor` is null and how Monitor identifies the resin for those rows.
5. Identify the unit of measure for each balance and the authoritative join path to that unit.
6. Confirm whether one work order may contain multiple snapshot rows for the same container or location and provide the uniqueness/natural-key rule.
7. Confirm whether `saldo_apertura` is captured at work-order opening or reconstructed during closure.
8. Confirm whether later inventory movements, adjustments, or work-order edits can change any recorded snapshot field.

**Acceptance evidence still required:** use controlled staging work orders to show opening, added material, start-of-close balance, real consumption, adjustments, final balance, recipe percentages, per-container/per-resin identity, units, and audit fields. Repeat the read after later inventory changes and prove historical values remain reproducible.

**Impact:** keep E02–E04 disabled in staging and production until this semantic and lifecycle evidence passes. The request is no longer to create an unknown snapshot structure; it is to confirm and validate the structure now exposed.

### ES2-06 — Confirm how Monitor must construct supported frontend links

**Classification:** partially confirmed in MCP

**Confirmed present:** route search and route descriptions expose active, closed, detail, kardex, and process route templates, path parameters, page components, permission classification, and heuristic first-load operations.

**Architect clarification requested:**

1. Identify the supported base URL source for each environment.
2. Confirm which route Monitor should use for an active versus closed work order.
3. Define valid values for `itemType`, `itemId`, and `action` where detail routes are allowed.
4. Explain how `permission.kind: static` should be interpreted when no permission values are returned.
5. State the compatibility/deprecation policy for published route templates.
6. Confirm whether the route catalog is the supported contract or only a generated observation of the current frontend source.

**Acceptance evidence still required:** construct representative staging URLs, open them as authorized and unauthorized users, confirm the intended record loads, and verify fallback behavior when a route is unavailable.

**Revision from Version 1:** do not request route-search functionality again; it is deployed and working.

### ES2-07 — UI library

**Status:** closed as superseded

Monitor continues to use Material UI through its own component layer and design tokens. No EmusaSoft or MCP action is requested.

## 5. Revised requests to the EmusaSoft MCP implementation team

### MCP2-01 — Complete or explain catalog provenance metadata

**Classification:** mostly delivered

**Confirmed present:** catalog v5, generation timestamp, counts, schema SHA, Prisma SHA, routes count, GraphQL-types count, versioned revision resource, and an explicit disclaimer that the catalog is not proof of the live schema.

**Not found or incomplete:**

- `erp_graphql_sha` is an empty string;
- `generator_version` is `dev`, not an identifiable release or build revision;
- no machine-readable drift summary was present in the catalog-info result or revision resource;
- no authoritative current-schema count was available through MCP to reconcile the 400 cataloged SQL tables independently.

**Request:** populate the GraphQL source revision and stable generator build identifier, and add the drift summary. If any value is intentionally unavailable, return an explicit `unavailable` state and reason instead of an unexplained empty string.

### MCP2-02 — Restore GraphQL validation

**Classification:** open and reproduced on catalog v5

The audit submitted:

- a valid `getUserContext` document; and
- an intentionally invalid document requesting a nonexistent field.

Both returned:

```text
schema unavailable: cannot validate
```

Both results reported `valid: false`, `errors: null`, and `schema_version: 0`.

**Request:** load the versioned schema used for catalog v5 and return its schema version or hash with every validation result.

**Acceptance:** the valid query passes; the invalid query fails with a field error and source location; validation performs no ERP execution.

### MCP2-03 — Correct GraphQL type metadata consistency and clarify union coverage

**Classification:** mostly delivered

**Confirmed present:** input objects, nested input objects, enums, helper/output types, field types, nullability expressed in GraphQL type notation, and enum values.

**Remaining issue:** fields declared with non-null GraphQL types such as `Int!` and `[QuickStartMaterialInput!]!` were returned with `required: false`. A developer reading the structured metadata instead of the text type could interpret required inputs incorrectly.

**Union check:** searching `graphql_type` for `union` returned no result. This may mean the current schema contains no unions; the audit cannot distinguish that from unions being undiscoverable.

**Request:**

1. Make `required` agree with GraphQL non-null notation for input-object fields. Operation arguments were returned correctly in the tested snapshot query; the inconsistency was observed in described type fields.
2. Return defaults where the schema defines them.
3. State whether catalog v5 contains zero unions. If unions exist, provide one exact fixture proving `erp_search` and `erp_describe` return its members.

### MCP2-04 — Finish bilingual and domain-alias search fixtures

**Classification:** partially delivered

**Exact-name checks that worked:**

- `getWorkOrders` returned exact operation `getWorkOrders` first;
- `ordenes_trabajo` returned exact table `ordenes_trabajo` first;
- `getWorkOrderMaterials`, `getArticleSerials`, `GetWorkOrderEquipmentPauseListFlat`, `getWarehouses`, and `getWorkOrderContainerClosureSnapshots` each returned the exact operation;
- exact table `orden_trabajo_material_stock_contenedores` returned the exact table;
- `warehouse` returned entity `Warehouse` first;
- `balanza cargas` returned `ScaleLoad` and `balanza_cargas` first and second.

**Domain searches that remain weak:**

- `material flow` did not rank `MaterialFlow`, `MaterialFlowDetail`, or their primary operations/tables in the first five;
- `article serial` and `serial articulo` returned unrelated product/batch types ahead of `ArticleSerial`;
- `scale load` returned only unrelated GraphQL types;
- `equipment pause` returned an enum first, followed by unrelated equipment/logout operations;
- `reservation work order material` returned a broad mutation list rather than the principal reservation/read surfaces.

**Request:** publish and run a deterministic fixture suite covering exact names plus agreed English and Spanish Monitor terms for work orders, material flows, reservations, article serials, scale loads, equipment pauses, warehouses, recipes, and extrusion containers.

**Acceptance:** each fixture defines the expected first result and acceptable aliases. Exact-name success should be preserved.

### MCP2-05 — Decide the remaining scope of non-GraphQL resources

**Classification:** partially delivered and partly superseded by product decisions

**Confirmed present:** `erp://catalog/revision` is readable and versioned.

**Not found:**

- resource templates;
- a detection-query contract resource;
- a read-endpoint capability summary;
- a separate replica-freshness resource.

**Scope correction:** a replica-freshness resource is no longer required by the approved architecture because the existing replica's observable state is the accepted source boundary. Monitor also owns its detection-query definitions, so publishing them through MCP is optional rather than a prerequisite.

**Architect/MCP-team decision requested:** either:

1. publish a versioned, sanitized read-endpoint capability resource describing allowed access, environment separation, and operational limits; or
2. identify the authoritative versioned document outside MCP and explicitly close this MCP request as unnecessary.

Do not expose credentials, host secrets, internal Redis details, or production topology beyond the approved sanitized contract.

### MCP2-06 — Clarify whether generated examples satisfy the representative-example requirement

**Classification:** structurally delivered; acceptance intent unresolved

The audit retrieved examples for:

- `getUserContext`
- `getWorkOrders`
- `getWorkOrderMaterials`
- `getArticleSerials`
- `getWorkOrderEquipmentPauseListFlat`
- `getWarehouses`
- `getWorkOrderContainerClosureSnapshots`

All returned useful generated query skeletons and typed placeholder responses. Their notes explicitly state that argument values are placeholders and responses are not real ERP data. Pagination examples contain empty `docs`; list examples contain empty arrays; identity values are zero or empty placeholders.

**Request:** clarify the intended acceptance standard:

- If MCP-06 means schema-shaped, sanitized skeletons, mark the item closed and document that these are structural examples only.
- If MCP-06 means representative contract-test fixtures, add curated non-production examples with meaningful but synthetic values, valid variables, edge cases, and cross-record identifiers for each requested domain.

**Minimum additional examples if representative fixtures are still required:**

- one enabled and one disabled identity;
- one active and one closed work order;
- material reservation, addition, consumption, and return;
- material-flow send and receive records;
- article serial with warehouse/location quantities;
- scale load with tare, gross, and net relationships;
- equipment pause with actor and effective time;
- warehouse and location relationship;
- recipe snapshot with multiple resin percentages;
- closure snapshots for multiple containers/resins, including an adjustment.

## 6. What this audit did not verify

The following were deliberately not claimed:

- No mutation or subscription was executed.
- No EmusaSoft operational record was changed.
- No real work-order ID was used for the live snapshot query.
- No personal or operational record contents were copied into this document.
- No direct Aurora, staging database, or production database connection was made.
- No production schema dump or source repository was available to independently verify the catalog's 400-table count or source hashes.
- No detection query plan, load test, timeout, or concurrency test was run against Aurora.
- No read-only database credential or write-denial test was performed.
- No token claims, signature, issuer, audience, lifetime, or disabled-user behavior was inspected.
- No real snapshot lifecycle was observed from work-order opening through closure and later inventory change.
- No frontend route was opened in a browser, and no environment base URL or authorization behavior was tested.
- No representative routing case was executed against real or anonymized responsibility assignments.
- No claim was made that a generated catalog proves the live SQL schema.

## 7. Requested architect response format

For each item that remains open or partial, please provide:

| Field | Required response |
| --- | --- |
| Item | `ES2-xx` or `MCP2-xx` |
| Answer | Direct answer to each numbered clarification or request |
| Owner | EmusaSoft engineering, MCP team, Monitor team, or named owner |
| Evidence | Versioned document, MCP resource URI, source revision, staging test, or issue link |
| Environment | Catalog-only, local, staging, or production |
| Target date | Expected delivery or decision date |
| Closure state | Confirmed, validation pending, closed, superseded, or rejected with reason |

An architect statement can settle semantics or explicitly retire an unnecessary request. Access control, immutability, schema behavior, route behavior, and load claims remain subject to the corresponding technical acceptance evidence.

## 8. Completion rule

Version 2 is complete when:

1. every open clarification has a direct architect or MCP-team answer;
2. every retained technical request has versioned evidence or a tracked delivery owner and date;
3. superseded requests are explicitly closed rather than silently omitted;
4. the authoritative architecture, roadmap, request register, and response register are reconciled to the same decisions; and
5. Phase 10 gates continue to distinguish catalog discovery from staging and production acceptance.
