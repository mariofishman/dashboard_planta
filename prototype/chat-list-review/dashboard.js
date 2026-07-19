const summaryByRange = {
  7: { total: 48, resolved: 36, open: 9, adminClosed: 3, average: 31, label: 'Últimos 7 días' },
  30: { total: 184, resolved: 142, open: 33, adminClosed: 9, average: 46, label: 'Últimos 30 días' },
  90: { total: 536, resolved: 427, open: 77, adminClosed: 32, average: 51, label: 'Últimos 90 días' }
};

const operationFactors = { all: 1, Impresión: .34, Extrusión: .12, Exlam: .18, Corte: .17, Sellado: .13 };

const breakdowns = {
  worker: [
    { label: 'Luis V.', resolved: 19, open: 6, adminClosed: 2 },
    { label: 'Carmen R.', resolved: 18, open: 3, adminClosed: 1 },
    { label: 'Jorge A.', resolved: 14, open: 3, adminClosed: 2 },
    { label: 'Rosa P.', resolved: 10, open: 3, adminClosed: 1 },
    { label: 'David V.', resolved: 9, open: 2, adminClosed: 1 }
  ],
  workOrder: [
    { label: 'OT 151087.3', resolved: 8, open: 6, adminClosed: 1 },
    { label: 'OT 151056.1', resolved: 9, open: 3, adminClosed: 1 },
    { label: 'OT 151093.2', resolved: 8, open: 4, adminClosed: 0 },
    { label: 'OT 151104.1', resolved: 7, open: 2, adminClosed: 1 },
    { label: 'OT 151090.4', resolved: 7, open: 3, adminClosed: 1 }
  ],
  machine: [
    { label: 'P15', resolved: 29, open: 8, adminClosed: 2 },
    { label: 'EL02', resolved: 22, open: 6, adminClosed: 2 },
    { label: 'CT04', resolved: 18, open: 5, adminClosed: 1 },
    { label: 'SE12', resolved: 15, open: 4, adminClosed: 1 },
    { label: 'EX03', resolved: 14, open: 3, adminClosed: 2 }
  ],
  operation: [
    { label: 'Impresión', resolved: 48, open: 13, adminClosed: 3 },
    { label: 'Exlam', resolved: 31, open: 8, adminClosed: 2 },
    { label: 'Corte', resolved: 27, open: 6, adminClosed: 1 },
    { label: 'Sellado', resolved: 21, open: 5, adminClosed: 1 },
    { label: 'Extrusión', resolved: 15, open: 1, adminClosed: 2 }
  ],
  shift: [
    { label: 'Turno día', resolved: 72, open: 15, adminClosed: 4 },
    { label: 'Turno tarde', resolved: 44, open: 11, adminClosed: 3 },
    { label: 'Turno noche', resolved: 26, open: 7, adminClosed: 2 }
  ],
  errorType: [
    { label: 'A05 · Bobina sin pesar', resolved: 20, open: 8, adminClosed: 1 },
    { label: 'A02 · Material sin recepción', resolved: 18, open: 6, adminClosed: 1 },
    { label: 'C03 · OT fuera de secuencia', resolved: 15, open: 4, adminClosed: 2 },
    { label: 'A03 · Consumo sin declarar', resolved: 13, open: 5, adminClosed: 1 },
    { label: 'D03 · OT sin balance', resolved: 11, open: 4, adminClosed: 2 }
  ]
};

