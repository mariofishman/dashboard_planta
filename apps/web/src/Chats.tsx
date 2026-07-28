import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import ChatBubbleRounded from "@mui/icons-material/ChatBubbleRounded";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import SendRounded from "@mui/icons-material/SendRounded";
import AttachFileRounded from "@mui/icons-material/AttachFileRounded";
import MoreVertRounded from "@mui/icons-material/MoreVertRounded";
import { monitorSemanticTokens as ui } from "@monitor/design-system";
import { Alert, AppBar, Box, Button, ButtonBase, Chip, CircularProgress, Divider, IconButton, InputAdornment, Menu, MenuItem, Paper, Stack, TextField, Toolbar, Typography } from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { SessionResponse } from "@monitor/contracts";
import { conversationMessages, conversations, deleteConversationMessage, editConversationMessage, markConversationRead, sendConversationMessage, type ConversationMessage, type ConversationSummary } from "./api";

function go(path: string) { window.location.href = path; }
function time(value: string) { return new Intl.DateTimeFormat("es-PE", { hour: "numeric", minute: "2-digit" }).format(new Date(value)); }

function PrimaryNav({ chats = false }: { chats?: boolean }) {
  const item = (active: boolean) => ({ minWidth: { xs: 136, sm: 168 }, height: 60, fontWeight: active ? 700 : 500, position: "relative", ...(active ? { "&::before": { content: "''", position: "absolute", top: 0, left: 20, right: 20, height: 3, bgcolor: "primary.main", borderRadius: "0 0 4px 4px" } } : {}) });
  return <Paper component="nav" square elevation={0} aria-label="Navegación principal" sx={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 60, zIndex: 20, display: "flex", justifyContent: "center", gap: { xs: .5, sm: 3 }, borderTop: "1px solid", borderColor: "divider" }}>
    <Button startIcon={<DashboardRounded/>} onClick={() => go("/")} sx={item(!chats)} aria-current={!chats ? "page" : undefined}>Dashboard</Button>
    <Button startIcon={<ChatBubbleRounded/>} onClick={() => go("/chats")} sx={item(chats)} aria-current={chats ? "page" : undefined}>Chats</Button>
  </Paper>;
}

