import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {
  browserArtifactProvenance,
  browserCleanupEvidence,
  browserRuntimeIdentitySnapshot,
  browserServiceIdentityDigest,
  canonicalJson,
  sha256,
  validateStage5BrowserEvidence,
} from "./lib/stage5-browser-evidence.mjs";

const schema = JSON.parse(await readFile(new URL("../config/detection/schemas/stage5-browser-evidence.v1.schema.json", import.meta.url), "utf8"));
const startedAt = "2026-08-02T12:00:00.000Z";
const completedAt = "2026-08-02T12:05:00.000Z";

async function fixture() {
  const artifactRoot = await mkdtemp(join(tmpdir(), "stage5-browser-evidence-"));
  await mkdir(join(artifactRoot, "artifacts"));
  const identity = {
    runId: "step8-diagnostic-1",
    experimentId: "experiment-1",
    runtimeId: "runtime-1",
    captureNonce: "abcdefghijklmnop",
    manifestVersion: "2.0.0",
    sourceActionContractVersion: "1.1.0",
    startedAt,
    completedAt,
  };
  const runtimeIdentity = { runId: identity.runId, experimentId: identity.experimentId, runtimeId: identity.runtimeId, captureNonce: identity.captureNonce };
  const apiOrigin = "http://127.0.0.1:3010";
  const webOrigin = "http://127.0.0.1:5180";
  const identityEndpoint = "/api/dev/stage5/runtime-identity";
  const rawServices = [
    { name: "laboratory", instanceId: "web-1", location: `${webOrigin}/dev/scenarios` },
    { name: "api", instanceId: "api-1", location: `${apiOrigin}${identityEndpoint}` },
    { name: "scheduler", instanceId: "scheduler-1", location: "scheduler:scheduler-1" },
    { name: "monitor_database", instanceId: "database-1", location: "monitor-database:database-1" },
    { name: "dashboard", instanceId: "web-1", location: `${webOrigin}/` },
    { name: "chat", instanceId: "web-1", location: `${webOrigin}/chats` },
  ];
  const services = rawServices.map((service) => ({ ...service, identityDigest: browserServiceIdentityDigest(identity, service) }));
  const artifact = {
    artifactId: "runtime-identity-1",
    surface: "runtime",
    artifactKind: "identity_snapshot",
    contentPath: "artifacts/runtime.json",
    contentSha256: "",
    provenancePath: "artifacts/runtime.provenance.json",
    provenanceSha256: "",
    capturedAt: "2026-08-02T12:03:00.000Z",
    identity: runtimeIdentity,
    apiOrigin,
    webOrigin,
    monitorDatabaseInstanceId: "database-1",
    schedulerOwnerId: "scheduler-1",
    objectReferences: [{ type: "experiment", id: identity.experimentId }],
    chainReference: { testId: "SH-11", attachmentId: "browser-runtime-diagnostic" },
  };
  const manifest = {
    schemaVersion: "1.0.0",
    kind: "browser_evidence_manifest",
    gate: "phase6-stage5-step8",
    claim: { level: "diagnostic", accepted: false },
    identity,
    runtime: {
      mode: "connected",
      sourceKind: "test_database",
      sourceAccount: "monitor_source_ro",
      apiOrigin,
      webOrigin,
      identityEndpoint,
      identityArtifactId: artifact.artifactId,
      monitorDatabaseInstanceId: "database-1",
      schedulerOwnerId: "scheduler-1",
      startedAt,
      services,
      surfaces: [
        { name: "laboratory", url: `${webOrigin}/dev/scenarios`, identityUrl: `${apiOrigin}${identityEndpoint}` },
        { name: "dashboard", url: `${webOrigin}/`, identityUrl: `${apiOrigin}${identityEndpoint}` },
        { name: "chat_list", url: `${webOrigin}/chats`, identityUrl: `${apiOrigin}${identityEndpoint}` },
        { name: "chat_detail", url: `${webOrigin}/chats/conversation-1`, identityUrl: `${apiOrigin}${identityEndpoint}` },
      ],
    },
    artifacts: [artifact],
    cleanup: {
      executedInFinally: true,
      completed: true,
      sourceRestored: true,
      monitorStateDisposed: true,
      artifactPath: "artifacts/cleanup.json",
      artifactSha256: `sha256:${"0".repeat(64)}`,
    },
  };
  const cleanupContent = `${JSON.stringify(browserCleanupEvidence(manifest), null, 2)}\n`;
  manifest.cleanup.artifactSha256 = sha256(cleanupContent);
  await writeFile(join(artifactRoot, "artifacts/cleanup.json"), cleanupContent);
  const content = `${JSON.stringify(browserRuntimeIdentitySnapshot(manifest), null, 2)}\n`;
  artifact.contentSha256 = sha256(content);
  await writeFile(join(artifactRoot, artifact.contentPath), content);
  const provenance = `${JSON.stringify(browserArtifactProvenance(artifact), null, 2)}\n`;
  artifact.provenanceSha256 = sha256(provenance);
  await writeFile(join(artifactRoot, artifact.provenancePath), provenance);
  return { artifactRoot, manifest };
}

