export interface Stage5BrowserEvidenceIdentity {
  runId: string;
  experimentId: string;
  runtimeId: string;
  captureNonce: string;
  manifestVersion: string;
  sourceActionContractVersion: string;
  startedAt: string;
  completedAt: string;
}

export declare const STAGE5_BROWSER_SCHEMA_VERSION: "1.0.0";
export declare const STAGE5_BROWSER_GATE: "phase6-stage5-step8";
export declare const STAGE5_BROWSER_SERVICE_NAMES: readonly string[];
export declare const STAGE5_BROWSER_SURFACE_NAMES: readonly string[];
export declare function canonicalJson(value: unknown): string;
export declare function sha256(value: string | Uint8Array): string;
export declare function sha256Json(value: unknown): string;
export declare function browserServiceIdentityDigest(identity: Pick<Stage5BrowserEvidenceIdentity, "runId" | "experimentId" | "runtimeId" | "captureNonce">, service: { name: string; instanceId: string; location: string }): string;
export declare function browserArtifactProvenance(artifact: Record<string, unknown>): Record<string, unknown>;
export declare function browserRuntimeIdentitySnapshot(manifest: Record<string, unknown>): Record<string, unknown>;
export declare function browserCleanupEvidence(manifest: Record<string, unknown>): Record<string, unknown>;
export declare function validateStage5BrowserEvidence(manifest: Record<string, unknown>, options: { schema: Record<string, unknown>; artifactRoot: string; expectedIdentity?: Partial<Stage5BrowserEvidenceIdentity> }): Promise<string[]>;
export declare function assertValidStage5BrowserEvidence(manifest: Record<string, unknown>, options: { schema: Record<string, unknown>; artifactRoot: string; expectedIdentity?: Partial<Stage5BrowserEvidenceIdentity> }): Promise<Record<string, unknown>>;
