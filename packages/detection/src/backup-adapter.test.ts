import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { backupCutoff, ReadonlyBackupSqliteAdapter } from "./adapters.js";
import type { DetectionQueryDefinition } from "./types.js";

const root = resolve(import.meta.dirname, "../../..");
const databasePath = resolve(root, "local-data/phase0-validation/emusa-subset.sqlite");
const backupAvailable = existsSync(databasePath);

const definitions: Array<{ code: "A02" | "A05"; file: string; key: string; expectedRows: number }> = [
  { code: "A02", file: "a02-reserved-material-in-transit.v1.sql", key: "materialFlowDetailId", expectedRows: 1245 },
  { code: "A05", file: "a05-reel-handling.v1.sql", key: "articleSerialId", expectedRows: 763 },
];

describe("protected local backup adapters", { skip: !backupAvailable }, () => {
  for (const definition of definitions) {
    it(`${definition.code} uses bounded keyset pages with stable unique keys`, async () => {
      const sql = await readFile(resolve(root, "config/detection/queries", definition.file), "utf8");
      const query: DetectionQueryDefinition = {
        queryId: definition.code.toLowerCase(), ruleCode: definition.code, queryVersion: "1.0.0-candidate",
        adapterKind: "backup", keyField: definition.key, requiredFields: [definition.key], intervalMs: 300_000,
        timeoutMs: 3_000, pageSize: 1_000, maxRows: 10_000, maxAttempts: 1, retryBaseMs: 1, enabled: true,
      };
      const adapter = new ReadonlyBackupSqliteAdapter(databasePath, sql, backupCutoff(databasePath), "backup-20260716.local.v1");
      const keys: string[] = [];
      let cursor: string | null = null;
      let pages = 0;
      try {
        while (true) {
          const result = await adapter.readPage({ query, cursor, limit: query.pageSize, signal: new AbortController().signal });
          pages += 1;
          assert.ok(result.rows.length <= query.pageSize);
          keys.push(...result.rows.map((row) => String(row[definition.key])));
          if (result.complete) break;
          assert.ok(result.nextCursor);
          cursor = result.nextCursor;
        }
      } finally { adapter.close(); }
      assert.equal(keys.length, definition.expectedRows);
      assert.equal(new Set(keys).size, keys.length);
      assert.ok(pages <= 2);

      const planDatabase = new DatabaseSync(databasePath, { readOnly: true });
      try {
        const plans = planDatabase.prepare(`EXPLAIN QUERY PLAN ${sql}`).all({ after_id: 0, cutoff: backupCutoff(databasePath), result_limit: 1 }) as Array<{ detail: string }>;
        assert.ok(plans.some((plan) => plan.detail.includes(definition.code === "A02" ? "a02_candidate_idx" : "a05_candidate_idx")));
      } finally { planDatabase.close(); }
    });
  }
});
