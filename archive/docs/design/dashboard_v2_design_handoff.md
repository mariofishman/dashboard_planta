# Dashboard V2 Design Handoff

**Final status:** accepted by the user as a good first version on 2026-07-22. This completed record is archived for evidence and is no longer active design authority. Current reusable design rules live in `docs/design/design.md`; Dashboard behavior lives in `docs/product/ux_ui_decisions.md`; non-UI production questions live in `docs/roadmap.md`.

## 1. Purpose and authority

This document was the implementation handoff for **Phase 4A — Dashboard redesign** on branch `codex/dashboard-v2`.

It translates the user's latest prototype review and Mobbin reference annotations into an actionable design brief for a new Codex task. For dashboard-specific presentation and interaction decisions, this handoff supersedes older prototype choices where they conflict. It does not supersede incident semantics, authorization, API contracts, lifecycle behavior, or the shared Monitor design system.

The redesign must preserve the completed Phase 4 incident vertical slice while replacing its unapproved dashboard presentation.

## 2. Read before editing

Inspect these sources in this order:

1. `docs/archive/dashboard_v2_design_handoff.md` — completed historical Dashboard V2 record;
2. `docs/roadmap.md` — Phase 4A scope and gates;
3. `docs/product/ux_ui_decisions.md` — shared Monitor UX/UI rules and dashboard behavior;
4. `docs/design/design.md`, `docs/design/brand_guidelines.md`, and `docs/design/design-system/tokens.json` — visual system;
5. `archive/prototypes/chat-list-explorations/dashboard.html`, `dashboard.css`, and `dashboard.js` — preferred prototype baseline;
6. `apps/web/src/App.tsx` and `apps/web/src/api.ts` — current connected Phase 4 implementation; and
7. `prototype/dashboard-reference-atlas/` — visual research evidence.

When sources conflict, use this order:

1. latest explicit decisions in this handoff;
2. current product and technical contracts;
3. shared design-system rules;
4. older prototype behavior.

## 3. Product outcome

Create a compact, minimalist, operational dashboard that summarizes historical and currently open Monitor incidents without making users configure a reporting tool.

The dashboard must support analysis by:

- worker;
- work order;
- machine;
- operation;
- shift;
- error type;
- lifecycle status; and
- date.

The visual direction should be closer to `archive/prototypes/chat-list-explorations/dashboard.html` than to the current Phase 4 React dashboard, but the final implementation must be more compact and incorporate the accepted reference feedback below.

## 4. What must remain functional

The redesign must not change the meaning or source of incident data.

Preserve:

- authenticated local mock sessions and server-side authorization;
- incident retrieval through the existing API;
- open, resolved, and closed-without-resolution lifecycle states;
- date, operation, status, and search filtering;
- date drill-down;
- incident-detail and evidence access;
- OT identifier copying;
- WebSocket live updates and cursor recovery;
- loading, empty, API-unavailable, and reconnect behavior;
- responsive behavior already proven at desktop, tablet, and mobile widths; and
- the read-only EmusaSoft boundary.

Do not replace working backend behavior with hard-coded dashboard data.

## 5. Overall design direction

### 5.1 Density

- Minimize vertical height throughout the page.
- Prefer one compact analytical workspace over stacked bands of oversized cards.
- Use alignment, dividers, and typography before adding containers or shadows.
- Keep chart controls, legends, and summaries close to the chart they affect.
- Avoid decorative whitespace, large empty headers, and repeated explanatory copy.

### 5.2 Shell and navigation

- Remove the visible `Resumen de alertas` title and its descriptive subtitle.
- Use a shallow application header. It must not consume space with redundant product explanation.
- Retain the production-ecosystem burger control required by the shared Monitor UX decisions.
- Do not add a left-side navigation menu.
- Do not show a user avatar in the dashboard header.
- Keep Dashboard and Chats in the same bottom navigation used by the chat-list prototype.
- Move report/CSV export out of the dominant header-action treatment. Place it near the incident results as a compact, low-emphasis action.

### 5.3 Fixed dashboard

This is a fixed operational dashboard, not a report builder.

Users may:

- filter;
- search;
- select a date/status segment;
- switch the grouping dimension;
- inspect an incident; and
- export the filtered result.

Users must not:

- add or remove charts;
- configure arbitrary metrics;
- build queries or events;
- edit the dashboard composition; or
- open report-authoring side panels.

## 6. Reference-review evidence

### 6.1 Retained: Mixpanel compact analysis workspace

Use these ideas:

- a single-line, shallow filter row;
- compact active-filter chips;
- a compact chart with restrained axis labels and small numeric values;
- a one-line legend explaining series colors; and
- a thin, comfortable table that fits the available width without horizontal scrolling.

Do not use:

- its large primary navigation; or
- its metric-configuration side panel.

### 6.2 Retained: Amplitude segmentation chart

Use these ideas:

- a visually quiet chart;
- compact chart controls aligned at the top-right;
- chip-like controls instead of space-heavy select fields when the option set is short; and
- a small, low-priority CSV export action near the table rather than a dominant page action.

Do not use:

- the event and segmentation builder;
- its configurable analytics model; or
- a large global-navigation header.

### 6.3 Rejected or only partially useful

#### Better Stack

Its incident domain is relevant, but its reference direction was rejected. The status metrics consume too much space and should instead be integrated with the primary date chart.

#### Kajabi

Hiding filter complexity is useful, but the large circular summary graphics consume space without adding enough information.

#### Fibery

The report-builder flexibility is explicitly unwanted. Monitor needs a fixed dashboard with filtering and grouping only.

#### Zendesk

The reference was not sufficiently understandable and was not selected. Do not reproduce its report-authoring machinery.

## 7. Required information architecture

### 7.1 Compact control area

The default dashboard view should expose only the controls needed frequently.

- Place the shortest, most useful chart and date controls on one shallow row.
- Prefer compact chips or segmented controls for short option sets.
- Show active filters as small removable chips.
- Place secondary or less-used filters behind one compact `Filtros` control, drawer, popover, or collapsible region.
- A collapsed state must still communicate which filters are active.
- Provide a visible `Restablecer` action whenever filters or drill-down are active.
- All filters use one global state and update every chart, summary, grouping, and incident result.

