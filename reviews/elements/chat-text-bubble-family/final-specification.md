# Chat text-bubble family final specification

Status: approved and implemented on 2026-07-29

| Decision | Approved selection | Exact value | Provenance | Affected states |
|---|---|---|---|---|
| Bubble width | Responsive wide | 92% mobile; 76% desktop maximum | Current implementation | Normal and narrow |
| Bubble padding | Text-led inset | 4px 34px 4px 9px | Prototype reference | All text bubbles |
| Outgoing surface | Token blue tint | #E2EBFD | Prototype reference and semantic selected token | Outgoing and pending text |
| Message text density | Open | 12px / 18px | Current implementation | Incoming and outgoing text |
| Timestamp placement | Separate footer | Right-aligned lower row | Current implementation | Incoming and outgoing text |
| Timestamp size | Micro metadata | 9px / 11.7px | Prototype reference | All message timestamps |
| Quoted-reply width | Contained | 100% | Current implementation | Quoted references |
| Quoted-reply padding | Readable inset | 6px 9px 6px 12px | Prototype reference | Quoted references |
| Quoted-reply accent | Short marker | 3px × 16px cyan marker | Generated alternative; explicitly selected final accent | Quoted references |
| Space between bubbles | Token spacing | 8px | Prototype reference and spacing token | Conversation history |

Fixed presentation values shown in the approved live preview are also implemented: approximately 14px text-bubble corners, neutral incoming borders, darker cyan incoming sender labels, a 10px quoted-block radius, neutral quoted surface, visible keyboard focus, desktop message-action chevrons, and mobile-hidden chevrons.

Sources:

- `apps/web/src/Chats.tsx`
- `prototypes/current/chat/chat-detail.html`
- `prototypes/current/chat/chat-detail.css`
- `docs/design/design-system/tokens.css`
- `docs/product/ux_ui_decisions.md`
- `docs/delivery/phases/phase6/chat_app_ui_audit_decisions.md`

Scope remains UI-only. No database, API contract, authorization, routing, polling, roster, realtime, attachment-storage, or EmusaSoft behavior changed.
