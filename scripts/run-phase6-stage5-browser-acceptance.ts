import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { createServer as createNetServer } from "node:net";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { TestDatabaseConnections } from "@monitor/detection";
import { createServer as createViteServer, type ViteDevServer } from "../apps/web/node_modules/vite/dist/node/index.js";
import { buildMonitorServer, type MonitorServer } from "../apps/api/src/server.js";
import {
  browserArtifactProvenance,
  browserCleanupEvidence,
  browserRuntimeIdentitySnapshot,
  sha256,
  validateStage5BrowserEvidence,
} from "./lib/stage5-browser-evidence.mjs";
import {
  createStage5BrowserHarnessSeed,
  fetchStage5BrowserRuntimeIdentity,
  stage5BrowserManifestRuntime,
} from "./lib/stage5-browser-harness.mjs";

const execFile = promisify(execFileCallback);
const root = resolve(import.meta.dirname, "..");
const schema = JSON.parse(await readFile(resolve(root, "config/detection/schemas/stage5-browser-evidence.v1.schema.json"), "utf8"));
const declaration = JSON.parse(await readFile(resolve(root, "config/detection/stage5-connected-acceptance.v2.json"), "utf8"));
const fixtures = JSON.parse(await readFile(resolve(root, "config/detection/fixtures/test-database-stage5.v1.json"), "utf8"));
const runId = process.env.STEP8_RUN_ID ?? `step8-${new Date().toISOString().replace(/[-:.TZ]/g, "")}`;
const evidenceRoot = resolve(root, "local-data/test-database/evidence/stage5-step8", runId);
const artifactsRoot = resolve(evidenceRoot, "artifacts");
const browserResultsPath = resolve(evidenceRoot, "browser-results.json");
const manager = { authorization: "Bearer mock:plant-manager" };

type ObjectReference = { type: "experiment" | "poll_cycle" | "incident" | "routing_decision" | "delivery" | "conversation" | "message" | "receipt" | "cursor"; id: string };
type BrowserResultArtifact = {
  artifactId: string;
  surface: "laboratory" | "dashboard" | "chat_list" | "chat_detail";
  artifactKind: "screenshot" | "accessibility" | "interaction" | "console" | "reconnect";
  viewport?: { width: number; height: number };
  contentPath: string;
  capturedAt: string;
  objectReferences: ObjectReference[];
  attachmentId: string;
};

async function availablePort(): Promise<number> {
  const probe = createNetServer();
  await new Promise<void>((done, reject) => { probe.once("error", reject); probe.listen(0, "127.0.0.1", done); });
  const address = probe.address();
  assert.ok(address && typeof address === "object");
  await new Promise<void>((done, reject) => probe.close((error) => error ? reject(error) : done()));
  return address.port;
}

async function sourceHealth(name: string): Promise<void> {
  const result = await execFile(resolve(root, "scripts/test-database-validate.sh"), ["health"], { cwd: root });
  await writeFile(resolve(evidenceRoot, `${name}.log`), `${result.stdout}${result.stderr}`);
}

function apiOrigin(server: MonitorServer): string {
  const address = server.app.server.address();
  assert.ok(address && typeof address === "object");
  return `http://127.0.0.1:${address.port}`;
}

async function waitForBrowserResults(timeoutMs = 30 * 60_000): Promise<Record<string, unknown>> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (existsSync(browserResultsPath)) return JSON.parse(await readFile(browserResultsPath, "utf8"));
    await new Promise((done) => setTimeout(done, 250));
  }
  throw new Error("stage5_browser_acceptance_results_timeout");
}

async function ids(server: MonitorServer, sql: string, parameters: unknown[] = []): Promise<string[]> {
  return (await server.database.queryAll(sql, parameters)).map(({ id }) => String(id));
}

await mkdir(artifactsRoot, { recursive: true });
let server: MonitorServer | null = null;
let web: ViteDevServer | null = null;
let connections: TestDatabaseConnections | null = null;
let createdSourceId: number | null = null;
let manifest: Record<string, any> | null = null;
let cleanupCompleted = false;
const startedAt = new Date().toISOString();

