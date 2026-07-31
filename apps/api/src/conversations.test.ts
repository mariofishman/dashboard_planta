import assert from "node:assert/strict";
import { afterEach, it } from "node:test";
import { io as connectSocket } from "socket.io-client";
import { buildMonitorServer, type MonitorServer } from "./server.js";
import { workerGroupForIncident } from "../test/routing-fixtures.js";

const servers: MonitorServer[] = [];
afterEach(async () => Promise.all(servers.splice(0).map((server) => server.close())));

const headers = (identity: string) => ({ authorization: `Bearer mock:${identity}` });
const assignment = (id: string, person: string, position: string, scope: string, group: string | null, operations: string[] = [], warehouseType: string | null = null, sysUserId?: number) => ({
  id, ...(sysUserId ? { sysUserId } : {}), person, position, operations, warehouseType, scope, group, validFrom: "2026-07-01", validTo: null, state: "active", setupComplete: true,
});

it("synchronizes one incident conversation across mock users, duplicates, reconnects, permissions, and unread state", async () => {
  const instance = await buildMonitorServer({ config: {
    nodeEnv: "test", cookieSecret: "phase-6-api-test-secret-with-enough-entropy", allowMockAuth: true,
    enableScenarioLab: true, databaseMode: "pglite", pgliteDataDir: "memory://", port: 0,
  } });
  servers.push(instance);
  await instance.app.listen({ host: "127.0.0.1", port: 0 });
  const address = instance.app.server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;
  const manager = headers("plant-manager");
  const supervisor = headers("shift-supervisor");
  const operator = headers("machine-operator");
  const trigger = await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/trigger", headers: manager });
  assert.equal(trigger.statusCode, 200, trigger.body);
  const advance = await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/advance-time", headers: manager, payload: { minutes: 31 } });
  assert.equal(advance.statusCode, 200, advance.body);
  const incidentAt = advance.json().scenarioClock.currentAt;
  const incidentWorkerGroup = workerGroupForIncident(incidentAt, "Día");
  const roster = [
    assignment("manager", "María Torres", "Gerente de fábrica", "factory", null, [], null, 9001),
    assignment("supervisor-active", "Luis Vargas", "Supervisor de turno de operación", "operation_group", incidentWorkerGroup, ["Impresión"], null, 9002),
    assignment("leader", "Rosa Paredes", "Líder técnico", "operation", null, ["Impresión"], null, 9004),
    assignment("operator-active", "Jorge Acosta", "Operador de máquina", "machine_group", incidentWorkerGroup, ["Impresión"], null, 9003),
    assignment("dispatcher-active", "Carlos Mendoza", "Despachador de almacén", "warehouse_group", incidentWorkerGroup, [], "Materias primas"),
    assignment("warehouse-supervisor-active", "Sofía Ramos", "Supervisor de almacén", "warehouse_group", incidentWorkerGroup, [], "Materias primas"),
  ];
  assert.equal((await instance.app.inject({ method: "PUT", url: "/api/roster/assignments", headers: manager, payload: { revision: 0, assignments: roster } })).statusCode, 200);
  const poll = await instance.app.inject({ method: "POST", url: "/api/dev/scenarios/A02/poll", headers: manager });
  assert.equal(poll.statusCode, 200, poll.body);
  assert.equal(poll.json().scenario.scenarioClock.currentAt, incidentAt);
  const managerList = (await instance.app.inject({ url: "/api/conversations", headers: manager })).json();
  assert.equal(managerList.conversations.length, 1);
  const conversationId = managerList.conversations[0].id as string;
  assert.equal((await instance.app.inject({ url: "/api/conversations", headers: supervisor })).json().conversations.length, 1);
  assert.equal((await instance.app.inject({ url: "/api/conversations", headers: operator })).json().conversations.length, 1);

  const socket = connectSocket(base, { auth: { token: "mock:machine-operator" }, transports: ["websocket"] });
  await new Promise<void>((resolve, reject) => { socket.once("connect", resolve); socket.once("connect_error", reject); });
  socket.disconnect();
  socket.connect();
  await new Promise<void>((resolve, reject) => { socket.once("connect", resolve); socket.once("connect_error", reject); });
  const liveMessage = new Promise<{ messageId: string }>((resolve) => socket.once("message.created", resolve));
  const send = await instance.app.inject({ method: "POST", url: `/api/conversations/${conversationId}/messages`, headers: { ...supervisor, "content-type": "application/json" }, payload: { body: "Revisión en curso", clientCommandId: "supervisor-command-1" } });
  assert.equal(send.statusCode, 200, send.body);
  const duplicate = await instance.app.inject({ method: "POST", url: `/api/conversations/${conversationId}/messages`, headers: { ...supervisor, "content-type": "application/json" }, payload: { body: "Duplicado", clientCommandId: "supervisor-command-1" } });
  assert.equal(duplicate.json().duplicate, true);
  assert.equal((await liveMessage).messageId, send.json().id);
  socket.close();

  const operatorList = (await instance.app.inject({ url: "/api/conversations", headers: operator })).json();
  assert.equal(operatorList.conversations[0].unreadCount, 2);
  const history = (await instance.app.inject({ url: `/api/conversations/${conversationId}/messages`, headers: operator })).json();
  const cursor = history.messages.at(-1).cursor;
  assert.equal((await instance.app.inject({ method: "POST", url: `/api/conversations/${conversationId}/read`, headers: operator, payload: { cursor } })).statusCode, 204);
  assert.equal((await instance.app.inject({ url: "/api/conversations", headers: operator })).json().conversations[0].unreadCount, 0);
  assert.equal((await instance.app.inject({ method: "PUT", url: `/api/admin/conversations/${conversationId}/participants/9003`, headers: manager, payload: { active: false, displayName: "Operación de máquina" } })).statusCode, 204);
  assert.equal((await instance.app.inject({ url: `/api/conversations/${conversationId}/messages`, headers: operator })).statusCode, 403);
  assert.equal((await instance.app.inject({ method: "PUT", url: "/api/roster/assignments", headers: manager, payload: { revision: 1, assignments: roster.filter((item) => item.id !== "operator-active") } })).statusCode, 200);
  assert.equal((await instance.app.inject({ url: "/api/session", headers: operator })).statusCode, 403);
});
