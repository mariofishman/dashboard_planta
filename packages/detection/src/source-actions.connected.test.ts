import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { after, before, describe, it } from "node:test";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import type { ScenarioSourceAction } from "./simulator.js";
import { a02TerminalActionFor, loadSourceActionContracts, sourceActionIds, type SourceActionContract, type SourceActionId } from "./source-actions.js";
import { TestDatabaseConnections, TestDatabaseScenarioRepository } from "./test-database.js";

const root = resolve(import.meta.dirname, "../../..");
const runtimeAvailable = existsSync(resolve(root, "local-data/test-database/state/ready"))
  && existsSync(resolve(root, "local-data/test-database/secrets/writer.host.cnf"));

describe("connected Stage 5 source actions", { skip: !runtimeAvailable }, () => {
  let connections: TestDatabaseConnections;
  let repository: TestDatabaseScenarioRepository;
  let baseline: string;
  let contracts: SourceActionContract[];
  const evidencedActions = new Set<SourceActionId>();

  async function sourceSnapshot(): Promise<string> {
    const [a02] = await connections.writer.query<RowDataPacket[]>(`SELECT estado,fecha_recepcion,id_almacen_origen,id_almacen_destino
      FROM flujo_materiales_detalles WHERE id=?`, [repository.fixtureIds.A02.flowId]);
    const [a03] = await connections.writer.query<RowDataPacket[]>(`SELECT fecha_inicio_ejecucion,fecha_fin_ejecucion,fecha_eliminacion,eliminado
      FROM ordenes_trabajo WHERE id=?`, [repository.fixtureIds.A03.workOrderId]);
    const [material] = await connections.writer.query<RowDataPacket[]>("SELECT cantidad_consumida FROM orden_trabajo_materiales WHERE id=?", [repository.fixtureIds.A03.materialId]);
    const [a05] = await connections.writer.query<RowDataPacket[]>(`SELECT tipo,estado,id_almacen,fecha_creacion
      FROM articulo_serial WHERE id=?`, [repository.fixtureIds.A05.serialId]);
    const [markerCounts] = await connections.writer.query<RowDataPacket[]>(`SELECT
      (SELECT COUNT(*) FROM flujo_materiales_detalles WHERE observacion LIKE 'MONITOR-STAGE5-%') AS movementMarkers,
      (SELECT COUNT(*) FROM balanza_carga_detalle_registros WHERE secuencia LIKE 'MONITOR-STAGE5-%') AS scaleMarkers`);
    return JSON.stringify({ a02: a02[0], a03: a03[0], material: material[0], a05: a05[0], markerCounts: markerCounts[0] });
  }

  before(async () => {
    connections = await TestDatabaseConnections.create(root);
    repository = await TestDatabaseScenarioRepository.create(connections, root);
    contracts = (await loadSourceActionContracts(root)).actions;
    baseline = await sourceSnapshot();
  });

  after(async () => {
    try {
      assert.deepEqual([...evidencedActions].sort(), [...sourceActionIds].sort());
      assert.equal(await sourceSnapshot(), baseline);
    }
    finally { await connections?.close(); }
  });

  async function rollback(work: (connection: PoolConnection) => Promise<void>): Promise<void> {
    const connection = await connections.writer.getConnection();
    try {
      await connection.beginTransaction();
      await work(connection);
    } finally {
      await connection.rollback();
      connection.release();
    }
  }

  async function evidencedAction(connection: PoolConnection, code: "A02" | "A03" | "A05", action: ScenarioSourceAction, key: number) {
    const contract = contracts.find((candidate) => candidate.ruleCode === code && candidate.invocation.argument === action);
    assert.ok(contract, `missing contract for ${code}.${action}`);
    const evidence = await repository.applySourceActionWithEvidence(connection, code, action, key, contract);
    assert.equal(evidence.writerIdentity, "alertas_fake");
    assert.equal(evidence.unrelatedRows.after.digest, evidence.unrelatedRows.before.digest);
    assert.deepEqual(evidence.unrelatedRows.after.tables, evidence.unrelatedRows.before.tables);
    for (const tableEvidence of evidence.unrelatedRows.before.tables) {
      const [columnRows] = await connection.query<RowDataPacket[]>(`SELECT COLUMN_NAME AS columnName
        FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION`, [tableEvidence.table]);
      assert.deepEqual(tableEvidence.columns, columnRows.map((row) => String(row.columnName)), `${contract.id} must digest every ${tableEvidence.table} column`);
    }
    assert.ok(evidence.changes.length > 0, `${contract.id} must record at least one changed field`);
    assert.deepEqual(evidence.changedTables, Object.keys(evidence.changedFields).sort());
    const allowed = new Map<string, Set<string>>();
    for (const mutation of contract.mutations) {
      const fields = allowed.get(mutation.table) ?? new Set<string>();
      mutation.fields.forEach((field) => fields.add(field));
      allowed.set(mutation.table, fields);
    }
    for (const change of evidence.changes) assert.ok(allowed.get(change.table)?.has(change.field), `${contract.id} changed undeclared ${change.table}.${change.field}`);
    evidencedActions.add(contract.id);
    return evidence;
  }

  async function unchangedAfterRejection(
    connection: PoolConnection,
    snapshot: () => Promise<unknown>,
    work: () => Promise<unknown>,
    expected: RegExp,
  ): Promise<void> {
    const before = await snapshot();
    await assert.rejects(work(), expected);
    assert.deepEqual(await snapshot(), before);
  }

  const selected = async (connection: PoolConnection, sql: string, parameters: unknown[]) => {
    const [rows] = await connection.query<RowDataPacket[]>(sql, parameters);
    return rows.map((row) => ({ ...row }));
  };

  it("uses alertas_fake and keeps A02 dispatch, receipt, cancellation, and rejection forward-only", async () => {
    await rollback(async (connection) => {
      const [identityRows] = await connection.query<RowDataPacket[]>("SELECT CURRENT_USER() AS currentUser");
      assert.match(String(identityRows[0]?.currentUser), /^alertas_fake@/);

      const flowId = repository.fixtureIds.A02.flowId;
      const [unrelatedRows] = await connection.query<RowDataPacket[]>(`SELECT id,estado,fecha_recepcion,id_almacen_origen,id_almacen_destino
        FROM flujo_materiales_detalles WHERE id<>? ORDER BY id LIMIT 1`, [flowId]);
      const unrelatedBefore = { ...unrelatedRows[0] };

      await evidencedAction(connection, "A02", "prepare_dispatch", flowId);
      const [dispatchRows] = await connection.query<RowDataPacket[]>(`SELECT id,estado,fecha_recepcion,id_padre FROM flujo_materiales_detalles
        WHERE observacion='MONITOR-STAGE5-A02-DISPATCH' ORDER BY id DESC LIMIT 1`);
      assert.ok(Number(dispatchRows[0]?.id) > 0);
      assert.equal(dispatchRows[0]?.estado, "TRANSITO");
      assert.equal(dispatchRows[0]?.fecha_recepcion, null);
      assert.equal(dispatchRows[0]?.id_padre, null);

      const dispatchId = Number(dispatchRows[0]?.id);
      await evidencedAction(connection, "A02", "receive", dispatchId);
      const [receivedRows] = await connection.query<RowDataPacket[]>("SELECT estado,fecha_recepcion FROM flujo_materiales_detalles WHERE id=?", [dispatchId]);
      assert.equal(receivedRows[0]?.estado, "RECIBIDO");
      assert.ok(receivedRows[0]?.fecha_recepcion);
      await assert.rejects(repository.applySourceActionMutation(connection, "A02", "receive", dispatchId), /movement_terminal/);

      const [unrelatedAfterRows] = await connection.query<RowDataPacket[]>(`SELECT id,estado,fecha_recepcion,id_almacen_origen,id_almacen_destino
        FROM flujo_materiales_detalles WHERE id=?`, [unrelatedBefore.id]);
      assert.deepEqual({ ...unrelatedAfterRows[0] }, unrelatedBefore);
    });

    for (const authority of ["origin", "destination", "both"] as const) {
      await rollback(async (connection) => {
        const flowId = repository.fixtureIds.A02.flowId;
        await connection.execute("UPDATE flujo_materiales_detalles SET estado='TRANSITO',fecha_recepcion=NULL WHERE id=?", [flowId]);
        const [beforeRows] = await connection.query<RowDataPacket[]>(`SELECT id_almacen_origen,id_almacen_destino,id_ubicacion_almacen_origen,id_ubicacion_almacen_destino
          FROM flujo_materiales_detalles WHERE id=?`, [flowId]);
        const action = a02TerminalActionFor(authority);
        await evidencedAction(connection, "A02", action, flowId);
        const [originalRows] = await connection.query<RowDataPacket[]>("SELECT estado FROM flujo_materiales_detalles WHERE id=?", [flowId]);
        assert.equal(originalRows[0]?.estado, action === "cancel" ? "ANULADO" : "RECHAZADO");
        const [reverseRows] = await connection.query<RowDataPacket[]>(`SELECT id,estado,fecha_recepcion,id_almacen_origen,id_almacen_destino,
          id_ubicacion_almacen_origen,id_ubicacion_almacen_destino FROM flujo_materiales_detalles WHERE id_padre=?`, [flowId]);
        assert.equal(reverseRows.length, 1);
        assert.ok(Number(reverseRows[0]?.id) !== flowId);
        assert.equal(reverseRows[0]?.estado, "TRANSITO");
        assert.equal(reverseRows[0]?.fecha_recepcion, null);
        assert.equal(reverseRows[0]?.id_almacen_origen, beforeRows[0]?.id_almacen_destino);
        assert.equal(reverseRows[0]?.id_almacen_destino, beforeRows[0]?.id_almacen_origen);
        assert.equal(reverseRows[0]?.id_ubicacion_almacen_origen, beforeRows[0]?.id_ubicacion_almacen_destino);
        assert.equal(reverseRows[0]?.id_ubicacion_almacen_destino, beforeRows[0]?.id_ubicacion_almacen_origen);
        await assert.rejects(repository.applySourceActionMutation(connection, "A02", action, flowId), /movement_terminal/);
      });
    }
  });

  it("rejects an unrelated-row change in a field outside the action contract", async () => {
    await rollback(async (connection) => {
      const flowId = repository.fixtureIds.A02.flowId;
      const contract = contracts.find((candidate) => candidate.id === "a02.receive");
      assert.ok(contract);
      const [countRows] = await connection.query<RowDataPacket[]>("SELECT COUNT(*) AS rowCount FROM flujo_materiales_detalles WHERE id<>?", [flowId]);
      assert.ok(Number(countRows[0]?.rowCount) > 1000, "tamper proof must cross a digest page boundary");
      const [unrelatedRows] = await connection.query<RowDataPacket[]>("SELECT id FROM flujo_materiales_detalles WHERE id<>? ORDER BY id DESC LIMIT 1", [flowId]);
      const unrelatedId = Number(unrelatedRows[0]?.id);
      assert.ok(unrelatedId > 0);
      await connection.execute("UPDATE flujo_materiales_detalles SET estado='TRANSITO',fecha_recepcion=NULL WHERE id=?", [flowId]);

      const originalMutation = repository.applySourceActionMutation;
      repository.applySourceActionMutation = async (mutationConnection, code, action, key) => {
        await originalMutation.call(repository, mutationConnection, code, action, key);
        await mutationConnection.execute(`UPDATE flujo_materiales_detalles
          SET observacion=CONCAT(COALESCE(observacion,''),'#4.4A-TAMPER') WHERE id=?`, [unrelatedId]);
      };
      try {
        await assert.rejects(
          repository.applySourceActionWithEvidence(connection, "A02", "receive", flowId, contract),
          /source_action_unrelated_rows_changed/,
        );
      } finally {
        repository.applySourceActionMutation = originalMutation;
      }
    });
  });

  it("enforces A03 start, consumption, closure, and cancellation boundaries without deleting consumption", async () => {
    const workOrderId = repository.fixtureIds.A03.workOrderId;
    const materialId = repository.fixtureIds.A03.materialId;

    await rollback(async (connection) => {
      const [workOrderRows] = await connection.query<RowDataPacket[]>("SELECT id_equipo FROM ordenes_trabajo WHERE id=?", [workOrderId]);
      const [competitorRows] = await connection.query<RowDataPacket[]>("SELECT id FROM ordenes_trabajo WHERE id_equipo=? AND id<>? ORDER BY id LIMIT 1", [workOrderRows[0]?.id_equipo, workOrderId]);
      assert.ok(competitorRows[0]);
      const competitorId = Number(competitorRows[0]?.id);
      await connection.execute("UPDATE ordenes_trabajo SET fecha_inicio_ejecucion=NULL,fecha_fin_ejecucion=NULL,fecha_eliminacion=NULL,eliminado=0 WHERE id=?", [workOrderId]);
      await connection.execute("UPDATE ordenes_trabajo SET fecha_inicio_ejecucion=UTC_TIMESTAMP(),fecha_fin_ejecucion=NULL,fecha_eliminacion=NULL,eliminado=0 WHERE id=?", [competitorId]);
      await assert.rejects(repository.applySourceActionMutation(connection, "A03", "start_work_order", workOrderId), /machine_has_active_work_order/);
      await connection.execute("UPDATE ordenes_trabajo SET fecha_fin_ejecucion=UTC_TIMESTAMP() WHERE id=?", [competitorId]);
      await evidencedAction(connection, "A03", "start_work_order", workOrderId);
      await assert.rejects(repository.applySourceActionMutation(connection, "A03", "start_work_order", workOrderId), /work_order_already_started/);
    });

    await rollback(async (connection) => {
      await connection.execute("UPDATE ordenes_trabajo SET fecha_inicio_ejecucion=UTC_TIMESTAMP(),fecha_fin_ejecucion=NULL,fecha_eliminacion=NULL,eliminado=0 WHERE id=?", [workOrderId]);
      await connection.execute("UPDATE orden_trabajo_materiales SET cantidad_consumida=4.5 WHERE id=?", [materialId]);
      await evidencedAction(connection, "A03", "record_first_consumption", workOrderId);
      const [consumedRows] = await connection.query<RowDataPacket[]>("SELECT cantidad_consumida FROM orden_trabajo_materiales WHERE id=?", [materialId]);
      assert.equal(Number(consumedRows[0]?.cantidad_consumida), 4.5);
      await connection.execute("UPDATE ordenes_trabajo SET fecha_fin_ejecucion=UTC_TIMESTAMP() WHERE id=?", [workOrderId]);
      await assert.rejects(repository.applySourceActionMutation(connection, "A03", "record_first_consumption", workOrderId), /work_order_closed/);
    });

    for (const action of ["close_work_order", "cancel_work_order"] as const) {
      await rollback(async (connection) => {
        await connection.execute("UPDATE ordenes_trabajo SET fecha_inicio_ejecucion=UTC_TIMESTAMP(),fecha_fin_ejecucion=NULL,fecha_eliminacion=NULL,eliminado=0 WHERE id=?", [workOrderId]);
        const [beforeRows] = await connection.query<RowDataPacket[]>("SELECT cantidad_consumida FROM orden_trabajo_materiales WHERE id_orden_trabajo=? ORDER BY id", [workOrderId]);
        await evidencedAction(connection, "A03", action, workOrderId);
        const [afterRows] = await connection.query<RowDataPacket[]>("SELECT cantidad_consumida FROM orden_trabajo_materiales WHERE id_orden_trabajo=? ORDER BY id", [workOrderId]);
        assert.deepEqual(afterRows.map((row) => Number(row.cantidad_consumida)), beforeRows.map((row) => Number(row.cantidad_consumida)));
        await assert.rejects(repository.applySourceActionMutation(connection, "A03", "record_first_consumption", workOrderId), action === "close_work_order" ? /work_order_closed/ : /work_order_cancelled/);
      });
    }
  });

  it("executes produced and remnant declarations against source-valid serials", async () => {
    await rollback(async (connection) => {
      const [producedRows] = await connection.query<RowDataPacket[]>(`SELECT id FROM articulo_serial
        WHERE id_orden_trabajo_origen IS NOT NULL AND fecha_eliminacion IS NULL ORDER BY id LIMIT 1`);
      assert.ok(producedRows[0]);
      const producedId = Number(producedRows[0]?.id);
      await evidencedAction(connection, "A05", "declare_produced_reel", producedId);
      const [declaredRows] = await connection.query<RowDataPacket[]>("SELECT tipo,estado FROM articulo_serial WHERE id=?", [producedId]);
      assert.deepEqual({ tipo: declaredRows[0]?.tipo, estado: declaredRows[0]?.estado }, { tipo: "PRODUCTO_EN_PROCESO", estado: "CONFIRMAR_PESO" });
    });

    await rollback(async (connection) => {
      const remnantId = repository.fixtureIds.A05.serialId;
      await evidencedAction(connection, "A05", "declare_remnant_reel", remnantId);
      const [declaredRows] = await connection.query<RowDataPacket[]>("SELECT tipo,estado FROM articulo_serial WHERE id=?", [remnantId]);
      assert.deepEqual({ tipo: declaredRows[0]?.tipo, estado: declaredRows[0]?.estado }, { tipo: "SOBRANTE", estado: "CONFIRMAR_PESO" });
    });
  });

  it("makes A05 weighing, movement, OT closure, and A02 handoff one-way and idempotent where required", async () => {
    const serialId = repository.fixtureIds.A05.serialId;

    await rollback(async (connection) => {
      await connection.execute("DELETE FROM balanza_carga_detalle_registros WHERE id_articulo_serial=?", [serialId]);
      await evidencedAction(connection, "A05", "register_weighing", serialId);
      await repository.applySourceActionMutation(connection, "A05", "register_weighing", serialId);
      const [scaleRows] = await connection.query<RowDataPacket[]>("SELECT id FROM balanza_carga_detalle_registros WHERE id_articulo_serial=? AND eliminado=0", [serialId]);
      assert.equal(scaleRows.length, 1);
    });

    await rollback(async (connection) => {
      await connection.execute("UPDATE articulo_serial SET id_almacen=? WHERE id=?", [repository.fixtureIds.A05.originWarehouseId, serialId]);
      await evidencedAction(connection, "A05", "register_movement", serialId);
      const [movedRows] = await connection.query<RowDataPacket[]>("SELECT id_almacen FROM articulo_serial WHERE id=?", [serialId]);
      assert.equal(Number(movedRows[0]?.id_almacen), repository.fixtureIds.A05.movedWarehouseId);
      await assert.rejects(repository.applySourceActionMutation(connection, "A05", "register_movement", serialId), /reel_already_moved/);
    });

    await rollback(async (connection) => {
      const [beforeRows] = await connection.query<RowDataPacket[]>("SELECT tipo,estado,id_almacen,fecha_creacion FROM articulo_serial WHERE id=?", [serialId]);
      await connection.execute(`UPDATE ordenes_trabajo SET fecha_fin_ejecucion=NULL,fecha_eliminacion=NULL,eliminado=0
        WHERE id=(SELECT work_order_id FROM (SELECT COALESCE(id_orden_trabajo_origen,id_ultimo_orden_trabajo_cierre) AS work_order_id
        FROM articulo_serial WHERE id=?) selected)`, [serialId]);
      await evidencedAction(connection, "A05", "close_work_order", serialId);
      const [afterRows] = await connection.query<RowDataPacket[]>("SELECT tipo,estado,id_almacen,fecha_creacion FROM articulo_serial WHERE id=?", [serialId]);
      assert.deepEqual({ ...afterRows[0] }, { ...beforeRows[0] });
    });

    await rollback(async (connection) => {
      await connection.execute("UPDATE articulo_serial SET id_almacen=? WHERE id=?", [repository.fixtureIds.A05.originWarehouseId, serialId]);
      await connection.execute("DELETE FROM flujo_materiales_detalles WHERE id_articulo_serial=? AND observacion='MONITOR-STAGE5-A05-HANDOFF'", [serialId]);
      await evidencedAction(connection, "A05", "handoff", serialId);
      const [handoffRows] = await connection.query<RowDataPacket[]>(`SELECT id,estado,fecha_recepcion,id_almacen_origen,id_almacen_destino
        FROM flujo_materiales_detalles WHERE id_articulo_serial=? AND observacion='MONITOR-STAGE5-A05-HANDOFF'`, [serialId]);
      assert.equal(handoffRows.length, 1);
      assert.equal(handoffRows[0]?.estado, "TRANSITO");
      assert.equal(handoffRows[0]?.fecha_recepcion, null);
      assert.equal(Number(handoffRows[0]?.id_almacen_origen), repository.fixtureIds.A05.originWarehouseId);
      assert.equal(Number(handoffRows[0]?.id_almacen_destino), repository.fixtureIds.A05.movedWarehouseId);
      await assert.rejects(repository.applySourceActionMutation(connection, "A05", "handoff", serialId), /reel_already_moved|handoff_already_exists/);
    });

    await assert.rejects(repository.recur("A05"), /source_lifecycle_recurrence_unsupported/);
  });

  it("fails closed for the complete forward-only transition matrix", async () => {
    const flowId = repository.fixtureIds.A02.flowId;
    await rollback(async (connection) => {
      for (const terminal of ["RECIBIDO", "ANULADO", "RECHAZADO"] as const) {
        await connection.execute("UPDATE flujo_materiales_detalles SET estado=?,fecha_recepcion=UTC_TIMESTAMP() WHERE id=?", [terminal, flowId]);
        for (const action of ["receive", "cancel", "reject"] as const) {
          await unchangedAfterRejection(
            connection,
            () => selected(connection, "SELECT * FROM flujo_materiales_detalles WHERE id=? OR id_padre=? ORDER BY id", [flowId, flowId]),
            () => repository.applySourceActionMutation(connection, "A02", action, flowId),
            /movement_terminal/,
          );
        }
      }
    });

    const workOrderId = repository.fixtureIds.A03.workOrderId;
    await rollback(async (connection) => {
      const workOrderSnapshot = () => selected(connection, "SELECT * FROM ordenes_trabajo WHERE id=?", [workOrderId]);
      const materialSnapshot = () => selected(connection, "SELECT * FROM orden_trabajo_materiales WHERE id_orden_trabajo=? ORDER BY id", [workOrderId]);

      await connection.execute(`UPDATE ordenes_trabajo SET fecha_inicio_ejecucion=UTC_TIMESTAMP(),fecha_fin_ejecucion=NULL,
        fecha_eliminacion=NULL,eliminado=0 WHERE id=?`, [workOrderId]);
      await unchangedAfterRejection(connection, workOrderSnapshot,
        () => repository.applySourceActionMutation(connection, "A03", "start_work_order", workOrderId), /work_order_already_started/);

      await connection.execute(`UPDATE ordenes_trabajo SET fecha_inicio_ejecucion=UTC_TIMESTAMP(),fecha_fin_ejecucion=UTC_TIMESTAMP(),
        fecha_eliminacion=NULL,eliminado=0 WHERE id=?`, [workOrderId]);
      for (const [action, error] of [["start_work_order", /work_order_closed/], ["record_first_consumption", /work_order_closed/],
        ["close_work_order", /work_order_closed/], ["cancel_work_order", /work_order_closed/]] as const) {
        await unchangedAfterRejection(connection, action === "record_first_consumption" ? materialSnapshot : workOrderSnapshot,
          () => repository.applySourceActionMutation(connection, "A03", action, workOrderId), error);
      }

      await connection.execute(`UPDATE ordenes_trabajo SET fecha_inicio_ejecucion=UTC_TIMESTAMP(),fecha_fin_ejecucion=NULL,
        fecha_eliminacion=UTC_TIMESTAMP(),eliminado=1 WHERE id=?`, [workOrderId]);
      for (const [action, error] of [["start_work_order", /work_order_cancelled/], ["record_first_consumption", /work_order_cancelled/],
        ["close_work_order", /work_order_cancelled/], ["cancel_work_order", /work_order_cancelled/]] as const) {
        await unchangedAfterRejection(connection, action === "record_first_consumption" ? materialSnapshot : workOrderSnapshot,
          () => repository.applySourceActionMutation(connection, "A03", action, workOrderId), error);
      }

      await connection.execute(`UPDATE ordenes_trabajo SET fecha_inicio_ejecucion=NULL,fecha_fin_ejecucion=NULL,
        fecha_eliminacion=NULL,eliminado=0 WHERE id=?`, [workOrderId]);
      for (const action of ["record_first_consumption", "close_work_order"] as const) {
        await unchangedAfterRejection(connection, action === "record_first_consumption" ? materialSnapshot : workOrderSnapshot,
          () => repository.applySourceActionMutation(connection, "A03", action, workOrderId), /work_order_not_started/);
      }

      const [equipmentRows] = await connection.query<RowDataPacket[]>("SELECT id_equipo FROM ordenes_trabajo WHERE id=?", [workOrderId]);
      const [competitorRows] = await connection.query<RowDataPacket[]>("SELECT id FROM ordenes_trabajo WHERE id_equipo=? AND id<>? ORDER BY id LIMIT 1",
        [equipmentRows[0]?.id_equipo, workOrderId]);
      assert.ok(competitorRows[0]);
      await connection.execute(`UPDATE ordenes_trabajo SET fecha_inicio_ejecucion=UTC_TIMESTAMP(),fecha_fin_ejecucion=NULL,
        fecha_eliminacion=NULL,eliminado=0 WHERE id=?`, [competitorRows[0]!.id]);
      await unchangedAfterRejection(connection, workOrderSnapshot,
        () => repository.applySourceActionMutation(connection, "A03", "start_work_order", workOrderId), /machine_has_active_work_order/);

      await connection.execute(`UPDATE ordenes_trabajo SET fecha_inicio_ejecucion=UTC_TIMESTAMP(),fecha_fin_ejecucion=NULL,
        fecha_eliminacion=NULL,eliminado=0 WHERE id=?`, [workOrderId]);
      await connection.execute("UPDATE orden_trabajo_materiales SET cantidad_consumida=4.5 WHERE id=?", [repository.fixtureIds.A03.materialId]);
      await unchangedAfterRejection(connection, materialSnapshot,
        () => repository.applySourceActionMutation(connection, "A03", "remove_consumption" as ScenarioSourceAction, workOrderId), /invalid_source_action/);
    });

    const serialId = repository.fixtureIds.A05.serialId;
    await rollback(async (connection) => {
      await connection.execute("UPDATE articulo_serial SET id_almacen=? WHERE id=?", [repository.fixtureIds.A05.movedWarehouseId, serialId]);
      await unchangedAfterRejection(connection, () => selected(connection, "SELECT * FROM articulo_serial WHERE id=?", [serialId]),
        () => repository.applySourceActionMutation(connection, "A05", "register_movement", serialId), /reel_already_moved/);
    });
    for (const state of ["closed", "cancelled"] as const) await rollback(async (connection) => {
      const [rows] = await connection.query<RowDataPacket[]>(`SELECT COALESCE(id_orden_trabajo_origen,id_ultimo_orden_trabajo_cierre) AS workOrderId
        FROM articulo_serial WHERE id=?`, [serialId]);
      const sourceWorkOrderId = Number(rows[0]?.workOrderId);
      assert.ok(sourceWorkOrderId > 0);
      await connection.execute(`UPDATE ordenes_trabajo SET fecha_fin_ejecucion=?,fecha_eliminacion=?,eliminado=? WHERE id=?`,
        state === "closed" ? [new Date(), null, 0, sourceWorkOrderId] : [null, new Date(), 1, sourceWorkOrderId]);
      await unchangedAfterRejection(connection, () => selected(connection, "SELECT * FROM ordenes_trabajo WHERE id=?", [sourceWorkOrderId]),
        () => repository.applySourceActionMutation(connection, "A05", "close_work_order", serialId), state === "closed" ? /work_order_closed/ : /work_order_cancelled/);
    });
    for (const [action, field, error] of [["declare_produced_reel", "id_orden_trabajo_origen", /reel_source_work_order_missing/],
      ["declare_remnant_reel", "id_ultimo_orden_trabajo_cierre", /reel_closing_work_order_missing/]] as const) await rollback(async (connection) => {
      await connection.execute(`UPDATE articulo_serial SET ${field}=NULL WHERE id=?`, [serialId]);
      await unchangedAfterRejection(connection, () => selected(connection, "SELECT * FROM articulo_serial WHERE id=?", [serialId]),
        () => repository.applySourceActionMutation(connection, "A05", action, serialId), error);
    });
    await rollback(async (connection) => {
      await connection.execute("DELETE FROM flujo_materiales_detalles WHERE id_articulo_serial=? AND observacion='MONITOR-STAGE5-A05-HANDOFF'", [serialId]);
      await connection.execute("UPDATE articulo_serial SET id_almacen=? WHERE id=?", [repository.fixtureIds.A05.originWarehouseId, serialId]);
      await repository.applySourceActionMutation(connection, "A05", "handoff", serialId);
      await connection.execute("UPDATE articulo_serial SET id_almacen=? WHERE id=?", [repository.fixtureIds.A05.originWarehouseId, serialId]);
      const snapshot = async () => ({
        serial: await selected(connection, "SELECT * FROM articulo_serial WHERE id=?", [serialId]),
        handoff: await selected(connection, "SELECT * FROM flujo_materiales_detalles WHERE id_articulo_serial=? AND observacion='MONITOR-STAGE5-A05-HANDOFF' ORDER BY id", [serialId]),
      });
      await unchangedAfterRejection(connection, snapshot,
        () => repository.applySourceActionMutation(connection, "A05", "handoff", serialId), /handoff_already_exists/);
    });
    await assert.rejects(repository.recur("A05"), /source_lifecycle_recurrence_unsupported/);
  });
});
