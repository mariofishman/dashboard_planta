# Monitor UX/UI Decisions

## 1. Purpose and authority

This document is the canonical record of UX and UI decisions within the current product defined by `docs/product_definition.md`. It consolidates decisions that were previously distributed across review annotations, prototype code, product discovery, the alert catalog, and the design system.

The current product design surfaces are:

- `apps/web/` — approved Dashboard V2 local implementation;
- `prototype/chat-list-review/chat-list-final.html` — conversation list;
- `prototype/chat-list-review/chat-detail.html` — conversation detail and alert attachment.

This document records product behavior and presentation decisions. Business rules, alert detection, and recipient routing remain governed by `docs/alert_catalog.md`. Visual tokens and component rules remain governed by `docs/design/design.md`, `docs/design/brand_guidelines.md`, and `docs/design/design-system/tokens.json`. The EmusaSoft boundary remains governed by `docs/emusasoft_integration_architecture.md`; release sequencing and wider technical scope remain governed by `docs/monitor_architecture_and_production_roadmap.md`.

For the dashboard, `apps/web/` and this document represent the current design direction. `prototype/chat-list-review/dashboard.html` is deprecated pre-V2 evidence and has no current product authority. For chat screens, the two current prototype files listed above and this document represent the current direction. The older `01-familiar.html`, `02-role-aware.html`, `03-operations-triage.html`, and `04-pinned-focus.html` files are exploratory alternatives, not parallel product variants.

## 2. Product model

### 2.1 Product purpose

Monitor is an operational alert system for factory activity recorded in EmusaSoft. It combines two complementary modes:

1. a familiar conversation model for receiving, discussing, forwarding, and following alerts; and
2. a dashboard model for historical analysis, recurrence, current state, and drill-down.

Monitor complements EmusaSoft. It does not replace work-order, material-flow, production, weighing, inventory, or correction workflows. Alerts and conversations show the relevant ERP identifiers and evidence; EmusaSoft currently provides no supported frontend routes for direct navigation.

### 2.2 Mental model

The conversation experience intentionally follows familiar WhatsApp conventions so plant users require minimal training. The design reuses recognizable patterns—conversation rows, unread counters, pinned conversations, message bubbles, quoted replies, forwarding, reactions, attachments, and long-press actions—while adding factory-specific alert information.

The interface must still distinguish three different concepts:

- a conversation, which contains participants and a message history;
- a message, which is sent by a person or by Monitor; and
- an alert, which is a structured operational object that can travel inside a message.

An alert is not the name of a conversation, and a conversation is not the alert itself.

### 2.3 Main surfaces

The application has four main screens:

- **Dashboard** — summary, history, analysis, filtering, reporting, and drill-down;
- **Chats** — the user's conversation list;
- **Chat detail** — a subordinate view opened from a conversation, not a separate primary navigation destination; and
- **Operational Responsibility Roster** — assignment administration for deterministic alert routing; currently conceptual and not yet prototyped.

Dashboard and Chats remain the two primary navigation destinations. Chat detail opens from Chats, and the roster's navigation placement remains undecided until its design is approved.

The former idea of a third bottom-navigation destination called **Messages** was rejected. Messages are accessed by opening a chat.

### 2.4 Information ownership

- EmusaSoft remains the operational system of record.
- Monitor owns incidents, alert evidence, conversations, messages, read state, pins, reactions, and audit history.
- Work orders and other operational entities remain identifiable through their ERP codes and evidence; Monitor exposes no unsupported navigation route.
- A conversation maintains the shared history of the incident instead of producing duplicate alerts for each reply or system update.

### 2.5 Participants and visibility

Conversation inclusion is based on operational relevance and the deterministic distribution rules in the alert catalog.

- The factory manager is aware of all alerts.
- The affected operation's supervisor and technical leader are included.
- The operator assigned to the affected machine and shift is included when applicable.
- Warehouse personnel are included for reservation, dispatch, transit, receipt, pickup, and material-location problems.
- Supervisors may also participate in work-order problems such as late opening, late closing, missing consumption, or reconciliation errors.
- The process team is included when pickup, weighing, delivery, or movement evidence is involved.

