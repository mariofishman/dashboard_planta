import CloseRounded from "@mui/icons-material/CloseRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import {
  Alert, AppBar, Box, Button, ButtonBase, Chip, CircularProgress, Container, Divider, Drawer, IconButton, MenuItem, Paper, Stack, TextField, Toolbar, Typography,
} from "@mui/material";
import type { SessionResponse } from "@monitor/contracts";
import { monitorSemanticTokens } from "@monitor/design-system";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ApiRequestError, scenarioAction, scenarioExperiment, scenarioExperiments, scenarioRuntime, scenarioSourceAction, scenarios,
  type A02SourceAuthority, type ScenarioCase, type ScenarioExperiment, type ScenarioExperimentDetail, type ScenarioFault, type ScenarioRuleCode, type ScenarioRuntimeStatus, type ScenarioStatus, type SourceActionId,
} from "./api";

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
const reelKindLabels: Record<string, string> = { produced: "Producida", remnant: "Remanente" };
const mismatchLabels: Record<string, string> = {
  incident_lifecycle: "estado del incidente", incident_count: "cantidad de ocurrencias", open_incident_count: "incidentes abiertos",
  routing_decision_missing: "enrutamiento faltante", conversation_link_count: "vínculos de conversación", alert_message_count: "tarjetas de alerta",
};
const sourceActionErrorLabels: Record<string, string> = {
  movement_terminal: "El traslado seleccionado ya terminó; selecciona otro traslado abierto.",
  work_order_already_started: "La OT seleccionada ya está iniciada.",
  machine_has_active_work_order: "La máquina ya tiene otra OT activa.",
  work_order_not_started: "La OT debe iniciarse antes de ejecutar esta acción.",
  work_order_closed: "La OT seleccionada ya está cerrada.",
  work_order_cancelled: "La OT seleccionada está anulada.",
  consumption_already_recorded: "La OT ya tiene consumo registrado.",
  reel_already_moved: "La bobina seleccionada ya salió de la máquina.",
  duplicate_active_scale_records: "La bobina tiene más de un pesaje activo y requiere corrección de datos.",
  handoff_already_exists: "La entrega de esta bobina a A02 ya existe.",
};
const actionLabels: Record<string, string> = {
  reset: "Restableció la condición inicial", prepare: "Preparó el caso", correct: "Corrigió el origen", advance_time: "Avanzó el reloj del caso",
  correct_weigh: "Registró el pesaje", correct_move: "Registró la salida de máquina",
  fail_next_poll: "Programó el siguiente fallo", recur: "Volvió a crear la condición después de resolverla",
  prepare_dispatch: "Preparó un despacho", receive: "Registró la recepción", cancel: "Anuló el traslado", reject: "Rechazó el traslado",
  start_work_order: "Inició la OT", record_first_consumption: "Registró el primer consumo", close_work_order: "Cerró la OT", cancel_work_order: "Anuló la OT",
  declare_produced_reel: "Declaró una bobina producida", declare_remnant_reel: "Declaró un remanente", register_weighing: "Registró el pesaje",
  register_movement: "Registró la salida de máquina", handoff: "Entregó el traslado a A02",
};
const experimentStatusLabels = { running: "En ejecución", paused: "Pausado", completed: "Finalizado" } as const;
const eventLabels = { poll_started: "Sondeo iniciado", poll_completed: "Sondeo completado", poll_failed: "Lectura fallida", source_action: "Acción fuente" } as const;
const acceptanceLabels = { passed: "Aprobada", failed: "Fallida", not_run: "No ejecutada" } as const;
const sourceActionButtons: Record<ScenarioRuleCode, Array<{ id: SourceActionId; label: string }>> = {
  A02: [
    { id: "a02.prepare_dispatch", label: "Preparar despacho" }, { id: "a02.receive", label: "Recibir" },
    { id: "a02.cancel", label: "Anular" }, { id: "a02.reject", label: "Rechazar" },
  ],
  A03: [
    { id: "a03.start_work_order", label: "Iniciar OT" }, { id: "a03.record_first_consumption", label: "Primer consumo" },
    { id: "a03.close_work_order", label: "Cerrar OT" }, { id: "a03.cancel_work_order", label: "Anular OT" },
  ],
  A05: [
    { id: "a05.declare_produced_reel", label: "Declarar producida" }, { id: "a05.declare_remnant_reel", label: "Declarar remanente" },
    { id: "a05.register_weighing", label: "Registrar pesaje" }, { id: "a05.register_movement", label: "Registrar salida" },
    { id: "a05.close_source_work_order", label: "Cerrar OT fuente" }, { id: "a05.handoff_to_a02", label: "Entregar a A02" },
  ],
};
function isSourceAction(action: string): action is SourceActionId { return action.includes("."); }

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
function naturalKey(item: ScenarioStatus, row: Record<string, unknown>): number {
  return Number(item.ruleCode === "A02" ? row.materialFlowDetailId : item.ruleCode === "A03" ? row.workOrderId : row.articleSerialId);
}
function sourceFacts(item: ScenarioStatus, row: Record<string, unknown>): Array<[string, string]> {
  const scenarioContext = row.scenarioContext && typeof row.scenarioContext === "object" ? row.scenarioContext as Record<string, unknown> : {};
  if (item.ruleCode === "A02") return [
    ["Traslado", String(row.materialFlowDetailId ?? "—")], ["Estado", String(row.state ?? "—")], ["Minutos desde despacho", String(row.elapsedMinutes ?? "—")], ["Destino previsto", String(scenarioContext.machineCode ?? "—")], ["Recepción", row.receivedAt ? timestamp(String(row.receivedAt)) : "No registrada"],
  ];
  if (item.ruleCode === "A03") return [
    ["OT", String(row.workOrderId ?? "—")], ["Activa", row.active ? "Sí" : "No"], ["Minutos activa", String(row.elapsedMinutes ?? "—")], ["Consumos válidos", String(row.consumptionCount ?? "—")],
  ];
  return [
    ["Bobina", String(row.articleSerialId ?? "—")], ["Tipo", reelKindLabels[String(row.reelKind)] ?? String(row.reelKind ?? "—")], ["Minutos declarada", String(row.declaredAgeMinutes ?? "—")], ["Pesada", row.weighed ? "Sí" : "No"], ["Fuera de máquina", row.movedFromMachine ? "Sí" : "No"],
  ];
}

