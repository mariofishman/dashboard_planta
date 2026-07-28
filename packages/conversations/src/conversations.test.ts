import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createDatabaseRuntime, migrateFoundation, type DatabaseRuntime } from "@monitor/database";
import { ConversationForbiddenError, ConversationReadOnlyError, ConversationService } from "./index.js";

const databases: DatabaseRuntime[] = [];
async function setup() {
  const database = await createDatabaseRuntime({ mode: "pglite", pgliteDataDir: "memory://" });
  databases.push(database);
  await migrateFoundation(database);
  const service = new ConversationService(database);
  const ana = { sysUserId: 11, displayName: "Ana", sourceKey: "roster:ana" };
  const carlos = { sysUserId: 12, displayName: "Carlos", sourceKey: "roster:carlos" };
  const maria = { sysUserId: 13, displayName: "María", sourceKey: "roster:maria" };
  const principal = (participant: typeof ana, admin = false) => ({ sysUserId: participant.sysUserId, displayName: participant.displayName, admin });
  const incident = async (id: string, participants = [ana, carlos]) => {
    await database.execute(`INSERT INTO monitor_incident
      (id,rule_code,condition_key,occurrence,lifecycle,label,title,summary,plant_id,reasons,opened_at,updated_at)
      VALUES ($1,'A02',$2,1,'open','Alerta','Material pendiente','Material en tránsito',1,'[]'::jsonb,now(),now())`, [id, `condition:${id}`]);
    return service.attachIncident({ incidentId: id, plantId: 1, participants, alert: { id, ruleCode: "A02", title: "Material pendiente" } });
  };
  return { database, service, ana, carlos, maria, principal, incident };
}

afterEach(async () => Promise.all(databases.splice(0).map((database) => database.close())));

