export interface AttendancePunch {
  id: string;
  staff_member_id: string;
  punch_type: string;
  occurred_at: string;
  corrects_punch_id: string | null;
}

export interface AttendanceHours {
  hours: number | null;
  note: string | null;
}

/**
 * Count only closed, non-overlapping clock-in/out pairs.
 * Admin corrections replace original punches. Unpaired or implausibly long
 * intervals yield "not available" rather than fictitious worked hours.
 */
export function verifiedAttendanceHours(
  punches: readonly AttendancePunch[],
  rangeEnd: string,
  rangeStart?: string,
): AttendanceHours {
  const endMs = Date.parse(rangeEnd);
  const startMs = rangeStart === undefined ? -Infinity : Date.parse(rangeStart);
  if (!Number.isFinite(endMs) ||
      (rangeStart !== undefined && (!Number.isFinite(startMs) || startMs >= endMs))) {
    return { hours: null, note: "Periodo de fichaje no válido" };
  }
  const overwritten = new Set(punches.map(p => p.corrects_punch_id).filter(Boolean));
  const effective = punches.filter(p => !overwritten.has(p.id))
    .filter(p => Date.parse(p.occurred_at) < endMs)
    .sort((a,b) => Date.parse(a.occurred_at) - Date.parse(b.occurred_at));
  if (!effective.length) return { hours:null, note:"Sin fichajes" };

  let started: number | null = null;
  let accumulatedMs = 0;
  let matchedPairs = 0;
  for (const punch of effective) {
    const timestamp = Date.parse(punch.occurred_at);
    if (!Number.isFinite(timestamp)) {
      return { hours:null, note:"Fecha de fichaje inválida" };
    }
    if (punch.punch_type === "IN" && started === null) {
      started = timestamp;
    } else if (punch.punch_type === "OUT" && started !== null) {
      const shiftMs = timestamp - started;
      if (shiftMs <= 0 || shiftMs > 16 * 60 * 60 * 1000)
        return { hours:null, note:"Fichaje anómalo: revisar horas" };
      const overlapMs = Math.max(0, Math.min(timestamp, endMs) - Math.max(started, startMs));
      if (overlapMs > 0) {
        accumulatedMs += overlapMs;
        matchedPairs += 1;
      }
      started = null;
    } else {
      return { hours:null, note:"Fichajes incompletos o superpuestos" };
    }
  }
  if (started !== null) return { hours:null, note:"Falta el fichaje de salida" };
  if (matchedPairs === 0) return { hours:null, note:"Sin fichajes en este periodo" };
  return { hours:Math.round(accumulatedMs / 36_000) / 100, note:null };
}
