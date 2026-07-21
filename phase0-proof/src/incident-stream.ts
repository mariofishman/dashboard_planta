import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import { Server as SocketServer } from "socket.io";

export type IncidentLifecycle = "OPEN" | "RESOLVED" | "CLOSED_WITHOUT_RESOLUTION";
export type IncidentEventType =
  | "incident.created"
  | "incident.updated"
  | "incident.resolved"
  | "incident.closed_without_resolution";

export interface IncidentChangeInput {
  type: IncidentEventType;
  occurredAt: string;
  incidentId: string;
  plantId: number;
  payload: {
    alertTypeCode: string;
    lifecycle: IncidentLifecycle;
    queryId: string;
    queryVersion: string;
    conditionKey: string;
  };
}

export interface IncidentChange extends IncidentChangeInput {
  schemaVersion: "1.0.0";
  eventId: string;
  cursor: number;
}

export class CommittedChangeStore {
  #changes: IncidentChange[] = [];

  commit(input: IncidentChangeInput, failBeforeCommit = false): IncidentChange {
    if (failBeforeCommit) {
      throw new Error("simulated persistence failure");
    }
    const change: IncidentChange = {
      schemaVersion: "1.0.0",
      eventId: randomUUID(),
      cursor: this.#changes.length + 1,
      ...input,
    };
    this.#changes.push(structuredClone(change));
    return structuredClone(change);
  }

  after(cursor: number, limit: number): { changes: IncidentChange[]; hasMore: boolean } {
    const eligible = this.#changes.filter((change) => change.cursor > cursor);
    return {
      changes: structuredClone(eligible.slice(0, limit)),
      hasMore: eligible.length > limit,
    };
  }
}

export async function createIncidentStreamProof() {
  const app = Fastify({ logger: false });
  const io = new SocketServer(app.server, { path: "/monitor", transports: ["websocket"] });
  const store = new CommittedChangeStore();

  app.get<{ Querystring: { after?: string; limit?: string } }>("/v1/changes", async (request) => {
    const after = Math.max(0, Number.parseInt(request.query.after ?? "0", 10) || 0);
    const limit = Math.min(500, Math.max(1, Number.parseInt(request.query.limit ?? "100", 10) || 100));
    const page = store.after(after, limit);
    const lastCursor = page.changes.at(-1)?.cursor ?? after;
    return { ...page, lastCursor };
  });

  io.on("connection", (socket) => {
    const plantId = Number(socket.handshake.auth.plantId);
    if (!Number.isInteger(plantId) || plantId < 1) {
      socket.disconnect(true);
      return;
    }
    void socket.join(`plant:${plantId}`);
    socket.emit("server.ready", { protocolVersion: "1.0.0" });
  });

  function commitAndPublish(input: IncidentChangeInput, publish = true): IncidentChange {
    const change = store.commit(input);
    if (publish) {
      io.to(`plant:${change.plantId}`).emit(change.type, change);
    }
    return change;
  }

  return { app, io, store, commitAndPublish };
}
