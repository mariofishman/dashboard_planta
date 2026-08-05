import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { access, readFile, readdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import mysql, { type Pool, type PoolConnection, type RowDataPacket } from "mysql2/promise";
import type {
  ScenarioAction,
  ScenarioCase,
  ScenarioCorrection,
  ScenarioFault,
  ScenarioRuleCode,
  ScenarioSource,
  ScenarioSourceAction,
  ScenarioSourceActionInput,
  ScenarioStatus,
} from "./scenario-source.js";
import {
  a02TerminalActionFor,
  assertA02MovementOpen,
  assertA03MayStart,
  nextFirstConsumption,
  type A02SourceAuthority,
  type SourceActionContract,
  type SourceActionEvidence,
  type SourceActionEvidenceRecord,
  type SourceActionFieldChange,
  type SourceActionUnrelatedDigest,
} from "./source-actions.js";
import type { DetectionQueryDefinition, DetectionSourceAdapter, SourcePage } from "./types.js";

const codes: ScenarioRuleCode[] = ["A02", "A03", "A05"];
const resetMutationTables = [
  "articulo_serial",
  "balanza_carga_detalle_registros",
  "flujo_materiales_detalles",
  "orden_trabajo_materiales",
  "ordenes_trabajo",
] as const;
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
  A05: { serialId: number; originWarehouseId: number; movedWarehouseId: number };
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
    void repositoryRoot;
    const protectedDump = process.env.TEST_DB_DUMP ?? "/Users/mariofishman/projects/dashboard_planta/local-data/database/staging_emusa_core-20260723-025548.sql";
    const runtime = process.env.TEST_DB_RUNTIME_ROOT ?? resolve(dirname(dirname(protectedDump)), "test-database");
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
  const numericFields = new Set(["materialFlowDetailId", "workOrderId", "workOrderMaterialId", "articleSerialId", "sku", "unit", "origin", "destination", "machineId", "operationId", "warehouseId", "elapsedMinutes", "consumptionCount", "declaredAgeMinutes"]);
  return Object.fromEntries(Object.entries(row).map(([key, value]) => {
    if (booleanFields.has(key)) return [key, Boolean(value)];
    if (numericFields.has(key) && value !== null) return [key, Number(value)];
    if ((key.endsWith("Timestamp") || key.endsWith("At")) && value !== null) return [key, iso(value)];
    return [key, value];
  }));
}

interface SourceActionScope { sql: string; parameters: unknown[] }

function sourceActionScope(code: ScenarioRuleCode, action: ScenarioSourceAction, key: number, table: string): SourceActionScope {
  if (table === "flujo_materiales_detalles") {
    if (code === "A02" && action === "prepare_dispatch") return {
      sql: "id=? OR (observacion='MONITOR-STAGE5-A02-DISPATCH' AND id_orden_trabajo=(SELECT id_orden_trabajo FROM flujo_materiales_detalles WHERE id=?))",
      parameters: [key, key],
    };
    if (code === "A02" && (action === "cancel" || action === "reject")) return { sql: "id=? OR id_padre=?", parameters: [key, key] };
    if (code === "A02") return { sql: "id=?", parameters: [key] };
    if (code === "A05" && action === "handoff") return {
      sql: "id_articulo_serial=? AND observacion='MONITOR-STAGE5-A05-HANDOFF'",
      parameters: [key],
    };
  }
  if (table === "ordenes_trabajo") {
    if (code === "A03") return { sql: "id=?", parameters: [key] };
    if (code === "A05" && action === "close_work_order") return {
      sql: "id=(SELECT COALESCE(id_orden_trabajo_origen,id_ultimo_orden_trabajo_cierre) FROM articulo_serial WHERE id=?)",
      parameters: [key],
    };
  }
  if (table === "orden_trabajo_materiales" && code === "A03") return { sql: "id_orden_trabajo=?", parameters: [key] };
  if (table === "articulo_serial" && code === "A05") return { sql: "id=?", parameters: [key] };
  if (table === "balanza_carga_detalle_registros" && code === "A05") return { sql: "id_articulo_serial=?", parameters: [key] };
  throw new Error("source_action_evidence_scope_missing");
}

function identifier(value: string): string {
  if (!/^[a-z][a-z0-9_]*$/i.test(value)) throw new Error("invalid_source_action_evidence_identifier");
  return `\`${value}\``;
}

function evidenceValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return value.toString("base64");
  return value;
}

interface EvidenceMutation { table: string; fields: string[]; columns: string[] }

async function evidenceMutations(connection: PoolConnection, contract: SourceActionContract): Promise<EvidenceMutation[]> {
  const fieldsByTable = new Map<string, Set<string>>();
  for (const mutation of contract.mutations) {
    const fields = fieldsByTable.get(mutation.table) ?? new Set<string>();
    for (const field of mutation.fields) fields.add(field);
    fieldsByTable.set(mutation.table, fields);
  }
  const mutations: EvidenceMutation[] = [];
  for (const [table, fields] of [...fieldsByTable].sort(([left], [right]) => left.localeCompare(right))) {
    const [rows] = await connection.query<RowDataPacket[]>(`SELECT COLUMN_NAME AS columnName
      FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION`, [table]);
    const columns = rows.map((row) => String(row.columnName));
    if (!columns.includes("id") || columns.length === 0) throw new Error("source_action_evidence_schema_missing");
    mutations.push({ table, fields: [...fields].sort(), columns });
  }
  return mutations;
}

async function captureEvidenceRecords(
  connection: PoolConnection,
  code: ScenarioRuleCode,
  action: ScenarioSourceAction,
  key: number,
  mutations: EvidenceMutation[],
): Promise<SourceActionEvidenceRecord[]> {
  const records: SourceActionEvidenceRecord[] = [];
  for (const mutation of mutations) {
    const scope = sourceActionScope(code, action, key, mutation.table);
    const fields = mutation.columns;
    const [rows] = await connection.query<RowDataPacket[]>(`SELECT ${fields.map(identifier).join(",")} FROM ${identifier(mutation.table)}
      WHERE ${scope.sql} ORDER BY id`, scope.parameters);
    for (const row of rows) records.push({
      table: mutation.table,
      key: Number(row.id),
      values: Object.fromEntries(fields.filter((field) => field !== "id").map((field) => [field, evidenceValue(row[field])])),
    });
  }
  return records;
}

async function captureUnrelatedDigest(
  connection: PoolConnection,
  code: ScenarioRuleCode,
  action: ScenarioSourceAction,
  key: number,
  mutations: EvidenceMutation[],
): Promise<SourceActionUnrelatedDigest> {
  const tables: SourceActionUnrelatedDigest["tables"] = [];
  for (const mutation of mutations) {
    const scope = sourceActionScope(code, action, key, mutation.table);
    const jsonFields = mutation.columns.map(identifier).join(",");
    const tableHash = createHash("sha256");
    let rowCount = 0;
    let lastId: unknown;
    while (true) {
      const after = lastId === undefined ? "" : " AND id>?";
      const parameters = lastId === undefined ? scope.parameters : [...scope.parameters, lastId];
      const [rows] = await connection.query<RowDataPacket[]>(`SELECT id,
        SHA2(CAST(JSON_ARRAY(${jsonFields}) AS CHAR),256) AS rowDigest
        FROM ${identifier(mutation.table)} WHERE NOT (${scope.sql})${after} ORDER BY id LIMIT 1000`, parameters);
      for (const row of rows) {
        const rowKey = String(row.id);
        const rowDigest = String(row.rowDigest ?? "");
        tableHash.update(`${rowKey.length}:${rowKey}${rowDigest.length}:${rowDigest}`);
      }
      rowCount += rows.length;
      if (rows.length < 1000) break;
      lastId = rows.at(-1)!.id;
    }
    tables.push({ table: mutation.table, columns: mutation.columns, rowCount, digest: tableHash.digest("hex") });
  }
  const digest = createHash("sha256").update(JSON.stringify(tables)).digest("hex");
  return { algorithm: "sha256", digest, tables };
}

function fieldChanges(beforeRecords: SourceActionEvidenceRecord[], afterRecords: SourceActionEvidenceRecord[]): SourceActionFieldChange[] {
  const recordKey = (record: SourceActionEvidenceRecord) => `${record.table}:${record.key}`;
  const before = new Map(beforeRecords.map((record) => [recordKey(record), record]));
  const after = new Map(afterRecords.map((record) => [recordKey(record), record]));
  const changes: SourceActionFieldChange[] = [];
  for (const key of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    const previous = before.get(key);
    const next = after.get(key);
    const table = (previous ?? next)!.table;
    const primaryKey = (previous ?? next)!.key;
    const fields = [...new Set([...Object.keys(previous?.values ?? {}), ...Object.keys(next?.values ?? {})])].sort();
    for (const field of fields) {
      const beforeValue = previous?.values[field] ?? null;
      const afterValue = next?.values[field] ?? null;
      if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) changes.push({ table, key: primaryKey, field, before: beforeValue, after: afterValue });
    }
  }
  return changes;
}

function changedFields(changes: SourceActionFieldChange[]): Record<string, string[]> {
  const values = new Map<string, Set<string>>();
  for (const change of changes) {
    const fields = values.get(change.table) ?? new Set<string>();
    fields.add(change.field);
    values.set(change.table, fields);
  }
  return Object.fromEntries([...values].sort(([left], [right]) => left.localeCompare(right)).map(([table, fields]) => [table, [...fields].sort()]));
}

