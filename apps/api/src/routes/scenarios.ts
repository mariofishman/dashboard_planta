import type { DatabaseRuntime } from "@monitor/database";
import type { DetectionScheduler, ScenarioCase, ScenarioCorrection, ScenarioExperimentRepository, ScenarioExperimentRuntime, ScenarioFault, ScenarioPopulation, ScenarioSource, SourceActionContractRegistry } from "@monitor/detection";
import type { DetectionQueryDefinition, DetectionSourceAdapter } from "@monitor/detection";
import type { FastifyInstance, FastifyReply } from "fastify";
import { ScenarioSourceActionError, ScenarioSourceActionService } from "../scenario-source-action-service.js";

type ScenarioCode = "A02" | "A03" | "A05";
const codes: ScenarioCode[] = ["A02", "A03", "A05"];
const validPollingFrequency = (value: unknown): value is number => Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 99;
const validSecondsPerMinute = (value: unknown): value is number => Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 60;

const recordKey = (code: ScenarioCode, row: Record<string, unknown>): number => Number(
  code === "A02" ? row.materialFlowDetailId : code === "A03" ? row.workOrderId : row.articleSerialId,
);

const recordReasons = (code: ScenarioCode, row: Record<string, unknown>): string[] => {
  if (code === "A02") return row.isWorkOrderReservation === true && row.state === "TRANSITO" && row.receivedAt === null && Number(row.elapsedMinutes) >= 30 ? ["not_received"] : [];
  if (code === "A03") return row.active === true && Number(row.elapsedMinutes) >= 15 && Number(row.consumptionCount) === 0 ? ["no_first_consumption"] : [];
  if (Number(row.declaredAgeMinutes) < 30) return [];
  return [...(row.weighed === false ? ["not_weighed"] : []), ...(row.sourceWorkOrderFinished === true && row.movedFromMachine === false ? ["still_at_machine"] : [])];
};

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
    const activeRuntime = await options.experiments.activeRuntime();
    const runtimeEvents = activeRuntime.experiment ? await options.experiments.runtimeEvents(activeRuntime.experiment.id) : [];
    const latestSuccessfulPollAt = runtimeEvents
      .filter((event) => event.ruleCode === code && event.eventType === "poll_completed")
      .at(-1)?.recordedAt;
    const pendingRecordKeys = new Set<number>();
    for (const event of runtimeEvents.filter((candidate) => candidate.ruleCode === code && candidate.eventType === "source_action"
      && (!latestSuccessfulPollAt || Date.parse(candidate.recordedAt) > Date.parse(latestSuccessfulPollAt)))) {
      const actionId = String(event.payload.actionId ?? "");
      const naturalKeyValue = Number((event.payload.naturalKey as Record<string, unknown> | undefined)?.value);
      if (actionId !== "a02.prepare_dispatch" && Number.isSafeInteger(naturalKeyValue)) pendingRecordKeys.add(naturalKeyValue);
      const changes = (event.payload.sourceDiff as Record<string, unknown> | undefined)?.changes;
      if (Array.isArray(changes)) for (const change of changes) {
        if (!change || typeof change !== "object") continue;
        const item = change as Record<string, unknown>;
        const primaryTable = code === "A02" ? "flujo_materiales_detalles" : code === "A03" ? "ordenes_trabajo" : "articulo_serial";
        const key = Number(item.key);
        if (item.table === primaryTable && Number.isSafeInteger(key)) pendingRecordKeys.add(key);
      }
    }
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
    const records = await Promise.all(source.sourceState.rows.map(async (row) => {
      const key = recordKey(code, row);
      if (!Number.isSafeInteger(key) || key < 1) throw new Error(`invalid_scenario_record_key:${code}`);
      const reasons = recordReasons(code, row);
      const sourceTriggeredForRecord = reasons.length > 0;
      const recordIncident = await options.database.queryOne(`SELECT id,lifecycle,occurrence,opened_at AS "openedAt",resolved_at AS "resolvedAt",updated_at AS "updatedAt"
        FROM monitor_incident WHERE rule_code=$1 AND condition_key=$2 ORDER BY occurrence DESC LIMIT 1`, [code, String(key)]);
      const recordLifecycle = recordIncident.id ? String(recordIncident.lifecycle) : null;
      const expectedLifecycle = pendingFailure ? recordLifecycle : sourceTriggeredForRecord ? "open" : recordLifecycle === "open" ? "resolved" : recordLifecycle;
      const recordDownstream = recordIncident.id ? await options.database.queryOne(`SELECT
        (SELECT COUNT(*)::int FROM monitor_incident_evidence WHERE incident_id=$1) AS "evidenceCount",
        (SELECT COUNT(*)::int FROM monitor_notification_delivery WHERE incident_id=$1) AS "deliveryCount",
        (SELECT COUNT(*)::int FROM monitor_conversation_incident WHERE incident_id=$1) AS "conversationCount",
        (SELECT COUNT(*)::int FROM monitor_message WHERE client_command_id=$2) AS "messageCount"`, [recordIncident.id, `incident:${recordIncident.id}`]) : {};
      const [recordDeliveries, recordConversations, recordMessages] = recordIncident.id ? await Promise.all([
        options.database.queryAll(`SELECT id,recipient_name AS "recipientName",channel,state,sent_at AS "sentAt" FROM monitor_notification_delivery WHERE incident_id=$1 ORDER BY recipient_key`, [recordIncident.id]),
        options.database.queryAll(`SELECT conversation_id AS id FROM monitor_conversation_incident WHERE incident_id=$1 ORDER BY conversation_id`, [recordIncident.id]),
        options.database.queryAll(`SELECT id FROM monitor_message WHERE client_command_id=$1 ORDER BY cursor`, [`incident:${recordIncident.id}`]),
      ]) : [[], [], []];
      const recordChange = recordIncident.id ? await options.database.queryOne("SELECT cursor FROM monitor_change_event WHERE payload->>'incidentId'=$1 ORDER BY cursor DESC LIMIT 1", [recordIncident.id]) : {};
      const recordPendingPoll = pendingRecordKeys.has(key);
      const recordMismatches = !recordPendingPoll && !pendingFailure && recordLifecycle !== expectedLifecycle ? ["incident_lifecycle"] : [];
      return {
        key, row, pendingPoll: recordPendingPoll,
        expected: { triggered: sourceTriggeredForRecord, reasons, incidentLifecycle: expectedLifecycle },
        actual: {
          incident: recordIncident.id ? recordIncident : null,
          evidenceCount: Number(recordDownstream.evidenceCount ?? 0), deliveryCount: Number(recordDownstream.deliveryCount ?? 0),
          conversationCount: Number(recordDownstream.conversationCount ?? 0), messageCount: Number(recordDownstream.messageCount ?? 0),
          latestChangeCursor: recordChange.cursor ? Number(recordChange.cursor) : null,
          deliveries: recordDeliveries, conversationIds: recordConversations.map((item) => String(item.id)), messageIds: recordMessages.map((item) => String(item.id)),
          detectionDelayMilliseconds: recordIncident.id && Number.isFinite(actionAt) && Date.parse(String(recordIncident.openedAt)) >= actionAt ? Date.parse(String(recordIncident.openedAt)) - actionAt : null,
        },
        comparison: { matches: !recordPendingPoll && !pendingFailure && recordMismatches.length === 0, mismatches: recordMismatches },
      };
    }));
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
      records,
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
  app.get<{ Querystring: { code?: string; experimentId?: string; from?: string; to?: string; sku?: string; uniqueCode?: string; destination?: string; sourceState?: string; timingOutcome?: string; incidentOutcome?: string } }>("/api/dev/scenario-operational-history", guard, async (request, reply) => {
    const code = scenarioCode(String(request.query.code ?? ""), reply);
    if (!code) return reply;
    if ((request.query.from && !Number.isFinite(Date.parse(request.query.from))) || (request.query.to && !Number.isFinite(Date.parse(request.query.to)))) {
      return reply.code(400).send({ error: "invalid_scenario_history_time_filter" });
    }
    const events = await options.experiments.operationalEvents(code);
    const primaryTable = code === "A02" ? "flujo_materiales_detalles" : code === "A03" ? "ordenes_trabajo" : "articulo_serial";
    const records = new Map<string, Record<string, unknown>>();
    for (const event of [...events].reverse()) {
      const payload = event.payload;
      const actionId = String(payload.actionId ?? "");
      const diff = payload.sourceDiff as Record<string, unknown> | undefined;
      const after = Array.isArray(diff?.after) ? diff.after as Record<string, unknown>[] : [];
      const changedPrimaryKeys = Array.isArray(diff?.changes) ? [...new Set((diff.changes as Record<string, unknown>[])
        .filter((change) => change.table === primaryTable).map((change) => Number(change.key)).filter(Number.isSafeInteger))] : [];
      const naturalKey = Number((payload.naturalKey as Record<string, unknown> | undefined)?.value);
      const sourceKey = actionId === "a02.prepare_dispatch" ? changedPrimaryKeys.find((key) => key !== naturalKey) : naturalKey;
      if (!Number.isSafeInteger(sourceKey)) continue;
      const evidence = after.find((item) => item.table === primaryTable && Number(item.key) === sourceKey)?.values as Record<string, unknown> | undefined;
      const id = `${event.experimentId}:${sourceKey}`;
      const existing = records.get(id);
      const firstAt = String(existing?.firstAt ?? event.businessTime);
      const terminal = ["a02.receive", "a02.cancel", "a02.reject", "a03.record_first_consumption", "a03.close_work_order", "a03.cancel_work_order", "a05.register_movement", "a05.handoff_to_a02"].includes(actionId);
      const durationMinutes = terminal ? Math.max(0, Math.round((Date.parse(event.businessTime) - Date.parse(firstAt)) / 60_000)) : existing?.durationMinutes ?? null;
      const threshold = code === "A03" ? 15 : 30;
      records.set(id, {
        id, experimentId: event.experimentId, experimentName: event.experimentName, experimentStatus: event.experimentStatus,
        ruleCode: code, sourceKey, firstAt, lastAt: event.businessTime, recordedAt: event.recordedAt,
        actionIds: [...((existing?.actionIds as string[] | undefined) ?? []), actionId], eventCount: Number(existing?.eventCount ?? 0) + 1,
        input: payload.input ?? existing?.input ?? null, evidence: evidence ?? existing?.evidence ?? {},
        sourceState: evidence?.estado ?? evidence?.tipo ?? actionId, durationMinutes,
        timingOutcome: terminal ? (Number(durationMinutes) <= threshold ? "on_time" : "late") : "active",
        terminalOutcome: terminal ? actionId : null,
      });
    }
    const text = (value: unknown) => String(value ?? "").toLowerCase();
    const from = request.query.from ? Date.parse(request.query.from) : null;
    const to = request.query.to ? Date.parse(request.query.to) : null;
    const filtered = [] as Record<string, unknown>[];
    for (const record of records.values()) {
      const evidence = record.evidence as Record<string, unknown>;
      const sourceKey = String(record.sourceKey);
      const incident = await options.database.queryOne(`SELECT lifecycle FROM monitor_incident WHERE rule_code=$1 AND condition_key=$2 ORDER BY occurrence DESC LIMIT 1`, [code, sourceKey]);
      const item: Record<string, unknown> = { ...record, incidentOutcome: incident.lifecycle ? String(incident.lifecycle) : "none" };
      const input = (item.input && typeof item.input === "object" ? item.input : {}) as Record<string, unknown>;
      const exact = (query: string | undefined, values: unknown[]) => !query || values.some((value) => String(value ?? "").toLowerCase() === query.toLowerCase());
      if (request.query.experimentId && String(item.experimentId) !== request.query.experimentId
        && !String(item.experimentName).toLowerCase().includes(request.query.experimentId.toLowerCase())) continue;
      if (from !== null && Date.parse(String(item.firstAt)) < from) continue;
      if (to !== null && Date.parse(String(item.lastAt)) > to) continue;
      if (!exact(request.query.sku, [input.sku, evidence.id_articulo])) continue;
      if (!exact(request.query.uniqueCode, [input.uniqueCode, input.serialCode, evidence.codigo_serial, evidence.id_articulo_serial])) continue;
      if (!exact(request.query.destination, [input.destinationWarehouseId, evidence.id_almacen_destino])) continue;
      if (request.query.sourceState && text(item.sourceState) !== text(request.query.sourceState)) continue;
      if (request.query.timingOutcome && String(item.timingOutcome) !== request.query.timingOutcome) continue;
      if (request.query.incidentOutcome && String(item.incidentOutcome) !== request.query.incidentOutcome) continue;
      filtered.push(item);
    }
    filtered.sort((left, right) => Date.parse(String(right.lastAt)) - Date.parse(String(left.lastAt)));
    return { items: filtered };
  });
  app.post<{ Params: { id: string }; Body: { label?: unknown } }>("/api/dev/scenario-experiments/:id/snapshots", guard, async (request, reply) => {
    if (typeof request.body?.label !== "string" || !request.body.label.trim()) return reply.code(400).send({ error: "invalid_scenario_snapshot_label" });
    try {
      const [runtimeState, scenarioState] = await Promise.all([options.runtime.status(), all()]);
      if (runtimeState.experiment?.id !== request.params.id) return reply.code(409).send({ error: "scenario_experiment_not_active" });
      return await options.experiments.snapshot(request.params.id, request.body.label, {
        source: Object.fromEntries(scenarioState.map((item) => [item.ruleCode, { revision: item.sourceRevision, records: item.records.map((record) => ({ key: record.key, row: record.row })) }])),
        clock: { businessTime: runtimeState.experiment.businessTime, nextDue: runtimeState.experiment.nextDue },
        poll: Object.fromEntries(scenarioState.map((item) => [item.ruleCode, item.pollerState.latestPoll])),
        monitor: Object.fromEntries(scenarioState.map((item) => [item.ruleCode, item.records.map((record) => ({ key: record.key, actual: record.actual, comparison: record.comparison }))])),
      });
    } catch (error) {
      if (error instanceof Error && error.message === "scenario_experiment_not_found") return reply.code(404).send({ error: error.message });
      if (error instanceof Error && ["invalid_scenario_snapshot", "scenario_snapshot_label_conflict"].includes(error.message)) return reply.code(409).send({ error: error.message });
      throw error;
    }
  });
  app.post<{ Body: { name?: unknown; businessTime?: unknown; pollingFrequencyMinutes?: unknown; runId?: unknown; manifestVersion?: unknown } }>("/api/dev/scenario-runtime", guard, async (request, reply) => {
    const body = request.body ?? {};
    if (typeof body.name !== "string" || typeof body.runId !== "string" || typeof body.manifestVersion !== "string"
      || typeof body.businessTime !== "string" || !validPollingFrequency(body.pollingFrequencyMinutes)) {
      return reply.code(400).send({ error: "invalid_scenario_experiment" });
    }
    try {
      return await options.runtime.create({
        name: body.name,
        businessTime: body.businessTime,
        pollingFrequencyMinutes: body.pollingFrequencyMinutes,
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
  app.put<{ Params: { id: string }; Body: { secondsPerSimulatedMinute?: unknown; pollingFrequencyMinutes?: unknown } }>("/api/dev/scenario-runtime/:id/config", guard, async (request, reply) => {
    if (!validSecondsPerMinute(request.body?.secondsPerSimulatedMinute)) return reply.code(400).send({ error: "invalid_scenario_speed" });
    if (!validPollingFrequency(request.body?.pollingFrequencyMinutes)) return reply.code(400).send({ error: "invalid_scenario_frequency" });
    try {
      return await options.runtime.configure(request.params.id, request.body.secondsPerSimulatedMinute, request.body.pollingFrequencyMinutes);
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

  app.post<{ Params: { code: string } }>("/api/dev/test/scenarios/:code/reset", guard, async (request, reply) => {
    const code = scenarioCode(request.params.code, reply);
    if (!code) return reply;
    await options.source.reset(code);
    return status(code);
  });
  app.post<{ Params: { code: string } }>("/api/dev/test/scenarios/:code/trigger", guard, async (request, reply) => {
    const code = scenarioCode(request.params.code, reply);
    if (!code) return reply;
    await options.source.trigger(code);
    return status(code);
  });
  app.post<{ Params: { code: string }; Body: { scenario?: unknown } }>("/api/dev/test/scenarios/:code/prepare", guard, async (request, reply) => {
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
  app.post<{ Params: { code: string }; Body: { population?: unknown; keys?: unknown } }>("/api/dev/test/scenarios/:code/prepare-population", guard, async (request, reply) => {
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
  app.post<{ Params: { code: string }; Body: { correction?: unknown } }>("/api/dev/test/scenarios/:code/correct", guard, async (request, reply) => {
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
  app.post<{ Params: { code: string }; Body: { minutes?: unknown } }>("/api/dev/test/scenarios/:code/advance-time", guard, async (request, reply) => {
    const code = scenarioCode(request.params.code, reply);
    if (!code) return reply;
    const minutes = Number(request.body?.minutes ?? 31);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) return reply.code(400).send({ error: "invalid_advance_minutes" });
    const active = await options.runtime.status();
    if (active.experiment) await options.runtime.advance(active.experiment.id, minutes);
    else await options.source.advanceTime(code, minutes);
    return status(code);
  });
  app.post<{ Params: { code: string }; Body: { fault?: unknown } }>("/api/dev/test/scenarios/:code/fail-next-poll", guard, async (request, reply) => {
    const code = scenarioCode(request.params.code, reply);
    if (!code) return reply;
    const fault = request.body?.fault;
    if (!["timeout", "source_error", "partial", "invalid_schema", "partial_pagination", "duplicate_keys", "revision_change", "stale", "unknown_freshness"].includes(String(fault))) return reply.code(400).send({ error: "invalid_scenario_fault" });
    await options.source.failNextPoll(code, fault as ScenarioFault);
    return status(code);
  });
  app.post<{ Params: { code: string } }>("/api/dev/test/scenarios/:code/poll", guard, async (request, reply) => {
    const code = scenarioCode(request.params.code, reply);
    if (!code) return reply;
    const entry = options.registry.get(code)!;
    const result = await options.runtime.executeSerialized(() => options.scheduler.runScheduled(entry.query, entry.adapter));
    return { result, scenario: await status(code) };
  });
  app.post<{ Params: { code: string } }>("/api/dev/test/scenarios/:code/recur", guard, async (request, reply) => {
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
}
