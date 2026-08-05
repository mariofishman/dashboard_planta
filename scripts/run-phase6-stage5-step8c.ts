import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import { createServer as createNetServer } from "node:net";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { TestDatabaseConnections } from "@monitor/detection";
import { createServer as createViteServer } from "../apps/web/node_modules/vite/dist/node/index.js";
import { buildMonitorServer, type MonitorServer } from "../apps/api/src/server.js";
import { assertValidStage5Ledger, renderStage5Ledger } from "./lib/stage5-ledger.mjs";

const execFile = promisify(execFileCallback);
const root = resolve(import.meta.dirname, "..");
const resetRoot = resolve(process.env.STAGE5_RESET_ROOT ?? root);
const runId = process.env.STAGE5_RUN_ID ?? `step8c-${new Date().toISOString().replace(/[-:.TZ]/g, "")}`;
const selectedCaseIds = new Set((process.env.STAGE5_CASE_IDS ?? process.env.STAGE5_CASE_ID ?? "").split(",").filter(Boolean));
const evidenceRoot = resolve(root, "local-data/test-database/evidence/stage5-step8c", runId);
const manager = { authorization: "Bearer mock:plant-manager" };
const checksumTables = ["articulo_serial", "balanza_carga_detalle_registros", "flujo_materiales_detalles", "orden_trabajo_materiales", "ordenes_trabajo"];
const candidateSourceActions = new Set(["a02.prepare_dispatch", "a03.start_work_order", "a05.declare_produced_reel", "a05.declare_remnant_reel"]);
const notApplicable = (reason: string) => ({ applicability: "not_applicable", notApplicableReason: reason });
const sha256 = (value: unknown) => `sha256:${createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex")}`;
const readJson = async (path: string) => JSON.parse(await readFile(resolve(root, path), "utf8"));
const [manifest, fixtureRegistry, fixtureSeeds, ledgerSchema] = await Promise.all([
  readJson("config/detection/stage5-connected-acceptance.v2.json"),
  readJson("config/detection/fixtures/stage5-fixture-contracts.v1.json"),
  readJson("config/detection/fixtures/test-database-stage5.v1.json"),
  readJson("config/detection/schemas/stage5-connected-ledger-result.v1.schema.json"),
]);

type AnyRecord = Record<string, any>;
type BrowserResult = {
  outcome: "presence" | "absence" | "responsive";
  laboratoryArtifacts: string[];
  dashboardCardArtifacts: string[];
  chatListArtifacts: string[];
  chatDetailArtifacts: string[];
  assertions: {
    currentExperimentHasNoNewActivity: boolean;
    priorHistoryQueryable: boolean;
    awaitingPollIsNonError: boolean;
    monitorStateHeldUntilPoll: boolean;
  };
};

async function availablePort(): Promise<number> {
  const probe = createNetServer();
  await new Promise<void>((done, reject) => { probe.once("error", reject); probe.listen(0, "127.0.0.1", done); });
  const address = probe.address(); assert.ok(address && typeof address === "object");
  await new Promise<void>((done, reject) => probe.close((error) => error ? reject(error) : done()));
  return address.port;
}

async function resetSource(label: string): Promise<void> {
  const { stdout, stderr } = await execFile("npm", ["run", "db:test-source:reset"], {
    cwd: resetRoot,
    env: { ...process.env, ALLOW_TEST_DATABASE_RESET: "yes" },
    maxBuffer: 10 * 1024 * 1024,
  });
  await writeFile(resolve(evidenceRoot, `${label}.log`), `${stdout}${stderr}`);
}

async function sourceDigest(connections: TestDatabaseConnections): Promise<string> {
  const [rows] = await connections.writer.query(`CHECKSUM TABLE ${checksumTables.map((table) => `test_database.\`${table}\``).join(",")}`);
  return sha256(rows);
}

type FixtureBaselineTable = { columns: string[]; rows: AnyRecord[] };
type FixtureBaseline = Record<string, FixtureBaselineTable>;

async function captureFixtureBaseline(connections: TestDatabaseConnections): Promise<FixtureBaseline> {
  const ids = { A02: new Set<number>(), A03: new Set<number>(), A05: new Set<number>() };
  for (const contract of fixtureRegistry.contracts) for (const key of contract.source.naturalKeys ?? []) {
    if (key.seedRef && key.ruleCode in ids) ids[key.ruleCode as keyof typeof ids].add(seedValue(key.seedRef));
  }
  const connection = await connections.writer.getConnection();
  try {
    const columns = async (table: string) => {
      const [rows] = await connection.query<AnyRecord[]>(`SHOW COLUMNS FROM \`${table}\``);
      return rows.filter((row) => !String(row.Extra ?? "").includes("GENERATED")).map((row) => String(row.Field));
    };
    const capture = async (table: string, where: string, parameters: unknown[]): Promise<FixtureBaselineTable> => {
      const selectedColumns = await columns(table);
      const [rows] = await connection.query<AnyRecord[]>(
        `SELECT ${selectedColumns.map((column) => `\`${column}\``).join(",")} FROM \`${table}\` WHERE ${where}`, parameters);
      return { columns: selectedColumns, rows };
    };
    const a02Ids = [...ids.A02];
    const a03Ids = [...ids.A03];
    const a05Ids = [...ids.A05];
    const placeholders = (values: unknown[]) => values.map(() => "?").join(",");
    const [a05WorkOrders] = await connection.query<AnyRecord[]>(`SELECT DISTINCT COALESCE(id_orden_trabajo_origen,id_ultimo_orden_trabajo_cierre) AS id
      FROM articulo_serial WHERE id IN (${placeholders(a05Ids)})`, a05Ids);
    const relatedWorkOrderIds = [...new Set([...a03Ids, ...a05WorkOrders.map((row) => Number(row.id)).filter(Number.isSafeInteger)])];
    return {
      flujo_materiales_detalles: await capture("flujo_materiales_detalles", `id IN (${placeholders(a02Ids)})`, a02Ids),
      ordenes_trabajo: await capture("ordenes_trabajo", `id IN (${placeholders(relatedWorkOrderIds)})`, relatedWorkOrderIds),
      orden_trabajo_materiales: await capture("orden_trabajo_materiales", `id_orden_trabajo IN (${placeholders(a03Ids)})`, a03Ids),
      articulo_serial: await capture("articulo_serial", `id IN (${placeholders(a05Ids)})`, a05Ids),
      balanza_carga_detalle_registros: await capture("balanza_carga_detalle_registros", `id_articulo_serial IN (${placeholders(a05Ids)})`, a05Ids),
    };
  } finally {
    connection.release();
  }
}

