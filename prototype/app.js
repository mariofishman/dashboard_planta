const stages = ["Reserva", "Envío", "Tránsito", "Consumo", "Producción", "Pesaje", "Cierre"];

const exceptions = [
  {
    id: 1,
    severity: "critical",
    title: "Bobina producida sin pesar",
    description: "La bobina CU-98421 continúa junto a la prensa.",
    operation: "Impresión",
    workOrder: "151056.1",
    machine: "P15",
    stage: 5,
    elapsed: "47 min",
    detected: "10:13",
    expected: "La bobina debía recogerse y pesarse dentro de los 30 minutos posteriores a su declaración.",
    recorded: "No existe pesaje ni movimiento registrado 47 minutos después de la declaración.",
    evidence: [
      ["09:26", "Producción declarada", "CU-98421 · Operador Luis M."],
      ["09:27", "Etiqueta impresa", "Código de barras generado"],
      ["09:56", "Límite de pesaje vencido", "Sin registro en balanza"],
      ["10:13", "Excepción crítica", "La bobina permanece en P15"]
    ],
    audience: ["Gerente de planta", "Supervisor de impresión", "Líder de impresión", "Equipo de procesos"]
  },
  {
    id: 2,
    severity: "critical",
    title: "Material en tránsito por más de 30 min",
    description: "Dos bobinas fueron enviadas pero no recibidas.",
    operation: "Exlam",
    workOrder: "151093.2",
    machine: "EL02",
    stage: 2,
    elapsed: "38 min",
    detected: "10:08",
    expected: "El operador debía recibir digitalmente las bobinas dentro de los 30 minutos posteriores al envío.",
    recorded: "CU-77118 y CU-77122 continúan en estado En tránsito.",
    evidence: [
      ["09:30", "Salida de almacén", "2 bobinas hacia EL02"],
      ["09:31", "Estado en tránsito", "Destino: Exlam"],
      ["10:00", "Límite de recepción vencido", "Sin usuario receptor"],
      ["10:08", "Excepción crítica", "38 minutos en tránsito"]
    ],
    audience: ["Gerente de planta", "Supervisor de Exlam", "Supervisor de almacén", "Equipo de procesos"]
  },
  {
    id: 3,
    severity: "critical",
    title: "OT iniciada fuera de secuencia",
    description: "La OT 151104.1 no era la siguiente en el plan vigente.",
    operation: "Impresión",
    workOrder: "151104.1",
    machine: "P12",
    stage: 3,
    elapsed: "22 min",
    detected: "10:02",
    expected: "La OT 151099.1 debía iniciar primero según la última secuencia aprobada.",
    recorded: "El operador inició la OT 151104.1 a las 09:40.",
    evidence: [
      ["08:12", "Secuencia actualizada", "151099.1 → 151104.1"],
      ["09:40", "OT 151104.1 iniciada", "Usuario: Carlos P."],
      ["09:40", "Diferencia detectada", "OT esperada: 151099.1"],
      ["10:02", "Sin cambio de secuencia", "La excepción continúa activa"]
    ],
    audience: ["Gerente de planta", "Supervisor de impresión", "Líder de impresión"]
  },
  {
    id: 4,
    severity: "warning",
    title: "OT próxima sin material enviado",
    description: "Faltan 42 minutos para el inicio planificado.",
    operation: "Laminación",
    workOrder: "151110.1",
    machine: "LAM03",
    stage: 1,
    elapsed: "18 min",
    detected: "09:58",
    expected: "Las tres bobinas reservadas debían enviarse antes del límite configurado de 60 minutos.",
    recorded: "Las bobinas siguen registradas en el almacén de materia prima.",
    evidence: [
      ["07:45", "Material reservado", "3 bobinas asignadas por David Alba"],
      ["09:40", "Ventana de envío abierta", "Inicio planificado: 10:40"],
      ["09:58", "Sin flujo de salida", "3 bobinas en almacén"]
    ],
    audience: ["Gerente de planta", "Supervisor de laminación", "Supervisor de almacén"]
  },
  {
    id: 5,
    severity: "warning",
    title: "OT activa sin consumo declarado",
    description: "La máquina opera sin consumo digital registrado.",
    operation: "Corte",
    workOrder: "151087.3",
    machine: "CT07",
    stage: 3,
    elapsed: "16 min",
    detected: "09:54",
    expected: "La primera bobina reservada debía declararse consumida al comenzar la operación.",
    recorded: "La OT inició a las 09:38 y no tiene consumos registrados.",
    evidence: [
      ["09:07", "Bobina recibida", "CU-66502 en CT07"],
      ["09:38", "OT iniciada", "Usuario: Andrea S."],
      ["09:54", "Sin consumo declarado", "16 minutos desde el inicio"]
    ],
    audience: ["Gerente de planta", "Supervisor de corte"]
  },
  {
    id: 6,
    severity: "warning",
    title: "Bobina reservada no consumida al cierre",
    description: "La OT fue truncada con una bobina pendiente.",
    operation: "Exlam",
    workOrder: "151071.2",
    machine: "EL01",
    stage: 6,
    elapsed: "1 h 12",
    detected: "09:21",
    expected: "El cierre debía explicar por qué CU-55318 no fue consumida.",
    recorded: "OT truncada sin motivo asociado a la bobina reservada restante.",
    evidence: [
      ["05:12", "Material reservado", "4 bobinas"],
      ["08:48", "Consumo final", "3 de 4 bobinas consumidas"],
      ["09:09", "OT truncada", "Motivo pendiente"],
      ["09:21", "Aviso de revisión", "CU-55318 continúa reservada"]
    ],
    audience: ["Gerente de planta", "Supervisor de Exlam"]
  },
  {
    id: 7,
    severity: "warning",
    title: "Diferencia en metros declarados",
    description: "La corrida supera los metros estimados de consumo.",
    operation: "Impresión",
    workOrder: "151049.1",
    machine: "P09",
    stage: 6,
    elapsed: "53 min",
    detected: "09:17",
    expected: "Los consumos registrados representan aproximadamente 30,400 m.",
    recorded: "El operador declaró una corrida de 39,860 m.",
    evidence: [
      ["08:15", "Último consumo", "3 bobinas · 30,400 m estimados"],
      ["08:24", "Cierre iniciado", "Operador: Martín R."],
      ["08:24", "39,860 m declarados", "Diferencia: +9,460 m"],
      ["09:17", "Revisión pendiente", "Posible bobina no declarada"]
    ],
    audience: ["Gerente de planta", "Supervisor de impresión", "Líder de impresión"]
  },
  {
    id: 8,
    severity: "warning",
    title: "Bolsa de merma sin pesar",
    description: "La etiqueta fue creada hace 34 minutos.",
    operation: "Sellado",
    workOrder: "151090.4",
    machine: "SE12",
    stage: 5,
    elapsed: "34 min",
    detected: "09:11",
    expected: "La bolsa cerrada debía llevarse a la balanza inmediatamente después de etiquetarse.",
    recorded: "La merma MR-10982 no tiene registro de peso.",
    evidence: [
      ["08:37", "Merma declarada", "MR-10982 · 1 bolsa"],
      ["08:38", "Etiqueta impresa", "Origen: SE12"],
      ["09:07", "Límite de pesaje vencido", "Sin registro en balanza"],
      ["09:11", "Advertencia activa", "34 minutos sin peso"]
    ],
    audience: ["Gerente de planta", "Supervisor de sellado", "Equipo de procesos"]
  },
  {
    id: 9,
    severity: "info",
    title: "Envío de material próximo a vencer",
    description: "Quedan 12 minutos para el límite de despacho.",
    operation: "Corte",
    workOrder: "151116.1",
    machine: "CT04",
    stage: 1,
    elapsed: "12 min",
    detected: "09:45",
    expected: "La bobina CU-90311 debe salir antes de las 10:15.",
    recorded: "La reserva está completa; aún no existe flujo de salida.",
    evidence: [
      ["08:20", "Material reservado", "CU-90311"],
      ["09:45", "Ventana de envío", "Límite: 10:15"]
    ],
    audience: ["Gerente de planta", "Supervisor de corte", "Supervisor de almacén"]
  },
  {
    id: 10,
    severity: "info",
    title: "Pesaje próximo a vencer",
    description: "La bobina tiene 24 minutos sin peso.",
    operation: "Laminación",
    workOrder: "151100.2",
    machine: "LAM02",
    stage: 5,
    elapsed: "24 min",
    detected: "09:42",
    expected: "La bobina CU-88409 debe pesarse antes de las 10:18.",
    recorded: "La bobina está declarada y pendiente de recolección.",
    evidence: [
      ["09:24", "Producción declarada", "CU-88409"],
      ["09:25", "Etiqueta impresa", "Origen: LAM02"],
      ["09:42", "Aviso preventivo", "6 minutos para el límite"]
    ],
    audience: ["Gerente de planta", "Supervisor de laminación", "Equipo de procesos"]
  }
];

