# Monitor Brand Guidelines

## Brand foundation

Monitor extends EMUSA's corporate identity into production and inventory software. The interface must feel like the control layer of a global packaging manufacturer: precise, dependable, technically capable, and close to the realities of the plant floor.

**Brand promise:** Turn factory activity into clear, actionable operational knowledge.

**Personality:** precise, trustworthy, global, technical, practical, calm.

**Creative North Star:** The Connected Production Floor.

## Brand voice

Write with direct operational clarity. Lead with the fact, state, or required action. Prefer concrete manufacturing language over abstract claims.

### Voice principles

- **Precise:** Name the work order, line, material, quantity, unit, timestamp, and responsible area when relevant.
- **Actionable:** Alerts explain what happened, its operational effect, and the next safe action.
- **Calm:** Urgency comes from severity and evidence, not exclamation marks or alarming prose.
- **Global:** Current UI copy is Spanish. Keep layouts ready for structurally equivalent future English and Portuguese translations without mixing languages in the current product.
- **Human:** Use familiar plant vocabulary without bureaucratic or overly technical filler.

### Examples

| Avoid | Use |
|---|---|
| Algo salió mal | No se pudo actualizar la información. Se muestran los últimos datos disponibles. |
| ¡Problema crítico! | La línea de producción 3 lleva detenida 18 minutos. |
| Optimiza tu flujo de trabajo | Revisa las dos órdenes de trabajo que esperan material. |
| Sin datos | No se ha reportado producción para este turno. |

### UI writing rules

- Buttons use Spanish verbs appropriate to Monitor's boundary: `Ver detalles`, `Copiar identificador`, `Enviar mensaje`, `Cerrar sin resolución`, and `Exportar reporte`. Monitor does not show unsupported EmusaSoft navigation actions; operational corrections occur separately in EmusaSoft.
- User-visible incident lifecycle states use `Abierta`, `Resuelta`, and `Cerrada sin resolución`. Code-specific descriptive labels such as `Error`, `Por vencer`, `Alerta`, and `Error posible` remain separate from lifecycle state.
- Dates use an explicit locale and timezone where ambiguity matters.
- Quantities always include units.
- Avoid marketing claims inside dashboards, forms, errors, and alerts.
- Avoid exclamation marks except in quoted source content.

## Visual identity

EMUSA navy is the structural color. Cyan represents action and active state. Green represents verified health, completion, and quality. White and light gray provide long-session readability. Vescrow's violet and magenta are retained only as secondary chart-series colors.

Use Montserrat across product and brand surfaces. Weight and scale create hierarchy; do not introduce a second display font into the operational UI.

## Imagery direction

Use documentary industrial imagery with real process context:

- Printing, lamination, extrusion, slitting, pouching, inspection, and packing processes.
- Flexible-packaging materials shown at useful scale: film, rolls, inks, seals, valves, and finished packs.
- Operators and technicians shown working safely with real equipment.
- Wide plant views for scale; macro material details for precision.
- Finished packaging shown in real commercial or logistics contexts.
- Regional operations, facilities, and teams when communicating EMUSA's global presence.

Photography should feel controlled, clean, technical, and credible. Prefer cool-neutral grading with faithful material colors. Navy overlays are acceptable when text must sit over imagery; keep the subject legible.

Do not use generic office teamwork, abstract AI networks, fake factories, neon machinery, decorative 3D blobs, or images that misrepresent safety practices.

## Data visualization

- Lead with cyan, then green. Add violet, magenta, and orange only as the number of series requires.
- Use red only for failure or destructive meaning.
- Pair every status color with text, iconography, pattern, or position.
- Use direct labels where possible; legends should not force repeated eye travel.
- Use consistent colors for the same operational concepts across screens.
- Charts include units, time range, accessible descriptions, and source freshness.

## Logo and corporate identity use

- Use the official EMUSA logo asset without redrawing, recoloring, stretching, or adding effects.
- Maintain clear space around the logo equal to at least the height of the central `E` mark.
- Prefer the white logo on EMUSA navy and the navy logo on white or light gray.
- Do not place the logo on visually busy imagery without a controlled overlay.
- The product name is `Monitor`. Do not replace it with `EMUSA Operations`, `Monitor Soft`, or another product descriptor.

## Accessibility and localization

- Body text requires at least 4.5:1 contrast; large text requires at least 3:1.
- Keyboard focus must always be visible.
- Controls require at least a 40px desktop target and 44px touch target where mobile use is expected.
- Do not encode meaning through color alone.
- Current labels remain Spanish; layouts must tolerate future English and Portuguese expansion without truncation.
- Respect `prefers-reduced-motion`; operational state must remain understandable without animation.

## Governance

- `design.md` is the normative design-language document.
- `design-system/tokens.json` is the machine-readable token source.
- `design-system/tokens.css` is the web implementation output.
- New components must reuse existing tokens before adding new values.
- New tokens require a named semantic role and at least two justified uses.
- Review brand consistency, accessibility, responsive behavior, localization, and all interactive states before release.