async function restoreFixtureBaseline(connections: TestDatabaseConnections, baseline: FixtureBaseline): Promise<void> {
  const connection = await connections.writer.getConnection();
  try {
    await connection.beginTransaction();
    // Source-action simulations create disposable rows whose IDs are intentionally
    // absent from the certified baseline. Remove them between cases so a later
    // case cannot mistake a prior terminal movement for its newly created one.
    await connection.execute("DELETE FROM flujo_materiales_detalles WHERE observacion LIKE 'MONITOR-STAGE5-%' AND id_padre IS NOT NULL");
    await connection.execute("DELETE FROM flujo_materiales_detalles WHERE observacion LIKE 'MONITOR-STAGE5-%'");
    const restore = async (table: string) => {
      const snapshot = baseline[table]!;
      if (snapshot.rows.length === 0) return;
      const columns = snapshot.columns.map((column) => `\`${column}\``).join(",");
      const placeholders = snapshot.columns.map(() => "?").join(",");
      const updates = snapshot.columns.filter((column) => column !== "id")
        .map((column) => `\`${column}\`=VALUES(\`${column}\`)`).join(",");
      for (const row of snapshot.rows) await connection.execute(
        `INSERT INTO \`${table}\` (${columns}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`,
        snapshot.columns.map((column) => row[column]));
    };
    await restore("ordenes_trabajo");
    await restore("orden_trabajo_materiales");
    await restore("articulo_serial");
    await restore("flujo_materiales_detalles");
    const scaleSerialIds = [...new Set(baseline.articulo_serial.rows.map((row) => Number(row.id)).filter(Number.isSafeInteger))];
    if (scaleSerialIds.length) await connection.execute(
      `DELETE FROM balanza_carga_detalle_registros WHERE id_articulo_serial IN (${scaleSerialIds.map(() => "?").join(",")})`, scaleSerialIds);
    await restore("balanza_carga_detalle_registros");
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function applyFixturePopulation(connections: TestDatabaseConnections, contract: AnyRecord, keys: Map<string, number | null>): Promise<void> {
  const populations = (contract.source.allowedMutations ?? [])
    .filter((mutation: AnyRecord) => mutation.type === "fixture_population_contract" && mutation.contractId.startsWith("a05."));
  if (populations.length === 0) return;
  assert.equal(populations.length, 1, `${contract.testId} has ambiguous A05 fixture populations`);
  const population = populations[0];
  assert.ok(["a05.closed_ot_unweighed_at_machine", "a05.open_ot_unweighed_at_machine"].includes(population.contractId),
    `${contract.testId} has unsupported A05 fixture population ${population.contractId}`);
  const serialIds = population.keyRefs.map((ref: string) => keys.get(ref));
  assert.ok(serialIds.length > 0 && serialIds.every(Number.isSafeInteger), `${contract.testId} has invalid A05 fixture keys`);
  const connection = await connections.writer.getConnection();
  try {
    await connection.beginTransaction();
    for (const serialId of serialIds as number[]) {
      const [rows] = await connection.query<AnyRecord[]>(`SELECT serial.id,
        COALESCE(serial.id_orden_trabajo_origen,serial.id_ultimo_orden_trabajo_cierre) AS workOrderId,
        work_order.id_equipo AS sourceEquipmentId
        FROM articulo_serial serial
        JOIN ordenes_trabajo work_order
          ON work_order.id=COALESCE(serial.id_orden_trabajo_origen,serial.id_ultimo_orden_trabajo_cierre)
        WHERE serial.id=? FOR UPDATE`, [serialId]);
      assert.equal(rows.length, 1, `${contract.testId} A05 fixture reel ${serialId} is unavailable`);
      const [warehouses] = await connection.query<AnyRecord[]>(
        "SELECT MIN(id) AS warehouseId FROM almacenes WHERE id_equipo=?", [Number(rows[0]!.sourceEquipmentId)]);
      const warehouseId = Number(warehouses[0]?.warehouseId);
      assert.ok(Number.isSafeInteger(warehouseId), `${contract.testId} A05 fixture reel ${serialId} has no source-machine warehouse`);
      await connection.execute("UPDATE articulo_serial SET id_almacen=?,fecha_eliminacion=NULL,fecha_actualizacion=? WHERE id=?",
        [warehouseId, new Date(fixtureRegistry.profiles.isolated_per_test.businessTime), serialId]);
      await connection.execute("UPDATE balanza_carga_detalle_registros SET eliminado=1 WHERE id_articulo_serial=? AND eliminado=0", [serialId]);
      const closedAt = population.contractId === "a05.closed_ot_unweighed_at_machine"
        ? new Date(fixtureRegistry.profiles.isolated_per_test.businessTime) : null;
      await connection.execute(`UPDATE ordenes_trabajo SET fecha_fin_ejecucion=?,fecha_eliminacion=NULL,eliminado=0,fecha_actualizacion=? WHERE id=?`,
        [closedAt, new Date(fixtureRegistry.profiles.isolated_per_test.businessTime), Number(rows[0]!.workOrderId)]);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function seedValue(seedRef: string): number {
  const match = /^([a-z][a-z0-9]*)\.([A-Za-z][A-Za-z0-9]*)\[(\d+)]$/.exec(seedRef);
  assert.ok(match, `invalid seed ref ${seedRef}`);
  const value = fixtureSeeds[match[1]]?.[match[2]]?.[Number(match[3])];
  assert.ok(Number.isSafeInteger(value) && value > 0, `missing seed ${seedRef}`);
  return value;
}

function sourceActionRule(actionId: string): "A02" | "A03" | "A05" | null {
  if (actionId.startsWith("a02.")) return "A02";
  if (actionId.startsWith("a03.")) return "A03";
  if (actionId.startsWith("a05.")) return "A05";
  return null;
}

function expectedVisibleOutcome(testId: string): "presence" | "absence" | "responsive" {
  if (testId === "SH-11") return "responsive";
  if (["SH-02", "SH-03", "SH-04", "SH-05", "SH-07", "A02-00", "A02-03", "A03-00", "A05-00"].includes(testId)) return "absence";
  return "presence";
}

function fixtureSeedsForContract(contract: AnyRecord): { A02: number; A03: number; A05: number } {
  const fallback = { A02: Number(fixtureSeeds.a02.clean[0]), A03: Number(fixtureSeeds.a03.clean[0]), A05: Number(fixtureSeeds.a05.clean[0]) };
  if (["SH-01", "SH-08"].includes(contract.testId)) fallback.A02 = Number(fixtureSeeds.a02.downstream[0]);
  const assigned = new Set<string>();
  const keys = contract.source.naturalKeys ?? [];
  const preferredRefs = new Set((contract.actions ?? [])
    .filter((action: AnyRecord) => candidateSourceActions.has(action.actionId))
    .flatMap((action: AnyRecord) => action.keyRefs));
  for (const key of [...keys.filter((candidate: AnyRecord) => preferredRefs.has(candidate.ref)), ...keys.filter((candidate: AnyRecord) => !preferredRefs.has(candidate.ref))]) {
    if (!key.seedRef || assigned.has(key.ruleCode)) continue;
    fallback[key.ruleCode as keyof typeof fallback] = seedValue(key.seedRef);
    assigned.add(key.ruleCode);
  }
  return fallback;
}

function completeness(status: string): string {
  return ({ healthy: "complete", partial: "incomplete", invalid_schema: "invalid_shape", stale: "complete", unknown_freshness: "complete", source_error: "transport_error", overlap_skipped: "overlap_rejected" } as AnyRecord)[status] ?? status;
}

async function roster(server: MonitorServer) {
  const response = await server.app.inject({ method: "PUT", url: "/api/roster/assignments", headers: manager, payload: { revision: 0, assignments: [
    { id: "manager", sysUserId: 9001, person: "Gerencia de planta", position: "Gerente de fábrica", operations: [], warehouseType: null, scope: "factory", group: null, validFrom: "2026-07-01", validTo: null, state: "active", setupComplete: true },
  ] } });
  assert.equal(response.statusCode, 200, response.body);
}

async function monitorSnapshot(server: MonitorServer) {
  const incidents = await server.database.queryAll("SELECT id,rule_code AS \"ruleCode\",condition_key AS \"conditionKey\",lifecycle,occurrence,reasons FROM monitor_incident ORDER BY opened_at,id");
  const incidentIds = incidents.map(({ id }) => String(id));
  const ids = async (sql: string, parameters: unknown[] = []) => (await server.database.queryAll(sql, parameters)).map(({ id }) => String(id));
  const evidenceIds = incidentIds.length ? await ids("SELECT id FROM monitor_incident_evidence WHERE incident_id=ANY($1::uuid[]) ORDER BY id", [incidentIds]) : [];
  const routingDecisionIds = incidentIds.length ? await ids("SELECT id FROM monitor_routing_decision WHERE incident_id=ANY($1::uuid[]) ORDER BY id", [incidentIds]) : [];
  const deliveryIds = incidentIds.length ? await ids("SELECT id FROM monitor_notification_delivery WHERE incident_id=ANY($1::uuid[]) ORDER BY id", [incidentIds]) : [];
  const conversationIds = incidentIds.length ? await ids("SELECT DISTINCT conversation_id AS id FROM monitor_conversation_incident WHERE incident_id=ANY($1::uuid[]) ORDER BY conversation_id", [incidentIds]) : [];
  const messages = conversationIds.length ? await server.database.queryAll("SELECT id,cursor FROM monitor_message WHERE conversation_id=ANY($1::uuid[]) ORDER BY cursor,id", [conversationIds]) : [];
  const receiptIds = messages.length ? await ids(`SELECT message_id||':'||sys_user_id||':'||
    CASE WHEN read_at IS NOT NULL THEN 'read' WHEN delivered_at IS NOT NULL THEN 'delivered' ELSE 'pending' END AS id
    FROM monitor_message_receipt WHERE message_id=ANY($1::uuid[]) ORDER BY 1`, [messages.map(({ id }) => String(id))]) : [];
  return { incidents, incidentIds, evidenceIds, routingDecisionIds, deliveryIds, conversationIds,
    messageIds: messages.map(({ id }) => String(id)), receiptIds, cursorStart: 0, cursorEnd: Number(messages.at(-1)?.cursor ?? 0) };
}

async function assertDeclaredCaseOutcome(testId: string, server: MonitorServer, monitor: AnyRecord, allEvents: AnyRecord[], experimentIds: Set<string>,
  trackedByRule: Map<string, Set<number>>, laneId = "main"): Promise<void> {
  const incidents = (code: string) => {
    const tracked = trackedByRule.get(code) ?? new Set<number>();
    const conditionKeys = new Set([...tracked].map((key) => `${code}:v1:${key}`));
    return monitor.incidents.filter((incident: AnyRecord) => incident.ruleCode === code
      && (conditionKeys.size === 0 || conditionKeys.has(incident.conditionKey)));
  };
  const assertSingleOccurrence = (code: string, count = 1) => {
    assert.equal(incidents(code).length, count, `${testId} has the wrong ${code} incident count`);
    assert.ok(incidents(code).every((incident: AnyRecord) => Number(incident.occurrence) === 1), `${testId} duplicated a ${code} occurrence`);
  };
  const rule = testId.startsWith("A02") ? "A02" : testId.startsWith("A03") ? "A03" : testId.startsWith("A05") ? "A05" : null;
  if (["A02-00", "A02-03", "A03-00", "A05-00"].includes(testId)) assert.equal(incidents(rule!).length, 0, `${testId} invented an incident`);
  if (["A02-01", "A02-02", "A02-06", "A02-09", "A03-01", "A03-02", "A05-01"].includes(testId)) assertSingleOccurrence(rule!);
  if (["A02-04", "A03-03", "A05-04", "A03-05", "A05-08"].includes(testId)) {
    assertSingleOccurrence(rule!);
    assert.ok(incidents(rule!).every((incident: AnyRecord) => incident.lifecycle === "resolved"), `${testId} did not resolve the original occurrence`);
  }
  if (["A02-05", "A03-04", "A05-05"].includes(testId)) {
    assertSingleOccurrence(rule!);
    assert.ok(incidents(rule!).every((incident: AnyRecord) => incident.lifecycle === "closed_without_resolution"), `${testId} did not preserve administrative closure`);
  }
  if (testId === "A05-01") assert.deepEqual([...incidents("A05")[0].reasons].sort(), ["not_weighed", "still_at_machine"]);
  if (testId === "A05-02" || testId === "A05-03") {
    assertSingleOccurrence("A05", laneId === "main" ? 2 : 1);
    assert.ok(incidents("A05").every((incident: AnyRecord) => Array.isArray(incident.reasons) && incident.reasons.length === 1), `${testId} did not preserve independent A05 reasons`);
  }
  if (testId === "A02-07") {
    assertSingleOccurrence("A02");
    assert.ok(incidents("A02").every((incident: AnyRecord) => incident.lifecycle === "resolved"), `A02-07:${laneId} did not resolve the original movement`);
  }
  if (testId === "A05-06") {
    assertSingleOccurrence("A05");
    assertSingleOccurrence("A02");
    assert.ok(incidents("A05").every((incident: AnyRecord) => !incident.reasons.includes("still_at_machine")), "A05-06 retained movement ownership after handoff");
  }
  if (testId === "SH-06" || testId === "SH-09") for (const code of ["A02", "A03", "A05"]) assertSingleOccurrence(code);
  if (testId === "SH-01" || testId === "SH-08") {
    assert.equal(experimentIds.size, 2, `${testId} did not isolate prior and current experiments`);
    assert.ok(monitor.incidentIds.length > 0, `${testId} did not preserve prior Monitor history`);
  }
  if (testId === "SH-03") {
    const completed = allEvents.filter((event) => event.eventType === "poll_completed");
    assert.equal(completed.length, 27, "SH-03 must run three rule reads at each of nine due times");
    assert.equal(new Set(completed.map((event) => event.businessTime)).size, 9, "SH-03 must have nine serialized due times");
  }
  if (testId === "SH-04") assert.equal(allEvents.filter((event) => event.eventType === "poll_completed" && event.ruleCode === "A02").length, 1, "SH-04 must have exactly one scheduler-owned A02 execution");
  if (testId === "SH-05") {
    const snapshots = await server.database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_scenario_snapshot");
    assert.equal(Number(snapshots.count), 2, "SH-05 must retain before and after snapshots");
    assert.ok(allEvents.some((event) => event.eventType === "poll_failed"), "SH-05 did not capture a failed poll");
  }
  if (testId === "SH-09") {
    assert.equal(new Set(monitor.incidentIds).size, monitor.incidentIds.length);
    assert.equal(new Set(monitor.messageIds).size, monitor.messageIds.length);
  }
  if (testId === "SH-10") {
    assert.ok(allEvents.some((event) => event.eventType === "poll_failed"), "SH-10 did not preserve a failed read");
    assert.ok(allEvents.some((event) => event.eventType === "poll_completed"), "SH-10 did not complete healthy recovery");
  }
}

async function experimentEvents(server: MonitorServer, experimentId: string): Promise<AnyRecord[]> {
  const response: AnyRecord = await server.app.inject({ method: "GET", url: `/api/dev/scenario-experiments/${experimentId}`, headers: manager });
  assert.equal(response.statusCode, 200, response.body);
  return response.json().events as AnyRecord[];
}

async function scenarioStatus(server: MonitorServer, ruleCode: string): Promise<AnyRecord> {
  const response: AnyRecord = await server.app.inject({ method: "GET", url: "/api/dev/scenarios?page=1&pageSize=50&activeOnly=true", headers: manager });
  assert.equal(response.statusCode, 200, response.body);
  const item = response.json().scenarios.find((candidate: AnyRecord) => candidate.ruleCode === ruleCode);
  assert.ok(item, `scenario status missing:${ruleCode}`);
  return item;
}

async function waitForPollEvents(server: MonitorServer, experimentId: string, codes: string[], before: number, count: number, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const events = (await server.app.inject({ method: "GET", url: `/api/dev/scenario-experiments/${experimentId}`, headers: manager })).json().events as AnyRecord[];
    const completed = events.filter((event) => ["poll_completed", "poll_failed"].includes(event.eventType) && codes.includes(event.ruleCode));
    if (completed.length >= before + count * codes.length) return completed;
    await new Promise((done) => setTimeout(done, 100));
  }
  throw new Error(`automatic_poll_timeout:${codes.join(",")}`);
}

async function readBrowserResult(caseDir: string, testId: string, fileName = "browser-results.json"): Promise<BrowserResult> {
  const path = resolve(caseDir, fileName);
  const deadline = Date.now() + Number(process.env.STAGE5_BROWSER_RESULTS_TIMEOUT_MS ?? 15 * 60_000);
  while (Date.now() < deadline) {
    if (existsSync(path)) return JSON.parse(await readFile(path, "utf8"));
    await new Promise((done) => setTimeout(done, 200));
  }
  throw new Error(`browser_result_timeout:${testId}`);
}

async function executeCase(declaration: AnyRecord, apiPort: number, webOrigin: string, fixtureBaseline: FixtureBaseline,
  contractOverride?: AnyRecord, laneId = "main") {
  const testId = declaration.id as string;
  const caseDir = laneId === "main" ? resolve(evidenceRoot, "cases", testId) : resolve(evidenceRoot, "cases", testId, "lanes", laneId);
  await mkdir(resolve(caseDir, "browser"), { recursive: true });
  const connections = await TestDatabaseConnections.create(root);
  const contract = contractOverride ?? fixtureRegistry.contracts.find((candidate: AnyRecord) => candidate.testId === testId);
  assert.ok(contract, `missing fixture contract ${testId}`);
  const keys = new Map<string, number | null>((contract.source.naturalKeys ?? []).map((key: AnyRecord) => [key.ref, key.seedRef ? seedValue(key.seedRef) : null]));
  await restoreFixtureBaseline(connections, fixtureBaseline);
  await applyFixturePopulation(connections, contract, keys);
  const fixtureSeedMap = fixtureSeedsForContract(contract);
  let server: MonitorServer | null = null;
  let experiment: AnyRecord | null = null;
  const experimentIds = new Set<string>();
  const actionExecutions: AnyRecord[] = [];
  const sourceExecutions: AnyRecord[] = [];
  const sourceBoundaryArtifacts: string[] = [];
  const sourceBoundaryBrowserArtifacts: string[] = [];
  const trackedByRule = new Map<string, Set<number>>(["A02", "A03", "A05"].map((code) => [code, new Set<number>()]));
  let interruption: AnyRecord | null = null;
  let experimentOrdinal = 0;
  const startedAt = new Date().toISOString();
  try {
    server = await buildMonitorServer({ testDatabaseFixtureSeeds: fixtureSeedMap, config: {
      nodeEnv: "test", cookieSecret: `stage5-step8c-${testId}-secret-with-enough-entropy`, allowMockAuth: true,
      enableScenarioLab: true, scenarioSource: "test_database", databaseMode: "pglite", pgliteDataDir: "memory://", webOrigin,
    } });
    assert.ok(server.acceptance && server.stage5BrowserRuntime);
    await server.app.listen({ host: "127.0.0.1", port: apiPort });
    await roster(server);
    const acceptance = server.acceptance;
    (acceptance.runtime as unknown as { automaticScheduling: boolean }).automaticScheduling = true;
    const createExperiment = async () => {
      experimentOrdinal += 1;
      const experimentRunId = `${runId}:${testId}:${laneId}:${experimentOrdinal}`;
      const created = await acceptance.runtime.create({ name: `Stage 5 ${runId} ${testId}`, businessTime: fixtureRegistry.profiles.isolated_per_test.businessTime,
        pollingFrequencyMinutes: 3,
        identity: { runId: experimentRunId, manifestVersion: manifest.manifestVersion, sourceActionContractVersion: manifest.sourceActionContractVersion } });
      assert.ok(created.experiment); experiment = created.experiment;
      experimentIds.add(experiment.id);
      await acceptance.runtime.configure(experiment.id, 60, 3);
    };
    const ensureRunning = async () => {
      const status = await acceptance.runtime.status();
      assert.ok(status.experiment);
      if (status.experiment.status === "paused") await acceptance.runtime.pause(status.experiment.id, false);
    };
    const activateBrowserRuntime = (checkpoint: string) => {
      assert.ok(experiment);
      const runtimeSeed = {
        runId: experiment.runId, experimentId: experiment.id, runtimeId: `step8c-${testId}-${checkpoint}-${randomUUID()}`,
        captureNonce: randomUUID().replaceAll("-", ""), manifestVersion: manifest.manifestVersion,
        sourceActionContractVersion: manifest.sourceActionContractVersion, startedAt,
      };
      server!.stage5BrowserRuntime!.activate(runtimeSeed);
      return runtimeSeed;
    };
    const seedPriorHistory = async () => {
      await ensureRunning();
      await acceptance.runtime.advance(experiment!.id, 3);
      await acceptance.runtime.pause(experiment!.id, true);
    };
    if (testId === "SH-01") {
      await createExperiment();
      await seedPriorHistory();
    } else if (!contract.actions.some((action: AnyRecord) => action.actionId === "experiment.create")) {
      await createExperiment();
      if (testId === "SH-11") await seedPriorHistory();
    }

    for (const action of contract.actions as AnyRecord[]) {
      const auditTime = new Date().toISOString();
      let outcome: "completed" | "rejected" = "completed";
      let responseStatus: number | undefined;
      let responseCode: string | undefined;
      if (action.actionId === "experiment.create") {
        await createExperiment();
        if (testId === "SH-08" && action.sequence === 1) await seedPriorHistory();
      }
      else if (action.actionId === "experiment.pause") {
        for (const paused of action.parameters.pauseStates ?? [true]) {
          const status = await acceptance.runtime.pause(experiment!.id, paused);
          if (testId === "SH-03" && paused) {
            const beforePauseEvents: number = (await experimentEvents(server, experiment!.id)).length;
            const frozen = await acceptance.runtime.advance(experiment!.id, 5);
            assert.equal(frozen.experiment.businessTime, status.experiment!.businessTime, "SH-03 business time changed while paused");
            assert.equal(frozen.polls.length, 0, "SH-03 polled while paused");
            assert.equal((await experimentEvents(server, experiment!.id)).length, beforePauseEvents, "SH-03 recorded events while paused");
          }
        }
      } else if (action.actionId === "experiment.configure") {
        const speeds = action.parameters.secondsPerSimulatedMinuteCases ?? [action.parameters.secondsPerSimulatedMinute];
        const frequencies = action.parameters.pollingFrequencyMinuteCases ?? [action.parameters.pollingFrequencyMinutes];
        for (const speed of speeds) for (const frequency of frequencies) await acceptance.runtime.configure(experiment!.id, speed, frequency);
      } else if (action.actionId === "experiment.advance") {
        await ensureRunning();
        await acceptance.runtime.advance(experiment!.id, action.parameters.minutes);
      } else if (action.actionId === "experiment.snapshot") {
        const response: AnyRecord = await server.app.inject({ method: "POST", url: `/api/dev/scenario-experiments/${experiment!.id}/snapshots`, headers: manager, payload: { label: action.parameters.snapshotLabel } });
        assert.equal(response.statusCode, 200, response.body);
      } else if (action.actionId === "scenario.fail_next_poll") {
        const runtimeFault = action.parameters.fault === "transport_error" ? "source_error" : action.parameters.fault;
        await acceptance.source.failNextPoll(action.parameters.ruleCode, runtimeFault);
      } else if (action.actionId === "scenario.prepare_population") {
        const selectedKeys = action.keyRefs.map((ref: string) => keys.get(ref));
        assert.ok(selectedKeys.every(Number.isSafeInteger));
        await acceptance.source.preparePopulation!(action.parameters.ruleCode, action.parameters.population, selectedKeys as number[]);
        acceptance.source.replaceTracked!(action.parameters.ruleCode, selectedKeys as number[]);
        trackedByRule.set(action.parameters.ruleCode, new Set(selectedKeys as number[]));
      } else if (action.actionId === "scheduler.await_due") {
        await ensureRunning();
        assert.equal((await acceptance.runtime.status()).automaticScheduling, true, `${testId} requires the automatic scheduler`);
        const codes = action.parameters.ruleCodes ?? [action.parameters.ruleCode];
        const prior = (await server.app.inject({ method: "GET", url: `/api/dev/scenario-experiments/${experiment!.id}`, headers: manager })).json().events
          .filter((event: AnyRecord) => ["poll_completed", "poll_failed"].includes(event.eventType) && codes.includes(event.ruleCode)).length;
        await acceptance.runtime.configure(experiment!.id, 1, 3);
        await acceptance.runtime.pause(experiment!.id, false);
        const required = interruption ? 2 : Number(action.parameters.cycles ?? 1);
        await waitForPollEvents(server, experiment!.id, codes, prior, required);
        await acceptance.runtime.configure(experiment!.id, 60, 3);
        interruption = null;
      } else if (action.actionId === "monitor.close_without_resolution") {
        const open = await server.database.queryOne("SELECT id FROM monitor_incident WHERE lifecycle='open' ORDER BY opened_at DESC,id DESC LIMIT 1");
        assert.ok(open.id, `${testId} has no incident to close`);
        const response: AnyRecord = await server.app.inject({ method: "POST", url: `/api/incidents/${open.id}/close-without-resolution`, headers: manager,
          payload: { reason: action.parameters.reason, comment: `Stage 5 ${testId}` } });
        assert.equal(response.statusCode, 200, response.body);
      } else if (action.actionId === "monitor.inject_interruption") {
        interruption = await acceptance.interruptions.arm(action.parameters.interruptionPoint === "conversation_message" ? "after_alert_message_creation" : action.parameters.interruptionPoint);
      } else if (action.actionId !== "browser.verify_same_runtime") {
        const ruleCode = sourceActionRule(action.actionId);
        assert.ok(ruleCode, `unsupported action ${action.actionId}`);
        const keyRef = action.keyRefs.find((ref: string) => Number.isSafeInteger(keys.get(ref)));
        assert.ok(keyRef, `no source key for ${testId}:${action.sequence}`);
        const payload: AnyRecord = { actionId: action.actionId, key: keys.get(keyRef) };
        if (action.parameters.authority) payload.authority = action.parameters.authority;
        const monitorBefore = await monitorSnapshot(server);
        const eventsBefore = await experimentEvents(server, experiment!.id);
        const response: AnyRecord = await server.app.inject({ method: "POST", url: "/api/dev/source-actions", headers: manager, payload });
        if (action.parameters.expectedStatus) {
          assert.equal(response.statusCode, action.parameters.expectedStatus, response.body);
          assert.equal(response.json().error, action.parameters.expectedError);
          outcome = "rejected"; responseStatus = response.statusCode; responseCode = response.json().error;
        } else {
          assert.equal(response.statusCode, 200, response.body);
          const execution = response.json().execution;
          if (candidateSourceActions.has(action.actionId)) assert.equal(Number(execution.naturalKey.value), keys.get(keyRef), `${testId}:${action.sequence} selected a different source candidate than its fixture`);
          execution.actionSequence = action.sequence; sourceExecutions.push(execution);
          const produced = (contract.source.naturalKeys ?? []).filter((item: AnyRecord) => item.producedByActionSequence === action.sequence);
          for (const item of produced) {
            const primary = item.ruleCode === "A02" ? "flujo_materiales_detalles" : item.ruleCode === "A03" ? "ordenes_trabajo" : "articulo_serial";
            const candidates = execution.sourceDiff.after.filter((record: AnyRecord) => record.table === primary).map((record: AnyRecord) => Number(record.key));
            const created = candidates.find((candidate: number) => candidate !== Number(execution.naturalKey.value) && ![...keys.values()].includes(candidate)) ?? candidates.at(-1);
            assert.ok(Number.isSafeInteger(created), `produced key unavailable ${testId}:${item.ref}`); keys.set(item.ref, created);
          }
          let changedRule = execution.ruleCode === ruleCode && execution.sourceDiff.changes.length > 0;
          for (const code of ["A02", "A03", "A05"] as const) {
            const primary = code === "A02" ? "flujo_materiales_detalles" : code === "A03" ? "ordenes_trabajo" : "articulo_serial";
            const tracked = (execution.sourceDiff.changes as AnyRecord[])
              .filter((change) => change.table === primary).map((change) => Number(change.key)).filter(Number.isSafeInteger);
            if (tracked.length === 0) continue;
            const ruleTracked = trackedByRule.get(code)!;
            for (const key of tracked) ruleTracked.add(key);
            acceptance.source.replaceTracked!(code, [...ruleTracked]);
          }
          assert.equal(changedRule, true, `${testId}:${action.sequence} changed no tracked ${ruleCode} source record`);
        }
        const eventsAfter = await experimentEvents(server, experiment!.id);
        const pollsBefore = eventsBefore.filter((event) => ["poll_completed", "poll_failed"].includes(event.eventType)).length;
        const pollsAfter = eventsAfter.filter((event) => ["poll_completed", "poll_failed"].includes(event.eventType)).length;
        const monitorAfter = await monitorSnapshot(server);
        const statusAfter = await scenarioStatus(server, ruleCode);
        if (outcome === "completed") {
          assert.equal(statusAfter.expectedResult.awaitingPoll, true, `${testId}:${action.sequence} must expose the non-error awaiting-poll state`);
        }
        if (pollsAfter === pollsBefore) assert.deepEqual(monitorAfter, monitorBefore, `${testId}:${action.sequence} changed Monitor before polling`);
        const boundaryPath = laneId === "main" ? `cases/${testId}/source-boundary-${action.sequence}.json` : `cases/${testId}/lanes/${laneId}/source-boundary-${action.sequence}.json`;
        await writeFile(resolve(evidenceRoot, boundaryPath), `${JSON.stringify({
          actionId: action.actionId, outcome, pollsBefore, pollsAfter,
          awaitingPoll: statusAfter.expectedResult.awaitingPoll,
          pendingRecordKeys: statusAfter.records.filter((record: AnyRecord) => record.pendingPoll).map((record: AnyRecord) => record.key),
          monitorBefore, monitorAfter,
        }, null, 2)}\n`);
        sourceBoundaryArtifacts.push(boundaryPath);
        if (outcome === "completed") {
          const checkpoint = `source-boundary-${action.sequence}`;
          const checkpointRuntime = activateBrowserRuntime(checkpoint);
          const checkpointFile = `browser-results-${checkpoint}.json`;
          await writeFile(resolve(caseDir, `${checkpoint}-browser-session.json`), `${JSON.stringify({
            testId, runId, experimentId: experiment!.id, checkpoint, checkpointRuntime,
            expectation: "The Laboratory shows a non-error awaiting-poll state while Monitor-derived information remains at the last completed poll.",
          }, null, 2)}\n`, { flag: "wx" });
          process.stdout.write(`${JSON.stringify({ browserReady: true, testId, checkpoint, experimentId: experiment!.id, outcome: "absence", fileName: checkpointFile, caseDir })}\n`);
          const checkpointResult = await readBrowserResult(caseDir, testId, checkpointFile);
          assertArtifactFiles(checkpointResult.laboratoryArtifacts, `${testId}:${action.sequence} Laboratory boundary`);
          assert.equal(checkpointResult.assertions.awaitingPollIsNonError, true, `${testId}:${action.sequence} awaiting-poll state was not shown as non-error`);
          assert.equal(checkpointResult.assertions.monitorStateHeldUntilPoll, true, `${testId}:${action.sequence} Monitor-derived UI changed before polling`);
          sourceBoundaryBrowserArtifacts.push(...checkpointResult.laboratoryArtifacts);
        }
      }
      const businessTime = (await acceptance.runtime.status()).experiment?.businessTime ?? fixtureRegistry.profiles.isolated_per_test.businessTime;
      actionExecutions.push({ sequence: action.sequence, actionId: action.actionId, businessTime, auditTime, outcome, ...(responseStatus ? { responseStatus, responseCode } : {}) });
    }

    assert.ok(experiment);
    const finalExperiment = experiment as AnyRecord;
    if ((await acceptance.runtime.status()).experiment?.status === "running") await acceptance.runtime.pause(finalExperiment.id, true);
    const runtimeSeed = activateBrowserRuntime("final");
    const monitor = await monitorSnapshot(server);
    const outcome = expectedVisibleOutcome(testId);
    // "absence" is scoped to the case's declared alert outcome. Connected polls
    // may also load preserved baseline incidents, which must remain queryable.
    if (outcome === "presence") assert.ok(monitor.incidentIds.length > 0, `${testId} has no incident history`);
    const urls = { laboratory: `${webOrigin}/dev/scenarios`, dashboard: `${webOrigin}/`, chatList: `${webOrigin}/chats`,
      chatDetails: monitor.conversationIds.map((id: string) => `${webOrigin}/chats/${id}`) };
    await writeFile(resolve(caseDir, "browser-session.json"), `${JSON.stringify({ testId, runId, experimentId: finalExperiment.id, expectation: declaration.expected, outcome, urls,
      objectIds: { incidents: monitor.incidentIds, conversations: monitor.conversationIds, messages: monitor.messageIds } }, null, 2)}\n`, { flag: "wx" });
    process.stdout.write(`${JSON.stringify({ browserReady: true, testId, experimentId: finalExperiment.id, outcome, urls, caseDir })}\n`);
    const browserResult = await readBrowserResult(caseDir, testId);
    assert.equal(browserResult.outcome, outcome);
    assertArtifactFiles(browserResult.laboratoryArtifacts, `${testId} Laboratory`);
    assertArtifactFiles(browserResult.dashboardCardArtifacts, `${testId} Dashboard`);
    assertArtifactFiles(browserResult.chatListArtifacts, `${testId} Chat list`);
    if (outcome !== "absence") assertArtifactFiles(browserResult.chatDetailArtifacts, `${testId} Chat detail`);
    assert.equal(browserResult.assertions.monitorStateHeldUntilPoll, true, `${testId} did not preserve Monitor state before polling`);
    if (testId === "SH-01") {
      assert.equal(browserResult.assertions.currentExperimentHasNoNewActivity, true, "SH-01 current experiment is not empty");
      assert.equal(browserResult.assertions.priorHistoryQueryable, true, "SH-01 prior history is not queryable");
    }
    const browser: BrowserResult = {
      outcome: browserResult.outcome,
      laboratoryArtifacts: [...new Set([...sourceBoundaryBrowserArtifacts, ...browserResult.laboratoryArtifacts])],
      dashboardCardArtifacts: browserResult.dashboardCardArtifacts,
      chatListArtifacts: browserResult.chatListArtifacts,
      chatDetailArtifacts: browserResult.chatDetailArtifacts,
      assertions: browserResult.assertions,
    };

    const allEvents: AnyRecord[] = [];
    for (const experimentId of experimentIds) {
      const historyResponse: AnyRecord = await server.app.inject({ method: "GET", url: `/api/dev/scenario-experiments/${experimentId}`, headers: manager });
      assert.equal(historyResponse.statusCode, 200, historyResponse.body);
      allEvents.push(...historyResponse.json().events as AnyRecord[]);
    }
    await assertDeclaredCaseOutcome(testId, server, monitor, allEvents, experimentIds, trackedByRule, laneId);
    const finalPolls = allEvents.filter((event) => ["poll_completed", "poll_failed"].includes(event.eventType) && event.payload?.cycleId);
    const byRule = new Map<string, AnyRecord[]>();
    for (const event of finalPolls) byRule.set(event.ruleCode, [...(byRule.get(event.ruleCode) ?? []), event]);
    const queryChains = [...byRule].map(([ruleCode, events]) => {
      const query = acceptance.registry.get(ruleCode as any)!.query;
      const last = events.at(-1)!;
      return { ruleCode, queryId: query.queryId, queryVersion: query.queryVersion, sourceRevision: String(last.payload.sourceRevision ?? acceptance.source.pollMetadata!(ruleCode as any).sourceRevision),
        pollCycleIds: events.map((event) => String(event.payload.cycleId)), pages: (last.payload.pageEvidence?.length ? last.payload.pageEvidence : [{ page: 1, rowCount: Number(last.payload.rowCount ?? 0), revision: String(last.payload.sourceRevision) }]),
        completeness: completeness(last.payload.status), freshness: last.payload.status === "stale" ? "stale" : last.payload.status === "unknown_freshness" ? "unknown" : "fresh" };
    });
    const sourceMutations = sourceExecutions.flatMap((execution) => (execution.sourceDiff.changes as AnyRecord[]).map((change) => ({
      actionId: execution.actionId, actionSequence: execution.actionSequence,
      naturalKey: `${execution.naturalKey.field}:${execution.naturalKey.value}`, table: change.table, fields: [change.field],
      before: execution.sourceDiff.before.find((record: AnyRecord) => record.table === change.table && String(record.key) === String(change.key)) ?? null,
      after: execution.sourceDiff.after.find((record: AnyRecord) => record.table === change.table && String(record.key) === String(change.key)) ?? null,
      beforeDigest: sha256(execution.sourceDiff.before.find((record: AnyRecord) => record.table === change.table && String(record.key) === String(change.key)) ?? null),
      afterDigest: sha256(execution.sourceDiff.after.find((record: AnyRecord) => record.table === change.table && String(record.key) === String(change.key)) ?? null),
    })));
    const actions = actionExecutions.map((execution) => ({ sequence: execution.sequence, actionId: execution.actionId,
      actionName: manifest.actionDefinitions[execution.actionId].name, invocationPath: manifest.actionDefinitions[execution.actionId].invocationPath,
      endpoint: manifest.actionDefinitions[execution.actionId].endpoint, writerIdentity: manifest.actionDefinitions[execution.actionId].writerIdentity ?? "not_applicable",
      businessTime: execution.businessTime, auditTime: execution.auditTime }));
    const sourceChain = sourceMutations.length ? { applicability: "required", payload: { database: "test_database", writerIdentity: "alertas_fake", mutations: sourceMutations,
      unrelatedRowsDigestBefore: `sha256:${sourceExecutions[0]!.sourceDiff.unrelatedRows.before.digest}`, unrelatedRowsDigestAfter: `sha256:${sourceExecutions.at(-1)!.sourceDiff.unrelatedRows.after.digest}`,
      sourceRevision: sourceExecutions.at(-1)!.sourceRevision } } : notApplicable("no_source_action");
    const readChain = queryChains.length ? { applicability: "required", payload: { adapterKind: "test_database", sourceAccount: "monitor_source_ro",
      queryId: queryChains.map(({ queryId }) => queryId).join(":"), queryVersion: queryChains.map(({ queryVersion }) => queryVersion).join(":"),
      pages: queryChains.flatMap(({ pages }) => pages), sourceRevision: queryChains.at(-1)!.sourceRevision,
      pollCycleIds: unique(queryChains.flatMap(({ pollCycleIds }) => pollCycleIds)), completeness: queryChains.every(({ completeness }) => completeness === "complete") ? "complete" : queryChains.at(-1)!.completeness,
      freshness: queryChains.every(({ freshness }) => freshness === "fresh") ? "fresh" : queryChains.at(-1)!.freshness } } : notApplicable("no_poll");
    const monitorChain = queryChains.length ? { applicability: "required", payload: { outcome: monitor.incidentIds.length ? "presence" : "absence",
      pollCycleIds: queryChains.flatMap(({ pollCycleIds }) => pollCycleIds), incidentIds: monitor.incidentIds, evidenceIds: monitor.evidenceIds, routingDecisionIds: monitor.routingDecisionIds,
      deliveryIds: monitor.deliveryIds, conversationIds: monitor.conversationIds, messageIds: monitor.messageIds, receiptIds: monitor.receiptIds,
      cursorStart: monitor.cursorStart, cursorEnd: monitor.cursorEnd } } : notApplicable("no_monitor_observation");
    const result: AnyRecord = { schemaVersion: "1.0.0", identity: { testId, group: declaration.group, status: "passed", experimentId: finalExperiment.id, runId,
      manifestVersion: manifest.manifestVersion, sourceActionContractVersion: manifest.sourceActionContractVersion, startedAt, completedAt: new Date().toISOString() },
      expectation: { declared: declaration.expected, observed: JSON.stringify({
        result: `Connected execution matched ${testId}: ${declaration.expected}`,
        laboratoryArtifacts: browser.laboratoryArtifacts,
        sourceBoundaryArtifacts,
        laboratoryAssertions: browser.assertions,
        urls,
      }), matched: true }, laboratoryActions: { applicability: "required", items: actions },
      sourceChain, readChain, monitorChain,
      visibleResult: { applicability: "required", payload: {
        outcome: browser.outcome,
        dashboardCardArtifacts: browser.dashboardCardArtifacts,
        chatListArtifacts: browser.chatListArtifacts,
        chatDetailArtifacts: browser.chatDetailArtifacts,
        connectedIds: [...new Set([...monitor.incidentIds, ...monitor.conversationIds, ...monitor.messageIds])],
      } },
      schedulingRecovery: {
        scheduling: declaration.evidence.scheduling.length && queryChains.length ? { applicability: "required", events: queryChains.flatMap(({ pollCycleIds }) => pollCycleIds).map((cycleId: string) => ({ kind: "scheduler.poll", businessTime: finalExperiment.businessTime, auditTime: new Date().toISOString(), pollCycleId: cycleId })) } : notApplicable("not_required"),
        recovery: declaration.evidence.recovery.length && queryChains.length ? { applicability: "required", interruptionPoint: declaration.evidence.recovery.join(","), repairCycleId: queryChains.flatMap(({ pollCycleIds }) => pollCycleIds).at(-1), idempotencyAssertions: declaration.evidence.recovery } : notApplicable("not_required"),
      },
      cleanup: null, failure: notApplicable("result_passed") };
    return { result, connections, server };
  } catch (error) {
    await server?.close();
    await connections.close();
    throw error;
  }
}

function executionContracts(contract: AnyRecord): { laneId: string; contract: AnyRecord }[] {
  if (!contract.executionLanes?.length) return [{ laneId: "main", contract }];
  return contract.executionLanes.map(({ id: laneId }: AnyRecord) => {
    const naturalKeys = contract.source.naturalKeys.filter((key: AnyRecord) => key.isolationLane === laneId);
    const refs = new Set(naturalKeys.map((key: AnyRecord) => key.ref));
    const allowedMutations = contract.source.allowedMutations.map((mutation: AnyRecord) => ({
      ...mutation, keyRefs: mutation.keyRefs.filter((ref: string) => refs.has(ref)),
    })).filter((mutation: AnyRecord) => mutation.keyRefs.length > 0);
    return { laneId, contract: {
      ...contract,
      executionLanes: undefined,
      source: {
        ...contract.source,
        naturalKeys,
        startingState: contract.source.startingState.filter((assertion: AnyRecord) => refs.has(assertion.keyRef)),
        relationships: (contract.source.relationships ?? []).filter((relationship: AnyRecord) => refs.has(relationship.leftKeyRef) && refs.has(relationship.rightKeyRef)),
        allowedMutations,
      },
      actions: contract.actions.filter((action: AnyRecord) => action.isolationLane === laneId),
    } };
  });
}

function unique(values: string[]): string[] { return [...new Set(values)]; }

function assertArtifactFiles(paths: string[], label: string): void {
  assert.ok(paths.length > 0, `${label} has no artifacts`);
  for (const path of paths) {
    const absolute = resolve(evidenceRoot, path);
    assert.ok(absolute.startsWith(`${evidenceRoot}/`) && existsSync(absolute), `${label} artifact is unavailable:${path}`);
  }
}

function mergeLaneResults(declaration: AnyRecord, laneResults: AnyRecord[]): AnyRecord {
  if (laneResults.length === 1) return laneResults[0];
  const merged = structuredClone(laneResults[0]);
  const requiredOrder = declaration.requiredActionIds;
  merged.identity.experimentId = laneResults[0].identity.experimentId;
  merged.identity.startedAt = laneResults.map((result) => result.identity.startedAt).sort()[0];
  merged.identity.completedAt = laneResults.map((result) => result.identity.completedAt).sort().at(-1);
  merged.expectation.observed = JSON.stringify({
    result: `Connected lane execution matched ${declaration.id}: ${declaration.expected}`,
    experiments: laneResults.map((result) => result.identity.experimentId),
    lanes: laneResults.map((result) => JSON.parse(result.expectation.observed)),
  });
  merged.laboratoryActions.items = laneResults.flatMap((result) => result.laboratoryActions.items)
    .sort((left: AnyRecord, right: AnyRecord) => left.sequence - right.sequence);
  assert.deepEqual(merged.laboratoryActions.items.map((item: AnyRecord) => item.actionId), requiredOrder, `${declaration.id} lane action accounting mismatch`);
  const sourcePayloads = laneResults.filter((result) => result.sourceChain.applicability === "required").map((result) => result.sourceChain.payload);
  merged.sourceChain = sourcePayloads.length ? { applicability: "required", payload: {
    database: "test_database", writerIdentity: "alertas_fake", mutations: sourcePayloads.flatMap((payload) => payload.mutations),
    unrelatedRowsDigestBefore: sourcePayloads[0].unrelatedRowsDigestBefore,
    unrelatedRowsDigestAfter: sourcePayloads.at(-1).unrelatedRowsDigestAfter,
    sourceRevision: sourcePayloads.at(-1).sourceRevision,
  } } : notApplicable("no_source_action");
  const readPayloads = laneResults.filter((result) => result.readChain.applicability === "required").map((result) => result.readChain.payload);
  merged.readChain = readPayloads.length ? { applicability: "required", payload: {
    adapterKind: "test_database", sourceAccount: "monitor_source_ro",
    queryId: readPayloads.map((payload) => payload.queryId).join(":"), queryVersion: readPayloads.map((payload) => payload.queryVersion).join(":"),
    pages: readPayloads.flatMap((payload) => payload.pages), sourceRevision: readPayloads.at(-1).sourceRevision,
    pollCycleIds: unique(readPayloads.flatMap((payload) => payload.pollCycleIds)),
    completeness: readPayloads.every((payload) => payload.completeness === "complete") ? "complete" : readPayloads.find((payload) => payload.completeness !== "complete").completeness,
    freshness: readPayloads.every((payload) => payload.freshness === "fresh") ? "fresh" : readPayloads.find((payload) => payload.freshness !== "fresh").freshness,
  } } : notApplicable("no_poll");
  const monitorPayloads = laneResults.filter((result) => result.monitorChain.applicability === "required").map((result) => result.monitorChain.payload);
  merged.monitorChain = monitorPayloads.length ? { applicability: "required", payload: {
    outcome: monitorPayloads.some((payload) => payload.incidentIds.length) ? "presence" : "absence",
    pollCycleIds: unique(monitorPayloads.flatMap((payload) => payload.pollCycleIds)),
    incidentIds: unique(monitorPayloads.flatMap((payload) => payload.incidentIds)), evidenceIds: unique(monitorPayloads.flatMap((payload) => payload.evidenceIds)),
    routingDecisionIds: unique(monitorPayloads.flatMap((payload) => payload.routingDecisionIds)), deliveryIds: unique(monitorPayloads.flatMap((payload) => payload.deliveryIds)),
    conversationIds: unique(monitorPayloads.flatMap((payload) => payload.conversationIds)), messageIds: unique(monitorPayloads.flatMap((payload) => payload.messageIds)),
    receiptIds: unique(monitorPayloads.flatMap((payload) => payload.receiptIds)), cursorStart: 0,
    cursorEnd: Math.max(...monitorPayloads.map((payload) => payload.cursorEnd)),
  } } : notApplicable("no_monitor_observation");
  merged.visibleResult.payload = {
    outcome: laneResults[0].visibleResult.payload.outcome,
    dashboardCardArtifacts: unique(laneResults.flatMap((result) => result.visibleResult.payload.dashboardCardArtifacts)),
    chatListArtifacts: unique(laneResults.flatMap((result) => result.visibleResult.payload.chatListArtifacts)),
    chatDetailArtifacts: unique(laneResults.flatMap((result) => result.visibleResult.payload.chatDetailArtifacts)),
    connectedIds: unique(laneResults.flatMap((result) => result.visibleResult.payload.connectedIds)),
  };
  const scheduling = laneResults.filter((result) => result.schedulingRecovery.scheduling.applicability === "required");
  merged.schedulingRecovery.scheduling = scheduling.length ? { applicability: "required", events: scheduling.flatMap((result) => result.schedulingRecovery.scheduling.events) } : notApplicable("not_required");
  return merged;
}

await mkdir(resolve(evidenceRoot, ".."), { recursive: true });
await mkdir(evidenceRoot, { recursive: false });
await resetSource("reset-before-run");
const baselineConnections = await TestDatabaseConnections.create(root);
const baselineDigest = await sourceDigest(baselineConnections);
const fixtureBaseline = await captureFixtureBaseline(baselineConnections);
await baselineConnections.close();
const apiPort = await availablePort();
const webPort = await availablePort();
const webOrigin = `http://127.0.0.1:${webPort}`;
const web = await createViteServer({ root: resolve(root, "apps/web"), configFile: resolve(root, "apps/web/vite.config.ts"), logLevel: "error",
  server: { host: "127.0.0.1", port: webPort, strictPort: true, proxy: { "/api": { target: `http://127.0.0.1:${apiPort}`, changeOrigin: false }, "/socket.io": { target: `http://127.0.0.1:${apiPort}`, ws: true, changeOrigin: false } } } });
await web.listen();
const results: AnyRecord[] = [];
let finalResetStarted = false;
const restoreRunSource = async (label: string) => {
  finalResetStarted = true;
  await resetSource(label);
  const restoredConnections = await TestDatabaseConnections.create(root);
  try {
    const afterDigest = await sourceDigest(restoredConnections);
    assert.equal(afterDigest, baselineDigest, "Step 8C final source baseline was not restored");
    return afterDigest;
  } finally {
    await restoredConnections.close();
  }
};
try {
  const selected = selectedCaseIds.size ? manifest.tests.filter(({ id }: AnyRecord) => selectedCaseIds.has(id)) : manifest.tests;
  assert.ok(selected.length, "no selected Step 8C cases");
  assert.equal(selected.length, selectedCaseIds.size || manifest.tests.length, "unknown or duplicate selected Step 8C case");
  for (const declaration of selected) {
    const baseContract = fixtureRegistry.contracts.find((candidate: AnyRecord) => candidate.testId === declaration.id);
    assert.ok(baseContract, `missing fixture contract ${declaration.id}`);
    const lanes = executionContracts(baseContract);
    const laneResults: AnyRecord[] = [];
    for (const lane of lanes) {
      const execution = await executeCase(declaration, apiPort, webOrigin, fixtureBaseline, lane.contract, lane.laneId);
      await execution.server.close();
      await execution.connections.close();
      laneResults.push(execution.result);
    }
    const result = mergeLaneResults(declaration, laneResults);
    results.push(result);
    process.stdout.write(`${JSON.stringify({ caseComplete: declaration.id, passed: true, completed: results.length, required: selected.length })}\n`);
  }
  const afterDigest = await restoreRunSource("reset-after-run");
  for (const result of results) {
    const artifactPath = `cases/${result.identity.testId}/cleanup.json`;
    const cleanup = { fixtureContractVersion: fixtureRegistry.fixtureVersion, resetContractVersion: "physical-reset-v1-run-boundary",
      executedInFinally: true, sourceRestored: true, beforeDigest: baselineDigest, afterDigest, artifactPath };
    await writeFile(resolve(evidenceRoot, artifactPath), `${JSON.stringify(cleanup, null, 2)}\n`);
    result.cleanup = cleanup;
  }
  if (!selectedCaseIds.size) {
    const ledger = { ledgerVersion: "1.0.0", classification: "connected_acceptance", runId, manifestVersion: manifest.manifestVersion, results };
    await assertValidStage5Ledger(ledger, { schema: ledgerSchema, manifest, artifactRoot: evidenceRoot });
    const rendered = await renderStage5Ledger(ledger, { schema: ledgerSchema, manifest, artifactRoot: evidenceRoot });
    await writeFile(resolve(evidenceRoot, "ledger.json"), rendered.json, { flag: "wx" });
    await writeFile(resolve(evidenceRoot, "ledger.md"), rendered.markdown, { flag: "wx" });
    process.stdout.write(`${JSON.stringify({ step8cComplete: true, runId, evidenceRoot, passes: results.length, failures: 0, skips: 0, extras: 0, excluded: 0 })}\n`);
  }
} catch (error) {
  if (!finalResetStarted) {
    try {
      await restoreRunSource("reset-after-failure-run");
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "Step 8C execution and final source restoration both failed");
    }
  }
  throw error;
} finally {
  await web.close();
}
