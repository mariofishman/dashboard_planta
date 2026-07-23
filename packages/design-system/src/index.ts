import { createTheme } from "@mui/material/styles";
import tokens from "../../../docs/design/design-system/tokens.json" with { type: "json" };

const value = <T>(token: { $value: T }): T => token.$value;
type TokenLeaf = { $value: unknown };

const tokenAt = (path: string): TokenLeaf => {
  const token = path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, tokens);
  if (!token || typeof token !== "object" || !("$value" in token)) throw new Error(`Unknown design token: ${path}`);
  return token as TokenLeaf;
};

const resolve = <T>(token: TokenLeaf, seen = new Set<string>()): T => {
  const raw = token.$value;
  if (typeof raw !== "string") return raw as T;
  const reference = raw.match(/^\{(.+)}$/)?.[1];
  if (!reference) return raw as T;
  if (seen.has(reference)) throw new Error(`Circular design-token reference: ${reference}`);
  seen.add(reference);
  return resolve<T>(tokenAt(reference), seen);
};

const semantic = tokens.semantic;
export const monitorSemanticTokens = {
  color: {
    structure: resolve<string>(semantic.color.structure),
    action: resolve<string>(semantic.color.action),
    actionHover: resolve<string>(semantic.color.actionHover),
    canvas: resolve<string>(semantic.color.canvas),
    surface: resolve<string>(semantic.color.surface),
    selected: resolve<string>(semantic.color.selected),
    border: resolve<string>(semantic.color.border),
    textPrimary: resolve<string>(semantic.color.textPrimary),
    textSecondary: resolve<string>(semantic.color.textSecondary),
    textInverse: resolve<string>(semantic.color.textInverse),
    textInverseMuted: resolve<string>(semantic.color.textInverseMuted),
    inverseDivider: resolve<string>(semantic.color.inverseDivider),
    inverseSkeleton: resolve<string>(semantic.color.inverseSkeleton),
    lifecycleResolved: resolve<string>(semantic.color.lifecycleResolved),
    lifecycleOpen: resolve<string>(semantic.color.lifecycleOpen),
    lifecycleClosed: resolve<string>(semantic.color.lifecycleClosed),
  },
  typography: {
    routine: resolve<string>(semantic.typography.routine),
    primaryData: resolve<string>(semantic.typography.primaryData),
    sectionTitle: resolve<string>(semantic.typography.sectionTitle),
    body: resolve<string>(semantic.typography.body),
  },
  control: {
    visibleHeight: resolve<string>(semantic.control.visibleHeight),
    paddingInline: resolve<string>(semantic.control.paddingInline),
    radius: resolve<string>(semantic.control.radius),
    desktopHitTarget: resolve<string>(semantic.control.desktopHitTarget),
    touchHitTarget: resolve<string>(semantic.control.touchHitTarget),
  },
} as const;

const ui = monitorSemanticTokens;

