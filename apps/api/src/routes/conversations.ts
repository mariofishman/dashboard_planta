import {
  ConversationForbiddenError,
  ConversationReadOnlyError,
  ConversationService,
  ConversationValidationError,
  MessageWindowExpiredError,
  type ConversationPrincipal,
} from "@monitor/conversations";
import type { FastifyInstance, FastifyReply } from "fastify";

function principal(request: { principal: { sysUserId: number; displayName: string; scopes: string[] } | null }): ConversationPrincipal {
  const value = request.principal!;
  return { sysUserId: value.sysUserId, displayName: value.displayName, admin: value.scopes.includes("monitor:admin") };
}

function handle(error: unknown, reply: FastifyReply) {
  if (error instanceof ConversationForbiddenError) return reply.code(403).send({ error: error.message });
  if (error instanceof ConversationReadOnlyError) return reply.code(409).send({ error: error.message });
  if (error instanceof MessageWindowExpiredError) return reply.code(409).send({ error: error.message });
  if (error instanceof ConversationValidationError) return reply.code(400).send({ error: error.message });
  throw error;
}

export async function conversationRoutes(app: FastifyInstance, options: { service: ConversationService }) {
  const auth = app.requireScopes(["monitor:read"]);

  app.get("/api/conversations", { preHandler: auth }, async (request) => {
    const query = request.query as { before?: string; limit?: string; search?: string; scope?: string };
    return options.service.list(principal(request), {
      ...(query.before ? { before: query.before } : {}),
      ...(Number(query.limit) ? { limit: Number(query.limit) } : {}),
      ...(query.search ? { search: query.search } : {}),
      ...(query.scope === "all" ? { all: true } : {}),
    });
  });

  app.get("/api/incidents/:id/conversation", { preHandler: auth }, async (request, reply) => {
    try {
      const result = await options.service.forIncident((request.params as { id: string }).id, principal(request));
      return result ?? reply.code(404).send({ error: "conversation_not_found" });
    } catch (error) { return handle(error, reply); }
  });

  app.get("/api/conversations/:id/messages", { preHandler: auth }, async (request, reply) => {
    try {
      const query = request.query as { before?: string; limit?: string };
      return await options.service.messages((request.params as { id: string }).id, principal(request), {
        ...(Number(query.before) ? { before: Number(query.before) } : {}),
        ...(Number(query.limit) ? { limit: Number(query.limit) } : {}),
      });
    } catch (error) { return handle(error, reply); }
  });

  app.post("/api/conversations/:id/messages", { preHandler: app.requireScopes(["monitor:read", "chat:write"]) }, async (request, reply) => {
    try {
      const body = request.body as { body: string; clientCommandId: string; replyToMessageId?: string | null; payload?: Record<string, unknown> };
      return await options.service.send((request.params as { id: string }).id, principal(request), body);
    } catch (error) { return handle(error, reply); }
  });

  app.post("/api/conversations/:id/read", { preHandler: auth }, async (request, reply) => {
    try {
      await options.service.markRead((request.params as { id: string }).id, principal(request), Number((request.body as { cursor: number }).cursor));
      return reply.code(204).send();
    } catch (error) { return handle(error, reply); }
  });

  app.patch("/api/messages/:id", { preHandler: app.requireScopes(["monitor:read", "chat:write"]) }, async (request, reply) => {
    try {
      await options.service.edit((request.params as { id: string }).id, principal(request), String((request.body as { body: string }).body));
      return reply.code(204).send();
    } catch (error) { return handle(error, reply); }
  });

  app.delete("/api/messages/:id", { preHandler: app.requireScopes(["monitor:read", "chat:write"]) }, async (request, reply) => {
    try {
      await options.service.delete((request.params as { id: string }).id, principal(request));
      return reply.code(204).send();
    } catch (error) { return handle(error, reply); }
  });

  app.put("/api/admin/conversations/:id/participants/:sysUserId", { preHandler: app.requireScopes(["monitor:admin"]) }, async (request, reply) => {
    try {
      const params = request.params as { id: string; sysUserId: string };
      const body = request.body as { active: boolean; displayName: string; sourceKey?: string };
      await options.service.setParticipant(params.id, principal(request), {
        sysUserId: Number(params.sysUserId), displayName: body.displayName, sourceKey: body.sourceKey ?? `admin:${params.sysUserId}`,
      }, body.active);
      return reply.code(204).send();
    } catch (error) { return handle(error, reply); }
  });
}
