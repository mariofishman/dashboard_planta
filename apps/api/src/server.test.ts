import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { afterEach, describe, it } from "node:test";
import { io as connectSocket } from "socket.io-client";
import { createDatabaseRuntime } from "@monitor/database";
import { loadConfig } from "./config.js";
import { canManageResponsibilities, canManageRotation } from "./auth/authentication.js";
import { buildMonitorServer, type MonitorServer } from "./server.js";

const servers: MonitorServer[] = [];

async function server() {
  const instance = await buildMonitorServer({
    config: {
      nodeEnv: "test",
      cookieSecret: "phase-2-test-secret-with-enough-entropy",
      allowMockAuth: true,
      enableScenarioLab: false,
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
    const rosterPermissionTable = await instance.database.queryOne(
      "SELECT table_name FROM information_schema.tables WHERE table_name = 'monitor_identity_operation_permission'",
    );
    assert.equal(rosterPermissionTable.table_name, "monitor_identity_operation_permission");
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

  it("limits roster administration to Monitor admins and rotation writes to authorized operations", async () => {
    const instance = await server();
    const identities = await instance.app.inject("/api/auth/mock-identities");
    const principals = new Map(identities.json().map((entry: { identityId: string; principal: unknown }) => [entry.identityId, entry.principal]));
    const monitorAdmin = principals.get("monitor-admin") as Parameters<typeof canManageResponsibilities>[0];
    const admin = principals.get("plant-manager") as Parameters<typeof canManageResponsibilities>[0];
    const scheduler = principals.get("operation-scheduler") as Parameters<typeof canManageResponsibilities>[0];

    assert.equal(canManageResponsibilities(monitorAdmin), true);
    assert.equal(canManageResponsibilities(admin), true);
    assert.equal(canManageResponsibilities(scheduler), false);
    assert.equal(canManageRotation(admin, 999), true);
    assert.equal(canManageRotation(scheduler, 10), true);
    assert.equal(canManageRotation(scheduler, 20), false);
  });

  it("persists roster imports and edits transactionally with revision and audit protection", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "monitor-roster-test-"));
    const build = async () => buildMonitorServer({
      config: {
        nodeEnv: "test",
        cookieSecret: "phase-5-test-secret-with-enough-entropy",
        allowMockAuth: true,
        enableScenarioLab: false,
        databaseMode: "pglite",
        pgliteDataDir: dataDir,
      },
      database: await createDatabaseRuntime({ mode: "pglite", pgliteDataDir: dataDir }),
    });
    const headers = { authorization: "Bearer mock:plant-manager" };
    const assignment = {
      id: "excel-194",
      person: "Juliana Salazar",
      position: "Operador de máquina",
      operations: ["Triturado"],
      warehouseType: null,
      scope: "machine_group",
      group: "Equipo nocturno",
      validFrom: "2026-07-26",
      validTo: null,
      state: "active",
      setupComplete: true,
    };

    let first: MonitorServer | undefined;
    let second: MonitorServer | undefined;
    try {
      first = await build();
      assert.equal((await first.app.inject("/api/roster/assignments")).statusCode, 401);
      assert.equal((await first.app.inject({ method: "GET", url: "/api/roster/assignments", headers: { authorization: "Bearer mock:machine-operator" } })).statusCode, 403);
      const empty = await first.app.inject({ method: "GET", url: "/api/roster/assignments", headers });
      assert.deepEqual(empty.json(), { revision: 0, assignments: [] });

      const saved = await first.app.inject({ method: "PUT", url: "/api/roster/assignments", headers, payload: { revision: 0, assignments: [assignment] } });
      assert.equal(saved.statusCode, 200, saved.body);
      assert.equal(saved.json().revision, 1);
      assert.deepEqual(saved.json().assignments, [assignment]);
      assert.equal(Number((await first.database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_roster_assignment_audit")).count), 1);

      const conflict = await first.app.inject({ method: "PUT", url: "/api/roster/assignments", headers, payload: { revision: 0, assignments: [] } });
      assert.equal(conflict.statusCode, 409);
      assert.deepEqual(conflict.json(), { error: "roster_revision_conflict", revision: 1 });

      const invalid = await first.app.inject({
        method: "PUT",
        url: "/api/roster/assignments",
        headers,
        payload: { revision: 1, assignments: [{ ...assignment, operations: [], setupComplete: true }] },
      });
      assert.equal(invalid.statusCode, 400);
      assert.equal((await first.app.inject({ method: "GET", url: "/api/roster/assignments", headers })).json().assignments.length, 1);

      await first.close();
      first = undefined;
      second = await build();
      const afterRestart = await second.app.inject({ method: "GET", url: "/api/roster/assignments", headers });
      assert.equal(afterRestart.statusCode, 200);
      assert.deepEqual(afterRestart.json(), { revision: 1, assignments: [assignment] });
    } finally {
      await first?.close();
      await second?.close();
      await rm(dataDir, { recursive: true, force: true });
    }
  });

  it("allows confirmed distinct names with different accents but rejects exact duplicate names", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "monitor-roster-name-test-"));
    const instance = await buildMonitorServer({
      config: {
        nodeEnv: "test",
        cookieSecret: "phase-5-test-secret-with-enough-entropy",
        allowMockAuth: true,
        enableScenarioLab: false,
        databaseMode: "pglite",
        pgliteDataDir: dataDir,
      },
      database: await createDatabaseRuntime({ mode: "pglite", pgliteDataDir: dataDir }),
    });
    const headers = { authorization: "Bearer mock:plant-manager" };
    const assignment = (id: string, person: string) => ({
      id,
      person,
      position: "Operador de máquina",
      operations: ["Impresión"],
      warehouseType: null,
      scope: "machine_group",
      group: "A",
      validFrom: "2026-07-26",
      validTo: null,
      state: "active",
      setupComplete: true,
    });

    try {
      const distinct = await instance.app.inject({
        method: "PUT",
        url: "/api/roster/assignments",
        headers,
        payload: { revision: 0, assignments: [assignment("ana-accented", "Ana Díaz"), assignment("ana-unaccented", "Ana Dias")] },
      });
      assert.equal(distinct.statusCode, 200);

      const duplicate = await instance.app.inject({
        method: "PUT",
        url: "/api/roster/assignments",
        headers,
        payload: {
          revision: 1,
          assignments: [
            assignment("ana-accented", "Ana Díaz"),
            assignment("ana-unaccented", "Ana Dias"),
            assignment("ana-duplicate", "  ANA   DÍAZ  "),
          ],
        },
      });
      assert.equal(duplicate.statusCode, 400);
      assert.ok(duplicate.json().details.some((detail: string) => /repetida/.test(detail)));
    } finally {
      await instance.close();
      await rm(dataDir, { recursive: true, force: true });
    }
  });

  it("accepts a replacement identity adapter without exposing mock login", async () => {
    const instance = await buildMonitorServer({
      config: {
        nodeEnv: "test",
        cookieSecret: "phase-2-test-secret-with-enough-entropy",
        allowMockAuth: false,
        enableScenarioLab: false,
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
            operationAuthorizations: [],
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

  it("scopes conversation change recovery to participants and plant administrators", async () => {
    const instance = await server();
    const conversationId = "00000000-0000-4000-8000-000000000060";
    const messageId = "00000000-0000-4000-8000-000000000061";
    await instance.database.execute(`INSERT INTO monitor_conversation (id,plant_id,title,participant_fingerprint)
      VALUES ($1,1,'Operación','participant-9003')`, [conversationId]);
    await instance.database.execute(`INSERT INTO monitor_conversation_participant
      (conversation_id,sys_user_id,display_name,source_key) VALUES ($1,9003,'Operación de máquina','mock:machine-operator')`, [conversationId]);
    const message = await instance.database.queryOne(`INSERT INTO monitor_message
      (id,conversation_id,sender_name,kind,body,payload,client_command_id)
      VALUES ($1,$2,'Monitor','alert','','{}'::jsonb,'scope-test') RETURNING cursor`, [messageId, conversationId]);
    await instance.database.execute(`INSERT INTO monitor_change_event (event_type,scope_type,scope_id,payload)
      VALUES ('message.created','conversation',$1,$2::jsonb)`, [conversationId, JSON.stringify({ conversationId, messageId, messageCursor: Number(message.cursor) })]);
    const recover = async (identity: string) => (await instance.app.inject({
      method: "GET", url: "/api/changes?after=0", headers: { authorization: `Bearer mock:${identity}` },
    })).json().changes.filter((change: { eventType: string }) => change.eventType === "message.created");
    assert.equal((await recover("machine-operator")).some((change: { payload: { messageId: string } }) => change.payload.messageId === messageId), true);
    assert.equal((await recover("shift-supervisor")).some((change: { payload: { messageId: string } }) => change.payload.messageId === messageId), false);
    assert.equal((await recover("plant-manager")).some((change: { payload: { messageId: string } }) => change.payload.messageId === messageId), true);
  });
});

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.filter((entry) => !["node_modules", "dist"].includes(entry.name)).map(async (entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : [path];
  }))).flat();
}

it("keeps the EmusaSoft driver isolated to detection and contains no credential or write integration", async () => {
  const root = resolve(import.meta.dirname, "../../..");
  const appsTree = await sourceFiles(resolve(root, "apps"));
  const packagesTree = await sourceFiles(resolve(root, "packages"));
  const detectionRoot = `${resolve(root, "packages/detection")}${sep}`;
  const nonDetectionFiles = [...appsTree, ...packagesTree.filter((path) => !path.startsWith(detectionRoot))]
    .filter((path) => path.endsWith("package.json") || (/\.(ts|tsx)$/.test(path) && !path.endsWith(".test.ts")));
  const nonDetectionSource = (await Promise.all(nonDetectionFiles.map((path) => readFile(path, "utf8")))).join("\n");
  assert.doesNotMatch(nonDetectionSource, /mysql2|@prisma\/client/);

  const detectionPackage = JSON.parse(await readFile(resolve(root, "packages/detection/package.json"), "utf8"));
  assert.equal(detectionPackage.dependencies.mysql2, "3.23.2");

  const applicationFiles = [...appsTree, ...packagesTree].filter((path) => /\.(ts|tsx)$/.test(path) && !path.endsWith(".test.ts"));
  const source = (await Promise.all(applicationFiles.map((path) => readFile(path, "utf8")))).join("\n");
  assert.doesNotMatch(source, /MONITOR_EMUSASOFT_WRITE|\/api\/emusa(?:soft)?\/(?:create|update|delete)/i);
});
