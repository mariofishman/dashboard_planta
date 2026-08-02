import { randomUUID } from "node:crypto";
import type { DatabaseRuntime } from "@monitor/database";
import type { ScenarioRuleCode } from "./simulator.js";

export type ExperimentSecondsPerSimulatedMinute = number;
export type ExperimentPollingFrequencyMinutes = number;

export interface ScenarioExperimentIdentity {
  runId: string;
  manifestVersion: string;
  sourceActionContractVersion: string;
}

export interface ScenarioExperiment {
  id: string;
  runId: string;
  manifestVersion: string;
  sourceActionContractVersion: string;
  name: string;
  status: "running" | "paused" | "completed";
  businessTime: string;
  secondsPerSimulatedMinute: ExperimentSecondsPerSimulatedMinute;
  pollingFrequencyMinutes: ExperimentPollingFrequencyMinutes;
  nextDue: Record<ScenarioRuleCode, string>;
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioSnapshot {
  id: string;
  experimentId: string;
  label: string;
  schemaVersion: string;
  payload: Record<string, unknown>;
  capturedBusinessTime: string;
  capturedAt: string;
}

export interface ScenarioSnapshotPayloadV1 extends Record<string, unknown> {
  source: Record<string, unknown>;
  clock: Record<string, unknown>;
  poll: Record<string, unknown>;
  monitor: Record<string, unknown>;
}

export interface ScenarioAcceptanceResult {
  experimentId: string;
  testId: string;
  status: "passed" | "failed" | "not_run";
  evidence: Record<string, unknown>;
  startedAt: string;
  completedAt: string;
}

export interface ScenarioExperimentHistory {
  experiment: ScenarioExperiment;
  snapshots: ScenarioHistoryPage<ScenarioSnapshot>;
  results: ScenarioHistoryPage<ScenarioAcceptanceResult>;
}

export interface ScenarioDuePoll {
  ruleCode: ScenarioRuleCode;
  dueAt: string;
}

export type ScenarioRuntimeEventType = "poll_started" | "poll_completed" | "poll_failed" | "source_action";

export interface ScenarioRuntimeEvent {
  id: string;
  experimentId: string;
  eventType: ScenarioRuntimeEventType;
  ruleCode: ScenarioRuleCode;
  businessTime: string;
  payload: Record<string, unknown>;
  recordedAt: string;
}

export interface ScenarioOperationalEvent extends ScenarioRuntimeEvent {
  experimentName: string;
  experimentStatus: ScenarioExperiment["status"];
}

export interface ScenarioActiveRuntime {
  experiment: ScenarioExperiment | null;
  nextTickAt: string | null;
}

export interface ScenarioHistoryPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface ScenarioHistoryOptions {
  limit?: number;
  cursor?: string;
}

const codes: ScenarioRuleCode[] = ["A02", "A03", "A05"];
const json = (value: unknown) => JSON.stringify(value);
const parseObject = <T>(value: unknown): T => (typeof value === "string" ? JSON.parse(value) : value) as T;
const nonEmpty = (value: string): boolean => value.trim().length > 0;
const plainObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const canonicalJson = (value: unknown): string => JSON.stringify(value, (_key, nested) => {
  if (!nested || typeof nested !== "object" || Array.isArray(nested)) return nested;
  return Object.fromEntries(Object.entries(nested as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)));
});
const isoTimestamp = (value: unknown): string => {
  const timestamp = value instanceof Date ? value : new Date(String(value));
  if (!Number.isFinite(timestamp.getTime())) throw new Error("invalid_scenario_timestamp");
  return timestamp.toISOString();
};

function experimentRow(row: Record<string, unknown>): ScenarioExperiment {
  return {
    ...row,
    businessTime: isoTimestamp(row.businessTime),
    secondsPerSimulatedMinute: Number(row.secondsPerSimulatedMinute),
    pollingFrequencyMinutes: Number(row.pollingFrequencyMinutes),
    nextDue: parseObject(row.nextDue),
    createdAt: isoTimestamp(row.createdAt),
    updatedAt: isoTimestamp(row.updatedAt),
  } as unknown as ScenarioExperiment;
}