function sourceKey(item: ScenarioStatus, selectedKey?: number): number {
  const keys = item.sourceState.rows.map((row) => naturalKey(item, row));
  const key = selectedKey && keys.includes(selectedKey) ? selectedKey : keys[0];
  if (key === undefined || !Number.isSafeInteger(key) || key < 1) throw new Error("source_key_unavailable");
  return key;
}
function sourceOptionLabel(item: ScenarioStatus, row: Record<string, unknown>): string {
  const key = naturalKey(item, row);
  if (item.ruleCode === "A02") return `${key} · ${String(row.state ?? "Sin estado")}`;
  if (item.ruleCode === "A03") return `${key} · ${row.active ? "Activa" : "Inactiva"}`;
  return `${key} · ${row.weighed ? "Pesada" : "Sin pesar"} · ${row.movedFromMachine ? "Movida" : "En máquina"}`;
}

function ExperimentHistoryDrawer({ open, experiments, selected, loading, hasMore, onClose, onSelect, onLoadMore, onLoadMoreSnapshots, onLoadMoreResults }: {
  open: boolean;
  experiments: ScenarioExperiment[];
  selected: ScenarioExperimentDetail | null;
  loading: boolean;
  hasMore: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onLoadMore: () => void;
  onLoadMoreSnapshots?: () => void;
  onLoadMoreResults?: () => void;
}) {
  const eventSummary = (event: ScenarioExperimentDetail["events"][number]) => {
    const value = event.payload.actionId ?? event.payload.queryId ?? event.payload.status ?? event.payload.error;
    return value ? String(value) : event.ruleCode;
  };
  return <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", md: 760 }, bgcolor: "background.default" } }}>
    <Box sx={{ position: "sticky", top: 0, zIndex: 2, bgcolor: "secondary.main", color: "white", px: 2, py: 1.25 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
        <Box><Typography variant="overline" sx={{ color: ui.color.textInverseMuted }}>Evidencia durable</Typography><Typography variant="h2" color="inherit">Historial de experimentos</Typography></Box>
        <IconButton color="inherit" aria-label="Cerrar historial" onClick={onClose}><CloseRounded/></IconButton>
      </Stack>
    </Box>
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "240px minmax(0,1fr)" }, gridTemplateRows: { xs: "auto minmax(0,1fr)", md: "minmax(0,1fr)" }, minHeight: 0, flex: 1 }}>
      <Box component="nav" aria-label="Experimentos" sx={{ borderRight: { md: "1px solid" }, borderBottom: { xs: "1px solid", md: 0 }, borderColor: "divider", bgcolor: "background.paper", maxHeight: { xs: 200, md: "none" }, overflowY: { xs: "auto", md: "visible" } }}>
        {experiments.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>Aún no hay experimentos guardados.</Typography>}
        <Stack divider={<Divider flexItem/>}>{experiments.map((experiment) => <ButtonBase key={experiment.id} aria-current={selected?.experiment.id === experiment.id ? "true" : undefined} onClick={() => onSelect(experiment.id)} sx={{ display: "block", width: "100%", px: 1.5, py: 1, textAlign: "left", bgcolor: selected?.experiment.id === experiment.id ? "action.selected" : "transparent", "&:hover": { bgcolor: "action.hover" } }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}><Typography variant="body2" fontWeight={700} noWrap>{experiment.name}</Typography><Typography variant="caption" color="text.secondary">{experimentStatusLabels[experiment.status]}</Typography></Stack>
          <Typography variant="caption" color="text.secondary" display="block" noWrap>{timestamp(experiment.businessTime)} · {experiment.runId}</Typography>
        </ButtonBase>)}</Stack>
        {hasMore && <Box sx={{ p: 1 }}><Button fullWidth size="small" onClick={onLoadMore} disabled={loading}>Cargar anteriores</Button></Box>}
      </Box>
      <Box component="section" aria-label="Detalle del experimento" sx={{ minWidth: 0, overflowY: "auto", p: { xs: 1.5, sm: 2 } }}>
        {loading && <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={24} aria-label="Cargando historial"/></Stack>}
        {!loading && !selected && <Typography variant="body2" color="text.secondary">Selecciona un experimento para revisar su evidencia.</Typography>}
        {!loading && selected && <Stack gap={2}>
          <Box><Stack direction="row" alignItems="center" gap={.75} flexWrap="wrap"><Typography variant="h2">{selected.experiment.name}</Typography><Chip size="small" variant="outlined" label={experimentStatusLabels[selected.experiment.status]}/></Stack><Typography variant="caption" color="text.secondary">{selected.experiment.runId}</Typography></Box>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3,minmax(0,1fr))" }, gap: 1.5 }}>
            <Fact label="Hora de negocio" value={timestamp(selected.experiment.businessTime)}/><Fact label="Velocidad" value={`${selected.experiment.speed}×`}/><Fact label="Manifiesto" value={selected.experiment.manifestVersion}/>
            {(["A02", "A03", "A05"] as ScenarioRuleCode[]).map((code) => <Fact key={code} label={`${code} · frecuencia / próximo`} value={`${selected.experiment.frequencies[code]} min · ${timestamp(selected.experiment.nextDue[code])}`}/>) }
          </Box>
          <Divider/>
          <Box><Typography variant="h2">Línea de tiempo</Typography><Typography variant="caption" color="text.secondary">Hora de negocio y hora real de auditoría permanecen separadas.</Typography>
            {selected.events.length === 0 ? <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No hay acciones ni sondeos registrados.</Typography> : <Stack divider={<Divider flexItem/>} sx={{ mt: .75 }}>{selected.events.map((event) => <Stack key={event.id} direction="row" gap={1} sx={{ py: .75 }}>
              <Box aria-hidden sx={{ width: 7, height: 7, mt: .65, borderRadius: "50%", flex: "0 0 auto", bgcolor: event.eventType === "poll_failed" ? "error.main" : event.eventType === "poll_completed" ? "success.main" : "primary.main" }}/>
              <Box minWidth={0}><Typography variant="body2" fontWeight={700}>{eventLabels[event.eventType]} · {event.ruleCode}</Typography><Typography variant="caption" color="text.secondary" display="block" sx={{ overflowWrap: "anywhere" }}>{eventSummary(event)}</Typography><Typography variant="caption" color="text.secondary" display="block">Negocio {timestamp(event.businessTime)} · auditoría {timestamp(event.recordedAt)}</Typography></Box>
            </Stack>)}</Stack>}
          </Box>
          <Divider/>
          <Box><Typography variant="h2">Snapshots</Typography>{selected.snapshots.items.length === 0 ? <Typography variant="body2" color="text.secondary" sx={{ mt: .75 }}>Este experimento no tiene snapshots.</Typography> : <Stack divider={<Divider flexItem/>} sx={{ mt: .5 }}>{selected.snapshots.items.map((snapshot) => <Box component="details" key={snapshot.id} sx={{ py: .75, "& summary": { cursor: "pointer", color: "text.primary", fontSize: ui.typography.primaryData, fontWeight: 700 } }}><Box component="summary">{snapshot.label} · esquema {snapshot.schemaVersion}</Box><Typography variant="caption" color="text.secondary">Negocio {timestamp(snapshot.capturedBusinessTime)} · auditoría {timestamp(snapshot.capturedAt)}</Typography><Box sx={{ mt: .75, display: "grid", gap: .75 }}>{Object.entries(snapshot.payload).map(([section, value]) => <Box key={section}><Typography variant="overline" color="text.secondary">{section}</Typography><Box component="pre" sx={{ m: 0, p: 1, overflow: "auto", bgcolor: "background.default", borderRadius: ui.control.radius, fontSize: ui.typography.routine, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify(value, null, 2)}</Box></Box>)}</Box></Box>)}</Stack>}{selected.snapshots.nextCursor && <Button size="small" onClick={onLoadMoreSnapshots} disabled={loading} sx={{ mt: .75 }}>Cargar snapshots anteriores</Button>}</Box>
          <Divider/>
          <Box><Typography variant="h2">Resultados de aceptación</Typography>{selected.results.items.length === 0 ? <Typography variant="body2" color="text.secondary" sx={{ mt: .75 }}>Este experimento no tiene resultados registrados.</Typography> : <Stack divider={<Divider flexItem/>} sx={{ mt: .5 }}>{selected.results.items.map((result) => <Stack key={result.testId} direction="row" justifyContent="space-between" alignItems="center" gap={1} sx={{ py: .75 }}><Box><Typography variant="body2" fontWeight={700}>{result.testId}</Typography><Typography variant="caption" color="text.secondary">{timestamp(result.completedAt)}</Typography></Box><Chip size="small" variant="outlined" color={result.status === "passed" ? "success" : result.status === "failed" ? "error" : "default"} label={acceptanceLabels[result.status]}/></Stack>)}</Stack>}{selected.results.nextCursor && <Button size="small" onClick={onLoadMoreResults} disabled={loading} sx={{ mt: .75 }}>Cargar resultados anteriores</Button>}</Box>
        </Stack>}
      </Box>
    </Box>
  </Drawer>;
}