const alertRows = [
  { dateKey: '2026-07-18', date: '18 jul · 15:48', title: 'Bobina CU-98421 sin pesar', code: 'A05', worker: 'Luis V.', workOrder: '151087.3', machine: 'P15', operation: 'Impresión', shift: 'Día', age: '2 h 14 min', status: 'open' },
  { dateKey: '2026-07-18', date: '18 jul · 16:12', title: 'Movimiento de material sin recepción', code: 'A02', worker: 'Carmen R.', workOrder: '151087.3', machine: 'P15', operation: 'Impresión', shift: 'Día', age: '38 min', status: 'open' },
  { dateKey: '2026-07-18', date: '18 jul · 14:37', title: 'Consumo de bobina sin declarar', code: 'A03', worker: 'Jorge A.', workOrder: '151056.1', machine: 'P15', operation: 'Impresión', shift: 'Día', age: '1 h 19 min', status: 'open' },
  { dateKey: '2026-07-18', date: '18 jul · 13:51', title: 'OT iniciada fuera de secuencia', code: 'C03', worker: 'Rosa P.', workOrder: '151104.1', machine: 'P12', operation: 'Impresión', shift: 'Día', age: '2 h 05 min', status: 'open' },
  { dateKey: '2026-07-18', date: '18 jul · 12:45', title: 'Material próximo sin enviar', code: 'A01', worker: 'David V.', workOrder: '151110.1', machine: 'EL02', operation: 'Exlam', shift: 'Día', age: '3 h 11 min', status: 'open' },
  { dateKey: '2026-07-18', date: '18 jul · 11:24', title: 'Bolsa de merma sin pesar', code: 'A06', worker: 'Ana M.', workOrder: '151090.4', machine: 'SE12', operation: 'Sellado', shift: 'Día', age: '4 h 32 min', status: 'open' },
  { dateKey: '2026-07-17', date: '17 jul · 22:18', title: 'Diferencia en metros declarados', code: 'D03', worker: 'Martín R.', workOrder: '151049.1', machine: 'P09', operation: 'Impresión', shift: 'Noche', age: '17 h 38 min', status: 'open' },
  { dateKey: '2026-07-17', date: '17 jul · 18:06', title: 'Bobina reservada sin consumir', code: 'D02', worker: 'Jorge A.', workOrder: '151071.2', machine: 'EL01', operation: 'Exlam', shift: 'Tarde', age: '21 h 50 min', status: 'open' },
  { dateKey: '2026-07-17', date: '17 jul · 16:42', title: 'Pesaje de bobina pendiente', code: 'A05', worker: 'Luis V.', workOrder: '151044.1', machine: 'P11', operation: 'Impresión', shift: 'Tarde', age: '34 min', status: 'resolved' },
  { dateKey: '2026-07-17', date: '17 jul · 12:11', title: 'Recepción digital pendiente', code: 'A02', worker: 'Carmen R.', workOrder: '151039.2', machine: 'CT04', operation: 'Corte', shift: 'Día', age: '28 min', status: 'resolved' },
  { dateKey: '2026-07-16', date: '16 jul · 19:23', title: 'OT activa sin consumo', code: 'A03', worker: 'Rosa P.', workOrder: '151021.1', machine: 'SE08', operation: 'Sellado', shift: 'Tarde', age: '41 min', status: 'resolved' },
  { dateKey: '2026-07-16', date: '16 jul · 07:52', title: 'Producción fuera del plan', code: 'C03', worker: 'David V.', workOrder: '151012.2', machine: 'EL02', operation: 'Exlam', shift: 'Día', age: '1 h 02 min', status: 'resolved' },
  { dateKey: '2026-07-16', date: '16 jul · 10:36', title: 'Contenedor sin cierre conciliado', code: 'E03', worker: 'Mónica T.', workOrder: '151014.1', machine: 'EX03', operation: 'Extrusión', shift: 'Día', age: '2 h 07 min', status: 'adminClosed' },
  { dateKey: '2026-07-17', date: '17 jul · 08:14', title: 'Alerta descartada por dato duplicado', code: 'A02', worker: 'Administrador', workOrder: '151033.2', machine: 'CT03', operation: 'Corte', shift: 'Día', age: '18 min', status: 'adminClosed' }
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
let selectedDate = null;
let toastTimer;

const statusLabels = { all: 'Todos los estados', open: 'Abiertas', resolved: 'Resueltas', adminClosed: 'Cerradas sin resolución' };

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

function normalize(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function searchFactor() {
  const search = normalize(searchInput.value.trim());
  if (!search) return 1;
  const matching = alertRows.filter((row) => normalize(Object.values(row).join(' ')).includes(search)).length;
  return matching ? Math.max(.08, matching / alertRows.length) : 0;
}

function trendPoints(range) {
  const count = range === 7 ? 7 : range === 30 ? 15 : 13;
  const step = range === 7 ? 1 : range === 30 ? 2 : 7;
  const baseDate = new Date('2026-07-18T12:00:00-05:00');
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() - ((count - index - 1) * step));
    const wave = Math.round(3 + 2 * Math.sin(index * 1.7));
    return {
      date,
      dateKey: date.toISOString().slice(0, 10),
      resolved: Math.max(2, 6 + wave + (index % 3)),
      open: Math.max(1, 1 + ((index * 2 + 1) % 4)),
      adminClosed: index % 4 === 1 ? 2 : index % 3 === 0 ? 1 : 0
    };
  });
}

