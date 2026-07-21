import { PGlite } from "@electric-sql/pglite";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
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

export async function createDatabaseRuntime(options: {
  mode: DatabaseMode;
  pgliteDataDir?: string;
  databaseUrl?: string;
}): Promise<DatabaseRuntime> {
  if (options.mode === "pglite") {
    const dataDir = options.pgliteDataDir ?? "memory://";
    if (dataDir !== "memory://") await mkdir(dataDir, { recursive: true });
    const database = new PGlite(dataDir);
    await database.waitReady;
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
        await database.close();
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
  for (const filename of ["0000_phase2_foundation.sql", "0001_phase3_detection.sql", "0002_phase4_incidents.sql"]) {
    await database.execute(await readFile(resolve(import.meta.dirname, "../migrations", filename), "utf8"));
  }
}
