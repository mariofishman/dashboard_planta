import assert from "node:assert/strict";
import test from "node:test";
import { mergeRosterAssignments } from "./rosterPersistence.ts";

const person = (id, area) => ({
  id, person: id, position: "Líder técnico", area, coverage: "Operación",
  operations: ["Impresión"], group: null, validFrom: "2026-07-01", validTo: null,
  state: "active", setupComplete: true,
});

test("stale import preserves unrelated database changes", () => {
  const base = [person("a", "Impresión")];
  const desired = [...base, person("imported", "Extrusión")];
  const remote = [person("a", "Sellado"), person("remote", "Corte")];

  assert.deepEqual(mergeRosterAssignments(base, desired, remote), [
    person("a", "Sellado"), person("remote", "Corte"), person("imported", "Extrusión"),
  ]);
});

test("this tab wins when both versions changed the same person", () => {
  const base = [person("a", "Impresión")];
  const desired = [person("a", "Extrusión")];
  const remote = [person("a", "Sellado")];

  assert.deepEqual(mergeRosterAssignments(base, desired, remote), desired);
});

test("deletions do not remove unrelated remote people", () => {
  assert.deepEqual(
    mergeRosterAssignments([person("a", "Impresión")], [], [person("a", "Impresión"), person("b", "Corte")]),
    [person("b", "Corte")],
  );
});
