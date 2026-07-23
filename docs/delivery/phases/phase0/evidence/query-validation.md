# Local detection-query validation

**Source:** protected `staging_emusa_core-20260723-025548.sql` backup (2,903,569,374 bytes)

**Engine:** SQLite 3 derived subset for local predicate, keyset-pagination, and plan measurement

**Production status:** not approved; Aurora MySQL staging validation remains ES2-01/ES2-02

The validation tool loaded 57,232 material-flow details, 17,112 work orders, 122,991 article serials, 43 scale-detail records, and 78 warehouses. It emitted no source rows or operational values.

| Query | Matching rows | Unique keys | Pages | Total local cycle | Slowest page | Complete |
|---|---:|---:|---:|---:|---:|---|
| A02 | 1,249 | 1,249 flow-detail IDs | 2 | 2.313 ms | 1.778 ms | Yes |
| A05 | 838 | 838 article-serial IDs | 1 | 11.855 ms | 11.855 ms | Yes |

Both plans used candidate indexes and indexed joins. Keyset pagination removed offset scans. Neither query reached the 10,000-row cycle bound, so the local cycles were complete. Duplicate natural keys were not observed.

## Important interpretation

- These timings show that the predicates and pagination are practical on a local derived snapshot. They do not predict Aurora load or approve production indexes.
- The backup has only 43 scale-detail rows while it has 122,991 article serials. A05 therefore uses the explicit `CONFIRMAR_PESO` workflow state plus absence of a non-deleted scale row for `notWeighed`; it does not classify every historical serial missing from this sparse scale extract.
- A05 movement logic uses the current serial warehouse's `id_equipo` compared with the source work order equipment. EmusaSoft must confirm this as the production machine-location signal under ES2-01.
- A02 uses `fecha_creacion` as the candidate dispatch timestamp. ES2-01 must confirm its operational meaning and the reserved-OT exclusions on staging.
- Local backup work intentionally has no replica-lag requirement. The later approved architecture treats successful complete replica reads as the observation boundary and requires no separate lag gate.

## Safe-failure proof

The validator marks truncated and query-error cycles unhealthy. The detection contract allows resolution only after every page validates and the Monitor transaction commits. Failure leaves existing incident state unchanged. The WebSocket/API proof separately demonstrates that uncommitted events are not published and committed events remain recoverable after a missed live delivery.

## Reproduce

```sh
python3 scripts/phase0/validate_detection_queries.py \
  --dump local-data/database/staging_emusa_core-20260723-025548.sql \
  --database local-data/phase0-validation/emusa-subset.sqlite \
  --queries config/detection/queries \
  --report local-data/phase0-validation/query-validation.json
```