Required filter dimensions remain:

- search by person, OT, machine, or error;
- date range;
- operation, including Extrusión;
- lifecycle status; and
- chart-driven exact-date drill-down.

Lifecycle filters are mutually exclusive:

- Todos;
- Abiertas;
- Resueltas; and
- Cerradas sin resolución.

### 7.2 Primary date chart

The first and dominant analytical object is `Alertas por fecha`.

- Use stacked bars for resolved, open, and closed-without-resolution incidents.
- Use design-system green, red, and orange only for their documented lifecycle meanings.
- Keep the legend compact and adjacent to the chart.
- Do not add a chart summary or KPI-card band. Status context comes from the clickable lifecycle legend, chart segments, and incident result count; repeating the same totals consumes space without adding value. This supersedes the earlier summary-integration direction.
- Reflect the active date range rather than permanently saying `Últimos 30 días`.
- Make every bar segment keyboard- and pointer-selectable.
- Selecting a segment filters the complete dashboard by that exact date and lifecycle state.
- Preserve enough chart context to understand the selection, while visually de-emphasizing excluded dates if appropriate.

### 7.3 Dimension grouping

Allow one grouping at a time:

- Trabajador;
- OT;
- Máquina;
- Operación;
- Turno; or
- Tipo de error.

Use compact tabs or chips. Do not introduce a configurable query builder.

### 7.4 Supporting analysis

Retain compact views for:

- concentration by selected dimension;
- age of currently open incidents; and
- most frequent error types.

These views must use the same global filter state. Do not infer operational priority from age because no approved priority policy exists.

### 7.5 Incident results

- Use a compact table on widths where a table remains readable.
- The table must fit the content area without horizontal scrolling.
- Match the retained reference's comfortable but compact row height.
- Keep essential identifiers, lifecycle, responsible context, and the detail action immediately visible.
- Make OT identifiers selectable/copyable using the existing supported behavior; do not invent an EmusaSoft route.
- On narrow screens, transform rows into a concise responsive list or expandable record rather than forcing a horizontally scrolling table.
- Secondary fields may move into the expanded/detail presentation, but they must remain accessible.
- Keep CSV/report export small and low-emphasis beside the incident results.

This compact results-area placement is newer than the older instruction to put `Exportar reporte` in the application header and supersedes that dashboard-specific placement for Dashboard V2.

This no-horizontal-scroll decision is newer than the older dashboard table guidance in `docs/product/ux_ui_decisions.md` and supersedes it for Dashboard V2.

## 8. Responsive and accessibility requirements

Validate at minimum:

- desktop: `1440 × 1000`;
- tablet: approximately `919 × 863`; and
- mobile: approximately `390 × 844`.

Requirements:

- no page-level horizontal overflow;
- no horizontally scrolling incident-results table;
- controls remain readable and touch targets remain at least 44px on mobile;
- the compact desktop filter row progressively collapses or moves into the secondary filter surface;
- active filters remain visible and removable;
- chart segments, grouping controls, filters, OT copy controls, and detail actions are keyboard accessible;
- focus indicators are visible;
- status never depends on color alone;
- charts expose text summaries and accessible labels; and
- motion respects `prefers-reduced-motion`.

## 9. Visual-system constraints

Use the existing Monitor design system rather than importing the visual identity of a reference app.

- Montserrat remains the typeface.
- EMUSA navy anchors structure and primary text.
- Cyan indicates actions, active controls, and focus.
- Green, red, and orange retain their documented lifecycle meanings.
- Use the 4px spacing rhythm.
- Use compact rounded rectangles; reserve full pills for chips and short filters.
- Keep static surfaces flat, using restrained borders before shadows.
- Avoid nested cards, gradients, glass effects, oversized radii, and decorative chart colors.

## 10. Explicit non-goals

Do not add:

- a large dashboard title/subtitle block;
- a left navigation rail;
- oversized KPI cards;
- large circular summary graphics;
- a report builder;
- arbitrary metric configuration;
- an event/segmentation builder;
- chart-composition editing;
- unsupported EmusaSoft deep links;
- new priority rules inferred from incident age; or
- changes to incident lifecycle semantics or backend contracts.

## 11. Implementation boundaries

- Implement against the existing connected React/MUI application rather than replacing it with the static prototype.
- Reuse the existing API and real Phase 4 synthetic incident data flow.
- Refactoring `apps/web/src/App.tsx` into focused dashboard components is permitted when it improves clarity without changing behavior.
- Use existing design-system theme values and tokens; do not copy reference-app colors.
- Preserve local-first Phase 4 behavior and do not introduce real EmusaSoft authentication or production integration.
- Do not modify Phase 4B dynamic-scenario work in this redesign branch.

## 12. Completed iteration decision log

This handoff was the active decision log until the user accepted Dashboard V2 on 2026-07-22. Every historical statement below saying that approval remained pending is superseded by Section 12.17; those statements are retained only to preserve the sequence of review evidence.

### 12.1 Approved process decisions

- Record each new user decision in this handoff during active iteration.
- Classify feedback as an approved decision, rejected alternative, unresolved question, or implementation note.
- Update or explicitly supersede earlier statements when a decision changes; do not retain contradictory active instructions.
- Keep `docs/design/design.md` and `docs/product/ux_ui_decisions.md` unchanged during active iteration unless an existing contradiction must be resolved to continue safely.
- Treat implementation completion, automated validation, and browser review as evidence for approval—not as user approval.

### 12.2 Rejected process alternatives

- Do not use chat history, implementation code, or an older prototype as a substitute for recording an active Dashboard V2 decision here.
- Do not move iteration-specific discussion into the canonical design documents before approval.
- Do not archive, remove, or rename this active handoff before explicit Dashboard V2 design approval.
- Do not treat Phase 4A implementation readiness as permission to begin Phase 4B or another product phase.

### 12.3 Unresolved questions

