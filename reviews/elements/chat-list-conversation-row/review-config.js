window.ELEMENT_REVIEW_CONFIG = {
  id: "monitor-chat-list-conversation-row-v2",
  title: "Chat-list conversation row",
  summary: "The whole row is reviewed as one element: unread state, title, pin label, message preview, unresolved age, alert chips, timestamp, unread count, and row actions.",
  evidence: [
    { label: "Current implementation", path: "apps/web/src/Chats.tsx", kind: "observed React/MUI source" },
    { label: "Current fixture", path: "apps/web/src/chatUi.ts", kind: "observed UI-only fixture" },
    { label: "Prototype structure", path: "prototypes/current/chat/chat-list-final.html", kind: "observed local prototype markup" },
    { label: "Prototype styling", path: "prototypes/current/chat/chat-list-final.css", kind: "observed local prototype CSS" },
    { label: "Current authority", path: "docs/product/ux_ui_decisions.md", kind: "current product and UI authority" },
    { label: "Selected element", path: "Browser Comment 1 in this Codex task", kind: "explicit user-supplied review target" },
  ],
  columns: [
    { id: "current", label: "Current", provenance: "observed current implementation", description: "Rendered React/MUI row at the supplied 655px viewport" },
    { id: "reference", label: "Prototype", provenance: "observed prototype reference", description: "Current chat-list prototype, adapted where newer authority overrides its wording" },
    { id: "padding-4", label: "4px", provenance: "generated", description: "Extra-tight vertical padding experiment", optional: true },
    { id: "padding-8", label: "8px", provenance: "generated", description: "Tight vertical padding experiment", optional: true },
    { id: "padding-12", label: "12px", provenance: "generated", description: "Balanced vertical padding experiment", optional: true },
    { id: "padding-20", label: "20px", provenance: "generated", description: "Spacious vertical padding experiment", optional: true },
  ],
  showGeneratedByDefault: true,
  rows: [
    {
      id: "row-padding",
      label: "Row padding",
      description: "Vertical and horizontal inset around the complete conversation row.",
      options: {
        current: { id: "row-padding-current", label: "Compact", value: "8.8px vertical; 12px horizontal", patch: { "--row-padding-y": "8.8px", "--row-padding-x": "12px" } },
        reference: { id: "row-padding-reference", label: "Roomier", value: "16px vertical; 16px horizontal", patch: { "--row-padding-y": "16px", "--row-padding-x": "16px" } },
        "padding-4": { id: "row-padding-4", label: "Extra tight", value: "4px vertical; 12px horizontal", patch: { "--row-padding-y": "4px", "--row-padding-x": "12px" } },
        "padding-8": { id: "row-padding-8", label: "Tight", value: "8px vertical; 12px horizontal", patch: { "--row-padding-y": "8px", "--row-padding-x": "12px" } },
        "padding-12": { id: "row-padding-12", label: "Balanced", value: "12px vertical; 12px horizontal", patch: { "--row-padding-y": "12px", "--row-padding-x": "12px" } },
        "padding-20": { id: "row-padding-20", label: "Spacious", value: "20px vertical; 12px horizontal", patch: { "--row-padding-y": "20px", "--row-padding-x": "12px" } },
      },
    },
    {
      id: "title-typography",
      label: "Title typography",
      description: "Visual strength and size of the conversation name.",
      options: {
        current: { id: "title-current", label: "Compact body", value: "12px / 18px / 700", patch: { "--title-size": "12px", "--title-line": "18px", "--title-half-line": "9px" } },
        reference: { id: "title-reference", label: "Stronger title", value: "14px / 20px / 700", patch: { "--title-size": "14px", "--title-line": "20px", "--title-half-line": "10px" } },
        "padding-4": { id: "title-padding-4", label: "Keep current", value: "12px / 18px / 700", patch: { "--title-size": "12px", "--title-line": "18px", "--title-half-line": "9px" } },
        "padding-8": { id: "title-padding-8", label: "Keep current", value: "12px / 18px / 700", patch: { "--title-size": "12px", "--title-line": "18px", "--title-half-line": "9px" } },
        "padding-12": { id: "title-padding-12", label: "Keep current", value: "12px / 18px / 700", patch: { "--title-size": "12px", "--title-line": "18px", "--title-half-line": "9px" } },
        "padding-20": { id: "title-padding-20", label: "Keep current", value: "12px / 18px / 700", patch: { "--title-size": "12px", "--title-line": "18px", "--title-half-line": "9px" } },
      },
    },
    {
      id: "pinned-label",
      label: "Pinned label density",
      description: "Size and inset of the written Fijada marker; the wording is fixed by current authority.",
      options: {
        current: { id: "pinned-current", label: "Routine caption", value: "11px; 1.2px 4px", patch: { "--pin-size": "11px", "--pin-padding": "1.2px 4px" } },
        reference: { id: "pinned-reference", label: "Micro marker", value: "9px; 3px 6px", patch: { "--pin-size": "9px", "--pin-padding": "3px 6px" } },
        "padding-4": { id: "pinned-padding-4", label: "Keep current", value: "11px; 1.2px 4px", patch: { "--pin-size": "11px", "--pin-padding": "1.2px 4px" } },
        "padding-8": { id: "pinned-padding-8", label: "Keep current", value: "11px; 1.2px 4px", patch: { "--pin-size": "11px", "--pin-padding": "1.2px 4px" } },
        "padding-12": { id: "pinned-padding-12", label: "Keep current", value: "11px; 1.2px 4px", patch: { "--pin-size": "11px", "--pin-padding": "1.2px 4px" } },
        "padding-20": { id: "pinned-padding-20", label: "Keep current", value: "11px; 1.2px 4px", patch: { "--pin-size": "11px", "--pin-padding": "1.2px 4px" } },
      },
    },
    {
      id: "preview-typography",
      label: "Message preview",
      description: "Spacing, size, and line height of the latest-message preview.",
      options: {
        current: { id: "preview-current", label: "Tight caption", value: "0 top; 11px / 15.4px", patch: { "--preview-margin": "0", "--preview-size": "11px", "--preview-line": "15.4px" } },
        reference: { id: "preview-reference", label: "Separated body", value: "4px top; 12px / 17.4px", patch: { "--preview-margin": "4px", "--preview-size": "12px", "--preview-line": "17.4px" } },
        "padding-4": { id: "preview-padding-4", label: "Keep current", value: "0 top; 11px / 15.4px", patch: { "--preview-margin": "0", "--preview-size": "11px", "--preview-line": "15.4px" } },
        "padding-8": { id: "preview-padding-8", label: "Keep current", value: "0 top; 11px / 15.4px", patch: { "--preview-margin": "0", "--preview-size": "11px", "--preview-line": "15.4px" } },
        "padding-12": { id: "preview-padding-12", label: "Keep current", value: "0 top; 11px / 15.4px", patch: { "--preview-margin": "0", "--preview-size": "11px", "--preview-line": "15.4px" } },
        "padding-20": { id: "preview-padding-20", label: "Keep current", value: "0 top; 11px / 15.4px", patch: { "--preview-margin": "0", "--preview-size": "11px", "--preview-line": "15.4px" } },
      },
    },
    {
      id: "age-treatment",
      label: "Unresolved age",
      description: "Presentation of Más antigua and its duration; aggregate alert counts are excluded by current authority.",
      options: {
        current: { id: "age-current", label: "Plain line", value: "11px; transparent; no icon", patch: { "--age-margin": "4.4px", "--age-height": "auto", "--age-padding": "0", "--age-surface": "transparent", "--age-icon": "none", "--age-size": "11px" } },
        reference: { id: "age-reference", label: "Time capsule", value: "24px; selected surface; clock icon", patch: { "--age-margin": "8px", "--age-height": "24px", "--age-padding": "0 7px", "--age-surface": "rgba(0,122,204,.08)", "--age-icon": "inline-block", "--age-size": "10px" } },
        "padding-4": { id: "age-padding-4", label: "Keep current", value: "11px; transparent; no icon", patch: { "--age-margin": "4.4px", "--age-height": "auto", "--age-padding": "0", "--age-surface": "transparent", "--age-icon": "none", "--age-size": "11px" } },
        "padding-8": { id: "age-padding-8", label: "Keep current", value: "11px; transparent; no icon", patch: { "--age-margin": "4.4px", "--age-height": "auto", "--age-padding": "0", "--age-surface": "transparent", "--age-icon": "none", "--age-size": "11px" } },
        "padding-12": { id: "age-padding-12", label: "Keep current", value: "11px; transparent; no icon", patch: { "--age-margin": "4.4px", "--age-height": "auto", "--age-padding": "0", "--age-surface": "transparent", "--age-icon": "none", "--age-size": "11px" } },
        "padding-20": { id: "age-padding-20", label: "Keep current", value: "11px; transparent; no icon", patch: { "--age-margin": "4.4px", "--age-height": "auto", "--age-padding": "0", "--age-surface": "transparent", "--age-icon": "none", "--age-size": "11px" } },
      },
    },
    {
      id: "meta-width",
      label: "Right metadata width",
      description: "Reserved width for timestamp, unread count, and desktop row action.",
      options: {
        current: { id: "meta-current", label: "Content sized", value: "auto", patch: { "--meta-width": "auto" } },
        reference: { id: "meta-reference", label: "Aligned column", value: "62px", patch: { "--meta-width": "62px" } },
        "padding-4": { id: "meta-padding-4", label: "Keep current", value: "auto", patch: { "--meta-width": "auto" } },
        "padding-8": { id: "meta-padding-8", label: "Keep current", value: "auto", patch: { "--meta-width": "auto" } },
        "padding-12": { id: "meta-padding-12", label: "Keep current", value: "auto", patch: { "--meta-width": "auto" } },
        "padding-20": { id: "meta-padding-20", label: "Keep current", value: "auto", patch: { "--meta-width": "auto" } },
      },
    },
    {
      id: "time-typography",
      label: "Timestamp size",
      description: "Size of the latest-message time in the right metadata column.",
      options: {
        current: { id: "time-current", label: "Routine caption", value: "11px", patch: { "--time-size": "11px" } },
        reference: { id: "time-reference", label: "Micro metadata", value: "10px", patch: { "--time-size": "10px" } },
        "padding-4": { id: "time-padding-4", label: "Keep current", value: "11px", patch: { "--time-size": "11px" } },
        "padding-8": { id: "time-padding-8", label: "Keep current", value: "11px", patch: { "--time-size": "11px" } },
        "padding-12": { id: "time-padding-12", label: "Keep current", value: "11px", patch: { "--time-size": "11px" } },
        "padding-20": { id: "time-padding-20", label: "Keep current", value: "11px", patch: { "--time-size": "11px" } },
      },
    },
    {
      id: "unread-badge",
      label: "Unread counter size",
      description: "Diameter and text size of the unread-message counter.",
      options: {
        current: { id: "unread-current", label: "Compact", value: "20px; 11px text", patch: { "--unread-size": "20px", "--unread-text": "11px" } },
        reference: { id: "unread-reference", label: "Slightly larger", value: "22px; 10px text", patch: { "--unread-size": "22px", "--unread-text": "10px" } },
        "padding-4": { id: "unread-padding-4", label: "Keep current", value: "20px; 11px text", patch: { "--unread-size": "20px", "--unread-text": "11px" } },
        "padding-8": { id: "unread-padding-8", label: "Keep current", value: "20px; 11px text", patch: { "--unread-size": "20px", "--unread-text": "11px" } },
        "padding-12": { id: "unread-padding-12", label: "Keep current", value: "20px; 11px text", patch: { "--unread-size": "20px", "--unread-text": "11px" } },
        "padding-20": { id: "unread-padding-20", label: "Keep current", value: "20px; 11px text", patch: { "--unread-size": "20px", "--unread-text": "11px" } },
      },
    },
  ],
  selections: {
    "row-padding": "row-padding-8",
    "title-typography": "title-current",
    "pinned-label": "pinned-reference",
    "preview-typography": "preview-reference",
    "age-treatment": "age-current",
    "meta-width": "meta-current",
    "time-typography": "time-reference",
    "unread-badge": "unread-current",
  },
  fixedRules: [
    { label: "Alert-chip design", value: "Uses the previously approved compact 6px-radius chip: semantic color on code only, navy short name, light-gray divider, and #D8DDE8 border.", provenance: "approved chat-list alert-chip review" },
    { label: "Aggregate alert count", value: "Do not show text such as “2 alertas abiertas”; the individual chips and explicit age provide the required information.", provenance: "current ux_ui_decisions.md authority" },
    { label: "Unread meaning", value: "The blue number is unread messages only; the separate blue dot is the non-numeric unread indicator.", provenance: "current ux_ui_decisions.md authority" },
    { label: "Pin meaning", value: "Fijada changes conversation ordering only and never indicates alert severity.", provenance: "current ux_ui_decisions.md authority" },
    { label: "Content/meta gap", value: "Omitted from the matrix because the 8px current and 12px prototype values were not perceptibly different. Each preview retains its observed source value.", provenance: "review feedback" },
    { label: "Alert-chip flow", value: "Omitted from the matrix because wrapping did not differ in this two-chip fixture. The live preview keeps one compact line; the fixed prototype retains wrapping.", provenance: "review feedback" },
    { label: "Alert-chip size", value: "Match the preview-state controls: approximately 23px high, 10.5px text, and 4px 6px segment padding.", provenance: "review feedback" },
    { label: "Unread-dot alignment", value: "The 6px blue dot is vertically centered on the title's first line and therefore moves with the selected vertical padding and title line height.", provenance: "review feedback" },
  ],
  preview: {
    states: ["default", "hover", "focus", "expanded", "compact"],
    expandedStateLabel: "Menu open",
    fixedPatch: { "--row-surface": "#FFFFFF", "--row-hover": "rgba(0,0,0,.04)", "--row-divider": "#E0E0E0", "--row-column-gap": "8px", "--chips-wrap": "nowrap", "--chips-overflow": "hidden" },
    referenceFixedPatch: { "--row-surface": "#FFFFFF", "--row-hover": "#FBFCFF", "--row-divider": "#E0E0E0", "--row-column-gap": "12px", "--chips-wrap": "wrap", "--chips-overflow": "visible" },
    stateAttributes: {
      expanded: [{ selector: ".row-menu-trigger", attributes: { "aria-expanded": "true" } }],
    },
    html: '<article class="review-row"><button class="row-open" type="button" aria-label="Abrir Producción P15, turno día. 4 mensajes no leídos. 2 alertas abiertas."><span class="unread-dot" aria-hidden="true"></span><span class="conversation-copy"><span class="title-line"><strong>Producción P15 · Turno día</strong><span class="pinned-label">Fijada</span></span><span class="message-preview"><b>Monitor:</b> La bobina CU-98421 sigue sin pesarse.</span><span class="age-line"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"></circle><path d="M12 7v5l3 2"></path></svg><span>Más antigua</span><strong>2 h 14 min</strong></span><span class="alert-chips" aria-label="Alertas abiertas: A05 Sin pesar y A02 En tránsito"><span class="alert-chip"><span class="alert-code error">A05</span><span class="alert-name">Sin pesar</span></span><span class="alert-chip"><span class="alert-code error">A02</span><span class="alert-name">En tránsito</span></span></span></span><span class="conversation-meta"><time>6:02 p. m.</time><span class="unread-count" aria-label="4 mensajes no leídos">4</span></span></button><button class="row-menu-trigger" type="button" aria-label="Acciones de la conversación" aria-expanded="false">•••</button><div class="row-menu" role="menu"><button type="button" role="menuitem">Desfijar conversación</button></div></article>',
    css: `
      .review-row{position:relative;width:min(100%,660px);border-top:1px solid var(--row-divider);border-bottom:1px solid var(--row-divider);color:#00246B;background:var(--row-surface);font-family:Montserrat,system-ui,sans-serif}
      .row-open{position:relative;display:grid;grid-template-columns:minmax(0,1fr) var(--meta-width);gap:var(--row-column-gap);width:100%;padding:var(--row-padding-y) var(--row-padding-x);border:0;color:inherit;background:transparent;text-align:left}
      .conversation-copy{display:block;min-width:0;padding-left:2px}
      .title-line{display:flex;min-width:0;align-items:center;gap:6px}
      .title-line strong{overflow:hidden;font-size:var(--title-size);font-weight:700;line-height:var(--title-line);text-overflow:ellipsis;white-space:nowrap}
      .pinned-label{flex:0 0 auto;padding:var(--pin-padding);border-radius:6px;color:#007ACC;background:rgba(0,122,204,.08);font-size:var(--pin-size);font-weight:700;line-height:1.2}
      .message-preview{display:block;overflow:hidden;margin-top:var(--preview-margin);color:#4D608A;font-size:var(--preview-size);line-height:var(--preview-line);text-overflow:ellipsis;white-space:nowrap}
      .message-preview b{color:#00246B;font-weight:600}
      .age-line{display:inline-flex;min-height:var(--age-height);margin-top:var(--age-margin);padding:var(--age-padding);align-items:center;gap:4px;border-radius:6px;color:#4D608A;background:var(--age-surface);font-size:var(--age-size);line-height:1.3;white-space:nowrap}
      .age-line svg{display:var(--age-icon);width:13px;height:13px;fill:none;stroke:#006BA8;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
      .age-line strong{color:#00246B;font-weight:700;font-variant-numeric:tabular-nums}
      .alert-chips{display:flex;min-width:0;margin-top:4px;gap:4px;overflow:var(--chips-overflow);flex-wrap:var(--chips-wrap)}
      .alert-chip{display:inline-flex;flex:0 0 auto;align-items:stretch;border:1px solid #D8DDE8;border-radius:6px;color:#00246B;background:#FFF;font-size:.66rem;font-weight:600;line-height:1.2;white-space:nowrap}
      .alert-code,.alert-name{display:inline-flex;align-items:center;padding:4px 6px}
      .alert-code{color:#E11D48;font-weight:700}
      .alert-name{border-left:1px solid #E0E0E0}
      .conversation-meta{display:grid;min-width:var(--meta-width);align-content:start;justify-items:end;gap:6px}
      .conversation-meta time{color:#4D608A;font-size:var(--time-size);font-variant-numeric:tabular-nums;white-space:nowrap}
      .unread-count{display:grid;min-width:var(--unread-size);height:var(--unread-size);padding:0 4px;place-items:center;border-radius:9999px;color:#FFF;background:#007ACC;font-size:var(--unread-text);font-weight:700;font-variant-numeric:tabular-nums}
      .unread-dot{position:absolute;top:calc(var(--row-padding-y) + var(--title-half-line));left:4px;width:6px;height:6px;border-radius:50%;background:#007ACC;transform:translateY(-50%)}
      .row-menu-trigger{position:absolute;top:27px;right:8px;display:grid;width:28px;height:28px;padding:0;place-items:center;border:1px solid #D8DDE8;border-radius:6px;color:#00246B;background:#FFF;font-size:10px;font-weight:700;letter-spacing:-1px;opacity:0;pointer-events:none}
      .row-menu{position:absolute;z-index:2;top:58px;right:8px;display:none;min-width:154px;padding:4px;border:1px solid #D8DDE8;border-radius:6px;background:#FFF;box-shadow:0 6px 18px rgba(0,36,107,.14)}
      .row-menu button{width:100%;min-height:32px;padding:0 8px;border:0;border-radius:4px;color:#00246B;background:#FFF;font-size:11px;font-weight:600;text-align:left}
      .row-menu button:hover{background:#F5F5F5}
      .preview-stage[data-state="hover"] .review-row{background:var(--row-hover)}
      .preview-stage[data-state="hover"] .row-menu-trigger,.preview-stage[data-state="focus"] .row-menu-trigger,.preview-stage[data-state="expanded"] .row-menu-trigger{opacity:1;pointer-events:auto}
      .preview-stage[data-state="focus"] .row-open{outline:2px solid #007ACC;outline-offset:-2px}
      .preview-stage[data-state="expanded"] .row-menu{display:block}
      .preview-stage[data-state="compact"] .review-row{width:360px}
      .preview-stage[data-state="compact"] .row-open{grid-template-columns:minmax(0,1fr) auto}
      .preview-stage[data-state="compact"] .row-menu-trigger{display:none}
      .preview-stage[data-state="compact"] .alert-chips{flex-wrap:nowrap;overflow:hidden}
    `,
  },
  approval: {
    status: "approved-and-implemented",
    note: "Approved explicitly in the Codex task on 2026-07-29. Production uses a desktop and keyboard row menu plus an approximately half-second mobile long press. Pin changes remain presentation-only in Phase 6 and do not modify backend contracts or authorization.",
  },
};