export class TestDatabaseSourceAdapter implements DetectionSourceAdapter {
  private retryFault: Extract<ScenarioFault, "source_error" | "timeout"> | null = null;
  private retryFaultReadsRemaining = 0;
  private continuation: {
    fault: "partial_pagination" | "duplicate_keys" | "revision_change";
    row?: Record<string, unknown>;
    revision: string;
  } | null = null;

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
    if (this.continuation) {
      const continuation = this.continuation;
      this.continuation = null;
      if (continuation.fault === "partial_pagination") {
        return {
          rows: [], nextCursor: null, complete: false, sourceRevision: continuation.revision,
          schemaVersion: input.query.queryVersion,
        };
      }
      return {
        rows: continuation.fault === "duplicate_keys" ? [continuation.row!] : [],
        nextCursor: null,
        complete: true,
        sourceRevision: continuation.fault === "revision_change" ? `${continuation.revision}.changed` : continuation.revision,
        schemaVersion: input.query.queryVersion,
      };
    }
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
    const trackedRows = allRows.filter((row) => this.source.tracks(
      this.code,
      Number(row[input.query.keyField]),
      String(row.sourceTimestamp),
    ));
    const routingByKey = await this.routingContextBatch(trackedRows.map((row) => Number(row[input.query.keyField])));
    const rows = trackedRows.map((row) => ({
      ...row, ...(routingByKey.get(Number(row[input.query.keyField])) ?? {}),
    }));
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
    if (fault === "partial_pagination") {
      if (!normal.nextCursor) throw new Error("partial_pagination_requires_first_page");
      this.continuation = { fault, revision: normal.sourceRevision };
      return normal;
    }
    if (fault === "invalid_schema") return { ...normal, schemaVersion: "test_database.invalid" };
    if ((fault === "duplicate_keys" || fault === "revision_change") && rows[0]) {
      this.continuation = { fault, row: rows[0], revision: normal.sourceRevision };
      return { ...normal, rows: [rows[0]], complete: false, nextCursor: "0" };
    }
    return normal;
  }

  private async routingContextBatch(keys: number[]): Promise<Map<number, Record<string, unknown>>> {
    if (keys.length === 0) return new Map();
    const sql = this.code === "A02"
      ? `SELECT f.id AS routingKey,COALESCE(e.codigo,'Sin máquina') AS machineCode,COALESCE(o.nombre,'Sin operación') AS operationName,
          'Día' AS shiftName,'Almacén de materia prima' AS responsibleName,'Materias primas' AS warehouseType
        FROM flujo_materiales_detalles f JOIN ordenes_trabajo ot ON ot.id=f.id_orden_trabajo
        LEFT JOIN equipos e ON e.id=ot.id_equipo LEFT JOIN operaciones o ON o.id=ot.id_operacion WHERE f.id IN (?)`
      : this.code === "A03"
        ? `SELECT ot.id AS routingKey,COALESCE(e.codigo,'Sin máquina') AS machineCode,COALESCE(o.nombre,'Sin operación') AS operationName,
            'Día' AS shiftName,'Operación de máquina' AS responsibleName
          FROM ordenes_trabajo ot LEFT JOIN equipos e ON e.id=ot.id_equipo LEFT JOIN operaciones o ON o.id=ot.id_operacion WHERE ot.id IN (?)`
        : `SELECT s.id AS routingKey,CASE WHEN s.tipo='PRODUCTO_EN_PROCESO' THEN 'produced' ELSE 'remnant' END AS reelKind,
            COALESCE(e.codigo,'Sin máquina') AS machineCode,COALESCE(o.nombre,'Sin operación') AS operationName,
            'Día' AS shiftName,'Equipo de procesos' AS responsibleName,
            CASE WHEN s.tipo='PRODUCTO_EN_PROCESO' THEN 'Productos en proceso' ELSE 'Materias primas' END AS warehouseType
          FROM articulo_serial s JOIN ordenes_trabajo ot ON ot.id=COALESCE(s.id_orden_trabajo_origen,s.id_ultimo_orden_trabajo_cierre)
          LEFT JOIN equipos e ON e.id=ot.id_equipo LEFT JOIN operaciones o ON o.id=ot.id_operacion WHERE s.id IN (?)`;
    const [rows] = await this.connections.monitor.query<RowDataPacket[]>(sql, [keys]);
    return new Map(rows.map((rawRow) => {
      const row = normalizeRow(rawRow);
      const key = Number(row.routingKey);
      delete row.routingKey;
      return [key, row];
    }));
  }
}

export class TestDatabaseScenarioRepository implements ScenarioSource {
  private readonly states = new Map<ScenarioRuleCode, ScenarioState>();
  private readonly tracked = new Map<ScenarioRuleCode, Set<number>>();
  private readonly trackingOverrides = new Set<ScenarioRuleCode>();
  private sourceCutoffAt: string | null = null;
  private readonly deferredFreshnessFaults = new Map<ScenarioRuleCode, {
    fault: "stale" | "unknown_freshness";
    inspectionsRemaining: number;
  }>();
  private constructor(
    private readonly connections: TestDatabaseConnections,
    readonly fixtureIds: FixtureIds,
    private baselineClean: boolean,
  ) {
    for (const code of codes) {
      const now = new Date().toISOString();
      this.states.set(code, { currentAt: now, revision: 0, selectedCase: "clean_baseline", lastAction: "reset", lastActionAt: now, lastActionRecordedAt: now, sourceChangedAt: now, pendingFault: null });
    }
    this.tracked.set("A02", new Set([fixtureIds.A02.flowId]));
    this.tracked.set("A03", new Set([fixtureIds.A03.workOrderId]));
    this.tracked.set("A05", new Set([fixtureIds.A05.serialId]));
  }

