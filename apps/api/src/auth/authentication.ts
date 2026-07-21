import type { MonitorScope, Principal } from "@monitor/contracts";
import type { FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import type { IdentityAdapter } from "./identity-adapter.js";

declare module "fastify" {
  interface FastifyRequest {
    principal: Principal | null;
  }
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    requireScopes(scopes: MonitorScope[]): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export function tokenFromRequest(request: FastifyRequest): string | null {
  const authorization = request.headers.authorization;
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7);
  const cookie = request.cookies.monitor_session;
  if (!cookie) return null;
  const unsigned = request.unsignCookie(cookie);
  return unsigned.valid ? unsigned.value : null;
}

export const authenticationPlugin = fp(async (app, options: { identityAdapter: IdentityAdapter }) => {
  app.decorateRequest("principal", null);
  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    const token = tokenFromRequest(request);
    const principal = token ? await options.identityAdapter.verifyToken(token) : null;
    if (!principal) {
      await reply.code(401).send({ error: "authentication_required" });
      return;
    }
    request.principal = principal;
  });
  app.decorate("requireScopes", (scopes: MonitorScope[]) => async (request: FastifyRequest, reply: FastifyReply) => {
    await app.authenticate(request, reply);
    if (reply.sent) return;
    if (!scopes.every((scope) => request.principal?.scopes.includes(scope))) {
      await reply.code(403).send({ error: "insufficient_scope" });
    }
  });
});
