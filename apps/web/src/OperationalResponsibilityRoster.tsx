import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import ArrowDownwardRounded from "@mui/icons-material/ArrowDownwardRounded";
import ArrowDropDownRounded from "@mui/icons-material/ArrowDropDownRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import ArrowUpwardRounded from "@mui/icons-material/ArrowUpwardRounded";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import EventRepeatRounded from "@mui/icons-material/EventRepeatRounded";
import FileUploadRounded from "@mui/icons-material/FileUploadRounded";
import FilterAltOffRounded from "@mui/icons-material/FilterAltOffRounded";
import FilterAltRounded from "@mui/icons-material/FilterAltRounded";
import MenuRounded from "@mui/icons-material/MenuRounded";
import PersonAddRounded from "@mui/icons-material/PersonAddRounded";
import PersonRounded from "@mui/icons-material/PersonRounded";
import PersonOffRounded from "@mui/icons-material/PersonOffRounded";
import PersonOutlineRounded from "@mui/icons-material/PersonOutlineRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import RestoreRounded from "@mui/icons-material/RestoreRounded";
import SwapHorizRounded from "@mui/icons-material/SwapHorizRounded";
import type { RosterAssignment, SessionResponse } from "@monitor/contracts";
import { monitorSemanticTokens, monitorTokens } from "@monitor/design-system";
import {
  Alert,
  AppBar,
  Box,
  Button,
  ButtonBase,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Select,
  Snackbar,
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
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { readSheet } from "read-excel-file/browser";
import { type ChangeEvent, type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  addDaysKey,
  cumulativeRotationShift,
  dateFromKey,
  dayDifference,
  localDateKey,
  moveRotationCoverages,
  moveRotationPattern,
  rotationGapForDate,
  type RotationAdjustment,
  type RotationGapCoverage,
} from "./rotationSchedule";
import { ApiRequestError, rosterAssignments, saveRosterAssignments } from "./api";
import { mergeRosterAssignments } from "./rosterPersistence";

type RosterView = "responsibilities" | "rotation";
type AssignmentScope = "factory" | "operation" | "operation_group" | "machine_group" | "warehouse_group";
type AssignmentState = "active" | "future" | "inactive";
type RotationPhase = "day" | "night" | "rest";
type RotationScheduleId = string;
type OperationMode = "blocked" | "single" | "multiple";
type WarehouseType = "Materias primas" | "Productos en proceso";
type ResponsibilityColumn = "person" | "position" | "area" | "scope" | "group" | "validity" | "state";
type SortDirection = "asc" | "desc";

interface Responsibility {
  id: string;
  person: string;
  position: string;
  operations: string[];
  warehouseType: WarehouseType | null;
  scope: AssignmentScope | null;
  group: WorkerGroup["id"] | null;
  validFrom: string;
  validTo: string | null;
  state: AssignmentState;
  setupComplete?: boolean;
}

interface RosterImportError {
  row: number;
  column: string;
  value: string;
  message: string;
}

interface RosterImportResult {
  filename: string;
  rows: RosterImportEntry[];
  errors: RosterImportError[];
  duplicateReviews: RosterDuplicateReview[];
}

interface RosterImportEntry {
  row: number;
  value: Responsibility;
  provided: string[];
  targetId: string | null;
}

interface RosterDuplicateReview {
  id: string;
  row: number;
  person: string;
  match: string;
  source: "database" | "excel";
  sourceRow: number | null;
  matchId: string | null;
}

interface RosterOverwriteChange {
  field: string;
  current: string;
  imported: string;
}

interface Worker {
  id: string;
  name: string;
  operation: string;
  availability: "available" | "vacation" | "sick" | "replacement";
  note?: string;
}

interface WorkerGroup {
  id: string;
  name: string;
  operation: string;
  offset: number;
  workers: Worker[];
}

interface RotationPatternGroup {
  id: string;
  name: string;
  anchorScheduleId: RotationScheduleId;
  daysPerPhase: number;
}

interface RotationSchedule {
  id: RotationScheduleId;
  name: string;
  start: string | null;
  end: string | null;
  isRest: boolean;
}

interface RotationPattern {
  effectiveFrom: string;
  schedules: RotationSchedule[];
  groups: RotationPatternGroup[];
}

interface WorkerScheduleException {
  id: string;
  operation: string;
  workerId: string;
  kind: "group" | "schedule" | "custom";
  startDate: string;
  endDate: string;
  groupId: string | null;
  groupName: string | null;
  scheduleId: RotationScheduleId | null;
  customScheduleName: string | null;
  customStart: string | null;
  customEnd: string | null;
}

const ui = monitorSemanticTokens;
const operations = [
  "Extrusión",
  "Laminación",
  "Corte",
  "Impresión",
  "Sellado",
  "Exlam",
  "Peletizado",
  "Recuperación",
  "Triturado",
];
const warehouseTypes: WarehouseType[] = ["Materias primas", "Productos en proceso"];
const scopeLabels: Record<AssignmentScope, string> = {
  factory: "Toda la fábrica",
  operation: "Operación",
  operation_group: "Operación + grupo",
  machine_group: "Máquina + grupo",
  warehouse_group: "Almacén + grupo",
};
const stateLabels: Record<AssignmentState, string> = {
  active: "Activa",
  future: "Pendiente",
  inactive: "Inactiva",
};
const phaseLabels: Record<RotationPhase, string> = {
  day: "Día",
  night: "Noche",
  rest: "Descanso",
};

const defaultRotationPattern = (): RotationPattern => ({
  effectiveFrom: "2026-07-25",
  schedules: [
    { id: "day", name: "Día", start: "07:00", end: "19:00", isRest: false },
    { id: "night", name: "Noche", start: "19:00", end: "07:00", isRest: false },
    { id: "rest", name: "Descanso", start: null, end: null, isRest: true },
  ],
  groups: [
    { id: "A", name: "A", anchorScheduleId: "rest", daysPerPhase: 2 },
    { id: "B", name: "B", anchorScheduleId: "day", daysPerPhase: 2 },
    { id: "C", name: "C", anchorScheduleId: "night", daysPerPhase: 2 },
  ],
});
const positionOptions = [
  "Gerente de fábrica",
  "Supervisor de turno de operación",
  "Líder técnico",
  "Operador de máquina",
  "Planificador de materiales",
  "Planificador",
  "Despachador de almacén",
  "Supervisor de almacén",
  "Operador de proceso",
  "Supervisor de proceso",
] as const;

type Position = typeof positionOptions[number];

interface PositionRule {
  scope: AssignmentScope;
  operationMode: OperationMode;
  warehouseMode: "blocked" | "select" | "work_in_process";
  groupRequired: boolean;
}

const positionRules: Record<Position, PositionRule> = {
  "Gerente de fábrica": { scope: "factory", operationMode: "blocked", warehouseMode: "blocked", groupRequired: false },
  "Supervisor de turno de operación": { scope: "operation_group", operationMode: "multiple", warehouseMode: "blocked", groupRequired: true },
  "Líder técnico": { scope: "operation", operationMode: "multiple", warehouseMode: "blocked", groupRequired: false },
  "Operador de máquina": { scope: "machine_group", operationMode: "single", warehouseMode: "blocked", groupRequired: true },
  "Planificador de materiales": { scope: "factory", operationMode: "blocked", warehouseMode: "blocked", groupRequired: false },
  "Planificador": { scope: "factory", operationMode: "blocked", warehouseMode: "blocked", groupRequired: false },
  "Despachador de almacén": { scope: "warehouse_group", operationMode: "blocked", warehouseMode: "select", groupRequired: true },
  "Supervisor de almacén": { scope: "warehouse_group", operationMode: "blocked", warehouseMode: "select", groupRequired: true },
  "Operador de proceso": { scope: "warehouse_group", operationMode: "blocked", warehouseMode: "work_in_process", groupRequired: true },
  "Supervisor de proceso": { scope: "warehouse_group", operationMode: "blocked", warehouseMode: "work_in_process", groupRequired: true },
};

function ruleFor(position: string): PositionRule | null {
  return positionRules[position as Position] ?? null;
}

function responsibilityWithSetupStatus(item: Responsibility): Responsibility {
  const rule = ruleFor(item.position);
  const setupComplete = Boolean(rule)
    && (!rule!.groupRequired || Boolean(item.group))
    && (rule!.operationMode === "blocked" || item.operations.length > 0)
    && (rule!.warehouseMode === "blocked" || Boolean(item.warehouseType));
  return {
    ...item,
    setupComplete,
    state: setupComplete
      ? item.setupComplete === false && item.state === "future" ? "active" : item.state
      : "future",
  };
}

function responsibilityWithBulkArea(item: Responsibility, value: string): { item: Responsibility; applied: boolean } {
  const rule = ruleFor(item.position);
  if (!rule) return { item, applied: false };
  if (operations.includes(value) && rule.operationMode !== "blocked") {
    return {
      applied: true,
      item: responsibilityWithSetupStatus({
        ...item,
        scope: rule.scope,
        operations: [value],
        warehouseType: null,
      }),
    };
  }
  if (warehouseTypes.includes(value as WarehouseType) && rule.warehouseMode === "select") {
    return {
      applied: true,
      item: responsibilityWithSetupStatus({
        ...item,
        scope: rule.scope,
        operations: [],
        warehouseType: value as WarehouseType,
      }),
    };
  }
  if (value === "Productos en proceso" && rule.warehouseMode === "work_in_process") {
    return {
      applied: true,
      item: responsibilityWithSetupStatus({
        ...item,
        scope: rule.scope,
        operations: [],
        warehouseType: "Productos en proceso",
      }),
    };
  }
  return { item, applied: false };
}

function responsibilityArea(item: Responsibility) {
  if (item.setupComplete === false || !item.scope) return "Por completar";
  if (item.scope === "factory") return "Toda la fábrica";
  if (item.warehouseType) return `Almacén de ${item.warehouseType.toLocaleLowerCase("es-PE")}`;
  return item.operations.join(" + ");
}

const monthNumbers: Record<string, string> = {
  ene: "01",
  feb: "02",
  mar: "03",
  abr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  ago: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dic: "12",
};

const monthNames = Object.fromEntries(Object.entries(monthNumbers).map(([name, number]) => [number, name]));

function dateInputValue(value: string | null) {
  if (!value) return "";
  const [day, month, year] = value.split(" ");
  const monthNumber = month ? monthNumbers[month] : undefined;
  return day && monthNumber && year ? `${year}-${monthNumber}-${day.padStart(2, "0")}` : "";
}

function displayDate(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-");
  const monthName = month ? monthNames[month] : undefined;
  return day && monthName && year ? `${day} ${monthName} ${year}` : null;
}

function persistedResponsibility(item: Responsibility): RosterAssignment {
  return {
    ...item,
    position: item.position as RosterAssignment["position"],
    operations: item.operations as RosterAssignment["operations"],
    validFrom: dateInputValue(item.validFrom),
    validTo: dateInputValue(item.validTo) || null,
    setupComplete: item.setupComplete !== false,
  };
}

function displayedResponsibility(item: RosterAssignment): Responsibility {
  return {
    ...item,
    validFrom: displayDate(item.validFrom) ?? item.validFrom,
    validTo: item.validTo ? displayDate(item.validTo) ?? item.validTo : null,
  };
}

function responsibilityEquals(left: Responsibility, right: Responsibility) {
  return left.id === right.id
    && left.person === right.person
    && left.position === right.position
    && left.operations.length === right.operations.length
    && left.operations.every((operation, index) => operation === right.operations[index])
    && left.warehouseType === right.warehouseType
    && left.scope === right.scope
    && left.group === right.group
    && left.validFrom === right.validFrom
    && left.validTo === right.validTo
    && left.state === right.state
    && (left.setupComplete !== false) === (right.setupComplete !== false);
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-PE");
}

function normalizePersonName(value: string) {
  return normalizeSearchText(value)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeExactPersonName(value: string) {
  return value
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es-PE");
}

const weekdayLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function monthStart(monthOffset: number) {
  return new Date(2026, 6 + monthOffset, 1, 12);
}

function monthTitle(date: Date) {
  const label = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" }).format(date);
  return label.charAt(0).toLocaleUpperCase() + label.slice(1);
}

function monthCalendarDates(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = (new Date(year, monthIndex, 1, 12).getDay() + 6) % 7;
  const numberOfDays = new Date(year, monthIndex + 1, 0, 12).getDate();
  const cells: Array<Date | null> = Array(firstWeekday).fill(null);
  for (let day = 1; day <= numberOfDays; day += 1) cells.push(new Date(year, monthIndex, day, 12));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function editDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0]!;
    previous[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = previous[rightIndex]!;
      previous[rightIndex] = Math.min(
        previous[rightIndex]! + 1,
        previous[rightIndex - 1]! + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[right.length]!;
}

function isLikelyDuplicateName(candidate: string, existing: string) {
  const normalizedCandidate = normalizePersonName(candidate);
  const normalizedExisting = normalizePersonName(existing);
  if (!normalizedCandidate || !normalizedExisting) return false;
  if (normalizedCandidate === normalizedExisting) return true;
  if (Math.min(normalizedCandidate.length, normalizedExisting.length) < 5) return false;

  const similarity = 1 - editDistance(normalizedCandidate, normalizedExisting) / Math.max(normalizedCandidate.length, normalizedExisting.length);
  return similarity >= 0.86;
}

function duplicateSimilarity(candidate: string, existing: string) {
  const normalizedCandidate = normalizePersonName(candidate);
  const normalizedExisting = normalizePersonName(existing);
  if (!normalizedCandidate || !normalizedExisting) return 0;
  return 1 - editDistance(normalizedCandidate, normalizedExisting) / Math.max(normalizedCandidate.length, normalizedExisting.length);
}

const importHeaderAliases: Record<string, string> = {
  persona: "Persona",
  nombre: "Persona",
  "nombre completo": "Persona",
  grupo: "Grupo",
  posicion: "Posición",
  "posicion estandarizada": "Posición",
  operacion: "Área",
  operaciones: "Área",
  area: "Área",
  almacen: "Área",
  "tipo de almacen": "Área",
  cobertura: "Cobertura",
  "vigente desde": "Vigente desde",
  "vigente hasta": "Vigente hasta",
  estado: "Estado",
};

function importText(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value == null ? "" : String(value).trim();
}

function canonicalValue<T extends string>(value: string, options: readonly T[]) {
  const normalized = normalizeSearchText(value.trim());
  return options.find((option) => normalizeSearchText(option) === normalized) ?? null;
}

function parseImportDate(value: unknown) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }
  const text = importText(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const parsed = new Date(`${text}T12:00:00`);
    return Number.isNaN(parsed.getTime()) || localDateKey(parsed) !== text ? null : text;
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(text)) {
    const [day, month, year] = text.split("/");
    const normalized = `${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`;
    const parsed = new Date(`${normalized}T12:00:00`);
    return Number.isNaN(parsed.getTime()) || localDateKey(parsed) !== normalized ? null : normalized;
  }
  return null;
}

function validateRosterRows(rows: unknown[][], existingPeople: Responsibility[], filename: string): RosterImportResult {
  const errors: RosterImportError[] = [];
  const imported: RosterImportEntry[] = [];
  const duplicateReviews: RosterDuplicateReview[] = [];
  const headerRow = rows[0] ?? [];
  const headers = new Map<string, number>();

  headerRow.forEach((cell, index) => {
    const raw = importText(cell);
    const canonical = importHeaderAliases[normalizeSearchText(raw)];
    if (!canonical) {
      if (raw) errors.push({ row: 1, column: raw, value: raw, message: "Columna no reconocida." });
      return;
    }
    if (headers.has(canonical)) errors.push({ row: 1, column: canonical, value: raw, message: "La columna está repetida." });
    else headers.set(canonical, index);
  });

  for (const required of ["Persona"]) {
    if (!headers.has(required)) errors.push({ row: 1, column: required, value: "", message: "Falta esta columna obligatoria." });
  }
  if (errors.length) return { filename, rows: [], errors, duplicateReviews };

  const get = (row: unknown[], column: string) => {
    const index = headers.get(column);
    return index === undefined ? null : row[index];
  };
  const encounteredNames: Array<{ name: string; row: number }> = [];

  rows.slice(1).forEach((row, rowIndex) => {
    const excelRow = rowIndex + 2;
    if (row.every((cell) => !importText(cell))) return;
    const person = importText(get(row, "Persona"));
    const positionText = importText(get(row, "Posición"));
    const areaText = importText(get(row, "Área"));
    const coverageText = importText(get(row, "Cobertura"));
    const groupText = importText(get(row, "Grupo"));
    const stateText = importText(get(row, "Estado"));
    const fromRaw = get(row, "Vigente desde");
    const toRaw = get(row, "Vigente hasta");

    const rowErrors: RosterImportError[] = [];
    const error = (column: string, value: string, message: string) => rowErrors.push({ row: excelRow, column, value, message });
    const exactExisting = person
      ? existingPeople.find((item) => normalizeExactPersonName(person) === normalizeExactPersonName(item.person)) ?? null
      : null;
    const exactExcel = person
      ? encounteredNames.find((item) => normalizeExactPersonName(person) === normalizeExactPersonName(item.name)) ?? null
      : null;
    if (!person) error("Persona", person, "El nombre es obligatorio.");
    else if (exactExcel) {
      error("Persona", person, `Duplica la fila ${exactExcel.row} del Excel: “${exactExcel.name}”.`);
    } else if (!exactExisting) {
      const candidates = [
        ...existingPeople.map((item) => ({ name: item.person, id: item.id, source: "database" as const, row: null })),
        ...encounteredNames.map((item) => ({ name: item.name, id: null, source: "excel" as const, row: item.row })),
      ];
      const possibleDuplicate = candidates
        .filter((item) => isLikelyDuplicateName(person, item.name))
        .sort((left, right) => duplicateSimilarity(person, right.name) - duplicateSimilarity(person, left.name))[0];
      if (possibleDuplicate) {
        duplicateReviews.push({
          id: `duplicate-${excelRow}`,
          row: excelRow,
          person,
          match: possibleDuplicate.name,
          source: possibleDuplicate.source,
          sourceRow: possibleDuplicate.row,
          matchId: possibleDuplicate.id,
        });
      }
    }

    const position = positionText ? canonicalValue(positionText, positionOptions) : exactExisting?.position as Position | null ?? null;
    if (positionText && !position) error("Posición", positionText, "No coincide con una posición estandarizada.");
    const rule = position ? positionRules[position] : null;
    const positionChanged = Boolean(exactExisting && positionText && position !== exactExisting.position);

    const importedGroup = groupText ? groupText.replace(/^grupo\s+/i, "").trim().slice(0, 40) : null;
    if (groupText && !importedGroup) error("Grupo", groupText, "El grupo necesita un nombre.");
    const group = groupText
      ? importedGroup
      : rule?.groupRequired ? exactExisting?.group ?? null : null;

    const operationValues = !rule || rule.operationMode === "blocked"
      ? []
      : areaText
        ? areaText.split(/[,;]+/).map((item) => item.trim()).filter(Boolean)
        : positionChanged ? [] : exactExisting?.operations ?? [];
    const canonicalOperations = operationValues.map((value) => canonicalValue(value, operations));
    canonicalOperations.forEach((value, index) => {
      if (!value) error("Área", operationValues[index] ?? "", "No coincide con una operación válida.");
    });

    const warehouseType = !rule || rule.warehouseMode === "blocked"
      ? null
      : areaText
        ? canonicalValue(areaText, warehouseTypes)
        : rule.warehouseMode === "work_in_process"
          ? "Productos en proceso"
          : positionChanged ? null : exactExisting?.warehouseType ?? null;
    if (rule?.warehouseMode !== "blocked" && areaText && !warehouseType) {
      error("Área", areaText, "Use Materias primas o Productos en proceso.");
    }

    if (!rule) {
      if (areaText) error("Área", areaText, "Complete primero la posición.");
      if (coverageText) error("Cobertura", coverageText, "La cobertura se deriva de la posición; déjela vacía.");
    } else {
      if (!rule.groupRequired && groupText) error("Grupo", groupText, "Esta posición no utiliza grupo.");
      if (rule.operationMode === "blocked" && rule.warehouseMode === "blocked" && areaText) error("Área", areaText, "Esta posición no utiliza área.");
      if (rule.operationMode === "single" && areaText && canonicalOperations.filter(Boolean).length !== 1) error("Área", areaText, "Esta posición permite exactamente una operación.");
      if (rule.warehouseMode === "work_in_process" && areaText && warehouseType !== "Productos en proceso") error("Área", areaText, "Esta posición pertenece a Productos en proceso.");
      if (coverageText && canonicalValue(coverageText, [scopeLabels[rule.scope]]) === null) {
        error("Cobertura", coverageText, `Debe ser “${scopeLabels[rule.scope]}” para esta posición.`);
      }
    }

    const validFrom = fromRaw ? parseImportDate(fromRaw) : exactExisting ? dateInputValue(exactExisting.validFrom) : "2026-07-26";
    const validTo = toRaw ? parseImportDate(toRaw) : exactExisting ? dateInputValue(exactExisting.validTo) || null : null;
    if (fromRaw && !validFrom) error("Vigente desde", importText(fromRaw), "Use una fecha válida: dd/mm/aaaa o aaaa-mm-dd.");
    if (toRaw && !validTo) error("Vigente hasta", importText(toRaw), "Use una fecha válida: dd/mm/aaaa o aaaa-mm-dd.");
    if (validFrom && validTo && validTo < validFrom) error("Vigente hasta", importText(toRaw), "No puede ser anterior a Vigente desde.");

    const state = stateText
      ? canonicalValue(stateText, ["Activa", "Pendiente", "Inactiva"] as const)
      : exactExisting ? stateLabels[exactExisting.state] : "Activa";
    if (stateText && !state) error("Estado", stateText, "Use Activa, Pendiente o Inactiva.");

    if (rowErrors.length) {
      errors.push(...rowErrors);
      return;
    }
    encounteredNames.push({ name: person, row: excelRow });
    const complete = rule
      ? (!rule.groupRequired || Boolean(group))
        && (rule.operationMode !== "single" || canonicalOperations.filter(Boolean).length === 1)
        && (rule.operationMode !== "multiple" || canonicalOperations.filter(Boolean).length >= 1)
        && (rule.warehouseMode !== "select" || Boolean(warehouseType))
      : false;
    imported.push({
      row: excelRow,
      targetId: exactExisting?.id ?? null,
      provided: [
        positionText && "position",
        areaText && "area",
        coverageText && "coverage",
        groupText && "group",
        fromRaw && "validFrom",
        toRaw && "validTo",
        stateText && "state",
      ].filter((value): value is string => Boolean(value)),
      value: {
        id: exactExisting?.id ?? `import-${Date.now()}-${excelRow}`,
        person,
        position: position ?? "",
        operations: canonicalOperations.filter((value): value is string => value !== null),
        warehouseType: rule?.warehouseMode === "work_in_process" ? "Productos en proceso" : warehouseType,
        scope: rule?.scope ?? null,
        group,
        validFrom: displayDate(validFrom!) ?? exactExisting?.validFrom ?? "26 jul 2026",
        validTo: validTo ? displayDate(validTo) : null,
        state: complete ? (state === "Inactiva" ? "inactive" : state === "Pendiente" ? "future" : "active") : "future",
        setupComplete: complete,
      },
    });
  });

  if (!imported.length && !errors.length) errors.push({ row: 2, column: "Archivo", value: "", message: "El archivo no contiene personas." });
  return { filename, rows: errors.length ? [] : imported, errors, duplicateReviews };
}

function mergeRosterImport(existing: Responsibility, entry: RosterImportEntry): Responsibility {
  const provided = new Set(entry.provided);
  const imported = entry.value;
  const positionChanged = provided.has("position") && imported.position !== existing.position;
  return responsibilityWithSetupStatus({
    ...existing,
    person: imported.person,
    position: positionChanged ? imported.position : existing.position,
    operations: provided.has("area") || positionChanged ? imported.operations : existing.operations,
    warehouseType: provided.has("area") || positionChanged ? imported.warehouseType : existing.warehouseType,
    scope: positionChanged ? imported.scope : existing.scope,
    group: provided.has("group") || positionChanged ? imported.group : existing.group,
    validFrom: provided.has("validFrom") ? imported.validFrom : existing.validFrom,
    validTo: provided.has("validTo") ? imported.validTo : existing.validTo,
    state: provided.has("state") ? imported.state : existing.state,
    setupComplete: positionChanged ? imported.setupComplete !== false : existing.setupComplete !== false,
  });
}

function validateImportCandidate(item: Responsibility) {
  const errors: string[] = [];
  const rule = ruleFor(item.position);
  if (!rule) {
    if (item.setupComplete !== false) errors.push("Una persona sin posición no puede estar completa.");
    if (item.scope !== null || item.operations.length > 0 || item.warehouseType !== null) {
      errors.push("Complete primero la posición antes del área o la cobertura.");
    }
    return errors;
  }
  if (item.scope !== rule.scope) errors.push("La cobertura no corresponde a la posición.");
  if (rule.operationMode === "blocked" && item.operations.length > 0) errors.push("Esta posición no utiliza operaciones.");
  if (rule.operationMode === "single" && item.operations.length > 1) errors.push("Esta posición permite una sola operación.");
  if (item.setupComplete !== false && rule.operationMode === "single" && item.operations.length !== 1) errors.push("Falta una operación.");
  if (item.setupComplete !== false && rule.operationMode === "multiple" && item.operations.length < 1) errors.push("Falta al menos una operación.");
  if (rule.warehouseMode === "blocked" && item.warehouseType !== null) errors.push("Esta posición no utiliza almacén.");
  if (rule.warehouseMode === "select" && item.setupComplete !== false && item.warehouseType === null) errors.push("Falta el tipo de almacén.");
  if (rule.warehouseMode === "work_in_process" && item.warehouseType !== "Productos en proceso") errors.push("El área debe ser Productos en proceso.");
  if (rule.groupRequired && item.setupComplete !== false && item.group === null) errors.push("Falta el grupo.");
  if (!rule.groupRequired && item.group !== null) errors.push("Esta posición no utiliza grupo.");
  return errors;
}

function rosterOverwriteChanges(existing: Responsibility, entry: RosterImportEntry): RosterOverwriteChange[] {
  const merged = mergeRosterImport(existing, entry);
  const changes: RosterOverwriteChange[] = [];
  const add = (field: string, current: string, imported: string) => {
    if (current !== imported) changes.push({ field, current, imported });
  };

  add("Persona", existing.person, merged.person);
  add("Posición", existing.position || "Por completar", merged.position || "Por completar");
  add("Área", responsibilityArea(existing), responsibilityArea(merged));
  add("Cobertura", existing.scope ? scopeLabels[existing.scope] : "Por completar", merged.scope ? scopeLabels[merged.scope] : "Por completar");
  add("Grupo", existing.group ? `Grupo ${existing.group}` : "Sin grupo", merged.group ? `Grupo ${merged.group}` : "Sin grupo");
  add("Vigente desde", existing.validFrom, merged.validFrom);
  add("Vigente hasta", existing.validTo ?? "Sin fecha final", merged.validTo ?? "Sin fecha final");
  add("Estado", stateLabels[existing.state], stateLabels[merged.state]);
  return changes;
}

function responsibilityWithPosition(item: Responsibility, position: Position): Responsibility {
  const rule = positionRules[position];
  const nextOperations = rule.operationMode === "blocked" ? [] : item.operations.slice(0, rule.operationMode === "single" ? 1 : undefined);
  const nextWarehouseType = rule.warehouseMode === "work_in_process"
    ? "Productos en proceso"
    : rule.warehouseMode === "select" ? item.warehouseType : null;
  const nextGroup = rule.groupRequired ? item.group : null;
  const setupComplete = (!rule.groupRequired || Boolean(nextGroup))
    && (rule.operationMode === "blocked" || nextOperations.length > 0)
    && (rule.warehouseMode === "blocked" || Boolean(nextWarehouseType));
  return responsibilityWithSetupStatus({
    ...item,
    position,
    scope: rule.scope,
    operations: nextOperations,
    warehouseType: nextWarehouseType,
    group: nextGroup,
    setupComplete,
  });
}

const responsibilities: Responsibility[] = [
  { id: "factory-manager", person: "María Elena Torres", position: "Gerente de fábrica", operations: [], warehouseType: null, scope: "factory", group: null, validFrom: "01 jul 2026", validTo: null, state: "active" },
  { id: "shift-supervisor-a", person: "Luis Vargas", position: "Supervisor de turno de operación", operations: ["Impresión", "Exlam"], warehouseType: null, scope: "operation_group", group: "C", validFrom: "01 jul 2026", validTo: "25 jul 2026", state: "inactive" },
  { id: "technical-leader", person: "Rosa Paredes", position: "Líder técnico", operations: ["Impresión"], warehouseType: null, scope: "operation", group: null, validFrom: "15 jun 2026", validTo: null, state: "active" },
  { id: "machine-operator-a1", person: "Jorge Acosta", position: "Operador de máquina", operations: ["Impresión"], warehouseType: null, scope: "machine_group", group: "A", validFrom: "01 jul 2026", validTo: null, state: "active" },
  { id: "machine-operator-a2", person: "Elena Chávez", position: "Operador de máquina", operations: ["Impresión"], warehouseType: null, scope: "machine_group", group: "A", validFrom: "01 jul 2026", validTo: null, state: "active" },
  { id: "machine-operator-b", person: "Paola Núñez", position: "Operador de máquina", operations: ["Extrusión"], warehouseType: null, scope: "machine_group", group: "B", validFrom: "01 jul 2026", validTo: null, state: "active" },
  { id: "machine-operator-c", person: "José Luna", position: "Operador de máquina", operations: ["Sellado"], warehouseType: null, scope: "machine_group", group: "C", validFrom: "01 jul 2026", validTo: null, state: "active" },
  { id: "material-planner", person: "Carmen Ruiz", position: "Planificador de materiales", operations: [], warehouseType: null, scope: "factory", group: null, validFrom: "01 jul 2026", validTo: null, state: "active" },
  { id: "planner", person: "David Vega", position: "Planificador", operations: [], warehouseType: null, scope: "factory", group: null, validFrom: "01 jul 2026", validTo: null, state: "active" },
  { id: "warehouse-dispatcher", person: "Carlos Mendoza", position: "Despachador de almacén", operations: [], warehouseType: "Materias primas", scope: "warehouse_group", group: "B", validFrom: "01 jul 2026", validTo: null, state: "active" },
  { id: "warehouse-supervisor", person: "Sofía Ramos", position: "Supervisor de almacén", operations: [], warehouseType: "Materias primas", scope: "warehouse_group", group: "A", validFrom: "01 jul 2026", validTo: null, state: "active" },
  { id: "process-operator", person: "Lucía Torres", position: "Operador de proceso", operations: [], warehouseType: "Productos en proceso", scope: "warehouse_group", group: "B", validFrom: "01 jul 2026", validTo: null, state: "active" },
  { id: "process-supervisor", person: "Pedro Silva", position: "Supervisor de proceso", operations: [], warehouseType: "Productos en proceso", scope: "warehouse_group", group: "C", validFrom: "01 jul 2026", validTo: null, state: "active" },
];

const groups: WorkerGroup[] = [
  {
    id: "A",
    name: "A",
    operation: "Impresión",
    offset: 0,
    workers: [
      { id: "a1", name: "Luis Vargas", operation: "Impresión", availability: "available" },
      { id: "a2", name: "Jorge Acosta", operation: "Impresión", availability: "available" },
      { id: "a3", name: "Elena Chávez", operation: "Impresión", availability: "vacation", note: "Vacaciones hasta 29 jul" },
      { id: "a4", name: "Miguel Flores", operation: "Corte", availability: "replacement", note: "Cubre a Elena Chávez" },
      { id: "a5", name: "Ana Salazar", operation: "Impresión", availability: "available" },
    ],
  },
  {
    id: "B",
    name: "B",
    operation: "Almacén",
    offset: 2,
    workers: [
      { id: "b1", name: "Carlos Mendoza", operation: "Almacén", availability: "replacement", note: "Cubre a Mateo Ríos" },
      { id: "b2", name: "Mateo Ríos", operation: "Almacén", availability: "sick", note: "Descanso médico hasta 27 jul" },
      { id: "b3", name: "Lucía Torres", operation: "Almacén", availability: "available" },
      { id: "b4", name: "Paola Núñez", operation: "Extrusión", availability: "available" },
    ],
  },
  {
    id: "C",
    name: "C",
    operation: "Sellado",
    offset: 4,
    workers: [
      { id: "c1", name: "Rosa Paredes", operation: "Sellado", availability: "available" },
      { id: "c2", name: "José Luna", operation: "Sellado", availability: "available" },
      { id: "c3", name: "Mariela Soto", operation: "Exlam", availability: "available" },
      { id: "c4", name: "Pedro Silva", operation: "Sellado", availability: "available" },
      { id: "c5", name: "Nadia Ruiz", operation: "Sellado", availability: "available" },
    ],
  },
];

const defaultGroupColors: Record<string, string> = {
  A: ui.color.action,
  B: ui.color.structure,
  C: ui.color.lifecycleResolved,
};
const additionalGroupColors = [
  monitorTokens.color.chart.three.$value,
  monitorTokens.color.chart.four.$value,
  monitorTokens.color.chart.five.$value,
];
function groupColor(group: string) {
  if (defaultGroupColors[group]) return defaultGroupColors[group];
  const numeric = Math.max(0, group.charCodeAt(0) - "D".charCodeAt(0));
  return additionalGroupColors[numeric % additionalGroupColors.length]!;
}
const phaseTone: Record<RotationPhase, { background: string; color: string; border: string }> = {
  day: { background: ui.color.action, color: ui.color.textInverse, border: ui.color.action },
  night: { background: ui.color.structure, color: ui.color.textInverse, border: ui.color.structure },
  rest: { background: ui.color.border, color: ui.color.textSecondary, border: ui.color.textSecondary },
};

function scheduleFor(pattern: RotationPattern, scheduleId: RotationScheduleId) {
  return pattern.schedules.find((schedule) => schedule.id === scheduleId) ?? pattern.schedules[0]!;
}

function scheduleForException(pattern: RotationPattern, exception: WorkerScheduleException | null) {
  if (!exception || exception.kind === "group") return null;
  if (exception.kind === "schedule" && exception.scheduleId) return scheduleFor(pattern, exception.scheduleId);
  if (exception.kind === "custom" && exception.customStart && exception.customEnd) {
    return {
      id: `custom-${exception.id}`,
      name: exception.customScheduleName?.trim() || "Horario especial",
      start: exception.customStart,
      end: exception.customEnd,
      isRest: false,
    } satisfies RotationSchedule;
  }
  return null;
}

function scheduleVisualPhase(schedule: RotationSchedule): RotationPhase {
  if (schedule.isRest) return "rest";
  const startHour = Number(schedule.start?.split(":")[0] ?? 0);
  return startHour >= 12 ? "night" : "day";
}

function scheduleLane(schedule: RotationSchedule) {
  const phase = scheduleVisualPhase(schedule);
  return phase === "rest" ? "1 / span 2" : phase === "day" ? "1" : "2";
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

const rotationPhaseOrder: RotationPhase[] = ["day", "night", "rest"];

function scheduledPhase(
  group: WorkerGroup["id"],
  date: Date,
  pattern: RotationPattern,
  adjustments: RotationAdjustment[],
) {
  const groupPattern = pattern.groups.find((item) => item.id === group) ?? pattern.groups[0]!;
  const dateKey = localDateKey(date);
  const operation = adjustments[0]?.operation ?? "";
  const gap = rotationGapForDate(operation, dateKey, adjustments);
  if (gap) return { scheduleId: null, adjusted: true };
  const shiftedDays = cumulativeRotationShift(operation, dateKey, adjustments);
  const elapsedDays = dayDifference(date, pattern.effectiveFrom) - shiftedDays;
  const scheduleSteps = Math.floor(elapsedDays / groupPattern.daysPerPhase);
  const anchorIndex = Math.max(0, pattern.schedules.findIndex((schedule) => schedule.id === groupPattern.anchorScheduleId));
  const index = positiveModulo(anchorIndex + scheduleSteps, pattern.schedules.length);
  return { scheduleId: pattern.schedules[index]!.id, adjusted: shiftedDays !== 0 };
}

function currentPhase(group: WorkerGroup) {
  const pattern = defaultRotationPattern();
  return scheduleVisualPhase(scheduleFor(pattern, scheduledPhase(group.id, new Date("2026-07-25T12:00:00-05:00"), pattern, []).scheduleId ?? pattern.schedules[0]!.id));
}

function rotationCoverageForDate(operation: string, dateKey: string, coverages: RotationGapCoverage[]) {
  return coverages.find((item) => (
    item.operation === operation
    && item.startDate <= dateKey
    && dateKey < addDaysKey(item.startDate, item.days)
  )) ?? null;
}

function dateLabel(date: Date) {
  return new Intl.DateTimeFormat("es-PE", { weekday: "short", day: "2-digit" }).format(date).replace(".", "");
}

function fullDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric" })
    .format(dateFromKey(dateKey))
    .replace(".", "");
}

function GroupMark({ group, inverse = false }: { group: WorkerGroup["id"]; inverse?: boolean }) {
  const color = groupColor(group);
  return (
    <Box
      aria-hidden="true"
      sx={{
        width: 24,
        height: 24,
        display: "grid",
        placeItems: "center",
        borderRadius: ui.control.radius,
        color: inverse ? color : "white",
        bgcolor: inverse ? ui.color.textInverse : color,
        fontSize: ui.typography.primaryData,
        fontWeight: 700,
        flex: "0 0 auto",
      }}
    >
      {group}
    </Box>
  );
}

function StateLabel({ state }: { state: AssignmentState }) {
  const tone = state === "active" ? "success.main" : state === "future" ? "warning.main" : "text.secondary";
  return (
    <Stack direction="row" gap={0.5} alignItems="center">
      <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: tone }} />
      <Typography variant="caption" fontWeight={600} color={tone}>
        {stateLabels[state]}
      </Typography>
    </Stack>
  );
}

