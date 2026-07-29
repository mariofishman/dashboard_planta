import LogoutRounded from "@mui/icons-material/LogoutRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import {
  Alert, AppBar, Box, Button, Chip, CircularProgress, Container, MenuItem, Paper, Stack, TextField, Toolbar, Typography,
} from "@mui/material";
import type { SessionResponse } from "@monitor/contracts";
import { monitorSemanticTokens } from "@monitor/design-system";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { scenarioAction, scenarios, type ScenarioCase, type ScenarioFault, type ScenarioRuleCode, type ScenarioStatus } from "./api";

const ui = monitorSemanticTokens;
const rules: Record<ScenarioRuleCode, { title: string; clean: string; sourceAction: string }> = {
  A02: { title: "Material reservado sin recepción", clean: "El traslado ya fue recibido digitalmente.", sourceAction: "Cambia el traslado reservado entre En tránsito y Recibido." },
  A03: { title: "OT activa sin primer consumo", clean: "La OT activa ya tiene su primer consumo válido.", sourceAction: "Cambia el inicio de la OT y su primer registro de consumo." },
  A05: { title: "Bobina sin pesar o mover", clean: "La bobina está pesada y ya salió de la máquina.", sourceAction: "Cambia el pesaje y el movimiento de la bobina declarada." },
};
const caseLabels: Record<ScenarioCase, string> = {
  clean_baseline: "Condición inicial limpia",
  before_threshold: "Antes del umbral",
  before_threshold_not_weighed: "Antes del umbral: sin pesar",
  before_threshold_still_at_machine: "Antes del umbral: sigue en máquina",
  at_threshold: "Exactamente en el umbral",
  at_threshold_not_weighed: "En el umbral: sin pesar",
  at_threshold_still_at_machine: "En el umbral: sigue en máquina",
  past_threshold: "Condición después del umbral",
  past_threshold_pending_dispatch: "Después del umbral: entrega pendiente",
  past_threshold_at_machine: "Después del umbral: llegó sin recepción digital",
  past_threshold_unknown_arrival: "Después del umbral: ubicación desconocida",
  suppressed_by_a07: "Suprimida por evidencia A07",
  past_threshold_not_weighed: "Después del umbral: sin pesar",
  past_threshold_still_at_machine: "Después del umbral: sigue en máquina",
  past_threshold_both: "Después del umbral: ambos motivos",
  past_threshold_produced: "Después del umbral: bobina producida",
  past_threshold_remnant: "Después del umbral: remanente",
  movement_started: "Movimiento iniciado: corresponde a A02",
};
const faultLabels: Record<ScenarioFault, string> = {
  timeout: "Tiempo agotado",
  source_error: "Error de lectura",
  partial: "Lectura incompleta",
  invalid_schema: "Datos con forma inválida",
};
const reasonLabels: Record<string, string> = {
  not_received: "Sin recepción · not_received",
  no_first_consumption: "Sin primer consumo · no_first_consumption",
  not_weighed: "Sin pesar · not_weighed",
  still_at_machine: "Sigue en máquina · still_at_machine",
};
const lifecycleLabels: Record<string, string> = { open: "Abierta", resolved: "Resuelta", closed_without_resolution: "Cerrada sin resolución" };
const primaryRoleLabels: Record<string, string> = { warehouse_dispatcher: "Despachador o remitente de almacén", machine_operator: "Operador de máquina", process_operator: "Operador de proceso" };
const arrivalLabels: Record<string, string> = { unknown: "Ubicación desconocida", pending_after_dispatch: "Entrega física pendiente", at_machine_missing_receipt: "En máquina, sin recepción digital" };
const reelKindLabels: Record<string, string> = { produced: "Producida", remnant: "Remanente" };
const mismatchLabels: Record<string, string> = {
  incident_lifecycle: "estado del incidente", incident_count: "cantidad de ocurrencias", open_incident_count: "incidentes abiertos",
  routing_decision_missing: "enrutamiento faltante", conversation_link_count: "vínculos de conversación", alert_message_count: "tarjetas de alerta",
};
const actionLabels: Record<string, string> = {
  reset: "Restableció la condición inicial", prepare: "Preparó el caso", correct: "Corrigió el origen", advance_time: "Avanzó el reloj del caso",
  correct_weigh: "Registró el pesaje", correct_move: "Registró la salida de máquina",
  fail_next_poll: "Programó el siguiente fallo", recur: "Volvió a crear la condición después de resolverla",
};

