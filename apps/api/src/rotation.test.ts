import assert from "node:assert/strict";
import { afterEach, it } from "node:test";
import { buildMonitorServer, type MonitorServer } from "./server.js";

const servers: MonitorServer[] = [];
afterEach(async () => { await Promise.all(servers.splice(0).map((server) => server.close())); });

async function server() {
  const instance = await buildMonitorServer({ config: {
    nodeEnv: "test", cookieSecret: "phase-5-rotation-secret-with-enough-entropy", allowMockAuth: true,
    enableScenarioLab: true, databaseMode: "pglite", pgliteDataDir: "memory://",
  } });
  servers.push(instance);
  return instance;
}

it("persists and audits rotation patterns with operation authorization and revision conflicts", async () => {
  const instance = await server();
  const admin = { authorization: "Bearer mock:plant-manager" };
  const scheduler = { authorization: "Bearer mock:operation-scheduler" };
  const operator = { authorization: "Bearer mock:machine-operator" };
  const path = "/api/roster/rotation/Impresi%C3%B3n";
  assert.equal((await instance.app.inject({ url: path, headers: operator })).statusCode, 403);
  const initial = await instance.app.inject({ url: path, headers: scheduler });
  assert.equal(initial.statusCode, 200, initial.body);
  assert.equal(initial.json().revision, 0);
  const pattern = initial.json().pattern;
  pattern.groups[0].name = "Equipo A";
  const saved = await instance.app.inject({ method: "PUT", url: path, headers: { ...scheduler, "content-type": "application/json" }, payload: { revision: 0, pattern } });
  assert.equal(saved.statusCode, 200, saved.body);
  assert.equal(saved.json().revision, 1);
  assert.equal(saved.json().pattern.groups[0].name, "Equipo A");
  assert.equal((await instance.app.inject({ method: "PUT", url: path, headers: admin, payload: { revision: 0, pattern } })).statusCode, 409);
  assert.equal(Number((await instance.database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_rotation_pattern_audit")).count), 1);
});

it("rejects a pattern where two groups share a working schedule", async () => {
  const instance = await server();
  const headers = { authorization: "Bearer mock:plant-manager" };
  const path = "/api/roster/rotation/Impresi%C3%B3n";
  const initial = await instance.app.inject({ url: path, headers });
  const pattern = initial.json().pattern;
  pattern.groups[2].anchorScheduleId = "rest";
  const response = await instance.app.inject({ method: "PUT", url: path, headers, payload: { revision: 0, pattern } });
  assert.equal(response.statusCode, 400, response.body);
  assert.equal(response.json().error, "invalid_rotation_pattern");
  assert.match(response.json().details[0], /comparten Día/);
});

it("persists temporary changes, rejects overlapping dates, and audits reversion", async () => {
  const instance = await server();
  const headers = { authorization: "Bearer mock:plant-manager" };
  await instance.app.inject({ method: "PUT", url: "/api/roster/assignments", headers, payload: { revision: 0, assignments: [{
    id: "worker-a", person: "Ana Díaz", position: "Operador de máquina", operations: ["Impresión"], warehouseType: null,
    scope: "machine_group", group: "A", validFrom: "2026-07-01", validTo: null, state: "active", setupComplete: true,
  }] } });
  const exception = {
    id: "change-1", operation: "Impresión", workerId: "worker-a", kind: "custom", startDate: "2026-07-27", endDate: "2026-07-29",
    groupId: null, groupName: null, scheduleId: null, customScheduleName: "Mediodía", customStart: "11:00", customEnd: "16:00",
  };
  const base = "/api/roster/rotation/Impresi%C3%B3n/exceptions";
  const saved = await instance.app.inject({ method: "PUT", url: `${base}/change-1`, headers, payload: exception });
  assert.equal(saved.statusCode, 200, saved.body);
  const loaded = await instance.app.inject({ url: base, headers });
  assert.deepEqual(loaded.json().exceptions, [exception]);
  const conflict = await instance.app.inject({ method: "PUT", url: `${base}/change-2`, headers, payload: { ...exception, id: "change-2", startDate: "2026-07-29", endDate: "2026-07-30" } });
  assert.equal(conflict.statusCode, 409);
  assert.equal((await instance.app.inject({ method: "DELETE", url: `${base}/change-1`, headers })).statusCode, 204);
  assert.deepEqual((await instance.app.inject({ url: base, headers })).json().exceptions, []);
  assert.equal(Number((await instance.database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_rotation_exception_audit")).count), 2);
});

it("persists drag-and-drop calendar adjustments and gap coverage without changing the UI contract", async () => {
  const instance = await server();
  const headers = { authorization: "Bearer mock:plant-manager" };
  const path = "/api/roster/rotation/Impresi%C3%B3n/calendar";
  const initial = await instance.app.inject({ url: path, headers });
  assert.deepEqual(initial.json(), { operation: "Impresión", revision: 0, adjustments: [], coverages: [] });
  const payload = {
    revision: 0,
    adjustments: [{ id: "move-1", operation: "Impresión", date: "2026-07-27", shiftDays: 2, createsGap: true }],
    coverages: [{ id: "cover-1", operation: "Impresión", startDate: "2026-07-27", days: 2, dayGroup: "B", nightGroup: "C" }],
  };
  const saved = await instance.app.inject({ method: "PUT", url: path, headers, payload });
  assert.equal(saved.statusCode, 200, saved.body);
  assert.equal(saved.json().revision, 1);
  assert.deepEqual((await instance.app.inject({ url: path, headers })).json(), { operation: "Impresión", revision: 1, adjustments: payload.adjustments, coverages: payload.coverages });
  assert.equal((await instance.app.inject({ method: "PUT", url: path, headers, payload })).statusCode, 409);
  assert.equal(Number((await instance.database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_rotation_calendar_state_audit")).count), 1);
});
