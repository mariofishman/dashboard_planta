import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { createDatabaseRuntime, migrateFoundation, type DatabaseRuntime } from "@monitor/database";
import { DetectionRepository, DetectionRunner, DetectionScheduler, FixedBackupFreshnessProvider, loadFixtureRegistry } from "@monitor/detection";
import { IncidentService, type IncidentChange, type RuleContract } from "@monitor/incidents";
import Fastify from "fastify";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Server as SocketIOServer } from "socket.io";
import { authenticationPlugin } from "./auth/authentication.js";
import type { IdentityAdapter } from "./auth/identity-adapter.js";
import { MockIdentityAdapter } from "./auth/mock-identity-adapter.js";
import { loadConfig, type MonitorConfig } from "./config.js";
import { createMetrics, prometheusMetrics, registerObservability } from "./observability.js";
import { attachRedis, type RedisRuntime } from "./redis.js";
import { authRoutes } from "./routes/auth.js";

function cookieValue(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const entry of header.split(";")) {
    const [key, ...value] = entry.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

export interface MonitorServer {
  app: ReturnType<typeof Fastify>;
  io: SocketIOServer;
  database: DatabaseRuntime;
  redis: RedisRuntime;
  config: MonitorConfig;
  close(): Promise<void>;
}

async function seedPhase4Incidents(service: IncidentService, repositoryRoot: string, database: DatabaseRuntime) {
  const existing = await database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_incident");
  const databaseWasEmpty = Number(existing.count) === 0;
  const document = JSON.parse(await readFile(resolve(repositoryRoot, "config/alerts/alert-rules.v1.json"), "utf8")) as { rules: RuleContract[] };
  const rules = new Map(document.rules.filter((rule) => ["A02", "A03", "A05"].includes(rule.code)).map((rule) => [rule.code, rule]));
  const apply = async (code: "A02" | "A03" | "A05", evidence: Record<string, unknown>, context: Parameters<IncidentService["apply"]>[0]["context"], minutesAgo: number) => {
    const rule = rules.get(code);
    if (!rule) throw new Error(`missing_phase4_rule_${code}`);
    return service.apply({ rule, evidence, context, observedAt: databaseWasEmpty ? new Date(Date.now() - minutesAgo * 60_000) : new Date() });
  };
  await apply("A05", { articleSerialId: 205, declaredAgeMinutes: 134, weighed: false, sourceWorkOrderFinished: true, movedFromMachine: false },
    { plantId: 1, workOrderId: "1510873", workOrderCode: "151087.3", machineCode: "P15", operationName: "Impresión", shiftName: "Día", responsibleName: "Equipo de procesos" }, 134);
  await apply("A02", { materialFlowDetailId: 202, isWorkOrderReservation: true, state: "TRANSITO", receivedAt: null, elapsedMinutes: 38 },
    { plantId: 1, workOrderId: "1510873", workOrderCode: "151087.3", machineCode: "P15", operationName: "Impresión", shiftName: "Día", responsibleName: "Almacén de materia prima" }, 38);
  await apply("A03", { workOrderId: 103, active: true, elapsedMinutes: 79, consumptionCount: 0, strongerA07: false },
    { plantId: 1, workOrderId: "1510561", workOrderCode: "151056.1", machineCode: "P12", operationName: "Impresión", shiftName: "Día", responsibleName: "Operación de máquina" }, 79);
  if (!databaseWasEmpty) return;
  await apply("A03", { workOrderId: 1510211, active: true, elapsedMinutes: 16, consumptionCount: 0, strongerA07: false },
    { plantId: 1, workOrderId: "1510211", workOrderCode: "151021.1", machineCode: "CT04", operationName: "Corte", shiftName: "Tarde", responsibleName: "Operación de máquina" }, 1620);
  await apply("A03", { workOrderId: 1510211, active: true, elapsedMinutes: 27, consumptionCount: 1, strongerA07: false },
    { plantId: 1, workOrderId: "1510211", workOrderCode: "151021.1", machineCode: "CT04", operationName: "Corte", shiftName: "Tarde", responsibleName: "Operación de máquina" }, 1609);
  await apply("A02", { materialFlowDetailId: 688, isWorkOrderReservation: true, state: "TRANSITO", receivedAt: null, elapsedMinutes: 41 },
    { plantId: 1, workOrderId: "1510392", workOrderCode: "151039.2", machineCode: "CT04", operationName: "Corte", shiftName: "Día", responsibleName: "Almacén de materia prima" }, 3100);
  await apply("A02", { materialFlowDetailId: 688, isWorkOrderReservation: true, state: "RECIBIDO", receivedAt: "2026-07-19T10:20:00Z", elapsedMinutes: 20 },
    { plantId: 1, workOrderId: "1510392", workOrderCode: "151039.2", machineCode: "CT04", operationName: "Corte", shiftName: "Día", responsibleName: "Almacén de materia prima" }, 3080);
}

export async function buildMonitorServer(options: {
  config?: Partial<MonitorConfig>;
  identityAdapter?: IdentityAdapter;
  database?: DatabaseRuntime;
} = {}): Promise<MonitorServer> {
  const config = loadConfig(options.config);
  const app = Fastify({
    logger: config.nodeEnv === "test" ? false : {
      level: "info",
      redact: ["req.headers.authorization", "req.headers.cookie", "res.headers.set-cookie", "token", "password", "MONITOR_COOKIE_SECRET", "EMUSASOFT_MCP_TOKEN"],
    },
  });
  const metrics = createMetrics();
  registerObservability(app, metrics);
  await app.register(cors, { origin: config.webOrigin, credentials: true });
  await app.register(cookie, { secret: config.cookieSecret, hook: "onRequest" });

  const identityAdapter = options.identityAdapter ?? new MockIdentityAdapter();
  await app.register(authenticationPlugin, { identityAdapter });
  await app.register(authRoutes, { config, identityAdapter });

  const database = options.database ?? await createDatabaseRuntime({
    mode: config.databaseMode,
    pgliteDataDir: config.nodeEnv === "test" ? "memory://" : config.pgliteDataDir,
    ...(config.databaseUrl ? { databaseUrl: config.databaseUrl } : {}),
  });
  await migrateFoundation(database);
  const repositoryRoot = resolve(import.meta.dirname, "../../..");
  const io = new SocketIOServer(app.server, { cors: { origin: config.webOrigin, credentials: true } });
  const incidentService = new IncidentService(database, (change: IncidentChange) => io.to(`plant:${change.plantId}`).emit("incident.changed", change));
  await seedPhase4Incidents(incidentService, repositoryRoot, database);
  const ruleDocument = JSON.parse(await readFile(resolve(repositoryRoot, "config/alerts/alert-rules.v1.json"), "utf8")) as { rules: RuleContract[] };
  const incidentRules = new Map<string, RuleContract>(ruleDocument.rules.filter((rule) => ["A02", "A03", "A05"].includes(rule.code)).map((rule) => [rule.code, rule]));
  const detectionRepository = new DetectionRepository(database);
  const detectionRunner = new DetectionRunner(detectionRepository, new FixedBackupFreshnessProvider("phase1-fixtures.v1"), undefined, async ({ cycleId, query, rows, observedAt }) => {
    const rule = incidentRules.get(query.ruleCode);
    if (!rule) return;
    await incidentService.reconcileHealthyCycle({ rule, rows, cycleId, observedAt, contextFor: () => ({ plantId: 1 }) });
  });
  const detectionScheduler = new DetectionScheduler(detectionRunner, 2);
  const localDetectionSources = await loadFixtureRegistry(
    resolve(repositoryRoot, "config/alerts/alert-rules.v1.json"),
    resolve(repositoryRoot, "tests/fixtures/alerts/rule-cases.v1.json"),
  );
  await Promise.all(localDetectionSources.map(({ query, adapter }) => detectionScheduler.runRecovery(query, adapter)));
  localDetectionSources.forEach(({ query, adapter }) => detectionScheduler.schedule(query, adapter));

  io.use(async (socket, next) => {
    const signedCookie = cookieValue(socket.handshake.headers.cookie, "monitor_session");
    const unsigned = signedCookie ? app.unsignCookie(signedCookie) : null;
    const explicitMockToken = config.allowMockAuth && typeof socket.handshake.auth.token === "string"
      ? socket.handshake.auth.token
      : null;
    const token = unsigned?.valid ? unsigned.value : explicitMockToken;
    const principal = token ? await identityAdapter.verifyToken(token) : null;
    if (!principal) return next(new Error("authentication_required"));
    socket.data.principal = principal;
    return next();
  });
  io.on("connection", (socket) => {
    metrics.websocketConnections += 1;
    const principal = socket.data.principal as { plantIds: number[] };
    principal.plantIds.forEach((plantId) => void socket.join(`plant:${plantId}`));
    socket.emit("session.ready", { cursor: 0, principal: socket.data.principal, features: config.features });
    socket.on("sync.resume", async (message: { cursor?: unknown }) => {
      const cursor = Number.isSafeInteger(message?.cursor) && Number(message.cursor) >= 0 ? Number(message.cursor) : 0;
      const changes = await incidentService.changesAfter(cursor, principal.plantIds);
      changes.forEach((change) => socket.emit("incident.changed", change));
      const latest = changes.length ? Number(changes.at(-1)?.cursor) : cursor;
      socket.emit("session.ready", { cursor: latest, principal: socket.data.principal, features: config.features });
    });
    socket.on("disconnect", () => { metrics.websocketConnections -= 1; });
  });
  const redis = await attachRedis(io, config.redisUrl, app.log);

  app.get("/health/live", async () => ({ status: "ok" }));
  app.get("/health/ready", async (_request, reply) => {
    try {
      await database.queryOne("SELECT 1 AS ready");
      if (!(await redis.ready())) throw new Error("redis_not_ready");
      return { status: "ready", database: database.mode, websocketAdapter: redis.mode };
    } catch {
      return reply.code(503).send({ status: "not_ready" });
    }
  });
  app.get("/metrics", async (_request, reply) => reply.type("text/plain; version=0.0.4").send(prometheusMetrics(metrics)));
  app.get("/api/features", { preHandler: app.requireScopes(["monitor:read"]) }, async () => config.features);
  app.get("/api/diagnostics/source", { preHandler: app.requireScopes(["monitor:read"]) }, async () => ({
    environment: "local-fixtures",
    productionConnected: false,
    sources: await detectionRepository.diagnostics(),
  }));
  app.get("/api/incidents", { preHandler: app.requireScopes(["monitor:read"]) }, async (request) => {
    const query = request.query as { status?: string; operation?: string; search?: string };
    return { incidents: await incidentService.list({ plantIds: request.principal!.plantIds, ...query }) };
  });
  app.get("/api/incidents/:id", { preHandler: app.requireScopes(["monitor:read"]) }, async (request, reply) => {
    const incident = await incidentService.detail((request.params as { id: string }).id, request.principal!.plantIds);
    return incident ?? reply.code(404).send({ error: "incident_not_found" });
  });
  app.get("/api/changes", { preHandler: app.requireScopes(["monitor:read"]) }, async (request) => {
    const cursor = Math.max(0, Number((request.query as { after?: string }).after ?? 0) || 0);
    return { changes: await incidentService.changesAfter(cursor, request.principal!.plantIds) };
  });
  app.get("/api/admin/authorization-check", { preHandler: app.requireScopes(["monitor:admin"]) }, async () => ({ authorized: true }));

  const close = async () => {
    detectionScheduler.stop();
    await redis.close();
    io.close();
    await app.close();
    await database.close();
  };
  return { app, io, database, redis, config, close };
}
