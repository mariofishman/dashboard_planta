import type { DatabaseRuntime } from "@monitor/database";
import { randomUUID } from "node:crypto";

export const testInterruptionPoints = [
  "after_incident_commit",
  "before_routing_decision",
  "after_routing_decision",
  "before_delivery_creation",
  "after_delivery_creation",
  "before_conversation_attachment",
  "after_conversation_attachment",
  "before_alert_message_creation",
  "after_alert_message_creation",
  "before_change_publication",
  "after_change_publication",
] as const;

export type TestInterruptionPoint = typeof testInterruptionPoints[number];

export interface TestInterruptionRecord {
  id: string;
  point: TestInterruptionPoint;
  status: "armed" | "fired";
  context: Record<string, unknown>;
  armedAt: string;
  firedAt: string | null;
}

export class TestInterruptionUnavailableError extends Error {}
export class TestInterruptionAlreadyArmedError extends Error {}

export class TestInterruptionError extends Error {
  constructor(readonly interruption: TestInterruptionRecord) {
    super(`test_interruption:${interruption.point}:${interruption.id}`);
  }
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function timestamp(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return new Date(value instanceof Date ? value.getTime() : String(value)).toISOString();
}

function record(row: Record<string, unknown>): TestInterruptionRecord {
  return {
    id: String(row.id),
    point: String(row.point) as TestInterruptionPoint,
    status: String(row.status) as "armed" | "fired",
    context: typeof row.context === "string" ? object(JSON.parse(row.context)) : object(row.context),
    armedAt: timestamp(row.armedAt)!,
    firedAt: timestamp(row.firedAt),
  };
}

export function isTestInterruptionPoint(value: unknown): value is TestInterruptionPoint {
  return typeof value === "string" && (testInterruptionPoints as readonly string[]).includes(value);
}

export class TestInterruptionController {
  private readonly enabled: boolean;

  constructor(private readonly database: DatabaseRuntime, nodeEnv: string) {
    this.enabled = nodeEnv === "test";
  }

  async arm(point: TestInterruptionPoint): Promise<TestInterruptionRecord> {
    if (!this.enabled) throw new TestInterruptionUnavailableError("test_interruptions_unavailable");
    const existing = await this.database.queryOne(`SELECT id FROM monitor_test_interruption
      WHERE point=$1 AND status='armed'`, [point]);
    if (existing.id) throw new TestInterruptionAlreadyArmedError("test_interruption_already_armed");
    const id = randomUUID();
    const row = await this.database.queryOne(`INSERT INTO monitor_test_interruption (id,point)
      VALUES ($1,$2) RETURNING id,point,status,context,armed_at AS "armedAt",fired_at AS "firedAt"`, [id, point]);
    return record(row);
  }

  async armed<TPoint extends TestInterruptionPoint>(points: readonly TPoint[]): Promise<Set<TPoint>> {
    if (!this.enabled || !points.length) return new Set<TPoint>();
    const rows = await this.database.queryAll(`SELECT point FROM monitor_test_interruption
      WHERE status='armed' AND point=ANY($1::text[])`, [[...points]]);
    return new Set(rows.map((row) => String(row.point) as TPoint));
  }

  async fire(point: TestInterruptionPoint, context: Record<string, unknown>): Promise<void> {
    if (!this.enabled) return;
    const row = await this.database.queryOne(`UPDATE monitor_test_interruption SET status='fired',context=$2::jsonb,fired_at=now()
      WHERE id=(SELECT id FROM monitor_test_interruption WHERE point=$1 AND status='armed' ORDER BY armed_at,id LIMIT 1)
      RETURNING id,point,status,context,armed_at AS "armedAt",fired_at AS "firedAt"`, [point, JSON.stringify(context)]);
    if (row.id) throw new TestInterruptionError(record(row));
  }

  async get(id: string): Promise<TestInterruptionRecord | null> {
    const row = await this.database.queryOne(`SELECT id,point,status,context,armed_at AS "armedAt",fired_at AS "firedAt"
      FROM monitor_test_interruption WHERE id=$1`, [id]);
    return row.id ? record(row) : null;
  }
}
