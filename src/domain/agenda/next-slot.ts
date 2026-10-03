import { epochMillis, hhmm, madridLocalDateTime, toMadridISO, type DateInput } from "../dates";

export type DayPart = "AM" | "PM";

/** Spanish clinics split the day at lunch: a 14:00 appointment is already "por la tarde". */
export const AFTERNOON_STARTS_AT_MINUTE = 14 * 60;
const DAY_MINUTES = 24 * 60;

export const DAY_PART_LABELS: Readonly<Record<DayPart, string>> = {
  AM: "Mañana",
  PM: "Tarde",
};

/** Minutes after Madrid midnight a slot may start in, as a half-open range. */
export function dayPartWindow(part: DayPart | null): { fromMinute: number; toMinute: number } {
  if (part === "AM") return { fromMinute: 0, toMinute: AFTERNOON_STARTS_AT_MINUTE };
  if (part === "PM") return { fromMinute: AFTERNOON_STARTS_AT_MINUTE, toMinute: DAY_MINUTES };
  return { fromMinute: 0, toMinute: DAY_MINUTES };
}

export function dayPartOf(startsAt: DateInput): DayPart {
  const [hours = "0", minutes = "0"] = hhmm(startsAt).split(":");
  return Number(hours) * 60 + Number(minutes) < AFTERNOON_STARTS_AT_MINUTE ? "AM" : "PM";
}

/** `null` = no preference; `undefined` = a value that is neither AM nor PM. */
export function parseDayPart(value: string | null | undefined): DayPart | null | undefined {
  if (!value) return null;
  const upper = value.toUpperCase();
  return upper === "AM" || upper === "PM" ? upper : undefined;
}

/** Search from the chosen day's Madrid midnight, but never offer a slot that has already begun. */
export function nextSlotsNotBefore(now: DateInput, fromDate?: string): string {
  if (fromDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(fromDate))
    throw new RangeError("La fecha debe tener el formato AAAA-MM-DD.");
  const nowMs = epochMillis(now);
  const fromMs = fromDate ? madridLocalDateTime(fromDate, "00:00").getTime() : nowMs;
  return toMadridISO(Math.max(nowMs, fromMs));
}
