import type { DatabaseRuntime } from "@monitor/database";
import type { DetectionScheduler, ExperimentFrequencies, ExperimentSpeed, ScenarioCase, ScenarioCorrection, ScenarioExperimentRepository, ScenarioExperimentRuntime, ScenarioFault, ScenarioPopulation, ScenarioSource, SourceActionContractRegistry } from "@monitor/detection";
import type { DetectionQueryDefinition, DetectionSourceAdapter } from "@monitor/detection";
import type { FastifyInstance, FastifyReply } from "fastify";
import { ScenarioSourceActionError, ScenarioSourceActionService } from "../scenario-source-action-service.js";

type ScenarioCode = "A02" | "A03" | "A05";
const codes: ScenarioCode[] = ["A02", "A03", "A05"];
const validFrequencies = (value: unknown): value is ExperimentFrequencies => Boolean(value) && typeof value === "object"
  && codes.every((code) => Number.isInteger((value as Record<string, unknown>)[code]) && Number((value as Record<string, unknown>)[code]) > 0);

const scenarioCode = (value: string, reply: FastifyReply): ScenarioCode | null => {
  if (codes.includes(value as ScenarioCode)) return value as ScenarioCode;
  reply.code(404).send({ error: "unknown_scenario_rule" });
  return null;
};