function snapshotRow(row: Record<string, unknown>): ScenarioSnapshot {
  if (!row.id) throw new Error("scenario_snapshot_not_found");
  const { snapshotSequence: _snapshotSequence, ...snapshot } = row;
  return {
    ...snapshot,
    payload: parseObject(row.payload),
    capturedBusinessTime: isoTimestamp(row.capturedBusinessTime),
    capturedAt: isoTimestamp(row.capturedAt),
  } as unknown as ScenarioSnapshot;
}

function historyLimit(value = 50): number {
  if (!Number.isInteger(value) || value < 1 || value > 200) throw new Error("invalid_scenario_history_limit");
  return value;
}

function historyCursor(value?: string): [string, string] | null {
  if (value === undefined) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== 2 || parsed.some((entry) => typeof entry !== "string" || !entry)) throw new Error();
    return parsed as [string, string];
  } catch { throw new Error("invalid_scenario_history_cursor"); }
}

const encodeCursor = (first: unknown, second: unknown): string => Buffer.from(JSON.stringify([String(first), String(second)]), "utf8").toString("base64url");
const cursorTimestamp = (value: unknown): string => {
  const timestamp = value instanceof Date ? value : new Date(String(value));
  if (!Number.isFinite(timestamp.getTime())) throw new Error("invalid_scenario_history_timestamp");
  return timestamp.toISOString();
};

function snapshotPayload(value: Record<string, unknown>, schemaVersion: string): ScenarioSnapshotPayloadV1 {
  if (schemaVersion !== "1.0.0" || !plainObject(value)) throw new Error("invalid_scenario_snapshot");
  for (const field of ["source", "clock", "poll", "monitor"] as const) if (!plainObject(value[field])) throw new Error("invalid_scenario_snapshot");
  return value as ScenarioSnapshotPayloadV1;
}

export class ScenarioExperimentRepository {
  constructor(private readonly database: DatabaseRuntime) {}

  async create(name: string, businessTime: string, pollingFrequencyMinutes: ExperimentPollingFrequencyMinutes, identity: ScenarioExperimentIdentity): Promise<ScenarioExperiment> {
    if (!name.trim() || !Number.isFinite(Date.parse(businessTime)) || !nonEmpty(identity.runId)
      || !nonEmpty(identity.manifestVersion) || !nonEmpty(identity.sourceActionContractVersion)) throw new Error("invalid_scenario_experiment");
    if (!Number.isInteger(pollingFrequencyMinutes) || pollingFrequencyMinutes < 1 || pollingFrequencyMinutes > 99) throw new Error("invalid_scenario_frequency");
    const nextDue = Object.fromEntries(codes.map((code) => [code, new Date(Date.parse(businessTime) + pollingFrequencyMinutes * 60_000).toISOString()])) as Record<ScenarioRuleCode, string>;
    const id = randomUUID();
    await this.database.execute(`INSERT INTO monitor_scenario_experiment
      (id,run_id,manifest_version,source_action_contract_version,name,status,business_time,speed,frequencies,next_due,seconds_per_simulated_minute,polling_frequency_minutes)
      VALUES ($1,$2,$3,$4,$5,'paused',$6,1,$7::jsonb,$8::jsonb,1,$9)`,
    [id, identity.runId.trim(), identity.manifestVersion.trim(), identity.sourceActionContractVersion.trim(), name.trim(), businessTime,
      json({ A02: pollingFrequencyMinutes, A03: pollingFrequencyMinutes, A05: pollingFrequencyMinutes }), json(nextDue), pollingFrequencyMinutes]);
    return this.get(id);
  }

  async get(id: string): Promise<ScenarioExperiment> {
    const row = await this.database.queryOne(`SELECT id,run_id AS "runId",manifest_version AS "manifestVersion",
      source_action_contract_version AS "sourceActionContractVersion",name,status,business_time AS "businessTime",
      seconds_per_simulated_minute AS "secondsPerSimulatedMinute",polling_frequency_minutes AS "pollingFrequencyMinutes",next_due AS "nextDue",
      created_at AS "createdAt",updated_at AS "updatedAt" FROM monitor_scenario_experiment WHERE id=$1`, [id]);
    if (!row.id) throw new Error("scenario_experiment_not_found");
    return experimentRow(row);
  }