const severityLabels = {
  critical: "Crítica",
  warning: "Advertencia",
  info: "Por vencer"
};

const list = document.querySelector("#exception-list");
const emptyState = document.querySelector("#empty-state");
const searchInput = document.querySelector("#search-input");
const operationFilter = document.querySelector("#operation-filter");
const severityButtons = [...document.querySelectorAll("[data-severity]")];
const stageButtons = [...document.querySelectorAll("[data-stage]")];
const drawer = document.querySelector("#detail-drawer");
const scrim = document.querySelector("#drawer-scrim");
let selectedSeverity = "all";
let selectedStage = "all";
let simulatedEventCount = 0;

function traceMarkup(activeStage) {
  return stages.map((stage, index) => {
    let state = "is-future";
    if (index < activeStage) state = "is-complete";
    if (index === activeStage) state = "is-broken";
    return `<span class="trace-step ${state}"><span class="trace-dot"></span><span>${stage}</span></span>`;
  }).join("");
}

function rowMarkup(item) {
  return `
    <button class="exception-row ${item.isNew ? "is-new" : ""}" type="button" data-id="${item.id}" aria-label="Abrir excepción: ${item.title}">
      <span class="severity-pill severity-${item.severity}">${severityLabels[item.severity]}</span>
      <span class="exception-copy">
        <strong>${item.title}</strong>
        <span>${item.description}</span>
      </span>
      <span class="work-order">
        <strong>OT ${item.workOrder}</strong>
        <span>${item.operation} · ${item.machine}</span>
      </span>
      <span class="flow-trace" aria-label="Excepción en ${stages[item.stage]}">${traceMarkup(item.stage)}</span>
      <span class="elapsed-time">
        <strong>${item.elapsed}</strong>
        <span>Detectada ${item.detected}</span>
      </span>
      <span class="row-arrow" aria-hidden="true">›</span>
    </button>
  `;
}

