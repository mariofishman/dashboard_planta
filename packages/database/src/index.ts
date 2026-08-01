import { PGlite } from "@electric-sql/pglite";
import { mkdir, open, readFile, rename, unlink, type FileHandle } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import pg from "pg";

export type DatabaseMode = "pglite" | "postgres";

export interface DatabaseExecutor {
  queryOne(sql: string, parameters?: unknown[]): Promise<Record<string, unknown>>;
  queryAll(sql: string, parameters?: unknown[]): Promise<Record<string, unknown>[]>;
  execute(sql: string, parameters?: unknown[]): Promise<void>;
}

export interface DatabaseRuntime extends DatabaseExecutor {
  mode: DatabaseMode;
  transaction<T>(work: (executor: DatabaseExecutor) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

interface PGliteLockRecord {
  pid: number;
  createdAt: string;
}

function processIsRunning(pid: number): boolean {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

async function acquirePGliteLock(dataDir: string): Promise<() => Promise<void>> {
  const lockPath = `${dataDir}.monitor-lock`;
  await mkdir(dirname(lockPath), { recursive: true });
  let handle: FileHandle | undefined;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      handle = await open(lockPath, "wx", 0o600);
      await handle.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() } satisfies PGliteLockRecord));
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      let existing: Partial<PGliteLockRecord> = {};
      try {
        existing = JSON.parse(await readFile(lockPath, "utf8")) as Partial<PGliteLockRecord>;
      } catch {
        // An unreadable lock cannot identify a live owner and is treated as stale.
      }
      if (typeof existing.pid === "number" && processIsRunning(existing.pid)) {
        throw new Error(`PGlite data directory is already in use by process ${existing.pid}: ${dataDir}`);
      }
      try {
        await rename(lockPath, `${lockPath}.stale-${Date.now()}`);
      } catch (renameError) {
        if ((renameError as NodeJS.ErrnoException).code !== "ENOENT") throw renameError;
      }
    }
  }

  if (!handle) throw new Error(`Unable to acquire PGlite data directory lock: ${dataDir}`);
  let released = false;
  return async () => {
    if (released) return;
    released = true;
    await handle.close();
    await unlink(lockPath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  };
}

export async function createDatabaseRuntime(options: {
  mode: DatabaseMode;
  pgliteDataDir?: string;
  databaseUrl?: string;
}): Promise<DatabaseRuntime> {
  if (options.mode === "pglite") {
    const dataDir = options.pgliteDataDir ?? "memory://";
    if (dataDir !== "memory://") await mkdir(dataDir, { recursive: true });
    const releaseLock = dataDir === "memory://" ? async () => {} : await acquirePGliteLock(dataDir);
    const database = new PGlite(dataDir);
    try {
      await database.waitReady;
    } catch (error) {
      await releaseLock();
      throw error;
    }
    let closed = false;
    return {
      mode: "pglite",
      async queryOne(sql, parameters = []) {
        const result = await database.query<Record<string, unknown>>(sql, parameters);
        return result.rows[0] ?? {};
      },
      async queryAll(sql, parameters = []) {
        return (await database.query<Record<string, unknown>>(sql, parameters)).rows;
      },
      async execute(sql, parameters = []) {
        if (parameters.length === 0) await database.exec(sql);
        else await database.query(sql, parameters);
      },
      async transaction(work) {
        return database.transaction(async (transaction) => work({
          async queryOne(sql, parameters = []) {
            const result = await transaction.query<Record<string, unknown>>(sql, parameters);
            return result.rows[0] ?? {};
          },
          async queryAll(sql, parameters = []) {
            return (await transaction.query<Record<string, unknown>>(sql, parameters)).rows;
          },
          async execute(sql, parameters = []) {
            if (parameters.length === 0) await transaction.exec(sql);
            else await transaction.query(sql, parameters);
          },
        }));
      },
      async close() {
        if (closed) return;
        closed = true;
        try {
          await database.close();
        } finally {
          await releaseLock();
        }
      },
    };
  }

  if (!options.databaseUrl) throw new Error("MONITOR_DATABASE_URL is required in postgres mode");
  const pool = new pg.Pool({ connectionString: options.databaseUrl, max: 5 });
  return {
    mode: "postgres",
    async queryOne(sql, parameters = []) {
      const result = await pool.query<Record<string, unknown>>(sql, parameters);
      return result.rows[0] ?? {};
    },
    async queryAll(sql, parameters = []) {
      return (await pool.query<Record<string, unknown>>(sql, parameters)).rows;
    },
    async execute(sql, parameters = []) {
      await pool.query(sql, parameters);
    },
    async transaction(work) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await work({
          async queryOne(sql, parameters = []) {
            const query = await client.query<Record<string, unknown>>(sql, parameters);
            return query.rows[0] ?? {};
          },
          async queryAll(sql, parameters = []) {
            return (await client.query<Record<string, unknown>>(sql, parameters)).rows;
          },
          async execute(sql, parameters = []) { await client.query(sql, parameters); },
        });
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    async close() {
      await pool.end();
    },
  };
}

export async function migrateFoundation(database: DatabaseRuntime): Promise<void> {
  for (const filename of ["0000_phase2_foundation.sql", "0001_phase3_detection.sql", "0002_phase4_incidents.sql", "0003_phase4b_simulator.sql", "0004_phase5_roster_authorization.sql", "0005_phase5_roster_assignments.sql", "0006_roster_operation_catalog.sql", "0007_configurable_roster_groups.sql", "0008_phase5_routing.sql", "0009_phase6_conversations.sql", "0010_phase6_alertas_fake_redesign.sql", "0011_phase6_a02_authority_reconciliation.sql", "0012_phase6_stage4_test_database.sql", "0013_phase6_stage5_acceptance.sql", "0014_phase6_stage5_experiment_history.sql", "0015_phase6_stage5_experiment_runtime.sql"]) {
    await database.execute(await readFile(resolve(import.meta.dirname, "../migrations", filename), "utf8"));
  }
}
