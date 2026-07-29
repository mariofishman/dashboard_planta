import type { ConversationMessage, ConversationSummary } from "./api";

export type ChatFilter = "all" | "unread" | "pinned";

export interface ChatAlertPresentation {
  id: string;
  code: string;
  shortName: string;
  age: string;
  label: string;
  title: string;
  summary: string;
  workOrderCode?: string;
  machineCode?: string;
  detectedAt?: string;
  blocking?: string;
  resolution?: string[];
}

export interface ChatConversationRow extends ConversationSummary {
  pinned: boolean;
  alerts: ChatAlertPresentation[];
  oldestAge: string | null;
  participants: string;
  mockOnly: boolean;
}

export type AlertChipTone = "danger" | "warning" | "possible";

export function alertChipTone(label: string): AlertChipTone {
  if (label === "Error") return "danger";
  if (label === "Error posible") return "possible";
  return "warning";
}

const alerts = {
  a05: {
    id: "alert-a05",
    code: "A05",
    shortName: "Sin pesar",
    age: "2 h 14 min",
    label: "Error",
    title: "Bobina CU-98421 sin pesar",
    summary: "La bobina producida no tiene un peso registrado y todavía permanece asociada a P15.",
    workOrderCode: "151087.3",
    machineCode: "P15",
    detectedAt: "3:48 p. m.",
    blocking: "Sin el peso, EmusaSoft no puede calcular el costo ni registrar correctamente la cantidad en inventario.",
    resolution: ["Pesar la bobina CU-98421.", "Registrar la lectura de la balanza en la OT.", "Moverla a la siguiente OT o al almacén correspondiente."],
  },
  a02: {
    id: "alert-a02",
    code: "A02",
    shortName: "En tránsito",
    age: "38 min",
    label: "Error",
    title: "Movimiento de material sin recepción",
    summary: "Un flujo enviado a P15 continúa en tránsito y no tiene recepción digital.",
    workOrderCode: "151087.3",
    machineCode: "P15",
    detectedAt: "4:12 p. m.",
    resolution: ["Confirmar la llegada física.", "Registrar la recepción digital.", "Si el material no llegó, revisar el movimiento con almacén."],
  },
  b02: { id: "alert-b02", code: "B02", shortName: "Inicio atrasado", age: "48 min", label: "Error", title: "Inicio de OT atrasado", summary: "La orden aún no registra el inicio operativo esperado.", workOrderCode: "151230.1", machineCode: "P09", detectedAt: "5:14 p. m." },
  a01: { id: "alert-a01", code: "A01", shortName: "Material no listo", age: "31 min", label: "Por vencer", title: "Material pendiente", summary: "El material requerido aún no está disponible para la orden.", workOrderCode: "151230.1", machineCode: "P09" },
  a03: { id: "alert-a03", code: "A03", shortName: "Sin consumo", age: "26 min", label: "Alerta", title: "Consumo inicial no declarado", summary: "La orden está activa sin un primer consumo de material registrado.", workOrderCode: "151244.2", machineCode: "EX02" },
  d01: { id: "alert-d01", code: "D01", shortName: "Metros excedidos", age: "3 h 06 min", label: "Error", title: "Metros producidos excedidos", summary: "La producción registrada supera el rango esperado para la orden." },
  d02: { id: "alert-d02", code: "D02", shortName: "Reel sin consumir", age: "2 h 41 min", label: "Error", title: "Reel pendiente de consumo", summary: "Un reel permanece asociado sin consumo confirmado." },
  c01: { id: "alert-c01", code: "C01", shortName: "Peso atípico", age: "1 h 52 min", label: "Error posible", title: "Peso fuera del patrón", summary: "El peso informado requiere revisión contra la evidencia de producción." },
  c06: { id: "alert-c06", code: "C06", shortName: "Velocidad atípica", age: "1 h 31 min", label: "Error posible", title: "Velocidad fuera del patrón", summary: "La velocidad declarada requiere revisión operativa." },
} satisfies Record<string, ChatAlertPresentation>;

