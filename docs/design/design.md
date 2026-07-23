---
name: Monitor
description: A precise, trustworthy interface system for EMUSA's factory and inventory operations.
colors:
  emusa-navy: "#00246B"
  emusa-navy-active: "#001B52"
  action-cyan: "#007ACC"
  action-cyan-hover: "#006BA8"
  process-green: "#008A49"
  signal-cyan: "#01A2C6"
  canvas: "#F5F5F5"
  surface: "#FFFFFF"
  selected-soft: "#E2EBFD"
  border: "#E0E0E0"
  text-muted: "#4D608A"
  destructive: "#E11D48"
  warning: "#F97316"
  chart-violet: "#8B5CF6"
  chart-magenta: "#D946EF"
typography:
  display:
    fontFamily: "Montserrat, system-ui, sans-serif"
    fontSize: "3.25rem"
    fontWeight: 700
    lineHeight: 1.23
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Montserrat, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Montserrat, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Montserrat, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Montserrat, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.02em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "48px"
  4xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.action-cyan}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
    height: "28px"
  button-primary-hover:
    backgroundColor: "{colors.action-cyan-hover}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
    height: "28px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.emusa-navy}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
    height: "28px"
  input-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.emusa-navy}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
    height: "28px"
  card-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.emusa-navy}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Design System: Monitor

## 1. Overview

**Creative North Star: "The Connected Production Floor"**

Monitor combines the visual authority of EMUSA's corporate site with the quiet, soft-futuristic interaction grammar of Vescrow 1.2. EMUSA owns the identity: deep navy, bright process cyan, technical green, Montserrat typography, industrial imagery, and a global manufacturing voice. Vescrow contributes the product layer: pale selected states, rounded controls, clear cards, compact form patterns, restrained elevation, and a 4px spacing foundation.

The system should feel precise, calm, and operational. It is designed for people monitoring production, inventory, quality, and logistics for long periods. Brand color identifies structure and state; it never competes with the data. The interface rejects decorative gradients, excessive card nesting, glass effects, oversized radii, and marketing language inside operational workflows.

**Key Characteristics:**

- EMUSA navy anchors navigation, headings, and critical structure.
- Cyan identifies primary actions, active controls, and informational state.
- Green is reserved for healthy production, completion, and verified quality.
- Montserrat provides continuity between corporate and operational surfaces.
- Dense information is organized with whitespace, dividers, and alignment before cards.
- Motion is brief, functional, and always communicates state.

## 2. Colors

The palette preserves EMUSA's blue-green identity while adopting Vescrow's soft surfaces and clear selected states.

### Primary

- **EMUSA Navy** (`#00246B`): navigation, major headings, table headers, critical structure, and primary text.
- **Action Cyan** (`#007ACC`): primary actions, active navigation, selected controls, links, and focus indicators.
- **Action Cyan Hover** (`#006BA8`): hover and pressed preparation state for cyan controls.

### Secondary

- **Process Green** (`#008A49`): success, completed production, passed quality checks, and healthy inventory states.
- **Signal Cyan** (`#01A2C6`): secondary data series, informational indicators, and process-flow highlights.

### Tertiary

- **Chart Violet** (`#8B5CF6`), **Chart Magenta** (`#D946EF`), and **Warning Orange** (`#F97316`): chart-series separation and exceptional states only. They are not general decoration.

### Neutral

- **Canvas** (`#F5F5F5`): application background.
- **Surface** (`#FFFFFF`): tables, panels, menus, forms, and content regions.
- **Selected Soft Blue** (`#E2EBFD`): selected rows, tabs, chips, and low-emphasis information.
- **Border Gray** (`#E0E0E0`): dividers, control outlines, and table rules.
- **Muted Navy** (`#4D608A`): secondary text; use only where it maintains 4.5:1 contrast.
- **Destructive Red** (`#E11D48`): errors, destructive actions, and failed states.

**The Brand Authority Rule.** EMUSA navy and cyan own the interface. Vescrow's original violet-pink chart colors may separate data series, but must never replace EMUSA's structural colors.

**The State Before Decoration Rule.** Saturated colors communicate action, selection, status, or data identity. If a color has no functional meaning, remove it.

