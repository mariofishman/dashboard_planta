import assert from "node:assert/strict";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createDatabaseRuntime, migrateFoundation } from "./index.js";

test("foundation migration removes retired fake EmusaSoft sources from Monitor", async () => {
  const database = await createDatabaseRuntime({ mode: "pglite", pgliteDataDir: "memory://" });
  try {
    await migrateFoundation(database);
    const tables = await database.queryAll(`SELECT table_name AS "tableName" FROM information_schema.tables
      WHERE table_schema=current_schema() AND table_type='BASE TABLE' AND left(table_name,12)='monitor_sim_'`);
    assert.deepEqual(tables, []);
    assert.equal(Number((await database.queryOne(
      "SELECT COUNT(*)::int AS count FROM monitor_detection_query WHERE adapter_kind='fixture'",
    )).count), 0);
    await assert.rejects(database.execute(`INSERT INTO monitor_detection_query
      (query_id,rule_code,query_version,adapter_kind,interval_ms,timeout_ms,page_size,max_rows)
      VALUES ('retired-simulator','A02','retired','simulator',300000,3000,1000,10000)`));
    await assert.rejects(database.execute(`INSERT INTO monitor_detection_query
      (query_id,rule_code,query_version,adapter_kind,interval_ms,timeout_ms,page_size,max_rows)
      VALUES ('retired-fixture','A03','retired','fixture',300000,3000,1000,10000)`));
  } finally {
    await database.close();
  }
});

test("file-backed PGlite allows only one runtime per data directory", async () => {
  const root = await mkdtemp(join(tmpdir(), "monitor-pglite-lock-"));
  const dataDir = join(root, "database");
  try {
    const first = await createDatabaseRuntime({ mode: "pglite", pgliteDataDir: dataDir });
    await assert.rejects(
      createDatabaseRuntime({ mode: "pglite", pgliteDataDir: dataDir }),
      /already in use by process/,
    );
    await first.close();

    const reopened = await createDatabaseRuntime({ mode: "pglite", pgliteDataDir: dataDir });
    assert.deepEqual(await reopened.queryOne("SELECT 1 AS ready"), { ready: 1 });
    await reopened.close();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("file-backed PGlite archives a stale application lock before opening", async () => {
  const root = await mkdtemp(join(tmpdir(), "monitor-pglite-stale-lock-"));
  const dataDir = join(root, "database");
  try {
    await writeFile(`${dataDir}.monitor-lock`, JSON.stringify({ pid: 2_147_483_647, createdAt: new Date(0).toISOString() }));
    const database = await createDatabaseRuntime({ mode: "pglite", pgliteDataDir: dataDir });
    await database.close();

    const files = await readdir(root);
    assert.equal(files.some((name) => name.startsWith("database.monitor-lock.stale-")), true);
    assert.equal(files.includes("database.monitor-lock"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
