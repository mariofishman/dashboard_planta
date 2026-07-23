import type { DatabaseRuntime } from "@monitor/database";
import type { DetectionRunner, ScenarioFault, ScenarioSourceRepository } from "@monitor/detection";
import type { DetectionQueryDefinition, DetectionSourceAdapter } from "@monitor/detection";
import type { FastifyInstance, FastifyReply } from "fastify";

type ScenarioCode = "A02" | "A03" | "A05";
const codes: ScenarioCode[] = ["A02", "A03", "A05"];

const scenarioCode = (value: string, reply: FastifyReply): ScenarioCode | null => {
  if (codes.includes(value as ScenarioCode)) return value as ScenarioCode;
  reply.code(404).send({ error: "unknown_scenario_rule" });
  return null;
};

export async function scenarioRoutes(app: FastifyInstance, options: {
  database: DatabaseRuntime;
  source: ScenarioSourceRepository;
  runner: DetectionRunner;
  registry: Map<ScenarioCode, { query: DetectionQueryDefinition; adapter: DetectionSourceAdapter }>;
}): Promise<void> {
  const status = async (code: ScenarioCode) => {
    const source = await options.source.status(code);
    const entry = options.registry.get(code)!;
    const poll = await options.database.queryOne(`SELECT status,complete,full_evaluation AS "fullEvaluation",error_code AS "errorCode",
      finished_at AS "finishedAt" FROM monitor_poll_cycle WHERE query_id=$1 ORDER BY finished_at DESC LIMIT 1`, [entry.query.queryId]);
    const incident = await options.database.queryOne(`SELECT id,lifecycle,occurrence,opened_at AS "openedAt",resolved_at AS "resolvedAt",updated_at AS "updatedAt"
      FROM monitor_incident WHERE rule_code=$1 ORDER BY occurrence DESC LIMIT 1`, [code]);
    const change = await options.database.queryOne("SELECT cursor FROM monitor_change_event WHERE scope_type='plant' AND scope_id='1' ORDER BY cursor DESC LIMIT 1");
    const actionAt = Date.parse(source.lastActionAt);
    const detectedAt = incident.openedAt ? Date.parse(String(incident.openedAt)) : Number.NaN;
    return {
      ...source,
      latestPoll: poll.status ? poll : null,
      incident: incident.id ? incident : null,
      latestChangeCursor: change.cursor ? Number(change.cursor) : null,
      detectionDelayMilliseconds: Number.isFinite(actionAt) && Number.isFinite(detectedAt) && detectedAt >= actionAt ? detectedAt - actionAt : null,
    };
  };

  const all = async () => Promise.all(codes.map(status));
  const guard = { preHandler: app.requireScopes(["monitor:admin"]) };

  app.get("/api/dev/scenarios", guard, async () => ({ scenarios: await all() }));

  app.post<{ Params: { code: string } }>("/api/dev/scenarios/:code/reset", guard, async (request, reply) => {
    const code = scenarioCode(request.params.code, reply);
    if (!code) return reply;
    await options.source.reset(code);
    return status(code);
  });
  app.post<{ Params: { code: string } }>("/api/dev/scenarios/:code/trigger", guard, async (request, reply) => {
    const code = scenarioCode(request.params.code, reply);
    if (!code) return reply;
    await options.source.trigger(code);
    return status(code);
  });
  app.post<{ Params: { code: string } }>("/api/dev/scenarios/:code/correct", guard, async (request, reply) => {
    const code = scenarioCode(request.params.code, reply);
    if (!code) return reply;
    await options.source.correct(code);
    return status(code);
  });
  app.post<{ Params: { code: string }; Body: { minutes?: unknown } }>("/api/dev/scenarios/:code/advance-time", guard, async (request, reply) => {
    const code = scenarioCode(request.params.code, reply);
    if (!code) return reply;
    const minutes = Number(request.body?.minutes ?? 31);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) return reply.code(400).send({ error: "invalid_advance_minutes" });
    await options.source.advanceTime(code, minutes);
    return status(code);
  });
  app.post<{ Params: { code: string }; Body: { fault?: unknown } }>("/api/dev/scenarios/:code/fail-next-poll", guard, async (request, reply) => {
    const code = scenarioCode(request.params.code, reply);
    if (!code) return reply;
    const fault = request.body?.fault;
    if (!["timeout", "source_error", "partial", "invalid_schema"].includes(String(fault))) return reply.code(400).send({ error: "invalid_scenario_fault" });
    await options.source.failNextPoll(code, fault as ScenarioFault);
    return status(code);
  });
  app.post<{ Params: { code: string } }>("/api/dev/scenarios/:code/poll", guard, async (request, reply) => {
    const code = scenarioCode(request.params.code, reply);
    if (!code) return reply;
    const entry = options.registry.get(code)!;
    const result = await options.runner.run(entry.query, entry.adapter);
    return { result, scenario: await status(code) };
  });
}