- Superseded by Section 12.17: Dashboard V2 was accepted as a good first version and its reusable and Dashboard-specific rules were promoted to canonical documentation.

### 12.4 Implementation notes

Completed after explicit Dashboard V2 approval:

1. consolidate reusable visual and interaction preferences into `docs/design/design.md`;
2. consolidate Monitor-specific dashboard behavior and UX decisions into `docs/product/ux_ui_decisions.md`;
3. check both canonical files against each other and the implemented dashboard for contradictions, duplication, and compatibility;
4. move this completed handoff to `docs/archive/dashboard_v2_design_handoff.md`;
5. update references that still point to the former active handoff path;
6. preserve research evidence, superseded decisions, and rejected alternatives in the archived handoff; and
7. report exactly which decisions were moved into each canonical document.

### 12.5 Review round — 2026-07-22

#### Approved decisions

- The Atlas images, accepted-reference selections, reference-level comments, and component annotations must be inspected and synthesized before the next Dashboard V2 presentation is designed.
- The next implementation must demonstrate a traceable relationship between the accepted Atlas patterns and the resulting dashboard composition, density, controls, chart, and incident results.
- The accepted visual references are **Compact analysis workspace** (Mixpanel) and **Chart with structured segmentation** (Amplitude).
- Keep common filters flat, compact, and on one line where space permits. Prefer selectable chips to dropdown-heavy controls, and place chart filters/controls at the upper right of the chart area.
- Keep the chart compact, with small legible axis values, a visible y-axis, and a short one-line legend that explains each color.
- Place a simple, thin, compact results table directly below the chart. Its full useful width must fit the viewport without horizontal scrolling, and its row height should remain comfortable but dense.
- Keep the dashboard fixed and purpose-built. Users may filter and group existing incident data, but they do not need to add, remove, or reconfigure dashboard modules.
- Keep export actions small, secondary, and away from the main visual hierarchy.
- Reduce global header/navigation height and remove nonessential explanatory copy from the primary dashboard surface.

#### Rejected alternatives

- The current Dashboard V2 implementation in `apps/web/src/App.tsx` is rejected as a design direction. Passing functional tests and responsive checks does not make its presentation acceptable.
- Do not continue refining the current composition without first recovering and reading the user's saved Atlas review feedback.
- Do not treat the high-level reference summary in this handoff as a substitute for the user's detailed Atlas comments and annotations.
- Do not use a large status-metric band above the incident results; status measures should be analyzed as part of the chart rather than consume a separate oversized area.
- Do not add a persistent primary menu or oversized global navigation/header to the dashboard.
- Do not add metric-configuration panels, event/segmentation query builders, or composable dashboard-module controls; Monitor's information is not meant to be configured at that level.
- Do not use large circular summary visualizations that occupy substantial space without adding information.
- Do not use the unselected **Status report with removable filters** reference as authority; the user found its intent unclear.

#### Unresolved questions

- Dashboard V2 design approval remains pending after implementation of the recovered reference decisions.
- The exact compact chart encoding for the existing incident-status measures remains an implementation/design-review question; no new status semantics may be introduced to answer it.

#### Implementation notes

- The lost browser-only review has been reconstructed in `prototype/dashboard-reference-atlas/review-state.json`.
- That repository-backed file is now the durable source for the six reference-level responses, two accepted references, and eight component annotations from this review round.
- Run `python3 prototype/dashboard-reference-atlas/atlas_server.py --port 4175` from the repository root. The Atlas reads and writes `review-state.json` directly; it does not rely on browser-local storage.
- The Atlas can also export/import portable review JSON for subsequent tasks or worktrees.
- Open the Atlas, select **Analyze components**, and click the numbered component markers to read the recovered annotations in context.
- Atlas access was reverified on 2026-07-22. All six reference-level comments, both accepted selections, and all eight numbered component annotations are readable in the running Atlas at `http://127.0.0.1:4175/`.
- The eight component annotations specifically approve compact flat filters, chip-based chart controls, compact table width/rows, a secondary export action, and a shorter header; they reject metric configuration, primary navigation, and an event/segmentation builder.

### 12.6 Mobbin collection pass — 2026-07-22

#### Approved decisions

- The existing approved Atlas patterns remain authoritative when evaluating the saved `monitor_dashboard` collection: compact shared controls, visible filter chips, compact chart controls and legends, dense tables without horizontal scrolling, secondary export actions, a short header, and a fixed purpose-built dashboard.
- The collection should be evaluated as component evidence rather than blanket approval of every visible Xero pattern.
- The grouped Xero `monitor_dashboard` reference is now accepted for detailed review.
- Keep the incident table visibly narrower than the viewport, with compact rows and no sideways scrolling.
- Superseded by Section 12.11: do not use summary cards or a summary strip, even at small size, when the same values are already visible in the chart, lifecycle controls, or incident result count.
- Keep filter controls thin and visually quiet near the related content. Keep export small and low-emphasis.
- Hide search behind a compact magnifying-glass control until it is needed. Hide secondary filters behind one compact control; opening either surface may push the content below it rather than permanently reserving space.
- Keep the application header very short. Remove report-title or descriptive header blocks that consume space without adding operational value, and minimize the gap between the header and the first useful section.
- Present supporting analyses as a compact, organized multi-chart grid that can be understood together on one screen. Use modest consistent gaps and small chart labels rather than large separations.

#### Rejected alternatives

- Do not copy Xero's large global navigation, configurable `Add widget` behavior, or an oversized circular expense breakdown merely because those elements appear in a saved screen.
- Do not treat saving a Mobbin screen to the collection as approval of its entire composition.
- Do not keep the search box or secondary filter fields permanently open when they are not in use.
- Do not add a separate report header, dashboard introduction, or large blank band between the application header and the analytical content.
- The earlier rejection of a compact multi-chart grid is superseded: the user explicitly approved seeing several small analyses together. The grid must still preserve a clear primary date-chart hierarchy and must not become configurable.

#### Unresolved questions

- Dashboard V2 design approval remains pending after implementation and responsive review of the combined Mixpanel, Amplitude, and Xero decisions.

