import assert from "node:assert/strict";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  assertA02MovementOpen,
  assertA03MayStart,
  a02TerminalActionFor,
  loadSourceActionContracts,
  nextFirstConsumption,
  sourceActionIds,
  validateSourceActionContracts,
} from "./source-actions.js";

const root = resolve(import.meta.dirname, "../../..");

describe("Stage 5 source-action contracts", () => {
  it("loads the complete versioned A02/A03/A05 registry", async () => {
    const registry = await loadSourceActionContracts(root);
    assert.equal(registry.contractVersion, "1.1.0");
    assert.equal(registry.sourceDatabase, "test_database");
    assert.equal(registry.writerIdentity, "alertas_fake");
    assert.deepEqual(registry.actions.map((action) => action.id), [...sourceActionIds]);
    assert.ok(registry.actions.every((action) => action.invocation.operation === "sourceAction"));
    assert.deepEqual(new Set(registry.actions.map((action) => action.ruleCode)), new Set(["A02", "A03", "A05"]));
  });

  it("rejects duplicate, missing, and misrouted actions", async () => {
    const registry = await loadSourceActionContracts(root);
    assert.throws(() => validateSourceActionContracts({ ...registry, actions: registry.actions.slice(1) }), /contract_count/);
    assert.throws(() => validateSourceActionContracts({ ...registry, actions: [...registry.actions.slice(0, -1), registry.actions[0]] }), /contract_id/);
    assert.throws(() => validateSourceActionContracts({ ...registry, actions: registry.actions.map((action, index) => index === 0 ? { ...action, ruleCode: "A03" } : action) }), /contract_rule/);
    assert.throws(() => validateSourceActionContracts({ ...registry, actions: registry.actions.map((action, index) => index === 0 ? { ...action, invocation: { operation: "sourceAction", argument: "receive" } } : action) }), /contract_invocation/);
  });

  it("declares exact tables and unique fields for every action", async () => {
    const registry = await loadSourceActionContracts(root);
    for (const action of registry.actions) {
      assert.ok(action.naturalKey.length > 0);
      assert.ok(action.mutations.length > 0);
      for (const mutation of action.mutations) {
        assert.ok(mutation.table.length > 0);
        assert.equal(new Set(mutation.fields).size, mutation.fields.length);
      }
    }
  });
});

describe("source lifecycle guards", () => {
  it("permits only an open A02 movement", () => {
    assert.doesNotThrow(() => assertA02MovementOpen("TRANSITO"));
    for (const state of ["RECIBIDO", "ANULADO", "RECHAZADO", null]) assert.throws(() => assertA02MovementOpen(state), /movement_terminal/);
  });

  it("gives destination rejection precedence when both A02 authorities apply", () => {
    assert.equal(a02TerminalActionFor("origin"), "cancel");
    assert.equal(a02TerminalActionFor("destination"), "reject");
    assert.equal(a02TerminalActionFor("both"), "reject");
  });

  it("records positive A03 consumption without reducing existing evidence", () => {
    const open = { started: true, closed: false, cancelled: false };
    assert.equal(nextFirstConsumption(0, open), 1);
    assert.equal(nextFirstConsumption(4.5, open), 4.5);
    assert.throws(() => nextFirstConsumption(0, { ...open, closed: true }), /work_order_closed/);
    assert.throws(() => nextFirstConsumption(0, { ...open, cancelled: true }), /work_order_cancelled/);
  });

  it("rejects invalid A03 starts", () => {
    assert.doesNotThrow(() => assertA03MayStart({ started: false, closed: false, cancelled: false, otherActiveCount: 0 }));
    assert.throws(() => assertA03MayStart({ started: true, closed: false, cancelled: false, otherActiveCount: 0 }), /already_started/);
    assert.throws(() => assertA03MayStart({ started: false, closed: true, cancelled: false, otherActiveCount: 0 }), /work_order_closed/);
    assert.throws(() => assertA03MayStart({ started: false, closed: false, cancelled: true, otherActiveCount: 0 }), /work_order_cancelled/);
    assert.throws(() => assertA03MayStart({ started: false, closed: false, cancelled: false, otherActiveCount: 1 }), /machine_has_active/);
  });
});