export function ChatList({ session }: { session: SessionResponse }) {
  const [rows, setRows] = useState<ConversationSummary[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const canViewAll = session.principal.scopes.includes("monitor:admin");
  const refresh = useCallback(() => void conversations(search, undefined, scope).then((result) => { setRows(result.conversations); setNextCursor(result.nextCursor); setState("ready"); }).catch(() => setState("error")), [scope, search]);
  useEffect(refresh, [refresh]);
  useEffect(() => {
    const socket: Socket = io({ withCredentials: true });
    socket.on("message.created", refresh); socket.on("message.updated", refresh); socket.on("receipt.updated", refresh);
    return () => { socket.disconnect(); };
  }, [refresh]);
  const visible = useMemo(() => filter === "unread" ? rows.filter((row) => Number(row.unreadCount) > 0) : rows, [filter, rows]);
  return <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: "68px" }}>
    <AppBar position="sticky" color="secondary" elevation={0}><Toolbar sx={{ minHeight: "52px !important", gap: 2 }}><Box flex={1}><Typography variant="h2" color="inherit">Chats</Typography><Typography variant="caption" sx={{ color: ui.color.textInverseMuted }}>{session.principal.displayName}</Typography></Box></Toolbar></AppBar>
    <Box component="main" sx={{ width: "min(100%, 760px)", mx: "auto", p: { xs: 1, sm: 1.5 } }}>
      <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: "hidden" }}>
        <Box sx={{ p: 1 }}><TextField fullWidth size="small" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar grupo, persona, máquina, OT o alerta" slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded sx={{ fontSize: 18 }}/></InputAdornment> } }}/>
          {canViewAll && <Stack direction="row" gap={.5} alignItems="center" sx={{ mt: 1 }}><Typography variant="caption" color="text.secondary" sx={{ mr: .25 }}>Vista</Typography><Chip label="Mis conversaciones" clickable color={scope === "mine" ? "primary" : "default"} variant={scope === "mine" ? "filled" : "outlined"} onClick={() => { setScope("mine"); setFilter("all"); }}/><Chip label="Todas las conversaciones" clickable color={scope === "all" ? "primary" : "default"} variant={scope === "all" ? "filled" : "outlined"} onClick={() => { setScope("all"); setFilter("all"); }}/></Stack>}
          <Stack direction="row" gap={.5} sx={{ mt: 1 }}><Chip label={`Todas ${rows.length}`} clickable color={filter === "all" ? "primary" : "default"} variant={filter === "all" ? "filled" : "outlined"} onClick={() => setFilter("all")}/><Chip label={`No leídas ${rows.filter((row) => Number(row.unreadCount) > 0).length}`} clickable color={filter === "unread" ? "primary" : "default"} variant={filter === "unread" ? "filled" : "outlined"} onClick={() => setFilter("unread")}/></Stack>
        </Box><Divider/>
        {state === "loading" && <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={24}/></Stack>}
        {state === "error" && <Alert severity="error">No se pudieron cargar las conversaciones.</Alert>}
        {state === "ready" && visible.length === 0 && <Box sx={{ py: 7, px: 2, textAlign: "center" }}><Typography fontWeight={700}>No hay conversaciones</Typography><Typography variant="body2" color="text.secondary">Monitor creará una cuando un incidente tenga destinatarios válidos.</Typography></Box>}
        <Stack divider={<Divider flexItem/>}>{visible.map((row) => <ButtonBase key={row.id} onClick={() => go(`/chats/${row.id}`)} sx={{ width: "100%", px: 1.5, py: 1.25, textAlign: "left", alignItems: "stretch", gap: 1, "&:hover": { bgcolor: "action.hover" }, "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -2 } }}>
          <Box sx={{ minWidth: 0, flex: 1 }}><Stack direction="row" gap={.75} alignItems="center">
            <Typography variant="body2" fontWeight={700} noWrap>{row.title}</Typography>
            {Number(row.unreadCount) > 0 && <Box aria-hidden sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "primary.main" }}/>} 
            {scope === "all" && !row.isParticipant && <Chip size="small" label="Acceso admin" variant="outlined" />}
          </Stack>
            <Typography variant="caption" color="text.secondary" noWrap><b>{row.lastSender || "Monitor"}:</b> {row.lastKind === "alert" ? "Nueva alerta operativa" : row.lastBody}</Typography>
            <Stack direction="row" gap={.5} sx={{ mt: .5 }}>{Number(row.openAlerts) > 0 && <Chip size="small" label={`${row.openAlerts} ${Number(row.openAlerts) === 1 ? "alerta abierta" : "alertas abiertas"}`} variant="outlined" color="error"/>}</Stack>
          </Box><Stack alignItems="flex-end" gap={.75}><Typography variant="caption" color="text.secondary">{time(row.updatedAt)}</Typography>{Number(row.unreadCount) > 0 && <Box aria-label={`${row.unreadCount} mensajes no leídos`} sx={{ minWidth: 20, height: 20, px: .5, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: "primary.main", color: "white", fontSize: ui.typography.routine, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{row.unreadCount}</Box>}</Stack>
        </ButtonBase>)}</Stack>
        {nextCursor && filter === "all" && <Box sx={{ p: 1, textAlign: "center" }}><Button size="small" onClick={() => void conversations(search, nextCursor, scope).then((result) => { setRows((current) => [...current, ...result.conversations]); setNextCursor(result.nextCursor); })}>Cargar conversaciones anteriores</Button></Box>}
      </Paper>
    </Box><PrimaryNav chats/>
  </Box>;
}

export function ChatDetail({ session, conversationId }: { session: SessionResponse; conversationId: string }) {
  const queueKey = `monitor.pending.${session.principal.sysUserId}.${conversationId}`;
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  type PendingMessage = { id: string; body: string; payload?: Record<string, unknown> };
  const [pending, setPending] = useState<PendingMessage[]>(() => JSON.parse(localStorage.getItem(queueKey) ?? "[]") as PendingMessage[]);
  const [draft, setDraft] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [sending, setSending] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [nextMessageCursor, setNextMessageCursor] = useState<number | null>(null);
  const [typingUsers, setTypingUsers] = useState<number[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);
  const [attachment, setAttachment] = useState<Record<string, unknown> | null>(null);
  const [messageMenuAnchor, setMessageMenuAnchor] = useState<HTMLElement | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ConversationMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ConversationMessage | null>(null);
  const socket = useMemo(() => io({ withCredentials: true, autoConnect: false }), []);
  const refresh = useCallback(() => void conversationMessages(conversationId).then(async (result) => { setMessages(result.messages); setNextMessageCursor(result.nextCursor); setReadOnly(Boolean(result.writableUntil && Date.parse(result.writableUntil) <= Date.now())); setState("ready"); const latest = result.messages.at(-1)?.cursor; if (latest) await markConversationRead(conversationId, latest); }).catch(() => setState("error")), [conversationId]);
  useEffect(refresh, [refresh]);
  const flushPending = useCallback(async (items: PendingMessage[]) => {
    let remaining = [...items];
    for (const item of items) {
      try { await sendConversationMessage(conversationId, item.body, item.id, null, item.payload); remaining = remaining.filter((pendingItem) => pendingItem.id !== item.id); localStorage.setItem(queueKey, JSON.stringify(remaining)); setPending(remaining); }
      catch { break; }
    }
    if (remaining.length === 0) refresh();
  }, [conversationId, queueKey, refresh]);
  useEffect(() => {
    socket.on("connect", () => { void flushPending(JSON.parse(localStorage.getItem(queueKey) ?? "[]") as PendingMessage[]); });
    socket.on("message.created", refresh); socket.on("message.updated", refresh);
    socket.on("typing", (event: { conversationId: string; sysUserId: number; active: boolean }) => { if (event.conversationId === conversationId) setTypingUsers((current) => event.active ? [...new Set([...current, event.sysUserId])] : current.filter((id) => id !== event.sysUserId)); });
    socket.on("presence", (event: { conversationId: string; sysUserId: number; online: boolean }) => { if (event.conversationId === conversationId) setOnlineUsers((current) => event.online ? [...new Set([...current, event.sysUserId])] : current.filter((id) => id !== event.sysUserId)); });
    socket.connect();
    const online = () => void flushPending(JSON.parse(localStorage.getItem(queueKey) ?? "[]") as PendingMessage[]);
    window.addEventListener("online", online);
    return () => { window.removeEventListener("online", online); socket.disconnect(); };
  }, [conversationId, flushPending, queueKey, refresh, socket]);
  const send = async () => {
    if ((!draft.trim() && !attachment) || sending) return;
    if (editingMessage) {
      setSending(true);
      try { await editConversationMessage(editingMessage.id, draft.trim()); setDraft(""); setEditingMessage(null); refresh(); }
      finally { setSending(false); }
      return;
    }
    const next = [...pending, { id: crypto.randomUUID(), body: draft.trim(), ...(attachment ? { payload: { attachment } } : {}) }];
    setPending(next); localStorage.setItem(queueKey, JSON.stringify(next)); setDraft(""); setAttachment(null); setSending(true);
    try { await flushPending(next); } finally { setSending(false); }
  };
  return <Box sx={{ height: "100vh", bgcolor: "background.default", display: "grid", gridTemplateRows: "52px minmax(0,1fr) auto" }}>
    <AppBar position="static" color="secondary" elevation={0}><Toolbar sx={{ minHeight: "52px !important", gap: 1 }}><IconButton color="inherit" aria-label="Volver a chats" onClick={() => go("/chats")}><ArrowBackRounded/></IconButton><Box minWidth={0}><Typography variant="h2" color="inherit" noWrap>Conversación operativa</Typography><Typography variant="caption" sx={{ color: ui.color.textInverseMuted }}>{onlineUsers.length ? `${onlineUsers.length} en línea` : "Historial compartido del incidente"}</Typography></Box></Toolbar></AppBar>
    <Box component="main" sx={{ overflowY: "auto", px: { xs: 1, sm: 2 }, py: 1.5 }}>
      <Stack sx={{ width: "min(100%, 820px)", mx: "auto" }} gap={.75}>
        {state === "loading" && <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress size={24}/></Stack>}
        {state === "error" && <Alert severity="error">No se pudo cargar el historial.</Alert>}
        {nextMessageCursor && <Button size="small" sx={{ alignSelf: "center" }} onClick={() => void conversationMessages(conversationId, nextMessageCursor).then((result) => { setMessages((current) => [...result.messages, ...current]); setNextMessageCursor(result.nextCursor); })}>Cargar mensajes anteriores</Button>}
        {messages.map((message) => { const outgoing = message.senderSysUserId === session.principal.sysUserId; const alert = message.kind === "alert" ? message.payload : null; return <Box key={message.id} sx={{ alignSelf: outgoing ? "flex-end" : "flex-start", width: alert ? "min(100%, 520px)" : "fit-content", maxWidth: "82%" }}>
          <Paper variant="outlined" sx={{ p: 1, pr: outgoing && !message.deletedAt ? 4 : 1, borderRadius: 1.25, bgcolor: outgoing ? "action.selected" : "background.paper", position: "relative" }}>
            {outgoing && !message.deletedAt && <IconButton size="small" aria-label="Acciones del mensaje" onClick={(event) => { setSelectedMessage(message); setMessageMenuAnchor(event.currentTarget); }} sx={{ position: "absolute", top: 1, right: 1, width: 28, height: 28 }}><MoreVertRounded sx={{ fontSize: 16 }}/></IconButton>}
            {!outgoing && <Typography variant="caption" color="primary.main" fontWeight={700}>{message.senderName}</Typography>}
            {message.deletedAt ? <Typography variant="body2" color="text.secondary" fontStyle="italic">Mensaje eliminado</Typography> : alert ? <Box><Stack direction="row" justifyContent="space-between" gap={1}><Chip size="small" label={String(alert.ruleCode ?? "Alerta")} color="error"/><Typography variant="caption" color="text.secondary">Archivo operativo</Typography></Stack><Typography variant="body2" fontWeight={700} sx={{ mt: .75 }}>{String(alert.title ?? "Alerta operativa")}</Typography><Typography variant="caption" color="text.secondary">{String(alert.summary ?? "")}</Typography>{alert.workOrderCode ? <Typography variant="caption" color="primary.main" display="block" sx={{ mt: .5 }}>OT {String(alert.workOrderCode)}</Typography> : null}</Box> : message.kind === "attachment" ? <Box>{typeof (message.payload.attachment as Record<string, unknown> | undefined)?.dataUrl === "string" && <Box component="img" src={String((message.payload.attachment as Record<string, unknown>).dataUrl)} alt={message.body || "Imagen adjunta"} sx={{ display: "block", maxWidth: "100%", maxHeight: 360, borderRadius: 1 }}/>} {message.body && <Typography variant="body2" sx={{ mt: .5 }}>{message.body}</Typography>}</Box> : <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{message.body}</Typography>}
            <Stack direction="row" justifyContent="flex-end" gap={.5} sx={{ mt: .25 }}><Typography variant="caption" color="text.secondary">{message.editedAt ? "Editado · " : ""}{time(message.sentAt)}{outgoing ? message.readCount > 0 ? " · ✓✓" : message.deliveredCount > 0 ? " · ✓✓" : " · ✓" : ""}</Typography></Stack>
          </Paper>
        </Box>; })}
        {pending.map((message) => <Box key={message.id} sx={{ alignSelf: "flex-end", maxWidth: "82%" }}><Paper variant="outlined" sx={{ p: 1, borderRadius: 1.25, bgcolor: "action.selected", opacity: .72 }}><Typography variant="body2">{message.body}</Typography><Typography variant="caption" color="text.secondary">Pendiente</Typography></Paper></Box>)}
      </Stack>
    </Box>
    <Menu anchorEl={messageMenuAnchor} open={Boolean(messageMenuAnchor)} onClose={() => setMessageMenuAnchor(null)}><MenuItem disabled={!selectedMessage || selectedMessage.kind !== "text" || Date.now() - Date.parse(selectedMessage.sentAt) > 15 * 60_000} onClick={() => { if (selectedMessage) { setEditingMessage(selectedMessage); setDraft(selectedMessage.body); } setMessageMenuAnchor(null); }}>Editar</MenuItem><MenuItem disabled={!selectedMessage || Date.now() - Date.parse(selectedMessage.sentAt) > 2 * 24 * 60 * 60_000} onClick={() => { const message = selectedMessage; setMessageMenuAnchor(null); if (message) void deleteConversationMessage(message.id).then(() => refresh()); }} sx={{ color: "error.main" }}>Eliminar para todos</MenuItem></Menu>
    <Paper component="form" square elevation={0} onSubmit={(event) => { event.preventDefault(); void send(); }} sx={{ borderTop: "1px solid", borderColor: "divider", p: 1 }}><Box sx={{ width: "min(100%, 820px)", mx: "auto" }}>{typingUsers.length > 0 && <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>Escribiendo…</Typography>}{editingMessage && <Chip label="Editando mensaje" onDelete={() => { setEditingMessage(null); setDraft(""); }} sx={{ mb: .5 }}/>} {attachment && <Chip label={String(attachment.name)} onDelete={() => setAttachment(null)} sx={{ mb: .5 }}/>}<Stack direction="row" gap={1}><IconButton component="label" aria-label="Adjuntar imagen" disabled={readOnly || Boolean(editingMessage)} sx={{ width: 44, height: 44 }}><AttachFileRounded/><input hidden type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (!file || file.size > 5 * 1024 * 1024) return; const reader = new FileReader(); reader.onload = () => setAttachment({ name: file.name, type: file.type, size: file.size, dataUrl: String(reader.result) }); reader.readAsDataURL(file); }}/></IconButton><TextField fullWidth size="small" value={draft} onChange={(event) => { setDraft(event.target.value); socket.emit("typing", { conversationId, active: Boolean(event.target.value) }); }} placeholder={readOnly ? "Conversación cerrada" : editingMessage ? "Editar mensaje" : attachment ? "Añadir comentario" : "Escribir mensaje"} disabled={readOnly} inputProps={{ "aria-label": "Escribir mensaje" }}/><IconButton type="submit" color="primary" disabled={readOnly || (!draft.trim() && !attachment) || sending} aria-label={editingMessage ? "Guardar edición" : "Enviar mensaje"} sx={{ width: 44, height: 44 }}><SendRounded/></IconButton></Stack></Box></Paper>
  </Box>;
}
