const summaryByRange = {
  7: { total: 48, resolved: 39, open: 9, average: 31, label: 'Últimos 7 días' },
  30: { total: 184, resolved: 151, open: 33, average: 46, label: 'Últimos 30 días' },
  90: { total: 536, resolved: 459, open: 77, average: 51, label: 'Últimos 90 días' }
};

const operationFactors = { all: 1, Impresión: .38, Exlam: .22, Corte: .18, Sellado: .14 };

const breakdowns = {
  worker: [
    { label: 'Luis V.', resolved: 20, open: 6 },
    { label: 'Carmen R.', resolved: 19, open: 3 },
    { label: 'Jorge A.', resolved: 15, open: 3 },
    { label: 'Rosa P.', resolved: 10, open: 3 },
    { label: 'David V.', resolved: 9, open: 2 }
  ],
  workOrder: [
    { label: 'OT 151087.3', resolved: 8, open: 6 },
    { label: 'OT 151056.1', resolved: 10, open: 3 },
    { label: 'OT 151093.2', resolved: 8, open: 4 },
    { label: 'OT 151104.1', resolved: 8, open: 2 },
    { label: 'OT 151090.4', resolved: 7, open: 3 }
  ],
  machine: [
    { label: 'P15', resolved: 30, open: 8 },
    { label: 'EL02', resolved: 23, open: 6 },
    { label: 'CT04', resolved: 19, open: 5 },
    { label: 'SE12', resolved: 16, open: 4 },
    { label: 'P09', resolved: 14, open: 3 }
  ],
  operation: [
    { label: 'Impresión', resolved: 51, open: 13 },
    { label: 'Exlam', resolved: 35, open: 8 },
    { label: 'Corte', resolved: 29, open: 6 },
    { label: 'Sellado', resolved: 23, open: 5 },
    { label: 'Laminación', resolved: 13, open: 1 }
  ],
  shift: [
    { label: 'Turno día', resolved: 76, open: 15 },
    { label: 'Turno tarde', resolved: 47, open: 11 },
    { label: 'Turno noche', resolved: 28, open: 7 }
  ],
  errorType: [
    { label: 'A05 · Bobina sin pesar', resolved: 21, open: 8 },
    { label: 'A02 · Material sin recepción', resolved: 19, open: 6 },
    { label: 'C03 · OT fuera de secuencia', resolved: 16, open: 4 },
    { label: 'A03 · Consumo sin declarar', resolved: 14, open: 5 },
    { label: 'D03 · OT sin balance', resolved: 12, open: 4 }
  ]
};

const alertRows = [
  { date: '18 jul · 15:48', title: 'Bobina CU-98421 sin pesar', code: 'A05', worker: 'Luis V.', workOrder: '151087.3', machine: 'P15', operation: 'Impresión', shift: 'Día', age: '2 h 14 min', status: 'open' },
  { date: '18 jul · 16:12', title: 'Movimiento de material sin recepción', code: 'A02', worker: 'Carmen R.', workOrder: '151087.3', machine: 'P15', operation: 'Impresión', shift: 'Día', age: '38 min', status: 'open' },
  { date: '18 jul · 14:37', title: 'Consumo de bobina sin declarar', code: 'A03', worker: 'Jorge A.', workOrder: '151056.1', machine: 'P15', operation: 'Impresión', shift: 'Día', age: '1 h 19 min', status: 'open' },
  { date: '18 jul · 13:51', title: 'OT iniciada fuera de secuencia', code: 'C03', worker: 'Rosa P.', workOrder: '151104.1', machine: 'P12', operation: 'Impresión', shift: 'Día', age: '2 h 05 min', status: 'open' },
  { date: '18 jul · 12:45', title: 'Material próximo sin enviar', code: 'A01', worker: 'David V.', workOrder: '151110.1', machine: 'EL02', operation: 'Exlam', shift: 'Día', age: '3 h 11 min', status: 'open' },
  { date: '18 jul · 11:24', title: 'Bolsa de merma sin pesar', code: 'A06', worker: 'Ana M.', workOrder: '151090.4', machine: 'SE12', operation: 'Sellado', shift: 'Día', age: '4 h 32 min', status: 'open' },
  { date: '17 jul · 22:18', title: 'Diferencia en metros declarados', code: 'D03', worker: 'Martín R.', workOrder: '151049.1', machine: 'P09', operation: 'Impresión', shift: 'Noche', age: '17 h 38 min', status: 'open' },
  { date: '17 jul · 18:06', title: 'Bobina reservada sin consumir', code: 'D02', worker: 'Jorge A.', workOrder: '151071.2', machine: 'EL01', operation: 'Exlam', shift: 'Tarde', age: '21 h 50 min', status: 'open' },
  { date: '17 jul · 16:42', title: 'Pesaje de bobina pendiente', code: 'A05', worker: 'Luis V.', workOrder: '151044.1', machine: 'P11', operation: 'Impresión', shift: 'Tarde', age: '34 min', status: 'resolved' },
  { date: '17 jul · 12:11', title: 'Recepción digital pendiente', code: 'A02', worker: 'Carmen R.', workOrder: '151039.2', machine: 'CT04', operation: 'Corte', shift: 'Día', age: '28 min', status: 'resolved' },
  { date: '16 jul · 19:23', title: 'OT activa sin consumo', code: 'A03', worker: 'Rosa P.', workOrder: '151021.1', machine: 'SE08', operation: 'Sellado', shift: 'Tarde', age: '41 min', status: 'resolved' },
  { date: '16 jul · 07:52', title: 'Producción fuera del plan', code: 'C03', worker: 'David V.', workOrder: '151012.2', machine: 'EL02', operation: 'Exlam', shift: 'Día', age: '1 h 02 min', status: 'resolved' }
];

