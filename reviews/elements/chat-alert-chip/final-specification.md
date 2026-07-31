# Approved chat-list alert chip

**Status:** Approved and implemented  
**Approved:** 2026-07-29

## Selected decisions

| Decision | Approved value | Provenance |
|---|---|---|
| Border | `1px solid #D8DDE8` | Prototype reference selected by the user |
| Radius | Compact rounded rectangle, `6px` | Current implementation geometry retained by the user |
| Surface | White | Shared design-system surface |
| Code color | Semantic alert color | User-selected semantic placement |
| Name color | Navy `#00246B` | Prototype reference selected by the user |
| Internal divider | `1px solid #E0E0E0` | Prototype reference selected by the user |
| Height | Approximately `23px` | Approved conversation-row specification |
| Typography | Approximately `10.5px`, semibold; code bold | Approved conversation-row specification |
| Segment padding | `4px 6px` | Approved conversation-row specification |

## Fixed rules

- Semantic alert color applies to the code only; the short name remains navy.
- The divider is a light-gray vertical rule, not a dot.
- The chip remains rectangular with compact rounded corners, not a pill.
- Multiple chips retain the same treatment across normal, hover, keyboard-focus, menu-open, and narrow conversation-row states.

## Production implementation

- `apps/web/src/Chats.tsx`

## Evidence sources

- `reviews/elements/chat-alert-chip/index.html`
- `reviews/elements/chat-alert-chip/README.md`
- `reviews/elements/chat-list-conversation-row/final-specification.md`
- `packages/design-system/src/index.ts`
- `docs/product/ux_ui_decisions.md`
- Browser selections recorded on 2026-07-29.

## Unresolved items

None for the approved Phase 6 presentation treatment.
