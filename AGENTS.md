# EmusaSoft MCP

- Whenever the user asks to connect, test, or use the EmusaSoft MCP, first load `EMUSASOFT_MCP_TOKEN` from the project-root `.env` file.
- Use `/Users/mariofishman/projects/dashboard_planta/.env` as the canonical credential source.
- Never print, log, quote, commit, or expose the token value.
- Verify only that the variable exists and is non-empty before connecting.
- If the native MCP connection cannot access the project `.env`, perform the authenticated MCP request through a process that explicitly loads the `.env` file.