Role-based routing is a back-end and configuration responsibility. The chat list should not explain coverage through abstract controls such as “Mi cobertura,” “Grupos incluidos por tu rol,” or a coverage percentage. Those concepts were tested and rejected because users could not understand their meaning without explanation.

### 2.6 Operational Responsibility Roster

**Name:** Operational Responsibility Roster  
**Spanish:** Matriz Maestra de Responsables Operativos  
**Status:** To be designed.

Monitor requires an administration surface that maintains which person occupies each standardized operational position by:

- operation;
- machine;
- shift; and
- effective date.

Alert routing will use this master table deterministically to convert a standardized position into the actual person who must receive the alert. Standardized positions include, among others:

- OT machine operator;
- shift supervisor;
- technical leader;
- material planner;
- warehouse dispatcher; and
- process-team operator.

The administration surface must support:

- assignment history;
- temporary replacements;
- validity start and end dates;
- warnings for overlapping or conflicting assignments;
- warnings for missing assignments; and
- traceability of the assignment used for each routing decision.

The roster must not use an LLM to choose recipients. Alert code and reason determine the required standardized position; the roster resolves that position to the valid person for the affected operation, machine, shift, and relevant ERP evidence time.

No information architecture, layout, workflow, permissions model, or component design has yet been approved for this administration surface.

## 3. Shared application structure

### 3.1 Primary navigation

Dashboard and Chats use the same bottom navigation so they feel like one application.

- The navigation contains only **Dashboard** and **Chats**.
- The current destination is shown through more than color alone: active color, stronger weight, and an active treatment.
- Chat detail uses a back control to return to Chats rather than adding a third bottom-navigation item.
- The bottom navigation remains available at the bottom of the viewport on desktop and mobile where the current approved screen behavior specifies it.

### 3.2 Production ecosystem menu

The dashboard header contains a burger menu for moving between applications in the wider production ecosystem.

The prototype includes:

- Control de alertas;
- Planificación;
- Inventario;
- Calidad; and
- Mantenimiento.

The previous product-brand label was removed from this location because the available header space is more useful for ecosystem navigation. The user-avatar/profile control was also removed from this header because it did not add value to the current task flow.

### 3.3 Language and naming

- All current user-visible interface labels and messages are Spanish. English and Portuguese are future localization targets; current layouts must tolerate their expansion without mixing languages into the Spanish product.
- Labels use familiar plant vocabulary and direct operational language.
- Buttons use verbs.
- Dates, times, quantities, and durations are explicit.
- Exclamation marks, marketing copy, and vague messages are avoided.
- “Monitor” is the product name and the visible name of the automated system sender. It is treated typographically like any other sender.

### 3.4 Density

The product is intended for frequent operational use. Layouts should favor compact, scannable information over decorative whitespace.

- Avoid instructional banners inside working screens when the instruction is self-evident.
- Avoid oversized padding in message histories, alert summaries, filters, and cards.
- Do not create nested cards unless the inner object has a distinct interactive meaning, such as an alert attachment inside a message.
- Review-only explanatory sidebars and top bars are prototype scaffolding and are not part of the production application shell.

## 4. Visual language

### 4.1 Brand foundation

- Montserrat is the product typeface.
- EMUSA navy anchors headers, navigation, primary text, and structural elements.
- Cyan identifies actions, active controls, links, and focus.
- Green represents verified completion, resolved state, or healthy production.
- Red represents an actual error or currently open problem.
- Orange represents a warning, approaching deadline, attention state, or an administrative closure when the label makes the distinction explicit.
- White and light gray support long-session readability.

### 4.2 Color carries one meaning at a time

Alert label and alert age are separate dimensions.

- Color communicates the kind of condition described by that alert code.
- Written duration communicates age.
- Age does not progressively enlarge a chip, change its typography, or change the chip's label color.
- The interface does not invent urgency thresholds from age alone.
- If operational escalation thresholds are documented later, a separate urgency treatment may be introduced.

