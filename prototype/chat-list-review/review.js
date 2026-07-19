const rows = [...document.querySelectorAll('[data-chat-row]')];
const searchInput = document.querySelector('[data-chat-search]');
const filterControls = [...document.querySelectorAll('[data-filter]')];
const emptyState = document.querySelector('[data-empty-state]');
const statusLine = document.querySelector('[data-interaction-status]');
let activeFilter = filterControls.find((control) => control.getAttribute('aria-pressed') === 'true')?.dataset.filter || 'all';

function normalize(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function rowMatchesFilter(row) {
  if (activeFilter === 'all' || activeFilter === 'coverage' || activeFilter === 'priority') return true;
  return (row.dataset.tags || '').split(' ').includes(activeFilter);
}

function applyFilters() {
  const query = normalize(searchInput?.value.trim() || '');
  let visible = 0;

  rows.forEach((row) => {
    const matchesQuery = !query || normalize(row.textContent).includes(query);
    const collapsedPinned = row.hasAttribute('data-pinned-extra') &&
      document.querySelector('[data-pinned-toggle]')?.getAttribute('aria-expanded') !== 'true';
    const show = matchesQuery && rowMatchesFilter(row) && !collapsedPinned;
    row.hidden = !show;
    if (show) visible += 1;
  });

  if (emptyState) emptyState.hidden = visible !== 0;
}

searchInput?.addEventListener('input', applyFilters);

filterControls.forEach((control) => {
  control.addEventListener('click', () => {
    activeFilter = control.dataset.filter;
    filterControls.forEach((item) => item.setAttribute('aria-pressed', String(item === control)));
    applyFilters();
  });
});

rows.forEach((row) => {
  row.addEventListener('click', (event) => {
    if (event.target.closest('[data-menu-button], [data-context-menu]')) return;
    rows.forEach((item) => item.classList.remove('is-selected'));
    row.classList.add('is-selected');
    if (statusLine) statusLine.textContent = `Seleccionada: ${row.dataset.label || 'conversación'}`;
  });
});

document.addEventListener('click', (event) => {
  const menuButton = event.target.closest('[data-menu-button]');
  document.querySelectorAll('[data-context-menu]').forEach((menu) => {
    const ownsMenu = menuButton && menu.id === menuButton.getAttribute('aria-controls');
    menu.hidden = !ownsMenu || menuButton.getAttribute('aria-expanded') === 'true';
  });

  document.querySelectorAll('[data-menu-button]').forEach((button) => {
    if (button !== menuButton) button.setAttribute('aria-expanded', 'false');
  });

  if (menuButton) {
    const wasOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!wasOpen));
    document.getElementById(menuButton.getAttribute('aria-controls')).hidden = wasOpen;
    event.stopPropagation();
  }

  const menuAction = event.target.closest('[data-menu-action]');
  if (menuAction) {
    const card = menuAction.closest('[data-chat-row]');
    if (menuAction.dataset.menuAction === 'pin') {
      card.dataset.tags = `${card.dataset.tags || ''} pinned`;
      card.querySelector('[data-pin-marker]')?.removeAttribute('hidden');
    }
    if (menuAction.dataset.menuAction === 'unread') {
      card.classList.add('is-unread');
      card.dataset.tags = `${card.dataset.tags || ''} unread`;
    }
    if (statusLine) statusLine.textContent = `${menuAction.textContent.trim()}: ${card.dataset.label}`;
  }
});

const pinnedToggle = document.querySelector('[data-pinned-toggle]');
pinnedToggle?.addEventListener('click', () => {
  const extras = [...document.querySelectorAll('[data-pinned-extra]')];
  const shouldShow = extras.some((item) => item.hidden);
  extras.forEach((item) => { item.hidden = !shouldShow; });
  pinnedToggle.textContent = shouldShow ? 'Contraer' : 'Ver todas';
  pinnedToggle.setAttribute('aria-expanded', String(shouldShow));
  applyFilters();
});

applyFilters();
