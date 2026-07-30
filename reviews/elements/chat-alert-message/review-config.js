window.ELEMENT_REVIEW_CONFIG = {
  id: "monitor-chat-alert-message-a05-v1",
  title: "Monitor alert message",
  summary: "Observed implementation and prototype decisions are separated so each property can be selected independently. The complete preview starts as Current.",
  evidence: [
    { label: "Current implementation", path: "apps/web/src/Chats.tsx", kind: "observed React/MUI source and computed browser styles" },
    { label: "Reference structure", path: "prototypes/current/chat/chat-detail.html", kind: "observed local prototype markup" },
    { label: "Reference styling", path: "prototypes/current/chat/chat-detail.css", kind: "observed local prototype CSS" },
    { label: "Design tokens", path: "docs/design/design-system/tokens.json", kind: "current authority" },
    { label: "Selected reference", path: "Browser Comment 1 in this Codex task", kind: "explicit user-supplied reference" },
  ],
  columns: [
    { id: "current", label: "Current implementation", provenance: "observed current implementation", description: "Rendered React/MUI treatment at 427px" },
    { id: "reference", label: "Prototype reference", provenance: "observed prototype reference", description: "Selected chat-detail prototype at 427px" },
  ],
  rows: [
    {
      id: "message-width",
      label: "Message width",
      description: "Overall alert-message width before inner-card styling.",
      options: {
        current: { id: "message-width-current", label: "Wider", value: "min(96%, 560px)", patch: { "--message-width": "min(96%, 560px)" } },
        reference: { id: "message-width-reference", label: "Narrower", value: "min(92%, 440px)", patch: { "--message-width": "min(92%, 440px)" } },
      },
    },
    {
      id: "shell-padding",
      label: "Outer message padding",
      description: "Spacing between the outer shell and the alert attachment.",
      options: {
        current: { id: "shell-padding-current", label: "Asymmetric", value: "4px 6px 4px 4px", patch: { "--shell-padding": "4px 6px 4px 4px" } },
        reference: { id: "shell-padding-reference", label: "Nearly even", value: "4px 5px", patch: { "--shell-padding": "4px 5px" } },
      },
    },
    {
      id: "attachment-border",
      label: "Attachment border",
      description: "Semantic edge strength of the alert attachment.",
      options: {
        current: { id: "attachment-border-current", label: "Solid danger", value: "1px solid #E11D48", patch: { "--attachment-border": "1px solid #E11D48" } },
        reference: { id: "attachment-border-reference", label: "Soft danger tint", value: "1px solid rgba(225,29,72,.22)", patch: { "--attachment-border": "1px solid rgba(225,29,72,.22)" } },
      },
    },
    {
      id: "attachment-radius",
      label: "Attachment radius",
      description: "Corner geometry of the structured alert attachment.",
      options: {
        current: { id: "attachment-radius-current", label: "Tight", value: "7.5px", patch: { "--attachment-radius": "7.5px" } },
        reference: { id: "attachment-radius-reference", label: "Medium", value: "10px", patch: { "--attachment-radius": "10px" } },
      },
    },
    {
      id: "attachment-shadow",
      label: "Attachment shadow",
      description: "Separation of the operational file from the message shell.",
      options: {
        current: { id: "attachment-shadow-current", label: "None", value: "none", patch: { "--attachment-shadow": "none" } },
        reference: { id: "attachment-shadow-reference", label: "Low navy shadow", value: "0 2px 6px rgba(0,36,107,.07)", patch: { "--attachment-shadow": "0 2px 6px rgba(0,36,107,.07)" } },
      },
    },
    {
      id: "header-gap",
      label: "Header gap",
      description: "Horizontal separation among status, code, and age.",
      options: {
        current: { id: "header-gap-current", label: "Compact", value: "4px", patch: { "--header-gap": "4px" } },
        reference: { id: "header-gap-reference", label: "Clear", value: "8px", patch: { "--header-gap": "8px" } },
      },
    },
    {
      id: "header-padding",
      label: "Header padding",
      description: "Inset around the status row at the reviewed width.",
      options: {
        current: { id: "header-padding-current", label: "Compact all around", value: "3.2px 6px", patch: { "--header-padding": "3.2px 6px" } },
        reference: { id: "header-padding-reference", label: "Horizontal inset", value: "0 9px 0 7px", patch: { "--header-padding": "0 9px 0 7px" } },
      },
    },
    {
      id: "status-surface",
      label: "Status surface",
      description: "Fill behind the Error label.",
      options: {
        current: { id: "status-surface-current", label: "White", value: "transparent", patch: { "--status-background": "transparent" } },
        reference: { id: "status-surface-reference", label: "Rose tint", value: "rgba(225,29,72,.08)", patch: { "--status-background": "rgba(225,29,72,.08)" } },
      },
    },
    {
      id: "status-border",
      label: "Status border",
      description: "Outline around the Error label.",
      options: {
        current: { id: "status-border-current", label: "Outlined", value: "1px solid rgba(225,29,72,.7)", patch: { "--status-border": "1px solid rgba(225,29,72,.7)" } },
        reference: { id: "status-border-reference", label: "No outline", value: "1px solid transparent", patch: { "--status-border": "1px solid transparent" } },
      },
    },
    {
      id: "status-radius",
      label: "Status radius",
      description: "Geometry of the semantic Error label only.",
      options: {
        current: { id: "status-radius-current", label: "Compact rectangle", value: "6px", patch: { "--status-radius": "6px" } },
        reference: { id: "status-radius-reference", label: "Status pill", value: "9999px", patch: { "--status-radius": "9999px" } },
      },
    },
    {
      id: "status-marker",
      label: "Status marker",
      description: "Dot preceding the Error label.",
      options: {
        current: { id: "status-marker-current", label: "No dot", value: "none", patch: { "--status-dot-display": "none", "--status-dot-size": "0px" } },
        reference: { id: "status-marker-reference", label: "Red dot", value: "6px", patch: { "--status-dot-display": "inline-block", "--status-dot-size": "6px" } },
      },
    },
    {
      id: "code-surface",
      label: "Code surface",
      description: "Fill behind A05.",
      options: {
        current: { id: "code-surface-current", label: "MUI selected gray", value: "rgba(0,0,0,.08)", patch: { "--code-background": "rgba(0,0,0,.08)" } },
        reference: { id: "code-surface-reference", label: "Canvas gray", value: "#F5F5F5", patch: { "--code-background": "#F5F5F5" } },
      },
    },
    {
      id: "code-radius",
      label: "Code radius",
      description: "Geometry of the A05 badge.",
      options: {
        current: { id: "code-radius-current", label: "Compact rectangle", value: "6px", patch: { "--code-radius": "6px" } },
        reference: { id: "code-radius-reference", label: "Code pill", value: "9999px", patch: { "--code-radius": "9999px" } },
      },
    },
    {
      id: "age-surface",
      label: "Age surface",
      description: "Container behind unresolved duration.",
      options: {
        current: { id: "age-surface-current", label: "Plain text", value: "transparent; 0 padding", patch: { "--age-background": "transparent", "--age-padding": "0", "--age-radius": "0" } },
        reference: { id: "age-surface-reference", label: "Rose status capsule", value: "rgba(225,29,72,.08); 3px 7px", patch: { "--age-background": "rgba(225,29,72,.08)", "--age-padding": "3px 7px", "--age-radius": "9999px" } },
      },
    },
    {
      id: "age-typography",
      label: "Age typography",
      description: "Size and compactness of the duration label.",
      options: {
        current: { id: "age-typography-current", label: "Routine caption", value: "11px / 15.4px", patch: { "--age-font-size": "11px", "--age-line-height": "15.4px" } },
        reference: { id: "age-typography-reference", label: "Micro status", value: "9px / 1", patch: { "--age-font-size": "9px", "--age-line-height": "1" } },
      },
    },
    {
      id: "body-padding",
      label: "Body padding",
      description: "Inset around title, summary, and facts.",
      options: {
        current: { id: "body-padding-current", label: "Token spacing", value: "8px", patch: { "--body-padding": "8px" } },
        reference: { id: "body-padding-reference", label: "Slightly roomier", value: "9px", patch: { "--body-padding": "9px" } },
      },
    },
    {
      id: "title-typography",
      label: "Title typography",
      description: "Primary operational title hierarchy.",
      options: {
        current: { id: "title-typography-current", label: "Body emphasis", value: "12px / 18px / 700", patch: { "--title-font-size": "12px", "--title-line-height": "18px" } },
        reference: { id: "title-typography-reference", label: "Alert headline", value: "15px / 1.35 / 700", patch: { "--title-font-size": "15px", "--title-line-height": "1.35" } },
      },
    },
    {
      id: "facts-divider",
      label: "Facts divider",
      description: "Separation between description and operational facts.",
      options: {
        current: { id: "facts-divider-current", label: "No divider", value: "none", patch: { "--facts-border": "0", "--facts-padding-top": "0" } },
        reference: { id: "facts-divider-reference", label: "Light divider", value: "1px solid #E0E0E0; 6px top padding", patch: { "--facts-border": "1px solid #E0E0E0", "--facts-padding-top": "6px" } },
      },
    },
    {
      id: "facts-density",
      label: "Facts density",
      description: "Size of OT, Máquina, and Detectada metadata capsules.",
      options: {
        current: { id: "facts-density-current", label: "MUI chips", value: "28px high; 11px text", patch: { "--fact-min-height": "28px", "--fact-padding": "0 8px", "--fact-font-size": "11px" } },
        reference: { id: "facts-density-reference", label: "Micro facts", value: "3px 6px; 9px text", patch: { "--fact-min-height": "auto", "--fact-padding": "3px 6px", "--fact-font-size": "9px" } },
      },
    },
    {
      id: "primary-action-copy",
      label: "First action copy",
      description: "Observed wording; reference implies navigation that production does not currently provide.",
      options: {
        current: { id: "primary-action-copy-current", label: "Copy identifier", value: "Copiar OT 151087.3", patch: { "--primary-action-label": "'Copiar OT 151087.3'" } },
        reference: { id: "primary-action-copy-reference", label: "Open work order", value: "Abrir OT 151087.3", patch: { "--primary-action-label": "'Abrir OT 151087.3'" } },
      },
    },
    {
      id: "secondary-action-copy",
      label: "Second action copy",
      description: "Label for revealing supporting context.",
      options: {
        current: { id: "secondary-action-copy-current", label: "Explanation", value: "Ver explicación y solución", patch: { "--secondary-action-label": "'Ver explicación y solución'" } },
        reference: { id: "secondary-action-copy-reference", label: "Summary", value: "Ver resumen y solución", patch: { "--secondary-action-label": "'Ver resumen y solución'" } },
      },
    },
  ],
  selections: {
    "message-width": "message-width-reference",
    "shell-padding": "shell-padding-reference",
    "attachment-border": "attachment-border-reference",
    "attachment-radius": "attachment-radius-current",
    "attachment-shadow": "attachment-shadow-reference",
    "header-gap": "header-gap-reference",
    "header-padding": "header-padding-reference",
    "status-surface": "status-surface-current",
    "status-border": "status-border-current",
    "status-radius": "status-radius-current",
    "status-marker": "status-marker-reference",
    "code-surface": "code-surface-current",
    "code-radius": "code-radius-current",
    "age-surface": "age-surface-current",
    "age-typography": "age-typography-reference",
    "body-padding": "body-padding-current",
    "title-typography": "title-typography-current",
    "facts-divider": "facts-divider-reference",
    "facts-density": "facts-density-reference",
    "primary-action-copy": "primary-action-copy-reference",
    "secondary-action-copy": "secondary-action-copy-current",
  },
  fixedRules: [
    { label: "Outer message radius", value: "Omitted from the matrix because 7.5px versus 10px was not perceptible; live hybrid retains 7.5px and the fixed prototype retains 10px.", provenance: "review feedback" },
    { label: "Sender color", value: "Omitted from the matrix because #007ACC versus #006BA8 was not perceptible; each preview retains its observed source value.", provenance: "review feedback" },
    { label: "Unresolved-age color", value: "Before 2 hours: muted navy #4D608A. From 2 hours onward: deep danger #B5143A. This 2 h 14 min fixture therefore uses deep danger.", provenance: "user-defined conditional rule" },
    { label: "Action layout", value: "Always two equal columns. Narrow state shortens the labels to “OT” and “Ver” instead of stacking the actions.", provenance: "user-defined responsive rule" },
  ],
  preview: {
    states: ["default", "hover", "focus", "expanded", "compact"],
    fixedPatch: { "--shell-radius": "7.5px", "--sender-color": "#007ACC", "--age-color": "#B5143A" },
    referenceFixedPatch: { "--shell-radius": "10px", "--sender-color": "#006BA8", "--age-color": "#B5143A" },
    html: '<article class="review-message"><div class="review-shell"><span class="review-sender">Monitor</span><section class="review-alert" tabindex="0" aria-labelledby="review-alert-title"><header class="review-alert__header"><span class="review-status"><i aria-hidden="true"></i>Error</span><span class="review-code">A05</span><span class="review-age">2 h 14 min sin resolver</span></header><div class="review-alert__body"><h2 id="review-alert-title">Bobina CU-98421 sin pesar</h2><p>La bobina producida no tiene un peso registrado y todavía permanece asociada a P15.</p><dl class="review-facts"><div><dt>OT</dt><dd>151087.3</dd></div><div><dt>Máquina</dt><dd>P15</dd></div><div><dt>Detectada</dt><dd>3:48 p. m.</dd></div></dl></div><div class="review-actions"><button class="review-action review-action--primary" type="button" aria-label="Acción de OT"><span>Acción de OT</span></button><button class="review-action review-action--secondary" type="button" aria-expanded="false"><span>Mostrar ayuda</span></button></div><div class="review-resolution"><strong>Qué está bloqueando</strong><p>Sin el peso, EmusaSoft no puede calcular el costo ni registrar correctamente la cantidad en inventario.</p><strong>Cómo resolverlo</strong><ol><li>Pesar la bobina CU-98421.</li><li>Registrar la lectura de la balanza en la OT.</li></ol></div></section><time>3:48 p. m.</time></div></article>',
    css: `
      .review-message{width:var(--message-width);max-width:100%;font-family:Montserrat,system-ui,sans-serif;color:#00246B}
      .review-shell{padding:var(--shell-padding);border:1px solid #E0E0E0;border-radius:var(--shell-radius);background:#FFF}
      .review-sender{display:block;min-height:16px;margin:0 30px 2px 5px;color:var(--sender-color);font-size:11px;font-weight:700;line-height:1.15}
      .review-alert{overflow:hidden;border:var(--attachment-border);border-radius:var(--attachment-radius);background:#FFF;box-shadow:var(--attachment-shadow);outline:none}
      .review-alert__header{display:flex;align-items:center;gap:var(--header-gap);min-height:34px;padding:var(--header-padding);border-bottom:1px solid #E0E0E0;background:rgba(225,29,72,.045)}
      .review-status{display:inline-flex;align-items:center;gap:5px;min-height:28px;padding:0 8px;border:var(--status-border);border-radius:var(--status-radius);color:#E11D48;background:var(--status-background);font-size:10px;font-weight:700;white-space:nowrap}
      .review-status i{display:var(--status-dot-display);width:var(--status-dot-size);height:var(--status-dot-size);border-radius:50%;background:#E11D48}
      .review-code{display:inline-grid;place-items:center;min-height:28px;padding:0 8px;border-radius:var(--code-radius);background:var(--code-background);font-size:10px;font-weight:700;white-space:nowrap}
      .review-age{margin-left:auto;padding:var(--age-padding);border-radius:var(--age-radius);color:var(--age-color);background:var(--age-background);font-size:var(--age-font-size);font-weight:700;line-height:var(--age-line-height);font-variant-numeric:tabular-nums;white-space:nowrap}
      .review-alert__body{padding:var(--body-padding)}
      .review-alert__body h2{margin:0;font-size:var(--title-font-size);font-weight:700;line-height:var(--title-line-height);text-wrap:balance}
      .review-alert__body>p{margin:3px 0 0;color:#4D608A;font-size:11px;line-height:1.4}
      .review-facts{display:flex;flex-wrap:wrap;gap:5px;margin:7px 0 0;padding-top:var(--facts-padding-top);border-top:var(--facts-border)}
      .review-facts div{display:flex;align-items:center;gap:5px;min-height:var(--fact-min-height);padding:var(--fact-padding);border-radius:6px;background:#F5F5F5}
      .review-facts dt{color:#4D608A;font-size:var(--fact-font-size)}
      .review-facts dd{margin:0;font-size:var(--fact-font-size);font-weight:700;font-variant-numeric:tabular-nums}
      .review-actions{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #E0E0E0}
      .review-action{display:grid;place-items:center;min-height:40px;padding:0 8px;border:0;border-radius:0;color:#006BA8;background:#FFF;font:700 10px/1.2 Montserrat,system-ui,sans-serif;text-align:center}
      .review-action+.review-action{border-left:1px solid #E0E0E0}
      .review-action--secondary{background:rgba(0,122,204,.065)}
      .review-action span{font-size:0;color:transparent}
      .review-action--primary span::after{content:var(--primary-action-label);color:#006BA8;font-size:10px}
      .review-action--secondary span::after{content:var(--secondary-action-label);color:#006BA8;font-size:10px}
      .review-resolution{display:none;padding:9px;border-top:1px solid #E0E0E0;background:#F8FAFF}
      .review-resolution strong{display:block;font-size:11px}
      .review-resolution p,.review-resolution ol{margin:4px 0 8px;color:#4D608A;font-size:10px;line-height:1.55}
      .review-shell>time{display:block;margin-top:3px;color:#4D608A;font-size:9px;text-align:right;font-variant-numeric:tabular-nums}
      .preview-stage[data-state="hover"] .review-action--secondary{background:#E2EBFD}
      .preview-stage[data-state="focus"] .review-alert{outline:2px solid #3D7EFF;outline-offset:2px}
      .preview-stage[data-state="expanded"] .review-resolution{display:block}
      .preview-stage[data-state="compact"] .review-message{width:100%;max-width:340px}
      .preview-stage[data-state="compact"] .review-action--primary span::after{content:'OT'}
      .preview-stage[data-state="compact"] .review-action--secondary span::after{content:'Ver'}
    `,
    stateAttributes: {
      expanded: [{ selector: ".review-action--secondary", attributes: { "aria-expanded": true } }],
    },
  },
  approval: {
    status: "approved-and-implemented",
    note: "Approved explicitly in the Codex task on 2026-07-29. The production OT action remains a copy action until the Phase 10 navigation contract permits a supported EmusaSoft route.",
  },
};
