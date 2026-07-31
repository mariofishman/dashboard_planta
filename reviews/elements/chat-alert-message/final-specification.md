# Approved alert-message element specification

**Status:** Approved and implemented  
**Approved:** 2026-07-29

## Composition

| Decision | Approved value |
|---|---|
| Message width | `min(92%, 440px)` |
| Outer message padding | `4px 5px` |
| Outer message radius | `7.5px` fixed implementation geometry |
| Sender color | Action cyan `#007ACC` fixed implementation value |
| Attachment border | `1px solid rgba(225,29,72,.22)` |
| Attachment radius | `7.5px` |
| Attachment shadow | `0 2px 6px rgba(0,36,107,.07)` |
| Header gap | `8px` |
| Header padding | `0 9px 0 7px` |
| Status | Transparent compact `6px` rounded rectangle with danger outline, written label, and `6px` danger dot |
| Code | Existing neutral selected surface and compact `6px` radius |
| Age | Plain `9px` text with no capsule |
| Body | `8px` padding; existing `12px / 18px / 700` title |
| Facts | Light divider, `6px` top padding, `3px 6px` capsules, `9px` text |
| Actions | Two equal columns at every width; narrow labels are `OT` and `Ver` |
| Reviewed primary action copy | `Abrir OT 151087.3`; production-safe mapping described below |
| Secondary action | `Ver explicación y solución` |

## Fixed rules

- Unresolved age uses muted navy before 2 hours and deep danger from 2 hours onward.
- The age rule changes only the duration text; alert label, code, and lifecycle remain separate meanings.
- The work-order action copies the identifier until the Phase 10 navigation contract authorizes a supported EmusaSoft route. The approved prototype wording `Abrir OT` therefore maps to the production-safe `Copiar OT` behavior.
- The object remains keyboard focusable. Enter or Space toggles details, nested buttons keep their own behavior, and focus remains visibly outlined.
