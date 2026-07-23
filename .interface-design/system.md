# Monitor interface system

This file is the binding implementation checklist for Monitor product UI work. Read it before creating or changing any interface. Canonical visual and interaction rules live in `docs/design/design.md`; primitive and semantic tokens live in `docs/design/design-system/tokens.json`; Monitor screen behavior lives in `docs/ux_ui_decisions.md`. Product code consumes the named `semantic` roles instead of copying primitive values. If this checklist conflicts with one of those canonical files, correct the checklist rather than creating a second design system.

## Direction

- Feel: compact, technical, quiet, and information-first.
- Focal point: operational data and the primary chart, never controls or summary cards.
- Depth: borders-only for static surfaces; shadows only for floating menus and dialogs.
- Spacing base: 4px.

## Compact density contract

- Routine control, filter, menu-item, input, table-meta, and button text: **11px** (`0.6875rem`). Do not allow MUI defaults to enlarge nested input or select text.
- Table primary text: **12px**. Section and dialog titles: **14px**. Larger type is reserved for the app title or a true page-level heading, not filters, dates, modal fields, or action buttons.
- Compact visible controls: **28px high**, **6px radius**, and normally **8px horizontal padding**. Never use the theme's default 40px button/input styling inside dashboard toolbars, filter sheets, menus, or compact dialogs.
- Rectangular filters, lifecycle selectors, chips, status labels, buttons, inputs, selects, and menu items never use full-pill geometry. Circular geometry is limited to true circles such as status dots, avatars, and unread counters.
- Dropdown options: **28px minimum row height** and **11px text**.
- Compact dialog fields and action buttons: **28px high**, **11px text**, **8px horizontal button padding**. Dialog internal padding: **16px**. Do not create a larger modal-specific type or button scale.
- Filter chips may be multi-select. Clicking an inactive status adds it; clicking an active status removes it. No other status is cleared implicitly.
- Keep at least a **40px desktop hit target** and **44px touch target** without enlarging the 28px visible control; use surrounding layout or a non-overlapping invisible target.

## Composition rules

- Do not add standalone KPI or summary cards that repeat values already visible in the chart, legend, or result count.
- A control must earn permanent vertical space. Put uncommon choices in a menu, popover, drawer, or dialog.
- Entire visible alert targets are clickable, including title, metadata, and whitespace inside the target.
- Reuse one compact control treatment everywhere. Never accept library defaults merely because the component is inside a dialog, drawer, table, or menu.

## Enforcement checklist

Before declaring a Monitor UI change complete, inspect computed browser measurements for inputs, selects, chips, menu options, and buttons. A screenshot alone is insufficient. Verify desktop, tablet, and mobile, and reject any compact control whose visible height exceeds 28px or whose routine text exceeds 11px unless this file explicitly permits it.
