import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

export const STAGE5_BROWSER_SCHEMA_VERSION = "1.0.0";
export const STAGE5_BROWSER_GATE = "phase6-stage5-step8";
export const STAGE5_BROWSER_SERVICE_NAMES = Object.freeze(["laboratory", "api", "scheduler", "monitor_database", "dashboard", "chat"]);
export const STAGE5_BROWSER_SURFACE_NAMES = Object.freeze(["laboratory", "dashboard", "chat_list", "chat_detail"]);

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, canonicalize(child)]));
  return value;
};

export const canonicalJson = (value) => JSON.stringify(canonicalize(value));
export const sha256 = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
export const sha256Json = (value) => sha256(canonicalJson(value));

const identityProjection = (identity) => ({
  runId: identity.runId,
  experimentId: identity.experimentId,
  runtimeId: identity.runtimeId,
  captureNonce: identity.captureNonce,
});

export function browserServiceIdentityDigest(identity, service) {
  return sha256Json({ schemaVersion: STAGE5_BROWSER_SCHEMA_VERSION, identity: identityProjection(identity), service: { name: service.name, instanceId: service.instanceId, location: service.location } });
}

export function browserArtifactProvenance(artifact) {
  return {
    schemaVersion: STAGE5_BROWSER_SCHEMA_VERSION,
    artifactId: artifact.artifactId,
    surface: artifact.surface,
    artifactKind: artifact.artifactKind,
    ...(artifact.viewport ? { viewport: artifact.viewport } : {}),
    capturedAt: artifact.capturedAt,
    identity: artifact.identity,
    runtime: {
      apiOrigin: artifact.apiOrigin,
      webOrigin: artifact.webOrigin,
      monitorDatabaseInstanceId: artifact.monitorDatabaseInstanceId,
      schedulerOwnerId: artifact.schedulerOwnerId,
    },
    content: { path: artifact.contentPath, sha256: artifact.contentSha256 },
    objectReferences: artifact.objectReferences,
    chainReference: artifact.chainReference,
  };
}

export function browserRuntimeIdentitySnapshot(manifest) {
  return {
    schemaVersion: STAGE5_BROWSER_SCHEMA_VERSION,
    kind: "stage5_browser_runtime_identity",
    identity: {
      ...identityProjection(manifest.identity),
      manifestVersion: manifest.identity.manifestVersion,
      sourceActionContractVersion: manifest.identity.sourceActionContractVersion,
      startedAt: manifest.identity.startedAt,
    },
    runtime: {
      mode: manifest.runtime.mode,
      sourceKind: manifest.runtime.sourceKind,
      sourceAccount: manifest.runtime.sourceAccount,
      apiOrigin: manifest.runtime.apiOrigin,
      webOrigin: manifest.runtime.webOrigin,
      identityEndpoint: manifest.runtime.identityEndpoint,
      monitorDatabaseInstanceId: manifest.runtime.monitorDatabaseInstanceId,
      schedulerOwnerId: manifest.runtime.schedulerOwnerId,
      startedAt: manifest.runtime.startedAt,
      services: manifest.runtime.services,
      surfaces: manifest.runtime.surfaces,
    },
  };
}

export function browserCleanupEvidence(manifest) {
  return {
    schemaVersion: STAGE5_BROWSER_SCHEMA_VERSION,
    kind: "stage5_browser_runtime_cleanup",
    identity: identityProjection(manifest.identity),
    executedInFinally: manifest.cleanup.executedInFinally,
    completed: manifest.cleanup.completed,
    sourceRestored: manifest.cleanup.sourceRestored,
    monitorStateDisposed: manifest.cleanup.monitorStateDisposed,
    completedAt: manifest.identity.completedAt,
  };
}

function uniqueValues(values, label, errors) {
  if (new Set(values).size !== values.length) errors.push(`${label} must be unique`);
}

function exactNames(values, expected, label, errors) {
  const actual = [...values].sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) errors.push(`${label} must contain exactly ${wanted.join(", ")}`);
}

