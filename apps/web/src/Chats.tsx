import AddReactionRounded from "@mui/icons-material/AddReactionRounded";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import AttachFileRounded from "@mui/icons-material/AttachFileRounded";
import ChatBubbleRounded from "@mui/icons-material/ChatBubbleRounded";
import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import FactCheckOutlined from "@mui/icons-material/FactCheckOutlined";
import ForwardRounded from "@mui/icons-material/ForwardRounded";
import ImageRounded from "@mui/icons-material/ImageRounded";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import InsertDriveFileRounded from "@mui/icons-material/InsertDriveFileRounded";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import MoreVertRounded from "@mui/icons-material/MoreVertRounded";
import PhotoCameraRounded from "@mui/icons-material/PhotoCameraRounded";
import PushPinRounded from "@mui/icons-material/PushPinRounded";
import ReplyRounded from "@mui/icons-material/ReplyRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import SendRounded from "@mui/icons-material/SendRounded";
import StarBorderRounded from "@mui/icons-material/StarBorderRounded";
import type { SessionResponse } from "@monitor/contracts";
import { monitorSemanticTokens as ui } from "@monitor/design-system";
import {
  Alert,
  AppBar,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  ListItemIcon,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import demoPhoto from "../../../prototypes/current/chat/assets/photo-message-sample.png";
import {
  conversationMessages,
  conversations,
  deleteConversationMessage,
  editConversationMessage,
  markConversationRead,
  sendConversationMessage,
  type ConversationMessage,
} from "./api";
import {
  UI_ONLY_CONVERSATION_FIXTURES,
  alertChipLimit,
  alertChipTone,
  buildConversationRows,
  buildUiOnlyMessages,
  conversationScope,
  filterConversationRows,
  type ChatAlertPresentation,
  type ChatConversationRow,
  type ChatFilter,
} from "./chatUi";

const CHAT_CONTEXT_KEY = "monitor.chat.presentation-context";
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const alertToneColor = {
  danger: ui.color.lifecycleOpen,
  warning: ui.color.lifecycleClosed,
  possible: ui.color.actionHover,
} as const;

function go(path: string) { window.location.href = path; }
function time(value: string) { return new Intl.DateTimeFormat("es-PE", { hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
function bytes(value: number) { return value < 1024 * 1024 ? `${Math.max(1, Math.round(value / 1024))} KB` : `${(value / (1024 * 1024)).toFixed(1)} MB`; }
function textFromMessage(message: ConversationMessage) {
  if (message.body) return message.body;
  if (message.kind === "alert") return String(message.payload.title ?? message.payload.summary ?? message.payload.ruleCode ?? "Alerta operativa");
  const attachment = message.payload.attachment as Record<string, unknown> | undefined;
  return attachment?.name ? String(attachment.name) : "Adjunto";
}
function smoothBehavior(): ScrollBehavior { return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"; }

function ConversationAlertChip({ alert }: { alert: ChatAlertPresentation }) {
  return <Chip
    size="small"
    variant="outlined"
    label={<Box component="span" sx={{ display: "flex", alignItems: "center", minWidth: 0 }}>
      <Box component="span" sx={{ flex: "0 0 auto", color: alertToneColor[alertChipTone(alert.label)], fontWeight: 700 }}>{alert.code}</Box>
      <Box component="span" aria-hidden sx={{ flex: "0 0 auto", alignSelf: "stretch", width: "1px", mx: .75, bgcolor: ui.color.border }}/>
      <Box component="span" sx={{ minWidth: 0, overflow: "hidden", color: ui.color.structure, textOverflow: "ellipsis" }}>{alert.shortName}</Box>
    </Box>}
    sx={{
      minWidth: 0,
      maxWidth: { xs: 138, sm: 180 },
      borderColor: ui.color.controlBorder,
      borderRadius: ui.control.radius,
      bgcolor: ui.color.surface,
      "& .MuiChip-label": { display: "block", minWidth: 0, overflow: "hidden" },
    }}
  />;
}

function PrimaryNav({ chats = false }: { chats?: boolean }) {
  const item = (active: boolean) => ({ minWidth: { xs: 136, sm: 168 }, height: 60, fontWeight: active ? 700 : 500, position: "relative", ...(active ? { "&::before": { content: "''", position: "absolute", top: 0, left: 20, right: 20, height: 3, bgcolor: "primary.main", borderRadius: "0 0 4px 4px" } } : {}) });
  return <Paper component="nav" square elevation={0} aria-label="Navegación principal" sx={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 60, zIndex: 20, display: "flex", justifyContent: "center", gap: { xs: .5, sm: 3 }, borderTop: "1px solid", borderColor: "divider" }}>
    <Button startIcon={<DashboardRounded/>} onClick={() => go("/")} sx={item(!chats)} aria-current={!chats ? "page" : undefined}>Dashboard</Button>
    <Button startIcon={<ChatBubbleRounded/>} onClick={() => go("/chats")} sx={item(chats)} aria-current={chats ? "page" : undefined}>Chats</Button>
  </Paper>;
}

export function ChatList({ session }: { session: SessionResponse }) {
  const [rows, setRows] = useState<ChatConversationRow[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ChatFilter>("all");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [showConnectionWarning, setShowConnectionWarning] = useState(false);
  const [controlsHidden, setControlsHidden] = useState(false);
  const previousScrollTop = useRef(0);
  const ignoreDirectionUntil = useRef(0);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const isNarrow = useMediaQuery("(max-width:760px)");
  const isVeryNarrow = useMediaQuery("(max-width:420px)");
  const chipLimit = alertChipLimit(isVeryNarrow ? 420 : isNarrow ? 760 : 1024);
  const isAdministrator = session.principal.scopes.includes("monitor:admin");
  const scope = conversationScope(isAdministrator);

  const refresh = useCallback(() => {
    void conversations(search, undefined, scope)
      .then((result) => {
        setRows(buildConversationRows(result.conversations, import.meta.env.DEV));
        setNextCursor(result.nextCursor);
        setShowConnectionWarning(false);
        setState("ready");
      })
      .catch(() => {
        if (import.meta.env.DEV) {
          setRows(buildConversationRows([], true));
          setShowConnectionWarning(true);
          setState("ready");
        } else setState("error");
      });
  }, [scope, search]);

  useEffect(refresh, [refresh]);
  useEffect(() => {
    const socket: Socket = io({ withCredentials: true });
    socket.on("message.created", refresh);
    socket.on("message.updated", refresh);
    socket.on("receipt.updated", refresh);
    return () => { socket.disconnect(); };
  }, [refresh]);

  const visible = useMemo(() => filterConversationRows(rows, filter, search), [filter, rows, search]);
  const counts = useMemo(() => ({ all: rows.length, unread: rows.filter((row) => Number(row.unreadCount) > 0).length, pinned: rows.filter((row) => row.pinned).length }), [rows]);

  const setHidden = (hidden: boolean) => {
    setControlsHidden(hidden);
    if (hidden && controlsRef.current?.contains(document.activeElement)) (document.activeElement as HTMLElement)?.blur();
    ignoreDirectionUntil.current = performance.now() + 220;
  };
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const current = event.currentTarget.scrollTop;
    const delta = current - previousScrollTop.current;
    if (current < 20) setHidden(false);
    else if (performance.now() >= ignoreDirectionUntil.current) {
      if (delta > 6) setHidden(true);
      else if (delta < -6) setHidden(false);
    }
    previousScrollTop.current = current;
  };
  const chooseFilter = (next: ChatFilter) => {
    setFilter(next);
    setHidden(false);
    previousScrollTop.current = 0;
  };
  const openConversation = (row: ChatConversationRow) => {
    sessionStorage.setItem(CHAT_CONTEXT_KEY, JSON.stringify({ id: row.id, title: row.title, participants: row.participants, mockOnly: row.mockOnly }));
    go(`/chats/${row.id}`);
  };

  return <Box sx={{ height: "100dvh", minHeight: 520, bgcolor: "background.default", display: "grid", gridTemplateRows: "52px minmax(0,1fr) 60px", overflow: "hidden" }}>
    <AppBar position="static" color="secondary" elevation={0}><Toolbar sx={{ minHeight: "52px !important", gap: 2 }}><Box flex={1}><Typography variant="h2" color="inherit">Chats</Typography><Typography variant="caption" sx={{ color: ui.color.textInverseMuted }}>{session.principal.displayName}</Typography></Box></Toolbar></AppBar>
    <Box component="main" sx={{ width: "min(100%, 760px)", height: "100%", minHeight: 0, mx: "auto", p: { xs: 1, sm: 1.5 } }}>
      <Paper variant="outlined" sx={{ height: "100%", minHeight: 0, borderRadius: 1.5, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <Box ref={controlsRef} data-testid="chat-list-controls" aria-hidden={controlsHidden} inert={controlsHidden} sx={{ flex: "0 0 auto", maxHeight: controlsHidden ? 0 : 92, opacity: controlsHidden ? 0 : 1, overflow: "hidden", transition: "max-height 200ms cubic-bezier(.22,1,.36,1), opacity 150ms linear" }}>
          <Box sx={{ p: 1 }}>
            <TextField fullWidth size="small" value={search} onFocus={() => setHidden(false)} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar grupo, persona, máquina, OT o alerta" inputProps={{ "aria-label": "Buscar conversaciones" }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded sx={{ fontSize: 18 }}/></InputAdornment> } }}/>
            <Stack direction="row" gap={.5} sx={{ mt: 1, overflowX: "auto" }} aria-label="Filtros de conversaciones">
              {([ ["all", "Todas", counts.all], ["unread", "No leídas", counts.unread], ["pinned", "Fijadas", counts.pinned] ] as const).map(([value, label, count]) => <Chip key={value} label={`${label} ${count}`} clickable aria-pressed={filter === value} color={filter === value ? "primary" : "default"} variant={filter === value ? "filled" : "outlined"} onClick={() => chooseFilter(value)} sx={{ flex: "0 0 auto" }}/>) }
            </Stack>
          </Box>
          <Divider/>
        </Box>

        <Box data-testid="chat-list-scroll" onScroll={handleScroll} sx={{ minHeight: 0, flex: 1, overflowY: "auto", overscrollBehavior: "contain" }}>
          {showConnectionWarning && <Alert severity="warning" sx={{ borderRadius: 0 }}>No se pudo conectar con la API local. Se muestran datos estables de presentación.</Alert>}
          {state === "loading" && <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={24}/></Stack>}
          {state === "error" && <Alert severity="error">No se pudieron cargar las conversaciones.</Alert>}
          {state === "ready" && visible.length === 0 && <Box sx={{ py: 7, px: 2, textAlign: "center" }}><Typography fontWeight={700}>No hay conversaciones</Typography><Typography variant="body2" color="text.secondary">Prueba otro término o filtro.</Typography></Box>}
          <Stack divider={<Divider flexItem/>}>
            {visible.map((row) => {
              const shownAlerts = row.alerts.slice(0, chipLimit);
              const hiddenAlerts = Math.max(0, Number(row.openAlerts) - shownAlerts.length);
              const unread = Number(row.unreadCount) > 0;
              return <ButtonBase key={row.id} data-testid={`conversation-${row.id}`} onClick={() => openConversation(row)} aria-label={`Abrir ${row.title}${unread ? `. ${row.unreadCount} ${Number(row.unreadCount) === 1 ? "mensaje" : "mensajes"} no leídos` : ""}${row.openAlerts ? `. ${row.openAlerts} alertas abiertas` : ""}`} sx={{ width: "100%", px: { xs: 1.25, sm: 1.5 }, py: 1.1, textAlign: "left", alignItems: "stretch", gap: 1, position: "relative", "&:hover": { bgcolor: "action.hover" }, "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -2 } }}>
                {unread && <Box aria-hidden sx={{ position: "absolute", top: 18, left: 4, width: 6, height: 6, borderRadius: "50%", bgcolor: "primary.main" }}/>}
                <Box sx={{ minWidth: 0, flex: 1, pl: .25 }}>
                  <Stack direction="row" gap={.75} alignItems="center" minWidth={0}>
                    <Typography variant="body2" fontWeight={700} noWrap>{row.title}</Typography>
                    {row.pinned && <Typography variant="caption" color="primary.main" fontWeight={700} sx={{ flex: "0 0 auto", px: .5, py: .15, borderRadius: ui.control.radius, bgcolor: "action.selected" }}>Fijada</Typography>}
                  </Stack>
                  <Typography variant="caption" color="text.secondary" noWrap display="block"><Box component="span" sx={{ color: "text.primary", fontWeight: 600 }}>{row.lastSender || "Monitor"}:</Box> {row.lastKind === "alert" ? row.lastBody || "Nueva alerta operativa" : row.lastBody}</Typography>
                  {Number(row.openAlerts) > 0 && <>
                    <Stack direction="row" alignItems="center" gap={.5} sx={{ mt: .55 }}>
                      <Typography variant="caption" color="text.secondary">{Number(row.openAlerts) === 1 ? "Sin resolver" : "Más antigua"}</Typography>
                      <Typography variant="caption" fontWeight={700} sx={{ fontVariantNumeric: "tabular-nums" }}>{row.oldestAge ?? "—"}</Typography>
                    </Stack>
                    <Stack direction="row" gap={.5} sx={{ mt: .5, minWidth: 0, overflow: "hidden" }} aria-label={`Alertas abiertas: ${row.alerts.map((alert) => `${alert.code} ${alert.shortName}`).join(", ")}`}>
                      {shownAlerts.map((alert) => <ConversationAlertChip key={`${row.id}-${alert.id}`} alert={alert}/>) }
                      {hiddenAlerts > 0 && <Chip size="small" label={`+${hiddenAlerts} más`} sx={{ flex: "0 0 auto", bgcolor: "action.selected", color: "secondary.main" }}/>}
                    </Stack>
                  </>}
                </Box>
                <Stack alignItems="flex-end" gap={.75} sx={{ flex: "0 0 auto" }}><Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{time(row.updatedAt)}</Typography>{unread && <Box aria-label={`${row.unreadCount} mensajes no leídos`} sx={{ minWidth: 20, height: 20, px: .5, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: "primary.main", color: "white", fontSize: ui.typography.routine, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{row.unreadCount}</Box>}</Stack>
              </ButtonBase>;
            })}
          </Stack>
          {nextCursor && filter === "all" && <Box sx={{ p: 1, textAlign: "center" }}><Button size="small" onClick={() => void conversations(search, nextCursor, scope).then((result) => { setRows((current) => [...current, ...buildConversationRows(result.conversations, false)]); setNextCursor(result.nextCursor); })}>Cargar conversaciones anteriores</Button></Box>}
        </Box>
      </Paper>
    </Box>
    <Box aria-hidden/>
    <PrimaryNav chats/>
  </Box>;
}

type AttachmentDraft = { name: string; type: string; size: number; dataUrl?: string; mockOnly?: boolean };
type PendingMessage = { id: string; body: string; replyToMessageId: string | null; payload?: Record<string, unknown> };

function payloadAlert(message: ConversationMessage): ChatAlertPresentation {
  const payload = message.payload;
  return {
    id: String(payload.id ?? `alert-${message.id}`),
    code: String(payload.ruleCode ?? payload.code ?? "Alerta"),
    shortName: String(payload.shortName ?? payload.title ?? "Alerta operativa"),
    age: String(payload.age ?? payload.unresolvedDuration ?? "Sin resolver"),
    label: String(payload.label ?? payload.statusLabel ?? "Abierta"),
    title: String(payload.title ?? "Alerta operativa"),
    summary: String(payload.summary ?? "Consulta la evidencia operativa disponible."),
    ...(payload.workOrderCode ? { workOrderCode: String(payload.workOrderCode) } : {}),
    ...(payload.machineCode ? { machineCode: String(payload.machineCode) } : {}),
    ...(payload.detectedAt ? { detectedAt: String(payload.detectedAt) } : payload.openedAt ? { detectedAt: time(String(payload.openedAt)) } : {}),
    ...(payload.blocking ? { blocking: String(payload.blocking) } : {}),
    ...(Array.isArray(payload.resolution) ? { resolution: payload.resolution.map(String) } : {}),
  };
}

function AlertAttachment({ message, expanded, highlighted, register, onToggle, onCopyIdentifier }: { message: ConversationMessage; expanded: boolean; highlighted: boolean; register: (element: HTMLElement | null) => void; onToggle: () => void; onCopyIdentifier: (value: string) => void }) {
  const alert = payloadAlert(message);
  return <Paper ref={register} component="section" tabIndex={0} variant="outlined" aria-labelledby={`${message.id}-alert-title`} onClick={(event) => { if (!(event.target as Element).closest("button")) onToggle(); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onToggle(); } }} sx={{ mt: .25, overflow: "hidden", borderRadius: 1.25, borderColor: highlighted ? "primary.main" : "error.main", bgcolor: "background.paper", outline: highlighted ? `2px solid ${ui.color.action}` : undefined, outlineOffset: highlighted ? 2 : undefined }}>
    <Stack direction="row" alignItems="center" gap={.5} flexWrap="wrap" sx={{ minHeight: 34, px: .75, py: .4, borderBottom: "1px solid", borderColor: "divider", bgcolor: "rgba(225,29,72,.045)" }}>
      <Chip size="small" color="error" variant="outlined" label={alert.label}/>
      <Chip size="small" label={alert.code}/>
      <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ ml: "auto", fontVariantNumeric: "tabular-nums" }}>{alert.age}{alert.age === "Sin resolver" ? "" : " sin resolver"}</Typography>
    </Stack>
    <Box sx={{ p: 1 }}>
      <Typography id={`${message.id}-alert-title`} variant="body2" fontWeight={700}>{alert.title}</Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: .25, maxWidth: "70ch" }}>{alert.summary}</Typography>
      <Stack direction="row" gap={.5} flexWrap="wrap" sx={{ mt: .75 }}>
        {alert.workOrderCode && <Chip size="small" label={`OT ${alert.workOrderCode}`}/>}
        {alert.machineCode && <Chip size="small" label={`Máquina ${alert.machineCode}`}/>}
        {alert.detectedAt && <Chip size="small" label={`Detectada ${alert.detectedAt}`}/>}
      </Stack>
    </Box>
    <Stack direction={{ xs: "column", sm: "row" }} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
      {alert.workOrderCode && <Button onClick={(event) => { event.stopPropagation(); onCopyIdentifier(alert.workOrderCode!); }} sx={{ flex: 1, minHeight: 40, borderRadius: 0 }}>Copiar OT {alert.workOrderCode}</Button>}
      <Button aria-expanded={expanded} onClick={(event) => { event.stopPropagation(); onToggle(); }} sx={{ flex: 1, minHeight: 40, borderRadius: 0, bgcolor: "rgba(0,122,204,.06)" }}>{expanded ? "Ocultar guía" : "Ver explicación y solución"}</Button>
    </Stack>
    {expanded && <Box sx={{ p: 1, borderTop: "1px solid", borderColor: "divider", bgcolor: "background.default" }}>
      {alert.blocking && <><Typography variant="caption" fontWeight={700}>Qué está bloqueando</Typography><Typography variant="caption" color="text.secondary" display="block" sx={{ mt: .25 }}>{alert.blocking}</Typography></>}
      <Typography variant="caption" fontWeight={700} display="block" sx={{ mt: alert.blocking ? 1 : 0 }}>Cómo resolverlo</Typography>
      {alert.resolution?.length ? <Box component="ol" sx={{ my: .25, pl: 2.5, color: "text.secondary", fontSize: ui.typography.routine, lineHeight: 1.55 }}>{alert.resolution.map((step) => <li key={step}>{step}</li>)}</Box> : <Typography variant="caption" color="text.secondary">Revisa la evidencia y completa la corrección en el flujo operativo de EmusaSoft.</Typography>}
    </Box>}
  </Paper>;
}

export function ChatDetail({ session, conversationId }: { session: SessionResponse; conversationId: string }) {
  const queueKey = `monitor.pending.${session.principal.sysUserId}.${conversationId}`;
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [localMessages, setLocalMessages] = useState<ConversationMessage[]>([]);
  const [pending, setPending] = useState<PendingMessage[]>(() => JSON.parse(localStorage.getItem(queueKey) ?? "[]") as PendingMessage[]);
  const [draft, setDraft] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [sending, setSending] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [nextMessageCursor, setNextMessageCursor] = useState<number | null>(null);
  const [typingUsers, setTypingUsers] = useState<number[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);
  const [attachment, setAttachment] = useState<AttachmentDraft | null>(null);
  const [messageMenuAnchor, setMessageMenuAnchor] = useState<HTMLElement | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ConversationMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ConversationMessage | null>(null);
  const [replyTo, setReplyTo] = useState<ConversationMessage | null>(null);
  const [forwardMessage, setForwardMessage] = useState<ConversationMessage | null>(null);
  const [mobileActionMessage, setMobileActionMessage] = useState<ConversationMessage | null>(null);
  const [mobileMore, setMobileMore] = useState(false);
  const [reactionAnchor, setReactionAnchor] = useState<HTMLElement | null>(null);
  const [reactionMessage, setReactionMessage] = useState<ConversationMessage | null>(null);
  const [reactions, setReactions] = useState<Record<string, string[]>>({});
  const [highlighted, setHighlighted] = useState<Set<string>>(() => new Set());
  const [pinnedMessages, setPinnedMessages] = useState<Set<string>>(() => new Set());
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(() => new Set());
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(() => new Set());
  const [flashMessageId, setFlashMessageId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [conversationMenuAnchor, setConversationMenuAnchor] = useState<HTMLElement | null>(null);
  const [historySearchOpen, setHistorySearchOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const isMobile = useMediaQuery("(max-width:760px)");
  const socket = useMemo(() => io({ withCredentials: true, autoConnect: false }), []);
  const composerInputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messageRefs = useRef(new Map<string, HTMLElement>());
  const alertRefs = useRef(new Map<string, HTMLElement>());
  const longPress = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null);
  const longPressOpenedAt = useRef(0);

  const fixtureConversation = UI_ONLY_CONVERSATION_FIXTURES.find((row) => row.id === conversationId) ?? UI_ONLY_CONVERSATION_FIXTURES[0]!;
  const storedContext = useMemo(() => {
    try {
      const value = JSON.parse(sessionStorage.getItem(CHAT_CONTEXT_KEY) ?? "null") as { id?: string; title?: string; participants?: string; mockOnly?: boolean } | null;
      return value?.id === conversationId ? value : null;
    } catch { return null; }
  }, [conversationId]);
  const mockConversation = Boolean(storedContext?.mockOnly || conversationId.startsWith("ui-demo-"));
  const conversationTitle = storedContext?.title ?? fixtureConversation.title;
  const participantSummary = storedContext?.participants ?? fixtureConversation.participants;
  const uiOnlyMessages = useMemo(() => buildUiOnlyMessages(demoPhoto, session.principal.sysUserId, session.principal.displayName), [session.principal.displayName, session.principal.sysUserId]);

  const refresh = useCallback(() => {
    if (mockConversation) { setState("ready"); return; }
    void conversationMessages(conversationId).then(async (result) => {
      setMessages(result.messages);
      setNextMessageCursor(result.nextCursor);
      setReadOnly(Boolean(result.writableUntil && Date.parse(result.writableUntil) <= Date.now()));
      setState("ready");
      const latest = result.messages.at(-1)?.cursor;
      if (latest) await markConversationRead(conversationId, latest);
    }).catch(() => setState(import.meta.env.DEV ? "ready" : "error"));
  }, [conversationId, mockConversation]);
  useEffect(refresh, [refresh]);

  const flushPending = useCallback(async (items: PendingMessage[]) => {
    let remaining = [...items];
    for (const item of items) {
      try {
        await sendConversationMessage(conversationId, item.body, item.id, item.replyToMessageId, item.payload);
        remaining = remaining.filter((pendingItem) => pendingItem.id !== item.id);
        localStorage.setItem(queueKey, JSON.stringify(remaining));
        setPending(remaining);
      } catch { break; }
    }
    if (remaining.length === 0) refresh();
  }, [conversationId, queueKey, refresh]);

  useEffect(() => {
    if (mockConversation) return;
    socket.on("connect", () => { void flushPending(JSON.parse(localStorage.getItem(queueKey) ?? "[]") as PendingMessage[]); });
    socket.on("message.created", refresh);
    socket.on("message.updated", refresh);
    socket.on("typing", (event: { conversationId: string; sysUserId: number; active: boolean }) => { if (event.conversationId === conversationId) setTypingUsers((current) => event.active ? [...new Set([...current, event.sysUserId])] : current.filter((id) => id !== event.sysUserId)); });
    socket.on("presence", (event: { conversationId: string; sysUserId: number; online: boolean }) => { if (event.conversationId === conversationId) setOnlineUsers((current) => event.online ? [...new Set([...current, event.sysUserId])] : current.filter((id) => id !== event.sysUserId)); });
    socket.connect();
    const online = () => void flushPending(JSON.parse(localStorage.getItem(queueKey) ?? "[]") as PendingMessage[]);
    window.addEventListener("online", online);
    return () => { window.removeEventListener("online", online); socket.disconnect(); };
  }, [conversationId, flushPending, mockConversation, queueKey, refresh, socket]);

  const displayMessages = useMemo(() => {
    const fixtureMessages = import.meta.env.DEV ? uiOnlyMessages : [];
    const byId = new Map<string, ConversationMessage>();
    [...fixtureMessages, ...messages, ...localMessages].forEach((message) => byId.set(message.id, message));
    return [...byId.values()].sort((a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt));
  }, [localMessages, messages, uiOnlyMessages]);
  const messageById = useMemo(() => new Map(displayMessages.map((message) => [message.id, message])), [displayMessages]);
  const visibleMessages = useMemo(() => {
    const query = historySearch.trim().toLocaleLowerCase("es-PE");
    if (!query) return displayMessages;
    return displayMessages.filter((message) => `${message.senderName} ${textFromMessage(message)}`.toLocaleLowerCase("es-PE").includes(query));
  }, [displayMessages, historySearch]);
  const alertMessages = useMemo(() => displayMessages.filter((message) => message.kind === "alert" && !message.deletedAt), [displayMessages]);

  useEffect(() => {
    if (state !== "ready") return;
    window.requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "auto" }));
  }, [state]);

  const showToast = (message: string) => setToast(message);
  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => setter((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const jumpToMessage = (id: string) => {
    setHistorySearch("");
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      const element = alertRefs.current.get(id) ?? messageRefs.current.get(id);
      element?.scrollIntoView({ behavior: smoothBehavior(), block: "center" });
      element?.focus({ preventScroll: true });
      setFlashMessageId(id);
      window.setTimeout(() => setFlashMessageId((current) => current === id ? null : current), 1200);
    }));
  };
  const copyText = async (value: string, success = "Mensaje copiado") => {
    try { await navigator.clipboard.writeText(value); showToast(success); }
    catch { showToast("No se pudo copiar"); }
  };
  const addReaction = (message: ConversationMessage, reaction: string) => {
    setReactions((current) => ({ ...current, [message.id]: [...new Set([...(current[message.id] ?? []), reaction])] }));
    showToast(`Reacción ${reaction} añadida`);
    setReactionAnchor(null);
    setMobileActionMessage(null);
  };
  const chooseReply = (message: ConversationMessage) => {
    setReplyTo(message);
    setEditingMessage(null);
    setMobileActionMessage(null);
    setMessageMenuAnchor(null);
    window.requestAnimationFrame(() => composerInputRef.current?.focus());
  };
  const openReactionMenu = (message: ConversationMessage, anchor: HTMLElement | null) => {
    setReactionMessage(message);
    setReactionAnchor(anchor);
    setMessageMenuAnchor(null);
  };
  const editAllowed = (message: ConversationMessage) => message.senderSysUserId === session.principal.sysUserId && message.kind === "text" && !message.deletedAt && !message.id.startsWith("ui-") && Date.now() - Date.parse(message.sentAt) <= 15 * 60_000;
  const deleteAllowed = (message: ConversationMessage) => message.senderSysUserId === session.principal.sysUserId && !message.deletedAt && !message.id.startsWith("ui-") && Date.now() - Date.parse(message.sentAt) <= 2 * 24 * 60 * 60_000;
  const closeDesktopMenu = () => setMessageMenuAnchor(null);
  const runAction = (action: string, message: ConversationMessage, anchor?: HTMLElement | null) => {
    if (action === "reply") chooseReply(message);
    if (action === "react") openReactionMenu(message, anchor ?? null);
    if (action === "highlight") { toggleSet(setHighlighted, message.id); showToast(highlighted.has(message.id) ? "Destacado retirado" : "Mensaje destacado"); }
    if (action === "pin") { toggleSet(setPinnedMessages, message.id); showToast(pinnedMessages.has(message.id) ? "Mensaje desfijado" : "Mensaje fijado en esta conversación"); }
    if (action === "forward") { setForwardMessage(message); setMobileActionMessage(null); closeDesktopMenu(); }
    if (action === "copy") { void copyText(textFromMessage(message)); setMobileActionMessage(null); closeDesktopMenu(); }
    if (action === "info") { showToast(`${message.senderName || "Monitor"} · ${time(message.sentAt)} · ${message.readCount} lecturas`); setMobileActionMessage(null); closeDesktopMenu(); }
    if (action === "details") { toggleSet(setExpandedAlerts, message.id); jumpToMessage(message.id); setMobileActionMessage(null); closeDesktopMenu(); }
    if (action === "select") { toggleSet(setSelectedMessages, message.id); showToast(selectedMessages.has(message.id) ? "Selección cancelada" : "Mensaje seleccionado"); setMobileActionMessage(null); closeDesktopMenu(); }
    if (action === "edit" && editAllowed(message)) { setEditingMessage(message); setReplyTo(null); setDraft(message.body); closeDesktopMenu(); window.requestAnimationFrame(() => composerInputRef.current?.focus()); }
    if (action === "delete" && deleteAllowed(message)) { closeDesktopMenu(); void deleteConversationMessage(message.id).then(() => { showToast("Mensaje eliminado para todos"); refresh(); }); }
  };

  const clearLongPress = () => {
    if (longPress.current) window.clearTimeout(longPress.current.timer);
    longPress.current = null;
  };
  const startLongPress = (event: React.PointerEvent, message: ConversationMessage) => {
    if (!isMobile || event.pointerType === "mouse" || (event.target as Element).closest("button,a,input")) return;
    clearLongPress();
    longPress.current = {
      x: event.clientX,
      y: event.clientY,
      timer: window.setTimeout(() => { longPressOpenedAt.current = Date.now(); setMobileActionMessage(message); setMobileMore(false); longPress.current = null; }, 520),
    };
  };
  const moveLongPress = (event: React.PointerEvent) => {
    if (longPress.current && Math.hypot(event.clientX - longPress.current.x, event.clientY - longPress.current.y) > 10) clearLongPress();
  };

  const selectImage = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast("La imagen supera el límite local de 5 MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setAttachment({ name: file.name, type: file.type, size: file.size, dataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };
  const selectFile = (file: File | undefined) => {
    if (!file) return;
    setAttachment({ name: file.name, type: file.type || "application/octet-stream", size: file.size, mockOnly: true });
    showToast("Archivo listo para presentación local");
  };

  const appendLocalMessage = (body: string, nextAttachment?: AttachmentDraft | null) => {
    const now = new Date();
    setLocalMessages((current) => [...current, {
      id: `ui-local-${crypto.randomUUID()}`, cursor: -1000 - current.length, senderSysUserId: session.principal.sysUserId, senderName: session.principal.displayName,
      kind: nextAttachment ? "attachment" : "text", body, payload: nextAttachment ? { attachment: nextAttachment } : {}, replyToMessageId: replyTo?.id ?? null,
      sentAt: now.toISOString(), editedAt: null, deletedAt: null, deliveredCount: 0, readCount: 0,
    }]);
  };
  const send = async () => {
    if ((!draft.trim() && !attachment) || sending) return;
    if (editingMessage) {
      setSending(true);
      try { await editConversationMessage(editingMessage.id, draft.trim()); setDraft(""); setEditingMessage(null); showToast("Mensaje editado"); refresh(); }
      finally { setSending(false); }
      return;
    }
    if (mockConversation || attachment?.mockOnly) {
      appendLocalMessage(draft.trim(), attachment);
      setDraft(""); setAttachment(null); setReplyTo(null);
      showToast(attachment?.mockOnly ? "Archivo añadido a la vista local" : "Mensaje añadido a la vista local");
      window.requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: smoothBehavior() }));
      return;
    }
    const nextMessage: PendingMessage = { id: crypto.randomUUID(), body: draft.trim(), replyToMessageId: replyTo?.id ?? null, ...(attachment ? { payload: { attachment } } : {}) };
    const next = [...pending, nextMessage];
    setPending(next); localStorage.setItem(queueKey, JSON.stringify(next)); setDraft(""); setAttachment(null); setReplyTo(null); setSending(true);
    try { await flushPending(next); } finally { setSending(false); }
  };

  const renderAttachment = (message: ConversationMessage) => {
    const item = message.payload.attachment as Record<string, unknown> | undefined;
    if (!item) return null;
    const image = typeof item.dataUrl === "string" && String(item.type).startsWith("image/");
    return image ? <Box><Box component="img" src={String(item.dataUrl)} alt={message.body || `Imagen ${String(item.name ?? "adjunta")}`} sx={{ display: "block", width: "100%", maxHeight: 360, objectFit: "cover", borderRadius: 1 }}/>{message.body && <Typography variant="body2" sx={{ mt: .5 }}>{message.body}</Typography>}</Box> : <Box><Stack direction="row" alignItems="center" gap={1} sx={{ p: .75, bgcolor: "background.default", borderRadius: 1 }}><InsertDriveFileRounded color="primary"/><Box minWidth={0}><Typography variant="body2" fontWeight={700} noWrap>{String(item.name ?? "Archivo adjunto")}</Typography><Typography variant="caption" color="text.secondary">{String(item.type ?? "Archivo")} · {bytes(Number(item.size ?? 0))}</Typography></Box></Stack>{message.body && <Typography variant="body2" sx={{ mt: .5 }}>{message.body}</Typography>}</Box>;
  };

  return <Box sx={{ height: "100dvh", minHeight: 520, bgcolor: "background.default", display: "flex", flexDirection: "column", overflow: "hidden" }}>
    <AppBar position="static" color="secondary" elevation={0}>
      <Toolbar sx={{ minHeight: "52px !important", gap: 1 }}>
        <IconButton color="inherit" aria-label="Volver a chats" onClick={() => go("/chats")} sx={{ width: 40, height: 40 }}><ArrowBackRounded/></IconButton>
        <Box minWidth={0} flex={1}><Typography variant="h2" color="inherit" noWrap>{conversationTitle}</Typography><Typography variant="caption" sx={{ color: ui.color.textInverseMuted }} noWrap>{participantSummary}{onlineUsers.length ? ` · ${onlineUsers.length} en línea` : ""}</Typography></Box>
        <IconButton color="inherit" aria-label="Opciones de la conversación" aria-haspopup="menu" aria-expanded={Boolean(conversationMenuAnchor)} onClick={(event) => setConversationMenuAnchor(event.currentTarget)} sx={{ width: 40, height: 40 }}><MoreVertRounded/></IconButton>
      </Toolbar>
    </AppBar>
    <Menu anchorEl={conversationMenuAnchor} open={Boolean(conversationMenuAnchor)} onClose={() => setConversationMenuAnchor(null)}>
      <MenuItem onClick={() => { setConversationMenuAnchor(null); showToast("Conversación fijada"); }}><ListItemIcon><PushPinRounded fontSize="small"/></ListItemIcon>Fijar conversación</MenuItem>
      <MenuItem onClick={() => { setConversationMenuAnchor(null); showToast("Conversación marcada como no leída"); }}><ListItemIcon><ChatBubbleRounded fontSize="small"/></ListItemIcon>Marcar como no leída</MenuItem>
      <MenuItem onClick={() => { setConversationMenuAnchor(null); setHistorySearchOpen(true); window.requestAnimationFrame(() => document.getElementById("chat-history-search")?.focus()); }}><ListItemIcon><SearchRounded fontSize="small"/></ListItemIcon>Buscar en la conversación</MenuItem>
      <MenuItem onClick={() => { setConversationMenuAnchor(null); showToast(participantSummary); }}><ListItemIcon><InfoOutlined fontSize="small"/></ListItemIcon>Información del grupo</MenuItem>
    </Menu>

    <Box sx={{ flex: "0 0 auto", px: { xs: 1, sm: 2 }, py: .6, borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.paper" }} aria-label="Alertas abiertas en esta conversación">
      <Stack direction="row" alignItems="center" gap={.75} sx={{ width: "min(100%, 820px)", mx: "auto", minWidth: 0 }}>
        <Typography variant="caption" sx={{ flex: "0 0 auto" }}><Box component="span" fontWeight={700}>{alertMessages.length}</Box> {alertMessages.length === 1 ? "alerta abierta" : "alertas abiertas"}</Typography>
        <Stack direction="row" gap={.5} sx={{ minWidth: 0, overflowX: "auto" }}>
          {alertMessages.map((message) => { const alert = payloadAlert(message); return <Button key={message.id} size="small" variant="outlined" color="error" onClick={() => jumpToMessage(message.id)} sx={{ flex: "0 0 auto", color: "primary.main" }}>{alert.code} · {alert.age}</Button>; })}
        </Stack>
      </Stack>
    </Box>
    {historySearchOpen && <Box sx={{ flex: "0 0 auto", p: .75, borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}><Stack direction="row" gap={.5} sx={{ width: "min(100%, 820px)", mx: "auto" }}><TextField id="chat-history-search" fullWidth size="small" value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Buscar en la conversación" inputProps={{ "aria-label": "Buscar en la conversación" }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded sx={{ fontSize: 17 }}/></InputAdornment> } }}/><IconButton aria-label="Cerrar búsqueda" onClick={() => { setHistorySearchOpen(false); setHistorySearch(""); }} sx={{ width: 40, height: 40 }}><CloseRounded/></IconButton></Stack></Box>}

    <Box ref={scrollRef} data-testid="chat-detail-scroll" component="main" sx={{ minHeight: 0, flex: 1, overflowY: "auto", px: { xs: 1, sm: 2 }, py: 1.25, overscrollBehavior: "contain" }}>
      <Stack sx={{ width: "min(100%, 820px)", mx: "auto" }} gap={.55}>
        {state === "loading" && <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress size={24}/></Stack>}
        {state === "error" && <Alert severity="error">No se pudo cargar el historial.</Alert>}
        {nextMessageCursor && <Button size="small" sx={{ alignSelf: "center" }} onClick={() => void conversationMessages(conversationId, nextMessageCursor).then((result) => { setMessages((current) => [...result.messages, ...current]); setNextMessageCursor(result.nextCursor); })}>Cargar mensajes anteriores</Button>}
        {visibleMessages.map((message) => {
          const outgoing = message.senderSysUserId === session.principal.sysUserId;
          const quoted = message.replyToMessageId ? messageById.get(message.replyToMessageId) : undefined;
          const isAlert = message.kind === "alert";
          const isAttachment = message.kind === "attachment";
          const active = flashMessageId === message.id || highlighted.has(message.id) || selectedMessages.has(message.id);
          const maxWidth = isAlert ? { xs: "96%", sm: 560 } : isAttachment ? { xs: "92%", sm: 380 } : { xs: "92%", sm: "76%" };
          return <Box key={message.id} data-testid={`message-${message.id}`} ref={(element: HTMLElement | null) => { if (element) messageRefs.current.set(message.id, element); else messageRefs.current.delete(message.id); }} component="article" tabIndex={-1} onPointerDown={(event) => startLongPress(event, message)} onPointerMove={moveLongPress} onPointerUp={clearLongPress} onPointerCancel={clearLongPress} onPointerLeave={clearLongPress} onContextMenu={(event) => { if (!isMobile || (event.target as Element).closest("button,a,input")) return; event.preventDefault(); if (Date.now() - longPressOpenedAt.current >= 1400) setMobileActionMessage(message); }} sx={{ alignSelf: outgoing ? "flex-end" : "flex-start", width: isAlert ? "min(100%, 560px)" : "fit-content", maxWidth, outline: "none" }}>
            <Paper variant="outlined" sx={{ p: isAlert ? .5 : .75, pr: !isMobile && !message.deletedAt ? 4 : .75, borderRadius: isAlert ? 1.25 : 1.75, bgcolor: outgoing ? "action.selected" : "background.paper", position: "relative", borderColor: active ? "primary.main" : "divider", outline: active ? `1px solid ${ui.color.action}` : undefined, outlineOffset: active ? 1 : undefined, WebkitTouchCallout: "none", userSelect: isMobile ? "none" : "text" }}>
              {!isMobile && !message.deletedAt && <IconButton size="small" aria-label="Acciones del mensaje" aria-haspopup="menu" onClick={(event) => { setSelectedMessage(message); setMessageMenuAnchor(event.currentTarget); }} sx={{ position: "absolute", top: 1, right: 1, width: 30, height: 30 }}><ExpandMoreRounded sx={{ fontSize: 17 }}/></IconButton>}
              {!outgoing && <Typography variant="caption" color="primary.main" fontWeight={700} display="block" sx={{ mb: .15 }}>{message.senderName || "Monitor"}</Typography>}
              {quoted && <ButtonBase onClick={() => jumpToMessage(quoted.id)} aria-label={`Ir al mensaje citado de ${quoted.senderName}`} sx={{ display: "grid", width: "100%", textAlign: "left", justifyItems: "start", p: .6, mb: .45, borderLeft: "3px solid", borderColor: "primary.main", borderRadius: 1, bgcolor: "background.default", overflow: "hidden" }}><Typography variant="caption" color="primary.main" fontWeight={700}>{quoted.senderName}</Typography><Typography variant="caption" color="text.secondary" noWrap sx={{ width: "100%" }}>{textFromMessage(quoted)}</Typography></ButtonBase>}
              {message.deletedAt ? <Typography variant="body2" color="text.secondary" fontStyle="italic">Mensaje eliminado</Typography> : isAlert ? <AlertAttachment message={message} expanded={expandedAlerts.has(message.id)} highlighted={flashMessageId === message.id} register={(element) => { if (element) alertRefs.current.set(message.id, element); else alertRefs.current.delete(message.id); }} onToggle={() => toggleSet(setExpandedAlerts, message.id)} onCopyIdentifier={(value) => void copyText(value, `OT ${value} copiada`)}/> : isAttachment ? renderAttachment(message) : <Typography variant="body2" component="span" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{message.body}</Typography>}
              <Stack direction="row" justifyContent="flex-end" alignItems="center" gap={.5} sx={{ mt: .2 }}>
                {pinnedMessages.has(message.id) && <PushPinRounded aria-label="Mensaje fijado" sx={{ fontSize: 12, color: "text.secondary" }}/>}
                <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>{message.editedAt ? "Editado · " : ""}{time(message.sentAt)}{outgoing ? message.readCount > 0 ? " · ✓✓" : message.deliveredCount > 0 ? " · ✓✓" : " · ✓" : ""}</Typography>
              </Stack>
            </Paper>
            {(reactions[message.id]?.length ?? 0) > 0 && <Stack direction="row" gap={.25} sx={{ mt: -.25, px: .5, justifyContent: outgoing ? "flex-end" : "flex-start" }}>{reactions[message.id]!.map((reaction) => <Chip key={reaction} size="small" label={reaction} sx={{ minWidth: 28, "& .MuiChip-label": { px: .5 } }}/>)}</Stack>}
          </Box>;
        })}
        {pending.map((message) => <Box key={message.id} sx={{ alignSelf: "flex-end", maxWidth: "82%" }}><Paper variant="outlined" sx={{ p: .75, borderRadius: 1.75, bgcolor: "action.selected", opacity: .72 }}><Typography variant="body2">{message.body || "Adjunto"}</Typography><Typography variant="caption" color="text.secondary">Pendiente</Typography></Paper></Box>)}
        {state === "ready" && visibleMessages.length === 0 && <Box sx={{ py: 6, textAlign: "center" }}><Typography fontWeight={700}>No hay mensajes con este término</Typography><Typography variant="body2" color="text.secondary">Prueba otra búsqueda.</Typography></Box>}
      </Stack>
    </Box>

    <Menu anchorEl={messageMenuAnchor} open={Boolean(messageMenuAnchor)} onClose={closeDesktopMenu}>
      {selectedMessage ? [
        <MenuItem key="reply" onClick={() => runAction("reply", selectedMessage)}><ListItemIcon><ReplyRounded fontSize="small"/></ListItemIcon>Responder</MenuItem>,
        <MenuItem key="react" onClick={() => runAction("react", selectedMessage, messageMenuAnchor)}><ListItemIcon><AddReactionRounded fontSize="small"/></ListItemIcon>Reaccionar</MenuItem>,
        <MenuItem key="highlight" onClick={() => runAction("highlight", selectedMessage)}><ListItemIcon><StarBorderRounded fontSize="small"/></ListItemIcon>{highlighted.has(selectedMessage.id) ? "Quitar destacado" : "Destacar"}</MenuItem>,
        <MenuItem key="pin" onClick={() => runAction("pin", selectedMessage)}><ListItemIcon><PushPinRounded fontSize="small"/></ListItemIcon>{pinnedMessages.has(selectedMessage.id) ? "Desfijar" : "Fijar"}</MenuItem>,
        <MenuItem key="forward" onClick={() => runAction("forward", selectedMessage)}><ListItemIcon><ForwardRounded fontSize="small"/></ListItemIcon>Reenviar</MenuItem>,
        <MenuItem key="copy" onClick={() => runAction("copy", selectedMessage)}><ListItemIcon><ContentCopyRounded fontSize="small"/></ListItemIcon>Copiar</MenuItem>,
        <Divider key="details-divider"/>,
        <MenuItem key="details" onClick={() => runAction(selectedMessage.kind === "alert" ? "details" : "info", selectedMessage)}><ListItemIcon>{selectedMessage.kind === "alert" ? <FactCheckOutlined fontSize="small"/> : <InfoOutlined fontSize="small"/>}</ListItemIcon>{selectedMessage.kind === "alert" ? "Ver detalles de alerta" : "Información del mensaje"}</MenuItem>,
        <MenuItem key="select" onClick={() => runAction("select", selectedMessage)}><ListItemIcon><CheckCircleOutlineRounded fontSize="small"/></ListItemIcon>Seleccionar mensajes</MenuItem>,
        ...(editAllowed(selectedMessage) || deleteAllowed(selectedMessage) ? [<Divider key="mutable-divider"/>] : []),
        ...(editAllowed(selectedMessage) ? [<MenuItem key="edit" onClick={() => runAction("edit", selectedMessage)}><ListItemIcon><EditRounded fontSize="small"/></ListItemIcon>Editar</MenuItem>] : []),
        ...(deleteAllowed(selectedMessage) ? [<MenuItem key="delete" onClick={() => runAction("delete", selectedMessage)} sx={{ color: "error.main" }}><ListItemIcon><DeleteOutlineRounded color="error" fontSize="small"/></ListItemIcon>Eliminar para todos</MenuItem>] : []),
      ] : []}
    </Menu>
    <Menu anchorEl={reactionAnchor} open={Boolean(reactionAnchor)} onClose={() => setReactionAnchor(null)}>
      <Stack direction="row" px={.5}>{reactionMessage && QUICK_REACTIONS.map((reaction) => <Tooltip key={reaction} title={`Reaccionar con ${reaction}`}><IconButton onClick={() => addReaction(reactionMessage, reaction)} sx={{ width: 40, height: 40, fontSize: 20 }}>{reaction}</IconButton></Tooltip>)}</Stack>
    </Menu>

    <Dialog open={Boolean(mobileActionMessage)} onClose={() => setMobileActionMessage(null)} fullWidth sx={{ "& .MuiDialog-container": { alignItems: "flex-end" } }} slotProps={{ paper: { sx: { m: 1.5, width: "min(calc(100% - 24px), 420px)", borderRadius: 2 } } }}>
      {mobileActionMessage && <>
        <DialogContent sx={{ p: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={.25}>{QUICK_REACTIONS.map((reaction) => <IconButton key={reaction} aria-label={`Reaccionar con ${reaction}`} onClick={() => addReaction(mobileActionMessage, reaction)} sx={{ width: 42, height: 42, fontSize: 22 }}>{reaction}</IconButton>)}<IconButton aria-label="Más reacciones" onClick={() => showToast("Más reacciones")} sx={{ width: 42, height: 42 }}><AddReactionRounded/></IconButton></Stack>
          <Divider sx={{ my: .5 }}/>
          {([ ["reply", "Responder", <ReplyRounded/>], ["forward", "Reenviar", <ForwardRounded/>], ["copy", "Copiar", <ContentCopyRounded/>], [mobileActionMessage.kind === "alert" ? "details" : "info", mobileActionMessage.kind === "alert" ? "Detalles de alerta" : "Información", <InfoOutlined/>] ] as const).map(([action, label, icon]) => <MenuItem key={action} onClick={() => runAction(action, mobileActionMessage)}><ListItemIcon>{icon}</ListItemIcon>{label}</MenuItem>)}
          {!mobileMore && <MenuItem onClick={() => setMobileMore(true)}><ListItemIcon><MoreHorizRounded/></ListItemIcon>Más…</MenuItem>}
          {mobileMore && <>{([ ["highlight", highlighted.has(mobileActionMessage.id) ? "Quitar destacado" : "Destacar", <StarBorderRounded/>], ["pin", pinnedMessages.has(mobileActionMessage.id) ? "Desfijar" : "Fijar", <PushPinRounded/>], ["select", "Seleccionar mensajes", <CheckCircleOutlineRounded/>] ] as const).map(([action, label, icon]) => <MenuItem key={action} onClick={() => runAction(action, mobileActionMessage)}><ListItemIcon>{icon}</ListItemIcon>{label}</MenuItem>)}</>}
        </DialogContent>
      </>}
    </Dialog>

    <Dialog open={Boolean(forwardMessage)} onClose={() => setForwardMessage(null)} fullWidth maxWidth="xs">
      <DialogTitle>Reenviar mensaje</DialogTitle>
      <DialogContent><Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>{forwardMessage ? textFromMessage(forwardMessage) : ""}</Typography><Stack gap={.5}>{["Jorge A.", "Almacén · Turno día", "Ana M."].map((recipient) => <Button key={recipient} variant="outlined" onClick={() => { setForwardMessage(null); showToast(`Mensaje reenviado a ${recipient}`); }}>{recipient}</Button>)}</Stack></DialogContent>
      <DialogActions><Button onClick={() => setForwardMessage(null)}>Cancelar</Button></DialogActions>
    </Dialog>

    <Paper component="form" square elevation={0} onSubmit={(event) => { event.preventDefault(); void send(); }} sx={{ flex: "0 0 auto", borderTop: "1px solid", borderColor: "divider", p: .75 }}>
      <Box sx={{ width: "min(100%, 820px)", mx: "auto" }}>
        {typingUsers.length > 0 && <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>Escribiendo…</Typography>}
        {(replyTo || editingMessage) && <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} sx={{ minHeight: 36, px: 1, mb: .5, borderLeft: "3px solid", borderColor: "primary.main", bgcolor: "background.default", borderRadius: 1 }}><Box minWidth={0}><Typography variant="caption" color="primary.main" fontWeight={700}>{editingMessage ? "Editando mensaje" : `Respondiendo a ${replyTo?.senderName}`}</Typography>{replyTo && <Typography variant="caption" color="text.secondary" noWrap display="block">{textFromMessage(replyTo)}</Typography>}</Box><IconButton aria-label={editingMessage ? "Cancelar edición" : "Cancelar respuesta"} onClick={() => { setEditingMessage(null); setReplyTo(null); if (editingMessage) setDraft(""); }} sx={{ width: 36, height: 36 }}><CloseRounded sx={{ fontSize: 17 }}/></IconButton></Stack>}
        {attachment && <Stack direction="row" alignItems="center" gap={1} sx={{ minHeight: 50, p: .5, mb: .5, bgcolor: "background.default", borderRadius: 1 }}>
          {attachment.dataUrl ? <Box component="img" src={attachment.dataUrl} alt="Vista previa del adjunto" sx={{ width: 42, height: 42, objectFit: "cover", borderRadius: 1 }}/> : <InsertDriveFileRounded color="primary"/>}
          <Box minWidth={0} flex={1}><Typography variant="caption" fontWeight={700} noWrap display="block">{attachment.name}</Typography><Typography variant="caption" color="text.secondary">{bytes(attachment.size)}{attachment.mockOnly ? " · presentación local" : ""}</Typography></Box>
          <IconButton aria-label="Quitar adjunto" onClick={() => setAttachment(null)} sx={{ width: 36, height: 36 }}><CloseRounded sx={{ fontSize: 17 }}/></IconButton>
        </Stack>}
        <Stack direction="row" gap={.5} alignItems="center">
          <Tooltip title="Adjuntar imagen"><IconButton component="label" aria-label="Adjuntar imagen de la galería" disabled={readOnly || Boolean(editingMessage)} sx={{ width: 44, height: 44 }}><ImageRounded/><input hidden type="file" accept="image/*" onChange={(event) => { selectImage(event.target.files?.[0]); event.currentTarget.value = ""; }}/></IconButton></Tooltip>
          <Tooltip title="Tomar foto"><IconButton component="label" aria-label="Tomar o adjuntar foto" disabled={readOnly || Boolean(editingMessage)} sx={{ width: 44, height: 44 }}><PhotoCameraRounded/><input hidden type="file" accept="image/*" capture="environment" onChange={(event) => { selectImage(event.target.files?.[0]); event.currentTarget.value = ""; }}/></IconButton></Tooltip>
          <Tooltip title="Adjuntar archivo"><IconButton component="label" aria-label="Adjuntar archivo del dispositivo" disabled={readOnly || Boolean(editingMessage)} sx={{ width: 44, height: 44 }}><AttachFileRounded/><input hidden type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" onChange={(event) => { selectFile(event.target.files?.[0]); event.currentTarget.value = ""; }}/></IconButton></Tooltip>
          <TextField inputRef={composerInputRef} fullWidth size="small" value={draft} onChange={(event) => { setDraft(event.target.value); if (!mockConversation) socket.emit("typing", { conversationId, active: Boolean(event.target.value) }); }} placeholder={readOnly ? "Conversación cerrada" : editingMessage ? "Editar mensaje" : attachment ? "Añadir comentario" : "Escribir mensaje"} disabled={readOnly} inputProps={{ "aria-label": "Escribir mensaje" }}/>
          <IconButton type="submit" color="primary" disabled={readOnly || (!draft.trim() && !attachment) || sending} aria-label={editingMessage ? "Guardar edición" : "Enviar mensaje"} sx={{ width: 44, height: 44 }}><SendRounded/></IconButton>
        </Stack>
      </Box>
    </Paper>
    <Snackbar open={Boolean(toast)} autoHideDuration={2200} onClose={() => setToast("")} message={toast} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}/>
  </Box>;
}