#### Implementation notes

- Added a second Atlas round containing five Xero web screens from the Mobbin collection `monitor_dashboard`: Business health scorecards, Visualise, Analytics dashboard, Bills filters/table, and Business Overview.
- The related Xero screens are grouped into one multi-screen reference so they can be reviewed in context without losing the individual source links or annotations.
- Four saved screen IDs were retrieved exactly through Mobbin MCP screen search. The saved Business health scorecard ID was visible in the authenticated collection but was not returned by MCP search, so its exact collection image was retained from Mobbin rather than substituting a similar result.
- The currently available Mobbin MCP exposes static screen search, multi-screen flow search, and site-section search. It does not expose personal collections, Figma prototypes/files, playable videos or animations, or a UI-component retrieval endpoint.
- The updated repository-backed Atlas state was re-read before implementation. It contains the accepted Xero reference, its reference-level feedback, five predefined-region notes, and four custom-region notes.
- Implemented the combined Mixpanel, Amplitude, and Xero direction in the connected React/MUI dashboard without changing Phase 4 API, authorization, live-update, incident-lifecycle, evidence, or responsive contracts.
- Historical implementation note, superseded by Section 12.11: the presentation used six summary cells and later a shallow summary strip; both were removed after review because they repeated chart information.
- Browser review passed at 1440 x 1000, 919 x 863, and 390 x 844 with no document-level horizontal overflow. The desktop and tablet incident table stayed within its container; mobile replaced the visible table with the existing incident list.
- Browser interaction review confirmed hidden search, hidden operation filters, active-filter awareness, reset, chart drill-down, incident detail/evidence access, OT copy controls, live status, and responsive bottom navigation. No browser console warnings or errors were present.
- `npm test`, `npm run typecheck`, and `npm run build` passed on 2026-07-22. The build retains the existing non-blocking Vite large-chunk warning.

### 12.7 Browser feedback round — 2026-07-22

#### Approved decisions

- Replace the crowded six-column tablet table with four clear columns: relative detection time, alert, OT, and status. Operational area, machine, operation, and shift remain compact secondary metadata under the alert rather than occupying an ambiguous `Contexto` column.
- Use compact human-relative detection labels: `Ahora`, `hace N min`, `Hoy, HH:mm`, `Ayer, HH:mm`, a weekday for the recent week, and a short date for older incidents. Preserve the exact timestamp as accessible/hover detail.
- Remove the dedicated detail-arrow column. The alert title itself opens the incident explanation and technical history.
- There are three existing lifecycle states: open, resolved, and closed without resolution. Represent them in the dense table with the same red, green, and orange status colors used in the chart, plus a text tooltip and accessible name so color is not the only signal.
- Clicking an already-selected date/status chart segment a second time removes that segment filter.
- Use the same compact inter-card gap between every supporting analysis rather than visually joining them with internal dividers.
- Replace the long, fully expanded `Evidencia` dump with a concise `Por qué se generó` explanation: show the latest technical observation first and keep older immutable evidence available in a collapsed technical-history disclosure.
- Remove the copy icon from the table OT presentation. Keep the identifier compact, readable, and selectable while the external-navigation question remains unresolved.

#### Rejected alternatives

- Do not retain overlapping date, error, context, OT, status, and detail columns at tablet width.
- Do not use full calendar timestamps as the primary content of the narrow table column.
- Do not leave every repeated evidence snapshot expanded by default.
- Do not invent an EmusaSoft deep link or route pattern that is absent from the existing integration contract.

#### Unresolved questions

- The requested behavior of opening a work order directly in EmusaSoft remains unresolved. `docs/product/ux_ui_decisions.md` explicitly states that EmusaSoft currently provides no supported frontend route for direct navigation. Implementing the link requires an approved route contract; Dashboard V2 must not guess one.
- Dashboard V2 design approval remains pending after this feedback round.

#### Implementation notes

- `Contexto` previously combined responsible area, machine, operation, and shift. Its purpose was operational orientation, but the separate column consumed too much width and did not communicate that purpose clearly.
- Incident evidence is the immutable record of the source facts that caused or cleared an alert. It remains necessary for auditability and diagnosis, but repeated polling snapshots should be progressively disclosed rather than printed as one long default list.
- Implemented the four-column table, relative time labels, accessible status dots, title-based incident-detail access, second-click chart-filter removal, separated supporting-analysis cards, and progressively disclosed technical evidence.
- The OT copy icon and dedicated detail-arrow column were removed. The OT remains selectable text; no unsupported external navigation was added.
- Clean browser verification passed at 1440 x 1000, 919 x 863, and 390 x 844 with no horizontal overflow or console warnings/errors. At 919 px, the four table cells occupy non-overlapping fixed boundaries and the table client width equals its scroll width. Mobile retains the existing list presentation.
- `npm test`, `npm run typecheck`, and `npm run build` passed after this feedback round. The existing non-blocking Vite large-chunk warning remains.

### 12.8 Filter, chart, mobile, and incident-history feedback — 2026-07-22

#### Approved decisions

- Clicking an already-selected non-default lifecycle chip a second time clears that lifecycle filter and returns to `Todas`.
- Desktop and tablet filter chips should match the retained references more closely: approximately 28 px high, a small 6 px radius, and compact type rather than tall pill geometry.
- Desktop and tablet search expands within the existing toolbar space to the left of its icon and receives focus immediately. It must not create a second row below the toolbar.
- Remove the ambiguous secondary-filter icon. Date and lifecycle remain primary visible controls on desktop/tablet; operation and grouping controls must have explicit labels rather than hiding behind an unexplained generic icon.
- Preserve the chart's x-axis positions, y-axis scale, and unselected bars when a segment filters the result set. Selection may dim context, but it must not reflow the chart or move the selected bar.
- Move the worker, OT, machine, operation, shift, and error-type grouping controls above the primary chart and let them control that chart. Remove the redundant `Dónde se concentran` card.
- On mobile, hide the full filter toolbar from document flow. A compact header action may open all search and filter controls in an overlay without consuming dashboard height.
- Hide summary cards and summary text completely on mobile; the lifecycle controls, chart, and incident result count already communicate the necessary status context.
- `Por qué se generó` must use the canonical alert-catalog explanation and current operational context in simple language: what happened, the affected OT/machine/shift, and the responsible operational roles. Remove the generic introductory sentence and raw repeated evidence list.
- Do not display a related alert merely because it shares a work order. A visible relationship requires an explicit, explainable relationship contract. The current A02/A05 relation is therefore removed from the Dashboard V2 detail presentation.
- Repeated healthy polling observations with no meaningful evidence, reason, context, or lifecycle change must not create evidence rows or `incident.updated` events. Store the opening evidence and subsequent meaningful changes or lifecycle transitions; derive elapsed open duration from incident timestamps.

