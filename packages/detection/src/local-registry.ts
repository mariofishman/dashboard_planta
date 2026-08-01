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
interface FixtureCase {
  id: string;
  ruleCode: string;
  input: Record<string, unknown>;
  expectedStatus: string;
  registryCanonical?: boolean;
}

function canonicalTriggeredFixture(ruleCode: string, cases: FixtureCase[]): FixtureCase {
  const triggered = cases.filter(
    (fixture) => fixture.ruleCode === ruleCode && fixture.expectedStatus === "triggered",
  );
  if (triggered.length === 1) return triggered[0]!;
  const canonical = triggered.filter((fixture) => fixture.registryCanonical === true);
  if (canonical.length !== 1) {
    throw new Error(`${ruleCode} requires exactly one registry canonical trigger fixture`);
  }
  return canonical[0]!;
}

export async function loadFixtureRegistry(catalogPath: string, fixturesPath: string): Promise<Array<{
  query: DetectionQueryDefinition;
  adapter: DetectionSourceAdapter;
}>> {
  const catalog = JSON.parse(await readFile(catalogPath, "utf8")) as { rules: RuleContract[] };
  const fixtures = JSON.parse(await readFile(fixturesPath, "utf8")) as { cases: FixtureCase[] };
  return catalog.rules.map((rule) => {
    const triggeredFixture = canonicalTriggeredFixture(rule.code, fixtures.cases);
    const triggered = [triggeredFixture.input];
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
