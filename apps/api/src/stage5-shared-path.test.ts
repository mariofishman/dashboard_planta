import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { it } from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const source = (path: string) => readFile(resolve(repositoryRoot, path), "utf8");

it("keeps the Stage 5 laboratory UI and runner on shared development API contracts", async () => {
  const [apiClient, laboratory, runner, routes, stage5aGate] = await Promise.all([
    source("apps/web/src/api.ts"),
    source("apps/web/src/ScenarioLab.tsx"),
    source("scripts/validate-phase6-stage5.ts"),
    source("apps/api/src/routes/scenarios.ts"),
    source("scripts/validate-phase6-stage5a.sh"),
  ]);

  assert.match(apiClient, /fetch\("\/api\/dev\/source-actions"/);
  assert.match(laboratory, /scenarioSourceAction\(action,/);
  assert.match(runner, /request\(server, "POST", "\/api\/dev\/source-actions"/);
  assert.match(runner, /\/prepare-population`/);
  assert.match(runner, /\/inject-monitor-fault`/);

  assert.doesNotMatch(runner, /connections\.writer\.execute\(/);
  assert.doesNotMatch(runner, /server\.database\.execute\(/);
  assert.doesNotMatch(runner, /\/api\/dev\/scenarios\/(?:\$\{[^}]+\}|[A-Z0-9]+)\/source-action/);
  assert.doesNotMatch(apiClient, /\/api\/dev\/scenarios\/(?:\$\{[^}]+\}|[A-Z0-9]+)\/source-action/);
  assert.match(routes, /"\/api\/dev\/scenarios\/:code\/source-action"/);
  assert.match(routes, /source_action_endpoint_replaced/);
  assert.match(stage5aGate, /trap restore_on_exit EXIT INT TERM/);
  assert.match(stage5aGate, /test-database-validate\.sh" baseline/);
  assert.match(stage5aGate, /"officialStep9RepeatabilityRun": false/);
  assert.match(stage5aGate, /stage5_corrective_execution_plan\.md#step-4/);
});