Alert labels are code-specific rather than a shared state vocabulary. Current examples include:

- **Error** — a rule has been violated;
- **Por vencer** — the error has not happened yet, but a deadline is approaching;
- **Alerta** — a monitoring threshold has passed but the condition may still be legitimate; and
- **Error posible** — the evidence suggests an inconsistency that requires investigation.

Every label uses written text and a marker; meaning never depends on color alone. Incident lifecycle states such as open, resolved, and closed without resolution are represented separately.

### 4.3 Shape, spacing, and elevation

- Operational controls, filters, lifecycle selectors, and chips use the approved compact rounded rectangle: `28px` visible height, `6px` radius, normally `8px` horizontal padding, and `11px` text.
- Full-pill geometry is not used for rectangular filters, statuses, chips, buttons, inputs, selects, or menu items. A circular radius is limited to genuinely circular elements such as status dots, avatars, and unread counters.
- Dashboard cards use a maximum radius of 16px.
- Static containers use either a border or restrained elevation, not both decoratively.
- The 4px spacing rhythm from the design system is used throughout.
- Long information lists rely on alignment and dividers before adding more card surfaces.

### 4.4 Typography hierarchy

- Conversation or group name is the strongest text in a conversation row.
- Sender name is bold in group-message previews and incoming group messages.
- Message content is regular weight.
- Metadata such as timestamp, age, work order, and machine is smaller but remains legible.
- Monitor uses the same sender typography as a person such as Jorge A.; it is not styled as a separate heading system.

## 5. Chat list

### 5.1 Purpose

The chat list shows every conversation in which the current user participates. It is optimized for recognizing the conversation, understanding its latest activity, seeing unresolved alerts, and entering the history quickly.

The selected direction is the **Familiar** concept because similarity to WhatsApp and minimal training are priorities. The role-coverage, operational-triage, and pin-dominant alternatives were not retained as separate layouts.

### 5.2 Conversation types

The list supports group conversations and direct conversations.

For a group conversation:

- the bold title is the group name;
- the latest-message preview begins with the sender's name and a colon; and
- automated messages use `Monitor:` as the sender prefix.

For a direct conversation:

- the bold title is the other person's name; and
- the preview contains the message without repeating a group name.

When a participant forwards a group message to one individual, the resulting exchange is a direct conversation between those two people. The forwarded content should preserve enough source context to identify or return to the original group message when permissions allow.

Alert names, work-order errors, or machine conditions must not replace the group or contact name in the title position.

### 5.3 Conversation row hierarchy

Each row may contain, in order:

1. unread indicator, when applicable;
2. group or contact name;
3. pinned label, when applicable;
4. latest-message preview with sender for group messages;
5. count of open alerts;
6. explicit age of the oldest unresolved alert;
7. alert chips;
8. latest-message time; and
9. unread-message count.

Machine-code or group-initial avatars were removed. They consumed space without helping users identify or prioritize a conversation.

### 5.4 Alert chips in rows

- Chips identify unresolved alert code and short name.
- Chips include the descriptive label configured by that alert code; examples include `Error`, `Por vencer`, `Alerta`, and `Error posible`.
- Chips use a neutral surface compatible with the EMUSA palette; semantic color is limited to the code-specific label marker and text.
- Multiple alerts appear as multiple chips.
- When the complete set does not fit, show a limited number and an explicit overflow such as `+3 más`.
- Chip size and typography remain stable regardless of age.
- Age is shown separately as `Más antigua` or `Sin resolver` followed by a duration.

### 5.5 Unread and pinned state

- The numeric badge at the right is exclusively the number of unread messages.
- It is not the number of people, alerts, or pending actions.
- Unread state also has a non-numeric visual indicator and accessible label.
- Pinned conversations use a written `Fijada` label.
- Pinning affects conversation ordering but does not imply alert severity.

### 5.6 Search and filters

The search field accepts:

- group name;
- person;
- machine;
- work order; and
- alert code or text.

The current quick filters are:

- Todas;
- No leídas; and
- Fijadas.

