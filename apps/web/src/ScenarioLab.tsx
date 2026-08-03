import type { SessionResponse } from "@monitor/contracts";
import { monitorSemanticTokens as ui } from "@monitor/design-system";
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { AlertAttachment } from "./Chats";
import { scenarioAlertMessages, type ScenarioAlertMessageItem, type ScenarioRuleCode } from "./api";

export function ScenarioLab({
  session: _session,
  onLogout: _onLogout,
}: {
  session: SessionResponse;
  onLogout: () => void;
}) {
  return (
    <iframe
      title="Laboratorio de alertas A02, A03 y A05"
      src="/dev/scenarios/alertas-fake-v2-connected.html"
      style={{ display: "block", width: "100%", height: "100vh", border: 0 }}
    />
  );
}

export function ScenarioAlertPreview() {
  const [items, setItems] = useState<ScenarioAlertMessageItem[]>([]);
  const [selection, setSelection] = useState<{ ruleCode: ScenarioRuleCode; sourceKey: number; experimentId?: string } | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [surface, setSurface] = useState<"alerts" | "dashboard">("alerts");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dashboardRef = useRef<HTMLIFrameElement | null>(null);
  const socket = useMemo(() => io({ withCredentials: true, autoConnect: false }), []);
  const refresh = useCallback(() => {
    if (!selection) {
      setItems([]);
      setState("ready");
      return;
    }
    void scenarioAlertMessages(selection)
      .then((result) => { setItems(result.items); setState("ready"); })
      .catch(() => setState("error"));
  }, [selection]);
  useEffect(() => {
    refresh();
    socket.on("message.created", refresh);
    socket.on("message.updated", refresh);
    socket.on("incident.changed", refresh);
    socket.connect();
    return () => { socket.off(); socket.disconnect(); };
  }, [refresh, socket]);
  useEffect(() => {
    const receiveSelection = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const payload = event.data as { type?: unknown; ruleCode?: unknown; sourceKey?: unknown; experimentId?: unknown } | null;
      if (payload?.type !== "monitor-scenario-selection") return;
      const next: { ruleCode: ScenarioRuleCode; sourceKey: number; experimentId?: string } | null = (payload.ruleCode === "A02" || payload.ruleCode === "A03" || payload.ruleCode === "A05")
        && typeof payload.sourceKey === "number" && Number.isSafeInteger(payload.sourceKey)
        ? { ruleCode: payload.ruleCode, sourceKey: payload.sourceKey, ...(typeof payload.experimentId === "string" ? { experimentId: payload.experimentId } : {}) }
        : null;
      setSelection((current) => current?.ruleCode === next?.ruleCode && current?.sourceKey === next?.sourceKey && current?.experimentId === next?.experimentId ? current : next);
    };
    window.addEventListener("message", receiveSelection);
    window.parent.postMessage({ type: "monitor-scenario-preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", receiveSelection);
  }, []);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const publishHeight = () => window.parent.postMessage({
      type: "monitor-scenario-preview-height",
      height: Math.ceil(root.getBoundingClientRect().height),
    }, window.location.origin);
    const observer = new ResizeObserver(publishHeight);
    observer.observe(root);
    publishHeight();
    return () => observer.disconnect();
  }, []);
  const selectedItems = selection
    ? items.filter((item) => item.ruleCode === selection.ruleCode && item.sourceKey === selection.sourceKey)
    : [];
  const toggle = (id: string) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const roleLabel = (role: string) => ({
    factory_manager: "Gerencia de planta",
    operation_shift_supervisor: "Supervisión de turno",
    technical_leader: "Liderazgo técnico",
    machine_operator: "Operación de máquina",
    warehouse_dispatcher: "Despacho de almacén",
    warehouse_supervisor: "Supervisión de almacén",
    process_operator: "Operación de proceso",
    process_supervisor: "Supervisión de proceso",
    recorded_actor: "Responsable registrado",
  })[role] ?? role;
  return <Box ref={rootRef} sx={{ minHeight: 0, bgcolor: "background.default", p: "7px", color: "text.primary", overflow: "hidden" }}>
    <Stack direction="row" alignItems="center" gap={1} sx={{ mb: "4px" }}>
      <Typography component="h1" fontWeight={700} sx={{ fontSize: ui.typography.sectionTitle }}>{surface === "alerts" ? "Alertas enviadas al Chat" : "Dashboard"}</Typography>
      <Typography color="text.secondary" sx={{ fontSize: "9px" }}>Solo lectura · datos de Monitor</Typography>
      {surface === "dashboard" && <Button size="small" aria-label="Filtros avanzados del Dashboard" onClick={() => dashboardRef.current?.contentWindow?.postMessage({ type: "monitor-scenario-dashboard-open-filters" }, window.location.origin)} sx={{ ml: "auto", minHeight: 26, px: 1 }}>Filtros</Button>}
      <Stack direction="row" sx={{ ml: surface === "dashboard" ? 0 : "auto", border: "1px solid", borderColor: "divider", borderRadius: ui.control.radius, overflow: "hidden" }}>
        {(["alerts", "dashboard"] as const).map((option) => <Button key={option} size="small" aria-pressed={surface === option} onClick={() => setSurface(option)} sx={{ minWidth: 68, borderRadius: 0, minHeight: 26, px: 1, bgcolor: surface === option ? "action.selected" : "background.paper" }}>{option === "alerts" ? "Alertas" : "Dashboard"}</Button>)}
      </Stack>
    </Stack>
    {surface === "dashboard" && <Box sx={{ display: "grid", placeItems: "start center", border: "1px solid", borderColor: "divider", borderRadius: ui.control.radius, overflow: "hidden", bgcolor: "background.paper" }}>
      <Box ref={dashboardRef} component="iframe" title="Dashboard de Monitor" src="/dashboard?embed=scenario" sx={{ display: "block", width: "100%", height: 320, border: 0, bgcolor: "background.default" }}/>
    </Box>}
    {surface === "alerts" && <>
      {state === "loading" && <Box sx={{ minHeight: 72, display: "grid", placeItems: "center" }}><CircularProgress size={20}/></Box>}
      {state === "error" && <Alert severity="error">No se pudieron leer los mensajes de Monitor.</Alert>}
      {state === "ready" && selectedItems.length === 0 && <Box sx={{ minHeight: 72, display: "grid", placeItems: "center", border: "1px dashed", borderColor: "divider", borderRadius: ui.control.radius }}><Typography color="text.secondary" sx={{ fontSize: ui.typography.routine }}>{selection ? "Esta transacción no tiene alertas enviadas al Chat." : "Selecciona una transacción en la tabla para ver sus alertas."}</Typography></Box>}
      {state === "ready" && selectedItems.length > 0 && <Stack gap={1} sx={{ overflow: "auto", pb: "3px" }}>
        {selectedItems.map(({ message, lifecycle, recipients = [] }) => <Box key={message.id} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(320px, 440px) minmax(0, 1fr)" }, gap: 1, alignItems: "start" }}>
          <AlertAttachment message={message} lifecycle={lifecycle} expanded={expanded.has(message.id)} highlighted={false} register={() => {}} onToggle={() => toggle(message.id)} onCopyIdentifier={(value) => void navigator.clipboard.writeText(value)}/>
          <Paper variant="outlined" sx={{ mt: .25, borderRadius: ui.control.radius, p: "7px" }}>
            <Typography component="h2" fontWeight={700} sx={{ fontSize: "10px", mb: "5px" }}>Destinatarios</Typography>
            {recipients.length === 0
              ? <Typography color="text.secondary" sx={{ fontSize: "9px" }}>Sin destinatarios resueltos.</Typography>
              : <Stack gap="5px">{recipients.map((recipient) => <Box key={`${recipient.name}:${recipient.role}`} sx={{ minWidth: 0 }}><Typography fontWeight={700} noWrap sx={{ fontSize: "10px" }}>{recipient.name}</Typography><Typography color="text.secondary" noWrap sx={{ fontSize: "9px" }}>{roleLabel(recipient.role)}</Typography></Box>)}</Stack>}
          </Paper>
        </Box>)}
      </Stack>}
    </>}
  </Box>;
}
