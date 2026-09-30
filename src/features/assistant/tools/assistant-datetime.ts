export interface SpokenDateTime {
  dateText: string;
  timeText?: string;
}

const WEEKDAYS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
}

function numericDate(text: string, now: Date): Date | undefined {
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (!match) return undefined;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const explicitYear = match[3] ? Number(match[3]) : undefined;
  const year =
    explicitYear === undefined
      ? now.getFullYear()
      : explicitYear < 100
        ? 2000 + explicitYear
        : explicitYear;
  const date = new Date(year, month - 1, day);
  if (date.getMonth() !== month - 1 || date.getDate() !== day) return undefined;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (explicitYear === undefined && date < today) {
    return new Date(year + 1, month - 1, day);
  }
  return date;
}

function dayFor(dateText: string, now: Date): Date | undefined {
  const text = normalize(dateText);
  if (text === "hoy") return addDays(now, 0);
  if (text === "manana") return addDays(now, 1);
  if (text === "pasado manana") return addDays(now, 2);
  const weekday = WEEKDAYS.indexOf(text);
  if (weekday >= 0) {
    const delta = (weekday - now.getDay() + 7) % 7;
    return addDays(now, delta === 0 ? 7 : delta);
  }
  return numericDate(text, now);
}

/** Returns local time; callers serialize with toISOString. */
export function resolveVoiceDateTime(
  spoken: SpokenDateTime,
  now: Date,
  fallbackTime?: string,
): Date | undefined {
  const day = dayFor(spoken.dateText, now);
  const time = spoken.timeText ?? fallbackTime;
  const match = time?.match(/^(\d{1,2}):(\d{2})$/);
  if (!day || !match) return undefined;
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    Number(match[1]),
    Number(match[2]),
  );
}
