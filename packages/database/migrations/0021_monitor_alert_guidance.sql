CREATE TABLE IF NOT EXISTS monitor_alert_guidance (
  rule_code TEXT PRIMARY KEY CHECK (rule_code ~ '^[A-E][0-9]{2}$'),
  steps JSONB NOT NULL CHECK (jsonb_typeof(steps) = 'array' AND jsonb_array_length(steps) > 0),
  source TEXT NOT NULL DEFAULT 'alert_catalog',
  updated_by_sys_user_id BIGINT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO monitor_alert_guidance (rule_code, steps) VALUES
('A01', '["Reserva el material, confirma su disponibilidad y despáchalo; si no estará listo, reprograma la OT.","Si ya se usó fuera de EmusaSoft y no puede reconstruirse el historial con seguridad, cierra sin resolución la cadena correlacionada."]'),
('A02', '["Registra la recepción real del material, o corrige, cancela o rechaza el movimiento.","Si no puede reconstruirse el traspaso anterior desde los registros de origen, cierra sin resolución conservando el último estado y destino registrados; no infieras la llegada ni la ubicación física."]'),
('A03', '["Registra el primer consumo válido mientras la OT siga abierta, o cierra o cancela la OT si no hubo consumo.","Si la condición histórica no puede reconstruirse, cierra sin resolución sin inventar un consumo."]'),
('A04', '["Declara la bobina o merma faltante, o corrige los datos de entrada, salida, desperdicio o peso.","Si la evidencia física confirma un falso positivo, cierra sin resolución y conserva esa evidencia."]'),
('A05', '["Pesa la bobina y registra su movimiento al siguiente destino, o corrige la asociación de balanza, código o movimiento.","Si la bobina ya no es trazable, cierra sin resolución conservando su última ubicación conocida."]'),
('A06', '["Declara o pesa la merma faltante y corrige su categoría.","Si la cantidad faltante no puede recuperarse, cierra sin resolución y vincula la diferencia resultante de D03."]'),
('A07', '["Declara el consumo faltante mientras la entrada de la OT siga habilitada, o corrige la evidencia de producción o merma.","Si la entrada está bloqueada y no puede reconstruirse, cierra sin resolución y vincula D03."]'),
('B01', '["Actualiza la secuencia del plan vigente y registra el motivo real del cambio.","Si la desviación histórica ya ocurrió y no puede reconstruirse, ciérrala como explicada o sin resolución."]'),
('B02', '["Inicia la OT, registra una pausa real o reprograma la OT actualizando todo el plan.","Si el retraso histórico no puede reconstruirse, cierra sin resolución conservando la versión del plan afectada."]'),
('B03', '["Inicia la siguiente OT, registra la pausa real del equipo o actualiza el intervalo de producción esperado.","Si el tiempo inactivo histórico no puede explicarse, consérvalo al cerrar sin resolución."]'),
('C01', '["Vuelve a pesar la bobina y corrige la unidad, el código o la asociación con la balanza.","Si el peso excepcional es correcto, cierra sin resolución conservando ambas mediciones."]'),
('C02', '["Vuelve a pesar la merma o corrige su categoría y unidad.","Si la merma excepcional es correcta, cierra sin resolución en vez de alterar el valor para ajustarlo al modelo."]'),
('C06', '["Corrige la cantidad producida, los tiempos de ejecución o las pausas faltantes.","Si la velocidad excepcional es correcta, cierra sin resolución conservando su evidencia y la versión del modelo."]'),
('D01', '["Declara el consumo faltante o corrige los metros y datos de las bobinas.","Si el historial bloqueado no puede recuperarse, cierra sin resolución conservando la diferencia de metros restante."]'),
('D02', '["Declara el material consumido, devuelve o reasigna el material no usado, o corrige el cierre y la reserva de la OT.","Si no puede probarse el destino de una bobina, conserva el caso como excepción de inventario."]'),
('D03', '["Resuelve primero la causa específica vinculada y vuelve a calcular el balance.","Si la diferencia residual no puede reconstruirse o se acepta, cierra sin resolución conservando la diferencia final, tolerancia, evidencia e incidentes vinculados."]'),
('D04', '["Declara, pesa, identifica y devuelve la bobina remanente, o corrige los metros de corrida y de bobina.","Si el historial bloqueado no puede reconstruirse, cierra sin resolución y conserva la diferencia para el seguimiento posterior en EmusaSoft."]'),
('E01', '["Repón el inventario de seguridad, usa un sustituto aprobado o reprograma o cancela la OT.","Si la ventana histórica de preparación ya pasó, cierra sin resolución y registra si la producción continuó."]'),
('E02', '["Registra las cantidades iniciales de cada contenedor y material; reconstrúyelas solo desde registros trazables.","Si no es posible, cierra sin resolución y vincula E03, E04 o D03 según corresponda."]'),
('E03', '["Corrige la cantidad de cierre o apertura, o registra el movimiento trazable que explica la diferencia.","Si ninguno de los dos valores puede probarse, cierra sin resolución para el par de OTs y conserva la diferencia."]'),
('E04', '["Corrige las cantidades de inventario, la asociación del tornillo o la versión de la receta usada para la comparación.","Si se aprueba la formulación excepcional, cierra sin resolución conservando al autorizador y el motivo."]'),
('E05', '["Corrige el inventario inicial, las adiciones registradas o el inventario final que produjo el consumo calculado negativo.","Si la OT está bloqueada, conserva la diferencia para el seguimiento posterior en EmusaSoft."]')
ON CONFLICT (rule_code) DO NOTHING;
