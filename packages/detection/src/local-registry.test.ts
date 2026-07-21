import assert from "node:assert/strict";
import { resolve } from "node:path";
import { it } from "node:test";
import { createDatabaseRuntime, migrateFoundation } from "@monitor/database";
import { FixedBackupFreshnessProvider } from "./freshness.js";
import { loadFixtureRegistry } from "./local-registry.js";
import { DetectionRepository } from "./repository.js";
import { DetectionRunner } from "./runner.js";

it("runs all 21 Phase 1 rule contracts through the local source boundary", async () => {
  const root = resolve(import.meta.dirname, "../../..");
  const registry = await loadFixtureRegistry(
    resolve(root, "docs/phase1/contracts/alert-rules.v1.json"),
    resolve(root, "docs/phase1/fixtures/rule-cases.v1.json"),
  );
  assert.equal(registry.length, 21);
  const database = await createDatabaseRuntime({ mode: "pglite", pgliteDataDir: "memory://" });
  try {
    await migrateFoundation(database);
    const repository = new DetectionRepository(database);
    const runner = new DetectionRunner(repository, new FixedBackupFreshnessProvider("phase1-fixtures.v1"));
    const results = await Promise.all(registry.map(({ query, adapter }) => runner.run(query, adapter, true)));
    assert.equal(results.filter((result) => result.status === "healthy").length, 21);
    const diagnostics = await repository.diagnostics();
    assert.equal(diagnostics.length, 21);
    assert.equal(diagnostics.filter((item) => item.status === "healthy").length, 21);
  } finally {
    await database.close();
  }
});
