import ChatBubbleOutlineRounded from "@mui/icons-material/ChatBubbleOutlineRounded";
import CheckRounded from "@mui/icons-material/CheckRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import FilterListRounded from "@mui/icons-material/FilterListRounded";
import KeyboardArrowRightRounded from "@mui/icons-material/KeyboardArrowRightRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import MenuRounded from "@mui/icons-material/MenuRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import type { SessionResponse } from "@monitor/contracts";
import {
  Alert,
  AppBar,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Drawer,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  currentSession,
  incidentDetail,
  incidents,
  logout,
  mockIdentities,
  mockLogin,
  type IncidentDetail,
  type IncidentLifecycle,
  type IncidentSummary,
  type MockIdentitySummary,
} from "./api";

type LoadState = "loading" | "ready" | "error";

const lifecycleLabel: Record<IncidentLifecycle, string> = {
  open: "Abierta",
  resolved: "Resuelta",
  closed_without_resolution: "Cerrada sin resolución",
};
const lifecycleColor: Record<IncidentLifecycle, "error" | "success" | "warning"> = {
  open: "error",
  resolved: "success",
  closed_without_resolution: "warning",
};
const dimensions = ["Trabajador", "OT", "Máquina", "Operación", "Turno", "Tipo de error"];
const evidenceLabels: Record<string, string> = {
  active: "OT activa",
  articleSerialId: "Serie de artículo",
  consumptionCount: "Consumos declarados",
  declaredAgeMinutes: "Minutos desde la declaración",
  elapsedMinutes: "Minutos transcurridos",
  isWorkOrderReservation: "Reserva vinculada a OT",
  materialFlowDetailId: "Movimiento de material",
  movedFromMachine: "Movimiento desde máquina",
  receivedAt: "Recepción registrada",
  sourceWorkOrderFinished: "OT de origen finalizada",
  state: "Estado del movimiento",
  strongerA07: "Evidencia A07 superior",
  weighed: "Pesaje registrado",
  workOrderId: "Orden de trabajo",
  absentFromCompleteHealthyCycle: "Ausente en lectura completa",
};

function minutesBetween(start: string, end = new Date().toISOString()) {
  return Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 60_000));
}
function duration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1_440) return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  return `${Math.floor(minutes / 1_440)} d`;
}
function dateTime(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
function dateKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function shortDate(key: string) {
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short" }).format(new Date(`${key}T12:00:00`));
}
function readableEvidence(value: unknown) {
  if (value === null || value === undefined) return "Sin registro";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return dateTime(value);
  return String(value);
}

function LoginView({ onLogin }: { onLogin: (session: SessionResponse) => void }) {
  const [identities, setIdentities] = useState<MockIdentitySummary[]>([]);
  const [selected, setSelected] = useState<MockIdentitySummary["identityId"]>("plant-manager");
  const [state, setState] = useState<LoadState>("loading");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void mockIdentities()
      .then((items) => { setIdentities(items); setState("ready"); })
      .catch(() => setState("error"));
  }, []);

  const submit = async () => {
    setSubmitting(true);
    try { onLogin(await mockLogin(selected)); }
    catch { setState("error"); }
    finally { setSubmitting(false); }
  };

  return <Box sx={{ minHeight: "100vh", bgcolor: "background.default", display: "grid", placeItems: "center", p: 3 }}>
    <Paper component="main" variant="outlined" sx={{ width: "min(100%, 520px)", borderRadius: 2, overflow: "hidden" }}>
      <Box sx={{ bgcolor: "secondary.main", color: "white", px: { xs: 3, sm: 4 }, py: 3 }}>
        <Typography variant="overline" sx={{ opacity: .8 }}>Entorno local</Typography>
        <Typography variant="h1" color="inherit">Monitor</Typography>
        <Typography sx={{ color: "rgba(255,255,255,.78)", mt: 1 }}>Acceso de prueba sin conexión a EmusaSoft.</Typography>
      </Box>
      <Box sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography variant="h2">Selecciona un perfil de prueba</Typography>
        {state === "loading" && <Stack direction="row" gap={1.5} alignItems="center" sx={{ py: 4 }}><CircularProgress size={22}/><Typography>Cargando perfiles…</Typography></Stack>}
        {state === "error" && <Alert severity="error" sx={{ my: 2 }}>No se pudo conectar con la API local.</Alert>}
        {state === "ready" && <FormControl fullWidth sx={{ mt: 2 }}>
          <RadioGroup value={selected} onChange={(event) => setSelected(event.target.value as MockIdentitySummary["identityId"])}>
            {identities.map(({ identityId, principal }) => <FormControlLabel key={identityId} value={identityId} control={<Radio/>} label={<Box><Typography fontWeight={600}>{principal.displayName}</Typography><Typography variant="body2" color="text.secondary">{principal.role}</Typography></Box>}/>) }
          </RadioGroup>
        </FormControl>}
        <Button fullWidth variant="contained" disabled={state !== "ready" || submitting} onClick={() => void submit()} sx={{ mt: 3, minHeight: 44 }}>
          {submitting ? "Ingresando…" : "Ingresar a Monitor"}
        </Button>
      </Box>
    </Paper>
  </Box>;
}

