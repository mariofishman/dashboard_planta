import { randomUUID } from "node:crypto";
import type { DatabaseRuntime } from "@monitor/database";
import type { ScenarioRuleCode } from "./simulator.js";

export type ExperimentSpeed = 1 | 2 | 3 | 60;
export type ExperimentFrequencies = Record<ScenarioRuleCode, number>;

export interface ScenarioExperiment {
  id: string;
  name: string;
  status: "running" | "paused" | "completed";
  businessTime: string;
  speed: ExperimentSpeed;
  frequencies: ExperimentFrequencies;
  nextDue: Record<ScenarioRuleCode, string>;
  createdAt: string;
  updatedAt: string;
}

const codes: ScenarioRuleCode[] = ["A02", "A03", "A05"];
const json = (value: unknown) => JSON.stringify(value);
const parseObject = <T>(value: unknown): T => (typeof value === "string" ? JSON.parse(value) : value) as T;

export class ScenarioExperimentRepository {
  constructor(private readonly database: DatabaseRuntime) {}

  async create(name: string, businessTime: string, frequencies: ExperimentFrequencies): Promise<ScenarioExperiment> {
    if (!name.trim() || !Number.isFinite(Date.parse(businessTime))) throw new Error("invalid_scenario_experiment");
    for (const code of codes) if (!Number.isInteger(frequencies[code]) || frequencies[code] < 1) throw new Error("invalid_scenario_frequency");
    const nextDue = Object.fromEntries(codes.map((code) => [code, new Date(Date.parse(businessTime) + frequencies[code] * 60_000).toISOString()])) as Record<ScenarioRuleCode, string>;
    const id = randomUUID();
    await this.database.execute(`INSERT INTO monitor_scenario_experiment
      (id,name,status,business_time,speed,frequencies,next_due) VALUES ($1,$2,'running',$3,1,$4::jsonb,$5::jsonb)`,
    [id, name.trim(), businessTime, json(frequencies), json(nextDue)]);
    return this.get(id);
  }

  async get(id: string): Promise<ScenarioExperiment> {
    const row = await this.database.queryOne(`SELECT id,name,status,business_time AS "businessTime",speed,frequencies,next_due AS "nextDue",
      created_at AS "createdAt",updated_at AS "updatedAt" FROM monitor_scenario_experiment WHERE id=$1`, [id]);
    if (!row.id) throw new Error("scenario_experiment_not_found");
    return { ...row, speed: Number(row.speed), frequencies: parseObject(row.frequencies), nextDue: parseObject(row.nextDue) } as unknown as ScenarioExperiment;
  }

  async configure(id: string, speed: ExperimentSpeed, frequencies: ExperimentFrequencies): Promise<ScenarioExperiment> {
    if (![1, 2, 3, 60].includes(speed)) throw new Error("invalid_scenario_speed");
    const current = await this.get(id);
    for (const code of codes) if (!Number.isInteger(frequencies[code]) || frequencies[code] < 1) throw new Error("invalid_scenario_frequency");
    const nextDue = Object.fromEntries(codes.map((code) => [code, new Date(Date.parse(current.businessTime) + frequencies[code] * 60_000).toISOString()])) as Record<ScenarioRuleCode, string>;
    await this.database.execute("UPDATE monitor_scenario_experiment SET speed=$2,frequencies=$3::jsonb,next_due=$4::jsonb,updated_at=now() WHERE id=$1", [id, speed, json(frequencies), json(nextDue)]);
    return this.get(id);
  }

  async pause(id: string, paused = true): Promise<ScenarioExperiment> {
    await this.database.execute("UPDATE monitor_scenario_experiment SET status=$2,updated_at=now() WHERE id=$1", [id, paused ? "paused" : "running"]);
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
        do nextDue[code] = new Date(Date.parse(nextDue[code]) + current.frequencies[code] * 60_000).toISOString();
        while (Date.parse(nextDue[code]) <= Date.parse(businessTime));
      }
    }
    await this.database.execute("UPDATE monitor_scenario_experiment SET business_time=$2,next_due=$3::jsonb,updated_at=now() WHERE id=$1", [id, businessTime, json(nextDue)]);
    return { experiment: await this.get(id), due };
  }

  async snapshot(id: string, label: string, payload: Record<string, unknown>): Promise<string> {
    const experiment = await this.get(id);
    const snapshotId = randomUUID();
    await this.database.execute(`INSERT INTO monitor_scenario_snapshot
      (id,experiment_id,label,payload,captured_business_time) VALUES ($1,$2,$3,$4::jsonb,$5)`,
    [snapshotId, id, label, json(payload), experiment.businessTime]);
    return snapshotId;
  }

  async record(id: string, testId: string, status: "passed" | "failed" | "not_run", evidence: Record<string, unknown>, startedAt: string): Promise<void> {
    await this.database.execute(`INSERT INTO monitor_scenario_acceptance_result
      (experiment_id,test_id,status,evidence,started_at,completed_at) VALUES ($1,$2,$3,$4::jsonb,$5,now())
      ON CONFLICT (experiment_id,test_id) DO UPDATE SET status=EXCLUDED.status,evidence=EXCLUDED.evidence,started_at=EXCLUDED.started_at,completed_at=EXCLUDED.completed_at`,
    [id, testId, status, json(evidence), startedAt]);
  }
}
