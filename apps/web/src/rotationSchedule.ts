export type RotationAdjustment = {
  id: string;
  operation: string;
  date: string;
  shiftDays: number;
  /** Positive shifts normally create an uncovered interval. Corrections do not. */
  createsGap?: boolean;
};

export type RotationGapCoverage = {
  id: string;
  operation: string;
  startDate: string;
  days: number;
  dayGroup: string;
  nightGroup: string;
};

const DAY_MS = 86_400_000;

export function dateFromKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00-05:00`);
}

export function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addDaysKey(dateKey: string, days: number) {
  const date = dateFromKey(dateKey);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

export function dayDifference(date: Date, anchor: string) {
  return Math.round((dateFromKey(localDateKey(date)).getTime() - dateFromKey(anchor).getTime()) / DAY_MS);
}

function isGapAdjustment(item: RotationAdjustment) {
  return item.shiftDays > 0 && item.createsGap !== false;
}

export function rotationGapForDate(operation: string, dateKey: string, adjustments: RotationAdjustment[]) {
  return adjustments.find((item) => (
    item.operation === operation
    && isGapAdjustment(item)
    && item.date <= dateKey
    && dateKey < addDaysKey(item.date, item.shiftDays)
  )) ?? null;
}

export function cumulativeRotationShift(operation: string, dateKey: string, adjustments: RotationAdjustment[]) {
  return adjustments
    .filter((item) => item.operation === operation)
    .filter((item) => (
      isGapAdjustment(item)
        ? addDaysKey(item.date, item.shiftDays) <= dateKey
        : item.date <= dateKey
    ))
    .reduce((total, item) => total + item.shiftDays, 0);
}

function adjustmentId(operation: string, date: string, kind: "gap" | "correction") {
  return `${operation}-${date}-${kind}`;
}

/**
 * Moves the configured operation-group cycle from sourceDate to targetDate.
 * Moving later creates an uncovered interval. Moving earlier overwrites the
 * schedule from the target onward while preserving any earlier history.
 */
export function moveRotationPattern(
  adjustments: RotationAdjustment[],
  operation: string,
  sourceDate: string,
  targetDate: string,
) {
  const delta = dayDifference(dateFromKey(targetDate), sourceDate);
  if (delta === 0) return adjustments;

  const sourceShift = cumulativeRotationShift(operation, sourceDate, adjustments);
  const otherOperations = adjustments.filter((item) => item.operation !== operation);
  const scoped = adjustments.filter((item) => item.operation === operation);

  if (delta > 0) {
    const targetEnd = targetDate;
    const preserved = scoped.filter((item) => {
      if (isGapAdjustment(item)) return addDaysKey(item.date, item.shiftDays) <= sourceDate;
      return item.date <= sourceDate;
    });
    const priorShift = cumulativeRotationShift(operation, sourceDate, preserved);
    const correction = sourceShift - priorShift;
    return [
      ...otherOperations,
      ...preserved,
      ...(correction === 0 ? [] : [{
        id: adjustmentId(operation, sourceDate, "correction"),
        operation,
        date: sourceDate,
        shiftDays: correction,
        createsGap: false,
      }]),
      {
        id: adjustmentId(operation, sourceDate, "gap"),
        operation,
        date: sourceDate,
        shiftDays: dayDifference(dateFromKey(targetEnd), sourceDate),
        createsGap: true,
      },
    ];
  }

  const desiredShift = sourceShift + delta;
  const preserved = scoped.flatMap((item) => {
    if (!isGapAdjustment(item)) return item.date < targetDate ? [item] : [];
    const endDate = addDaysKey(item.date, item.shiftDays);
    if (endDate <= targetDate) return [item];
    if (item.date >= targetDate) return [];
    const truncatedDays = dayDifference(dateFromKey(targetDate), item.date);
    return truncatedDays > 0 ? [{ ...item, shiftDays: truncatedDays }] : [];
  });
  const priorShift = cumulativeRotationShift(operation, targetDate, preserved);
  const correction = desiredShift - priorShift;

  return [
    ...otherOperations,
    ...preserved,
    ...(correction === 0 ? [] : [{
      id: adjustmentId(operation, targetDate, "correction"),
      operation,
      date: targetDate,
      shiftDays: correction,
      createsGap: false,
    }]),
  ];
}

export function moveRotationCoverages(
  coverages: RotationGapCoverage[],
  operation: string,
  sourceDate: string,
  targetDate: string,
) {
  if (sourceDate === targetDate) return coverages;
  const boundary = targetDate < sourceDate ? targetDate : sourceDate;
  return coverages.flatMap((item) => {
    if (item.operation !== operation) return [item];
    const endDate = addDaysKey(item.startDate, item.days);
    if (endDate <= boundary) return [item];
    if (item.startDate >= boundary) return [];
    const retainedDays = dayDifference(dateFromKey(boundary), item.startDate);
    return retainedDays > 0 ? [{ ...item, days: retainedDays }] : [];
  });
}
