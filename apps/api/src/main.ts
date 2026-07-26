import { buildMonitorServer } from "./server.js";
import type { MonitorServer } from "./server.js";

let server: MonitorServer | undefined;
let shutdownPromise: Promise<void> | undefined;

const shutdown = (exitCode: number) => {
  shutdownPromise ??= (async () => {
    try {
      await server?.close();
    } finally {
      process.exitCode = exitCode;
    }
  })();
  return shutdownPromise;
};

process.once("SIGINT", () => { void shutdown(0); });
process.once("SIGTERM", () => { void shutdown(0); });

try {
  server = await buildMonitorServer();
  await server.app.listen({ host: server.config.host, port: server.config.port });
} catch (error) {
  await shutdown(1);
  throw error;
}
