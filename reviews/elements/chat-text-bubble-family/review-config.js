window.ELEMENT_REVIEW_CONFIG = {
  id: "monitor-chat-text-bubble-family-v1",
  title: "Chat text-bubble family",
  summary: "Outgoing text, incoming text, and quoted replies are reviewed together because they share width, density, typography, metadata, and interaction rules. Alert objects and attachment bubbles are excluded.",
  evidence: [
    { label: "Current implementation", path: "apps/web/src/Chats.tsx", kind: "observed React/MUI source" },
    { label: "Prototype structure", path: "prototypes/current/chat/chat-detail.html", kind: "observed local prototype markup" },
    { label: "Prototype styling", path: "prototypes/current/chat/chat-detail.css", kind: "observed local prototype CSS" },
    { label: "Design tokens", path: "docs/design/design-system/tokens.css", kind: "current design authority" },
    { label: "Chat UI audit", path: "docs/delivery/phases/phase6/chat_app_ui_audit_decisions.md", kind: "current interaction authority" },
    { label: "Selected element", path: "Current Codex task", kind: "explicit user-supplied review target" },
  ],
  columns: [
    { id: "current", label: "Current implementation", provenance: "observed current implementation", description: "Rendered React/MUI text bubbles" },
    { id: "reference", label: "Prototype reference", provenance: "observed prototype reference", description: "Approved chat-detail prototype treatment" },
    { id: "accent-surface", label: "Soft surface", provenance: "generated", description: "No stripe; a subtle blue surface distinguishes the quote", optional: true },
    { id: "accent-short", label: "Short marker", provenance: "generated", description: "A short cyan marker identifies the quoted author without framing the whole block", optional: true },
    { id: "accent-top", label: "Top rule", provenance: "generated", description: "A thin cyan rule separates the quote from the reply", optional: true },
    { id: "accent-glyph", label: "Quote glyph", provenance: "generated", description: "A quiet quotation mark replaces the structural stripe", optional: true },
  ],
  showGeneratedByDefault: true,
  rows: [
    {
      id: "bubble-width",
      label: "Bubble width",
      description: "Maximum width of ordinary text messages before wrapping.",
      options: {
        current: { id: "width-current", label: "Responsive wide", value: "92% mobile; 76% desktop", patch: { "--bubble-width": "76%", "--bubble-width-narrow": "92%" } },
        reference: { id: "width-reference", label: "Consistent cap", value: "min(88%, 440px); 92% narrow", patch: { "--bubble-width": "min(88%, 440px)", "--bubble-width-narrow": "92%" } },
        "accent-surface": { id: "width-accent-surface", label: "Keep selected", value: "92% mobile; 76% desktop", patch: { "--bubble-width": "76%", "--bubble-width-narrow": "92%" } },
        "accent-short": { id: "width-accent-short", label: "Keep selected", value: "92% mobile; 76% desktop", patch: { "--bubble-width": "76%", "--bubble-width-narrow": "92%" } },
        "accent-top": { id: "width-accent-top", label: "Keep selected", value: "92% mobile; 76% desktop", patch: { "--bubble-width": "76%", "--bubble-width-narrow": "92%" } },
        "accent-glyph": { id: "width-accent-glyph", label: "Keep selected", value: "92% mobile; 76% desktop", patch: { "--bubble-width": "76%", "--bubble-width-narrow": "92%" } },
      },
    },
    {
      id: "bubble-padding",
      label: "Bubble padding",
      description: "Inset around text while preserving room for the action trigger.",
      options: {
        current: { id: "padding-current", label: "Even base", value: "6px; 32px action side", patch: { "--bubble-padding": "6px 32px 6px 6px" } },
        reference: { id: "padding-reference", label: "Text-led inset", value: "4px 34px 4px 9px", patch: { "--bubble-padding": "4px 34px 4px 9px" } },
        "accent-surface": { id: "padding-accent-surface", label: "Keep selected", value: "6px; 32px action side", patch: { "--bubble-padding": "6px 32px 6px 6px" } },
        "accent-short": { id: "padding-accent-short", label: "Keep selected", value: "6px; 32px action side", patch: { "--bubble-padding": "6px 32px 6px 6px" } },
        "accent-top": { id: "padding-accent-top", label: "Keep selected", value: "6px; 32px action side", patch: { "--bubble-padding": "6px 32px 6px 6px" } },
        "accent-glyph": { id: "padding-accent-glyph", label: "Keep selected", value: "6px; 32px action side", patch: { "--bubble-padding": "6px 32px 6px 6px" } },
      },
    },
    {
      id: "outgoing-surface",
      label: "Outgoing surface",
      description: "Background that distinguishes the user's own message.",
      options: {
        current: { id: "surface-current", label: "MUI selected gray", value: "rgba(0,0,0,.08)", patch: { "--outgoing-surface": "rgba(0,0,0,.08)" } },
        reference: { id: "surface-reference", label: "Token blue tint", value: "#E2EBFD", patch: { "--outgoing-surface": "#E2EBFD" } },
        "accent-surface": { id: "surface-accent-surface", label: "Keep selected", value: "rgba(0,0,0,.08)", patch: { "--outgoing-surface": "rgba(0,0,0,.08)" } },
        "accent-short": { id: "surface-accent-short", label: "Keep selected", value: "rgba(0,0,0,.08)", patch: { "--outgoing-surface": "rgba(0,0,0,.08)" } },
        "accent-top": { id: "surface-accent-top", label: "Keep selected", value: "rgba(0,0,0,.08)", patch: { "--outgoing-surface": "rgba(0,0,0,.08)" } },
        "accent-glyph": { id: "surface-accent-glyph", label: "Keep selected", value: "rgba(0,0,0,.08)", patch: { "--outgoing-surface": "rgba(0,0,0,.08)" } },
      },
    },
    {
      id: "body-density",
      label: "Message text density",
      description: "Line height of the 12px message copy.",
      options: {
        current: { id: "density-current", label: "Open", value: "12px / 18px", patch: { "--body-line": "1.5" } },
        reference: { id: "density-reference", label: "Compact", value: "12px / 15.6px", patch: { "--body-line": "1.3" } },
        "accent-surface": { id: "density-accent-surface", label: "Keep selected", value: "12px / 18px", patch: { "--body-line": "1.5" } },
        "accent-short": { id: "density-accent-short", label: "Keep selected", value: "12px / 18px", patch: { "--body-line": "1.5" } },
        "accent-top": { id: "density-accent-top", label: "Keep selected", value: "12px / 18px", patch: { "--body-line": "1.5" } },
        "accent-glyph": { id: "density-accent-glyph", label: "Keep selected", value: "12px / 18px", patch: { "--body-line": "1.5" } },
      },
    },
    {
      id: "time-flow",
      label: "Timestamp placement",
      description: "Whether time consumes a separate line or follows the final text line.",
      options: {
        current: { id: "time-flow-current", label: "Separate footer", value: "right-aligned row", patch: { "--time-display": "flex", "--time-margin": "2px 0 0", "--time-align": "flex-end" } },
        reference: { id: "time-flow-reference", label: "Inline ending", value: "follows message copy", patch: { "--time-display": "inline-flex", "--time-margin": "0 0 0 8px", "--time-align": "baseline" } },
        "accent-surface": { id: "time-flow-accent-surface", label: "Keep selected", value: "right-aligned row", patch: { "--time-display": "flex", "--time-margin": "2px 0 0", "--time-align": "flex-end" } },
        "accent-short": { id: "time-flow-accent-short", label: "Keep selected", value: "right-aligned row", patch: { "--time-display": "flex", "--time-margin": "2px 0 0", "--time-align": "flex-end" } },
        "accent-top": { id: "time-flow-accent-top", label: "Keep selected", value: "right-aligned row", patch: { "--time-display": "flex", "--time-margin": "2px 0 0", "--time-align": "flex-end" } },
        "accent-glyph": { id: "time-flow-accent-glyph", label: "Keep selected", value: "right-aligned row", patch: { "--time-display": "flex", "--time-margin": "2px 0 0", "--time-align": "flex-end" } },
      },
    },
    {
      id: "time-size",
      label: "Timestamp size",
      description: "Visual weight of message time and delivery status.",
      options: {
        current: { id: "time-size-current", label: "Routine caption", value: "11px / 15.4px", patch: { "--time-size": "11px", "--time-line": "1.4" } },
        reference: { id: "time-size-reference", label: "Micro metadata", value: "9px / 11.7px", patch: { "--time-size": "9px", "--time-line": "1.3" } },
        "accent-surface": { id: "time-size-accent-surface", label: "Keep selected", value: "11px / 15.4px", patch: { "--time-size": "11px", "--time-line": "1.4" } },
        "accent-short": { id: "time-size-accent-short", label: "Keep selected", value: "11px / 15.4px", patch: { "--time-size": "11px", "--time-line": "1.4" } },
        "accent-top": { id: "time-size-accent-top", label: "Keep selected", value: "11px / 15.4px", patch: { "--time-size": "11px", "--time-line": "1.4" } },
        "accent-glyph": { id: "time-size-accent-glyph", label: "Keep selected", value: "11px / 15.4px", patch: { "--time-size": "11px", "--time-line": "1.4" } },
      },
    },
    {
      id: "quote-width",
      label: "Quoted-reply width",
      description: "Horizontal reach of the quoted source inside the reply bubble.",
      options: {
        current: { id: "quote-width-current", label: "Contained", value: "100%", patch: { "--quote-width": "100%" } },
        reference: { id: "quote-width-reference", label: "Uses action inset", value: "calc(100% + 22px)", patch: { "--quote-width": "calc(100% + 22px)" } },
        "accent-surface": { id: "quote-width-accent-surface", label: "Keep selected", value: "100%", patch: { "--quote-width": "100%" } },
        "accent-short": { id: "quote-width-accent-short", label: "Keep selected", value: "100%", patch: { "--quote-width": "100%" } },
        "accent-top": { id: "quote-width-accent-top", label: "Keep selected", value: "100%", patch: { "--quote-width": "100%" } },
        "accent-glyph": { id: "quote-width-accent-glyph", label: "Keep selected", value: "100%", patch: { "--quote-width": "100%" } },
      },
    },
    {
      id: "quote-padding",
      label: "Quoted-reply padding",
      description: "Interior spacing around quoted author and excerpt.",
      options: {
        current: { id: "quote-padding-current", label: "Uniform compact", value: "4.8px", patch: { "--quote-padding": "4.8px" } },
        reference: { id: "quote-padding-reference", label: "Readable inset", value: "6px 9px 6px 12px", patch: { "--quote-padding": "6px 9px 6px 12px" } },
        "accent-surface": { id: "quote-padding-accent-surface", label: "Keep selected", value: "4.8px", patch: { "--quote-padding": "4.8px" } },
        "accent-short": { id: "quote-padding-accent-short", label: "Keep selected", value: "4.8px", patch: { "--quote-padding": "4.8px" } },
        "accent-top": { id: "quote-padding-accent-top", label: "Keep selected", value: "4.8px", patch: { "--quote-padding": "4.8px" } },
        "accent-glyph": { id: "quote-padding-accent-glyph", label: "Keep selected", value: "4.8px", patch: { "--quote-padding": "4.8px" } },
      },
    },
    {
      id: "quote-accent",
      label: "Quoted-reply accent",
      description: "Strength of the cyan source marker.",
      options: {
        current: { id: "quote-accent-current", label: "Slim full rail", value: "3px left edge", patch: { "--quote-left-rule": "3px solid #007ACC", "--quote-top-rule": "0 solid transparent", "--quote-short-display": "none", "--quote-glyph-display": "none", "--quote-accent-surface": "#F5F5F5", "--quote-accent-shadow": "none" } },
        reference: { id: "quote-accent-reference", label: "Strong full rail", value: "4px left edge", patch: { "--quote-left-rule": "4px solid #007ACC", "--quote-top-rule": "0 solid transparent", "--quote-short-display": "none", "--quote-glyph-display": "none", "--quote-accent-surface": "#F5F5F5", "--quote-accent-shadow": "none" } },
        "accent-surface": { id: "quote-accent-surface", label: "Surface only", value: "soft blue fill; no marker", patch: { "--quote-left-rule": "0 solid transparent", "--quote-top-rule": "0 solid transparent", "--quote-short-display": "none", "--quote-glyph-display": "none", "--quote-accent-surface": "#EDF4FF", "--quote-accent-shadow": "inset 0 0 0 1px rgba(0,122,204,.12)" } },
        "accent-short": { id: "quote-accent-short", label: "Short marker", value: "3px × 16px", patch: { "--quote-left-rule": "0 solid transparent", "--quote-top-rule": "0 solid transparent", "--quote-short-display": "block", "--quote-glyph-display": "none", "--quote-accent-surface": "#F5F5F5", "--quote-accent-shadow": "none" } },
        "accent-top": { id: "quote-accent-top", label: "Top rule", value: "2px top edge", patch: { "--quote-left-rule": "0 solid transparent", "--quote-top-rule": "2px solid #007ACC", "--quote-short-display": "none", "--quote-glyph-display": "none", "--quote-accent-surface": "#F5F5F5", "--quote-accent-shadow": "none" } },
        "accent-glyph": { id: "quote-accent-glyph", label: "Quote glyph", value: "cyan mark; no rule", patch: { "--quote-left-rule": "0 solid transparent", "--quote-top-rule": "0 solid transparent", "--quote-short-display": "none", "--quote-glyph-display": "block", "--quote-accent-surface": "#F5F5F5", "--quote-accent-shadow": "none" } },
      },
    },
    {
      id: "message-gap",
      label: "Space between bubbles",
      description: "Vertical rhythm between separate messages in the conversation.",
      options: {
        current: { id: "gap-current", label: "Tight", value: "4.4px", patch: { "--message-gap": "4.4px" } },
        reference: { id: "gap-reference", label: "Token spacing", value: "8px", patch: { "--message-gap": "8px" } },
        "accent-surface": { id: "gap-accent-surface", label: "Keep selected", value: "4.4px", patch: { "--message-gap": "4.4px" } },
        "accent-short": { id: "gap-accent-short", label: "Keep selected", value: "4.4px", patch: { "--message-gap": "4.4px" } },
        "accent-top": { id: "gap-accent-top", label: "Keep selected", value: "4.4px", patch: { "--message-gap": "4.4px" } },
        "accent-glyph": { id: "gap-accent-glyph", label: "Keep selected", value: "4.4px", patch: { "--message-gap": "4.4px" } },
      },
    },
  ],
  selections: {
    "bubble-width": "width-current",
    "bubble-padding": "padding-reference",
    "outgoing-surface": "surface-reference",
    "body-density": "density-current",
    "time-flow": "time-flow-current",
    "time-size": "time-size-reference",
    "quote-width": "quote-width-current",
    "quote-padding": "quote-padding-reference",
    "quote-accent": "quote-accent-short",
    "message-gap": "gap-reference",
  },
  fixedRules: [
    { label: "Reviewed together", value: "Outgoing, incoming, and quoted text replies share one decision system and appear together in both previews.", provenance: "review scope" },
    { label: "Unchanged geometry", value: "Both implementation and prototype use approximately 14px outer bubble corners and a 1px neutral incoming border, so those imperceptible/non-differing rows are omitted.", provenance: "observed comparison" },
    { label: "Excluded elements", value: "Approved Monitor alert objects are unchanged. Photo and file attachment bubbles require a separate review because their media structure changes the geometry.", provenance: "review scope" },
  ],
  preview: {
    states: ["default", "hover", "focus", "expanded", "compact"],
    expandedStateLabel: "Menu open",
    fixedPatch: { "--incoming-surface": "#FFFFFF", "--bubble-border": "#E0E0E0", "--quote-surface": "#F5F5F5", "--text-primary": "#00246B", "--text-secondary": "#4D608A", "--action": "#007ACC", "--action-hover": "#006BA8" },
    stateAttributes: {
      expanded: [{ selector: ".message-menu-trigger", attributes: { "aria-expanded": "true" } }],
    },
    html: '<section class="bubble-thread" aria-label="Text bubble examples"><article class="message outgoing"><div class="bubble"><button class="message-menu-trigger" type="button" aria-label="Acciones del mensaje" aria-expanded="false">⌄</button><span class="message-copy">@Jorge, confirma si la bobina sigue junto a la balanza de P15.</span><span class="message-time">3:52 p. m. · ✓✓</span></div><div class="message-menu" role="menu"><button type="button" role="menuitem">Responder</button><button type="button" role="menuitem">Reaccionar</button></div></article><article class="message incoming"><div class="bubble"><button class="message-menu-trigger" type="button" aria-label="Acciones del mensaje" aria-expanded="false">⌄</button><strong class="sender">Carmen R.</strong><span class="message-copy">La bobina sigue junto a la balanza. Jorge la pesará al terminar.</span><span class="message-time">3:58 p. m.</span></div></article><article class="message incoming quoted"><div class="bubble"><button class="message-menu-trigger" type="button" aria-label="Acciones del mensaje" aria-expanded="false">⌄</button><strong class="sender">Jorge A.</strong><button class="quote" type="button" aria-label="Ir al mensaje citado de Luis V."><strong>Luis V.</strong><span>@Jorge, confirma si la bobina sigue junto a la balanza de P15.</span></button><span class="message-copy">Sí, está en P15. La voy a pesar cuando termine la bobina que está ahora en la balanza.</span><span class="message-time">4:03 p. m.</span></div></article></section>',
    css: `
      .bubble-thread{display:grid;gap:var(--message-gap);width:min(100%,620px);padding:12px;background:#F5F5F5;font-family:Montserrat,system-ui,sans-serif}
      .message{position:relative;display:grid;width:var(--bubble-width);color:var(--text-primary)}
      .message.outgoing{justify-self:end}
      .message.incoming{justify-self:start}
      .bubble{position:relative;min-width:0;padding:var(--bubble-padding);border:1px solid var(--bubble-border);border-radius:14px;background:var(--incoming-surface);font-size:12px;line-height:var(--body-line)}
      .outgoing .bubble{border-color:transparent;background:var(--outgoing-surface)}
      .sender{display:block;margin:0 0 1px;color:var(--action-hover);font-size:11px;line-height:1.15}
      .message-copy{display:inline;overflow-wrap:anywhere}
      .message-time{display:var(--time-display);margin:var(--time-margin);align-items:var(--time-align);justify-content:flex-end;color:var(--text-secondary);font-size:var(--time-size);line-height:var(--time-line);font-variant-numeric:tabular-nums;white-space:nowrap}
      .message-menu-trigger{position:absolute;z-index:2;top:1px;right:1px;display:grid;width:30px;height:30px;padding:0;place-items:center;border:0;border-radius:6px;color:var(--text-secondary);background:transparent;font-size:17px;line-height:1;opacity:.72}
      .message-menu-trigger:hover,.message-menu-trigger[aria-expanded="true"]{color:var(--action-hover);background:#E2EBFD;opacity:1}
      .message-menu{position:absolute;z-index:3;top:29px;right:2px;display:none;min-width:126px;padding:4px;border:1px solid #D8DDE8;border-radius:6px;background:#FFF;box-shadow:0 6px 18px rgba(0,36,107,.14)}
      .message-menu button{display:block;width:100%;height:28px;padding:0 8px;border:0;border-radius:4px;color:var(--text-primary);background:#FFF;font-size:11px;text-align:left}
      .quote{position:relative;display:grid;gap:2px;width:var(--quote-width);margin:2px 0 4px;padding:var(--quote-padding);overflow:hidden;border:0;border-top:var(--quote-top-rule);border-left:var(--quote-left-rule);border-radius:10px;color:var(--text-primary);background:var(--quote-accent-surface,var(--quote-surface));box-shadow:var(--quote-accent-shadow);text-align:left}
      .quote::before{position:absolute;top:6px;left:4px;display:var(--quote-short-display);width:3px;height:16px;border-radius:2px;background:var(--action);content:""}
      .quote::after{position:absolute;top:-2px;right:7px;display:var(--quote-glyph-display);color:var(--action);font-family:Georgia,serif;font-size:25px;font-weight:700;line-height:1;opacity:.38;content:"“"}
      .quote strong{color:var(--action-hover);font-size:11px;line-height:1.2}
      .quote span{overflow:hidden;color:var(--text-secondary);font-size:11px;line-height:1.3;text-overflow:ellipsis;white-space:nowrap}
      .preview-stage[data-state="hover"] .outgoing .bubble{filter:brightness(.98)}
      .preview-stage[data-state="hover"] .outgoing .message-menu-trigger{color:var(--action-hover);background:#E2EBFD;opacity:1}
      .preview-stage[data-state="focus"] .outgoing .bubble{outline:2px solid var(--action);outline-offset:2px}
      .preview-stage[data-state="expanded"] .outgoing .message-menu{display:block}
      .preview-stage[data-state="compact"] .bubble-thread{width:360px}
      .preview-stage[data-state="compact"] .message{width:var(--bubble-width-narrow)}
      .preview-stage[data-state="compact"] .message-menu-trigger{display:none}
    `,
  },
  approval: {
    status: "approved-and-implemented",
    note: "Approved explicitly in the Codex task on 2026-07-29 and implemented in apps/web/src/Chats.tsx. This remains a UI-only presentation change and does not alter backend behavior or contracts.",
  },
};