## 3. Typography

**Display Font:** Montserrat (with `system-ui, sans-serif` fallback)  
**Body Font:** Montserrat (with `system-ui, sans-serif` fallback)  
**Label Font:** Montserrat (with `system-ui, sans-serif` fallback)

**Character:** Technical, clear, international, and familiar. A single family preserves EMUSA's identity and keeps dense operational screens coherent. Vescrow's Bricolage Grotesque is not carried forward because EMUSA's established brand typography takes precedence.

### Hierarchy

- **Display** (700, `52px`, `64px` line-height): public-facing hero or executive overview only; never routine dashboard labels.
- **Headline** (700, `32px`, `1.3` line-height): public-facing or executive report headings only; not routine Monitor product screens.
- **Application title** (600–700, `20px`, `1.4` line-height): the application name or a true page-level heading only.
- **Section title** (600, `14px`, `1.4` line-height): panels, dialogs, drawers, and grouped table regions.
- **Explanatory body** (400, `16px`, `1.5` line-height): prose explanations and longer descriptions; prose width should remain within 65–75ch.
- **Primary operational data** (400–700, `12px`, `1.4–1.5` line-height): table primary text, incident titles, identifiers, and important compact values.
- **Routine UI** (400–600, `11px`, `1.4` line-height): controls, filters, menu items, input text, timestamps, table metadata, and short navigation labels. Uppercase is reserved for short corporate or category labels.
- **Metric** (700, `30–36px`, `1.15` line-height): exceptional standalone reporting figures only; use tabular numbers and never add a metric treatment that merely repeats the chart, legend, or result count.

**The Operational Scale Rule.** Product screens use fixed sizes, not fluid display typography. Data density must remain stable across panels and sidebars.

### Compact product scale

Monitor's operational interface uses one compact scale across toolbars, tables, menus, dialogs, drawers, and mobile filter surfaces:

- routine controls, filter labels, menu items, input text, table metadata, and action labels use `11px` type;
- table primary text uses `12px` type;
- section and dialog titles use `14px` type;
- compact visible controls are `28px` high, use a `6px` radius, and normally use `8px` horizontal padding;
- menu options have a `28px` minimum visible row height; and
- dialog fields and actions do not introduce a larger private scale.

Larger typography is reserved for the application title, a true page heading, or explanatory prose. Library defaults must not silently enlarge nested inputs, selects, chips, buttons, or menu items. Where touch accessibility requires a larger hit area, enlarge the invisible or surrounding target without enlarging the visible control.

## 4. Elevation

The system is flat by default. Depth comes first from canvas-versus-surface contrast, borders, and spatial grouping. Shadows appear only on floating menus, dialogs, drag states, and clearly lifted interactive elements.

### Shadow Vocabulary

- **Surface Low** (`0 1px 3px rgba(0,0,0,.08)`): floating cards or temporary elevated controls.
- **Surface Hover** (`0 4px 12px rgba(0,0,0,.12)`): hover elevation for truly clickable tiles, not static information panels.
- **Navigation** (`0 2px 8px rgba(0,0,0,.06)`): sticky top bars when separation from scrolling content is necessary.
- **Dialog** (`0 16px 40px rgba(0,36,107,.16)`): modal or popover elevation above a dimmed backdrop.

**The Flat-by-Default Rule.** Static dashboard panels use either a border or a shadow, never both as decoration. Nested cards are prohibited.

## 5. Components

### Buttons

- **Shape:** compact rounded rectangle (`6px`), not a full pill.
- **Primary:** cyan background, white text, `28px` visible height, `4px 8px` padding, 11px label, weight 600.
- **Hover / Focus:** darken to `#006BA8`; use a `2px #3D7EFF` focus ring with `2px` offset. Active state may translate by at most `1px`.
- **Secondary:** white surface, navy text, `1px #D8DDE8` border, no wide shadow.
- **Destructive:** red only for destructive actions on Monitor-owned data, such as an authorized message deletion. Monitor exposes no control for irreversible factory or inventory changes.

### Chips

