const defaultRotation = {
  effectiveFrom: "2026-07-25",
  schedules: ["Día", "Noche", "Descanso"],
  groups: [
    { id: "A", anchorScheduleIndex: 2, daysPerPhase: 2 },
    { id: "B", anchorScheduleIndex: 0, daysPerPhase: 2 },
    { id: "C", anchorScheduleIndex: 1, daysPerPhase: 2 },
  ],
};

const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T12:00:00Z`) / 86_400_000);
const modulo = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor;

export function workerGroupForIncident(incidentAt: string, shiftName: string): string {
  const incidentDate = incidentAt.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(incidentDate)) throw new Error(`Invalid incident timestamp: ${incidentAt}`);
  const elapsedDays = dayNumber(incidentDate) - dayNumber(defaultRotation.effectiveFrom);
  const normalizedShift = shiftName.trim().toLocaleLowerCase("es-PE");
  const matchingGroups = defaultRotation.groups.filter((group) => {
    const phase = Math.floor(elapsedDays / group.daysPerPhase);
    const scheduleIndex = modulo(group.anchorScheduleIndex + phase, defaultRotation.schedules.length);
    return defaultRotation.schedules[scheduleIndex]?.toLocaleLowerCase("es-PE") === normalizedShift;
  });
  if (matchingGroups.length !== 1) throw new Error(`Expected one worker group for ${incidentDate} ${shiftName}`);
  return matchingGroups[0]!.id;
}
