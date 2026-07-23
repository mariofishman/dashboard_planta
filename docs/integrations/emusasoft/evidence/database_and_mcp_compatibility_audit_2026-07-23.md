# EmusaSoft Database and MCP Compatibility Audit — 2026-07-23

**Status:** Current assessment and remediation plan

**Database source:** protected local `staging_emusa_core-20260723-025548.sql` backup

**MCP source:** staging catalog v5 generated 2026-07-23 at 14:43:34 UTC

No database rows, credentials, or token values are recorded in this document.

## 1. Database replacement

The previous protected `prod_emusa_core-20260716-143040.sql[.gz]` files were replaced by:

- `local-data/database/staging_emusa_core-20260723-025548.sql.gz`
- `local-data/database/staging_emusa_core-20260723-025548.sql`

The archive passed `gzip -t`; the extracted file is 2,903,569,374 bytes. Both files remain ignored by Git through `/local-data/database/`.

The Phase 0 subset was regenerated from the new backup. The existing A02 and A05 SQL remained executable, bounded, complete, and index-backed:

| Query | New matching rows | Unique keys | Pages | Total local cycle | Complete |
| --- | ---: | ---: | ---: | ---: | --- |
| A02 | 1,249 | 1,249 | 2 | 2.313 ms | Yes |
| A05 | 838 | 838 | 1 | 11.855 ms | Yes |

The previous 17 tables and 76 fields marked `backup-confirmed` still exist in the new DDL. After mapping the delivered closure snapshot, the active contract now validates 87 fields across 18 tables.

## 2. Database incompatibilities and disposition

| Status | Finding | Resolution |
| --- | --- | --- |
| Resolved | Tests referenced the deleted 2026-07-16 dump and old result counts. | Tests now read the current revision and counts from `config/integrations/emusasoft-local-snapshot.json`. |
| Resolved | Detection contracts and Phase 0–3 evidence named the old backup. | Contracts, commands, measurements, and evidence now identify the protected 2026-07-23 staging snapshot. |
| Resolved | E02–E04 used abstract inventory-source names. | Active mappings now name the delivered closure-snapshot table and its 2026-07-23 fields. |
| Resolved | The July 22 audit listed obsolete closure-snapshot fields. | The audit is marked superseded and points to this current evidence. |
| Deferred by design | The DDL and MCP do not prove capture timing, units, immutability/corrections, natural key, or nullable-container behavior. | Active rules describe the exact pending semantics and stay disabled against real data. This is an E02–E05 promotion gate, not a Phase 4B blocker. |
| Resolved | Phase 0 evidence treated catalog v2 as current. | Phase 0 evidence now records staging catalog v5 and the successful acceptance checks. |
| Resolved | `.env.example` omitted the MCP base URL and `/mcp` route convention. | Both are documented; the ignored local `.env` reaches the audited staging catalog. |
| Resolved locally | Deep-link evidence omitted the material-reservation route. | The route is recorded and contract-tested, but remains disabled until later browser and authorization acceptance. |

## 3. Current closure-snapshot contract

The new local dump and staging MCP agree on:

- SQL table `orden_trabajo_contenedor_cierre_snapshot`;
- GraphQL query `getWorkOrderContainerClosureSnapshots(workOrderId: Int!)`;
- identifiers: work order, container, and location;
- balances: opening, initial adjustment, container income, final adjustment, final balance, and real consumption;
- creation and update audit fields;
- container-to-article mapping through `orden_trabajo_material_stock_contenedores.id_articulo`.

The product owner approved these business assumptions on 2026-07-23: `saldo_apertura` is recorded when the OT opens; all balances are kilograms; every snapshot has `id_contenedor`; and one OT has one opening snapshot and one closing snapshot. Consumption is calculated only from opening quantity, additions recorded during the OT, and ending quantity. The implementation meanings of `ajuste_inicial`, `ingreso_contenedor`, `ajuste_final`, and `consumo_real` remain unconfirmed, so no detector may assign them an addition or consumption formula before Phase 10 testing.

Snapshot correction/version behavior is not a product-rule gate: Monitor evaluates the values supplied by EmusaSoft. Phase 10 will test deployed behavior with representative staging data.