function RosterHeader({
  menuAnchor,
  setMenuAnchor,
  onLogout,
}: {
  menuAnchor: HTMLElement | null;
  setMenuAnchor: (anchor: HTMLElement | null) => void;
  onLogout: () => void;
}) {
  return (
    <AppBar position="sticky" color="secondary" elevation={0} sx={{ borderBottom: `1px solid ${ui.color.inverseDivider}` }}>
      <Box sx={{ height: 48, px: { xs: 0.5, sm: 1 }, display: "grid", gridTemplateColumns: "48px 1fr 48px", alignItems: "center" }}>
        <IconButton color="inherit" aria-label="Abrir aplicaciones de producción" onClick={(event) => setMenuAnchor(event.currentTarget)} sx={{ width: 40, height: 40 }}>
          <MenuRounded fontSize="small" />
        </IconButton>
        <Typography variant="body2" fontWeight={700} color="inherit" textAlign="center" noWrap>
          Matriz de responsables
        </Typography>
        <Box aria-hidden="true" />
      </Box>
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem component="a" href="/" onClick={() => setMenuAnchor(null)}><DashboardRounded sx={{ fontSize: 16, mr: 1 }} />Control de alertas</MenuItem>
        <MenuItem disabled>Planificación</MenuItem>
        <MenuItem disabled>Inventario</MenuItem>
        <Divider />
        <MenuItem onClick={onLogout}>Cerrar sesión</MenuItem>
      </Menu>
    </AppBar>
  );
}

