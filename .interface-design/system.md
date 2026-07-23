# Monitor Interface System

Before designing, implementing, or reviewing Monitor UI, read:

1. `docs/product/ux_ui_decisions.md`
2. `docs/design/design.md`
3. `docs/design/design-system/tokens.json`
4. `docs/design/brand_guidelines.md`

`tokens.json` is the sole value source. Use its semantic typography and control roles instead of copying literal sizes, spacing, radii, colors, or motion values.

Verify computed browser measurements against those tokens on desktop, tablet, and mobile. Check keyboard focus, hit targets, contrast, overflow, reduced motion, loading, empty, unavailable, and error states. A screenshot alone is insufficient.
