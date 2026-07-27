import {
  RotationExceptionSchema,
  RotationCalendarStateSchema,
  RotationPatternSchema,
  RotationPatternSnapshotSchema,
  SaveRotationPatternSchema,
  SaveRotationCalendarStateSchema,
  type RotationCalendarState,
  type RotationException,
  type RotationPattern,
  firstRotationPatternConflict,
} from "@monitor/contracts";
import type { DatabaseRuntime } from "@monitor/database";
import { Type } from "@sinclair/typebox";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { canManageRotation } from "../auth/authentication.js";

const operationIds = new Map([
  ["Impresión", 10], ["Extrusión", 20], ["Exlam", 30], ["Corte", 40], ["Sellado", 50],
  ["Laminación", 60], ["Peletizado", 70], ["Recuperación", 80], ["Triturado", 90],
]);

const defaultPattern = (): RotationPattern => ({
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
});

function dateValue(value: unknown): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function validPattern(pattern: RotationPattern): string[] {
  const errors: string[] = [];
  const scheduleIds = new Set<string>();
  const groupIds = new Set<string>();
  for (const schedule of pattern.schedules) {
    if (scheduleIds.has(schedule.id)) errors.push(`Horario repetido: ${schedule.id}.`);
    scheduleIds.add(schedule.id);
    if (schedule.isRest && (schedule.start !== null || schedule.end !== null)) errors.push("Descanso no puede tener horario.");
    if (!schedule.isRest && (!schedule.start || !schedule.end || schedule.start === schedule.end)) errors.push(`${schedule.name}: el horario es inválido.`);
  }
  for (const group of pattern.groups) {
    if (groupIds.has(group.id)) errors.push(`Grupo repetido: ${group.id}.`);
    groupIds.add(group.id);
    if (!scheduleIds.has(group.anchorScheduleId)) errors.push(`${group.name}: el horario inicial no existe.`);
  }
  const conflict = firstRotationPatternConflict(pattern);
  if (conflict) {
    const schedule = pattern.schedules.find((item) => item.id === conflict.scheduleId)?.name ?? conflict.scheduleId;
    const groups = conflict.groupIds.map((id) => pattern.groups.find((item) => item.id === id)?.name ?? id);
    errors.push(`${groups[0]} y ${groups[1]} comparten ${schedule} en el día ${conflict.dayOffset + 1} del ciclo.`);
  }
  return errors;
}

async function authorizedOperation(request: FastifyRequest, reply: FastifyReply, operation: string) {
  const operationId = operationIds.get(operation);
  if (!operationId) {
    await reply.code(404).send({ error: "unknown_operation" });
    return null;
  }
  if (!request.principal || !canManageRotation(request.principal, operationId)) {
    await reply.code(403).send({ error: "operation_not_authorized" });
    return null;
  }
  return operationId;
}

async function readPattern(database: DatabaseRuntime, plantId: number, operation: string) {
  const row = await database.queryOne("SELECT revision,pattern FROM monitor_rotation_pattern WHERE plant_id=$1 AND operation_name=$2", [plantId, operation]);
  return {
    operation,
    revision: row.revision == null ? 0 : Number(row.revision),
    pattern: row.pattern ? (typeof row.pattern === "string" ? JSON.parse(row.pattern) : row.pattern) : defaultPattern(),
  };
}

async function readExceptions(database: DatabaseRuntime, plantId: number, operation: string): Promise<RotationException[]> {
  const rows = await database.queryAll(`SELECT id,assignment_id AS "workerId",kind,valid_from AS "startDate",valid_to AS "endDate",target
    FROM monitor_rotation_exception WHERE plant_id=$1 AND operation_name=$2 ORDER BY valid_from,id`, [plantId, operation]);
  return rows.map((row) => {
    const target = typeof row.target === "string" ? JSON.parse(row.target) : row.target as Record<string, unknown>;
    return {
      id: String(row.id), operation: operation as RotationException["operation"], workerId: String(row.workerId), kind: row.kind as RotationException["kind"],
      startDate: dateValue(row.startDate), endDate: dateValue(row.endDate),
      groupId: target.groupId as string | null, groupName: target.groupName as string | null,
      scheduleId: target.scheduleId as string | null, customScheduleName: target.customScheduleName as string | null,
      customStart: target.customStart as string | null, customEnd: target.customEnd as string | null,
    };
  });
}

