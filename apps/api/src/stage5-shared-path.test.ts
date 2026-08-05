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
  assert.match(laboratoryHtml, /id="startTime"[^>]+type="datetime-local"/);
  assert.doesNotMatch(laboratoryHtml, /id="startTime"[^>]+value=/);
  assert.match(laboratoryHtml, /id="sourceLookbackDays"[^>]+value="-30"/);
  assert.match(laboratoryHtml, /class="lookback-control"/);
  assert.match(laboratoryHtml, /\.experiment-id\{flex:1 1 auto;min-width:64px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap/);
  assert.match(laboratoryHtml, /\.run-state\{flex:0 0 76px;justify-content:center/);
  assert.match(laboratoryHtml, /\.controls\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(laboratoryHtml, /\.jump-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(laboratoryHtml, /id="resetDatabaseButton"/);
  assert.match(laboratory, /running \|\| reset\?\.baselineClean === true/);
  assert.match(laboratory, /businessTimeIsoValue\(\$\("#startTime"\)\.value\)/);
  assert.match(laboratory, /api\("\/api\/dev\/scenario-source-window"\)/);
  assert.match(laboratory, /startTime\.min = earliest/);
  assert.match(laboratory, /existing \|\| \(await createExperiment\(\)\)/);
  assert.match(laboratory, /sourceLookbackDays: Number\(\$\("#sourceLookbackDays"\)\.value\)/);
  assert.match(laboratory, /\/source-window/);
  assert.match(laboratory, /activeOnly=true/);
  assert.match(laboratory, /hasExperiment \? status\(type\.toUpperCase\(\)\)\?\.pagination : null/);
  assert.match(laboratory, /hasExperiment \? "" : "disabled"/);
  assert.match(laboratory, /RESET TEST DATABASE/);
  assert.match(laboratory, /document\.activeElement !== speed/);
  assert.match(laboratory, /r\.pending \|\| r\.sourceState === "TRANSITO"/);
  assert.match(laboratory, /\["OT", \(r\) => r\.ot\]/);
  assert.doesNotMatch(laboratory, /\["Movimiento", \(r\) => r\.id\]/);
  assert.match(laboratory, /shortUniqueCode\(r\.unique\)/);
  assert.match(laboratory, /shortSourceArea\(r\.origin\)/);
  assert.match(laboratory, /shortMachineDestination\(r\.destination\)/);
  assert.match(laboratory, /fmtCompact\(r\.dispatchedAt\)/);
  assert.match(laboratoryHtml, /\.records-a02 \.leading-cell/);
  assert.match(laboratoryHtml, /\.records-a02 \.compact-code/);
  assert.match(laboratoryHtml, /\.records-a02 \.compact-destination\{width:66px;max-width:66px;white-space:nowrap\}/);
  assert.match(laboratoryHtml, /\.records-a02 \.compact-code,\.records-a02 \.compact-origin,\.records-a02 \.compact-destination,\.records-a02 \.compact-date\{overflow:hidden;text-overflow:ellipsis\}/);
  assert.match(laboratoryHtml, /\.records-a02 \.compact-destination>span[^}]*overflow:hidden;text-overflow:ellipsis;white-space:nowrap/);
  assert.match(laboratory, /r\.pending \|\| \(r\.active && !r\.consumptionAt\)/);
  assert.match(laboratory, /Number\(r\.consumptionCount\) > 0/);
  assert.match(laboratory, /\["Tiempo", \(r\) => elapsedMinutesSince\(r\.startedAt\)\]/);
  assert.match(laboratory, /\["Tiempo", \(r\) => elapsedMinutesSince\(r\.declaredAt\)\]/);
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
  assert.match(laboratory, /type: "monitor-scenario-selection"/);
  assert.match(laboratory, /data-record-key/);
  assert.match(laboratory, /requestAnimationFrame\(focusSelectedRecord\)/);
  assert.match(laboratory, /data\.runtime = r;[\s\S]+reconcileSelectedRecord\(\);/);
  assert.match(laboratory, /function historyTable\(type, items, empty\)/);
  assert.match(laboratory, /class="scroll history-table"/);
  assert.match(laboratory, /async function toggleHistory\(type\)/);
  assert.match(laboratory, /data-history-record/);
  assert.match(laboratory, /data-record-key=.*role="button".*aria-selected/);
  assert.match(laboratory, /event\.target\.closest\("button, input, select, textarea, a"\)/);
  assert.match(laboratory, /historyLabels\[2\] : "Ver historial"/);
  assert.match(laboratory, /type === "a02" && !data\.historyMode/);
  assert.match(laboratory, /experimentId: selection\?\.experimentId/);
  assert.doesNotMatch(laboratory, /historyDialog/);
  assert.doesNotMatch(laboratoryHtml, /id="historyDialog"/);
  assert.match(laboratory, /Historial completo de movimientos/);
  assert.match(laboratory, /Historial completo de OTs/);
  assert.match(laboratory, /Historial completo de bobinas/);
  assert.match(laboratory, /historyActionAt/);
  assert.match(laboratory, /historyIncident/);
  assert.doesNotMatch(laboratory, /i\.sourceKey \+ " · " \+ i\.experimentName/);
  assert.doesNotMatch(routes, /inject-monitor-fault/);
  assert.match(routes, /scenario-source-window/);
  assert.match(routes, /scenario_experiment_before_source_baseline/);
  assert.match(routes, /currentSourceByKey/);
  assert.match(routes, /incidentCount/);
  assert.match(routes, /timeline:/);
  const testDatabase = await source("packages/detection/src/test-database.ts");
  assert.match(testDatabase, /generatedCount % rows\.length/);
  assert.doesNotMatch(testDatabase, /AND \(\(s\.estado='CONFIRMAR_PESO' AND NOT EXISTS/,
    "A05 status must retain terminal source rows until the poll boundary acknowledges their pending action");
  assert.match(routes, /if \(pendingRecordKeys\.has\(key\)\) return true;[\s\S]+if \(code === "A02"\)[\s\S]+if \(code === "A03"\)/,
    "all three active laboratory tables must retain source actions until a complete poll acknowledges them");
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
  assert.match(chat, /lifecycle=\{incidentLifecycles\[String\(message\.payload\.id\)\]\}/);
  assert.match(scenarioLab, /alertas-fake-v2-connected\.html/);
  assert.match(scenarioLab, /scenarioAlertMessages/);
  assert.match(scenarioLab, /scenario_alert_selection_required|monitor-scenario-selection/);
  assert.match(scenarioLab, /experimentId/);
  assert.match(scenarioLab, /<AlertAttachment message=\{message\} lifecycle=\{lifecycle\}/);
  assert.match(scenarioLab, /Destinatarios/);
  assert.match(scenarioLab, /minmax\(320px, 440px\) minmax\(0, 1fr\)/);
  assert.match(scenarioLab, /src="\/dashboard\?embed=scenario"/);
  assert.match(scenarioLab, /monitor-scenario-dashboard-open-filters/);
  assert.match(dashboard, /embedded=\{window\.location\.pathname === "\/dashboard"/);
  assert.match(dashboard, /if \(!embedded\) return/);
  assert.match(dashboard, /monitor-scenario-dashboard-open-filters/);
  assert.match(scenarioLab, /monitor-scenario-preview-height/);
  assert.match(routes, /app\.get(?:<[^>]+>)?\("\/api\/dev\/scenario-alert-messages"/);
  assert.match(routes, /FROM monitor_message m/);
  assert.match(routes, /JOIN monitor_incident i/);
  assert.match(routes, /monitor_incident_evidence/);
  assert.match(routes, /monitor_alert_guidance/);
  assert.match(routes, /monitor_routing_decision/);
  assert.match(routes, /i\.rule_code=\$2 AND i\.condition_key=\$3/);
  assert.match(routes, /request\.query\.experimentId \? null : await options\.experiments\.activeRuntime\(\)/);
  assert.doesNotMatch(scenarioLab, /test_database|monitor_source_ro|source-actions/);
  assert.match(runtime, /result\.status === "healthy" && result\.complete && result\.fullEvaluation/);
  assert.match(routes, /event\.payload\.status === "healthy"/);
  assert.match(routes, /event\.payload\.complete === true/);
  assert.match(routes, /event\.payload\.fullEvaluation === true/);
  assert.match(routes, /ORDER BY updated_at DESC,opened_at DESC,occurrence DESC,id DESC LIMIT 1/);
});