export const monitorTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: ui.color.action, dark: ui.color.actionHover },
    secondary: { main: ui.color.structure },
    success: { main: ui.color.lifecycleResolved },
    warning: { main: ui.color.lifecycleClosed },
    error: { main: ui.color.lifecycleOpen },
    background: { default: ui.color.canvas, paper: ui.color.surface },
    text: { primary: ui.color.textPrimary, secondary: ui.color.textSecondary },
    divider: ui.color.border,
  },
  typography: {
    fontFamily: value(tokens.font.family),
    h1: { fontSize: value(tokens.font.size.xl), fontWeight: value(tokens.font.weight.bold), lineHeight: 1.3, letterSpacing: "-0.01em" },
    h2: { fontSize: ui.typography.sectionTitle, fontWeight: value(tokens.font.weight.semibold), lineHeight: 1.4 },
    h3: { fontSize: ui.typography.sectionTitle, fontWeight: value(tokens.font.weight.semibold), lineHeight: 1.4 },
    subtitle1: { fontSize: ui.typography.sectionTitle, fontWeight: value(tokens.font.weight.semibold), lineHeight: 1.4 },
    subtitle2: { fontSize: ui.typography.primaryData, fontWeight: value(tokens.font.weight.semibold), lineHeight: 1.4 },
    body1: { fontSize: ui.typography.body, lineHeight: 1.5 },
    body2: { fontSize: ui.typography.primaryData, lineHeight: 1.5 },
    caption: { fontSize: ui.typography.routine, lineHeight: 1.4 },
    overline: { fontSize: ui.typography.routine, fontWeight: value(tokens.font.weight.semibold), lineHeight: 1.4, letterSpacing: "0.02em" },
    button: { fontSize: ui.typography.routine, fontWeight: value(tokens.font.weight.semibold), textTransform: "none" },
  },
  shape: { borderRadius: Number.parseInt(ui.control.radius, 10) },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { height: ui.control.visibleHeight, minHeight: ui.control.visibleHeight, paddingBlock: 0, paddingInline: ui.control.paddingInline, borderRadius: Number.parseInt(ui.control.radius, 10), fontSize: ui.typography.routine, lineHeight: 1.4, transition: `background-color ${value(tokens.motion.fast)} ${value(tokens.motion.easeOut)}, transform ${value(tokens.motion.fast)} ${value(tokens.motion.easeOut)}`, "&:active": { transform: "scale(0.98)" } },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: { height: ui.control.visibleHeight, minHeight: ui.control.visibleHeight, paddingBlock: 0, paddingInline: ui.control.paddingInline, borderRadius: Number.parseInt(ui.control.radius, 10), fontSize: ui.typography.routine, lineHeight: 1.4, textTransform: "none" },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { height: ui.control.visibleHeight, minHeight: ui.control.visibleHeight, borderRadius: Number.parseInt(ui.control.radius, 10), backgroundColor: ui.color.surface, fontSize: ui.typography.routine, "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: ui.color.action } },
        notchedOutline: { borderColor: ui.color.border },
        input: { padding: `4px ${ui.control.paddingInline}`, fontSize: ui.typography.routine, "&::placeholder": { color: ui.color.textSecondary, opacity: 1 } },
      },
    },
    MuiInputBase: { styleOverrides: { root: { fontSize: ui.typography.routine } } },
    MuiInputLabel: { styleOverrides: { root: { color: ui.color.textSecondary, fontSize: ui.typography.routine } } },
    MuiFormLabel: { styleOverrides: { root: { fontSize: ui.typography.routine } } },
    MuiFormControlLabel: { styleOverrides: { label: { fontSize: ui.typography.routine } } },
    MuiTab: { styleOverrides: { root: { height: ui.control.visibleHeight, minHeight: ui.control.visibleHeight, minWidth: ui.control.visibleHeight, paddingBlock: 0, paddingInline: ui.control.paddingInline, borderRadius: Number.parseInt(ui.control.radius, 10), fontSize: ui.typography.routine, lineHeight: 1.4, textTransform: "none" } } },
    MuiTabs: { styleOverrides: { root: { minHeight: ui.control.visibleHeight }, indicator: { height: 2, borderRadius: "2px 2px 0 0" } } },
    MuiTableCell: {
      styleOverrides: {
        head: { color: ui.color.textSecondary, backgroundColor: ui.color.canvas, fontSize: ui.typography.routine, fontWeight: value(tokens.font.weight.bold), lineHeight: 1.4, whiteSpace: "nowrap" },
        body: { fontSize: ui.typography.primaryData, lineHeight: 1.4, borderColor: ui.color.border },
      },
    },
    MuiChip: { styleOverrides: { root: { height: ui.control.visibleHeight, borderRadius: Number.parseInt(ui.control.radius, 10), fontSize: ui.typography.routine, fontWeight: value(tokens.font.weight.semibold) }, label: { paddingInline: ui.control.paddingInline } } },
    MuiMenuItem: { styleOverrides: { root: { minHeight: ui.control.visibleHeight, paddingBlock: 0, paddingInline: ui.control.paddingInline, fontSize: ui.typography.routine, lineHeight: 1.4 } } },
    MuiDialogTitle: { styleOverrides: { root: { padding: 16, fontSize: ui.typography.sectionTitle, fontWeight: value(tokens.font.weight.semibold) } } },
    MuiDialogContent: { styleOverrides: { root: { paddingInline: 16 } } },
    MuiDialogActions: { styleOverrides: { root: { padding: 16 } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiCssBaseline: {
      styleOverrides: {
        body: { WebkitFontSmoothing: "antialiased" },
        "h1,h2,h3": { textWrap: "balance" },
        "*:focus-visible": { outline: `2px solid ${ui.color.action}`, outlineOffset: 2 },
        "@media (prefers-reduced-motion: reduce)": { "*,*::before,*::after": { scrollBehavior: "auto !important", transitionDuration: "0.01ms !important", animationDuration: "0.01ms !important" } },
      },
    },
  },
});

export const monitorTokens = tokens;
