export type DentyAppearancePreference = "time" | "light" | "dark";
export type DentyColorScheme = "light" | "dark";

export const DENTY_TIME_ZONE = "Europe/Madrid";
export const DENTY_APPEARANCE_STORAGE_KEY = "denty-appearance";

type DateInput = Date | string | number;

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function asDate(input: DateInput): Date {
  const date = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  if (Number.isNaN(date.getTime())) throw new RangeError("Invalid appearance schedule date");
  return date;
}

function zonedParts(input: DateInput, timeZone: string): ZonedParts {
  const values = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(asDate(input));
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(values.find((item) => item.type === type)?.value);
  return {
    year: part("year"),
    month: part("month"),
    day: part("day"),
    hour: part("hour"),
    minute: part("minute"),
    second: part("second"),
  };
}

function zonedDateTimeToUtc(parts: ZonedParts, timeZone: string): Date {
  const desired = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  let timestamp = desired;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = zonedParts(timestamp, timeZone);
    const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    const correction = desired - actualAsUtc;
    if (correction === 0) break;
    timestamp += correction;
  }

  return new Date(timestamp);
}

export function scheduledSchemeAt(input: DateInput, timeZone = DENTY_TIME_ZONE): DentyColorScheme {
  const { hour } = zonedParts(input, timeZone);
  return hour >= 7 && hour < 21 ? "light" : "dark";
}

export function resolveAppearanceScheme(
  preference: DentyAppearancePreference,
  input: DateInput = new Date(),
  timeZone = DENTY_TIME_ZONE,
): DentyColorScheme {
  return preference === "time" ? scheduledSchemeAt(input, timeZone) : preference;
}

export function nextSchemeBoundary(input: DateInput, timeZone = DENTY_TIME_ZONE): Date {
  const current = zonedParts(input, timeZone);
  if (current.hour < 7) return zonedDateTimeToUtc({ ...current, hour: 7, minute: 0, second: 0 }, timeZone);
  if (current.hour < 21) return zonedDateTimeToUtc({ ...current, hour: 21, minute: 0, second: 0 }, timeZone);

  const tomorrow = new Date(Date.UTC(current.year, current.month - 1, current.day + 1));
  return zonedDateTimeToUtc({
    year: tomorrow.getUTCFullYear(),
    month: tomorrow.getUTCMonth() + 1,
    day: tomorrow.getUTCDate(),
    hour: 7,
    minute: 0,
    second: 0,
  }, timeZone);
}

export function isDentyAppearancePreference(value: string | null): value is DentyAppearancePreference {
  return value === "time" || value === "light" || value === "dark";
}
