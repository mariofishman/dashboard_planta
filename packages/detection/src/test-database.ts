import { constants } from "node:fs";
import { access, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import type { DatabaseRuntime } from "@monitor/database";
import mysql, { type Pool, type PoolConnection, type RowDataPacket } from "mysql2/promise";
import type {
  ScenarioAction,
  ScenarioCase,
  ScenarioCorrection,
  ScenarioFault,
  ScenarioRuleCode,
  ScenarioSource,
  ScenarioStatus,
} from "./simulator.js";
import type { DetectionQueryDefinition, DetectionSourceAdapter, SourcePage } from "./types.js";

const codes: ScenarioRuleCode[] = ["A02", "A03", "A05"];
export interface TestDatabaseFixtureSeeds { A02: number; A03: number; A05: number }
interface TestDatabaseFixtureDocument extends TestDatabaseFixtureSeeds { fixtureVersion: string; sourceRevision: string }
interface QueryContractDocument {
  alertTypeCode: string;
  queryId: string;
  queryVersion: string;
  naturalKey: string[];
  timeoutMs: number;
  resultLimit: number;
  cycleRowLimit: number;
  pollingIntervalSeconds: number;
}
const cases: Record<ScenarioRuleCode, ScenarioCase[]> = {
  A02: ["clean_baseline", "before_threshold", "at_threshold", "past_threshold"],
  A03: ["clean_baseline", "before_threshold", "at_threshold", "past_threshold"],
  A05: [
    "clean_baseline", "before_threshold_not_weighed", "before_threshold_still_at_machine", "before_threshold",
    "at_threshold_not_weighed", "at_threshold_still_at_machine", "at_threshold",
    "past_threshold_not_weighed", "past_threshold_still_at_machine", "past_threshold_both",
    "past_threshold_produced", "past_threshold_remnant", "movement_started",
  ],
};

interface ScenarioState {
  currentAt: string;
  revision: number;
  selectedCase: string;
  lastAction: string;
  lastActionAt: string;
  lastActionRecordedAt: string;
  sourceChangedAt: string;
  pendingFault: ScenarioFault | null;
}

interface FixtureIds {
  A02: { flowId: number };
  A03: { workOrderId: number; materialId: number };
  A05: { serialId: number; originWarehouseId: number; movedWarehouseId: number; creatorUserId: number };
}

interface ClientConfiguration {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

const asCode = (code: string): ScenarioRuleCode => {
  if (!codes.includes(code as ScenarioRuleCode)) throw new Error("unknown_scenario_rule");
  return code as ScenarioRuleCode;
};

const asCase = (code: ScenarioRuleCode, value: string): ScenarioCase => {
  if (!cases[code].includes(value as ScenarioCase)) throw new Error("invalid_scenario_case");
  return value as ScenarioCase;
};

const iso = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString();
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new Error("invalid_test_database_timestamp");
  return date.toISOString();
};

const before = (value: string, minutes: number) => new Date(Date.parse(value) - minutes * 60_000);

async function readMode600Configuration(path: string, expectedUser: "alertas_fake" | "monitor_source_ro"): Promise<ClientConfiguration> {
  await access(path, constants.R_OK);
  const metadata = await stat(path);
  if ((metadata.mode & 0o777) !== 0o600) throw new Error("test_database_credentials_must_be_mode_600");
  const values: Record<string, string> = {};
  for (const rawLine of (await readFile(path, "utf8")).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("[")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) throw new Error("invalid_test_database_credentials");
    values[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  if (values.host !== "127.0.0.1" || values.port !== "3307" || values.user !== expectedUser || !values.password) {
    throw new Error("unsafe_test_database_credentials");
  }
  return { host: values.host, port: 3307, user: expectedUser, password: values.password, database: "test_database" };
}

export class TestDatabaseConnections {
  readonly monitor: Pool;
  readonly writer: Pool;
  private constructor(
    private readonly readyFile: string,
    private readonly resetLock: string,
    monitorConfiguration: ClientConfiguration,
    writerConfiguration: ClientConfiguration,
  ) {
    const common = { waitForConnections: true, connectionLimit: 2, charset: "utf8mb4", timezone: "Z", namedPlaceholders: true } as const;
    this.monitor = mysql.createPool({ ...common, ...monitorConfiguration });
    this.writer = mysql.createPool({ ...common, ...writerConfiguration });
  }

  static async create(repositoryRoot: string): Promise<TestDatabaseConnections> {
    const runtime = resolve(repositoryRoot, "local-data/test-database");
    const [monitor, writer] = await Promise.all([
      readMode600Configuration(resolve(runtime, "secrets/monitor.host.cnf"), "monitor_source_ro"),
      readMode600Configuration(resolve(runtime, "secrets/writer.host.cnf"), "alertas_fake"),
    ]);
    return new TestDatabaseConnections(resolve(runtime, "state/ready"), resolve(runtime, "state/reset.lock"), monitor, writer);
  }

  async requireReady(): Promise<void> {
    await access(this.readyFile, constants.R_OK).catch(() => { throw new Error("test_database_not_ready"); });
    await access(this.resetLock).then(
      () => { throw new Error("test_database_reset_active"); },
      (error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; },
    );
  }

  async close(): Promise<void> {
    await Promise.all([this.monitor.end(), this.writer.end()]);
  }
}

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const booleanFields = new Set(["isWorkOrderReservation", "active", "weighed", "sourceWorkOrderFinished", "movedFromMachine", "notWeighed", "stillAtMachine"]);
  const numericFields = new Set(["materialFlowDetailId", "workOrderId", "workOrderMaterialId", "articleSerialId", "elapsedMinutes", "consumptionCount", "declaredAgeMinutes"]);
  return Object.fromEntries(Object.entries(row).map(([key, value]) => {
    if (booleanFields.has(key)) return [key, Boolean(value)];
    if (numericFields.has(key) && value !== null) return [key, Number(value)];
    if ((key.endsWith("Timestamp") || key.endsWith("At")) && value !== null) return [key, iso(value)];
    return [key, value];
  }));
}

export class TestDatabaseSourceAdapter implements DetectionSourceAdapter {
  private retryFault: Extract<ScenarioFault, "source_error" | "timeout"> | null = null;
  private retryFaultReadsRemaining = 0;

  constructor(
    private readonly connections: TestDatabaseConnections,
    private readonly source: TestDatabaseScenarioRepository,
    private readonly code: ScenarioRuleCode,
    private readonly sql: string,
    private readonly fixtureKey: number,
  ) {}

  async readPage(input: { query: DetectionQueryDefinition; cursor: string | null; limit: number; signal: AbortSignal }): Promise<SourcePage> {
    if (input.signal.aborted) throw new Error("aborted");
    await this.connections.requireReady();
    let fault: ScenarioFault | null;
    if (this.retryFault && this.retryFaultReadsRemaining > 0) {
      fault = this.retryFault;
      this.retryFaultReadsRemaining -= 1;
      if (this.retryFaultReadsRemaining === 0) this.retryFault = null;
    } else {
      fault = await this.source.consumeFault(this.code);
      if (fault === "source_error" || fault === "timeout") {
        this.retryFaultReadsRemaining = Math.max(0, input.query.maxAttempts - 1);
        this.retryFault = this.retryFaultReadsRemaining > 0 ? fault : null;
      }
    }
    if (fault === "source_error") throw new Error("simulated_source_failure");
    if (fault === "timeout") return new Promise((_resolve, reject) => input.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true }));
    const poll = this.source.pollMetadata(this.code);
    const threshold = this.code === "A03" ? 15 : 30;
    const cutoff = before(poll.currentAt, threshold);
    const [rawRows] = await this.connections.monitor.query<RowDataPacket[]>(this.sql, {
      after_id: input.cursor === null ? 0 : Number(input.cursor), cutoff, result_limit: input.limit,
    });
    const allRows = rawRows.map((rawRow) => {
      const row = normalizeRow(rawRow);
      const sourceTimestamp = Date.parse(String(row.sourceTimestamp));
      const elapsed = Math.max(0, Math.floor((Date.parse(poll.currentAt) - sourceTimestamp) / 60_000));
      if (this.code === "A02" || this.code === "A03") row.elapsedMinutes = elapsed;
      if (this.code === "A05") row.declaredAgeMinutes = elapsed;
      return row;
    });
    const rows = allRows.filter((row) => Number(row[input.query.keyField]) === this.fixtureKey);
    const complete = rawRows.length < input.limit;
    const last = allRows.at(-1);
    const normal: SourcePage = {
      rows,
      nextCursor: complete || !last ? null : String(last[input.query.keyField]),
      complete,
      sourceRevision: poll.sourceRevision,
      schemaVersion: input.query.queryVersion,
    };
    if (fault === "partial") return { ...normal, complete: false, nextCursor: null };
    if (fault === "invalid_schema") return { ...normal, schemaVersion: "test_database.invalid" };
    return normal;
  }
}

