import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { createServer as createNetServer } from "node:net";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
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
  stage5BrowserSurfaceTargets,
} from "./lib/stage5-browser-harness.mjs";

const execFile = promisify(execFileCallback);
const repositoryRoot = resolve(import.meta.dirname, "..");
const schema = JSON.parse(await readFile(resolve(repositoryRoot, "config/detection/schemas/stage5-browser-evidence.v1.schema.json"), "utf8"));
const declaration = JSON.parse(await readFile(resolve(repositoryRoot, "config/detection/stage5-connected-acceptance.v2.json"), "utf8"));
const runId = process.env.STEP8_RUN_ID ?? `step8-runtime-${new Date().toISOString().replace(/[-:.TZ]/g, "")}`;
const evidenceParent = resolve(repositoryRoot, "local-data/test-database/evidence/stage5-step8");
const evidenceRoot = resolve(evidenceParent, runId);
const artifactsDirectory = resolve(evidenceRoot, "artifacts");
await mkdir(evidenceParent, { recursive: true });
await mkdir(evidenceRoot, { recursive: false });
await mkdir(artifactsDirectory, { recursive: false });

async function availablePort(): Promise<number> {
  const probe = createNetServer();
  await new Promise<void>((resolveListen, reject) => { probe.once("error", reject); probe.listen(0, "127.0.0.1", resolveListen); });
  const address = probe.address();
  assert.ok(address && typeof address === "object");
  const port = address.port;
  await new Promise<void>((resolveClose, reject) => probe.close((error) => error ? reject(error) : resolveClose()));
  return port;
}

async function sourceHealth(label: string): Promise<void> {
  const result = await execFile(resolve(repositoryRoot, "scripts/test-database-validate.sh"), ["health"], { cwd: repositoryRoot });
  await writeFile(resolve(evidenceRoot, `${label}.log`), `${result.stdout}${result.stderr}`);
}

function addressOrigin(server: MonitorServer): string {
  const address = server.app.server.address();
  assert.ok(address && typeof address === "object");
  return `http://127.0.0.1:${address.port}`;
}

async function writeArtifact(input: {
  artifactId: string;
  surface: "runtime" | "laboratory" | "dashboard" | "chat_list" | "chat_detail";
  artifactKind: "identity_snapshot" | "screenshot" | "accessibility" | "interaction" | "console" | "reconnect";
  capturedAt: string;
  content: unknown;
  identity: { runId: string; experimentId: string; runtimeId: string; captureNonce: string };
  runtime: { apiOrigin: string; webOrigin: string; monitorDatabaseInstanceId: string; schedulerOwnerId: string };
  objectReferences: Array<{ type: "experiment" | "poll_cycle" | "incident" | "routing_decision" | "delivery" | "conversation" | "message" | "receipt" | "cursor"; id: string }>;
  attachmentId: string;
}) {
  const contentPath = `artifacts/${input.artifactId}.json`;
  const provenancePath = `artifacts/${input.artifactId}.provenance.json`;
  const content = `${JSON.stringify(input.content, null, 2)}\n`;
  const artifact = {
    artifactId: input.artifactId,
    surface: input.surface,
    artifactKind: input.artifactKind,
    contentPath,
    contentSha256: sha256(content),
    provenancePath,
    provenanceSha256: "",
    capturedAt: input.capturedAt,
    identity: input.identity,
    apiOrigin: input.runtime.apiOrigin,
    webOrigin: input.runtime.webOrigin,
    monitorDatabaseInstanceId: input.runtime.monitorDatabaseInstanceId,
    schedulerOwnerId: input.runtime.schedulerOwnerId,
    objectReferences: input.objectReferences,
    chainReference: { testId: "SH-11", attachmentId: input.attachmentId },
  };
  await writeFile(resolve(evidenceRoot, contentPath), content, { flag: "wx" });
  const provenance = `${JSON.stringify(browserArtifactProvenance(artifact), null, 2)}\n`;
  artifact.provenanceSha256 = sha256(provenance);
  await writeFile(resolve(evidenceRoot, provenancePath), provenance, { flag: "wx" });
  return artifact;
}

let monitorServer: MonitorServer | null = null;
let webServer: ViteDevServer | null = null;
let manifest: Record<string, any> | null = null;
let cleanupCompleted = false;
const startedAt = new Date().toISOString();

