# Source Reconciliation

## Authority model

- **EMUSA landing page:** authoritative for brand identity, corporate voice, imagery, typography, and institutional color.
- **Vescrow 1.2:** authoritative for product-interface softness, selected states, control patterns, spacing foundation, forms, tables, and chart expansion colors.

## Extracted source signals

### Vescrow 1.2

- Font: Bricolage Grotesque.
- Base spacing: 4px.
- Primary: `#03035E`.
- Background: `#FDFCFE`.
- Surface: `#FFFFFF`.
- Secondary: `#E2EBFD` with `#0248D4` text.
- Muted: `#F0EEF2` with `#635D69` text.
- Border: `#E6E1E9`.
- Radius base: 20px; controls commonly render at 18px.
- Shadows: soft 4px-offset vocabulary.
- Charts: blue, violet, magenta, rose, and orange.

### EMUSA

- Font: Montserrat.
- Navy: `#00246B`.
- Cyan: `#007ACC`.
- Green: `#008A49`.
- Signal cyan: `#01A2C6`.
- Background: `#F5F5F5`.
- Surface: `#FFFFFF`.
- Border gray: `#E0E0E0`.
- Buttons: 20px radius on the marketing site.
- Cards: 30px radius on the marketing site.
- Voice: strategic partner, technological capability, regional presence, global standards, functional and efficient packaging.
- Imagery: production processes, packaging categories, facilities, customers, certifications, and workforce.

## Reconciliation decisions

1. Montserrat replaces Bricolage Grotesque because EMUSA's established identity has priority.
2. EMUSA navy, cyan, and green replace Vescrow's navy-blue identity as structural and semantic colors.
3. Vescrow's `#E2EBFD` becomes the soft selected state because it supports EMUSA cyan without competing with it.
4. Product cards are capped at 16px radius. The source sites' 20–30px radii are reduced for a denser operational interface.
5. Vescrow violet, magenta, and orange remain available only for multi-series charts and exceptional states.
6. Emusa's large section spacing is translated into a 4px product spacing scale rather than copied literally.
7. Marketing imagery and corporate voice remain in brand-facing surfaces; operational screens use concise labels and real manufacturing terminology.

## Extraction note

The installed extraction CLI was invoked for both URLs, but its Chromium process was blocked by the current sandbox. The same rendered pages were inspected through the Codex in-app browser. Tokens above come from computed CSS custom properties and rendered component styles, not from screenshots alone.

