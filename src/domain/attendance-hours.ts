/** Paired attendance punches only. Never infer hours from raw event counts. */
export interface AttendancePunch {
  id: string;
  punchType: "IN" | "OUT";
  occurredAt: string;
  correctsPunchId: string | null;
}

export interface AttendanceSummary {
  hours: number | null;
  status: "NO_RECORDS" | "COMPLETE" | "INCOMPLETE";
  pairs: number;
}

export function summarizeAttendance(
  punches: readonly AttendancePunch[],
  fromISO: string,
  toISO: string,
): AttendanceSummary {
  const start = Date.parse(fromISO);
  const end = Date.parse(toISO);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    throw new Error("Rango de asistencia no válido.");
  }
  const corrected = new Set(
    punches.map(p => p.correctsPunchId).filter((id): id is string => Boolean(id)),
  );
  const effective = punches.filter(p => !corrected.has(p.id))
    .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
  let open: number | null = null;
  let elapsedMs = 0;
  let pairs = 0;
  let relevant = false;
  let invalid = false;
  const within = (time: number) => time >= start && time < end;
  for (const punch of effective) {
    const at = Date.parse(punch.occurredAt);
    if (!Number.isFinite(at)) {
      invalid = true;
      continue;
    }
    if (punch.punchType === "IN") {
      if (open !== null && (open < end && at > start)) invalid = true;
      open = at;
      if (within(at)) relevant = true;
      continue;
    }
    if (open === null || at <= open) {
      if (within(at)) {
        invalid = true;
        relevant = true;
      }
      continue;
    }
    if (open < end && at > start) {
      relevant = true;
      elapsedMs += Math.max(0, Math.min(at, end) - Math.max(open, start));
      pairs += 1;
    }
    open = null;
  }
  if (open !== null && open < end) {
    // An unmatched IN may span the requested range. Never add assumed hours.
    invalid = true;
    relevant = true;
  }
  if (invalid) return { hours: null, status: "INCOMPLETE", pairs };
  if (!relevant) return { hours: null, status: "NO_RECORDS", pairs: 0 };
  return {
    hours: Math.round(elapsedMs / 36_000) / 100,
    status: "COMPLETE",
    pairs,
  };
}