export function ScenarioLab({ session, onLogout }: { session: SessionResponse; onLogout: () => void }) {
  const [items, setItems] = useState<ScenarioStatus[]>([]);
  const [runtime, setRuntime] = useState<ScenarioRuntimeStatus | null>(null);
  const [experimentItems, setExperimentItems] = useState<ScenarioExperiment[]>([]);
  const [experimentCursor, setExperimentCursor] = useState<string | null>(null);
  const [selectedExperiment, setSelectedExperiment] = useState<ScenarioExperimentDetail | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedCases, setSelectedCases] = useState<Record<ScenarioRuleCode, ScenarioCase>>({ A02: "clean_baseline", A03: "clean_baseline", A05: "clean_baseline" });
  const [faults, setFaults] = useState<Record<ScenarioRuleCode, ScenarioFault>>({ A02: "partial", A03: "invalid_schema", A05: "source_error" });
  const [a02Authority, setA02Authority] = useState<A02SourceAuthority>("both");
  const [selectedSourceKeys, setSelectedSourceKeys] = useState<Partial<Record<ScenarioRuleCode, number>>>({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<ScenarioRuleCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectionsInitialized = useRef(false);
  const canAdmin = session.principal.scopes.includes("monitor:admin");
  const selectedExperimentId = selectedExperiment?.experiment.id;

  const refresh = useCallback(async () => {
    if (!canAdmin) return;
    try {
      const [next, nextRuntime, history, selectedHistory] = await Promise.all([
        scenarios(), scenarioRuntime(), scenarioExperiments(),
        historyOpen && selectedExperimentId ? scenarioExperiment(selectedExperimentId) : Promise.resolve(null),
      ]);
      setItems(next);
      setRuntime(nextRuntime);
      setExperimentItems(history.items);
      setExperimentCursor(history.nextCursor);
      if (selectedHistory) setSelectedExperiment(selectedHistory);
      setSelectedSourceKeys((previous) => Object.fromEntries(next.map((item) => {
        const available = item.sourceState.rows.map((row) => naturalKey(item, row));
        const selected = previous[item.ruleCode];
        return [item.ruleCode, selected && available.includes(selected) ? selected : available[0]];
      })) as Partial<Record<ScenarioRuleCode, number>>);
      if (!selectionsInitialized.current) {
        setSelectedCases((previous) => Object.fromEntries(next.map((item) => [item.ruleCode, item.supportedCases.includes(item.selectedCase as ScenarioCase) ? item.selectedCase : previous[item.ruleCode]])) as Record<ScenarioRuleCode, ScenarioCase>);
        selectionsInitialized.current = true;
      }
      setError(null);
    } catch { setError("No se pudo leer alertas_fake. Comprueba que la API esté en modo desarrollo."); }
    finally { setLoading(false); }
  }, [canAdmin, historyOpen, selectedExperimentId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const selectExperiment = async (id: string) => {
    setHistoryLoading(true);
    try { setSelectedExperiment(await scenarioExperiment(id)); setError(null); }
    catch { setError("No se pudo leer el historial del experimento."); }
    finally { setHistoryLoading(false); }
  };
  const openHistory = () => {
    setHistoryOpen(true);
    const id = runtime?.experiment?.id ?? experimentItems[0]?.id;
    if (id && selectedExperiment?.experiment.id !== id) void selectExperiment(id);
  };
  const loadMoreExperiments = async () => {
    if (!experimentCursor) return;
    setHistoryLoading(true);
    try {
      const page = await scenarioExperiments(experimentCursor);
      setExperimentItems((current) => [...current, ...page.items]);
      setExperimentCursor(page.nextCursor);
    } catch { setError("No se pudo ampliar el historial de experimentos."); }
    finally { setHistoryLoading(false); }
  };
  const loadMoreExperimentEvidence = async (kind: "snapshots" | "results") => {
    if (!selectedExperiment) return;
    const cursor = kind === "snapshots" ? selectedExperiment.snapshots.nextCursor : selectedExperiment.results.nextCursor;
    if (!cursor) return;
    setHistoryLoading(true);
    try {
      const page = await scenarioExperiment(selectedExperiment.experiment.id, kind === "snapshots" ? { snapshotCursor: cursor } : { resultCursor: cursor });
      setSelectedExperiment((current) => current ? {
        ...page,
        snapshots: kind === "snapshots" ? { items: [...current.snapshots.items, ...page.snapshots.items], nextCursor: page.snapshots.nextCursor } : current.snapshots,
        results: kind === "results" ? { items: [...current.results.items, ...page.results.items], nextCursor: page.results.nextCursor } : current.results,
      } : page);
    } catch { setError("No se pudo ampliar la evidencia del experimento."); }
    finally { setHistoryLoading(false); }
  };

  const run = async (item: ScenarioStatus, action: "reset" | "prepare" | "advance-time" | "fail-next-poll" | "poll" | "recur" | SourceActionId) => {
    const code = item.ruleCode;
    setRunning(code); setError(null);
    try {
      if (isSourceAction(action)) {
        const authority = action === "a02.cancel" || action === "a02.reject" ? a02Authority : undefined;
        const previousKeys = new Set(item.sourceState.rows.map((row) => naturalKey(item, row)));
        const result = await scenarioSourceAction(action, sourceKey(item, selectedSourceKeys[code]), authority);
        const createdKey = result.sourceState.rows.map((row) => naturalKey(result, row)).find((key) => !previousKeys.has(key));
        if (createdKey) setSelectedSourceKeys((previous) => ({ ...previous, [code]: createdKey }));
      } else {
        const body = action === "prepare" ? { scenario: selectedCases[code] }
          : action === "advance-time" ? { minutes: 1 }
            : action === "fail-next-poll" ? { fault: faults[code] }
              : undefined;
        await scenarioAction(code, action, body);
      }
      await refresh();
    } catch (caught) {
      const code = caught instanceof ApiRequestError && caught.body && typeof caught.body === "object" && "error" in caught.body
        ? String((caught.body as { error: unknown }).error) : "";
      setError(code === "recurrence_requires_resolved_incident"
        ? "La recurrencia requiere que un sondeo exitoso haya resuelto la ocurrencia anterior."
        : code === "source_action_rejection_precedence"
          ? "Cuando existen ambos permisos, el rechazo tiene precedencia sobre la anulación."
          : sourceActionErrorLabels[code] ?? (code ? `La acción fuente fue rechazada: ${code}.` : "La acción no se completó. El estado de Monitor no se modificó directamente."));
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
      <Alert severity="warning" sx={{ mb: 1.5 }}>Solo desarrollo. Las acciones fuente cambian únicamente test_database; el sondeador normal de Monitor lee con una cuenta separada de solo lectura. Nunca modifica incidentes, rutas, conversaciones ni mensajes directamente.</Alert>
      <Paper component="section" variant="outlined" aria-labelledby="experiment-runtime-title" sx={{ mb: 1.5, borderRadius: ui.control.radius, px: 1.5, py: 1 }}>
        <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "center" }} gap={1.5}>
          <Box sx={{ minWidth: { md: 180 } }}><Typography id="experiment-runtime-title" variant="overline" color="text.secondary">Experimento activo</Typography><Typography variant="body2" fontWeight={700}>{runtime?.experiment?.name ?? "Sin experimento activo"}</Typography></Box>
          {runtime?.experiment ? <>
            <Chip size="small" variant="outlined" color={runtime.experiment.status === "running" ? "success" : runtime.experiment.status === "paused" ? "warning" : "default"} label={experimentStatusLabels[runtime.experiment.status]}/>
            <Fact label="Hora de negocio compartida" value={timestamp(runtime.experiment.businessTime)}/>
            <Fact label="Velocidad" value={`${runtime.experiment.speed}× · ${runtime.realMillisecondsPerSimulatedMinute ?? "—"} ms/min`}/>
            <Fact label="Próximo avance automático" value={runtime.nextAutomaticTickAt ? timestamp(runtime.nextAutomaticTickAt) : "Detenido"}/>
            <Fact label="Ejecución" value={runtime.experiment.runId}/>
          </> : <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>El historial anterior permanece disponible para consulta.</Typography>}
          <Box sx={{ flex: 1 }}/><Button size="small" variant="outlined" startIcon={<HistoryRounded/>} onClick={openHistory}>Ver historial</Button>
        </Stack>
      </Paper>
      {!canAdmin && <Alert severity="error">Este perfil no puede ejecutar escenarios. Inicia sesión como Gerencia de planta.</Alert>}
      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
      {loading && <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={24}/></Stack>}
      <Stack spacing={1.5}>
        {items.map((item) => {
          const rule = rules[item.ruleCode];
          const actualIncident = item.actualMonitor.latestIncident;
          const disabled = running !== null || !canAdmin;
          const matches = item.comparison.matches;
          const latestPoll = item.pollerState.latestPoll;
          const failedRead = Boolean(latestPoll && (latestPoll.status !== "healthy" || !latestPoll.complete || !latestPoll.fullEvaluation));
          const sourcePending = !latestPoll || latestPoll.sourceRevision !== item.sourceRevision;
          const readFailureSeverity = latestPoll && ["partial", "stale", "unknown_freshness", "overlap_skipped"].includes(latestPoll.status) ? "warning" : "error";
          const selectedKey = sourceKey(item, selectedSourceKeys[item.ruleCode]);
          const selectedRow = item.sourceState.rows.find((row) => naturalKey(item, row) === selectedKey) ?? item.sourceState.rows[0] ?? {};
          return <Paper component="section" variant="outlined" key={item.ruleCode} sx={{ borderRadius: ui.control.radius, overflow: "hidden" }}>
            <Box sx={{ px: 1.5, py: 1, borderBottom: "1px solid", borderColor: "divider", display: "flex", flexWrap: "wrap", alignItems: "center", gap: .75 }}>
              <Typography variant="h2">{item.ruleCode} · {rule.title}</Typography>
              <Chip label={item.sourceState.evaluation.status === "triggered" ? `Origen cumple la regla · ${item.sourceState.evaluation.reasons.map((reason) => reasonLabels[reason] ?? reason).join(" + ")}` : "Origen no cumple la regla"} color={item.sourceState.evaluation.status === "triggered" ? "error" : "success"} size="small" variant="outlined"/>
              <Box sx={{ flex: 1 }}/><Typography variant="caption" color="text.secondary">Condición limpia: {rule.clean}</Typography>
            </Box>

            <Box aria-live="polite" sx={{ px: 1.5, py: .75, borderBottom: "1px solid", borderColor: "divider" }}>
              {failedRead ? <Alert severity={readFailureSeverity} variant="outlined" sx={{ py: 0, "& .MuiAlert-message": { py: .25, minWidth: 0 } }}>
                <Typography variant="body2" fontWeight={700}>Lectura no confiable · Monitor conserva la última verdad confirmada</Typography>
                <Typography variant="caption" color="text.secondary">Resultado {latestPoll!.status}{latestPoll!.errorCode ? ` · ${latestPoll!.errorCode}` : ""}. {sourcePending ? `La revisión ${item.sourceRevision} continúa pendiente.` : "No se aplican cambios de incidente desde esta lectura."}</Typography>
              </Alert> : sourcePending ? <Alert severity="warning" variant="outlined" sx={{ py: 0, "& .MuiAlert-message": { py: .25, minWidth: 0 } }}>
                <Typography variant="body2" fontWeight={700}>Cambio fuente pendiente de sondeo</Typography>
                <Typography variant="caption" color="text.secondary">Origen {item.sourceRevision}; última revisión confiable {latestPoll?.sourceRevision ?? "ninguna"}. Monitor aún no debe reflejar este cambio.</Typography>
              </Alert> : <Stack direction="row" alignItems="center" gap={.75}><Chip size="small" color="success" variant="outlined" label="Lectura confirmada"/><Typography variant="caption" color="text.secondary">Origen y Monitor están sincronizados en {item.sourceRevision}.</Typography></Stack>}
            </Box>

            <Box sx={{ px: 1.5, py: 1, borderBottom: "1px solid", borderColor: "divider", display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(220px, 1fr) auto auto" }, alignItems: "center", gap: 1 }}>
              <TextField select label="Caso fuente" size="small" value={selectedCases[item.ruleCode]} onChange={(event) => setSelectedCases((previous) => ({ ...previous, [item.ruleCode]: event.target.value as ScenarioCase }))} disabled={disabled}>
                {item.supportedCases.map((scenarioCase) => <MenuItem value={scenarioCase} key={scenarioCase}>{caseLabels[scenarioCase]}</MenuItem>)}
              </TextField>
              <Button size="small" variant="contained" onClick={() => void run(item, "prepare")} disabled={disabled}>Preparar caso</Button>
              <Typography variant="caption" color="text.secondary">{rule.sourceAction}</Typography>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.25fr .8fr 1fr 1.35fr 1.35fr" }, borderBottom: "1px solid", borderColor: "divider" }}>
              <PipelineStage title="1 · Estado fuente">{sourceFacts(item, selectedRow).map(([label, value]) => <Fact key={label} label={label} value={value}/>) }<Fact label="Revisión" value={item.sourceRevision}/></PipelineStage>
              <PipelineStage title="2 · Reloj del caso"><Fact label="Hora simulada" value={timestamp(item.scenarioClock.currentAt)}/><Fact label="Última acción" value={actionLabels[item.lastAction] ?? item.lastAction}/><Fact label="Hora de negocio" value={timestamp(item.lastActionAt)}/></PipelineStage>
              <PipelineStage title="3 · Sondeador"><Fact label="Próximo fallo" value={item.pendingFault ? faultLabels[item.pendingFault] : "Ninguno"}/><Fact label="Último resultado" value={item.pollerState.latestPoll ? `${item.pollerState.latestPoll.status}${item.pollerState.latestPoll.errorCode ? ` · ${item.pollerState.latestPoll.errorCode}` : ""}` : "Aún no ejecutado"}/><Fact label="Revisión leída" value={item.pollerState.latestPoll?.sourceRevision ?? "—"}/><Fact label="Finalizó" value={timestamp(item.pollerState.latestPoll?.finishedAt)}/></PipelineStage>
              <PipelineStage title="4 · Resultado esperado"><Fact label="Próximo sondeo" value={item.expectedResult.nextPoll}/><Fact label="Incidente" value={item.expectedResult.incidentLifecycle ? `${lifecycleLabels[item.expectedResult.incidentLifecycle] ?? item.expectedResult.incidentLifecycle} · ocurrencia ${item.expectedResult.occurrence ?? "—"}` : "Ninguno"}/><Fact label="Dashboard" value={item.expectedResult.dashboard}/><Fact label="Conversación" value={item.expectedResult.conversation}/></PipelineStage>
              <PipelineStage title="5 · Monitor real"><Stack direction="row" gap={.5} alignItems="center"><Chip size="small" variant="outlined" color={matches ? "success" : "warning"} label={matches ? "Coincide" : item.expectedResult.awaitingPoll ? "Sondeo pendiente" : "Diferente"}/></Stack><Fact label="Incidente" value={actualIncident ? `${lifecycleLabels[actualIncident.lifecycle]} · ocurrencia ${actualIncident.occurrence}` : "Ninguno"}/><Fact label="Historial / abiertas" value={`${item.actualMonitor.incidentCount} / ${item.actualMonitor.openIncidentCount}`}/><Fact label="Evidencias / entregas" value={`${item.actualMonitor.evidenceCount} / ${item.actualMonitor.routingDeliveryCount}`}/><Fact label="Conversaciones / tarjetas" value={`${item.actualMonitor.conversationLinkCount} / ${item.actualMonitor.alertMessageCount}`}/><Fact label="Responsable principal" value={item.actualMonitor.primaryRole ? primaryRoleLabels[item.actualMonitor.primaryRole] ?? item.actualMonitor.primaryRole : "—"}/>{!matches && !item.expectedResult.awaitingPoll && <Fact label="Diferencias" value={item.comparison.mismatches.map((value) => mismatchLabels[value] ?? value).join(", ") || "—"}/>}<Fact label="Demora / cursor" value={`${delay(item.detectionDelayMilliseconds)} / ${item.latestChangeCursor ?? "—"}`}/></PipelineStage>
            </Box>

            <Stack spacing={1} sx={{ p: 1.25 }}>
              <Box>
                <Typography variant="overline" color="text.secondary">Acciones fuente</Typography>
                <Stack direction="row" useFlexGap flexWrap="wrap" gap={.75} alignItems="center" sx={{ mt: .5 }}>
                  {item.sourceState.rows.length > 1 && <TextField select label="Registro fuente" size="small" value={selectedKey} onChange={(event) => setSelectedSourceKeys((previous) => ({ ...previous, [item.ruleCode]: Number(event.target.value) }))} disabled={disabled} sx={{ minWidth: 180 }}>
                    {item.sourceState.rows.map((row) => { const key = naturalKey(item, row); return <MenuItem value={key} key={key}>{sourceOptionLabel(item, row)}</MenuItem>; })}
                  </TextField>}
                  {item.ruleCode === "A02" && <TextField select label="Autoridad A02" size="small" value={a02Authority} onChange={(event) => setA02Authority(event.target.value as A02SourceAuthority)} disabled={disabled} sx={{ minWidth: 150 }}>
                    <MenuItem value="origin">Origen</MenuItem><MenuItem value="destination">Destino</MenuItem><MenuItem value="both">Ambas</MenuItem>
                  </TextField>}
                  {sourceActionButtons[item.ruleCode].map(({ id, label }) => <Button key={id} size="small" variant="outlined" color="success" onClick={() => void run(item, id)}
                    disabled={disabled || (id === "a02.cancel" && a02Authority !== "origin") || (id === "a02.reject" && a02Authority === "origin")}>{label}</Button>)}
                </Stack>
              </Box>
              <Box sx={{ pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
                <Typography variant="overline" color="text.secondary">Laboratorio y sondeo</Typography>
                <Stack direction="row" useFlexGap flexWrap="wrap" gap={.75} alignItems="center" sx={{ mt: .5 }}>
                  <Button size="small" variant="outlined" onClick={() => void run(item, "reset")} disabled={disabled}>Restablecer condición inicial</Button>
                  <Button size="small" variant="outlined" onClick={() => void run(item, "advance-time")} disabled={disabled}>Avanzar reloj 1 min</Button>
                  <Button size="small" variant="outlined" onClick={() => void run(item, "recur")} disabled={disabled}>Preparar recurrencia</Button>
                  <Box sx={{ flex: 1 }}/>
                  <TextField select label="Fallo de lectura" size="small" value={faults[item.ruleCode]} onChange={(event) => setFaults((previous) => ({ ...previous, [item.ruleCode]: event.target.value as ScenarioFault }))} disabled={disabled} sx={{ minWidth: 190 }}>
                    {(Object.keys(faultLabels) as ScenarioFault[]).map((fault) => <MenuItem value={fault} key={fault}>{faultLabels[fault]}</MenuItem>)}
                  </TextField>
                  <Button size="small" variant="outlined" color="warning" onClick={() => void run(item, "fail-next-poll")} disabled={disabled}>Programar fallo</Button>
                  <Button size="small" variant="contained" onClick={() => void run(item, "poll")} disabled={disabled}>{running === item.ruleCode ? "Sondeando…" : "Sondear ahora"}</Button>
                </Stack>
              </Box>
            </Stack>
          </Paper>;
        })}
      </Stack>
    </Container>
    <ExperimentHistoryDrawer
      open={historyOpen}
      experiments={experimentItems}
      selected={selectedExperiment}
      loading={historyLoading}
      hasMore={Boolean(experimentCursor)}
      onClose={() => setHistoryOpen(false)}
      onSelect={(id) => void selectExperiment(id)}
      onLoadMore={() => void loadMoreExperiments()}
      onLoadMoreSnapshots={() => void loadMoreExperimentEvidence("snapshots")}
      onLoadMoreResults={() => void loadMoreExperimentEvidence("results")}
    />
  </Box>;
}