// Presentation-only fixtures fill fields that the current Phase 6 API does not expose.
// They never alter authorization, persistence, polling, routing, or server contracts.
export const UI_ONLY_CONVERSATION_FIXTURES: ChatConversationRow[] = [
  {
    id: "ui-demo-production-p15", title: "Producción P15 · Turno día", updatedAt: "2026-07-28T18:02:00-05:00", writableUntil: null,
    lastSender: "Monitor", lastBody: "La bobina CU-98421 sigue sin pesarse.", lastKind: "alert", openAlerts: 2, unreadCount: 4, isParticipant: true,
    pinned: true, alerts: [alerts.a05, alerts.a02], oldestAge: "2 h 14 min", participants: "4 participantes · Supervisor, gerente y operador", mockOnly: true,
  },
  {
    id: "ui-demo-supervision", title: "Supervisión de impresión", updatedAt: "2026-07-28T17:48:00-05:00", writableUntil: null,
    lastSender: "David V.", lastBody: "Confirma si la P09 está lista.", lastKind: "text", openAlerts: 3, unreadCount: 2, isParticipant: true,
    pinned: false, alerts: [alerts.b02, alerts.a01, alerts.a03], oldestAge: "48 min", participants: "5 participantes · Supervisión e impresión", mockOnly: true,
  },
  {
    id: "ui-demo-close", title: "Cierre de OT · Impresión", updatedAt: "2026-07-28T17:31:00-05:00", writableUntil: null,
    lastSender: "Rosa P.", lastBody: "Revisé los registros de la OT 151087.3.", lastKind: "text", openAlerts: 4, unreadCount: 0, isParticipant: true,
    pinned: true, alerts: [alerts.d01, alerts.d02, alerts.c01, alerts.c06], oldestAge: "3 h 06 min", participants: "4 participantes · Cierre e impresión", mockOnly: true,
  },
  {
    id: "ui-demo-warehouse", title: "Almacén · Turno día", updatedAt: "2026-07-28T17:12:00-05:00", writableUntil: null,
    lastSender: "Carmen R.", lastBody: "Dos bobinas ya salieron hacia producción.", lastKind: "text", openAlerts: 6, unreadCount: 1, isParticipant: true,
    pinned: false, alerts: [alerts.a01, alerts.a02, alerts.a05], oldestAge: "1 h 22 min", participants: "6 participantes · Almacén y producción", mockOnly: true,
  },
  {
    id: "ui-demo-jorge", title: "Jorge A.", updatedAt: "2026-07-28T16:44:00-05:00", writableUntil: null,
    lastSender: "Jorge A.", lastBody: "Te reenvié la conversación de la OT 151230.1.", lastKind: "text", openAlerts: 1, unreadCount: 0, isParticipant: true,
    pinned: false, alerts: [alerts.b02], oldestAge: "34 min", participants: "Conversación directa", mockOnly: true,
  },
  {
    id: "ui-demo-extrusion", title: "Extrusión · Turno día", updatedAt: "2026-07-28T16:31:00-05:00", writableUntil: null,
    lastSender: "Monitor", lastBody: "Falta confirmar el inventario inicial.", lastKind: "alert", openAlerts: 2, unreadCount: 3, isParticipant: true,
    pinned: false, alerts: [alerts.a03, alerts.c01], oldestAge: "26 min", participants: "5 participantes · Extrusión", mockOnly: true,
  },
  {
    id: "ui-demo-sealing", title: "Sellado · Turno día", updatedAt: "2026-07-28T16:18:00-05:00", writableUntil: null,
    lastSender: "María C.", lastBody: "Estamos revisando el conteo de bolsas.", lastKind: "text", openAlerts: 1, unreadCount: 0, isParticipant: true,
    pinned: false, alerts: [alerts.a03], oldestAge: "18 min", participants: "4 participantes · Sellado", mockOnly: true,
  },
  {
    id: "ui-demo-ana", title: "Ana M.", updatedAt: "2026-07-28T15:52:00-05:00", writableUntil: null,
    lastSender: "Ana M.", lastBody: "Ya validé la recepción de la bobina para P09.", lastKind: "text", openAlerts: 0, unreadCount: 0, isParticipant: true,
    pinned: false, alerts: [], oldestAge: null, participants: "Conversación directa", mockOnly: true,
  },
];

export function conversationScope(isAdministrator: boolean): "mine" | "all" {
  return isAdministrator ? "all" : "mine";
}

