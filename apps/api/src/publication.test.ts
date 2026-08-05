import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDatabaseRuntime, migrateFoundation } from "@monitor/database";
import { CommittedChangePublisher, type CommittedChangePublication } from "./publication.js";
import { TestInterruptionController, TestInterruptionError } from "./test-interruptions.js";

describe("committed change publication", () => {
  it("preserves committed replay before and after interrupted live emission", async () => {
    const database = await createDatabaseRuntime({ mode: "pglite", pgliteDataDir: "memory://" });
    try {
      await migrateFoundation(database);
      const controller = new TestInterruptionController(database, "test");
      const publisher = new CommittedChangePublisher(controller);
      const committed = await database.queryOne(`INSERT INTO monitor_change_event
        (event_type,scope_type,scope_id,payload) VALUES ('incident.opened','plant','1','{"incidentId":"incident-1"}'::jsonb)
        RETURNING cursor,event_id AS "eventId",payload`);
      const change: CommittedChangePublication = {
        channel: "incident.changed",
        eventId: String(committed.eventId),
        cursor: Number(committed.cursor),
        eventType: "incident.opened",
        scopeType: "plant",
        scopeId: "1",
        payload: committed.payload as Record<string, unknown>,
      };
      const applied = new Set<number>();
      const apply = (event: CommittedChangePublication) => {
        if (applied.has(event.cursor)) return;
        applied.add(event.cursor);
      };

      const before = await controller.arm("before_change_publication");
      await assert.rejects(publisher.publish(change, () => apply(change)), TestInterruptionError);
      assert.equal(applied.size, 0);
      assert.equal((await controller.get(before.id))?.context.eventId, change.eventId);
      const replayBefore = await database.queryAll("SELECT cursor FROM monitor_change_event WHERE cursor>$1 ORDER BY cursor", [0]);
      replayBefore.forEach((event) => apply({ ...change, cursor: Number(event.cursor) }));
      assert.deepEqual([...applied], [change.cursor]);

      applied.clear();
      const after = await controller.arm("after_change_publication");
      await assert.rejects(publisher.publish(change, () => apply(change)), TestInterruptionError);
      assert.deepEqual([...applied], [change.cursor]);
      assert.equal((await controller.get(after.id))?.context.eventId, change.eventId);
      const replayAfter = await database.queryAll("SELECT cursor FROM monitor_change_event WHERE cursor>$1 ORDER BY cursor", [change.cursor]);
      replayAfter.forEach((event) => apply({ ...change, cursor: Number(event.cursor) }));
      assert.deepEqual([...applied], [change.cursor]);
      assert.equal(Number((await database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_change_event WHERE event_id=$1", [change.eventId])).count), 1);
    } finally {
      await database.close();
    }
  });
});
