# EMUSA Operations Brand Guidelines

## Brand foundation

EMUSA Operations extends EMUSA's corporate identity into production and inventory software. The interface must feel like the control layer of a global packaging manufacturer: precise, dependable, technically capable, and close to the realities of the plant floor.

**Brand promise:** Turn factory activity into clear, actionable operational knowledge.

**Personality:** precise, trustworthy, global, technical, practical, calm.

**Creative North Star:** The Connected Production Floor.

## Brand voice

Write with direct operational clarity. Lead with the fact, state, or required action. Prefer concrete manufacturing language over abstract claims.

### Voice principles

- **Precise:** Name the work order, line, material, quantity, unit, timestamp, and responsible area when relevant.
- **Actionable:** Alerts explain what happened, its operational effect, and the next safe action.
- **Calm:** Urgency comes from severity and evidence, not exclamation marks or alarming prose.
- **Global:** Keep Spanish, English, and Portuguese translations structurally equivalent and easy to scan.
- **Human:** Use familiar plant vocabulary without bureaucratic or overly technical filler.

### Examples

| Avoid | Use |
|---|---|
| Something went wrong | Inventory update failed. The previous quantity is still active. |
| Critical problem! | Production line 3 has been stopped for 18 minutes. |
| Optimize your workflow | Review the two work orders waiting for material. |
| No data | No production has been reported for this shift. |

### UI writing rules

- Buttons use verbs: `Create work order`, `Confirm receipt`, `Export report`.
- Statuses use short, stable terms: `Scheduled`, `In progress`, `Blocked`, `Completed`, `Cancelled`.
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
- Product identity may add the descriptor `Operations`, but it must remain typographically secondary to EMUSA.

## Accessibility and localization

- Body text requires at least 4.5:1 contrast; large text requires at least 3:1.
- Keyboard focus must always be visible.
- Controls require at least a 40px desktop target and 44px touch target where mobile use is expected.
- Do not encode meaning through color alone.
- Layouts must tolerate Spanish, English, and Portuguese expansion without truncation.
- Respect `prefers-reduced-motion`; operational state must remain understandable without animation.

## Governance

- `design.md` is the normative design-language document.
- `design-system/tokens.json` is the machine-readable token source.
- `design-system/tokens.css` is the web implementation output.
- New components must reuse existing tokens before adding new values.
- New tokens require a named semantic role and at least two justified uses.
- Review brand consistency, accessibility, responsive behavior, localization, and all interactive states before release.