try {
  await sourceHealth("source-health-before");
  const webPort = await availablePort();
  const webOrigin = `http://127.0.0.1:${webPort}`;
  connections = await TestDatabaseConnections.create(root);
  server = await buildMonitorServer({
    testDatabaseFixtureSeeds: { A02: Number(fixtures.a02.downstream[0]), A03: 1415, A05: 141084 },
    config: {
      nodeEnv: "test", cookieSecret: "stage5-browser-acceptance-secret", allowMockAuth: true,
      enableScenarioLab: true, scenarioSource: "test_database", databaseMode: "pglite", pgliteDataDir: "memory://", webOrigin,
    },
  });
  const acceptance = server.acceptance;
  assert.ok(acceptance && server.stage5BrowserRuntime);
  const created = await acceptance.runtime.create({
    name: "Step 8 same-runtime browser acceptance",
    businessTime: "2026-08-02T08:00:00.000Z",
    pollingFrequencyMinutes: 60,
    identity: { runId, manifestVersion: declaration.manifestVersion, sourceActionContractVersion: declaration.sourceActionContractVersion },
  });
  const experiment = created.experiment;
  assert.ok(experiment);
  const roster = await server.app.inject({ method: "PUT", url: "/api/roster/assignments", headers: manager, payload: { revision: 0, assignments: [
    { id: "manager", sysUserId: 9001, person: "Gerencia de planta", position: "Gerente de fábrica", operations: [], warehouseType: null, scope: "factory", group: null, validFrom: "2026-07-01", validTo: null, state: "active", setupComplete: true },
  ] } });
  assert.equal(roster.statusCode, 200, roster.body);
  const templateId = Number(fixtures.a02.downstream[0]);
  const action = await server.app.inject({ method: "POST", url: "/api/dev/source-actions", headers: manager, payload: { actionId: "a02.prepare_dispatch", key: templateId } });
  assert.equal(action.statusCode, 200, action.body);
  createdSourceId = Number(action.json().execution.sourceDiff.after.find((record: { key: number }) => Number(record.key) !== templateId)?.key);
  assert.ok(createdSourceId > 0);
  acceptance.source.replaceTracked!("A02", [createdSourceId]);
  await acceptance.runtime.pause(experiment.id, false);
  await acceptance.runtime.advance(experiment.id, 31);
  const poll = await server.app.inject({ method: "POST", url: "/api/dev/test/scenarios/A02/poll", headers: manager });
  assert.equal(poll.statusCode, 200, poll.body);
  const cycleId = String(poll.json().result.cycleId);
  const incident = await server.database.queryOne("SELECT id FROM monitor_incident WHERE rule_code='A02' ORDER BY opened_at DESC LIMIT 1");
  const incidentId = String(incident.id);
  const routingDecisionIds = await ids(server, "SELECT id FROM monitor_routing_decision WHERE incident_id=$1", [incidentId]);
  const deliveryIds = await ids(server, "SELECT id FROM monitor_notification_delivery WHERE incident_id=$1 ORDER BY id", [incidentId]);
  const conversationIds = await ids(server, "SELECT conversation_id AS id FROM monitor_conversation_incident WHERE incident_id=$1", [incidentId]);
  assert.equal(conversationIds.length, 1);
  const conversationId = conversationIds[0]!;
  const messageRows = await server.database.queryAll("SELECT id,cursor FROM monitor_message WHERE conversation_id=$1 ORDER BY cursor", [conversationId]);
  assert.ok(messageRows.length > 0);
  await server.app.listen({ host: "127.0.0.1", port: 0 });
  const internalOrigin = apiOrigin(server);
  web = await createViteServer({
    root: resolve(root, "apps/web"), configFile: resolve(root, "apps/web/vite.config.ts"), logLevel: "error",
    server: { host: "127.0.0.1", port: webPort, strictPort: true, proxy: {
      "/api": { target: internalOrigin, changeOrigin: false }, "/health": { target: internalOrigin, changeOrigin: false }, "/socket.io": { target: internalOrigin, ws: true, changeOrigin: false },
    } },
  });
  await web.listen();
  const seed = createStage5BrowserHarnessSeed({ runId, experimentId: experiment.id, manifestVersion: declaration.manifestVersion, sourceActionContractVersion: declaration.sourceActionContractVersion, startedAt, apiOrigin: webOrigin });
  const { apiOrigin: _ignored, ...serverSeed } = seed;
  server.stage5BrowserRuntime.activate(serverSeed);
  const snapshot = await fetchStage5BrowserRuntimeIdentity({ apiOrigin: webOrigin, authorization: "Bearer mock:plant-manager", seed });
  const initialReferences: ObjectReference[] = [
    { type: "experiment", id: experiment.id }, { type: "poll_cycle", id: cycleId }, { type: "incident", id: incidentId },
    ...routingDecisionIds.map((id) => ({ type: "routing_decision" as const, id })),
    ...deliveryIds.map((id) => ({ type: "delivery" as const, id })),
    { type: "conversation", id: conversationId },
    ...messageRows.map(({ id }) => ({ type: "message" as const, id: String(id) })),
    { type: "cursor", id: String(messageRows.at(-1)!.cursor) },
  ];
  await writeFile(resolve(evidenceRoot, "session.json"), `${JSON.stringify({
    identity: seed, webOrigin, conversationId, incidentId, cycleId, createdSourceId, objectReferences: initialReferences,
    paths: { evidenceRoot, artifactsRoot, browserResultsPath },
  }, null, 2)}\n`, { flag: "wx" });
  process.stdout.write(`${JSON.stringify({ ready: true, runId, webOrigin, evidenceRoot, conversationId, incidentId })}\n`);
  const browserResults = await waitForBrowserResults();
  assert.deepEqual(browserResults.identity, { runId: seed.runId, experimentId: seed.experimentId, runtimeId: seed.runtimeId, captureNonce: seed.captureNonce });
  assert.equal(browserResults.accepted, true);
  const resultArtifacts = browserResults.artifacts as BrowserResultArtifact[];
  assert.ok(Array.isArray(resultArtifacts) && resultArtifacts.length > 0);

  const identity = { runId: seed.runId, experimentId: seed.experimentId, runtimeId: seed.runtimeId, captureNonce: seed.captureNonce };
  const runtimeArtifactContent = `${JSON.stringify(browserRuntimeIdentitySnapshot({ identity: { ...seed, completedAt: startedAt }, runtime: { ...snapshot.runtime, identityArtifactId: "runtime-identity" } }), null, 2)}\n`;
  const runtimeContentPath = "artifacts/runtime-identity.json";
  await writeFile(resolve(evidenceRoot, runtimeContentPath), runtimeArtifactContent, { flag: "wx" });
  const runtimeArtifact: Record<string, any> = {
    artifactId: "runtime-identity", surface: "runtime", artifactKind: "identity_snapshot", contentPath: runtimeContentPath,
    contentSha256: sha256(runtimeArtifactContent), provenancePath: "artifacts/runtime-identity.provenance.json", provenanceSha256: "", capturedAt: startedAt,
    identity, apiOrigin: snapshot.runtime.apiOrigin, webOrigin: snapshot.runtime.webOrigin, monitorDatabaseInstanceId: snapshot.runtime.monitorDatabaseInstanceId,
    schedulerOwnerId: snapshot.runtime.schedulerOwnerId, objectReferences: [{ type: "experiment", id: experiment.id }], chainReference: { testId: "SH-11", attachmentId: "browser-runtime-identity" },
  };
  const artifacts: Record<string, any>[] = [runtimeArtifact];
  for (const item of resultArtifacts) {
    assert.ok(item.contentPath.startsWith("artifacts/") && existsSync(resolve(evidenceRoot, item.contentPath)));
    assert.ok(Number.isFinite(Date.parse(item.capturedAt)));
    assert.ok(item.objectReferences.some((reference) => reference.type === "experiment" && reference.id === experiment.id));
    const content = await readFile(resolve(evidenceRoot, item.contentPath));
    const { attachmentId, ...artifactFields } = item;
    artifacts.push({ ...artifactFields, contentSha256: sha256(content), provenancePath: `artifacts/${item.artifactId}.provenance.json`, provenanceSha256: "",
      identity, apiOrigin: snapshot.runtime.apiOrigin, webOrigin: snapshot.runtime.webOrigin, monitorDatabaseInstanceId: snapshot.runtime.monitorDatabaseInstanceId,
      schedulerOwnerId: snapshot.runtime.schedulerOwnerId, chainReference: { testId: "SH-11", attachmentId } });
  }
  for (const artifact of artifacts) {
    const provenance = `${JSON.stringify(browserArtifactProvenance(artifact), null, 2)}\n`;
    artifact.provenanceSha256 = sha256(provenance);
    await writeFile(resolve(evidenceRoot, artifact.provenancePath), provenance, { flag: "wx" });
  }
  manifest = {
    schemaVersion: "1.0.0", kind: "browser_evidence_manifest", gate: "phase6-stage5-step8", claim: { level: "aggregate", accepted: true },
    identity: { runId: seed.runId, experimentId: seed.experimentId, runtimeId: seed.runtimeId, captureNonce: seed.captureNonce,
      manifestVersion: seed.manifestVersion, sourceActionContractVersion: seed.sourceActionContractVersion, startedAt: seed.startedAt, completedAt: "" },
    runtime: stage5BrowserManifestRuntime(snapshot, runtimeArtifact.artifactId), artifacts,
    cleanup: { executedInFinally: true, completed: false, sourceRestored: false, monitorStateDisposed: false, artifactPath: "artifacts/cleanup.json", artifactSha256: `sha256:${"0".repeat(64)}` },
  };
} finally {
  server?.stage5BrowserRuntime?.clear();
  if (createdSourceId && connections) {
    await connections.writer.execute("DELETE FROM flujo_materiales_detalles WHERE id_padre=?", [createdSourceId]);
    await connections.writer.execute("DELETE FROM flujo_materiales_detalles WHERE id=?", [createdSourceId]);
  }
  if (web) await web.close();
  if (server) await server.close();
  if (connections) await connections.close();
  await sourceHealth("source-health-after");
  cleanupCompleted = true;
}

assert.ok(manifest && cleanupCompleted);
manifest.identity.completedAt = new Date().toISOString();
manifest.cleanup = { ...manifest.cleanup, completed: true, sourceRestored: true, monitorStateDisposed: true };
const cleanupContent = `${JSON.stringify(browserCleanupEvidence(manifest), null, 2)}\n`;
await writeFile(resolve(evidenceRoot, manifest.cleanup.artifactPath), cleanupContent, { flag: "wx" });
manifest.cleanup.artifactSha256 = sha256(cleanupContent);
const errors = await validateStage5BrowserEvidence(manifest, { schema, artifactRoot: evidenceRoot, expectedIdentity: manifest.identity });
assert.deepEqual(errors, []);
await writeFile(resolve(evidenceRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
process.stdout.write(`${JSON.stringify({ runId, evidenceRoot, accepted: true, artifacts: manifest.artifacts.length })}\n`);