export class TestDatabaseScenarioRepository implements ScenarioSource {
  private readonly states = new Map<ScenarioRuleCode, ScenarioState>();
  private constructor(
    private readonly connections: TestDatabaseConnections,
    private readonly monitorDatabase: DatabaseRuntime,
    readonly fixtureIds: FixtureIds,
  ) {
    for (const code of codes) {
      const now = new Date().toISOString();
      this.states.set(code, { currentAt: now, revision: 0, selectedCase: "clean_baseline", lastAction: "reset", lastActionAt: now, lastActionRecordedAt: now, sourceChangedAt: now, pendingFault: null });
    }
  }

  static async create(connections: TestDatabaseConnections, monitorDatabase: DatabaseRuntime, repositoryRoot: string): Promise<TestDatabaseScenarioRepository> {
    await connections.requireReady();
    const fixtureSeedIds = await loadTestDatabaseFixtureSeeds(repositoryRoot);
    const [a02Rows] = await connections.writer.query<RowDataPacket[]>(`SELECT f.id AS flowId
      FROM flujo_materiales_detalles f JOIN ordenes_trabajo ot ON ot.id=f.id_orden_trabajo
      WHERE f.id=? AND f.fecha_eliminacion IS NULL
        AND f.id_orden_trabajo_material IS NOT NULL AND ot.eliminado=0`, [fixtureSeedIds.A02]);
    const [a03Rows] = await connections.writer.query<RowDataPacket[]>(`SELECT ot.id AS workOrderId, MIN(material.id) AS materialId
      FROM ordenes_trabajo ot JOIN orden_trabajo_materiales material ON material.id_orden_trabajo=ot.id
      WHERE ot.id=? AND ot.fecha_eliminacion IS NULL AND ot.eliminado=0
        AND material.fecha_eliminacion IS NULL AND material.eliminado=0
      GROUP BY ot.id`, [fixtureSeedIds.A03]);
    const [a05Rows] = await connections.writer.query<RowDataPacket[]>(`SELECT s.id AS serialId,
        (SELECT MIN(machine_warehouse.id) FROM almacenes machine_warehouse WHERE machine_warehouse.id_equipo=ot.id_equipo) AS originWarehouseId,
        s.id_usuario_creador AS creatorUserId,ot.id_equipo AS equipmentId
      FROM articulo_serial s
      JOIN ordenes_trabajo ot ON ot.id=COALESCE(s.id_orden_trabajo_origen,s.id_ultimo_orden_trabajo_cierre)
      WHERE s.id=? AND s.fecha_eliminacion IS NULL AND ot.fecha_fin_ejecucion IS NOT NULL AND ot.eliminado=0
        AND s.estado IN ('CONFIRMAR_PESO','DISPONIBLE')`, [fixtureSeedIds.A05]);
    if (!a02Rows[0] || !a03Rows[0] || !a05Rows[0] || a05Rows[0].originWarehouseId === null) throw new Error("test_database_scenario_fixture_unavailable");
    const a05 = a05Rows[0]!;
    const [warehouseRows] = await connections.writer.query<RowDataPacket[]>(`SELECT id FROM almacenes
      WHERE id<>? AND (id_equipo IS NULL OR id_equipo<>?) ORDER BY id LIMIT 1`, [a05.originWarehouseId, a05.equipmentId]);
    if (!warehouseRows[0]) throw new Error("test_database_moved_warehouse_unavailable");
    const repository = new TestDatabaseScenarioRepository(connections, monitorDatabase, {
      A02: { flowId: Number(a02Rows[0].flowId) },
      A03: { workOrderId: Number(a03Rows[0].workOrderId), materialId: Number(a03Rows[0].materialId) },
      A05: {
        serialId: Number(a05.serialId), originWarehouseId: Number(a05.originWarehouseId),
        movedWarehouseId: Number(warehouseRows[0].id), creatorUserId: Number(a05.creatorUserId),
      },
    });
    await repository.writerTransaction(async (connection) => {
      await repository.prepareA02(connection, "clean_baseline");
      await repository.prepareA03(connection, "clean_baseline");
      await repository.prepareA05(connection, "clean_baseline");
    });
    for (const code of codes) repository.touch(code, "reset", "clean_baseline");
    return repository;
  }