## 4. MCP acceptance results

The project-configured MCP base URL was corrected during the audit. Appending the `/mcp` protocol route now reaches the same staging catalog v5 used for the acceptance checks.

| Request | Result on staging catalog v5 |
| --- | --- |
| MCP2-01 — Provenance | Partially fixed. Catalog hashes, explicit provenance notes, and a machine-readable live drift check now exist; drift was zero at type-and-field-name level. `erp_graphql_sha` is still empty and `generator_version` is still `dev`. |
| MCP2-02 — GraphQL validation | Fixed. A valid query passed with schema version 5; an invalid field failed with the expected field error and source location. |
| MCP2-03 — Type metadata | Acceptance samples pass. Non-null input fields now report `required: true`, and catalog metadata explicitly reports zero unions. Defaults were not independently demonstrated because the sampled input types declared none. |
| MCP2-04 — Search aliases | Partially fixed. English searches for material flow, article serial, scale load, and equipment pause now rank the correct entities first. Spanish `serial articulo` still does not rank `ArticleSerial` in the first five, and reservation search still ranks unrelated purchase-order objects first. |
| MCP2-05 — Non-GraphQL resources | Fixed for the agreed option. `erp://integration/read-capability` now publishes the enforced read-only capability and its limits without exposing infrastructure secrets. |
| MCP2-06 — Examples | Fixed as a policy clarification. The capability resource explicitly defines examples as structural skeletons, not representative or real ERP data. |

Additional successful checks:

- catalog v5 was generated 2026-07-23 and exposes 1,065 operations, 361 entities, 400 cataloged SQL tables, 121 frontend routes, and 1,688 GraphQL types;
- the live structural drift check found zero type/field-name differences;
- the current snapshot query validated and executed successfully with a deliberately non-record identifier;
- active, closed, and material-reservation work-order routes are discoverable; the product owner confirmed representative routes under `https://erp-web.apps.emusa.dev`.

MCP cannot close infrastructure or product acceptance work: Aurora credentials and write denial, query plans and load, authentication issuer/audience/signature behavior, routing cases, snapshot semantics, environment base URLs, and browser authorization remain external validation items.

## 5. Impact on completed phases

| Phase | Impact |
| --- | --- |
| Phase 0 | Evidence and MCP documentation are refreshed. The architecture and query-safety decisions remain valid, and A02/A05 reran successfully on the new backup. |
| Phase 1 | All 87 mapped fields across 18 tables validate. Fixture contracts remain valid. E02–E05 now follow the approved product formula; Phase 10 still maps recorded additions and validates deployed staging behavior. |
| Phase 2 | No implementation impact. The platform, mock identity, Monitor database, authorization, and WebSocket boundaries are independent of the EmusaSoft dump. Real authentication remains Phase 10 work. |
| Phase 3 | Query behavior remains valid and the refreshed adapter tests pass. No SQL rewrite is required for A02 or A05. |
| Phase 4 | No incident-lifecycle or dashboard implementation change is required. The Phase 4 API and incident tests passed; future real detectors must provide evidence using the revised source contract. |

## 6. Remediation result and remaining gates

Completed locally:

1. Added canonical non-sensitive snapshot metadata.
2. Updated tests, contracts, query evidence, Phase snapshots, MCP evidence, source mappings, and deep-link discovery.
3. Revalidated 87 fields across 18 source tables without printing operational rows.
4. Revalidated 21 rule contracts and 63 fixtures.
5. Passed type-checking, all 34 tests, and the production build.

Remaining later gates:

1. Phase 10 must test the approved closure-snapshot assumptions and map the recorded-addition source against representative staging data before E02–E05 are promoted against real data.
2. The MCP team must finish MCP2-01 provenance identifiers and the two failing MCP2-04 search fixtures.
3. Deep links require browser, authorization, base-URL, and compatibility acceptance before enablement.
4. Aurora credentials, write-denial proof, production query load, and authentication lifecycle remain Phase 10 work.

**Phase 4B readiness:** The database/MCP refresh created no remaining local blocker. Phase 4B may start; the external items above remain isolated to their later rule-promotion or Phase 10 gates.
