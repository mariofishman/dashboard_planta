import type { RosterAssignment } from "@monitor/contracts";

function fingerprint(assignment: RosterAssignment | undefined) {
  if (!assignment) return null;
  return JSON.stringify({
    ...assignment,
    operations: [...assignment.operations].sort(),
  });
}

/** Applies only this tab's changes while preserving unrelated changes from another tab. */
export function mergeRosterAssignments(
  base: RosterAssignment[],
  desired: RosterAssignment[],
  remote: RosterAssignment[],
) {
  const baseById = new Map(base.map((item) => [item.id, item]));
  const desiredById = new Map(desired.map((item) => [item.id, item]));
  const changedIds = new Set(
    [...new Set([...baseById.keys(), ...desiredById.keys()])]
      .filter((id) => fingerprint(baseById.get(id)) !== fingerprint(desiredById.get(id))),
  );
  const remoteIds = new Set(remote.map((item) => item.id));
  const merged = remote
    .filter((item) => !(changedIds.has(item.id) && !desiredById.has(item.id)))
    .map((item) => changedIds.has(item.id) ? desiredById.get(item.id)! : item);

  for (const item of desired) {
    if (changedIds.has(item.id) && !remoteIds.has(item.id)) merged.push(item);
  }
  return merged;
}