#### Rejected alternatives

- Do not keep 44 px pill-shaped chips visible in the mobile dashboard flow.
- Do not open search or secondary filters as additional rows beneath the desktop toolbar.
- Do not rebuild chart axes or remove contextual bars after a segment selection.
- Do not retain a separate concentration chart after its grouping controls move to the primary chart.
- Do not present dozens of identical poll snapshots as useful incident history.
- Do not label same-work-order incidents as related without evidence of a direct material or operational relationship.

#### Unresolved questions

- Production integration still needs an authoritative source for named people when the alert evidence only identifies responsible roles or operational areas. Dashboard V2 may show the available role/area, machine, operation, and shift but must not invent a person's identity.
- Dashboard V2 design approval remains pending after this feedback round.

#### Implementation notes

- The current A02/A05 `related` result is produced only by the shared `work-order:<id>` correlation key. It does not prove that both incidents concern the same material movement or reel, so the UI must not imply a stronger relationship.
- The current Phase 4 service inserts evidence and publishes `incident.updated` for every repeated triggered evaluation. This caused the 47 nearly identical observations seen in the local drawer. The approved correction deduplicates semantically unchanged polling without changing open, resolved, recurrence, authorization, cursor recovery, or transaction semantics.
- Implemented 28 px desktop/tablet chips with 6 px radii, second-click lifecycle clearing, same-row focused search, an explicit operation selector, and a complete mobile filter overlay launched from the 48 px application header.
- The primary chart now supports date, worker, OT, machine, operation, shift, and error-type grouping. Segment selection filters the results while retaining every contextual bar at the exact same x/y position and scale. The redundant concentration card was removed.
- Mobile hides the filter toolbar and all metric-summary UI completely from layout. Search/filter controls remain in the overlay and pull-to-reveal row.
- The incident drawer now uses catalog-grounded plain-language explanations and available responsibility context. Repeated technical snapshots and same-work-order-only related alerts are no longer rendered.
- Phase 4 incident persistence now ignores passage-of-time-only differences (`elapsedMinutes` and `declaredAgeMinutes`) and suppresses unchanged evidence rows and `incident.updated` events. Meaningful evidence/context changes, openings, resolutions, recurrence, transactions, and cursor events remain covered by tests.
- Clean browser verification passed at 1440 x 1000, 919 x 863, and 390 x 844 with no horizontal overflow or console warnings/errors. Desktop/tablet toolbar height is 38 px when search is closed; lifecycle chips are 28 px. Mobile filter-toolbar height is zero in document flow.

### 12.9 Pull-to-reveal and chart-control feedback — 2026-07-22

#### Approved decisions

- On mobile, the dashboard starts with no filter row in document flow. Pulling down at the top reveals one compact row containing search and a small number of quick status filters, following the demonstrated WhatsApp interaction. Scrolling the dashboard hides the row again.
- Keep the mobile header `Buscar y filtrar` action. It remains the explicit, accessible route to the complete filter sheet when a pull gesture is unavailable or undesirable.
- Remove the separate desktop/tablet toolbar of date and lifecycle chips. Date range moves beside the `Fecha` chart-grouping control as a compact selector with `7 días`, `30 días`, `90 días`, and `Personalizado`.
- Turn the chart lifecycle legend into thin clickable status controls. The selected state retains its semantic color; inactive states are muted. Clicking the selected lifecycle again clears the lifecycle filter.
- Any inline search field must have the same visible height as the controls beside it.
- Superseded by Section 12.11: the summary metrics were removed rather than realigned.
- Add an expand/collapse control to the incident-results header. The incident list starts collapsed on mobile and expanded on desktop/tablet, and the user may change it without altering filters or results.
- Add open-incident age to the complete mobile filter sheet. The `Antigüedad abierta` rows are also directly selectable and clear on a second click.
- Remove the standalone `Errores frecuentes` card because error-code grouping on the primary chart now provides the same analysis.
- `¿Por qué se generó?` uses deterministic, rule-code-specific copy derived from the approved alert catalog and populated with existing incident/evidence fields. It must not call an LLM or invent facts at runtime.
- Remove the structured responsibility facts beneath the explanation when they repeat `Datos operativos`; keep one concise explanatory paragraph.

#### Rejected alternatives

- Do not keep permanent mobile filters above the chart.
- Do not keep the old global `7/30/90` and lifecycle control rows after those controls move into chart context.
- Do not retain a separate frequent-errors summary after error grouping is available on the main chart.
- Do not use an LLM to generate incident explanations.
- Do not repeat operational facts immediately below the same facts in `Datos operativos`.

#### Unresolved questions

- Dashboard V2 design approval remains pending after this feedback round.
- The supplied screen-recording attachment was not available at its announced local path during implementation. The approved interaction is therefore based on the user's explicit description and annotated browser evidence; exact motion timing can be tuned if the recording becomes available again.

#### Implementation notes

