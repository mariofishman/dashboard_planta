import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import Ajv2020Module from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";

const root = resolve(import.meta.dirname, "../../..");
const Ajv2020 = Ajv2020Module.default;
const addFormats = addFormatsModule.default;

async function json(relativePath: string) {
  return JSON.parse(await readFile(resolve(root, relativePath), "utf8"));
}

test("detection-query contracts validate and reference read-only SQL", async () => {
  const schema = await json("config/detection/contracts/detection-query.schema.json");
  const ajv = new Ajv2020({ allErrors: true });
  const validate = ajv.compile(schema);

  for (const filename of ["a02.query.json", "a05.query.json"]) {
    const contract = await json(`config/detection/contracts/${filename}`);
    assert.equal(validate(contract), true, JSON.stringify(validate.errors));

    const sql = await readFile(resolve(root, "config/detection/contracts", contract.sqlFile), "utf8");
    assert.match(sql.trimStart(), /^SELECT\b/i);
    assert.match(sql, /:cutoff/);
    assert.match(sql, /:after_id/);
    assert.match(sql, /:result_limit/);
    assert.doesNotMatch(sql, /\b(INSERT|UPDATE|DELETE|REPLACE|ALTER|DROP|CREATE|CALL|GRANT|REVOKE)\b/i);
  }
});

test("committed incident envelope validates", async () => {
  const schema = await json("config/detection/contracts/incident-change.schema.json");
  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const envelope = {
    schemaVersion: "1.0.0",
    eventId: "eb50f146-66ba-41e4-9828-a53946add0f0",
    cursor: 1,
    type: "incident.created",
    occurredAt: "2026-07-20T18:00:00.000Z",
    incidentId: "a5f92241-82ef-44fb-a663-7bd33ec7d953",
    plantId: 7,
    payload: {
      alertTypeCode: "A02",
      lifecycle: "OPEN",
      queryId: "a02-reserved-material-in-transit",
      queryVersion: "1.0.0-candidate",
      conditionKey: "A02:a02-reserved-material-in-transit:1:48192",
    },
  };
  assert.equal(validate(envelope), true, JSON.stringify(validate.errors));
});

test("discovered EmusaSoft routes stay disabled until Phase 10 validation", async () => {
  const contract = await json("config/detection/contracts/deep-links.json");
  assert.equal(contract.status, "discovered-pending-phase10-validation");
  assert.equal(contract.destinations.workOrder.activeTemplate, "/work-orders/:workOrderId");
  assert.equal(contract.destinations.workOrder.closedTemplate, "/work-orders/closed/:workOrderId");
  assert.equal(contract.destinations.workOrder.enabled, false);
  assert.match(contract.destinations.workOrder.fallback, /identifier/);
});

test("implemented alert contracts validate and reproduce all fixtures", async () => {
  const schema = await json("config/alerts/rule-contract.schema.json");
  const catalog = await json("config/alerts/alert-rules.v1.json");
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const validate = ajv.compile(schema);

  assert.equal(validate(catalog), true, JSON.stringify(validate.errors));
  assert.equal(catalog.rules.length, 21);

  const output = execFileSync(
    process.execPath,
    [resolve(root, "scripts/phase1/validate-rule-contracts.mjs")],
    { cwd: root, encoding: "utf8" },
  );
  const result = JSON.parse(output);
  assert.deepEqual(
    {
      result: result.result,
      rules: result.rules,
      fixtures: result.fixtures,
      statusesPerRule: result.statusesPerRule,
      localQueryProven: result.localQueryProven,
    },
    {
      result: "pass",
      rules: 21,
      fixtures: 63,
      statusesPerRule: ["triggered", "clear", "insufficient"],
      localQueryProven: ["A02", "A05"],
    },
  );
});

test("backup-confirmed fields match the protected local schema", () => {
  const output = execFileSync(
    "python3",
    [
      resolve(root, "scripts/phase1/validate-source-mappings.py"),
      "--dump", resolve(root, "local-data/database/prod_emusa_core-20260716-143040.sql"),
      "--contracts", resolve(root, "config/alerts/alert-rules.v1.json"),
    ],
    { cwd: root, encoding: "utf8" },
  );
  const result = JSON.parse(output);
  assert.deepEqual(
    { result: result.result, tables: result.tables, fields: result.fields, dataRowsPrinted: result.dataRowsPrinted },
    { result: "pass", tables: 17, fields: 76, dataRowsPrinted: 0 },
  );
});
