SELECT
  ot.id AS workOrderId,
  ot.codigo_orden_trabajo AS workOrderCode,
  1 AS active,
  0 AS consumptionCount,
  ot.fecha_inicio_ejecucion AS sourceTimestamp
FROM ordenes_trabajo AS ot
WHERE ot.fecha_inicio_ejecucion IS NOT NULL
  AND ot.fecha_inicio_ejecucion <= :cutoff
  AND ot.fecha_fin_ejecucion IS NULL
  AND ot.fecha_eliminacion IS NULL
  AND ot.eliminado = 0
  AND ot.id > :after_id
  AND NOT EXISTS (
    SELECT 1
    FROM orden_trabajo_materiales AS material
    WHERE material.id_orden_trabajo = ot.id
      AND material.fecha_eliminacion IS NULL
      AND material.eliminado = 0
      AND material.cantidad_consumida > 0
  )
ORDER BY ot.id
LIMIT :result_limit;