const aging = [
  { label: 'Menos de 30 min', count: 7, tone: '' },
  { label: '30 min – 1 h', count: 9, tone: '' },
  { label: '1 – 4 h', count: 11, tone: 'attention' },
  { label: 'Más de 4 h', count: 6, tone: 'overdue' }
];

const rangeFilter = document.querySelector('[data-range-filter]');
const operationFilter = document.querySelector('[data-operation-filter]');
const statusFilter = document.querySelector('[data-status-filter]');
const searchInput = document.querySelector('[data-dashboard-search]');
const trendChart = document.querySelector('[data-trend-chart]');
const rankingList = document.querySelector('[data-ranking-list]');
const tableBody = document.querySelector('[data-open-errors-table]');
const emptyState = document.querySelector('[data-dashboard-empty]');
const toast = document.querySelector('[data-dashboard-toast]');
let selectedDimension = 'worker';
let toastTimer;

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

function filteredSummary() {
  const range = Number(rangeFilter.value);
  const base = summaryByRange[range];
  const factor = operationFactors[operationFilter.value];
  let resolved = Math.round(base.resolved * factor);
  let open = Math.round(base.open * factor);
  if (statusFilter.value === 'open') resolved = 0;
  if (statusFilter.value === 'resolved') open = 0;
  return { ...base, resolved, open, total: resolved + open };
}

function renderSummary() {
  const summary = filteredSummary();
  const resolutionRate = summary.total ? Math.round((summary.resolved / summary.total) * 100) : 0;
  document.querySelector('[data-total-alerts]').textContent = summary.total;
  document.querySelector('[data-resolved-alerts]').textContent = summary.resolved;
  document.querySelector('[data-open-alerts]').textContent = summary.open;
  document.querySelector('[data-average-time]').textContent = `${summary.average} min`;
  document.querySelector('[data-period-label]').textContent = summary.label;
  document.querySelector('[data-resolution-rate]').textContent = `${resolutionRate}%`;
  document.querySelector('[data-resolution-track]').style.width = `${resolutionRate}%`;
  document.querySelector('.resolution-track').setAttribute('aria-label', `${resolutionRate} por ciento resueltas`);
}

function trendPoints(range) {
  const count = range === 7 ? 7 : range === 30 ? 15 : 13;
  const step = range === 7 ? 1 : range === 30 ? 2 : 7;
  const baseDate = new Date('2026-07-18T12:00:00-05:00');
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() - ((count - index - 1) * step));
    const wave = Math.round(3 + 2 * Math.sin(index * 1.7));
    const resolved = Math.max(2, 7 + wave + (index % 3));
    const open = Math.max(1, 1 + ((index * 2 + 1) % 4));
    return { date, resolved, open };
  });
}