function currentPoint() {
  return selectedDate ? trendPoints(Number(rangeFilter.value)).find((point) => point.dateKey === selectedDate) : null;
}

function filteredSummary() {
  const base = summaryByRange[Number(rangeFilter.value)];
  const point = currentPoint();
  const factor = operationFactors[operationFilter.value] * searchFactor();
  const source = point || base;
  const values = {
    resolved: Math.round(source.resolved * factor),
    open: Math.round(source.open * factor),
    adminClosed: Math.round(source.adminClosed * factor)
  };
  Object.keys(values).forEach((key) => {
    if (statusFilter.value !== 'all' && statusFilter.value !== key) values[key] = 0;
  });
  const total = values.resolved + values.open + values.adminClosed;
  const dateLabel = point ? point.date.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }) : base.label;
  return { ...values, total, average: base.average, label: dateLabel };
}

function renderSummary() {
  const summary = filteredSummary();
  const resolutionRate = summary.total ? Math.round((summary.resolved / summary.total) * 100) : 0;
  document.querySelector('[data-total-alerts]').textContent = summary.total;
  document.querySelector('[data-resolved-alerts]').textContent = summary.resolved;
  document.querySelector('[data-open-alerts]').textContent = summary.open;
  document.querySelector('[data-admin-closed-alerts]').textContent = summary.adminClosed;
  document.querySelector('[data-average-time]').textContent = `${summary.average} min`;
  document.querySelector('[data-period-label]').textContent = summary.label;
  document.querySelector('[data-resolution-rate]').textContent = `${resolutionRate}%`;
}

function renderFilterSummary() {
  const labels = [summaryByRange[Number(rangeFilter.value)].label];
  if (selectedDate) labels[0] = currentPoint()?.date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }) || labels[0];
  if (operationFilter.value !== 'all') labels.push(operationFilter.value);
  labels.push(statusLabels[statusFilter.value]);
  if (searchInput.value.trim()) labels.push(`“${searchInput.value.trim()}”`);
  document.querySelector('[data-filter-summary]').textContent = labels.join(' · ');
}

function renderTrend() {
  const points = trendPoints(Number(rangeFilter.value));
  const factor = operationFactors[operationFilter.value] * searchFactor();
  const status = statusFilter.value;
  const values = points.map((point) => ({
    ...point,
    resolved: status === 'all' || status === 'resolved' ? Math.round(point.resolved * factor) : 0,
    open: status === 'all' || status === 'open' ? Math.round(point.open * factor) : 0,
    adminClosed: status === 'all' || status === 'adminClosed' ? Math.round(point.adminClosed * factor) : 0
  }));
  const width = 720;
  const height = 270;
  const margin = { top: 12, right: 12, bottom: 34, left: 34 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const maximum = Math.max(...values.map((point) => point.resolved + point.open + point.adminClosed), 4);
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
    const adminHeight = (point.adminClosed / roundedMaximum) * chartHeight;
    const resolvedY = margin.top + chartHeight - resolvedHeight;
    const openY = resolvedY - openHeight;
    const adminY = openY - adminHeight;
    const label = point.date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }).replace('.', '');
    const showLabel = values.length <= 8 || index % 2 === 0 || index === values.length - 1;
    const dimmed = selectedDate && selectedDate !== point.dateKey ? ' is-dimmed' : '';
    const segment = (kind, y, segmentHeight, count) => segmentHeight > 0 ? `<rect class="trend-${kind}-bar trend-segment" data-date="${point.dateKey}" data-status="${kind}" tabindex="0" role="button" aria-label="${label}: ${count} ${statusLabels[kind].toLowerCase()}" x="${x}" y="${y}" width="${barWidth}" height="${segmentHeight}" rx="2"></rect>` : '';
    return `<g class="trend-bar${dimmed}"><title>${label}: ${point.resolved} resueltas, ${point.open} abiertas, ${point.adminClosed} cerradas sin resolución</title>${segment('resolved', resolvedY, resolvedHeight, point.resolved)}${segment('open', openY, openHeight, point.open)}${segment('adminClosed', adminY, adminHeight, point.adminClosed)}${showLabel ? `<text class="trend-axis-text" x="${x + barWidth / 2}" y="${height - 12}" text-anchor="middle">${label}</text>` : ''}</g>`;
  }).join('');
  trendChart.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Alertas por fecha y estado. Cada segmento permite filtrar el dashboard.">${grid}${bars}</svg>`;
  const summary = filteredSummary();
  document.querySelector('[data-trend-summary]').textContent = `${summary.total} alertas en ${summary.label.toLowerCase()}. Selecciona un segmento para profundizar.`;
}

