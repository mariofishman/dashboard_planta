import assert from "node:assert/strict";
import { buildMonitorServer } from "../apps/api/src/server.ts";

const instance = await buildMonitorServer({
  config: {
    nodeEnv: "test",
    cookieSecret: "phase-5-manual-validation-secret-with-enough-entropy",
    allowMockAuth: true,
    enableScenarioLab: true,
    databaseMode: "pglite",
    pgliteDataDir: "memory://",
  },
});

const manager = { authorization: "Bearer mock:plant-manager" };
const operator = { authorization: "Bearer mock:machine-operator" };
const assignment = (id: string, person: string, position: string, scope: string, group: string | null, operations: string[] = [], warehouseType: string | null = null) => ({
  id, person, position, operations, warehouseType, scope, group,
  validFrom: "2026-07-01", validTo: null, state: "active", setupComplete: true,
});

try {
  const roster = [
    assignment("manager", "María Torres", "Gerente de fábrica", "factory", null),
    assignment("supervisor-a", "Luis Vargas", "Supervisor de turno de operación", "operation_group", "A", ["Impresión"]),
    assignment("leader", "Rosa Paredes", "Líder técnico", "operation", null, ["Impresión"]),
    assignment("operator-a", "Jorge Acosta", "Operador de máquina", "machine_group", "A", ["Impresión"]),
    assignment("dispatcher-a", "Carlos Mendoza", "Despachador de almacén", "warehouse_group", "A", [], "Materias primas"),
    assignment("warehouse-supervisor-a", "Sofía Ramos", "Supervisor de almacén", "warehouse_group", "A", [], "Materias primas"),
  ];
  assert.equal((await instance.app.inject({ method: "PUT", url: "/api/roster/assignments", headers: manager, payload: { revision: 0, assignments: roster } })).statusCode, 200);
  for (const [url, payload] of [
    ["/api/dev/scenarios/A02/trigger", undefined],
    ["/api/dev/scenarios/A02/advance-time", { minutes: 31 }],
    ["/api/dev/scenarios/A02/poll", undefined],
  ] as const) {
    assert.equal((await instance.app.inject({ method: "POST", url, headers: manager, payload })).statusCode, 200);
  }
  const incident = (await instance.app.inject({ url: "/api/incidents", headers: manager })).json().incidents.find((item: { ruleCode: string }) => item.ruleCode === "A02");
  assert.ok(incident);
  const route = `/api/internal/routing/${incident.id}`;
  assert.equal((await instance.app.inject({ url: route, headers: operator })).statusCode, 403);
  const before = (await instance.app.inject({ url: route, headers: manager })).json();
  assert.ok(before.recipients.some((recipient: { name: string }) => recipient.name === "Carlos Mendoza"));

  const replacement = assignment("dispatcher-b", "Carmen Ríos", "Despachador de almacén", "warehouse_group", "A", [], "Materias primas");
  assert.equal((await instance.app.inject({ method: "PUT", url: "/api/roster/assignments", headers: manager, payload: { revision: 1, assignments: roster.filter((item) => item.id !== "dispatcher-a").concat(replacement) } })).statusCode, 200);
  const after = (await instance.app.inject({ url: route, headers: manager })).json();
  assert.ok(after.recipients.some((recipient: { name: string }) => recipient.name === "Carmen Ríos"));
  assert.equal(after.recipients.some((recipient: { name: string }) => recipient.name === "Carlos Mendoza"), false);
  console.log("Phase 5 multi-user scenario passed: operator access denied; administrator diagnostics and dynamic rerouting verified.");
} finally {
  await instance.close();
}