function filteredExceptions() {
  const query = searchInput.value.trim().toLowerCase();
  const operation = operationFilter.value;
  return exceptions.filter((item) => {
    const matchesSeverity = selectedSeverity === "all" || item.severity === selectedSeverity;
    const matchesStage = selectedStage === "all" || item.stage === Number(selectedStage);
    const matchesOperation = operation === "all" || item.operation === operation;
    const text = `${item.title} ${item.description} ${item.workOrder} ${item.machine} ${item.operation}`.toLowerCase();
    return matchesSeverity && matchesStage && matchesOperation && text.includes(query);
  });
}

function updateStageRail() {
  const severityRank = { critical: 3, warning: 2, info: 1 };
  stageButtons.forEach((button) => {
    const stage = Number(button.dataset.stage);
    const stageItems = exceptions.filter((item) => item.stage === stage);
    const highestSeverity = stageItems.reduce((highest, item) => {
      return severityRank[item.severity] > severityRank[highest] ? item.severity : highest;
    }, "info");
    button.classList.remove("has-critical", "has-warning", "has-info", "is-selected");
    if (stageItems.length > 0) button.classList.add(`has-${highestSeverity}`);
    if (selectedStage === button.dataset.stage) button.classList.add("is-selected");
    button.setAttribute("aria-pressed", String(selectedStage === button.dataset.stage));
    const countLabel = stageItems.length === 1 ? "1 excepción" : `${stageItems.length} excepciones`;
    button.setAttribute("aria-label", `${stages[stage]}: ${countLabel}. Filtrar la lista.`);
    button.querySelector("strong").textContent = stageItems.length;
  });
}

function render() {
  const items = filteredExceptions();
  list.innerHTML = items.map(rowMarkup).join("");
  emptyState.hidden = items.length !== 0;
  document.querySelector("#active-count").textContent = exceptions.length;
  document.querySelector("#critical-count").textContent = exceptions.filter((item) => item.severity === "critical").length;
  document.querySelector("#warning-count").textContent = exceptions.filter((item) => item.severity === "warning").length;
  document.querySelector("#info-count").textContent = exceptions.filter((item) => item.severity === "info").length;
  updateStageRail();
}