function scaleRows(rows) {
  const factor = operationFactors[operationFilter.value] * searchFactor() * (selectedDate ? .14 : 1);
  return rows.map((row) => {
    const scaled = { ...row };
    ['resolved', 'open', 'adminClosed'].forEach((key) => {
      scaled[key] = statusFilter.value === 'all' || statusFilter.value === key ? Math.round(row[key] * factor) : 0;
    });
    return scaled;
  }).filter((row) => row.resolved + row.open + row.adminClosed > 0);
}

function renderRanking() {
  const rows = scaleRows(breakdowns[selectedDimension]);
  const maximum = Math.max(...rows.map((row) => row.resolved + row.open + row.adminClosed), 1);
  rankingList.innerHTML = rows.length ? rows.map((row) => {
    const total = row.resolved + row.open + row.adminClosed;
    return `<div class="ranking-row"><span class="ranking-label"><strong>${row.label}</strong><span>${row.open} ab. · ${row.resolved} res. · ${row.adminClosed} cerr. sin resolución</span></span><span class="stacked-bar" aria-label="${row.label}: ${row.resolved} resueltas, ${row.open} abiertas y ${row.adminClosed} cerradas sin resolución"><i class="resolved" style="width:${(row.resolved / maximum) * 100}%"></i><i class="open" style="width:${(row.open / maximum) * 100}%"></i><i class="adminClosed" style="width:${(row.adminClosed / maximum) * 100}%"></i></span><strong class="ranking-total">${total}</strong></div>`;
  }).join('') : '<p class="inline-empty">No hay datos para estos filtros.</p>';
}

function renderAging() {
  const factor = operationFactors[operationFilter.value] * searchFactor() * (selectedDate ? .2 : 1);
  const rows = aging.map((row) => ({ ...row, count: statusFilter.value === 'all' || statusFilter.value === 'open' ? Math.round(row.count * factor) : 0 }));
  const maximum = Math.max(...rows.map((row) => row.count), 1);
  document.querySelector('[data-aging-buckets]').innerHTML = rows.map((row) => `<div class="aging-row ${row.tone}"><span>${row.label}</span><span class="aging-track"><i style="width:${(row.count / maximum) * 100}%"></i></span><strong>${row.count}</strong></div>`).join('');
  document.querySelector('.inline-total').textContent = `${rows.reduce((sum, row) => sum + row.count, 0)} abiertas`;
}

function renderErrorTypes() {
  const rows = scaleRows(breakdowns.errorType).slice(0, 4);
  document.querySelector('[data-error-type-list]').innerHTML = rows.length ? rows.map((row) => `<div class="error-type-row"><span class="error-type-copy"><strong>${row.label}</strong><span>${row.resolved + row.open + row.adminClosed} incidencias</span></span><span class="error-type-counts"><span class="resolved">${row.resolved} res.</span><span class="open">${row.open} ab.</span><span class="adminClosed">${row.adminClosed} sin res.</span></span></div>`).join('') : '<p class="inline-empty">No hay datos para estos filtros.</p>';
}

function filteredRows() {
  const search = normalize(searchInput.value.trim());
  return alertRows.filter((row) => {
    const operationMatch = operationFilter.value === 'all' || row.operation === operationFilter.value;
    const statusMatch = statusFilter.value === 'all' || row.status === statusFilter.value;
    const dateMatch = !selectedDate || row.dateKey === selectedDate;
    const searchMatch = !search || normalize(Object.values(row).join(' ')).includes(search);
    return operationMatch && statusMatch && dateMatch && searchMatch;
  });
}

