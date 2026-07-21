SELECT
  s.id AS articleSerialId,
  s.codigo_serial AS serialCode,
  COALESCE(s.id_orden_trabajo_origen, s.id_ultimo_orden_trabajo_cierre) AS workOrderId,
  ot.codigo_orden_trabajo AS workOrderCode,
  s.fecha_creacion AS sourceTimestamp,
  s.id_almacen AS warehouseId,
  s.id_ubicacion AS locationId,
  CASE WHEN s.estado = 'CONFIRMAR_PESO' AND scale.id IS NULL THEN 1 ELSE 0 END AS notWeighed,
  CASE
    WHEN ot.fecha_fin_ejecucion IS NOT NULL
      AND ot.fecha_fin_ejecucion <= :cutoff
      AND warehouse.id_equipo = ot.id_equipo
    THEN 1 ELSE 0
  END AS stillAtMachine
FROM articulo_serial AS s
JOIN ordenes_trabajo AS ot
  ON ot.id = COALESCE(s.id_orden_trabajo_origen, s.id_ultimo_orden_trabajo_cierre)
LEFT JOIN balanza_carga_detalle_registros AS scale
  ON scale.id_articulo_serial = s.id
  AND scale.eliminado = 0
LEFT JOIN almacenes AS warehouse ON warehouse.id = s.id_almacen
WHERE s.fecha_eliminacion IS NULL
  AND s.id > :after_id
  AND s.fecha_creacion <= :cutoff
  AND s.estado IN ('CONFIRMAR_PESO', 'DISPONIBLE')
  AND (
    (s.tipo = 'PRODUCTO_EN_PROCESO' AND s.id_orden_trabajo_origen IS NOT NULL)
    OR
    (s.tipo IN ('ARTICULO', 'SALDO', 'SOBRANTE') AND s.id_ultimo_orden_trabajo_cierre IS NOT NULL)
  )
  AND (
    (s.estado = 'CONFIRMAR_PESO' AND scale.id IS NULL)
    OR (
      ot.fecha_fin_ejecucion IS NOT NULL
      AND ot.fecha_fin_ejecucion <= :cutoff
      AND warehouse.id_equipo = ot.id_equipo
    )
  )
  AND ot.eliminado = 0
ORDER BY s.id
LIMIT :result_limit;