function ResponsibilitiesView({
  items,
  onSelect,
  onUpdate,
}: {
  items: Responsibility[];
  onSelect: (responsibility: Responsibility) => void;
  onUpdate: (
    responsibilities: Responsibility[],
    notice?: { severity: "success" | "warning"; message: string },
  ) => void;
}) {
  const isMobile = useMediaQuery("(max-width:599px)");
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const [activeColumn, setActiveColumn] = useState<ResponsibilityColumn>("person");
  const [columnSearch, setColumnSearch] = useState("");
  const [filters, setFilters] = useState<Partial<Record<ResponsibilityColumn, string[]>>>({});
  const [sort, setSort] = useState<{ column: ResponsibilityColumn; direction: SortDirection } | null>(null);
  const [filterSource, setFilterSource] = useState(items);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMenu, setBulkMenu] = useState<"position" | "area" | "group" | "state" | null>(null);
  const [bulkValues, setBulkValues] = useState({ position: "", area: "", group: "", state: "" });
  const [bulkNotice, setBulkNotice] = useState<{ message: string; severity: "success" | "warning" } | null>(null);
  const rosterGroupOptions = [...new Set(["A", "B", "C", ...items.flatMap((item) => item.group ? [item.group] : [])])];

  const changeSelection = (updater: (current: Set<string>) => Set<string>) => {
    setSelectedIds((current) => {
      const next = updater(current);
      if (next.size > 1 && next.size !== current.size) {
        setBulkNotice({ severity: "success", message: `Edición masiva activada para ${next.size} personas.` });
      } else if (current.size > 1 && next.size <= 1) {
        setBulkNotice(null);
      }
      return next;
    });
    setBulkMenu(null);
    setBulkValues({ position: "", area: "", group: "", state: "" });
  };

  useEffect(() => {
    setSelectedIds((current) => new Set([...current].filter((id) => items.some((item) => item.id === id))));
  }, [items]);

  const valueFor = (item: Responsibility, column: ResponsibilityColumn) => {
    if (column === "person") return item.person;
    if (column === "position") return item.position;
    if (column === "area") return responsibilityArea(item);
    if (column === "scope") return item.scope ? scopeLabels[item.scope] : "Por completar";
    if (column === "group") return item.group ? `Grupo ${item.group}` : "Sin grupo";
    if (column === "validity") return item.validTo ? `${item.validFrom} – ${item.validTo}` : `${item.validFrom} – Sin fecha final`;
    return stateLabels[item.state];
  };

  const filterValuesFor = (item: Responsibility, column: ResponsibilityColumn) => {
    if (column !== "area") return [valueFor(item, column)];
    if (item.setupComplete === false || !item.scope) return ["Por completar"];
    if (item.scope === "factory") return ["Toda la fábrica"];
    if (item.warehouseType) return [`Almacén de ${item.warehouseType.toLocaleLowerCase("es-PE")}`];
    return item.operations.length > 0 ? item.operations : ["Por completar"];
  };

  const sortValueFor = (item: Responsibility, column: ResponsibilityColumn) => (
    column === "validity" ? dateInputValue(item.validFrom) : valueFor(item, column)
  );

  const columnValues = useMemo(() => {
    const result = {} as Record<ResponsibilityColumn, string[]>;
    (["person", "position", "area", "scope", "group", "validity", "state"] as ResponsibilityColumn[]).forEach((column) => {
      result[column] = Array.from(new Set(items.flatMap((item) => filterValuesFor(item, column))))
        .sort((a, b) => a.localeCompare(b, "es-PE", { numeric: true }));
    });
    return result;
  }, [items]);

  const hasActiveView = Boolean(sort) || Object.values(filters).some((value) => value !== undefined);
  const filtered = useMemo(() => {
    const source = hasActiveView ? filterSource : items;
    const result = source.filter((item) => (
      (Object.keys(filters) as ResponsibilityColumn[]).every((column) => {
        const selected = filters[column];
        return !selected || filterValuesFor(item, column).some((value) => selected.includes(value));
      })
    ));
    const sorted = !sort ? result : [...result].sort((a, b) => {
      const comparison = sortValueFor(a, sort.column).localeCompare(
        sortValueFor(b, sort.column),
        "es-PE",
        { numeric: true },
      );
      return sort.direction === "asc" ? comparison : -comparison;
    });
    const currentById = new Map(items.map((item) => [item.id, item]));
    return sorted.map((item) => currentById.get(item.id)).filter((item): item is Responsibility => Boolean(item));
  }, [filterSource, filters, hasActiveView, items, sort]);

  const openColumnFilter = (event: MouseEvent<HTMLElement>, column: ResponsibilityColumn) => {
    setActiveColumn(column);
    setColumnSearch("");
    setFilterAnchor(event.currentTarget);
  };

  const allValues = columnValues[activeColumn];
  const selectedValues = filters[activeColumn];
  const normalizedColumnSearch = normalizeSearchText(columnSearch);
  const visibleValues = allValues.filter((value) => normalizeSearchText(value).includes(normalizedColumnSearch));
  const allSelected = selectedValues === undefined || selectedValues.length === allValues.length;
  const noneSelected = selectedValues?.length === 0;

  const toggleValue = (value: string) => {
    setFilterSource(items);
    setFilters((current) => {
      const selected = current[activeColumn] ?? allValues;
      const next = selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value];
      return {
        ...current,
        [activeColumn]: next.length === allValues.length ? undefined : next,
      };
    });
  };

  const visibleIds = filtered.map((item) => item.id);
  const selectedVisibleCount = visibleIds.filter((id) => selectedIds.has(id)).length;
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const selectedItems = items.filter((item) => selectedIds.has(item.id));
  const updateSelected = (updater: (item: Responsibility) => Responsibility) => {
    onUpdate(selectedItems.map(updater));
  };

  const columnHeader = (
    column: ResponsibilityColumn,
    label: string,
    width: string,
  ) => {
    const isFiltered = filters[column] !== undefined;
    const isSorted = sort?.column === column;
    return (
      <TableCell sx={{ width, p: 0 }}>
        <ButtonBase
          aria-label={`Filtrar columna ${label}${isFiltered ? ", filtro activo" : ""}`}
          aria-pressed={isFiltered}
          onClick={(event) => openColumnFilter(event, column)}
          sx={{
            width: "100%",
            minHeight: 36,
            pl: 1,
            pr: column === "state" ? 1.5 : 1,
            justifyContent: "space-between",
            color: isFiltered || isSorted ? "primary.main" : "text.secondary",
            bgcolor: isFiltered ? ui.color.selected : "transparent",
            boxShadow: isFiltered ? `inset 0 -2px ${ui.color.action}` : "none",
            fontWeight: 700,
            fontSize: "inherit",
            transition: `background-color ${monitorTokens.motion.fast.$value} ${monitorTokens.motion.easeOut.$value}, box-shadow ${monitorTokens.motion.fast.$value} ${monitorTokens.motion.easeOut.$value}`,
          }}
        >
          <span>{label}</span>
          {isFiltered ? (
            <FilterAltRounded sx={{ fontSize: 15 }} />
          ) : (
            <ArrowDropDownRounded sx={{ fontSize: 17, transform: isSorted && sort.direction === "asc" ? "rotate(180deg)" : "none" }} />
          )}
        </ButtonBase>
      </TableCell>
    );
  };

  return (
    <Stack gap={1}>
      {!isMobile ? (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, overflowX: "hidden" }}>
          <Table size="small" sx={{ tableLayout: "fixed", "& .MuiTableCell-body": { px: 1 } }} aria-label="Personas y responsabilidades operativas">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ width: "4%", px: 0.5 }}>
                  <Checkbox
                    size="small"
                    aria-label="Seleccionar todas las filas visibles"
                    checked={allVisibleSelected}
                    indeterminate={selectedVisibleCount > 0 && !allVisibleSelected}
                    onChange={() => changeSelection((current) => {
                      if (allVisibleSelected) return new Set();
                      const next = new Set(current);
                      visibleIds.forEach((id) => next.add(id));
                      return next;
                    })}
                  />
                </TableCell>
                {columnHeader("person", "Persona", "16%")}
                {columnHeader("position", "Posición", "22%")}
                {columnHeader("area", "Área", "15%")}
                {columnHeader("scope", "Cobertura", "14%")}
                {columnHeader("group", "Grupo", "7%")}
                {columnHeader("validity", "Vigencia", "12%")}
                {columnHeader("state", "Estado", "10%")}
              </TableRow>
              {selectedIds.size > 1 && (
                <TableRow sx={{ bgcolor: ui.color.selected, "& .MuiTableCell-root": { py: 0.5, px: 0.5 } }}>
                  <TableCell padding="checkbox"><Typography variant="caption" fontWeight={700}>{selectedIds.size}</Typography></TableCell>
                  <TableCell aria-label="Edición masiva" />
                  <TableCell>
                    <TextField
                      select
                      fullWidth
                      value={bulkValues.position}
                      aria-label="Cambiar posición de las personas seleccionadas"
                      SelectProps={{ displayEmpty: true, open: bulkMenu === "position", onOpen: () => setBulkMenu("position"), onClose: () => setBulkMenu(null) }}
                      onChange={(event) => {
                        setBulkValues((current) => ({ ...current, position: event.target.value }));
                        updateSelected((item) => responsibilityWithPosition(item, event.target.value as Position));
                        setBulkMenu(null);
                      }}
                    >
                      <MenuItem value="" disabled>Posición</MenuItem>
                      {positionOptions.map((position) => <MenuItem key={position} value={position}>{position}</MenuItem>)}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      fullWidth
                      value={bulkValues.area}
                      aria-label="Cambiar área de las personas seleccionadas"
                      SelectProps={{ displayEmpty: true, open: bulkMenu === "area", onOpen: () => setBulkMenu("area"), onClose: () => setBulkMenu(null) }}
                      onChange={(event) => {
                        const value = event.target.value;
                        const changes = selectedItems.map((item) => responsibilityWithBulkArea(item, value));
                        const applicableCount = changes.filter((change) => change.applied).length;
                        const changed = changes.filter((change, index) => (
                          JSON.stringify(persistedResponsibility(change.item))
                            !== JSON.stringify(persistedResponsibility(selectedItems[index]!))
                        ));
                        const incompatible = changes
                          .map((change, index) => ({ change, item: selectedItems[index]! }))
                          .filter(({ change }) => !change.applied)
                          .map(({ item }) => item);
                        setSelectedIds(new Set(incompatible.map((item) => item.id)));
                        setBulkValues({ position: "", area: "", group: "", state: "" });
                        setBulkMenu(null);
                        setBulkNotice(null);
                        const alreadyAssignedCount = applicableCount - changed.length;
                        const incompatibleReason = operations.includes(value)
                          ? incompatible.length === 1 ? "su posición no utiliza áreas de operación" : "sus posiciones no utilizan áreas de operación"
                          : incompatible.length === 1 ? "su posición no utiliza este tipo de almacén" : "sus posiciones no utilizan este tipo de almacén";
                        if (changed.length === 0) {
                          const unchangedParts = [
                            alreadyAssignedCount > 0 ? `${alreadyAssignedCount} ya ${alreadyAssignedCount === 1 ? "tenía" : "tenían"} ${value}` : "",
                            incompatible.length > 0 ? `${incompatible.length} no ${incompatible.length === 1 ? "cambió" : "cambiaron"} porque ${incompatibleReason}` : "",
                          ].filter(Boolean);
                          setBulkNotice({
                            severity: "warning",
                            message: `No hubo cambios: ${unchangedParts.join("; ")}.`,
                          });
                          return;
                        }
                        const resultParts = [
                          `${changed.length} ${changed.length === 1 ? "persona actualizada" : "personas actualizadas"}`,
                          alreadyAssignedCount > 0 ? `${alreadyAssignedCount} ya ${alreadyAssignedCount === 1 ? "tenía" : "tenían"} ${value}` : "",
                          incompatible.length > 0 ? `${incompatible.length} no ${incompatible.length === 1 ? "cambió" : "cambiaron"} porque ${incompatibleReason}` : "",
                        ].filter(Boolean);
                        onUpdate(changes.map((change) => change.item), {
                          severity: incompatible.length > 0 ? "warning" : "success",
                          message: `${value}: ${resultParts.join("; ")}.`,
                        });
                      }}
                    >
                      <MenuItem value="" disabled>Área</MenuItem>
                      {operations.filter((operation) => operation !== "Todas").map((operation) => <MenuItem key={operation} value={operation}>{operation}</MenuItem>)}
                      {warehouseTypes.map((warehouse) => <MenuItem key={warehouse} value={warehouse}>{warehouse}</MenuItem>)}
                    </TextField>
                  </TableCell>
                  <TableCell><Typography variant="caption" color="text.secondary">Según posición</Typography></TableCell>
                  <TableCell>
                    <TextField
                      select
                      fullWidth
                      value={bulkValues.group}
                      aria-label="Cambiar grupo de las personas seleccionadas"
                      SelectProps={{ displayEmpty: true, open: bulkMenu === "group", onOpen: () => setBulkMenu("group"), onClose: () => setBulkMenu(null) }}
                      onChange={(event) => {
                        setBulkValues((current) => ({ ...current, group: event.target.value }));
                        updateSelected((item) => ruleFor(item.position)?.groupRequired
                          ? responsibilityWithSetupStatus({ ...item, group: event.target.value as WorkerGroup["id"] })
                          : item);
                        setBulkMenu(null);
                      }}
                    >
                      <MenuItem value="" disabled>Grupo</MenuItem>
                      {rosterGroupOptions.map((group) => <MenuItem key={group} value={group}>Grupo {group}</MenuItem>)}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      fullWidth
                      type="date"
                      aria-label="Cambiar vigencia desde de las personas seleccionadas"
                      onChange={(event) => {
                        const date = displayDate(event.target.value);
                        if (date) updateSelected((item) => ({ ...item, validFrom: date }));
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ pr: 1.5 }}>
                    <TextField
                      select
                      fullWidth
                      value={bulkValues.state}
                      aria-label="Cambiar estado de las personas seleccionadas"
                      SelectProps={{ displayEmpty: true, open: bulkMenu === "state", onOpen: () => setBulkMenu("state"), onClose: () => setBulkMenu(null) }}
                      onChange={(event) => {
                        setBulkValues((current) => ({ ...current, state: event.target.value }));
                        updateSelected((item) => ({ ...item, state: event.target.value as AssignmentState }));
                        setBulkMenu(null);
                      }}
                    >
                      <MenuItem value="" disabled>Estado</MenuItem>
                      <MenuItem value="active">Activa</MenuItem>
                      <MenuItem value="future">Pendiente</MenuItem>
                      <MenuItem value="inactive">Inactiva</MenuItem>
                    </TextField>
                  </TableCell>
                </TableRow>
              )}
            </TableHead>
            <TableBody>
              {filtered.map((item) => (
                <TableRow
                  key={item.id}
                  hover
                  tabIndex={0}
                  role="button"
                  onClick={() => onSelect(item)}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(item); }}
                  sx={{ height: 48, cursor: "pointer", "&:focus-visible": { outline: `2px solid ${ui.color.action}`, outlineOffset: -2 } }}
                >
                  <TableCell padding="checkbox" sx={{ px: 0.5 }} onClick={(event) => event.stopPropagation()}>
                    <Checkbox
                      size="small"
                      aria-label={`Seleccionar ${item.person}`}
                      checked={selectedIds.has(item.id)}
                      onChange={() => changeSelection((current) => {
                        const next = new Set(current);
                        next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                        return next;
                      })}
                    />
                  </TableCell>
                  <TableCell><Typography variant="body2" fontWeight={700} noWrap>{item.person}</Typography></TableCell>
                  <TableCell><Typography variant="body2" fontWeight={700}>{item.position}</Typography></TableCell>
                  <TableCell><Typography variant="body2" noWrap>{responsibilityArea(item)}</Typography></TableCell>
                  <TableCell><Typography variant="body2" noWrap>{item.scope ? scopeLabels[item.scope] : "Por completar"}</Typography></TableCell>
                  <TableCell>{item.group ? <GroupMark group={item.group} /> : <Typography variant="caption" color="text.secondary">—</Typography>}</TableCell>
                  <TableCell><Typography variant="body2">{item.validFrom}</Typography><Typography variant="caption" color="text.secondary">{item.validTo ? `Hasta ${item.validTo}` : "Sin fecha final"}</Typography></TableCell>
                  <TableCell sx={{ pl: 1, pr: 1.5 }}><StateLabel state={item.state} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: "hidden" }}>
          {filtered.map((item, index) => (
            <ButtonBase
              key={item.id}
              onClick={() => onSelect(item)}
              sx={{ width: "100%", minHeight: 64, px: 1, py: 0.75, textAlign: "left", alignItems: "stretch", borderTop: index ? "1px solid" : 0, borderColor: "divider" }}
            >
              <Stack gap={0.25} sx={{ width: "100%", minWidth: 0 }}>
                <Stack direction="row" justifyContent="space-between" gap={1} alignItems="center">
                  <Typography variant="body2" fontWeight={700} noWrap>{item.person}</Typography>
                  <StateLabel state={item.state} />
                </Stack>
                <Typography variant="body2" fontWeight={600} noWrap>{item.position}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {responsibilityArea(item)} · {item.scope ? scopeLabels[item.scope] : "Por completar"}{item.group ? ` · Grupo ${item.group}` : ""}
                </Typography>
              </Stack>
            </ButtonBase>
          ))}
        </Paper>
      )}
      {filtered.length === 0 && (
        <Paper variant="outlined" sx={{ p: 3, textAlign: "center", borderRadius: 1.5 }}>
          <Typography variant="h2">No hay personas con estos filtros</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Cambia o limpia los filtros de las columnas.</Typography>
          <Button variant="outlined" sx={{ mt: 1 }} onClick={() => setFilters({})}>Restablecer</Button>
        </Paper>
      )}
      <Menu
        anchorEl={filterAnchor}
        open={Boolean(filterAnchor)}
        onClose={() => setFilterAnchor(null)}
        slotProps={{
          paper: {
            sx: {
              width: 248,
              maxHeight: 360,
              overflow: "hidden",
              "& .MuiMenuItem-root": { minHeight: ui.control.visibleHeight },
              "& .MuiCheckbox-root": { p: 0.5, mr: 0.5 },
            },
          },
          list: { sx: { p: 0, overflow: "hidden" } },
        }}
      >
        <Box role="none" sx={{ bgcolor: "background.paper" }}>
          <Stack direction="row" alignItems="center" gap={0.25} sx={{ px: 0.5, py: 0.5 }}>
            <IconButton
              size="small"
              title="Ordenar ascendente"
              aria-label="Ordenar columna ascendente"
              aria-pressed={sort?.column === activeColumn && sort.direction === "asc"}
              onClick={() => {
                setFilterSource(items);
                setSort({ column: activeColumn, direction: "asc" });
                setFilterAnchor(null);
              }}
              sx={{
                width: ui.control.visibleHeight,
                height: ui.control.visibleHeight,
                color: sort?.column === activeColumn && sort.direction === "asc" ? "primary.main" : "text.secondary",
                bgcolor: sort?.column === activeColumn && sort.direction === "asc" ? ui.color.selected : "transparent",
              }}
            >
              <ArrowUpwardRounded sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton
              size="small"
              title="Ordenar descendente"
              aria-label="Ordenar columna descendente"
              aria-pressed={sort?.column === activeColumn && sort.direction === "desc"}
              onClick={() => {
                setFilterSource(items);
                setSort({ column: activeColumn, direction: "desc" });
                setFilterAnchor(null);
              }}
              sx={{
                width: ui.control.visibleHeight,
                height: ui.control.visibleHeight,
                color: sort?.column === activeColumn && sort.direction === "desc" ? "primary.main" : "text.secondary",
                bgcolor: sort?.column === activeColumn && sort.direction === "desc" ? ui.color.selected : "transparent",
              }}
            >
              <ArrowDownwardRounded sx={{ fontSize: 16 }} />
            </IconButton>
            <Box sx={{ flex: 1 }} />
            <IconButton
              size="small"
              title="Actualizar resultados"
              aria-label="Actualizar resultados del filtro"
              onClick={() => {
                setFilterSource(items);
                setFilterAnchor(null);
              }}
              sx={{ width: ui.control.visibleHeight, height: ui.control.visibleHeight, color: "text.secondary" }}
            >
              <RefreshRounded sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton
              size="small"
              title="Limpiar filtro"
              aria-label="Limpiar filtro de la columna"
              disabled={filters[activeColumn] === undefined && sort?.column !== activeColumn}
              onClick={() => {
                setFilterSource(items);
                setFilters((current) => ({ ...current, [activeColumn]: undefined }));
                if (sort?.column === activeColumn) setSort(null);
                setFilterAnchor(null);
              }}
              sx={{ width: ui.control.visibleHeight, height: ui.control.visibleHeight, color: "text.secondary" }}
            >
              <FilterAltOffRounded sx={{ fontSize: 16 }} />
            </IconButton>
          </Stack>
          <Divider />
          <Box sx={{ px: 1, py: 0.5 }}>
            <TextField
              autoFocus
              fullWidth
              value={columnSearch}
              onChange={(event) => setColumnSearch(event.target.value)}
              placeholder="Buscar en esta columna"
              aria-label="Buscar valores de la columna"
              onKeyDown={(event) => event.stopPropagation()}
            />
          </Box>
          <MenuItem
            onClick={() => {
              setFilterSource(items);
              setFilters((current) => ({
                ...current,
                [activeColumn]: allSelected ? [] : undefined,
              }));
            }}
          >
            <Checkbox size="small" checked={allSelected} indeterminate={!allSelected && !noneSelected} />
            <ListItemText
              primary="Seleccionar todo"
              primaryTypographyProps={{ fontSize: ui.typography.routine, lineHeight: 1.4 }}
            />
          </MenuItem>
          <Divider />
        </Box>
        <Box role="group" aria-label="Valores disponibles" sx={{ maxHeight: 208, overflowY: "auto", overscrollBehavior: "contain" }}>
          {visibleValues.map((value) => (
            <MenuItem key={value} onClick={() => toggleValue(value)}>
              <Checkbox size="small" checked={selectedValues === undefined || selectedValues.includes(value)} />
              <ListItemText
                primary={value}
                primaryTypographyProps={{ noWrap: true, fontSize: ui.typography.routine, lineHeight: 1.4 }}
              />
            </MenuItem>
          ))}
          {visibleValues.length === 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 2, py: 1 }}>
              No hay coincidencias.
            </Typography>
          )}
        </Box>
      </Menu>
      <Snackbar
        key={bulkNotice?.message}
        open={Boolean(bulkNotice)}
        autoHideDuration={bulkNotice?.severity === "warning" ? null : 4500}
        onClose={() => setBulkNotice(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={bulkNotice?.severity ?? "success"}
          variant="filled"
          onClose={() => setBulkNotice(null)}
          sx={{ maxWidth: "min(560px, calc(100vw - 24px))", "& .MuiAlert-message": { overflowWrap: "anywhere" } }}
        >
          {bulkNotice?.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}

function RotationView({
  onMovePattern,
  onConfigureGap,
  editableOperations,
  operation,
  onOperationChange,
  assignments,
  patterns,
  adjustments,
  coverages,
  exceptions,
  onAddException,
  onRemoveExceptions,
  onEditPerson,
}: {
  onMovePattern: (operation: string, sourceDate: string, targetDate: string) => void;
  onConfigureGap: (operation: string, date: string) => void;
  editableOperations: string[];
  operation: string;
  onOperationChange: (operation: string) => void;
  assignments: Responsibility[];
  patterns: Record<string, RotationPattern>;
  adjustments: RotationAdjustment[];
  coverages: RotationGapCoverage[];
  exceptions: WorkerScheduleException[];
  onAddException: (exception: WorkerScheduleException) => void;
  onRemoveExceptions: (ids: string[]) => void;
  onEditPerson: (assignment: Responsibility) => void;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedGroupId, setSelectedGroupId] = useState<WorkerGroup["id"]>("A");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [personSearch, setPersonSearch] = useState("");
  const [personFilterAnchor, setPersonFilterAnchor] = useState<HTMLElement | null>(null);
  const [dragSourceDate, setDragSourceDate] = useState<string | null>(null);
  const [dropTargetDate, setDropTargetDate] = useState<string | null>(null);
  const [pendingOverwriteMove, setPendingOverwriteMove] = useState<{ sourceDate: string; targetDate: string } | null>(null);
  const [exceptionMode, setExceptionMode] = useState(false);
  const [exceptionRange, setExceptionRange] = useState<{ startDate: string; endDate: string | null }>({ startDate: "", endDate: null });
  const [exceptionTarget, setExceptionTarget] = useState("");
  const [customExceptionName, setCustomExceptionName] = useState("Horario especial");
  const [customExceptionStart, setCustomExceptionStart] = useState("");
  const [customExceptionEnd, setCustomExceptionEnd] = useState("");
  const [exceptionDetailsOpen, setExceptionDetailsOpen] = useState(false);
  const [confirmRevertAll, setConfirmRevertAll] = useState(false);
  const [pendingExceptionScrollDate, setPendingExceptionScrollDate] = useState<string | null>(null);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const canEditSelectedOperation = editableOperations.includes(operation);
  const pattern = patterns[operation] ?? defaultRotationPattern();
  const operationAdjustments = adjustments.filter((item) => item.operation === operation);
  const scopedGroups = useMemo(() => pattern.groups.map((patternGroup, index) => ({
    id: patternGroup.id,
    name: patternGroup.name,
    operation,
    offset: index * patternGroup.daysPerPhase,
    workers: assignments
      .filter((assignment) => assignment.state === "active" && assignment.group === patternGroup.id && assignment.operations.includes(operation))
      .map((assignment) => {
        const existingWorker = groups.flatMap((item) => item.workers).find((worker) => worker.name === assignment.person);
        return {
          id: assignment.id,
          name: assignment.person,
          operation,
          availability: existingWorker?.availability ?? "available",
          ...(existingWorker?.note ? { note: existingWorker.note } : {}),
        } satisfies Worker;
      }),
  })), [assignments, operation, pattern.groups]);
  const personOptions = scopedGroups.flatMap((group) => group.workers.map((worker) => ({ worker, group })));
  const selectedPerson = personOptions.find(({ worker }) => worker.id === selectedPersonId) ?? null;
  const selectedPersonExceptions = selectedPerson
    ? exceptions
      .filter((item) => item.operation === operation && item.workerId === selectedPerson.worker.id)
      .sort((left, right) => left.startDate.localeCompare(right.startDate))
    : [];
  const selectedGroup = scopedGroups.find((group) => group.id === selectedGroupId) ?? scopedGroups[0]!;
  const normalizedPersonSearch = normalizeSearchText(personSearch);
  const filteredWorkers = selectedGroup.workers.filter((worker) => (
    !normalizedPersonSearch || normalizeSearchText(worker.name).includes(normalizedPersonSearch)
  ));
  const hasPersonViewFilter = Boolean(personSearch || selectedPersonId);
  const visibleGroups = selectedPerson ? [{ ...selectedPerson.group, workers: [selectedPerson.worker] }] : scopedGroups;
  const months = useMemo(() => Array.from({ length: 12 }, (_, index) => monthStart(monthOffset + index)), [monthOffset]);
  const scrollToFirstException = (workerId: string, startDate: string) => {
    const targetDate = dateFromKey(startDate);
    const targetMonthOffset = (targetDate.getFullYear() - 2026) * 12 + targetDate.getMonth() - 6;
    setSelectedPersonId(workerId);
    setMonthOffset(targetMonthOffset);
    setPendingExceptionScrollDate(startDate);
  };
  const chooseExceptionDate = (dateKey: string) => {
    if (!exceptionMode || !selectedPerson) return;
    if (!exceptionRange.startDate || exceptionRange.endDate) {
      setExceptionRange({ startDate: dateKey, endDate: null });
      return;
    }
    setExceptionRange({
      startDate: dateKey < exceptionRange.startDate ? dateKey : exceptionRange.startDate,
      endDate: dateKey < exceptionRange.startDate ? exceptionRange.startDate : dateKey,
    });
  };
  const resetExceptionSelection = (mode: boolean) => {
    setExceptionMode(mode);
    setExceptionRange({ startDate: "", endDate: null });
    setExceptionTarget("");
    setCustomExceptionName("Horario especial");
    setCustomExceptionStart("");
    setCustomExceptionEnd("");
  };
  const applyException = () => {
    if (!selectedPerson || !exceptionMode || !exceptionRange.startDate || !exceptionRange.endDate) return;
    const [targetKind, targetValue] = exceptionTarget.split(":") as ["group" | "schedule" | "custom", string];
    if (!targetValue || !["group", "schedule", "custom"].includes(targetKind)) return;
    if (targetKind === "custom" && (!customExceptionName.trim() || !customExceptionStart || !customExceptionEnd || customExceptionStart === customExceptionEnd)) return;
    const targetGroup = targetKind === "group" ? pattern.groups.find((group) => group.id === targetValue) ?? null : null;
    const targetSchedule = targetKind === "schedule" ? scheduleFor(pattern, targetValue) : null;
    onAddException({
      id: `${operation}-${selectedPerson.worker.id}-${exceptionRange.startDate}`,
      operation,
      workerId: selectedPerson.worker.id,
      kind: targetKind,
      startDate: exceptionRange.startDate,
      endDate: exceptionRange.endDate,
      groupId: targetGroup?.id ?? null,
      groupName: targetGroup?.name ?? null,
      scheduleId: targetSchedule?.id ?? null,
      customScheduleName: targetKind === "custom" ? customExceptionName.trim() : null,
      customStart: targetKind === "custom" ? customExceptionStart : null,
      customEnd: targetKind === "custom" ? customExceptionEnd : null,
    });
    resetExceptionSelection(false);
  };
  useEffect(() => {
    if (!scopedGroups.some((group) => group.id === selectedGroupId)) {
      setSelectedGroupId(scopedGroups[0]?.id ?? "A");
      setSelectedPersonId(null);
    }
  }, [scopedGroups, selectedGroupId]);
  useEffect(() => {
    resetExceptionSelection(false);
    setExceptionDetailsOpen(false);
    setConfirmRevertAll(false);
  }, [operation, selectedPersonId]);
  useEffect(() => {
    if (!pendingExceptionScrollDate || !selectedPersonId) return;
    const frame = window.requestAnimationFrame(() => {
      const target = calendarRef.current?.querySelector<HTMLElement>(`[data-date="${pendingExceptionScrollDate}"]`);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.focus({ preventScroll: true });
      setPendingExceptionScrollDate(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [months, pendingExceptionScrollDate, selectedPersonId]);

  return (
    <>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "208px minmax(0, 720px)" },
          alignItems: "start",
          justifyContent: "start",
          gap: 1,
        }}
      >
        <Paper component="aside" variant="outlined" aria-label="Personas por grupo" sx={{ borderRadius: 1.5, overflow: "hidden", minWidth: 0 }}>
          <Stack gap={0.75} sx={{ p: 1 }}>
            <TextField
              select
              fullWidth
              label="Operación"
              value={operation}
              onChange={(event) => {
                onOperationChange(event.target.value);
                setSelectedPersonId(null);
                setPersonSearch("");
              }}
            >
              {operations.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
            </TextField>
          </Stack>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 36px", borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
            <Tabs
              value={selectedGroupId}
              onChange={(_, value: WorkerGroup["id"]) => {
                setSelectedGroupId(value);
                setSelectedPersonId(null);
              }}
              variant="fullWidth"
              aria-label="Grupos de trabajadores"
              sx={{
                minHeight: 36,
                "& .MuiTab-root": { minHeight: 36, minWidth: 0, py: 0, px: 0.5 },
                "& .MuiTabs-indicator": { bgcolor: groupColor(selectedGroupId) },
              }}
            >
              {scopedGroups.map((group) => <Tab key={group.id} value={group.id} label={<GroupMark group={group.id} />} aria-label={`Grupo ${group.name}`} />)}
            </Tabs>
            <IconButton
              aria-label={hasPersonViewFilter ? "Limpiar filtro de persona" : "Filtrar personas"}
              aria-pressed={hasPersonViewFilter}
              onClick={(event) => {
                if (hasPersonViewFilter) {
                  setSelectedPersonId(null);
                  setPersonSearch("");
                  setPersonFilterAnchor(null);
                  return;
                }
                setPersonFilterAnchor(event.currentTarget);
              }}
              sx={{ width: 36, height: 36, borderRadius: 0, color: hasPersonViewFilter ? "primary.main" : "text.secondary", bgcolor: hasPersonViewFilter ? ui.color.selected : "transparent" }}
            >
              {hasPersonViewFilter ? <FilterAltOffRounded sx={{ fontSize: 17 }} /> : <FilterAltRounded sx={{ fontSize: 17 }} />}
            </IconButton>
          </Box>
          <Stack role="list" aria-label={`Personas del grupo ${selectedGroup.name}`} sx={{ maxHeight: { xs: 152, md: "calc(100vh - 260px)" }, overflowY: "auto", p: 0.5 }}>
            {filteredWorkers.length === 0 ? (
              <Typography variant="caption" color="text.secondary" sx={{ p: 1 }}>{personSearch ? "No hay personas que coincidan con el filtro." : "Sin personas en esta operación."}</Typography>
            ) : filteredWorkers.map((worker) => {
              const workerExceptions = exceptions
                .filter((item) => item.operation === operation && item.workerId === worker.id)
                .sort((left, right) => left.startDate.localeCompare(right.startDate));
              return (
                <Box
                  key={worker.id}
                  role="listitem"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    minHeight: 32,
                    borderRadius: ui.control.radius,
                    bgcolor: selectedPersonId === worker.id ? "action.selected" : "transparent",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <ButtonBase
                    onClick={() => setSelectedPersonId((current) => current === worker.id ? null : worker.id)}
                    aria-pressed={selectedPersonId === worker.id}
                    aria-label={`Mostrar calendario de ${worker.name}`}
                    sx={{ flex: 1, minWidth: 0, minHeight: 32, px: 0.75, py: 0.5, borderRadius: ui.control.radius, justifyContent: "flex-start", textAlign: "left" }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700} noWrap>{worker.name}</Typography>
                      {worker.note && <Typography variant="caption" color="text.secondary" noWrap>{worker.note}</Typography>}
                    </Box>
                  </ButtonBase>
                  {workerExceptions[0] && (
                    <IconButton
                      aria-label={`${worker.name} tiene ${workerExceptions.length} ${workerExceptions.length === 1 ? "cambio temporal" : "cambios temporales"}. Ir al primero`}
                      title="Ir al primer cambio temporal"
                      onClick={() => scrollToFirstException(worker.id, workerExceptions[0]!.startDate)}
                      sx={{ width: 32, height: 32, color: "warning.main", flex: "0 0 auto" }}
                    >
                      <EventRepeatRounded sx={{ fontSize: 17 }} />
                    </IconButton>
                  )}
                </Box>
              );
            })}
          </Stack>
          <Menu anchorEl={personFilterAnchor} open={Boolean(personFilterAnchor)} onClose={() => setPersonFilterAnchor(null)}>
            <Box sx={{ px: 1, py: 0.5, width: 240 }}>
              <TextField
                autoFocus
                fullWidth
                value={personSearch}
                onChange={(event) => {
                  setPersonSearch(event.target.value);
                  setSelectedPersonId(null);
                }}
                placeholder="Buscar persona"
                aria-label="Buscar persona"
                onKeyDown={(event) => event.stopPropagation()}
              />
            </Box>
            <MenuItem disabled>{filteredWorkers.length} {filteredWorkers.length === 1 ? "coincidencia" : "coincidencias"} en Grupo {selectedGroup.name}</MenuItem>
            <Divider />
            <MenuItem
              disabled={!personSearch}
              onClick={() => {
                setPersonSearch("");
                setPersonFilterAnchor(null);
              }}
            >
              Limpiar filtro
            </MenuItem>
          </Menu>
        </Paper>

        <Stack gap={1} sx={{ minWidth: 0, width: "100%", maxWidth: 680 }}>
          <Stack direction="row" alignItems="center" gap={0.25} flexWrap="wrap">
            <IconButton aria-label="Mes anterior" onClick={() => setMonthOffset((value) => value - 1)} sx={{ width: 32, height: 32 }}><ArrowBackRounded fontSize="small" /></IconButton>
            <Button variant="outlined" onClick={() => setMonthOffset(0)}>Hoy</Button>
            <IconButton aria-label="Mes siguiente" onClick={() => setMonthOffset((value) => value + 1)} sx={{ width: 32, height: 32 }}><ArrowForwardRounded fontSize="small" /></IconButton>
            {selectedPerson && (
              <Stack direction="row" gap={0.5} alignItems="center" flexWrap="wrap" sx={{ ml: { sm: "auto" } }}>
                <Button
                  variant={exceptionMode ? "contained" : "outlined"}
                  startIcon={<SwapHorizRounded sx={{ fontSize: 15 }} />}
                  onClick={() => resetExceptionSelection(!exceptionMode)}
                >
                  Cambio temporal
                </Button>
                {selectedPersonExceptions.length > 0 && (
                  <>
                    <Button
                      variant="outlined"
                      startIcon={<EventRepeatRounded sx={{ fontSize: 15 }} />}
                      onClick={() => setExceptionDetailsOpen(true)}
                    >
                      Cambios ({selectedPersonExceptions.length})
                    </Button>
                    <Button
                      variant="outlined"
                      color="warning"
                      startIcon={<RestoreRounded sx={{ fontSize: 15 }} />}
                      onClick={() => setConfirmRevertAll(true)}
                    >
                      Revertir todo
                    </Button>
                  </>
                )}
                <Button
                  variant="outlined"
                  startIcon={<PersonRounded sx={{ fontSize: 15 }} />}
                  onClick={() => {
                    const person = assignments.find((item) => item.id === selectedPerson.worker.id);
                    if (person) onEditPerson(person);
                  }}
                >
                  Editar responsable
                </Button>
              </Stack>
            )}
          </Stack>

          {selectedPerson && exceptionMode && (
            <Paper variant="outlined" sx={{ px: 1, py: 0.75, borderRadius: 1.5, bgcolor: "background.paper" }}>
              <Stack gap={0.75}>
                <Stack direction={{ xs: "column", sm: "row" }} gap={0.75} alignItems={{ sm: "center" }}>
                  <Typography variant="caption" fontWeight={700} sx={{ flex: 1 }}>
                    {exceptionRange.startDate
                      ? exceptionRange.endDate
                        ? `${displayDate(exceptionRange.startDate)} – ${displayDate(exceptionRange.endDate)}`
                        : `${displayDate(exceptionRange.startDate)} · selecciona la fecha final`
                      : "Selecciona la fecha inicial y después la fecha final en el calendario."}
                  </Typography>
                  <TextField
                    select
                    label="Grupo u horario"
                    value={exceptionTarget}
                    onChange={(event) => setExceptionTarget(event.target.value)}
                    sx={{ minWidth: 190 }}
                  >
                    <MenuItem disabled>Grupos</MenuItem>
                    {pattern.groups
                      .filter((group) => group.id !== selectedPerson.group.id)
                      .map((group) => <MenuItem key={group.id} value={`group:${group.id}`}>Grupo {group.name}</MenuItem>)}
                    <MenuItem disabled>Horarios configurados</MenuItem>
                    {pattern.schedules.map((schedule) => <MenuItem key={schedule.id} value={`schedule:${schedule.id}`}>{schedule.name}</MenuItem>)}
                    <Divider />
                    <MenuItem value="custom:new">Horario personalizado…</MenuItem>
                  </TextField>
                  <Button
                    variant="contained"
                    disabled={!exceptionRange.endDate
                      || !exceptionTarget
                      || (exceptionTarget === "custom:new" && (!customExceptionName.trim() || !customExceptionStart || !customExceptionEnd || customExceptionStart === customExceptionEnd))}
                    onClick={applyException}
                  >
                    Aplicar
                  </Button>
                  <Button onClick={() => resetExceptionSelection(false)}>Cancelar</Button>
                </Stack>
                {exceptionTarget === "custom:new" && (
                  <Stack direction={{ xs: "column", sm: "row" }} gap={0.75} justifyContent="flex-end" alignItems={{ sm: "center" }}>
                    <TextField
                      label="Nombre"
                      value={customExceptionName}
                      onChange={(event) => setCustomExceptionName(event.target.value)}
                      sx={{ width: { xs: "100%", sm: 170 } }}
                    />
                    <TextField
                      label="Inicio"
                      type="time"
                      value={customExceptionStart}
                      onChange={(event) => setCustomExceptionStart(event.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ width: { xs: "100%", sm: 120 } }}
                    />
                    <TextField
                      label="Fin"
                      type="time"
                      value={customExceptionEnd}
                      onChange={(event) => setCustomExceptionEnd(event.target.value)}
                      InputLabelProps={{ shrink: true }}
                      error={Boolean(customExceptionStart && customExceptionEnd && customExceptionStart === customExceptionEnd)}
                      helperText={customExceptionStart && customExceptionEnd && customExceptionStart === customExceptionEnd ? "Debe ser diferente del inicio" : undefined}
                      FormHelperTextProps={{ sx: { mt: 0.25, fontSize: ui.typography.routine } }}
                      sx={{ width: { xs: "100%", sm: 160 } }}
                    />
                  </Stack>
                )}
              </Stack>
            </Paper>
          )}

      <Stack ref={calendarRef} gap={1.5} aria-label={selectedPerson ? `Calendario mensual de ${selectedPerson.worker.name}` : `Rotación mensual de grupos para ${operation}`}>
        {months.map((month) => {
          const calendarDates = monthCalendarDates(month);
          return (
            <Paper key={month.toISOString()} variant="outlined" sx={{ borderRadius: 1.5, overflow: "hidden", width: "100%" }}>
              <Box sx={{ minHeight: 36, px: 1, display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)", alignItems: "center", bgcolor: "background.default", borderBottom: "1px solid", borderColor: "divider" }}>
                <Typography variant="body2" fontWeight={700} sx={{ gridColumn: 1 }}>{monthTitle(month)}</Typography>
                {selectedPerson && (
                  <>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ gridColumn: 2, color: "text.primary", textAlign: "center" }}>{selectedPerson.worker.name}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ gridColumn: 3, justifySelf: "end" }}>Grupo {selectedPerson.group.name}</Typography>
                  </>
                )}
              </Box>
              <Box role="table" aria-label={`${monthTitle(month)} · ${operation}`} sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
                {weekdayLabels.map((weekday) => (
                  <Box key={weekday} role="columnheader" sx={{ minHeight: 28, display: "grid", placeItems: "center", bgcolor: "background.default", borderBottom: "1px solid", borderLeft: "1px solid", borderColor: "divider" }}>
                    <Typography variant="caption" fontWeight={700}>{isMobile ? weekday.slice(0, 2) : weekday}</Typography>
                  </Box>
                ))}
                {calendarDates.map((date, index) => {
                  if (!date) return <Box aria-hidden="true" key={`blank-${index}`} sx={{ minHeight: { xs: 54, sm: 62 }, bgcolor: "background.default", borderBottom: "1px solid", borderLeft: "1px solid", borderColor: "divider" }} />;
                  const dateKey = localDateKey(date);
                  const todayKey = localDateKey(new Date());
                  const gap = rotationGapForDate(operation, dateKey, operationAdjustments);
                  const coverage = gap ? rotationCoverageForDate(operation, dateKey, coverages) : null;
                  const isPastDate = dateKey < todayKey;
                  const isLockedDate = dateKey <= todayKey;
                  const canMoveDate = canEditSelectedOperation && !selectedPerson && dateKey > todayKey && !gap;
                  // A dragover can arrive before React has committed the drag-source state.
                  // Future cells are therefore eligible by date; onDrop resolves and validates
                  // the actual source from state or the native dataTransfer payload.
                  const canReceiveDrop = dateKey !== dragSourceDate && dateKey > todayKey;
                  const inDraftExceptionRange = Boolean(selectedPerson && exceptionMode && exceptionRange.startDate && (
                    exceptionRange.endDate
                      ? exceptionRange.startDate <= dateKey && dateKey <= exceptionRange.endDate
                      : exceptionRange.startDate === dateKey
                  ));
                  const personException = selectedPerson
                    ? exceptions.find((item) => item.operation === operation
                      && item.workerId === selectedPerson.worker.id
                      && item.startDate <= dateKey
                      && dateKey <= item.endDate) ?? null
                    : null;
                  const effectivePersonGroupId = selectedPerson && personException?.kind === "group" && personException.groupId
                    ? personException.groupId
                    : selectedPerson?.group.id ?? null;
                  return (
                    <Box
                      key={dateKey}
                      role="cell"
                      aria-disabled={isLockedDate}
                      data-date={dateKey}
                      data-pattern-state={gap ? "gap" : "scheduled"}
                      data-edit-state={isLockedDate ? "read-only" : "editable"}
                      data-exception-state={personException ? "temporary-change" : "regular"}
                      tabIndex={personException ? -1 : undefined}
                      draggable={canMoveDate}
                      onClick={() => {
                        if (selectedPerson && exceptionMode && !isLockedDate) chooseExceptionDate(dateKey);
                      }}
                      onDragStart={(event) => {
                        if (!canMoveDate) return;
                        setDragSourceDate(dateKey);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", dateKey);
                      }}
                      onDragEnd={() => { setDragSourceDate(null); setDropTargetDate(null); }}
                      onDragOver={(event) => {
                        if (!canReceiveDrop) return;
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        setDropTargetDate(dateKey);
                      }}
                      onDragLeave={() => setDropTargetDate((current) => current === dateKey ? null : current)}
                      onDrop={(event) => {
                        const sourceDate = dragSourceDate || event.dataTransfer.getData("text/plain");
                        if (!sourceDate || dateKey === sourceDate || dateKey <= todayKey) return;
                        event.preventDefault();
                        if (dateKey < sourceDate) {
                          setPendingOverwriteMove({ sourceDate, targetDate: dateKey });
                        } else {
                          onMovePattern(operation, sourceDate, dateKey);
                        }
                        setDragSourceDate(null);
                        setDropTargetDate(null);
                      }}
                      title={isLockedDate
                        ? isPastDate
                          ? "Fecha pasada · solo lectura"
                          : "Hoy · solo lectura"
                        : canMoveDate
                          ? "Arrastra este día a otra fecha futura para mover el patrón completo"
                          : undefined}
                      sx={{
                        minHeight: { xs: 54, sm: 62 },
                        p: 0.25,
                        borderBottom: "1px solid",
                        borderLeft: "1px solid",
                        borderColor: dropTargetDate === dateKey ? "primary.main" : "divider",
                        outline: dropTargetDate === dateKey || inDraftExceptionRange || Boolean(personException) ? "2px solid" : "none",
                        outlineColor: dropTargetDate === dateKey || inDraftExceptionRange ? "primary.main" : "warning.main",
                        outlineOffset: -2,
                        bgcolor: isLockedDate
                          ? ui.color.canvas
                          : gap
                            ? "background.default"
                            : date.getDay() === 0 || date.getDay() === 6
                              ? "background.default"
                              : "background.paper",
                        cursor: isLockedDate ? "not-allowed" : selectedPerson && exceptionMode ? "pointer" : canMoveDate ? "grab" : "default",
                        "&:active": canMoveDate ? { cursor: "grabbing" } : undefined,
                      }}
                    >
                      <Box sx={{ minHeight: 20, mb: 0.25, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        {selectedPerson && exceptionMode ? (
                          <ButtonBase
                            onClick={(event) => {
                              event.stopPropagation();
                              chooseExceptionDate(dateKey);
                            }}
                            aria-label={`Seleccionar ${dateLabel(date)} para cambio temporal`}
                            sx={{ minWidth: 24, minHeight: 20, borderRadius: ui.control.radius, color: "text.secondary", fontSize: ui.typography.routine, fontWeight: 700 }}
                          >
                            {date.getDate()}
                          </ButtonBase>
                        ) : (
                          <Typography
                            variant="caption"
                            fontWeight={700}
                            color="text.secondary"
                            sx={{ display: "block", opacity: isLockedDate ? 0.55 : 1 }}
                          >
                            {date.getDate()}
                          </Typography>
                        )}
                        {personException && (
                          <EventRepeatRounded
                            aria-label={`Cambio temporal del ${displayDate(personException.startDate)} al ${displayDate(personException.endDate)}`}
                            sx={{ fontSize: 14, color: "warning.main" }}
                          />
                        )}
                      </Box>
                      <Stack
                        gap={0.25}
                        sx={{
                          minHeight: { xs: 28, sm: 32 },
                          ...(selectedPerson ? { display: "grid", gridTemplateRows: "repeat(2, minmax(0, 1fr))" } : {}),
                          opacity: isLockedDate ? 0.42 : 1,
                          filter: isLockedDate ? "grayscale(0.75)" : "none",
                          pointerEvents: isLockedDate ? "none" : "auto",
                        }}
                      >
                        {gap && coverage && ([
                          { group: coverage.dayGroup, phase: "day" as const },
                          { group: coverage.nightGroup, phase: "night" as const },
                          ...(selectedPerson && effectivePersonGroupId !== coverage.dayGroup && effectivePersonGroupId !== coverage.nightGroup
                            ? [{ group: effectivePersonGroupId!, phase: "rest" as const }]
                            : []),
                        ])
                          .filter((item) => !selectedPerson || item.group === effectivePersonGroupId)
                          .map((item) => {
                          const exceptionSchedule = selectedPerson ? scheduleForException(pattern, personException) : null;
                          const effectivePhase = exceptionSchedule ? scheduleVisualPhase(exceptionSchedule) : item.phase;
                          const effectiveLabel = exceptionSchedule?.name ?? phaseLabels[item.phase];
                          return (
                          <ButtonBase
                            key={`${item.group}-${item.phase}-${dateKey}`}
                            onClick={exceptionMode ? undefined : () => onConfigureGap(operation, dateKey)}
                            disabled={isLockedDate || !canEditSelectedOperation}
                            aria-label={`${effectiveLabel} del grupo ${item.group}, cobertura temporal, ${dateLabel(date)}`}
                            sx={{
                              width: "100%",
                              flex: 1,
                              minHeight: 14,
                              px: 0.25,
                              borderRadius: ui.control.radius,
                              justifyContent: "center",
                              gridRow: selectedPerson ? effectivePhase === "day" ? "1" : effectivePhase === "night" ? "2" : "1 / span 2" : undefined,
                              bgcolor: selectedPerson ? phaseTone[effectivePhase].background : effectivePhase === "rest" ? phaseTone.rest.background : groupColor(item.group),
                              color: selectedPerson ? phaseTone[effectivePhase].color : effectivePhase === "rest" ? phaseTone.rest.color : ui.color.textInverse,
                              border: `1px solid ${selectedPerson ? phaseTone[effectivePhase].border : effectivePhase === "rest" ? phaseTone.rest.border : groupColor(item.group)}`,
                            }}
                          >
                            <Typography variant="caption" fontWeight={700} noWrap sx={{ lineHeight: 1 }}>{selectedPerson ? effectiveLabel : item.group}</Typography>
                          </ButtonBase>
                          );
                        })}
                        {gap && !coverage && (
                          <ButtonBase
                            onClick={() => onConfigureGap(operation, dateKey)}
                            disabled={isLockedDate || !canEditSelectedOperation}
                            aria-label={`Día sin patrón, ${dateLabel(date)}. Configurar cobertura temporal`}
                            sx={{ width: "100%", flex: 1, minHeight: 38, px: 0.5, borderRadius: ui.control.radius, border: "1px dashed", borderColor: "warning.main", color: "warning.dark", bgcolor: "background.paper" }}
                          >
                            <Typography variant="caption" fontWeight={700}>Sin patrón</Typography>
                          </ButtonBase>
                        )}
                        {!gap && visibleGroups
                          .map((group) => ({
                            group,
                            schedule: scheduledPhase(effectivePersonGroupId ?? group.id, date, pattern, operationAdjustments),
                          }))
                          .filter(({ schedule }) => Boolean(selectedPerson) || !scheduleFor(pattern, schedule.scheduleId!).isRest)
                          .sort((left, right) => pattern.schedules.findIndex((item) => item.id === left.schedule.scheduleId) - pattern.schedules.findIndex((item) => item.id === right.schedule.scheduleId))
                          .map(({ group, schedule }) => {
                          const person = selectedPerson?.worker ?? null;
                          const personUnavailable = Boolean(person && (person.availability === "vacation" || person.availability === "sick") && date.getDate() === 25);
                          const restSchedule = pattern.schedules.find((item) => item.isRest) ?? pattern.schedules[0]!;
                          const effectiveSchedule = personUnavailable
                            ? restSchedule
                            : scheduleForException(pattern, personException) ?? scheduleFor(pattern, schedule.scheduleId!);
                          const visualPhase = scheduleVisualPhase(effectiveSchedule);
                          const scheduleLabel = effectiveSchedule.name;
                          const tone = person
                            ? phaseTone[visualPhase]
                            : { background: groupColor(group.id), color: ui.color.textInverse, border: groupColor(group.id) };
                          return (
                            <ButtonBase
                              key={`${group.id}-${dateKey}`}
                              disabled={isLockedDate}
                              aria-label={`${person?.name ?? `Grupo ${group.id}`}, ${dateLabel(date)}, ${scheduleLabel}${personException ? ", cambio temporal" : ""}`}
                              sx={{
                                position: "relative",
                                width: "100%",
                                flex: 1,
                                minHeight: 14,
                                px: 0.25,
                                borderRadius: ui.control.radius,
                                justifyContent: "center",
                                gridRow: person ? scheduleLane(effectiveSchedule) : undefined,
                                bgcolor: tone.background,
                                color: tone.color,
                                border: `1px solid ${tone.border}`,
                              }}
                            >
                              <Typography variant="caption" fontWeight={700} noWrap sx={{ lineHeight: 1.15 }}>
                                {person ? scheduleLabel : group.id}
                              </Typography>
                            </ButtonBase>
                          );
                        })}
                      </Stack>
                    </Box>
                  );
                })}
              </Box>
            </Paper>
          );
        })}
      </Stack>
      <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
        {pattern.schedules.map((schedule) => {
          const visualPhase = scheduleVisualPhase(schedule);
          return (
          <Stack key={schedule.id} direction="row" gap={0.5} alignItems="center">
            <Box sx={{ width: 9, height: 9, borderRadius: "2px", bgcolor: phaseTone[visualPhase].background, border: `1px solid ${phaseTone[visualPhase].border}` }} />
            <Typography variant="caption">{schedule.name}</Typography>
          </Stack>
          );
        })}
        <Typography variant="caption" color="text.secondary">
          Referencia {displayDate(pattern.effectiveFrom)}: {pattern.groups.map((group) => `${group.name} ${scheduleFor(pattern, group.anchorScheduleId).name}`).join(" · ")}
        </Typography>
        {selectedPersonExceptions.length > 0 && (
          <Stack direction="row" gap={0.5} alignItems="center">
            <EventRepeatRounded sx={{ fontSize: 14, color: "warning.main" }} />
            <Typography variant="caption">Cambio temporal</Typography>
          </Stack>
        )}
        </Stack>
      </Stack>
      </Box>
      <Dialog open={exceptionDetailsOpen} onClose={() => setExceptionDetailsOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Cambios temporales · {selectedPerson?.worker.name ?? "Responsable"}</DialogTitle>
        <DialogContent dividers>
          <Stack gap={1}>
            <Typography variant="body2" color="text.secondary">
              Cada cambio reemplaza temporalmente el horario regular del Grupo {selectedPerson?.group.name ?? "—"} durante el período indicado.
            </Typography>
            {selectedPersonExceptions.map((exception) => {
              const regularScheduleNames = selectedPerson
                ? Array.from(
                  { length: Math.max(1, dayDifference(dateFromKey(exception.endDate), exception.startDate) + 1) },
                  (_, index) => {
                    const dateKey = addDaysKey(exception.startDate, index);
                    const regular = scheduledPhase(selectedPerson.group.id, dateFromKey(dateKey), pattern, operationAdjustments);
                    return regular.scheduleId ? scheduleFor(pattern, regular.scheduleId).name : "Sin patrón";
                  },
                ).filter((name, index, items) => items.indexOf(name) === index)
                : [];
              const targetSchedule = scheduleForException(pattern, exception);
              const targetLabel = exception.kind === "group"
                ? `Grupo ${exception.groupName ?? exception.groupId ?? "—"}`
                : exception.kind === "custom" && targetSchedule
                  ? `${targetSchedule.name} · ${targetSchedule.start}–${targetSchedule.end}`
                  : targetSchedule?.name ?? "Horario especial";
              const regularLabel = exception.kind === "group"
                ? `Grupo ${selectedPerson?.group.name ?? "—"}`
                : `Grupo ${selectedPerson?.group.name ?? "—"} · ${regularScheduleNames.join(" / ")}`;
              return (
                <Paper key={exception.id} variant="outlined" sx={{ p: 1, borderRadius: 1.5 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} gap={1} alignItems={{ sm: "center" }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700}>{displayDate(exception.startDate)} – {displayDate(exception.endDate)}</Typography>
                      <Typography variant="caption" color="text.secondary">{regularLabel} → {targetLabel}</Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      color="warning"
                      startIcon={<RestoreRounded sx={{ fontSize: 15 }} />}
                      onClick={() => {
                        onRemoveExceptions([exception.id]);
                        if (selectedPersonExceptions.length === 1) setExceptionDetailsOpen(false);
                      }}
                    >
                      Revertir
                    </Button>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExceptionDetailsOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={confirmRevertAll} onClose={() => setConfirmRevertAll(false)} fullWidth maxWidth="xs">
        <DialogTitle>Volver al horario regular</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            {selectedPersonExceptions.length === 1 ? "Se eliminará el cambio temporal" : `Se eliminarán los ${selectedPersonExceptions.length} cambios temporales`} de {selectedPerson?.worker.name ?? "esta persona"}. Su calendario volverá a seguir el Grupo {selectedPerson?.group.name ?? "—"}.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRevertAll(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<RestoreRounded sx={{ fontSize: 15 }} />}
            onClick={() => {
              onRemoveExceptions(selectedPersonExceptions.map((item) => item.id));
              setConfirmRevertAll(false);
              setExceptionDetailsOpen(false);
            }}
          >
            Revertir cambios
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(pendingOverwriteMove)}
        onClose={() => setPendingOverwriteMove(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Sobrescribir patrón existente</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            El patrón de grupos del {pendingOverwriteMove ? fullDateLabel(pendingOverwriteMove.sourceDate) : ""} se moverá al {pendingOverwriteMove ? fullDateLabel(pendingOverwriteMove.targetDate) : ""}. Lo programado desde esa fecha será reemplazado.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingOverwriteMove(null)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (!pendingOverwriteMove) return;
              onMovePattern(operation, pendingOverwriteMove.sourceDate, pendingOverwriteMove.targetDate);
              setPendingOverwriteMove(null);
            }}
          >
            Sobrescribir
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function PersonDrawer({
  assignment,
  groupOptions,
  onClose,
  onSave,
  onDeactivate,
  onActivate,
}: {
  assignment: Responsibility | null;
  groupOptions: RotationPatternGroup[];
  onClose: () => void;
  onSave: (assignment: Responsibility) => void;
  onDeactivate: (id: string) => void;
  onActivate: (id: string) => void;
}) {
  if (!assignment) return null;
  return <PersonDrawerContent key={assignment.id} assignment={assignment} groupOptions={groupOptions} onClose={onClose} onSave={onSave} onDeactivate={onDeactivate} onActivate={onActivate} />;
}

function PersonDrawerContent({
  assignment,
  groupOptions,
  onClose,
  onSave,
  onDeactivate,
  onActivate,
}: {
  assignment: Responsibility;
  groupOptions: RotationPatternGroup[];
  onClose: () => void;
  onSave: (assignment: Responsibility) => void;
  onDeactivate: (id: string) => void;
  onActivate: (id: string) => void;
}) {
  const isMobile = useMediaQuery("(max-width:599px)");
  const [person, setPerson] = useState(assignment.person);
  const [position, setPosition] = useState(assignment.position);
  const [selectedOperations, setSelectedOperations] = useState(assignment.operations);
  const [warehouseType, setWarehouseType] = useState<WarehouseType | null>(assignment.warehouseType);
  const [group, setGroup] = useState<WorkerGroup["id"] | null>(assignment.group);
  const [validFrom, setValidFrom] = useState(dateInputValue(assignment.validFrom));
  const [validTo, setValidTo] = useState(dateInputValue(assignment.validTo));
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const rule = ruleFor(position);
  const isInactive = assignment.state === "inactive";

  const persist = (patch: Partial<Responsibility> = {}) => {
    const updated = {
      ...assignment,
      person,
      position,
      operations: !rule || rule.operationMode === "blocked" ? [] : selectedOperations,
      warehouseType: !rule || rule.warehouseMode === "blocked" ? null : rule.warehouseMode === "work_in_process" ? "Productos en proceso" as const : warehouseType,
      scope: rule?.scope ?? null,
      group: rule ? (rule.groupRequired ? (group ?? groupOptions[0]?.id ?? "A") : null) : group,
      validFrom: displayDate(validFrom) ?? assignment.validFrom,
      validTo: displayDate(validTo),
      setupComplete: Boolean(rule),
      ...patch,
    };
    onSave(updated);
  };

  const changePosition = (nextPosition: string) => {
    const nextRule = ruleFor(nextPosition);
    if (!nextRule) return;
    const nextOperations = nextRule.operationMode === "blocked"
      ? []
      : selectedOperations.length
        ? nextRule.operationMode === "single"
          ? [selectedOperations[0]!]
          : selectedOperations
        : ["Impresión"];
    const nextWarehouse = nextRule.warehouseMode === "blocked"
      ? null
      : nextRule.warehouseMode === "work_in_process"
        ? "Productos en proceso" as const
        : warehouseType ?? "Materias primas";
    const nextGroup = nextRule.groupRequired ? group ?? groupOptions[0]?.id ?? "A" : null;
    setPosition(nextPosition);
    setSelectedOperations(nextOperations);
    setWarehouseType(nextWarehouse);
    setGroup(nextGroup);
    onSave({
      ...assignment,
      person,
      position: nextPosition,
      operations: nextOperations,
      warehouseType: nextWarehouse,
      scope: nextRule.scope,
      group: nextGroup,
      setupComplete: true,
      state: assignment.state === "future" && assignment.setupComplete === false ? "active" : assignment.state,
    });
  };

  const close = () => {
    persist();
    onClose();
  };

  return (
    <>
      <Drawer
        anchor={isMobile ? "bottom" : "right"}
        open
        onClose={close}
        PaperProps={{ sx: isMobile ? { maxHeight: "88vh", borderRadius: "16px 16px 0 0" } : { width: "min(480px, 100vw)" } }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2, pb: 1 }}>
          <Box>
            <Typography variant="h2">Editar persona responsable</Typography>
            <Typography variant="caption" color="text.secondary">{assignment.person}</Typography>
          </Box>
          <IconButton aria-label="Cerrar persona" onClick={close} sx={{ width: 40, height: 40 }}><CloseRounded fontSize="small" /></IconButton>
        </Stack>
        <Divider />
        <Stack gap={1.5} sx={{ p: 2, overflowY: "auto" }}>
          <TextField disabled={isInactive} fullWidth label="Persona" value={person} onChange={(event) => setPerson(event.target.value)} onBlur={() => persist()} />
          <TextField disabled={isInactive} fullWidth select label="Posición estandarizada" value={position} onChange={(event) => changePosition(event.target.value)}>
            {!position && <MenuItem value="" disabled>Selecciona una posición</MenuItem>}
            {positionOptions.map((item) => <MenuItem value={item} key={item}>{item}</MenuItem>)}
          </TextField>
          <TextField disabled={isInactive} fullWidth label="Tipo de cobertura" value={rule ? scopeLabels[rule.scope] : "Por completar"} slotProps={{ input: { readOnly: true } }} />
          {rule?.operationMode === "single" && (
            <TextField
              disabled={isInactive}
              fullWidth
              select
              label="Operación"
              value={selectedOperations[0] ?? "Impresión"}
              onChange={(event) => {
                const operationsValue = [event.target.value];
                setSelectedOperations(operationsValue);
                persist({ operations: operationsValue });
              }}
            >
              {operations.filter((item) => item !== "Todas").map((item) => <MenuItem value={item} key={item}>{item}</MenuItem>)}
            </TextField>
          )}
          {rule?.operationMode === "multiple" && (
            <TextField
              disabled={isInactive}
              fullWidth
              select
              label="Operaciones"
              value={selectedOperations}
              SelectProps={{ multiple: true, renderValue: (selected) => (selected as string[]).join(", ") }}
              onChange={(event) => {
                const value = event.target.value;
                const operationsValue = typeof value === "string" ? value.split(",") : value as string[];
                setSelectedOperations(operationsValue);
                persist({ operations: operationsValue });
              }}
            >
              {operations.map((item) => <MenuItem value={item} key={item}>{item}</MenuItem>)}
            </TextField>
          )}
          {rule?.warehouseMode === "select" && (
            <TextField
              disabled={isInactive}
              fullWidth
              select
              label="Tipo de almacén"
              value={warehouseType ?? "Materias primas"}
              onChange={(event) => {
                const nextWarehouse = event.target.value as WarehouseType;
                setWarehouseType(nextWarehouse);
                persist({ warehouseType: nextWarehouse });
              }}
            >
              {warehouseTypes.map((item) => <MenuItem value={item} key={item}>{item}</MenuItem>)}
            </TextField>
          )}
          {rule?.warehouseMode === "work_in_process" && (
            <TextField disabled={isInactive} fullWidth label="Tipo de almacén" value="Productos en proceso" slotProps={{ input: { readOnly: true } }} />
          )}
          {(rule?.groupRequired || !rule) && (
            <TextField disabled={isInactive} fullWidth select label="Grupo" value={group ?? groupOptions[0]?.id ?? "A"} onChange={(event) => {
              const nextGroup = event.target.value as WorkerGroup["id"];
              setGroup(nextGroup);
              persist({ group: nextGroup });
            }}>
              {groupOptions.map((item) => <MenuItem value={item.id} key={item.id}>Grupo {item.name}</MenuItem>)}
            </TextField>
          )}
          <Stack direction="row" gap={1}>
            <TextField
              disabled={isInactive}
              label="Vigente desde"
              type="date"
              value={validFrom}
              onChange={(event) => setValidFrom(event.target.value)}
              onBlur={() => persist({ validFrom: displayDate(validFrom) ?? assignment.validFrom })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              disabled={isInactive}
              label="Vigente hasta"
              type="date"
              value={validTo}
              onChange={(event) => setValidTo(event.target.value)}
              onBlur={() => persist({ validTo: displayDate(validTo) })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
          {!isInactive && rule && <Paper variant="outlined" sx={{ p: 1, borderRadius: 1.5, bgcolor: "background.default" }}>
            <Typography variant="caption" fontWeight={700}>Cobertura de alertas</Typography>
            <Typography variant="body2" sx={{ mt: 0.25 }}>
              {person} recibirá las alertas de {scopeLabels[rule.scope].toLocaleLowerCase("es-PE")}
              {rule.operationMode !== "blocked" ? ` en ${selectedOperations.join(" y ")}` : ""}
              {rule.warehouseMode !== "blocked" ? ` del almacén de ${(rule.warehouseMode === "work_in_process" ? "Productos en proceso" : warehouseType ?? "Materias primas").toLocaleLowerCase("es-PE")}` : ""}
              {rule.groupRequired ? ` cuando esté activo el Grupo ${group ?? "A"}` : ""}.
            </Typography>
          </Paper>}
        </Stack>
        <Stack direction="row" justifyContent="flex-start" gap={1} sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>
          {assignment.state !== "inactive" ? (
            <Button color="error" startIcon={<PersonOffRounded sx={{ fontSize: 15 }} />} onClick={() => setConfirmDeactivate(true)}>Desactivar</Button>
          ) : (
            <Button color="success" variant="contained" startIcon={<PersonRounded sx={{ fontSize: 15 }} />} onClick={() => onActivate(assignment.id)}>Activar</Button>
          )}
        </Stack>
      </Drawer>
      <Dialog open={confirmDeactivate} onClose={() => setConfirmDeactivate(false)} fullWidth maxWidth="xs">
        <DialogTitle>Desactivar a {assignment.person}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">La persona dejará de recibir alertas. Su historial permanecerá disponible como registro inactivo.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeactivate(false)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={() => onDeactivate(assignment.id)}>Desactivar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function AddPersonDialog({
  open,
  onClose,
  onAdd,
  onEditExisting,
  existingPeople,
  rotationPatterns,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (assignment: Responsibility) => void;
  onEditExisting: (assignment: Responsibility) => void;
  existingPeople: Responsibility[];
  rotationPatterns: Record<string, RotationPattern>;
}) {
  const [person, setPerson] = useState("");
  const [position, setPosition] = useState<Position>("Operador de máquina");
  const [selectedOperations, setSelectedOperations] = useState<string[]>(["Impresión"]);
  const [warehouseType, setWarehouseType] = useState<WarehouseType>("Materias primas");
  const [group, setGroup] = useState<WorkerGroup["id"]>("A");
  const [duplicateDecision, setDuplicateDecision] = useState<{
    person: string;
    matchId: string;
    decision: "same" | "different";
  } | null>(null);
  const rule = positionRules[position];
  const groupOptions = (rotationPatterns[selectedOperations[0] ?? "Impresión"] ?? defaultRotationPattern()).groups;
  const exactDuplicate = useMemo(
    () => existingPeople.find((item) => normalizeExactPersonName(person) === normalizeExactPersonName(item.person)),
    [existingPeople, person],
  );
  const fuzzyDuplicate = useMemo(() => {
    if (!person.trim() || exactDuplicate) return null;
    return existingPeople
      .filter((item) => isLikelyDuplicateName(person, item.person))
      .sort((left, right) => duplicateSimilarity(person, right.person) - duplicateSimilarity(person, left.person))[0] ?? null;
  }, [exactDuplicate, existingPeople, person]);
  const currentDuplicateDecision = duplicateDecision?.person === person
    && duplicateDecision.matchId === fuzzyDuplicate?.id
    ? duplicateDecision.decision
    : null;

  const changePosition = (nextPosition: string) => {
    const typedPosition = nextPosition as Position;
    const nextRule = positionRules[typedPosition];
    setPosition(typedPosition);
    if (nextRule.operationMode === "blocked") setSelectedOperations([]);
    else if (nextRule.operationMode === "single") setSelectedOperations([selectedOperations[0] ?? "Impresión"]);
    else if (!selectedOperations.length) setSelectedOperations(["Impresión"]);
    if (nextRule.warehouseMode === "work_in_process") setWarehouseType("Productos en proceso");
  };

  const add = () => {
    if (!person.trim() || exactDuplicate || (fuzzyDuplicate && currentDuplicateDecision !== "different")) return;
    onAdd({
      id: `person-${Date.now()}`,
      person: person.trim(),
      position,
      operations: rule.operationMode === "blocked" ? [] : selectedOperations,
      warehouseType: rule.warehouseMode === "blocked" ? null : rule.warehouseMode === "work_in_process" ? "Productos en proceso" : warehouseType,
      scope: rule.scope,
      group: rule.groupRequired ? group : null,
      validFrom: "25 jul 2026",
      validTo: null,
      state: "active",
    });
    setPerson("");
    setDuplicateDecision(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Agregar persona responsable</DialogTitle>
      <DialogContent>
        <Stack gap={1.5} sx={{ pt: 1 }}>
          <TextField
            fullWidth
            autoFocus
            label="Nombre completo"
            value={person}
            onChange={(event) => {
              setPerson(event.target.value);
              setDuplicateDecision(null);
            }}
            slotProps={{ inputLabel: { shrink: true } }}
            error={Boolean(exactDuplicate)}
            helperText={exactDuplicate ? `Ya existe exactamente “${exactDuplicate.person}”. Edita ese registro en lugar de crear otro.` : undefined}
          />
          {fuzzyDuplicate && (
            <Alert severity={currentDuplicateDecision === "different" ? "success" : "warning"}>
              <Stack gap={0.75}>
                <Typography variant="body2" fontWeight={700}>
                  ¿“{person.trim()}” y “{fuzzyDuplicate.person}” son la misma persona?
                </Typography>
                {currentDuplicateDecision === "different" && (
                  <Typography variant="caption">Se guardará como una persona distinta.</Typography>
                )}
                <Stack direction="row" gap={0.5} flexWrap="wrap">
                  <Button
                    variant={currentDuplicateDecision === "different" ? "contained" : "outlined"}
                    onClick={() => setDuplicateDecision({ person, matchId: fuzzyDuplicate.id, decision: "different" })}
                  >
                    No, son distintas
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setDuplicateDecision({ person, matchId: fuzzyDuplicate.id, decision: "same" });
                      setPerson("");
                      onEditExisting(fuzzyDuplicate);
                    }}
                  >
                    Sí, editar existente
                  </Button>
                </Stack>
              </Stack>
            </Alert>
          )}
          <TextField fullWidth select label="Posición estandarizada" value={position} onChange={(event) => changePosition(event.target.value)}>
            {positionOptions.map((item) => <MenuItem value={item} key={item}>{item}</MenuItem>)}
          </TextField>
          <TextField fullWidth label="Tipo de cobertura" value={scopeLabels[rule.scope]} slotProps={{ input: { readOnly: true } }} />
          {rule.operationMode === "single" && (
            <TextField fullWidth select label="Operación" value={selectedOperations[0] ?? "Impresión"} onChange={(event) => setSelectedOperations([event.target.value])}>
              {operations.map((item) => <MenuItem value={item} key={item}>{item}</MenuItem>)}
            </TextField>
          )}
          {rule.operationMode === "multiple" && (
            <TextField
              fullWidth
              select
              label="Operaciones"
              value={selectedOperations}
              SelectProps={{ multiple: true, renderValue: (selected) => (selected as string[]).join(", ") }}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedOperations(typeof value === "string" ? value.split(",") : value as string[]);
              }}
            >
              {operations.map((item) => <MenuItem value={item} key={item}>{item}</MenuItem>)}
            </TextField>
          )}
          {rule.warehouseMode === "select" && (
            <TextField fullWidth select label="Tipo de almacén" value={warehouseType} onChange={(event) => setWarehouseType(event.target.value as WarehouseType)}>
              {warehouseTypes.map((item) => <MenuItem value={item} key={item}>{item}</MenuItem>)}
            </TextField>
          )}
          {rule.warehouseMode === "work_in_process" && <TextField fullWidth label="Tipo de almacén" value="Productos en proceso" slotProps={{ input: { readOnly: true } }} />}
          {rule.groupRequired && <TextField fullWidth select label="Grupo" value={group} onChange={(event) => setGroup(event.target.value as WorkerGroup["id"])}>{groupOptions.map((item) => <MenuItem value={item.id} key={item.id}>Grupo {item.name}</MenuItem>)}</TextField>}
          <TextField fullWidth label="Vigente desde" type="date" defaultValue="2026-07-25" InputLabelProps={{ shrink: true }} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          disabled={!person.trim() || Boolean(exactDuplicate) || Boolean(fuzzyDuplicate && currentDuplicateDecision !== "different")}
          onClick={add}
        >
          Agregar persona
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function RosterImportDialog({
  open,
  existingPeople,
  onClose,
  onImport,
}: {
  open: boolean;
  existingPeople: Responsibility[];
  onClose: () => void;
  onImport: (rows: RosterImportEntry[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<RosterImportResult | null>(null);
  const [fatalError, setFatalError] = useState("");
  const [reading, setReading] = useState(false);
  const [duplicateDecisions, setDuplicateDecisions] = useState<Record<string, "same" | "different">>({});
  const [overwriteDecisions, setOverwriteDecisions] = useState<Record<string, "overwrite" | "skip">>({});

  const reset = () => {
    setResult(null);
    setFatalError("");
    setReading(false);
    setDuplicateDecisions({});
    setOverwriteDecisions({});
    if (inputRef.current) inputRef.current.value = "";
  };
  const close = () => {
    reset();
    onClose();
  };
  const chooseFile = () => inputRef.current?.click();
  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    reset();
    if (!file.name.toLocaleLowerCase("es-PE").endsWith(".xlsx")) {
      setFatalError("El archivo debe estar en formato .xlsx.");
      return;
    }
    setReading(true);
    try {
      const rows = await readSheet(file);
      setResult(validateRosterRows(rows, existingPeople, file.name));
    } catch {
      setFatalError("No se pudo leer el Excel. Verifica que el archivo no esté dañado y vuelve a intentarlo.");
    } finally {
      setReading(false);
    }
  };
  const incompleteCount = result?.rows.filter((row) => row.value.setupComplete === false).length ?? 0;
  const duplicateReviews = result?.duplicateReviews ?? [];
  const unresolvedDuplicateCount = duplicateReviews.filter((item) => !duplicateDecisions[item.id]).length;
  const confirmedExcelDuplicateCount = duplicateReviews.filter((item) => item.source === "excel" && duplicateDecisions[item.id] === "same").length;
  const resolvedRows = result?.rows.map((entry) => {
    const databaseMatch = duplicateReviews.find((review) => (
      review.row === entry.row
      && review.source === "database"
      && duplicateDecisions[review.id] === "same"
    ));
    return databaseMatch?.matchId ? { ...entry, targetId: databaseMatch.matchId } : entry;
  }) ?? [];
  const updateCount = resolvedRows.filter((row) => row.targetId).length;
  const createCount = resolvedRows.length - updateCount;
  const overwriteReviews = resolvedRows.flatMap((entry) => {
    if (!entry.targetId) return [];
    const existing = existingPeople.find((person) => person.id === entry.targetId);
    if (!existing) return [];
    const changes = rosterOverwriteChanges(existing, entry);
    return changes.length ? [{ key: `${entry.row}-${entry.targetId}`, entry, existing, changes }] : [];
  });
  const unresolvedOverwriteCount = overwriteReviews.filter((review) => !overwriteDecisions[review.key]).length;
  const approvedUpdateRows = overwriteReviews
    .filter((review) => overwriteDecisions[review.key] === "overwrite")
    .map((review) => review.entry);
  const createRows = resolvedRows.filter((row) => !row.targetId);
  const rowsToImport = [...createRows, ...approvedUpdateRows];
  const preflightIssues = resolvedRows.flatMap((entry) => {
    const existing = entry.targetId
      ? existingPeople.find((person) => person.id === entry.targetId) ?? null
      : null;
    const candidate = existing ? mergeRosterImport(existing, entry) : entry.value;
    return validateImportCandidate(candidate).map((message) => ({
      key: `${entry.row}-${entry.targetId ?? entry.value.id}`,
      row: entry.row,
      person: entry.value.person,
      message,
    }));
  });
  const importBlocked = !result
    || result.errors.length > 0
    || result.rows.length === 0
    || unresolvedDuplicateCount > 0
    || confirmedExcelDuplicateCount > 0
    || unresolvedOverwriteCount > 0
    || preflightIssues.length > 0;

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="md">
      <DialogTitle>Importar personas desde Excel</DialogTitle>
      <DialogContent dividers>
        <Stack gap={1.25}>
          <Typography variant="body2">
            El Excel solo debe incluir <strong>Persona</strong>. Puede incluir Grupo, Posición, Área, Cobertura, Vigente desde, Vigente hasta y Estado.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Todos los valores se comparan con los catálogos de Monitor. Si existe un error, no se importa ninguna fila.
          </Typography>
          <input ref={inputRef} hidden type="file" accept=".xlsx" onChange={readFile} />
          <Button
            variant="outlined"
            startIcon={<FileUploadRounded sx={{ fontSize: 15 }} />}
            onClick={chooseFile}
            disabled={reading}
            sx={{ alignSelf: "flex-start" }}
          >
            {reading ? "Validando…" : result || fatalError ? "Elegir otro Excel" : "Seleccionar Excel"}
          </Button>

          {fatalError && <Alert severity="error">{fatalError} No se importó ninguna persona.</Alert>}
          {result && result.errors.length > 0 && (
            <>
              <Alert severity="error">
                No se importó ninguna persona. Corrige {result.errors.length === 1 ? "el error indicado" : `los ${result.errors.length} errores indicados`} en {result.filename} y vuelve a intentarlo.
              </Alert>
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 280, borderRadius: 1.5 }}>
                <Table size="small" stickyHeader aria-label="Errores encontrados en el Excel">
                  <TableHead><TableRow><TableCell sx={{ width: 56 }}>Fila</TableCell><TableCell sx={{ width: 128 }}>Columna</TableCell><TableCell sx={{ width: 180 }}>Valor</TableCell><TableCell>Error</TableCell></TableRow></TableHead>
                  <TableBody>
                    {result.errors.map((item, index) => (
                      <TableRow key={`${item.row}-${item.column}-${index}`}>
                        <TableCell>{item.row}</TableCell>
                        <TableCell>{item.column}</TableCell>
                        <TableCell><Typography variant="body2" noWrap>{item.value || "—"}</Typography></TableCell>
                        <TableCell>{item.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
          {result && result.errors.length === 0 && duplicateReviews.length > 0 && (
            <Stack gap={0.75}>
              <Alert severity={confirmedExcelDuplicateCount > 0 ? "error" : unresolvedDuplicateCount > 0 ? "warning" : "success"}>
                {confirmedExcelDuplicateCount > 0
                  ? `${confirmedExcelDuplicateCount} ${confirmedExcelDuplicateCount === 1 ? "persona está repetida" : "personas están repetidas"} dentro del Excel. Corrige esas filas y vuelve a intentarlo.`
                  : unresolvedDuplicateCount > 0
                    ? `Confirma ${unresolvedDuplicateCount === 1 ? "esta coincidencia" : `estas ${unresolvedDuplicateCount} coincidencias`} antes de importar.`
                    : "Las coincidencias fueron revisadas. Las personas confirmadas contra la base de datos se actualizarán."}
              </Alert>
              {duplicateReviews.map((item) => {
                const source = item.source === "database"
                  ? `“${item.match}” ya está en la base de datos.`
                  : `“${item.match}” aparece en la fila ${item.sourceRow} del mismo Excel.`;
                return (
                  <Paper key={item.id} variant="outlined" sx={{ p: 1, borderRadius: 1.5 }}>
                    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} gap={0.75}>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>Fila {item.row}: ¿{item.person} y {item.match} son la misma persona?</Typography>
                        <Typography variant="caption" color="text.secondary">{source}</Typography>
                      </Box>
                      <Stack direction="row" gap={0.5} flex="0 0 auto">
                        <Button
                          variant={duplicateDecisions[item.id] === "different" ? "contained" : "outlined"}
                          onClick={() => setDuplicateDecisions((current) => ({ ...current, [item.id]: "different" }))}
                        >
                          No, son distintas
                        </Button>
                        <Button
                          color={item.source === "excel" ? "error" : "primary"}
                          variant={duplicateDecisions[item.id] === "same" ? "contained" : "outlined"}
                          onClick={() => setDuplicateDecisions((current) => ({ ...current, [item.id]: "same" }))}
                        >
                          Sí, es la misma
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}
          {result && result.errors.length === 0 && confirmedExcelDuplicateCount === 0 && unresolvedDuplicateCount === 0 && (
            <Stack gap={0.75}>
              <Alert severity={preflightIssues.length > 0 ? "error" : "success"}>
                {preflightIssues.length > 0
                  ? `No se puede aplicar el Excel. Corrige ${preflightIssues.length === 1 ? "el error señalado" : `los ${preflightIssues.length} errores señalados`} y vuelve a seleccionar el archivo.`
                  : <>
                    {createCount} {createCount === 1 ? "persona nueva" : "personas nuevas"} y {updateCount} {updateCount === 1 ? "actualización" : "actualizaciones"} validadas.
                    {incompleteCount > 0 ? ` ${incompleteCount} quedarán pendientes de completar porque el Excel no incluye su posición y, cuando corresponda, su grupo.` : " Todos los registros están completos."}
                  </>}
              </Alert>
              {overwriteReviews.map((review) => {
                const decision = overwriteDecisions[review.key];
                const reviewIssues = preflightIssues.filter((issue) => issue.key === review.key);
                return (
                  <Paper key={review.key} variant="outlined" sx={{ borderRadius: 1.5, overflow: "hidden" }}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      justifyContent="space-between"
                      alignItems={{ xs: "stretch", sm: "center" }}
                      gap={0.75}
                      sx={{ p: 1 }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          Fila {review.entry.row}: ¿Sobrescribir los datos de {review.existing.person}?
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          El Excel cambiará {review.changes.length} {review.changes.length === 1 ? "campo" : "campos"} de esta persona existente.
                        </Typography>
                      </Box>
                      <Stack direction="row" gap={0.5} flex="0 0 auto">
                        <Button
                          variant={decision === "skip" ? "contained" : "outlined"}
                          onClick={() => setOverwriteDecisions((current) => ({ ...current, [review.key]: "skip" }))}
                        >
                          No sobrescribir
                        </Button>
                        <Button
                          variant={decision === "overwrite" ? "contained" : "outlined"}
                          disabled={reviewIssues.length > 0}
                          onClick={() => setOverwriteDecisions((current) => ({ ...current, [review.key]: "overwrite" }))}
                        >
                          Sí, sobrescribir
                        </Button>
                      </Stack>
                    </Stack>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "minmax(96px, 0.7fr) minmax(120px, 1fr) minmax(120px, 1fr)",
                        borderTop: 1,
                        borderColor: "divider",
                        bgcolor: "background.default",
                        "& > *": { px: 1, py: 0.625, borderBottom: 1, borderColor: "divider" },
                        "& > :nth-last-of-type(-n+3)": { borderBottom: 0 },
                      }}
                    >
                      <Typography variant="caption" fontWeight={700}>Campo</Typography>
                      <Typography variant="caption" fontWeight={700}>Actual</Typography>
                      <Typography variant="caption" fontWeight={700}>Excel</Typography>
                      {review.changes.map((change) => (
                        <Box key={change.field} sx={{ display: "contents" }}>
                          <Typography variant="caption" fontWeight={700}>{change.field}</Typography>
                          <Typography variant="caption" color="text.secondary">{change.current}</Typography>
                          <Typography variant="caption">{change.imported}</Typography>
                        </Box>
                      ))}
                    </Box>
                    {reviewIssues.length > 0 && (
                      <Alert severity="error" variant="outlined" sx={{ m: 1 }}>
                        Fila {review.entry.row}: {reviewIssues.map((issue) => issue.message).join(" ")}
                      </Alert>
                    )}
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Cancelar</Button>
        <Button
          variant="contained"
          disabled={importBlocked}
          onClick={() => {
            if (!result || importBlocked) return;
            onImport(rowsToImport);
            close();
          }}
        >
          Aplicar {rowsToImport.length} registros
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function GroupDrawer({ group, onClose }: { group: WorkerGroup | null; onClose: () => void }) {
  const isMobile = useMediaQuery("(max-width:599px)");
  const [mode, setMode] = useState<"absence" | "replacement">("absence");
  if (!group) return null;
  const phase = currentPhase(group);
  return (
    <Drawer anchor={isMobile ? "bottom" : "right"} open onClose={onClose} PaperProps={{ sx: isMobile ? { maxHeight: "88vh", borderRadius: "16px 16px 0 0" } : { width: "min(480px, 100vw)" } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2, pb: 1 }}>
        <Stack direction="row" gap={1} alignItems="center"><GroupMark group={group.id} /><Box><Typography variant="h2">Grupo {group.id}</Typography><Typography variant="caption" color="text.secondary">{group.operation} · {phaseLabels[phase]}</Typography></Box></Stack>
        <IconButton aria-label="Cerrar grupo" onClick={onClose} sx={{ width: 40, height: 40 }}><CloseRounded fontSize="small" /></IconButton>
      </Stack>
      <Divider />
      <Stack gap={1} sx={{ p: 2, overflowY: "auto" }}>
        <Typography variant="caption" color="text.secondary">
          Registra excepciones del calendario. La pertenencia al grupo se administra en Responsables.
        </Typography>
        <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: "hidden" }}>
          <Typography variant="caption" fontWeight={700} sx={{ display: "block", px: 1, py: 0.75, bgcolor: "background.default" }}>
            Personas del grupo
          </Typography>
          {group.workers.length === 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 1, py: 1 }}>
              No hay personas activas asignadas a este grupo en {group.operation}.
            </Typography>
          ) : group.workers.map((worker) => (
            <Stack key={worker.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ minHeight: 34, px: 1, borderTop: "1px solid", borderColor: "divider" }}>
              <Typography variant="body2" fontWeight={600}>{worker.name}</Typography>
              <Typography variant="caption" color={worker.availability === "available" ? "text.secondary" : "warning.main"}>
                {worker.availability === "vacation" ? "Vacaciones" : worker.availability === "sick" ? "Descanso médico" : worker.availability === "replacement" ? "Reemplazo" : "Disponible"}
              </Typography>
            </Stack>
          ))}
        </Paper>
        <Stack direction="row" gap={0.5}>
          <Button variant={mode === "absence" ? "contained" : "outlined"} onClick={() => setMode("absence")}>Ausencia</Button>
          <Button variant={mode === "replacement" ? "contained" : "outlined"} onClick={() => setMode("replacement")}>Reemplazo</Button>
        </Stack>
        {mode === "absence" && (
          <>
            <TextField select label="Trabajador" defaultValue={group.workers.find((worker) => worker.availability === "vacation" || worker.availability === "sick")?.id ?? group.workers[0]?.id}>
              {group.workers.map((worker) => <MenuItem key={worker.id} value={worker.id}>{worker.name}</MenuItem>)}
            </TextField>
            <TextField select label="Tipo" defaultValue="vacation"><MenuItem value="vacation">Vacaciones</MenuItem><MenuItem value="sick">Descanso médico</MenuItem><MenuItem value="other">Otra ausencia</MenuItem></TextField>
            <Stack direction="row" gap={1}><TextField label="Desde" type="date" defaultValue="2026-07-25" fullWidth InputLabelProps={{ shrink: true }} /><TextField label="Hasta" type="date" defaultValue="2026-07-29" fullWidth InputLabelProps={{ shrink: true }} /></Stack>
            <TextField label="Nota" placeholder="Detalle opcional" />
            <Button variant="contained">Registrar ausencia</Button>
          </>
        )}
        {mode === "replacement" && (
          <>
            <TextField select label="Persona ausente" defaultValue={group.workers.find((worker) => worker.availability === "vacation" || worker.availability === "sick")?.id ?? group.workers[0]?.id}>{group.workers.map((worker) => <MenuItem key={worker.id} value={worker.id}>{worker.name}</MenuItem>)}</TextField>
            <TextField label="Reemplazo temporal" placeholder="Buscar trabajador" />
            <Stack direction="row" gap={1}><TextField label="Desde" type="date" defaultValue="2026-07-25" fullWidth InputLabelProps={{ shrink: true }} /><TextField label="Hasta" type="date" defaultValue="2026-07-29" fullWidth InputLabelProps={{ shrink: true }} /></Stack>
            <Typography variant="caption" color="text.secondary">El reemplazo hereda las responsabilidades de la persona ausente solo durante este período.</Typography>
            <Button variant="contained">Asignar reemplazo</Button>
          </>
        )}
      </Stack>
    </Drawer>
  );
}

function RotationDialog({
  open,
  operation,
  pattern,
  onClose,
  onSave,
}: {
  open: boolean;
  operation: string;
  pattern: RotationPattern;
  onClose: () => void;
  onSave: (pattern: RotationPattern) => void;
}) {
  const [draft, setDraft] = useState(pattern);
  useEffect(() => { if (open) setDraft(pattern); }, [open, pattern]);
  const updateGroup = (id: string, patch: Partial<RotationPatternGroup>) => {
    setDraft((current) => ({ ...current, groups: current.groups.map((group) => group.id === id ? { ...group, ...patch } : group) }));
  };
  const setGroupCount = (count: number) => {
    const nextCount = Math.max(1, Math.min(6, count));
    setDraft((current) => {
      const nextGroups = [...current.groups];
      while (nextGroups.length < nextCount) {
        const index = nextGroups.length;
        const id = String.fromCharCode(65 + index);
        nextGroups.push({
          id,
          name: id,
          anchorScheduleId: current.schedules[index % current.schedules.length]!.id,
          daysPerPhase: 2,
        });
      }
      return { ...current, groups: nextGroups.slice(0, nextCount) };
    });
  };
  const updateSchedule = (id: RotationScheduleId, patch: Partial<RotationSchedule>) => {
    setDraft((current) => ({
      ...current,
      schedules: current.schedules.map((schedule) => schedule.id === id ? { ...schedule, ...patch } : schedule),
    }));
  };
  const addSchedule = () => {
    setDraft((current) => {
      if (current.schedules.length >= 12) return current;
      let index = current.schedules.length;
      let id = `schedule-${index}`;
      while (current.schedules.some((schedule) => schedule.id === id)) id = `schedule-${++index}`;
      const restIndex = current.schedules.findIndex((schedule) => schedule.isRest);
      const schedules = [...current.schedules];
      schedules.splice(restIndex < 0 ? schedules.length : restIndex, 0, {
        id,
        name: `Horario ${current.schedules.filter((schedule) => !schedule.isRest).length + 1}`,
        start: "07:00",
        end: "15:00",
        isRest: false,
      });
      return { ...current, schedules };
    });
  };
  const removeSchedule = (id: RotationScheduleId) => {
    setDraft((current) => ({ ...current, schedules: current.schedules.filter((schedule) => schedule.id !== id) }));
  };
  const namesAreValid = draft.groups.every((group) => group.name.trim())
    && new Set(draft.groups.map((group) => normalizeSearchText(group.name))).size === draft.groups.length;
  const schedulesAreValid = draft.schedules.every((schedule) => schedule.name.trim() && (schedule.isRest || (schedule.start && schedule.end)))
    && new Set(draft.schedules.map((schedule) => normalizeSearchText(schedule.name))).size === draft.schedules.length;
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Patrón de rotación · {operation}</DialogTitle>
      <DialogContent dividers>
        <Stack gap={1.5} sx={{ pt: 0.5 }}>
          <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
            <TextField
              label="Fecha de referencia"
              type="date"
              value={draft.effectiveFrom}
              onChange={(event) => setDraft((current) => ({ ...current, effectiveFrom: event.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Cantidad de grupos"
              type="number"
              value={draft.groups.length}
              onChange={(event) => setGroupCount(Number(event.target.value) || 1)}
              inputProps={{ min: 1, max: 6 }}
              fullWidth
            />
          </Stack>
          <Box>
            <Typography variant="caption" fontWeight={700} sx={{ display: "block", mb: 0.5 }}>Nombres de los grupos</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" }, gap: 1 }}>
              {draft.groups.map((group) => (
                <Stack key={group.id} direction="row" gap={0.5} alignItems="center">
                  <GroupMark group={group.id} />
                  <TextField
                    label={`Nombre del grupo ${group.id}`}
                    value={group.name}
                    onChange={(event) => updateGroup(group.id, { name: event.target.value })}
                    fullWidth
                  />
                </Stack>
              ))}
            </Box>
          </Box>
          {!namesAreValid && <Alert severity="error">Cada grupo necesita un nombre distinto.</Alert>}
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="caption" fontWeight={700}>Tipos de horario</Typography>
              <Button variant="outlined" onClick={addSchedule} disabled={draft.schedules.length >= 12}>Agregar horario</Button>
            </Stack>
            <Paper variant="outlined" sx={{ overflow: "hidden", borderRadius: 1.5 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(180px, 1fr) minmax(130px, .7fr) minmax(130px, .7fr) 32px" }, columnGap: 1, bgcolor: "background.default", px: 1, py: 0.75 }}>
                {['Nombre', 'Inicio', 'Fin', ''].map((label, index) => <Typography key={`${label}-${index}`} variant="caption" fontWeight={700}>{label}</Typography>)}
              </Box>
              {draft.schedules.map((schedule) => {
                const scheduleInUse = draft.groups.some((group) => group.anchorScheduleId === schedule.id);
                return (
                  <Box key={schedule.id} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(180px, 1fr) minmax(130px, .7fr) minmax(130px, .7fr) 32px" }, columnGap: 1, rowGap: 1, alignItems: "center", px: 1, py: 1, borderTop: "1px solid", borderColor: "divider" }}>
                    {schedule.isRest ? (
                      <TextField label="Nombre" value="Descanso" slotProps={{ input: { readOnly: true } }} fullWidth />
                    ) : (
                      <TextField label="Nombre" value={schedule.name} onChange={(event) => updateSchedule(schedule.id, { name: event.target.value })} fullWidth />
                    )}
                    {schedule.isRest ? (
                      <Box sx={{ gridColumn: { sm: "2 / span 2" }, minHeight: ui.control.visibleHeight, display: "flex", alignItems: "center", px: 1, bgcolor: ui.color.canvas, border: "1px solid", borderColor: "divider", borderRadius: ui.control.radius }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary">No trabaja · sin horario</Typography>
                      </Box>
                    ) : (
                      <>
                        <TextField label="Inicio" type="time" value={schedule.start ?? ""} onChange={(event) => updateSchedule(schedule.id, { start: event.target.value })} fullWidth />
                        <TextField label="Fin" type="time" value={schedule.end ?? ""} onChange={(event) => updateSchedule(schedule.id, { end: event.target.value })} fullWidth />
                      </>
                    )}
                    {!schedule.isRest && (
                      <IconButton aria-label={`Eliminar horario ${schedule.name}`} disabled={scheduleInUse} onClick={() => removeSchedule(schedule.id)} sx={{ width: 32, height: 32 }}>
                        <CloseRounded sx={{ fontSize: 16 }} />
                      </IconButton>
                    )}
                  </Box>
                );
              })}
            </Paper>
          </Box>
          {!schedulesAreValid && <Alert severity="error">Cada horario necesita un nombre distinto, una hora de inicio y una hora de fin.</Alert>}
          <Paper variant="outlined" sx={{ overflow: "hidden", borderRadius: 1.5 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(220px, 1fr) minmax(140px, .6fr)" }, bgcolor: "background.default" }}>
              {["Horario inicial", "Días consecutivos"].map((label) => (
                <Typography key={label} variant="caption" fontWeight={700} sx={{ px: 1, py: 0.75 }}>{label}</Typography>
              ))}
            </Box>
            {draft.groups.map((group) => (
              <Box key={group.id} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(220px, 1fr) minmax(140px, .6fr)" }, gap: 1, alignItems: "center", px: 1, py: 1, borderTop: "1px solid", borderColor: "divider" }}>
                <Stack direction="row" gap={0.5} alignItems="center">
                  <GroupMark group={group.id} />
                  <TextField
                    select
                    label="Horario inicial"
                    value={group.anchorScheduleId}
                    onChange={(event) => updateGroup(group.id, { anchorScheduleId: event.target.value })}
                    fullWidth
                  >
                    {draft.schedules.map((schedule) => <MenuItem key={schedule.id} value={schedule.id}>{schedule.name}</MenuItem>)}
                  </TextField>
                </Stack>
                <TextField
                  label="Días"
                  type="number"
                  value={group.daysPerPhase}
                  onChange={(event) => updateGroup(group.id, { daysPerPhase: Math.max(1, Math.min(14, Number(event.target.value) || 1)) })}
                  inputProps={{ min: 1, max: 14 }}
                  fullWidth
                />
              </Box>
            ))}
          </Paper>
        </Stack>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Cancelar</Button><Button variant="contained" disabled={!namesAreValid || !schedulesAreValid || !draft.effectiveFrom} onClick={() => { onSave(draft); onClose(); }}>Guardar patrón</Button></DialogActions>
    </Dialog>
  );
}

function RotationGapCoverageDialog({
  target,
  existing,
  availableGroups,
  onClose,
  onSave,
  onRemove,
}: {
  target: { operation: string; date: string; maxDays: number } | null;
  existing: RotationGapCoverage | null;
  availableGroups: RotationPatternGroup[];
  onClose: () => void;
  onSave: (coverage: RotationGapCoverage) => void;
  onRemove: (id: string) => void;
}) {
  const [dayGroup, setDayGroup] = useState<WorkerGroup["id"]>("A");
  const [nightGroup, setNightGroup] = useState<WorkerGroup["id"]>("B");
  const [days, setDays] = useState(1);
  useEffect(() => {
    if (!target) return;
    setDayGroup(existing?.dayGroup ?? availableGroups[0]?.id ?? "A");
    setNightGroup(existing?.nightGroup ?? availableGroups[1]?.id ?? availableGroups[0]?.id ?? "B");
    setDays(Math.min(existing?.days ?? 1, target.maxDays));
  }, [availableGroups, existing, target]);
  if (!target) return null;
  const valid = dayGroup !== nightGroup && days >= 1 && days <= target.maxDays;
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Completar días sin patrón</DialogTitle>
      <DialogContent dividers>
        <Stack gap={1.5} sx={{ pt: 0.5 }}>
          <Typography variant="body2" fontWeight={700}>{displayDate(target.date)} · {target.operation}</Typography>
          <Alert severity="info">Define la cobertura temporal del intervalo que quedó vacío. Los grupos no seleccionados quedan en descanso.</Alert>
          <TextField select label="Grupo de día" value={dayGroup} onChange={(event) => setDayGroup(event.target.value as WorkerGroup["id"])}>
            {availableGroups.map((item) => <MenuItem key={item.id} value={item.id}>Grupo {item.name}</MenuItem>)}
          </TextField>
          <TextField select label="Grupo de noche" value={nightGroup} onChange={(event) => setNightGroup(event.target.value as WorkerGroup["id"])}>
            {availableGroups.map((item) => <MenuItem key={item.id} value={item.id}>Grupo {item.name}</MenuItem>)}
          </TextField>
          <TextField
            label="Cantidad de días"
            type="number"
            value={days}
            onChange={(event) => setDays(Math.max(1, Math.min(target.maxDays, Number(event.target.value) || 1)))}
            inputProps={{ min: 1, max: target.maxDays }}
            helperText={`Máximo disponible desde esta fecha: ${target.maxDays} día${target.maxDays === 1 ? "" : "s"}.`}
          />
          {dayGroup === nightGroup && <Alert severity="error">Día y noche deben asignarse a grupos distintos.</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: existing ? "space-between" : "flex-end" }}>
        {existing && <Button color="error" onClick={() => { onRemove(existing.id); onClose(); }}>Quitar cobertura</Button>}
        <Stack direction="row" gap={0.5}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!valid}
            onClick={() => {
              onSave({ id: existing?.id ?? `${target.operation}-${target.date}`, operation: target.operation, startDate: target.date, days, dayGroup, nightGroup });
              onClose();
            }}
          >
            Aplicar cobertura
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

function AttendanceImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<"file" | "mapping" | "preview">("file");
  const [fileName, setFileName] = useState("");
  const reset = () => { setStep("file"); setFileName(""); onClose(); };
  return (
    <Dialog open={open} onClose={reset} fullWidth maxWidth="sm">
      <DialogTitle>Importar asistencia</DialogTitle>
      <DialogContent dividers>
        {step === "file" && (
          <Stack gap={1.5} alignItems="flex-start">
            <Typography variant="body2">Carga el archivo de asistencia. Monitor lo usa como evidencia de disponibilidad y excepciones; no reemplaza el patrón configurado.</Typography>
            <Button component="label" variant="outlined" startIcon={<FileUploadRounded sx={{ fontSize: 15 }} />}>
              Seleccionar Excel
              <input hidden type="file" accept=".xlsx,.xls,.csv" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} />
            </Button>
            {fileName && <Typography variant="caption" fontWeight={700}>{fileName}</Typography>}
          </Stack>
        )}
        {step === "mapping" && (
          <Stack gap={1.25}>
            <Typography variant="body2">Asigna un significado a cada código detectado. Ningún código se interpreta automáticamente.</Typography>
            {[["A3", "Turno día"], ["C3", "Turno noche"], ["L", "Ausencia / licencia"], ["Vacío", "Ignorar"]].map(([code, mapping]) => (
              <Stack key={code} direction="row" alignItems="center" gap={1}>
                <Chip label={code} variant="outlined" sx={{ width: 72 }} />
                <SwapHorizRounded sx={{ fontSize: 16, color: "text.secondary" }} />
                <TextField select defaultValue={mapping} fullWidth aria-label={`Mapear código ${code}`}>
                  {["Turno día", "Turno noche", "Descanso", "Vacaciones", "Descanso médico", "Ausencia / licencia", "Ignorar"].map((item) => <MenuItem value={item} key={item}>{item}</MenuItem>)}
                </TextField>
              </Stack>
            ))}
          </Stack>
        )}
        {step === "preview" && (
          <Stack gap={1}>
            <Typography variant="body2">Vista previa del 1–31 jul 2026</Typography>
            <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: "hidden" }}>
              {[["60", "trabajadores reconocidos"], ["8", "ausencias detectadas"], ["2", "códigos sin mapear"], ["1", "trabajador no reconocido"]].map(([value, label], index) => (
                <Stack key={label} direction="row" justifyContent="space-between" sx={{ minHeight: 36, px: 1, alignItems: "center", borderTop: index ? "1px solid" : 0, borderColor: "divider" }}>
                  <Typography variant="body2">{label}</Typography><Typography variant="body2" fontWeight={700}>{value}</Typography>
                </Stack>
              ))}
            </Paper>
            <Typography variant="caption" color="warning.main" fontWeight={700}>Revisa los códigos y el trabajador no reconocido antes de confirmar.</Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={step === "file" ? reset : () => setStep(step === "preview" ? "mapping" : "file")}>{step === "file" ? "Cancelar" : "Atrás"}</Button>
        {step === "file" && <Button variant="contained" disabled={!fileName} onClick={() => setStep("mapping")}>Continuar</Button>}
        {step === "mapping" && <Button variant="contained" onClick={() => setStep("preview")}>Revisar importación</Button>}
        {step === "preview" && <Button variant="contained" onClick={reset}>Confirmar evidencia</Button>}
      </DialogActions>
    </Dialog>
  );
}

export function OperationalResponsibilityRoster({ session, onLogout }: { session: SessionResponse; onLogout: () => void }) {
  const canManageResponsibilities = session.principal.scopes.includes("monitor:admin");
  const editableRotationOperations = canManageResponsibilities
    ? operations.filter((operation) => operation !== "Todas")
    : session.principal.operationAuthorizations
      .filter((authorization) => authorization.permissions.includes("roster:rotation:manage"))
      .map((authorization) => authorization.operationName);
  const [view, setView] = useState<RosterView>(canManageResponsibilities ? "responsibilities" : "rotation");
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [people, setPeople] = useState(responsibilities);
  const peopleRef = useRef(people);
  const savedPeopleRef = useRef(people);
  const rosterRevisionRef = useRef(0);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const [rosterReady, setRosterReady] = useState(!canManageResponsibilities);
  const [persistenceNotice, setPersistenceNotice] = useState<{ severity: "success" | "warning" | "error"; message: string } | null>(null);
  const [assignment, setAssignment] = useState<Responsibility | null>(null);
  const [addPersonOpen, setAddPersonOpen] = useState(false);
  const [importRosterOpen, setImportRosterOpen] = useState(false);
  const [rotationOperation, setRotationOperation] = useState(editableRotationOperations[0] ?? operations[0]!);
  const [rotationOpen, setRotationOpen] = useState(false);
  const [rotationPatterns, setRotationPatterns] = useState<Record<string, RotationPattern>>(() => (
    Object.fromEntries(operations.map((operation) => [operation, defaultRotationPattern()]))
  ));
  const [rotationAdjustments, setRotationAdjustments] = useState<RotationAdjustment[]>([]);
  const [rotationGapCoverages, setRotationGapCoverages] = useState<RotationGapCoverage[]>([]);
  const [rotationExceptions, setRotationExceptions] = useState<WorkerScheduleException[]>([]);
  const [gapCoverageTarget, setGapCoverageTarget] = useState<{ operation: string; date: string } | null>(null);
  const targetGap = gapCoverageTarget
    ? rotationGapForDate(gapCoverageTarget.operation, gapCoverageTarget.date, rotationAdjustments)
    : null;
  const existingGapCoverage = gapCoverageTarget
    ? rotationCoverageForDate(gapCoverageTarget.operation, gapCoverageTarget.date, rotationGapCoverages)
    : null;
  const coverageStartDate = existingGapCoverage?.startDate ?? gapCoverageTarget?.date ?? "";
  const coverageMaxDays = targetGap && coverageStartDate
    ? dayDifference(dateFromKey(addDaysKey(targetGap.date, targetGap.shiftDays)), coverageStartDate)
    : 0;

  const acceptSnapshot = (snapshot: Awaited<ReturnType<typeof rosterAssignments>>) => {
    const loaded = snapshot.assignments.map(displayedResponsibility);
    rosterRevisionRef.current = snapshot.revision;
    peopleRef.current = loaded;
    savedPeopleRef.current = loaded;
    setPeople(loaded);
  };

  const commitPeople = (
    next: Responsibility[],
    successNotice?: string | { severity: "success" | "warning"; message: string },
  ) => {
    if (next.length === peopleRef.current.length
      && next.every((item, index) => responsibilityEquals(item, peopleRef.current[index]!))) {
      return;
    }
    const base = peopleRef.current;
    const desired = next;
    peopleRef.current = next;
    setPeople(next);
    saveQueueRef.current = saveQueueRef.current
      .then(async () => {
        let snapshot;
        try {
          snapshot = await saveRosterAssignments(rosterRevisionRef.current, desired.map(persistedResponsibility));
        } catch (error) {
          if (!(error instanceof ApiRequestError) || error.status !== 409) throw error;
          const remote = await rosterAssignments();
          const merged = mergeRosterAssignments(
            base.map(persistedResponsibility),
            desired.map(persistedResponsibility),
            remote.assignments,
          );
          snapshot = await saveRosterAssignments(remote.revision, merged);
        }
        rosterRevisionRef.current = snapshot.revision;
        savedPeopleRef.current = snapshot.assignments.map(displayedResponsibility);
        if (peopleRef.current === desired) {
          peopleRef.current = savedPeopleRef.current;
          setPeople(savedPeopleRef.current);
        }
        if (successNotice) {
          setPersistenceNotice(typeof successNotice === "string"
            ? { severity: "success", message: successNotice }
            : successNotice);
        }
      })
      .catch(async (error: unknown) => {
        try {
          acceptSnapshot(await rosterAssignments());
        } catch {
          peopleRef.current = savedPeopleRef.current;
          setPeople(savedPeopleRef.current);
        }
        setAssignment(null);
        const details = error instanceof ApiRequestError
          && typeof error.body === "object"
          && error.body !== null
          && "details" in error.body
          && Array.isArray(error.body.details)
          ? error.body.details.filter((detail): detail is string => typeof detail === "string")
          : [];
        const message = details[0]
          ? `No se guardaron los cambios: ${details[0]}`
          : error instanceof ApiRequestError && error.status === 409
            ? "Otra pestaña volvió a cambiar la lista. Intenta guardar una vez más."
            : "No se guardaron los cambios. Se recargaron los últimos datos confirmados.";
        setPersistenceNotice({ severity: "error", message });
      });
  };

  useEffect(() => {
    if (!canManageResponsibilities) return;
    let cancelled = false;
    void (async () => {
      try {
        const current = await rosterAssignments();
        if (cancelled) return;
        const localAssignments = peopleRef.current;
        const snapshot = localAssignments.length > current.assignments.length
          ? await saveRosterAssignments(current.revision, localAssignments.map(persistedResponsibility))
          : current.assignments.length > 0
            ? current
            : await saveRosterAssignments(current.revision, localAssignments.map(persistedResponsibility));
        if (!cancelled) acceptSnapshot(snapshot);
      } catch {
        if (!cancelled) setPersistenceNotice({ severity: "error", message: "No se pudo cargar la base de datos de responsables." });
      } finally {
        if (!cancelled) setRosterReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [canManageResponsibilities]);

  const savePerson = (updated: Responsibility) => {
    commitPeople(peopleRef.current.map((item) => item.id === updated.id ? updated : item), "Cambios guardados en la base de datos.");
    setAssignment(updated);
  };

  const deactivatePerson = (id: string) => {
    commitPeople(peopleRef.current.map((item) => item.id === id ? { ...item, state: "inactive", validTo: "25 jul 2026" } : item), "Persona desactivada y guardada en la base de datos.");
    setAssignment(null);
  };

  const activatePerson = (id: string) => {
    commitPeople(peopleRef.current.map((item) => item.id === id ? { ...item, state: "active", validTo: null } : item), "Persona activada y guardada en la base de datos.");
    setAssignment((item) => item?.id === id ? { ...item, state: "active", validTo: null } : item);
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <RosterHeader menuAnchor={menuAnchor} setMenuAnchor={setMenuAnchor} onLogout={onLogout} />
      <Box component="main">
        <Box sx={{ bgcolor: "background.paper", borderBottom: "1px solid", borderColor: "divider" }}>
          <Box sx={{ maxWidth: 1280, minHeight: 44, mx: "auto", px: { xs: 1, sm: 1.5, lg: 2 }, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
            <Tabs
              value={view}
              onChange={(_, value: RosterView) => setView(value)}
              aria-label="Vistas de la matriz de responsables"
              sx={{ minHeight: 44, "& .MuiTab-root": { minHeight: 44 } }}
            >
              {canManageResponsibilities && <Tab value="responsibilities" icon={<PersonOutlineRounded sx={{ fontSize: 15 }} />} iconPosition="start" label="Responsables" />}
              <Tab value="rotation" icon={<CalendarMonthRounded sx={{ fontSize: 15 }} />} iconPosition="start" label="Rotación" />
            </Tabs>
            {canManageResponsibilities && view === "responsibilities" && (
              <Stack direction="row" gap={0.5} alignItems="center">
                <Button
                  variant="outlined"
                  startIcon={<FileUploadRounded sx={{ fontSize: 15 }} />}
                  onClick={() => setImportRosterOpen(true)}
                  sx={{ display: { xs: "none", sm: "inline-flex" }, flex: "0 0 auto" }}
                >
                  Importar Excel
                </Button>
                <IconButton
                  color="primary"
                  aria-label="Importar personas desde Excel"
                  onClick={() => setImportRosterOpen(true)}
                  sx={{ display: { xs: "inline-flex", sm: "none" }, width: 40, height: 40, flex: "0 0 auto" }}
                >
                  <FileUploadRounded fontSize="small" />
                </IconButton>
                <Button
                  variant="contained"
                  startIcon={<PersonAddRounded sx={{ fontSize: 15 }} />}
                  onClick={() => setAddPersonOpen(true)}
                  sx={{ display: { xs: "none", sm: "inline-flex" }, flex: "0 0 auto" }}
                >
                  Agregar persona
                </Button>
                <IconButton
                  color="primary"
                  aria-label="Agregar persona"
                  onClick={() => setAddPersonOpen(true)}
                  sx={{ display: { xs: "inline-flex", sm: "none" }, width: 40, height: 40, flex: "0 0 auto" }}
                >
                  <PersonAddRounded fontSize="small" />
                </IconButton>
              </Stack>
            )}
            {view === "rotation" && (
              <Button
                variant="outlined"
                startIcon={<CalendarMonthRounded sx={{ fontSize: 15 }} />}
                onClick={() => setRotationOpen(true)}
                disabled={!editableRotationOperations.includes(rotationOperation)}
                sx={{ flex: "0 0 auto" }}
              >
                Editar patrón
              </Button>
            )}
          </Box>
        </Box>
        <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 1, sm: 1.5, lg: 2 }, py: { xs: 1, sm: 1.25 } }}>
          {canManageResponsibilities && view === "responsibilities" && rosterReady && (
            <ResponsibilitiesView
              items={people}
              onSelect={setAssignment}
              onUpdate={(updated, notice) => {
                const replacements = new Map(updated.map((item) => [item.id, item]));
                commitPeople(
                  peopleRef.current.map((item) => replacements.get(item.id) ?? item),
                  notice ?? "Cambios guardados en la base de datos.",
                );
              }}
            />
          )}
          {canManageResponsibilities && view === "responsibilities" && !rosterReady && (
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
              <Typography variant="body2">Cargando responsables guardados…</Typography>
            </Paper>
          )}
          {view === "rotation" && (
            <RotationView
              editableOperations={editableRotationOperations}
              operation={rotationOperation}
              onOperationChange={setRotationOperation}
              assignments={people}
              patterns={rotationPatterns}
              adjustments={rotationAdjustments}
              coverages={rotationGapCoverages}
              exceptions={rotationExceptions}
              onAddException={(exception) => setRotationExceptions((current) => [
                ...current.filter((item) => item.id !== exception.id),
                exception,
              ])}
              onRemoveExceptions={(ids) => setRotationExceptions((current) => {
                const removed = new Set(ids);
                return current.filter((item) => !removed.has(item.id));
              })}
              onEditPerson={setAssignment}
              onMovePattern={(operation, sourceDate, targetDate) => {
                setRotationAdjustments((current) => moveRotationPattern(current, operation, sourceDate, targetDate));
                setRotationGapCoverages((current) => moveRotationCoverages(current, operation, sourceDate, targetDate));
              }}
              onConfigureGap={(operation, date) => setGapCoverageTarget({ operation, date })}
            />
          )}
        </Box>
      </Box>
      {canManageResponsibilities && <PersonDrawer
        assignment={assignment}
        groupOptions={(rotationPatterns[assignment?.operations[0] ?? rotationOperation] ?? defaultRotationPattern()).groups}
        onClose={() => setAssignment(null)}
        onSave={savePerson}
        onDeactivate={deactivatePerson}
        onActivate={activatePerson}
      />}
      {canManageResponsibilities && <AddPersonDialog
        open={addPersonOpen}
        onClose={() => setAddPersonOpen(false)}
        existingPeople={people}
        rotationPatterns={rotationPatterns}
        onEditExisting={(existingPerson) => {
          setAddPersonOpen(false);
          setAssignment(existingPerson);
        }}
        onAdd={(newPerson) => {
          const next = peopleRef.current.some((item) => normalizeExactPersonName(newPerson.person) === normalizeExactPersonName(item.person))
            ? peopleRef.current
            : [...peopleRef.current, newPerson];
          if (next !== peopleRef.current) commitPeople(next, `${newPerson.person} se guardó en la base de datos.`);
        }}
      />}
      {canManageResponsibilities && <RosterImportDialog
        open={importRosterOpen}
        existingPeople={people}
        onClose={() => setImportRosterOpen(false)}
        onImport={(rows) => {
          const next = [...peopleRef.current];
          rows.forEach((entry) => {
            if (!entry.targetId) {
              next.push(entry.value);
              return;
            }
            const index = next.findIndex((item) => item.id === entry.targetId);
            if (index >= 0) next[index] = mergeRosterImport(next[index]!, entry);
          });
          commitPeople(next, `${rows.length} ${rows.length === 1 ? "registro se guardó" : "registros se guardaron"} en la base de datos.`);
        }}
      />}
      <RotationDialog
        open={rotationOpen}
        operation={rotationOperation}
        pattern={rotationPatterns[rotationOperation] ?? defaultRotationPattern()}
        onClose={() => setRotationOpen(false)}
        onSave={(pattern) => setRotationPatterns((current) => ({ ...current, [rotationOperation]: pattern }))}
      />
      <RotationGapCoverageDialog
        target={gapCoverageTarget && targetGap && coverageMaxDays > 0 ? {
          operation: gapCoverageTarget.operation,
          date: coverageStartDate,
          maxDays: coverageMaxDays,
        } : null}
        existing={existingGapCoverage}
        availableGroups={(rotationPatterns[rotationOperation] ?? defaultRotationPattern()).groups}
        onClose={() => setGapCoverageTarget(null)}
        onSave={(coverage) => setRotationGapCoverages((current) => [...current.filter((item) => item.id !== coverage.id), coverage])}
        onRemove={(id) => setRotationGapCoverages((current) => current.filter((item) => item.id !== id))}
      />
      <Snackbar
        key={persistenceNotice?.message}
        open={Boolean(persistenceNotice)}
        autoHideDuration={persistenceNotice?.severity === "success" ? 5000 : null}
        onClose={() => setPersistenceNotice(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={persistenceNotice?.severity ?? "success"}
          variant="filled"
          onClose={() => setPersistenceNotice(null)}
          sx={{ maxWidth: "min(560px, calc(100vw - 24px))", "& .MuiAlert-message": { overflowWrap: "anywhere" } }}
        >
          {persistenceNotice?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