try {
  await sourceHealth("source-health-before");
  const webPort = await availablePort();
  const webOrigin = `http://127.0.0.1:${webPort}`;
  monitorServer = await buildMonitorServer({ config: {
    nodeEnv: "test",
    cookieSecret: "stage5-browser-runtime-diagnostic-secret",
    allowMockAuth: true,
    enableScenarioLab: true,
    scenarioSource: "test_database",
    databaseMode: "pglite",
    pgliteDataDir: "memory://",
    webOrigin,
  } });
  const acceptance = monitorServer.acceptance;
  assert.ok(acceptance && monitorServer.stage5BrowserRuntime);
  const created = await acceptance.runtime.create({
    name: "Step 8.1 connected runtime diagnostic",
    businessTime: "2026-08-02T08:00:00.000Z",
    pollingFrequencyMinutes: 60,
    identity: { runId, manifestVersion: declaration.manifestVersion, sourceActionContractVersion: declaration.sourceActionContractVersion },
  });
  const experiment = created.experiment;
  assert.ok(experiment);
  await monitorServer.app.listen({ host: "127.0.0.1", port: 0 });
  const internalApiOrigin = addressOrigin(monitorServer);
  webServer = await createViteServer({
    root: resolve(repositoryRoot, "apps/web"),
    configFile: resolve(repositoryRoot, "apps/web/vite.config.ts"),
    logLevel: "error",
    server: {
      host: "127.0.0.1", port: webPort, strictPort: true,
      proxy: {
        "/api": { target: internalApiOrigin, changeOrigin: false },
        "/health": { target: internalApiOrigin, changeOrigin: false },
        "/socket.io": { target: internalApiOrigin, ws: true, changeOrigin: false },
      },
    },
  });
  await webServer.listen();
  const seed = createStage5BrowserHarnessSeed({
    runId,
    experimentId: experiment.id,
    manifestVersion: declaration.manifestVersion,
    sourceActionContractVersion: declaration.sourceActionContractVersion,
    startedAt,
    apiOrigin: webOrigin,
  });
  const { apiOrigin: _apiOrigin, ...serverSeed } = seed;
  const inactiveBefore = await fetch(`${webOrigin}/api/dev/stage5/runtime-identity`, { headers: { authorization: "Bearer mock:plant-manager" }, redirect: "error" });
  assert.equal(inactiveBefore.status, 404);
  monitorServer.stage5BrowserRuntime.activate(serverSeed);
  const unauthorized = await fetch(`${webOrigin}/api/dev/stage5/runtime-identity`, { redirect: "error" });
  assert.equal(unauthorized.status, 401);
  const snapshot = await fetchStage5BrowserRuntimeIdentity({ apiOrigin: webOrigin, authorization: "Bearer mock:plant-manager", seed });
  const targets = stage5BrowserSurfaceTargets(snapshot, { conversationId: "diagnostic-conversation" });
  const surfaceResponses = [];
  for (const [surface, url] of Object.entries(targets)) {
    const response = await fetch(url, { redirect: "error" });
    const html = await response.text();
    assert.equal(response.status, 200, `${surface}:${response.status}`);
    assert.match(html, /<div id="root"><\/div>/, surface);
    const identityResponse = await fetch(`${webOrigin}${snapshot.runtime.identityEndpoint}`, { headers: { authorization: "Bearer mock:plant-manager" }, redirect: "error" });
    assert.equal(identityResponse.status, 200, `${surface}:identity:${identityResponse.status}`);
    assert.deepEqual(await identityResponse.json(), snapshot, `${surface}:runtime identity drift`);
    surfaceResponses.push({ surface, url, status: response.status, servedByWebOrigin: new URL(url).origin === snapshot.runtime.webOrigin, runtimeIdentityMatched: true });
  }
  monitorServer.stage5BrowserRuntime.clear();
  const inactiveAfter = await fetch(`${webOrigin}/api/dev/stage5/runtime-identity`, { headers: { authorization: "Bearer mock:plant-manager" }, redirect: "error" });
  assert.equal(inactiveAfter.status, 404);
  const endpointLifecycle = { inactiveBeforeActivation: true, unauthorizedWithoutSession: true, inactiveAfterClear: true };
  const capturedAt = new Date().toISOString();
  const artifactIdentity = { runId: seed.runId, experimentId: seed.experimentId, runtimeId: seed.runtimeId, captureNonce: seed.captureNonce };
  const runtimeArtifact = await writeArtifact({
    artifactId: "runtime-identity", surface: "runtime", artifactKind: "identity_snapshot", capturedAt,
    content: snapshot, identity: artifactIdentity, runtime: snapshot.runtime,
    objectReferences: [{ type: "experiment", id: experiment.id }], attachmentId: "browser-runtime-identity",
  });
  const surfaceArtifact = await writeArtifact({
    artifactId: "surface-targets", surface: "runtime", artifactKind: "interaction", capturedAt: new Date().toISOString(),
    content: { diagnostic: true, endpointLifecycle, surfaceResponses }, identity: artifactIdentity, runtime: snapshot.runtime,
    objectReferences: [{ type: "experiment", id: experiment.id }], attachmentId: "browser-runtime-surface-targets",
  });
  manifest = {
    schemaVersion: "1.0.0",
    kind: "browser_evidence_manifest",
    gate: "phase6-stage5-step8",
    claim: { level: "diagnostic", accepted: false },
    identity: {
      runId: seed.runId,
      experimentId: seed.experimentId,
      runtimeId: seed.runtimeId,
      captureNonce: seed.captureNonce,
      manifestVersion: seed.manifestVersion,
      sourceActionContractVersion: seed.sourceActionContractVersion,
      startedAt: seed.startedAt,
      completedAt: "",
    },
    runtime: stage5BrowserManifestRuntime(snapshot, runtimeArtifact.artifactId),
    artifacts: [runtimeArtifact, surfaceArtifact],
    cleanup: { executedInFinally: true, completed: false, sourceRestored: false, monitorStateDisposed: false, artifactPath: "artifacts/cleanup.json", artifactSha256: `sha256:${"0".repeat(64)}` },
  };
} finally {
  monitorServer?.stage5BrowserRuntime?.clear();
  if (webServer) await webServer.close();
  if (monitorServer) await monitorServer.close();
  await sourceHealth("source-health-after");
  cleanupCompleted = true;
}

