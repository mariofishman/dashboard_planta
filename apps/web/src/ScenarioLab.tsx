import AddRounded from "@mui/icons-material/AddRounded";
import CameraAltOutlined from "@mui/icons-material/CameraAltOutlined";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import MenuRounded from "@mui/icons-material/MenuRounded";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import type { SessionResponse } from "@monitor/contracts";
import { monitorSemanticTokens } from "@monitor/design-system";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  advanceScenarioExperiment,
  captureScenarioSnapshot,
  closeIncidentWithoutResolution,
  configureScenarioExperiment,
  createScenarioExperiment,
  failScenarioNextPoll,
  incidentDetail,
  pauseScenarioExperiment,
  scenarioExperiment,
  scenarioOperationalHistory,
  scenarioRuntime,
  scenarioSourceAction,
  scenarios,
  type A02SourceAuthority,
  ApiRequestError,
  type IncidentDetail,
  type ScenarioRecordStatus,
  type ScenarioOperationalHistoryItem,
  type ScenarioRuleCode,
  type ScenarioRuntimeStatus,
  type ScenarioSnapshot,
  type ScenarioStatus,
  type SourceActionId,
} from "./api";

const ui = monitorSemanticTokens;
type LaboratoryTab = ScenarioRuleCode | "integrity";
const tabs: Array<{ id: LaboratoryTab; label: string }> = [
  { id: "A02", label: "A02 · Movimientos" },
  { id: "A03", label: "A03 · Consumo OT" },
  { id: "A05", label: "A05 · Bobinas" },
  { id: "integrity", label: "Integridad" },
];
const jumps = [1, 5, 10, 15, 20, 29, 30, 31] as const;
const creationSelectFields = new Set(["sku", "uniqueCode", "unitId", "originWarehouseId", "destinationWarehouseId", "workOrderId", "operationId", "machineId", "sourceWorkOrderId"]);

function timestamp(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function RuntimeFacts({ runtime }: { runtime: ScenarioRuntimeStatus }) {
  const experiment = runtime.experiment!;
  const nextPoll = Object.values(experiment.nextDue).sort()[0];
  const latest =
    experiment.status === "running"
      ? `Programado para ${timestamp(nextPoll)}`
      : experiment.status === "paused" ? "Se programa al iniciar" : "Sin sondeos pendientes";
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      gap={{ xs: 0.5, sm: 2 }}
      useFlexGap
      flexWrap="wrap"
    >
      <Typography variant="body2">
        <strong>Experimento</strong> {experiment.id.slice(0, 8)}
      </Typography>
      <Typography variant="body2">
        <strong>Hora simulada</strong> {timestamp(experiment.businessTime)}
      </Typography>
      <Chip
        size="small"
        variant="outlined"
        color={experiment.status === "running" ? "success" : experiment.status === "paused" ? "warning" : "default"}
        label={experiment.status === "running" ? "En ejecución" : experiment.status === "paused" ? "Pausado" : "Completado"}
      />
      <Typography variant="caption" color="text.secondary">
        <strong>Próximo sondeo</strong> {latest}
      </Typography>
    </Stack>
  );
}

function SetupControls({
  runtime,
  disabled,
  onConfigure,
  onAdvance,
  onPause,
}: {
  runtime: ScenarioRuntimeStatus;
  disabled: boolean;
  onConfigure: (seconds: number, frequency: number) => Promise<void>;
  onAdvance: (minutes: number) => Promise<void>;
  onPause: (paused: boolean) => Promise<void>;
}) {
  const experiment = runtime.experiment!;
  const [seconds, setSeconds] = useState(experiment.secondsPerSimulatedMinute);
  const [frequency, setFrequency] = useState(
    experiment.pollingFrequencyMinutes,
  );
  useEffect(() => {
    setSeconds(experiment.secondsPerSimulatedMinute);
    setFrequency(experiment.pollingFrequencyMinutes);
  }, [
    experiment.id,
    experiment.secondsPerSimulatedMinute,
    experiment.pollingFrequencyMinutes,
  ]);
  const commit = async () => onConfigure(seconds, frequency);
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          md: "minmax(0,1fr) minmax(0,1fr) 2fr",
        },
        gap: 1.5,
        alignItems: "start",
      }}
    >
      <TextField
        label="Velocidad (s/min)"
        type="number"
        value={seconds}
        disabled={disabled || experiment.status !== "paused"}
        slotProps={{ htmlInput: { min: 1, max: 60 } }}
        onChange={(event) => setSeconds(Number(event.target.value))}
        onBlur={() => void commit()}
      />
      <TextField
        label="Sondeo (min)"
        type="number"
        value={frequency}
        disabled={disabled || experiment.status !== "paused"}
        slotProps={{ htmlInput: { min: 1, max: 99 } }}
        onChange={(event) => setFrequency(Number(event.target.value))}
        onBlur={() => void commit()}
      />
      <Box>
        <Typography variant="caption" color="text.secondary">
          Avanzar tiempo simulado
        </Typography>
        <Box
          sx={{
            mt: 0.5,
            display: "grid",
            gridTemplateColumns: "repeat(4,minmax(0,1fr))",
            gap: 0.5,
          }}
        >
          {jumps.map((minutes) => (
            <Button
              key={minutes}
              variant="outlined"
              disabled={disabled || experiment.status !== "running"}
              onClick={() => void onAdvance(minutes)}
            >
              +{minutes}
            </Button>
          ))}
        </Box>
      </Box>
      <Box
        sx={{
          gridColumn: { md: "1 / -1" },
          display: "flex",
          alignItems: "center",
          gap: 1,
          minHeight: ui.control.visibleHeight,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          <strong>Último</strong> Los resultados aparecen después de cada sondeo
          automático completo.
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          disabled={disabled || experiment.status === "completed"}
          onClick={() => void onPause(experiment.status === "running")}
        >
          {experiment.status === "running" ? "Pausar" : experiment.status === "paused" ? "Iniciar" : "Completado"}
        </Button>
      </Box>
    </Box>
  );
}

const reasonLabel: Record<string, string> = {
  not_received: "Sin recepción",
  no_first_consumption: "Sin primer consumo",
  not_weighed: "Sin pesar",
  still_at_machine: "Sigue en máquina",
};
const value = (row: Record<string, unknown>, key: string) =>
  row[key] === null || row[key] === undefined || row[key] === ""
    ? "—"
    : String(row[key]);