Filters display result counts and use `aria-pressed` to expose their state.

### 5.7 Scrolling behavior

- The conversation list has its own vertical scroll area.
- Search and filter controls are visible at the top of the list.
- When the user scrolls downward, search and filters hide to provide more room for conversations.
- When the user scrolls upward toward the top, the controls return.
- Bottom navigation remains available.

### 5.8 Empty state

When search and filters produce no results, the list shows a concise empty state and suggests changing the term or filter.

## 6. Chat detail

### 6.1 Purpose

Chat detail is the shared history for one group or direct conversation. People discuss operational events around the same alert objects, while Monitor posts automated detections and updates.

### 6.2 Header

The header contains:

- back navigation to Chats;
- group or contact name;
- concise participant information for a group; and
- a conversation-level overflow menu.

The conversation-level menu is the place for actions such as pinning the conversation, marking it unread, searching within the history, and viewing group information. These controls do not appear as permanent instructional text in the message history.

### 6.3 Open-alert summary

A compact bar below the header shows:

- the number of alerts currently open in the conversation; and
- one compact jump control per open alert, showing code and unresolved duration.

Selecting an alert scrolls to the corresponding alert message. The bar remains compact because the conversation history is the primary content.

### 6.4 Message density and alignment

- Messages use WhatsApp-like compact vertical spacing.
- Outgoing messages align right and represent the current user.
- The current user's name is omitted from outgoing bubbles.
- Incoming messages align left.
- In a group, the incoming sender's name sits immediately below the top edge of the bubble with minimal vertical padding.
- Timestamp sits in the lower message area without creating an extra row of whitespace.
- Consecutive messages should not be separated by large empty gaps.

### 6.5 Simple message bubble

A simple incoming group message contains:

- sender name in a strong accent color;
- message text; and
- timestamp aligned compactly with the final line or at the lower edge.

The bubble uses a restrained white or neutral surface and a compact radius. It does not place action buttons permanently below the message.

### 6.6 Reply with quoted message

A reply can embed a quoted reference above the new message.

- The quoted block contains the original sender and a short excerpt.
- A colored vertical rule identifies the quoted block.
- The reply sender remains above the quoted block for incoming group messages.
- Selecting the quoted block scrolls to the referenced message, even when it was sent at another time.
- The quoted reference is compact and visually subordinate to the new reply.

### 6.7 Photo messages

- A message may contain a photograph.
- It may include an optional caption below the image.
- A photograph without a caption is valid.
- Sender and timestamp remain available.
- The composer offers both image-library selection and direct camera capture.
- A selected image receives a preview and can be removed before sending.

### 6.8 Monitor messages

- Monitor is treated as a participant and uses the same sender-name hierarchy as human senders.
- Automated alert messages avoid filler such as “Se detectó una condición que requiere seguimiento.”
- The structured alert object supplies the useful information directly.
- System and human messages remain in the same chronological history.

## 7. Alert object inside a message

### 7.1 Object model

An alert is presented like an operational file attached to a message. It travels with the message when the message is replied to, selected, forwarded, or otherwise acted upon.

The alert object may contain:

- code-specific descriptive alert label;
- alert code;
- unresolved duration;
- concise operational title;
- evidence-based explanation;
- work order;
- machine;
- effective incident time, using authoritative ERP source time when available and otherwise Monitor's first-detection time; and
- other relevant facts supported by the alert catalog.

### 7.2 Primary destinations

The object has two clear actions:

1. copy or inspect the related EmusaSoft work-order or operational-record identifier; and
2. expand a concise explanation and resolution guide.

The resolution guide explains what is blocked or inconsistent and the safe steps for investigating or correcting it through the existing operational workflow.

### 7.3 Interaction

- The object is keyboard focusable.
- Selecting the object may expand its summary unless the user selected a nested link or button.
- The work-order identifier can be copied; it is not presented as an unsupported external link.
- The summary action exposes its expanded state.
- Open-alert jump controls target the object directly.
- An alert attachment keeps enough evidence to be useful when forwarded.

### 7.4 Color and age

