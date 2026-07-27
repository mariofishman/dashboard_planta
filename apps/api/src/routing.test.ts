import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createDatabaseRuntime, migrateFoundation, type DatabaseRuntime } from "@monitor/database";
import { requiredRolesFor, RoutingService } from "./routing.js";

const databases: DatabaseRuntime[] = [];
async function database() {
  const db = await createDatabaseRuntime({ mode: "pglite", pgliteDataDir: "memory://" });
  databases.push(db);
  await migrateFoundation(db);
  return db;
}
afterEach(async () => { await Promise.all(databases.splice(0).map((db) => db.close())); });

describe("Phase 5 catalog routing", () => {
  it("applies all seven general rules and every documented code override", () => {
    const allCodes = ["A01", "A02", "A03", "A04", "A05", "A06", "A07", "B01", "B02", "B03", "C01", "C02", "C06", "D01", "D02", "D03", "D04", "E01", "E02", "E03", "E04", "E05"];
    for (const code of allCodes) {
      const roles = requiredRolesFor(code);
      assert.ok(roles.includes("factory_manager"), `${code} must inform factory management`);
      assert.ok(roles.includes("operation_shift_supervisor"), `${code} must inform the operation shift supervisor`);
      assert.ok(roles.includes("technical_leader"), `${code} must inform the technical leader`);
      assert.equal(new Set(roles).size, roles.length, `${code} must deduplicate roles`);
    }
    assert.deepEqual(requiredRolesFor("A01", ["reserved_not_dispatched"]).filter((role) => role.includes("warehouse") || role === "machine_operator"), ["warehouse_dispatcher"]);
    assert.ok(requiredRolesFor("A02").includes("warehouse_supervisor"));
    assert.ok(requiredRolesFor("A05", [], { reelKind: "remnant" }).includes("warehouse_dispatcher"));
    assert.ok(requiredRolesFor("A05", [], { reelKind: "produced" }).includes("process_supervisor"));
    assert.ok(requiredRolesFor("A06", ["not_weighed"]).includes("process_operator"));
    assert.ok(requiredRolesFor("B03", ["valid_pause"]).includes("planner"));
    assert.ok(requiredRolesFor("D02", ["reel_selection"]).includes("material_planner"));
    assert.equal(requiredRolesFor("E01").includes("machine_operator"), false);
    assert.equal(requiredRolesFor("E03").includes("process_operator"), false);
    assert.ok(requiredRolesFor("E03", [], { processInvolved: true }).includes("process_operator"));
  });

  it("resolves the active rotation group, supplements the recorded actor, deduplicates delivery, and retries safely", async () => {
    const db = await database();
    const pattern = {
      effectiveFrom: "2026-07-25",
      schedules: [
        { id: "day", name: "Día", start: "07:00", end: "19:00", isRest: false },
        { id: "night", name: "Noche", start: "19:00", end: "07:00", isRest: false },
        { id: "rest", name: "Descanso", start: null, end: null, isRest: true },
      ],
      groups: [
        { id: "A", name: "A", anchorScheduleId: "rest", daysPerPhase: 2 },
        { id: "B", name: "B", anchorScheduleId: "day", daysPerPhase: 2 },
        { id: "C", name: "C", anchorScheduleId: "night", daysPerPhase: 2 },
      ],
    };
    await db.execute("INSERT INTO monitor_roster_revision (plant_id,revision) VALUES (1,1)");
    await db.execute(`INSERT INTO monitor_rotation_pattern (plant_id,operation_name,revision,pattern,updated_by_sys_user_id)
      VALUES (1,'Impresión',1,$1::jsonb,9001)`, [JSON.stringify(pattern)]);
    const assignments = [
      ["manager", "María Torres", "Gerente de fábrica", "factory", null],
      ["supervisor-b", "Luis Vargas", "Supervisor de turno de operación", "operation_group", "B"],
      ["leader", "Rosa Paredes", "Líder técnico", "operation", null],
      ["operator-b", "Jorge Acosta", "Operador de máquina", "machine_group", "B"],
      ["dispatcher-b", "Carlos Mendoza", "Despachador de almacén", "warehouse_group", "B"],
      ["warehouse-supervisor-b", "Sofía Ramos", "Supervisor de almacén", "warehouse_group", "B"],
    ] as const;
    for (const [id, name, position, scope, group] of assignments) {
      const warehouse = position.includes("almacén") ? "Materias primas" : null;
      await db.execute(`INSERT INTO monitor_roster_assignment
        (id,plant_id,person_name,position,scope,warehouse_type,worker_group,valid_from,state,setup_complete)
        VALUES ($1,1,$2,$3,$4,$5,$6,'2026-07-01','active',TRUE)`, [id, name, position, scope, warehouse, group]);
      if (["Supervisor de turno de operación", "Líder técnico", "Operador de máquina"].includes(position)) {
        await db.execute("INSERT INTO monitor_roster_assignment_operation (assignment_id,operation_name) VALUES ($1,'Impresión')", [id]);
      }
    }
    const incident = await db.queryOne(`INSERT INTO monitor_incident
      (rule_code,condition_key,occurrence,lifecycle,label,title,summary,plant_id,operation_name,shift_name,reasons,opened_at,updated_at)
      VALUES ('A02','A02:test',1,'open','Alerta','Material','Material',1,'Impresión','Día','[]'::jsonb,
        '2026-07-25T12:00:00Z','2026-07-25T12:00:00Z') RETURNING id`);
    await db.execute(`INSERT INTO monitor_incident_evidence (incident_id,status,reasons,evidence,observed_at)
      VALUES ($1,'triggered','[]'::jsonb,$2::jsonb,'2026-07-25T12:00:00Z')`, [incident.id, JSON.stringify({ warehouseType: "Materias primas", actorName: "Jorge Acosta" })]);

    const service = new RoutingService(db);
    const result = await service.routeIncident(String(incident.id));
    assert.equal(result?.status, "complete");
    const diagnostic = await service.diagnostics(String(incident.id));
    assert.equal(((diagnostic as Record<string, unknown>).recipients as unknown[]).length, 6, "the recorded actor is not duplicated with the roster operator");
    assert.equal(((diagnostic as Record<string, unknown>).deliveries as Array<{ state: string }>).every((delivery) => delivery.state === "sent"), true);
    assert.equal(Number((await db.queryOne("SELECT COUNT(*)::int AS count FROM monitor_notification_delivery WHERE incident_id=$1", [incident.id])).count), 6);
    await service.routeIncident(String(incident.id));
    assert.equal(Number((await db.queryOne("SELECT COUNT(*)::int AS count FROM monitor_notification_delivery WHERE incident_id=$1", [incident.id])).count), 6, "rerouting is idempotent");

    await service.markDeliveryFailed(String(incident.id), "assignment:operator-b", "temporary_transport_failure");
    assert.equal(await service.retryDue(), 1);
    const retried = await db.queryOne("SELECT state,attempt_count FROM monitor_notification_delivery WHERE incident_id=$1 AND recipient_key='assignment:operator-b'", [incident.id]);
    assert.equal(retried.state, "sent");
    assert.equal(Number(retried.attempt_count), 3);
  });

  it("keeps valid recipients, records missing assignments, and emails administrators without a broad fallback", async () => {
    const db = await database();
    await db.execute("INSERT INTO monitor_roster_revision (plant_id,revision) VALUES (1,0)");
    await db.execute(`INSERT INTO monitor_roster_assignment
      (id,plant_id,person_name,position,scope,valid_from,state,setup_complete)
      VALUES ('manager',1,'María Torres','Gerente de fábrica','factory','2026-07-01','active',TRUE)`);
    const incident = await db.queryOne(`INSERT INTO monitor_incident
      (rule_code,condition_key,occurrence,lifecycle,label,title,summary,plant_id,operation_name,shift_name,reasons,opened_at,updated_at)
      VALUES ('A03','A03:missing',1,'open','Alerta','Consumo','Consumo',1,'Impresión','Día','[]'::jsonb,now(),now()) RETURNING id`);
    await db.execute("INSERT INTO monitor_incident_evidence (incident_id,status,reasons,evidence,observed_at) VALUES ($1,'triggered','[]'::jsonb,'{}'::jsonb,now())", [incident.id]);
    const service = new RoutingService(db);
    const result = await service.routeIncident(String(incident.id));
    assert.equal(result?.status, "partial");
    assert.equal((result!.recipients as Array<{ name: string }>).map((recipient) => recipient.name).join(","), "María Torres");
    assert.ok((result!.diagnostics as Array<{ code: string }>).some((item) => item.code === "missing_assignment"));
    assert.equal(Number((await db.queryOne("SELECT COUNT(*)::int AS count FROM monitor_admin_email_outbox WHERE incident_id=$1 AND state='sent'", [incident.id])).count), 1);
  });
});
