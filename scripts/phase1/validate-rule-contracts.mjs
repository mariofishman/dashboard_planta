#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const root = resolve(import.meta.dirname, "../..");
const catalogPath = resolve(root, "config/alerts/alert-rules.v1.json");
const fixturesPath = resolve(root, "tests/fixtures/alerts/rule-cases.v1.json");

const expectedCodes = [
  "A01", "A02", "A03", "A04", "A05", "A06", "A07",
  "B01", "B02", "B03", "C01", "C02", "C06",
  "D01", "D02", "D03", "D04", "E01", "E02", "E03", "E04",
];

const fail = (message) => {
  throw new Error(message);
};

const load = async (path) => JSON.parse(await readFile(path, "utf8"));

function evaluate(expression, input, parameters) {
  if (expression === null || typeof expression !== "object") return expression;
  const entries = Object.entries(expression);
  if (entries.length !== 1) fail(`expression must have one operator: ${JSON.stringify(expression)}`);
  const [operator, operand] = entries[0];

  if (operator === "var") return input[operand];
  if (operator === "param") {
    if (!Object.hasOwn(parameters, operand)) fail(`unknown parameter ${operand}`);
    return parameters[operand].value;
  }
  if (operator === "all") return operand.every((item) => Boolean(evaluate(item, input, parameters)));
  if (operator === "any") return operand.some((item) => Boolean(evaluate(item, input, parameters)));
  if (operator === "not") return !Boolean(evaluate(operand, input, parameters));
  if (operator === "abs") return Math.abs(Number(evaluate(operand, input, parameters)));

  const values = operand.map((item) => evaluate(item, input, parameters));
  switch (operator) {
    case "eq": return Object.is(values[0], values[1]);
    case "ne": return !Object.is(values[0], values[1]);
    case "gt": return values[0] > values[1];
    case "gte": return values[0] >= values[1];
    case "lt": return values[0] < values[1];
    case "lte": return values[0] <= values[1];
    case "add": return values.reduce((total, value) => total + Number(value), 0);
    case "sub": return Number(values[0]) - Number(values[1]);
    case "mul": return values.reduce((total, value) => total * Number(value), 1);
    case "div": {
      if (Number(values[1]) === 0) fail("division by zero");
      return Number(values[0]) / Number(values[1]);
    }
    default: fail(`unsupported operator ${operator}`);
  }
}

function referenced(expression, names = { variables: new Set(), parameters: new Set() }) {
  if (expression === null || typeof expression !== "object") return names;
  for (const [operator, operand] of Object.entries(expression)) {
    if (operator === "var") names.variables.add(operand);
    else if (operator === "param") names.parameters.add(operand);
    else if (Array.isArray(operand)) operand.forEach((item) => referenced(item, names));
    else referenced(operand, names);
  }
  return names;
}

function conditionKey(rule, input) {
  const values = rule.naturalKey.map((field) => {
    if (!Object.hasOwn(input, field)) fail(`${rule.code} natural key is missing ${field}`);
    return `${field}=${JSON.stringify(input[field])}`;
  });
  return `${rule.code}:${rule.queryId}:${rule.keySchemaVersion}:${values.join("|")}`;
}

function validateRule(rule) {
  const requiredStrings = ["code", "title", "ruleVersion", "queryId", "queryVersion", "resolution"];
  requiredStrings.forEach((field) => {
    if (typeof rule[field] !== "string" || rule[field].length === 0) fail(`${rule.code ?? "unknown"} invalid ${field}`);
  });
  if (!Array.isArray(rule.naturalKey) || rule.naturalKey.length === 0) fail(`${rule.code} has no natural key`);
  if (!Array.isArray(rule.requiredEvidence) || rule.requiredEvidence.length === 0) fail(`${rule.code} has no evidence contract`);
  if (!Array.isArray(rule.sourceMappings) || rule.sourceMappings.length === 0) fail(`${rule.code} has no source mapping`);
  rule.naturalKey.forEach((field) => {
    if (!rule.requiredEvidence.includes(field)) fail(`${rule.code} natural key ${field} is not required evidence`);
  });

  const expressions = [rule.predicate, ...rule.reasonRules.map((reason) => reason.when)];
  for (const expression of expressions) {
    const names = referenced(expression);
    names.variables.forEach((name) => {
      if (!rule.requiredEvidence.includes(name)) fail(`${rule.code} expression uses undeclared evidence ${name}`);
    });
    names.parameters.forEach((name) => {
      if (!Object.hasOwn(rule.parameters, name)) fail(`${rule.code} expression uses undeclared parameter ${name}`);
    });
  }
}

