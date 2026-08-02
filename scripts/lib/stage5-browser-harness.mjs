import { randomBytes, randomUUID } from "node:crypto";
import { STAGE5_BROWSER_SERVICE_NAMES, STAGE5_BROWSER_SURFACE_NAMES, browserServiceIdentityDigest, canonicalJson } from "./stage5-browser-evidence.mjs";

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const CAPTURE_NONCE = /^[A-Za-z0-9_-]{16,128}$/;

export function createStage5BrowserHarnessSeed(input) {
  for (const key of ["runId", "experimentId"]) if (!IDENTIFIER.test(input?.[key])) throw new Error(`invalid_stage5_browser_harness_seed:${key}`);
  for (const key of ["manifestVersion", "sourceActionContractVersion"]) if (typeof input?.[key] !== "string" || input[key].length === 0) throw new Error(`invalid_stage5_browser_harness_seed:${key}`);
  const startedAt = input.startedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(startedAt))) throw new Error("invalid_stage5_browser_harness_seed:startedAt");
  const apiOrigin = new URL(input.apiOrigin).origin;
  if (apiOrigin !== input.apiOrigin) throw new Error("invalid_stage5_browser_harness_seed:apiOrigin");
  const seed = {
    runId: input.runId,
    experimentId: input.experimentId,
    runtimeId: input.runtimeId ?? `browser-runtime-${randomUUID()}`,
    captureNonce: input.captureNonce ?? randomBytes(24).toString("base64url"),
    manifestVersion: input.manifestVersion,
    sourceActionContractVersion: input.sourceActionContractVersion,
    startedAt,
    apiOrigin,
  };
  if (!IDENTIFIER.test(seed.runtimeId)) throw new Error("invalid_stage5_browser_harness_seed:runtimeId");
  if (!CAPTURE_NONCE.test(seed.captureNonce)) throw new Error("invalid_stage5_browser_harness_seed:captureNonce");
  return seed;
}

export function assertStage5BrowserRuntimeHandshake(snapshot, seed) {
  if (snapshot?.schemaVersion !== "1.0.0" || snapshot.kind !== "stage5_browser_runtime_identity") throw new Error("invalid_stage5_browser_runtime_handshake");
  for (const key of ["runId", "experimentId", "runtimeId", "captureNonce", "manifestVersion", "sourceActionContractVersion", "startedAt"]) {
    if (snapshot.identity?.[key] !== seed[key]) throw new Error(`stage5_browser_runtime_handshake_mismatch:${key}`);
  }
  if (snapshot.runtime?.mode !== "connected" || snapshot.runtime?.sourceKind !== "test_database" || snapshot.runtime?.sourceAccount !== "monitor_source_ro") throw new Error("stage5_browser_runtime_not_connected");
  if (snapshot.runtime.apiOrigin !== seed.apiOrigin || snapshot.runtime.startedAt !== seed.startedAt) throw new Error("stage5_browser_runtime_origin_or_time_mismatch");
  const services = snapshot.runtime.services?.map(({ name }) => name) ?? [];
  const surfaces = snapshot.runtime.surfaces?.map(({ name }) => name) ?? [];
  if (canonicalJson([...services].sort()) !== canonicalJson([...STAGE5_BROWSER_SERVICE_NAMES].sort())) throw new Error("stage5_browser_runtime_service_coverage_mismatch");
  if (canonicalJson([...surfaces].sort()) !== canonicalJson([...STAGE5_BROWSER_SURFACE_NAMES].sort())) throw new Error("stage5_browser_runtime_surface_coverage_mismatch");
  for (const service of snapshot.runtime.services) if (service.identityDigest !== browserServiceIdentityDigest(snapshot.identity, service)) throw new Error(`stage5_browser_runtime_service_digest_mismatch:${service.name}`);
  const apiService = snapshot.runtime.services.find(({ name }) => name === "api");
  const schedulerService = snapshot.runtime.services.find(({ name }) => name === "scheduler");
  const databaseService = snapshot.runtime.services.find(({ name }) => name === "monitor_database");
  if (apiService?.location !== `${snapshot.runtime.apiOrigin}${snapshot.runtime.identityEndpoint}`) throw new Error("stage5_browser_runtime_api_service_mismatch");
  if (schedulerService?.instanceId !== snapshot.runtime.schedulerOwnerId) throw new Error("stage5_browser_runtime_scheduler_service_mismatch");
  if (databaseService?.instanceId !== snapshot.runtime.monitorDatabaseInstanceId) throw new Error("stage5_browser_runtime_database_service_mismatch");
  for (const surface of snapshot.runtime.surfaces) {
    if (new URL(surface.url).origin !== snapshot.runtime.webOrigin || surface.identityUrl !== `${snapshot.runtime.apiOrigin}${snapshot.runtime.identityEndpoint}`) throw new Error(`stage5_browser_surface_runtime_mismatch:${surface.name}`);
  }
  return snapshot;
}

export async function fetchStage5BrowserRuntimeIdentity({ apiOrigin, cookie, authorization, seed, fetchImpl = fetch }) {
  const headers = { ...(cookie ? { cookie } : {}), ...(authorization ? { authorization } : {}) };
  const response = await fetchImpl(`${apiOrigin}/api/dev/stage5/runtime-identity`, {
    headers,
    redirect: "error",
  });
  if (!response.ok) throw new Error(`stage5_browser_runtime_identity_request_failed:${response.status}`);
  return assertStage5BrowserRuntimeHandshake(await response.json(), seed);
}

export function stage5BrowserSurfaceTargets(snapshot, { conversationId } = {}) {
  return Object.fromEntries(snapshot.runtime.surfaces.map((surface) => [surface.name,
    surface.name === "chat_detail" && conversationId ? surface.url.replace("%7BconversationId%7D", encodeURIComponent(conversationId)) : surface.url]));
}

export function stage5BrowserManifestRuntime(snapshot, identityArtifactId) {
  if (!IDENTIFIER.test(identityArtifactId)) throw new Error("invalid_stage5_browser_identity_artifact_id");
  return { ...structuredClone(snapshot.runtime), identityArtifactId };
}