- Alert-label color appears in a compact marker and written label; lifecycle state is presented separately.
- The unresolved duration is written explicitly at the opposite edge of the header.
- Age does not overlap the message-action control.
- Older alerts can receive a restrained container accent, but the text, descriptive alert label, and separate lifecycle state remain the primary explanation.

## 8. Message actions

### 8.1 Desktop

- Desktop messages expose a small downward chevron at the top-right of the bubble.
- The chevron does not overlap alert headers, content, or age labels.
- Selecting it opens a floating menu positioned within the viewport.
- Permanent action rows below every message were rejected because they consumed too much vertical space.

The menu supports, where applicable:

- Responder;
- Reaccionar;
- Destacar;
- Fijar;
- Reenviar;
- Copiar;
- Responder en privado or message information;
- alert details;
- and Seleccionar mensajes.

Actions depend on message type and user permissions. Destructive or moderation actions must follow authorization and audit rules.

The menu follows the familiar WhatsApp visual pattern: a compact floating white surface, vertically stacked icon-and-label rows, separators between action groups, and a clearly differentiated destructive action when deletion is authorized. Reporting, deletion, private reply, contact messaging, and additional actions may appear only when the message type and permissions make them valid.

### 8.2 Mobile

- The desktop chevron is hidden on mobile.
- Pressing and holding a message for approximately half a second opens the mobile action surface.
- Meaningful finger movement cancels the long press.
- The browser context menu is suppressed for a successful message long press.
- Quick reactions appear in a separate row above the action menu.
- The mobile menu contains the most common actions first and a `Más…` option for the remainder.
- The action surface is modal, has a dismissible backdrop, and does not depend on hover.

### 8.3 Reply, forward, select, and copy

- Reply creates a compact composer context naming the source sender.
- Forward opens a recipient chooser.
- Selecting or forwarding a system alert message includes the alert object.
- Copy copies the message content available to the user.
- Quoted replies maintain a navigable reference to the original message.
- Forwarded messages retain source context where permitted, so selecting the reference can return to the original message and date.

## 9. Message composer

The composer contains:

- image attachment;
- camera capture;
- text input; and
- send action.

Additional transient contexts may appear immediately above it:

- replying to a message;
- forwarding recipient selection; and
- photo preview.

The composer remains accessible while the message history scrolls. Sending a message adds it to the history and scrolls to the newest content, respecting reduced-motion preferences.

## 10. Dashboard

### 10.1 Purpose

The dashboard is a compact statistical, historical, and incident-inspection surface. It summarizes historical and currently open alerts without repeating the same values in separate KPI cards. It supports analysis by:

- worker;
- work order;
- machine;
- operation;
- shift;
- error type;
- status; and
- date.

It complements the real-time conversation list rather than duplicating it. The primary chart and incident results are the focal points; controls and secondary summaries must not dominate the page.

### 10.2 Header

- The header contains the production-ecosystem burger menu.
- The centered product title is `Control de alertas`.
- Filtered CSV export is a compact, icon-only secondary action in the header with an accessible name.
- The former top-level Dashboard/Chats navigation is removed from the header; those destinations use the shared bottom navigation.
- A user-avatar button is not shown in the current design.

### 10.3 Filters

Dashboard filters are global: the chart, incident results, open-age analysis, and detail rows update from the same state. Filters do not create a separate analytical model for each component.

The available filters are:

- free-text search for person, work order, machine, or error;
- date range: last 7, 30, or 90 days, or a custom range;
- operation: all, printing, extrusion, Exlam, cutting, or sealing; and
- incident lifecycle; and
- open-incident age.

Lifecycle values are additive controls:

- Abiertas;
- Resueltas; and
- Cerradas sin resolución.

Selecting an inactive lifecycle adds it to the filter. Selecting an active lifecycle removes only that lifecycle. With no lifecycle selected, all lifecycle states are shown. This does not imply that one incident can occupy multiple lifecycle states; it allows the result set to include multiple states.

