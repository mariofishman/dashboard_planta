# Phase 6 Stage 3 — `test_database` handoff

**Date:** 2026-07-31

**Classification:** Ready with exact gaps

**Scope:** Local Stage 4 readiness only. This record does not claim connected polling, lifecycle acceptance, Aurora behavior, production authorization, or Phase 10 query approval.

## Runtime, reset, readiness, and access evidence

The merged handoff is safe to use as the local Stage 4 source boundary:

- branch start was `codex/phase6-stage3-database-handoff` at `af6a687` with a clean worktree;
- the attested `monitor-test-mysql` runtime was running on `127.0.0.1:3307`, readiness was present, and both application accounts were unlocked;
- the health suite passed with MySQL 8.0.43, 378 tables, 111 invoker-security views, the approved schema digest, and the expected grants;
- the full pristine-baseline suite passed with 10,345,048 reconciled rows, approved manifest/schema/checksum digests, zero checked relationship orphans, rollback-only writer DML, and nine read-only-account denial probes;
- A02 returned 1,249 unique keys in two 1,000-row pages and A05 returned 838 unique keys in one page; both plans retained primary-key keyset access and no full-table scan;
- pinned `mysql2` 3.23.2 connected through the ignored mode-600 host credential files; writer insert/update/delete rolled back, Monitor read all 111 views and bounded A02/A05 pages through the parameterized text-query path, and a Monitor insert was denied; and
- the reset implementation still requires the exact local database, loopback host and port, isolated Docker context, immutable dump hash, read-only mounts, explicit reset authorization, 8 GiB free space, and an exclusive lock. It removes readiness and locks both application accounts before replacement, then writes readiness only after the complete baseline passes.

Current ignored evidence:

- `local-data/test-database/evidence/latest-pre-unlock-validation.txt` — `20260731T211258Z`;
- `local-data/test-database/evidence/latest-baseline-validation.txt` — `20260731T211547Z`;
- `local-data/test-database/evidence/latest-query-plans.txt` — A02 1,249 / A05 838 unique keys; and
- `local-data/test-database/evidence/latest-driver-probe.txt` — `2026-07-31T21:15:27.158Z`.

The final adversarial review ran the complete guarded reset. It recreated only `test_database`, passed locked-account pre-unlock validation and the full baseline, restored readiness last, and left both application accounts unlocked. The driver probe also refused a simulated active reset lock before the temporary lock was removed. No source data was retained or printed by the Stage 3 probes.

The same review regenerated the SQLite backup subset from the immutable dump, passed all 1,249 A02 and 838 A05 keys through that compatibility adapter, passed the complete workspace test and typecheck suites, and reported zero package vulnerabilities. The former Phase 2 guard was narrowed so `mysql2` remains forbidden outside `@monitor/detection` while the approved detection-owned driver dependency is explicit.

## Approved A02 mapping

| Monitor meaning | `test_database` source | Status |
| --- | --- | --- |
| Natural key | `flujo_materiales_detalles.id` → `materialFlowDetailId` | Approved and query-proven |
| OT and reservation identity | `id_orden_trabajo`, `id_orden_trabajo_material` | Approved and relationship-proven |
| Optional unique item | `id_articulo_serial` | Approved and nullable |
| Recorded dispatch time | `fecha_creacion` → `sourceTimestamp` | Approved for the local source-compatible laboratory |
| In transit and not received | `estado = 'TRANSITO'`, `fecha_recepcion IS NULL`, `fecha_eliminacion IS NULL` | Approved and query-proven |
| Recorded endpoints | `id_almacen_origen`, `id_almacen_destino`, `id_ubicacion_almacen_origen`, `id_ubicacion_almacen_destino` | Approved and query-proven |
| Descriptive source fields for Stage 4 | `id_articulo`, `nombre_articulo`, quantity/unit columns | Physical fields verified; write fixture still to be implemented |
| Receipt/cancel/reject | terminal `estado`, `fecha_recepcion`, and the original/reverse relationship through a new movement identity | Business behavior approved; exact Stage 4 DML fixture still to be implemented and tested |