  supportedCases(code: string): ScenarioCase[] { return cases[asCode(code)]; }

  async reset(code: string): Promise<ScenarioStatus> { return this.prepare(code, "clean_baseline", "reset"); }
  async trigger(code: string): Promise<ScenarioStatus> { return this.prepare(code, "before_threshold"); }

  async prepare(code: string, scenarioCase: string, action: ScenarioAction = "prepare"): Promise<ScenarioStatus> {
    const ruleCode = asCode(code);
    const selected = asCase(ruleCode, scenarioCase);
    await this.connections.requireReady();
    await this.writerTransaction(async (connection) => {
      if (ruleCode === "A02") await this.prepareA02(connection, selected);
      if (ruleCode === "A03") await this.prepareA03(connection, selected);
      if (ruleCode === "A05") await this.prepareA05(connection, selected);
    });
    this.touch(ruleCode, action, selected);
    return this.status(ruleCode);
  }

  async correct(code: string, correction: ScenarioCorrection = "both"): Promise<ScenarioStatus> {
    const ruleCode = asCode(code);
    await this.connections.requireReady();
    const state = this.state(ruleCode);
    await this.writerTransaction(async (connection) => {
      if (ruleCode === "A02") await connection.execute("UPDATE flujo_materiales_detalles SET estado='RECIBIDO',fecha_recepcion=? WHERE id=?", [new Date(state.currentAt), this.fixtureIds.A02.flowId]);
      if (ruleCode === "A03") await connection.execute("UPDATE orden_trabajo_materiales SET cantidad_consumida=1,fecha_actualizacion=? WHERE id=?", [new Date(state.currentAt), this.fixtureIds.A03.materialId]);
      if (ruleCode === "A05") {
        if (correction === "weigh" || correction === "both") await this.ensureScale(connection);
        if (correction === "move" || correction === "both") await connection.execute("UPDATE articulo_serial SET id_almacen=?,fecha_actualizacion=? WHERE id=?", [this.fixtureIds.A05.movedWarehouseId, new Date(state.currentAt), this.fixtureIds.A05.serialId]);
      }
    });
    const action = ruleCode === "A05" && correction === "weigh" ? "correct_weigh" : ruleCode === "A05" && correction === "move" ? "correct_move" : "correct";
    this.touch(ruleCode, action, "corrected");
    return this.status(ruleCode);
  }

