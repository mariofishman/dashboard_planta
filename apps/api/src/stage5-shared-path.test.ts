import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { it } from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const source = (path: string) => readFile(resolve(repositoryRoot, path), "utf8");

it("keeps the V2 laboratory on current contracts and rejected executables absent", async () => {
  const [apiClient, laboratory, laboratoryHtml, routes, recovery, stage5aGate, packageDocument] = await Promise.all([
    source("apps/web/src/api.ts"),
    source("apps/web/public/dev/scenarios/scenarioLabConnected.js"),
    source("apps/web/public/dev/scenarios/alertas-fake-v2-connected.html"),
    source("apps/api/src/routes/scenarios.ts"),
    source("scripts/stage5-recovery.connected.test.ts"),
    source("scripts/validate-phase6-stage5a.sh"),
    source("package.json"),
  ]);
  const packageJson = JSON.parse(packageDocument) as { scripts: Record<string, string> };

  assert.match(apiClient, /fetch\("\/api\/dev\/source-actions"/);
  assert.match(laboratory, /fetch\(path/);
  assert.match(laboratory, /\/api\/dev\/source-actions/);
  assert.match(laboratory, /action === "a02\.cancel" \|\| action === "a02\.reject"/);
  assert.doesNotMatch(laboratory, /action\.startsWith\("a02\."\)/);
  assert.doesNotMatch(laboratory, /startTime:/);
  assert.doesNotMatch(laboratory, /frequency: e\.pollingFrequencyMinutes/);
  assert.match(laboratoryHtml, /id="startTime"[^>]+type="datetime-local" value="2026-07-01T09:00"/);
  assert.match(laboratoryHtml, /id="sourceLookbackDays"[^>]+value="-30"/);
  assert.match(laboratoryHtml, /id="resetDatabaseButton"/);
  assert.match(laboratory, /businessTimeIsoValue\(\$\("#startTime"\)\.value\)/);
  assert.match(laboratory, /sourceLookbackDays: Number\(\$\("#sourceLookbackDays"\)\.value\)/);
  assert.match(laboratory, /activeOnly=true/);
  assert.match(laboratory, /hasExperiment \? status\(type\.toUpperCase\(\)\)\?\.pagination : null/);
  assert.match(laboratory, /hasExperiment \? "" : "disabled"/);
  assert.match(laboratory, /RESET TEST DATABASE/);
  assert.match(laboratory, /document\.activeElement !== speed/);
  assert.match(laboratory, /r\.pending \|\| r\.sourceState === "TRANSITO"/);
  assert.match(laboratory, /r\.pending \|\| \(r\.active && !r\.consumptionAt\)/);
  assert.match(laboratory, /Number\(r\.consumptionCount\) > 0/);
  assert.match(laboratory, /r\.pending \|\| !r\.weighedAt \|\| !r\.movedAt/);
  assert.match(laboratory, /r\?\.pending \?\? r\?\.pendingPoll \?\? false/);
  assert.match(laboratory, /pending \? "Sí" : "No"/);
  assert.match(laboratory, /pending \? "Pendiente de sondeo"/);
  assert.match(laboratory, /data-do="a05\.handoff_to_a02"/);
  assert.match(laboratory, /tabInteractionActive = true/);
  assert.match(laboratory, /if \(tabInteractionActive\) return/);
  assert.match(laboratory, /#tabContent"\)\.onclick = async \(event\)/);
  assert.doesNotMatch(laboratory, /action === "a05\.register_movement"/);
  assert.match(laboratory, /type === "a05" \? "" : record\.key/);
  assert.match(laboratory, /key = form\.sourceKey === "" \? undefined : Number/);
  assert.match(laboratory, /function reconcileSelectedRecord\(\)/);
  assert.match(laboratory, /data\.selected = current \|\| null/);
  assert.match(laboratory, /data\.runtime = r;\s+reconcileSelectedRecord\(\);/);
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

it("keeps Dashboard and Chat downstream of Monitor instead of the source laboratory", async () => {
  const [dashboard, chat, scenarioLab, routes, runtime] = await Promise.all([
    source("apps/web/src/App.tsx"),
    source("apps/web/src/Chats.tsx"),
    source("apps/web/src/ScenarioLab.tsx"),
    source("apps/api/src/routes/scenarios.ts"),
    source("packages/detection/src/experiment-runtime.ts"),
  ]);
  for (const consumer of [dashboard, chat]) {
    assert.doesNotMatch(consumer, /test_database|monitor_source_ro|scenarioSourceAction|\/api\/dev\/source-actions|\/api\/dev\/scenarios/);
  }
  assert.match(dashboard, /\bincidents\b/);
  assert.match(chat, /\bconversations\b/);
  assert.match(chat, /\bconversationMessages\b/);
  assert.match(scenarioLab, /alertas-fake-v2-connected\.html/);
  assert.match(runtime, /result\.status === "healthy" && result\.complete && result\.fullEvaluation/);
  assert.match(routes, /event\.payload\.status === "healthy"/);
  assert.match(routes, /event\.payload\.complete === true/);
  assert.match(routes, /event\.payload\.fullEvaluation === true/);
  assert.match(routes, /ORDER BY updated_at DESC,opened_at DESC,occurrence DESC,id DESC LIMIT 1/);
});