- **Style:** compact rounded rectangle, `28px` visible height, `6px` radius, normally `8px` horizontal padding, and 11px text. Full-pill geometry is not permitted for rectangular chips, filters, lifecycle selectors, or status labels.
- **Unselected:** white background, navy text, subtle navy-tinted border.
- **Selected:** `#E2EBFD` background with navy or cyan text.
- **Status:** green, orange, or red tints must include a text label or icon; never depend on color alone.

### Cards / Containers

- **Corner Style:** `16px` maximum for dashboard cards.
- **Background:** white on `#F5F5F5` canvas.
- **Shadow Strategy:** flat at rest; optional low shadow only when clickable or floating.
- **Border:** `1px #E0E0E0` when separation is otherwise unclear.
- **Internal Padding:** `16px` default; reduce to the 4px spacing rhythm when a dense table or analytical surface benefits from it.
- **Composition:** prefer sections, dividers, and aligned rows over a grid of identical cards.
- **Information economy:** do not add standalone KPI cards or summary strips that repeat values already visible in a chart, status control, or result count.

### Inputs / Fields

- **Style:** white background, navy text, `1px #D8DDE8` border, `6px` radius, and `28px` visible height for operational controls.
- **Focus:** cyan border plus a visible `2px` ring; do not remove the native focus indication without replacement.
- **Error / Disabled:** error uses red border plus written guidance; disabled uses a neutral fill and retains readable text.

### Navigation

- Desktop navigation uses EMUSA navy as the structural anchor with white labels and cyan active state.
- The application shell may use a navy sidebar or navy top bar, but not both at equal visual weight.
- Active destinations require at least two signals: color plus weight, indicator, or background.
- Collapse secondary navigation before compressing labels below readable sizes.

### Tables and Data Visualization

- Tables use sticky headers, tabular numerals, 44px minimum row height, restrained zebra or selected-row tinting, and explicit sort state.
- Charts lead with cyan and green. Violet, magenta, and orange follow only when more series are required.
- Every chart includes a textual summary, accessible labels, units, and a clear time range.
- Loading uses skeleton rows or chart scaffolds; empty states explain what action or condition will produce data.

## 6. Do's and Don'ts

### Do:

- **Do** preserve EMUSA navy (`#00246B`), cyan (`#007ACC`), green (`#008A49`), and Montserrat as the identity foundation.
- **Do** use Vescrow's soft selected states, compact controls, and 4px spacing rhythm for operational UI.
- **Do** use fixed product typography, consistent component states, and tabular numbers for metrics.
- **Do** reserve color for action, status, selection, and data identity.
- **Do** use real EMUSA production, material, machinery, packaging, and workforce imagery on brand-facing surfaces.
- **Do** author all current user-visible copy in Spanish and keep layouts ready for future English and Portuguese expansion without truncation or layout breakage.
- **Do** provide hover, focus, active, disabled, loading, empty, success, warning, and error states.
- **Do** place uncommon controls in a menu, popover, drawer, dialog, or temporary expansion instead of reserving permanent vertical space.
- **Do** keep entire visible row or cell targets interactive when the row opens one destination.

### Don't:

- **Don't** replace EMUSA's identity with Vescrow's violet or pink accents.
- **Don't** use gradients, glassmorphism, decorative glows, or repeating grid backgrounds.
- **Don't** use cards inside cards or identical card grids when rows, sections, or tables are clearer.
- **Don't** exceed `16px` radius on dashboard cards; use the compact `6px` radius for rectangular controls, filters, lifecycle selectors, chips, and status labels. Reserve circular geometry for genuinely circular elements such as status dots, avatars, and unread counters.
- **Don't** pair a `1px` border with a wide decorative shadow on the same component.
- **Don't** use tiny uppercase labels above every section; category labels must carry real information.
- **Don't** use marketing claims inside operational controls, alerts, tables, or error messages.
- **Don't** communicate status through color alone.
- **Don't** invent custom form behavior, decorative motion, or non-standard modals where familiar controls work.
- **Don't** accept larger library defaults inside dialogs, drawers, menus, or mobile sheets.
- **Don't** repeat chart totals in large cards or add permanent controls that displace the operational data.
