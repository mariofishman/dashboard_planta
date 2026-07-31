# Phase 6 — Chat UI audit and approved adaptation decisions

> Historical accepted audit archived on 2026-07-31. Current interaction authority is `docs/product/ux_ui_decisions.md`.

**Status:** Historical accepted audit; current decisions live in `docs/product/ux_ui_decisions.md`.
**Date:** 2026-07-29
**Scope:** React chat list and chat detail presentation and interaction only.

## Purpose

This document preserves the audit of the current implementation against:

- `prototypes/current/chat/chat-list-final.html`;
- `prototypes/current/chat/chat-detail.html`;
- `docs/product/ux_ui_decisions.md`;
- `docs/design/design.md`;
- `docs/design/design-system/tokens.json`; and
- `docs/design/brand_guidelines.md`.

The prototypes provide the approved content and interaction model. The current React implementation provides the preferred visual language for the next version: its MUI composition, compact scale, typography, colors, control sizing, and navigation treatment remain the styling baseline unless a decision below says otherwise.

This document does not authorize backend, database, polling, simulator, routing, or persistence changes.

## Decision summary

### Retain the current implementation styling

- Keep the implementation's chat-list header. Do not replace it with the prototype review header or prototype-only explanatory shell.
- Keep the implementation's Dashboard/Chats bottom navigation design, icon treatment, active state, spacing, and dimensions.
- Keep the implementation's typography, colors, compact element sizing, border treatment, and corner roundness as the styling baseline.
- Keep the implementation's application shell. Prototype review bars, explanatory sidebars, and review framing are not production UI.

### Add prototype content and behavior

The next implementation must add the prototype's useful content and interactions while preserving the implementation styling:

- richer conversation-row content;
- alert jump summary and message targets;
- actual conversation title and participant summary;
- structured alert attachments;
- quoted replies;
- message actions;
- image-library and camera attachment flows;
- file attachment control;
- reply and forward context;
- mobile long-press actions and quick reactions;
- responsive bubble and alert behavior; and
- chat-list controls that hide while scrolling down and return near the top.

## Chat list decisions

### Header

Keep the current implementation header. The prototype header is explicitly dismissed for this adaptation because the implementation version better matches the established Monitor application styling.

### Conversation rows

Keep the current implementation's compact row styling and add all relevant prototype information:

1. unread blue dot;
2. conversation or group name as the strongest text;
3. written `Fijada` label when pinned;
4. latest-message preview, including sender prefix and colon;
5. one compact alert chip per open alert;
6. alert code and short alert name inside each chip;
7. oldest unresolved age shown separately from the chip;
8. latest-message time; and
9. blue unread-message number when unread messages exist.

The unread number remains exclusively the unread-message count. The blue dot is a separate unread indicator.

### Open-alert chips

Replace the implementation's aggregate `alertas abiertas` chip with one chip per open alert.

The chip must preserve the implementation's compact size, text scale, border radius, and general styling, but include:

- the alert code; and
- the alert short name.

Use the alert's semantic color only on its code, navy for the short name, a light-gray vertical divider between them, and the neutral blue-gray control border. Do not use a dot divider or full-pill geometry; retain the implementation's compact `6px` control radius. Do not include the words `Error`, `Alerta`, or `Error posible` in these list chips because they do not add value in this context. Do not include an aggregate count such as `2 alertas abiertas`.

Alert age remains separate from the chip and is written as `Más antigua` or `Sin resolver` followed by a duration. Chip size and typography do not change with age.

### Filters and search

- Add the `Fijadas` filter alongside `Todas` and `No leídas`.
- Preserve result counts and pressed-state semantics.
- Provide `Fijar conversación` and `Desfijar conversación` in a row overflow menu on desktop and keyboard, with an approximately half-second row long press on mobile. In Phase 6 this is UI-only presentation state; do not change backend authorization, persistence, or API contracts.
- Do not show separate administrator scope controls for `Mis conversaciones` and `Todas las conversaciones` in the chat-list UI.
- Do not add a second admin filter to compensate. The search box remains the discovery mechanism for conversations in the visible list.
- This UI decision did not change the administrator product policy or server-side enforcement rules now recorded in `docs/product/product_definition.md` and `docs/architecture/system_architecture.md`.

### Scrolling controls

Implement the approved pull-to-reveal behavior using the implementation's styling:

- search and filter controls begin immediately above the visible first conversation;
- reaching the first conversation does not reveal them; the user must continue pulling downward to expose them;
- their movement remains directly linked to scroll distance, without a separate timed hide/show transition; and
- bottom navigation remains available.

The implementation must include enough stable mock conversation rows and message activity to exercise the scroll behavior during UI review. This is presentation test data only and must not be treated as backend acceptance.

## Chat detail decisions

### Header

Keep the implementation header styling, but replace the generic content with:

- the actual conversation or group name;
- concise participant information; and
- a conversation-level overflow menu.

The detail view remains subordinate to Chats and continues to use a back control rather than a third primary-navigation destination.

### Open-alert summary

Add the prototype's compact open-alert summary below the header, styled with the implementation tokens. It must show:

- the number of currently open alerts; and
- one compact jump control per open alert, including alert code and unresolved duration.

Selecting a jump control scrolls to the corresponding alert message.

### Message bubbles

Use the prototype's compact WhatsApp-like message behavior in the implementation:

- outgoing messages align right;
- incoming messages align left;
- incoming and outgoing bubbles use distinct widths and surfaces;
- sender names are explicit for incoming group messages;
- the current user's name is omitted from outgoing bubbles;
- timestamps remain compact within the lower message area; and
- consecutive messages do not receive large vertical gaps.

The MUI/design-system styling remains the source for colors, typography, borders, radius, and spacing values.

The text-bubble element review approved on 2026-07-29 further resolves the presentation:

- retain the responsive `92%` mobile and `76%` desktop maximum measure;
- use `4px 34px 4px 9px` text-bubble padding;
- use the selected semantic blue surface for outgoing messages;
- retain `12px / 18px` message copy and a separate compact lower timestamp area;
- render timestamps at `9px / 11.7px`;
- keep quoted references contained at `100%` width with `6px 9px 6px 12px` inset;
- identify quoted references with the approved short `3px × 16px` cyan marker; and
- use `8px` vertical spacing between messages.

### Structured alert attachments

Use the prototype alert object without redesigning its content model. The implementation version must include:

- code-specific status label where appropriate;
- alert code;
- unresolved duration;
- concise operational title;
- evidence-based explanation;
- work order and machine facts when available;
- detection or incident time;
- supported operational-record identifier action;
- expandable explanation and resolution guidance; and
- keyboard focusability and direct targeting from the open-alert summary.

The implementation must not invent an unsupported external route. Identifiers remain the fallback until the Phase 10 navigation contract is approved.

The element review approved on 2026-07-29 further resolves the attachment presentation:

- use the narrower `min(92%, 440px)` alert-message measure;
- retain the implementation's compact outer radius and title typography;
- use nearly even outer padding, a soft danger attachment border, compact attachment radius, and low navy shadow;
- keep status and code as compact rounded rectangles, add a danger dot to the written status, and leave age as uncapsuled text;
- use muted navy for unresolved duration before two hours and deep danger from two hours onward, without changing alert label, code, lifecycle, or priority;
- separate the micro fact capsules from the explanation with a light divider; and
- keep both actions in equal side-by-side columns at every width, shortening visible narrow labels to `OT` and `Ver`.

The reviewed prototype's `Abrir OT` wording maps to the existing identifier-copy action until Phase 10 authorizes a supported EmusaSoft route.

### Message actions

Implement the prototype message-action model while retaining the implementation visual language.

Desktop:

- show a compact downward chevron on applicable messages;
- open a floating action menu within the viewport; and
- do not add permanent action rows below every message.

Where applicable, support reply, react, highlight, pin, forward, copy, message information, alert details, and message selection. Existing authorization and edit/delete rules remain governed by Phase 6 business rules.

Mobile:

- hide the desktop chevron;
- support approximately half-second long press;
- cancel long press on meaningful movement;
- suppress the browser context menu after a successful long press;
- show quick reactions above the action menu;
- use a dismissible modal backdrop; and
- present common actions first with `Más…` for the remainder.

### Quoted replies

Implement quoted replies with:

- original sender;
- compact excerpt;
- short colored vertical marker;
- subordinate visual treatment;
- navigable scroll-to-source behavior; and
- reply context in the composer.

### Attachments and composer

Preserve the implementation composer styling and add the prototype capabilities:

- image-library attachment;
- camera capture from the device;
- file attachment from the device;
- selected-image preview;
- preview removal before sending;
- optional caption or message text; and
- attachment-aware reply and forward behavior.

The camera control must allow attaching a device photo or taking a new photo. A separate file-attachment icon must support files from the device.

### Feedback and secondary interactions

Implement the prototype's functional behaviors for:

- alert jump scrolling;
- reply context;
- forward recipient chooser;
- quoted-message navigation;
- mobile action surface;
- quick reactions; and
- concise interaction toast feedback.

## Responsive and accessibility decisions

- Preserve the implementation's responsive shell and design-system tokens.
- Apply the prototype's narrow-width bubble rules and compact alert layout.
- Preserve readable title, preview, age, time, and unread meaning at narrow widths.
- Keep touch targets at the shared accessible size without enlarging the visible compact controls or overlapping adjacent targets.
- Keep keyboard focus visible and alert attachments keyboard focusable.
- Communicate status through text and markers as well as color.
- Respect reduced-motion preferences.
- Review desktop, tablet, and mobile widths with mock data.

## Explicitly out of scope

This adaptation document does not authorize changes to:

- database schema or migrations;
- API contracts or server authorization;
- alert simulator or fixture semantics;
- polling or realtime backend behavior;
- routing or roster logic;
- persistence, offline queue semantics, or production attachment storage;
- Phase 6 business rules; or
- EmusaSoft production integration.

## Implementation gate

The next UI implementation may begin from this document. It must remain UI-only, use stable mock data where required for presentation, and validate visual, responsive, keyboard, and interaction behavior without claiming backend or database acceptance.