test("accepts a schema-complete diagnostic bound to real artifact and provenance files", async () => {
  const { artifactRoot, manifest } = await fixture();
  assert.deepEqual(await validateStage5BrowserEvidence(manifest, { schema, artifactRoot, expectedIdentity: manifest.identity }), []);
});

test("accepted aggregate evidence requires every surface, viewport, evidence kind, and exact object class", async () => {
  const { artifactRoot, manifest } = await fixture();
  manifest.claim = { level: "aggregate", accepted: true };
  const errors = await validateStage5BrowserEvidence(manifest, { schema, artifactRoot, expectedIdentity: manifest.identity });
  assert.ok(errors.includes("accepted aggregate lacks laboratory 1440px screenshot"));
  assert.ok(errors.includes("accepted aggregate lacks dashboard accessibility evidence"));
  assert.ok(errors.includes("accepted aggregate lacks chat_list reconnect evidence"));
  assert.ok(errors.includes("accepted aggregate lacks chat_detail interaction evidence"));
  assert.ok(errors.includes("accepted aggregate lacks exact object reference type: receipt"));
  assert.ok(errors.includes("accepted aggregate lacks cross-surface reconnect comparison"));
});

test("an accepted non-aggregate claim fails closed", async () => {
  const { artifactRoot, manifest } = await fixture();
  manifest.claim = { level: "surface", accepted: true };
  const errors = await validateStage5BrowserEvidence(manifest, { schema, artifactRoot });
  assert.ok(errors.includes("accepted browser evidence must be aggregate"));
});

test("schema and semantic validation fail closed on mock, incomplete, or different-runtime identity", async () => {
  const { artifactRoot, manifest } = await fixture();
  const mock = structuredClone(manifest); mock.runtime.sourceKind = "monitor_sim";
  const incomplete = structuredClone(manifest); delete incomplete.artifacts[0].contentSha256;
  const drift = structuredClone(manifest); drift.artifacts[0].identity.runtimeId = "runtime-2";
  const surfaceDrift = structuredClone(manifest); surfaceDrift.runtime.surfaces[0].url = "http://127.0.0.1:9999/dev/scenarios";
  assert.ok((await validateStage5BrowserEvidence(mock, { schema, artifactRoot })).some((error) => error.includes("sourceKind")));
  assert.ok((await validateStage5BrowserEvidence(incomplete, { schema, artifactRoot })).some((error) => error.includes("contentSha256")));
  assert.ok((await validateStage5BrowserEvidence(drift, { schema, artifactRoot })).some((error) => error.includes("artifact identity mismatch")));
  assert.ok((await validateStage5BrowserEvidence(surfaceDrift, { schema, artifactRoot })).some((error) => error.includes("different web runtime")));
});

