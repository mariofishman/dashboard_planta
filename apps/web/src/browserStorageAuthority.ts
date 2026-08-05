export const BROWSER_STORAGE_AUTHORITY = Object.freeze({
  local: Object.freeze({
    monitorCursor: "monitor.cursor",
    pendingMessagePrefix: "monitor.pending.",
  }),
  session: Object.freeze({
    chatPresentationContext: "monitor.chat.presentation-context",
  }),
  serverAuthoritative: Object.freeze([
    "incident lifecycle",
    "incident evidence",
    "incident routing",
    "source state",
  ]),
});

export type ChatPresentationContext = {
  id: string;
  title: string;
  participants: string;
  mockOnly: boolean;
};

function parseJson(value: string | null): unknown {
  if (value === null) return null;
  try { return JSON.parse(value); } catch { return null; }
}

export function readMonitorCursor(): number {
  const value = Number(window.localStorage.getItem(BROWSER_STORAGE_AUTHORITY.local.monitorCursor) ?? 0);
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

export function writeMonitorCursor(cursor: number): void {
  if (!Number.isSafeInteger(cursor) || cursor < 0) return;
  window.localStorage.setItem(BROWSER_STORAGE_AUTHORITY.local.monitorCursor, String(cursor));
}

export function writeChatPresentationContext(context: ChatPresentationContext): void {
  window.sessionStorage.setItem(BROWSER_STORAGE_AUTHORITY.session.chatPresentationContext, JSON.stringify(context));
}

export function readChatPresentationContext(conversationId: string): ChatPresentationContext | null {
  const value = parseJson(window.sessionStorage.getItem(BROWSER_STORAGE_AUTHORITY.session.chatPresentationContext));
  if (!value || typeof value !== "object") return null;
  const context = value as Partial<ChatPresentationContext>;
  return context.id === conversationId
    && typeof context.title === "string"
    && typeof context.participants === "string"
    && typeof context.mockOnly === "boolean"
    ? context as ChatPresentationContext
    : null;
}

export function pendingMessageStorageKey(sysUserId: number, conversationId: string): string {
  return `${BROWSER_STORAGE_AUTHORITY.local.pendingMessagePrefix}${sysUserId}.${conversationId}`;
}

function requirePendingMessageKey(key: string): void {
  if (!key.startsWith(BROWSER_STORAGE_AUTHORITY.local.pendingMessagePrefix)) {
    throw new Error("Browser storage is limited to pending-message keys.");
  }
}

export function readPendingMessages<T>(key: string): T[] {
  requirePendingMessageKey(key);
  const value = parseJson(window.localStorage.getItem(key));
  return Array.isArray(value) ? value as T[] : [];
}

export function writePendingMessages<T>(key: string, messages: T[]): void {
  requirePendingMessageKey(key);
  window.localStorage.setItem(key, JSON.stringify(messages));
}
