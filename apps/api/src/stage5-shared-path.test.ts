import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { it } from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const source = (path: string) => readFile(resolve(repositoryRoot, path), "utf8");

it("keeps the V2 laboratory on current contracts and rejected executables absent", async () => {
  const [apiClient, laboratory, routes, recovery, stage5aGate, packageDocument] = await Promise.all([
    source("apps/web/src/api.ts"),
    source("apps/web/src/ScenarioLab.tsx"),
    source("apps/api/src/routes/scenarios.ts"),
    source("scripts/stage5-recovery.connected.test.ts"),
    source("scripts/validate-phase6-stage5a.sh"),
    source("package.json"),
  ]);
  const packageJson = JSON.parse(packageDocument) as { scripts: Record<string, string> };

  assert.match(apiClient, /fetch\("\/api\/dev\/source-actions"/);
  assert.match(laboratory, /scenarioSourceAction\(action,/);
  assert.doesNotMatch(routes, /inject-monitor-fault/);
  assert.match(recovery, /interruptions\.arm\("after_incident_commit"\)/);

  assert.doesNotMatch(apiClient, /\/api\/dev\/scenarios\/(?:\$\{[^}]+\}|[A-Z0-9]+)\/source-action/);
  assert.doesNotMatch(routes, /"\/api\/dev\/scenarios\/:code\/(?:reset|trigger|prepare|prepare-population|correct|advance-time|fail-next-poll|poll|recur|source-action)"/);
  assert.equal(packageJson.scripts["validate:phase6-stage5"], undefined);
  for (const path of [
    "scripts/validate-phase6-stage5.sh",
    "scripts/validate-phase6-stage5.ts",
    "scripts/finalize-phase6-stage5-browser-evidence.mjs",
    "config/detection/stage5-connected-acceptance.v1.json",
  ]) await assert.rejects(access(resolve(repositoryRoot, path)));
  assert.match(stage5aGate, /trap restore_on_exit EXIT INT TERM/);
  assert.match(stage5aGate, /test-database-validate\.sh" baseline/);
  assert.match(stage5aGate, /"officialStep9RepeatabilityRun": false/);
  assert.match(stage5aGate, /stage5_corrective_execution_plan\.md#step-4/);
});