const activeRecord = (code: ScenarioRuleCode, record: ScenarioRecordStatus) =>
  code === "A02"
    ? record.row.state === "TRANSITO"
    : code === "A03"
      ? record.row.active === true
      : record.row.notWeighed === true ||
        record.row.sourceWorkOrderFinished !== true ||
        record.row.movedFromMachine === false;
const titleFor = (code: ScenarioRuleCode) =>
  ({
    A02: "A02 · Movimientos de material",
    A03: "A03 · OTs sin primer consumo",
    A05: "A05 · Bobinas sin pesar o mover",
  })[code];
const emptyFor = (code: ScenarioRuleCode) =>
  ({
    A02: "No hay movimientos despachados en este experimento.",
    A03: "No hay OTs iniciadas en este experimento.",
    A05: "No hay bobinas declaradas en este experimento.",
  })[code];

function Outcome({ record }: { record: ScenarioRecordStatus }) {
  if (record.pendingPoll)
    return (
      <Chip
        size="small"
        color="info"
        variant="outlined"
        label="Cambio pendiente"
      />
    );
  if (record.actual.incident?.lifecycle === "open")
    return <Chip size="small" color="error" label="Alerta abierta" />;
  if (record.actual.incident?.lifecycle === "closed_without_resolution")
    return (
      <Chip size="small" variant="outlined" label="Cerrada sin resolución" />
    );
  if (record.actual.incident)
    return (
      <Chip
        size="small"
        color="success"
        variant="outlined"
        label="Problema resuelto"
      />
    );
  return <Chip size="small" variant="outlined" label="Sin alerta" />;
}

function RecordFacts({
  code,
  record,
}: {
  code: ScenarioRuleCode;
  record: ScenarioRecordStatus;
}) {
  const row = record.row;
  const facts =
    code === "A02"
      ? [
          ["Movimiento", record.key],
          ["Material", value(row, "materialName")],
          ["OT", value(row, "workOrderCode")],
          ["Ruta", `${value(row, "origin")} → ${value(row, "destination")}`],
          ["Despacho", timestamp(value(row, "dispatchedAt"))],
        ]
      : code === "A03"
        ? [
            ["OT", value(row, "workOrderCode")],
            ["Máquina", value(row, "machineCode")],
            ["Operación", value(row, "operationName")],
            ["Inicio", timestamp(value(row, "startedAt"))],
            ["Consumos", value(row, "consumptionCount")],
          ]
        : [
            ["Bobina", record.key],
            ["Tipo", value(row, "sourceReelType")],
            ["OT", value(row, "workOrderCode")],
            ["Máquina", value(row, "machineCode")],
            ["Declaración", timestamp(value(row, "declaredAt"))],
          ];
  return (
    <>
      {facts.map(([label, fact]) => (
        <Box key={String(label)}>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="body2">{String(fact)}</Typography>
        </Box>
      ))}
    </>
  );
}

function RecordActions({
  code,
  record,
  authority,
  busy,
  run,
}: {
  code: ScenarioRuleCode;
  record: ScenarioRecordStatus;
  authority: A02SourceAuthority;
  busy: boolean;
  run: (
    action: SourceActionId,
    key: number,
    authority?: A02SourceAuthority,
  ) => void;
}) {
  if (!activeRecord(code, record)) return null;
  if (code === "A02")
    return (
      <Stack direction="row" gap={0.5} flexWrap="wrap">
        <Button
          size="small"
          variant="contained"
          disabled={busy}
          onClick={() => run("a02.receive", record.key)}
        >
          Recibir
        </Button>
        {authority === "origin" && (
          <Button
            size="small"
            color="error"
            disabled={busy}
            onClick={() => run("a02.cancel", record.key, authority)}
          >
            Anular
          </Button>
        )}
        {authority !== "origin" && (
          <Button
            size="small"
            color="error"
            disabled={busy}
            onClick={() => run("a02.reject", record.key, authority)}
          >
            Rechazar
          </Button>
        )}
      </Stack>
    );
  if (code === "A03")
    return (
      <Stack direction="row" gap={0.5} flexWrap="wrap">
        {Number(record.row.consumptionCount) === 0 && (
          <Button
            size="small"
            variant="contained"
            disabled={busy}
            onClick={() => run("a03.record_first_consumption", record.key)}
          >
            Registrar consumo
          </Button>
        )}
        <Button
          size="small"
          disabled={busy}
          onClick={() => run("a03.close_work_order", record.key)}
        >
          Cerrar OT
        </Button>
        <Button
          size="small"
          color="error"
          disabled={busy}
          onClick={() => run("a03.cancel_work_order", record.key)}
        >
          Cancelar
        </Button>
      </Stack>
    );
  return (
    <Stack direction="row" gap={0.5} flexWrap="wrap">
      {record.row.notWeighed === true && (
        <Button
          size="small"
          variant="contained"
          disabled={busy}
          onClick={() => run("a05.register_weighing", record.key)}
        >
          Registrar pesaje
        </Button>
      )}
      {record.row.movedFromMachine === false && (
        <Button
          size="small"
          variant="contained"
          disabled={busy}
          onClick={() => run("a05.register_movement", record.key)}
        >
          Registrar salida
        </Button>
      )}
      {record.row.sourceWorkOrderFinished !== true && (
        <Button
          size="small"
          disabled={busy}
          onClick={() => run("a05.close_source_work_order", record.key)}
        >
          Cerrar OT
        </Button>
      )}
      <Button
        size="small"
        disabled={busy}
        onClick={() => run("a05.handoff_to_a02", record.key)}
      >
        Enviar a A02
      </Button>
    </Stack>
  );
}

