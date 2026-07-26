# Monitor Interface System

Before designing, implementing, or reviewing Monitor UI, read:

1. `docs/product/ux_ui_decisions.md`
2. `docs/design/design.md`
3. `docs/design/design-system/tokens.json`
4. `docs/design/brand_guidelines.md`

`tokens.json` is the sole value source. Use its semantic typography and control roles instead of copying literal sizes, spacing, radii, colors, or motion values.

Verify computed browser measurements against those tokens on desktop, tablet, and mobile. Check keyboard focus, hit targets, contrast, overflow, reduced motion, loading, empty, unavailable, and error states. A screenshot alone is insufficient.

## Form controls

- Reuse the shared design-system components and preserve their global compact label behavior.
- Every visible label remains floated/notched in the same position when its control is empty, filled, focused, read-only, disabled, or in error.
- Placeholders are optional value hints and never replace labels.
- Do not set a field-level label rule that restores library automatic placement or allows an empty label to enter the value line.
- Browser verification must cover empty and filled text inputs, selects, autocompletes, date fields, and text areas. Any label overlap, clipping, or vertical shift between states is a defect.
