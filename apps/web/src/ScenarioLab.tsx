import LogoutRounded from "@mui/icons-material/LogoutRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import {
  Alert, AppBar, Box, Button, Chip, CircularProgress, Container, MenuItem, Paper, Stack, TextField, Toolbar, Typography,
} from "@mui/material";
import type { SessionResponse } from "@monitor/contracts";
import { monitorSemanticTokens } from "@monitor/design-system";
import { useCallback, useEffect, useState } from "react";
import { scenarioAction, scenarios, type ScenarioFault, type ScenarioRuleCode, type ScenarioStatus } from "./api";

const ui = monitorSemanticTokens;
const labels: Record<ScenarioRuleCode, { title: string; threshold: number }> = {
  A02: { title: "Material reservado en tránsito", threshold: 31 },
  A03: { title: "OT activa sin consumo", threshold: 15 },
  A05: { title: "Manejo de bobina pendiente", threshold: 31 },
};
const faultLabels: Record<ScenarioFault, string> = {
  timeout: "Tiempo agotado",
  source_error: "Error de origen",
  partial: "Resultado incompleto",
  invalid_schema: "Esquema inválido",
};
const lifecycle: Record<string, { label: string; color: "error" | "success" | "warning" }> = {
  open: { label: "Abierta", color: "error" },
  resolved: { label: "Resuelta", color: "success" },
  closed_without_resolution: { label: "Cerrada sin resolución", color: "warning" },
};