Date, operation, grouping, lifecycle, age, and search filters affect both chart values and incident results. Clicking an already-selected chart segment, age bucket, or removable filter clears that selection without requiring a permanent `Restablecer` control in the chart toolbar.

On desktop and tablet, grouping and common chart controls occupy one compact row. Focusing search expands it left over that row; covered controls are hidden and unavailable while typing. Enter applies the query and restores the compact row. Escape or moving focus away also restores it. The expanded search provides a compact `Filtros avanzados` action that opens the same mixed-filter surface used on mobile.

The custom range uses one anchored range-calendar popover. Opening it from a preset starts with no selected dates. The first click selects a start, the second selects an end, the third starts a new range, and the fourth completes it. Reopening an applied range may show it for context, but the first new click replaces it with a new start. The calendar remains open after a pair is completed so another pair can be selected. Custom dates appear inside the fixed-width date control, which also provides an explicit clear action; they are not repeated above the toolbar.

### 10.4 Primary chart

The main chart is a stacked bar chart with three lifecycle series:

- resolved — green;
- open — red; and
- closed without resolution — orange.

The grouping control changes the x-axis between date, worker, work order, machine, operation, shift, and error type. This replaces separate concentration and frequent-error cards. The subtitle reflects the selected preset or identifies a custom period without repeating the custom dates.

Lifecycle colors remain green for resolved, red for open, and orange for closed without resolution. The compact legend doubles as the additive lifecycle filter. Selected states retain their semantic color; inactive states are muted. Text, tooltips, and accessible names prevent color from carrying meaning alone.

No standalone KPI cards, summary strip, or mobile summary sentence repeats values already communicated by the chart, lifecycle controls, or incident count.

### 10.5 Drill-down

Each colored chart segment is interactive.

- Selecting a segment filters the dashboard by its category and lifecycle.
- Selecting it again removes that segment filter.
- Lifecycle and open-age filters change the values rendered in the chart as well as the incident results.
- The chart retains every category position and a stable y-axis scale while filtering. Contextual bars may be dimmed, but the selected target must not move because the axes were rebuilt.
- The y-axis reserves at least one complete grid step above the tallest stack so the value label cannot collide with the controls.
- Segment interaction supports pointer and keyboard input.

### 10.6 Incident results

Incident results sit directly below the chart. The header includes the filtered result count and an expand/collapse control. Results start expanded on desktop and tablet and collapsed on mobile; changing this disclosure does not change any filters.

Desktop and tablet use a compact four-column table:

- relative detection time;
- alert;
- work order; and
- lifecycle status.

Machine, operation, shift, responsible area, and age are compact metadata inside the alert cell rather than a separate ambiguous context column. The alert target fills the complete visible cell, including title, metadata, and whitespace. Mobile presents the complete incident card as one target.

Detection time uses `Ahora`, `hace N min`, `Hoy, HH:mm`, `Ayer, HH:mm`, a weekday within the recent week, or a short older date. The exact timestamp remains available as accessible or hover detail. Lifecycle uses a compact colored indicator plus an accessible name and tooltip.

Work-order identifiers remain compact and selectable. Monitor does not invent an EmusaSoft link until an authoritative frontend route contract exists.

### 10.7 Open-alert age

`Antigüedad abierta` summarizes how long current open alerts have remained unresolved. Each age row filters the chart and incident results and clears on a second selection. The same filter is available in `Filtros avanzados`. It is an analytical view, not a substitute for documented priority or escalation rules.

The interface must not claim that one alert is more important than another until operational priority rules exist. If priority ordering is required later, it must be based on a documented policy, such as a future `priorities.md`, and not inferred only from visual design.

### 10.8 Error frequency

There is no separate frequent-error card. Selecting `Tipo de error` as the primary chart grouping provides this analysis without duplicating it.

### 10.9 Incident detail

Opening an incident preserves the Phase 4 incident API, authorization, lifecycle, live-update, and evidence-access contracts. The presentation contains:

- the alert code, occurrence, label, lifecycle, and effective incident time;
- compact operational data such as work order, machine, operation, shift, and available responsible role or area;
- a meaningful lifecycle history; and
- `Por qué se generó`, one concise contextual explanation of what happened, the affected operational context, and the responsible roles that are actually supported by evidence.

