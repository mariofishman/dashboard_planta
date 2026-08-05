import type { DatabaseRuntime } from "@monitor/database";
import type { ScenarioExperimentRuntime } from "@monitor/detection";
import type { Stage5BrowserRuntimeIdentity, Stage5BrowserServiceIdentity, Stage5BrowserServiceName, Stage5BrowserSurfaceIdentity } from "@monitor/contracts";
import { createHash } from "node:crypto";

export interface Stage5BrowserRuntimeSeed {
  runId: string;
  experimentId: string;
  runtimeId: string;
  captureNonce: string;
  manifestVersion: string;
  sourceActionContractVersion: string;
  startedAt: string;
}

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const NONCE = /^[A-Za-z0-9_-]{16,128}$/;
const SERVICE_NAMES: Stage5BrowserServiceName[] = ["laboratory", "api", "scheduler", "monitor_database", "dashboard", "chat"];
const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, canonicalize(child)]));
  return value;
};
const digest = (value: unknown) => `sha256:${createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex")}`;
const origin = (value: string) => {
  const parsed = new URL(value);
  if (!/^https?:$/.test(parsed.protocol) || parsed.pathname !== "/" || parsed.search || parsed.hash) throw new Error("invalid_stage5_browser_runtime_origin");
  return parsed.origin;
};

function validateSeed(seed: Stage5BrowserRuntimeSeed): void {
  for (const key of ["runId", "experimentId", "runtimeId"] as const) if (!IDENTIFIER.test(seed[key])) throw new Error(`invalid_stage5_browser_runtime_seed:${key}`);
  if (!NONCE.test(seed.captureNonce)) throw new Error("invalid_stage5_browser_runtime_seed:captureNonce");
  if (!seed.manifestVersion || !seed.sourceActionContractVersion || !Number.isFinite(Date.parse(seed.startedAt))) throw new Error("invalid_stage5_browser_runtime_seed:contract");
}

export async function createStage5BrowserRuntimeIdentity(input: {
  seed: Stage5BrowserRuntimeSeed;
  database: DatabaseRuntime;
  runtime: ScenarioExperimentRuntime;
  apiOrigin: string;
  webOrigin: string;
}): Promise<Stage5BrowserRuntimeIdentity> {
  validateSeed(input.seed);
  const apiOrigin = origin(input.apiOrigin);
  const webOrigin = origin(input.webOrigin);
  const status = await input.runtime.status();
  const experiment = status.experiment;
  if (!experiment || experiment.id !== input.seed.experimentId || experiment.runId !== input.seed.runId
    || experiment.manifestVersion !== input.seed.manifestVersion
    || experiment.sourceActionContractVersion !== input.seed.sourceActionContractVersion) throw new Error("stage5_browser_runtime_experiment_mismatch");
  const databaseProof = await input.database.queryOne(`SELECT r.active_experiment_id AS "activeExperimentId",e.run_id AS "runId",
    e.manifest_version AS "manifestVersion",e.source_action_contract_version AS "sourceActionContractVersion"
    FROM monitor_scenario_runtime r JOIN monitor_scenario_experiment e ON e.id=r.active_experiment_id WHERE r.runtime_key='stage5'`);
  if (String(databaseProof.activeExperimentId ?? "") !== experiment.id || String(databaseProof.runId ?? "") !== experiment.runId
    || String(databaseProof.manifestVersion ?? "") !== experiment.manifestVersion
    || String(databaseProof.sourceActionContractVersion ?? "") !== experiment.sourceActionContractVersion) throw new Error("stage5_browser_monitor_database_mismatch");

  const identity = {
    runId: input.seed.runId,
    experimentId: input.seed.experimentId,
    runtimeId: input.seed.runtimeId,
    captureNonce: input.seed.captureNonce,
    manifestVersion: input.seed.manifestVersion,
    sourceActionContractVersion: input.seed.sourceActionContractVersion,
    startedAt: input.seed.startedAt,
  };
  const monitorDatabaseInstanceId = `monitor-db:${digest({ databaseMode: input.database.mode, databaseProof, runtimeId: identity.runtimeId, captureNonce: identity.captureNonce }).slice(7, 39)}`;
  const schedulerOwnerId = `scheduler:${digest({ experimentId: identity.experimentId, runtimeId: identity.runtimeId, captureNonce: identity.captureNonce }).slice(7, 39)}`;
  const identityEndpoint = "/api/dev/stage5/runtime-identity" as const;
  const surfaces: Stage5BrowserSurfaceIdentity[] = [
    { name: "laboratory", url: `${webOrigin}/dev/scenarios`, identityUrl: `${apiOrigin}${identityEndpoint}` },
    { name: "dashboard", url: `${webOrigin}/`, identityUrl: `${apiOrigin}${identityEndpoint}` },
    { name: "chat_list", url: `${webOrigin}/chats`, identityUrl: `${apiOrigin}${identityEndpoint}` },
    { name: "chat_detail", url: `${webOrigin}/chats/%7BconversationId%7D`, identityUrl: `${apiOrigin}${identityEndpoint}` },
  ];
  const rawServices: Array<Omit<Stage5BrowserServiceIdentity, "identityDigest">> = [
    { name: "laboratory", instanceId: identity.runtimeId, location: surfaces[0]!.url },
    { name: "api", instanceId: identity.runtimeId, location: `${apiOrigin}${identityEndpoint}` },
    { name: "scheduler", instanceId: schedulerOwnerId, location: `scheduler:${schedulerOwnerId}` },
    { name: "monitor_database", instanceId: monitorDatabaseInstanceId, location: `monitor-database:${monitorDatabaseInstanceId}` },
    { name: "dashboard", instanceId: identity.runtimeId, location: surfaces[1]!.url },
    { name: "chat", instanceId: identity.runtimeId, location: `${webOrigin}/chats` },
  ];
  const services = rawServices.map((service) => ({ ...service, identityDigest: digest({ schemaVersion: "1.0.0", identity: { runId: identity.runId, experimentId: identity.experimentId, runtimeId: identity.runtimeId, captureNonce: identity.captureNonce }, service }) }));
  if (services.map(({ name }) => name).join(",") !== SERVICE_NAMES.join(",")) throw new Error("stage5_browser_runtime_service_coverage_failed");
  return {
    schemaVersion: "1.0.0",
    kind: "stage5_browser_runtime_identity",
    identity,
    runtime: {
      mode: "connected",
      sourceKind: "test_database",
      sourceAccount: "monitor_source_ro",
      apiOrigin,
      webOrigin,
      identityEndpoint,
      monitorDatabaseInstanceId,
      schedulerOwnerId,
      startedAt: identity.startedAt,
      services,
      surfaces,
    },
  };
}
