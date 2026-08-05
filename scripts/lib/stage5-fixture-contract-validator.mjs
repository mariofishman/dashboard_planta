import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export function compileStage5FixtureRegistrySchema(schema) {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  return ajv.compile(schema);
}

export function fixtureRegistrySemanticErrors(registry, manifest, sourceActionContract) {
  const errors = [];
  if (!isRecord(registry) || !Array.isArray(registry.contracts)) return ["fixture registry must contain a contracts array"];
  if (registry.manifestVersion !== manifest?.manifestVersion) errors.push("fixture registry manifest version mismatch");
  if (registry.sourceActionContractVersion !== sourceActionContract?.contractVersion) errors.push("fixture registry source-action contract version mismatch");
  if (registry.fixtureVersion !== "1.0.0") errors.push("fixture registry version mismatch");
  if (registry.writerIdentity !== sourceActionContract?.writerIdentity) errors.push("fixture registry writer identity mismatch");

  const manifestTests = new Map((manifest?.tests ?? []).map((test) => [test.id, test]));
  const sourceActions = new Set((sourceActionContract?.actions ?? []).map((action) => action.id));
  const seen = new Set();
  for (const contract of registry.contracts) {
    const id = contract?.testId;
    if (seen.has(id)) errors.push(`duplicate fixture contract: ${id}`);
    seen.add(id);
    const declaration = manifestTests.get(id);
    if (!declaration) { errors.push(`fixture contract is not approved: ${id}`); continue; }
    if (contract.group !== declaration.group) errors.push(`fixture contract group mismatch: ${id}`);
    if (contract.fixtureIdentity?.contractId !== `stage5:${id}`) errors.push(`fixture contract identity mismatch: ${id}`);
    if (contract.fixtureIdentity?.fixtureVersion !== registry.fixtureVersion) errors.push(`fixture version mismatch: ${id}`);
    if (contract.fixtureIdentity?.sourceRevision !== registry.sourceRevision) errors.push(`source revision mismatch: ${id}`);
    if (!registry.profiles?.[contract.experimentProfile]) errors.push(`experiment profile is undefined: ${id}`);
    if (!registry.profiles?.[contract.cleanupProfile]) errors.push(`cleanup profile is undefined: ${id}`);
    if (Array.isArray(contract.dependencyTestIds) && contract.dependencyTestIds.length > 0) errors.push(`fixture depends on another test: ${id}`);
    const lanes = new Set((contract.executionLanes ?? []).map((lane) => lane.id));
    if (lanes.size !== (contract.executionLanes?.length ?? 0)) errors.push(`fixture isolation lanes must be unique: ${id}`);

    const declaredActions = declaration.requiredActionIds ?? [];
    const contractActions = (contract.actions ?? []).map((action) => action.actionId);
    if (JSON.stringify(contractActions) !== JSON.stringify(declaredActions)) errors.push(`fixture action order mismatch: ${id}`);
    for (let index = 0; index < (contract.actions ?? []).length; index += 1) {
      const action = contract.actions[index];
      if (action.sequence !== index + 1) errors.push(`fixture action sequence is not contiguous: ${id}`);
      if (lanes.size > 0 && !lanes.has(action.isolationLane)) errors.push(`fixture action isolation lane is undefined: ${id}:${action.sequence}`);
      if (lanes.size === 0 && action.isolationLane !== undefined) errors.push(`fixture action declares an unnecessary isolation lane: ${id}:${action.sequence}`);
    }

    const source = contract.source;
    const keyRefs = new Set(source?.applicability === "required" ? source.naturalKeys.map((key) => key.ref) : []);
    if (keyRefs.size !== (source?.naturalKeys?.length ?? 0)) errors.push(`fixture natural-key refs must be unique: ${id}`);
    for (const assertion of source?.startingState ?? []) if (!keyRefs.has(assertion.keyRef)) errors.push(`starting-state key ref is undefined: ${id}:${assertion.keyRef}`);
    for (const relationship of source?.relationships ?? []) {
      if (!keyRefs.has(relationship.leftKeyRef)) errors.push(`relationship left key ref is undefined: ${id}:${relationship.leftKeyRef}`);
      if (!keyRefs.has(relationship.rightKeyRef)) errors.push(`relationship right key ref is undefined: ${id}:${relationship.rightKeyRef}`);
    }
    for (const action of contract.actions ?? []) for (const keyRef of action.keyRefs ?? []) if (!keyRefs.has(keyRef)) errors.push(`action key ref is undefined: ${id}:${keyRef}`);
    const naturalKeys = new Map((source?.naturalKeys ?? []).map((key) => [key.ref, key]));
    for (const assertion of source?.startingState ?? []) {
      const key = naturalKeys.get(assertion.keyRef);
      if (key?.producedByActionSequence !== undefined && assertion.operator !== "not_exists") errors.push(`produced natural key may only be absent at starting state: ${id}:${key.ref}`);
    }
    for (const key of naturalKeys.values()) if (lanes.size > 0 && !lanes.has(key.isolationLane)) errors.push(`natural-key isolation lane is undefined: ${id}:${key.ref}`);
    for (const action of contract.actions ?? []) for (const keyRef of action.keyRefs ?? []) {
      const key = naturalKeys.get(keyRef);
      if (lanes.size > 0 && key?.isolationLane !== action.isolationLane) errors.push(`action and natural key cross isolation lanes: ${id}:${action.sequence}:${keyRef}`);
    }
    for (const key of source?.naturalKeys ?? []) if (key.producedByActionSequence !== undefined && !contract.actions?.some((action) => action.sequence === key.producedByActionSequence)) errors.push(`produced natural key references an undefined action sequence: ${id}:${key.ref}`);
    for (const mutation of source?.allowedMutations ?? []) {
      for (const keyRef of mutation.keyRefs ?? []) if (!keyRefs.has(keyRef)) errors.push(`mutation key ref is undefined: ${id}:${keyRef}`);
      if (mutation.type === "source_action_contract" && !sourceActions.has(mutation.contractId)) errors.push(`unknown source-action mutation contract: ${id}:${mutation.contractId}`);
    }
    const referencedSourceActions = new Set(contractActions.filter((actionId) => sourceActions.has(actionId)));
    const allowedSourceActions = new Set((source?.allowedMutations ?? []).filter((mutation) => mutation.type === "source_action_contract").map((mutation) => mutation.contractId));
    for (const actionId of referencedSourceActions) if (!allowedSourceActions.has(actionId)) errors.push(`source action lacks an allowed-mutation contract: ${id}:${actionId}`);
    for (const actionId of allowedSourceActions) if (!referencedSourceActions.has(actionId)) errors.push(`unused allowed-mutation contract: ${id}:${actionId}`);
    if (referencedSourceActions.size > 0 && source?.applicability !== "required") errors.push(`source action requires source fixture data: ${id}`);
  }
  return [...new Set(errors)];
}

export function assertValidStage5FixtureRegistry(registry, schema, manifest, sourceActionContract) {
  const validate = compileStage5FixtureRegistrySchema(schema);
  if (!validate(registry)) throw new Error(`Invalid Stage 5 fixture registry schema:\n${JSON.stringify(validate.errors, null, 2)}`);
  const errors = fixtureRegistrySemanticErrors(registry, manifest, sourceActionContract);
  if (errors.length > 0) throw new Error(`Invalid Stage 5 fixture registry:\n- ${errors.join("\n- ")}`);
}
