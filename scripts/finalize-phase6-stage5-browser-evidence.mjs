import assert from "node:assert/strict";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  browserArtifactProvenance,
  browserCleanupEvidence,
  canonicalJson,
  sha256,
  validateStage5BrowserEvidence,
} from "./lib/stage5-browser-evidence.mjs";

const root = resolve(import.meta.dirname, "..");
assert.ok(process.env.STEP8_EVIDENCE_ROOT, "STEP8_EVIDENCE_ROOT is required");
const evidenceRoot = resolve(process.env.STEP8_EVIDENCE_ROOT);
const artifactsRoot = resolve(evidenceRoot, "artifacts");
const schema = JSON.parse(await readFile(resolve(root, "config/detection/schemas/stage5-browser-evidence.v1.schema.json"), "utf8"));
const runtimeSnapshot = JSON.parse(await readFile(resolve(artifactsRoot, "runtime-identity.json"), "utf8"));
const cleanupPayload = JSON.parse(await readFile(resolve(artifactsRoot, "cleanup.json"), "utf8"));
const browserResults = JSON.parse(await readFile(resolve(evidenceRoot, "browser-results.json"), "utf8"));
const browserArtifacts = new Map(browserResults.artifacts.map((artifact) => [artifact.artifactId, artifact]));
const provenanceNames = (await readdir(artifactsRoot)).filter((name) => name.endsWith(".provenance.json")).sort();

const artifacts = [];
for (const name of provenanceNames) {
  const originalProvenancePath = `artifacts/${name}`;
  const provenanceBytes = await readFile(resolve(evidenceRoot, originalProvenancePath));
  const provenance = JSON.parse(provenanceBytes.toString("utf8"));
  const browserArtifact = browserArtifacts.get(provenance.artifactId);
  const artifact = {
    artifactId: provenance.artifactId,
    surface: provenance.surface,
    artifactKind: provenance.artifactKind,
    ...(browserArtifact?.viewport ? { viewport: browserArtifact.viewport } : {}),
    contentPath: provenance.content.path,
    contentSha256: provenance.content.sha256,
    provenancePath: `artifacts/${provenance.artifactId}.aggregate.provenance.json`,
    provenanceSha256: "",
    capturedAt: provenance.capturedAt,
    identity: provenance.identity,
    apiOrigin: provenance.runtime.apiOrigin,
    webOrigin: provenance.runtime.webOrigin,
    monitorDatabaseInstanceId: provenance.runtime.monitorDatabaseInstanceId,
    schedulerOwnerId: provenance.runtime.schedulerOwnerId,
    objectReferences: provenance.objectReferences,
    chainReference: provenance.chainReference,
  };
  if (browserArtifact) {
    assert.equal(browserArtifact.contentPath, artifact.contentPath, `browser content path mismatch: ${artifact.artifactId}`);
    assert.equal(browserArtifact.attachmentId, artifact.chainReference.attachmentId, `browser attachment mismatch: ${artifact.artifactId}`);
  }
  const content = await readFile(resolve(evidenceRoot, artifact.contentPath));
  assert.equal(sha256(content), artifact.contentSha256, `content digest mismatch: ${artifact.artifactId}`);
  const expectedProvenance = browserArtifactProvenance(artifact);
  const { viewport: _viewport, ...expectedOriginalProvenance } = expectedProvenance;
  assert.equal(canonicalJson(provenance), canonicalJson(expectedOriginalProvenance), `original provenance mismatch: ${name}`);
  const aggregateProvenance = `${JSON.stringify(expectedProvenance, null, 2)}\n`;
  artifact.provenanceSha256 = sha256(aggregateProvenance);
  await writeFile(resolve(evidenceRoot, artifact.provenancePath), aggregateProvenance, { flag: "wx" });
  artifacts.push(artifact);
}

const identity = { ...runtimeSnapshot.identity, completedAt: cleanupPayload.completedAt };
const manifest = {
  schemaVersion: "1.0.0",
  kind: "browser_evidence_manifest",
  gate: "phase6-stage5-step8",
  claim: { level: "aggregate", accepted: true },
  identity,
  runtime: { ...runtimeSnapshot.runtime, identityArtifactId: "runtime-identity" },
  artifacts,
  cleanup: {
    executedInFinally: cleanupPayload.executedInFinally,
    completed: cleanupPayload.completed,
    sourceRestored: cleanupPayload.sourceRestored,
    monitorStateDisposed: cleanupPayload.monitorStateDisposed,
    artifactPath: "artifacts/cleanup.json",
    artifactSha256: sha256(await readFile(resolve(artifactsRoot, "cleanup.json"))),
  },
};
assert.equal(canonicalJson(cleanupPayload), canonicalJson(browserCleanupEvidence(manifest)), "cleanup payload mismatch");
const errors = await validateStage5BrowserEvidence(manifest, { schema, artifactRoot: evidenceRoot, expectedIdentity: identity });
assert.deepEqual(errors, []);
await writeFile(resolve(evidenceRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
process.stdout.write(`${JSON.stringify({ accepted: true, evidenceRoot, artifacts: artifacts.length })}\n`);
