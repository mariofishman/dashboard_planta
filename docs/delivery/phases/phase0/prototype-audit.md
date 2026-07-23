# Phase 0 design-system and prototype audit

**Audited during Phase 0:** `docs/design/`, the then-current `dashboard.html`, `chat-list-final.html`, and `chat-detail.html`

The audited static dashboard was later superseded by the approved Dashboard V2 implementation in `apps/web/`.
**Excluded as deprecated:** historical dashboard, alert-catalog v1-v10, and chat-list 01-04

## Findings

| Priority | Finding | Required backlog item |
|---|---|---|
| P0 | Static prototypes do not expose real loading, stale, offline, reconnecting, authorization-revoked, or partial-source states. | Build shared Material UI states before a production pilot. |
| P0 | Prototype links were unsupported during Phase 0. MCP v5 later exposed route templates whose production contract remains unvalidated. | Keep identifiers as fallback and enable navigation only after Phase 10 validation. |
| P0 | Dashboard chart and filters need semantic and keyboard behavior in the real React implementation. | Provide accessible table/summary equivalents, focus order, and `aria-pressed`/`aria-live`. |
| P1 | Chat long-press, menus, focus return, escape behavior, and reduced motion need production tests. | Add keyboard, touch, screen-reader, and reduced-motion interaction tests. |
| P1 | High-volume tables, chats, chips, and history have no approved virtualization/pagination thresholds. | Measure representative volumes and define server pagination before Phase 6. |
| P1 | Spanish layout is current; English/Portuguese expansion has not been stress-tested. | Add 30-40% expansion fixtures and prevent destructive truncation. |
| P1 | Roster has no approved workflow or prototype. | Use `archive/docs/design/roster_design_brief.md`; design and validate before Phase 5. |
| P2 | Prototype CSS values may drift from machine-readable tokens. | Generate the Material UI theme from `tokens.json`; forbid ad-hoc semantic colors and radii. |

## Material UI acceptance baseline

- Montserrat, navy/cyan/green palette, 4px rhythm, 16px maximum dashboard radius.
- At least 4.5:1 body contrast, visible focus, 40px desktop and 44px touch targets.
- Status text never depends on color; alert label, lifecycle, age, and source freshness remain separate.
- Dashboard and Chats share primary navigation; Chat detail remains subordinate.
