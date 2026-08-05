# Monitor web app

## Run locally

Run the complete application from the repository root so both the API and web server start:

```sh
npm install
npm run db:test-source:start
npm run db:test-source:validate
npm run dev
```

The web app runs at <http://127.0.0.1:5173> and the local API runs at <http://127.0.0.1:3000>.

Development Laboratory actions write only to the separate local `test_database`, and Monitor polls it through the read-only source account. The retired Monitor-owned EmusaSoft source simulator is unavailable in application and test configuration.

Choose a local test profile when the sign-in screen appears. Opening a direct link while signed out is safe: after signing in, the app keeps the requested URL.

## App URLs

| App area | Direct URL | Notes |
| --- | --- | --- |
| Dashboard / alert control | <http://127.0.0.1:5173/> | Main incident dashboard. |
| Chat list | <http://127.0.0.1:5173/chats> | Global list for administrators. |
| Operational responsibility roster | <http://127.0.0.1:5173/roster> | Responsibility assignments and rotations. |
| Detection scenario lab | <http://127.0.0.1:5173/dev/scenarios> | Local development only; requires a profile with `monitor:admin`, such as Gerencia de planta. |

## Direct chat-detail fixtures

These stable UI-only fixtures open chat detail without requiring a backend conversation ID:

| Conversation | Direct URL |
| --- | --- |
| Producción P15 · Turno día | <http://127.0.0.1:5173/chats/ui-demo-production-p15> |
| Supervisión de impresión | <http://127.0.0.1:5173/chats/ui-demo-supervision> |
| Cierre de OT · Impresión | <http://127.0.0.1:5173/chats/ui-demo-close> |
| Almacén · Turno día | <http://127.0.0.1:5173/chats/ui-demo-warehouse> |
| Jorge A. | <http://127.0.0.1:5173/chats/ui-demo-jorge> |
| Extrusión · Turno día | <http://127.0.0.1:5173/chats/ui-demo-extrusion> |
| Sellado · Turno día | <http://127.0.0.1:5173/chats/ui-demo-sealing> |
| Ana M. | <http://127.0.0.1:5173/chats/ui-demo-ana> |

Backend-connected chat details use the same route pattern:

```text
http://127.0.0.1:5173/chats/<conversation-id>
```

## Service checks

| Service | URL |
| --- | --- |
| Web server | <http://127.0.0.1:5173> |
| API readiness | <http://127.0.0.1:3000/health/ready> |

General repository setup and validation commands are documented in the [root README](../../README.md).
