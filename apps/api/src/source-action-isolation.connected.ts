import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { loadSourceActionContracts, TestDatabaseConnections, TestDatabaseScenarioRepository, type SourceActionId } from "@monitor/detection";
import { workerGroupForIncident } from "../test/routing-fixtures.js";
import { buildMonitorServer, type MonitorServer } from "./server.js";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const manager = { authorization: "Bearer mock:plant-manager" };
const sqlValues = (values: unknown[]) => values as Array<string | number | Date | null>;

async function monitorSnapshot(instance: MonitorServer): Promise<Record<string, string[]>> {
  const discovered = await instance.database.queryAll(`SELECT table_name AS "tableName" FROM information_schema.tables
    WHERE table_schema=current_schema() AND table_type='BASE TABLE' AND left(table_name,8)='monitor_' ORDER BY table_name`);
  const entries = await Promise.all(discovered.map(async ({ tableName }) => {
    const table = String(tableName);
    const rows = await instance.database.queryAll(`SELECT to_jsonb(snapshot_row)::text AS row
      FROM ${table} snapshot_row ORDER BY to_jsonb(snapshot_row)::text`);
    return [table, rows.map((row) => String(row.row))] as const;
  }));
  return Object.fromEntries(entries);
}

function identifier(value: string): string {
  if (!/^[a-z][a-z0-9_]*$/i.test(value)) throw new Error("invalid_source_isolation_identifier");
  return `\`${value}\``;
}

async function sourceTableDigests(connections: TestDatabaseConnections, tableNames: string[]) {
  const digests: Record<string, { columns: string[]; rowCount: number; digest: string }> = {};
  for (const table of [...tableNames].sort()) {
    const [columnRows] = await connections.writer.query(`SELECT COLUMN_NAME AS columnName FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION`, [table]);
    const columns = (columnRows as Array<{ columnName: string }>).map(({ columnName }) => String(columnName));
    assert.ok(columns.includes("id") && columns.length > 0, `${table} requires a stable source digest key`);
    const hash = createHash("sha256");
    let rowCount = 0;
    let lastId: unknown;
    while (true) {
      const after = lastId === undefined ? "" : " WHERE id>?";
      const parameters = lastId === undefined ? [] : sqlValues([lastId]);
      const [page] = await connections.writer.query(`SELECT id,SHA2(CAST(JSON_ARRAY(${columns.map(identifier).join(",")}) AS CHAR),256) AS rowDigest
        FROM ${identifier(table)}${after} ORDER BY id LIMIT 1000`, parameters);
      const values = page as Array<{ id: unknown; rowDigest: string }>;
      for (const value of values) {
        const key = String(value.id);
        const rowDigest = String(value.rowDigest);
        hash.update(`${key.length}:${key}${rowDigest.length}:${rowDigest}`);
      }
      rowCount += values.length;
      if (values.length < 1000) break;
      lastId = values.at(-1)!.id;
    }
    digests[table] = { columns, rowCount, digest: hash.digest("hex") };
  }
  return digests;
}