function renderTrend() {
  const points = trendPoints(Number(rangeFilter.value));
  const factor = operationFactors[operationFilter.value];
  const status = statusFilter.value;
  const values = points.map((point) => ({
    ...point,
    resolved: status === 'open' ? 0 : Math.max(status === 'resolved' ? 1 : 0, Math.round(point.resolved * factor)),
    open: status === 'resolved' ? 0 : Math.max(status === 'open' ? 1 : 0, Math.round(point.open * factor))
  }));
  const width = 720;
  const height = 270;
  const margin = { top: 12, right: 12, bottom: 34, left: 34 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const maximum = Math.max(...values.map((point) => point.resolved + point.open), 4);
  const roundedMaximum = Math.ceil(maximum / 4) * 4;
  const slot = chartWidth / values.length;
  const barWidth = Math.max(8, Math.min(24, slot * .58));
  const grid = Array.from({ length: 5 }, (_, index) => {
    const value = Math.round((roundedMaximum / 4) * index);
    const y = margin.top + chartHeight - (value / roundedMaximum) * chartHeight;
    return `<line class="trend-grid" x1="${margin.left}" x2="${width - margin.right}" y1="${y}" y2="${y}"></line><text class="trend-axis-text" x="${margin.left - 7}" y="${y + 3}" text-anchor="end">${value}</text>`;
  }).join('');
  const bars = values.map((point, index) => {
    const x = margin.left + index * slot + (slot - barWidth) / 2;
    const resolvedHeight = (point.resolved / roundedMaximum) * chartHeight;
    const openHeight = (point.open / roundedMaximum) * chartHeight;
    const resolvedY = margin.top + chartHeight - resolvedHeight;
    const openY = resolvedY - openHeight;
    const label = point.date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }).replace('.', '');
    const showLabel = values.length <= 8 || index % 2 === 0 || index === values.length - 1;
    return `<g class="trend-bar"><title>${label}: ${point.resolved} resueltas, ${point.open} abiertas</title><rect class="trend-resolved-bar" x="${x}" y="${resolvedY}" width="${barWidth}" height="${resolvedHeight}" rx="2"></rect><rect class="trend-open-bar" x="${x}" y="${openY}" width="${barWidth}" height="${openHeight}" rx="2"></rect>${showLabel ? `<text class="trend-axis-text" x="${x + barWidth / 2}" y="${height - 12}" text-anchor="middle">${label}</text>` : ''}</g>`;
  }).join('');
  trendChart.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Alertas resueltas y abiertas por fecha">${grid}${bars}</svg>`;
  const summary = filteredSummary();
  document.querySelector('[data-trend-summary]').textContent = `${summary.resolved} resueltas y ${summary.open} abiertas en ${summary.label.toLowerCase()}.`;
}

function visibleBreakdownRows() {
  const factor = operationFactors[operationFilter.value];
  return breakdowns[selectedDimension].map((row) => ({
    ...row,
    resolved: statusFilter.value === 'open' ? 0 : Math.round(row.resolved * factor),
    open: statusFilter.value === 'resolved' ? 0 : Math.round(row.open * factor)
  })).filter((row) => row.resolved + row.open > 0);
}

function renderRanking() {
  const rows = visibleBreakdownRows();
  const maximum = Math.max(...rows.map((row) => row.resolved + row.open), 1);
  rankingList.innerHTML = rows.map((row) => {
    const total = row.resolved + row.open;
    const resolvedWidth = (row.resolved / maximum) * 100;
    const openWidth = (row.open / maximum) * 100;
    return `<div class="ranking-row"><span class="ranking-label"><strong>${row.label}</strong><span>${row.open} abiertas · ${row.resolved} resueltas</span></span><span class="stacked-bar" aria-label="${row.label}: ${row.resolved} resueltas y ${row.open} abiertas"><i class="resolved" style="width:${resolvedWidth}%"></i><i class="open" style="width:${openWidth}%"></i></span><strong class="ranking-total">${total}</strong></div>`;
  }).join('');
}