assert.ok(manifest && cleanupCompleted);
const completedAt = new Date().toISOString();
manifest.identity.completedAt = completedAt;
manifest.cleanup = { ...manifest.cleanup, completed: true, sourceRestored: true, monitorStateDisposed: true };
const cleanupPayload = browserCleanupEvidence(manifest);
const cleanupContent = `${JSON.stringify(cleanupPayload, null, 2)}\n`;
await writeFile(resolve(evidenceRoot, manifest.cleanup.artifactPath), cleanupContent, { flag: "wx" });
manifest.cleanup.artifactSha256 = sha256(cleanupContent);

const validErrors = await validateStage5BrowserEvidence(manifest, { schema, artifactRoot: evidenceRoot, expectedIdentity: manifest.identity });
assert.deepEqual(validErrors, []);

const cases: Array<[string, (value: Record<string, any>) => void, string]> = [
  ["reused", (value) => { value.artifacts.push({ ...structuredClone(value.artifacts[1]), artifactId: "surface-targets-reused" }); }, "artifact content paths must be unique"],
  ["stale", (value) => { value.artifacts[1].capturedAt = "2000-01-01T00:00:00.000Z"; }, "artifact timestamp outside runtime"],
  ["mock", (value) => { value.runtime.sourceKind = "monitor_sim"; }, "sourceKind"],
  ["ui_only", (value) => { value.runtime.monitorDatabaseInstanceId = "browser-local"; }, "Monitor database service instance mismatch"],
  ["altered", (value) => { value.artifacts[1].contentSha256 = `sha256:${"f".repeat(64)}`; }, "artifact content digest mismatch"],
  ["different_runtime", (value) => { value.artifacts[1].identity.runtimeId = "another-runtime"; }, "artifact identity mismatch"],
];
const failureMatrix = [];
for (const [name, mutate, expected] of cases) {
  const candidate = structuredClone(manifest);
  mutate(candidate);
  const errors = await validateStage5BrowserEvidence(candidate, { schema, artifactRoot: evidenceRoot, expectedIdentity: manifest.identity });
  assert.ok(errors.some((error) => error.includes(expected)), `${name}: ${errors.join(" | ")}`);
  failureMatrix.push({ name, rejected: true, expected, errors });
}
await writeFile(resolve(evidenceRoot, "failure-matrix.json"), `${JSON.stringify({ runId, diagnostic: true, cases: failureMatrix }, null, 2)}\n`, { flag: "wx" });
await writeFile(resolve(evidenceRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify({ runId, evidenceRoot, valid: true, diagnostic: true, accepted: false, surfaces: 4, failureCases: failureMatrix.length }, null, 2));
