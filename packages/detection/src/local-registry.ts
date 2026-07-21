import { readFile } from "node:fs/promises";
import type { DetectionQueryDefinition, DetectionSourceAdapter } from "./types.js";
import { MemorySourceAdapter, page } from "./adapters.js";

interface RuleContract {
  code: string;
  queryId: string;
  queryVersion: string;
  naturalKey: string[];
  requiredEvidence: string[];
}
interface FixtureCase { ruleCode: string; input: Record<string, unknown>; expectedStatus: string }

export async function loadFixtureRegistry(catalogPath: string, fixturesPath: string): Promise<Array<{
  query: DetectionQueryDefinition;
  adapter: DetectionSourceAdapter;
}>> {
  const catalog = JSON.parse(await readFile(catalogPath, "utf8")) as { rules: RuleContract[] };
  const fixtures = JSON.parse(await readFile(fixturesPath, "utf8")) as { cases: FixtureCase[] };
  return catalog.rules.map((rule) => {
    const triggered = fixtures.cases.filter((fixture) => fixture.ruleCode === rule.code && fixture.expectedStatus === "triggered").map((fixture) => fixture.input);
    return {
      query: {
        queryId: rule.queryId,
        ruleCode: rule.code,
        queryVersion: rule.queryVersion,
        adapterKind: "fixture",
        keyField: rule.naturalKey[0]!,
        requiredFields: rule.requiredEvidence,
        intervalMs: 300_000,
        timeoutMs: 3_000,
        pageSize: 1_000,
        maxRows: 10_000,
        maxAttempts: 2,
        retryBaseMs: 30_000,
        enabled: true,
      },
      adapter: new MemorySourceAdapter([page(triggered, { schemaVersion: rule.queryVersion, sourceRevision: "phase1-fixtures.v1" })]),
    };
  });
}
