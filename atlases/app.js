(() => {
  const root = document.querySelector("#app");
  const dialog = document.querySelector("#instance-dialog");
  const instanceForm = document.querySelector("#instance-form");
  const state = {
    index: { instances: [] },
    lobbyFilter: "active",
    lobbySearch: "",
    metadata: null,
    data: null,
    review: null,
    drawingReference: null,
    activeRegion: null,
    draft: null,
    saveTimer: null,
    savePromise: null
  };

  const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);

  const api = async (path, options = {}) => {
    const response = await fetch(path, { cache: "no-store", ...options });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Request failed with ${response.status}`);
    return payload;
  };

  const instanceIdFromUrl = () => new URLSearchParams(location.search).get("atlas");
  const formatDate = (value) => value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "Not edited yet";

  const reviewCounts = (instance) => {
    const accepted = Number(instance.acceptedCount || 0);
    const notes = Number(instance.noteCount || 0);
    return `${accepted} selected · ${notes} notes`;
  };

  function setDocumentTitle(title) {
    document.title = title ? `${title} · Atlas` : "Atlas";
  }

  async function loadIndex() {
    state.index = await api("/api/instances");
    return state.index;
  }

  function renderLobby() {
    setDocumentTitle("");
    const instances = state.index.instances || [];
    const visible = instances.filter((instance) => {
      const matchesStatus = state.lobbyFilter === "all" || instance.status === state.lobbyFilter;
      const haystack = `${instance.name} ${instance.objective} ${instance.id}`.toLowerCase();
      return matchesStatus && haystack.includes(state.lobbySearch.toLowerCase());
    });
    const activeCount = instances.filter((item) => item.status === "active").length;
    const completedCount = instances.filter((item) => item.status === "completed").length;
    const archivedCount = instances.filter((item) => item.status === "archived").length;
    root.innerHTML = `
      <header class="lobby-topbar">
        <div class="brand-lockup"><span class="brand-mark" aria-hidden="true">A</span><strong>Atlas</strong></div>
        <button class="button primary" type="button" data-new-instance>New Atlas</button>
      </header>
      <main class="lobby-shell">
        <header class="lobby-heading">
          <div><h1>Research library</h1><p>Open a study, continue annotating, or start a different research objective.</p></div>
          <dl class="library-summary">
            <div><dt>Active</dt><dd>${activeCount}</dd></div>
            <div><dt>Completed</dt><dd>${completedCount}</dd></div>
          </dl>
        </header>
        <section class="library-toolbar" aria-label="Atlas library controls">
          <label class="search-field"><span class="visually-hidden">Search Atlases</span><input type="search" data-lobby-search value="${escapeHtml(state.lobbySearch)}" placeholder="Search research"></label>
          <div class="status-tabs" role="group" aria-label="Filter by status">
            ${[["active", `Active ${activeCount}`], ["completed", `Completed ${completedCount}`], ["archived", `Archived ${archivedCount}`], ["all", `All ${instances.length}`]].map(([value, label]) => `<button type="button" data-lobby-filter="${value}" class="${state.lobbyFilter === value ? "is-active" : ""}">${label}</button>`).join("")}
          </div>
        </section>
        <section class="instance-list" aria-label="Atlas instances">
          <div class="instance-list-head" aria-hidden="true"><span>Research</span><span>Progress</span><span>Updated</span><span>Actions</span></div>
          ${visible.length ? visible.map(instanceRow).join("") : emptyLobbyMarkup(instances.length)}
        </section>
      </main>`;
  }

  function emptyLobbyMarkup(total) {
    return `<div class="library-empty">
      <h2>${total ? "No Atlases match this view" : "Create your first Atlas"}</h2>
      <p>${total ? "Change the status filter or search phrase." : "Give the research a clear objective. References, feedback, and annotations will stay together."}</p>
      ${total ? "" : '<button class="button primary" type="button" data-new-instance>New Atlas</button>'}
    </div>`;
  }

  function instanceRow(instance) {
    const nextStatus = instance.status === "active" ? "completed" : "active";
    const statusAction = instance.status === "active" ? "Close" : "Reopen";
    return `<article class="instance-row">
      <a class="instance-main" href="?atlas=${encodeURIComponent(instance.id)}" data-open-instance="${escapeHtml(instance.id)}">
        <span class="instance-name"><strong>${escapeHtml(instance.name)}</strong><small>${escapeHtml(instance.objective || "No objective recorded")}</small></span>
        <span class="instance-progress">${escapeHtml(reviewCounts(instance))}</span>
        <time datetime="${escapeHtml(instance.updatedAt || "")}">${escapeHtml(formatDate(instance.updatedAt))}</time>
      </a>
      <div class="instance-actions">
        <span class="status-badge ${escapeHtml(instance.status)}">${escapeHtml(instance.status)}</span>
        <button class="text-button" type="button" data-rename-instance="${escapeHtml(instance.id)}">Rename</button>
        ${instance.status === "archived" ? "" : `<button class="text-button" type="button" data-status-instance="${escapeHtml(instance.id)}" data-next-status="${nextStatus}">${statusAction}</button>`}
        ${instance.status === "archived" ? `<button class="text-button" type="button" data-status-instance="${escapeHtml(instance.id)}" data-next-status="active">Restore</button>` : `<button class="text-button quiet" type="button" data-status-instance="${escapeHtml(instance.id)}" data-next-status="archived">Archive</button>`}
      </div>
    </article>`;
  }

  function openInstanceDialog(instance = null) {
    const editing = Boolean(instance);
    document.querySelector("#dialog-context").textContent = editing ? "Instance settings" : "New research";
    document.querySelector("#dialog-title").textContent = editing ? "Rename Atlas" : "Create an Atlas";
    document.querySelector("#instance-form-mode").value = editing ? "edit" : "create";
    document.querySelector("#instance-form-id").value = instance?.id || "";
    document.querySelector("#instance-name").value = instance?.name || "";
    document.querySelector("#instance-objective").value = instance?.objective || "";
    document.querySelector("#instance-submit").textContent = editing ? "Save changes" : "Create Atlas";
    const error = document.querySelector("#instance-form-error");
    error.hidden = true;
    error.textContent = "";
    dialog.showModal();
    document.querySelector("#instance-name").focus();
  }

  function closeInstanceDialog() {
    dialog.close();
  }

  async function saveInstanceForm() {
    const mode = document.querySelector("#instance-form-mode").value;
    const id = document.querySelector("#instance-form-id").value;
    const payload = {
      name: document.querySelector("#instance-name").value,
      objective: document.querySelector("#instance-objective").value
    };
    const error = document.querySelector("#instance-form-error");
    try {
      const instance = mode === "edit"
        ? await api(`/api/instances/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await api("/api/instances", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      closeInstanceDialog();
      await loadIndex();
      if (mode === "create") navigateToInstance(instance.id);
      else renderLobby();
    } catch (requestError) {
      error.textContent = requestError.message;
      error.hidden = false;
    }
  }

  function navigateToInstance(instanceId) {
    history.pushState({}, "", `?atlas=${encodeURIComponent(instanceId)}`);
    renderRoute();
  }

  async function updateInstanceStatus(instanceId, status) {
    await api(`/api/instances/${encodeURIComponent(instanceId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    await loadIndex();
    renderLobby();
  }

  const allReferences = () => (state.data?.rounds || []).flatMap((round) =>
    (round.references || []).map((reference) => ({ ...reference, roundId: round.id }))
  );
  const screensFor = (reference) => Array.isArray(reference.screens) && reference.screens.length
    ? reference.screens
    : [{ id: `${reference.id}-screen`, label: reference.title, image: reference.image, sourceUrl: reference.sourceUrl, regions: reference.regions || [] }];
  const screenIndexFor = (reference) => Math.max(0, Math.min(Number(state.review.screenIndex[reference.id] || 0), screensFor(reference).length - 1));
  const currentScreenFor = (reference) => screensFor(reference)[screenIndexFor(reference)];
  const scopeFor = (reference, screen) => `${reference.id}::${screen.id}`;
  const customRegionsFor = (scopeId) => state.review.customRegions[scopeId] || [];
  const noteKeyFor = (scopeId, regionId) => `${scopeId}::${regionId}`;
  const noteFor = (scopeId, regionId) => state.review.regionNotes[noteKeyFor(scopeId, regionId)] || null;
  const imageUrl = (image) => /^(https?:|data:|\/)/.test(image || "")
    ? image
    : `/instances/${encodeURIComponent(state.metadata.id)}/${image}`;

  function defaultReview(instanceId) {
    return { atlasId: instanceId, updatedAt: null, accepted: {}, feedback: {}, regionNotes: {}, customRegions: {}, screenIndex: {} };
  }

  function setPersistenceStatus(message, status = "") {
    const element = document.querySelector("#persistence-status");
    if (!element) return;
    element.textContent = message;
    element.dataset.status = status;
  }

  function persistReview() {
    clearTimeout(state.saveTimer);
    state.saveTimer = null;
    setPersistenceStatus("Saving…", "saving");
    state.review.updatedAt = new Date().toISOString();
    state.savePromise = api(`/api/instances/${encodeURIComponent(state.metadata.id)}/review-state`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(state.review)
    }).then(() => setPersistenceStatus("Saved", "saved")).catch((error) => {
      setPersistenceStatus("Not saved", "error");
      console.error(error);
      throw error;
    });
    return state.savePromise;
  }

  function queueSave() {
    clearTimeout(state.saveTimer);
    setPersistenceStatus("Unsaved changes", "saving");
    state.saveTimer = setTimeout(persistReview, 450);
  }

  async function flushSave() {
    if (state.saveTimer) return persistReview();
    if (state.savePromise) return state.savePromise;
  }

  async function loadInstance(instanceId) {
    const [metadata, data, review] = await Promise.all([
      api(`/api/instances/${encodeURIComponent(instanceId)}`),
      api(`/api/instances/${encodeURIComponent(instanceId)}/data`),
      api(`/api/instances/${encodeURIComponent(instanceId)}/review-state`)
    ]);
    state.metadata = metadata;
    state.data = data;
    state.review = { ...defaultReview(instanceId), ...review };
    renderViewer();
  }

  function renderViewer() {
    setDocumentTitle(state.metadata.name);
    root.innerHTML = `
      <header class="viewer-topbar">
        <div class="viewer-heading">
          <button class="back-button" type="button" data-return-lobby aria-label="Return to Atlas library">←</button>
          <div><p class="context-label">Atlas research</p><h1>${escapeHtml(state.metadata.name)}</h1><p id="persistence-status" class="persistence-status" data-status="saved" role="status">Loaded from review-state.json</p></div>
        </div>
        <nav class="viewer-tabs" aria-label="Research stages">
          <button class="viewer-tab is-active" type="button" data-tab="selection">Select references</button>
          <button class="viewer-tab" type="button" data-tab="analysis">Analyze components</button>
        </nav>
        <button class="button secondary" type="button" data-save-return>Save and return</button>
      </header>
      <main class="viewer-shell">
        <section id="selection" class="tab-panel is-active" aria-labelledby="selection-heading">
          <header class="section-heading"><div><h2 id="selection-heading">Choose useful directions</h2><p>Keep promising full-screen references and explain which parts should influence the next search.</p></div><p id="selection-count" class="count"></p></header>
          <div id="rounds" class="rounds"></div>
        </section>
        <section id="analysis" class="tab-panel" aria-labelledby="analysis-heading">
          <header class="section-heading analysis-heading"><div><h2 id="analysis-heading">Annotate useful components</h2><p>Comment on predefined regions or draw a missing region directly over the reference.</p></div>
            <div class="analysis-tools"><button id="export-review" class="text-button" type="button">Export JSON</button><label class="text-button import-button">Import JSON<input id="import-review" type="file" accept="application/json,.json"></label><label class="boundary-toggle"><input id="show-boundaries" type="checkbox"> Show boundaries</label></div>
          </header>
          <p id="boundary-status" class="inline-status" role="status" hidden></p><p id="transfer-status" class="inline-status" role="status" hidden></p>
          <div id="accepted-empty" class="viewer-empty">Select references first. Accepted references appear here automatically.</div>
          <div id="analysis-list" class="analysis-list"></div>
        </section>
      </main>`;
    renderSelection();
    renderAnalysis();
  }

  function screenControls(reference, location) {
    const screens = screensFor(reference);
    if (screens.length < 2) return "";
    const index = screenIndexFor(reference);
    const screen = screens[index];
    return `<button class="screen-arrow previous" type="button" data-screen-reference="${escapeHtml(reference.id)}" data-screen-direction="-1" aria-label="Previous screen" ${index === 0 ? "disabled" : ""}>‹</button>
      <button class="screen-arrow next" type="button" data-screen-reference="${escapeHtml(reference.id)}" data-screen-direction="1" aria-label="Next screen" ${index === screens.length - 1 ? "disabled" : ""}>›</button>
      <div class="screen-position" aria-live="polite" data-screen-location="${escapeHtml(location)}"><strong>${escapeHtml(screen.label || `Screen ${index + 1}`)}</strong><span>${index + 1} / ${screens.length}</span></div>`;
  }

  function renderSelection() {
    const rounds = document.querySelector("#rounds");
    if (!rounds) return;
    if (!(state.data.rounds || []).length) {
      rounds.innerHTML = '<div class="viewer-empty"><h3>No references yet</h3><p>Add the first search round to this instance\'s <code>atlas-data.json</code>. The lobby and review database are ready.</p></div>';
      updateCount();
      return;
    }
    rounds.innerHTML = (state.data.rounds || []).map((round) => `<section class="round" data-round="${escapeHtml(round.id)}">
      <header class="round-heading"><h3>${escapeHtml(round.label || round.id)}</h3><span>${(round.references || []).length} references</span></header>
      <div class="reference-grid">${(round.references || []).map((reference) => {
        const screen = currentScreenFor(reference);
        return `<article class="reference-card" data-reference="${escapeHtml(reference.id)}">
          <div class="reference-preview-shell"><img class="reference-preview" src="${escapeHtml(imageUrl(screen.image))}" alt="Full reference screen: ${escapeHtml(screen.label || reference.title)}">${screenControls(reference, "selection")}</div>
          <div class="reference-copy"><div class="reference-meta"><h4>${escapeHtml(reference.title)}</h4>${screen.sourceUrl ? `<a href="${escapeHtml(screen.sourceUrl)}" target="_blank" rel="noreferrer">Open source</a>` : ""}</div>
            <p class="product">${escapeHtml(reference.product || "Unidentified product")}</p><p class="rationale">${escapeHtml(reference.rationale || "")}</p>
            <label class="keep"><input type="checkbox" data-accept="${escapeHtml(reference.id)}" ${state.review.accepted[reference.id] ? "checked" : ""}> Keep for detailed review</label>
            <label class="feedback-label">What works or does not work?<textarea data-feedback="${escapeHtml(reference.id)}" placeholder="Describe the useful component or the reason to reject it.">${escapeHtml(state.review.feedback[reference.id] || "")}</textarea></label>
          </div></article>`;
      }).join("")}</div></section>`).join("");
    updateCount();
  }

  function regionButton(scopeId, region, custom = false) {
    const savedNote = custom ? region : noteFor(scopeId, region.id);
    const noteOrder = Number(savedNote?.order || 0);
    return `<button class="region${custom ? " custom-region" : ""}${savedNote?.note ? " has-note" : ""}" type="button" data-region-reference="${escapeHtml(scopeId)}" data-region-id="${escapeHtml(region.id)}" ${custom ? "data-custom-region" : ""} aria-label="${escapeHtml(region.label)}" title="${escapeHtml(region.label)}" style="left:${Number(region.x)}%;top:${Number(region.y)}%;width:${Number(region.width)}%;height:${Number(region.height)}%"><span class="region-label">${escapeHtml(region.label)}</span>${savedNote?.note ? `<b class="note-marker" aria-label="Saved annotation">${noteOrder || "•"}</b>` : ""}</button>`;
  }

  function editorMarkup(scopeId, predefinedRegions) {
    if (!state.activeRegion || state.activeRegion.referenceId !== scopeId) return "";
    const customRegion = customRegionsFor(scopeId).find((item) => item.id === state.activeRegion.regionId);
    const predefinedRegion = predefinedRegions.find((item) => item.id === state.activeRegion.regionId);
    const region = customRegion || predefinedRegion;
    if (!region) return "";
    const savedNote = customRegion || noteFor(scopeId, region.id) || {};
    if (state.activeRegion.mode === "read") return `<section class="region-summary" data-region-summary="${escapeHtml(scopeId)}"><div><span>${customRegion ? "Custom region" : "Component annotation"}</span><strong>${escapeHtml(region.label)}</strong><p>${escapeHtml(savedNote.note || "No note added.")}</p></div><div class="region-summary-actions"><button type="button" class="text-button" data-edit-region="${escapeHtml(region.id)}" data-reference-id="${escapeHtml(scopeId)}">Edit note</button>${customRegion ? `<button type="button" class="text-button danger" data-delete-region="${escapeHtml(region.id)}" data-reference-id="${escapeHtml(scopeId)}">Delete region</button>` : ""}</div></section>`;
    return `<form class="region-editor" data-region-editor="${escapeHtml(scopeId)}" data-region-id="${escapeHtml(region.id)}" data-region-kind="${customRegion ? "custom" : "predefined"}"><div class="region-editor-heading"><strong>${customRegion ? "Selected custom region" : escapeHtml(region.label)}</strong>${customRegion ? `<button type="button" class="text-button danger" data-delete-region="${escapeHtml(region.id)}" data-reference-id="${escapeHtml(scopeId)}">Delete region</button>` : ""}</div>${customRegion ? `<label>Region label<input name="region-label" value="${escapeHtml(region.label)}" placeholder="Compact filter bar"></label>` : ""}<label class="region-note-field">What do you want to say about it?<textarea name="region-note" placeholder="Describe what to reuse or avoid.">${escapeHtml(savedNote.note || "")}</textarea></label><button class="button primary compact" type="submit">Save note</button></form>`;
  }

  function renderAnalysis() {
    const list = document.querySelector("#analysis-list");
    if (!list) return;
    const accepted = allReferences().filter((reference) => state.review.accepted[reference.id]);
    const boundaryToggle = document.querySelector("#show-boundaries");
    const boundaryStatus = document.querySelector("#boundary-status");
    const regionCount = accepted.reduce((total, reference) => {
      const screen = currentScreenFor(reference);
      return total + (screen.regions || []).length + customRegionsFor(scopeFor(reference, screen)).length;
    }, 0);
    const available = accepted.length > 0 && regionCount > 0;
    boundaryToggle.disabled = !available;
    if (!available) boundaryToggle.checked = false;
    boundaryStatus.hidden = accepted.length === 0 || available;
    boundaryStatus.textContent = available ? "" : "No regions are defined for the current accepted screens.";
    document.querySelector("#accepted-empty").hidden = accepted.length > 0;
    list.classList.toggle("show-boundaries", boundaryToggle.checked);
    list.innerHTML = accepted.map((reference) => {
      const screen = currentScreenFor(reference);
      const scopeId = scopeFor(reference, screen);
      const drawing = state.drawingReference === scopeId;
      return `<article class="analysis-card" data-analysis-reference="${escapeHtml(reference.id)}"><header><div><h3>${escapeHtml(reference.title)}</h3><p>${escapeHtml(screen.label || "Current screen")} · ${escapeHtml(state.review.feedback[reference.id] || "No reference-level feedback yet")}</p></div><button class="button secondary compact${drawing ? " is-active" : ""}" type="button" data-draw-reference="${escapeHtml(scopeId)}" aria-pressed="${drawing}">${drawing ? "Cancel drawing" : "Draw region"}</button></header><p class="draw-help" ${drawing ? "" : "hidden"}>Drag over any missing component.</p><div class="atlas-image${drawing ? " is-drawing" : ""}" data-atlas-reference="${escapeHtml(scopeId)}"><img src="${escapeHtml(imageUrl(screen.image))}" alt="Annotatable full reference: ${escapeHtml(screen.label || reference.title)}" draggable="false">${(screen.regions || []).map((region) => regionButton(scopeId, region)).join("")}${customRegionsFor(scopeId).map((region) => regionButton(scopeId, region, true)).join("")}${screenControls(reference, "analysis")}</div>${editorMarkup(scopeId, screen.regions || [])}</article>`;
    }).join("");
  }

  function updateCount() {
    const element = document.querySelector("#selection-count");
    if (element) element.textContent = `${allReferences().filter((reference) => state.review.accepted[reference.id]).length} selected`;
  }

  function pointInAtlas(event, atlas) {
    const bounds = atlas.getBoundingClientRect();
    return { x: Math.max(0, Math.min(bounds.width, event.clientX - bounds.left)), y: Math.max(0, Math.min(bounds.height, event.clientY - bounds.top)), width: bounds.width, height: bounds.height };
  }

  function finishDraft(event, atlas) {
    if (!state.draft) return;
    const end = pointInAtlas(event, atlas);
    const left = Math.min(state.draft.start.x, end.x);
    const top = Math.min(state.draft.start.y, end.y);
    const width = Math.abs(end.x - state.draft.start.x);
    const height = Math.abs(end.y - state.draft.start.y);
    const scopeId = state.draft.referenceId;
    state.draft.element.remove();
    state.draft = null;
    if (width < 8 || height < 8) return;
    const region = { id: `custom-${Date.now()}`, label: "Custom region", note: "", x: Number((left / end.width * 100).toFixed(3)), y: Number((top / end.height * 100).toFixed(3)), width: Number((width / end.width * 100).toFixed(3)), height: Number((height / end.height * 100).toFixed(3)) };
    state.review.customRegions[scopeId] = [...customRegionsFor(scopeId), region];
    state.drawingReference = null;
    state.activeRegion = { referenceId: scopeId, regionId: region.id, mode: "edit" };
    queueSave();
    renderAnalysis();
    document.querySelector(`[data-region-editor="${CSS.escape(scopeId)}"] input`)?.focus();
  }

  async function renderRoute() {
    root.innerHTML = '<main class="loading-shell"><p>Opening Atlas…</p></main>';
    try {
      const instanceId = instanceIdFromUrl();
      if (instanceId) await loadInstance(instanceId);
      else { await loadIndex(); renderLobby(); }
    } catch (error) {
      root.innerHTML = `<main class="error-shell"><h1>Atlas could not open</h1><p>${escapeHtml(error.message)}</p><button class="button secondary" type="button" data-return-lobby>Return to library</button></main>`;
    }
  }

  document.addEventListener("click", async (event) => {
    if (event.target.closest("[data-new-instance]")) return openInstanceDialog();
    if (event.target.closest("[data-close-dialog]")) return closeInstanceDialog();
    const filter = event.target.closest("[data-lobby-filter]");
    if (filter) { state.lobbyFilter = filter.dataset.lobbyFilter; return renderLobby(); }
    const rename = event.target.closest("[data-rename-instance]");
    if (rename) return openInstanceDialog((state.index.instances || []).find((item) => item.id === rename.dataset.renameInstance));
    const status = event.target.closest("[data-status-instance]");
    if (status) return updateInstanceStatus(status.dataset.statusInstance, status.dataset.nextStatus);
    const open = event.target.closest("[data-open-instance]");
    if (open) { event.preventDefault(); return navigateToInstance(open.dataset.openInstance); }
    if (event.target.closest("[data-return-lobby]")) { await flushSave().catch(() => {}); history.pushState({}, "", location.pathname); return renderRoute(); }
    if (event.target.closest("[data-save-return]")) { await flushSave().catch(() => {}); history.pushState({}, "", location.pathname); return renderRoute(); }
    const tab = event.target.closest("[data-tab]");
    if (tab) { document.querySelectorAll(".viewer-tab").forEach((item) => item.classList.toggle("is-active", item === tab)); document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.toggle("is-active", panel.id === tab.dataset.tab)); if (tab.dataset.tab === "analysis") renderAnalysis(); return; }
    const screenButton = event.target.closest("[data-screen-reference]");
    if (screenButton) { const reference = allReferences().find((item) => item.id === screenButton.dataset.screenReference); if (!reference) return; state.review.screenIndex[reference.id] = Math.max(0, Math.min(screenIndexFor(reference) + Number(screenButton.dataset.screenDirection), screensFor(reference).length - 1)); state.drawingReference = null; state.activeRegion = null; queueSave(); renderSelection(); renderAnalysis(); return; }
    const drawButton = event.target.closest("[data-draw-reference]");
    if (drawButton) { const scopeId = drawButton.dataset.drawReference; state.drawingReference = state.drawingReference === scopeId ? null : scopeId; state.activeRegion = null; renderAnalysis(); return; }
    const selectedRegion = event.target.closest(".region");
    if (selectedRegion && !state.drawingReference) { const custom = selectedRegion.hasAttribute("data-custom-region"); const existing = custom ? customRegionsFor(selectedRegion.dataset.regionReference).find((item) => item.id === selectedRegion.dataset.regionId)?.note : noteFor(selectedRegion.dataset.regionReference, selectedRegion.dataset.regionId)?.note; state.activeRegion = { referenceId: selectedRegion.dataset.regionReference, regionId: selectedRegion.dataset.regionId, mode: existing ? "read" : "edit" }; renderAnalysis(); return; }
    const edit = event.target.closest("[data-edit-region]");
    if (edit) { state.activeRegion = { referenceId: edit.dataset.referenceId, regionId: edit.dataset.editRegion, mode: "edit" }; renderAnalysis(); document.querySelector(`[data-region-editor="${CSS.escape(state.activeRegion.referenceId)}"] textarea`)?.focus(); return; }
    const remove = event.target.closest("[data-delete-region]");
    if (remove) { state.review.customRegions[remove.dataset.referenceId] = customRegionsFor(remove.dataset.referenceId).filter((item) => item.id !== remove.dataset.deleteRegion); state.activeRegion = null; queueSave(); renderAnalysis(); }
  });

  document.addEventListener("input", (event) => {
    if (event.target.matches("[data-lobby-search]")) { state.lobbySearch = event.target.value; renderLobby(); document.querySelector("[data-lobby-search]")?.focus(); return; }
    if (event.target.matches("[data-feedback]")) { state.review.feedback[event.target.dataset.feedback] = event.target.value; queueSave(); }
  });

  document.addEventListener("change", (event) => {
    if (event.target.matches("[data-accept]")) { state.review.accepted[event.target.dataset.accept] = event.target.checked; queueSave(); updateCount(); renderAnalysis(); }
    if (event.target.matches("#show-boundaries")) document.querySelector("#analysis-list").classList.toggle("show-boundaries", event.target.checked);
  });

  document.addEventListener("submit", (event) => {
    const editor = event.target.closest("[data-region-editor]");
    if (!editor) return;
    event.preventDefault();
    if (editor.dataset.regionKind === "custom") { const region = customRegionsFor(editor.dataset.regionEditor).find((item) => item.id === editor.dataset.regionId); if (!region) return; region.label = editor.elements["region-label"].value.trim() || "Custom region"; region.note = editor.elements["region-note"].value.trim(); }
    else { const key = noteKeyFor(editor.dataset.regionEditor, editor.dataset.regionId); state.review.regionNotes[key] = { ...(state.review.regionNotes[key] || {}), note: editor.elements["region-note"].value.trim() }; }
    state.activeRegion = { referenceId: editor.dataset.regionEditor, regionId: editor.dataset.regionId, mode: "read" };
    queueSave(); renderAnalysis();
  });

  document.addEventListener("pointerdown", (event) => {
    const atlas = event.target.closest(".atlas-image.is-drawing");
    if (!atlas || event.target.closest(".screen-arrow")) return;
    const start = pointInAtlas(event, atlas);
    const draft = document.createElement("div"); draft.className = "draft-region"; draft.style.left = `${start.x}px`; draft.style.top = `${start.y}px`; atlas.appendChild(draft); atlas.setPointerCapture(event.pointerId); state.draft = { referenceId: atlas.dataset.atlasReference, start, element: draft, pointerId: event.pointerId }; event.preventDefault();
  });
  document.addEventListener("pointermove", (event) => { if (!state.draft || event.pointerId !== state.draft.pointerId) return; const atlas = state.draft.element.parentElement; const end = pointInAtlas(event, atlas); state.draft.element.style.left = `${Math.min(state.draft.start.x, end.x)}px`; state.draft.element.style.top = `${Math.min(state.draft.start.y, end.y)}px`; state.draft.element.style.width = `${Math.abs(end.x - state.draft.start.x)}px`; state.draft.element.style.height = `${Math.abs(end.y - state.draft.start.y)}px`; });
  document.addEventListener("pointerup", (event) => { if (state.draft && event.pointerId === state.draft.pointerId) finishDraft(event, state.draft.element.parentElement); });
  document.addEventListener("pointercancel", () => { if (state.draft) { state.draft.element.remove(); state.draft = null; } });

  instanceForm.addEventListener("submit", (event) => { event.preventDefault(); saveInstanceForm(); });
  window.addEventListener("popstate", renderRoute);

  document.addEventListener("click", (event) => {
    if (event.target.closest("#export-review")) { const blob = new Blob([`${JSON.stringify(state.review, null, 2)}\n`], { type: "application/json" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${state.metadata.id}-review.json`; link.click(); URL.revokeObjectURL(link.href); }
  });
  document.addEventListener("change", async (event) => {
    if (!event.target.matches("#import-review")) return;
    const file = event.target.files?.[0]; if (!file) return;
    try { const imported = JSON.parse(await file.text()); ["accepted", "feedback", "regionNotes", "customRegions", "screenIndex"].forEach((key) => { state.review[key] = { ...(state.review[key] || {}), ...(imported[key] || {}) }; }); await persistReview(); renderSelection(); renderAnalysis(); document.querySelector("#transfer-status").textContent = `Imported ${file.name}.`; document.querySelector("#transfer-status").hidden = false; } catch (error) { document.querySelector("#transfer-status").textContent = error.message; document.querySelector("#transfer-status").hidden = false; }
    event.target.value = "";
  });

  renderRoute();
})();
