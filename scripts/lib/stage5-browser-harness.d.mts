import type { Stage5BrowserRuntimeIdentity } from "@monitor/contracts";

export interface Stage5BrowserHarnessSeed {
  runId: string;
  experimentId: string;
  runtimeId: string;
  captureNonce: string;
  manifestVersion: string;
  sourceActionContractVersion: string;
  startedAt: string;
  apiOrigin: string;
}

export declare function createStage5BrowserHarnessSeed(input: Partial<Stage5BrowserHarnessSeed> & Pick<Stage5BrowserHarnessSeed, "runId" | "experimentId" | "manifestVersion" | "sourceActionContractVersion" | "apiOrigin">): Stage5BrowserHarnessSeed;
export declare function assertStage5BrowserRuntimeHandshake(snapshot: Stage5BrowserRuntimeIdentity, seed: Stage5BrowserHarnessSeed): Stage5BrowserRuntimeIdentity;
export declare function fetchStage5BrowserRuntimeIdentity(options: { apiOrigin: string; cookie?: string; authorization?: string; seed: Stage5BrowserHarnessSeed; fetchImpl?: typeof fetch }): Promise<Stage5BrowserRuntimeIdentity>;
export declare function stage5BrowserSurfaceTargets(snapshot: Stage5BrowserRuntimeIdentity, options?: { conversationId?: string }): Record<string, string>;
export declare function stage5BrowserManifestRuntime(snapshot: Stage5BrowserRuntimeIdentity, identityArtifactId: string): Stage5BrowserRuntimeIdentity["runtime"] & { identityArtifactId: string };
