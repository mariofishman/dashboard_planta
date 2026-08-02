import assert from "node:assert/strict";
import test from "node:test";
import {
  assertStage5BrowserRuntimeHandshake,
  createStage5BrowserHarnessSeed,
  fetchStage5BrowserRuntimeIdentity,
  stage5BrowserManifestRuntime,
  stage5BrowserSurfaceTargets,
} from "./lib/stage5-browser-harness.mjs";
import { browserServiceIdentityDigest } from "./lib/stage5-browser-evidence.mjs";

const seed = createStage5BrowserHarnessSeed({
  runId: "browser-run-1",
  experimentId: "experiment-1",
  runtimeId: "browser-runtime-1",
  captureNonce: "abcdefghijklmnop",
  manifestVersion: "2.0.0",
  sourceActionContractVersion: "1.1.0",
  startedAt: "2026-08-02T13:00:00.000Z",
  apiOrigin: "http://127.0.0.1:3010",
});

const snapshot = {
  schemaVersion: "1.0.0",
  kind: "stage5_browser_runtime_identity",
  identity: { runId: seed.runId, experimentId: seed.experimentId, runtimeId: seed.runtimeId, captureNonce: seed.captureNonce, manifestVersion: seed.manifestVersion, sourceActionContractVersion: seed.sourceActionContractVersion, startedAt: seed.startedAt },
  runtime: {
    mode: "connected", sourceKind: "test_database", sourceAccount: "monitor_source_ro",
    apiOrigin: seed.apiOrigin, webOrigin: "http://127.0.0.1:5180", identityEndpoint: "/api/dev/stage5/runtime-identity",
    monitorDatabaseInstanceId: "monitor-db:1", schedulerOwnerId: "scheduler:1", startedAt: seed.startedAt,
    services: [
      { name: "laboratory", instanceId: "browser-runtime-1", location: "http://127.0.0.1:5180/dev/scenarios" },
      { name: "api", instanceId: "browser-runtime-1", location: "http://127.0.0.1:3010/api/dev/stage5/runtime-identity" },
      { name: "scheduler", instanceId: "scheduler:1", location: "scheduler:scheduler:1" },
      { name: "monitor_database", instanceId: "monitor-db:1", location: "monitor-database:monitor-db:1" },
      { name: "dashboard", instanceId: "browser-runtime-1", location: "http://127.0.0.1:5180/" },
      { name: "chat", instanceId: "browser-runtime-1", location: "http://127.0.0.1:5180/chats" },
    ].map((service) => ({ ...service, identityDigest: `sha256:${"a".repeat(64)}` })),
    surfaces: [
      { name: "laboratory", url: "http://127.0.0.1:5180/dev/scenarios", identityUrl: "http://127.0.0.1:3010/api/dev/stage5/runtime-identity" },
      { name: "dashboard", url: "http://127.0.0.1:5180/", identityUrl: "http://127.0.0.1:3010/api/dev/stage5/runtime-identity" },
      { name: "chat_list", url: "http://127.0.0.1:5180/chats", identityUrl: "http://127.0.0.1:3010/api/dev/stage5/runtime-identity" },
      { name: "chat_detail", url: "http://127.0.0.1:5180/chats/%7BconversationId%7D", identityUrl: "http://127.0.0.1:3010/api/dev/stage5/runtime-identity" },
    ],
  },
};
for (const service of snapshot.runtime.services) service.identityDigest = browserServiceIdentityDigest(snapshot.identity, service);

test("accepts one exact handshake and resolves all surface targets", () => {
  assert.equal(assertStage5BrowserRuntimeHandshake(snapshot, seed), snapshot);
  const targets = stage5BrowserSurfaceTargets(snapshot, { conversationId: "conversation:42" });
  assert.equal(targets.chat_detail, "http://127.0.0.1:5180/chats/conversation%3A42");
  assert.equal(stage5BrowserManifestRuntime(snapshot, "runtime-identity-1").identityArtifactId, "runtime-identity-1");
});

test("rejects substituted identity, synthetic source, and incomplete surface coverage", () => {
  assert.throws(() => assertStage5BrowserRuntimeHandshake({ ...structuredClone(snapshot), identity: { ...snapshot.identity, runtimeId: "runtime-other" } }, seed), /runtimeId/);
  assert.throws(() => assertStage5BrowserRuntimeHandshake({ ...structuredClone(snapshot), runtime: { ...snapshot.runtime, sourceKind: "monitor_sim" } }, seed), /not_connected/);
  const incomplete = structuredClone(snapshot); incomplete.runtime.surfaces.pop();
  assert.throws(() => assertStage5BrowserRuntimeHandshake(incomplete, seed), /surface_coverage_mismatch/);
  const forgedService = structuredClone(snapshot); forgedService.runtime.services[0].identityDigest = `sha256:${"0".repeat(64)}`;
  assert.throws(() => assertStage5BrowserRuntimeHandshake(forgedService, seed), /service_digest_mismatch/);
  assert.throws(() => createStage5BrowserHarnessSeed({ ...seed, captureNonce: "short" }), /captureNonce/);
});

test("fetches the identity endpoint and fails closed on HTTP errors", async () => {
  const requested = [];
  const fetched = await fetchStage5BrowserRuntimeIdentity({
    apiOrigin: seed.apiOrigin, cookie: "monitor_session=test", seed,
    fetchImpl: async (url, init) => { requested.push({ url, init }); return new Response(JSON.stringify(snapshot), { status: 200, headers: { "content-type": "application/json" } }); },
  });
  assert.equal(fetched.identity.runId, seed.runId);
  assert.equal(requested[0].url, "http://127.0.0.1:3010/api/dev/stage5/runtime-identity");
  assert.equal(requested[0].init.headers.cookie, "monitor_session=test");
  await assert.rejects(fetchStage5BrowserRuntimeIdentity({ apiOrigin: seed.apiOrigin, seed, fetchImpl: async () => new Response("missing", { status: 404 }) }), /request_failed:404/);
});
