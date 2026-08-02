import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import {
  BROWSER_STORAGE_AUTHORITY,
  pendingMessageStorageKey,
  readChatPresentationContext,
  readMonitorCursor,
  readPendingMessages,
  writeChatPresentationContext,
  writeMonitorCursor,
  writePendingMessages,
} from "./browserStorageAuthority.ts";

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

function installBrowserStorage() {
  globalThis.window = {
    localStorage: new MemoryStorage(),
    sessionStorage: new MemoryStorage(),
  };
}

test("browser storage authority is limited to non-authoritative presentation and delivery state", () => {
  assert.deepEqual(BROWSER_STORAGE_AUTHORITY.local, {
    monitorCursor: "monitor.cursor",
    pendingMessagePrefix: "monitor.pending.",
  });
  assert.deepEqual(BROWSER_STORAGE_AUTHORITY.session, {
    chatPresentationContext: "monitor.chat.presentation-context",
  });
  assert.deepEqual(BROWSER_STORAGE_AUTHORITY.serverAuthoritative, [
    "incident lifecycle",
    "incident evidence",
    "incident routing",
    "source state",
  ]);
  assert.equal(pendingMessageStorageKey(17, "conversation-4"), "monitor.pending.17.conversation-4");
});

test("cursor, context, and pending-message helpers reject malformed local values", () => {
  installBrowserStorage();
  window.localStorage.setItem("monitor.cursor", "forged");
  assert.equal(readMonitorCursor(), 0);
  writeMonitorCursor(42);
  assert.equal(readMonitorCursor(), 42);
  writeMonitorCursor(-1);
  assert.equal(readMonitorCursor(), 42);

  writeChatPresentationContext({ id: "conversation-4", title: "Chat", participants: "2", mockOnly: false });
  assert.deepEqual(readChatPresentationContext("conversation-4"), { id: "conversation-4", title: "Chat", participants: "2", mockOnly: false });
  assert.equal(readChatPresentationContext("another-conversation"), null);

  const key = pendingMessageStorageKey(17, "conversation-4");
  writePendingMessages(key, [{ id: "pending-1" }]);
  assert.deepEqual(readPendingMessages(key), [{ id: "pending-1" }]);
  window.localStorage.setItem(key, "not-json");
  assert.deepEqual(readPendingMessages(key), []);
  assert.throws(() => writePendingMessages("monitor.incidents", []), /limited to pending-message keys/);
  assert.throws(() => readPendingMessages("monitor.source-state"), /limited to pending-message keys/);
});

test("all browser storage access is centralized in the authority module", async () => {
  const sourceDirectory = new URL(".", import.meta.url);
  const sourceFiles = (await readdir(sourceDirectory, { recursive: true }))
    .filter((name) => /\.(?:ts|tsx)$/.test(name) && name !== "browserStorageAuthority.ts");
  for (const name of sourceFiles) {
    const source = await readFile(new URL(name, sourceDirectory), "utf8");
    assert.doesNotMatch(source, /\b(?:localStorage|sessionStorage)\b/, `${name} bypasses browserStorageAuthority.ts`);
    assert.doesNotMatch(source, /\b(?:indexedDB|document\.cookie|caches\.(?:open|delete))\b/, `${name} introduces unclassified browser storage`);
  }
});

test("the connected tamper fixture targets every forbidden browser authority class", async () => {
  const fixture = await readFile(new URL("../test/stage5-browser-authority-tamper.html", import.meta.url), "utf8");
  for (const key of ["monitor.incidents", "monitor.incident.A03:ot:12198", "monitor.evidence", "monitor.routing", "monitor.source-state"]) {
    assert.match(fixture, new RegExp(key.replaceAll(".", "\\.")));
  }
  assert.match(fixture, /browser-forged-incident/);
  assert.match(fixture, /lifecycle:\s*"resolved"/);
});