The explanation must be grounded in the canonical alert catalog and current incident evidence, use simple Spanish, and never invent a named person. Whether deterministic composition, an LLM-assisted approach, or a hybrid generates this text is an engineering/product decision governed by the production roadmap, not a UI decision.

Repeated unchanged polling observations are not useful incident history. The UI presents the opening evidence and later meaningful evidence, context, or lifecycle changes. Raw technical detail remains progressively disclosed when it adds diagnostic or audit value; it is not printed as a long default list.

An incident is not shown as related merely because it shares a work order. A visible relationship requires an explicit and explainable relation contract.

### 10.10 Report export

Export uses the same active filter state as the dashboard. The report action belongs in the application header rather than occupying space beside the dashboard title.

### 10.11 Empty state

When filters produce no dashboard rows, the detail area explains that no errors match and suggests changing date, operation, state, or search term.

## 11. Responsive behavior

All four main screens must work on desktop and mobile. The roster's detailed responsive behavior will be defined with its future prototype.

- Layouts reflow without horizontal page overflow.
- Touch targets are at least 44px where mobile interaction is expected, while compact controls remain visually `28px` high with a `6px` radius. The additional target area is invisible or supplied by surrounding layout and must not enlarge the visible control or overlap another target.
- Dashboard controls do not stack into a permanent mobile filter block.
- At mobile width, the quick-filter region occupies zero height by default. A downward pull or wheel/trackpad overscroll at the top reveals one compact search/filter row; normal upward content scrolling hides it again.
- The persistent header filter action opens `Filtros avanzados`, preserving keyboard, assistive-technology, and non-touch access. The surface combines search, date, lifecycle, operation, grouping, and open-age filters.
- Hidden mobile quick filters leave document flow and the accessibility tree.
- The mobile dashboard contains no KPI-card grid or repeated summary strip.
- The desktop/tablet table fits its container without document-level or table-level horizontal scrolling; mobile uses incident cards instead of forcing the table into the viewport.
- Conversation rows preserve title, preview, age, time, and unread meaning at narrow widths.
- Alert context can stack vertically on very narrow screens.
- Chat detail uses mobile long-press actions instead of the desktop chevron.
- No important state is available only on hover.

## 12. Accessibility

- Keyboard focus is always visible.
- Interactive chart segments, alert objects, quoted references, filters, menus, and navigation expose semantic roles and labels.
- `aria-current`, `aria-pressed`, `aria-expanded`, and `aria-live` are used where state changes.
- Screen-reader-only descriptions supplement visual charts and icon-only controls.
- Color is never the only status signal.
- Text and controls meet the contrast targets in the brand guidelines.
- Motion respects `prefers-reduced-motion`.
- Spanish, English, and Portuguese expansion must be supported without destructive truncation.
- Empty, loading, error, offline, stale, reconnecting, and high-volume states must be included before production release, even where the current static prototype does not yet demonstrate all of them.

## 13. Decisions rejected or superseded

The following explored concepts are not part of the current direction:

- four simultaneous chat-list variants;
- a role-coverage banner with group count and `100%` coverage;
- filters called `Mi cobertura`, `Menciones`, `Material`, and `OT` without self-evident user meaning;
- a priority-first triage queue without documented operational priority rules;
- instructional strips such as “Selecciona una conversación para anotarla” inside the product UI;
- instructional strips explaining that the row menu can pin or mark unread;
- machine-code avatars that duplicate text without adding meaning;
- a create-conversation `+` action without a defined operational use;
- a third primary navigation item named Messages;
- permanent Reply, Forward, and Select links below every message;
- showing the current user's name on outgoing bubbles;
- large vertical padding between chat messages;
- generic automated filler before an alert object;
- encoding unresolved age by continuously increasing chip size or typography;
- changing semantic alert color merely because time has passed;
- a separate oversized KPI band above the date chart;
- top-header navigation for Dashboard and Chats;
- an application-header user avatar with no current task value; and
- a combined `Resueltas y abiertas` incident state;
- mutually exclusive dashboard lifecycle filters;
- standalone dashboard KPI cards or a repeated summary strip;
- permanent mobile filter rows or stacked mobile controls;
- separate `Dónde se concentran` and `Errores frecuentes` cards after their dimensions moved to the primary chart;
- an inline reset control that displaces compact chart controls;
- horizontal scrolling for the Dashboard V2 incident table; and
- treating deterministic templates or an LLM as an approved explanation-generation mechanism before the roadmap decision is completed.

