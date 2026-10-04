import { addDaysMadrid, dateYMDMadrid, hhmm, madridLocalDateTime, type DateInput } from "../dates";
import type { AppointmentStatus } from "./index";

export const AGENDA_DAY_COUNTS = [1, 2, 3, 5, 7] as const;
export type AgendaDayCount = (typeof AGENDA_DAY_COUNTS)[number];

export const AGENDA_ZOOM = { compacto: 1, normal: 1.55, amplio: 2.3 } as const;
export type AgendaZoom = keyof typeof AGENDA_ZOOM;

/** Statuses that occupy a professional or a cabinet (mirrors the DB exclusion constraints). */
export const OCCUPYING_STATUSES: ReadonlySet<AppointmentStatus> = new Set([
  "PLANNED",
  "CONFIRMED",
  "ARRIVED",
  "WAITING",
  "IN_CHAIR",
  "RUNNING_LATE",
]);

function weekdayMondayFirst(date: string): number {
  // 0 = Monday … 6 = Sunday, evaluated at Madrid noon to stay clear of DST edges.
  return (madridLocalDateTime(date, "12:00").getDay() + 6) % 7;
}

export function addDaysYMD(date: string, days: number): string {
  return dateYMDMadrid(addDaysMadrid(madridLocalDateTime(date, "12:00"), days));
}

/** First visible day: the week view always starts on Monday. */
export function rangeStartFor(date: string, dayCount: AgendaDayCount): string {
  return dayCount === 7 ? addDaysYMD(date, -weekdayMondayFirst(date)) : date;
}

export function visibleDates(start: string, dayCount: AgendaDayCount): string[] {
  return Array.from({ length: dayCount }, (_, index) => addDaysYMD(start, index));
}

/** Previous/next navigation moves by a whole visible range. */
export function shiftRange(start: string, dayCount: AgendaDayCount, direction: -1 | 1): string {
  return addDaysYMD(start, direction * dayCount);
}

/** Minutes since the agenda's first hour, or null when outside the visible window. */
export function currentTimeOffset(
  now: DateInput,
  startHour: number,
  endHour: number,
): number | null {
  const [hour = 0, minute = 0] = hhmm(now).split(":").map(Number);
  const offset = (hour - startHour) * 60 + minute;
  return offset < 0 || offset > (endHour - startHour) * 60 ? null : offset;
}

export type AppointmentCardSize = "small" | "medium" | "large";

/** Progressive disclosure: the rendered height decides how much the card shows. */
export function appointmentCardSize(heightPx: number): AppointmentCardSize {
  if (heightPx < 46) return "small";
  if (heightPx < 92) return "medium";
  return "large";
}

// Spanish surnames often start with a particle ("de la Fuente"); its letter identifies nobody.
const NAME_PARTICLES = new Set(["de", "del", "la", "las", "los", "y", "e", "da", "van", "von"]);

export function shortPatientName(fullName: string): string {
  const [first = "", ...rest] = fullName.trim().split(/\s+/);
  const initial = rest.find((word) => !NAME_PARTICLES.has(word.toLocaleLowerCase("es")))?.[0];
  return initial ? `${first} ${initial.toLocaleUpperCase("es")}.` : first;
}
