const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
window.addEventListener("error", (event) => {
  const node = document.querySelector("#toast");
  if (node) {
    node.textContent = `Error conectado: ${event.message}`;
    node.classList.remove("hidden");
  }
});
window.addEventListener("unhandledrejection", (event) => {
  const node = document.querySelector("#toast");
  if (node) {
    node.textContent = `Error conectado: ${event.reason?.message ?? event.reason}`;
    node.classList.remove("hidden");
  }
});
let data = {
    items: [],
    runtime: null,
    tab: "a02",
    selected: null,
    permission: "origin",
    snapshots: [],
    page: 1,
    pageSize: 50,
    reset: null,
    resetObserved: false,
    sourceWindow: null,
    sourceWindowInitialized: false,
    historyMode: false,
    historyByType: {},
    historySelected: null,
  },
  refreshPromise = null,
  closureTarget = null,
  tabInteractionActive = false;
const fmt = (v) =>
  v
    ? new Intl.DateTimeFormat("es-PE", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date(v))
    : "—";
const fmtCompact = (v) => {
  if (!v) return "—";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(new Date(v))
      .map(({ type, value }) => [type, value]),
  );
  return `${parts.day}-${parts.month.replace(".", "")} ${parts.hour}:${parts.minute}`;
};
const compactCell = (fullValue, displayedValue) => {
  const node = document.createElement("span");
  node.textContent = String(displayedValue);
  node.title = String(fullValue);
  return node.outerHTML;
};
const shortUniqueCode = (value) =>
  compactCell(value, String(value).slice(-4));
const shortSourceArea = (value) => {
  const area = String(value).match(/\b(APP|AMP)\b/i)?.[1]?.toUpperCase();
  return compactCell(value, area ?? value);
};
const shortMachineDestination = (value) => {
  const candidate = String(value).split("·").at(-1)?.trim() ?? String(value);
  const machine = /^(?:[A-Z]{1,4}\s*\d+)$/i.test(candidate)
    ? candidate.replace(/\s+/g, "")
    : value;
  return compactCell(value, machine);
};
const businessTimeIsoValue = (value) => new Date(`${value}:00-05:00`).toISOString();
const elapsedMinutesSince = (value) => {
  const current = Date.parse(experiment()?.businessTime),
    started = Date.parse(value);
  return Number.isFinite(current) && Number.isFinite(started)
    ? `${Math.max(0, Math.floor((current - started) / 60_000))} min`
    : "—";
};
const limaDateTimeValue = (iso) =>
  new Date(Math.ceil(Date.parse(iso) / 60_000) * 60_000 - 5 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);
const val = (r, ...ks) => {
  for (const k of ks) if (r[k] != null && r[k] !== "") return r[k];
  return "—";
};
const api = async (path, options = {}) => {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "content-type": "application/json" },
    ...options,
  });
  if (!response.ok)
    throw Error(
      (await response.json().catch(() => ({}))).error || response.status,
    );
  return response.json();
};
const notify = (message) => {
  const el = $("#toast");
  el.textContent = message;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 2600);
};
const code = () => data.tab.toUpperCase(),
  status = (c) => data.items.find((i) => i.ruleCode === c),
  experiment = () => data.runtime?.experiment;
