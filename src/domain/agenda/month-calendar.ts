import {
  addDaysMadrid,
  dateYMDMadrid,
  madridLocalDateTime,
  todayMadrid,
  toMadridISO,
  weekdayMadrid,
} from "../dates";

export interface MonthDaySummary {
  date: string;
  count: number;
  patientIds: string[];
}

export interface MonthGridDay {
  date: string;
  inMonth: boolean;
  isToday: boolean;
}

const MAX_PATIENTS_PER_DAY = 3;
const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

function parseMonth(month: string): { year: number; month: number } {
  const match = MONTH.exec(month);
  if (!match) throw new RangeError(`Mes no válido: ${month}`);
  return { year: Number(match[1]), month: Number(match[2]) };
}

function format(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function monthOf(day: string): string {
  return day.slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const parsed = parseMonth(month);
  const index = parsed.year * 12 + (parsed.month - 1) + delta;
  return format(Math.floor(index / 12), (index % 12) + 1);
}

export function monthBoundsMadrid(month: string): { start: string; end: string } {
  parseMonth(month);
  return {
    start: toMadridISO(madridLocalDateTime(`${month}-01`, "00:00")),
    end: toMadridISO(madridLocalDateTime(`${shiftMonth(month, 1)}-01`, "00:00")),
  };
}

/** Appointments per Madrid day; cancelled ones do not occupy the agenda. */
export function summarizeAppointmentsByDay(
  appointments: readonly { startsAt: string; patientId: string; status: string }[],
): MonthDaySummary[] {
  const days = new Map<string, MonthDaySummary>();
  for (const appointment of appointments) {
    if (appointment.status === "CANCELLED") continue;
    const date = todayMadrid(appointment.startsAt);
    const day = days.get(date) ?? { date, count: 0, patientIds: [] };
    day.count += 1;
    if (
      day.patientIds.length < MAX_PATIENTS_PER_DAY &&
      !day.patientIds.includes(appointment.patientId)
    ) {
      day.patientIds.push(appointment.patientId);
    }
    days.set(date, day);
  }
  return [...days.values()].sort((left, right) => left.date.localeCompare(right.date));
}

/** Whole Monday-first weeks covering the month. Days step from noon so DST never skips one. */
export function buildMonthGrid(month: string, today: string): MonthGridDay[][] {
  parseMonth(month);
  const first = `${month}-01`;
  const leading = (weekdayMadrid(first) + 6) % 7;
  const lastDay = dateYMDMadrid(
    addDaysMadrid(madridLocalDateTime(`${shiftMonth(month, 1)}-01`, "12:00"), -1),
  );
  const daysInMonth = Number(lastDay.slice(8));
  const total = Math.ceil((leading + daysInMonth) / 7) * 7;
  const start = addDaysMadrid(madridLocalDateTime(first, "12:00"), -leading);
  const weeks: MonthGridDay[][] = [];
  for (let index = 0; index < total; index += 1) {
    const date = dateYMDMadrid(addDaysMadrid(start, index));
    if (index % 7 === 0) weeks.push([]);
    weeks.at(-1)?.push({ date, inMonth: monthOf(date) === month, isToday: date === today });
  }
  return weeks;
}
