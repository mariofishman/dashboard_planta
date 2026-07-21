# EmusaSoft MCP evidence collected 2026-07-20

- Project `.env` was loaded and `EMUSASOFT_MCP_TOKEN` was verified as non-empty without printing it.
- Catalog discovery order was followed: catalog info, search, describe, example, validate, then read-only execution.
- Catalog v2 was generated 2026-07-13 and reports 1,034 GraphQL operations, 345 entities, 345 SQL tables, and 1,034 examples. It remains behind the 2026-07-16 backup with 363 tables.
- `getUserContext` is a zero-argument query returning stable `sysUserId`, role information, `sysUser`, and `requiredPingActive`.
- The generated `getUserContext` example was inspected. Local catalog validation returned `schema unavailable`; authenticated read-only execution succeeded and returned exactly one enabled, non-deleted `sysUserId` for the caller.
- A02 evidence surfaces were described: `MaterialFlowDetail` / `flujo_materiales_detalles`, including work-order, material, status, creation, and receipt fields.
- A05 evidence surfaces were described: `ArticleSerial` / `articulo_serial`, `balanza_carga_detalle_registros`, work orders, warehouses, equipment, and locations.
- `getWorkOrder` was described and its generated example inspected. It provides work-order, equipment, document, material, output, and serial context.
- Searches for work-order and material-reservation URL routes returned data/API objects but no stable web-route contract. The architect later confirmed that no supported frontend route patterns exist; Monitor therefore shows identifiers and evidence and invents no route.

MCP evidence is discovery evidence only. Local backup validation and later approved staging-replica validation remain mandatory.
