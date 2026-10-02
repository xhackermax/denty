import { TZDate } from "@date-fns/tz";
import {
  addDays as addDaysDateFns,
  addMinutes as addMinutesDateFns,
  format,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfYear,
} from "date-fns";

export const BUSINESS_TIME_ZONE = "Europe/Madrid" as const;

export type DateInput = Date | number | string;

export function epochMillis(value: DateInput): number {
  const timestamp =
    value instanceof Date
      ? value.getTime()
      : typeof value === "number"
        ? value
        : new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    throw new TypeError("Fecha no válida");
  }
  return timestamp;
}

function madridDate(value: DateInput = Date.now()): TZDate {
  return TZDate.tz(BUSINESS_TIME_ZONE, epochMillis(value));
}

export function todayMadrid(now: DateInput = Date.now()): string {
  return format(madridDate(now), "yyyy-MM-dd");
}

export function resolveMadridDateQuery(input: string, now: DateInput = Date.now()): string | null {
  const normalized = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  const today = todayMadrid(now);
  const relativeDays: Readonly<Record<string, number>> = {
    hoy: 0,
    manana: 1,
    "pasado manana": 2,
  };
  const relative = relativeDays[normalized];
  if (relative !== undefined) {
    return dateYMDMadrid(addDaysMadrid(madridLocalDateTime(today, "12:00"), relative));
  }

  const weekdays = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  const weekday = weekdays.indexOf(normalized);
  if (weekday >= 0) {
    const delta = (weekday - weekdayMadrid(today) + 7) % 7 || 7;
    return dateYMDMadrid(addDaysMadrid(madridLocalDateTime(today, "12:00"), delta));
  }

  const numericDateMatch = /^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/.exec(normalized);
  let year: number;
  let month: number;
  let day: number;
  if (numericDateMatch) {
    day = Number(numericDateMatch[1]);
    month = Number(numericDateMatch[2]);
    const currentYear = Number(today.slice(0, 4));
    const suppliedYear = numericDateMatch[3] ? Number(numericDateMatch[3]) : undefined;
    year =
      suppliedYear === undefined
        ? currentYear
        : suppliedYear < 100
          ? 2000 + suppliedYear
          : suppliedYear;
  } else {
    const isoDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
    if (!isoDateMatch) return null;
    year = Number(isoDateMatch[1]);
    month = Number(isoDateMatch[2]);
    day = Number(isoDateMatch[3]);
  }

  const isValidDate = (candidateYear: number) => {
    const parsed = new Date(Date.UTC(candidateYear, month - 1, day));
    return (
      parsed.getUTCFullYear() === candidateYear &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    );
  };
  if (!isValidDate(year)) return null;

  let result = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (numericDateMatch && !numericDateMatch[3] && result < today) {
    year += 1;
    if (!isValidDate(year)) return null;
    result = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return result;
}

export function dateYMDMadrid(value: DateInput): string {
  return format(madridDate(value), "yyyy-MM-dd");
}

/** Weekday (0 = Sunday … 6 = Saturday) of a Madrid calendar date "YYYY-MM-DD". */
export function weekdayMadrid(date: string): number {
  return madridLocalDateTime(date, "12:00").getDay();
}

export function dateDMY(value: DateInput): string {
  return format(madridDate(value), "dd/MM/yyyy");
}

export function madridLocalDateTime(date: string, time: string): TZDate {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) {
    throw new TypeError("Fecha u hora local de Madrid no válida");
  }

  const [, year, month, day] = dateMatch;
  const [, hour, minute] = timeMatch;
  return new TZDate(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    BUSINESS_TIME_ZONE,
  );
}

export function startOfDayMadrid(value: DateInput): TZDate {
  return startOfDay(madridDate(value));
}

export type ReportingPeriod = "month" | "quarter" | "year";

export function startOfReportingPeriodMadrid(
  period: ReportingPeriod,
  value: DateInput = Date.now(),
): TZDate {
  const date = madridDate(value);
  if (period === "year") return startOfYear(date);
  if (period === "quarter") return startOfQuarter(date);
  return startOfMonth(date);
}

export function toMadridISO(value: DateInput): string {
  return format(madridDate(value), "yyyy-MM-dd'T'HH:mm:ssXXX");
}

export function hhmm(value: DateInput): string {
  return format(madridDate(value), "HH:mm");
}

export function addMinutes(value: DateInput, minutes: number): TZDate {
  if (!Number.isFinite(minutes)) {
    throw new TypeError("Los minutos deben ser un número finito");
  }
  return addMinutesDateFns(madridDate(value), minutes);
}

export function addDaysMadrid(value: DateInput, days: number): TZDate {
  if (!Number.isFinite(days)) {
    throw new TypeError("Los días deben ser un número finito");
  }
  return addDaysDateFns(madridDate(value), days);
}

export interface TimeRange {
  startsAt: DateInput;
  endsAt: DateInput;
}

export function overlaps(a: TimeRange, b: TimeRange): boolean {
  const aStart = epochMillis(a.startsAt);
  const aEnd = epochMillis(a.endsAt);
  const bStart = epochMillis(b.startsAt);
  const bEnd = epochMillis(b.endsAt);
  return aStart < bEnd && bStart < aEnd;
}
