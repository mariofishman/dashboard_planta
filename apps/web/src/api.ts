import type { RotationCalendarState, RotationException, RotationPattern, RotationPatternSnapshot, RosterAssignment, RosterSnapshot, SessionResponse } from "@monitor/contracts";

export interface MockIdentitySummary {
  identityId: "monitor-admin" | "plant-manager" | "shift-supervisor" | "machine-operator" | "operation-scheduler";
  principal: SessionResponse["principal"];
}

export interface SourceDiagnostic {
  queryId: string;
  ruleCode: string;
  adapterKind: string;
  status: string;
  complete: boolean;
  fullEvaluation: boolean;
  recoveryRun: boolean;
  rowCount: number;
  pageCount: number;
  finishedAt: string;
  errorCode: string | null;
  activeConditions: number;
}

export type IncidentLifecycle = "open" | "resolved" | "closed_without_resolution";
export interface IncidentSummary {
  id: string; ruleCode: "A02" | "A03" | "A05"; lifecycle: IncidentLifecycle; label: string; title: string; summary: string;
  workOrderId: string | null; workOrderCode: string | null; machineCode: string | null; operationName: string | null;
  shiftName: string | null; responsibleName: string | null; reasons: string[]; openedAt: string; updatedAt: string;
  resolvedAt: string | null; occurrence: number;
}
export interface IncidentDetail extends IncidentSummary {
  evidence: { id: string; status: "triggered" | "clear"; reasons: string[]; evidence: Record<string, unknown>; observedAt: string }[];
  transitions: { fromState: IncidentLifecycle | null; toState: IncidentLifecycle; reason: string; occurredAt: string }[];
  related: { id: string; ruleCode: string; title: string; lifecycle: IncidentLifecycle }[];
}

export interface ConversationSummary {
  id: string; title: string; updatedAt: string; writableUntil: string | null; lastSender: string; lastBody: string;
  lastKind: "text" | "alert" | "attachment"; openAlerts: number; unreadCount: number; isParticipant: boolean;
}
export interface ConversationMessage {
  id: string; cursor: number; senderSysUserId: number | null; senderName: string; kind: "text" | "alert" | "attachment";
  body: string; payload: Record<string, unknown>; replyToMessageId: string | null; sentAt: string; editedAt: string | null; deletedAt: string | null;
  deliveredCount: number; readCount: number;
}

export type ScenarioRuleCode = "A02" | "A03" | "A05";
export type ScenarioFault = "timeout" | "source_error" | "partial" | "invalid_schema";
export type ScenarioCase = "clean_baseline" | "before_threshold" | "at_threshold" | "past_threshold"
  | "before_threshold_not_weighed" | "before_threshold_still_at_machine"
  | "at_threshold_not_weighed" | "at_threshold_still_at_machine"
  | "suppressed_by_a07" | "past_threshold_not_weighed" | "past_threshold_still_at_machine" | "past_threshold_both"
  | "past_threshold_produced" | "past_threshold_remnant" | "movement_started";
export interface ScenarioStatus {
  ruleCode: ScenarioRuleCode;
  scenarioClock: { currentAt: string };
  sourceRevision: string;
  selectedCase: string;
  supportedCases: ScenarioCase[];
  lastAction: string;
  lastActionAt: string;
  lastActionRecordedAt: string;
  sourceChangedAt: string;
  pendingFault: ScenarioFault | null;
  sourceState: { rowCount: number; rows: Record<string, unknown>[]; evaluation: { status: "clear" | "triggered"; reasons: string[] } };
  pollerState: { pendingFault: ScenarioFault | null; latestPoll: { status: string; sourceRevision: string | null; complete: boolean; fullEvaluation: boolean; errorCode: string | null; finishedAt: string } | null };
  expectedResult: { sourceCondition: "clear" | "triggered"; reasons: string[]; awaitingPoll: boolean; nextPoll: string; incidentLifecycle: string | null; occurrence: number | null; expectedCounts: { incidents: number; openIncidents: number; conversationLinks: number; alertMessages: number }; dashboard: string; conversation: string };
  actualMonitor: {
    latestIncident: { id: string; lifecycle: IncidentLifecycle; occurrence: number; openedAt: string; resolvedAt: string | null; updatedAt: string } | null;
    incidentCount: number; openIncidentCount: number; evidenceCount: number; routingDecisionCount: number; routingDeliveryCount: number;
    conversationLinkCount: number; alertMessageCount: number; primaryRole: string | null;
  };
  comparison: { matches: boolean; mismatches: string[] };
  latestChangeCursor: number | null;
  detectionDelayMilliseconds: number | null;
}

