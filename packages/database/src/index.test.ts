import assert from "node:assert/strict";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createDatabaseRuntime } from "./index.js";

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
