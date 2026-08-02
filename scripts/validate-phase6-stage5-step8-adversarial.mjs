import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validateStage5BrowserEvidence } from "./lib/stage5-browser-evidence.mjs";

const root = resolve(import.meta.dirname, "..");
assert.ok(process.env.STEP8_EVIDENCE_ROOT, "STEP8_EVIDENCE_ROOT is required");
const evidenceRoot = resolve(process.env.STEP8_EVIDENCE_ROOT);
const schema = JSON.parse(await readFile(resolve(root, "config/detection/schemas/stage5-browser-evidence.v1.schema.json"), "utf8"));
const manifest = JSON.parse(await readFile(resolve(evidenceRoot, "manifest.json"), "utf8"));
const validate = (candidate) => validateStage5BrowserEvidence(candidate, { schema, artifactRoot: evidenceRoot, expectedIdentity: manifest.identity });

const omitted = structuredClone(manifest);
omitted.artifacts = omitted.artifacts.filter((artifact) => !(artifact.surface === "dashboard" && artifact.artifactKind === "screenshot" && artifact.viewport?.width === 390));
assert.ok((await validate(omitted)).includes("accepted aggregate lacks dashboard 390px screenshot"));

const tampered = structuredClone(manifest);
tampered.artifacts.find((artifact) => artifact.surface === "chat_detail").contentSha256 = `sha256:${"0".repeat(64)}`;
assert.ok((await validate(tampered)).some((error) => error.includes("content digest mismatch")));

const reused = structuredClone(manifest);
const reusedArtifact = structuredClone(reused.artifacts.find((artifact) => artifact.surface === "laboratory"));
reusedArtifact.artifactId = "reused-browser-artifact";
reused.artifacts.push(reusedArtifact);
assert.ok((await validate(reused)).some((error) => error.includes("content paths must be unique")));

const differentRuntime = structuredClone(manifest);
differentRuntime.artifacts.find((artifact) => artifact.surface === "chat_list").identity.runtimeId = "different-runtime";
assert.ok((await validate(differentRuntime)).some((error) => error.includes("artifact identity mismatch")));

assert.deepEqual(await validate(manifest), []);
process.stdout.write(`${JSON.stringify({ accepted: true, cases: ["omission", "tamper", "reuse", "different-runtime"], originalRevalidated: true })}\n`);
