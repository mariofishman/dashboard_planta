import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { io as createClient, type Socket } from "socket.io-client";
import { createIncidentStreamProof, type IncidentChangeInput } from "../src/incident-stream.js";

const incidentId = "a5f92241-82ef-44fb-a663-7bd33ec7d953";
const input: IncidentChangeInput = {
  type: "incident.created",
  occurredAt: "2026-07-20T18:00:00.000Z",
  incidentId,
  plantId: 7,
  payload: {
    alertTypeCode: "A02",
    lifecycle: "OPEN",
    queryId: "a02-reserved-material-in-transit",
    queryVersion: "1.0.0-candidate",
    conditionKey: "A02:a02-reserved-material-in-transit:1:48192",
  },
};

function nextSocketEvent(socket: Socket, event: string): Promise<unknown> {
  return new Promise((resolve) => socket.once(event, resolve));
}

describe("committed incident stream", () => {
  let proof: Awaited<ReturnType<typeof createIncidentStreamProof>>;
  let baseUrl: string;
  let socket: Socket;

  beforeAll(async () => {
    proof = await createIncidentStreamProof();
    await proof.app.listen({ host: "127.0.0.1", port: 0 });
    const address = proof.app.server.address();
    if (!address || typeof address === "string") throw new Error("missing test port");
    baseUrl = `http://127.0.0.1:${address.port}`;
    socket = createClient(baseUrl, {
      path: "/monitor",
      transports: ["websocket"],
      auth: { plantId: 7 },
    });
    await nextSocketEvent(socket, "server.ready");
  });

  afterAll(async () => {
    socket.disconnect();
    proof.io.close();
    await proof.app.close();
  });

  it("publishes only after commit and gives the event a durable cursor", async () => {
    const live = nextSocketEvent(socket, "incident.created");
    const committed = proof.commitAndPublish(input);
    const received = await live;
    expect(received).toEqual(committed);
    expect(committed.cursor).toBe(1);

    expect(() => proof.store.commit({ ...input, incidentId: crypto.randomUUID() }, true)).toThrow();
    expect(proof.store.after(1, 10).changes).toHaveLength(0);
  });

  it("recovers a committed event through the API when live publication is missed", async () => {
    const missed = proof.commitAndPublish(
      { ...input, type: "incident.updated", incidentId, occurredAt: "2026-07-20T18:01:00.000Z" },
      false,
    );
    const response = await fetch(`${baseUrl}/v1/changes?after=1&limit=100`);
    expect(response.status).toBe(200);
    const page = await response.json() as { changes: unknown[]; lastCursor: number; hasMore: boolean };
    expect(page.changes).toEqual([missed]);
    expect(page.lastCursor).toBe(2);
    expect(page.hasMore).toBe(false);
  });

  it("does not expose backend secret-shaped fields", async () => {
    const response = await fetch(`${baseUrl}/v1/changes?after=0&limit=100`);
    const serialized = await response.text();
    expect(serialized).not.toMatch(/password|secret|credential|databaseUrl|redisUrl|mcpToken/i);
  });
});
