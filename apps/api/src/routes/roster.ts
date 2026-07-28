import {
  RosterSnapshotSchema,
  SaveRosterSnapshotSchema,
  type RosterAssignment,
  type SaveRosterSnapshot,
} from "@monitor/contracts";
import type { DatabaseExecutor, DatabaseRuntime } from "@monitor/database";
import { Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";

const operations = [
  "Extrusión",
  "Laminación",
  "Corte",
  "Impresión",
  "Sellado",
  "Exlam",
  "Peletizado",
  "Recuperación",
  "Triturado",
] as const;
const positionRules = {
  "Gerente de fábrica": { scope: "factory", operation: "blocked", warehouse: "blocked", group: false },
  "Supervisor de turno de operación": { scope: "operation_group", operation: "multiple", warehouse: "blocked", group: true },
  "Líder técnico": { scope: "operation", operation: "multiple", warehouse: "blocked", group: false },
  "Operador de máquina": { scope: "machine_group", operation: "single", warehouse: "blocked", group: true },
  "Planificador de materiales": { scope: "factory", operation: "blocked", warehouse: "blocked", group: false },
  Planificador: { scope: "factory", operation: "blocked", warehouse: "blocked", group: false },
  "Despachador de almacén": { scope: "warehouse_group", operation: "blocked", warehouse: "select", group: true },
  "Supervisor de almacén": { scope: "warehouse_group", operation: "blocked", warehouse: "select", group: true },
  "Operador de proceso": { scope: "warehouse_group", operation: "blocked", warehouse: "work_in_process", group: true },
  "Supervisor de proceso": { scope: "warehouse_group", operation: "blocked", warehouse: "work_in_process", group: true },
} as const;

class RosterConflictError extends Error {
  constructor(readonly revision: number) {
    super("roster_revision_conflict");
  }
}

function dateValue(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function normalizedName(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("es-PE");
}

function canonicalAssignment(value: RosterAssignment): RosterAssignment {
  return { ...value, person: value.person.trim().replace(/\s+/g, " "), operations: [...value.operations].sort() };
}

function validateAssignments(assignments: RosterAssignment[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();
  const sysUserIds = new Set<number>();
  for (const assignment of assignments) {
    if (ids.has(assignment.id)) errors.push(`El identificador ${assignment.id} está repetido.`);
    ids.add(assignment.id);
    if (assignment.sysUserId) {
      if (sysUserIds.has(assignment.sysUserId)) errors.push(`El usuario EmusaSoft ${assignment.sysUserId} está asignado más de una vez.`);
      sysUserIds.add(assignment.sysUserId);
    }
    const name = normalizedName(assignment.person);
    if (names.has(name)) errors.push(`La persona ${assignment.person} está repetida.`);
    names.add(name);
    if (assignment.validTo && assignment.validTo < assignment.validFrom) errors.push(`${assignment.person}: la fecha final es anterior a la inicial.`);

    if (!assignment.position) {
      if (assignment.setupComplete) errors.push(`${assignment.person}: una persona sin posición no puede estar completa.`);
      if (assignment.scope !== null || assignment.operations.length || assignment.warehouseType !== null) {
        errors.push(`${assignment.person}: complete primero la posición antes del área o la cobertura.`);
      }
      if (assignment.state !== "future") errors.push(`${assignment.person}: una configuración incompleta debe permanecer pendiente.`);
      continue;
    }

    const rule = positionRules[assignment.position];
    if (assignment.scope !== rule.scope) errors.push(`${assignment.person}: la cobertura no corresponde a su posición.`);
    if (assignment.operations.some((operation) => !operations.includes(operation))) errors.push(`${assignment.person}: contiene una operación desconocida.`);
    if (rule.operation === "blocked" && assignment.operations.length) errors.push(`${assignment.person}: su posición no utiliza operaciones.`);
    if (rule.operation === "single" && assignment.operations.length > 1) errors.push(`${assignment.person}: su posición permite una sola operación.`);
    if (assignment.setupComplete && rule.operation === "single" && assignment.operations.length !== 1) errors.push(`${assignment.person}: falta una operación.`);
    if (assignment.setupComplete && rule.operation === "multiple" && assignment.operations.length < 1) errors.push(`${assignment.person}: falta al menos una operación.`);
    if (rule.warehouse === "blocked" && assignment.warehouseType !== null) errors.push(`${assignment.person}: su posición no utiliza almacén.`);
    if (rule.warehouse === "select" && assignment.setupComplete && assignment.warehouseType === null) errors.push(`${assignment.person}: falta el tipo de almacén.`);
    if (rule.warehouse === "work_in_process" && assignment.warehouseType !== "Productos en proceso") errors.push(`${assignment.person}: el área debe ser Productos en proceso.`);
    if (rule.group && assignment.setupComplete && assignment.group === null) errors.push(`${assignment.person}: falta el grupo.`);
    if (!rule.group && assignment.group !== null) errors.push(`${assignment.person}: su posición no utiliza grupo.`);
  }
  return errors;
}

async function readSnapshot(executor: DatabaseExecutor, plantId: number) {
  await executor.execute(
    "INSERT INTO monitor_roster_revision (plant_id, revision) VALUES ($1, 0) ON CONFLICT (plant_id) DO NOTHING",
    [plantId],
  );
  const revisionRow = await executor.queryOne("SELECT revision FROM monitor_roster_revision WHERE plant_id=$1", [plantId]);
  const rows = await executor.queryAll(
    `SELECT id,sys_user_id,person_name,position,scope,warehouse_type,worker_group,valid_from,valid_to,state,setup_complete
       FROM monitor_roster_assignment WHERE plant_id=$1 ORDER BY lower(person_name),id`,
    [plantId],
  );
  const operationRows = await executor.queryAll(
    `SELECT operation.assignment_id,operation.operation_name
       FROM monitor_roster_assignment_operation operation
       JOIN monitor_roster_assignment assignment ON assignment.id=operation.assignment_id
      WHERE assignment.plant_id=$1 ORDER BY operation.assignment_id,operation.operation_name`,
    [plantId],
  );
  const operationsByAssignment = new Map<string, RosterAssignment["operations"]>();
  for (const operation of operationRows) {
    const id = String(operation.assignment_id);
    const current = operationsByAssignment.get(id) ?? [];
    current.push(operation.operation_name as RosterAssignment["operations"][number]);
    operationsByAssignment.set(id, current);
  }
  return {
    revision: Number(revisionRow.revision ?? 0),
    assignments: rows.map((row): RosterAssignment => ({
      id: String(row.id),
      ...(row.sys_user_id ? { sysUserId: Number(row.sys_user_id) } : {}),
      person: String(row.person_name),
      position: (row.position ?? "") as RosterAssignment["position"],
      operations: operationsByAssignment.get(String(row.id)) ?? [],
      warehouseType: (row.warehouse_type ?? null) as RosterAssignment["warehouseType"],
      scope: (row.scope ?? null) as RosterAssignment["scope"],
      group: (row.worker_group ?? null) as RosterAssignment["group"],
      validFrom: dateValue(row.valid_from),
      validTo: row.valid_to == null ? null : dateValue(row.valid_to),
      state: row.state as RosterAssignment["state"],
      setupComplete: Boolean(row.setup_complete),
    })),
  };
}

async function replaceSnapshot(
  database: DatabaseRuntime,
  plantId: number,
  actorId: number,
  request: SaveRosterSnapshot,
) {
  const assignments = request.assignments.map(canonicalAssignment);
  const validationErrors = validateAssignments(assignments);
  if (validationErrors.length) return { validationErrors } as const;

  const snapshot = await database.transaction(async (transaction) => {
    await transaction.execute(
      "INSERT INTO monitor_roster_revision (plant_id, revision) VALUES ($1, 0) ON CONFLICT (plant_id) DO NOTHING",
      [plantId],
    );
    const revisionRow = await transaction.queryOne(
      "SELECT revision FROM monitor_roster_revision WHERE plant_id=$1 FOR UPDATE",
      [plantId],
    );
    const currentRevision = Number(revisionRow.revision ?? 0);
    if (currentRevision !== request.revision) throw new RosterConflictError(currentRevision);
    const previous = await readSnapshot(transaction, plantId);
    const before = new Map(previous.assignments.map((assignment) => [assignment.id, canonicalAssignment(assignment)]));
    const after = new Map(assignments.map((assignment) => [assignment.id, assignment]));
    const nextRevision = currentRevision + 1;

    for (const [id, oldValue] of before) {
      const newValue = after.get(id);
      if (newValue && JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;
      await transaction.execute(
        `INSERT INTO monitor_roster_assignment_audit
          (plant_id,revision,assignment_id,action,before_value,after_value,changed_by_sys_user_id)
         VALUES ($1,$2,$3,$4,CAST($5 AS JSONB),CAST($6 AS JSONB),$7)`,
        [plantId, nextRevision, id, newValue ? "updated" : "removed", JSON.stringify(oldValue), newValue ? JSON.stringify(newValue) : null, actorId],
      );
    }
    for (const [id, newValue] of after) {
      if (before.has(id)) continue;
      await transaction.execute(
        `INSERT INTO monitor_roster_assignment_audit
          (plant_id,revision,assignment_id,action,before_value,after_value,changed_by_sys_user_id)
         VALUES ($1,$2,$3,'created',NULL,CAST($4 AS JSONB),$5)`,
        [plantId, nextRevision, id, JSON.stringify(newValue), actorId],
      );
    }

    await transaction.execute("DELETE FROM monitor_roster_assignment WHERE plant_id=$1", [plantId]);
    for (const assignment of assignments) {
      await transaction.execute(
        `INSERT INTO monitor_roster_assignment
          (id,plant_id,sys_user_id,person_name,position,scope,warehouse_type,worker_group,valid_from,valid_to,state,setup_complete)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [assignment.id, plantId, assignment.sysUserId ?? null, assignment.person, assignment.position || null, assignment.scope, assignment.warehouseType,
          assignment.group, assignment.validFrom, assignment.validTo, assignment.state, assignment.setupComplete],
      );
      for (const operation of assignment.operations) {
        await transaction.execute(
          "INSERT INTO monitor_roster_assignment_operation (assignment_id,operation_name) VALUES ($1,$2)",
          [assignment.id, operation],
        );
      }
    }
    await transaction.execute(
      "UPDATE monitor_roster_revision SET revision=$2,updated_at=now() WHERE plant_id=$1",
      [plantId, nextRevision],
    );
    return readSnapshot(transaction, plantId);
  });
  return { snapshot } as const;
}

export async function rosterRoutes(app: FastifyInstance, options: { database: DatabaseRuntime; onChanged?: (plantId: number) => Promise<void> }): Promise<void> {
  app.get("/api/roster/assignments", {
    preHandler: app.requireScopes(["monitor:admin"]),
    schema: { response: { 200: RosterSnapshotSchema } },
  }, async (request) => readSnapshot(options.database, request.principal!.plantIds[0]!));

  app.put<{ Body: SaveRosterSnapshot }>("/api/roster/assignments", {
    preHandler: app.requireScopes(["monitor:admin"]),
    schema: {
      body: SaveRosterSnapshotSchema,
      response: {
        200: RosterSnapshotSchema,
        400: Type.Object({ error: Type.Literal("invalid_roster"), details: Type.Array(Type.String()) }),
        409: Type.Object({ error: Type.Literal("roster_revision_conflict"), revision: Type.Integer({ minimum: 0 }) }),
      },
    },
  }, async (request, reply) => {
    try {
      const result = await replaceSnapshot(
        options.database,
        request.principal!.plantIds[0]!,
        request.principal!.sysUserId,
        request.body,
      );
      if ("validationErrors" in result) return reply.code(400).send({ error: "invalid_roster", details: result.validationErrors });
      await options.onChanged?.(request.principal!.plantIds[0]!);
      return result.snapshot;
    } catch (error) {
      if (error instanceof RosterConflictError) {
        return reply.code(409).send({ error: "roster_revision_conflict", revision: error.revision });
      }
      throw error;
    }
  });
}