export function buildConversationRows(backendRows: ConversationSummary[], includeReviewFixtures: boolean): ChatConversationRow[] {
  const connectedRows = backendRows.map((row, index) => {
    const fixture = UI_ONLY_CONVERSATION_FIXTURES[index % UI_ONLY_CONVERSATION_FIXTURES.length]!;
    const count = Math.max(0, Number(row.openAlerts));
    return {
      ...row,
      pinned: fixture.pinned,
      alerts: count > 0 ? fixture.alerts.slice(0, Math.min(count, fixture.alerts.length)) : [],
      oldestAge: count > 0 ? fixture.oldestAge : null,
      participants: fixture.participants,
      mockOnly: false,
    };
  });
  if (!includeReviewFixtures) return connectedRows;
  const connectedIds = new Set(connectedRows.map((row) => row.id));
  return [...connectedRows, ...UI_ONLY_CONVERSATION_FIXTURES.filter((row) => !connectedIds.has(row.id))];
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-PE");
}

export function filterConversationRows(rows: ChatConversationRow[], filter: ChatFilter, query: string): ChatConversationRow[] {
  const normalizedQuery = normalize(query.trim());
  return rows.filter((row) => {
    const matchesFilter = filter === "all" || (filter === "unread" ? Number(row.unreadCount) > 0 : row.pinned);
    const searchable = normalize([row.title, row.lastSender, row.lastBody, ...row.alerts.flatMap((alert) => [alert.code, alert.shortName, alert.workOrderCode ?? "", alert.machineCode ?? ""])].join(" "));
    return matchesFilter && (!normalizedQuery || searchable.includes(normalizedQuery));
  });
}

export function alertChipLimit(viewportWidth: number): number {
  if (viewportWidth <= 420) return 1;
  if (viewportWidth <= 760) return 2;
  return 3;
}

export function buildUiOnlyMessages(photoUrl: string, currentUserId = 101, currentUserName = "Luis V."): ConversationMessage[] {
  return [
    {
      id: "ui-message-alert-a05", cursor: -6, senderSysUserId: null, senderName: "Monitor", kind: "alert", body: "", replyToMessageId: null,
      payload: { ...alerts.a05, ruleCode: alerts.a05.code }, sentAt: "2026-07-28T15:48:00-05:00", editedAt: null, deletedAt: null, deliveredCount: 4, readCount: 4,
    },
    {
      id: "ui-message-question", cursor: -5, senderSysUserId: currentUserId, senderName: currentUserName, kind: "text", body: "@Jorge, confirma si la bobina sigue junto a la balanza de P15.", replyToMessageId: null,
      payload: {}, sentAt: "2026-07-28T15:52:00-05:00", editedAt: null, deletedAt: null, deliveredCount: 3, readCount: 2,
    },
    {
      id: "ui-message-reply", cursor: -4, senderSysUserId: 202, senderName: "Jorge A.", kind: "text", body: "Sí, está en P15. La voy a pesar cuando termine la bobina que está ahora en la balanza.", replyToMessageId: "ui-message-question",
      payload: {}, sentAt: "2026-07-28T16:03:00-05:00", editedAt: null, deletedAt: null, deliveredCount: 4, readCount: 3,
    },
    {
      id: "ui-message-photo", cursor: -3, senderSysUserId: 303, senderName: "Carmen R.", kind: "attachment", body: "Así quedó organizado el material.", replyToMessageId: null,
      payload: { attachment: { name: "material-p15.png", type: "image/png", size: 184000, dataUrl: photoUrl } }, sentAt: "2026-07-28T16:08:00-05:00", editedAt: null, deletedAt: null, deliveredCount: 4, readCount: 3,
    },
    {
      id: "ui-message-file", cursor: -2, senderSysUserId: 202, senderName: "Jorge A.", kind: "attachment", body: "Registro de pesaje para revisión.", replyToMessageId: "ui-message-alert-a05",
      payload: { attachment: { name: "registro-pesaje-151087.3.pdf", type: "application/pdf", size: 248000, mockOnly: true } }, sentAt: "2026-07-28T16:10:00-05:00", editedAt: null, deletedAt: null, deliveredCount: 4, readCount: 2,
    },
    {
      id: "ui-message-alert-a02", cursor: -1, senderSysUserId: null, senderName: "Monitor", kind: "alert", body: "", replyToMessageId: null,
      payload: { ...alerts.a02, ruleCode: alerts.a02.code }, sentAt: "2026-07-28T16:12:00-05:00", editedAt: null, deletedAt: null, deliveredCount: 4, readCount: 4,
    },
  ];
}
