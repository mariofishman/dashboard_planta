import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");

async function json(relativePath: string) {
  return JSON.parse(await readFile(resolve(root, relativePath), "utf8"));
}

describe("Phase 1 rule contracts", () => {
  it("validates all active rules against the versioned JSON Schema", async () => {
    const schema = await json("docs/phase1/contracts/rule-contract.schema.json");
    const catalog = await json("docs/phase1/contracts/alert-rules.v1.json");
    const ajv = new Ajv2020.default({ allErrors: true, strict: true });
    const validate = ajv.compile(schema);

    expect(validate(catalog), JSON.stringify(validate.errors)).toBe(true);
    expect(catalog.rules).toHaveLength(21);
  });

  it("reproduces triggered, clear, and insufficient fixture results for every rule", () => {
    const output = execFileSync(
      process.execPath,
      [resolve(root, "scripts/phase1/validate-rule-contracts.mjs")],
      { cwd: root, encoding: "utf8" },
    );
    const result = JSON.parse(output);

    expect(result).toMatchObject({ result: "pass", rules: 21, fixtures: 63 });
    expect(result.statusesPerRule).toEqual(["triggered", "clear", "insufficient"]);
    expect(result.localQueryProven).toEqual(["A02", "A05"]);
  });

  it("matches every backup-confirmed field to the protected local schema", () => {
    const output = execFileSync(
      "python3",
      [
        resolve(root, "scripts/phase1/validate-source-mappings.py"),
        "--dump", resolve(root, "local-data/database/prod_emusa_core-20260716-143040.sql"),
        "--contracts", resolve(root, "docs/phase1/contracts/alert-rules.v1.json"),
      ],
      { cwd: root, encoding: "utf8" },
    );
    const result = JSON.parse(output);

    expect(result).toMatchObject({ result: "pass", tables: 17, fields: 76, dataRowsPrinted: 0 });
  });
});