function Dashboard({ session, onLogout }: { session: SessionResponse; onLogout: () => void }) {
  const [rows, setRows] = useState<IncidentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [operation, setOperation] = useState("all");
  const [range, setRange] = useState("30");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dimension, setDimension] = useState(0);
  const [detail, setDetail] = useState<IncidentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const detailsRef = useRef<HTMLDivElement | null>(null);
  const socket = useMemo<Socket>(() => io({ withCredentials: true, autoConnect: false }), []);

  const refresh = useCallback(() => {
    setLoading(true);
    void incidents({ search, status, operation })
      .then(setRows)
      .then(() => setFailed(false))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [operation, search, status]);

  useEffect(refresh, [refresh]);
  useEffect(() => {
    socket.on("connect", () => socket.emit("sync.resume", { cursor: Number(localStorage.getItem("monitor.cursor") ?? 0) }));
    socket.on("incident.changed", (change: { cursor: number }) => {
      localStorage.setItem("monitor.cursor", String(change.cursor));
      refresh();
    });
    socket.connect();
    return () => { socket.off("connect"); socket.off("incident.changed"); socket.disconnect(); };
  }, [refresh, socket]);

  const rangeRows = useMemo(() => rows.filter((row) => Date.now() - Date.parse(row.openedAt) <= Number(range) * 86_400_000), [range, rows]);
  const visibleRows = useMemo(() => selectedDate ? rangeRows.filter((row) => dateKey(row.openedAt) === selectedDate) : rangeRows, [rangeRows, selectedDate]);
  const totals = {
    all: visibleRows.length,
    open: visibleRows.filter((row) => row.lifecycle === "open").length,
    resolved: visibleRows.filter((row) => row.lifecycle === "resolved").length,
    closed: visibleRows.filter((row) => row.lifecycle === "closed_without_resolution").length,
  };
  const resolvedMinutes = visibleRows.filter((row) => row.resolvedAt).map((row) => minutesBetween(row.openedAt, row.resolvedAt!));
  const chartPoints = useMemo(() => {
    const points = new Map<string, Record<IncidentLifecycle, number>>();
    for (const row of rangeRows) {
      const key = dateKey(row.openedAt);
      const point = points.get(key) ?? { open: 0, resolved: 0, closed_without_resolution: 0 };
      point[row.lifecycle] += 1;
      points.set(key, point);
    }
    return [...points.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-10);
  }, [rangeRows]);
  const chartMaximum = Math.max(1, ...chartPoints.map(([, point]) => point.open + point.resolved + point.closed_without_resolution));
  const grouped = useMemo(() => {
    const keys = [
      (row: IncidentSummary) => row.responsibleName,
      (row: IncidentSummary) => row.workOrderCode,
      (row: IncidentSummary) => row.machineCode,
      (row: IncidentSummary) => row.operationName,
      (row: IncidentSummary) => row.shiftName,
      (row: IncidentSummary) => `${row.ruleCode} · ${row.title}`,
    ];
    const counts = new Map<string, number>();
    for (const row of visibleRows) {
      const key = keys[dimension]!(row) ?? "Sin asignar";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [dimension, visibleRows]);
  const maxGroup = Math.max(1, ...grouped.map(([, count]) => count));
  const ageLowerBounds = [0, 30, 60, 240];
  const openAges = [30, 60, 240, Infinity].map((limit, index) => visibleRows.filter((row) => row.lifecycle === "open" && minutesBetween(row.openedAt) >= ageLowerBounds[index]! && minutesBetween(row.openedAt) < limit).length);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try { setDetail(await incidentDetail(id)); }
    catch { setFailed(true); }
    finally { setDetailLoading(false); }
  };
  const scrollToDetails = () => detailsRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  const resetFilters = () => { setSearch(""); setStatus("all"); setOperation("all"); setRange("30"); setSelectedDate(null); };
  const preserveViewport = (change: () => void) => {
    const scrollPosition = window.scrollY;
    change();
    window.requestAnimationFrame(() => window.scrollTo({ top: scrollPosition, behavior: "auto" }));
  };
  const selectMetric = (nextStatus: string) => preserveViewport(() => { setStatus(nextStatus); setSelectedDate(null); });
  const selectDate = (key: string) => preserveViewport(() => setSelectedDate(selectedDate === key ? null : key));

  return <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 10 }}>
    <AppBar position="sticky" elevation={0} color="secondary">
      <Toolbar sx={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", minHeight: 64, px: { xs: 1.5, sm: 3 } }}>
        <IconButton color="inherit" aria-label="Abrir aplicaciones de producción" onClick={(event) => setMenuAnchor(event.currentTarget)} sx={{ justifySelf: "start" }}><MenuRounded/></IconButton>
        <Typography fontWeight={700} noWrap>Control de alertas</Typography>
        <Stack direction="row" sx={{ justifySelf: "end" }}>
          <Button color="inherit" startIcon={<DownloadRounded/>} sx={{ display: { xs: "none", sm: "inline-flex" } }} onClick={() => window.print()}>Exportar reporte</Button>
          <Tooltip title={`Cerrar sesión de ${session.principal.displayName}`}><IconButton color="inherit" aria-label="Cerrar sesión" onClick={onLogout}><LogoutRounded/></IconButton></Tooltip>
        </Stack>
      </Toolbar>
    </AppBar>
    <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
      <MenuItem selected>Control de alertas</MenuItem>
      {["Planificación", "Inventario", "Calidad", "Mantenimiento"].map((label) => <MenuItem key={label} disabled>{label}</MenuItem>)}
    </Menu>

    <Container component="main" maxWidth={false} sx={{ maxWidth: 1380, px: { xs: 1.5, sm: 3 }, py: { xs: 2, sm: 3.5 } }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "flex-end" }} gap={1.5} sx={{ mb: 2.5 }}>
        <Box>
          <Typography variant="h1" sx={{ fontSize: { xs: "1.5rem", sm: "1.75rem" }, textWrap: "balance" }}>Resumen de alertas</Typography>
          <Typography color="text.secondary" variant="body2" sx={{ mt: .5 }}>Histórico, recurrencia y estado actual de los errores de planta.</Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">Datos locales de prueba · Actualización automática</Typography>
      </Stack>
      {failed && <Alert severity="error" sx={{ mb: 2 }}>No se pudieron actualizar las alertas. Se conservan los últimos datos disponibles.</Alert>}

      <Paper variant="outlined" sx={{ borderRadius: 2, mb: 2, overflow: "hidden" }}>
        <Stack direction="row" alignItems="center" gap={1} sx={{ px: { xs: 1.25, sm: 1.5 }, py: .75, minHeight: 50 }}>
          <FilterListRounded fontSize="small" color="primary"/>
          <Typography fontWeight={700} variant="body2">Filtros</Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1, display: { xs: "none", sm: "block" } }}>
            {selectedDate ? shortDate(selectedDate) : `Últimos ${range} días`} · {status === "all" ? "Todos los estados" : lifecycleLabel[status as IncidentLifecycle]}
          </Typography>
          <Button size="small" variant="outlined" onClick={resetFilters}>Restablecer</Button>
        </Stack>
        <Divider/>
        <Box sx={{ p: { xs: 1.25, sm: 1.5 }, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))", md: "minmax(230px,1.35fr) repeat(3,minmax(130px,.68fr))" }, gap: { xs: 1, sm: 1.25 }, alignItems: "start" }}>
          <TextField size="small" fullWidth label="Buscar" placeholder="Persona, OT, máquina o error" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ gridColumn: { sm: "1 / -1", md: "auto" } }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small"/></InputAdornment> } }}/>
          <TextField size="small" select fullWidth label="Fechas" value={range} onChange={(event) => { setRange(event.target.value); setSelectedDate(null); }}>
            {[7, 30, 90].map((days) => <MenuItem value={String(days)} key={days}>Últimos {days} días</MenuItem>)}
          </TextField>
          <TextField size="small" select fullWidth label="Operación" value={operation} onChange={(event) => setOperation(event.target.value)}>
            <MenuItem value="all">Todas</MenuItem>{["Impresión", "Extrusión", "Exlam", "Corte", "Sellado"].map((item) => <MenuItem value={item} key={item}>{item}</MenuItem>)}
          </TextField>
          <TextField size="small" select fullWidth label="Estado" value={status} onChange={(event) => setStatus(event.target.value)}>
            <MenuItem value="all">Todos los estados</MenuItem><MenuItem value="open">Abiertas</MenuItem><MenuItem value="resolved">Resueltas</MenuItem><MenuItem value="closed_without_resolution">Cerradas sin resolución</MenuItem>
          </TextField>
        </Box>
      </Paper>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", lg: "minmax(0,1.5fr) minmax(360px,.82fr)" }, gap: 2, minWidth: 0 }}>
        <Paper variant="outlined" sx={{ borderRadius: 2, p: { xs: 1.5, sm: 2 }, minWidth: 0 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1.5}>
            <Box><Typography variant="h2">Alertas por fecha</Typography><Typography variant="caption" color="text.secondary">Selecciona una barra para revisar ese día.</Typography></Box>
            <Stack direction="row" gap={1.5} flexWrap="wrap"><Legend color="#008A49" label="Resueltas"/><Legend color="#E11D48" label="Abiertas"/><Legend color="#F97316" label="Cerradas sin resolución"/></Stack>
          </Stack>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", sm: "repeat(5,minmax(0,1fr))" }, border: "1px solid", borderColor: "divider", borderRadius: 1.5, mt: 1.5, overflow: "hidden" }}>
            <Metric label="Alertas" value={totals.all} supporting={selectedDate ? shortDate(selectedDate) : `${range} días`}/>
            <Metric label="Resueltas" value={totals.resolved} tone="success.main" onClick={() => selectMetric("resolved")}/>
            <Metric label="Abiertas" value={totals.open} tone="error.main" onClick={() => selectMetric("open")}/>
            <Metric label="Sin resolución" value={totals.closed} tone="warning.dark" onClick={() => selectMetric("closed_without_resolution")}/>
            <Metric label="Tiempo medio" value={resolvedMinutes.length ? duration(Math.round(resolvedMinutes.reduce((sum, item) => sum + item, 0) / resolvedMinutes.length)) : "—"}/>
          </Box>
          <Box role="group" aria-label="Alertas por fecha y estado" sx={{ height: { xs: 180, sm: 190 }, display: "flex", alignItems: "end", gap: { xs: .75, sm: 1.25 }, px: { xs: .5, sm: 1.25 }, pt: 2.5, borderBottom: "1px solid", borderColor: "divider" }}>
            {chartPoints.length === 0 && <Typography color="text.secondary" sx={{ alignSelf: "center", mx: "auto" }}>No hay alertas en este período.</Typography>}
            {chartPoints.map(([key, point]) => {
              const total = point.open + point.resolved + point.closed_without_resolution;
              return <Tooltip key={key} title={`${shortDate(key)} · ${total} alertas`} arrow>
                <ButtonBase aria-label={`Filtrar por ${shortDate(key)}: ${total} ${total === 1 ? "alerta" : "alertas"}`} aria-pressed={selectedDate === key} onMouseDown={(event) => event.preventDefault()} onClick={() => selectDate(key)} sx={{ flex: 1, minWidth: 28, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", opacity: selectedDate && selectedDate !== key ? .38 : 1, transition: "opacity 180ms cubic-bezier(.22,1,.36,1)", borderRadius: 1, px: .25, "&[aria-pressed='true']": { bgcolor: "action.selected" } }}>
                  <Typography variant="caption" fontWeight={700} sx={{ pb: .5, fontVariantNumeric: "tabular-nums" }}>{total}</Typography>
                  <Box sx={{ width: "100%", height: `${Math.max(18, total / chartMaximum * 78)}%`, display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden", borderRadius: "6px 6px 0 0" }}>
                    {point.closed_without_resolution > 0 && (
                      <Box sx={{ bgcolor: "warning.main", flex: point.closed_without_resolution }}/>
                    )}
                    {point.open > 0 && (
                      <Box sx={{ bgcolor: "error.main", flex: point.open }}/>
                    )}
                    {point.resolved > 0 && (
                      <Box sx={{ bgcolor: "success.main", flex: point.resolved }}/>
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ py: 1, whiteSpace: "nowrap", fontSize: { xs: ".68rem", sm: ".75rem" } }}>{shortDate(key)}</Typography>
                </ButtonBase>
              </Tooltip>;
            })}
          </Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} sx={{ pt: 1 }}>
            <Typography variant="caption" color="text.secondary">{selectedDate ? `Vista filtrada: ${shortDate(selectedDate)}` : `${chartPoints.length} días con actividad`}</Typography>
            <Button size="small" endIcon={<KeyboardArrowRightRounded/>} onClick={scrollToDetails}>Ver lista de alertas</Button>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ borderRadius: 2, p: { xs: 1.5, sm: 2 }, minWidth: 0 }}>
          <Typography variant="h2">Dónde se concentran</Typography><Typography variant="caption" color="text.secondary">Comparación por dimensión.</Typography>
          <Tabs value={dimension} onChange={(_, value) => setDimension(value)} variant="scrollable" sx={{ mt: 1 }} aria-label="Agrupar alertas por">{dimensions.map((label) => <Tab key={label} label={label}/>)}</Tabs>
          <Stack divider={<Divider flexItem/>} sx={{ mt: 1 }}>
            {grouped.map(([label, count]) => <Box key={label} sx={{ py: 1.5, display: "grid", gridTemplateColumns: "minmax(120px,1fr) minmax(90px,.8fr) 28px", gap: 1.5, alignItems: "center" }}>
              <Typography variant="body2" noWrap fontWeight={600} title={label}>{label}</Typography>
              <Box sx={{ height: 8, borderRadius: 1, bgcolor: "background.default", overflow: "hidden" }}><Box sx={{ height: "100%", width: `${count / maxGroup * 100}%`, bgcolor: "primary.main", borderRadius: 1 }}/></Box>
              <Typography variant="body2" textAlign="right" fontWeight={700}>{count}</Typography>
            </Box>)}
          </Stack>
          {!grouped.length && <Typography color="text.secondary" sx={{ py: 5, textAlign: "center" }}>No hay datos para estos filtros.</Typography>}
        </Paper>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mt: 2 }}>
        <Paper variant="outlined" sx={{ borderRadius: 2, p: { xs: 1.5, sm: 2 } }}>
          <Stack direction="row" justifyContent="space-between" gap={2}><Box><Typography variant="h2">Antigüedad de alertas abiertas</Typography><Typography variant="caption" color="text.secondary">Tiempo transcurrido sin resolución.</Typography></Box><Chip size="small" color="error" variant="outlined" label={`${totals.open} abiertas`}/></Stack>
          <Stack sx={{ mt: 2 }} gap={1.5}>{["Menos de 30 min", "30 min – 1 h", "1 – 4 h", "Más de 4 h"].map((label, index) => <Stack direction="row" alignItems="center" gap={1.5} key={label}><Typography variant="caption" sx={{ width: 104 }}>{label}</Typography><Box sx={{ flex: 1, height: 10, bgcolor: "background.default", borderRadius: 1 }}><Box sx={{ width: `${openAges[index]! / Math.max(1, ...openAges) * 100}%`, height: "100%", bgcolor: index > 2 ? "error.main" : index > 1 ? "warning.main" : "primary.main", borderRadius: 1 }}/></Box><Typography variant="body2" fontWeight={700} sx={{ width: 20, textAlign: "right" }}>{openAges[index]}</Typography></Stack>)}</Stack>
        </Paper>
        <Paper variant="outlined" sx={{ borderRadius: 2, p: { xs: 1.5, sm: 2 } }}>
          <Typography variant="h2">Tipos de error más frecuentes</Typography><Typography variant="caption" color="text.secondary">Incidencias históricas y pendientes.</Typography>
          <Stack divider={<Divider flexItem/>} sx={{ mt: 1 }}>{["A02", "A03", "A05"].map((code) => { const matching = visibleRows.filter((row) => row.ruleCode === code); return <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} py={1.35} key={code}><Typography variant="body2" fontWeight={600}>{code} · {matching[0]?.title ?? "Sin incidencias"}</Typography><Chip size="small" label={matching.length}/></Stack>; })}</Stack>
        </Paper>
      </Box>

      <Paper ref={detailsRef} variant="outlined" sx={{ borderRadius: 2, mt: 2, overflow: "hidden", scrollMarginTop: 80 }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1} sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Box><Typography variant="h2">Detalle de alertas</Typography><Typography variant="caption" color="text.secondary">{visibleRows.length} {visibleRows.length === 1 ? "resultado" : "resultados"} con los filtros actuales.</Typography></Box>
          {selectedDate && <Button size="small" variant="outlined" onClick={() => setSelectedDate(null)}>Quitar filtro de fecha</Button>}
        </Stack>
        <Divider/>
        <TableContainer><Table sx={{ minWidth: 980 }} stickyHeader>
          <TableHead><TableRow>{["Detectada", "Error", "Acción", "Responsable", "OT", "Máquina", "Operación", "Turno", "Antigüedad", "Estado"].map((label) => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {loading && [...Array(4)].map((_, index) => <TableRow key={index}>{[...Array(10)].map((__, cell) => <TableCell key={cell}><Skeleton width={cell === 1 ? 170 : 64}/></TableCell>)}</TableRow>)}
            {!loading && visibleRows.map((row) => <TableRow hover key={row.id}>
              <TableCell sx={{ whiteSpace: "nowrap" }}>{dateTime(row.openedAt)}</TableCell>
              <TableCell><Typography variant="body2" fontWeight={700}>{row.title}</Typography><Typography variant="caption" color="text.secondary">{row.ruleCode} · {row.label}</Typography></TableCell>
              <TableCell><Button size="small" endIcon={<KeyboardArrowRightRounded/>} onClick={() => void openDetail(row.id)}>Ver detalles</Button></TableCell>
              <TableCell>{row.responsibleName ?? "—"}</TableCell>
              <TableCell><Tooltip title="Copiar identificador"><Button size="small" startIcon={<ContentCopyRounded/>} onClick={() => void navigator.clipboard.writeText(row.workOrderCode ?? "")}>{row.workOrderCode ?? "—"}</Button></Tooltip></TableCell>
              <TableCell>{row.machineCode ?? "—"}</TableCell><TableCell>{row.operationName ?? "—"}</TableCell><TableCell>{row.shiftName ?? "—"}</TableCell>
              <TableCell sx={{ whiteSpace: "nowrap", fontWeight: row.lifecycle === "open" ? 700 : 400 }}>{duration(minutesBetween(row.openedAt, row.resolvedAt ?? undefined))}</TableCell>
              <TableCell><Chip size="small" variant="outlined" color={lifecycleColor[row.lifecycle]} label={lifecycleLabel[row.lifecycle]}/></TableCell>
            </TableRow>)}
          </TableBody>
        </Table></TableContainer>
        {!loading && visibleRows.length === 0 && <Box sx={{ p: 5, textAlign: "center" }}><Typography fontWeight={700}>No hay alertas con estos filtros</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>Prueba otra fecha, operación, estado o término.</Typography><Button variant="outlined" sx={{ mt: 2 }} onClick={resetFilters}>Restablecer filtros</Button></Box>}
      </Paper>
    </Container>

    <Paper component="nav" square elevation={3} aria-label="Navegación principal" sx={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 64, zIndex: 20, display: "flex", justifyContent: "center", gap: { xs: 1, sm: 4 }, borderTop: "1px solid", borderColor: "divider" }}>
      <Button startIcon={<DashboardRounded/>} sx={{ minWidth: { xs: 136, sm: 168 }, fontWeight: 700, position: "relative", "&::before": { content: "''", position: "absolute", top: 0, left: 20, right: 20, height: 3, bgcolor: "primary.main", borderRadius: "0 0 4px 4px" } }} aria-current="page">Dashboard</Button>
      <Tooltip title="Disponible en la Fase 6"><span><Button startIcon={<ChatBubbleOutlineRounded/>} disabled sx={{ minWidth: { xs: 136, sm: 168 }, height: 64 }}>Chats</Button></span></Tooltip>
    </Paper>

    <Drawer anchor="right" open={Boolean(detail) || detailLoading} onClose={() => { setDetail(null); setDetailLoading(false); }} PaperProps={{ sx: { width: { xs: "100%", sm: 520 }, bgcolor: "background.default" } }}>
      <Box sx={{ position: "sticky", top: 0, zIndex: 1, bgcolor: "secondary.main", color: "white", px: { xs: 2, sm: 3 }, py: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
          <Box>{detail ? <><Typography variant="caption" sx={{ color: "rgba(255,255,255,.72)" }}>{detail.ruleCode} · ocurrencia {detail.occurrence}</Typography><Typography variant="h2" color="inherit" sx={{ mt: .25 }}>{detail.title}</Typography></> : <Skeleton width={260} height={52} sx={{ bgcolor: "rgba(255,255,255,.18)" }}/>}</Box>
          <IconButton aria-label="Cerrar detalle" color="inherit" onClick={() => { setDetail(null); setDetailLoading(false); }}><CloseRounded/></IconButton>
        </Stack>
      </Box>
      {detailLoading && !detail && <Stack gap={2} sx={{ p: 3 }}><Skeleton height={34}/><Skeleton height={90}/><Skeleton height={180}/></Stack>}
      {detail && <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
          <Chip color={lifecycleColor[detail.lifecycle]} label={lifecycleLabel[detail.lifecycle]}/>
          <Typography variant="caption" color="text.secondary">Detectada {dateTime(detail.openedAt)}</Typography>
        </Stack>
        <Typography sx={{ mt: 2, maxWidth: "65ch" }}>{detail.summary}</Typography>

        <Section title="Contexto">
          <Stack divider={<Divider flexItem/>}><Fact label="OT" value={detail.workOrderCode}/><Fact label="Máquina" value={detail.machineCode}/><Fact label="Operación" value={detail.operationName}/><Fact label="Turno" value={detail.shiftName}/><Fact label="Responsable" value={detail.responsibleName}/></Stack>
          {detail.workOrderCode && <Button variant="outlined" startIcon={copied ? <CheckRounded/> : <ContentCopyRounded/>} sx={{ mt: 2 }} onClick={() => { void navigator.clipboard.writeText(detail.workOrderCode!); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }}>{copied ? "Identificador copiado" : "Copiar identificador de OT"}</Button>}
        </Section>

        <Section title="Historial de estado">
          <Stack gap={1.5}>{detail.transitions.map((transition, index) => <Stack direction="row" gap={1.5} key={`${transition.occurredAt}-${index}`}><Box sx={{ width: 10, height: 10, mt: .7, borderRadius: "50%", bgcolor: lifecycleColor[transition.toState] === "success" ? "success.main" : lifecycleColor[transition.toState] === "warning" ? "warning.main" : "error.main", flex: "0 0 auto" }}/><Box><Typography variant="body2" fontWeight={600}>{lifecycleLabel[transition.toState]}</Typography><Typography variant="caption" color="text.secondary">{dateTime(transition.occurredAt)} · {transition.reason === "condition_triggered" ? "Condición detectada" : "Condición despejada"}</Typography></Box></Stack>)}</Stack>
        </Section>

        <Section title="Evidencia">
          <Stack divider={<Divider flexItem/>}>{detail.evidence.map((item) => <Box key={item.id} sx={{ py: 1.75, "&:first-of-type": { pt: 0 } }}><Stack direction="row" justifyContent="space-between" gap={2} mb={1.25}><Typography variant="body2" fontWeight={600}>{item.status === "triggered" ? "Condición detectada" : "Condición despejada"}</Typography><Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>{dateTime(item.observedAt)}</Typography></Stack><Stack gap={.75}>{Object.entries(item.evidence).map(([key, value]) => <Fact key={key} label={evidenceLabels[key] ?? key} value={readableEvidence(value)}/>)}</Stack></Box>)}</Stack>
        </Section>

        {detail.related.length > 0 && <Section title="Alertas relacionadas"><Stack divider={<Divider flexItem/>}>{detail.related.map((related) => <Button key={related.id} color="inherit" endIcon={<KeyboardArrowRightRounded/>} sx={{ justifyContent: "space-between", px: 0, py: 1.25 }} onClick={() => void openDetail(related.id)}>{related.ruleCode} · {related.title}</Button>)}</Stack></Section>}
      </Box>}
    </Drawer>
  </Box>;
}

function Metric({ label, value, supporting, tone, onClick }: { label: string; value: string | number; supporting?: string; tone?: string; onClick?: () => void }) {
  const content = <Box sx={{ px: 1.25, py: .75, minHeight: { xs: 60, sm: 58 }, minWidth: 0, textAlign: "left", width: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}><Typography variant="caption" color="text.secondary" noWrap>{label}</Typography><Typography variant="h2" noWrap sx={{ color: tone, fontSize: "1.125rem", fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>{value}</Typography>{supporting && <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: ".68rem" }}>{supporting}</Typography>}</Box>;
  return onClick ? <ButtonBase onMouseDown={(event) => event.preventDefault()} onClick={onClick} sx={{ minWidth: 0, borderRight: "1px solid", borderColor: "divider", "&:hover": { bgcolor: "action.hover" } }}>{content}</ButtonBase> : <Box sx={{ minWidth: 0, borderRight: "1px solid", borderColor: "divider" }}>{content}</Box>;
}
function Legend({ color, label }: { color: string; label: string }) {
  return <Stack direction="row" alignItems="center" gap={.65}><Box sx={{ width: 9, height: 9, borderRadius: .5, bgcolor: color }}/><Typography variant="caption">{label}</Typography></Stack>;
}
function Fact({ label, value }: { label: string; value: string | null }) {
  return <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={2} sx={{ py: .8 }}><Typography variant="body2" color="text.secondary">{label}</Typography><Typography variant="body2" fontWeight={600} textAlign="right" sx={{ overflowWrap: "anywhere" }}>{value ?? "—"}</Typography></Stack>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <Box component="section" sx={{ mt: 3, pt: 2.5, borderTop: "1px solid", borderColor: "divider" }}><Typography variant="h2" sx={{ mb: 1.5 }}>{title}</Typography>{children}</Box>;
}

export default function App() {
  const [state, setState] = useState<LoadState>("loading");
  const [session, setSession] = useState<SessionResponse | null>(null);
  useEffect(() => { void currentSession().then((value) => { setSession(value); setState("ready"); }).catch(() => setState("error")); }, []);
  if (state === "loading") return <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "background.default" }}><CircularProgress aria-label="Cargando Monitor"/></Box>;
  if (state === "error") return <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 3, bgcolor: "background.default" }}><Alert severity="error">No se pudo iniciar Monitor. Comprueba que la API local esté funcionando.</Alert></Box>;
  return session ? <Dashboard session={session} onLogout={() => void logout().then(() => setSession(null))}/> : <LoginView onLogin={setSession}/>;
}