The existing read-only query correctly returns only destination-bound OT material movements that remain candidates. A complete healthy cycle may resolve a missing natural key after receipt, cancellation, or rejection. A reverse shipment must receive a new `flujo_materiales_detalles.id`; it is not recurrence of the original movement.

## Approved A03 mapping and exact gap

| Monitor meaning | `test_database` source | Status |
| --- | --- | --- |
| Natural key | `ordenes_trabajo.id` → `workOrderId` | Approved |
| Display identity and machine | `codigo_orden_trabajo`, `id_equipo` | Approved |
| Actual start | `fecha_inicio_ejecucion` | Approved |
| Closed/cancelled boundary | `fecha_fin_ejecucion`, `fecha_eliminacion`, `eliminado` | Approved for local active/closed state |
| Material rows | `orden_trabajo_materiales.id_orden_trabajo` with deletion fields | Relationship-proven |
| First valid consumption | positive consumption evidence and its first valid timestamp | **Exact gap** |

The restored baseline has seven active OTs under the approved start/end/deletion mapping, seven would qualify at the backup-relative 15-minute boundary if positive `cantidad_consumida` is accepted as consumption, and no machine has more than one active OT. These aggregate facts do not approve the missing consumption contract.

Stage 4 must version the A03 query and fixture semantics before connecting it. It must determine which `orden_trabajo_materiales` quantity fields constitute the first valid declaration and how its timestamp is represented. `fecha_actualizacion` cannot be assumed to be the first-consumption time merely because it is populated. `solo_lectura_ingreso` is not an independent local blocking condition, and `strongerA07` must be removed because A03 and A07 are independently evaluated.

## Approved A05 mapping and Stage 3 correction

| Monitor meaning | `test_database` source | Status |
| --- | --- | --- |
| Natural key | `articulo_serial.id` → `articleSerialId` | Approved and query-proven |
| Serial and declaration time | `codigo_serial`, `fecha_creacion` | Approved and query-proven |
| Source OT | `id_orden_trabajo_origen` for produced reels; `id_ultimo_orden_trabajo_cierre` for `ARTICULO`, `SALDO`, or `SOBRANTE` | Approved and query-proven |
| Not weighed | no non-deleted `balanza_carga_detalle_registros` row for the serial | Approved and query-proven |
| Still at machine | source OT has `fecha_fin_ejecucion`, and `articulo_serial.id_almacen` resolves to an `almacenes.id_equipo` equal to the OT machine | Approved; corrected in Stage 3 |
| Threshold clock | `articulo_serial.fecha_creacion <= observation time - 30 minutes` | Approved |
| A02 handoff | destination-bound movement receives a new `flujo_materiales_detalles.id`; A05 no longer owns movement delay after departure | Business behavior approved; Stage 4 write fixture and connected proof remain |

Stage 3 corrected one readiness defect in A05 query version `1.0.1-candidate`: the 30-minute threshold is measured from reel declaration. OT closure is required for `stillAtMachine` but is not incorrectly required to be 30 minutes old. The product-approved weighing test remains the existence of a non-deleted scale record. The corrected query preserves the verified 838 unique baseline keys and indexed plan.

## Exact Stage 4 gaps

These gaps are bounded and do not make the local handoff unsafe:

1. Add and version the read-only A03 query contract after resolving the first-valid-consumption mapping above.
2. Require the readiness file and refuse an active reset in both the `alertas_fake` writer connection and Monitor source adapter; the Stage 3 probe proves the contract but does not connect the applications.
3. Implement source-compatible A02/A03/A05 write fixtures using only the approved tables and mappings; keep all Monitor-owned state in PostgreSQL.
4. Reconcile the rejected A03 `strongerA07` field and suppression behavior in contracts, fixtures, simulator code, UI, and tests.
5. Run the normal scheduler and complete-cycle lifecycle in Stage 4. Do not remove `monitor_sim_*` until Stage 5 replacement acceptance passes.

A02 and A05 contract status remains local-query-proven and production-pending. Aurora replication, failover, replica lag, managed credentials, production permissions, and production query approval remain Phase 10.
