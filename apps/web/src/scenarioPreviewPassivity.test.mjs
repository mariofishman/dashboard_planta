import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const previewSource = readFileSync(new URL("./ScenarioLab.tsx", import.meta.url), "utf8");
const apiSource = readFileSync(new URL("./api.ts", import.meta.url), "utf8");
const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");

test("the alert preview exposes only the read-only scenario API", () => {
  assert.match(previewSource, /import \{ scenarioAlertMessages, type ScenarioAlertMessageItem, type ScenarioRuleCode \} from "\.\/api";/);
  assert.doesNotMatch(previewSource, /markConversationRead|sendConversationMessage|closeIncidentWithoutResolution|typing|presence/);
  const apiFunction = apiSource.match(/export async function scenarioAlertMessages[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(apiFunction, /fetch\(`\/api\/dev\/scenario-alert-messages/);
  assert.doesNotMatch(apiFunction, /method:\s*"(?:POST|PUT|PATCH|DELETE)"/);
});

test("selection, refresh, and surface switching remain local or read-only", () => {
  assert.match(previewSource, /setSelection\(/);
  assert.match(previewSource, /setSurface\(option\)/);
  assert.match(previewSource, /src="\/dashboard\?embed=scenario"/);
  assert.match(previewSource, /socket\.on\("message\.created", refresh\)/);
  assert.match(previewSource, /socket\.on\("message\.updated", refresh\)/);
  assert.match(previewSource, /socket\.on\("incident\.changed", refresh\)/);
  assert.match(appSource, /incidents\(\{ search, operation \}\)/);
  assert.match(appSource, /if \(!embedded\) return;/);
  assert.match(appSource, /\{!embedded && <Stack gap=\{1\}/);
});
