import { createDatabaseRuntime, migrateFoundation, type DatabaseRuntime } from "@monitor/database";
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { evaluateRule, IncidentService, type IncidentChange, type RuleContract } from "./index.js";

const a03: RuleContract = {
  code: "A03", title: "Active OT without consumption", naturalKey: ["workOrderId"],
  requiredEvidence: ["workOrderId", "active", "elapsedMinutes", "consumptionCount", "strongerA07"],
  parameters: { firstConsumptionMinutes: { value: 15 } },
  predicate: { all: [{ var: "active" }, { gte: [{ var: "elapsedMinutes" }, { param: "firstConsumptionMinutes" }] }, { eq: [{ var: "consumptionCount" }, 0] }, { not: { var: "strongerA07" } }] },
  reasonRules: [{ code: "no_first_consumption", when: { eq: [{ var: "consumptionCount" }, 0] } }],
};
const triggered = { workOrderId: 103, active: true, elapsedMinutes: 15, consumptionCount: 0, strongerA07: false };
const clear = { ...triggered, elapsedMinutes: 27, consumptionCount: 1 };
const context = { plantId: 1, workOrderId: "103", workOrderCode: "151087.3", machineCode: "P15", operationName: "Impresión" };

describe("Phase 4 rule evaluation", () => {
  it("distinguishes triggered, clear, and insufficient evidence", () => {
    assert.deepEqual(evaluateRule(a03, triggered), { status: "triggered", reasons: ["no_first_consumption"], conditionKey: "A03:v1:103" });
    assert.equal(evaluateRule(a03, clear).status, "clear");
    assert.equal(evaluateRule(a03, { ...triggered, strongerA07: undefined }).status, "insufficient");
  });
});

describe("Phase 4 incident lifecycle", () => {
  let database: DatabaseRuntime;
  let published: IncidentChange[];
  let service: IncidentService;
  beforeEach(async () => {
    database = await createDatabaseRuntime({ mode: "pglite", pgliteDataDir: "memory://" });
    await migrateFoundation(database);
    published = [];
    service = new IncidentService(database, (change) => published.push(change));
  });
  afterEach(async () => database.close());

  it("stores meaningful changes without duplicating unchanged polling evidence", async () => {
    const opened = await service.apply({ rule: a03, evidence: triggered, context });
    const unchanged = await service.apply({ rule: a03, evidence: { ...triggered, elapsedMinutes: 22 }, context });
    const updated = await service.apply({ rule: a03, evidence: { ...triggered, elapsedMinutes: 22, sourceVersion: "changed" }, context });
    const resolved = await service.apply({ rule: a03, evidence: clear, context });
    assert.equal(opened?.eventType, "incident.opened");
    assert.equal(unchanged, null);
    assert.equal(updated?.incidentId, opened?.incidentId);
    assert.equal(resolved?.eventType, "incident.resolved");
    const counts = await database.queryOne(`SELECT COUNT(*)::int AS incidents,
      (SELECT COUNT(*)::int FROM monitor_incident_evidence) AS evidence,
      (SELECT COUNT(*)::int FROM monitor_incident_transition) AS transitions FROM monitor_incident`);
    assert.deepEqual(counts, { incidents: 1, evidence: 3, transitions: 2 });
    assert.equal((await service.detail(opened!.incidentId, [1]))?.lifecycle, "resolved");
    assert.equal(published.length, 3);
  });

  it("creates a new occurrence when a resolved condition recurs", async () => {
    await service.apply({ rule: a03, evidence: triggered, context });
    await service.apply({ rule: a03, evidence: clear, context });
    await service.apply({ rule: a03, evidence: triggered, context });
    const rows = await database.queryAll("SELECT occurrence,lifecycle FROM monitor_incident ORDER BY occurrence");
    assert.deepEqual(rows, [{ occurrence: 1, lifecycle: "resolved" }, { occurrence: 2, lifecycle: "open" }]);
  });

  it("does nothing when evidence is insufficient", async () => {
    const change = await service.apply({ rule: a03, evidence: { ...triggered, strongerA07: undefined }, context });
    assert.equal(change, null);
    assert.equal(Number((await database.queryOne("SELECT COUNT(*)::int AS count FROM monitor_incident")).count), 0);
  });

  it("publishes only after a successful transaction", async () => {
    const failing: DatabaseRuntime = { ...database, async transaction(work) { await database.transaction(work); throw new Error("commit_failed"); } };
    const events: IncidentChange[] = [];
    await assert.rejects(new IncidentService(failing, (change) => events.push(change)).apply({ rule: a03, evidence: triggered, context }), /commit_failed/);
    assert.equal(events.length, 0);
  });
});