  async list(options: ScenarioHistoryOptions = {}): Promise<ScenarioHistoryPage<ScenarioExperiment>> {
    const limit = historyLimit(options.limit);
    const cursor = historyCursor(options.cursor);
    const rows = await this.database.queryAll(`SELECT id,run_id AS "runId",manifest_version AS "manifestVersion",
      source_action_contract_version AS "sourceActionContractVersion",name,status,business_time AS "businessTime",
      seconds_per_simulated_minute AS "secondsPerSimulatedMinute",polling_frequency_minutes AS "pollingFrequencyMinutes",next_due AS "nextDue",
      created_at AS "createdAt",updated_at AS "updatedAt" FROM monitor_scenario_experiment
      ${cursor ? "WHERE (created_at,id)<($2::timestamptz,$3::uuid)" : ""} ORDER BY created_at DESC,id DESC LIMIT $1`,
    cursor ? [limit + 1, cursor[0], cursor[1]] : [limit + 1]);
    const items = rows.slice(0, limit).map(experimentRow);
    const last = items.at(-1);
    return { items, nextCursor: rows.length > limit && last ? encodeCursor(cursorTimestamp(last.createdAt), last.id) : null };
  }

  async configure(id: string, secondsPerSimulatedMinute: ExperimentSecondsPerSimulatedMinute, pollingFrequencyMinutes: ExperimentPollingFrequencyMinutes): Promise<ScenarioExperiment> {
    if (!Number.isInteger(secondsPerSimulatedMinute) || secondsPerSimulatedMinute < 1 || secondsPerSimulatedMinute > 60) throw new Error("invalid_scenario_speed");
    const current = await this.get(id);
    if (!Number.isInteger(pollingFrequencyMinutes) || pollingFrequencyMinutes < 1 || pollingFrequencyMinutes > 99) throw new Error("invalid_scenario_frequency");
    const nextDue = Object.fromEntries(codes.map((code) => [code, new Date(Date.parse(current.businessTime) + pollingFrequencyMinutes * 60_000).toISOString()])) as Record<ScenarioRuleCode, string>;
    await this.database.execute(`UPDATE monitor_scenario_experiment SET seconds_per_simulated_minute=$2,polling_frequency_minutes=$3,
      frequencies=$4::jsonb,next_due=$5::jsonb,updated_at=now() WHERE id=$1`, [id, secondsPerSimulatedMinute, pollingFrequencyMinutes,
      json({ A02: pollingFrequencyMinutes, A03: pollingFrequencyMinutes, A05: pollingFrequencyMinutes }), json(nextDue)]);
    return this.get(id);
  }

  async pause(id: string, paused = true): Promise<ScenarioExperiment> {
    const current = await this.get(id);
    const nextDue = paused ? current.nextDue : Object.fromEntries(codes.map((code) => [code,
      new Date(Date.parse(current.businessTime) + current.pollingFrequencyMinutes * 60_000).toISOString()])) as Record<ScenarioRuleCode, string>;
    await this.database.execute("UPDATE monitor_scenario_experiment SET status=$2,next_due=$3::jsonb,updated_at=now() WHERE id=$1", [id, paused ? "paused" : "running", json(nextDue)]);
    return this.get(id);
  }

  async activate(id: string, nextTickAt: string | null = null): Promise<ScenarioExperiment> {
    await this.get(id);
    await this.database.transaction(async (transaction) => {
      const previous = await transaction.queryOne("SELECT active_experiment_id AS id FROM monitor_scenario_runtime WHERE runtime_key='stage5'");
      if (previous.id && String(previous.id) !== id) {
        await transaction.execute("UPDATE monitor_scenario_experiment SET status='completed',updated_at=now() WHERE id=$1 AND status<>'completed'", [previous.id]);
      }
      await transaction.execute(`INSERT INTO monitor_scenario_runtime (runtime_key,active_experiment_id,next_tick_epoch_ms)
        VALUES ('stage5',$1,$2) ON CONFLICT (runtime_key) DO UPDATE SET active_experiment_id=EXCLUDED.active_experiment_id,
        next_tick_epoch_ms=EXCLUDED.next_tick_epoch_ms,updated_at=now()`, [id, nextTickAt ? Date.parse(nextTickAt) : null]);
    });
    return this.get(id);
  }

  async active(): Promise<ScenarioExperiment | null> {
    const row = await this.database.queryOne("SELECT active_experiment_id AS id FROM monitor_scenario_runtime WHERE runtime_key='stage5'");
    return row.id ? this.get(String(row.id)) : null;
  }

