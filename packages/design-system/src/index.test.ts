import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { monitorSemanticTokens, monitorTheme, monitorTokens } from "./index.js";

const components = monitorTheme.components as unknown as Record<string, { styleOverrides?: Record<string, unknown> }>;

const componentRoot = (name: string) => {
  const root = components[name]?.styleOverrides?.root;
  assert.equal(typeof root, "object", `${String(name)} must have object root overrides`);
  return root as Record<string, unknown>;
};

test("enforces the approved compact Monitor scale in shared MUI defaults", () => {
  assert.equal(monitorTheme.typography.h2.fontSize, monitorSemanticTokens.typography.sectionTitle);
  assert.equal(monitorTheme.typography.body2.fontSize, monitorSemanticTokens.typography.primaryData);
  assert.equal(monitorTheme.typography.caption.fontSize, monitorSemanticTokens.typography.routine);
  assert.equal(monitorTheme.typography.button.fontSize, monitorSemanticTokens.typography.routine);
  assert.equal(monitorTheme.shape.borderRadius, Number.parseInt(monitorSemanticTokens.control.radius, 10));

  for (const name of ["MuiButton", "MuiToggleButton", "MuiOutlinedInput", "MuiTab", "MuiChip"] as const) {
    const root = componentRoot(name);
    assert.equal(root.height, monitorSemanticTokens.control.visibleHeight, `${name} height`);
    assert.equal(root.borderRadius, Number.parseInt(monitorSemanticTokens.control.radius, 10), `${name} radius`);
  }

  const tab = componentRoot("MuiTab");
  assert.equal(tab.fontSize, monitorSemanticTokens.typography.routine);
  assert.equal(tab.paddingInline, monitorSemanticTokens.control.paddingInline);

  const tableHead = monitorTheme.components?.MuiTableCell?.styleOverrides?.head;
  const tableBody = monitorTheme.components?.MuiTableCell?.styleOverrides?.body;
  assert.equal(typeof tableHead, "object");
  assert.equal(typeof tableBody, "object");
  assert.equal((tableHead as Record<string, unknown>).fontSize, monitorSemanticTokens.typography.routine);
  assert.equal((tableBody as Record<string, unknown>).fontSize, monitorSemanticTokens.typography.primaryData);

  const menuItem = componentRoot("MuiMenuItem");
  assert.equal(menuItem.minHeight, monitorSemanticTokens.control.visibleHeight);
  assert.equal(menuItem.fontSize, monitorSemanticTokens.typography.routine);
});

test("resolves semantic product roles from primitive design tokens", () => {
  assert.equal(monitorSemanticTokens.typography.routine, monitorTokens.font.size.routine.$value);
  assert.equal(monitorSemanticTokens.typography.primaryData, monitorTokens.font.size.xs.$value);
  assert.equal(monitorSemanticTokens.typography.sectionTitle, monitorTokens.font.size.md.$value);
  assert.equal(monitorSemanticTokens.control.visibleHeight, monitorTokens.control.compactHeight.$value);
  assert.equal(monitorSemanticTokens.control.radius, monitorTokens.radius.sm.$value);
  assert.equal(monitorSemanticTokens.color.action, monitorTokens.color.brand.cyan.$value);
  assert.equal(monitorSemanticTokens.color.lifecycleOpen, monitorTokens.color.status.danger.$value);
});

test("keeps the CSS token output synchronized with the approved compact tokens", () => {
  const css = readFileSync(new URL("../../../docs/design/design-system/tokens.css", import.meta.url), "utf8");
  const expected = {
    "font-size-routine": monitorTokens.font.size.routine.$value,
    "control-compact-height": monitorTokens.control.compactHeight.$value,
    "control-compact-padding-inline": monitorTokens.control.compactPaddingInline.$value,
    "control-accessible-hit-target": monitorTokens.control.accessibleHitTarget.$value,
  };

  for (const [name, tokenValue] of Object.entries(expected)) {
    assert.match(css, new RegExp(`--${name}:\\s*${tokenValue.replace(".", "\\.")};`), name);
  }
  assert.match(css, /--semantic-type-routine:\s*var\(--font-size-routine\);/);
  assert.match(css, /--semantic-control-visible-height:\s*var\(--control-compact-height\);/);
  assert.match(css, /--semantic-control-radius:\s*var\(--radius-sm\);/);
  assert.match(css, /--semantic-color-action:\s*var\(--color-brand-cyan\);/);
});