export class ApiRequestError extends Error {
  constructor(readonly status: number, readonly body: unknown) {
    super(`request_failed_${status}`);
    this.name = "ApiRequestError";
  }
}

async function responseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // The status code remains useful when an upstream response has no JSON body.
    }
    throw new ApiRequestError(response.status, body);
  }
  return response.json() as Promise<T>;
}

export async function currentSession(): Promise<SessionResponse | null> {
  const response = await fetch("/api/session", { credentials: "include" });
  if (response.status === 401) return null;
  return responseJson<SessionResponse>(response);
}

export async function mockIdentities(): Promise<MockIdentitySummary[]> {
  return responseJson<MockIdentitySummary[]>(await fetch("/api/auth/mock-identities", { credentials: "include" }));
}

export async function mockLogin(identityId: MockIdentitySummary["identityId"]): Promise<SessionResponse> {
  return responseJson<SessionResponse>(await fetch("/api/auth/mock-login", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identityId }),
  }));
}

export async function logout(): Promise<void> {
  const response = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  if (!response.ok) throw new Error(`logout_failed_${response.status}`);
}

export async function sourceDiagnostics(): Promise<{ environment: string; productionConnected: boolean; sources: SourceDiagnostic[] }> {
  return responseJson(await fetch("/api/diagnostics/source", { credentials: "include" }));
}

export async function incidents(filters: { status?: string; operation?: string; search?: string } = {}): Promise<IncidentSummary[]> {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value && value !== "all") as [string, string][]);
  return (await responseJson<{ incidents: IncidentSummary[] }>(await fetch(`/api/incidents?${query}`, { credentials: "include" }))).incidents;
}

export async function incidentDetail(id: string): Promise<IncidentDetail> {
  return responseJson<IncidentDetail>(await fetch(`/api/incidents/${id}`, { credentials: "include" }));
}

export async function conversationForIncident(id: string): Promise<string | null> {
  const response = await fetch(`/api/incidents/${id}/conversation`, { credentials: "include" });
  if (response.status === 404 || response.status === 403) return null;
  return (await responseJson<{ conversationId: string }>(response)).conversationId;
}

export async function conversations(search = "", before?: string, scope: "mine" | "all" = "mine"): Promise<{ conversations: ConversationSummary[]; nextCursor: string | null }> {
  const query = new URLSearchParams();
  if (search) query.set("search", search);
  if (before) query.set("before", before);
  if (scope === "all") query.set("scope", "all");
  return responseJson(await fetch(`/api/conversations?${query}`, { credentials: "include" }));
}

export async function conversationMessages(id: string, before?: number): Promise<{ messages: ConversationMessage[]; nextCursor: number | null; writableUntil: string | null }> {
  const query = before ? `?before=${before}` : "";
  return responseJson(await fetch(`/api/conversations/${id}/messages${query}`, { credentials: "include" }));
}

export async function sendConversationMessage(id: string, body: string, clientCommandId: string, replyToMessageId?: string | null, payload?: Record<string, unknown>) {
  return responseJson<{ id: string; cursor: number; duplicate: boolean }>(await fetch(`/api/conversations/${id}/messages`, {
    method: "POST", credentials: "include", headers: { "content-type": "application/json" },
    body: JSON.stringify({ body, clientCommandId, replyToMessageId: replyToMessageId ?? null, ...(payload ? { payload } : {}) }),
  }));
}

