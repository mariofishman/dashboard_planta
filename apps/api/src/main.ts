import { buildMonitorServer } from "./server.js";

const server = await buildMonitorServer();
await server.app.listen({ host: server.config.host, port: server.config.port });

const shutdown = async () => {
  await server.close();
  process.exit(0);
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
