import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import type { FastifyBaseLogger } from "fastify";
import type { Server as SocketIOServer } from "socket.io";

export interface RedisRuntime {
  mode: "memory" | "redis";
  ready(): Promise<boolean>;
  close(): Promise<void>;
}

export async function attachRedis(io: SocketIOServer, redisUrl: string | undefined, logger: FastifyBaseLogger): Promise<RedisRuntime> {
  if (!redisUrl) {
    logger.info("Redis URL is absent; Socket.IO uses its single-process in-memory adapter");
    return { mode: "memory", async ready() { return true; }, async close() {} };
  }

  const publisher = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
  const subscriber = publisher.duplicate();
  await Promise.all([publisher.connect(), subscriber.connect()]);
  io.adapter(createAdapter(publisher, subscriber));
  return {
    mode: "redis",
    async ready() { return (await publisher.ping()) === "PONG"; },
    async close() { await Promise.all([publisher.quit(), subscriber.quit()]); },
  };
}