  static async create(
    connections: TestDatabaseConnections,
    repositoryRoot: string,
    fixtureSeedIds?: TestDatabaseFixtureSeeds,
  ): Promise<TestDatabaseScenarioRepository> {
    await connections.requireReady();
    const resolvedFixtureSeedIds = fixtureSeedIds ?? await loadTestDatabaseFixtureSeeds(repositoryRoot);
    const [a02Rows] = await connections.writer.query<RowDataPacket[]>(`SELECT f.id AS flowId
      FROM flujo_materiales_detalles f JOIN ordenes_trabajo ot ON ot.id=f.id_orden_trabajo
      WHERE f.id=? AND f.fecha_eliminacion IS NULL
        AND f.id_orden_trabajo_material IS NOT NULL AND ot.eliminado=0`, [resolvedFixtureSeedIds.A02]);
    const [a03Rows] = await connections.writer.query<RowDataPacket[]>(`SELECT ot.id AS workOrderId, MIN(material.id) AS materialId
      FROM ordenes_trabajo ot JOIN orden_trabajo_materiales material ON material.id_orden_trabajo=ot.id
      WHERE ot.id=? AND ot.fecha_eliminacion IS NULL AND ot.eliminado=0
        AND material.fecha_eliminacion IS NULL AND material.eliminado=0
      GROUP BY ot.id`, [resolvedFixtureSeedIds.A03]);
    const [a05Rows] = await connections.writer.query<RowDataPacket[]>(`SELECT s.id AS serialId,
        (SELECT MIN(machine_warehouse.id) FROM almacenes machine_warehouse WHERE machine_warehouse.id_equipo=ot.id_equipo) AS originWarehouseId,
        ot.id_equipo AS equipmentId
      FROM articulo_serial s
      JOIN ordenes_trabajo ot ON ot.id=COALESCE(s.id_orden_trabajo_origen,s.id_ultimo_orden_trabajo_cierre)
      WHERE s.id=? AND s.fecha_eliminacion IS NULL AND ot.eliminado=0
        AND s.estado IN ('CONFIRMAR_PESO','DISPONIBLE')`, [resolvedFixtureSeedIds.A05]);
    if (!a02Rows[0] || !a03Rows[0] || !a05Rows[0] || a05Rows[0].originWarehouseId === null) throw new Error("test_database_scenario_fixture_unavailable");
    const a05 = a05Rows[0]!;
    const [warehouseRows] = await connections.writer.query<RowDataPacket[]>(`SELECT id FROM almacenes
      WHERE id<>? AND (id_equipo IS NULL OR id_equipo<>?) ORDER BY id LIMIT 1`, [a05.originWarehouseId, a05.equipmentId]);
    if (!warehouseRows[0]) throw new Error("test_database_moved_warehouse_unavailable");
    const evidenceDirectory = resolve(repositoryRoot, "local-data/test-database/evidence");
    const checksumFiles = (await readdir(evidenceDirectory)).filter((name) => /^table-checksums-\d{8}T\d{6}Z\.tsv$/.test(name)).sort();
    const latestChecksumFile = checksumFiles.at(-1);
    let baselineClean = false;
    if (latestChecksumFile) {
      const expected = new Map((await readFile(resolve(evidenceDirectory, latestChecksumFile), "utf8")).trim().split("\n")
        .map((line) => line.split("\t") as [string, string]));
      const [actualRows] = await connections.writer.query<RowDataPacket[]>(`CHECKSUM TABLE ${resetMutationTables
        .map((table) => `test_database.\`${table}\``).join(",")}`);
      baselineClean = actualRows.every((row) => expected.get(String(row.Table)) === String(row.Checksum));
    }
    const repository = new TestDatabaseScenarioRepository(connections, {
      A02: { flowId: Number(a02Rows[0].flowId) },
      A03: { workOrderId: Number(a03Rows[0].workOrderId), materialId: Number(a03Rows[0].materialId) },
      A05: {
        serialId: Number(a05.serialId), originWarehouseId: Number(a05.originWarehouseId),
        movedWarehouseId: Number(warehouseRows[0].id),
      },
    }, baselineClean);
    for (const code of codes) repository.touch(code, "reset", "clean_baseline");
    return repository;
  }

  supportedCases(code: string): ScenarioCase[] { return cases[asCode(code)]; }
  isBaselineClean(): boolean { return this.baselineClean; }
  tracks(code: ScenarioRuleCode, key: number, sourceTimestamp?: string): boolean {
    if (this.trackingOverrides.has(code) || !this.sourceCutoffAt) return this.tracked.get(code)!.has(key);
    return Boolean(sourceTimestamp) && Date.parse(String(sourceTimestamp)) >= Date.parse(this.sourceCutoffAt);
  }
  async latestSourceTimestamp(): Promise<string> {
    await this.connections.requireReady();
    const [rows] = await this.connections.monitor.query<RowDataPacket[]>(`SELECT MAX(source_time) AS latestSourceTimestamp FROM (
      SELECT MAX(f.fecha_creacion) AS source_time FROM flujo_materiales_detalles f
        WHERE f.id_orden_trabajo_material IS NOT NULL AND f.fecha_eliminacion IS NULL
      UNION ALL
      SELECT MAX(ot.fecha_inicio_ejecucion) AS source_time FROM ordenes_trabajo ot
        WHERE ot.fecha_eliminacion IS NULL AND ot.eliminado=0
      UNION ALL
      SELECT MAX(s.fecha_creacion) AS source_time FROM articulo_serial s
        WHERE s.fecha_eliminacion IS NULL
    ) source_times`);
    const value = rows[0]?.latestSourceTimestamp;
    const timestamp = value instanceof Date ? value : new Date(String(value ?? ""));
    if (!Number.isFinite(timestamp.getTime())) throw new Error("test_database_latest_source_timestamp_unavailable");
    return timestamp.toISOString();
  }
  replaceTracked(code: ScenarioRuleCode, keys: number[]): void {
    this.tracked.set(code, new Set(keys));
    this.trackingOverrides.add(code);
  }
  recordExternalSourceChange(code: ScenarioRuleCode, action: string): void { this.touch(code, action, null); }

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

  async preparePopulation(code: ScenarioRuleCode, population: "a02_mixed" | "a03_mixed", keys: number[]): Promise<ScenarioStatus> {
    await this.connections.requireReady();
    const state = this.state(code);
    await this.writerTransaction(async (connection) => {
      if (code === "A02" && population === "a02_mixed" && keys.length === 3) {
        const received = keys[0]!;
        const overdue = keys[1]!;
        const young = keys[2]!;
        const [rows] = await connection.query<RowDataPacket[]>("SELECT id FROM flujo_materiales_detalles WHERE id IN (?,?,?) FOR UPDATE", keys);
        if (rows.length !== 3) throw new Error("scenario_population_fixture_unavailable");
        await connection.execute("UPDATE flujo_materiales_detalles SET estado='RECIBIDO',fecha_recepcion=?,fecha_creacion=?,fecha_actualizacion=? WHERE id=?", [new Date(state.currentAt), before(state.currentAt, 20), new Date(state.currentAt), received]);
        await connection.execute("UPDATE flujo_materiales_detalles SET estado='TRANSITO',fecha_recepcion=NULL,fecha_creacion=?,fecha_actualizacion=? WHERE id=?", [before(state.currentAt, 31), new Date(state.currentAt), overdue]);
        await connection.execute("UPDATE flujo_materiales_detalles SET estado='TRANSITO',fecha_recepcion=NULL,fecha_creacion=?,fecha_actualizacion=? WHERE id=?", [before(state.currentAt, 10), new Date(state.currentAt), young]);
        return;
      }
      if (code === "A03" && population === "a03_mixed" && keys.length === 4) {
        const eligible = keys[0]!;
        const consumed = keys[1]!;
        const closed = keys[2]!;
        const young = keys[3]!;
        const [workOrders] = await connection.query<RowDataPacket[]>("SELECT id FROM ordenes_trabajo WHERE id IN (?,?,?,?) FOR UPDATE", keys);
        const [materials] = await connection.query<RowDataPacket[]>(`SELECT id,id_orden_trabajo FROM orden_trabajo_materiales
          WHERE id_orden_trabajo IN (?,?) AND eliminado=0 FOR UPDATE`, [eligible, consumed]);
        if (workOrders.length !== 4 || new Set(materials.map((row) => Number(row.id_orden_trabajo))).size !== 2) throw new Error("scenario_population_fixture_unavailable");
        await connection.execute("UPDATE ordenes_trabajo SET fecha_inicio_ejecucion=?,fecha_fin_ejecucion=NULL,fecha_eliminacion=NULL,eliminado=0,fecha_actualizacion=? WHERE id=?", [before(state.currentAt, 16), new Date(state.currentAt), eligible]);
        await connection.execute("UPDATE orden_trabajo_materiales SET cantidad_consumida=0,fecha_actualizacion=? WHERE id_orden_trabajo=? AND eliminado=0", [new Date(state.currentAt), eligible]);
        await connection.execute("UPDATE ordenes_trabajo SET fecha_inicio_ejecucion=?,fecha_fin_ejecucion=NULL,fecha_eliminacion=NULL,eliminado=0,fecha_actualizacion=? WHERE id=?", [before(state.currentAt, 16), new Date(state.currentAt), consumed]);
        await connection.execute("UPDATE orden_trabajo_materiales SET cantidad_consumida=1,fecha_actualizacion=? WHERE id=(SELECT id FROM (SELECT MIN(id) id FROM orden_trabajo_materiales WHERE id_orden_trabajo=? AND eliminado=0) selected)", [new Date(state.currentAt), consumed]);
        await connection.execute("UPDATE ordenes_trabajo SET fecha_inicio_ejecucion=?,fecha_fin_ejecucion=?,fecha_eliminacion=NULL,eliminado=0,fecha_actualizacion=? WHERE id=?", [before(state.currentAt, 16), new Date(state.currentAt), new Date(state.currentAt), closed]);
        await connection.execute("UPDATE ordenes_trabajo SET fecha_inicio_ejecucion=?,fecha_fin_ejecucion=NULL,fecha_eliminacion=NULL,eliminado=0,fecha_actualizacion=? WHERE id=?", [before(state.currentAt, 10), new Date(state.currentAt), young]);
        return;
      }
      throw new Error("invalid_scenario_population");
    });
    this.replaceTracked(code, keys);
    this.touch(code, "prepare", null);
    return this.status(code);
  }

  async correct(code: string, correction: ScenarioCorrection = "both"): Promise<ScenarioStatus> {
    const ruleCode = asCode(code);
    await this.connections.requireReady();
    const state = this.state(ruleCode);
    await this.writerTransaction(async (connection) => {
      if (ruleCode === "A02") {
        const [rows] = await connection.query<RowDataPacket[]>("SELECT estado FROM flujo_materiales_detalles WHERE id=? FOR UPDATE", [this.fixtureIds.A02.flowId]);
        assertA02MovementOpen(rows[0]?.estado);
        await connection.execute("UPDATE flujo_materiales_detalles SET estado='RECIBIDO',fecha_recepcion=?,fecha_actualizacion=? WHERE id=?", [new Date(state.currentAt), new Date(state.currentAt), this.fixtureIds.A02.flowId]);
      }
      if (ruleCode === "A03") {
        const [rows] = await connection.query<RowDataPacket[]>(`SELECT ot.fecha_inicio_ejecucion,ot.fecha_fin_ejecucion,ot.fecha_eliminacion,ot.eliminado,
          material.cantidad_consumida FROM ordenes_trabajo ot JOIN orden_trabajo_materiales material ON material.id_orden_trabajo=ot.id
          WHERE ot.id=? AND material.id=? FOR UPDATE`, [this.fixtureIds.A03.workOrderId, this.fixtureIds.A03.materialId]);
        if (!rows[0]) throw new Error("work_order_material_unavailable");
        const next = nextFirstConsumption(rows[0].cantidad_consumida, {
          started: rows[0].fecha_inicio_ejecucion !== null,
          closed: rows[0].fecha_fin_ejecucion !== null,
          cancelled: rows[0].fecha_eliminacion !== null || Boolean(rows[0].eliminado),
        });
        await connection.execute("UPDATE orden_trabajo_materiales SET cantidad_consumida=?,fecha_actualizacion=? WHERE id=?", [next, new Date(state.currentAt), this.fixtureIds.A03.materialId]);
      }
      if (ruleCode === "A05") {
        if (correction === "weigh" || correction === "both") await this.ensureScale(connection);
        if (correction === "move" || correction === "both") {
          const [rows] = await connection.query<RowDataPacket[]>("SELECT id_almacen FROM articulo_serial WHERE id=? FOR UPDATE", [this.fixtureIds.A05.serialId]);
          if (!rows[0] || Number(rows[0].id_almacen) !== this.fixtureIds.A05.originWarehouseId) throw new Error("reel_already_moved");
          await connection.execute("UPDATE articulo_serial SET id_almacen=?,fecha_actualizacion=? WHERE id=?", [this.fixtureIds.A05.movedWarehouseId, new Date(state.currentAt), this.fixtureIds.A05.serialId]);
        }
      }
    });
    const action = ruleCode === "A05" && correction === "weigh" ? "correct_weigh" : ruleCode === "A05" && correction === "move" ? "correct_move" : "correct";
    this.touch(ruleCode, action, "corrected");
    return this.status(ruleCode);
  }

  async sourceAction(code: string, action: ScenarioSourceAction, key: number, contract: SourceActionContract, input: ScenarioSourceActionInput = {}) {
    const ruleCode = asCode(code);
    await this.connections.requireReady();
    const evidence = await this.writerTransaction((connection) => this.applySourceActionWithEvidence(connection, ruleCode, action, key, contract, input));
    if (ruleCode === "A03" && action === "start_work_order") this.tracked.get("A03")!.add(key);
    if (ruleCode === "A05" && (action === "declare_produced_reel" || action === "declare_remnant_reel")) this.tracked.get("A05")!.add(key);
    this.touch(ruleCode, action, null);
    return { status: await this.status(ruleCode), evidence };
  }

  async sourceActionCandidate(code: ScenarioRuleCode, action: ScenarioSourceAction): Promise<number | null> {
    await this.connections.requireReady();
    const tracked = this.tracked.get(code)!;
    if (code === "A02" && action === "prepare_dispatch") {
      const [[rows], [generatedRows]] = await Promise.all([
        this.connections.monitor.query<RowDataPacket[]>(`SELECT flow.id
        FROM flujo_materiales_detalles flow
        JOIN ordenes_trabajo work_order ON work_order.id=flow.id_orden_trabajo
        WHERE flow.fecha_eliminacion IS NULL
          AND flow.id_orden_trabajo_material IS NOT NULL
          AND flow.cantidad_entransito_uso>0
          AND flow.id_almacen_origen IS NOT NULL
          AND flow.id_almacen_destino IS NOT NULL
          AND flow.id_almacen_origen<>flow.id_almacen_destino
          AND COALESCE(flow.observacion,'') NOT LIKE 'MONITOR-STAGE5-%'
          AND work_order.fecha_eliminacion IS NULL AND work_order.eliminado=0
        ORDER BY flow.id LIMIT 500`),
        this.connections.monitor.query<RowDataPacket[]>(`SELECT COUNT(*) AS generatedCount
          FROM flujo_materiales_detalles
          WHERE observacion='MONITOR-STAGE5-A02-DISPATCH' AND fecha_eliminacion IS NULL`),
      ]);
      if (rows.length === 0) return null;
      const generatedCount = Number(generatedRows[0]?.generatedCount ?? 0);
      const candidate = rows[generatedCount % rows.length];
      return Number(candidate?.id) || null;
    }
    if (code === "A03" && action === "start_work_order") {
      const [rows] = await this.connections.monitor.query<RowDataPacket[]>(`SELECT candidate.id
        FROM ordenes_trabajo candidate
        WHERE candidate.id_equipo IS NOT NULL
          AND candidate.fecha_inicio_ejecucion IS NULL
          AND candidate.fecha_fin_ejecucion IS NULL
          AND candidate.fecha_eliminacion IS NULL
          AND candidate.eliminado=0
          AND EXISTS (
            SELECT 1 FROM orden_trabajo_materiales material
            WHERE material.id_orden_trabajo=candidate.id
              AND material.fecha_eliminacion IS NULL AND material.eliminado=0
          )
          AND NOT EXISTS (
            SELECT 1 FROM ordenes_trabajo active
            WHERE active.id_equipo=candidate.id_equipo AND active.id<>candidate.id
              AND active.fecha_inicio_ejecucion IS NOT NULL AND active.fecha_fin_ejecucion IS NULL
              AND active.fecha_eliminacion IS NULL AND active.eliminado=0
          )
        ORDER BY candidate.id LIMIT 1000`);
      return Number(rows.find((row) => !tracked.has(Number(row.id)))?.id) || null;
    }
    if (code === "A05" && (action === "declare_produced_reel" || action === "declare_remnant_reel")) {
      const relationship = action === "declare_produced_reel" ? "id_orden_trabajo_origen" : "id_ultimo_orden_trabajo_cierre";
      const [rows] = await this.connections.monitor.query<RowDataPacket[]>(`SELECT serial.id
        FROM articulo_serial serial
        JOIN ordenes_trabajo work_order ON work_order.id=serial.${relationship}
        JOIN almacenes warehouse ON warehouse.id=serial.id_almacen
        WHERE serial.fecha_eliminacion IS NULL
          AND serial.estado<>'CONFIRMAR_PESO'
          AND work_order.fecha_eliminacion IS NULL AND work_order.eliminado=0
          AND warehouse.id_equipo=work_order.id_equipo
          AND NOT EXISTS (
            SELECT 1 FROM balanza_carga_detalle_registros scale
            WHERE scale.id_articulo_serial=serial.id AND scale.eliminado=0
          )
        ORDER BY serial.id LIMIT 1000`);
      return Number(rows.find((row) => !tracked.has(Number(row.id)))?.id) || null;
    }
    return null;
  }

  async terminalizeA02ForAuthority(authority: A02SourceAuthority, key: number, contract: SourceActionContract) {
    return this.sourceAction("A02", a02TerminalActionFor(authority), key, contract);
  }

  async applySourceActionWithEvidence(
    connection: PoolConnection,
    code: string,
    action: ScenarioSourceAction,
    key: number,
    contract: SourceActionContract,
    input: ScenarioSourceActionInput = {},
  ): Promise<SourceActionEvidence> {
    const ruleCode = asCode(code);
    if (contract.ruleCode !== ruleCode || contract.invocation.argument !== action || contract.naturalKey.length === 0) {
      throw new Error("source_action_evidence_contract_mismatch");
    }
    const [identityRows] = await connection.query<RowDataPacket[]>("SELECT CURRENT_USER() AS currentUser");
    const writerIdentity = String(identityRows[0]?.currentUser ?? "").split("@")[0];
    if (writerIdentity !== "alertas_fake") throw new Error("source_action_writer_mismatch");
    const mutations = await evidenceMutations(connection, contract);
    const beforeRecords = await captureEvidenceRecords(connection, ruleCode, action, key, mutations);
    const unrelatedBefore = await captureUnrelatedDigest(connection, ruleCode, action, key, mutations);
    await this.applySourceActionMutation(connection, ruleCode, action, key, input);
    const afterRecords = await captureEvidenceRecords(connection, ruleCode, action, key, mutations);
    const unrelatedAfter = await captureUnrelatedDigest(connection, ruleCode, action, key, mutations);
    if (unrelatedBefore.digest !== unrelatedAfter.digest) throw new Error("source_action_unrelated_rows_changed");
    const changes = fieldChanges(beforeRecords, afterRecords);
    return {
      writerIdentity,
      before: beforeRecords,
      after: afterRecords,
      changes,
      changedTables: [...new Set(changes.map((change) => change.table))].sort(),
      changedFields: changedFields(changes),
      unrelatedRows: { before: unrelatedBefore, after: unrelatedAfter },
    };
  }

  async applySourceActionMutation(connection: PoolConnection, code: string, action: ScenarioSourceAction, key?: number, input: ScenarioSourceActionInput = {}): Promise<void> {
    const ruleCode = asCode(code);
    const state = this.state(ruleCode);
    if (ruleCode === "A02" && action === "prepare_dispatch") {
        const templateId = key ?? this.fixtureIds.A02.flowId;
        const [templateRows] = await connection.query<RowDataPacket[]>(`SELECT estado,cantidad_entransito_uso AS quantity,
          id_almacen_origen AS originWarehouseId,id_almacen_destino AS destinationWarehouseId
          FROM flujo_materiales_detalles WHERE id=? FOR UPDATE`, [templateId]);
        if (!templateRows[0]) throw new Error("movement_unavailable");
        const quantity = Number(input.quantity ?? templateRows[0].quantity);
        const originWarehouseId = Number(input.originWarehouseId ?? templateRows[0].originWarehouseId);
        const destinationWarehouseId = Number(input.destinationWarehouseId ?? templateRows[0].destinationWarehouseId);
        if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("movement_quantity_must_be_positive");
        if (!Number.isSafeInteger(originWarehouseId) || !Number.isSafeInteger(destinationWarehouseId)
          || originWarehouseId === destinationWarehouseId) throw new Error("movement_warehouses_must_differ");
        await connection.execute(`INSERT INTO flujo_materiales_detalles
          (id_articulo,nombre_articulo,id_unidad_uso,cantidad_entransito_uso,id_unidad_inventario,cantidad_entransito_inventario,costo_promedio,
           id_articulo_serial,id_lote,id_almacen_origen,id_almacen_destino,id_ubicacion_almacen_origen,id_ubicacion_almacen_destino,observacion,
           id_unidad_recibida_uso,cantidad_recibida_uso,id_unidad_recibida_inventario,cantidad_recibida_inventario,id_usuario_recepcion,
           fecha_recepcion,id_usuario_creador,id_usuario_actualizacion,id_usuario_eliminacion,fecha_creacion,fecha_actualizacion,fecha_eliminacion,
           id_orden_trabajo,cantidad_inicial_inventario,cantidad_inicial_uso,id_orden_trabajo_material,moneda,estado,id_padre,
           id_documento_desencadenador,id_documento_origen_desencadenador,confirmar_peso,id_material_orden_despacho,id_orden_despacho)
          SELECT id_articulo,nombre_articulo,id_unidad_uso,cantidad_entransito_uso,id_unidad_inventario,cantidad_entransito_inventario,costo_promedio,
           id_articulo_serial,id_lote,id_almacen_origen,id_almacen_destino,id_ubicacion_almacen_origen,id_ubicacion_almacen_destino,'MONITOR-STAGE5-A02-DISPATCH',
           id_unidad_recibida_uso,0,id_unidad_recibida_inventario,0,NULL,NULL,id_usuario_creador,id_usuario_actualizacion,NULL,?, ?,NULL,
           id_orden_trabajo,cantidad_inicial_inventario,cantidad_inicial_uso,id_orden_trabajo_material,moneda,'TRANSITO',NULL,
           id_documento_desencadenador,id_documento_origen_desencadenador,confirmar_peso,id_material_orden_despacho,id_orden_despacho
          FROM flujo_materiales_detalles WHERE id=?`, [new Date(state.currentAt), new Date(state.currentAt), templateId]);
        const [idRows] = await connection.query<RowDataPacket[]>("SELECT LAST_INSERT_ID() AS id");
        const createdId = Number(idRows[0]!.id);
        let articleSerialId: number | null = null;
        if (input.uniqueCode) {
          const [serialRows] = await connection.query<RowDataPacket[]>("SELECT id FROM articulo_serial WHERE codigo_serial=? AND fecha_eliminacion IS NULL LIMIT 1", [input.uniqueCode]);
          if (!serialRows[0]) throw new Error("reel_unavailable");
          articleSerialId = Number(serialRows[0].id);
        }
        await connection.execute(`UPDATE flujo_materiales_detalles SET id_articulo=COALESCE(?,id_articulo),id_articulo_serial=COALESCE(?,id_articulo_serial),
          nombre_articulo=COALESCE(?,nombre_articulo),cantidad_entransito_uso=COALESCE(?,cantidad_entransito_uso),id_unidad_uso=COALESCE(?,id_unidad_uso),id_almacen_origen=COALESCE(?,id_almacen_origen),
          id_almacen_destino=COALESCE(?,id_almacen_destino),id_orden_trabajo=COALESCE(?,id_orden_trabajo) WHERE id=?`,
        [input.sku ?? null, articleSerialId, input.materialName ?? null, input.quantity ?? null, input.unitId ?? null,
          input.originWarehouseId ?? null, input.destinationWarehouseId ?? null, input.workOrderId ?? null, createdId]);
        this.tracked.get("A02")!.add(createdId);
    } else if (ruleCode === "A02" && action === "receive") {
        const flowId = key ?? this.fixtureIds.A02.flowId;
        const [rows] = await connection.query<RowDataPacket[]>("SELECT estado FROM flujo_materiales_detalles WHERE id=? FOR UPDATE", [flowId]);
        assertA02MovementOpen(rows[0]?.estado);
        await connection.execute("UPDATE flujo_materiales_detalles SET estado='RECIBIDO',fecha_recepcion=?,fecha_actualizacion=? WHERE id=?", [new Date(state.currentAt), new Date(state.currentAt), flowId]);
    } else if (ruleCode === "A02" && (action === "cancel" || action === "reject")) {
        const flowId = key ?? this.fixtureIds.A02.flowId;
        const terminal = action === "cancel" ? "ANULADO" : "RECHAZADO";
        const [originRows] = await connection.query<RowDataPacket[]>("SELECT estado FROM flujo_materiales_detalles WHERE id=? FOR UPDATE", [flowId]);
        assertA02MovementOpen(originRows[0]?.estado);
        await connection.execute("UPDATE flujo_materiales_detalles SET estado=?,fecha_recepcion=?,fecha_actualizacion=? WHERE id=?", [terminal, new Date(state.currentAt), new Date(state.currentAt), flowId]);
        await connection.execute(`INSERT INTO flujo_materiales_detalles
          (id_articulo,nombre_articulo,id_unidad_uso,cantidad_entransito_uso,id_unidad_inventario,cantidad_entransito_inventario,costo_promedio,
           id_articulo_serial,id_lote,id_almacen_origen,id_almacen_destino,id_ubicacion_almacen_origen,id_ubicacion_almacen_destino,observacion,
           id_unidad_recibida_uso,cantidad_recibida_uso,id_unidad_recibida_inventario,cantidad_recibida_inventario,id_usuario_recepcion,
           fecha_recepcion,id_usuario_creador,id_usuario_actualizacion,id_usuario_eliminacion,fecha_creacion,fecha_actualizacion,fecha_eliminacion,
           id_orden_trabajo,cantidad_inicial_inventario,cantidad_inicial_uso,id_orden_trabajo_material,moneda,estado,id_padre,
           id_documento_desencadenador,id_documento_origen_desencadenador,confirmar_peso,id_material_orden_despacho,id_orden_despacho)
          SELECT id_articulo,nombre_articulo,id_unidad_uso,cantidad_entransito_uso,id_unidad_inventario,cantidad_entransito_inventario,costo_promedio,
           id_articulo_serial,id_lote,id_almacen_destino,id_almacen_origen,id_ubicacion_almacen_destino,id_ubicacion_almacen_origen,?,
           id_unidad_recibida_uso,0,id_unidad_recibida_inventario,0,NULL,NULL,id_usuario_creador,id_usuario_actualizacion,NULL,?, ?,NULL,
           id_orden_trabajo,cantidad_inicial_inventario,cantidad_inicial_uso,id_orden_trabajo_material,moneda,'TRANSITO',id,
           id_documento_desencadenador,id_documento_origen_desencadenador,confirmar_peso,id_material_orden_despacho,id_orden_despacho
          FROM flujo_materiales_detalles WHERE id=?`, [`MONITOR-STAGE5-${action}`, new Date(state.currentAt), new Date(state.currentAt), flowId]);
        const [idRows] = await connection.query<RowDataPacket[]>("SELECT LAST_INSERT_ID() AS id");
        this.tracked.get("A02")!.add(Number(idRows[0]!.id));
    } else if (ruleCode === "A03" && (action === "start_work_order" || action === "start_competing_work_order")) {
        const workOrderId = key ?? this.fixtureIds.A03.workOrderId;
        const [rows] = await connection.query<RowDataPacket[]>(`SELECT candidate.id_equipo,candidate.fecha_inicio_ejecucion,candidate.fecha_fin_ejecucion,
          candidate.fecha_eliminacion,candidate.eliminado FROM ordenes_trabajo candidate WHERE candidate.id=? FOR UPDATE`, [workOrderId]);
        if (!rows[0]) throw new Error("work_order_unavailable");
        const machineId = Number(input.machineId ?? rows[0].id_equipo);
        const [activeRows] = await connection.query<RowDataPacket[]>(`SELECT id FROM ordenes_trabajo WHERE id_equipo=? AND id<>?
          AND fecha_inicio_ejecucion IS NOT NULL AND fecha_fin_ejecucion IS NULL AND fecha_eliminacion IS NULL AND eliminado=0 FOR UPDATE`, [machineId, workOrderId]);
        assertA03MayStart({
          started: rows[0].fecha_inicio_ejecucion !== null,
          closed: rows[0].fecha_fin_ejecucion !== null,
          cancelled: rows[0].fecha_eliminacion !== null || Boolean(rows[0].eliminado),
          otherActiveCount: activeRows.length,
        });
        await connection.execute(`UPDATE ordenes_trabajo SET codigo_orden_trabajo=COALESCE(?,codigo_orden_trabajo),
          id_operacion=COALESCE(?,id_operacion),id_equipo=?,fecha_inicio_ejecucion=?,fecha_actualizacion=? WHERE id=?`,
        [input.workOrderCode ?? null, input.operationId ?? null, machineId, new Date(state.currentAt), new Date(state.currentAt), workOrderId]);
    } else if (ruleCode === "A03" && action === "record_first_consumption") {
        const workOrderId = key ?? this.fixtureIds.A03.workOrderId;
        const [rows] = await connection.query<RowDataPacket[]>(`SELECT ot.fecha_inicio_ejecucion,ot.fecha_fin_ejecucion,ot.fecha_eliminacion,ot.eliminado,
          material.id AS materialId,material.cantidad_consumida FROM ordenes_trabajo ot
          JOIN orden_trabajo_materiales material ON material.id_orden_trabajo=ot.id
          WHERE ot.id=? AND material.fecha_eliminacion IS NULL AND material.eliminado=0 ORDER BY material.id LIMIT 1 FOR UPDATE`, [workOrderId]);
        if (!rows[0]) throw new Error("work_order_material_unavailable");
        const next = nextFirstConsumption(rows[0].cantidad_consumida, {
          started: rows[0].fecha_inicio_ejecucion !== null,
          closed: rows[0].fecha_fin_ejecucion !== null,
          cancelled: rows[0].fecha_eliminacion !== null || Boolean(rows[0].eliminado),
        });
        await connection.execute("UPDATE orden_trabajo_materiales SET cantidad_consumida=?,fecha_actualizacion=? WHERE id=?", [next, new Date(state.currentAt), Number(rows[0].materialId)]);
    } else if (ruleCode === "A03" && action === "close_work_order") {
        const workOrderId = key ?? this.fixtureIds.A03.workOrderId;
        const [rows] = await connection.query<RowDataPacket[]>("SELECT fecha_inicio_ejecucion,fecha_fin_ejecucion,fecha_eliminacion,eliminado FROM ordenes_trabajo WHERE id=? FOR UPDATE", [workOrderId]);
        if (!rows[0]?.fecha_inicio_ejecucion) throw new Error("work_order_not_started");
        if (rows[0].fecha_eliminacion || Boolean(rows[0].eliminado)) throw new Error("work_order_cancelled");
        if (rows[0].fecha_fin_ejecucion) throw new Error("work_order_closed");
        await connection.execute("UPDATE ordenes_trabajo SET fecha_fin_ejecucion=?,fecha_actualizacion=? WHERE id=?", [new Date(state.currentAt), new Date(state.currentAt), workOrderId]);
    } else if (ruleCode === "A03" && action === "cancel_work_order") {
        const workOrderId = key ?? this.fixtureIds.A03.workOrderId;
        const [rows] = await connection.query<RowDataPacket[]>("SELECT fecha_fin_ejecucion,fecha_eliminacion,eliminado FROM ordenes_trabajo WHERE id=? FOR UPDATE", [workOrderId]);
        if (!rows[0]) throw new Error("work_order_unavailable");
        if (rows[0].fecha_fin_ejecucion) throw new Error("work_order_closed");
        if (rows[0].fecha_eliminacion || Boolean(rows[0].eliminado)) throw new Error("work_order_cancelled");
        await connection.execute("UPDATE ordenes_trabajo SET eliminado=1,fecha_eliminacion=?,fecha_actualizacion=? WHERE id=?", [new Date(state.currentAt), new Date(state.currentAt), workOrderId]);
    } else if (ruleCode === "A05" && action === "close_work_order") {
        const serialId = key ?? this.fixtureIds.A05.serialId;
        const [rows] = await connection.query<RowDataPacket[]>(`SELECT work_order.id,work_order.fecha_fin_ejecucion,
          work_order.fecha_eliminacion,work_order.eliminado FROM articulo_serial serial
          JOIN ordenes_trabajo work_order ON work_order.id=COALESCE(serial.id_orden_trabajo_origen,serial.id_ultimo_orden_trabajo_cierre)
          WHERE serial.id=? FOR UPDATE`, [serialId]);
        if (!rows[0]) throw new Error("reel_source_work_order_missing");
        if (rows[0].fecha_fin_ejecucion) throw new Error("work_order_closed");
        if (rows[0].fecha_eliminacion || Boolean(rows[0].eliminado)) throw new Error("work_order_cancelled");
        await connection.execute("UPDATE ordenes_trabajo SET fecha_fin_ejecucion=?,fecha_actualizacion=? WHERE id=?",
          [new Date(state.currentAt), new Date(state.currentAt), Number(rows[0].id)]);
    } else if (ruleCode === "A05" && (action === "declare_produced_reel" || action === "declare_remnant_reel")) {
        const serialId = key ?? this.fixtureIds.A05.serialId;
        const [rows] = await connection.query<RowDataPacket[]>(`SELECT id,estado,id_orden_trabajo_origen,id_ultimo_orden_trabajo_cierre,fecha_eliminacion
          FROM articulo_serial WHERE id=? FOR UPDATE`, [serialId]);
        if (!rows[0] || rows[0].fecha_eliminacion) throw new Error("reel_unavailable");
        if (rows[0].estado === "CONFIRMAR_PESO") throw new Error("reel_already_declared");
        if (action === "declare_produced_reel" && rows[0].id_orden_trabajo_origen === null && input.sourceWorkOrderId === undefined) throw new Error("reel_source_work_order_missing");
        if (action === "declare_remnant_reel" && rows[0].id_ultimo_orden_trabajo_cierre === null && input.sourceWorkOrderId === undefined) throw new Error("reel_closing_work_order_missing");
        const produced = action === "declare_produced_reel";
        await connection.execute(`UPDATE articulo_serial SET codigo_serial=COALESCE(?,codigo_serial),id_articulo=COALESCE(?,id_articulo),
          id_orden_trabajo_origen=IF(?,COALESCE(?,id_orden_trabajo_origen),id_orden_trabajo_origen),
          id_ultimo_orden_trabajo_cierre=IF(?,id_ultimo_orden_trabajo_cierre,COALESCE(?,id_ultimo_orden_trabajo_cierre)),
          tipo=?,estado='CONFIRMAR_PESO',fecha_creacion=?,fecha_actualizacion=? WHERE id=?`, [
          input.serialCode ?? null, input.sku ?? null, produced, input.sourceWorkOrderId ?? null, produced,
          input.sourceWorkOrderId ?? null, produced ? "PRODUCTO_EN_PROCESO" : "SOBRANTE", new Date(state.currentAt), new Date(state.currentAt), serialId,
        ]);
    } else if (ruleCode === "A05" && action === "register_weighing") {
        await this.ensureScale(connection, key ?? this.fixtureIds.A05.serialId);
    } else if (ruleCode === "A05" && action === "register_movement") {
        const serialId = key ?? this.fixtureIds.A05.serialId;
        const [rows] = await connection.query<RowDataPacket[]>(`SELECT serial.id_almacen AS currentWarehouseId,
          source_work_order.id_equipo AS sourceEquipmentId,current_warehouse.id_equipo AS currentEquipmentId,
          (SELECT MIN(destination.id) FROM almacenes destination
            WHERE destination.id<>serial.id_almacen
              AND (destination.id_equipo IS NULL OR destination.id_equipo<>source_work_order.id_equipo)) AS movedWarehouseId
          FROM articulo_serial serial
          JOIN ordenes_trabajo source_work_order
            ON source_work_order.id=COALESCE(serial.id_orden_trabajo_origen,serial.id_ultimo_orden_trabajo_cierre)
          LEFT JOIN almacenes current_warehouse ON current_warehouse.id=serial.id_almacen
          WHERE serial.id=? FOR UPDATE`, [serialId]);
        if (!rows[0] || rows[0].currentWarehouseId === null || rows[0].movedWarehouseId === null
          || Number(rows[0].currentEquipmentId) !== Number(rows[0].sourceEquipmentId)) throw new Error("reel_already_moved");
        await connection.execute("UPDATE articulo_serial SET id_almacen=?,fecha_actualizacion=? WHERE id=?", [Number(rows[0].movedWarehouseId), new Date(state.currentAt), serialId]);
    } else if (ruleCode === "A05" && action === "handoff") {
        const serialId = key ?? this.fixtureIds.A05.serialId;
        const [reelRows] = await connection.query<RowDataPacket[]>(`SELECT serial.id_almacen AS currentWarehouseId,
          source_work_order.id_equipo AS sourceEquipmentId,current_warehouse.id_equipo AS currentEquipmentId,
          (SELECT MIN(destination.id) FROM almacenes destination
            WHERE destination.id<>serial.id_almacen
              AND (destination.id_equipo IS NULL OR destination.id_equipo<>source_work_order.id_equipo)) AS movedWarehouseId
          FROM articulo_serial serial
          JOIN ordenes_trabajo source_work_order
            ON source_work_order.id=COALESCE(serial.id_orden_trabajo_origen,serial.id_ultimo_orden_trabajo_cierre)
          LEFT JOIN almacenes current_warehouse ON current_warehouse.id=serial.id_almacen
          WHERE serial.id=? FOR UPDATE`, [serialId]);
        if (!reelRows[0] || reelRows[0].currentWarehouseId === null || reelRows[0].movedWarehouseId === null
          || Number(reelRows[0].currentEquipmentId) !== Number(reelRows[0].sourceEquipmentId)) throw new Error("reel_already_moved");
        const originWarehouseId = Number(reelRows[0].currentWarehouseId);
        const movedWarehouseId = Number(reelRows[0].movedWarehouseId);
        const [handoffRows] = await connection.query<RowDataPacket[]>(`SELECT COUNT(*) AS handoffCount FROM flujo_materiales_detalles
          WHERE id_articulo_serial=? AND observacion='MONITOR-STAGE5-A05-HANDOFF' AND fecha_eliminacion IS NULL`, [serialId]);
        if (Number(handoffRows[0]?.handoffCount ?? 0) > 0) throw new Error("handoff_already_exists");
        await connection.execute("UPDATE articulo_serial SET id_almacen=?,fecha_actualizacion=? WHERE id=?", [movedWarehouseId, new Date(state.currentAt), serialId]);
        await connection.execute(`INSERT INTO flujo_materiales_detalles
          (id_articulo,nombre_articulo,id_unidad_uso,cantidad_entransito_uso,id_unidad_inventario,cantidad_entransito_inventario,costo_promedio,
           id_articulo_serial,id_lote,id_almacen_origen,id_almacen_destino,id_ubicacion_almacen_origen,id_ubicacion_almacen_destino,observacion,
           cantidad_recibida_uso,cantidad_recibida_inventario,id_usuario_creador,fecha_creacion,id_orden_trabajo,cantidad_inicial_inventario,
           cantidad_inicial_uso,id_orden_trabajo_material,moneda,estado,id_padre,confirmar_peso)
          SELECT template.id_articulo,template.nombre_articulo,template.id_unidad_uso,template.cantidad_entransito_uso,template.id_unidad_inventario,
           template.cantidad_entransito_inventario,template.costo_promedio,?,template.id_lote,?, ?,template.id_ubicacion_almacen_origen,
           template.id_ubicacion_almacen_destino,'MONITOR-STAGE5-A05-HANDOFF',0,0,template.id_usuario_creador,?,template.id_orden_trabajo,
           template.cantidad_inicial_inventario,template.cantidad_inicial_uso,template.id_orden_trabajo_material,template.moneda,'TRANSITO',NULL,template.confirmar_peso
          FROM flujo_materiales_detalles template WHERE template.id=?`, [serialId, originWarehouseId, movedWarehouseId, new Date(state.currentAt), this.fixtureIds.A02.flowId]);
        const [idRows] = await connection.query<RowDataPacket[]>("SELECT LAST_INSERT_ID() AS id");
        this.tracked.get("A02")!.add(Number(idRows[0]!.id));
    } else throw new Error("invalid_source_action");
  }

  async recur(code: string): Promise<ScenarioStatus> {
    asCode(code);
    throw new Error("source_lifecycle_recurrence_unsupported");
  }

  async advanceTime(code: string, minutes: number): Promise<ScenarioStatus> {
    const ruleCode = asCode(code);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) throw new Error("invalid_advance_minutes");
    for (const state of this.states.values()) state.currentAt = new Date(Date.parse(state.currentAt) + minutes * 60_000).toISOString();
    this.touch(ruleCode, "advance_time", null, false);
    return this.status(ruleCode);
  }

  async setBusinessTime(currentAt: string): Promise<void> {
    const timestamp = new Date(currentAt);
    if (!Number.isFinite(timestamp.getTime())) throw new Error("invalid_scenario_business_time");
    for (const state of this.states.values()) state.currentAt = timestamp.toISOString();
  }

  async setSourceCutoffAt(cutoffAt: string | null): Promise<void> {
    this.trackingOverrides.clear();
    if (cutoffAt === null) {
      this.sourceCutoffAt = null;
      return;
    }
    const timestamp = new Date(cutoffAt);
    if (!Number.isFinite(timestamp.getTime())) throw new Error("invalid_scenario_source_cutoff");
    this.sourceCutoffAt = timestamp.toISOString();
  }

  async resetAfterDatabaseRestore(): Promise<void> {
    this.sourceCutoffAt = null;
    this.trackingOverrides.clear();
    this.tracked.set("A02", new Set([this.fixtureIds.A02.flowId]));
    this.tracked.set("A03", new Set([this.fixtureIds.A03.workOrderId]));
    this.tracked.set("A05", new Set([this.fixtureIds.A05.serialId]));
    this.baselineClean = true;
    for (const code of codes) this.touch(code, "reset", "clean_baseline");
  }

  async failNextPoll(code: string, fault: ScenarioFault): Promise<ScenarioStatus> {
    const ruleCode = asCode(code);
    if (!["timeout", "source_error", "partial", "invalid_schema", "partial_pagination", "duplicate_keys", "revision_change", "stale", "unknown_freshness"].includes(fault)) throw new Error("invalid_scenario_fault");
    const state = this.state(ruleCode);
    state.pendingFault = fault;
    state.lastAction = "fail_next_poll";
    state.lastActionAt = state.currentAt;
    state.lastActionRecordedAt = new Date().toISOString();
    return this.status(ruleCode);
  }

  async failFreshnessAfterRead(code: string, fault: "stale" | "unknown_freshness"): Promise<ScenarioStatus> {
    const ruleCode = asCode(code);
    this.deferredFreshnessFaults.set(ruleCode, { fault, inspectionsRemaining: 1 });
    const state = this.state(ruleCode);
    state.pendingFault = null;
    state.lastAction = "fail_next_poll";
    state.lastActionAt = state.currentAt;
    state.lastActionRecordedAt = new Date().toISOString();
    return this.status(ruleCode);
  }

  async consumeFault(code: ScenarioRuleCode): Promise<ScenarioFault | null> {
    const state = this.state(code);
    if (state.pendingFault === "stale" || state.pendingFault === "unknown_freshness") return null;
    const fault = state.pendingFault;
    state.pendingFault = null;
    return fault;
  }

  pollMetadata(code: ScenarioRuleCode): { currentAt: string; sourceRevision: string } {
    return { currentAt: this.state(code).currentAt, sourceRevision: this.revision(code) };
  }

  consumeFreshnessFault(code: ScenarioRuleCode): Extract<ScenarioFault, "stale" | "unknown_freshness"> | null {
    const deferred = this.deferredFreshnessFaults.get(code);
    if (deferred) {
      if (deferred.inspectionsRemaining > 0) {
        deferred.inspectionsRemaining -= 1;
        return null;
      }
      this.deferredFreshnessFaults.delete(code);
      return deferred.fault;
    }
    const state = this.state(code);
    if (state.pendingFault !== "stale" && state.pendingFault !== "unknown_freshness") return null;
    const fault = state.pendingFault;
    state.pendingFault = null;
    return fault;
  }

  async rows(code: ScenarioRuleCode): Promise<{ rows: Record<string, unknown>[]; sourceRevision: string }> {
    await this.connections.requireReady();
    const currentAt = new Date(this.state(code).currentAt);
    const keys = [...this.tracked.get(code)!].sort((left, right) => left - right);
    const placeholders = keys.map(() => "?").join(",");
    const cutoff = this.sourceCutoffAt ? new Date(this.sourceCutoffAt) : null;
    if (code === "A02") {
      const [rows] = await this.connections.writer.query<RowDataPacket[]>(`SELECT f.id AS materialFlowDetailId,1 AS isWorkOrderReservation,
        f.estado AS state,f.fecha_recepcion AS receivedAt,TIMESTAMPDIFF(MINUTE,f.fecha_creacion,?) AS elapsedMinutes,
        f.fecha_creacion AS dispatchedAt,f.id_articulo AS sku,f.id_articulo_serial AS articleSerialId,serial.codigo_serial AS uniqueItemCode,f.nombre_articulo AS materialName,
        f.cantidad_entransito_uso AS quantity,f.id_unidad_uso AS unit,unit.simbolo AS unitSymbol,
        f.id_almacen_origen AS origin,CONCAT(origin_warehouse.codigo,' · ',origin_warehouse.nombre) AS originWarehouseName,
        f.id_almacen_destino AS destination,CONCAT(destination_warehouse.codigo,' · ',destination_warehouse.nombre) AS destinationWarehouseName,
        f.id_orden_trabajo AS workOrderId,ot.codigo_orden_trabajo AS workOrderCode,COALESCE(e.codigo,'Sin máquina') AS machineCode,
        COALESCE(o.nombre,'Sin operación') AS operationName,'No determinado' AS shiftName,'Almacén de materia prima' AS responsibleName
        FROM flujo_materiales_detalles f JOIN ordenes_trabajo ot ON ot.id=f.id_orden_trabajo LEFT JOIN articulo_serial serial ON serial.id=f.id_articulo_serial
        LEFT JOIN equipos e ON e.id=ot.id_equipo LEFT JOIN operaciones o ON o.id=ot.id_operacion
        LEFT JOIN unidades unit ON unit.id=f.id_unidad_uso LEFT JOIN almacenes origin_warehouse ON origin_warehouse.id=f.id_almacen_origen
        LEFT JOIN almacenes destination_warehouse ON destination_warehouse.id=f.id_almacen_destino
        WHERE f.id_orden_trabajo_material IS NOT NULL AND f.fecha_eliminacion IS NULL
          AND ${cutoff ? "f.fecha_creacion>=? AND f.fecha_creacion<=?" : `f.id IN (${placeholders})`} ORDER BY f.id`, cutoff ? [currentAt, cutoff, currentAt] : [currentAt, ...keys]);
      return { rows: rows.map((row) => normalizeRow(row)), sourceRevision: this.revision(code) };
    }
    if (code === "A03") {
      const [rows] = await this.connections.writer.query<RowDataPacket[]>(`SELECT ot.id AS workOrderId,
        (ot.fecha_inicio_ejecucion IS NOT NULL AND ot.fecha_fin_ejecucion IS NULL AND ot.fecha_eliminacion IS NULL AND ot.eliminado=0) AS active,
        TIMESTAMPDIFF(MINUTE,ot.fecha_inicio_ejecucion,?) AS elapsedMinutes,
        ot.fecha_inicio_ejecucion AS startedAt,ot.fecha_fin_ejecucion AS closedAt,
        SUM(CASE WHEN material.fecha_eliminacion IS NULL AND material.eliminado=0 AND material.cantidad_consumida>0 THEN 1 ELSE 0 END) AS consumptionCount,
        ot.codigo_orden_trabajo AS workOrderCode,ot.id_equipo AS machineId,ot.id_operacion AS operationId,COALESCE(e.codigo,'Sin máquina') AS machineCode,COALESCE(o.nombre,'Sin operación') AS operationName,
        'No determinado' AS shiftName,'Operación de máquina' AS responsibleName
        FROM ordenes_trabajo ot LEFT JOIN orden_trabajo_materiales material ON material.id_orden_trabajo=ot.id
        LEFT JOIN equipos e ON e.id=ot.id_equipo LEFT JOIN operaciones o ON o.id=ot.id_operacion
        WHERE ot.fecha_eliminacion IS NULL AND ot.eliminado=0
          AND ${cutoff ? "ot.fecha_inicio_ejecucion>=? AND ot.fecha_inicio_ejecucion<=?" : `ot.id IN (${placeholders})`} GROUP BY ot.id ORDER BY ot.id`, cutoff ? [currentAt, cutoff, currentAt] : [currentAt, ...keys]);
      return { rows: rows.map((row) => normalizeRow(row)), sourceRevision: this.revision(code) };
    }
    const [rows] = await this.connections.writer.query<RowDataPacket[]>(`SELECT s.id AS articleSerialId,TIMESTAMPDIFF(MINUTE,s.fecha_creacion,?) AS declaredAgeMinutes,
      s.fecha_creacion AS declaredAt,s.tipo AS sourceReelType,s.codigo_serial AS serialCode,s.id_articulo AS sku,s.id_almacen AS warehouseId,
      NOT EXISTS(SELECT 1 FROM balanza_carga_detalle_registros scale WHERE scale.id_articulo_serial=s.id AND scale.eliminado=0) AS notWeighed,
      EXISTS(SELECT 1 FROM balanza_carga_detalle_registros scale WHERE scale.id_articulo_serial=s.id AND scale.eliminado=0) AS weighed,
      (ot.fecha_fin_ejecucion IS NOT NULL) AS sourceWorkOrderFinished,(warehouse.id_equipo<>ot.id_equipo OR warehouse.id_equipo IS NULL) AS movedFromMachine,
      COALESCE(e.codigo,'Sin máquina') AS machineCode,COALESCE(o.nombre,'Sin operación') AS operationName,'No determinado' AS shiftName,'Equipo de procesos' AS responsibleName,
      COALESCE(s.id_orden_trabajo_origen,s.id_ultimo_orden_trabajo_cierre) AS workOrderId,ot.codigo_orden_trabajo AS workOrderCode
      FROM articulo_serial s JOIN ordenes_trabajo ot ON ot.id=COALESCE(s.id_orden_trabajo_origen,s.id_ultimo_orden_trabajo_cierre)
      LEFT JOIN almacenes warehouse ON warehouse.id=s.id_almacen LEFT JOIN equipos e ON e.id=ot.id_equipo LEFT JOIN operaciones o ON o.id=ot.id_operacion
      WHERE s.fecha_eliminacion IS NULL
        AND s.estado IN ('CONFIRMAR_PESO','DISPONIBLE')
        AND ((s.tipo='PRODUCTO_EN_PROCESO' AND s.id_orden_trabajo_origen IS NOT NULL)
          OR (s.tipo IN ('ARTICULO','SALDO','SOBRANTE') AND s.id_ultimo_orden_trabajo_cierre IS NOT NULL))
        AND ot.eliminado=0
        AND ${cutoff ? "s.fecha_creacion>=? AND s.fecha_creacion<=?" : `s.id IN (${placeholders})`} ORDER BY s.id`, cutoff ? [currentAt, cutoff, currentAt] : [currentAt, ...keys]);
    return { rows: rows.map((row) => normalizeRow(row)), sourceRevision: this.revision(code) };
  }

  async status(code: string): Promise<ScenarioStatus> {
    const ruleCode = asCode(code);
    const state = this.state(ruleCode);
    const source = await this.rows(ruleCode);
    const reasons: string[] = [];
    for (const row of source.rows) {
      if (ruleCode === "A02" && row.isWorkOrderReservation === true && row.state === "TRANSITO" && row.receivedAt === null && Number(row.elapsedMinutes) >= 30 && !reasons.includes("not_received")) reasons.push("not_received");
      if (ruleCode === "A03" && row.active === true && Number(row.elapsedMinutes) >= 15 && Number(row.consumptionCount) === 0 && !reasons.includes("no_first_consumption")) reasons.push("no_first_consumption");
      if (ruleCode === "A05" && Number(row.declaredAgeMinutes) >= 30) {
        if (row.weighed === false && !reasons.includes("not_weighed")) reasons.push("not_weighed");
        if (row.sourceWorkOrderFinished === true && row.movedFromMachine === false && !reasons.includes("still_at_machine")) reasons.push("still_at_machine");
      }
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
    const [rows] = await connection.query<RowDataPacket[]>("SELECT estado FROM flujo_materiales_detalles WHERE id=?", [this.fixtureIds.A02.flowId]);
    if (!clean && rows[0]?.estado !== "TRANSITO") throw new Error("movement_terminal");
    const age = selected === "before_threshold" ? 29 : selected === "at_threshold" ? 30 : 31;
    await connection.execute(`UPDATE flujo_materiales_detalles SET estado=?,fecha_recepcion=?,fecha_creacion=?,fecha_eliminacion=NULL WHERE id=?`, [
      clean ? "RECIBIDO" : "TRANSITO", clean ? new Date(state.currentAt) : null, before(state.currentAt, clean ? 20 : age), this.fixtureIds.A02.flowId,
    ]);
  }

  private async prepareA03(connection: PoolConnection, selected: ScenarioCase): Promise<void> {
    const state = this.state("A03");
    const clean = selected === "clean_baseline";
    const [rows] = await connection.query<RowDataPacket[]>(`SELECT ot.fecha_fin_ejecucion,ot.fecha_eliminacion,ot.eliminado,
      SUM(CASE WHEN material.cantidad_consumida>0 THEN 1 ELSE 0 END) AS consumed
      FROM ordenes_trabajo ot JOIN orden_trabajo_materiales material ON material.id_orden_trabajo=ot.id WHERE ot.id=? GROUP BY ot.id`, [this.fixtureIds.A03.workOrderId]);
    if (rows[0]?.fecha_fin_ejecucion) throw new Error("work_order_closed");
    if (rows[0]?.fecha_eliminacion || Boolean(rows[0]?.eliminado)) throw new Error("work_order_cancelled");
    if (!clean && Number(rows[0]?.consumed ?? 0) > 0) throw new Error("consumption_already_recorded");
    const age = selected === "before_threshold" ? 14 : selected === "at_threshold" ? 15 : 16;
    await connection.execute(`UPDATE ordenes_trabajo SET fecha_inicio_ejecucion=?,fecha_eliminacion=NULL,eliminado=0 WHERE id=?`, [before(state.currentAt, clean ? 10 : age), this.fixtureIds.A03.workOrderId]);
    if (clean) await connection.execute("UPDATE orden_trabajo_materiales SET cantidad_consumida=GREATEST(cantidad_consumida,1),fecha_actualizacion=? WHERE id=?", [new Date(state.currentAt), this.fixtureIds.A03.materialId]);
  }

  private async prepareA05(connection: PoolConnection, selected: ScenarioCase): Promise<void> {
    const state = this.state("A05");
    const age = selected.startsWith("before_threshold") ? 29 : selected.startsWith("at_threshold") ? 30 : 31;
    const clean = selected === "clean_baseline" || selected === "movement_started";
    const notWeighed = selected.endsWith("not_weighed") || selected === "before_threshold" || selected === "at_threshold"
      || ["past_threshold_both", "past_threshold_produced", "past_threshold_remnant"].includes(selected);
    const stillAtMachine = selected.endsWith("still_at_machine") || selected === "before_threshold" || selected === "at_threshold"
      || ["past_threshold_both", "past_threshold_produced", "past_threshold_remnant"].includes(selected);
    await connection.execute(`DELETE FROM balanza_carga_detalle_registros WHERE id_articulo_serial=?
      AND secuencia IN (?,?)`, [this.fixtureIds.A05.serialId, `MONITOR-STAGE4-${this.fixtureIds.A05.serialId}`, `MONITOR-STAGE5-${this.fixtureIds.A05.serialId}`]);
    const declaredType = selected === "past_threshold_produced" ? "PRODUCTO_EN_PROCESO" : selected === "past_threshold_remnant" ? "SOBRANTE" : null;
    await connection.execute(`UPDATE articulo_serial SET tipo=COALESCE(?,tipo),fecha_creacion=?,fecha_actualizacion=?,estado='CONFIRMAR_PESO',id_almacen=? WHERE id=?`, [
      declaredType, before(state.currentAt, clean ? 10 : age), new Date(state.currentAt), clean || !stillAtMachine ? this.fixtureIds.A05.movedWarehouseId : this.fixtureIds.A05.originWarehouseId, this.fixtureIds.A05.serialId,
    ]);
    if (stillAtMachine) {
      await connection.execute(`UPDATE ordenes_trabajo SET fecha_fin_ejecucion=COALESCE(fecha_fin_ejecucion,?),fecha_actualizacion=?
        WHERE id=(SELECT work_order_id FROM (SELECT COALESCE(id_orden_trabajo_origen,id_ultimo_orden_trabajo_cierre) AS work_order_id FROM articulo_serial WHERE id=?) selected)`,
      [new Date(state.currentAt), new Date(state.currentAt), this.fixtureIds.A05.serialId]);
    }
    if (clean || !notWeighed) await this.ensureScale(connection);
  }

  private async ensureScale(connection: PoolConnection, serialId = this.fixtureIds.A05.serialId): Promise<void> {
    const state = this.state("A05");
    const [serialRows] = await connection.query<RowDataPacket[]>("SELECT id_usuario_creador,fecha_eliminacion FROM articulo_serial WHERE id=? FOR UPDATE", [serialId]);
    if (!serialRows[0] || serialRows[0].fecha_eliminacion) throw new Error("reel_unavailable");
    const [scaleRows] = await connection.query<RowDataPacket[]>(`SELECT id FROM balanza_carga_detalle_registros
      WHERE id_articulo_serial=? AND eliminado=0 FOR UPDATE`, [serialId]);
    if (scaleRows.length > 1) throw new Error("duplicate_active_scale_records");
    if (scaleRows.length === 1) return;
    await connection.execute(`INSERT INTO balanza_carga_detalle_registros
      (secuencia,peso_neto,peso_tara,peso_bruto,tipo_registro,fecha_creacion,id_usuario_creador,eliminado,id_articulo_serial)
      VALUES (?,1,0,1,'REEL',?, ?,0,?)`, [
      `MONITOR-STAGE5-${serialId}`, new Date(state.currentAt), Number(serialRows[0].id_usuario_creador), serialId,
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
    if (changed) {
      state.revision += 1;
      state.sourceChangedAt = recordedAt;
      if (action !== "reset") this.baselineClean = false;
    }
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
  const routingFields = ["machineCode", "operationName", "shiftName", "responsibleName"];
  const requiredFields = code === "A02"
    ? ["materialFlowDetailId", "isWorkOrderReservation", "state", "receivedAt", "elapsedMinutes", ...routingFields, "warehouseType"]
    : code === "A03" ? ["workOrderId", "active", "elapsedMinutes", "consumptionCount", ...routingFields]
      : ["articleSerialId", "declaredAgeMinutes", "weighed", "sourceWorkOrderFinished", "movedFromMachine", "reelKind", ...routingFields, "warehouseType"];
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