- The pull gesture is an enhancement, not the only access path: the persistent header filter action preserves keyboard, assistive-technology, and non-touch access to all filters.
- The custom date option uses explicit start and end dates and keeps the existing incident query, authorization, lifecycle, and live-update contracts unchanged.
- Age filtering applies only to currently open incidents and does not introduce a new lifecycle or persistence rule.
- Implemented a zero-height mobile quick-filter region that reveals one 44 px row after a downward touch gesture at scroll position zero and hides again after content scrolling. Hidden controls are removed from the accessibility tree; the full filter drawer remains available from the praised header action.
- Removed the global toolbar and frequent-errors card. The chart owns a compact date-range selector, 28 px operation/search controls, and 24 px clickable lifecycle legend controls. The summary metrics described in this historical note were subsequently removed in Section 12.11.
- Added custom start/end dates, direct age-bucket filtering, mobile age controls, and an incident-list disclosure that defaults closed below 600 px and open at larger widths.
- Rule explanations are fixed A02/A03/A05 catalog-backed templates populated from existing incident and evidence fields. No LLM is called. The repeated responsibility fact rows were removed.
- Browser verification passed at 1440 x 1000, 919 x 863, and 390 x 844 with no horizontal overflow. The mobile quick-filter region measured 0 px when closed; the mobile incident list started collapsed; the tablet date, operation, and search controls each measured 28 px; the complete mobile filter sheet exposed age controls; and a clean browser load produced no console warnings or errors.
- `npm test`, `npm run typecheck`, and `npm run build` passed. The existing non-blocking Vite large-chunk warning remains.

### 12.10 Chart-filter fidelity and density correction — 2026-07-22

#### Approved decisions

- Lifecycle and open-age filters must change the values rendered in the primary bar chart as well as the incident results. This supersedes any earlier implementation note that retained unfiltered bar values. The chart keeps stable category positions and a stable y-axis scale so filtering does not move the user's target.
- Mobile pull-to-reveal must respond to upward overscroll input at the top of the page from both touch and wheel/trackpad review. Touch-only handling is insufficient.
- Standardize compact desktop/tablet chart controls at 28 px high with the same small control text. Dropdown options must use the same text scale and compact row height rather than default menu sizing.
- Remove the inline `Restablecer` action from the chart control row. Primary chips and filters clear through their own selection behavior and must not be displaced by a reset button.
- Give the inline search field enough width for useful text while preserving the compact 28 px height.
- Superseded by Section 12.11: remove the six summary cards without replacing them with a strip or another repeated summary surface.
- Custom start/end dates open in a modal or pop-up and consume no permanent chart space. Applying the range closes the surface.
- Rebalance the incident table columns so the alert column does not absorb all remaining width, and add explicit right padding to the status column.
- Mobile filter-sheet chips use the established compact chip height, radius, and text size rather than the library's larger defaults.

#### Rejected alternatives

- Do not leave bar values unchanged after lifecycle or age filtering.
- Do not show custom date inputs inline under the chart controls.
- Do not restore multiple large metric cards.
- Do not keep an inline reset action that compresses the grouping controls and search field.
- Do not use oversized default menu rows or mobile chips.

#### Unresolved questions

- Dashboard V2 design approval remains pending after this feedback round.

#### Implementation notes

- Filtered bar values are computed from the active lifecycle and age criteria, while category keys and the y-axis maximum are retained from the selected date range. This preserves the previously approved spatial stability while making the filter effect visible.
- Implemented wheel/trackpad overscroll handling alongside the existing touch gesture. At mobile width, a downward overscroll at the top reveals one compact 44 px search/filter row; upward scrolling removes the row from layout and the accessibility tree.
- Lifecycle legend controls and open-age rows now toggle with functional state updates so the selection persists while live incident refreshes continue. Both filters update the chart and incident list.
- The desktop/tablet control row now uses compact date and operation dropdowns, compact menu options, a wider search field, and no reset action. Custom dates open in a dialog and are applied only after a valid start/end choice.
- Historical implementation note: the metric card grid was briefly replaced by a shallow total/status strip, which Section 12.11 subsequently removed. The table rebalancing and 28 px mobile filter-sheet chips remain approved.
- Browser verification passed at 919 x 863 and 351 x 863 with no horizontal overflow. Lifecycle selection changed the rendered chart series, the open-age selection remained active and filtered chart/list data, pull-to-reveal opened and closed from wheel/trackpad overscroll, and the mobile filter sheet exposed only 28 px chips. The prior 1440 px desktop check remains valid for the same responsive layout.
- `npm test`, `npm run typecheck`, and `npm run build` passed. The existing non-blocking Vite large-chunk warning remains.

### 12.11 Binding density standard and additive lifecycle filters — 2026-07-22

#### Approved decisions

- The user's compact sizing preference is now a binding project rule in `.interface-design/system.md`, with a mandatory read instruction in `AGENTS.md`. Routine control text is 11 px; compact visible controls are 28 px high with 6 px radius and normally 8 px horizontal padding. These measurements apply inside dialogs, drawers, menus, tables, and toolbars rather than only on the main dashboard.
- Remove the chart summary strip completely. It repeats the chart and incident result information and is not replaced by another card.
- Custom-date dialog fields and actions use the same compact type and control measurements as the dashboard. Dialog placement does not justify larger text or padding.
- The alert target includes its title, metadata line, and all whitespace inside the alert cell so the detail opens wherever that target is clicked.
- Lifecycle legend filters are additive. Selecting another lifecycle keeps prior selections active; clicking an active lifecycle removes only that lifecycle. No selected lifecycle means all lifecycle states are shown.

#### Rejected alternatives

- Do not use default MUI input, dialog, button, or menu sizing on Monitor operational surfaces.
- Do not retain or redesign the summary strip again.
- Do not make lifecycle filters mutually exclusive or clear one lifecycle when another is selected.
- Do not limit the incident-detail hit target to the title line.

#### Unresolved questions

- Dashboard V2 design approval remains pending after this feedback round.

#### Implementation notes