  async activeRuntime(): Promise<ScenarioActiveRuntime> {
    const row = await this.database.queryOne(`SELECT active_experiment_id AS id,next_tick_epoch_ms AS "nextTickEpochMs"
      FROM monitor_scenario_runtime WHERE runtime_key='stage5'`);
    return { experiment: row.id ? await this.get(String(row.id)) : null, nextTickAt: row.nextTickEpochMs ? new Date(Number(row.nextTickEpochMs)).toISOString() : null };
  }

  async setNextTick(id: string, nextTickAt: string | null): Promise<void> {
    if (nextTickAt !== null && !Number.isFinite(Date.parse(nextTickAt))) throw new Error("invalid_scenario_next_tick");
    const row = await this.database.queryOne("SELECT active_experiment_id AS id FROM monitor_scenario_runtime WHERE runtime_key='stage5'");
    if (!row.id || String(row.id) !== id) throw new Error("scenario_experiment_not_active");
    await this.database.execute("UPDATE monitor_scenario_runtime SET next_tick_epoch_ms=$2,updated_at=now() WHERE runtime_key='stage5' AND active_experiment_id=$1", [id, nextTickAt ? Date.parse(nextTickAt) : null]);
  }

  async recordRuntimeEvent(id: string, eventType: ScenarioRuntimeEventType, ruleCode: ScenarioRuleCode, businessTime: string, payload: Record<string, unknown>): Promise<ScenarioRuntimeEvent> {
    if (!plainObject(payload) || !Number.isFinite(Date.parse(businessTime))) throw new Error("invalid_scenario_runtime_event");
    const eventId = randomUUID();
    await this.database.execute(`INSERT INTO monitor_scenario_runtime_event
      (id,experiment_id,event_type,rule_code,business_time,payload) VALUES ($1,$2,$3,$4,$5,$6::jsonb)
      ${eventType === "poll_completed" ? "ON CONFLICT (experiment_id,rule_code,business_time) WHERE event_type='poll_completed' DO NOTHING" : ""}`,
    [eventId, id, eventType, ruleCode, businessTime, json(payload)]);
    const row = await this.database.queryOne(`SELECT id,experiment_id AS "experimentId",event_type AS "eventType",rule_code AS "ruleCode",
      business_time AS "businessTime",payload,recorded_at AS "recordedAt" FROM monitor_scenario_runtime_event
      WHERE ${eventType === "poll_completed" ? "experiment_id=$1 AND event_type=$2 AND rule_code=$3 AND business_time=$4" : "id=$1"}`,
    eventType === "poll_completed" ? [id, eventType, ruleCode, businessTime] : [eventId]);
    return {
      ...row, payload: parseObject(row.payload), businessTime: isoTimestamp(row.businessTime), recordedAt: isoTimestamp(row.recordedAt),
    } as unknown as ScenarioRuntimeEvent;
  }

  async runtimeEvents(id: string): Promise<ScenarioRuntimeEvent[]> {
    const rows = await this.database.queryAll(`SELECT id,experiment_id AS "experimentId",event_type AS "eventType",rule_code AS "ruleCode",
      business_time AS "businessTime",payload,recorded_at AS "recordedAt" FROM monitor_scenario_runtime_event
      WHERE experiment_id=$1 ORDER BY sequence`, [id]);
    return rows.map((row) => ({
      ...row, payload: parseObject(row.payload), businessTime: isoTimestamp(row.businessTime), recordedAt: isoTimestamp(row.recordedAt),
    } as unknown as ScenarioRuntimeEvent));
  }

  async operationalEvents(ruleCode: ScenarioRuleCode): Promise<ScenarioOperationalEvent[]> {
    const rows = await this.database.queryAll(`SELECT event.id,event.experiment_id AS "experimentId",event.event_type AS "eventType",
      event.rule_code AS "ruleCode",event.business_time AS "businessTime",event.payload,event.recorded_at AS "recordedAt",
      experiment.name AS "experimentName",experiment.status AS "experimentStatus"
      FROM monitor_scenario_runtime_event event JOIN monitor_scenario_experiment experiment ON experiment.id=event.experiment_id
      WHERE event.event_type='source_action' AND event.rule_code=$1 ORDER BY event.recorded_at DESC,event.sequence DESC`, [ruleCode]);
    return rows.map((row) => ({
      ...row, payload: parseObject(row.payload), businessTime: isoTimestamp(row.businessTime), recordedAt: isoTimestamp(row.recordedAt),
    } as unknown as ScenarioOperationalEvent));
  }

