import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test } from "node:test";
import { TestDatabaseConnections } from "@monitor/detection";
import { buildMonitorServer } from "../apps/api/src/server.js";
import {
  assertValidStage5CoreChain, captureStage5LaboratoryActions, captureStage5MonitorChain,
  captureStage5ReadChain, captureStage5SourceChain, createStage5ChainCapture,
} from "./lib/stage5-chain-capture.mjs";

const root = resolve(import.meta.dirname, "..");
const runtimeAvailable = existsSync(resolve(root, "local-data/test-database/state/ready"))
  && existsSync(resolve(root, "local-data/test-database/secrets/writer.host.cnf"));
const manager = { authorization: "Bearer mock:plant-manager" };

test("diagnostic connected rehearsal captures one authoritative source-to-Monitor chain", { skip: !runtimeAvailable }, async () => {
  const fixtures = JSON.parse(await readFile(resolve(root, "config/detection/fixtures/test-database-stage5.v1.json"), "utf8"));
  const manifest = JSON.parse(await readFile(resolve(root, "config/detection/stage5-connected-acceptance.v2.json"), "utf8"));
  const templateId = Number(fixtures.a02.downstream[0]);
  const connections = await TestDatabaseConnections.create(root);
  const server = await buildMonitorServer({ testDatabaseFixtureSeeds: { A02: templateId, A03: 1415, A05: 141084 }, config: {
    nodeEnv: "test", cookieSecret: "stage5-chain-connected-rehearsal-secret", allowMockAuth: true,
    enableScenarioLab: true, scenarioSource: "test_database", databaseMode: "pglite", pgliteDataDir: "memory://",
  } });
  let createdId: number | null = null;
  try {
    const acceptance = server.acceptance;
    assert.ok(acceptance);
    const runtime = await acceptance.runtime.create({
      name: "Diagnostic connected chain",
      businessTime: "2026-08-01T09:00:00.000Z",
      pollingFrequencyMinutes: 60,
      identity: {
        runId: "diagnostic-chain-rehearsal",
        manifestVersion: manifest.manifestVersion,
        sourceActionContractVersion: manifest.sourceActionContractVersion,
      },
    });
    assert.ok(runtime.experiment);
    const roster = await server.app.inject({ method: "PUT", url: "/api/roster/assignments", headers: manager, payload: { revision: 0, assignments: [
      { id: "manager", sysUserId: 9001, person: "María Torres", position: "Gerente de fábrica", operations: [], warehouseType: null, scope: "factory", group: null, validFrom: "2026-07-01", validTo: null, state: "active", setupComplete: true },
    ] } });
    assert.equal(roster.statusCode, 200, roster.body);
    const startedAt = new Date().toISOString();
    const actionResponse = await server.app.inject({ method: "POST", url: "/api/dev/source-actions", headers: manager, payload: { actionId: "a02.prepare_dispatch", key: templateId } });
    assert.equal(actionResponse.statusCode, 200, actionResponse.body);
    const execution = actionResponse.json().execution;
    execution.actionSequence = 1;
    createdId = Number(execution.sourceDiff.after.find((record: { key: number }) => Number(record.key) !== templateId)?.key);
    assert.ok(createdId > 0);
    acceptance.source.replaceTracked!("A02", [createdId]);
    await acceptance.runtime.pause(runtime.experiment.id, false);
    await acceptance.runtime.advance(runtime.experiment.id, 31);
    const poll = await server.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
    assert.equal(poll.statusCode, 200, poll.body);
    const polled = poll.json();
    assert.equal(polled.result.status, "healthy");

    const incident = await server.database.queryOne("SELECT id FROM monitor_incident WHERE rule_code='A02' ORDER BY opened_at DESC LIMIT 1");
    const incidentId = String(incident.id);
    const ids = async (sql: string, parameters: unknown[] = []) => (await server.database.queryAll(sql, parameters)).map(({ id }) => String(id));
    const conversationIds = await ids("SELECT conversation_id AS id FROM monitor_conversation_incident WHERE incident_id=$1", [incidentId]);
    const messageRows = conversationIds.length ? await server.database.queryAll("SELECT id,cursor FROM monitor_message WHERE conversation_id=$1 ORDER BY cursor", [conversationIds[0]]) : [];
    const query = server.acceptance!.registry.get("A02")!.query;
    const sourceRevision = String(polled.scenario.sourceRevision);
    const actionDefinition = manifest.actionDefinitions["a02.prepare_dispatch"];
    const capture = createStage5ChainCapture({ testId: "A02-01", group: "A02", experimentId: runtime.experiment.id, runId: "diagnostic-chain-rehearsal", manifestVersion: manifest.manifestVersion, sourceActionContractVersion: manifest.sourceActionContractVersion, startedAt });
    capture.recordSection("laboratoryActions", captureStage5LaboratoryActions(["a02.prepare_dispatch"], { "a02.prepare_dispatch": actionDefinition }, [{ sequence: 1, actionId: "a02.prepare_dispatch", businessTime: polled.scenario.scenarioClock.currentAt, auditTime: new Date().toISOString() }]));
    capture.recordSection("sourceChain", captureStage5SourceChain([execution], { finalSourceRevision: sourceRevision, unrelatedRows: { before: execution.sourceDiff.unrelatedRows.before.digest, after: execution.sourceDiff.unrelatedRows.after.digest } }));
    capture.recordSection("readChain", captureStage5ReadChain(query, [{ cycleId: polled.result.cycleId, queryId: query.queryId, queryVersion: query.queryVersion, sourceAccount: "monitor_source_ro", pages: polled.result.pageEvidence, completeness: "complete", freshness: "fresh" }]));
    capture.recordSection("monitorChain", captureStage5MonitorChain({ outcome: "presence", pollCycleIds: [polled.result.cycleId], incidentIds: [incidentId],
      evidenceIds: await ids("SELECT id FROM monitor_incident_evidence WHERE incident_id=$1", [incidentId]), routingDecisionIds: await ids("SELECT id FROM monitor_routing_decision WHERE incident_id=$1", [incidentId]),
      deliveryIds: await ids("SELECT id FROM monitor_notification_delivery WHERE incident_id=$1", [incidentId]), conversationIds,
      messageIds: messageRows.map(({ id }) => String(id)), receiptIds: [], cursorStart: 0, cursorEnd: Number(messageRows.at(-1)?.cursor ?? 0) }));
    assertValidStage5CoreChain(capture.snapshot());
    for (const kind of ["scheduling", "recovery", "browser", "human"] as const) capture.attach({ attachmentId: `${kind}-diagnostic`, kind,
      identity: { testId: "A02-01", runId: "diagnostic-chain-rehearsal", experimentId: runtime.experiment.id },
      artifactPaths: [`local-data/test-database/evidence/stage5/diagnostic/A02-01/${kind}.json`], payload: { diagnostic: true } });
    assert.equal(capture.snapshot().attachments.length, 4);
  } finally {
    if (createdId) {
      await connections.writer.execute("DELETE FROM flujo_materiales_detalles WHERE id_padre=?", [createdId]);
      await connections.writer.execute("DELETE FROM flujo_materiales_detalles WHERE id=?", [createdId]);
    }
    await server.close();
    await connections.close();
  }
});