  async recur(code: string): Promise<ScenarioStatus> {
    const ruleCode = asCode(code);
    const latest = await this.monitorDatabase.queryOne("SELECT lifecycle FROM monitor_incident WHERE rule_code=$1 ORDER BY occurrence DESC LIMIT 1", [ruleCode]);
    if (latest.lifecycle !== "resolved") throw new Error("recurrence_requires_resolved_incident");
    const state = this.state(ruleCode);
    const previousAt = state.currentAt;
    state.currentAt = new Date(Date.parse(state.currentAt) + 60_000).toISOString();
    const selected = ruleCode === "A05" ? "past_threshold_both" : "past_threshold";
    try {
      return await this.prepare(ruleCode, selected, "recur");
    } catch (error) {
      state.currentAt = previousAt;
      throw error;
    }
  }

  async advanceTime(code: string, minutes: number): Promise<ScenarioStatus> {
    const ruleCode = asCode(code);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) throw new Error("invalid_advance_minutes");
    const state = this.state(ruleCode);
    state.currentAt = new Date(Date.parse(state.currentAt) + minutes * 60_000).toISOString();
    this.touch(ruleCode, "advance_time", null, false);
    return this.status(ruleCode);
  }

  async failNextPoll(code: string, fault: ScenarioFault): Promise<ScenarioStatus> {
    const ruleCode = asCode(code);
    if (!["timeout", "source_error", "partial", "invalid_schema"].includes(fault)) throw new Error("invalid_scenario_fault");
    const state = this.state(ruleCode);
    state.pendingFault = fault;
    state.lastAction = "fail_next_poll";
    state.lastActionAt = state.currentAt;
    state.lastActionRecordedAt = new Date().toISOString();
    return this.status(ruleCode);
  }

  async consumeFault(code: ScenarioRuleCode): Promise<ScenarioFault | null> {
    const state = this.state(code);
    const fault = state.pendingFault;
    state.pendingFault = null;
    return fault;
  }

  pollMetadata(code: ScenarioRuleCode): { currentAt: string; sourceRevision: string } {
    return { currentAt: this.state(code).currentAt, sourceRevision: this.revision(code) };
  }

  async rows(code: ScenarioRuleCode): Promise<{ rows: Record<string, unknown>[]; sourceRevision: string }> {
    await this.connections.requireReady();
    const currentAt = new Date(this.state(code).currentAt);
    if (code === "A02") {
      const [rows] = await this.connections.writer.query<RowDataPacket[]>(`SELECT f.id AS materialFlowDetailId,1 AS isWorkOrderReservation,
        f.estado AS state,f.fecha_recepcion AS receivedAt,TIMESTAMPDIFF(MINUTE,f.fecha_creacion,?) AS elapsedMinutes,
        f.id_orden_trabajo AS workOrderId,ot.codigo_orden_trabajo AS workOrderCode,COALESCE(e.codigo,'Sin máquina') AS machineCode,
        COALESCE(o.nombre,'Sin operación') AS operationName,'No determinado' AS shiftName,'Almacén de materia prima' AS responsibleName
        FROM flujo_materiales_detalles f JOIN ordenes_trabajo ot ON ot.id=f.id_orden_trabajo
        LEFT JOIN equipos e ON e.id=ot.id_equipo LEFT JOIN operaciones o ON o.id=ot.id_operacion WHERE f.id=?`, [currentAt, this.fixtureIds.A02.flowId]);
      return { rows: rows.map((row) => normalizeRow(row)), sourceRevision: this.revision(code) };
    }
    if (code === "A03") {
      const [rows] = await this.connections.writer.query<RowDataPacket[]>(`SELECT ot.id AS workOrderId,
        (ot.fecha_inicio_ejecucion IS NOT NULL AND ot.fecha_fin_ejecucion IS NULL AND ot.fecha_eliminacion IS NULL AND ot.eliminado=0) AS active,
        TIMESTAMPDIFF(MINUTE,ot.fecha_inicio_ejecucion,?) AS elapsedMinutes,
        SUM(CASE WHEN material.fecha_eliminacion IS NULL AND material.eliminado=0 AND material.cantidad_consumida>0 THEN 1 ELSE 0 END) AS consumptionCount,
        ot.codigo_orden_trabajo AS workOrderCode,COALESCE(e.codigo,'Sin máquina') AS machineCode,COALESCE(o.nombre,'Sin operación') AS operationName,
        'No determinado' AS shiftName,'Operación de máquina' AS responsibleName
        FROM ordenes_trabajo ot LEFT JOIN orden_trabajo_materiales material ON material.id_orden_trabajo=ot.id
        LEFT JOIN equipos e ON e.id=ot.id_equipo LEFT JOIN operaciones o ON o.id=ot.id_operacion WHERE ot.id=? GROUP BY ot.id`, [currentAt, this.fixtureIds.A03.workOrderId]);
      return { rows: rows.map((row) => normalizeRow(row)), sourceRevision: this.revision(code) };
    }
    const [rows] = await this.connections.writer.query<RowDataPacket[]>(`SELECT s.id AS articleSerialId,TIMESTAMPDIFF(MINUTE,s.fecha_creacion,?) AS declaredAgeMinutes,
      NOT EXISTS(SELECT 1 FROM balanza_carga_detalle_registros scale WHERE scale.id_articulo_serial=s.id AND scale.eliminado=0) AS notWeighed,
      EXISTS(SELECT 1 FROM balanza_carga_detalle_registros scale WHERE scale.id_articulo_serial=s.id AND scale.eliminado=0) AS weighed,
      (ot.fecha_fin_ejecucion IS NOT NULL) AS sourceWorkOrderFinished,(warehouse.id_equipo<>ot.id_equipo OR warehouse.id_equipo IS NULL) AS movedFromMachine,
      COALESCE(e.codigo,'Sin máquina') AS machineCode,COALESCE(o.nombre,'Sin operación') AS operationName,'No determinado' AS shiftName,'Equipo de procesos' AS responsibleName,
      COALESCE(s.id_orden_trabajo_origen,s.id_ultimo_orden_trabajo_cierre) AS workOrderId,ot.codigo_orden_trabajo AS workOrderCode
      FROM articulo_serial s JOIN ordenes_trabajo ot ON ot.id=COALESCE(s.id_orden_trabajo_origen,s.id_ultimo_orden_trabajo_cierre)
      LEFT JOIN almacenes warehouse ON warehouse.id=s.id_almacen LEFT JOIN equipos e ON e.id=ot.id_equipo LEFT JOIN operaciones o ON o.id=ot.id_operacion WHERE s.id=?`, [currentAt, this.fixtureIds.A05.serialId]);
    return { rows: rows.map((row) => normalizeRow(row)), sourceRevision: this.revision(code) };
  }

  async status(code: string): Promise<ScenarioStatus> {
    const ruleCode = asCode(code);
    const state = this.state(ruleCode);
    const source = await this.rows(ruleCode);
    const row = source.rows[0];
    const reasons: string[] = [];
    if (ruleCode === "A02" && row?.isWorkOrderReservation === true && row.state === "TRANSITO" && row.receivedAt === null && Number(row.elapsedMinutes) >= 30) reasons.push("not_received");
    if (ruleCode === "A03" && row?.active === true && Number(row.elapsedMinutes) >= 15 && Number(row.consumptionCount) === 0) reasons.push("no_first_consumption");
    if (ruleCode === "A05" && Number(row?.declaredAgeMinutes) >= 30) {
      if (row?.weighed === false) reasons.push("not_weighed");
      if (row?.sourceWorkOrderFinished === true && row.movedFromMachine === false) reasons.push("still_at_machine");
    }
    return {
      ruleCode, scenarioClock: { currentAt: state.currentAt }, sourceRevision: source.sourceRevision,
      selectedCase: state.selectedCase, lastAction: state.lastAction, lastActionAt: state.lastActionAt,
      lastActionRecordedAt: state.lastActionRecordedAt, sourceChangedAt: state.sourceChangedAt,
      pendingFault: state.pendingFault,
      sourceState: { rowCount: source.rows.length, rows: source.rows, evaluation: { status: reasons.length ? "triggered" : "clear", reasons } },
    };
  }

  private async prepareA02(connection: PoolConnection, selected: ScenarioCase): Promise<void> {
    const state = this.state("A02");
    const clean = selected === "clean_baseline";
    const age = selected === "before_threshold" ? 29 : selected === "at_threshold" ? 30 : 31;
    await connection.execute(`UPDATE flujo_materiales_detalles SET estado=?,fecha_recepcion=?,fecha_creacion=?,fecha_eliminacion=NULL WHERE id=?`, [
      clean ? "RECIBIDO" : "TRANSITO", clean ? new Date(state.currentAt) : null, before(state.currentAt, clean ? 10 : age), this.fixtureIds.A02.flowId,
    ]);
  }

  private async prepareA03(connection: PoolConnection, selected: ScenarioCase): Promise<void> {
    const state = this.state("A03");
    const clean = selected === "clean_baseline";
    const age = selected === "before_threshold" ? 14 : selected === "at_threshold" ? 15 : 16;
    await connection.execute(`UPDATE ordenes_trabajo SET fecha_inicio_ejecucion=?,fecha_fin_ejecucion=NULL,fecha_eliminacion=NULL,eliminado=0 WHERE id=?`, [before(state.currentAt, clean ? 20 : age), this.fixtureIds.A03.workOrderId]);
    await connection.execute(`UPDATE orden_trabajo_materiales SET cantidad_consumida=0,fecha_actualizacion=? WHERE id_orden_trabajo=? AND fecha_eliminacion IS NULL AND eliminado=0`, [new Date(state.currentAt), this.fixtureIds.A03.workOrderId]);
    if (clean) await connection.execute("UPDATE orden_trabajo_materiales SET cantidad_consumida=1,fecha_actualizacion=? WHERE id=?", [before(state.currentAt, 5), this.fixtureIds.A03.materialId]);
  }

  private async prepareA05(connection: PoolConnection, selected: ScenarioCase): Promise<void> {
    const state = this.state("A05");
    const age = selected.startsWith("before_threshold") ? 29 : selected.startsWith("at_threshold") ? 30 : 31;
    const clean = selected === "clean_baseline" || selected === "movement_started";
    const notWeighed = selected.endsWith("not_weighed") || selected === "before_threshold" || selected === "at_threshold"
      || ["past_threshold_both", "past_threshold_produced", "past_threshold_remnant"].includes(selected);
    const stillAtMachine = selected.endsWith("still_at_machine") || selected === "before_threshold" || selected === "at_threshold"
      || ["past_threshold_both", "past_threshold_produced", "past_threshold_remnant"].includes(selected);
    await connection.execute("DELETE FROM balanza_carga_detalle_registros WHERE id_articulo_serial=? AND secuencia LIKE 'MONITOR-STAGE4-%'", [this.fixtureIds.A05.serialId]);
    await connection.execute(`UPDATE articulo_serial SET fecha_creacion=?,fecha_actualizacion=?,estado='CONFIRMAR_PESO',id_almacen=? WHERE id=?`, [
      before(state.currentAt, clean ? 40 : age), new Date(state.currentAt), clean || !stillAtMachine ? this.fixtureIds.A05.movedWarehouseId : this.fixtureIds.A05.originWarehouseId, this.fixtureIds.A05.serialId,
    ]);
    if (clean || !notWeighed) await this.ensureScale(connection);
  }

  private async ensureScale(connection: PoolConnection): Promise<void> {
    const state = this.state("A05");
    await connection.execute(`INSERT INTO balanza_carga_detalle_registros
      (secuencia,peso_neto,peso_tara,peso_bruto,tipo_registro,fecha_creacion,id_usuario_creador,eliminado,id_articulo_serial)
      SELECT ?,1,0,1,'REEL',?, ?,0,? FROM DUAL
      WHERE NOT EXISTS (SELECT 1 FROM balanza_carga_detalle_registros WHERE id_articulo_serial=? AND eliminado=0)`, [
      `MONITOR-STAGE4-${this.fixtureIds.A05.serialId}`, new Date(state.currentAt), this.fixtureIds.A05.creatorUserId,
      this.fixtureIds.A05.serialId, this.fixtureIds.A05.serialId,
    ]);
  }

  private async writerTransaction<T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> {
    const connection = await this.connections.writer.getConnection();
    try {
      await connection.beginTransaction();
      const result = await work(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  private state(code: ScenarioRuleCode): ScenarioState { return this.states.get(code)!; }
  private revision(code: ScenarioRuleCode): string { return `test_database.${code}.v${this.state(code).revision}`; }
  private touch(code: ScenarioRuleCode, action: string, selected: string | null, changed = true): void {
    const state = this.state(code);
    const recordedAt = new Date().toISOString();
    state.lastAction = action;
    state.lastActionAt = state.currentAt;
    state.lastActionRecordedAt = recordedAt;
    if (selected) state.selectedCase = selected;
    state.pendingFault = null;
    if (changed) { state.revision += 1; state.sourceChangedAt = recordedAt; }
  }
}

export async function loadTestDatabaseFixtureSeeds(repositoryRoot: string): Promise<TestDatabaseFixtureSeeds> {
  const parsed = JSON.parse(await readFile(resolve(repositoryRoot, "config/detection/fixtures/test-database-stage4.v1.json"), "utf8")) as Partial<TestDatabaseFixtureDocument>;
  if (parsed.fixtureVersion !== "1.0.0" || parsed.sourceRevision !== "staging_emusa_core-20260723-025548") throw new Error("invalid_test_database_fixture_contract");
  for (const code of codes) {
    if (!Number.isSafeInteger(parsed[code]) || Number(parsed[code]) <= 0) throw new Error("invalid_test_database_fixture_seed");
  }
  return parsed as TestDatabaseFixtureSeeds;
}

async function definition(repositoryRoot: string, code: ScenarioRuleCode): Promise<DetectionQueryDefinition> {
  const contract = JSON.parse(await readFile(resolve(repositoryRoot, `config/detection/contracts/${code.toLowerCase()}.query.json`), "utf8")) as QueryContractDocument;
  const keyField = code === "A02" ? "materialFlowDetailId" : code === "A03" ? "workOrderId" : "articleSerialId";
  if (contract.alertTypeCode !== code || contract.naturalKey.length !== 1 || contract.naturalKey[0] !== keyField) throw new Error("invalid_test_database_query_contract");
  const requiredFields = code === "A02"
    ? ["materialFlowDetailId", "isWorkOrderReservation", "state", "receivedAt", "elapsedMinutes"]
    : code === "A03" ? ["workOrderId", "active", "elapsedMinutes", "consumptionCount"]
      : ["articleSerialId", "declaredAgeMinutes", "weighed", "sourceWorkOrderFinished", "movedFromMachine"];
  return {
    queryId: contract.queryId, ruleCode: code, queryVersion: contract.queryVersion, adapterKind: "test_database", keyField, requiredFields,
    intervalMs: contract.pollingIntervalSeconds * 1_000, timeoutMs: contract.timeoutMs, pageSize: contract.resultLimit,
    maxRows: contract.cycleRowLimit, maxAttempts: 2, retryBaseMs: 250, enabled: true,
  };
}

export async function testDatabaseRegistry(repositoryRoot: string, connections: TestDatabaseConnections, source: TestDatabaseScenarioRepository) {
  const files: Record<ScenarioRuleCode, string> = {
    A02: "a02-reserved-material-in-transit.v1.sql",
    A03: "a03-active-without-consumption.v1.sql",
    A05: "a05-reel-handling.v1.sql",
  };
  const keys: Record<ScenarioRuleCode, number> = {
    A02: source.fixtureIds.A02.flowId,
    A03: source.fixtureIds.A03.workOrderId,
    A05: source.fixtureIds.A05.serialId,
  };
  return Promise.all(codes.map(async (code) => {
    const query = await definition(repositoryRoot, code);
    const sql = await readFile(resolve(repositoryRoot, "config/detection/queries", files[code]), "utf8");
    return { query, adapter: new TestDatabaseSourceAdapter(connections, source, code, sql, keys[code]) };
  }));
}

export function testDatabaseContextFor(row: Record<string, unknown>) {
  return {
    plantId: 1,
    workOrderId: String(row.workOrderId ?? ""),
    workOrderCode: String(row.workOrderCode ?? ""),
    machineCode: String(row.machineCode ?? ""),
    operationName: String(row.operationName ?? ""),
    shiftName: String(row.shiftName ?? ""),
    responsibleName: String(row.responsibleName ?? ""),
  };
}