  async planAdvance(id: string, minutes: number): Promise<{ experiment: ScenarioExperiment; targetTime: string; due: ScenarioDuePoll[] }> {
    const experiment = await this.get(id);
    if (!Number.isInteger(minutes) || minutes < 0) throw new Error("invalid_scenario_advance");
    const targetTime = new Date(Date.parse(experiment.businessTime) + minutes * 60_000).toISOString();
    const due: ScenarioDuePoll[] = [];
    for (const ruleCode of codes) {
      let dueAt = experiment.nextDue[ruleCode];
      while (Date.parse(dueAt) <= Date.parse(targetTime)) {
        due.push({ ruleCode, dueAt });
        dueAt = new Date(Date.parse(dueAt) + experiment.pollingFrequencyMinutes * 60_000).toISOString();
      }
    }
    due.sort((left, right) => Date.parse(left.dueAt) - Date.parse(right.dueAt) || codes.indexOf(left.ruleCode) - codes.indexOf(right.ruleCode));
    return { experiment, targetTime, due };
  }

  async setBusinessTime(id: string, businessTime: string): Promise<ScenarioExperiment> {
    const current = await this.get(id);
    if (!Number.isFinite(Date.parse(businessTime)) || Date.parse(businessTime) < Date.parse(current.businessTime)) throw new Error("invalid_scenario_business_time");
    await this.database.execute("UPDATE monitor_scenario_experiment SET business_time=$2,updated_at=now() WHERE id=$1", [id, businessTime]);
    return this.get(id);
  }

  async completeDue(id: string, due: ScenarioDuePoll): Promise<ScenarioExperiment> {
    const current = await this.get(id);
    if (current.nextDue[due.ruleCode] !== due.dueAt || Date.parse(due.dueAt) > Date.parse(current.businessTime)) throw new Error("invalid_scenario_due_poll");
    const nextDue = { ...current.nextDue, [due.ruleCode]: new Date(Date.parse(due.dueAt) + current.pollingFrequencyMinutes * 60_000).toISOString() };
    await this.database.execute("UPDATE monitor_scenario_experiment SET next_due=$2::jsonb,updated_at=now() WHERE id=$1", [id, json(nextDue)]);
    return this.get(id);
  }

  async advance(id: string, minutes: number): Promise<{ experiment: ScenarioExperiment; due: ScenarioRuleCode[] }> {
    const current = await this.get(id);
    if (current.status === "paused") return { experiment: current, due: [] };
    if (!Number.isInteger(minutes) || minutes < 1) throw new Error("invalid_scenario_advance");
    const businessTime = new Date(Date.parse(current.businessTime) + minutes * 60_000).toISOString();
    const nextDue = { ...current.nextDue };
    const due: ScenarioRuleCode[] = [];
    for (const code of codes) {
      if (Date.parse(nextDue[code]) <= Date.parse(businessTime)) {
        due.push(code);
        do nextDue[code] = new Date(Date.parse(nextDue[code]) + current.pollingFrequencyMinutes * 60_000).toISOString();
        while (Date.parse(nextDue[code]) <= Date.parse(businessTime));
      }
    }
    await this.database.execute("UPDATE monitor_scenario_experiment SET business_time=$2,next_due=$3::jsonb,updated_at=now() WHERE id=$1", [id, businessTime, json(nextDue)]);
    return { experiment: await this.get(id), due };
  }