export async function scenarioRoutes(app: FastifyInstance, options: {
  database: DatabaseRuntime;
  source: ScenarioSource;
  sourceActionContracts: SourceActionContractRegistry;
  scheduler: DetectionScheduler;
  runtime: ScenarioExperimentRuntime;
  experiments: ScenarioExperimentRepository;
  registry: Map<ScenarioCode, { query: DetectionQueryDefinition; adapter: DetectionSourceAdapter }>;
}): Promise<void> {
  const sourceActionService = new ScenarioSourceActionService(options.source, options.sourceActionContracts);
  const status = async (code: ScenarioCode) => {
    const source = await options.source.status(code);
    const entry = options.registry.get(code)!;
    const poll = await options.database.queryOne(`SELECT status,source_revision AS "sourceRevision",complete,full_evaluation AS "fullEvaluation",error_code AS "errorCode",
      finished_at AS "finishedAt" FROM monitor_poll_cycle WHERE query_id=$1 ORDER BY finished_at DESC LIMIT 1`, [entry.query.queryId]);
    const incident = await options.database.queryOne(`SELECT id,lifecycle,occurrence,opened_at AS "openedAt",resolved_at AS "resolvedAt",updated_at AS "updatedAt"
      FROM monitor_incident WHERE rule_code=$1 ORDER BY occurrence DESC LIMIT 1`, [code]);
    const totals = await options.database.queryOne(`SELECT COUNT(*)::int AS "incidentCount",
      COUNT(*) FILTER (WHERE lifecycle='open')::int AS "openIncidentCount"
      FROM monitor_incident WHERE rule_code=$1`, [code]);
    const downstream = incident.id ? await options.database.queryOne(`SELECT
      (SELECT COUNT(*)::int FROM monitor_incident_evidence WHERE incident_id=$1) AS "evidenceCount",
      (SELECT COUNT(*)::int FROM monitor_routing_decision WHERE incident_id=$1) AS "routingDecisionCount",
      (SELECT COUNT(*)::int FROM monitor_notification_delivery WHERE incident_id=$1) AS "routingDeliveryCount",
      (SELECT COUNT(*)::int FROM monitor_conversation_incident WHERE incident_id=$1) AS "conversationLinkCount",
      (SELECT COUNT(*)::int FROM monitor_message WHERE client_command_id=$2) AS "alertMessageCount",
      (SELECT primary_role FROM monitor_routing_decision WHERE incident_id=$1 ORDER BY evaluated_at DESC LIMIT 1) AS "primaryRole"`,
    [incident.id, `incident:${incident.id}`]) : {};
    const change = incident.id ? await options.database.queryOne("SELECT cursor FROM monitor_change_event WHERE payload->>'incidentId'=$1 ORDER BY cursor DESC LIMIT 1", [incident.id]) : {};
    const actionAt = Date.parse(source.sourceChangedAt);
    const sourceChangePending = poll.status !== "healthy" || String(poll.sourceRevision ?? "") !== source.sourceRevision;
    const sourceTriggered = source.sourceState.evaluation.status === "triggered";
    const pendingFailure = Boolean(source.pendingFault);
    const currentLifecycle = incident.id ? String(incident.lifecycle) : null;
    const detectedAt = incident.id
      ? Date.parse(String(currentLifecycle === "resolved" ? incident.resolvedAt ?? incident.updatedAt : incident.updatedAt))
      : Number.NaN;
    const nextLifecycle = pendingFailure ? currentLifecycle : sourceTriggered ? "open" : currentLifecycle === "open" ? "resolved" : currentLifecycle;
    const currentOccurrence = incident.id ? Number(incident.occurrence) : 0;
    const expectedOccurrence = nextLifecycle === "open" && currentLifecycle !== "open" ? currentOccurrence + 1 : currentOccurrence || null;
    const expectedIncidentCount = expectedOccurrence ?? 0;
    const expectedOpenCount = nextLifecycle === "open" ? 1 : 0;
    const expectedDownstreamCount = expectedOccurrence ? 1 : 0;
    const expectedAction = pendingFailure
      ? "El siguiente sondeo fallará o quedará incompleto y debe conservar el estado actual de Monitor."
      : sourceTriggered && currentLifecycle === "open"
        ? sourceChangePending
          ? "El siguiente sondeo exitoso debe conservar la misma ocurrencia y registrar solo cualquier cambio significativo de evidencia, sin duplicar entregas ni tarjetas."
          : "El siguiente sondeo exitoso debe conservar la misma ocurrencia abierta sin duplicar evidencia ni entregas."
        : sourceTriggered
          ? "El siguiente sondeo exitoso debe crear una sola ocurrencia abierta, enrutarla y publicar una sola tarjeta en conversación."
          : currentLifecycle === "open"
            ? "El siguiente sondeo exitoso debe resolver la ocurrencia abierta y retirar la alerta de las vistas abiertas."
            : "El siguiente sondeo exitoso no debe crear una alerta ni modificar el historial resuelto."
    const actualMonitor = {
      latestIncident: incident.id ? incident : null,
      incidentCount: Number(totals.incidentCount ?? 0),
      openIncidentCount: Number(totals.openIncidentCount ?? 0),
      evidenceCount: Number(downstream.evidenceCount ?? 0),
      routingDecisionCount: Number(downstream.routingDecisionCount ?? 0),
      routingDeliveryCount: Number(downstream.routingDeliveryCount ?? 0),
      conversationLinkCount: Number(downstream.conversationLinkCount ?? 0),
      alertMessageCount: Number(downstream.alertMessageCount ?? 0),
      primaryRole: downstream.primaryRole ? String(downstream.primaryRole) : null,
    };
    const mismatches: string[] = [];
    if (!sourceChangePending && !pendingFailure) {
      if ((actualMonitor.latestIncident?.lifecycle ?? null) !== nextLifecycle) mismatches.push("incident_lifecycle");
      if (actualMonitor.incidentCount !== expectedIncidentCount) mismatches.push("incident_count");
      if (actualMonitor.openIncidentCount !== expectedOpenCount) mismatches.push("open_incident_count");
      if (expectedDownstreamCount && actualMonitor.routingDecisionCount < 1) mismatches.push("routing_decision_missing");
      if (actualMonitor.conversationLinkCount !== expectedDownstreamCount) mismatches.push("conversation_link_count");
      if (actualMonitor.alertMessageCount !== expectedDownstreamCount) mismatches.push("alert_message_count");
    }
    return {
      ...source,
      supportedCases: options.source.supportedCases(code),
      pollerState: { pendingFault: source.pendingFault, latestPoll: poll.status ? poll : null },
      expectedResult: {
        sourceCondition: source.sourceState.evaluation.status,
        reasons: source.sourceState.evaluation.reasons,
        awaitingPoll: sourceChangePending || pendingFailure,
        nextPoll: expectedAction,
        incidentLifecycle: nextLifecycle,
        occurrence: expectedOccurrence,
        expectedCounts: {
          incidents: expectedIncidentCount,
          openIncidents: expectedOpenCount,
          conversationLinks: expectedDownstreamCount,
          alertMessages: expectedDownstreamCount,
        },
        dashboard: nextLifecycle === "open" ? "Una sola tarjeta abierta para esta condición." : "Ninguna tarjeta abierta para esta condición.",
        conversation: pendingFailure
          ? currentLifecycle === "open"
            ? "La conversación y su tarjeta existentes se conservan porque el sondeo no puede cambiar el estado."
            : "El sondeo no agrega conversaciones ni tarjetas porque la lectura falla o queda incompleta."
          : sourceTriggered
            ? currentLifecycle === "open" ? "La conversación y su tarjeta existentes se conservan sin duplicados." : "Una sola tarjeta de alerta se agrega después del enrutamiento."
            : currentLifecycle === "open" ? "La conversación queda sin esta alerta abierta y entra en su ventana de escritura." : "No se agrega ningún mensaje de alerta.",
      },
      actualMonitor,
      comparison: { matches: !sourceChangePending && !pendingFailure && mismatches.length === 0, mismatches },
      latestChangeCursor: change.cursor ? Number(change.cursor) : null,
      detectionDelayMilliseconds: Number.isFinite(actionAt) && Number.isFinite(detectedAt) && detectedAt >= actionAt ? detectedAt - actionAt : null,
    };
  };

  const all = async () => Promise.all(codes.map(status));
  const guard = { preHandler: app.requireScopes(["monitor:admin"]) };

  app.get("/api/dev/scenarios", guard, async () => ({ scenarios: await all() }));

  app.get("/api/dev/scenario-runtime", guard, async () => options.runtime.status());
  app.get<{ Querystring: { cursor?: string; limit?: string } }>("/api/dev/scenario-experiments", guard, async (request, reply) => {
    const limit = request.query.limit === undefined ? 20 : Number(request.query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) return reply.code(400).send({ error: "invalid_scenario_history_limit" });
    try { return await options.experiments.list({ limit, ...(request.query.cursor ? { cursor: request.query.cursor } : {}) }); }
    catch (error) {
      if (error instanceof Error && error.message === "invalid_scenario_history_cursor") return reply.code(400).send({ error: error.message });
      throw error;
    }
  });
  app.get<{ Params: { id: string }; Querystring: { snapshotCursor?: string; resultCursor?: string } }>("/api/dev/scenario-experiments/:id", guard, async (request, reply) => {
    try {
      const [history, events] = await Promise.all([
        options.experiments.history(request.params.id, {
          snapshots: { limit: 50, ...(request.query.snapshotCursor ? { cursor: request.query.snapshotCursor } : {}) },
          results: { limit: 50, ...(request.query.resultCursor ? { cursor: request.query.resultCursor } : {}) },
        }),
        options.experiments.runtimeEvents(request.params.id),
      ]);
      return { ...history, events };
    } catch (error) {
      if (error instanceof Error && error.message === "scenario_experiment_not_found") return reply.code(404).send({ error: error.message });
      if (error instanceof Error && error.message === "invalid_scenario_history_cursor") return reply.code(400).send({ error: error.message });
      throw error;
    }
  });
  app.post<{ Body: { name?: unknown; businessTime?: unknown; frequencies?: unknown; runId?: unknown; manifestVersion?: unknown } }>("/api/dev/scenario-runtime", guard, async (request, reply) => {
    const body = request.body ?? {};
    const frequencies = body.frequencies;
    if (typeof body.name !== "string" || typeof body.runId !== "string" || typeof body.manifestVersion !== "string"
      || typeof body.businessTime !== "string" || !validFrequencies(frequencies)) {
      return reply.code(400).send({ error: "invalid_scenario_experiment" });
    }
    try {
      return await options.runtime.create({
        name: body.name,
        businessTime: body.businessTime,
        frequencies,
        identity: {
          runId: body.runId,
          manifestVersion: body.manifestVersion,
          sourceActionContractVersion: options.sourceActionContracts.contractVersion,
        },
      });
    } catch (error) {
      if (error instanceof Error && ["invalid_scenario_experiment", "invalid_scenario_frequency"].includes(error.message)) return reply.code(400).send({ error: error.message });
      throw error;
    }
  });
  app.put<{ Params: { id: string }; Body: { speed?: unknown; frequencies?: unknown } }>("/api/dev/scenario-runtime/:id/config", guard, async (request, reply) => {
    if (!validFrequencies(request.body?.frequencies)) return reply.code(400).send({ error: "invalid_scenario_frequency" });
    try {
      return await options.runtime.configure(request.params.id, Number(request.body?.speed) as ExperimentSpeed, request.body.frequencies);
    } catch (error) {
      if (error instanceof Error && ["invalid_scenario_speed", "invalid_scenario_frequency"].includes(error.message)) return reply.code(400).send({ error: error.message });
      if (error instanceof Error && ["scenario_experiment_not_active", "scenario_experiment_not_found"].includes(error.message)) return reply.code(404).send({ error: error.message });
      throw error;
    }
  });
  app.post<{ Params: { id: string }; Body: { paused?: unknown } }>("/api/dev/scenario-runtime/:id/pause", guard, async (request, reply) => {
    if (typeof request.body?.paused !== "boolean") return reply.code(400).send({ error: "invalid_scenario_pause" });
    try { return await options.runtime.pause(request.params.id, request.body.paused); }
    catch (error) {
      if (error instanceof Error && ["scenario_experiment_not_active", "scenario_experiment_not_found"].includes(error.message)) return reply.code(404).send({ error: error.message });
      throw error;
    }
  });
  app.post<{ Params: { id: string }; Body: { minutes?: unknown } }>("/api/dev/scenario-runtime/:id/advance", guard, async (request, reply) => {
    const minutes = Number(request.body?.minutes);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 24 * 60) return reply.code(400).send({ error: "invalid_scenario_advance" });
    try { return await options.runtime.advance(request.params.id, minutes); }
    catch (error) {
      if (error instanceof Error && ["scenario_experiment_not_active", "scenario_experiment_not_found"].includes(error.message)) return reply.code(404).send({ error: error.message });
      throw error;
    }
  });

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
  app.post<{ Params: { code: string }; Body: { scenario?: unknown } }>("/api/dev/scenarios/:code/prepare", guard, async (request, reply) => {
    const code = scenarioCode(request.params.code, reply);
    if (!code) return reply;
    const scenario = String(request.body?.scenario ?? "");
    if (!options.source.supportedCases(code).includes(scenario as ScenarioCase)) return reply.code(400).send({ error: "invalid_scenario_case" });
    try { await options.source.prepare(code, scenario); }
    catch (error) {
      if (error instanceof Error && ["movement_terminal", "work_order_closed", "consumption_already_recorded", "source_lifecycle_recurrence_unsupported"].includes(error.message)) return reply.code(409).send({ error: error.message });
      throw error;
    }
    return status(code);
  });
  app.post<{ Params: { code: string }; Body: { population?: unknown; keys?: unknown } }>("/api/dev/scenarios/:code/prepare-population", guard, async (request, reply) => {
    const code = scenarioCode(request.params.code, reply);
    if (!code) return reply;
    const population = String(request.body?.population ?? "") as ScenarioPopulation;
    const keys = request.body?.keys;
    if (!Array.isArray(keys) || !keys.every((key) => Number.isSafeInteger(key) && Number(key) > 0) || new Set(keys).size !== keys.length
      || (code === "A02" ? population !== "a02_mixed" || keys.length !== 3 : code === "A03" ? population !== "a03_mixed" || keys.length !== 4 : true)) {
      return reply.code(400).send({ error: "invalid_scenario_population" });
    }
    if (!options.source.preparePopulation) return reply.code(501).send({ error: "scenario_population_unavailable" });
    try { await options.source.preparePopulation(code, population, keys.map(Number)); }
    catch (error) {
      if (error instanceof Error && error.message === "scenario_population_fixture_unavailable") return reply.code(404).send({ error: error.message });
      throw error;
    }
    return status(code);
  });
  app.post<{ Params: { code: string }; Body: { fault?: unknown } }>("/api/dev/scenarios/:code/inject-monitor-fault", guard, async (request, reply) => {
    const code = scenarioCode(request.params.code, reply);
    if (!code) return reply;
    if (request.body?.fault !== "missing_open_incident_downstream") return reply.code(400).send({ error: "invalid_monitor_fault" });
    const incident = await options.database.queryOne("SELECT id FROM monitor_incident WHERE rule_code=$1 AND lifecycle='open' ORDER BY occurrence DESC LIMIT 1", [code]);
    if (!incident.id) return reply.code(409).send({ error: "open_incident_unavailable" });
    await options.database.transaction(async (transaction) => {
      await transaction.execute("DELETE FROM monitor_conversation_incident WHERE incident_id=$1", [incident.id]);
      await transaction.execute("DELETE FROM monitor_message WHERE client_command_id=$1", [`incident:${incident.id}`]);
    });
    return { fault: request.body.fault, incidentId: incident.id, scenario: await status(code) };
  });
  app.post<{ Params: { code: string }; Body: { correction?: unknown } }>("/api/dev/scenarios/:code/correct", guard, async (request, reply) => {
    const code = scenarioCode(request.params.code, reply);
    if (!code) return reply;
    if (options.source.sourceAction) return reply.code(410).send({ error: "source_action_endpoint_replaced" });
    const correction = String(request.body?.correction ?? "both");
    if (!["weigh", "move", "both"].includes(correction)) return reply.code(400).send({ error: "invalid_scenario_correction" });
    if (code !== "A05" && correction !== "both") return reply.code(400).send({ error: "invalid_scenario_correction" });
    try { await options.source.correct(code, correction as ScenarioCorrection); }
    catch (error) {
      if (error instanceof Error && error.message === "work_order_closed") return reply.code(409).send({ error: error.message });
      throw error;
    }
    return status(code);
  });
  app.post<{ Params: { code: string }; Body: { minutes?: unknown } }>("/api/dev/scenarios/:code/advance-time", guard, async (request, reply) => {
    const code = scenarioCode(request.params.code, reply);
    if (!code) return reply;
    const minutes = Number(request.body?.minutes ?? 31);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) return reply.code(400).send({ error: "invalid_advance_minutes" });
    const active = await options.runtime.status();
    if (active.experiment) await options.runtime.advance(active.experiment.id, minutes);
    else await options.source.advanceTime(code, minutes);
    return status(code);
  });
  app.post<{ Params: { code: string }; Body: { fault?: unknown } }>("/api/dev/scenarios/:code/fail-next-poll", guard, async (request, reply) => {
    const code = scenarioCode(request.params.code, reply);
    if (!code) return reply;
    const fault = request.body?.fault;
    if (!["timeout", "source_error", "partial", "invalid_schema", "partial_pagination", "duplicate_keys", "revision_change", "stale", "unknown_freshness"].includes(String(fault))) return reply.code(400).send({ error: "invalid_scenario_fault" });
    await options.source.failNextPoll(code, fault as ScenarioFault);
    return status(code);
  });
  app.post<{ Params: { code: string } }>("/api/dev/scenarios/:code/poll", guard, async (request, reply) => {
    const code = scenarioCode(request.params.code, reply);
    if (!code) return reply;
    const entry = options.registry.get(code)!;
    const result = await options.runtime.executeSerialized(() => options.scheduler.runScheduled(entry.query, entry.adapter));
    return { result, scenario: await status(code) };
  });
  app.post<{ Params: { code: string } }>("/api/dev/scenarios/:code/recur", guard, async (request, reply) => {
    const code = scenarioCode(request.params.code, reply);
    if (!code) return reply;
    try { await options.source.recur(code); }
    catch (error) {
      if (error instanceof Error && ["recurrence_requires_resolved_incident", "source_lifecycle_recurrence_unsupported"].includes(error.message)) return reply.code(409).send({ error: error.message });
      throw error;
    }
    return status(code);
  });
  app.post<{ Body: unknown }>("/api/dev/source-actions", guard, async (request, reply) => {
    try {
      const execution = await options.runtime.executeBeforeSourceAction(() => sourceActionService.execute(request.body, request.principal!));
      return { execution, scenario: await status(execution.ruleCode) };
    } catch (error) {
      if (error instanceof ScenarioSourceActionError) return reply.code(error.statusCode).send({ error: error.message });
      throw error;
    }
  });
  app.post<{ Params: { code: string }; Body: { action?: unknown; key?: unknown } }>("/api/dev/scenarios/:code/source-action", guard, async (request, reply) => {
    if (!scenarioCode(request.params.code, reply)) return reply;
    return reply.code(410).send({ error: "source_action_endpoint_replaced" });
  });
}