test("rejects stale timestamps, reused content, and altered files", async () => {
  const { artifactRoot, manifest } = await fixture();
  const stale = structuredClone(manifest); stale.artifacts[0].capturedAt = "2026-08-02T11:59:59.000Z";
  assert.ok((await validateStage5BrowserEvidence(stale, { schema, artifactRoot })).some((error) => error.includes("timestamp outside runtime")));

  const reused = structuredClone(manifest);
  reused.artifacts.push({ ...structuredClone(reused.artifacts[0]), artifactId: "runtime-identity-2", provenancePath: "artifacts/runtime-2.provenance.json" });
  const reusedProvenance = `${JSON.stringify(browserArtifactProvenance(reused.artifacts[1]), null, 2)}\n`;
  reused.artifacts[1].provenanceSha256 = sha256(reusedProvenance);
  await writeFile(join(artifactRoot, reused.artifacts[1].provenancePath), reusedProvenance);
  assert.ok((await validateStage5BrowserEvidence(reused, { schema, artifactRoot })).some((error) => error.includes("content digests must be unique")));

  await writeFile(join(artifactRoot, manifest.artifacts[0].contentPath), "altered\n");
  assert.ok((await validateStage5BrowserEvidence(manifest, { schema, artifactRoot })).some((error) => error.includes("content digest mismatch")));
});

test("rejects forged provenance and artifact-root escapes", async () => {
  const { artifactRoot, manifest } = await fixture();
  const forged = structuredClone(manifest);
  const provenancePath = join(artifactRoot, forged.artifacts[0].provenancePath);
  const provenance = JSON.parse(await readFile(provenancePath, "utf8"));
  provenance.runtime.monitorDatabaseInstanceId = "database-forged";
  const forgedContent = `${JSON.stringify(provenance, null, 2)}\n`;
  await writeFile(provenancePath, forgedContent);
  forged.artifacts[0].provenanceSha256 = sha256(forgedContent);
  assert.ok((await validateStage5BrowserEvidence(forged, { schema, artifactRoot })).some((error) => error.includes("provenance payload mismatch")));

  const outside = await mkdtemp(join(tmpdir(), "stage5-browser-outside-"));
  await writeFile(join(outside, "artifact.json"), "{}\n");
  await symlink(join(outside, "artifact.json"), join(artifactRoot, "artifacts/escape.json"));
  const escaped = structuredClone(manifest);
  escaped.artifacts[0].contentPath = "artifacts/escape.json";
  assert.ok((await validateStage5BrowserEvidence(escaped, { schema, artifactRoot })).some((error) => error.includes("resolves outside artifact root")));
});

test("rejects an identity artifact whose payload does not describe the declared runtime", async () => {
  const { artifactRoot, manifest } = await fixture();
  const contentPath = join(artifactRoot, manifest.artifacts[0].contentPath);
  const content = JSON.parse(await readFile(contentPath, "utf8"));
  content.runtime.monitorDatabaseInstanceId = "database-reused";
  const changed = `${JSON.stringify(content, null, 2)}\n`;
  await writeFile(contentPath, changed);
  manifest.artifacts[0].contentSha256 = sha256(changed);
  const provenance = `${JSON.stringify(browserArtifactProvenance(manifest.artifacts[0]), null, 2)}\n`;
  await writeFile(join(artifactRoot, manifest.artifacts[0].provenancePath), provenance);
  manifest.artifacts[0].provenanceSha256 = sha256(provenance);
  assert.ok((await validateStage5BrowserEvidence(manifest, { schema, artifactRoot })).some((error) => error.includes("runtime identity snapshot payload mismatch")));
});

test("rejects incomplete cleanup and a cleanup file that contradicts the manifest", async () => {
  const { artifactRoot, manifest } = await fixture();
  const incomplete = structuredClone(manifest); incomplete.cleanup.sourceRestored = false;
  assert.ok((await validateStage5BrowserEvidence(incomplete, { schema, artifactRoot })).some((error) => error.includes("requires complete cleanup")));

  const cleanupPath = join(artifactRoot, manifest.cleanup.artifactPath);
  const cleanup = JSON.parse(await readFile(cleanupPath, "utf8"));
  cleanup.monitorStateDisposed = false;
  const changed = `${JSON.stringify(cleanup, null, 2)}\n`;
  await writeFile(cleanupPath, changed);
  manifest.cleanup.artifactSha256 = sha256(changed);
  assert.ok((await validateStage5BrowserEvidence(manifest, { schema, artifactRoot })).some((error) => error.includes("cleanup artifact payload mismatch")));
});

test("JSON Schema compilation stays strict and canonicalization is deterministic", () => {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  assert.equal(typeof ajv.compile(schema), "function");
  assert.equal(canonicalJson({ z: 1, a: { y: 2, b: 3 } }), canonicalJson({ a: { b: 3, y: 2 }, z: 1 }));
});
