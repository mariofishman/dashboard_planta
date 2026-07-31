import { applyCommands, buildSpecification, composePatch, configSignature, createState, reconcileSelections, selectOption } from "./matrix-core.mjs";

const root = document.querySelector("#review-app");
let state;
let previewState = "default";
let referencePreviewState = "default";
let commandJournal = [];
let storageKey;
let showGenerated = false;

function persist() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({
      signature: configSignature(window.ELEMENT_REVIEW_CONFIG),
      selections: state.selections,
      commands: commandJournal,
      showGenerated,
    }));
  } catch {}
}

function applyStateAttributes(preview, name, definitions = {}) {
  for (const rule of definitions[name] || []) {
    preview.querySelectorAll(rule.selector).forEach((element) => {
      for (const [attribute, value] of Object.entries(rule.attributes || {})) {
        if (value === false || value === null) element.removeAttribute(attribute);
        else element.setAttribute(attribute, value === true ? "" : String(value));
      }
    });
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
}

function render() {
  const { config } = state;
  document.title = `${config.title} — element design review`;
  const patch = { ...(config.preview.fixedPatch || {}), ...composePatch(state) };
  const specs = buildSpecification(state);
  const optionalGenerated = config.columns.filter((column) => column.optional && column.provenance === "generated");
  const visibleColumns = config.columns.filter((column) => !column.optional || showGenerated);
  const referenceColumn = config.columns.find((column) => column.id === "reference" || /reference/i.test(column.provenance || ""));
  const referencePatch = referenceColumn
    ? Object.assign({}, config.preview.referenceFixedPatch || {}, ...config.rows.map((row) => row.options[referenceColumn.id]?.patch || {}))
    : null;
  const headers = visibleColumns.map((column) => `<th scope="col"><span>${escapeHtml(column.label)}</span><small>${escapeHtml(column.provenance)}</small><p>${escapeHtml(column.description || "")}</p></th>`).join("");
  const rows = config.rows.map((row) => {
    const cells = visibleColumns.map((column) => {
      const option = row.options[column.id];
      const selected = state.selections[row.id] === option.id;
      return `<td><button class="option-cell${selected ? " is-selected" : ""}" type="button" data-row="${escapeHtml(row.id)}" data-option="${escapeHtml(option.id)}" aria-pressed="${selected}" title="${escapeHtml(`${option.label}: ${option.value}`)}"><strong>${escapeHtml(option.label)}</strong><span>${escapeHtml(option.value)}</span></button></td>`;
    }).join("");
    return `<tr><th scope="row" title="${escapeHtml(row.description || row.label)}"><span>${escapeHtml(row.label)}</span><small>${escapeHtml(row.description || "")}</small></th>${cells}</tr>`;
  }).join("");
  const stateLabels = { default: "Normal", hover: "Hover", focus: "Keyboard focus", expanded: "Details open", compact: "Narrow" };
  const stateButtons = (config.preview.states || ["default"]).map((name) => `<button type="button" class="state-button${name === previewState ? " is-active" : ""}" data-preview-state="${escapeHtml(name)}">${escapeHtml(stateLabels[name] || name)}</button>`).join("");
  const referenceStateButtons = (config.preview.states || ["default"]).map((name) => `<button type="button" class="state-button${name === referencePreviewState ? " is-active" : ""}" data-reference-preview-state="${escapeHtml(name)}">${escapeHtml(stateLabels[name] || name)}</button>`).join("");
  const notices = state.notices.length ? `<ul class="notices">${state.notices.map((notice) => `<li>${escapeHtml(notice)}</li>`).join("")}</ul>` : "";
  const specRows = specs.map((item) => `<tr><th scope="row">${escapeHtml(item.decision)}</th><td>${escapeHtml(item.option)}</td><td><code>${escapeHtml(item.value)}</code></td><td>${escapeHtml(item.provenance)}</td></tr>`).join("");
  const fixedRuleRows = (config.fixedRules || []).map((item) => `<tr><th scope="row">${escapeHtml(item.label)}</th><td>Fixed rule</td><td>${escapeHtml(item.value)}</td><td>${escapeHtml(item.provenance || "resolved review rule")}</td></tr>`).join("");
  const generatedToggle = optionalGenerated.length
    ? `<button class="generated-toggle" id="toggle-generated" type="button" aria-pressed="${showGenerated}">${showGenerated ? "Hide" : "Show"} four generated alternatives</button>`
    : "";

  root.innerHTML = `
    <style>${config.preview.css || ""}</style>
    <section class="matrix-section" aria-labelledby="matrix-title"><div class="section-heading"><h1 id="matrix-title">Choose one option per row</h1><div class="matrix-actions"><p>Preview updates immediately.</p>${generatedToggle}</div></div><div class="matrix-workspace"><div class="table-scroll matrix-table"><table><thead><tr><th scope="col">Decision</th>${headers}</tr></thead><tbody>${rows}</tbody></table></div><aside class="preview-panel" aria-label="Complete previews"><section class="preview-block"><div class="preview-heading"><strong>Live hybrid</strong><span>Controlled by the matrix</span></div><div class="state-switcher" aria-label="Live hybrid interaction state">${stateButtons}</div><div class="preview-stage live-preview-stage" data-state="${escapeHtml(previewState)}">${config.preview.html}</div></section>${referencePatch ? `<section class="preview-block reference-preview-block"><div class="preview-heading"><strong>${escapeHtml(referenceColumn.label)}</strong><span>Fixed reference</span></div><div class="state-switcher" aria-label="Prototype reference interaction state">${referenceStateButtons}</div><div class="preview-stage reference-preview-stage" data-state="${escapeHtml(referencePreviewState)}">${config.preview.html}</div></section>` : ""}</aside></div></section>
    <details class="refresh-panel"><summary>Change matrix structure</summary><div class="collapsible-body"><label for="matrix-request">One structural command per line</label><p>Supported: add, missing, remove, rename … to …, split … into …, merge … as ….</p><textarea id="matrix-request" rows="3" placeholder="split Typography into Code typography, Name typography"></textarea><div class="refresh-actions"><button id="refresh-matrix" type="button">Refresh matrix</button><span id="request-status" role="status"></span></div>${notices}</div></details>
    <details class="specification"><summary><span>Final design specification</span><span class="approval-status">${escapeHtml(config.approval?.status || "awaiting-explicit-approval")}</span></summary><div class="collapsible-body"><table><thead><tr><th>Decision</th><th>Selection</th><th>Exact value</th><th>Provenance</th></tr></thead><tbody>${specRows}${fixedRuleRows}</tbody></table><p>${escapeHtml(config.approval?.note || "Approval must be given explicitly in the Codex task before production code changes.")}</p></div></details>`;

  const preview = root.querySelector(".live-preview-stage");
  Object.entries(patch).forEach(([key, value]) => preview.style.setProperty(key, value));
  applyStateAttributes(preview, previewState, config.preview.stateAttributes);
  const referencePreview = root.querySelector(".reference-preview-stage");
  if (referencePreview && referencePatch) {
    Object.entries(referencePatch).forEach(([key, value]) => referencePreview.style.setProperty(key, value));
    applyStateAttributes(referencePreview, referencePreviewState, config.preview.stateAttributes);
  }
  root.querySelector("#toggle-generated")?.addEventListener("click", () => {
    showGenerated = !showGenerated;
    persist();
    render();
  });
  root.querySelectorAll("[data-row]").forEach((button) => button.addEventListener("click", () => {
    state = selectOption(state, button.dataset.row, button.dataset.option);
    persist();
    render();
  }));
  root.querySelectorAll("[data-preview-state]").forEach((button) => button.addEventListener("click", () => {
    previewState = button.dataset.previewState;
    render();
  }));
  root.querySelectorAll("[data-reference-preview-state]").forEach((button) => button.addEventListener("click", () => {
    referencePreviewState = button.dataset.referencePreviewState;
    render();
  }));
  root.querySelector("#refresh-matrix").addEventListener("click", () => {
    const input = root.querySelector("#matrix-request").value;
    try {
      state = applyCommands(state, input);
      commandJournal.push(input);
      persist();
      render();
    } catch (error) {
      root.querySelector("#request-status").textContent = error.message;
    }
  });
}

try {
  storageKey = `element-design-review:${window.ELEMENT_REVIEW_CONFIG.id}`;
  state = createState(window.ELEMENT_REVIEW_CONFIG);
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    showGenerated = saved?.showGenerated ?? window.ELEMENT_REVIEW_CONFIG.showGeneratedByDefault ?? false;
    if (saved?.signature === configSignature(window.ELEMENT_REVIEW_CONFIG)) {
      commandJournal = Array.isArray(saved.commands) ? saved.commands : [];
      for (const commands of commandJournal) state = applyCommands(state, commands);
    }
    state = reconcileSelections(state, saved?.selections);
  } catch {
    state = createState(window.ELEMENT_REVIEW_CONFIG);
    commandJournal = [];
  }
  render();
} catch (error) {
  root.innerHTML = `<pre class="fatal-error">${escapeHtml(error.message)}</pre>`;
}
