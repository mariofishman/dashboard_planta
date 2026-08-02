import type { SessionResponse } from "@monitor/contracts";

export function ScenarioLab({
  session: _session,
  onLogout: _onLogout,
}: {
  session: SessionResponse;
  onLogout: () => void;
}) {
  return (
    <iframe
      title="Laboratorio de alertas A02, A03 y A05"
      src="/dev/scenarios/alertas-fake-v2-connected.html"
      style={{ display: "block", width: "100%", height: "100vh", border: 0 }}
    />
  );
}