describe("Phase 6 conversations", () => {
  it("reuses only an exact participant set and links multiple incidents", async () => {
    const { database, ana, carlos, maria, incident } = await setup();
    const first = await incident("00000000-0000-4000-8000-000000000001", [ana, carlos]);
    const reordered = await incident("00000000-0000-4000-8000-000000000002", [carlos, ana]);
    const different = await incident("00000000-0000-4000-8000-000000000003", [ana, maria]);
    assert.equal(first?.conversationId, reordered?.conversationId);
    assert.notEqual(first?.conversationId, different?.conversationId);
    assert.equal(Number((await database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_conversation")).count), 2);
    assert.equal(Number((await database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_conversation_incident WHERE conversation_id=$1", [first?.conversationId])).count), 2);
  });

  it("adds newly routed workers without removing existing participants", async () => {
    const { database, service, ana, carlos, maria, incident } = await setup();
    const attached = await incident("00000000-0000-4000-8000-000000000004", [ana, carlos]);
    await service.attachIncident({ incidentId: "00000000-0000-4000-8000-000000000004", plantId: 1, participants: [ana, maria], alert: {} });
    const participants = await database.queryAll("SELECT sys_user_id FROM monitor_conversation_participant WHERE conversation_id=$1 AND removed_at IS NULL ORDER BY sys_user_id", [attached?.conversationId]);
    assert.deepEqual(participants.map((row) => Number(row.sys_user_id)), [11, 12, 13]);
  });

  it("deduplicates sends, paginates history, and maintains unread counts", async () => {
    const { service, ana, carlos, principal, incident } = await setup();
    const attached = await incident("00000000-0000-4000-8000-000000000011");
    const id = attached!.conversationId;
    const first = await service.send(id, principal(ana), { body: "Primero", clientCommandId: "ana-1" });
    const duplicate = await service.send(id, principal(ana), { body: "Duplicado", clientCommandId: "ana-1" });
    assert.equal(duplicate.id, first.id);
    assert.equal(duplicate.duplicate, true);
    await service.send(id, principal(carlos), { body: "Segundo", clientCommandId: "carlos-1" });
    const page = await service.messages(id, principal(ana), { limit: 2 });
    assert.equal(page.messages.length, 2);
    assert.ok(page.nextCursor);
    const listBeforeRead = await service.list(principal(ana));
    assert.equal(Number(listBeforeRead.conversations[0]!.unreadCount), 2); // Monitor alert + Carlos.
    const latest = Math.max(...page.messages.map((message) => Number((message as Record<string, unknown>).cursor)));
    await service.markRead(id, principal(ana), latest);
    const listAfterRead = await service.list(principal(ana));
    assert.equal(Number(listAfterRead.conversations[0]!.unreadCount), 0);
  });

  it("keeps the administrator inbox participant-only until all conversations is requested", async () => {
    const { service, ana, carlos, maria, principal, incident } = await setup();
    await incident("00000000-0000-4000-8000-000000000012", [ana, carlos]);
    await incident("00000000-0000-4000-8000-000000000013", [carlos, maria]);
    const personal = await service.list(principal(ana, true));
    const administrative = await service.list(principal(ana, true), { all: true });
    assert.equal(personal.conversations.length, 1);
    assert.equal(administrative.conversations.length, 2);
    assert.equal(administrative.conversations.filter((conversation) => conversation.isParticipant).length, 1);
  });

  it("enforces membership, admin removal, and read-only closure", async () => {
    const { database, service, ana, carlos, maria, principal, incident } = await setup();
    const attached = await incident("00000000-0000-4000-8000-000000000021");
    const id = attached!.conversationId;
    await assert.rejects(service.messages(id, principal(maria)), ConversationForbiddenError);
    await service.setParticipant(id, principal(maria, true), carlos, false);
    await assert.rejects(service.send(id, principal(carlos), { body: "No permitido", clientCommandId: "blocked" }), ConversationForbiddenError);
    await database.execute("UPDATE monitor_conversation SET writable_until=now()-interval '1 minute' WHERE id=$1", [id]);
    await assert.rejects(service.send(id, principal(ana), { body: "Tarde", clientCommandId: "late" }), ConversationReadOnlyError);
    assert.equal(Number((await database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_conversation_membership_audit WHERE conversation_id=$1", [id])).count), 3);
  });

  it("keeps a one-hour grace period and reopens the exact group for a later incident", async () => {
    const { database, service, ana, carlos, principal, incident } = await setup();
    const first = await incident("00000000-0000-4000-8000-000000000022", [ana, carlos]);
    const closedAt = new Date();
    await service.closeIncident("00000000-0000-4000-8000-000000000022", closedAt);
    const grace = await database.queryOne("SELECT writable_until FROM monitor_conversation WHERE id=$1", [first?.conversationId]);
    assert.ok(Math.abs((Date.parse(String(grace.writable_until)) - closedAt.getTime()) - 60 * 60_000) < 1_000);
    await service.send(first!.conversationId, principal(ana), { body: "Seguimiento", clientCommandId: "grace" });
    const next = await incident("00000000-0000-4000-8000-000000000023", [carlos, ana]);
    assert.equal(next?.conversationId, first?.conversationId);
    assert.equal((await database.queryOne("SELECT writable_until FROM monitor_conversation WHERE id=$1", [first?.conversationId])).writable_until, null);
  });

  it("allows WhatsApp-style edits and deletion while preserving revisions", async () => {
    const { database, service, ana, principal, incident } = await setup();
    const attached = await incident("00000000-0000-4000-8000-000000000031");
    const id = attached!.conversationId;
    const sent = await service.send(id, principal(ana), { body: "Texto original", clientCommandId: "mutation-1" });
    await service.edit(sent.id, principal(ana), "Texto corregido");
    await service.delete(sent.id, principal(ana));
    const message = await database.queryOne("SELECT body,deleted_at FROM monitor_message WHERE id=$1", [sent.id]);
    assert.equal(message.body, "");
    assert.ok(message.deleted_at);
    assert.equal(Number((await database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_message_revision WHERE message_id=$1", [sent.id])).count), 2);
  });
});
