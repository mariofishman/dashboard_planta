SELECT
  f.id AS materialFlowDetailId,
  f.id_orden_trabajo AS workOrderId,
  f.id_orden_trabajo_material AS workOrderMaterialId,
  f.id_articulo_serial AS articleSerialId,
  ot.codigo_orden_trabajo AS workOrderCode,
  f.fecha_creacion AS sourceTimestamp,
  f.id_almacen_origen AS warehouseOriginId,
  f.id_almacen_destino AS warehouseDestinationId,
  f.id_ubicacion_almacen_origen AS locationOriginId,
  f.id_ubicacion_almacen_destino AS locationDestinationId
FROM flujo_materiales_detalles AS f
JOIN ordenes_trabajo AS ot ON ot.id = f.id_orden_trabajo
WHERE f.estado = 'TRANSITO'
  AND f.fecha_recepcion IS NULL
  AND f.fecha_eliminacion IS NULL
  AND f.id_orden_trabajo IS NOT NULL
  AND f.id_orden_trabajo_material IS NOT NULL
  AND f.id > :after_id
  AND f.fecha_creacion <= :cutoff
  AND ot.eliminado = 0
ORDER BY f.id
LIMIT :result_limit;