export async function markConversationRead(id: string, cursor: number) {
  const response = await fetch(`/api/conversations/${id}/read`, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ cursor }) });
  if (!response.ok) throw new ApiRequestError(response.status, null);
}

export async function editConversationMessage(id: string, body: string) {
  const response = await fetch(`/api/messages/${id}`, { method: "PATCH", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ body }) });
  if (!response.ok) throw new ApiRequestError(response.status, null);
}

export async function deleteConversationMessage(id: string) {
  const response = await fetch(`/api/messages/${id}`, { method: "DELETE", credentials: "include" });
  if (!response.ok) throw new ApiRequestError(response.status, null);
}

export async function rosterAssignments(): Promise<RosterSnapshot> {
  return responseJson<RosterSnapshot>(await fetch("/api/roster/assignments", { credentials: "include" }));
}

export async function saveRosterAssignments(revision: number, assignments: RosterAssignment[]): Promise<RosterSnapshot> {
  return responseJson<RosterSnapshot>(await fetch("/api/roster/assignments", {
    method: "PUT",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ revision, assignments }),
  }));
}

export async function rotationPattern(operation: string): Promise<RotationPatternSnapshot> {
  return responseJson(await fetch(`/api/roster/rotation/${encodeURIComponent(operation)}`, { credentials: "include" }));
}

export async function saveRotationPattern(operation: string, revision: number, pattern: RotationPattern): Promise<RotationPatternSnapshot> {
  return responseJson(await fetch(`/api/roster/rotation/${encodeURIComponent(operation)}`, {
    method: "PUT", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ revision, pattern }),
  }));
}

export async function rotationCalendar(operation: string): Promise<RotationCalendarState> {
  return responseJson(await fetch(`/api/roster/rotation/${encodeURIComponent(operation)}/calendar`, { credentials: "include" }));
}

export async function saveRotationCalendar(state: RotationCalendarState): Promise<RotationCalendarState> {
  return responseJson(await fetch(`/api/roster/rotation/${encodeURIComponent(state.operation)}/calendar`, {
    method: "PUT", credentials: "include", headers: { "content-type": "application/json" },
    body: JSON.stringify({ revision: state.revision, adjustments: state.adjustments, coverages: state.coverages }),
  }));
}

export async function rotationExceptions(operation: string): Promise<RotationException[]> {
  return (await responseJson<{ exceptions: RotationException[] }>(await fetch(`/api/roster/rotation/${encodeURIComponent(operation)}/exceptions`, { credentials: "include" }))).exceptions;
}

export async function saveRotationException(exception: RotationException): Promise<RotationException> {
  return responseJson(await fetch(`/api/roster/rotation/${encodeURIComponent(exception.operation)}/exceptions/${encodeURIComponent(exception.id)}`, {
    method: "PUT", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(exception),
  }));
}

export async function deleteRotationException(operation: string, id: string): Promise<void> {
  const response = await fetch(`/api/roster/rotation/${encodeURIComponent(operation)}/exceptions/${encodeURIComponent(id)}`, { method: "DELETE", credentials: "include" });
  if (!response.ok) throw new ApiRequestError(response.status, null);
}

export async function scenarios(): Promise<ScenarioStatus[]> {
  return (await responseJson<{ scenarios: ScenarioStatus[] }>(await fetch("/api/dev/scenarios", { credentials: "include" }))).scenarios;
}

export async function scenarioAction(code: ScenarioRuleCode, action: "reset" | "trigger" | "prepare" | "correct" | "advance-time" | "fail-next-poll" | "poll" | "recur", body?: Record<string, unknown>): Promise<ScenarioStatus> {
  const init: RequestInit = { method: "POST", credentials: "include" };
  if (body) { init.headers = { "content-type": "application/json" }; init.body = JSON.stringify(body); }
  const result = await responseJson<ScenarioStatus | { scenario: ScenarioStatus }>(await fetch(`/api/dev/scenarios/${code}/${action}`, init));
  return "scenario" in result ? result.scenario : result;
}