function validDate(value) {
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

function originOf(value) {
  try { return new URL(value).origin; } catch { return null; }
}

const exactArray = (actual, expected) => Array.isArray(actual)
  && actual.length === expected.length
  && actual.every((value, index) => value === expected[index]);

export function browserEvidenceContentErrors(artifact, payload) {
  const errors = [];
  const hasReference = (type, id) => artifact.objectReferences?.some((reference) => reference.type === type && reference.id === id);
  const requireTrue = (...fields) => {
    for (const field of fields) if (payload[field] !== true) errors.push(`${artifact.artifactId} must prove ${field}`);
  };
  if (payload.artifactId !== artifact.artifactId) errors.push(`${artifact.artifactId} content artifactId mismatch`);
  if (artifact.artifactKind === "console") {
    if (payload.collectionMethod !== "browser-console-review") errors.push(`${artifact.artifactId} lacks browser console collection provenance`);
    if (!Number.isInteger(payload.observedEntryCount) || payload.observedEntryCount < 0) errors.push(`${artifact.artifactId} lacks an observed console entry count`);
  }
  if (artifact.artifactId === "lab-interaction") {
    requireTrue("normalScheduler", "pendingStateObserved", "historyKeyboardDismissed", "failedReadPreserved", "healthyRecoveryNoDuplicates");
    if (!exactArray(payload.tabs, ["A02 · Movimientos", "A03 · Consumo OT", "A05 · Bobinas", "Integridad"])) errors.push("lab-interaction must prove the four approved tabs in order");
  }
  if (artifact.artifactId === "lab-accessibility") {
    requireTrue("keyboardDismissal", "focusOrderVerified", "accessibleNamesVerified", "reducedMotionVerified");
    if (!exactArray(payload.widths, [1440, 768, 390])) errors.push("lab-accessibility must cover 1440, 768, and 390 pixels");
  }
  if (artifact.artifactId === "dashboard-interaction") {
    requireTrue("openDrilldown", "emptyState", "legalSourceResolution", "sameIncidentResolved", "singularChainPreserved", "chartInteractionVerified");
    if (!hasReference("incident", payload.incidentId)) errors.push("dashboard-interaction incidentId is not bound to its artifact references");
  }
  if (artifact.artifactId === "dashboard-accessibility") requireTrue("dialogKeyboardDismissal", "focusOrderVerified", "accessibleNamesVerified", "reducedMotionVerified");
  if (artifact.artifactId === "chat-list-interaction") {
    requireTrue("filtersVerified", "rowOrderingVerified", "menuKeyboardDismissed", "directFailClosed", "authorizationStable");
    if (payload.authorizedCount !== 1 || payload.nonparticipantCount !== 0 || payload.composerExposed !== false) errors.push("chat-list-interaction must prove participant and nonparticipant isolation");
    if (!hasReference("conversation", payload.conversationId) || !hasReference("cursor", String(payload.messageCursor))) errors.push("chat-list-interaction conversation and cursor are not bound to its artifact references");
  }
  if (artifact.artifactId === "chat-list-accessibility") requireTrue("focusOrderVerified", "accessibleNamesVerified", "reducedMotionVerified", "neutralUnauthorizedCopy");
  if (artifact.artifactId === "chat-detail-interaction") {
    requireTrue("receiptAuthoritative", "alertExpanded", "messageMenuKeyboardDismissed", "searchEmptyStateVerified", "statePreserved");
    if (typeof payload.copyTarget !== "string" || payload.copyTarget.length === 0) errors.push("chat-detail-interaction lacks the exact work-order copy target");
    if (!hasReference("conversation", payload.conversationId) || !hasReference("message", payload.messageId) || !hasReference("receipt", payload.receiptId)) errors.push("chat-detail-interaction exact objects are not bound to its artifact references");
  }
  if (artifact.artifactId === "chat-detail-accessibility") requireTrue("focusOrderVerified", "accessibleNamesVerified", "reducedMotionVerified", "keyboardReachableActions");
  if (artifact.artifactKind === "reconnect") {
    requireTrue("sameRuntime", "stableObjects", "authorizationStable", "orderingStable", "readStateStable", "emptyAppliedCursorReplay");
    if (typeof payload.preStateDigest !== "string" || payload.preStateDigest !== payload.postStateDigest) errors.push(`${artifact.artifactId} lacks equal pre/post state digests`);
  }
  return errors;
}

function semanticErrors(manifest, expectedIdentity) {
  const errors = [];
  const identity = manifest.identity;
  const runtime = manifest.runtime;
  if (manifest.claim.level === "diagnostic" && manifest.claim.accepted !== false) errors.push("diagnostic evidence cannot be accepted");
  if (manifest.claim.accepted && manifest.claim.level !== "aggregate") errors.push("accepted browser evidence must be aggregate");
  if (!manifest.cleanup.executedInFinally || !manifest.cleanup.completed || !manifest.cleanup.sourceRestored || !manifest.cleanup.monitorStateDisposed) errors.push("browser evidence requires complete cleanup and restoration");
  const startedAt = validDate(identity.startedAt);
  const completedAt = validDate(identity.completedAt);
  const runtimeStartedAt = validDate(runtime.startedAt);
  if (startedAt !== null && completedAt !== null && completedAt < startedAt) errors.push("manifest completedAt precedes startedAt");
  if (runtimeStartedAt !== startedAt) errors.push("runtime startedAt must equal manifest startedAt");
  if (expectedIdentity) for (const key of ["runId", "experimentId", "runtimeId", "captureNonce"]) {
    if (identity[key] !== expectedIdentity[key]) errors.push(`manifest identity mismatch: ${key}`);
  }

  const serviceNames = runtime.services.map(({ name }) => name);
  exactNames(serviceNames, STAGE5_BROWSER_SERVICE_NAMES, "runtime services", errors);
  uniqueValues(serviceNames, "runtime service names", errors);
  for (const service of runtime.services) if (service.identityDigest !== browserServiceIdentityDigest(identity, service)) errors.push(`service identity digest mismatch: ${service.name}`);

  const surfaceNames = runtime.surfaces.map(({ name }) => name);
  exactNames(surfaceNames, STAGE5_BROWSER_SURFACE_NAMES, "runtime surfaces", errors);
  uniqueValues(surfaceNames, "runtime surface names", errors);
  for (const surface of runtime.surfaces) {
    if (originOf(surface.url) !== runtime.webOrigin) errors.push(`surface uses a different web runtime: ${surface.name}`);
    if (surface.identityUrl !== `${runtime.apiOrigin}${runtime.identityEndpoint}`) errors.push(`surface identity endpoint mismatch: ${surface.name}`);
  }

  const apiService = runtime.services.find(({ name }) => name === "api");
  const schedulerService = runtime.services.find(({ name }) => name === "scheduler");
  const databaseService = runtime.services.find(({ name }) => name === "monitor_database");
  if (apiService?.location !== `${runtime.apiOrigin}${runtime.identityEndpoint}`) errors.push("API service location does not identify the runtime endpoint");
  if (schedulerService?.instanceId !== runtime.schedulerOwnerId) errors.push("scheduler service owner mismatch");
  if (databaseService?.instanceId !== runtime.monitorDatabaseInstanceId) errors.push("Monitor database service instance mismatch");

  uniqueValues(manifest.artifacts.map(({ artifactId }) => artifactId), "artifact IDs", errors);
  uniqueValues(manifest.artifacts.map(({ contentPath }) => contentPath), "artifact content paths", errors);
  uniqueValues(manifest.artifacts.map(({ provenancePath }) => provenancePath), "artifact provenance paths", errors);
  uniqueValues(manifest.artifacts.map(({ contentSha256 }) => contentSha256), "artifact content digests", errors);
  const identityArtifacts = manifest.artifacts.filter(({ artifactId }) => artifactId === runtime.identityArtifactId);
  if (identityArtifacts.length !== 1 || identityArtifacts[0].surface !== "runtime" || identityArtifacts[0].artifactKind !== "identity_snapshot") errors.push("runtime identityArtifactId must select exactly one runtime identity snapshot");
  for (const artifact of manifest.artifacts) {
    for (const key of ["runId", "experimentId", "runtimeId", "captureNonce"]) if (artifact.identity[key] !== identity[key]) errors.push(`artifact identity mismatch: ${artifact.artifactId}:${key}`);
    if (artifact.apiOrigin !== runtime.apiOrigin || artifact.webOrigin !== runtime.webOrigin) errors.push(`artifact origin mismatch: ${artifact.artifactId}`);
    if (artifact.monitorDatabaseInstanceId !== runtime.monitorDatabaseInstanceId) errors.push(`artifact database mismatch: ${artifact.artifactId}`);
    if (artifact.schedulerOwnerId !== runtime.schedulerOwnerId) errors.push(`artifact scheduler mismatch: ${artifact.artifactId}`);
    const capturedAt = validDate(artifact.capturedAt);
    if (capturedAt !== null && startedAt !== null && completedAt !== null && (capturedAt < startedAt || capturedAt > completedAt)) errors.push(`artifact timestamp outside runtime: ${artifact.artifactId}`);
    const referenceKeys = artifact.objectReferences.map(({ type, id }) => `${type}:${id}`);
    uniqueValues(referenceKeys, `artifact object references: ${artifact.artifactId}`, errors);
    if (!artifact.objectReferences.some(({ type, id }) => type === "experiment" && id === identity.experimentId)) errors.push(`artifact lacks the runtime experiment reference: ${artifact.artifactId}`);
    if (artifact.surface !== "chat_detail" && artifact.artifactKind !== "reconnect" && artifact.objectReferences.some(({ type }) => type === "receipt")) {
      errors.push(`artifact claims a receipt before receipt evidence is in scope: ${artifact.artifactId}`);
    }
  }
  if (manifest.claim.accepted) {
    const surfaceArtifacts = manifest.artifacts.filter(({ surface }) => surface !== "runtime");
    const expectedSurfaces = ["laboratory", "dashboard", "chat_list", "chat_detail"];
    for (const surface of expectedSurfaces) {
      const artifacts = surfaceArtifacts.filter((artifact) => artifact.surface === surface);
      for (const kind of ["accessibility", "interaction", "console", "reconnect"]) {
        if (!artifacts.some((artifact) => artifact.artifactKind === kind)) errors.push(`accepted aggregate lacks ${surface} ${kind} evidence`);
      }
      for (const width of [1440, 768, 390]) {
        if (!artifacts.some((artifact) => artifact.artifactKind === "screenshot" && artifact.viewport?.width === width)) errors.push(`accepted aggregate lacks ${surface} ${width}px screenshot`);
      }
    }
    const referenceTypes = new Set(surfaceArtifacts.flatMap(({ objectReferences }) => objectReferences.map(({ type }) => type)));
    for (const type of ["experiment", "poll_cycle", "incident", "routing_decision", "delivery", "conversation", "message", "receipt", "cursor"]) {
      if (!referenceTypes.has(type)) errors.push(`accepted aggregate lacks exact object reference type: ${type}`);
    }
    if (!surfaceArtifacts.some(({ artifactId }) => artifactId === "cross-surface-reconnect")) errors.push("accepted aggregate lacks cross-surface reconnect comparison");
  }
  return errors;
}

async function containedFile(root, path, label, errors) {
  if (isAbsolute(path)) { errors.push(`${label} must be relative`); return null; }
  const absoluteRoot = resolve(root);
  const absolutePath = resolve(absoluteRoot, path);
  const relation = relative(absoluteRoot, absolutePath);
  if (relation === ".." || relation.startsWith(`..${sep}`) || isAbsolute(relation)) { errors.push(`${label} escapes artifact root`); return null; }
  try {
    const [rootReal, pathReal, info] = await Promise.all([realpath(absoluteRoot), realpath(absolutePath), stat(absolutePath)]);
    if (pathReal !== rootReal && !pathReal.startsWith(`${rootReal}${sep}`)) { errors.push(`${label} resolves outside artifact root`); return null; }
    if (!info.isFile()) { errors.push(`${label} is not a regular file`); return null; }
    return { absolutePath, bytes: await readFile(absolutePath) };
  } catch { errors.push(`${label} does not exist`); return null; }
}

export async function validateStage5BrowserEvidence(manifest, { schema, artifactRoot, expectedIdentity } = {}) {
  if (!schema || !artifactRoot) throw new Error("browser_evidence_validator_options_required");
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validateSchema = ajv.compile(schema);
  if (!validateSchema(manifest)) return (validateSchema.errors ?? []).map((error) => `schema ${error.instancePath || "/"} ${error.message}`);
  const errors = semanticErrors(manifest, expectedIdentity);
  for (const artifact of manifest.artifacts) {
    const content = await containedFile(artifactRoot, artifact.contentPath, `artifact content ${artifact.artifactId}`, errors);
    if (content && sha256(content.bytes) !== artifact.contentSha256) errors.push(`artifact content digest mismatch: ${artifact.artifactId}`);
    if (content && artifact.artifactId === manifest.runtime.identityArtifactId) {
      try {
        const parsed = JSON.parse(content.bytes.toString("utf8"));
        if (canonicalJson(parsed) !== canonicalJson(browserRuntimeIdentitySnapshot(manifest))) errors.push("runtime identity snapshot payload mismatch");
      } catch { errors.push("runtime identity snapshot is not valid JSON"); }
    }
    if (content && manifest.claim.accepted && ["accessibility", "console", "reconnect"].includes(artifact.artifactKind)) {
      try {
        const parsed = JSON.parse(content.bytes.toString("utf8"));
        if (artifact.artifactKind === "accessibility" && parsed.noDocumentOverflow !== true) errors.push(`accessibility evidence does not prove no overflow: ${artifact.artifactId}`);
        if (artifact.artifactKind === "console" && (parsed.clean !== true || !Array.isArray(parsed.unexpected) || parsed.unexpected.length !== 0)) errors.push(`console evidence is not clean: ${artifact.artifactId}`);
        if (artifact.artifactKind === "reconnect" && (parsed.sameRuntime !== true || parsed.stableObjects !== true)) errors.push(`reconnect evidence is not stable: ${artifact.artifactId}`);
        errors.push(...browserEvidenceContentErrors(artifact, parsed));
      } catch { errors.push(`artifact evidence is not valid JSON: ${artifact.artifactId}`); }
    }
    if (content && manifest.claim.accepted && artifact.artifactKind === "interaction") {
      try { errors.push(...browserEvidenceContentErrors(artifact, JSON.parse(content.bytes.toString("utf8")))); }
      catch { errors.push(`artifact evidence is not valid JSON: ${artifact.artifactId}`); }
    }
    const provenance = await containedFile(artifactRoot, artifact.provenancePath, `artifact provenance ${artifact.artifactId}`, errors);
    if (provenance) {
      if (sha256(provenance.bytes) !== artifact.provenanceSha256) errors.push(`artifact provenance digest mismatch: ${artifact.artifactId}`);
      try {
        const parsed = JSON.parse(provenance.bytes.toString("utf8"));
        if (canonicalJson(parsed) !== canonicalJson(browserArtifactProvenance(artifact))) errors.push(`artifact provenance payload mismatch: ${artifact.artifactId}`);
      } catch { errors.push(`artifact provenance is not valid JSON: ${artifact.artifactId}`); }
    }
  }
  const cleanup = await containedFile(artifactRoot, manifest.cleanup.artifactPath, "cleanup artifact", errors);
  if (cleanup) {
    if (sha256(cleanup.bytes) !== manifest.cleanup.artifactSha256) errors.push("cleanup artifact digest mismatch");
    try {
      const parsed = JSON.parse(cleanup.bytes.toString("utf8"));
      if (canonicalJson(parsed) !== canonicalJson(browserCleanupEvidence(manifest))) errors.push("cleanup artifact payload mismatch");
    } catch { errors.push("cleanup artifact is not valid JSON"); }
  }
  return [...new Set(errors)];
}

export async function assertValidStage5BrowserEvidence(manifest, options) {
  const errors = await validateStage5BrowserEvidence(manifest, options);
  if (errors.length > 0) throw new Error(`Invalid Stage 5 browser evidence:\n- ${errors.join("\n- ")}`);
  return manifest;
}
