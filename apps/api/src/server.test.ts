import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, it } from "node:test";
import { io as connectSocket } from "socket.io-client";
import { loadConfig } from "./config.js";
import { buildMonitorServer, type MonitorServer } from "./server.js";

const servers: MonitorServer[] = [];

async function server() {
  const instance = await buildMonitorServer({
    config: {
      nodeEnv: "test",
      cookieSecret: "phase-2-test-secret-with-enough-entropy",
      allowMockAuth: true,
      databaseMode: "pglite",
      pgliteDataDir: "memory://",
    },
  });
  servers.push(instance);
  return instance;
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((instance) => instance.close()));
});

describe("Phase 2 platform foundation", () => {
  it("reports live and ready only after the database migration", async () => {
    const instance = await server();
    assert.deepEqual((await instance.app.inject("/health/live")).json(), { status: "ok" });
    assert.deepEqual((await instance.app.inject("/health/ready")).json(), {
      status: "ready",
      database: "pglite",
      websocketAdapter: "memory",
    });
    const table = await instance.database.queryOne(
      "SELECT table_name FROM information_schema.tables WHERE table_name = 'monitor_change_event'",
    );
    assert.equal(table.table_name, "monitor_change_event");
  });

  it("rejects unauthenticated requests", async () => {
    const instance = await server();
    assert.equal((await instance.app.inject("/api/session")).statusCode, 401);
  });

  it("refuses to enable mock authentication in production", () => {
    assert.throws(() => loadConfig({
      nodeEnv: "production",
      cookieSecret: "a-production-secret-with-enough-entropy",
      allowMockAuth: true,
    }), /Mock authentication cannot be enabled in production/);
  });

  it("calculates scopes on the server and ignores client-supplied scope escalation", async () => {
    const instance = await server();
    const login = await instance.app.inject({
      method: "POST",
      url: "/api/auth/mock-login",
      payload: { identityId: "machine-operator" },
    });
    assert.equal(login.statusCode, 200);
    assert.deepEqual(login.json().principal.scopes, ["monitor:read", "chat:write"]);

    const forged = await instance.app.inject({
      method: "POST",
      url: "/api/auth/mock-login",
      payload: { identityId: "machine-operator", scopes: ["monitor:admin"] },
    });
    assert.equal(forged.statusCode, 200);
    assert.deepEqual(forged.json().principal.scopes, ["monitor:read", "chat:write"]);
  });

  it("enforces server-side administrative authorization", async () => {
    const instance = await server();
    const operator = await instance.app.inject({
      method: "GET",
      url: "/api/admin/authorization-check",
      headers: { authorization: "Bearer mock:machine-operator" },
    });
    const manager = await instance.app.inject({
      method: "GET",
      url: "/api/admin/authorization-check",
      headers: { authorization: "Bearer mock:plant-manager" },
    });
    assert.equal(operator.statusCode, 403);
    assert.equal(manager.statusCode, 200);
  });

  it("accepts a replacement identity adapter without exposing mock login", async () => {
    const instance = await buildMonitorServer({
      config: {
        nodeEnv: "test",
        cookieSecret: "phase-2-test-secret-with-enough-entropy",
        allowMockAuth: false,
        databaseMode: "pglite",
        pgliteDataDir: "memory://",
      },
      identityAdapter: {
        kind: "emusionsoft",
        async verifyToken(token) {
          return token === "future-auth-token" ? {
            sysUserId: 7001,
            displayName: "Future authenticated user",
            role: "FACTORY_MANAGER",
            plantIds: [1],
            scopes: ["monitor:read", "monitor:admin"],
          } : null;
        },
      },
    });
    servers.push(instance);
    assert.equal((await instance.app.inject("/api/auth/mock-identities")).statusCode, 404);
    const session = await instance.app.inject({
      method: "GET",
      url: "/api/session",
      headers: { authorization: "Bearer future-auth-token" },
    });
    assert.equal(session.statusCode, 200);
    assert.equal(session.json().principal.sysUserId, 7001);
  });

  it("opens an authenticated cursor-based WebSocket session and resumes its cursor", async () => {
    const instance = await server();
    await instance.app.listen({ host: "127.0.0.1", port: 0 });
    const address = instance.app.server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind to TCP");

    const socket = connectSocket(`http://127.0.0.1:${address.port}`, {
      auth: { token: "mock:shift-supervisor" },
      transports: ["websocket"],
    });
    const first = await new Promise<Record<string, unknown>>((resolveReady, reject) => {
      socket.once("session.ready", resolveReady);
      socket.once("connect_error", reject);
    });
    assert.equal(first.cursor, 0);
    assert.equal((first.principal as { sysUserId: number }).sysUserId, 9002);

    const resumed = new Promise<Record<string, unknown>>((resolveReady) => socket.once("session.ready", resolveReady));
    socket.emit("sync.resume", { cursor: 42 });
    const resumedSession = await resumed;
    assert.equal(resumedSession.cursor, 42);
    assert.equal((resumedSession.principal as { sysUserId: number }).sysUserId, 9002);
    socket.disconnect();
  });

  it("reports healthy local source diagnostics without claiming production connectivity", async () => {
    const instance = await server();
    const response = await instance.app.inject({
      method: "GET",
      url: "/api/diagnostics/source",
      headers: { authorization: "Bearer mock:plant-manager" },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().productionConnected, false);
    assert.equal(response.json().sources.length, 21);
    assert.equal(response.json().sources.filter((source: { status: string }) => source.status === "healthy").length, 21);
  });

  it("serves the seeded Phase 4 incident dashboard and evidence detail", async () => {
    const instance = await server();
    const list = await instance.app.inject({ method: "GET", url: "/api/incidents", headers: { authorization: "Bearer mock:plant-manager" } });
    assert.equal(list.statusCode, 200);
    assert.equal(list.json().incidents.length, 5);
    assert.equal(list.json().incidents.filter((incident: { lifecycle: string }) => incident.lifecycle === "open").length, 3);
    const detail = await instance.app.inject({ method: "GET", url: `/api/incidents/${list.json().incidents[0].id}`, headers: { authorization: "Bearer mock:plant-manager" } });
    assert.equal(detail.statusCode, 200);
    assert.ok(detail.json().evidence.length >= 1);
    assert.ok(detail.json().transitions.length >= 1);
    const detectorEvidence = await instance.database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_incident_evidence WHERE cycle_id IS NOT NULL");
    assert.equal(detectorEvidence.count, 0, "unchanged detector polls must not create duplicate evidence");
  });

  it("recovers committed incident events by cursor and protects the API", async () => {
    const instance = await server();
    assert.equal((await instance.app.inject("/api/incidents")).statusCode, 401);
    const changes = await instance.app.inject({ method: "GET", url: "/api/changes?after=0", headers: { authorization: "Bearer mock:shift-supervisor" } });
    assert.equal(changes.statusCode, 200);
    assert.ok(changes.json().changes.length >= 7);
    const cursors = changes.json().changes.map((change: { cursor: number }) => change.cursor);
    assert.deepEqual(cursors, [...cursors].sort((a, b) => a - b));
  });
});

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.filter((entry) => !["node_modules", "dist"].includes(entry.name)).map(async (entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : [path];
  }))).flat();
}

it("contains no EmusaSoft database driver, credential, or write integration", async () => {
  const root = resolve(import.meta.dirname, "../../..");
  const applicationTree = [...await sourceFiles(resolve(root, "apps")), ...await sourceFiles(resolve(root, "packages"))];
  const packageFiles = [resolve(root, "package.json"), ...applicationTree.filter((path) => path.endsWith("package.json"))];
  const packages = (await Promise.all(packageFiles.map((path) => readFile(path, "utf8")))).join("\n");
  assert.doesNotMatch(packages, /mysql2|@prisma\/client/);

  const applicationFiles = applicationTree.filter((path) => /\.(ts|tsx)$/.test(path) && !path.endsWith(".test.ts"));
  const source = (await Promise.all(applicationFiles.map((path) => readFile(path, "utf8")))).join("\n");
  assert.doesNotMatch(source, /MONITOR_EMUSASOFT_WRITE|\/api\/emusa(?:soft)?\/(?:create|update|delete)/i);
});
