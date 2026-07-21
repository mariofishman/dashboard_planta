(() => {
  const data = window.ATLAS_DATA || { id: "atlas", title: "UI Reference Atlas", rounds: [] };
  const storageKey = `annotatable-reference-atlas:${data.id}`;
  const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
  const state = {
    accepted: saved.accepted || {},
    feedback: saved.feedback || {},
    customRegions: saved.customRegions || {},
    screenIndex: saved.screenIndex || {},
    drawingReference: null,
    activeRegion: null,
    draft: null
  };

  const allReferences = () => data.rounds.flatMap((round) =>
    (round.references || []).map((reference) => ({ ...reference, roundId: round.id }))
  );

  const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);

  const save = () => localStorage.setItem(storageKey, JSON.stringify({
    accepted: state.accepted,
    feedback: state.feedback,
    customRegions: state.customRegions,
    screenIndex: state.screenIndex
  }));

  const screensFor = (reference) => Array.isArray(reference.screens) && reference.screens.length
    ? reference.screens
    : [{
        id: `${reference.id}-screen`,
        label: reference.title,
        image: reference.image,
        sourceUrl: reference.sourceUrl,
        regions: reference.regions || []
      }];

  const screenIndexFor = (reference) => {
    const lastIndex = screensFor(reference).length - 1;
    return Math.max(0, Math.min(Number(state.screenIndex[reference.id] || 0), lastIndex));
  };

  const currentScreenFor = (reference) => screensFor(reference)[screenIndexFor(reference)];
  const scopeFor = (reference, screen) => `${reference.id}::${screen.id}`;

  function screenControls(reference, location) {
    const screens = screensFor(reference);
    if (screens.length < 2) return "";
    const index = screenIndexFor(reference);
    const screen = screens[index];
    return `
      <button class="screen-arrow previous" type="button" data-screen-reference="${escapeHtml(reference.id)}" data-screen-direction="-1"
        aria-label="Previous ${escapeHtml(reference.product)} screen" ${index === 0 ? "disabled" : ""}>‹</button>
      <button class="screen-arrow next" type="button" data-screen-reference="${escapeHtml(reference.id)}" data-screen-direction="1"
        aria-label="Next ${escapeHtml(reference.product)} screen" ${index === screens.length - 1 ? "disabled" : ""}>›</button>
      <div class="screen-position" aria-live="polite" data-screen-location="${escapeHtml(location)}">
        <strong>${escapeHtml(screen.label || `Screen ${index + 1}`)}</strong><span>${index + 1} / ${screens.length}</span>
      </div>`;
  }

  const customRegionsFor = (referenceId) => state.customRegions[referenceId] || [];

  function renderSelection() {
    const rounds = document.querySelector("#rounds");
    rounds.innerHTML = data.rounds.map((round) => `
      <section class="round" data-round="${escapeHtml(round.id)}">
        <header class="round-heading"><h3>${escapeHtml(round.label || round.id)}</h3><span>${(round.references || []).length} references</span></header>
        <div class="reference-grid">
          ${(round.references || []).map((reference) => `
            <article class="reference-card" data-reference="${escapeHtml(reference.id)}">
              <div class="reference-preview-shell">
                <img class="reference-preview" src="${escapeHtml(currentScreenFor(reference).image)}" alt="Full reference screen: ${escapeHtml(currentScreenFor(reference).label || reference.title)}">
                ${screenControls(reference, "selection")}
              </div>
              <div class="reference-copy">
                <div class="reference-meta">
                  <h4>${escapeHtml(reference.title)}</h4>
                  ${currentScreenFor(reference).sourceUrl ? `<a href="${escapeHtml(currentScreenFor(reference).sourceUrl)}" target="_blank" rel="noreferrer">Open current screen in Mobbin</a>` : ""}
                </div>
                <p class="product">${escapeHtml(reference.product || "Unidentified product")}</p>
                <p class="rationale">${escapeHtml(reference.rationale || "")}</p>
                <label class="keep"><input type="checkbox" data-accept="${escapeHtml(reference.id)}" ${state.accepted[reference.id] ? "checked" : ""}> Keep for detailed review</label>
                <label class="feedback-label">What works or does not work?
                  <textarea data-feedback="${escapeHtml(reference.id)}" placeholder="Describe the specific components, behaviors, density, or visual choices.">${escapeHtml(state.feedback[reference.id] || "")}</textarea>
                </label>
              </div>
            </article>`).join("")}
        </div>
      </section>`).join("");
    updateCount();
  }

  function regionButton(referenceId, region, custom = false) {
    return `
      <button class="region${custom ? " custom-region" : ""}" type="button"
        data-region-reference="${escapeHtml(referenceId)}" data-region-id="${escapeHtml(region.id)}"
        ${custom ? "data-custom-region" : ""} aria-label="${escapeHtml(region.label)}" title="${escapeHtml(region.label)}"
        style="left:${Number(region.x)}%;top:${Number(region.y)}%;width:${Number(region.width)}%;height:${Number(region.height)}%">
        <span>${escapeHtml(region.label)}</span>
      </button>`;
  }

  function editorMarkup(referenceId) {
    if (!state.activeRegion || state.activeRegion.referenceId !== referenceId) return "";
    const region = customRegionsFor(referenceId).find((item) => item.id === state.activeRegion.regionId);
    if (!region) return "";
    return `
      <form class="region-editor" data-region-editor="${escapeHtml(referenceId)}" data-region-id="${escapeHtml(region.id)}">
        <div class="region-editor-heading">
          <strong>Selected custom region</strong>
          <button type="button" class="text-button danger" data-delete-region="${escapeHtml(region.id)}" data-reference-id="${escapeHtml(referenceId)}">Delete region</button>
        </div>
        <label>Region label<input name="region-label" value="${escapeHtml(region.label)}" placeholder="For example: Compact filter bar"></label>
        <label>What do you want to say about it?<textarea name="region-note" placeholder="Describe what works, what does not, or what should be reused.">${escapeHtml(region.note || "")}</textarea></label>
        <button class="save-region" type="submit">Save note</button>
      </form>`;
  }

  function renderAnalysis() {
    const accepted = allReferences().filter((reference) => state.accepted[reference.id]);
    const showBoundaries = document.querySelector("#show-boundaries").checked;
    document.querySelector("#accepted-empty").hidden = accepted.length > 0;
    const list = document.querySelector("#analysis-list");
    list.classList.toggle("show-boundaries", showBoundaries);
    list.innerHTML = accepted.map((reference) => {
      const screen = currentScreenFor(reference);
      const scopeId = scopeFor(reference, screen);
      const isDrawing = state.drawingReference === scopeId;
      return `
        <article class="analysis-card" data-analysis-reference="${escapeHtml(reference.id)}">
          <header><div><h3>${escapeHtml(reference.title)}</h3><p>${escapeHtml(screen.label || "Current screen")} · ${escapeHtml(state.feedback[reference.id] || "No reference-level feedback yet")}</p></div>
            <button class="draw-region-button${isDrawing ? " is-active" : ""}" type="button" data-draw-reference="${escapeHtml(scopeId)}" aria-pressed="${isDrawing}">${isDrawing ? "Cancel drawing" : "Draw region"}</button>
          </header>
          <p class="draw-help" ${isDrawing ? "" : "hidden"}>Drag over any missing component. Its position will scale with the screenshot.</p>
          <div class="atlas-image${isDrawing ? " is-drawing" : ""}" data-atlas-reference="${escapeHtml(scopeId)}">
            <img src="${escapeHtml(screen.image)}" alt="Annotatable full reference: ${escapeHtml(screen.label || reference.title)}" draggable="false">
            ${(screen.regions || []).map((region) => regionButton(scopeId, region)).join("")}
            ${customRegionsFor(scopeId).map((region) => regionButton(scopeId, region, true)).join("")}
            ${screenControls(reference, "analysis")}
          </div>
          ${editorMarkup(scopeId)}
        </article>`;
    }).join("");
  }

  function updateCount() {
    const count = allReferences().filter((reference) => state.accepted[reference.id]).length;
    document.querySelector("#selection-count").textContent = `${count} selected for analysis`;
  }

  function pointInAtlas(event, atlas) {
    const bounds = atlas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(bounds.width, event.clientX - bounds.left)),
      y: Math.max(0, Math.min(bounds.height, event.clientY - bounds.top)),
      width: bounds.width,
      height: bounds.height
    };
  }

  function finishDraft(event, atlas) {
    if (!state.draft) return;
    const end = pointInAtlas(event, atlas);
    const left = Math.min(state.draft.start.x, end.x);
    const top = Math.min(state.draft.start.y, end.y);
    const width = Math.abs(end.x - state.draft.start.x);
    const height = Math.abs(end.y - state.draft.start.y);
    const referenceId = state.draft.referenceId;
    state.draft.element.remove();
    state.draft = null;
    if (width < 8 || height < 8) return;
    const region = {
      id: `custom-${Date.now()}`,
      label: "Custom region",
      note: "",
      x: Number((left / end.width * 100).toFixed(3)),
      y: Number((top / end.height * 100).toFixed(3)),
      width: Number((width / end.width * 100).toFixed(3)),
      height: Number((height / end.height * 100).toFixed(3))
    };
    state.customRegions[referenceId] = [...customRegionsFor(referenceId), region];
    state.drawingReference = null;
    state.activeRegion = { referenceId, regionId: region.id };
    save();
    renderAnalysis();
    document.querySelector(`[data-region-editor="${CSS.escape(referenceId)}"] input`)?.focus();
  }

  document.title = data.title;
  document.querySelector("#page-title").textContent = data.title;
  renderSelection();
  renderAnalysis();

  document.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-tab]");
    if (tab) {
      document.querySelectorAll(".tab").forEach((item) => item.classList.toggle("is-active", item === tab));
      document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.toggle("is-active", panel.id === tab.dataset.tab));
      if (tab.dataset.tab === "analysis") renderAnalysis();
      return;
    }

    const screenButton = event.target.closest("[data-screen-reference]");
    if (screenButton) {
      const reference = allReferences().find((item) => item.id === screenButton.dataset.screenReference);
      if (!reference) return;
      state.screenIndex[reference.id] = Math.max(0, Math.min(
        screenIndexFor(reference) + Number(screenButton.dataset.screenDirection),
        screensFor(reference).length - 1
      ));
      state.drawingReference = null;
      state.activeRegion = null;
      save();
      renderSelection();
      renderAnalysis();
      return;
    }

    const drawButton = event.target.closest("[data-draw-reference]");
    if (drawButton) {
      const referenceId = drawButton.dataset.drawReference;
      state.drawingReference = state.drawingReference === referenceId ? null : referenceId;
      state.activeRegion = null;
      renderAnalysis();
      return;
    }

    const customRegion = event.target.closest("[data-custom-region]");
    if (customRegion && !state.drawingReference) {
      state.activeRegion = {
        referenceId: customRegion.dataset.regionReference,
        regionId: customRegion.dataset.regionId
      };
      renderAnalysis();
      document.querySelector(`[data-region-editor="${CSS.escape(state.activeRegion.referenceId)}"] textarea`)?.focus();
      return;
    }

    const deleteButton = event.target.closest("[data-delete-region]");
    if (deleteButton) {
      const referenceId = deleteButton.dataset.referenceId;
      state.customRegions[referenceId] = customRegionsFor(referenceId).filter((region) => region.id !== deleteButton.dataset.deleteRegion);
      state.activeRegion = null;
      save();
      renderAnalysis();
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target.matches("[data-accept]")) {
      state.accepted[event.target.dataset.accept] = event.target.checked;
      save();
      updateCount();
      renderAnalysis();
    }
    if (event.target.matches("#show-boundaries")) {
      document.querySelector("#analysis-list").classList.toggle("show-boundaries", event.target.checked);
    }
  });

  document.addEventListener("input", (event) => {
    if (!event.target.matches("[data-feedback]")) return;
    state.feedback[event.target.dataset.feedback] = event.target.value;
    save();
  });

  document.addEventListener("submit", (event) => {
    const editor = event.target.closest("[data-region-editor]");
    if (!editor) return;
    event.preventDefault();
    const region = customRegionsFor(editor.dataset.regionEditor).find((item) => item.id === editor.dataset.regionId);
    if (!region) return;
    region.label = editor.elements["region-label"].value.trim() || "Custom region";
    region.note = editor.elements["region-note"].value.trim();
    save();
    renderAnalysis();
  });

  document.addEventListener("pointerdown", (event) => {
    const atlas = event.target.closest(".atlas-image.is-drawing");
    if (!atlas || event.target.closest(".region")) return;
    const start = pointInAtlas(event, atlas);
    const draft = document.createElement("div");
    draft.className = "draft-region";
    draft.style.left = `${start.x}px`;
    draft.style.top = `${start.y}px`;
    atlas.appendChild(draft);
    atlas.setPointerCapture(event.pointerId);
    state.draft = { referenceId: atlas.dataset.atlasReference, start, element: draft, pointerId: event.pointerId };
    event.preventDefault();
  });

  document.addEventListener("pointermove", (event) => {
    if (!state.draft || event.pointerId !== state.draft.pointerId) return;
    const atlas = event.target.closest(".atlas-image") || state.draft.element.parentElement;
    const end = pointInAtlas(event, atlas);
    state.draft.element.style.left = `${Math.min(state.draft.start.x, end.x)}px`;
    state.draft.element.style.top = `${Math.min(state.draft.start.y, end.y)}px`;
    state.draft.element.style.width = `${Math.abs(end.x - state.draft.start.x)}px`;
    state.draft.element.style.height = `${Math.abs(end.y - state.draft.start.y)}px`;
  });

  document.addEventListener("pointerup", (event) => {
    if (!state.draft || event.pointerId !== state.draft.pointerId) return;
    finishDraft(event, state.draft.element.parentElement);
  });

  document.addEventListener("pointercancel", () => {
    if (!state.draft) return;
    state.draft.element.remove();
    state.draft = null;
  });
})();
