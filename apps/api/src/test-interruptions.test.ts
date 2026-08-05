import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDatabaseRuntime, migrateFoundation } from "@monitor/database";
import {
  TestInterruptionAlreadyArmedError,
  TestInterruptionController,
  TestInterruptionError,
  TestInterruptionUnavailableError,
} from "./test-interruptions.js";

describe("test interruption contract", () => {
  it("rejects arming outside test mode and keeps firing inert", async () => {
    const database = await createDatabaseRuntime({ mode: "pglite", pgliteDataDir: "memory://" });
    try {
      await migrateFoundation(database);
      const controller = new TestInterruptionController(database, "development");
      await assert.rejects(controller.arm("after_incident_commit"), TestInterruptionUnavailableError);
      await controller.fire("after_incident_commit", { incidentId: "forbidden" });
      assert.equal(Number((await database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_test_interruption")).count), 0);
    } finally {
      await database.close();
    }
  });

  it("fires one armed point once and preserves its durable identity and context", async () => {
    const database = await createDatabaseRuntime({ mode: "pglite", pgliteDataDir: "memory://" });
    try {
      await migrateFoundation(database);
      const controller = new TestInterruptionController(database, "test");
      const armed = await controller.arm("after_incident_commit");
      assert.equal(armed.status, "armed");
      await assert.rejects(controller.arm("after_incident_commit"), TestInterruptionAlreadyArmedError);
      let fired: TestInterruptionError | null = null;
      try {
        await controller.fire("after_incident_commit", { incidentId: "incident-1", cycleId: "cycle-1" });
      } catch (error) {
        assert.ok(error instanceof TestInterruptionError);
        fired = error;
      }
      assert.equal(fired?.interruption.id, armed.id);
      assert.equal(fired?.interruption.status, "fired");
      assert.deepEqual(fired?.interruption.context, { incidentId: "incident-1", cycleId: "cycle-1" });
      assert.ok(fired?.interruption.firedAt);
      assert.deepEqual(await controller.get(armed.id), fired?.interruption);
      await controller.fire("after_incident_commit", { incidentId: "incident-2" });
      assert.equal(Number((await database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_test_interruption")).count), 1);
    } finally {
      await database.close();
    }
  });
});
