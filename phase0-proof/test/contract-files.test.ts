import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

const phase0 = resolve(import.meta.dirname, "../../docs/phase0");

async function json(relativePath: string) {
  return JSON.parse(await readFile(resolve(phase0, relativePath), "utf8"));
}

describe("versioned Phase 0 contracts", () => {
  it.each(["a02.query.json", "a05.query.json"])("validates %s and its read-only SQL", async (filename) => {
    const schema = await json("contracts/detection-query.schema.json");
    const contract = await json(`contracts/${filename}`);
    const ajv = new Ajv2020.default({ allErrors: true });
    const validate = ajv.compile(schema);
    expect(validate(contract), JSON.stringify(validate.errors)).toBe(true);

    const sqlPath = resolve(phase0, "contracts", contract.sqlFile);
    const sql = await readFile(sqlPath, "utf8");
    expect(sql.trimStart()).toMatch(/^SELECT\b/i);
    expect(sql).toContain(":cutoff");
    expect(sql).toContain(":after_id");
    expect(sql).toContain(":result_limit");
    expect(sql).not.toMatch(/\b(INSERT|UPDATE|DELETE|REPLACE|ALTER|DROP|CREATE|CALL|GRANT|REVOKE)\b/i);
  });

  it("validates the canonical committed incident envelope", async () => {
    const schema = await json("contracts/incident-change.schema.json");
    const ajv = new Ajv2020.default({ allErrors: true });
    addFormats.default(ajv);
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
    expect(validate(envelope), JSON.stringify(validate.errors)).toBe(true);
  });

  it("keeps unsupported EmusaSoft navigation absent instead of inventing paths", async () => {
    const contract = await json("contracts/deep-links.json");
    expect(contract.status).toBe("unsupported-by-current-emusasoft-contract");
    expect(contract.destinations.workOrder.template).toBeNull();
    expect(contract.destinations.materialReservation.template).toBeNull();
    expect(contract.destinations.workOrder.fallback).toContain("identifier");
    expect(contract.destinations.materialReservation.fallback).toContain("identifiers");
  });
});