function timestamp(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}
function delay(value: number | null) {
  if (value === null) return "—";
  return `${Math.round(value / 1_000)} s`;
}
function Detail({ label, value }: { label: string; value: string }) {
  return <Box sx={{ minWidth: 0 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="body2" fontWeight={600} sx={{ overflowWrap: "anywhere" }}>{value}</Typography></Box>;
}

export function ScenarioLab({ session, onLogout }: { session: SessionResponse; onLogout: () => void }) {
  const [items, setItems] = useState<ScenarioStatus[]>([]);
  const [faults, setFaults] = useState<Record<ScenarioRuleCode, ScenarioFault>>({ A02: "partial", A03: "invalid_schema", A05: "source_error" });
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<ScenarioRuleCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canAdmin = session.principal.scopes.includes("monitor:admin");

  const refresh = useCallback(async () => {
    if (!canAdmin) return;
    try { setItems(await scenarios()); setError(null); }
    catch { setError("No se pudo leer el laboratorio local. Comprueba que la API esté en modo desarrollo."); }
    finally { setLoading(false); }
  }, [canAdmin]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const timer = window.setInterval(() => void refresh(), 1_500);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const run = async (code: ScenarioRuleCode, action: "reset" | "trigger" | "correct" | "advance-time" | "fail-next-poll" | "poll") => {
    setRunning(code); setError(null);
    try {
      const body = action === "advance-time" ? { minutes: labels[code].threshold } : action === "fail-next-poll" ? { fault: faults[code] } : undefined;
      await scenarioAction(code, action, body);
      await refresh();
    } catch { setError("La acción no se completó. El estado de incidentes no se modificó directamente."); }
    finally { setRunning(null); }
  };

  return <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 4 }}>
    <AppBar position="static" elevation={0}><Toolbar variant="dense" sx={{ minHeight: "40px !important", px: { xs: 2, sm: 3 } }}>
      <Typography fontWeight={700}>Monitor</Typography><Typography variant="body2" sx={{ ml: 1, color: "rgba(255,255,255,.72)" }}>Laboratorio local</Typography>
      <Box sx={{ flex: 1 }}/><Button color="inherit" size="small" href="/">Dashboard</Button><Button color="inherit" size="small" endIcon={<LogoutRounded fontSize="small"/>} onClick={onLogout}>Cerrar sesión</Button>
    </Toolbar></AppBar>
    <Container component="main" maxWidth="lg" sx={{ py: 2 }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1} sx={{ mb: 1.5 }}>
        <Box><Typography variant="h1">Escenarios de detección</Typography><Typography variant="body2" color="text.secondary">Prueba la ruta completa: origen local → sondeo → alerta → actualización en pantalla.</Typography></Box>
        <Button size="small" startIcon={<RefreshRounded/>} onClick={() => void refresh()} disabled={loading}>Actualizar</Button>
      </Stack>
      <Alert severity="warning" sx={{ mb: 1.5 }}>Solo desarrollo y pruebas. No modifica EmusaSoft ni está disponible en producción.</Alert>
      {!canAdmin && <Alert severity="error">Este perfil no puede ejecutar escenarios. Inicia sesión como Gerencia de planta.</Alert>}
      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
      {loading && <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={24}/></Stack>}
      <Stack spacing={1}>
        {items.map((item) => {
          const rule = labels[item.ruleCode];
          const current = item.incident ? lifecycle[item.incident.lifecycle] : null;
          const disabled = running !== null || !canAdmin;
          return <Paper component="section" variant="outlined" key={item.ruleCode} sx={{ borderRadius: ui.control.radius, overflow: "hidden" }}>
            <Box sx={{ px: 1.5, py: 1, borderBottom: "1px solid", borderColor: "divider", display: "flex", flexWrap: "wrap", alignItems: "center", gap: .75 }}>
              <Typography variant="h2" sx={{ fontSize: ui.typography.sectionTitle }}>{item.ruleCode} · {rule.title}</Typography>
              {current ? <Chip label={`${current.label} · ocurrencia ${item.incident!.occurrence}`} color={current.color} size="small"/> : <Chip label="Sin alerta" size="small" variant="outlined"/>}
              {item.pendingFault && <Chip label={`Siguiente sondeo: ${faultLabels[item.pendingFault]}`} color="warning" size="small" variant="outlined"/>}
              <Box sx={{ flex: 1 }}/><Typography variant="caption" color="text.secondary">Reloj: {timestamp(item.simulatedAt)}</Typography>
            </Box>
            <Box sx={{ px: 1.5, py: 1, display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5, 1fr)" }, gap: 1, borderBottom: "1px solid", borderColor: "divider" }}>
              <Detail label="Origen" value={`${item.sourceState.rowCount} fila(s) · ${item.sourceRevision}`}/><Detail label="Última acción" value={`${item.lastAction} · ${timestamp(item.lastActionAt)}`}/><Detail label="Último sondeo" value={item.latestPoll ? `${item.latestPoll.status} · ${timestamp(item.latestPoll.finishedAt)}` : "Aún no ejecutado"}/><Detail label="Demora / cursor" value={`${delay(item.detectionDelayMilliseconds)} · ${item.latestChangeCursor ?? "—"}`}/><Detail label="Incidente" value={item.incident ? `${current?.label} · ${timestamp(item.incident.updatedAt)}` : "Aún no creado"}/>
            </Box>
            <Stack direction={{ xs: "column", md: "row" }} gap={.75} sx={{ p: 1.25 }}>
              <Button size="small" variant="outlined" onClick={() => void run(item.ruleCode, "reset")} disabled={disabled}>Restablecer</Button>
              <Button size="small" variant="contained" onClick={() => void run(item.ruleCode, "trigger")} disabled={disabled}>Generar problema</Button>
              <Button size="small" variant="outlined" onClick={() => void run(item.ruleCode, "advance-time")} disabled={disabled}>Avanzar {rule.threshold} min</Button>
              <Button size="small" variant="outlined" color="success" onClick={() => void run(item.ruleCode, "correct")} disabled={disabled}>Corregir origen</Button>
              <TextField select size="small" value={faults[item.ruleCode]} onChange={(event) => setFaults((previous) => ({ ...previous, [item.ruleCode]: event.target.value as ScenarioFault }))} disabled={disabled} sx={{ minWidth: 178 }} aria-label={`Fallo para ${item.ruleCode}`}>
                {(Object.keys(faultLabels) as ScenarioFault[]).map((fault) => <MenuItem value={fault} key={fault}>{faultLabels[fault]}</MenuItem>)}
              </TextField>
              <Button size="small" variant="outlined" color="warning" onClick={() => void run(item.ruleCode, "fail-next-poll")} disabled={disabled}>Fallo siguiente</Button>
              <Box sx={{ flex: 1 }}/><Button size="small" variant="outlined" onClick={() => void run(item.ruleCode, "poll")} disabled={disabled}>{running === item.ruleCode ? "Sondeando…" : "Sondear ahora"}</Button>
            </Stack>
          </Paper>;
        })}
      </Stack>
    </Container>
  </Box>;
}
