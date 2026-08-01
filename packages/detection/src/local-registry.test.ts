import assert from "node:assert/strict";
import { resolve } from "node:path";
import { it } from "node:test";
import { createDatabaseRuntime, migrateFoundation } from "@monitor/database";
import { FixedBackupFreshnessProvider } from "./freshness.js";
import { loadFixtureRegistry } from "./local-registry.js";
import { DetectionRepository } from "./repository.js";
import { DetectionRunner } from "./runner.js";

it("runs all 20 current active rule contracts through the local fixture adapter boundary", async () => {
  const root = resolve(import.meta.dirname, "../../..");
  const registry = await loadFixtureRegistry(
    resolve(root, "config/alerts/alert-rules.v1.json"),
    resolve(root, "tests/fixtures/alerts/rule-cases.v1.json"),
  );
  assert.equal(registry.length, 20);
  const d01 = registry.find(({ query }) => query.ruleCode === "D01");
  assert.ok(d01);
  const d01Page = await d01.adapter.readPage({
    query: d01.query,
    cursor: null,
    limit: 1_000,
    signal: new AbortController().signal,
  });
  assert.equal(d01Page.rows.length, 1);
  assert.equal(d01Page.rows[0]?.maximumDeclaredMetersOverLayerInputGapMeters, 3_000);
  assert.equal(d01Page.rows[0]?.maximumLayerInputOverDeclaredMetersGapMeters, 3_000);
  assert.equal(d01Page.rows[0]?.maximumPairwiseLayerGapMeters, 6_000);
  assert.equal((d01Page.rows[0]?.layerResults as unknown[]).length, 2);
  assert.equal((d01Page.rows[0]?.pairwiseLayerGaps as unknown[]).length, 1);
  const database = await createDatabaseRuntime({ mode: "pglite", pgliteDataDir: "memory://" });
  try {
    await migrateFoundation(database);
    const repository = new DetectionRepository(database);
    const runner = new DetectionRunner(repository, new FixedBackupFreshnessProvider("phase1-fixtures.v1"));
    const results = await Promise.all(registry.map(({ query, adapter }) => runner.run(query, adapter, true)));
    assert.equal(results.filter((result) => result.status === "healthy").length, 20);
    const diagnostics = await repository.diagnostics();
    assert.equal(diagnostics.length, 20);
    assert.equal(diagnostics.filter((item) => item.status === "healthy").length, 20);
  } finally {
    await database.close();
  }
});
