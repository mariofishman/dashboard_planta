import { resolve } from "node:path";
import process from "node:process";
import { createDatabaseRuntime, migrateFoundation, type DatabaseMode } from "./index.js";

const mode = (process.env.MONITOR_DATABASE_MODE ?? "pglite") as DatabaseMode;
const root = resolve(import.meta.dirname, "../../..");
const database = await createDatabaseRuntime({
  mode,
  pgliteDataDir: process.env.MONITOR_PGLITE_DATA_DIR
    ? resolve(root, process.env.MONITOR_PGLITE_DATA_DIR)
    : resolve(root, "local-data/monitor/pglite"),
  ...(process.env.MONITOR_DATABASE_URL ? { databaseUrl: process.env.MONITOR_DATABASE_URL } : {}),
});

try {
  await migrateFoundation(database);
  await database.queryOne("SELECT 1 AS ready");
  process.stdout.write(`Monitor database migrated (${database.mode}).\n`);
} finally {
  await database.close();
}
