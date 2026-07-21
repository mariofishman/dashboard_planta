# ADR 0005: Material UI with Monitor-owned composition

**Status:** accepted; supersedes ES-07  
**Date:** 2026-07-20

## Decision

Monitor uses Material UI behind a small Monitor component layer. It imports tokens from `docs/design/design-system/tokens.json` and follows `docs/design/design.md`, `docs/design/brand_guidelines.md`, and `docs/ux_ui_decisions.md`.

Monitor must not import, connect to, or depend on `emusa-ui`. It may visually coexist with EmusaSoft, but its component code, theme, composition, accessibility behavior, and release lifecycle remain Monitor-owned.

## Consequences

- Remove ES-07 as a delivery dependency.
- Keep official EmusaSoft logo assets and any future supported navigation adapter separate from component dependencies.
- Test Spanish copy, keyboard behavior, contrast, 44px mobile targets, reduced motion, and responsive reflow.