  async snapshot(id: string, label: string, payload: Record<string, unknown>, schemaVersion = "1.0.0"): Promise<ScenarioSnapshot> {
    if (!nonEmpty(label) || !nonEmpty(schemaVersion)) throw new Error("invalid_scenario_snapshot");
    const validatedPayload = snapshotPayload(payload, schemaVersion.trim());
    const experiment = await this.get(id);
    const snapshotId = randomUUID();
    await this.database.execute(`INSERT INTO monitor_scenario_snapshot
      (id,experiment_id,label,schema_version,payload,captured_business_time) VALUES ($1,$2,$3,$4,$5::jsonb,$6)
      ON CONFLICT (experiment_id,label) DO NOTHING`,
    [snapshotId, id, label.trim(), schemaVersion.trim(), canonicalJson(validatedPayload), experiment.businessTime]);
    const stored = snapshotRow(await this.database.queryOne(`SELECT id,experiment_id AS "experimentId",label,schema_version AS "schemaVersion",
      payload,captured_business_time AS "capturedBusinessTime",captured_at AS "capturedAt"
      FROM monitor_scenario_snapshot WHERE experiment_id=$1 AND label=$2`, [id, label.trim()]));
    if (stored.schemaVersion !== schemaVersion.trim() || canonicalJson(stored.payload) !== canonicalJson(validatedPayload)
      || Date.parse(stored.capturedBusinessTime) !== Date.parse(experiment.businessTime)) throw new Error("scenario_snapshot_label_conflict");
    return stored;
  }

  async snapshots(id: string, options: ScenarioHistoryOptions = {}): Promise<ScenarioHistoryPage<ScenarioSnapshot>> {
    await this.get(id);
    const limit = historyLimit(options.limit);
    const cursor = historyCursor(options.cursor);
    if (cursor && !/^\d+$/.test(cursor[1])) throw new Error("invalid_scenario_history_cursor");
    const rows = await this.database.queryAll(`SELECT id,experiment_id AS "experimentId",label,schema_version AS "schemaVersion",
      payload,captured_business_time AS "capturedBusinessTime",captured_at AS "capturedAt",snapshot_sequence AS "snapshotSequence"
      FROM monitor_scenario_snapshot WHERE experiment_id=$1 ${cursor ? "AND snapshot_sequence>$3::bigint" : ""}
      ORDER BY snapshot_sequence LIMIT $2`, cursor ? [id, limit + 1, cursor[1]] : [id, limit + 1]);
    const items = rows.slice(0, limit).map(snapshotRow);
    const last = rows.slice(0, limit).at(-1);
    return { items, nextCursor: rows.length > limit && last ? encodeCursor("snapshot_sequence", last.snapshotSequence) : null };
  }

  async results(id: string, options: ScenarioHistoryOptions = {}): Promise<ScenarioHistoryPage<ScenarioAcceptanceResult>> {
    await this.get(id);
    const limit = historyLimit(options.limit);
    const cursor = historyCursor(options.cursor);
    const rows = await this.database.queryAll(`SELECT experiment_id AS "experimentId",test_id AS "testId",status,evidence,
      started_at AS "startedAt",completed_at AS "completedAt" FROM monitor_scenario_acceptance_result
      WHERE experiment_id=$1 ${cursor ? "AND test_id>$3" : ""} ORDER BY test_id LIMIT $2`, cursor ? [id, limit + 1, cursor[1]] : [id, limit + 1]);
    const items = rows.slice(0, limit).map((row) => ({
      ...row, evidence: parseObject(row.evidence), startedAt: isoTimestamp(row.startedAt), completedAt: isoTimestamp(row.completedAt),
    } as unknown as ScenarioAcceptanceResult));
    const last = items.at(-1);
    return { items, nextCursor: rows.length > limit && last ? encodeCursor("test", last.testId) : null };
  }

  async history(id: string, options: { snapshots?: ScenarioHistoryOptions; results?: ScenarioHistoryOptions } = {}): Promise<ScenarioExperimentHistory> {
    const [experiment, snapshots, results] = await Promise.all([this.get(id), this.snapshots(id, options.snapshots), this.results(id, options.results)]);
    return { experiment, snapshots, results };
  }

  async record(id: string, testId: string, status: "passed" | "failed" | "not_run", evidence: Record<string, unknown>, startedAt: string): Promise<void> {
    await this.database.execute(`INSERT INTO monitor_scenario_acceptance_result
      (experiment_id,test_id,status,evidence,started_at,completed_at) VALUES ($1,$2,$3,$4::jsonb,$5,now())
      ON CONFLICT (experiment_id,test_id) DO UPDATE SET status=EXCLUDED.status,evidence=EXCLUDED.evidence,started_at=EXCLUDED.started_at,completed_at=EXCLUDED.completed_at`,
    [id, testId, status, json(evidence), startedAt]);
  }
}
