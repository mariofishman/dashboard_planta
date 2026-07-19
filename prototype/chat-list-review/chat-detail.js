const detailScroll = document.querySelector('[data-detail-scroll]');
const messageHistory = document.querySelector('[data-message-history]');
const messageForm = document.querySelector('[data-message-form]');
const messageInput = document.querySelector('[data-message-input]');
const replyContext = document.querySelector('[data-reply-context]');
const replyAuthor = document.querySelector('[data-reply-author]');
const forwardPanel = document.querySelector('[data-forward-panel]');
const interactionToast = document.querySelector('[data-interaction-toast]');
let toastTimer;

function showToast(message) {
  window.clearTimeout(toastTimer);
  interactionToast.textContent = message;
  interactionToast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => interactionToast.classList.remove('is-visible'), 2200);
}

function toggleSummary(button) {
  const summary = document.getElementById(button.dataset.summaryToggle);
  const expanded = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', String(!expanded));
  button.textContent = expanded ? (button.dataset.summaryToggle === 'summary-a05' ? 'Ver resumen y solución' : 'Ver cómo resolver') : 'Ocultar resumen';
  summary.hidden = expanded;
}

function closeMessageMenus(except) {
  document.querySelectorAll('[data-message-menu]').forEach((toggle) => {
    if (toggle === except) return;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.nextElementSibling.hidden = true;
  });
}

const menuIcons = {
  reply: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 8-5 4 5 4v-3h4c4 0 6 2 7 5 0-6-3-9-7-9H9V8Z"></path></svg>',
  react: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M8.5 14.5c1 1.2 2.1 1.8 3.5 1.8s2.5-.6 3.5-1.8M9 9.5h.01M15 9.5h.01"></path></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.4-4.2 6-.9L12 3Z"></path></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8M10 4v5l-3 3v2h10v-2l-3-3V4M12 14v7"></path></svg>',
  forward: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 8 5 4-5 4v-3h-4c-4 0-6 2-7 5 0-6 3-9 7-9h4V8Z"></path></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="11" height="13" rx="1"></rect><path d="M15 7V4H4v13h3"></path></svg>',
  private: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 8-5 4 5 4v-3h4c4 0 6 2 7 5 0-6-3-9-7-9H9V8Z"></path><path d="M4 5h6"></path></svg>',
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v6M12 7.5h.01"></path></svg>',
  select: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="m8 12 2.5 2.5L16 9"></path></svg>'
};

function menuButton(label, icon, attributes) {
  return `<button type="button" role="menuitem" ${attributes}>${menuIcons[icon]}<span>${label}</span></button>`;
}

function populateMessageMenu(menu, message) {
  const isOutgoing = message.classList.contains('outgoing-message');
  const isSystem = message.classList.contains('system-message');
  const contextualItem = isSystem
    ? menuButton('Ver detalles de alerta', 'info', 'data-menu-command="details"')
    : isOutgoing
      ? menuButton('Información del mensaje', 'info', 'data-menu-command="info"')
      : menuButton('Responder en privado', 'private', 'data-menu-command="private"');

  menu.innerHTML = `
    ${menuButton('Responder', 'reply', 'data-message-action="reply"')}
    ${menuButton('Reaccionar', 'react', 'data-menu-command="react"')}
    ${menuButton('Destacar', 'star', 'data-menu-command="star"')}
    ${menuButton('Fijar', 'pin', 'data-menu-command="pin"')}
    ${menuButton('Reenviar', 'forward', 'data-message-action="forward"')}
    ${menuButton('Copiar', 'copy', 'data-menu-command="copy"')}
    <hr class="message-menu-separator" />
    ${contextualItem}
    <hr class="message-menu-separator" />
    ${menuButton('Seleccionar mensajes', 'select', 'data-message-action="select" aria-pressed="false"')}`;
}

function positionMessageMenu(toggle, menu) {
  const rect = toggle.getBoundingClientRect();
  const gap = 4;
  const edge = 8;
  const left = Math.min(window.innerWidth - menu.offsetWidth - edge, Math.max(edge, rect.right - menu.offsetWidth));
  let top = rect.bottom + gap;

  if (top + menu.offsetHeight > window.innerHeight - edge) {
    top = Math.max(edge, rect.top - menu.offsetHeight - gap);
  }

  menu.style.left = `${Math.round(left)}px`;
  menu.style.top = `${Math.round(top)}px`;
}

function wireMessageMenu(scope) {
  scope.querySelectorAll('[data-message-menu]').forEach((toggle) => {
    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      const menu = toggle.nextElementSibling;
      const willOpen = menu.hidden;
      closeMessageMenus(toggle);
      menu.hidden = !willOpen;
      toggle.setAttribute('aria-expanded', String(willOpen));
      if (willOpen) {
        positionMessageMenu(toggle, menu);
        menu.querySelector('button').focus();
      }
    });
  });
}