function incident(record) {
  const i = record.actual.incident;
  return i
    ? {
        id: i.id,
        status: i.lifecycle,
        occurrence: i.occurrence,
        openedAt: i.openedAt,
        reasons: record.expected.reasons,
        evidence: record.actual.evidenceCount,
        deliveries: record.actual.deliveryCount,
        conversation: record.actual.conversationCount,
        message: record.actual.messageCount,
        cards: i.lifecycle === "open" ? 1 : 0,
        recipients: record.actual.deliveries.map((d) => d.recipientName),
      }
    : null;
}
function rows(type) {
  if (!experiment()) return [];
  const s = status(type.toUpperCase());
  return (s?.records || []).map((record) => {
    const r = record.row,
      i = incident(record),
      common = {
        id: String(record.key),
        key: record.key,
        pending: record.pendingPoll,
        incident: i,
        occurrence: i?.occurrence || 0,
        lastPoll: s.pollerState.latestPoll?.finishedAt,
        lastCursor: record.actual.latestChangeCursor,
        source: r,
      };
    if (type === "a02")
      return {
        ...common,
        sku: val(r, "sku"),
        unique:
          val(r, "uniqueItemCode", "uniqueCode") === "—"
            ? ""
            : val(r, "uniqueItemCode", "uniqueCode"),
        description: val(r, "materialName", "description"),
        quantity: val(r, "quantity"),
        unit: val(r, "unitSymbol", "unit"),
        origin: val(r, "originWarehouseName", "origin"),
        destination: val(r, "destinationWarehouseName", "destination"),
        ot: val(r, "workOrderCode"),
        machine: val(r, "machineCode"),
        dispatchedAt: val(r, "dispatchedAt"),
        sourceState: val(r, "state", "sourceState"),
      };
    if (type === "a03")
      return {
        ...common,
        id: val(r, "workOrderCode"),
        operation: val(r, "operationName"),
        machine: val(r, "machineCode"),
        startedAt: val(r, "startedAt"),
        active: r.active === true,
        consumptionAt:
          Number(r.consumptionCount) > 0 ? r.firstConsumptionAt || true : null,
        closedAt: r.closedAt,
      };
    return {
      ...common,
      sku: val(r, "sku"),
      kind: val(r, "sourceReelType", "kind"),
      ot: val(r, "workOrderCode"),
      otActive: r.sourceWorkOrderFinished !== true,
      machine: val(r, "machineCode"),
      destination: val(r, "destinationWarehouseName", "destination"),
      declaredAt: val(r, "declaredAt"),
      weighedAt: r.notWeighed === false ? "yes" : null,
      movedAt: r.movedFromMachine === true ? "yes" : null,
    };
  });
}
const chip = (r) => {
  const lifecycle = r.incident?.status ?? r.actual?.incident?.lifecycle;
  return r.pending
    ? '<span class="chip pending">Cambio pendiente</span>'
    : lifecycle === "open"
      ? '<span class="chip open">Abierta</span>'
      : lifecycle === "resolved"
        ? '<span class="chip resolved">Resuelta</span>'
        : '<span class="chip neutral">Sin incidente</span>';
};
const eye =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z"/><circle cx="12" cy="12" r="2.5"/></svg>';
function actions(type, r) {
  if (type === "a02" && r.sourceState === "TRANSITO")
    return (
      '<span class="source-action-stack"><button class="success" data-do="a02.receive" data-key="' +
      r.key +
      '">Recibir</button><button class="danger" data-do="' +
      (data.permission === "origin" ? "a02.cancel" : "a02.reject") +
      '" data-key="' +
      r.key +
      '">' +
      (data.permission === "origin" ? "Anular" : "Rechazar") +
      "</button></span>"
    );
  if (type === "a03" && r.active)
    return (
      '<span class="source-action-stack">' +
      (!r.consumptionAt
        ? '<button class="success" data-do="a03.record_first_consumption" data-key="' +
          r.key +
          '">Registrar consumo</button>'
        : "") +
      '<button data-do="a03.close_work_order" data-key="' +
      r.key +
      '">Cerrar OT</button></span>'
    );
  if (type === "a05")
    return (
      '<span class="source-action-stack">' +
      (r.otActive
        ? '<button data-do="a05.close_source_work_order" data-key="' +
          r.key +
          '">Cerrar OT</button>'
        : "") +
      (!r.weighedAt
        ? '<button class="success" data-do="a05.register_weighing" data-key="' +
          r.key +
          '">Registrar pesaje</button>'
        : "") +
      (!r.movedAt
        ? '<button class="success" data-do="a05.handoff_to_a02" data-key="' +
          r.key +
          '">Registrar salida</button>'
        : "") +
      "</span>"
    );
  return "";
}
function table(type, list, cols, empty) {
  if (!list.length) return '<div class="empty">' + empty + "</div>";
  return (
    '<div class="scroll records-' + type + '"><table><thead><tr><th class="leading-cell"><span class="sr-only">Inspección y estado</span></th>' +
    cols.map((c) => '<th class="' + (c[2] || "") + '">' + c[0] + "</th>").join("") +
    "<th>Acciones</th></tr></thead><tbody>" +
    list
      .map(
        (r) =>
          '<tr class="' +
          (data.selected?.key === r.key ? "selected" : "") +
          '" data-record-key="' + r.key + '" role="button" tabindex="0" aria-selected="' +
          (data.selected?.key === r.key) +
          '" aria-label="Seleccionar transacción ' + r.key + '"><td class="leading-cell" data-label="Estado"><div class="row-leading"><button class="icon-button" data-inspect="' +
          r.key +
          '">' +
          eye +
          "</button>" +
          (r.pending
            ? '<span class="row-symbol pending">↻</span>'
            : '<span class="row-symbol-placeholder"></span>') +
          '<span class="row-symbol ' +
          (r.incident?.status === "open" ? "alert" : "ok") +
          '">' +
          (r.incident?.status === "open" ? "!" : "✓") +
          "</span></div></td>" +
          cols
            .map((c) => '<td class="' + (c[2] || "") + '" data-label="' + c[0] + '">' + c[1](r) + "</td>")
            .join("") +
          '<td data-label="Acciones"><div class="actions">' +
          actions(type, r) +
          "</div></td></tr>",
      )
      .join("") +
    "</tbody></table></div>"
  );
}
function publishSelection() {
  const selection = data.historyMode ? data.historySelected : data.selected;
  const frame = document.querySelector('.setup-reserved iframe');
  frame?.contentWindow?.postMessage({
    type: "monitor-scenario-selection",
    ruleCode: selection ? code() : null,
    sourceKey: selection?.sourceKey ?? selection?.key ?? null,
    experimentId: selection?.experimentId ?? undefined,
  }, window.location.origin);
}
window.addEventListener("message", (event) => {
  const frame = document.querySelector(".setup-reserved iframe"),
    container = document.querySelector(".setup-reserved");
  if (event.origin !== window.location.origin || event.source !== frame?.contentWindow || !container) return;
  if (event.data?.type === "monitor-scenario-preview-ready") {
    publishSelection();
    return;
  }
  if (event.data?.type !== "monitor-scenario-preview-height") return;
  const height = Number(event.data.height);
  if (Number.isFinite(height) && height >= 56 && height <= 640) container.style.height = `${Math.ceil(height)}px`;
});
function focusSelectedRecord() {
  if (!data.selected) return;
  const row = document.querySelector(`[data-record-key="${data.selected.key}"]`);
  if (!row) return;
  row.scrollIntoView({ block: "center" });
  row.querySelector("[data-inspect]")?.focus({ preventScroll: true });
}
function renderHeader() {
  const e = experiment(),
    polls = data.items
      .map((i) => i.pollerState.latestPoll)
      .filter(Boolean)
      .sort((a, b) => String(b.finishedAt).localeCompare(String(a.finishedAt)));
  $("#experimentId").textContent = e?.id || "Sin crear";
  $("#currentTime").textContent = fmt(e?.businessTime);
  $("#runState").textContent =
    e?.status === "running" ? "En ejecución" : "Pausado";
  $("#runState").className =
    "chip " + (e?.status === "running" ? "pending" : "neutral") + " run-state";
  $("#runButton").textContent = e?.status === "running" ? "Pausar" : "Iniciar";
  $("#nextPoll").textContent = e
    ? fmt(Object.values(e.nextDue).sort()[0])
    : "Se programa al iniciar";
  $("#lastPoll").textContent = polls[0]
    ? fmt(polls[0].finishedAt) +
      " · " +
      (polls[0].status === "healthy" ? "completo" : "fallido")
    : "Aún no ejecutado";
  $("#sourcePending").classList.toggle(
    "hidden",
    !e || !data.items.some((i) => i.expectedResult?.awaitingPoll),
  );
  if (e) {
    const speed = $("#speed");
    if (document.activeElement !== speed)
      speed.value = e.secondsPerSimulatedMinute;
  }
  $$("[data-jump]").forEach((b) => (b.disabled = e?.status !== "running"));
}
function renderAlert(type) {
  const hasExperiment = Boolean(experiment()),
    list = rows(type).filter((r) =>
      type === "a02"
        ? r.pending || r.sourceState === "TRANSITO"
        : type === "a03"
          ? r.pending || (r.active && !r.consumptionAt)
          : r.pending || !r.weighedAt || !r.movedAt,
    ),
    pagination = (hasExperiment ? status(type.toUpperCase())?.pagination : null) ?? {
      page: 1,
      pageSize: data.pageSize,
      totalRecords: list.length,
      totalPages: 1,
    },
    labels = {
      a02: [
        "A02 · Movimientos de material",
        "Despachar material",
        "Movimientos actualmente en tránsito",
        "No hay movimientos despachados en este experimento.",
      ],
      a03: [
        "A03 · OTs sin primer consumo",
        "Iniciar OT",
        "OTs que esperan primer consumo",
        "No hay OTs iniciadas en este experimento.",
      ],
      a05: [
        "A05 · Bobinas sin pesar o mover",
        "Declarar bobina",
        "Bobinas con acciones pendientes",
        "No hay bobinas declaradas en este experimento.",
      ],
    }[type],
    historyLabels = {
      a02: ["Historial completo de movimientos", "No hay movimientos despachados en este experimento.", "Ver movimientos"],
      a03: ["Historial completo de OTs", "No hay OTs iniciadas en este experimento.", "Ver OTs"],
      a05: ["Historial completo de bobinas", "No hay bobinas declaradas en este experimento.", "Ver bobinas"],
    }[type],
    cols =
      type === "a02"
        ? [
            ["OT", (r) => r.ot],
            ["SKU", (r) => r.sku],
            ["Código", (r) => r.unique ? shortUniqueCode(r.unique) : "No aplica", "compact-code"],
            ["Material", (r) => r.description],
            ["Cantidad", (r) => r.quantity + " " + r.unit],
            ["Origen", (r) => shortSourceArea(r.origin), "compact-origin"],
            ["Destino previsto", (r) => shortMachineDestination(r.destination), "compact-destination"],
            ["Despacho", (r) => compactCell(fmt(r.dispatchedAt), fmtCompact(r.dispatchedAt)), "compact-date"],
            [
              "Tiempo",
              (r) =>
                `${Math.max(0, Math.floor((new Date(experiment()?.businessTime) - new Date(r.dispatchedAt)) / 60000))} min`,
            ],
            ["EmusaSoft", (r) => r.sourceState],
          ]
        : type === "a03"
          ? [
              ["OT", (r) => r.id],
              ["Operación", (r) => r.operation],
              ["Máquina", (r) => r.machine],
              ["Inicio", (r) => fmt(r.startedAt)],
              ["Tiempo", (r) => elapsedMinutesSince(r.startedAt)],
              ["Consumos", (r) => (r.consumptionAt ? "1" : "0")],
              ["EmusaSoft", (r) => (r.active ? "ACTIVA" : "CERRADA")],
            ]
          : [
              ["Código único", (r) => r.id],
              ["SKU", (r) => r.sku],
              ["Tipo", (r) => r.kind],
              ["OT", (r) => r.ot],
              ["Máquina", (r) => r.machine],
              ["Destino", (r) => r.destination],
              ["Declaración", (r) => fmt(r.declaredAt)],
              ["Tiempo", (r) => elapsedMinutesSince(r.declaredAt)],
              ["Pesada", (r) => (r.weighedAt ? "Sí" : "No")],
              ["Salida", (r) => (r.movedAt ? "Sí" : "No")],
            ];
  const tableBlock = data.historyMode
    ? '<div class="table-block"><div class="table-title"><h3>' +
      historyLabels[0] +
      '</h3><span class="count">' +
      (data.historyByType[type]?.length ?? 0) +
      "</span></div>" +
      historyTable(type, data.historyByType[type] ?? [], historyLabels[1]) +
      "</div>"
    : '<div class="table-block"><div class="table-title"><h3>' +
      labels[2] +
      '</h3><span class="count">' +
      pagination.totalRecords +
      "</span></div>" +
      table(type, list, cols, labels[3]) +
      '<div class="pagination"><span>Página ' +
      pagination.page +
      " de " +
      pagination.totalPages +
      " · " +
      pagination.totalRecords +
      ' registros</span><button data-page="' +
      (pagination.page - 1) +
      '" ' +
      (pagination.page <= 1 ? "disabled" : "") +
      '>Anterior</button><button data-page="' +
      (pagination.page + 1) +
      '" ' +
      (pagination.page >= pagination.totalPages ? "disabled" : "") +
      ">Siguiente</button></div></div>";
  $("#tabContent").innerHTML =
    '<div class="section-head"><div><h2>' +
    labels[0] +
    '</h2><p>Crea varios registros en momentos diferentes y deja que Monitor los evalúe independientemente.</p></div><div class="section-actions"><button id="historyButton" aria-pressed="' +
    data.historyMode +
    '">' +
    (data.historyMode ? historyLabels[2] : "Ver historial") +
    '</button><div class="split-action"><button class="primary" id="createButton" ' +
    (hasExperiment ? "" : "disabled") +
    ">" +
    labels[1] +
    '</button><button class="primary split-more" id="createOptions" ' +
    (hasExperiment ? "" : "disabled") +
    '>▼</button></div></div></div>' +
    (type === "a02" && !data.historyMode
      ? '<div class="scenario-control"><label><span>Zona de influencia del usuario</span><select id="a02Permission"><option value="origin">Solo origen</option><option value="destination">Solo destino</option><option value="both">Origen y destino</option></select></label><p>El laboratorio permite recibir el material o simular que el emisor anuló el envío.</p></div>'
      : "") +
    tableBlock;
  bind();
}
async function sourceAction(action, key) {
  const authorityApplies = action === "a02.cancel" || action === "a02.reject";
  const priorA02Keys = action === "a02.prepare_dispatch"
    ? new Set((status("A02")?.records ?? []).map((record) => record.key))
    : null;
  const execution = await api("/api/dev/source-actions", {
    method: "POST",
    body: JSON.stringify({
      actionId: action,
      ...(key === undefined ? {} : { key }),
      ...(authorityApplies ? { authority: data.permission } : {}),
    }),
  });
  if (action === "a02.prepare_dispatch") data.page = Number.MAX_SAFE_INTEGER;
  notify("Cambio guardado en el origen");
  await refresh(true);
  if (action === "a02.prepare_dispatch") {
    const naturalKey = Number(execution.naturalKey?.value);
    const changedKey = execution.sourceDiff?.changes
      ?.filter((change) => change.table === "flujo_materiales_detalles")
      .map((change) => Number(change.key))
      .find((candidate) => Number.isSafeInteger(candidate) && candidate !== naturalKey);
    const created = status("A02")?.records.find((record) =>
      !priorA02Keys?.has(record.key) || record.key === changedKey,
    );
    if (created) {
      data.selected = created;
      render();
      publishSelection();
      requestAnimationFrame(focusSelectedRecord);
    }
  }
  return execution;
}
function bind() {
  $$('[data-page]').forEach((button) => {
    button.onclick = async () => {
      data.page = Number(button.dataset.page);
      data.selected = null;
      await refresh(true);
    };
  });
  $("#tabContent").onclick = async (event) => {
    const button = event.target.closest("[data-do]");
    if (!button) return;
    button.disabled = true;
    try {
      await sourceAction(button.dataset.do, Number(button.dataset.key));
    } catch (error) {
      notify("No se pudo guardar: " + error.message);
    } finally {
      if (document.contains(button)) button.disabled = false;
    }
  };
  $$("[data-inspect]").forEach(
    (b) =>
      (b.onclick = () => {
        const key = Number(b.dataset.inspect);
        data.selected =
          data.selected?.key === key
            ? null
            : status(code()).records.find((r) => r.key === key);
        render();
        publishSelection();
      }),
  );
  $$('[data-record-key]').forEach((row) => {
    const selectRow = () => {
      const key = Number(row.dataset.recordKey);
      data.selected =
        data.selected?.key === key
          ? null
          : status(code()).records.find((record) => record.key === key);
      render();
      publishSelection();
    };
    row.onclick = (event) => {
      if (event.target.closest("button, input, select, textarea, a")) return;
      selectRow();
    };
    row.onkeydown = (event) => {
      if (event.target !== row || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      selectRow();
    };
  });
  if ($("#a02Permission")) {
    $("#a02Permission").value = data.permission;
    $("#a02Permission").onchange = (e) => {
      data.permission = e.target.value;
      render();
    };
  }
  const createButton = $("#createButton"),
    createOptions = $("#createOptions");
  createButton.onclick = async () => {
    createButton.disabled = true;
    createOptions.disabled = true;
    try {
      data.historyMode = false;
      data.historySelected = null;
      await createSource(data.tab);
    } catch (error) {
      notify("No se pudo crear: " + error.message);
    } finally {
      if (document.contains(createButton)) {
        createButton.disabled = false;
        createOptions.disabled = false;
      }
    }
  };
  createOptions.setAttribute(
    "aria-label",
    data.tab === "a02"
      ? "Editar datos antes de despachar"
      : data.tab === "a03"
        ? "Editar datos antes de iniciar la OT"
        : "Editar datos antes de declarar la bobina",
  );
  createOptions.onclick = () => openConnectedEditor(data.tab);
  $("#historyButton").onclick = async () => {
    try {
      await toggleHistory(data.tab);
    } catch (error) {
      notify("No se pudo cargar el historial: " + error.message);
    }
  };
  if (data.historyMode) bindHistoryRows(data.tab);
}
function renderDetail() {
  const box = $("#detailPanel"),
    r = data.selected,
    pending = r?.pending ?? r?.pendingPoll ?? false;
  if (!r) {
    box.classList.add("hidden");
    return;
  }
  box.classList.remove("hidden");
  box.innerHTML =
    '<div class="detail-col"><h3>Fuente actual</h3><div class="fact"><span>Registro</span><strong>' +
    r.key +
    '</strong></div><div class="fact"><span>Cambio pendiente</span><strong>' +
    (pending ? "Sí" : "No") +
    '</strong></div></div><div class="detail-col"><h3>Resultado esperado</h3><p>' +
    (r.expected.triggered
      ? "Abrir o conservar una sola alerta."
      : "Sin alerta: no hay motivo activo.") +
    '</p><div class="fact"><span>Comparación</span><strong>' +
    (pending ? "Pendiente de sondeo" : r.comparison.matches ? "Coincide" : "No coincide") +
    '</strong></div></div><div class="detail-col"><h3>Monitor real</h3><div class="fact"><span>Incidente</span><strong>' +
    (r.actual.incident?.id || "Ninguno") +
    '</strong></div><div class="fact"><span>Estado</span><strong>' +
    chip(r) +
    '</strong></div><div class="fact"><span>Evidencias</span><strong>' +
    r.actual.evidenceCount +
    '</strong></div><div class="fact"><span>Entregas</span><strong>' +
    r.actual.deliveryCount +
    "</strong></div>" +
    (r.actual.incident?.lifecycle === "open"
      ? '<button id="closeIncident" class="danger">Cerrar sin resolución</button>'
      : "") +
    "</div>";
  if ($("#closeIncident"))
    $("#closeIncident").onclick = () => {
      closureTarget = r;
      $("#closureDialog").showModal();
    };
}
function render() {
  renderHeader();
  $$(".tab").forEach((t) =>
    t.classList.toggle("active", t.dataset.tab === data.tab),
  );
  if (tabInteractionActive) return;
  if (data.tab === "integrity") renderIntegrity();
  else renderAlert(data.tab);
  renderDetail();
  publishSelection();
}
function reconcileSelectedRecord() {
  if (!data.selected) return;
  const current = status(code())?.records.find(
    (record) => record.key === data.selected.key,
  );
  data.selected = current || null;
  publishSelection();
}
const resetRunning = (reset) =>
  ["validating", "restoring_source", "validating_source", "clearing_monitor"].includes(
    reset?.stage,
  );
const resetLabels = {
  validating: "Validando el destino local protegido…",
  restoring_source: "Restableciendo y validando test_database…",
  validating_source: "Confirmando la restauración de test_database…",
  clearing_monitor: "Eliminando experimentos, sondeos, incidentes y conversaciones locales de Monitor…",
  succeeded: "Restauración completa. Recargando el laboratorio…",
  failed: "La restauración falló. test_database no se considera listo.",
};
function renderReset(reset) {
  data.reset = reset;
  const dialog = $("#resetDatabaseDialog"),
    running = resetRunning(reset),
    progress = $("#resetProgress");
  if (running || (data.resetObserved && reset?.stage !== "idle")) {
    if (!dialog.open) dialog.showModal();
    progress.classList.remove("hidden");
    progress.textContent = resetLabels[reset.stage] || "Procesando…";
  }
  $("#cancelResetButton").disabled = running;
  $("#confirmResetButton").disabled = running;
  $("#resetDatabaseButton").disabled = running || reset?.baselineClean === true;
}
async function refresh(force = false) {
  if (refreshPromise) {
    await refreshPromise;
    if (!force) return;
    return refresh();
  }
  const task = (async () => {
   try {
    const reset = await api("/api/dev/test-database-reset");
    renderReset(reset);
    if (resetRunning(reset)) return;
    if (data.resetObserved && reset.stage === "succeeded") {
      window.location.reload();
      return;
    }
    const [s, r, sourceWindow] = await Promise.all([
      api(
        `/api/dev/scenarios?page=${data.page}&pageSize=${data.pageSize}&activeOnly=true`,
      ),
      api("/api/dev/scenario-runtime"),
      data.sourceWindow ? Promise.resolve(data.sourceWindow) : api("/api/dev/scenario-source-window"),
    ]);
    data.items = s.scenarios;
    data.runtime = r;
    data.sourceWindow = sourceWindow;
    if (!data.sourceWindowInitialized) {
      const earliest = limaDateTimeValue(sourceWindow.earliestExperimentStartAt),
        startTime = $("#startTime");
      startTime.min = earliest;
      startTime.value = earliest;
      $("#sourceLookbackDays").value = r.experiment
        ? Math.round((Date.parse(r.experiment.sourceCutoffAt) - Date.parse(r.experiment.initialBusinessTime)) / 86_400_000)
        : sourceWindow.defaultSourceLookbackDays;
      data.sourceWindowInitialized = true;
    }
    reconcileSelectedRecord();
    if ($("#pollFailure")?.dataset.connectionError === "true") {
      $("#pollFailure").classList.add("hidden");
      $("#pollFailure").dataset.connectionError = "false";
    }
    render();
   } catch (e) {
    const notice = $("#pollFailure");
    notice.dataset.connectionError = "true";
    notice.className = "notice";
    notice.textContent =
      "El laboratorio conectado no está disponible temporalmente. Se reanudará cuando test_database vuelva a estar listo.";
   }
  })();
  refreshPromise = task;
  try {
    await task;
  } finally {
    if (refreshPromise === task) refreshPromise = null;
  }
}
async function createSource(type) {
  const action =
    type === "a02"
      ? "a02.prepare_dispatch"
      : type === "a03"
        ? "a03.start_work_order"
        : "a05.declare_produced_reel";
  await sourceAction(action);
}
function openConnectedEditor(type) {
  const record = rows(type)[0];
  if (!record && type !== "a05") return notify("No existe una plantilla fuente conectada");
  const fields =
    type === "a02"
      ? [
          ["sku", "SKU", record.source.sku],
          [
            "uniqueCode",
            "Código único (opcional)",
            record.source.uniqueItemCode || "",
          ],
          ["materialName", "Material", record.source.materialName],
          ["quantity", "Cantidad", record.source.quantity],
          ["unitId", "Unidad", record.source.unit],
          ["originWarehouseId", "Origen", record.source.origin],
          [
            "destinationWarehouseId",
            "Destino previsto",
            record.source.destination,
          ],
          ["workOrderId", "OT", record.source.workOrderId],
        ]
      : type === "a03"
        ? [
            ["workOrderCode", "OT", record.source.workOrderCode],
            ["operationId", "Operación", record.source.operationId],
            ["machineId", "Máquina", record.source.machineId],
          ]
        : [
            [
              "serialCode",
              "Código único",
              "",
            ],
            ["sku", "SKU", ""],
            ["sourceWorkOrderId", "OT", ""],
          ];
  $("#dialogTitle").textContent =
    type === "a02"
      ? "Editar datos del despacho"
      : type === "a03"
        ? "Iniciar OT"
        : "Declarar bobina";
  $("#dialogFields").innerHTML =
    `<input type="hidden" name="sourceKey" value="${type === "a05" ? "" : record.key}"><input type="hidden" name="sourceType" value="${type}">${fields.map(([name, label, value]) => `<label><span>${label}</span><input name="${name}" value="${value === "—" ? "" : value}"></label>`).join("")}` +
    (type === "a05"
      ? '<label><span>Tipo</span><select name="kind"><option value="produced">Producida</option><option value="remnant">Remanente</option></select></label>'
      : "");
  $("#recordDialog").showModal();
}
$("#recordForm").onsubmit = async (event) => {
  event.preventDefault();
  const form = Object.fromEntries(new FormData(event.currentTarget));
  const type = form.sourceType,
    key = form.sourceKey === "" ? undefined : Number(form.sourceKey);
  delete form.sourceType;
  delete form.sourceKey;
  const numeric = new Set([
    "sku",
    "quantity",
    "unitId",
    "originWarehouseId",
    "destinationWarehouseId",
    "workOrderId",
    "operationId",
    "machineId",
    "sourceWorkOrderId",
  ]);
  const input = Object.fromEntries(
    Object.entries(form)
      .filter(([field, value]) => field !== "kind" && value !== "")
      .map(([field, value]) => [
        field,
        numeric.has(field) && Number.isFinite(Number(value))
          ? Number(value)
          : value,
      ]),
  );
  const actionId =
    type === "a02"
      ? "a02.prepare_dispatch"
      : type === "a03"
        ? "a03.start_work_order"
        : form.kind === "remnant"
          ? "a05.declare_remnant_reel"
          : "a05.declare_produced_reel";
  await api("/api/dev/source-actions", {
    method: "POST",
    body: JSON.stringify({
      actionId,
      ...(key === undefined ? {} : { key }),
      input,
    }),
  });
  $("#recordDialog").close();
  notify("Registro creado en el origen");
  await refresh(true);
};
const historyHtml = (value) =>
  String(value ?? "—")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const historyValue = (item, ...keys) => {
  for (const source of [item.currentSource, item.input, item.evidence]) {
    if (!source) continue;
    for (const key of keys)
      if (source[key] != null && source[key] !== "") return source[key];
  }
  return null;
};
const historyStack = (primary, ...secondary) =>
  '<div class="history-stack"><span class="history-primary">' +
  historyHtml(primary) +
  "</span>" +
  secondary
    .filter((value) => value != null && value !== "")
    .map(
      (value) =>
        '<span class="history-secondary">' + historyHtml(value) + "</span>",
    )
    .join("") +
  "</div>";
const historyTimes = (...pairs) =>
  '<div class="history-time">' +
  pairs
    .map(
      ([label, value]) =>
        "<span>" +
        historyHtml(label) +
        "</span><strong>" +
        historyHtml(value) +
        "</strong>",
    )
    .join("") +
  "</div>";
const historyActionAt = (item, ...actions) =>
  [...(item.timeline || [])]
    .reverse()
    .find((event) => actions.includes(event.actionId))?.at || null;
const historyIncident = (item) => {
  const count = Number(item.incidentCount || 0);
  if (!count) return historyStack("Sin alerta");
  const label = count + " alerta" + (count === 1 ? "" : "s");
  return historyStack(
    label,
    item.incidentOutcome === "open"
      ? "Abierta"
      : item.incidentOutcome === "resolved"
        ? "Resuelta"
        : "Cerrada sin resolución",
  );
};
const historyLeading = (item) => {
  let kind = "ok",
    mark = "✓",
    label = "Operación completada a tiempo sin alerta";
  if (item.incidentOutcome === "open") {
    kind = "alert";
    mark = "!";
    label = "Alerta abierta";
  } else if (item.incidentOutcome === "closed_without_resolution") {
    kind = "closed";
    mark = "—";
    label = "Cerrada sin resolución";
  } else if (item.incidentOutcome === "resolved") {
    kind = "closed";
    mark = "!";
    label = "Problema detectado y resuelto";
  } else if (item.timingOutcome === "active") {
    kind = "pending";
    mark = "…";
    label = "Operación todavía pendiente";
  } else if (item.timingOutcome === "late") {
    kind = "closed";
    mark = "!";
    label = "Operación completada tarde sin alerta";
  }
  return (
    '<div class="row-leading history-leading"><button class="icon-button" data-history-inspect="' +
    historyHtml(item.id) +
    '" aria-label="Ver incidente" title="Ver incidente">' +
    eye +
    '</button><span class="row-symbol ' +
    kind +
    '" role="img" aria-label="' +
    historyHtml(label) +
    '" title="' +
    historyHtml(label) +
    '">' +
    mark +
    "</span></div>"
  );
};
function historyCells(type, item) {
  if (type === "a02") {
    const terminalAt = historyActionAt(
      item,
      "a02.receive",
      "a02.cancel",
      "a02.reject",
    );
    const terminalLabel = item.actionIds.includes("a02.cancel")
      ? "Anulación"
      : item.actionIds.includes("a02.reject")
        ? "Rechazo"
        : "Recepción";
    const quantity = historyValue(item, "quantity", "cantidad_entransito_uso");
    const unit = historyValue(item, "unitSymbol", "unitId", "id_unidad_uso");
    const sku = historyValue(item, "sku", "id_articulo");
    const unique = historyValue(
      item,
      "uniqueItemCode",
      "uniqueCode",
      "codigo_serial",
      "id_articulo_serial",
    );
    return [
      [
        "Registro",
        historyStack(
          item.sourceKey,
          historyValue(item, "materialName", "nombre_articulo"),
          [
            quantity != null ? quantity + (unit != null ? " " + unit : "") : null,
            sku != null ? "SKU " + sku : null,
            unique,
          ]
            .filter(Boolean)
            .join(" · "),
        ),
        "history-record",
      ],
      [
        "Ruta",
        historyStack(
          historyValue(item, "originWarehouseName", "originWarehouseId", "id_almacen_origen"),
          "→ " +
            (historyValue(item, "destinationWarehouseName", "destinationWarehouseId", "id_almacen_destino") ?? "—"),
        ),
        "history-context",
      ],
      [
        "Fechas",
        historyTimes(
          ["Despacho", fmt(item.firstAt)],
          [terminalAt ? terminalLabel : "Cierre", terminalAt ? fmt(terminalAt) : "Pendiente"],
        ),
        "history-timeline",
      ],
      ["Duración", item.durationMinutes == null ? "—" : item.durationMinutes + " min", "history-duration"],
      ["A02", historyIncident(item), "history-alert"],
    ];
  }
  if (type === "a03") {
    const consumptionAt = historyActionAt(item, "a03.record_first_consumption");
    const closureAt = historyActionAt(item, "a03.close_work_order", "a03.cancel_work_order");
    return [
      [
        "Registro",
        historyStack(
          historyValue(item, "workOrderCode", "codigo_orden_trabajo") ?? item.sourceKey,
          historyValue(item, "operationName", "operationId", "id_operacion"),
        ),
        "history-record",
      ],
      [
        "Contexto",
        historyStack(historyValue(item, "machineCode", "machineId", "id_equipo")),
        "history-context",
      ],
      [
        "Fechas",
        historyTimes(
          ["Inicio", fmt(item.firstAt)],
          [consumptionAt ? "Consumo" : "Cierre OT", consumptionAt ? fmt(consumptionAt) : closureAt ? fmt(closureAt) : "Pendiente"],
        ),
        "history-timeline",
      ],
      ["Duración", item.durationMinutes == null ? "—" : item.durationMinutes + " min", "history-duration"],
      ["A03", historyIncident(item), "history-alert"],
    ];
  }
  const closeAt = historyActionAt(item, "a05.close_source_work_order");
  const weighingAt = historyActionAt(item, "a05.register_weighing");
  const movementAt = historyActionAt(item, "a05.register_movement", "a05.handoff_to_a02");
  const workOrder = historyValue(
    item,
    "workOrderCode",
    "sourceWorkOrderId",
    "id_orden_trabajo_origen",
    "id_ultimo_orden_trabajo_cierre",
  );
  const workOrderClosed = Boolean(
    closeAt || historyValue(item, "sourceWorkOrderFinished") === true,
  );
  const destination = historyValue(
    item,
    "destinationWarehouseName",
    "warehouseId",
    "id_almacen",
  );
  const a02Movement = historyValue(item, "a02MovementId");
  return [
    [
      "Registro",
      historyStack(
        historyValue(item, "serialCode", "codigo_serial") ?? item.sourceKey,
        [
          historyValue(item, "sourceReelType", "tipo"),
          historyValue(item, "sku", "id_articulo") != null
            ? "SKU " + historyValue(item, "sku", "id_articulo")
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
      ),
      "history-record",
    ],
    [
      "Contexto",
      historyStack(
        workOrder ?? "OT no definida",
        [
          "OT " + (workOrderClosed ? "cerrada" : "activa"),
          historyValue(item, "machineCode", "machineId"),
          destination ?? "Destino no definido",
          a02Movement != null ? "A02 " + a02Movement : null,
        ]
          .filter(Boolean)
          .join(" · "),
      ),
      "history-context",
    ],
    [
      "Fechas",
      historyTimes(
        ["Declaración", fmt(item.firstAt)],
        ["Cierre OT", closeAt ? fmt(closeAt) : "Pendiente"],
        ["Pesaje", weighingAt ? fmt(weighingAt) : "Pendiente"],
        ["Salida", movementAt ? fmt(movementAt) : "Pendiente"],
      ),
      "history-timeline",
    ],
    [
      "Duración",
      weighingAt && movementAt && item.durationMinutes != null
        ? item.durationMinutes + " min"
        : "—",
      "history-duration",
    ],
    ["A05", historyIncident(item), "history-alert"],
  ];
}
function historyTable(type, items, empty) {
  if (!items.length) return '<div class="empty">' + empty + "</div>";
  const rows = items.map((item) => ({ item, cells: historyCells(type, item) }));
  return (
    '<div class="scroll history-table"><table><thead><tr><th class="leading-cell"><span class="sr-only">Inspección y estado</span></th>' +
    rows[0].cells
      .map(([label, , className]) => '<th class="' + className + '">' + label + "</th>")
      .join("") +
    "</tr></thead><tbody>" +
    rows
      .map(
        ({ item, cells }) =>
          '<tr class="' +
          (data.historySelected?.id === item.id ? "selected" : "") +
          '" data-history-record="' +
          historyHtml(item.id) +
          '" role="button" tabindex="0" aria-label="Seleccionar registro histórico ' +
          historyHtml(item.sourceKey) +
          '"><td class="leading-cell" data-label="Estado">' +
          historyLeading(item) +
          "</td>" +
          cells
            .map(
              ([label, content, className]) =>
                '<td class="' + className + '" data-label="' + label + '">' + content + "</td>",
            )
            .join("") +
          "</tr>",
      )
      .join("") +
    "</tbody></table></div>"
  );
}
function selectHistoryRecord(type, id) {
  const item = (data.historyByType[type] ?? []).find(
    (candidate) => candidate.id === id,
  );
  data.historySelected = data.historySelected?.id === item?.id ? null : item ?? null;
  render();
  publishSelection();
}
function bindHistoryRows(type) {
  $$('[data-history-record]').forEach((row) => {
    row.onclick = () => selectHistoryRecord(type, row.dataset.historyRecord);
    row.onkeydown = (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      selectHistoryRecord(type, row.dataset.historyRecord);
    };
  });
}
async function toggleHistory(type) {
  if (data.historyMode) {
    data.historyMode = false;
    data.historySelected = null;
    render();
    publishSelection();
    return;
  }
  const response = await api(
    "/api/dev/scenario-operational-history?code=" + type.toUpperCase(),
  );
  data.historyByType[type] = response.items;
  data.historyMode = true;
  data.historySelected = null;
  data.selected = null;
  render();
  publishSelection();
}
function renderIntegrity() {
  const totals = {
    polls: data.items.filter((i) => i.pollerState.latestPoll?.complete).length,
    incidents: 0,
    open: 0,
    evidence: 0,
    deliveries: 0,
    conversations: 0,
    messages: 0,
    cards: 0,
  };
  data.items.forEach((i) => {
    totals.incidents += i.actualMonitor.incidentCount;
    totals.open += i.actualMonitor.openIncidentCount;
    totals.evidence += i.actualMonitor.evidenceCount;
    totals.deliveries += i.actualMonitor.routingDeliveryCount;
    totals.conversations += i.actualMonitor.conversationLinkCount;
    totals.messages += i.actualMonitor.alertMessageCount;
    totals.cards += i.actualMonitor.openIncidentCount;
  });
  $("#tabContent").innerHTML =
    '<div class="section-head"><div><h2>Integridad del experimento</h2><p>Comprueba preservación, duplicados y capturas sin mezclar estas pruebas con la operación principal.</p></div><button id="failButton" class="danger">Hacer fallar el próximo sondeo</button></div><div class="integrity-grid"><div class="integrity-card"><h3>Estado Monitor</h3><div class="metric-grid">' +
    [
      ["Sondeos completos", totals.polls],
      ["Incidentes históricos", totals.incidents],
      ["Abiertos", totals.open],
      ["Evidencias", totals.evidence, "evidence"],
      ["Entregas", totals.deliveries, "deliveries"],
      ["Conversaciones", totals.conversations, "conversations"],
      ["Mensajes", totals.messages],
      ["Tarjetas", totals.cards],
      ["Experimentos previos", 0],
    ]
      .map(([label, value, kind]) =>
        kind
          ? '<button class="metric metric-button" data-metric="' +
            kind +
            '"><span>' +
            label +
            "</span><strong>" +
            value +
            "</strong></button>"
          : '<div class="metric"><span>' +
            label +
            "</span><strong>" +
            value +
            "</strong></div>",
      )
      .join("") +
    '</div></div><div class="integrity-card"><h3>Capturas estructuradas</h3>' +
    (data.snapshots.length
      ? data.snapshots
          .map(
            (s) =>
              '<div class="snapshot-row"><span>' +
              s.id +
              " · " +
              fmt(s.capturedBusinessTime) +
              '</span><button data-snapshot="' +
              s.id +
              '">Ver captura</button></div>',
          )
          .join("")
      : "<p>No hay capturas todavía.</p>") +
    "</div></div>";
  $("#failButton").onclick = () =>
    api("/api/dev/test/scenarios/A02/fail-next-poll", {
      method: "POST",
      body: JSON.stringify({ fault: "timeout" }),
    }).then(() => notify("El próximo sondeo fallará"));
  $$("[data-snapshot]").forEach(
    (button) =>
      (button.onclick = () =>
        showSnapshot(
          data.snapshots.find((item) => item.id === button.dataset.snapshot),
        )),
  );
  $$("[data-metric]").forEach(
    (button) => (button.onclick = () => showMetric(button.dataset.metric)),
  );
}
function showMetric(kind) {
  const lines = data.items.flatMap((item) =>
    item.records.flatMap((record) =>
      kind === "evidence" && record.actual.evidenceCount
        ? [
            `${item.ruleCode} #${record.key} · ${record.actual.incident?.id || "sin incidente"} · ${record.actual.evidenceCount} evidencia(s)`,
          ]
        : kind === "deliveries"
          ? record.actual.deliveries.map(
              (delivery) =>
                `${item.ruleCode} #${record.key} · ${delivery.recipientName} · ${delivery.channel} · ${delivery.state}`,
            )
          : kind === "conversations"
            ? record.actual.conversationIds.map(
                (id) => `${item.ruleCode} #${record.key} · ${id}`,
              )
            : [],
    ),
  );
  $("#metricTitle").textContent =
    kind === "evidence"
      ? "Evidencias de alertas"
      : kind === "deliveries"
        ? "Entregas de alertas"
        : "Conversaciones de alertas";
  $("#metricContent").innerHTML =
    lines
      .map((line) => `<article class="evidence-item">${line}</article>`)
      .join("") || "<p>No hay registros todavía.</p>";
  $("#metricDialog").showModal();
}
function showSnapshot(snapshot) {
  if (!snapshot) return;
  $("#snapshotTitle").textContent = `Captura ${snapshot.id}`;
  $("#snapshotContent").innerHTML =
    `<div class="wide snapshot-summary"><div class="metric"><span>Experimento</span><strong>${snapshot.experimentId}</strong></div><div class="metric"><span>Hora simulada</span><strong>${fmt(snapshot.capturedBusinessTime)}</strong></div><div class="metric"><span>Estado</span><strong>${experiment()?.status || "—"}</strong></div></div>`;
  $("#snapshotDialog").showModal();
}
$$(".tab").forEach(
  (b) =>
    (b.onclick = () => {
      data.tab = b.dataset.tab;
      data.selected = null;
      data.historyMode = false;
      data.historySelected = null;
      data.page = 1;
      refresh(true);
    }),
);
$$("[data-jump]").forEach(
  (b) =>
    (b.onclick = async () => {
      const e = experiment();
      if (!e) return;
      await api("/api/dev/scenario-runtime/" + e.id + "/advance", {
        method: "POST",
        body: JSON.stringify({ minutes: Number(b.dataset.jump) }),
      });
      await refresh(true);
    }),
);
async function createExperiment() {
  const r = await api("/api/dev/scenario-runtime", {
    method: "POST",
    body: JSON.stringify({
      name: "Experimento " + new Date().toLocaleString("es-PE"),
      businessTime: businessTimeIsoValue($("#startTime").value),
      pollingFrequencyMinutes: Number($("#frequency").value),
      sourceLookbackDays: Number($("#sourceLookbackDays").value),
      runId: "v2-" + Date.now(),
      manifestVersion: "stage5.v2",
    }),
  });
  await api("/api/dev/scenario-runtime/" + r.experiment.id + "/config", {
    method: "PUT",
    body: JSON.stringify({
      secondsPerSimulatedMinute: Number($("#speed").value),
      pollingFrequencyMinutes: Number($("#frequency").value),
    }),
  });
  return r.experiment;
}
$("#runButton").onclick = async () => {
  const existing = experiment(),
    e = existing || (await createExperiment());
  await api("/api/dev/scenario-runtime/" + e.id + "/pause", {
    method: "POST",
    body: JSON.stringify({ paused: existing?.status === "running" }),
  });
  await refresh(true);
};
$("#newExperimentButton").onclick = async () => {
  await createExperiment();
  await refresh(true);
};
$("#snapshotButton").onclick = async () => {
  const e = experiment();
  if (!e) return;
  const snapshot = await api(
    "/api/dev/scenario-experiments/" + e.id + "/snapshots",
    {
      method: "POST",
      body: JSON.stringify({ label: "captura-" + Date.now() }),
    },
  );
  data.snapshots.push(snapshot);
  notify("Captura guardada");
  showSnapshot(snapshot);
};
const configure = async () => {
  const e = experiment();
  if (!e || e.status === "running") return;
  await api("/api/dev/scenario-runtime/" + e.id + "/config", {
    method: "PUT",
    body: JSON.stringify({
      secondsPerSimulatedMinute: Number($("#speed").value),
      pollingFrequencyMinutes: Number($("#frequency").value),
    }),
  });
  await refresh(true);
};
$("#speed").onchange = configure;
$("#frequency").onchange = configure;
$("#sourceLookbackDays").onblur = async (event) => {
  const e = experiment(),
    sourceLookbackDays = Number(event.currentTarget.value);
  if (!Number.isInteger(sourceLookbackDays) || sourceLookbackDays > 0 || sourceLookbackDays < -3650) {
    notify("El seguimiento debe ser un número entero entre -3650 y 0 días");
    return;
  }
  if (!e) return;
  const currentLookbackDays = Math.round((Date.parse(e.sourceCutoffAt) - Date.parse(e.initialBusinessTime)) / 86_400_000);
  if (sourceLookbackDays === currentLookbackDays) return;
  await api("/api/dev/scenario-runtime/" + e.id + "/source-window", {
    method: "PUT",
    body: JSON.stringify({ sourceLookbackDays }),
  });
  data.page = 1;
  data.selected = null;
  await refresh(true);
};
$("#resetDatabaseButton").onclick = () => {
  data.resetObserved = false;
  $("#resetProgress").classList.add("hidden");
  $("#cancelResetButton").disabled = false;
  $("#confirmResetButton").disabled = false;
  $("#resetDatabaseDialog").showModal();
};
$("#cancelResetButton").onclick = () => $("#resetDatabaseDialog").close();
$("#confirmResetButton").onclick = async () => {
  data.resetObserved = true;
  const reset = await api("/api/dev/test-database-reset", {
    method: "POST",
    body: JSON.stringify({ confirmation: "RESET TEST DATABASE" }),
  });
  renderReset(reset);
};
$$("[data-close]").forEach(
  (button) => (button.onclick = () => $("#" + button.dataset.close).close()),
);
$$("dialog").forEach((dialog) =>
  dialog.addEventListener("click", (event) => {
    if (
      event.target === dialog &&
      !(dialog.id === "resetDatabaseDialog" && resetRunning(data.reset))
    )
      dialog.close();
  }),
);
$("#resetDatabaseDialog").addEventListener("cancel", (event) => {
  if (resetRunning(data.reset)) event.preventDefault();
});
$("#closureForm").onsubmit = async (event) => {
  event.preventDefault();
  if (!closureTarget?.actual.incident) return;
  await api(
    `/api/incidents/${closureTarget.actual.incident.id}/close-without-resolution`,
    {
      method: "POST",
      body: JSON.stringify({
        reason: $("#closureReason").value,
        comment: $("#closureComment").value,
      }),
    },
  );
  $("#closureDialog").close();
  closureTarget = null;
  data.selected = null;
  event.currentTarget.reset();
  notify("Incidente cerrado y movido al historial sin modificar el origen");
  await refresh(true);
};
$("#tabContent").addEventListener("pointerdown", (event) => {
  if (event.target.closest("button, input, select")) tabInteractionActive = true;
});
document.addEventListener("pointerup", () => {
  setTimeout(() => {
    tabInteractionActive = false;
  }, 100);
});
document.addEventListener("pointercancel", () => {
  tabInteractionActive = false;
});
refresh();
setInterval(refresh, 1000);
