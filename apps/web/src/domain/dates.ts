import { TZDate } from "@date-fns/tz";
import { addMinutes as addMinutesDateFns, format, startOfDay } from "date-fns";

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
