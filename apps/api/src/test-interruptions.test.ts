import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDatabaseRuntime, migrateFoundation } from "@monitor/database";
import { ConversationService } from "@monitor/conversations";
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

  it("persists a conversation interruption only after its transaction rolls back", async () => {
    const database = await createDatabaseRuntime({ mode: "pglite", pgliteDataDir: "memory://" });
    try {
      await migrateFoundation(database);
      const controller = new TestInterruptionController(database, "test");
      const service = new ConversationService(database, async () => {}, {
        armed: (points) => controller.armed(points),
        fire: (point, context) => controller.fire(point, context),
      });
      const incidentId = "00000000-0000-4000-8000-000000000050";
      await database.execute(`INSERT INTO monitor_incident
        (id,rule_code,condition_key,occurrence,lifecycle,label,title,summary,plant_id,reasons,opened_at,updated_at)
        VALUES ($1,'A02','A02:durable-interruption',1,'open','Alerta','Material','Material',1,'[]'::jsonb,now(),now())`, [incidentId]);
      const armed = await controller.arm("after_alert_message_creation");
      await assert.rejects(service.attachIncident({
        incidentId,
        plantId: 1,
        participants: [{ sysUserId: 11, displayName: "Ana", sourceKey: "roster:ana" }],
        alert: { id: incidentId, ruleCode: "A02" },
        cycleId: "cycle-durable",
      }), TestInterruptionError);
      const fired = await controller.get(armed.id);
      assert.equal(fired?.status, "fired");
      assert.equal(fired?.context.cycleId, "cycle-durable");
      assert.equal(fired?.context.incidentId, incidentId);
      assert.ok(fired?.context.transactionConversationId);
      assert.ok(fired?.context.transactionMessageId);
      assert.deepEqual(await database.queryOne(`SELECT
        (SELECT COUNT(*)::int FROM monitor_conversation) AS conversations,
        (SELECT COUNT(*)::int FROM monitor_conversation_incident) AS links,
        (SELECT COUNT(*)::int FROM monitor_message) AS messages`),
      { conversations: 0, links: 0, messages: 0 });
    } finally {
      await database.close();
    }
  });
});
