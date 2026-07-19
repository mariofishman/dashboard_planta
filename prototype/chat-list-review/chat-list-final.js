const rows = [...document.querySelectorAll('[data-chat-row]')];
const searchInput = document.querySelector('[data-chat-search]');
const filterControls = [...document.querySelectorAll('[data-filter]')];
const emptyState = document.querySelector('[data-empty-state]');
const chatScroll = document.querySelector('[data-chat-scroll]');
const chatControls = document.querySelector('[data-chat-controls]');
let activeFilter = 'all';
let previousScrollTop = 0;
let controlsHidden = false;
let ignoreDirectionUntil = 0;

function normalize(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function applyFilters() {
  const query = normalize(searchInput.value.trim());
  let visible = 0;

  rows.forEach((row) => {
    const matchesText = !query || normalize(row.textContent).includes(query);
    const matchesFilter = activeFilter === 'all' || (row.dataset.tags || '').split(' ').includes(activeFilter);
    row.hidden = !(matchesText && matchesFilter);
    if (!row.hidden) visible += 1;
  });

  emptyState.hidden = visible !== 0;
}

function setControlsHidden(hidden) {
  if (controlsHidden === hidden) return;
  controlsHidden = hidden;
  if (hidden && chatControls.contains(document.activeElement)) document.activeElement.blur();
  if (hidden) chatControls.setAttribute('inert', '');
  else chatControls.removeAttribute('inert');
  chatControls.classList.toggle('is-hidden', hidden);
  chatControls.setAttribute('aria-hidden', String(hidden));
  ignoreDirectionUntil = performance.now() + 240;
}

function resetScrollAndControls() {
  chatScroll.scrollTop = 0;
  previousScrollTop = 0;
  setControlsHidden(false);
}

searchInput.addEventListener('input', applyFilters);
searchInput.addEventListener('focus', () => setControlsHidden(false));

chatScroll.addEventListener('scroll', () => {
  const currentScrollTop = chatScroll.scrollTop;
  const delta = currentScrollTop - previousScrollTop;

  if (currentScrollTop < 20) {
    setControlsHidden(false);
  } else if (performance.now() >= ignoreDirectionUntil) {
    if (delta > 6) setControlsHidden(true);
    else if (delta < -6) setControlsHidden(false);
  }

  previousScrollTop = currentScrollTop;
}, { passive: true });

filterControls.forEach((control) => {
  control.addEventListener('click', () => {
    activeFilter = control.dataset.filter;
    filterControls.forEach((item) => item.setAttribute('aria-pressed', String(item === control)));
    applyFilters();
    resetScrollAndControls();
  });
});

rows.forEach((row) => {
  row.addEventListener('click', () => {
    rows.forEach((item) => item.classList.remove('is-selected'));
    row.classList.add('is-selected');
  });
});

applyFilters();