function timestamp(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(value));
}
function delay(value: number | null) { return value === null ? "—" : `${Math.round(value)} ms`; }
function Fact({ label, value }: { label: string; value: string }) {
  return <Box sx={{ minWidth: 0 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="body2" fontWeight={600} sx={{ overflowWrap: "anywhere", fontVariantNumeric: "tabular-nums" }}>{value}</Typography></Box>;
}
function PipelineStage({ title, children }: { title: string; children: ReactNode }) {
  return <Box sx={{ minWidth: 0, px: 1.25, py: 1, borderLeft: { md: "1px solid" }, borderTop: { xs: "1px solid", md: 0 }, borderColor: "divider", "&:first-of-type": { borderLeft: 0, borderTop: 0 } }}>
    <Typography variant="overline" color="text.secondary">{title}</Typography><Stack spacing={.5} sx={{ mt: .25 }}>{children}</Stack>
  </Box>;
}
function sourceFacts(item: ScenarioStatus): Array<[string, string]> {
  const row = item.sourceState.rows[0] ?? {};
  if (item.ruleCode === "A02") return [
    ["Traslado", String(row.materialFlowDetailId ?? "—")], ["Estado", String(row.state ?? "—")], ["Minutos en traslado", String(row.elapsedMinutes ?? "—")], ["Llegada física", arrivalLabels[String(row.physicalArrivalState)] ?? String(row.physicalArrivalState ?? "—")], ["Recepción", row.receivedAt ? timestamp(String(row.receivedAt)) : "No registrada"],
  ];
  if (item.ruleCode === "A03") return [
    ["OT", String(row.workOrderId ?? "—")], ["Activa", row.active ? "Sí" : "No"], ["Minutos activa", String(row.elapsedMinutes ?? "—")], ["Consumos válidos", String(row.consumptionCount ?? "—")], ["Evidencia A07 más fuerte", row.strongerA07 ? "Sí" : "No"],
  ];
  return [
    ["Bobina", String(row.articleSerialId ?? "—")], ["Tipo", reelKindLabels[String(row.reelKind)] ?? String(row.reelKind ?? "—")], ["Minutos declarada", String(row.declaredAgeMinutes ?? "—")], ["Pesada", row.weighed ? "Sí" : "No"], ["Fuera de máquina", row.movedFromMachine ? "Sí" : "No"],
  ];
}

export function ScenarioLab({ session, onLogout }: { session: SessionResponse; onLogout: () => void }) {
  const [items, setItems] = useState<ScenarioStatus[]>([]);
  const [selectedCases, setSelectedCases] = useState<Record<ScenarioRuleCode, ScenarioCase>>({ A02: "clean_baseline", A03: "clean_baseline", A05: "clean_baseline" });
  const [faults, setFaults] = useState<Record<ScenarioRuleCode, ScenarioFault>>({ A02: "partial", A03: "invalid_schema", A05: "source_error" });
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<ScenarioRuleCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectionsInitialized = useRef(false);
  const canAdmin = session.principal.scopes.includes("monitor:admin");

  const refresh = useCallback(async () => {
    if (!canAdmin) return;
    try {
      const next = await scenarios();
      setItems(next);
      if (!selectionsInitialized.current) {
        setSelectedCases((previous) => Object.fromEntries(next.map((item) => [item.ruleCode, item.supportedCases.includes(item.selectedCase as ScenarioCase) ? item.selectedCase : previous[item.ruleCode]])) as Record<ScenarioRuleCode, ScenarioCase>);
        selectionsInitialized.current = true;
      }
      setError(null);
    } catch { setError("No se pudo leer alertas_fake. Comprueba que la API esté en modo desarrollo."); }
    finally { setLoading(false); }
  }, [canAdmin]);

  useEffect(() => { void refresh(); }, [refresh]);

  const run = async (code: ScenarioRuleCode, action: "reset" | "prepare" | "correct" | "weigh" | "move" | "advance-time" | "fail-next-poll" | "poll" | "recur") => {
    setRunning(code); setError(null);
    try {
      const endpoint = action === "weigh" || action === "move" ? "correct" : action;
      const body = action === "prepare" ? { scenario: selectedCases[code] }
        : action === "advance-time" ? { minutes: 1 }
          : action === "fail-next-poll" ? { fault: faults[code] }
            : action === "weigh" || action === "move" ? { correction: action }
              : undefined;
      await scenarioAction(code, endpoint, body); await refresh();
    } catch (caught) {
      const recurrence = caught instanceof Error && caught.message.includes("409");
      setError(recurrence ? "La recurrencia solo puede prepararse después de que un sondeo exitoso haya resuelto la ocurrencia anterior." : "La acción no se completó. El estado de Monitor no se modificó directamente.");
    } finally { setRunning(null); }
  };

  return <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 4 }}>
    <AppBar position="static" elevation={0}><Toolbar variant="dense" sx={{ minHeight: "40px !important", px: { xs: 2, sm: 3 } }}>
      <Typography fontWeight={700}>Monitor</Typography><Typography variant="body2" sx={{ ml: 1, color: ui.color.textInverseMuted }}>alertas_fake</Typography>
      <Box sx={{ flex: 1 }}/><Button color="inherit" size="small" href="/">Dashboard</Button><Button color="inherit" size="small" endIcon={<LogoutRounded fontSize="small"/>} onClick={onLogout}>Cerrar sesión</Button>
    </Toolbar></AppBar>
    <Container component="main" maxWidth="xl" sx={{ py: 2 }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1} sx={{ mb: 1.5 }}>
        <Box><Typography variant="h1">Escenarios A02, A03 y A05</Typography><Typography variant="body2" color="text.secondary">Cambia el origen, ejecuta el sondeo normal y compara el resultado esperado con Monitor.</Typography></Box>
        <Button size="small" startIcon={<RefreshRounded/>} onClick={() => void refresh()} disabled={loading}>Actualizar</Button>
      </Stack>
      <Alert severity="warning" sx={{ mb: 1.5 }}>Solo desarrollo. Actualmente usa tablas fuente sintéticas; la frontera futura conserva este flujo y reemplaza esas tablas por test_database. Nunca modifica incidentes, rutas, conversaciones ni mensajes directamente.</Alert>
      {!canAdmin && <Alert severity="error">Este perfil no puede ejecutar escenarios. Inicia sesión como Gerencia de planta.</Alert>}
      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
      {loading && <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={24}/></Stack>}
      <Stack spacing={1.5}>
        {items.map((item) => {
          const rule = rules[item.ruleCode];
          const actualIncident = item.actualMonitor.latestIncident;
          const disabled = running !== null || !canAdmin;
          const matches = item.comparison.matches;
          return <Paper component="section" variant="outlined" key={item.ruleCode} sx={{ borderRadius: ui.control.radius, overflow: "hidden" }}>
            <Box sx={{ px: 1.5, py: 1, borderBottom: "1px solid", borderColor: "divider", display: "flex", flexWrap: "wrap", alignItems: "center", gap: .75 }}>
              <Typography variant="h2">{item.ruleCode} · {rule.title}</Typography>
              <Chip label={item.sourceState.evaluation.status === "triggered" ? `Origen cumple la regla · ${item.sourceState.evaluation.reasons.map((reason) => reasonLabels[reason] ?? reason).join(" + ")}` : "Origen no cumple la regla"} color={item.sourceState.evaluation.status === "triggered" ? "error" : "success"} size="small" variant="outlined"/>
              <Box sx={{ flex: 1 }}/><Typography variant="caption" color="text.secondary">Condición limpia: {rule.clean}</Typography>
            </Box>

            <Box sx={{ px: 1.5, py: 1, borderBottom: "1px solid", borderColor: "divider", display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(220px, 1fr) auto auto" }, alignItems: "center", gap: 1 }}>
              <TextField select label="Caso fuente" size="small" value={selectedCases[item.ruleCode]} onChange={(event) => setSelectedCases((previous) => ({ ...previous, [item.ruleCode]: event.target.value as ScenarioCase }))} disabled={disabled}>
                {item.supportedCases.map((scenarioCase) => <MenuItem value={scenarioCase} key={scenarioCase}>{caseLabels[scenarioCase]}</MenuItem>)}
              </TextField>
              <Button size="small" variant="contained" onClick={() => void run(item.ruleCode, "prepare")} disabled={disabled}>Preparar caso</Button>
              <Typography variant="caption" color="text.secondary">{rule.sourceAction}</Typography>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.25fr .8fr 1fr 1.35fr 1.35fr" }, borderBottom: "1px solid", borderColor: "divider" }}>
              <PipelineStage title="1 · Estado fuente">{sourceFacts(item).map(([label, value]) => <Fact key={label} label={label} value={value}/>) }<Fact label="Revisión" value={item.sourceRevision}/></PipelineStage>
              <PipelineStage title="2 · Reloj del caso"><Fact label="Hora simulada" value={timestamp(item.scenarioClock.currentAt)}/><Fact label="Última acción" value={actionLabels[item.lastAction] ?? item.lastAction}/><Fact label="Hora de negocio" value={timestamp(item.lastActionAt)}/></PipelineStage>
              <PipelineStage title="3 · Sondeador"><Fact label="Próximo fallo" value={item.pendingFault ? faultLabels[item.pendingFault] : "Ninguno"}/><Fact label="Último resultado" value={item.pollerState.latestPoll ? `${item.pollerState.latestPoll.status}${item.pollerState.latestPoll.errorCode ? ` · ${item.pollerState.latestPoll.errorCode}` : ""}` : "Aún no ejecutado"}/><Fact label="Revisión leída" value={item.pollerState.latestPoll?.sourceRevision ?? "—"}/><Fact label="Finalizó" value={timestamp(item.pollerState.latestPoll?.finishedAt)}/></PipelineStage>
              <PipelineStage title="4 · Resultado esperado"><Fact label="Próximo sondeo" value={item.expectedResult.nextPoll}/><Fact label="Incidente" value={item.expectedResult.incidentLifecycle ? `${lifecycleLabels[item.expectedResult.incidentLifecycle] ?? item.expectedResult.incidentLifecycle} · ocurrencia ${item.expectedResult.occurrence ?? "—"}` : "Ninguno"}/><Fact label="Dashboard" value={item.expectedResult.dashboard}/><Fact label="Conversación" value={item.expectedResult.conversation}/></PipelineStage>
              <PipelineStage title="5 · Monitor real"><Stack direction="row" gap={.5} alignItems="center"><Chip size="small" variant="outlined" color={matches ? "success" : "warning"} label={matches ? "Coincide" : item.expectedResult.awaitingPoll ? "Sondeo pendiente" : "Diferente"}/></Stack><Fact label="Incidente" value={actualIncident ? `${lifecycleLabels[actualIncident.lifecycle]} · ocurrencia ${actualIncident.occurrence}` : "Ninguno"}/><Fact label="Historial / abiertas" value={`${item.actualMonitor.incidentCount} / ${item.actualMonitor.openIncidentCount}`}/><Fact label="Evidencias / entregas" value={`${item.actualMonitor.evidenceCount} / ${item.actualMonitor.routingDeliveryCount}`}/><Fact label="Conversaciones / tarjetas" value={`${item.actualMonitor.conversationLinkCount} / ${item.actualMonitor.alertMessageCount}`}/><Fact label="Responsable principal" value={item.actualMonitor.primaryRole ? primaryRoleLabels[item.actualMonitor.primaryRole] ?? item.actualMonitor.primaryRole : "—"}/>{!matches && !item.expectedResult.awaitingPoll && <Fact label="Diferencias" value={item.comparison.mismatches.map((value) => mismatchLabels[value] ?? value).join(", ") || "—"}/>}<Fact label="Demora / cursor" value={`${delay(item.detectionDelayMilliseconds)} / ${item.latestChangeCursor ?? "—"}`}/></PipelineStage>
            </Box>

            <Stack direction={{ xs: "column", lg: "row" }} gap={.75} sx={{ p: 1.25 }} alignItems={{ lg: "center" }}>
              <Button size="small" variant="outlined" onClick={() => void run(item.ruleCode, "reset")} disabled={disabled}>Restablecer condición inicial</Button>
              <Button size="small" variant="outlined" onClick={() => void run(item.ruleCode, "advance-time")} disabled={disabled}>Avanzar reloj 1 min</Button>
              {item.ruleCode === "A05" ? <>
                <Button size="small" variant="outlined" color="success" onClick={() => void run(item.ruleCode, "weigh")} disabled={disabled}>Registrar pesaje</Button>
                <Button size="small" variant="outlined" color="success" onClick={() => void run(item.ruleCode, "move")} disabled={disabled}>Registrar salida de máquina</Button>
              </> : <Button size="small" variant="outlined" color="success" onClick={() => void run(item.ruleCode, "correct")} disabled={disabled}>Corregir registros fuente</Button>}
              <Button size="small" variant="outlined" onClick={() => void run(item.ruleCode, "recur")} disabled={disabled}>Preparar recurrencia</Button>
              <Box sx={{ flex: 1 }}/>
              <TextField select label="Fallo de lectura" size="small" value={faults[item.ruleCode]} onChange={(event) => setFaults((previous) => ({ ...previous, [item.ruleCode]: event.target.value as ScenarioFault }))} disabled={disabled} sx={{ minWidth: 190 }}>
                {(Object.keys(faultLabels) as ScenarioFault[]).map((fault) => <MenuItem value={fault} key={fault}>{faultLabels[fault]}</MenuItem>)}
              </TextField>
              <Button size="small" variant="outlined" color="warning" onClick={() => void run(item.ruleCode, "fail-next-poll")} disabled={disabled}>Programar fallo</Button>
              <Button size="small" variant="contained" onClick={() => void run(item.ruleCode, "poll")} disabled={disabled}>{running === item.ruleCode ? "Sondeando…" : "Sondear ahora"}</Button>
            </Stack>
          </Paper>;
        })}
      </Stack>
    </Container>
  </Box>;
}