function evaluateCase(rule, fixture) {
  const missing = rule.requiredEvidence.filter((field) => !Object.hasOwn(fixture.input, field));
  if (missing.length > 0) return { status: "insufficient", reasons: [], missing };
  const triggered = Boolean(evaluate(rule.predicate, fixture.input, rule.parameters));
  const reasons = triggered
    ? rule.reasonRules.filter((reason) => Boolean(evaluate(reason.when, fixture.input, rule.parameters))).map((reason) => reason.code)
    : [];
  return { status: triggered ? "triggered" : "clear", reasons: reasons.sort(), missing: [] };
}

const catalog = await load(catalogPath);
const fixtureSet = await load(fixturesPath);

if (catalog.contractVersion !== "1.0.0") fail("unexpected rule contract version");
if (fixtureSet.fixtureVersion !== "1.0.0") fail("unexpected fixture version");

const codes = catalog.rules.map((rule) => rule.code).sort();
if (JSON.stringify(codes) !== JSON.stringify([...expectedCodes].sort())) {
  fail(`active rule set mismatch: ${codes.join(", ")}`);
}
if (new Set(catalog.rules.map((rule) => rule.queryId)).size !== catalog.rules.length) fail("query IDs must be unique");

const ruleByCode = new Map(catalog.rules.map((rule) => [rule.code, rule]));
catalog.rules.forEach(validateRule);

const fixtureIds = new Set();
let evaluated = 0;
for (const fixture of fixtureSet.cases) {
  if (fixtureIds.has(fixture.id)) fail(`duplicate fixture ${fixture.id}`);
  fixtureIds.add(fixture.id);
  const rule = ruleByCode.get(fixture.ruleCode);
  if (!rule) fail(`fixture ${fixture.id} references unknown rule ${fixture.ruleCode}`);
  const actual = evaluateCase(rule, fixture);
  const expectedReasons = [...fixture.expectedReasons].sort();
  if (actual.status !== fixture.expectedStatus) fail(`${fixture.id}: expected ${fixture.expectedStatus}, got ${actual.status}`);
  if (JSON.stringify(actual.reasons) !== JSON.stringify(expectedReasons)) {
    fail(`${fixture.id}: expected reasons ${expectedReasons}, got ${actual.reasons}`);
  }
  if (actual.status !== "insufficient") conditionKey(rule, fixture.input);
  evaluated += 1;
}

for (const rule of catalog.rules) {
  const cases = fixtureSet.cases.filter((fixture) => fixture.ruleCode === rule.code);
  for (const status of ["triggered", "clear", "insufficient"]) {
    if (!cases.some((fixture) => fixture.expectedStatus === status)) fail(`${rule.code} lacks a ${status} fixture`);
  }
  const completeKeys = cases.filter((fixture) => fixture.expectedStatus !== "insufficient").map((fixture) => conditionKey(rule, fixture.input));
  if (new Set(completeKeys).size !== 1) fail(`${rule.code} trigger and clear fixtures must represent one continuing condition`);
}

const localQueryProven = catalog.rules.filter((rule) => rule.productionReadiness === "local-query-proven").map((rule) => rule.code);
process.stdout.write(JSON.stringify({
  result: "pass",
  rules: catalog.rules.length,
  fixtures: evaluated,
  statusesPerRule: ["triggered", "clear", "insufficient"],
  localQueryProven,
  productionValidation: "deferred-to-phase-10"
}, null, 2) + "\n");
