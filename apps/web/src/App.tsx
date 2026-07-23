import ChatBubbleOutlineRounded from "@mui/icons-material/ChatBubbleOutlineRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import ExpandLessRounded from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import MenuRounded from "@mui/icons-material/MenuRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import TuneRounded from "@mui/icons-material/TuneRounded";
import type { SessionResponse } from "@monitor/contracts";
import { monitorSemanticTokens } from "@monitor/design-system";
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
  Popover,
  Radio,
  RadioGroup,
  Skeleton,
  Stack,
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
import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import { es } from "date-fns/locale";
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
const dimensions = ["Fecha", "Trabajador", "OT", "Máquina", "Operación", "Turno", "Tipo de error"];
const ui = monitorSemanticTokens;

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
function relativeDateTime(value: string) {
  const date = new Date(value);
  const now = new Date();
  const minutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60_000));
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const time = new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);
  if (days === 0) return `Hoy, ${time}`;
  if (days === 1) return `Ayer, ${time}`;
  if (days < 7) return `${new Intl.DateTimeFormat("es-PE", { weekday: "short" }).format(date)}, ${time}`;
  return dateTime(value);
}
function dateKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function dimensionValue(row: IncidentSummary, dimension: number) {
  const values = [
    dateKey(row.openedAt), row.responsibleName, row.workOrderCode, row.machineCode,
    row.operationName, row.shiftName, `${row.ruleCode} · ${row.title}`,
  ];
  return values[dimension] ?? "Sin asignar";
}
function shortDate(key: string) {
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short" }).format(new Date(`${key}T12:00:00`));
}
function compactDateRange(from: string, to: string) {
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  const month = (date: Date) => new Intl.DateTimeFormat("es-PE", { month: "short" }).format(date).replace(".", "").toLocaleLowerCase("es-PE");
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${month(end)}.`;
  }
  return `${start.getDate()} ${month(start)}.–${end.getDate()} ${month(end)}.`;
}
function inputDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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
        <Typography sx={{ color: ui.color.textInverseMuted, mt: 1 }}>Acceso de prueba sin conexión a EmusaSoft.</Typography>
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
  const [statusFilters, setStatusFilters] = useState<IncidentLifecycle[]>([]);
  const [operation, setOperation] = useState("all");
  const [range, setRange] = useState("30");
  const [customFrom, setCustomFrom] = useState(() => inputDate(new Date(Date.now() - 29 * 86_400_000)));
  const [customTo, setCustomTo] = useState(() => inputDate(new Date()));
  const [customDraftFrom, setCustomDraftFrom] = useState(customFrom);
  const [customDraftTo, setCustomDraftTo] = useState(customTo);
  const [customDateAnchor, setCustomDateAnchor] = useState<HTMLElement | null>(null);
  const [rangeMenuAnchor, setRangeMenuAnchor] = useState<HTMLElement | null>(null);
  const [ageBucket, setAgeBucket] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [dimension, setDimension] = useState(0);
  const [detail, setDetail] = useState<IncidentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileQuickFiltersOpen, setMobileQuickFiltersOpen] = useState(false);
  const [desktopSearchExpanded, setDesktopSearchExpanded] = useState(false);
  const [incidentsExpanded, setIncidentsExpanded] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 600px)").matches);
  const [liveState, setLiveState] = useState<"live" | "reconnecting">("reconnecting");
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const detailsRef = useRef<HTMLDivElement | null>(null);
  const rangeTriggerRef = useRef<HTMLDivElement | null>(null);
  const mobileRangeTriggerRef = useRef<HTMLDivElement | null>(null);
  const pullStartY = useRef<number | null>(null);
  const customRangePhase = useRef<"start" | "end">("start");
  const socket = useMemo<Socket>(() => io({ withCredentials: true, autoConnect: false }), []);

  const refresh = useCallback(() => {
    setLoading(true);
    void incidents({ search, operation })
      .then(setRows)
      .then(() => setFailed(false))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [operation, search]);

  useEffect(refresh, [refresh]);
  useEffect(() => {
    socket.on("connect", () => {
      setLiveState("live");
      socket.emit("sync.resume", { cursor: Number(localStorage.getItem("monitor.cursor") ?? 0) });
    });
    socket.on("disconnect", () => setLiveState("reconnecting"));
    socket.on("incident.changed", (change: { cursor: number }) => {
      localStorage.setItem("monitor.cursor", String(change.cursor));
      refresh();
    });
    socket.connect();
    return () => { socket.off("connect"); socket.off("disconnect"); socket.off("incident.changed"); socket.disconnect(); };
  }, [refresh, socket]);

  useEffect(() => {
    const hideQuickFilters = () => {
      if (window.scrollY > 36) setMobileQuickFiltersOpen(false);
    };
    window.addEventListener("scroll", hideQuickFilters, { passive: true });
    return () => window.removeEventListener("scroll", hideQuickFilters);
  }, []);

  const rangeRows = useMemo(() => rows.filter((row) => {
    if (range !== "custom") return Date.now() - Date.parse(row.openedAt) <= Number(range) * 86_400_000;
    const timestamp = Date.parse(row.openedAt);
    return timestamp >= Date.parse(`${customFrom}T00:00:00`) && timestamp <= Date.parse(`${customTo}T23:59:59.999`);
  }), [customFrom, customTo, range, rows]);
  const statusRows = useMemo(() => statusFilters.length === 0 ? rangeRows : rangeRows.filter((row) => statusFilters.includes(row.lifecycle)), [rangeRows, statusFilters]);
  const groupedRows = useMemo(() => statusRows.filter((row) => {
    if (dimension === 0 && selectedDate) return dateKey(row.openedAt) === selectedDate;
    if (dimension !== 0 && selectedGroup) return dimensionValue(row, dimension) === selectedGroup;
    return true;
  }), [dimension, selectedDate, selectedGroup, statusRows]);
  const ageLowerBounds = [0, 30, 60, 240];
  const ageUpperBounds = [30, 60, 240, Infinity];
  const visibleRows = useMemo(() => ageBucket === null ? groupedRows : groupedRows.filter((row) => {
    const age = minutesBetween(row.openedAt);
    return row.lifecycle === "open" && age >= ageLowerBounds[ageBucket]! && age < ageUpperBounds[ageBucket]!;
  }), [ageBucket, groupedRows]);
  const totals = {
    all: visibleRows.length,
    open: visibleRows.filter((row) => row.lifecycle === "open").length,
    resolved: visibleRows.filter((row) => row.lifecycle === "resolved").length,
    closed: visibleRows.filter((row) => row.lifecycle === "closed_without_resolution").length,
  };
  const chartRows = useMemo(() => {
    const statusFiltered = statusFilters.length === 0 ? rangeRows : rangeRows.filter((row) => statusFilters.includes(row.lifecycle));
    if (ageBucket === null) return statusFiltered;
    return statusFiltered.filter((row) => {
      const age = minutesBetween(row.openedAt);
      return row.lifecycle === "open" && age >= ageLowerBounds[ageBucket]! && age < ageUpperBounds[ageBucket]!;
    });
  }, [ageBucket, rangeRows, statusFilters]);
  const chartContextPoints = useMemo(() => {
    const points = new Map<string, Record<IncidentLifecycle, number>>();
    for (const row of rangeRows) {
      const key = dimensionValue(row, dimension);
      const point = points.get(key) ?? { open: 0, resolved: 0, closed_without_resolution: 0 };
      point[row.lifecycle] += 1;
      points.set(key, point);
    }
    const entries = [...points.entries()];
    return (dimension === 0
      ? entries.sort(([a], [b]) => a.localeCompare(b)).slice(-10)
      : entries.sort(([, a], [, b]) => Object.values(b).reduce((sum, value) => sum + value, 0) - Object.values(a).reduce((sum, value) => sum + value, 0)).slice(0, 8));
  }, [dimension, rangeRows]);
  const chartPoints = useMemo(() => {
    const filtered = new Map<string, Record<IncidentLifecycle, number>>();
    for (const row of chartRows) {
      const key = dimensionValue(row, dimension);
      const point = filtered.get(key) ?? { open: 0, resolved: 0, closed_without_resolution: 0 };
      point[row.lifecycle] += 1;
      filtered.set(key, point);
    }
    return chartContextPoints.map(([key]) => [key, filtered.get(key) ?? { open: 0, resolved: 0, closed_without_resolution: 0 }] as const);
  }, [chartContextPoints, chartRows, dimension]);
  const chartMaximum = Math.max(1, ...chartContextPoints.map(([, point]) => point.open + point.resolved + point.closed_without_resolution));
  const chartStep = Math.max(1, Math.ceil((chartMaximum + 1) / 5));
  const chartScale = chartStep * 5;
  const chartTicks = [5, 4, 3, 2, 1, 0].map((step) => step * chartStep);
  const openAges = ageUpperBounds.map((limit, index) => groupedRows.filter((row) => row.lifecycle === "open" && minutesBetween(row.openedAt) >= ageLowerBounds[index]! && minutesBetween(row.openedAt) < limit).length);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try { setDetail(await incidentDetail(id)); }
    catch { setFailed(true); }
    finally { setDetailLoading(false); }
  };
  const resetFilters = () => { setSearch(""); setStatusFilters([]); setOperation("all"); setRange("30"); setAgeBucket(null); setSelectedDate(null); setSelectedGroup(null); setDimension(0); };
  const preserveViewport = (change: () => void) => {
    const scrollPosition = window.scrollY;
    change();
    window.requestAnimationFrame(() => window.scrollTo({ top: scrollPosition, behavior: "auto" }));
  };
  const selectMetric = (nextStatus: IncidentLifecycle) => preserveViewport(() => {
    setStatusFilters((currentStatuses) => currentStatuses.includes(nextStatus)
      ? currentStatuses.filter((item) => item !== nextStatus)
      : [...currentStatuses, nextStatus]);
  });
  const selectSegment = (key: string, lifecycle: IncidentLifecycle) => preserveViewport(() => {
    const selectedPoint = dimension === 0 ? selectedDate : selectedGroup;
    const isSelected = selectedPoint === key && statusFilters.length === 1 && statusFilters[0] === lifecycle;
    if (dimension === 0) setSelectedDate(isSelected ? null : key);
    else setSelectedGroup(isSelected ? null : key);
    setStatusFilters(isSelected ? [] : [lifecycle]);
  });
  const rangeLabel = range === "custom" ? "Período personalizado" : `Últimos ${range} días`;
  const rangeControlLabel = range === "custom" ? compactDateRange(customFrom, customTo) : `${range} días`;
  const rangeAccessibleLabel = range === "custom" ? `${shortDate(customFrom)} – ${shortDate(customTo)}` : rangeControlLabel;
  const openCustomRange = (anchor: HTMLElement | null) => {
    const isEditingCustomRange = range === "custom";
    setCustomDraftFrom(isEditingCustomRange ? customFrom : "");
    setCustomDraftTo(isEditingCustomRange ? customTo : "");
    customRangePhase.current = "start";
    setCustomDateAnchor(anchor);
  };
  const changeRange = (value: string, anchor: HTMLElement | null = rangeTriggerRef.current) => {
    setRangeMenuAnchor(null);
    if (value === "custom") {
      openCustomRange(anchor);
      return;
    }
    setRange(value);
    setCustomDateAnchor(null);
    setSelectedDate(null);
    setSelectedGroup(null);
  };
  const selectedCalendarRange: DateRange | undefined = customDraftFrom ? {
    from: new Date(`${customDraftFrom}T12:00:00`),
    to: customDraftTo ? new Date(`${customDraftTo}T12:00:00`) : undefined,
  } : undefined;
  const selectCalendarDay = (day: Date) => {
    const selectedDay = inputDate(day);
    if (customRangePhase.current === "start") {
      setCustomDraftFrom(selectedDay);
      setCustomDraftTo("");
      customRangePhase.current = "end";
      return;
    }
    const nextFrom = selectedDay < customDraftFrom ? selectedDay : customDraftFrom;
    const nextTo = selectedDay < customDraftFrom ? customDraftFrom : selectedDay;
    setCustomDraftFrom(nextFrom);
    setCustomDraftTo(nextTo);
    setCustomFrom(nextFrom);
    setCustomTo(nextTo);
    setRange("custom");
    setSelectedDate(null);
    setSelectedGroup(null);
    customRangePhase.current = "start";
  };
  const startPull = (event: React.TouchEvent) => {
    if (window.scrollY === 0) pullStartY.current = event.touches[0]?.clientY ?? null;
  };
  const movePull = (event: React.TouchEvent) => {
    if (pullStartY.current === null || window.scrollY !== 0) return;
    const distance = (event.touches[0]?.clientY ?? pullStartY.current) - pullStartY.current;
    if (distance > 42) setMobileQuickFiltersOpen(true);
    if (distance < -20) setMobileQuickFiltersOpen(false);
  };
  const endPull = () => { pullStartY.current = null; };
  const handleOverscroll = (event: React.WheelEvent) => {
    if (window.scrollY === 0 && event.deltaY < -4) setMobileQuickFiltersOpen(true);
    if (event.deltaY > 4) setMobileQuickFiltersOpen(false);
  };
  const exportRows = () => {
    const cells = (values: Array<string | number | null>) => values.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",");
    const csv = [
      cells(["Detectada", "Código", "Error", "Responsable", "OT", "Máquina", "Operación", "Turno", "Antigüedad", "Estado"]),
      ...visibleRows.map((row) => cells([dateTime(row.openedAt), row.ruleCode, row.title, row.responsibleName, row.workOrderCode, row.machineCode, row.operationName, row.shiftName, duration(minutesBetween(row.openedAt, row.resolvedAt ?? undefined)), lifecycleLabel[row.lifecycle]])),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "monitor-alertas.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return <Box onTouchStart={startPull} onTouchMove={movePull} onTouchEnd={endPull} onWheel={handleOverscroll} sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 8 }}>
    <AppBar position="sticky" elevation={0} color="secondary" sx={{ borderBottom: `1px solid ${ui.color.inverseDivider}` }}>
      <Toolbar variant="dense" sx={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", minHeight: { xs: 48, sm: 48 }, px: { xs: .75, sm: 1.5 } }}>
        <IconButton color="inherit" size="small" aria-label="Abrir aplicaciones de producción" onClick={(event) => setMenuAnchor(event.currentTarget)} sx={{ justifySelf: "start", width: 40, height: 40 }}><MenuRounded fontSize="small"/></IconButton>
        <Typography variant="body2" fontWeight={700} noWrap>Control de alertas</Typography>
        <Stack direction="row" alignItems="center" gap={.5} sx={{ justifySelf: "end" }}>
          <Stack direction="row" alignItems="center" gap={.5} sx={{ display: { xs: "none", md: "flex" } }}><Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: liveState === "live" ? "success.light" : "warning.light" }}/><Typography variant="caption" sx={{ color: ui.color.textInverseMuted }}>{liveState === "live" ? "En vivo" : "Reconectando"}</Typography></Stack>
          <IconButton color="inherit" size="small" aria-label="Filtros avanzados" onClick={() => setMobileFiltersOpen(true)} sx={{ display: { xs: "inline-flex", sm: "none" }, width: 40, height: 40 }}><TuneRounded fontSize="small"/></IconButton>
          <Tooltip title="Exportar incidentes en CSV"><IconButton color="inherit" size="small" aria-label="Exportar incidentes en CSV" onClick={exportRows} sx={{ width: 40, height: 40 }}><DownloadRounded fontSize="small"/></IconButton></Tooltip>
          <Tooltip title={`Cerrar sesión de ${session.principal.displayName}`}><IconButton color="inherit" size="small" aria-label="Cerrar sesión" onClick={onLogout} sx={{ width: 40, height: 40 }}><LogoutRounded fontSize="small"/></IconButton></Tooltip>
        </Stack>
      </Toolbar>
    </AppBar>
    <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
      <MenuItem selected>Control de alertas</MenuItem>
      {["Planificación", "Inventario", "Calidad", "Mantenimiento"].map((label) => <MenuItem key={label} disabled>{label}</MenuItem>)}
    </Menu>

    <Box aria-hidden={!mobileQuickFiltersOpen} sx={{ display: { xs: "grid", sm: "none" }, gridTemplateRows: mobileQuickFiltersOpen ? "44px" : "0px", opacity: mobileQuickFiltersOpen ? 1 : 0, overflow: "hidden", bgcolor: "background.paper", borderBottom: mobileQuickFiltersOpen ? "1px solid" : 0, borderColor: "divider", transition: "grid-template-rows 180ms cubic-bezier(.22,1,.36,1), opacity 120ms linear" }}>
      {mobileQuickFiltersOpen && <Stack direction="row" alignItems="center" gap={.5} sx={{ minHeight: 0, px: 1, overflow: "hidden" }}>
        <TextField autoFocus={mobileQuickFiltersOpen} size="small" fullWidth placeholder="Buscar" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Buscar por persona, OT, máquina o error" sx={{ "& .MuiInputBase-input": { height: "100%", py: 0, boxSizing: "border-box", fontSize: ui.typography.routine } }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded sx={{ fontSize: 17 }}/></InputAdornment>, sx: { height: ui.control.visibleHeight, minHeight: ui.control.visibleHeight, fontSize: ui.typography.routine } } }}/>
        <QuickStatusChip label="Todas" selected={statusFilters.length === 0} onClick={() => setStatusFilters([])}/>
        <QuickStatusChip label="Abiertas" selected={statusFilters.includes("open")} tone="error.main" onClick={() => selectMetric("open")}/>
      </Stack>}
    </Box>

    <Container component="main" maxWidth={false} sx={{ maxWidth: 1280, px: { xs: 1, sm: 1.5, lg: 2 }, py: { xs: 1, sm: 1.25 } }}>
      {failed && <Alert severity="error" sx={{ mb: 1 }}>No se pudieron actualizar las alertas. Se conservan los últimos datos disponibles.</Alert>}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", lg: "minmax(0,2fr) minmax(286px,.72fr)" }, gap: 1, alignItems: "start", minWidth: 0 }}>
        <Paper variant="outlined" sx={{ borderRadius: 1.5, minWidth: 0, overflow: "hidden" }}>
          <Box sx={{ p: { xs: 1, sm: 1.25 } }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "flex-start" }} gap={.75}>
              <Box><Typography variant="h2">Alertas por {dimensions[dimension]?.toLowerCase()}</Typography><Typography variant="caption" color="text.secondary">{dimension === 0 && selectedDate ? shortDate(selectedDate) : selectedGroup ?? rangeLabel} · selecciona un segmento para filtrar.</Typography></Box>
              <Stack direction="row" gap={.4} flexWrap="wrap" aria-label="Filtrar por estado">
                <StatusLegend lifecycle="resolved" label="Resueltas" active={statusFilters.length === 0 || statusFilters.includes("resolved")} selected={statusFilters.includes("resolved")} onClick={() => selectMetric("resolved")}/>
                <StatusLegend lifecycle="open" label="Abiertas" active={statusFilters.length === 0 || statusFilters.includes("open")} selected={statusFilters.includes("open")} onClick={() => selectMetric("open")}/>
                <StatusLegend lifecycle="closed_without_resolution" label="Sin resolución" active={statusFilters.length === 0 || statusFilters.includes("closed_without_resolution")} selected={statusFilters.includes("closed_without_resolution")} onClick={() => selectMetric("closed_without_resolution")}/>
              </Stack>
            </Stack>
            <Stack direction="row" alignItems="center" gap={.5} sx={{ display: { xs: "none", sm: "flex" }, mt: .75, minWidth: 0, position: "relative", height: ui.control.visibleHeight }}>
              <Stack direction="row" alignItems="center" gap={.5} aria-hidden={desktopSearchExpanded} sx={{ minWidth: 0, flex: 1, pr: "172px", opacity: desktopSearchExpanded ? 0 : 1, visibility: desktopSearchExpanded ? "hidden" : "visible", pointerEvents: desktopSearchExpanded ? "none" : "auto", transition: "opacity 120ms linear, visibility 0ms linear 120ms" }}>
                <Stack direction="row" gap={.4} role="tablist" aria-label="Agrupar gráfico por" sx={{ minWidth: 0, overflowX: "auto" }}>{dimensions.map((label, index) => <Chip key={label} label={label} size="small" clickable role="tab" aria-selected={dimension === index} variant={dimension === index ? "filled" : "outlined"} color={dimension === index ? "primary" : "default"} onClick={() => { setDimension(index); setSelectedDate(null); setSelectedGroup(null); }} sx={{ height: ui.control.visibleHeight, borderRadius: ui.control.radius, fontSize: ui.typography.routine, flex: "0 0 auto" }}/>)}</Stack>
                <Box ref={rangeTriggerRef} sx={{ height: ui.control.visibleHeight, width: 112, flex: "0 0 112px", display: "flex", border: "1px solid", borderColor: "divider", borderRadius: ui.control.radius, overflow: "hidden" }}>
                  <ButtonBase aria-label={`Rango de fechas: ${rangeAccessibleLabel}`} aria-haspopup="menu" aria-expanded={Boolean(rangeMenuAnchor)} onClick={(event) => setRangeMenuAnchor(event.currentTarget)} sx={{ minWidth: 0, flex: 1, px: .75, gap: .25, justifyContent: range === "custom" ? "center" : "space-between", fontSize: ui.typography.routine, whiteSpace: "nowrap" }}><Box component="span">{rangeControlLabel}</Box>{range !== "custom" && <ExpandMoreRounded sx={{ fontSize: 16, flex: "0 0 auto" }}/>}</ButtonBase>
                  {range === "custom" && <ButtonBase aria-label="Quitar período personalizado" onClick={() => changeRange("30")} sx={{ width: ui.control.visibleHeight, flex: `0 0 ${ui.control.visibleHeight}`, borderLeft: "1px solid", borderColor: "divider" }}><CloseRounded sx={{ fontSize: 14 }}/></ButtonBase>}
                </Box>
                <Menu anchorEl={rangeMenuAnchor} open={Boolean(rangeMenuAnchor)} onClose={() => setRangeMenuAnchor(null)} MenuListProps={{ "aria-label": "Elegir rango de fechas" }} PaperProps={{ sx: { "& .MuiMenuItem-root": { minHeight: ui.control.visibleHeight, py: .25, fontSize: ui.typography.routine } } }}>
                  {[ ["7", "7 días"], ["30", "30 días"], ["90", "90 días"], ["custom", "Personalizado"] ].map(([value, label]) => <MenuItem key={value} selected={range === value} onClick={() => changeRange(value!, rangeTriggerRef.current)}>{label}</MenuItem>)}
                </Menu>
                <TextField select size="small" value={operation} onChange={(event) => setOperation(event.target.value)} aria-label="Filtrar por operación" SelectProps={{ MenuProps: { PaperProps: { sx: { "& .MuiMenuItem-root": { minHeight: ui.control.visibleHeight, py: .25, fontSize: ui.typography.routine } } } } }} sx={{ width: 104, flex: "0 0 auto", "& .MuiInputBase-root": { height: ui.control.visibleHeight, minHeight: ui.control.visibleHeight, fontSize: ui.typography.routine }, "& .MuiSelect-select": { minHeight: "0 !important", height: "100% !important", py: "0 !important", display: "flex", alignItems: "center", boxSizing: "border-box", fontSize: ui.typography.routine } }}>
                  <MenuItem value="all">Todas</MenuItem>{["Impresión", "Extrusión", "Exlam", "Corte", "Sellado"].map((item) => <MenuItem value={item} key={item}>{item}</MenuItem>)}
                </TextField>
              </Stack>
              <TextField size="small" placeholder="Buscar alertas" value={search} onChange={(event) => setSearch(event.target.value)} onFocus={() => setDesktopSearchExpanded(true)} onBlur={() => setDesktopSearchExpanded(false)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === "Escape") { event.preventDefault(); setDesktopSearchExpanded(false); event.currentTarget.querySelector("input")?.blur(); } }} aria-label="Buscar por persona, OT, máquina o error" sx={{ position: "absolute", right: 0, top: 0, width: desktopSearchExpanded ? "100%" : 168, zIndex: 2, bgcolor: "background.paper", transition: "width 180ms cubic-bezier(.23,1,.32,1)", "& .MuiInputBase-root": { height: ui.control.visibleHeight, minHeight: ui.control.visibleHeight, fontSize: ui.typography.routine, bgcolor: "background.paper", pr: desktopSearchExpanded ? .25 : 1 }, "& .MuiInputBase-input": { height: "100%", py: 0, boxSizing: "border-box", fontSize: ui.typography.routine } }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded sx={{ fontSize: 16 }}/></InputAdornment>, endAdornment: desktopSearchExpanded ? <InputAdornment position="end"><ButtonBase aria-label="Filtros avanzados" onMouseDown={(event) => event.preventDefault()} onClick={() => setMobileFiltersOpen(true)} sx={{ height: 22, px: .75, borderRadius: ui.control.radius, gap: .4, color: "primary.main", fontSize: ui.typography.routine, fontWeight: 700 }}><TuneRounded sx={{ fontSize: 14 }}/>Filtros avanzados</ButtonBase></InputAdornment> : undefined } }}/>
            </Stack>
            <Box role="group" aria-label={`Alertas por ${dimensions[dimension]?.toLowerCase()} y estado`} sx={{ display: "grid", gridTemplateColumns: "28px minmax(0,1fr)", height: { xs: 176, sm: 190 }, mt: .75 }}>
              <Box sx={{ position: "relative", height: "calc(100% - 26px)", color: "text.secondary" }}>{chartTicks.map((tick, index) => <Typography key={`${tick}-${index}`} variant="caption" sx={{ position: "absolute", right: 5, top: index === 5 ? "calc(100% - 12px)" : `calc(${index * 20}% - 6px)`, fontSize: ui.typography.routine, fontVariantNumeric: "tabular-nums" }}>{tick}</Typography>)}</Box>
              <Box sx={{ position: "relative", minWidth: 0 }}>
                <Box sx={{ position: "absolute", inset: "0 0 26px", borderBottom: "1px solid", borderColor: "divider" }}>{chartTicks.slice(0, 5).map((_, index) => <Box key={index} sx={{ position: "absolute", top: `${index * 20}%`, left: 0, right: 0, borderTop: "1px solid", borderColor: "divider", opacity: .72 }}/>)}</Box>
                <Box sx={{ position: "absolute", inset: 0, display: "flex", gap: { xs: .35, sm: .75 }, alignItems: "stretch" }}>
                  {chartPoints.length === 0 && <Typography color="text.secondary" sx={{ alignSelf: "center", mx: "auto" }}>No hay alertas en este período.</Typography>}
                  {chartPoints.map(([key, point]) => {
                    const total = point.open + point.resolved + point.closed_without_resolution;
                    const selectedPoint = dimension === 0 ? selectedDate : selectedGroup;
                    const label = dimension === 0 ? shortDate(key) : key;
                    return <Box key={key} sx={{ flex: 1, minWidth: 16, height: "100%", display: "flex", flexDirection: "column", opacity: selectedPoint && selectedPoint !== key ? .24 : 1, transition: "opacity 180ms cubic-bezier(.22,1,.36,1)" }}>
                      <Box sx={{ position: "relative", flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center", minHeight: 0 }}>
                        {total > 0 && <Typography variant="caption" fontWeight={700} sx={{ position: "absolute", bottom: `calc(${Math.max(9, total / chartScale * 100)}% + 3px)`, fontSize: ui.typography.routine, fontVariantNumeric: "tabular-nums" }}>{total}</Typography>}
                        <Box sx={{ width: "min(72%, 32px)", height: total > 0 ? `${Math.max(9, total / chartScale * 100)}%` : 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden", borderRadius: "3px 3px 0 0" }}>
                          {(["closed_without_resolution", "open", "resolved"] as IncidentLifecycle[]).map((item) => point[item] > 0 && <Tooltip key={item} title={`${label} · ${point[item]} ${lifecycleLabel[item].toLowerCase()}`} arrow><ButtonBase aria-label={`${label}: ${point[item]} ${lifecycleLabel[item].toLowerCase()}. Filtrar dashboard.`} aria-pressed={selectedPoint === key && statusFilters.length === 1 && statusFilters[0] === item} onClick={() => selectSegment(key, item)} sx={{ bgcolor: item === "resolved" ? "success.main" : item === "open" ? "error.main" : "warning.main", flex: point[item], minHeight: 10, width: "100%", "&:hover, &:focus-visible": { filter: "brightness(.82)", outline: "2px solid", outlineColor: "primary.main", outlineOffset: "-2px" } }}/></Tooltip>)}
                        </Box>
                      </Box>
                      <Tooltip title={label}><Typography variant="caption" color="text.secondary" sx={{ height: 26, pt: .5, px: .25, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: ui.typography.routine }}>{label}</Typography></Tooltip>
                    </Box>;
                  })}
                </Box>
              </Box>
            </Box>
          </Box>

          <Divider/>
          <Box ref={detailsRef} sx={{ scrollMarginTop: 56 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} sx={{ px: { xs: 1, sm: 1.25 }, py: .75 }}>
              <Stack direction="row" alignItems="baseline" gap={.75}><Typography variant="h2">Incidentes</Typography><Typography variant="caption" color="text.secondary">{visibleRows.length} {visibleRows.length === 1 ? "resultado" : "resultados"}</Typography></Stack>
              <Stack direction="row" alignItems="center" gap={.25}>{(selectedDate || selectedGroup) && <Button size="small" onClick={() => { setSelectedDate(null); setSelectedGroup(null); }} sx={{ px: .75 }}>Quitar selección</Button>}<Tooltip title={incidentsExpanded ? "Ocultar incidentes" : "Mostrar incidentes"}><IconButton size="small" aria-label={incidentsExpanded ? "Ocultar lista de incidentes" : "Mostrar lista de incidentes"} aria-expanded={incidentsExpanded} onClick={() => setIncidentsExpanded((expanded) => !expanded)} sx={{ width: 36, height: 36 }}>{incidentsExpanded ? <ExpandLessRounded fontSize="small"/> : <ExpandMoreRounded fontSize="small"/>}</IconButton></Tooltip></Stack>
            </Stack>
            {incidentsExpanded && <>
            <Divider/>
            <TableContainer sx={{ display: { xs: "none", md: "block" }, overflowX: "hidden" }}><Table size="small" stickyHeader sx={{ tableLayout: "fixed", "& .MuiTableCell-root": { px: 1, py: .55 } }}>
              <TableHead><TableRow><TableCell sx={{ width: "15%" }}>Cuándo</TableCell><TableCell sx={{ width: "50%" }}>Alerta</TableCell><TableCell sx={{ width: "23%" }}>OT</TableCell><TableCell align="center" sx={{ width: "12%", pr: 2 }}>Estado</TableCell></TableRow></TableHead>
              <TableBody>
                {loading && [...Array(4)].map((_, index) => <TableRow key={index}>{[...Array(4)].map((__, cell) => <TableCell key={cell}><Skeleton width={cell === 1 ? "90%" : 56}/></TableCell>)}</TableRow>)}
                {!loading && visibleRows.map((row) => <TableRow hover key={row.id}>
                  <TableCell title={dateTime(row.openedAt)} sx={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", fontSize: ui.typography.primaryData }}>{relativeDateTime(row.openedAt)}</TableCell>
                  <TableCell sx={{ p: "0 !important" }}>
                    <ButtonBase aria-label={`Ver causa e historial técnico de ${row.title}`} onClick={() => void openDetail(row.id)} sx={{ display: "block", width: "100%", minHeight: 48, px: 1, py: .55, textAlign: "left", borderRadius: .5, "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -2 } }}><Typography variant="body2" fontWeight={700} noWrap title={row.title}>{row.title}</Typography><Typography variant="caption" color="text.secondary" display="block" noWrap title={[row.ruleCode, duration(minutesBetween(row.openedAt, row.resolvedAt ?? undefined)), row.responsibleName, row.machineCode, row.operationName, row.shiftName].filter(Boolean).join(" · ")}>{[row.ruleCode, duration(minutesBetween(row.openedAt, row.resolvedAt ?? undefined)), row.responsibleName, row.machineCode, row.operationName, row.shiftName].filter(Boolean).join(" · ")}</Typography></ButtonBase>
                  </TableCell>
                  <TableCell><Typography variant="body2" color="primary.main" fontWeight={600} sx={{ userSelect: "text", fontVariantNumeric: "tabular-nums" }}>{row.workOrderCode ?? "—"}</Typography></TableCell>
                  <TableCell align="center" sx={{ pr: 2 }}><StatusDot lifecycle={row.lifecycle}/></TableCell>
                </TableRow>)}
              </TableBody>
            </Table></TableContainer>
            <Stack divider={<Divider flexItem/>} sx={{ display: { xs: "flex", md: "none" } }}>
              {loading && [...Array(3)].map((_, index) => <Box key={index} sx={{ p: 1.25 }}><Skeleton width="55%"/><Skeleton width="90%"/><Skeleton width="72%"/></Box>)}
              {!loading && visibleRows.map((row) => <Box component="article" key={row.id}>
                <ButtonBase aria-label={`Ver causa e historial técnico de ${row.title}`} onClick={() => void openDetail(row.id)} sx={{ display: "block", width: "100%", p: 1.25, textAlign: "left", borderRadius: .5, "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -2 } }}>
                  <Stack direction="row" justifyContent="space-between" gap={1} alignItems="flex-start"><Box minWidth={0}><Typography variant="body2" fontWeight={700}>{row.title}</Typography><Typography variant="caption" color="text.secondary">{row.ruleCode} · {relativeDateTime(row.openedAt)} · {duration(minutesBetween(row.openedAt, row.resolvedAt ?? undefined))}</Typography></Box><StatusDot lifecycle={row.lifecycle}/></Stack>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: .5 }}>{[row.responsibleName, row.machineCode, row.operationName, row.shiftName].filter(Boolean).join(" · ") || "Sin contexto operativo"}</Typography>
                  <Typography variant="caption" color="primary.main" fontWeight={600} sx={{ mt: .5, display: "block" }}>OT {row.workOrderCode ?? "—"}</Typography>
                </ButtonBase>
              </Box>)}
            </Stack>
            {!loading && visibleRows.length === 0 && <Box sx={{ p: 4, textAlign: "center" }}><Typography fontWeight={700}>No hay alertas con estos filtros</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>Prueba otra fecha, operación, estado o término.</Typography><Button variant="outlined" sx={{ mt: 1.5 }} onClick={resetFilters}>Restablecer filtros</Button></Box>}
            </>}
          </Box>
        </Paper>

        <Stack gap={1} sx={{ minWidth: 0 }}>
          <Paper component="section" variant="outlined" aria-labelledby="age-title" sx={{ p: 1.25, borderRadius: 1.5, minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={1}><Typography id="age-title" variant="h2">Antigüedad abierta</Typography><Typography variant="caption" color="text.secondary">{totals.open} abiertas</Typography></Stack>
            <Stack sx={{ mt: .75 }} gap={.25}>{["Menos de 30 min", "30 min – 1 h", "1 – 4 h", "Más de 4 h"].map((label, index) => <ButtonBase key={label} aria-pressed={ageBucket === index} onClick={() => preserveViewport(() => setAgeBucket((currentBucket) => currentBucket === index ? null : index))} sx={{ width: "100%", borderRadius: ui.control.radius, px: .25, py: .5, bgcolor: ageBucket === index ? "action.selected" : "transparent", "&:hover": { bgcolor: "action.hover" }, "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" } }}><Stack direction="row" alignItems="center" gap={.75} sx={{ width: "100%" }}><Typography variant="caption" sx={{ width: 90, fontSize: ui.typography.routine, textAlign: "left" }}>{label}</Typography><Box sx={{ flex: 1, height: 6, bgcolor: "background.default", borderRadius: 1 }}><Box sx={{ width: `${openAges[index]! / Math.max(1, ...openAges) * 100}%`, height: "100%", bgcolor: ageBucket === index ? "secondary.main" : "primary.main", borderRadius: 1 }}/></Box><Typography variant="caption" fontWeight={700} sx={{ width: 18, textAlign: "right" }}>{openAges[index]}</Typography></Stack></ButtonBase>)}</Stack>
          </Paper>
        </Stack>
      </Box>
    </Container>

    <Paper component="nav" square elevation={0} aria-label="Navegación principal" sx={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 60, zIndex: 20, display: "flex", justifyContent: "center", gap: { xs: .5, sm: 3 }, borderTop: "1px solid", borderColor: "divider" }}>
      <Button startIcon={<DashboardRounded/>} sx={{ minWidth: { xs: 136, sm: 168 }, height: 60, fontWeight: 700, position: "relative", "&::before": { content: "''", position: "absolute", top: 0, left: 20, right: 20, height: 3, bgcolor: "primary.main", borderRadius: "0 0 4px 4px" } }} aria-current="page">Dashboard</Button>
      <Tooltip title="Disponible en la Fase 6"><span><Button startIcon={<ChatBubbleOutlineRounded/>} disabled sx={{ minWidth: { xs: 136, sm: 168 }, height: 60 }}>Chats</Button></span></Tooltip>
    </Paper>

    <Drawer anchor="bottom" open={mobileFiltersOpen} onClose={() => setMobileFiltersOpen(false)} PaperProps={{ sx: { maxHeight: "88vh", borderRadius: "16px 16px 0 0", p: 2 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}><Typography variant="h2">Filtros avanzados</Typography><IconButton size="small" aria-label="Cerrar filtros" onClick={() => setMobileFiltersOpen(false)} sx={{ width: 32, height: 32 }}><CloseRounded fontSize="small"/></IconButton></Stack>
      <TextField autoFocus size="small" fullWidth placeholder="Persona, OT, máquina o error" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Buscar por persona, OT, máquina o error" sx={{ "& .MuiInputBase-root": { minHeight: ui.control.visibleHeight, height: ui.control.visibleHeight }, "& .MuiInputBase-input": { height: "100%", py: 0, boxSizing: "border-box", fontSize: ui.typography.routine } }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded sx={{ fontSize: 16 }}/></InputAdornment> } }}/>
      <FilterGroup label="Período"><Stack ref={mobileRangeTriggerRef} direction="row" gap={.5}><TextField select size="small" fullWidth value={range} onChange={(event) => changeRange(event.target.value, mobileRangeTriggerRef.current)} SelectProps={{ renderValue: () => rangeControlLabel, MenuProps: { PaperProps: { sx: { "& .MuiMenuItem-root": { minHeight: ui.control.visibleHeight, py: .25, fontSize: ui.typography.routine } } } } }} sx={{ "& .MuiInputBase-root": { minHeight: ui.control.visibleHeight, height: ui.control.visibleHeight }, "& .MuiSelect-select": { minHeight: "0 !important", height: "100% !important", py: "0 !important", display: "flex", alignItems: "center", boxSizing: "border-box", fontSize: ui.typography.routine } }}><MenuItem value="7">7 días</MenuItem><MenuItem value="30">30 días</MenuItem><MenuItem value="90">90 días</MenuItem><MenuItem value="custom">Personalizado</MenuItem></TextField>{range === "custom" && <IconButton size="small" aria-label="Quitar período personalizado" onClick={() => changeRange("30", mobileRangeTriggerRef.current)} sx={{ width: ui.control.visibleHeight, height: ui.control.visibleHeight, border: "1px solid", borderColor: "divider", borderRadius: ui.control.radius }}><CloseRounded sx={{ fontSize: 14 }}/></IconButton>}</Stack></FilterGroup>
      <FilterGroup label="Estado"><Stack direction="row" gap={.5} flexWrap="wrap"><Chip label="Todas" clickable variant={statusFilters.length === 0 ? "filled" : "outlined"} color={statusFilters.length === 0 ? "primary" : "default"} onClick={() => setStatusFilters([])}/>{([ ["open", "Abiertas"], ["resolved", "Resueltas"], ["closed_without_resolution", "Sin resolución"] ] as const).map(([value, label]) => <Chip key={value} label={label} clickable variant={statusFilters.includes(value) ? "filled" : "outlined"} color={statusFilters.includes(value) ? value === "open" ? "error" : value === "resolved" ? "success" : "warning" : "default"} onClick={() => selectMetric(value)}/>)}</Stack></FilterGroup>
      <FilterGroup label="Operación"><TextField select size="small" fullWidth value={operation} onChange={(event) => setOperation(event.target.value)} SelectProps={{ MenuProps: { PaperProps: { sx: { "& .MuiMenuItem-root": { minHeight: ui.control.visibleHeight, py: .25, fontSize: ui.typography.routine } } } } }} sx={{ "& .MuiInputBase-root": { minHeight: ui.control.visibleHeight, height: ui.control.visibleHeight }, "& .MuiSelect-select": { minHeight: "0 !important", height: "100% !important", py: "0 !important", display: "flex", alignItems: "center", boxSizing: "border-box", fontSize: ui.typography.routine } }}><MenuItem value="all">Todas</MenuItem>{["Impresión", "Extrusión", "Exlam", "Corte", "Sellado"].map((item) => <MenuItem value={item} key={item}>{item}</MenuItem>)}</TextField></FilterGroup>
      <FilterGroup label="Antigüedad abierta"><Stack direction="row" gap={.5} flexWrap="wrap">{["< 30 min", "30 min – 1 h", "1 – 4 h", "> 4 h"].map((label, index) => <Chip key={label} label={label} clickable variant={ageBucket === index ? "filled" : "outlined"} color={ageBucket === index ? "primary" : "default"} onClick={() => setAgeBucket(ageBucket === index ? null : index)}/>)}</Stack></FilterGroup>
      <FilterGroup label="Agrupar gráfico por"><Stack direction="row" gap={.5} flexWrap="wrap">{dimensions.map((label, index) => <Chip key={label} label={label} clickable variant={dimension === index ? "filled" : "outlined"} color={dimension === index ? "primary" : "default"} onClick={() => { setDimension(index); setSelectedDate(null); setSelectedGroup(null); }}/>)}</Stack></FilterGroup>
      <Stack direction="row" gap={1} mt={1.5}><Button size="small" fullWidth variant="outlined" onClick={resetFilters}>Restablecer</Button><Button size="small" fullWidth variant="contained" onClick={() => setMobileFiltersOpen(false)}>Ver resultados</Button></Stack>
    </Drawer>

    <Popover open={Boolean(customDateAnchor)} anchorEl={customDateAnchor} onClose={() => setCustomDateAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "left" }} transformOrigin={{ vertical: "top", horizontal: "left" }} slotProps={{ paper: { sx: { mt: .5, p: 1, borderRadius: "8px", overflow: "hidden" } } }}>
      <Typography variant="caption" fontWeight={700} sx={{ display: "block", px: .5, pb: .5 }}>Período personalizado</Typography>
      <Box sx={{ "--rdp-accent-color": ui.color.action, "--rdp-accent-background-color": ui.color.selected, "& .rdp-root": { m: 0, fontSize: ui.typography.routine }, "& .rdp-month_caption": { height: ui.control.visibleHeight, fontSize: ui.typography.routine }, "& .rdp-nav": { height: ui.control.visibleHeight }, "& .rdp-button_previous, & .rdp-button_next": { width: ui.control.visibleHeight, height: ui.control.visibleHeight }, "& .rdp-weekday": { fontSize: ui.typography.routine, height: 22 }, "& .rdp-day": { width: ui.control.visibleHeight, height: ui.control.visibleHeight }, "& .rdp-day_button": { width: ui.control.visibleHeight, height: ui.control.visibleHeight, borderRadius: ui.control.radius, fontSize: ui.typography.routine } }}>
        <DayPicker mode="range" locale={es} selected={selectedCalendarRange} onSelect={(_, triggerDate) => selectCalendarDay(triggerDate)} min={1} {...(selectedCalendarRange?.from ? { defaultMonth: selectedCalendarRange.from } : {})}/>
      </Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} sx={{ pt: .5, borderTop: "1px solid", borderColor: "divider" }}><Typography variant="caption" color="text.secondary">Selecciona inicio y fin.</Typography>{range === "custom" && <Button size="small" onClick={() => changeRange("30")}>Quitar</Button>}</Stack>
    </Popover>

    <Drawer anchor="right" open={Boolean(detail) || detailLoading} onClose={() => { setDetail(null); setDetailLoading(false); }} PaperProps={{ sx: { width: { xs: "100%", sm: 520 }, bgcolor: "background.default" } }}>
      <Box sx={{ position: "sticky", top: 0, zIndex: 1, bgcolor: "secondary.main", color: "white", px: { xs: 2, sm: 3 }, py: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
          <Box>{detail ? <><Typography variant="caption" sx={{ color: ui.color.textInverseMuted }}>{detail.ruleCode} · ocurrencia {detail.occurrence}</Typography><Typography variant="h2" color="inherit" sx={{ mt: .25 }}>{detail.title}</Typography></> : <Skeleton width={260} height={52} sx={{ bgcolor: ui.color.inverseSkeleton }}/>}</Box>
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

        <Section title="Datos operativos">
          <Stack divider={<Divider flexItem/>}><Fact label="OT" value={detail.workOrderCode}/><Fact label="Máquina" value={detail.machineCode}/><Fact label="Operación" value={detail.operationName}/><Fact label="Turno" value={detail.shiftName}/><Fact label="Responsable" value={detail.responsibleName}/></Stack>
        </Section>

        <Section title="Historial de estado">
          <Stack gap={1.5}>{detail.transitions.map((transition, index) => <Stack direction="row" gap={1.5} key={`${transition.occurredAt}-${index}`}><Box sx={{ width: 10, height: 10, mt: .7, borderRadius: "50%", bgcolor: lifecycleColor[transition.toState] === "success" ? "success.main" : lifecycleColor[transition.toState] === "warning" ? "warning.main" : "error.main", flex: "0 0 auto" }}/><Box><Typography variant="body2" fontWeight={600}>{lifecycleLabel[transition.toState]}</Typography><Typography variant="caption" color="text.secondary">{dateTime(transition.occurredAt)} · {transition.reason === "condition_triggered" ? "Condición detectada" : "Condición despejada"}</Typography></Box></Stack>)}</Stack>
        </Section>

        <Section title="¿Por qué se generó?">
          <IncidentExplanation detail={detail}/>
        </Section>
      </Box>}
    </Drawer>
  </Box>;
}

function QuickStatusChip({ label, selected, tone = "primary.main", onClick }: { label: string; selected: boolean; tone?: string; onClick: () => void }) {
  return <ButtonBase aria-pressed={selected} onClick={onClick} sx={{ height: ui.control.visibleHeight, px: 1, flex: "0 0 auto", borderRadius: ui.control.radius, border: "1px solid", borderColor: selected ? tone : "divider", color: selected ? tone : "text.secondary", bgcolor: selected ? "action.selected" : "transparent", fontSize: ui.typography.routine, fontWeight: 600 }}>{label}</ButtonBase>;
}
function StatusLegend({ lifecycle, label, active, selected, onClick }: { lifecycle: IncidentLifecycle; label: string; active: boolean; selected: boolean; onClick: () => void }) {
  const color = lifecycle === "resolved" ? "success.main" : lifecycle === "open" ? "error.main" : "warning.main";
  return <ButtonBase aria-pressed={selected} onClick={onClick} sx={{ height: ui.control.visibleHeight, px: 1, borderRadius: ui.control.radius, border: "1px solid", borderColor: selected ? color : "divider", bgcolor: selected ? "action.selected" : "transparent", color: active ? "text.primary" : "text.disabled", gap: .5, fontSize: ui.typography.routine, fontWeight: selected ? 700 : 500, "&:hover": { bgcolor: "action.hover" }, "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" } }}><Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: active ? color : "text.disabled" }}/>{label}</ButtonBase>;
}
function StatusDot({ lifecycle }: { lifecycle: IncidentLifecycle }) {
  const color = lifecycle === "resolved" ? "success.main" : lifecycle === "open" ? "error.main" : "warning.main";
  return <Tooltip title={lifecycleLabel[lifecycle]}><Box component="span" role="img" aria-label={`Estado: ${lifecycleLabel[lifecycle]}`} sx={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", bgcolor: color }}/></Tooltip>;
}
function IncidentExplanation({ detail }: { detail: IncidentDetail }) {
  const evidence = detail.evidence[0]?.evidence ?? {};
  const elapsed = Number(evidence.elapsedMinutes ?? evidence.declaredAgeMinutes ?? minutesBetween(detail.openedAt));
  if (detail.ruleCode === "A02") return <Typography variant="body2">El material reservado para la OT {detail.workOrderCode ?? "sin código"} fue enviado hacia {detail.machineCode ?? "la máquina de destino"} y lleva {elapsed} min en tránsito sin que el responsable de recepción haya registrado su llegada.</Typography>;
  if (detail.ruleCode === "A03") return <Typography variant="body2">La OT {detail.workOrderCode ?? "sin código"} lleva {elapsed} min activa en {detail.machineCode ?? "la máquina"} sin que el responsable de la operación haya declarado el primer consumo de material.</Typography>;
  return <Typography variant="body2">La bobina declarada para la OT {detail.workOrderCode ?? "sin código"} lleva {elapsed} min sin que el responsable del equipo complete el pesaje o el movimiento requerido desde {detail.machineCode ?? "la máquina"}.</Typography>;
}
function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return <Box sx={{ mt: 1.5 }}><Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: .5, fontSize: ui.typography.routine }}>{label}</Typography>{children}</Box>;
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
