# EmusaSoft MCP

- Whenever the user asks to connect, test, or use the EmusaSoft MCP, first load `EMUSASOFT_MCP_TOKEN` from the project-root `.env` file.
- Use `/Users/mariofishman/projects/dashboard_planta/.env` as the canonical credential source.
- Never print, log, quote, commit, or expose the token value.
- Verify only that the variable exists and is non-empty before connecting.
- If the native MCP connection cannot access the project `.env`, perform the authenticated MCP request through a process that explicitly loads the `.env` file.

# Approval and delivery workflow

- Do not ask the user to approve routine, reversible implementation choices or successful test results.
- Ask for approval only for product or business boundaries, paid commitments, credentials or external access, irreversible actions, or externally binding decisions. Explain the practical consequence in plain language.
- Record an explicit user decision in the authoritative project documents and do not ask for a second vague “overall” approval of the same decision.
- Phases 1 through 9 are local-first and use mock identities, synthetic fixtures, and protected local/sample databases. Real EmusaSoft authentication, Aurora access, production-query validation, and deployment integration belong to Phase 10.
