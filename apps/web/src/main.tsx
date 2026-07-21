import { CssBaseline, ThemeProvider } from "@mui/material";
import { monitorTheme } from "@monitor/design-system";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={monitorTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
);
