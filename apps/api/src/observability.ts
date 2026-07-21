import { randomUUID } from "node:crypto";
import { trace, type Span } from "@opentelemetry/api";
import type { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    monitorTraceId: string;
    monitorSpan: Span;
  }
}

export interface MonitorMetrics {
  requests: number;
  responsesByStatus: Map<number, number>;
  websocketConnections: number;
}

export function createMetrics(): MonitorMetrics {
  return { requests: 0, responsesByStatus: new Map(), websocketConnections: 0 };
}

export function registerObservability(app: FastifyInstance, metrics: MonitorMetrics): void {
  const tracer = trace.getTracer("monitor-api", "0.1.0");
  app.decorateRequest("monitorTraceId", "");
  app.decorateRequest("monitorSpan", null as unknown as Span);
  app.addHook("onRequest", async (request, reply) => {
    request.monitorTraceId = request.headers["x-trace-id"]?.toString() ?? randomUUID();
    request.monitorSpan = tracer.startSpan(`${request.method} ${request.url}`);
    reply.header("x-trace-id", request.monitorTraceId);
    metrics.requests += 1;
  });
  app.addHook("onResponse", async (request, reply) => {
    metrics.responsesByStatus.set(reply.statusCode, (metrics.responsesByStatus.get(reply.statusCode) ?? 0) + 1);
    request.monitorSpan.setAttribute("http.response.status_code", reply.statusCode);
    request.monitorSpan.end();
  });
}

export function prometheusMetrics(metrics: MonitorMetrics): string {
  const lines = [
    "# HELP monitor_http_requests_total Total HTTP requests.",
    "# TYPE monitor_http_requests_total counter",
    `monitor_http_requests_total ${metrics.requests}`,
    "# HELP monitor_websocket_connections Current authenticated WebSocket connections.",
    "# TYPE monitor_websocket_connections gauge",
    `monitor_websocket_connections ${metrics.websocketConnections}`,
  ];
  for (const [status, count] of [...metrics.responsesByStatus.entries()].sort(([a], [b]) => a - b)) {
    lines.push(`monitor_http_responses_total{status="${status}"} ${count}`);
  }
  return lines.join("\n") + "\n";
}
