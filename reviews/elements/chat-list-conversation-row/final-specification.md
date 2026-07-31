# Approved chat-list conversation row

**Status:** Approved and implemented  
**Approved:** 2026-07-29

## Selected decisions

| Decision | Approved selection | Exact value | Provenance |
|---|---|---|---|
| Row padding | Tight | 8px vertical; 12px horizontal | Generated option selected by the user |
| Title typography | Compact body | 12px / 18px / 700 | Current implementation |
| Pinned label density | Micro marker | 9px; 3px 6px padding | Prototype reference |
| Message preview | Separated body | 4px top; 12px / 17.4px | Prototype reference |
| Unresolved age | Plain line | 11px; transparent; no icon | Current implementation |
| Right metadata width | Content sized | auto | Current implementation |
| Timestamp size | Micro metadata | 10px | Prototype reference |
| Unread counter size | Compact | 20px; 11px text | Current implementation |

## Fixed rules

- Alert chips use the approved 6px radius, `#D8DDE8` border, light-gray internal divider, semantic color on the code only, navy short name, approximately 23px height, 10.5px text, and 4px 6px segment padding.
- Do not display an aggregate open-alert count in the row. Individual alert chips and the explicit unresolved age communicate alert state.
- The numeric blue badge counts unread messages only. The separate 6px blue dot is centered vertically on the first title line.
- `Fijada` changes ordering only and never communicates severity.
- Desktop pointer and keyboard users open the row overflow menu for `Fijar conversación` or `Desfijar conversación`. Mobile users press and hold the row for approximately half a second.
- Phase 6 pin changes are local presentation state only. They do not modify backend authorization, persistence, or API contracts.
- Content/meta gap and alert-chip flow remain fixed source patches because the reviewed alternatives were not meaningfully perceptible in this fixture.

## Production implementation

- `apps/web/src/Chats.tsx`
- `apps/web/src/chatUi.ts`
- `apps/web/src/chatUi.test.mjs`

## Evidence sources

- `apps/web/src/Chats.tsx`
- `packages/design-system/src/index.ts`
- `prototypes/current/chat/chat-list-final.html`
- `docs/product/ux_ui_decisions.md`
- `archive/docs/implementation/phase6_chat_app_ui_audit_decisions.md`
- Browser selection captured from this review on 2026-07-29.
