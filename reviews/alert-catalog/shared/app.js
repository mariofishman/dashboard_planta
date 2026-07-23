(() => {
  const body = document.body;
  const documentId = body.dataset.reviewDocument || "document";
  const iteration = body.dataset.reviewIteration || "1";
  const storageKey = `documentation-review:${documentId}:v${iteration}`;
  const legacyStorageKey = body.dataset.reviewLegacyStorageKey;
  const states = ["pending", "approved", "commented"];
  const labels = { pending: "Pending", approved: "Approved", commented: "Commented" };
  const sections = [...document.querySelectorAll(".review-change[data-review-key]")];

  let saved = {};
  try {
    const stored = localStorage.getItem(storageKey)
      || (legacyStorageKey ? localStorage.getItem(legacyStorageKey) : null)
      || "{}";
    saved = JSON.parse(stored);
  } catch {
    saved = {};
  }

  function updateProgress() {
    const reviewed = sections.filter((section) => section.dataset.reviewState !== "pending").length;
    const progress = document.querySelector("[data-review-progress], #review-progress");
    if (progress) progress.textContent = `${reviewed} of ${sections.length} reviewed`;
  }

  function applyState(section, state) {
    const safeState = states.includes(state) ? state : "pending";
    const button = section.querySelector(":scope > .review-status");
    section.dataset.reviewState = safeState;
    if (button) {
      button.textContent = labels[safeState];
      button.setAttribute("aria-label", `${labels[safeState]}: ${section.dataset.reviewKey}`);
      button.setAttribute("aria-pressed", safeState === "approved" ? "true" : "false");
    }
  }

  sections.forEach((section) => {
    applyState(section, saved[section.dataset.reviewKey]);
    const button = section.querySelector(":scope > .review-status");
    if (!button) return;
    button.addEventListener("click", () => {
      const current = states.indexOf(section.dataset.reviewState);
      const next = states[(current + 1) % states.length];
      applyState(section, next);
      saved[section.dataset.reviewKey] = next;
      localStorage.setItem(storageKey, JSON.stringify(saved));
      updateProgress();
    });
  });

  updateProgress();
})();