- The persistent density contract is intentionally separate from the canonical design documents during active Dashboard V2 iteration. After explicit approval, its reusable rules will be consolidated into `docs/design/design.md` and its Monitor-specific behavior into `docs/product/ux_ui_decisions.md` as previously requested.
- Implemented additive lifecycle state with an empty selection meaning all statuses. Browser review confirmed that Resueltas and Abiertas can remain selected together and that clicking Resueltas again removes only Resueltas.
- Removed the chart summary strip and its mobile summary sentence. The chart begins directly after the compact controls.
- The desktop alert button now fills the alert cell and includes title plus metadata; its measured target was 446.5 x 49.7 px inside a 446.5 x 50.7 px cell. Clicking the metadata line opened the incident detail. The complete mobile incident card is also one detail target.
- Browser-computed dialog measurements are 28 px / 10.88 px for both date inputs and both actions, with 8 px horizontal button padding and a 14 px dialog title. Mobile search, dropdowns, chips, and action buttons also measured 28 px high with approximately 11 px text and no horizontal overflow.
- `npm test`, `npm run typecheck`, and `npm run build` passed. The existing non-blocking Vite large-chunk warning remains.

### 12.12 Export action placement — 2026-07-22

#### Approved decisions

- Move the CSV export action from the incident-section header to the application header, where unused utility space is available.
- Keep export as a compact icon-only secondary action with the existing accessible label and filtered-result export behavior.

#### Rejected alternatives

- Do not keep a duplicate export action in the incident-section header.
- Do not add a labeled export button that increases header height or competes with the dashboard title.

#### Unresolved questions

- Dashboard V2 design approval remains pending after this feedback round.

#### Implementation notes

- The export action continues to call the existing client-side CSV export function and therefore preserves the current filtered incident scope and authorization behavior.
- Browser verification at 739 x 863 and 351 x 863 confirmed one 40 x 40 px accessible header target, no duplicate incident-section export action, and no horizontal overflow. `npm run typecheck` and `npm run build` passed; the existing non-blocking Vite large-chunk warning remains.

### 12.13 Expanding desktop search — 2026-07-22

#### Approved decisions

- On desktop and tablet, focusing the inline search expands it left across the complete chart-control row so the operator can read and edit a longer query.
- While search is expanded, grouping chips and date/operation controls are visually hidden and unavailable for interaction because they are not needed during query entry.
- Enter applies the current query and returns search to its compact width. Escape or moving focus away also restores the original control row.
- Keep the compact 28 px height and 11 px text in both collapsed and expanded states.

#### Rejected alternatives

- Do not add another search row or increase permanent dashboard height.
- Do not leave the grouping chips visible underneath an expanded search field.
- Do not change the existing mobile pull-to-reveal and filter-drawer search behavior.

#### Unresolved questions

- Dashboard V2 design approval remains pending after this feedback round.

#### Implementation notes

- The search field is positioned over the existing toolbar rather than reflowing chart content. A 180 ms compact-to-full-width transition opens from right to left; the covered control group leaves the visual and interaction layers during search.
- Browser verification at 919 x 863 and 739 x 863 confirmed 28 px / 10.88 px search sizing, full-row expansion without horizontal overflow, hidden and non-interactive covered controls, preserved query text, and restoration of the compact toolbar after Enter. `npm run typecheck` and `npm run build` passed; the existing non-blocking Vite large-chunk warning remains.

### 12.14 Custom range, chart headroom, and advanced filters — 2026-07-22

#### Approved decisions

- A custom date range has an explicit compact clear action. Selecting `Personalizado` again reopens its range picker instead of leaving the user in an uneditable state.
- Use the shadcn range-picker interaction pattern: a compact date control opens an anchored popover containing one range calendar. The range is applied when its end date is selected.
- Display the chosen custom dates inside the date control. The chart subtitle identifies a custom period but does not repeat the dates above the controls.
- The chart y-axis always reserves at least one complete grid step above the tallest stack so its value label cannot overlap the control row.
- The expanded desktop search exposes a compact `Filtros avanzados` action on its right. It opens the same mixed filter surface used on mobile so date, lifecycle, operation, age, and grouping filters can be combined without a second filter model.
- Rename the mobile mixed-filter surface from `Buscar y filtrar` to `Filtros avanzados`.

#### Rejected alternatives

- Do not retain the two-native-input custom-date modal.
- Do not repeat custom dates in the chart subtitle or place date fields above the toolbar.
- Do not allow the tallest stack or its label to reach the chart toolbar.
- Do not create a separate desktop-only advanced-filter system.

#### Unresolved questions

- Dashboard V2 design approval remains pending after this feedback round.

#### Implementation notes

- The referenced shadcn component informed the Popover plus Calendar composition and the single-calendar range-selection behavior. The implementation uses `react-day-picker` within the existing MUI surface and existing Monitor tokens; it does not introduce shadcn styling or new product rules.
- The same range state and existing filter state drive desktop, mobile, chart, and incident results.
- Browser verification confirmed the two-click range selection, dates inside the compact control, explicit custom-range clearing, a five-step chart scale with one step of headroom, and the shared `Filtros avanzados` surface from both desktop search and the mobile header.
- Initial responsive review passed at 919 x 863, 739 x 863, and 351 x 863 in the preset-range state. The later custom-range collision invalidated that state-specific conclusion and is superseded by section 12.15. `npm test`, `npm run typecheck`, and `npm run build` passed; the existing non-blocking Vite large-chunk warning remains.

### 12.15 Custom-range toolbar collision — 2026-07-22

#### Approved decisions

- The date-range control keeps the same fixed 112 px footprint for preset and custom ranges; changing the range must not move, cover, or partially obscure an adjacent grouping chip.
- Format a same-month custom range compactly inside the control, for example `11–14 jun.`. Preserve the complete dates in the accessible name.
- In the custom state, omit the redundant dropdown chevron so the dates and explicit clear action fit at the established 28 px control height and 11 px text size. Clicking the dates still reopens the range menu.

#### Rejected alternatives

- Do not widen the date control when a custom range is selected.
- Do not solve the collision by shrinking routine text below the binding 11 px size, wrapping the toolbar, or hiding another grouping option.

#### Unresolved questions

- Dashboard V2 design approval remains pending after this feedback round.

#### Implementation notes

