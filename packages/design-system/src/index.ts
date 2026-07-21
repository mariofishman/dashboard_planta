import { createTheme } from "@mui/material/styles";
import tokens from "../../../docs/design/design-system/tokens.json" with { type: "json" };

const value = <T>(token: { $value: T }): T => token.$value;

export const monitorTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: value(tokens.color.brand.cyan), dark: value(tokens.color.brand.cyanHover) },
    secondary: { main: value(tokens.color.brand.navy) },
    success: { main: value(tokens.color.status.success) },
    warning: { main: value(tokens.color.status.warning) },
    error: { main: value(tokens.color.status.danger) },
    background: { default: value(tokens.color.surface.canvas), paper: value(tokens.color.surface.default) },
    text: { primary: value(tokens.color.text.default), secondary: value(tokens.color.text.muted) },
    divider: value(tokens.color.surface.border),
  },
  typography: {
    fontFamily: value(tokens.font.family),
    h1: { fontSize: value(tokens.font.size.xl), fontWeight: value(tokens.font.weight.bold), lineHeight: 1.3, letterSpacing: "-0.01em" },
    h2: { fontSize: value(tokens.font.size.lg), fontWeight: value(tokens.font.weight.semibold), lineHeight: 1.4 },
    body1: { fontSize: value(tokens.font.size.base), lineHeight: 1.5 },
    body2: { fontSize: value(tokens.font.size.md), lineHeight: 1.5 },
    button: { fontSize: value(tokens.font.size.sm), fontWeight: value(tokens.font.weight.semibold), textTransform: "none" },
  },
  shape: { borderRadius: Number.parseInt(value(tokens.radius.md), 10) },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { minHeight: 40, paddingInline: 18, borderRadius: Number.parseInt(value(tokens.radius.md), 10), transition: "background-color 180ms cubic-bezier(0.22, 1, 0.36, 1), transform 180ms cubic-bezier(0.22, 1, 0.36, 1)", "&:active": { transform: "scale(0.98)" } },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { minHeight: 40, backgroundColor: value(tokens.color.surface.default), "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: value(tokens.color.brand.cyan) } },
        notchedOutline: { borderColor: "#C7CFDE" },
        input: { paddingTop: 9, paddingBottom: 9, fontSize: value(tokens.font.size.md), "&::placeholder": { color: value(tokens.color.text.muted), opacity: 1 } },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { color: value(tokens.color.text.muted) } } },
    MuiTab: { styleOverrides: { root: { minHeight: 44, minWidth: 72, paddingInline: 12, fontSize: value(tokens.font.size.sm), textTransform: "none" } } },
    MuiTabs: { styleOverrides: { root: { minHeight: 44 }, indicator: { height: 3, borderRadius: "3px 3px 0 0" } } },
    MuiTableCell: {
      styleOverrides: {
        head: { color: value(tokens.color.text.muted), backgroundColor: "#F8FAFD", fontSize: value(tokens.font.size.xs), fontWeight: value(tokens.font.weight.bold), whiteSpace: "nowrap" },
        body: { fontSize: value(tokens.font.size.sm), borderColor: value(tokens.color.surface.border) },
      },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: value(tokens.font.weight.semibold) } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiCssBaseline: {
      styleOverrides: {
        body: { WebkitFontSmoothing: "antialiased" },
        "h1,h2,h3": { textWrap: "balance" },
        "*:focus-visible": { outline: `2px solid ${value(tokens.color.brand.cyan)}`, outlineOffset: 2 },
        "@media (prefers-reduced-motion: reduce)": { "*,*::before,*::after": { scrollBehavior: "auto !important", transitionDuration: "0.01ms !important", animationDuration: "0.01ms !important" } },
      },
    },
  },
});

export const monitorTokens = tokens;