function handleMessageAction(button) {
  const message = button.closest('[data-message]');
  const sender = message.querySelector('.message-sender')?.textContent || 'tu mensaje';

  if (button.dataset.messageAction === 'reply') {
    replyAuthor.textContent = sender;
    replyContext.hidden = false;
    messageInput.focus();
    showToast(`Respondiendo a ${sender}`);
  }

  if (button.dataset.messageAction === 'forward') {
    forwardPanel.hidden = false;
    showToast('Selecciona a quién reenviar este mensaje');
  }

  if (button.dataset.messageAction === 'select') {
    const selected = message.classList.toggle('is-selected');
    button.setAttribute('aria-pressed', String(selected));
    const totalSelected = document.querySelectorAll('[data-message].is-selected').length;
    showToast(totalSelected ? `${totalSelected} mensaje${totalSelected === 1 ? '' : 's'} seleccionado${totalSelected === 1 ? '' : 's'}` : 'Selección cancelada');
  }

  closeMessageMenus();
}

function handleMenuCommand(button) {
  const message = button.closest('[data-message]');
  const sender = message.querySelector('.message-sender')?.textContent || 'tu mensaje';
  const command = button.dataset.menuCommand;

  if (command === 'react') showToast('Elige una reacción para este mensaje');
  if (command === 'star') showToast('Mensaje destacado');
  if (command === 'pin') showToast('Mensaje fijado en esta conversación');
  if (command === 'copy') showToast('Mensaje copiado');
  if (command === 'info') showToast('Información del mensaje');

  if (command === 'private') {
    replyAuthor.textContent = `${sender} en privado`;
    replyContext.hidden = false;
    messageInput.focus();
  }

  if (command === 'details') {
    const summaryButton = message.querySelector('[data-summary-toggle]');
    if (summaryButton && summaryButton.getAttribute('aria-expanded') !== 'true') toggleSummary(summaryButton);
    message.scrollIntoView({ block: 'center' });
  }

  closeMessageMenus();
}

function createMessageMenu(message) {
  const wrap = document.createElement('div');
  wrap.className = 'message-menu-wrap';
  wrap.innerHTML = `
    <button class="message-menu-toggle" type="button" data-message-menu aria-expanded="false" aria-label="Abrir acciones del mensaje">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"></path></svg>
    </button>
    <div class="message-menu" role="menu" hidden></div>`;
  populateMessageMenu(wrap.querySelector('.message-menu'), message);
  return wrap;
}

document.querySelectorAll('[data-summary-toggle]').forEach((button) => {
  button.addEventListener('click', () => toggleSummary(button));
});

document.querySelectorAll('.alert-attachment').forEach((attachment) => {
  const summaryButton = attachment.querySelector('[data-summary-toggle]');

  attachment.addEventListener('click', (event) => {
    if (event.target.closest('a, button')) return;
    toggleSummary(summaryButton);
  });

  attachment.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    toggleSummary(summaryButton);
  });
});

document.querySelectorAll('[data-alert-jump]').forEach((button) => {
  button.addEventListener('click', () => {
    const alert = document.getElementById(button.dataset.alertJump);
    alert.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    alert.focus({ preventScroll: true });
  });
});

document.querySelectorAll('.message-menu').forEach((menu) => populateMessageMenu(menu, menu.closest('[data-message]')));
wireMessageMenu(document);

document.addEventListener('click', (event) => {
  const action = event.target.closest('[data-message-action]');
  if (action) {
    handleMessageAction(action);
    return;
  }
  const command = event.target.closest('[data-menu-command]');
  if (command) {
    handleMenuCommand(command);
    return;
  }
  if (!event.target.closest('.message-menu-wrap')) closeMessageMenus();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMessageMenus();
});

detailScroll.addEventListener('scroll', () => closeMessageMenus(), { passive: true });
window.addEventListener('resize', () => closeMessageMenus());

document.querySelector('[data-reply-cancel]').addEventListener('click', () => {
  replyContext.hidden = true;
  replyAuthor.textContent = '';
});

document.querySelectorAll('[data-forward-to]').forEach((button) => {
  button.addEventListener('click', () => {
    forwardPanel.hidden = true;
    showToast(`Mensaje reenviado a ${button.dataset.forwardTo}`);
  });
});

document.querySelector('[data-forward-cancel]').addEventListener('click', () => {
  forwardPanel.hidden = true;
});

document.querySelector('.header-menu').addEventListener('click', () => {
  showToast('Opciones: fijar chat, marcar no leído o buscar en la conversación');
});

messageForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  const message = document.createElement('article');
  message.className = 'message outgoing-message';
  message.setAttribute('data-message', '');

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';

  const paragraph = document.createElement('p');
  paragraph.textContent = text;

  const time = document.createElement('time');
  const now = new Date();
  time.dateTime = now.toISOString();
  time.textContent = now.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' });

  bubble.append(createMessageMenu(message), paragraph, time);
  message.append(bubble);
  messageHistory.append(message);
  wireMessageMenu(message);
  messageInput.value = '';
  replyContext.hidden = true;
  replyAuthor.textContent = '';
  detailScroll.scrollTo({ top: detailScroll.scrollHeight, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  showToast('Mensaje enviado');
});