- This decision supersedes the variable 112/174 px range-control width introduced in section 12.14.
- Browser-computed desktop measurements in the reported custom-range state are: 112 px total date-control footprint, 28 px visible height, 10.88 px text, and a 5 px gap after the complete `Tipo de error` chip. No control overlap or partial chip clipping remains.
- Document width matched the viewport at 919, 739, and 351 px. `npm test`, `npm run typecheck`, and `npm run build` passed; the existing non-blocking Vite large-chunk warning remains.

### 12.16 Fresh custom-range selection state — 2026-07-22

#### Approved decisions

- Opening `Personalizado` from a preset period starts with no dates selected.
- The first calendar click selects only the start date. The second selects the end date and applies the completed range without closing the calendar.
- Reopening an already applied custom period may display its saved range for context, but the first new click always replaces it with a new start date rather than acting as an end-date selection.
- After a completed range, the third click resets the draft and becomes the start date of the next range; the fourth click becomes its end date, continuing the same predictable two-click cycle.

#### Rejected alternatives

- Do not seed a new custom selection with the hidden default 30-day draft range.
- Do not make the first click on a fresh custom calendar remove or shorten a preselected range.
- Do not treat the first click after opening an existing custom period as the end of its saved range.
- Do not close the calendar automatically after the end date is selected, because that prevents the next click from restarting the cycle.

#### Unresolved questions

- Dashboard V2 design approval remains pending after this feedback round.

#### Implementation notes

- The two-click phase is held in a synchronous interaction reference and reset whenever the calendar opens or a pair completes. This avoids stale render closures while keeping the visible draft dates controlled by React. No incident, lifecycle, API, or filter semantics changed.
- This feedback supersedes the earlier instruction in this section that the calendar close after the second click.
- Browser verification confirmed the full cycle: click one selected only `1-jul.`, click two applied `1–5 jul.` while leaving the calendar open, click three reset the selection to only `10-jul.`, and click four applied `10–14 jul.`. The picker now uses its range-selection callback so the controlled draft replaces the component's default continuation behavior.
- `npm test`, `npm run typecheck`, and `npm run build` passed; the existing non-blocking Vite large-chunk warning remains.

### 12.17 Final approval and canonical consolidation — 2026-07-22

#### Approved decisions

- The user accepted Dashboard V2 as a good first version and ended active design iteration.
- Reusable density, typography, component, spacing, composition, and progressive-disclosure preferences were promoted to `docs/design/design.md` and numerical tokens to `docs/design/design-system/tokens.json`.
- Monitor-specific chart, filter, search, custom-range, incident-list, detail, export, responsive, and accessibility behavior was promoted to `docs/product/ux_ui_decisions.md`.
- The database-polling persistence concern and contextual-explanation mechanism were classified as architecture and product decisions and moved to `docs/roadmap.md`.
- The supported EmusaSoft work-order route, authoritative named-person source, and explainable incident-relation criteria remain production-contract questions in that roadmap.

#### Rejected or superseded alternatives

- The earlier instruction that `Por qué se generó` must use deterministic templates and must not call an LLM is superseded as a mechanism decision. The approved UI still requires concise, evidence-grounded, catalog-consistent Spanish, but the roadmap must evaluate deterministic, LLM-assisted, and hybrid generation before production selection.
- The old canonical 40 px control defaults, larger dialog-private scale, mutually exclusive lifecycle filtering, summary metrics, permanent mobile filters, redundant analytical cards, and horizontally scrolling Dashboard V2 table are superseded by the final compact behavior.
- Historical approval-pending statements in Sections 12.3 and 12.5–12.16 are closed by this final approval.

#### Unresolved questions moved to the roadmap

- Which successful and failed poll-cycle diagnostic records must be stored, aggregated, or expired at production cadence.
- Whether contextual incident explanations use deterministic composition, LLM assistance, or a hybrid, including grounding, privacy, security, latency, cost, audit, persistence, and fallback requirements.
- Which supported EmusaSoft frontend route may open a work order.
- Which authoritative source supplies a named responsible person when evidence contains only a role or area.
- Which explicit relationship types justify displaying related incidents; sharing a work order alone is insufficient.

#### Implementation notes

- `.interface-design/system.md` remains the concise enforcement checklist and now points to the canonical design, token, and UX/UI files.
- `AGENTS.md` requires those canonical files before future Monitor UI work and points to this archive as historical evidence.
- Phase 4B dynamic-scenario work was not changed. Dashboard approval closes the design gate but does not itself begin Phase 5.

## 13. Acceptance criteria

Dashboard V2 is ready for user review when:

1. the redundant title/subtitle is gone;
2. the header and filter area are visibly shallower than the current Phase 4 design;
3. common filters fit on one compact desktop line and active selections appear as chips;
4. secondary filters can be hidden without losing awareness of active state;
5. the primary date chart and compact lifecycle controls communicate status without any separate summary or KPI band;
6. chart-segment drill-down updates all dashboard content and can be reset;
7. worker, OT, machine, operation, shift, and error-type grouping remains available;
8. the incident result presentation never requires horizontal scrolling;
9. report/CSV export is compact and visually secondary;
10. desktop, tablet, and mobile layouts pass browser review;
11. loading, empty, unavailable, live-update, and incident-detail behavior still works;
12. keyboard, focus, contrast, and screen-reader behavior are verified; and
13. `npm test`, `npm run typecheck`, and `npm run build` pass.

User approval of the browser-reviewable dashboard remains the Phase 4A exit gate.

## 14. Starter prompt for the new Codex task

```text
Historical starter prompt: redesign the Monitor dashboard according to the then-active handoff, now archived at `docs/archive/dashboard_v2_design_handoff.md`.

Treat that handoff, the workspace design-system files, and the existing product and technical contracts as authoritative. Preserve the working Phase 4 incident APIs, authorization, live updates, lifecycle semantics, evidence access, and responsive behavior, but replace the unapproved Phase 4 dashboard presentation with the approved compact, minimalist direction.

Before editing, inspect every file listed in the handoff's “Read before editing” section. Briefly state the implementation plan, then implement the redesign and verify it on desktop, tablet, and mobile. Do not change Phase 4B dynamic-scenario work or introduce new product rules.
```
