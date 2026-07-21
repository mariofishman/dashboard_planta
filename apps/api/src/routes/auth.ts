import { MockLoginRequestSchema, PrincipalSchema, SessionResponseSchema } from "@monitor/contracts";
import { Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import type { MonitorConfig } from "../config.js";
import { supportsMockLogin, type IdentityAdapter } from "../auth/identity-adapter.js";

export async function authRoutes(app: FastifyInstance, options: {
  config: MonitorConfig;
  identityAdapter: IdentityAdapter;
}): Promise<void> {
  app.get("/api/auth/mock-identities", {
    schema: { response: {
      200: Type.Array(Type.Object({ identityId: Type.String(), principal: PrincipalSchema })),
      404: Type.Null(),
    } },
  }, async (_request, reply) => {
    if (!options.config.allowMockAuth || !supportsMockLogin(options.identityAdapter)) return reply.code(404).send(null);
    return options.identityAdapter.listIdentities();
  });

  app.post<{ Body: { identityId: "plant-manager" | "shift-supervisor" | "machine-operator" } }>("/api/auth/mock-login", {
    schema: { body: MockLoginRequestSchema, response: {
      200: SessionResponseSchema,
      401: Type.Object({ error: Type.String() }),
      404: Type.Null(),
    } },
  }, async (request, reply) => {
    if (!options.config.allowMockAuth || !supportsMockLogin(options.identityAdapter)) return reply.code(404).send(null);
    const token = await options.identityAdapter.issueToken(request.body.identityId);
    const principal = token ? await options.identityAdapter.verifyToken(token) : null;
    if (!token || !principal) return reply.code(401).send({ error: "unknown_mock_identity" });
    reply.setCookie("monitor_session", token, {
      path: "/", httpOnly: true, sameSite: "strict", secure: options.config.nodeEnv === "production", signed: true,
    });
    return { principal, features: options.config.features };
  });

  app.get("/api/session", {
    preHandler: app.authenticate,
    schema: { response: { 200: SessionResponseSchema } },
  }, async (request) => ({ principal: request.principal!, features: options.config.features }));

  app.post("/api/auth/logout", async (_request, reply) => {
    reply.clearCookie("monitor_session", { path: "/" });
    return reply.code(204).send();
  });
}