export async function assertCanonicalSourceActionIsolation(): Promise<void> {
  const instance = await buildMonitorServer({
    config: {
      nodeEnv: "test", cookieSecret: "phase-6-source-isolation-secret-with-enough-entropy", allowMockAuth: true,
      enableScenarioLab: true, scenarioSource: "test_database", databaseMode: "pglite", pgliteDataDir: "memory://",
    },
  });
  const connections = await TestDatabaseConnections.create(repositoryRoot);
  const repository = await TestDatabaseScenarioRepository.create(connections, repositoryRoot);
  const contracts = await loadSourceActionContracts(repositoryRoot);
  const expectedActionIds = contracts.actions.map(({ id }) => id).sort();
  const sourceTables = [...new Set(contracts.actions.flatMap(({ mutations }) => mutations.map(({ table }) => table)))];
  const sourceBefore = await sourceTableDigests(connections, sourceTables);
  const seen = new Set<SourceActionId>();
  const flowIdsBefore = new Set<number>();
  const scaleMarkers = new Set<number>();
  const sourceRows = new Map<string, Record<string, unknown>>();
  const sourceLists = new Map<string, Array<Record<string, unknown>>>();

  const row = async (name: string, sql: string, parameters: unknown[]) => {
    const [rows] = await connections.writer.query(sql, parameters);
    const value = { ...(rows as Array<Record<string, unknown>>)[0]! };
    assert.ok(value, `missing source fixture ${name}`);
    sourceRows.set(name, value);
    return value;
  };
  const rows = async (name: string, sql: string, parameters: unknown[]) => {
    const [values] = await connections.writer.query(sql, parameters);
    const result = (values as Array<Record<string, unknown>>).map((value) => ({ ...value }));
    sourceLists.set(name, result);
    return result;
  };
  const execute = async (actionId: SourceActionId, key: number, authority?: "origin" | "destination") => {
    const before = await monitorSnapshot(instance);
    const response = await instance.app.inject({
      method: "POST", url: "/api/dev/source-actions", headers: manager,
      payload: { actionId, key, ...(authority ? { authority } : {}) },
    });
    assert.equal(response.statusCode, 200, `${actionId}: ${response.body}`);
    assert.equal(response.json().execution.actionId, actionId);
    assert.deepEqual(await monitorSnapshot(instance), before, `${actionId} changed Monitor before polling`);
    seen.add(actionId);
    return response.json();
  };
  const dispatch = async () => {
    const result = await execute("a02.prepare_dispatch", repository.fixtureIds.A02.flowId);
    const created = (result.execution.sourceDiff.after as Array<{ table: string; key: number; values: Record<string, unknown> }>)
      .filter((record) => record.table === "flujo_materiales_detalles" && record.values.observacion === "MONITOR-STAGE5-A02-DISPATCH")
      .sort((left, right) => right.key - left.key)[0];
    assert.ok(created && created.key !== repository.fixtureIds.A02.flowId);
    return created.key;
  };

  try {
    const [existingFlows] = await connections.writer.query("SELECT id FROM flujo_materiales_detalles WHERE observacion LIKE 'MONITOR-STAGE5-%'");
    for (const existing of existingFlows as Array<{ id: number }>) flowIdsBefore.add(Number(existing.id));

    const fixtureFlowId = repository.fixtureIds.A02.flowId;
    await row("a02.flow", `SELECT id,estado,fecha_recepcion,fecha_creacion,fecha_actualizacion
      FROM flujo_materiales_detalles WHERE id=?`, [fixtureFlowId]);
    await connections.writer.execute(`UPDATE flujo_materiales_detalles SET estado='TRANSITO',fecha_recepcion=NULL,
      fecha_creacion=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 31 MINUTE) WHERE id=?`, [fixtureFlowId]);
    const scenarioState = (await instance.app.inject({ method: "GET", url: "/api/dev/scenarios", headers: manager })).json().scenarios
      .find((scenario: { ruleCode: string }) => scenario.ruleCode === "A02");
    const workerGroup = workerGroupForIncident(scenarioState.scenarioClock.currentAt, "Día");
    const assignment = (id: string, person: string, position: string, scope: string, operations: string[] = [], warehouseType: string | null = null) => ({
      id, person, position, operations, warehouseType, scope, group: scope.endsWith("_group") ? workerGroup : null,
      validFrom: "2026-07-01", validTo: null, state: "active", setupComplete: true,
    });
    const roster = await instance.app.inject({ method: "PUT", url: "/api/roster/assignments", headers: manager, payload: { revision: 0, assignments: [
      assignment("manager", "María Torres", "Gerente de fábrica", "factory"),
      assignment("leader", "Rosa Paredes", "Líder técnico", "operation", ["Impresión"]),
      assignment("operator", "Jorge Acosta", "Operador de máquina", "machine_group", ["Impresión"]),
      assignment("dispatcher", "Carlos Mendoza", "Despachador de almacén", "warehouse_group", [], "Materias primas"),
      assignment("warehouse-supervisor", "Sofía Ramos", "Supervisor de almacén", "warehouse_group", [], "Materias primas"),
    ] } });
    assert.equal(roster.statusCode, 200, roster.body);
    const seededPoll = await instance.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
    assert.equal(seededPoll.statusCode, 200, seededPoll.body);
    assert.equal(seededPoll.json().result.status, "healthy");
    const conversations = await instance.app.inject({ method: "GET", url: "/api/conversations", headers: manager });
    assert.equal(conversations.statusCode, 200, conversations.body);
    const conversationId = String(conversations.json().conversations[0]?.id ?? "");
    assert.ok(conversationId);
    const messages = await instance.app.inject({ method: "GET", url: `/api/conversations/${conversationId}/messages`, headers: manager });
    assert.equal(messages.statusCode, 200, messages.body);
    const messageCursor = Number(messages.json().messages.at(-1)?.cursor);
    assert.ok(messageCursor > 0);
    const markedRead = await instance.app.inject({ method: "POST", url: `/api/conversations/${conversationId}/read`, headers: manager, payload: { cursor: messageCursor } });
    assert.equal(markedRead.statusCode, 204, markedRead.body);
    const seededMonitor = await monitorSnapshot(instance);
    for (const table of ["monitor_incident", "monitor_routing_decision", "monitor_notification_delivery", "monitor_conversation",
      "monitor_message", "monitor_message_receipt", "monitor_conversation_user_state", "monitor_change_event"] as const) {
      assert.ok(seededMonitor[table]!.length > 0, `${table} must be non-empty before isolation checks`);
    }

    const receivedId = await dispatch();
    await execute("a02.receive", receivedId);
    const cancelledId = await dispatch();
    await execute("a02.cancel", cancelledId, "origin");
    const rejectedId = await dispatch();
    await execute("a02.reject", rejectedId, "destination");

    const workOrderId = repository.fixtureIds.A03.workOrderId;
    const workOrder = await row("a03.work_order", `SELECT id,id_equipo,fecha_inicio_ejecucion,fecha_fin_ejecucion,
      fecha_eliminacion,eliminado,fecha_actualizacion FROM ordenes_trabajo WHERE id=?`, [workOrderId]);
    const competitors = await rows("a03.competitors", `SELECT id,fecha_fin_ejecucion,fecha_actualizacion FROM ordenes_trabajo
      WHERE id_equipo=? AND id<>? AND fecha_inicio_ejecucion IS NOT NULL AND fecha_fin_ejecucion IS NULL
      AND fecha_eliminacion IS NULL AND eliminado=0`, [workOrder.id_equipo, workOrderId]);
    const materials = await rows("a03.materials", `SELECT id,cantidad_consumida,fecha_actualizacion FROM orden_trabajo_materiales
      WHERE id_orden_trabajo=? AND fecha_eliminacion IS NULL AND eliminado=0 ORDER BY id`, [workOrderId]);
    assert.ok(materials.length > 0);
    for (const competitor of competitors) await connections.writer.execute("UPDATE ordenes_trabajo SET fecha_fin_ejecucion=UTC_TIMESTAMP() WHERE id=?", sqlValues([competitor.id]));
    await connections.writer.execute(`UPDATE ordenes_trabajo SET fecha_inicio_ejecucion=NULL,fecha_fin_ejecucion=NULL,
      fecha_eliminacion=NULL,eliminado=0 WHERE id=?`, [workOrderId]);
    await connections.writer.execute("UPDATE orden_trabajo_materiales SET cantidad_consumida=0 WHERE id=?", sqlValues([materials[0]!.id]));
    await execute("a03.start_work_order", workOrderId);
    await execute("a03.record_first_consumption", workOrderId);
    await execute("a03.close_work_order", workOrderId);
    await connections.writer.execute(`UPDATE ordenes_trabajo SET fecha_inicio_ejecucion=UTC_TIMESTAMP(),fecha_fin_ejecucion=NULL,
      fecha_eliminacion=NULL,eliminado=0 WHERE id=?`, [workOrderId]);
    await execute("a03.cancel_work_order", workOrderId);

    const [producedRows] = await connections.writer.query(`SELECT id FROM articulo_serial
      WHERE id_orden_trabajo_origen IS NOT NULL AND fecha_eliminacion IS NULL ORDER BY id LIMIT 1`);
    const producedId = Number((producedRows as Array<{ id: number }>)[0]?.id);
    const remnantId = repository.fixtureIds.A05.serialId;
    assert.ok(producedId > 0);
    for (const serialId of new Set([producedId, remnantId])) await row(`serial.${serialId}`, `SELECT id,tipo,estado,fecha_creacion,
      fecha_actualizacion,id_almacen FROM articulo_serial WHERE id=?`, [serialId]);
    await execute("a05.declare_produced_reel", producedId);
    await execute("a05.declare_remnant_reel", remnantId);

    const [weighableRows] = await connections.writer.query(`SELECT serial.id FROM articulo_serial serial
      WHERE serial.fecha_eliminacion IS NULL AND NOT EXISTS (
        SELECT 1 FROM balanza_carga_detalle_registros scale WHERE scale.id_articulo_serial=serial.id AND scale.eliminado=0
      ) ORDER BY serial.id LIMIT 1`);
    const weighableId = Number((weighableRows as Array<{ id: number }>)[0]?.id);
    assert.ok(weighableId > 0);
    await execute("a05.register_weighing", weighableId);
    scaleMarkers.add(weighableId);

    const originWarehouseId = repository.fixtureIds.A05.originWarehouseId;
    await connections.writer.execute("UPDATE articulo_serial SET id_almacen=? WHERE id=?", [originWarehouseId, remnantId]);
    await execute("a05.register_movement", remnantId);

    await row("a05.work_order", `SELECT work_order.id,work_order.fecha_fin_ejecucion,work_order.fecha_eliminacion,
      work_order.eliminado,work_order.fecha_actualizacion
      FROM articulo_serial serial JOIN ordenes_trabajo work_order
      ON work_order.id=COALESCE(serial.id_orden_trabajo_origen,serial.id_ultimo_orden_trabajo_cierre)
      WHERE serial.id=?`, [remnantId]);
    await connections.writer.execute(`UPDATE ordenes_trabajo SET fecha_fin_ejecucion=NULL,fecha_eliminacion=NULL,eliminado=0
      WHERE id=(SELECT work_order_id FROM (SELECT COALESCE(id_orden_trabajo_origen,id_ultimo_orden_trabajo_cierre) AS work_order_id
      FROM articulo_serial WHERE id=?) selected)`, [remnantId]);
    await execute("a05.close_source_work_order", remnantId);

    const [handoffs] = await connections.writer.query(`SELECT id FROM flujo_materiales_detalles
      WHERE id_articulo_serial=? AND observacion='MONITOR-STAGE5-A05-HANDOFF' AND fecha_eliminacion IS NULL`, [remnantId]);
    assert.equal((handoffs as unknown[]).length, 0, "source fixture already has a Stage 5 handoff");
    await connections.writer.execute("UPDATE articulo_serial SET id_almacen=? WHERE id=?", [originWarehouseId, remnantId]);
    await execute("a05.handoff_to_a02", remnantId);

    assert.deepEqual([...seen].sort(), expectedActionIds);
  } finally {
    try {
      for (const serialId of scaleMarkers) {
        await connections.writer.execute("DELETE FROM balanza_carga_detalle_registros WHERE id_articulo_serial=? AND secuencia=?", [serialId, `MONITOR-STAGE5-${serialId}`]);
      }
      const [currentFlows] = await connections.writer.query("SELECT id,id_padre FROM flujo_materiales_detalles WHERE observacion LIKE 'MONITOR-STAGE5-%'");
      const createdFlowIds = (currentFlows as Array<{ id: number }>).map((value) => Number(value.id)).filter((id) => !flowIdsBefore.has(id));
      if (createdFlowIds.length > 0) {
        const placeholders = createdFlowIds.map(() => "?").join(",");
        await connections.writer.execute(`DELETE FROM flujo_materiales_detalles WHERE id_padre IN (${placeholders})`, createdFlowIds);
        await connections.writer.execute(`DELETE FROM flujo_materiales_detalles WHERE id IN (${placeholders})`, createdFlowIds);
      }
      const a02 = sourceRows.get("a02.flow");
      if (a02) await connections.writer.execute(`UPDATE flujo_materiales_detalles SET estado=?,fecha_recepcion=?,
        fecha_creacion=?,fecha_actualizacion=? WHERE id=?`, sqlValues([a02.estado, a02.fecha_recepcion, a02.fecha_creacion, a02.fecha_actualizacion, a02.id]));
      for (const material of sourceLists.get("a03.materials") ?? []) await connections.writer.execute(
        "UPDATE orden_trabajo_materiales SET cantidad_consumida=?,fecha_actualizacion=? WHERE id=?",
        sqlValues([material.cantidad_consumida, material.fecha_actualizacion, material.id]),
      );
      for (const competitor of sourceLists.get("a03.competitors") ?? []) await connections.writer.execute(
        "UPDATE ordenes_trabajo SET fecha_fin_ejecucion=?,fecha_actualizacion=? WHERE id=?",
        sqlValues([competitor.fecha_fin_ejecucion, competitor.fecha_actualizacion, competitor.id]),
      );
      for (const [name, serial] of sourceRows) if (name.startsWith("serial.")) await connections.writer.execute(
        "UPDATE articulo_serial SET tipo=?,estado=?,fecha_creacion=?,fecha_actualizacion=?,id_almacen=? WHERE id=?",
        sqlValues([serial.tipo, serial.estado, serial.fecha_creacion, serial.fecha_actualizacion, serial.id_almacen, serial.id]),
      );
      const a05 = sourceRows.get("a05.work_order");
      if (a05) await connections.writer.execute(`UPDATE ordenes_trabajo SET fecha_fin_ejecucion=?,fecha_eliminacion=?,
        eliminado=?,fecha_actualizacion=? WHERE id=?`, sqlValues([a05.fecha_fin_ejecucion, a05.fecha_eliminacion,
        a05.eliminado, a05.fecha_actualizacion, a05.id]));
      const a03 = sourceRows.get("a03.work_order");
      if (a03) await connections.writer.execute(`UPDATE ordenes_trabajo SET fecha_inicio_ejecucion=?,fecha_fin_ejecucion=?,
        fecha_eliminacion=?,eliminado=?,fecha_actualizacion=? WHERE id=?`, sqlValues([a03.fecha_inicio_ejecucion, a03.fecha_fin_ejecucion,
        a03.fecha_eliminacion, a03.eliminado, a03.fecha_actualizacion, a03.id]));
      assert.deepEqual(await sourceTableDigests(connections, sourceTables), sourceBefore, "source fixtures were not fully restored");
    } finally {
      await connections.close();
      await instance.close();
    }
  }
}