function statusText(status) {
  return { open: 'Abierta', resolved: 'Resuelta', adminClosed: 'Cerrada sin resolución' }[status];
}

function renderTable() {
  const rows = filteredRows();
  tableBody.innerHTML = rows.map((row) => `<tr><td class="table-time">${row.date}</td><td><strong>${row.title}</strong><small>${row.code}</small></td><td>${row.worker}</td><td><a class="work-order-link" href="https://erp-web.apps.emusa.dev/work-orders/${encodeURIComponent(row.workOrder)}" target="_blank" rel="noopener" aria-label="Abrir OT ${row.workOrder} en EMUSA Soft">${row.workOrder}</a></td><td>${row.machine}</td><td>${row.operation}</td><td>${row.shift}</td><td class="table-age">${row.age}</td><td><span class="status-label ${row.status}">${statusText(row.status)}</span></td><td><a class="open-error-link" href="chat-detail.html" aria-label="Abrir conversación de ${row.title}">›</a></td></tr>`).join('');
  document.querySelector('[data-table-count]').textContent = rows.length;
  emptyState.hidden = rows.length !== 0;
  document.querySelector('.table-scroll').hidden = rows.length === 0;
}

function renderAll() {
  renderSummary();
  renderFilterSummary();
  renderTrend();
  renderRanking();
  renderAging();
  renderErrorTypes();
  renderTable();
}

function resetFilters() {
  rangeFilter.value = '30';
  operationFilter.value = 'all';
  statusFilter.value = 'all';
  searchInput.value = '';
  selectedDate = null;
  renderAll();
}

document.querySelectorAll('[data-dimension]').forEach((button) => {
  button.addEventListener('click', () => {
    selectedDimension = button.dataset.dimension;
    document.querySelectorAll('[data-dimension]').forEach((item) => item.setAttribute('aria-selected', String(item === button)));
    renderRanking();
  });
});

[rangeFilter, operationFilter, statusFilter].forEach((control) => control.addEventListener('change', () => {
  if (control === rangeFilter) selectedDate = null;
  renderAll();
}));
searchInput.addEventListener('input', renderAll);
document.querySelector('[data-reset-filters]').addEventListener('click', resetFilters);

function applyTrendDrilldown(target) {
  const segment = target.closest('.trend-segment');
  if (!segment) return;
  selectedDate = segment.dataset.date;
  statusFilter.value = segment.dataset.status;
  renderAll();
  document.querySelector('.trend-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

trendChart.addEventListener('click', (event) => applyTrendDrilldown(event.target));
trendChart.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    applyTrendDrilldown(event.target);
  }
});

const filterToggle = document.querySelector('[data-filter-toggle]');
const filterContent = document.querySelector('[data-filter-content]');
filterToggle.addEventListener('click', () => {
  const expanded = filterToggle.getAttribute('aria-expanded') === 'true';
  filterToggle.setAttribute('aria-expanded', String(!expanded));
  filterContent.hidden = expanded;
});

const ecosystemToggle = document.querySelector('[data-ecosystem-toggle]');
const ecosystemMenu = document.querySelector('[data-ecosystem-menu]');
ecosystemToggle.addEventListener('click', () => {
  const expanded = ecosystemToggle.getAttribute('aria-expanded') === 'true';
  ecosystemToggle.setAttribute('aria-expanded', String(!expanded));
  ecosystemMenu.hidden = expanded;
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.ecosystem-control')) {
    ecosystemToggle.setAttribute('aria-expanded', 'false');
    ecosystemMenu.hidden = true;
  }
});
document.querySelectorAll('[data-ecosystem-app]').forEach((button) => button.addEventListener('click', () => showToast(`${button.dataset.ecosystemApp}: acceso del ecosistema`)));

document.querySelector('[data-export-report]').addEventListener('click', () => {
  const rows = filteredRows();
  const header = ['Detectada', 'Error', 'Código', 'Responsable', 'OT', 'Máquina', 'Operación', 'Turno', 'Antigüedad', 'Estado'];
  const csv = [header, ...rows.map((row) => [row.date, row.title, row.code, row.worker, row.workOrder, row.machine, row.operation, row.shift, row.age, statusText(row.status)])]
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
