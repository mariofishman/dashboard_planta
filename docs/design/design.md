# Monitor Design System

`design-system/tokens.json` is the sole source for color, typography, spacing, radius, control, shadow, and motion values. `tokens.css` and `packages/design-system/` consume those values. This document defines how to use the named tokens without repeating their literals.

## Direction

**Creative North Star:** The Connected Production Floor.

Monitor combines EMUSA's industrial authority with a calm, compact product interface. The system must feel precise, dependable, technical, and comfortable during long monitoring sessions.

- EMUSA navy anchors navigation and structure.
- Cyan identifies actions, selection, links, and focus.
- Green indicates verified health, completion, or success.
- Montserrat provides one coherent product and corporate type family.
- Dense information uses alignment, whitespace, and dividers before adding containers.
- Motion is brief, functional, and understandable when disabled.

Avoid decorative gradients, glass effects, glows, repeated card grids, oversized radii, and marketing language inside operational workflows.

## Color roles

Use semantic tokens rather than primitive colors in product code:

- `semantic.color.structure` — navigation, headings, table structure, and primary framing.
- `semantic.color.action` and `actionHover` — primary action, selection, links, and focus.
- `semantic.color.canvas`, `surface`, and `border` — page hierarchy and separation.
- `semantic.color.textPrimary`, `textSecondary`, and inverse variants — readable content hierarchy.
- `semantic.color.lifecycleOpen`, `lifecycleResolved`, and `lifecycleClosed` — incident lifecycle only.
- `color.chart.*` — ordered data-series separation, never decoration.

Code-specific alert labels are textual descriptions rather than lifecycle states. Color must never be their only distinguishing signal.

## Typography

Use the tokenized Montserrat family throughout.

- Display and headline roles are reserved for public-facing or executive material.
- An application title or true page heading may use a larger role.
- `semantic.typography.sectionTitle` identifies panels, dialogs, drawers, and grouped table regions.
- `semantic.typography.body` is for prose and explanations.
- `semantic.typography.primaryData` is for identifiers, incident titles, and important compact values.
- `semantic.typography.routine` is for controls, filters, menu items, timestamps, table metadata, and short labels.
- Metrics are exceptional reporting figures and must not repeat a chart, legend, or result count.

Operational screens use fixed product typography rather than fluid display sizing. Library defaults must not enlarge nested inputs, selects, buttons, chips, menus, or dialogs.

## Density and accessibility

- Use `semantic.control.visibleHeight`, `paddingInline`, and `radius` across compact controls.
- Use the semantic desktop and touch hit-target tokens without enlarging the visible compact control.
- Prevent invisible hit targets from overlapping adjacent controls.
- Body and large text must meet WCAG contrast requirements.
- Keyboard focus must always be visible.
- Status always combines color with text, iconography, pattern, or position.
- Respect reduced-motion preferences.
- Current UI labels are Spanish; layouts must tolerate future English and Portuguese expansion.

## Elevation

The interface is flat by default. Establish hierarchy through canvas/surface contrast, borders, spacing, and alignment.

- `shadow.low` — temporary or genuinely elevated controls.
- `shadow.hover` — interactive tiles only.
- `shadow.nav` — sticky navigation separation when needed.
- `shadow.dialog` — dialogs and popovers.

Static panels use either a border or a shadow, not both as decoration. Nested cards are prohibited.

## Components

### Buttons and compact controls

- Use compact rounded rectangles, never pill-shaped rectangular controls.
- Primary actions use semantic action and inverse-text tokens.
- Secondary actions use surface, structure, and border tokens.
- Destructive styling applies only to destructive Monitor-owned actions; Monitor exposes no EmusaSoft mutation.
- Active feedback may use a restrained scale or translation defined by motion tokens.

### Chips and status labels

- Use the shared compact control tokens.
- Unselected chips use surface, structure, and border roles.
- Selected chips use the selected-surface role.
- Full-pill geometry is reserved for genuinely circular elements such as dots, avatars, and unread counters.

### Containers

- Use `radius.lg` only where a dashboard container needs it.
- Prefer sections, dividers, aligned rows, and tables over grids of identical cards.
- Do not add KPI cards or summary strips that repeat visible chart or result information.

### Inputs

- Use surface, text, border, compact-control, and focus roles.
- Errors combine the danger role with written guidance.
- Disabled fields retain readable content.

### Navigation

- Use structure color as the primary shell anchor.
- Do not give a sidebar and top bar equal visual weight.
- Active destinations require at least two signals.
- Collapse secondary navigation before compressing labels below the tokenized routine size.

### Tables and charts

- Tables use sticky headers, tabular numerals, explicit sort state, and accessible row targets.
- Charts lead with the ordered chart-token palette and use consistent colors for the same concepts.
- Every chart includes units, time range, accessible description, and source status.
- Loading states preserve structure; empty states explain what produces data.

## Rules

Do:

- use semantic tokens in application code;
- preserve EMUSA's structural identity;
- provide hover, focus, active, disabled, loading, empty, success, warning, and error states;
- keep full rows or cells interactive when they open one destination;
- place uncommon controls in temporary surfaces instead of reserving permanent space; and
- use real EMUSA production and material imagery on brand-facing surfaces.

Do not:

- copy token literals into documentation or application components;
- replace EMUSA structure with chart accents;
- use gradients, glassmorphism, decorative glows, or repeating grid backgrounds;
- nest cards or use decorative shadows;
- communicate status through color alone;
- invent custom controls where familiar accessible controls work;
- allow library defaults to create a second density scale; or
- repeat chart totals in separate summary cards.