## 14. Prototype-only behavior and production boundaries

The prototypes demonstrate interaction and information architecture. They do not by themselves authorize production behavior.

- Current static data is illustrative.
- Prototype toasts simulate completion of some actions.
- Ecosystem destinations other than Control de alertas are placeholders.
- Prototype EmusaSoft navigation actions are illustrative only and must not appear in implementation because no supported frontend-route contract exists.
- Authentication, authorization, message retention, moderation, audit, reporting, and attachment policies must follow the production architecture.
- Alert detection and routing must use canonical rules and deterministic ownership mappings.
- Engineering phases do not represent separate product releases and do not change the four-screen product definition.
- Monitor's closed-without-resolution view remains read-only; operational adjustments belong to EmusaSoft.

## 15. Open UX/UI decisions

The following items are not yet fully decided and should not be inferred from the prototypes:

- formal priority and escalation rules;
- age thresholds that change urgency treatment;
- exact conversation creation rules and who may create a group;
- final participant-management permissions;
- Operational Responsibility Roster information architecture, editing workflow, permissions, conflict resolution, and audit presentation;
- moderation, deletion, reporting, and private-reply authorization;
- read receipts, delivery receipts, typing state, and presence requirements;
- maximum visible chips before overflow at each responsive width;
- attachment size, file type, compression, retention, and privacy rules;
- report formats, fields, permissions, and audit trail;
- whether search is local, server-backed, or hybrid at production scale;
- loading, stale-data, offline, reconnection, and partial-failure copy;
- pagination or virtualization thresholds for long chat and dashboard histories;
- notification channels outside Monitor; and
- final translated terminology in English and Portuguese.

## 16. Implementation checklist

A production implementation matches the current UX/UI direction only if:

- Dashboard and Chats share the same primary navigation.
- Chat detail is entered from Chats and is not a third primary destination.
- Group and direct conversation titles follow the sender rules in this document.
- Monitor is treated as a sender.
- Unread badges count unread messages only.
- Alert label, incident lifecycle, and alert age remain separate visual dimensions.
- Alert chips include text labels and support overflow.
- Search and filters affect the complete surface, not an isolated component.
- Dashboard chart drill-down updates all dependent views and can be reset.
- Lifecycle filters are additive and each active lifecycle clears independently.
- Lifecycle, age, date, operation, search, grouping, and advanced filters update both chart values and incident results.
- Chart filtering preserves category positions and scale and reserves headroom above the tallest bar.
- Dashboard controls use the canonical compact type, height, radius, and padding inside toolbars, dialogs, menus, drawers, and mobile sheets.
- Desktop search expands over the control row; mobile quick filters occupy no space until revealed.
- Custom date selection follows the start/end/restart cycle and remains removable.
- Incident results are collapsible, use relative time, and open from the complete alert target.
- The dashboard does not repeat chart information in summary cards or redundant analytical panels.
- Open, resolved, and closed-without-resolution states remain distinct.
- Work orders and operational objects show clear identifiers and evidence without an unsupported external navigation action.
- Message actions are compact on desktop and long-press driven on mobile.
- Photos, optional captions, quoted replies, and alert attachments preserve their designed hierarchy.
- The interface remains usable by keyboard, touch, and assistive technology.
- Responsive and reduced-motion behavior is verified.
- New visual values reuse the design tokens before introducing additional tokens.
- Alert routing resolves standardized positions through the effective Operational Responsibility Roster assignment once that administration surface is designed and implemented.
