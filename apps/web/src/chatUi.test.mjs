import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  UI_ONLY_CONVERSATION_FIXTURES,
  alertChipLimit,
  alertChipTone,
  buildConversationRows,
  conversationScope,
  filterConversationRows,
  setConversationPinned,
  unresolvedAgeMinutes,
  unresolvedAgeTone,
} from "./chatUi.ts";

test("administrators use the existing global conversation scope without a UI switch", () => {
  assert.equal(conversationScope(true), "all");
  assert.equal(conversationScope(false), "mine");
});

test("chat filters keep unread and pinned meanings separate", () => {
  assert.equal(filterConversationRows(UI_ONLY_CONVERSATION_FIXTURES, "unread", "").length, 4);
  assert.equal(filterConversationRows(UI_ONLY_CONVERSATION_FIXTURES, "pinned", "").length, 2);
});

test("pinning is presentation-only, immutable, and moves pinned conversations first", () => {
  const original = UI_ONLY_CONVERSATION_FIXTURES.slice(0, 3);
  const updated = setConversationPinned(original, "ui-demo-supervision", true);
  assert.notEqual(updated, original);
  assert.equal(original[1].pinned, false);
  assert.deepEqual(updated.map((row) => row.id), ["ui-demo-production-p15", "ui-demo-supervision", "ui-demo-close"]);
  assert.equal(filterConversationRows(updated, "pinned", "").length, 3);

  const unpinned = setConversationPinned(updated, "ui-demo-production-p15", false);
  assert.deepEqual(unpinned.map((row) => row.id), ["ui-demo-supervision", "ui-demo-close", "ui-demo-production-p15"]);
});

test("search covers conversation, sender, alert code, machine, and work order presentation fields", () => {
  assert.equal(filterConversationRows(UI_ONLY_CONVERSATION_FIXTURES, "all", "P15").length, 2);
  assert.equal(filterConversationRows(UI_ONLY_CONVERSATION_FIXTURES, "all", "A05").length, 2);
  assert.equal(filterConversationRows(UI_ONLY_CONVERSATION_FIXTURES, "all", "151230.1").length, 3);
  assert.equal(filterConversationRows(UI_ONLY_CONVERSATION_FIXTURES, "all", "término inexistente").length, 0);
});

test("backend rows remain connected while presentation-only metadata is added", () => {
  const backend = [{
    id: "server-row", title: "Grupo conectado", updatedAt: "2026-07-28T12:00:00-05:00", writableUntil: null,
    lastSender: "Monitor", lastBody: "Alerta conectada", lastKind: "alert", openAlerts: 2, unreadCount: 3, isParticipant: true,
    participantCount: 1, participantNames: "María Torres", openAlertItems: [
      { id: "a02", code: "A02", title: "Material reservado sin recepción", summary: "Pendiente", workOrderCode: "151087.3", machineCode: "P15", openedAt: "2026-07-28T11:30:00-05:00" },
      { id: "a05", code: "A05", title: "Bobina pendiente", summary: "Pendiente", workOrderCode: "151087.3", machineCode: "P15", openedAt: "2026-07-28T11:00:00-05:00" },
    ],
  }];
  const [row] = buildConversationRows(backend, false);
  assert.equal(row.id, "server-row");
  assert.equal(row.mockOnly, false);
  assert.equal(row.alerts.length, 2);
  assert.equal(row.participants, "1 participante · María Torres");
});

test("responsive alert-chip limits preserve explicit overflow", () => {
  assert.equal(alertChipLimit(390), 1);
  assert.equal(alertChipLimit(700), 2);
  assert.equal(alertChipLimit(1024), 3);
});

test("alert chips reserve semantic color for the alert code", () => {
  assert.equal(alertChipTone("Error"), "danger");
  assert.equal(alertChipTone("Por vencer"), "warning");
  assert.equal(alertChipTone("Alerta"), "warning");
  assert.equal(alertChipTone("Error posible"), "possible");
});

test("alert-message age color changes only at the approved two-hour threshold", () => {
  assert.equal(unresolvedAgeMinutes("1 h 59 min"), 119);
  assert.equal(unresolvedAgeMinutes("2 h"), 120);
  assert.equal(unresolvedAgeMinutes("2 h 14 min"), 134);
  assert.equal(unresolvedAgeTone(119), "routine");
  assert.equal(unresolvedAgeTone(120), "escalated");
});

test("resolved alert attachments use green lifecycle framing and hide the active-condition label", () => {
  const source = readFileSync(new URL("./Chats.tsx", import.meta.url), "utf8");
  assert.match(source, /resolved \? ui\.color\.alertResolvedBorder : ui\.color\.alertOpenBorder/);
  assert.match(source, /resolved \? ui\.color\.alertResolvedHeader : ui\.color\.alertOpenHeader/);
  assert.match(source, /\{!resolved && <Box component="span"/);
});

test("resolution guidance is supplied by Monitor instead of frontend constants", () => {
  const chatUi = readFileSync(new URL("./chatUi.ts", import.meta.url), "utf8");
  const chats = readFileSync(new URL("./Chats.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(chatUi, /ALERT_RESOLUTION_GUIDANCE|alertResolutionGuidance/);
  assert.match(chats, /message\.resolutionGuidance/);
});

test("chat detail scrolls after the rendered latest message changes", () => {
  const source = readFileSync(new URL("./Chats.tsx", import.meta.url), "utf8");
  assert.match(source, /const latestMessageId = displayMessages\.at\(-1\)\?\.id \?\? null/);
  assert.match(source, /\[latestMessageId, state\]/);
  assert.match(source, /window\.requestAnimationFrame\(\(\) => window\.requestAnimationFrame/);
  assert.match(source, /viewport\?\.scrollTo\(\{ top: viewport\.scrollHeight, behavior: smoothBehavior\(\) \}\)/);
});
