import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createDatabaseRuntime, migrateFoundation, type DatabaseRuntime } from "@monitor/database";
import { MemorySourceAdapter, page } from "./adapters.js";
import { FakeFreshnessProvider } from "./freshness.js";
import { DetectionRepository } from "./repository.js";
import { DetectionRunner } from "./runner.js";
import type { DetectionQueryDefinition, FreshnessSignal } from "./types.js";

const databases: DatabaseRuntime[] = [];
const query: DetectionQueryDefinition = {
  queryId: "phase3-test-query",
  ruleCode: "T01",
  queryVersion: "1.0.0",
  adapterKind: "fixture",
  keyField: "id",
  requiredFields: ["id", "state"],
  intervalMs: 300_000,
  timeoutMs: 15,
  pageSize: 2,
  maxRows: 4,
  maxAttempts: 1,
  retryBaseMs: 1,
  enabled: true,
};
const fresh = (): FreshnessSignal => ({
  status: "fresh", observedAt: new Date().toISOString(), lagMilliseconds: 0,
  providerVersion: "fake.v1", sourceRevision: "fixture.v1",
});

async function setup(signal = fresh()) {
  const database = await createDatabaseRuntime({ mode: "pglite", pgliteDataDir: "memory://" });
  databases.push(database);
  await migrateFoundation(database);
  const repository = new DetectionRepository(database);
  return { database, repository, freshness: new FakeFreshnessProvider(signal) };
}

afterEach(async () => { await Promise.all(databases.splice(0).map((database) => database.close())); });

async function active(database: DatabaseRuntime): Promise<boolean> {
  const row = await database.queryOne("SELECT active FROM monitor_condition_state WHERE query_id=$1", [query.queryId]);
  return row.active === true;
}

describe("freshness-safe polling", () => {
  it("reconciles only a complete, valid, fresh cycle", async () => {
    const { database, repository, freshness } = await setup();
    const runner = new DetectionRunner(repository, freshness);
    const result = await runner.run(query, new MemorySourceAdapter([
      page([{ id: 1, state: "detected" }, { id: 2, state: "detected" }], { complete: false, nextCursor: "1", schemaVersion: query.queryVersion }),
      page([], { schemaVersion: query.queryVersion }),
    ]));
    assert.equal(result.status, "healthy");
    assert.equal(result.pageCount, 2);
    assert.equal(result.rowCount, 2);
    assert.equal(await active(database), true);
  });

  it("preserves active state after timeout, partial data, invalid schema, stale data, and unknown freshness", async () => {
    const { database, repository, freshness } = await setup();
    const runner = new DetectionRunner(repository, freshness, async () => {});
    await runner.run(query, new MemorySourceAdapter([page([{ id: 1, state: "detected" }], { schemaVersion: query.queryVersion })]));

    const timeout = await runner.run(query, new MemorySourceAdapter([], "timeout"));
    assert.equal(timeout.status, "timeout");
    assert.equal(await active(database), true);

    const partial = await runner.run(query, new MemorySourceAdapter([page([{ id: 1, state: "detected" }], { complete: false, schemaVersion: query.queryVersion })]));
    assert.equal(partial.status, "partial");
    assert.equal(await active(database), true);

    const invalid = await runner.run(query, new MemorySourceAdapter([page([{ id: 1 }], { schemaVersion: query.queryVersion })]));
    assert.equal(invalid.status, "invalid_schema");
    assert.equal(await active(database), true);

    freshness.signal = { ...fresh(), status: "stale" };
    const stale = await runner.run(query, new MemorySourceAdapter([page([], { schemaVersion: query.queryVersion })]));
    assert.equal(stale.status, "stale");
    assert.equal(await active(database), true);

    freshness.signal = { ...fresh(), status: "unknown" };
    const unknown = await runner.run(query, new MemorySourceAdapter([page([], { schemaVersion: query.queryVersion })]));
    assert.equal(unknown.status, "unknown_freshness");
    assert.equal(await active(database), true);
  });

  it("recovers correct state with the next healthy full evaluation after downtime", async () => {
    const { database, repository, freshness } = await setup();
    const runner = new DetectionRunner(repository, freshness, async () => {});
    await runner.run(query, new MemorySourceAdapter([page([{ id: 1, state: "detected" }], { schemaVersion: query.queryVersion })]));
    const outage = await runner.run(query, new MemorySourceAdapter([], "error"));
    assert.equal(outage.status, "source_error");
    assert.equal(await active(database), true);

    const recovered = await runner.run(query, new MemorySourceAdapter([page([], { schemaVersion: query.queryVersion })]), true);
    assert.equal(recovered.status, "healthy");
    assert.equal(recovered.fullEvaluation, true);
    assert.equal(recovered.recoveryRun, true);
    assert.equal(await active(database), false);
  });

  it("rejects truncation, revision changes, and duplicate keys across pages", async () => {
    const { repository, freshness } = await setup();
    const runner = new DetectionRunner(repository, freshness);
    const tinyLimit = { ...query, maxRows: 2 };
    const truncated = await runner.run(tinyLimit, new MemorySourceAdapter([
      page([{ id: 1, state: "x" }, { id: 2, state: "x" }], { complete: false, nextCursor: "1", schemaVersion: query.queryVersion }),
      page([{ id: 3, state: "x" }], { schemaVersion: query.queryVersion }),
    ]));
    assert.equal(truncated.status, "partial");

    const revision = await runner.run(query, new MemorySourceAdapter([
      page([{ id: 1, state: "x" }], { complete: false, nextCursor: "1", schemaVersion: query.queryVersion, sourceRevision: "one" }),
      page([], { schemaVersion: query.queryVersion, sourceRevision: "two" }),
    ]));
    assert.equal(revision.status, "partial");

    const duplicate = await runner.run(query, new MemorySourceAdapter([
      page([{ id: 1, state: "x" }], { complete: false, nextCursor: "1", schemaVersion: query.queryVersion }),
      page([{ id: 1, state: "x" }], { schemaVersion: query.queryVersion }),
    ]));
    assert.equal(duplicate.status, "invalid_schema");
  });

  it("prevents overlapping execution of the same query", async () => {
    const { repository, freshness } = await setup();
    const runner = new DetectionRunner(repository, freshness);
    const first = runner.run(query, new MemorySourceAdapter([], "timeout"));
    const overlapping = await runner.run(query, new MemorySourceAdapter([page([], { schemaVersion: query.queryVersion })]));
    assert.equal(overlapping.status, "overlap_skipped");
    assert.equal((await first).status, "timeout");
  });

  it("retries with bounded exponential backoff", async () => {
    const { repository, freshness } = await setup();
    const sleeps: number[] = [];
    const runner = new DetectionRunner(repository, freshness, async (milliseconds) => { sleeps.push(milliseconds); });
    let attempts = 0;
    const result = await runner.run({ ...query, maxAttempts: 2 }, {
      async readPage() {
        attempts += 1;
        if (attempts === 1) throw new Error("temporary_failure");
        return page([], { schemaVersion: query.queryVersion });
      },
    });
    assert.equal(result.status, "healthy");
    assert.equal(attempts, 2);
    assert.deepEqual(sleeps, [1]);
  });
});
