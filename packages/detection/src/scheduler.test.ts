import assert from "node:assert/strict";
import { it } from "node:test";
import { createDatabaseRuntime, migrateFoundation } from "@monitor/database";
import { page } from "./adapters.js";
import { FixedBackupFreshnessProvider } from "./freshness.js";
import { DetectionRepository } from "./repository.js";
import { DetectionRunner } from "./runner.js";
import { DetectionScheduler } from "./scheduler.js";
import type { DetectionQueryDefinition } from "./types.js";

it("limits concurrent query executions globally", async () => {
  const database = await createDatabaseRuntime({ mode: "pglite", pgliteDataDir: "memory://" });
  try {
    await migrateFoundation(database);
    const runner = new DetectionRunner(new DetectionRepository(database), new FixedBackupFreshnessProvider("fixture.v1"));
    const scheduler = new DetectionScheduler(runner, 2);
    let active = 0;
    let maximum = 0;
    const adapter = {
      async readPage() {
        active += 1;
        maximum = Math.max(maximum, active);
        await new Promise((resolve) => setTimeout(resolve, 15));
        active -= 1;
        return page([], { schemaVersion: "1.0.0" });
      },
    };
    const query = (suffix: string): DetectionQueryDefinition => ({
      queryId: `bounded-${suffix}`, ruleCode: `T${suffix}`, queryVersion: "1.0.0", adapterKind: "fixture",
      keyField: "id", requiredFields: ["id"], intervalMs: 300_000, timeoutMs: 1_000,
      pageSize: 10, maxRows: 10, maxAttempts: 1, retryBaseMs: 1, enabled: true,
    });
    await Promise.all(["1", "2", "3"].map((suffix) => scheduler.runRecovery(query(suffix), adapter)));
    assert.equal(maximum, 2);
    scheduler.stop();
  } finally { await database.close(); }
});
