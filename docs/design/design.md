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
    fontSize: "0.8125rem"
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
    rounded: "{rounded.md}"
    padding: "10px 18px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.action-cyan-hover}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "10px 18px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.emusa-navy}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "10px 18px"
    height: "40px"
  input-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.emusa-navy}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
    height: "40px"
  card-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.emusa-navy}"
    rounded: "{rounded.lg}"
    padding: "24px"
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
- **Headline** (700, `32px`, `1.3` line-height): page titles and major report headings.
- **Title** (600, `20px`, `1.4` line-height): panels, dialogs, and grouped table regions.
- **Body** (400, `16px`, `1.5` line-height): explanations, descriptions, and standard values; prose width should remain within 65–75ch.
- **Compact Body** (400, `14px`, `20px` line-height): table cells, filters, timestamps, and metadata.
- **Label** (600, `13px`, `0.02em` letter-spacing): controls and short navigation labels. Uppercase is reserved for short corporate or category labels.
- **Metric** (700, `30–36px`, `1.15` line-height): important KPIs; use tabular numbers when available.

**The Operational Scale Rule.** Product screens use fixed sizes, not fluid display typography. Data density must remain stable across panels and sidebars.

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

- **Shape:** compact rounded rectangle (`10px`), not a full pill unless the control is a binary filter chip.
- **Primary:** cyan background, white text, `40px` height, `10px 18px` padding, label weight 600.
- **Hover / Focus:** darken to `#006BA8`; use a `2px #3D7EFF` focus ring with `2px` offset. Active state may translate by at most `1px`.
- **Secondary:** white surface, navy text, `1px #D8DDE8` border, no wide shadow.
- **Destructive:** red only for destructive actions on Monitor-owned data, such as an authorized message deletion. Monitor exposes no control for irreversible factory or inventory changes.

### Chips

- **Style:** full pill, compact `6px 12px` padding, 13–14px text.
- **Unselected:** white background, navy text, subtle navy-tinted border.
- **Selected:** `#E2EBFD` background with navy or cyan text.
- **Status:** green, orange, or red tints must include a text label or icon; never depend on color alone.

### Cards / Containers

- **Corner Style:** `16px` maximum for dashboard cards.
- **Background:** white on `#F5F5F5` canvas.
- **Shadow Strategy:** flat at rest; optional low shadow only when clickable or floating.
- **Border:** `1px #E0E0E0` when separation is otherwise unclear.
- **Internal Padding:** `24px` default; `16px` in dense side panels.
- **Composition:** prefer sections, dividers, and aligned rows over a grid of identical cards.

### Inputs / Fields

- **Style:** white background, navy text, `1px #D8DDE8` border, `10px` radius, `40px` minimum height.
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

### Don't:

- **Don't** replace EMUSA's identity with Vescrow's violet or pink accents.
- **Don't** use gradients, glassmorphism, decorative glows, or repeating grid backgrounds.
- **Don't** use cards inside cards or identical card grids when rows, sections, or tables are clearer.
- **Don't** exceed `16px` radius on dashboard cards; reserve full pills for chips and compact selectors.
- **Don't** pair a `1px` border with a wide decorative shadow on the same component.
- **Don't** use tiny uppercase labels above every section; category labels must carry real information.
- **Don't** use marketing claims inside operational controls, alerts, tables, or error messages.
- **Don't** communicate status through color alone.
- **Don't** invent custom form behavior, decorative motion, or non-standard modals where familiar controls work.