function openDrawer(item) {
  const severity = document.querySelector("#drawer-severity");
  severity.className = `severity-pill severity-${item.severity}`;
  severity.textContent = severityLabels[item.severity];
  document.querySelector("#drawer-title").textContent = item.title;
  document.querySelector("#drawer-context").innerHTML = `
    <div class="context-item"><span>Orden de trabajo</span><strong>${item.workOrder}</strong></div>
    <div class="context-item"><span>Operación</span><strong>${item.operation}</strong></div>
    <div class="context-item"><span>Máquina</span><strong>${item.machine}</strong></div>
  `;
  document.querySelector("#drawer-expected").textContent = item.expected;
  document.querySelector("#drawer-recorded").textContent = item.recorded;
  document.querySelector("#drawer-evidence").innerHTML = item.evidence.map((entry, index) => `
    <li class="evidence-item ${index === item.evidence.length - 1 ? "is-error" : ""}">
      <time>${entry[0]}</time>
      <span class="evidence-marker" aria-hidden="true"></span>
      <div><strong>${entry[1]}</strong><span>${entry[2]}</span></div>
    </li>
  `).join("");
  document.querySelector("#drawer-audience").innerHTML = item.audience.map((person) => `<span class="audience-chip">${person}</span>`).join("");
  drawer.setAttribute("aria-hidden", "false");
  drawer.classList.add("is-open");
  scrim.hidden = false;
  requestAnimationFrame(() => scrim.classList.add("is-visible"));
  document.body.style.overflow = "hidden";
  document.querySelector("#close-drawer").focus();
}

function closeDrawer() {
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  scrim.classList.remove("is-visible");
  document.body.style.overflow = "";
  window.setTimeout(() => { scrim.hidden = true; }, 180);
}

function updateTime() {
  const now = new Date();
  const time = now.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const timeElement = document.querySelector("#current-time");
  timeElement.dateTime = now.toISOString();
  timeElement.textContent = time;
}

function simulateSocketEvent() {
  simulatedEventCount += 1;
  const now = new Date();
  const detectedTime = now.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false });
  exceptions.unshift({
    id: 100 + simulatedEventCount,
    severity: "critical",
    title: "OT iniciada sin reservas completas",
    description: `Evento simulado ${simulatedEventCount}: falta reservar una bobina de sustrato.`,
    operation: "Impresión",
    workOrder: `151122.${simulatedEventCount}`,
    machine: "P07",
    stage: 0,
    elapsed: "Ahora",
    detected: detectedTime,
    expected: "Todas las bobinas requeridas debían estar reservadas antes del inicio.",
    recorded: "La OT inició con una de dos bobinas reservadas.",
    evidence: [
      [detectedTime, "Reserva parcial", "1 de 2 bobinas"],
      [detectedTime, "OT iniciada", "Usuario: José V."],
      [detectedTime, "Excepción crítica", "Reserva incompleta"]
    ],
    audience: ["Gerente de planta", "Supervisor de impresión", "Líder de impresión", "Responsable de reservas"],
    isNew: true
  });
  render();
  const toast = document.querySelector("#socket-toast");
  toast.hidden = false;
  window.setTimeout(() => { toast.hidden = true; }, 3200);
}

list.addEventListener("click", (event) => {
  const row = event.target.closest("[data-id]");
  if (!row) return;
  openDrawer(exceptions.find((item) => item.id === Number(row.dataset.id)));
});

searchInput.addEventListener("input", render);
operationFilter.addEventListener("change", render);
severityButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedSeverity = button.dataset.severity;
    severityButtons.forEach((candidate) => candidate.classList.toggle("is-active", candidate === button));
    render();
  });
});
stageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedStage = selectedStage === button.dataset.stage ? "all" : button.dataset.stage;
    render();
  });
});
document.querySelector("#close-drawer").addEventListener("click", closeDrawer);
scrim.addEventListener("click", closeDrawer);
document.querySelector("#simulate-event").addEventListener("click", simulateSocketEvent);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && drawer.classList.contains("is-open")) closeDrawer();
});
document.querySelector("#erp-link").addEventListener("click", (event) => event.preventDefault());

updateTime();
window.setInterval(updateTime, 1000);
render();