function RecordsView({
  code,
  records,
  authority,
  busy,
  readOnly = false,
  run,
  inspect,
}: {
  code: ScenarioRuleCode;
  records: ScenarioRecordStatus[];
  authority: A02SourceAuthority;
  busy: boolean;
  readOnly?: boolean;
  run: (
    action: SourceActionId,
    key: number,
    authority?: A02SourceAuthority,
  ) => void;
  inspect: (record: ScenarioRecordStatus) => void;
}) {
  if (!records.length)
    return (
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ py: 3, textAlign: "center" }}
      >
        {emptyFor(code)}
      </Typography>
    );
  return (
    <>
      <TableContainer sx={{ display: { xs: "none", sm: "block" } }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={44}>Ver</TableCell>
              <TableCell>Registro fuente</TableCell>
              <TableCell>Estado Monitor</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.key} hover>
                <TableCell>
                  <IconButton
                    size="small"
                    aria-label={`Inspeccionar registro ${record.key}`}
                    onClick={() => inspect(record)}
                  >
                    <VisibilityOutlined />
                  </IconButton>
                </TableCell>
                <TableCell>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3,minmax(110px,1fr))",
                      gap: 1,
                    }}
                  >
                    <RecordFacts code={code} record={record} />
                  </Box>
                </TableCell>
                <TableCell>
                  <Outcome record={record} />
                </TableCell>
                <TableCell>
                  {!readOnly && <RecordActions
                    code={code}
                    record={record}
                    authority={authority}
                    busy={busy}
                    run={run}
                  />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Stack gap={1} sx={{ display: { xs: "flex", sm: "none" } }}>
        {records.map((record) => (
          <Paper key={record.key} variant="outlined" sx={{ p: 1 }}>
            <Stack direction="row" justifyContent="space-between">
              <Outcome record={record} />
              <IconButton
                size="small"
                aria-label={`Inspeccionar registro ${record.key}`}
                onClick={() => inspect(record)}
              >
                <VisibilityOutlined />
              </IconButton>
            </Stack>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 1,
                my: 1,
              }}
            >
              <RecordFacts code={code} record={record} />
            </Box>
            {!readOnly && <RecordActions
              code={code}
              record={record}
              authority={authority}
              busy={busy}
              run={run}
            />}
          </Paper>
        ))}
      </Stack>
    </>
  );
}