function renderAging() {
  const factor = operationFactors[operationFilter.value];
  const rows = aging.map((row) => ({ ...row, count: statusFilter.value === 'resolved' ? 0 : Math.round(row.count * factor) }));
  const maximum = Math.max(...rows.map((row) => row.count), 1);
  document.querySelector('[data-aging-buckets]').innerHTML = rows.map((row) => `<div class="aging-row ${row.tone}"><span>${row.label}</span><span class="aging-track"><i style="width:${(row.count / maximum) * 100}%"></i></span><strong>${row.count}</strong></div>`).join('');
  document.querySelector('.inline-total').textContent = `${rows.reduce((sum, row) => sum + row.count, 0)} abiertas`;
}

function renderErrorTypes() {
  const factor = operationFactors[operationFilter.value];
  document.querySelector('[data-error-type-list]').innerHTML = breakdowns.errorType.slice(0, 4).map((row) => {
    const resolved = statusFilter.value === 'open' ? 0 : Math.round(row.resolved * factor);
    const open = statusFilter.value === 'resolved' ? 0 : Math.round(row.open * factor);
    return `<div class="error-type-row"><span class="error-type-copy"><strong>${row.label}</strong><span>${resolved + open} incidencias</span></span><span class="error-type-counts"><span class="resolved">${resolved} res.</span><span class="open">${open} ab.</span></span></div>`;
  }).join('');
}

function normalize(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function filteredRows() {
  const search = normalize(searchInput.value.trim());
  return alertRows.filter((row) => {
    const operationMatch = operationFilter.value === 'all' || row.operation === operationFilter.value;
    const statusMatch = statusFilter.value === 'all' || row.status === statusFilter.value;
    const searchMatch = !search || normalize(Object.values(row).join(' ')).includes(search);
    return operationMatch && statusMatch && searchMatch;
  });
}

function renderTable() {
  const rows = filteredRows();
  tableBody.innerHTML = rows.map((row) => `<tr><td class="table-time">${row.date}</td><td><strong>${row.title}</strong><small>${row.code}</small></td><td>${row.worker}</td><td>${row.workOrder}</td><td>${row.machine}</td><td>${row.operation}</td><td>${row.shift}</td><td class="table-age">${row.age}</td><td><span class="status-label ${row.status}">${row.status === 'open' ? 'Abierta' : 'Resuelta'}</span></td><td><a class="open-error-link" href="chat-detail.html" aria-label="Abrir conversación de ${row.title}">›</a></td></tr>`).join('');
  document.querySelector('[data-table-count]').textContent = rows.length;
  emptyState.hidden = rows.length !== 0;
  document.querySelector('.table-scroll').hidden = rows.length === 0;
}

function renderAll() {
  renderSummary();
  renderTrend();
  renderRanking();
  renderAging();
  renderErrorTypes();
  renderTable();
}

document.querySelectorAll('[data-dimension]').forEach((button) => {
  button.addEventListener('click', () => {
    selectedDimension = button.dataset.dimension;
    document.querySelectorAll('[data-dimension]').forEach((item) => item.setAttribute('aria-selected', String(item === button)));
    renderRanking();
  });
});

[rangeFilter, operationFilter, statusFilter].forEach((control) => control.addEventListener('change', renderAll));
searchInput.addEventListener('input', renderTable);

document.querySelector('[data-clear-filters]').addEventListener('click', () => {
  rangeFilter.value = '30';
  operationFilter.value = 'all';
  statusFilter.value = 'all';
  searchInput.value = '';
  renderAll();
});

document.querySelector('[data-export-report]').addEventListener('click', () => {
  const rows = filteredRows();
  const header = ['Detectada', 'Error', 'Código', 'Responsable', 'OT', 'Máquina', 'Operación', 'Turno', 'Antigüedad', 'Estado'];
  const csv = [header, ...rows.map((row) => [row.date, row.title, row.code, row.worker, row.workOrder, row.machine, row.operation, row.shift, row.age, row.status === 'open' ? 'Abierta' : 'Resuelta'])]
    .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'reporte-alertas-emusa.csv';
  link.click();
  URL.revokeObjectURL(url);
  showToast(`Reporte preparado con ${rows.length} alertas`);
});

const requestedWorkOrder = new URLSearchParams(window.location.search).get('workOrder');
if (requestedWorkOrder) searchInput.value = requestedWorkOrder;
renderAll();
