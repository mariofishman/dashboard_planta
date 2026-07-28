import { createHash } from "node:crypto";
import type { DatabaseExecutor, DatabaseRuntime } from "@monitor/database";

export interface ConversationParticipant { sysUserId: number; displayName: string; sourceKey: string }
export interface ConversationPrincipal { sysUserId: number; displayName: string; admin: boolean }

const EDIT_WINDOW_MS = 15 * 60_000;
const DELETE_WINDOW_MS = 2 * 24 * 60 * 60_000;

function json<T>(value: unknown): T {
  return (typeof value === "string" ? JSON.parse(value) : value) as T;
}

function fingerprint(participants: ConversationParticipant[]): string {
  const ids = [...new Set(participants.map((item) => item.sysUserId))].sort((a, b) => a - b);
  return createHash("sha256").update(ids.join(":"), "utf8").digest("hex");
}

function conversationTitle(participants: ConversationParticipant[]): string {
  const names = participants.map((item) => item.displayName);
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

export class ConversationForbiddenError extends Error {}
export class ConversationReadOnlyError extends Error {}
export class MessageWindowExpiredError extends Error {}
export class ConversationValidationError extends Error {}

export class ConversationService {
  constructor(private readonly database: DatabaseRuntime, private readonly publish: (event: Record<string, unknown>) => Promise<void> = async () => {}) {}

  private async authorize(executor: DatabaseExecutor, conversationId: string, principal: ConversationPrincipal) {
    const conversation = await executor.queryOne("SELECT id,writable_until FROM monitor_conversation WHERE id=$1", [conversationId]);
    if (!conversation.id) throw new ConversationForbiddenError("conversation_not_found");
    if (!principal.admin) {
      const participant = await executor.queryOne(`SELECT 1 AS allowed FROM monitor_conversation_participant
        WHERE conversation_id=$1 AND sys_user_id=$2 AND removed_at IS NULL`, [conversationId, principal.sysUserId]);
      if (!participant.allowed) throw new ConversationForbiddenError("conversation_forbidden");
    }
    return conversation;
  }

  async canAccess(conversationId: string, principal: ConversationPrincipal): Promise<boolean> {
    try { await this.authorize(this.database, conversationId, principal); return true; }
    catch (error) { if (error instanceof ConversationForbiddenError) return false; throw error; }
  }

  async activeParticipantIds(conversationId: string): Promise<number[]> {
    return (await this.database.queryAll("SELECT sys_user_id FROM monitor_conversation_participant WHERE conversation_id=$1 AND removed_at IS NULL", [conversationId]))
      .map((row) => Number(row.sys_user_id));
  }

  async attachIncident(input: { incidentId: string; plantId: number; participants: ConversationParticipant[]; alert: Record<string, unknown> }) {
    if (!input.participants.length) return null;
    const unique = [...new Map(input.participants.map((item) => [item.sysUserId, item])).values()];
    const participantFingerprint = fingerprint(unique);
    const result = await this.database.transaction(async (transaction) => {
      const already = await transaction.queryOne("SELECT conversation_id FROM monitor_conversation_incident WHERE incident_id=$1", [input.incidentId]);
      if (already.conversation_id) {
        const conversationId = String(already.conversation_id);
        const current = await transaction.queryAll("SELECT sys_user_id,display_name,source_key FROM monitor_conversation_participant WHERE conversation_id=$1 AND removed_at IS NULL", [conversationId]);
        const currentIds = new Set(current.map((row) => Number(row.sys_user_id)));
        for (const participant of unique.filter((item) => !currentIds.has(item.sysUserId))) {
          await transaction.execute(`INSERT INTO monitor_conversation_participant (conversation_id,sys_user_id,display_name,source_key)
            VALUES ($1,$2,$3,$4) ON CONFLICT (conversation_id,sys_user_id) DO UPDATE SET display_name=EXCLUDED.display_name,source_key=EXCLUDED.source_key,added_at=now(),removed_at=NULL,removed_by_sys_user_id=NULL`,
          [conversationId, participant.sysUserId, participant.displayName, participant.sourceKey]);
          await transaction.execute("INSERT INTO monitor_conversation_membership_audit (conversation_id,sys_user_id,action,reason) VALUES ($1,$2,'added','incident_rerouting')", [conversationId, participant.sysUserId]);
        }
        const combined = [...new Map([...current.map((row) => ({ sysUserId: Number(row.sys_user_id), displayName: String(row.display_name), sourceKey: String(row.source_key) })), ...unique].map((item) => [item.sysUserId, item])).values()];
        await transaction.execute("UPDATE monitor_conversation SET participant_fingerprint=$2,title=$3,updated_at=now() WHERE id=$1", [conversationId, fingerprint(combined), conversationTitle(combined)]);
        return { conversationId, created: false, cursor: 0 };
      }
      let conversation = await transaction.queryOne("SELECT id FROM monitor_conversation WHERE plant_id=$1 AND participant_fingerprint=$2 ORDER BY updated_at DESC LIMIT 1", [input.plantId, participantFingerprint]);
      let created = false;
      if (!conversation.id) {
        conversation = await transaction.queryOne(`INSERT INTO monitor_conversation (plant_id,title,participant_fingerprint)
          VALUES ($1,$2,$3) RETURNING id`, [input.plantId, conversationTitle(unique), participantFingerprint]);
        created = true;
        for (const participant of unique) {
          await transaction.execute(`INSERT INTO monitor_conversation_participant
            (conversation_id,sys_user_id,display_name,source_key) VALUES ($1,$2,$3,$4)`,
          [conversation.id, participant.sysUserId, participant.displayName, participant.sourceKey]);
          await transaction.execute(`INSERT INTO monitor_conversation_membership_audit
            (conversation_id,sys_user_id,action,reason) VALUES ($1,$2,'added','incident_routing')`, [conversation.id, participant.sysUserId]);
        }
      }
      await transaction.execute("UPDATE monitor_conversation SET writable_until=NULL,updated_at=now() WHERE id=$1", [conversation.id]);
      await transaction.execute("INSERT INTO monitor_conversation_incident (conversation_id,incident_id) VALUES ($1,$2)", [conversation.id, input.incidentId]);
      const message = await transaction.queryOne(`INSERT INTO monitor_message
        (conversation_id,sender_name,kind,body,payload,client_command_id)
        VALUES ($1,'Monitor','alert','',$2::jsonb,$3) RETURNING id,cursor,sent_at`,
      [conversation.id, JSON.stringify(input.alert), `incident:${input.incidentId}`]);
      await transaction.execute("UPDATE monitor_conversation SET updated_at=$2 WHERE id=$1", [conversation.id, message.sent_at]);
      return { conversationId: String(conversation.id), created, cursor: Number(message.cursor), messageId: String(message.id) };
    });
    if (result.cursor) await this.publish({ type: "message.created", conversationId: result.conversationId, cursor: result.cursor, messageId: result.messageId });
    return result;
  }

  async closeIncident(incidentId: string, closedAt = new Date()) {
    await this.database.transaction(async (transaction) => {
      const link = await transaction.queryOne("SELECT conversation_id FROM monitor_conversation_incident WHERE incident_id=$1", [incidentId]);
      if (!link.conversation_id) return;
      await transaction.execute("UPDATE monitor_conversation_incident SET closed_at=$2 WHERE incident_id=$1", [incidentId, closedAt.toISOString()]);
      const open = await transaction.queryOne("SELECT COUNT(*)::int AS count FROM monitor_conversation_incident WHERE conversation_id=$1 AND closed_at IS NULL", [link.conversation_id]);
      if (Number(open.count) === 0) await transaction.execute("UPDATE monitor_conversation SET writable_until=$2,updated_at=$3 WHERE id=$1", [link.conversation_id, new Date(closedAt.getTime() + 60 * 60_000).toISOString(), closedAt.toISOString()]);
    });
  }

  async list(principal: ConversationPrincipal, options: { before?: string; limit?: number; search?: string; all?: boolean } = {}) {
    const limit = Math.min(100, Math.max(1, options.limit ?? 30));
    const includeAll = principal.admin && options.all === true;
    const params: unknown[] = [principal.sysUserId, includeAll, options.before ?? null, options.search?.trim() || null, limit + 1];
    const rows = await this.database.queryAll(`SELECT c.id,c.title,c.updated_at AS "updatedAt",c.writable_until AS "writableUntil",
      COALESCE(last.sender_name,'') AS "lastSender",COALESCE(last.body,'') AS "lastBody",last.kind AS "lastKind",
      COALESCE(open_alerts.count,0)::int AS "openAlerts",
      CASE WHEN p.sys_user_id IS NULL THEN 0 ELSE COALESCE(unread.count,0) END::int AS "unreadCount",
      (p.sys_user_id IS NOT NULL) AS "isParticipant"
      FROM monitor_conversation c
      LEFT JOIN monitor_conversation_participant p ON p.conversation_id=c.id AND p.sys_user_id=$1 AND p.removed_at IS NULL
      LEFT JOIN LATERAL (SELECT sender_name,body,kind FROM monitor_message WHERE conversation_id=c.id ORDER BY cursor DESC LIMIT 1) last ON TRUE
      LEFT JOIN LATERAL (SELECT COUNT(*) AS count FROM monitor_conversation_incident ci JOIN monitor_incident i ON i.id=ci.incident_id WHERE ci.conversation_id=c.id AND i.lifecycle='open') open_alerts ON TRUE
      LEFT JOIN LATERAL (SELECT COUNT(*) AS count FROM monitor_message m LEFT JOIN monitor_conversation_user_state s ON s.conversation_id=c.id AND s.sys_user_id=$1 WHERE m.conversation_id=c.id AND m.cursor>COALESCE(s.last_read_cursor,0) AND m.sender_sys_user_id IS DISTINCT FROM $1) unread ON TRUE
      WHERE ($2 OR p.sys_user_id IS NOT NULL) AND ($3::timestamptz IS NULL OR c.updated_at<$3::timestamptz)
        AND ($4::text IS NULL OR c.title ILIKE '%'||$4||'%'
          OR EXISTS (SELECT 1 FROM monitor_conversation_participant ps WHERE ps.conversation_id=c.id AND ps.display_name ILIKE '%'||$4||'%')
          OR EXISTS (SELECT 1 FROM monitor_conversation_incident ci JOIN monitor_incident i ON i.id=ci.incident_id WHERE ci.conversation_id=c.id
            AND (i.rule_code ILIKE '%'||$4||'%' OR i.title ILIKE '%'||$4||'%' OR i.work_order_code ILIKE '%'||$4||'%' OR i.machine_code ILIKE '%'||$4||'%')))
      ORDER BY c.updated_at DESC,c.id LIMIT $5`, params);
    return { conversations: rows.slice(0, limit), nextCursor: rows.length > limit ? String(rows[limit - 1]!.updatedAt) : null };
  }

  async forIncident(incidentId: string, principal: ConversationPrincipal) {
    const row = await this.database.queryOne("SELECT conversation_id FROM monitor_conversation_incident WHERE incident_id=$1", [incidentId]);
    if (!row.conversation_id) return null;
    await this.authorize(this.database, String(row.conversation_id), principal);
    return { conversationId: String(row.conversation_id) };
  }

  async messages(conversationId: string, principal: ConversationPrincipal, options: { before?: number; limit?: number } = {}) {
    const conversation = await this.authorize(this.database, conversationId, principal);
    const limit = Math.min(100, Math.max(1, options.limit ?? 50));
    const rows = await this.database.queryAll(`SELECT id,cursor,sender_sys_user_id AS "senderSysUserId",sender_name AS "senderName",kind,body,payload,
      reply_to_message_id AS "replyToMessageId",sent_at AS "sentAt",edited_at AS "editedAt",deleted_at AS "deletedAt",
      (SELECT COUNT(*)::int FROM monitor_message_receipt r WHERE r.message_id=monitor_message.id AND r.delivered_at IS NOT NULL) AS "deliveredCount",
      (SELECT COUNT(*)::int FROM monitor_message_receipt r WHERE r.message_id=monitor_message.id AND r.read_at IS NOT NULL) AS "readCount"
      FROM monitor_message WHERE conversation_id=$1 AND ($2::bigint IS NULL OR cursor<$2) ORDER BY cursor DESC LIMIT $3`,
    [conversationId, options.before ?? null, limit + 1]);
    return {
      messages: rows.slice(0, limit).reverse().map((row) => ({ ...row, payload: json(row.payload) })),
      nextCursor: rows.length > limit ? Number(rows[limit - 1]!.cursor) : null,
      writableUntil: conversation.writable_until ? String(conversation.writable_until) : null,
    };
  }

  async send(conversationId: string, principal: ConversationPrincipal, input: { body: string; clientCommandId: string; replyToMessageId?: string | null; payload?: Record<string, unknown> }) {
    const body = input.body.trim();
    if (!body && !input.payload) throw new ConversationValidationError("message_empty");
    if (body.length > 4096 || input.clientCommandId.length < 1 || input.clientCommandId.length > 200) throw new ConversationValidationError("invalid_message");
    if (input.payload) {
      const attachment = input.payload.attachment as Record<string, unknown> | undefined;
      if (!attachment || typeof attachment.type !== "string" || !attachment.type.startsWith("image/")
        || Number(attachment.size) > 5 * 1024 * 1024 || typeof attachment.dataUrl !== "string"
        || !attachment.dataUrl.startsWith("data:image/") || attachment.dataUrl.length > 7_100_000) throw new ConversationValidationError("invalid_attachment");
    }
    const result = await this.database.transaction(async (transaction) => {
      const conversation = await this.authorize(transaction, conversationId, principal);
      if (conversation.writable_until && Date.parse(String(conversation.writable_until)) <= Date.now()) throw new ConversationReadOnlyError("conversation_read_only");
      const prior = await transaction.queryOne("SELECT id,cursor FROM monitor_message WHERE sender_sys_user_id=$1 AND client_command_id=$2", [principal.sysUserId, input.clientCommandId]);
      if (prior.id) return { id: String(prior.id), cursor: Number(prior.cursor), duplicate: true };
      if (input.replyToMessageId) {
        const reply = await transaction.queryOne("SELECT 1 AS allowed FROM monitor_message WHERE id=$1 AND conversation_id=$2", [input.replyToMessageId, conversationId]);
        if (!reply.allowed) throw new ConversationValidationError("invalid_reply_target");
      }
      const message = await transaction.queryOne(`INSERT INTO monitor_message
        (conversation_id,sender_sys_user_id,sender_name,kind,body,payload,reply_to_message_id,client_command_id)
        VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8) RETURNING id,cursor,sent_at`,
      [conversationId, principal.sysUserId, principal.displayName, input.payload ? "attachment" : "text", body,
        JSON.stringify(input.payload ?? {}), input.replyToMessageId ?? null, input.clientCommandId]);
      await transaction.execute("UPDATE monitor_conversation SET updated_at=$2 WHERE id=$1", [conversationId, message.sent_at]);
      return { id: String(message.id), cursor: Number(message.cursor), duplicate: false };
    });
    if (!result.duplicate) await this.publish({ type: "message.created", conversationId, messageId: result.id, cursor: result.cursor });
    return result;
  }

  async markRead(conversationId: string, principal: ConversationPrincipal, cursor: number) {
    await this.authorize(this.database, conversationId, principal);
    await this.database.transaction(async (transaction) => {
      await transaction.execute(`INSERT INTO monitor_conversation_user_state (conversation_id,sys_user_id,last_read_cursor)
        VALUES ($1,$2,$3) ON CONFLICT (conversation_id,sys_user_id) DO UPDATE SET
        last_read_cursor=GREATEST(monitor_conversation_user_state.last_read_cursor,EXCLUDED.last_read_cursor),updated_at=now()`, [conversationId, principal.sysUserId, cursor]);
      await transaction.execute(`INSERT INTO monitor_message_receipt (message_id,sys_user_id,delivered_at,read_at)
        SELECT id,$2,now(),now() FROM monitor_message WHERE conversation_id=$1 AND cursor<=$3
        ON CONFLICT (message_id,sys_user_id) DO UPDATE SET delivered_at=COALESCE(monitor_message_receipt.delivered_at,now()),read_at=COALESCE(monitor_message_receipt.read_at,now())`,
      [conversationId, principal.sysUserId, cursor]);
    });
    await this.publish({ type: "receipt.updated", conversationId, sysUserId: principal.sysUserId, cursor });
  }

  async edit(messageId: string, principal: ConversationPrincipal, body: string, now = new Date()) {
    const row = await this.database.queryOne("SELECT conversation_id,sender_sys_user_id,body,payload,sent_at,deleted_at FROM monitor_message WHERE id=$1", [messageId]);
    if (!row.conversation_id || Number(row.sender_sys_user_id) !== principal.sysUserId || row.deleted_at) throw new ConversationForbiddenError("message_forbidden");
    await this.authorize(this.database, String(row.conversation_id), principal);
    if (now.getTime() - Date.parse(String(row.sent_at)) > EDIT_WINDOW_MS) throw new MessageWindowExpiredError("edit_window_expired");
    await this.database.transaction(async (transaction) => {
      await transaction.execute("INSERT INTO monitor_message_revision (message_id,action,prior_body,prior_payload,actor_sys_user_id) VALUES ($1,'edited',$2,$3::jsonb,$4)", [messageId, row.body, JSON.stringify(json(row.payload)), principal.sysUserId]);
      await transaction.execute("UPDATE monitor_message SET body=$2,edited_at=$3 WHERE id=$1", [messageId, body.trim(), now.toISOString()]);
    });
    await this.publish({ type: "message.updated", conversationId: row.conversation_id, messageId });
  }

  async delete(messageId: string, principal: ConversationPrincipal, now = new Date()) {
    const row = await this.database.queryOne("SELECT conversation_id,sender_sys_user_id,body,payload,sent_at,deleted_at FROM monitor_message WHERE id=$1", [messageId]);
    if (!row.conversation_id || Number(row.sender_sys_user_id) !== principal.sysUserId || row.deleted_at) throw new ConversationForbiddenError("message_forbidden");
    await this.authorize(this.database, String(row.conversation_id), principal);
    if (now.getTime() - Date.parse(String(row.sent_at)) > DELETE_WINDOW_MS) throw new MessageWindowExpiredError("delete_window_expired");
    await this.database.transaction(async (transaction) => {
      await transaction.execute("INSERT INTO monitor_message_revision (message_id,action,prior_body,prior_payload,actor_sys_user_id) VALUES ($1,'deleted',$2,$3::jsonb,$4)", [messageId, row.body, JSON.stringify(json(row.payload)), principal.sysUserId]);
      await transaction.execute("UPDATE monitor_message SET body='',payload='{}'::jsonb,deleted_at=$2 WHERE id=$1", [messageId, now.toISOString()]);
    });
    await this.publish({ type: "message.updated", conversationId: row.conversation_id, messageId });
  }

  async setParticipant(conversationId: string, principal: ConversationPrincipal, participant: ConversationParticipant, active: boolean) {
    if (!principal.admin) throw new ConversationForbiddenError("admin_required");
    await this.authorize(this.database, conversationId, principal);
    await this.database.transaction(async (transaction) => {
      if (active) {
        const bound = await transaction.queryOne("SELECT COUNT(*)::int AS count FROM monitor_roster_assignment WHERE plant_id=(SELECT plant_id FROM monitor_conversation WHERE id=$1) AND sys_user_id IS NOT NULL", [conversationId]);
        if (Number(bound.count) > 0) {
          const worker = await transaction.queryOne(`SELECT 1 AS allowed FROM monitor_roster_assignment WHERE plant_id=(SELECT plant_id FROM monitor_conversation WHERE id=$1)
            AND sys_user_id=$2 AND state='active' AND setup_complete=TRUE AND valid_from<=CURRENT_DATE AND (valid_to IS NULL OR valid_to>=CURRENT_DATE)`, [conversationId, participant.sysUserId]);
          if (!worker.allowed) throw new ConversationValidationError("participant_not_active_in_roster");
        }
        await transaction.execute(`INSERT INTO monitor_conversation_participant (conversation_id,sys_user_id,display_name,source_key,added_by_sys_user_id)
          VALUES ($1,$2,$3,$4,$5) ON CONFLICT (conversation_id,sys_user_id) DO UPDATE SET display_name=EXCLUDED.display_name,source_key=EXCLUDED.source_key,
          added_by_sys_user_id=EXCLUDED.added_by_sys_user_id,added_at=now(),removed_by_sys_user_id=NULL,removed_at=NULL`,
        [conversationId, participant.sysUserId, participant.displayName, participant.sourceKey, principal.sysUserId]);
      } else {
        const count = await transaction.queryOne("SELECT COUNT(*)::int AS count FROM monitor_conversation_participant WHERE conversation_id=$1 AND removed_at IS NULL", [conversationId]);
        if (Number(count.count) <= 1) throw new ConversationValidationError("conversation_requires_participant");
        await transaction.execute("UPDATE monitor_conversation_participant SET removed_by_sys_user_id=$3,removed_at=now() WHERE conversation_id=$1 AND sys_user_id=$2 AND removed_at IS NULL", [conversationId, participant.sysUserId, principal.sysUserId]);
      }
      await transaction.execute("INSERT INTO monitor_conversation_membership_audit (conversation_id,sys_user_id,action,actor_sys_user_id,reason) VALUES ($1,$2,$3,$4,'admin_moderation')",
      [conversationId, participant.sysUserId, active ? "added" : "removed", principal.sysUserId]);
      const rows = await transaction.queryAll("SELECT sys_user_id,display_name,source_key FROM monitor_conversation_participant WHERE conversation_id=$1 AND removed_at IS NULL", [conversationId]);
      const activeParticipants = rows.map((row) => ({ sysUserId: Number(row.sys_user_id), displayName: String(row.display_name), sourceKey: String(row.source_key) }));
      await transaction.execute("UPDATE monitor_conversation SET participant_fingerprint=$2,title=$3,updated_at=now() WHERE id=$1", [conversationId, fingerprint(activeParticipants), conversationTitle(activeParticipants)]);
    });
  }
}