export function ScenarioLab({
  session,
  onLogout,
}: {
  session: SessionResponse;
  onLogout: () => void;
}) {
  const [items, setItems] = useState<ScenarioStatus[]>([]);
  const [runtime, setRuntime] = useState<ScenarioRuntimeStatus | null>(null);
  const [tab, setTab] = useState<LaboratoryTab>("A02");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newStart, setNewStart] = useState(() =>
    new Date().toISOString().slice(0, 16),
  );
  const [newSeconds, setNewSeconds] = useState(1);
  const [newFrequency, setNewFrequency] = useState(3);
  const [authority, setAuthority] = useState<A02SourceAuthority>("origin");
  const [historyCode, setHistoryCode] = useState<ScenarioRuleCode | null>(null);
  const [historyItems, setHistoryItems] = useState<ScenarioOperationalHistoryItem[]>([]);
  const [historyFilters, setHistoryFilters] = useState({ experimentId: "", from: "", to: "", sku: "", uniqueCode: "", destination: "", sourceState: "", timingOutcome: "", incidentOutcome: "" });
  const [selectedRecord, setSelectedRecord] = useState<{
    code: ScenarioRuleCode;
    record: ScenarioRecordStatus;
  } | null>(null);
  const [detail, setDetail] = useState<IncidentDetail | null>(null);
  const [closureOpen, setClosureOpen] = useState(false);
  const [closureReason, setClosureReason] = useState("");
  const [closureComment, setClosureComment] = useState("");
  const [createCode, setCreateCode] = useState<ScenarioRuleCode | null>(null);
  const [createKey, setCreateKey] = useState<number | "">("");
  const [createInput, setCreateInput] = useState<Record<string, string>>({});
  const [a05Kind, setA05Kind] = useState<"produced" | "remnant">("produced");
  const [snapshotsOpen, setSnapshotsOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<ScenarioSnapshot[]>([]);
  const [snapshotView, setSnapshotView] = useState<ScenarioSnapshot | null>(
    null,
  );
  const [integrityCode, setIntegrityCode] = useState<ScenarioRuleCode>("A02");
  const [integrityBefore, setIntegrityBefore] = useState<Record<
    string,
    number
  > | null>(null);
  const [metricView, setMetricView] = useState<"evidence" | "deliveries" | "conversations" | null>(null);
  const canAdmin = session.principal.scopes.includes("monitor:admin");

  const refresh = useCallback(async () => {
    if (!canAdmin) return;
    try {
      const [nextItems, nextRuntime] = await Promise.all([
        scenarios(),
        scenarioRuntime(),
      ]);
      setItems(nextItems.map((item) => ({ ...item, records: item.records ?? [] })));
      setRuntime(nextRuntime);
      setError(null);
    } catch {
      setError("No se pudo leer el laboratorio conectado.");
    } finally {
      setLoading(false);
    }
  }, [canAdmin]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 1_000);
    return () => window.clearInterval(timer);
  }, [refresh]);
  const execute = async (work: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
      await refresh();
    } catch (failure) {
      const code = failure instanceof ApiRequestError && failure.body && typeof failure.body === "object" && "error" in failure.body
        ? String((failure.body as { error: unknown }).error) : "";
      setError(code === "source_action_reference_unavailable"
        ? "La opción seleccionada ya no está disponible en test_database. Actualiza el laboratorio e inténtalo de nuevo."
        : code === "source_action_identity_conflict"
          ? "Ese código ya pertenece a otro registro fuente. Elige un código diferente."
          : "La acción no se completó. El estado confirmado de Monitor se conserva.");
    } finally {
      setBusy(false);
    }
  };
  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const created = await createScenarioExperiment({
        name: `Experimento ${new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short" }).format(new Date())}`,
        businessTime: new Date(newStart).toISOString(),
        pollingFrequencyMinutes: newFrequency,
        runId: `v2-${Date.now()}`,
        manifestVersion: "stage5.v2",
      });
      await configureScenarioExperiment(
        created.experiment!.id,
        newSeconds,
        newFrequency,
      );
      setNewOpen(false);
      await refresh();
    } catch {
      setError("No se pudo crear el experimento con esos controles.");
    } finally {
      setBusy(false);
    }
  };
  const configure = (seconds: number, frequency: number) =>
    execute(() =>
      configureScenarioExperiment(runtime!.experiment!.id, seconds, frequency),
    );
  const pause = (paused: boolean) =>
    execute(() => pauseScenarioExperiment(runtime!.experiment!.id, paused));
  const advance = (minutes: number) =>
    execute(() => advanceScenarioExperiment(runtime!.experiment!.id, minutes));
  const selected = useMemo(
    () => items.find((item) => item.ruleCode === tab),
    [items, tab],
  );
  const creationOptions = useMemo(() => {
    const options: Record<string, Array<{ value: string; label: string }>> = {};
    const collect = (code: ScenarioRuleCode, field: string, valueField: string, label: (row: Record<string, unknown>) => string) => {
      const seen = new Set<string>();
      options[`${code}:${field}`] = (items.find((item) => item.ruleCode === code)?.records ?? []).flatMap(({ row }) => {
        const optionValue = row[valueField];
        if (optionValue === null || optionValue === undefined || optionValue === "" || seen.has(String(optionValue))) return [];
        seen.add(String(optionValue));
        return [{ value: String(optionValue), label: label(row) }];
      });
    };
    collect("A02", "sku", "sku", (row) => `${value(row, "materialName")} · SKU ${value(row, "sku")}`);
    collect("A02", "uniqueCode", "uniqueItemCode", (row) => value(row, "uniqueItemCode"));
    collect("A02", "unitId", "unit", (row) => `${value(row, "unitSymbol")} · unidad ${value(row, "unit")}`);
    collect("A02", "originWarehouseId", "origin", (row) => value(row, "originWarehouseName"));
    collect("A02", "destinationWarehouseId", "destination", (row) => value(row, "destinationWarehouseName"));
    collect("A02", "workOrderId", "workOrderId", (row) => `${value(row, "workOrderCode")} · OT ${value(row, "workOrderId")}`);
    collect("A03", "operationId", "operationId", (row) => value(row, "operationName"));
    collect("A03", "machineId", "machineId", (row) => `${value(row, "machineCode")} · máquina ${value(row, "machineId")}`);
    collect("A05", "sku", "sku", (row) => `SKU ${value(row, "sku")}`);
    collect("A05", "sourceWorkOrderId", "workOrderId", (row) => `${value(row, "workOrderCode")} · OT ${value(row, "workOrderId")}`);
    return options;
  }, [items]);
  const creationRecords =
    items.find((item) => item.ruleCode === createCode)?.records ?? [];
  const creationTemplateValue = creationRecords.some(
    (record) => record.key === createKey,
  )
    ? createKey
    : "";
  const integrityTotals = useMemo(
    () => ({
      incidents: items.reduce(
        (sum, item) => sum + item.actualMonitor.incidentCount,
        0,
      ),
      open: items.reduce(
        (sum, item) => sum + item.actualMonitor.openIncidentCount,
        0,
      ),
      evidence: items.reduce(
        (sum, item) => sum + item.actualMonitor.evidenceCount,
        0,
      ),
      deliveries: items.reduce(
        (sum, item) => sum + item.actualMonitor.routingDeliveryCount,
        0,
      ),
      conversations: items.reduce(
        (sum, item) => sum + item.actualMonitor.conversationLinkCount,
        0,
      ),
    }),
    [items],
  );
  const pendingCount = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + item.records.filter((record) => record.pendingPoll).length,
        0,
      ),
    [items],
  );
  const metricLines = useMemo(() => items.flatMap((item) => item.records.flatMap((record) => {
    if (metricView === "evidence" && record.actual.evidenceCount) return [`${item.ruleCode} #${record.key} · ${record.actual.incident?.id ?? "sin incidente"} · ${record.actual.evidenceCount} evidencia(s)`];
    if (metricView === "deliveries") return record.actual.deliveries.map((delivery) => `${item.ruleCode} #${record.key} · ${delivery.recipientName} · ${delivery.channel} · ${delivery.state} · ${delivery.id}`);
    if (metricView === "conversations") return record.actual.conversationIds.map((id) => `${item.ruleCode} #${record.key} · ${id}`);
    return [];
  })), [items, metricView]);
  const laboratoryDisabled = busy || !runtime?.experiment || runtime.experiment.status === "completed";
  const controls = runtime?.experiment ? (
    <SetupControls
      runtime={runtime}
      disabled={busy}
      onConfigure={configure}
      onAdvance={advance}
      onPause={pause}
    />
  ) : null;
  const runSource = (
    action: SourceActionId,
    key: number,
    zone?: A02SourceAuthority,
  ) => void execute(() => scenarioSourceAction(action, key, zone));
  const inspect = (code: ScenarioRuleCode, record: ScenarioRecordStatus) => {
    setSelectedRecord({ code, record });
    setDetail(null);
    if (record.actual.incident)
      void incidentDetail(record.actual.incident.id)
        .then(setDetail)
        .catch(() => setError("No se pudo leer el detalle del incidente."));
  };
  const createSource = async (
    code: ScenarioRuleCode,
    requestedKey?: number,
    requestedInput?: Record<string, string | number>,
  ) => {
    const candidates =
      items.find((item) => item.ruleCode === code)?.records ?? [];
    const source =
      candidates.find((record) => record.key === requestedKey) ??
      (code === "A03"
        ? (candidates.find((record) => record.row.active !== true) ??
          candidates[0])
        : candidates[0]);
    if (!source) {
      setError(
        "No existe un registro fuente conectado que pueda usarse como plantilla.",
      );
      return;
    }
    const action: SourceActionId =
      code === "A02"
        ? "a02.prepare_dispatch"
        : code === "A03"
          ? "a03.start_work_order"
          : a05Kind === "produced"
            ? "a05.declare_produced_reel"
            : "a05.declare_remnant_reel";
    await execute(() => scenarioSourceAction(action, source.key, undefined, requestedInput));
    setCreateCode(null);
  };
  const prepareSource = async () => {
    if (!createCode) return;
    const numeric = new Set(["sku", "quantity", "unitId", "originWarehouseId", "destinationWarehouseId", "workOrderId", "operationId", "machineId", "sourceWorkOrderId"]);
    const input = Object.fromEntries(Object.entries(createInput).filter(([, fieldValue]) => fieldValue !== "").map(([field, fieldValue]) => [field, numeric.has(field) ? Number(fieldValue) : fieldValue]));
    await createSource(createCode, createKey === "" ? undefined : createKey, input);
  };
  const creationInputFor = (code: ScenarioRuleCode, key: number | "") => {
    const row = items.find((item) => item.ruleCode === code)?.records.find((record) => record.key === key)?.row ?? {};
    const fields = code === "A02"
      ? ["sku", "uniqueItemCode", "materialName", "quantity", "unit", "origin", "destination", "workOrderId"]
      : code === "A03" ? ["workOrderCode", "operationId", "machineId"] : ["serialCode", "sku", "workOrderId"];
    const names = code === "A02"
      ? ["sku", "uniqueCode", "materialName", "quantity", "unitId", "originWarehouseId", "destinationWarehouseId", "workOrderId"]
      : code === "A03" ? fields : ["serialCode", "sku", "sourceWorkOrderId"];
    return Object.fromEntries(fields.map((field, index) => [names[index]!, row[field] === null || row[field] === undefined ? "" : String(row[field])]));
  };
  const openCreate = (code: ScenarioRuleCode) => {
    const candidates =
      items.find((item) => item.ruleCode === code)?.records ?? [];
    const key = candidates[0]?.key ?? "";
    setCreateKey(key);
    setCreateInput(creationInputFor(code, key));
    setCreateCode(code);
  };
  const openHistory = async (code: ScenarioRuleCode) => {
    setHistoryCode(code);
    setBusy(true);
    try { setHistoryItems(await scenarioOperationalHistory(code, historyFilters)); }
    catch { setError("No se pudo leer el historial operativo."); }
    finally { setBusy(false); }
  };
  const capture = async () => {
    if (!runtime?.experiment) return;
    await execute(async () => {
      await captureScenarioSnapshot(
        runtime.experiment!.id,
        `captura-${Date.now()}`,
      );
      const history = await scenarioExperiment(runtime.experiment!.id);
      setSnapshots(history.snapshots.items);
      setSnapshotsOpen(true);
    });
  };
  const openSnapshots = async () => {
    if (!runtime?.experiment) return;
    await execute(async () => {
      const history = await scenarioExperiment(runtime.experiment!.id);
      setSnapshots(history.snapshots.items);
      setSnapshotsOpen(true);
    });
  };
  const closeIncident = async () => {
    const incident = selectedRecord?.record.actual.incident;
    if (!incident) return;
    await execute(() =>
      closeIncidentWithoutResolution(
        incident.id,
        closureReason,
        closureComment,
      ),
    );
    setClosureOpen(false);
    setClosureReason("");
    setClosureComment("");
    setSelectedRecord(null);
    setDetail(null);
  };
  const armFailedPoll = async () => {
    setIntegrityBefore(integrityTotals);
    await execute(() => failScenarioNextPoll(integrityCode));
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 4 }}>
      <AppBar position="sticky" elevation={0}>
        <Toolbar
          variant="dense"
          sx={{ minHeight: "40px !important", px: { xs: 1.5, sm: 3 } }}
        >
          <Typography fontWeight={700}>Monitor</Typography>
          <Typography
            variant="body2"
            sx={{ ml: 1, color: ui.color.textInverseMuted, display: { xs: "none", sm: "block" } }}
          >
            Laboratorio alertas_fake
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Button color="inherit" href="/" sx={{ display: { xs: "none", sm: "inline-flex" } }}>
            Dashboard
          </Button>
          <Button
            color="inherit"
            endIcon={<LogoutRounded />}
            onClick={onLogout}
          >
            Cerrar sesión
          </Button>
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="xl" sx={{ py: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "start" }} gap={1} sx={{ mb: 1.5 }}>
          <Box>
            <Typography variant="h1">Laboratorio alertas_fake</Typography>
            {runtime?.experiment ? (
              <RuntimeFacts runtime={runtime} />
            ) : (
              <Typography variant="body2" color="text.secondary">
                Crea un experimento para comenzar sin ejecutar un sondeo.
              </Typography>
            )}
          </Box>
          <Box sx={{ flex: 1 }} />
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Tooltip title="Capturar el estado conectado">
              <span>
                <Button
                  variant="outlined"
                  startIcon={<CameraAltOutlined />}
                  disabled={laboratoryDisabled}
                  onClick={() => void capture()}
                >
                  Capturar estado
                </Button>
              </span>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddRounded />}
              disabled={busy}
              onClick={() => setNewOpen(true)}
            >
              Nuevo experimento
            </Button>
          </Stack>
        </Stack>
        {!canAdmin && (
          <Alert severity="error">
            Este perfil no puede ejecutar el laboratorio.
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        )}
        {busy && (
          <Alert severity="info" sx={{ mb: 1.5 }}>
            Procesando una acción conectada. Los resultados se confirmarán al
            terminar.
          </Alert>
        )}
        {loading && (
          <Stack alignItems="center" sx={{ py: 5 }}>
            <CircularProgress
              size={24}
              aria-label="Leyendo estado del experimento"
            />
          </Stack>
        )}
        {!loading && runtime?.experiment && (
          <Paper
            variant="outlined"
            sx={{ mb: 1.5, p: 1.5, borderRadius: ui.control.radius }}
          >
            <Box sx={{ display: { xs: "none", md: "block" } }}>{controls}</Box>
            <Box
              sx={{
                display: { xs: "flex", md: "none" },
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="body2">Controles del experimento</Typography>
              <IconButton
                aria-label="Abrir controles"
                onClick={() => setControlsOpen(true)}
              >
                <MenuRounded />
              </IconButton>
            </Box>
          </Paper>
        )}
        <Paper
          variant="outlined"
          sx={{ borderRadius: ui.control.radius, overflow: "hidden" }}
        >
          <Tabs
            value={tab}
            onChange={(_event, value: LaboratoryTab) => setTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Áreas del laboratorio"
          >
            {tabs.map((item) => (
              <Tab key={item.id} value={item.id} label={item.label} />
            ))}
          </Tabs>
          <Box
            role="tabpanel"
            aria-label={tabs.find((item) => item.id === tab)?.label}
            sx={{
              borderTop: "1px solid",
              borderColor: "divider",
              minHeight: 260,
              p: 1.5,
            }}
          >
            {tab === "integrity" ? (
              <Stack gap={1.5}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  gap={1}
                  alignItems={{ sm: "center" }}
                >
                  <Box>
                    <Typography variant="h2">
                      Integridad del experimento
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Comprueba preservación y duplicados sin mezclar estas
                      pruebas con la operación principal.
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }} />
                  <FormControl sx={{ minWidth: 150 }}>
                    <InputLabel id="integrity-code-label">Alerta</InputLabel>
                    <Select
                      labelId="integrity-code-label"
                      label="Alerta"
                      value={integrityCode}
                      onChange={(event) =>
                        setIntegrityCode(event.target.value as ScenarioRuleCode)
                      }
                    >
                      {["A02", "A03", "A05"].map((code) => (
                        <MenuItem key={code} value={code}>
                          {code}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button
                    color="error"
                    variant="outlined"
                    disabled={laboratoryDisabled}
                    onClick={() => void armFailedPoll()}
                  >
                    Hacer fallar el próximo sondeo
                  </Button>
                </Stack>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5,1fr)" },
                    gap: 1,
                  }}
                >
                  {[
                    ["Incidentes", integrityTotals.incidents, "incidents"],
                    ["Abiertos", integrityTotals.open, "open"],
                    ["Evidencias", integrityTotals.evidence, "evidence"],
                    ["Entregas", integrityTotals.deliveries, "deliveries"],
                    [
                      "Conversaciones",
                      integrityTotals.conversations,
                      "conversations",
                    ],
                  ].map(([label, total, key]) => {
                    const inspectable = key === "evidence" || key === "deliveries" || key === "conversations";
                    return <Paper key={String(label)} component={inspectable ? "button" : "div"} type={inspectable ? "button" : undefined}
                      onClick={inspectable ? () => setMetricView(key as "evidence" | "deliveries" | "conversations") : undefined}
                      variant="outlined" sx={{ p: 1, textAlign: "left", color: "inherit", bgcolor: "background.paper", cursor: inspectable ? "pointer" : "default" }}>
                      <Typography variant="caption" color="text.secondary">
                        {label}
                      </Typography>
                      <Typography variant="h2">{total}</Typography>
                      {integrityBefore && (
                        <Typography variant="caption" color="text.secondary">
                          Antes: {integrityBefore[String(key)]}
                        </Typography>
                      )}
                    </Paper>;
                  })}
                </Box>
                <Stack direction="row" gap={1}>
                  <Button
                    variant="outlined"
                    onClick={() => void openSnapshots()}
                  >
                    Ver capturas
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    Un sondeo fallido conserva el último estado confirmado; un
                    sondeo saludable posterior procesa el cambio pendiente.
                  </Typography>
                </Stack>
              </Stack>
            ) : selected ? (
              <Stack gap={1.5}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  gap={1}
                  alignItems={{ sm: "center" }}
                >
                  <Box>
                    <Typography variant="h2">
                      {titleFor(selected.ruleCode)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Cada registro se evalúa de forma independiente mediante
                      test_database.
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }} />
                  <Button
                    variant="outlined"
                    startIcon={<HistoryRounded />}
                    onClick={() => void openHistory(selected.ruleCode)}
                  >
                    Ver historial
                  </Button>
                  <Stack direction="row" gap={0.5}>
                    <Button
                      variant="contained"
                      disabled={laboratoryDisabled}
                      onClick={() => void createSource(selected.ruleCode)}
                    >
                      {selected.ruleCode === "A02"
                        ? "Despachar material"
                        : selected.ruleCode === "A03"
                          ? "Iniciar OT"
                          : "Declarar bobina"}
                    </Button>
                    <Button
                      variant="contained"
                      disabled={laboratoryDisabled}
                      aria-label="Editar datos antes de crear"
                      onClick={() => openCreate(selected.ruleCode)}
                    >
                      Editar
                    </Button>
                  </Stack>
                </Stack>
                {selected.ruleCode === "A02" && (
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    gap={1}
                    alignItems={{ sm: "center" }}
                  >
                    <FormControl sx={{ minWidth: 220 }}>
                      <InputLabel id="authority-label">
                        Zona de influencia
                      </InputLabel>
                      <Select
                        labelId="authority-label"
                        label="Zona de influencia"
                        value={authority}
                        onChange={(event) =>
                          setAuthority(event.target.value as A02SourceAuthority)
                        }
                      >
                        <MenuItem value="origin">Solo origen</MenuItem>
                        <MenuItem value="destination">Solo destino</MenuItem>
                        <MenuItem value="both">Origen y destino</MenuItem>
                      </Select>
                    </FormControl>
                    <Typography variant="caption" color="text.secondary">
                      La zona limita las acciones fuente disponibles; no cambia
                      el criterio A02.
                    </Typography>
                  </Stack>
                )}
                <Typography variant="subtitle2">
                  Registros activos ·{" "}
                  {
                    selected.records.filter((record) =>
                      activeRecord(selected.ruleCode, record),
                    ).length
                  }
                </Typography>
                <RecordsView
                  code={selected.ruleCode}
                  records={selected.records.filter((record) =>
                    activeRecord(selected.ruleCode, record),
                  )}
                  authority={authority}
                  busy={laboratoryDisabled}
                  run={runSource}
                  inspect={(record) => inspect(selected.ruleCode, record)}
                />
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No hay datos disponibles para esta alerta.
              </Typography>
            )}
          </Box>
        </Paper>
      </Container>
      <Drawer
        anchor="bottom"
        open={controlsOpen}
        onClose={() => setControlsOpen(false)}
        ModalProps={{ keepMounted: true }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h2" sx={{ mb: 1.5 }}>
            Controles del experimento
          </Typography>
          {controls}
        </Box>
      </Drawer>
      <Dialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Nuevo experimento</DialogTitle>
        <DialogContent>
          <Stack gap={1.5} sx={{ pt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              El experimento actual quedará disponible como historial. El nuevo
              experimento comienza pausado y no ejecuta ningún sondeo.
            </Typography>
            <TextField
              label="Inicio del experimento"
              type="datetime-local"
              value={newStart}
              onChange={(event) => setNewStart(event.target.value)}
            />
            <TextField
              label="Velocidad (s/min)"
              type="number"
              value={newSeconds}
              slotProps={{ htmlInput: { min: 1, max: 60 } }}
              onChange={(event) => setNewSeconds(Number(event.target.value))}
            />
            <TextField
              label="Sondeo (min)"
              type="number"
              value={newFrequency}
              slotProps={{ htmlInput: { min: 1, max: 99 } }}
              onChange={(event) => setNewFrequency(Number(event.target.value))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={
              busy ||
              !newStart ||
              newSeconds < 1 ||
              newSeconds > 60 ||
              newFrequency < 1 ||
              newFrequency > 99
            }
            onClick={() => void create()}
          >
            Crear experimento
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(createCode)}
        onClose={() => setCreateCode(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {createCode === "A02"
            ? "Despachar material"
            : createCode === "A03"
              ? "Iniciar OT"
              : "Declarar bobina"}
        </DialogTitle>
        <DialogContent>
          <Stack gap={1.5} sx={{ pt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Elige la plantilla protegida de test_database. La acción asigna o
              conserva el identificador fuente real al confirmar.
            </Typography>
            <FormControl>
              <InputLabel id="source-template-label">
                Plantilla fuente
              </InputLabel>
              <Select
                labelId="source-template-label"
                label="Plantilla fuente"
                value={creationTemplateValue}
                onChange={(event) => {
                  const key = Number(event.target.value);
                  setCreateKey(key);
                  if (createCode) setCreateInput(creationInputFor(createCode, key));
                }}
              >
                {creationRecords.map((record) => (
                  <MenuItem key={record.key} value={record.key}>
                    {createCode === "A03"
                      ? value(record.row, "workOrderCode")
                      : record.key}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {createCode && Object.entries(createInput).map(([field, fieldValue]) => {
              const labels: Record<string, string> = {
                sku: "SKU", uniqueCode: "Código único", materialName: "Descripción", quantity: "Cantidad", unitId: "Unidad", originWarehouseId: "Almacén de origen", destinationWarehouseId: "Almacén de destino",
                workOrderId: "OT", workOrderCode: "Código de OT", operationId: "Operación", machineId: "Máquina",
                serialCode: "Código único de bobina", sourceWorkOrderId: "OT de origen",
              };
              const numeric = !["uniqueCode", "materialName", "workOrderCode", "serialCode"].includes(field);
              const options = creationOptions[`${createCode}:${field}`] ?? [];
              if (creationSelectFields.has(field)) return <TextField key={field} select label={labels[field] ?? field} value={fieldValue}
                onChange={(event) => setCreateInput((current) => ({ ...current, [field]: event.target.value }))}>
                {field === "uniqueCode" && <MenuItem value="">Sin código único</MenuItem>}
                {options.length === 0 && field !== "uniqueCode" && <MenuItem value={fieldValue} disabled>No hay opciones fuente disponibles</MenuItem>}
                {options.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
              </TextField>;
              return <TextField key={field} label={labels[field] ?? field} type={numeric ? "number" : "text"} value={fieldValue}
                {...(numeric ? { slotProps: { htmlInput: { min: field === "quantity" ? 0.001 : 1 } } } : {})}
                onChange={(event) => setCreateInput((current) => ({ ...current, [field]: event.target.value }))} />;
            })}
            {createCode === "A05" && (
              <FormControl>
                <InputLabel id="reel-kind-label">Tipo de bobina</InputLabel>
                <Select
                  labelId="reel-kind-label"
                  label="Tipo de bobina"
                  value={a05Kind}
                  onChange={(event) =>
                    setA05Kind(event.target.value as "produced" | "remnant")
                  }
                >
                  <MenuItem value="produced">Producida</MenuItem>
                  <MenuItem value="remnant">Remanente</MenuItem>
                </Select>
              </FormControl>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateCode(null)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={busy || createKey === ""}
            onClick={() => void prepareSource()}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(historyCode)}
        onClose={() => setHistoryCode(null)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>Historial completo · {historyCode}</DialogTitle>
        <DialogContent dividers>
          {historyCode && (
            <Stack gap={1.5}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3,minmax(0,1fr))" }, gap: 1 }}>
                {([[
                  "experimentId", "Experimento (nombre o ID)"], ["from", "Desde"], ["to", "Hasta"], ["sku", "SKU"], ["uniqueCode", "Código único"],
                  ["destination", "Destino"], ["sourceState", "Estado fuente"]] as const).map(([field, label]) =>
                  <TextField key={field} label={label} type={field === "from" || field === "to" ? "datetime-local" : "text"}
                    value={historyFilters[field]} onChange={(event) => setHistoryFilters((current) => ({ ...current, [field]: event.target.value }))} />)}
                <TextField select label="Puntualidad" value={historyFilters.timingOutcome}
                  onChange={(event) => setHistoryFilters((current) => ({ ...current, timingOutcome: event.target.value }))}>
                  <MenuItem value="">Todos</MenuItem><MenuItem value="active">Activo</MenuItem><MenuItem value="on_time">A tiempo</MenuItem><MenuItem value="late">Tarde</MenuItem>
                </TextField>
                <TextField select label="Resultado de alerta" value={historyFilters.incidentOutcome}
                  onChange={(event) => setHistoryFilters((current) => ({ ...current, incidentOutcome: event.target.value }))}>
                  <MenuItem value="">Todos</MenuItem><MenuItem value="none">Sin alerta</MenuItem><MenuItem value="open">Abierta</MenuItem><MenuItem value="resolved">Resuelta</MenuItem><MenuItem value="closed_without_resolution">Cerrada sin resolución</MenuItem>
                </TextField>
              </Box>
              <Button variant="outlined" disabled={busy} onClick={() => void scenarioOperationalHistory(historyCode, historyFilters).then(setHistoryItems).catch(() => setError("No se pudo filtrar el historial operativo."))}>Aplicar filtros</Button>
              {historyItems.length === 0 ? <Typography variant="body2" color="text.secondary">No hay registros que coincidan.</Typography> : historyItems.map((item) => (
                <Paper key={item.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} gap={1} justifyContent="space-between">
                    <Box><Typography variant="subtitle2">#{item.sourceKey} · {item.experimentName}</Typography>
                      <Typography variant="caption" color="text.secondary">{timestamp(item.firstAt)} → {timestamp(item.lastAt)} · {item.eventCount} evento(s)</Typography></Box>
                    <Stack direction="row" gap={0.5} flexWrap="wrap">
                      <Chip size="small" variant="outlined" label={item.timingOutcome === "on_time" ? "A tiempo" : item.timingOutcome === "late" ? "Tarde" : "Activo"} />
                      <Chip size="small" variant="outlined" label={item.incidentOutcome === "none" ? "Sin alerta" : item.incidentOutcome} />
                    </Stack>
                  </Stack>
                  <Typography variant="body2" sx={{ mt: 1 }}>Acciones: {item.actionIds.join(" → ")}</Typography>
                  <Typography variant="caption" color="text.secondary">Duración final: {item.durationMinutes === null ? "—" : `${item.durationMinutes} min`} · Estado fuente: {item.sourceState}</Typography>
                </Paper>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryCode(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(selectedRecord)}
        onClose={() => {
          setSelectedRecord(null);
          setDetail(null);
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Inspección · {selectedRecord?.code} #{selectedRecord?.record.key}
        </DialogTitle>
        <DialogContent dividers>
          {selectedRecord && (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(3,1fr)" },
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="h3">Fuente actual</Typography>
                <RecordFacts
                  code={selectedRecord.code}
                  record={selectedRecord.record}
                />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Cambio pendiente:{" "}
                  {selectedRecord.record.pendingPoll ? "Sí" : "No"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="h3">Resultado esperado</Typography>
                <Typography variant="body2">
                  {selectedRecord.record.expected.triggered
                    ? `Abrir o conservar una alerta: ${selectedRecord.record.expected.reasons.map((item) => reasonLabel[item] ?? item).join(" y ")}.`
                    : "No debe existir una alerta abierta para la condición actual."}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Comparación:{" "}
                  {selectedRecord.record.comparison.matches
                    ? "Coincide"
                    : selectedRecord.record.pendingPoll
                      ? "Pendiente de sondeo"
                      : selectedRecord.record.comparison.mismatches.join(", ")}
                </Typography>
              </Box>
              <Box>
                <Typography variant="h3">Monitor real</Typography>
                <Typography variant="body2">
                  Incidente:{" "}
                  {selectedRecord.record.actual.incident?.id ?? "Ninguno"}
                </Typography>
                <Typography variant="body2">
                  Estado:{" "}
                  {selectedRecord.record.actual.incident?.lifecycle ??
                    "Sin incidente"}
                </Typography>
                <Typography variant="body2">
                  Ocurrencia:{" "}
                  {selectedRecord.record.actual.incident?.occurrence ?? 0}
                </Typography>
                <Typography variant="body2">
                  Cursor:{" "}
                  {selectedRecord.record.actual.latestChangeCursor ??
                    "Aún no existe"}
                </Typography>
                <Typography variant="body2">
                  Evidencias: {selectedRecord.record.actual.evidenceCount} ·
                  Entregas: {selectedRecord.record.actual.deliveryCount} ·
                  Conversaciones:{" "}
                  {selectedRecord.record.actual.conversationCount} · Mensajes:{" "}
                  {selectedRecord.record.actual.messageCount}
                </Typography>
                <Typography variant="body2">
                  Demora de detección:{" "}
                  {selectedRecord.record.actual.detectionDelayMilliseconds ===
                  null
                    ? "—"
                    : `${selectedRecord.record.actual.detectionDelayMilliseconds} ms`}
                </Typography>
                {selectedRecord.record.actual.deliveries.map((delivery) => (
                  <Typography
                    key={delivery.id}
                    variant="caption"
                    display="block"
                  >
                    {delivery.recipientName} · {delivery.channel} ·{" "}
                    {delivery.state} · {delivery.id}
                  </Typography>
                ))}
                {selectedRecord.record.actual.conversationIds.map((id) => (
                  <Typography key={id} variant="caption" display="block">
                    Conversación: {id}
                  </Typography>
                ))}
                {selectedRecord.record.actual.messageIds.map((id) => (
                  <Typography key={id} variant="caption" display="block">
                    Tarjeta/mensaje: {id}
                  </Typography>
                ))}
                {detail?.related.length ? (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    Hay {detail.related.length} incidente(s) relacionado(s);
                    verifica que pertenezcan a otra identidad fuente.
                  </Alert>
                ) : null}
                {detail?.evidence.map((evidence) => (
                  <Paper
                    key={evidence.id}
                    variant="outlined"
                    sx={{ p: 1, mt: 1 }}
                  >
                    <Typography variant="caption">
                      {evidence.id} · {timestamp(evidence.observedAt)}
                    </Typography>
                    <Typography variant="body2">
                      {evidence.reasons
                        .map((item) => reasonLabel[item] ?? item)
                        .join(", ") || "Condición clara"}
                    </Typography>
                  </Paper>
                ))}
                {selectedRecord.record.actual.incident?.lifecycle ===
                  "open" && (
                  <Button
                    color="error"
                    variant="outlined"
                    sx={{ mt: 1 }}
                    onClick={() => setClosureOpen(true)}
                  >
                    Cerrar sin resolución
                  </Button>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setSelectedRecord(null);
              setDetail(null);
            }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={closureOpen}
        onClose={() => setClosureOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Cerrar incidente sin resolución</DialogTitle>
        <DialogContent>
          <Stack gap={1.5} sx={{ pt: 0.5 }}>
            <Alert severity="warning">
              Esto cambia solo Monitor; no modifica el registro fuente.
            </Alert>
            <FormControl>
              <InputLabel id="closure-reason-label">Motivo</InputLabel>
              <Select
                labelId="closure-reason-label"
                label="Motivo"
                value={closureReason}
                onChange={(event) => setClosureReason(event.target.value)}
              >
                <MenuItem value="unreconstructable_history">
                  Historia no reconstruible
                </MenuItem>
                <MenuItem value="source_record_unrecoverable">
                  Registro fuente no recuperable
                </MenuItem>
                <MenuItem value="item_not_traceable">
                  Material no localizable
                </MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Comentario obligatorio"
              multiline
              minRows={3}
              value={closureComment}
              onChange={(event) => setClosureComment(event.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClosureOpen(false)}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            disabled={!closureReason || !closureComment.trim() || busy}
            onClick={() => void closeIncident()}
          >
            Confirmar cierre
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(metricView)} onClose={() => setMetricView(null)} fullWidth maxWidth="md">
        <DialogTitle>{metricView === "evidence" ? "Evidencias" : metricView === "deliveries" ? "Entregas y destinatarios" : "Conversaciones"}</DialogTitle>
        <DialogContent dividers>
          <Stack gap={1}>{metricLines.length ? metricLines.map((line) => <Typography key={line} variant="body2">{line}</Typography>) : <Typography variant="body2" color="text.secondary">No hay objetos conectados para este indicador.</Typography>}</Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setMetricView(null)}>Cerrar</Button></DialogActions>
      </Dialog>
      <Dialog
        open={snapshotsOpen}
        onClose={() => setSnapshotsOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Capturas estructuradas</DialogTitle>
        <DialogContent dividers>
          <Stack gap={1}>
            {snapshots.length ? (
              snapshots.map((snapshot) => (
                <Paper
                  key={snapshot.id}
                  variant="outlined"
                  sx={{ p: 1, display: "flex", alignItems: "center", gap: 1 }}
                >
                  <Box>
                    <Typography variant="body2">{snapshot.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {timestamp(snapshot.capturedBusinessTime)} · {snapshot.id}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }} />
                  <Button onClick={() => setSnapshotView(snapshot)}>
                    Ver captura
                  </Button>
                </Paper>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No hay capturas todavía.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSnapshotsOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(snapshotView)}
        onClose={() => setSnapshotView(null)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>{snapshotView?.label}</DialogTitle>
        <DialogContent dividers>
          <Box
            component="pre"
            sx={{
              m: 0,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              fontSize: 12,
            }}
          >
            {snapshotView ? JSON.stringify(snapshotView.payload, null, 2) : ""}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSnapshotView(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
      {pendingCount > 0 && !loading && (
        <Alert
          severity="info"
          role="status"
          sx={{
            position: "fixed",
            right: { xs: 8, sm: 20 },
            bottom: { xs: 8, sm: 20 },
            zIndex: (theme) => theme.zIndex.snackbar,
            boxShadow: 3,
            maxWidth: 380,
          }}
        >
          {pendingCount} cambio(s) fuente esperan un sondeo completo.
        </Alert>
      )}
    </Box>
  );
}
