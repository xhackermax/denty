import { weekdayMadrid } from "../dates";

/**
 * Weekly rota: which site each professional works at on each weekday. The same
 * doctor can work at several sites on different days (or morning/afternoon).
 * Weekdays follow JavaScript/Postgres: 0 = Sunday … 6 = Saturday.
 */

export interface RotaShift {
  siteId: string;
  weekday: number;
  startsAt: string;
  endsAt: string;
}

export interface RotaStaff {
  id: string;
  schedules?: readonly RotaShift[] | undefined;
}

/** Monday first, as the clinic reads the week. */
export const ROTA_WEEKDAYS: readonly { weekday: number; label: string; short: string }[] = [
  { weekday: 1, label: "Lunes", short: "L" },
  { weekday: 2, label: "Martes", short: "M" },
  { weekday: 3, label: "Miércoles", short: "X" },
  { weekday: 4, label: "Jueves", short: "J" },
  { weekday: 5, label: "Viernes", short: "V" },
  { weekday: 6, label: "Sábado", short: "S" },
  { weekday: 0, label: "Domingo", short: "D" },
];

/** Weekday of a calendar date "YYYY-MM-DD" in the clinic's time zone. */
export function weekdayOfDate(date: string): number {
  return weekdayMadrid(date);
}

export function shiftsOn(staff: RotaStaff, date: string, siteId?: string | null): RotaShift[] {
  const weekday = weekdayOfDate(date);
  return (staff.schedules ?? []).filter(
    (shift) => shift.weekday === weekday && (!siteId || shift.siteId === siteId),
  );
}

/**
 * Professionals shown in a site's agenda on a date: those whose rota puts them at
 * that site that day, plus anyone who already has appointments there (so nothing
 * booked is ever hidden). Staff without any rota keep appearing everywhere until
 * the clinic sets one up.
 */
export function staffForSiteDay<T extends RotaStaff>(
  staff: readonly T[],
  siteId: string | null | undefined,
  date: string,
  bookedStaffIds: ReadonlySet<string> = new Set(),
): T[] {
  if (!siteId) return [...staff];
  return staff.filter(
    (member) =>
      bookedStaffIds.has(member.id) ||
      !(member.schedules ?? []).length ||
      shiftsOn(member, date, siteId).length > 0,
  );
}

/** First overlap between two shifts of the same weekday, if any (sites do not matter). */
export function findRotaOverlap(shifts: readonly RotaShift[]): [RotaShift, RotaShift] | null {
  for (let i = 0; i < shifts.length; i += 1) {
    for (let j = i + 1; j < shifts.length; j += 1) {
      const a = shifts[i]!;
      const b = shifts[j]!;
      if (a.weekday === b.weekday && a.startsAt < b.endsAt && b.startsAt < a.endsAt) return [a, b];
    }
  }
  return null;
}

/** "L, X · Av. Navarra — J · Cariñena" style summary for lists. */
export function describeRota(
  shifts: readonly RotaShift[],
  siteNames: ReadonlyMap<string, string>,
): string {
  if (!shifts.length) return "Sin horario: aparece en todas las sedes";
  const bySite = new Map<string, Set<number>>();
  for (const shift of shifts) {
    bySite.set(shift.siteId, (bySite.get(shift.siteId) ?? new Set()).add(shift.weekday));
  }
  return [...bySite.entries()]
    .map(([siteId, weekdays]) => {
      const days = ROTA_WEEKDAYS.filter((day) => weekdays.has(day.weekday))
        .map((day) => day.short)
        .join(", ");
      return `${days} · ${siteNames.get(siteId) ?? "Sede"}`;
    })
    .join(" — ");
}