export async function rotationRoutes(app: FastifyInstance, options: { database: DatabaseRuntime; onChanged?: (plantId: number, operation: string) => Promise<void> }): Promise<void> {
  const guard = { preHandler: app.requireScopes(["monitor:read"]) };

  app.get<{ Params: { operation: string } }>("/api/roster/rotation/:operation", {
    ...guard, schema: { response: { 200: RotationPatternSnapshotSchema } },
  }, async (request, reply) => {
    const operation = decodeURIComponent(request.params.operation);
    if (!await authorizedOperation(request, reply, operation)) return reply;
    return readPattern(options.database, request.principal!.plantIds[0]!, operation);
  });

  app.put<{ Params: { operation: string }; Body: { revision: number; pattern: RotationPattern } }>("/api/roster/rotation/:operation", {
    ...guard,
    schema: {
      body: SaveRotationPatternSchema,
      response: {
        200: RotationPatternSnapshotSchema,
        400: Type.Object({ error: Type.Literal("invalid_rotation_pattern"), details: Type.Array(Type.String()) }),
        409: Type.Object({ error: Type.Literal("rotation_revision_conflict"), revision: Type.Integer({ minimum: 0 }) }),
      },
    },
  }, async (request, reply) => {
    const operation = decodeURIComponent(request.params.operation);
    if (!await authorizedOperation(request, reply, operation)) return reply;
    const errors = validPattern(request.body.pattern);
    if (errors.length) return reply.code(400).send({ error: "invalid_rotation_pattern", details: errors });
    const plantId = request.principal!.plantIds[0]!;
    const result = await options.database.transaction(async (transaction) => {
      const current = await transaction.queryOne("SELECT revision,pattern FROM monitor_rotation_pattern WHERE plant_id=$1 AND operation_name=$2 FOR UPDATE", [plantId, operation]);
      const revision = current.revision == null ? 0 : Number(current.revision);
      if (revision !== request.body.revision) return { conflict: revision } as const;
      const nextRevision = revision + 1;
      await transaction.execute(`INSERT INTO monitor_rotation_pattern (plant_id,operation_name,revision,pattern,updated_by_sys_user_id)
        VALUES ($1,$2,$3,$4::jsonb,$5) ON CONFLICT (plant_id,operation_name) DO UPDATE SET revision=EXCLUDED.revision,
        pattern=EXCLUDED.pattern,updated_by_sys_user_id=EXCLUDED.updated_by_sys_user_id,updated_at=now()`,
      [plantId, operation, nextRevision, JSON.stringify(request.body.pattern), request.principal!.sysUserId]);
      await transaction.execute(`INSERT INTO monitor_rotation_pattern_audit
        (plant_id,operation_name,revision,before_value,after_value,changed_by_sys_user_id)
        VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6)`, [plantId, operation, nextRevision,
        current.pattern ? JSON.stringify(current.pattern) : null, JSON.stringify(request.body.pattern), request.principal!.sysUserId]);
      return { snapshot: { operation, revision: nextRevision, pattern: request.body.pattern } } as const;
    });
    if ("conflict" in result) return reply.code(409).send({ error: "rotation_revision_conflict", revision: result.conflict });
    await options.onChanged?.(plantId, operation);
    return result.snapshot;
  });

  app.get<{ Params: { operation: string } }>("/api/roster/rotation/:operation/exceptions", guard, async (request, reply) => {
    const operation = decodeURIComponent(request.params.operation);
    if (!await authorizedOperation(request, reply, operation)) return reply;
    return { exceptions: await readExceptions(options.database, request.principal!.plantIds[0]!, operation) };
  });

  app.get<{ Params: { operation: string } }>("/api/roster/rotation/:operation/calendar", {
    ...guard, schema: { response: { 200: RotationCalendarStateSchema } },
  }, async (request, reply) => {
    const operation = decodeURIComponent(request.params.operation);
    if (!await authorizedOperation(request, reply, operation)) return reply;
    const row = await options.database.queryOne(`SELECT revision,adjustments,coverages FROM monitor_rotation_calendar_state
      WHERE plant_id=$1 AND operation_name=$2`, [request.principal!.plantIds[0]!, operation]);
    return { operation, revision: row.revision == null ? 0 : Number(row.revision), adjustments: row.adjustments ?? [], coverages: row.coverages ?? [] };
  });

  app.put<{ Params: { operation: string }; Body: Omit<RotationCalendarState, "operation"> }>("/api/roster/rotation/:operation/calendar", {
    ...guard, schema: { body: SaveRotationCalendarStateSchema },
  }, async (request, reply) => {
    const operation = decodeURIComponent(request.params.operation);
    if (!await authorizedOperation(request, reply, operation)) return reply;
    if (request.body.adjustments.some((item) => item.operation !== operation)
      || request.body.coverages.some((item) => item.operation !== operation)) return reply.code(400).send({ error: "invalid_rotation_calendar" });
    const plantId = request.principal!.plantIds[0]!;
    const result = await options.database.transaction(async (transaction) => {
      const current = await transaction.queryOne(`SELECT revision,adjustments,coverages FROM monitor_rotation_calendar_state
        WHERE plant_id=$1 AND operation_name=$2 FOR UPDATE`, [plantId, operation]);
      const revision = current.revision == null ? 0 : Number(current.revision);
      if (revision !== request.body.revision) return { conflict: revision } as const;
      const nextRevision = revision + 1;
      const before = current.revision == null ? null : { adjustments: current.adjustments, coverages: current.coverages };
      const after = { adjustments: request.body.adjustments, coverages: request.body.coverages };
      await transaction.execute(`INSERT INTO monitor_rotation_calendar_state
        (plant_id,operation_name,revision,adjustments,coverages,updated_by_sys_user_id) VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6)
        ON CONFLICT (plant_id,operation_name) DO UPDATE SET revision=EXCLUDED.revision,adjustments=EXCLUDED.adjustments,
        coverages=EXCLUDED.coverages,updated_by_sys_user_id=EXCLUDED.updated_by_sys_user_id,updated_at=now()`,
      [plantId, operation, nextRevision, JSON.stringify(after.adjustments), JSON.stringify(after.coverages), request.principal!.sysUserId]);
      await transaction.execute(`INSERT INTO monitor_rotation_calendar_state_audit
        (plant_id,operation_name,revision,before_value,after_value,changed_by_sys_user_id)
        VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6)`, [plantId, operation, nextRevision, before ? JSON.stringify(before) : null, JSON.stringify(after), request.principal!.sysUserId]);
      return { snapshot: { operation, revision: nextRevision, ...after } } as const;
    });
    if ("conflict" in result) return reply.code(409).send({ error: "rotation_calendar_revision_conflict", revision: result.conflict });
    await options.onChanged?.(plantId, operation);
    return result.snapshot;
  });

  app.put<{ Params: { operation: string; id: string }; Body: RotationException }>("/api/roster/rotation/:operation/exceptions/:id", {
    ...guard, schema: { body: RotationExceptionSchema },
  }, async (request, reply) => {
    const operation = decodeURIComponent(request.params.operation);
    if (!await authorizedOperation(request, reply, operation)) return reply;
    const exception = request.body;
    if (exception.id !== request.params.id || exception.operation !== operation || exception.endDate < exception.startDate) {
      return reply.code(400).send({ error: "invalid_rotation_exception" });
    }
    const plantId = request.principal!.plantIds[0]!;
    const assignment = await options.database.queryOne("SELECT id FROM monitor_roster_assignment WHERE id=$1 AND plant_id=$2", [exception.workerId, plantId]);
    if (!assignment.id) return reply.code(400).send({ error: "unknown_roster_assignment" });
    const overlap = await options.database.queryOne(`SELECT id FROM monitor_rotation_exception WHERE plant_id=$1 AND operation_name=$2
      AND assignment_id=$3 AND id<>$4 AND valid_from<=$6 AND valid_to>=$5 LIMIT 1`,
    [plantId, operation, exception.workerId, exception.id, exception.startDate, exception.endDate]);
    if (overlap.id) return reply.code(409).send({ error: "rotation_exception_conflict", conflictingId: overlap.id });
    const before = await options.database.queryOne("SELECT to_jsonb(e) AS value FROM monitor_rotation_exception e WHERE id=$1", [exception.id]);
    const target = { groupId: exception.groupId, groupName: exception.groupName, scheduleId: exception.scheduleId,
      customScheduleName: exception.customScheduleName, customStart: exception.customStart, customEnd: exception.customEnd };
    await options.database.transaction(async (transaction) => {
      await transaction.execute(`INSERT INTO monitor_rotation_exception
        (id,plant_id,operation_name,assignment_id,kind,valid_from,valid_to,target,created_by_sys_user_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9) ON CONFLICT (id) DO UPDATE SET kind=EXCLUDED.kind,
        valid_from=EXCLUDED.valid_from,valid_to=EXCLUDED.valid_to,target=EXCLUDED.target,updated_at=now()`,
      [exception.id, plantId, operation, exception.workerId, exception.kind, exception.startDate, exception.endDate,
        JSON.stringify(target), request.principal!.sysUserId]);
      await transaction.execute(`INSERT INTO monitor_rotation_exception_audit
        (exception_id,plant_id,action,before_value,after_value,changed_by_sys_user_id)
        VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6)`, [exception.id, plantId, before.value ? "updated" : "created",
        before.value ? JSON.stringify(before.value) : null, JSON.stringify(exception), request.principal!.sysUserId]);
    });
    await options.onChanged?.(plantId, operation);
    return exception;
  });

  app.delete<{ Params: { operation: string; id: string } }>("/api/roster/rotation/:operation/exceptions/:id", guard, async (request, reply) => {
    const operation = decodeURIComponent(request.params.operation);
    if (!await authorizedOperation(request, reply, operation)) return reply;
    const plantId = request.principal!.plantIds[0]!;
    const before = await options.database.queryOne("SELECT to_jsonb(e) AS value FROM monitor_rotation_exception e WHERE id=$1 AND plant_id=$2 AND operation_name=$3", [request.params.id, plantId, operation]);
    if (!before.value) return reply.code(404).send({ error: "rotation_exception_not_found" });
    await options.database.transaction(async (transaction) => {
      await transaction.execute("DELETE FROM monitor_rotation_exception WHERE id=$1", [request.params.id]);
      await transaction.execute(`INSERT INTO monitor_rotation_exception_audit
        (exception_id,plant_id,action,before_value,after_value,changed_by_sys_user_id)
        VALUES ($1,$2,'removed',$3::jsonb,NULL,$4)`, [request.params.id, plantId, JSON.stringify(before.value), request.principal!.sysUserId]);
    });
    await options.onChanged?.(plantId, operation);
    return reply.code(204).send();
  });
}
