import type { TaskPriority, TimelineTask } from "./task-types";

export const DEFAULT_TIMEZONE = "Europe/Madrid";
export const DEFAULT_DURATION_MIN = 15;
export const WORKDAY_START_MIN = 9 * 60;
const DAY_MIN = 24 * 60;

export const PRIORITY_RANK: Record<TaskPriority, number> = {
  URGENT: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
};

export interface ScheduleOptions {
  dayKey: string;
  now: Date;
  timeZone?: string;
  defaultDurationMin?: number;
}

export interface ScheduleEntry {
  task: TimelineTask;
  startMin: number;
  endMin: number;
  durationMin: number;
  startAt: Date;
  endAt: Date;
  explicit: boolean;
  overdue: boolean;
  conflictsWith: string[];
}

export interface ScheduleGap {
  startMin: number;
  endMin: number;
  minutes: number;
  elapsed: boolean;
}

export type TimelineRow =
  | { kind: "task"; key: string; entry: ScheduleEntry }
  | { kind: "gap"; key: string; gap: ScheduleGap };

export interface Schedule {
  dayKey: string;
  entries: ScheduleEntry[];
  rows: TimelineRow[];
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function zonedParts(ms: number, timeZone: string) {
  let fmt = formatterCache.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    formatterCache.set(timeZone, fmt);
  }
  const out: Record<string, number> = {};
  for (const part of fmt.formatToParts(new Date(ms))) {
    if (part.type !== "literal") out[part.type] = Number(part.value);
  }
  return out as Record<"year" | "month" | "day" | "hour" | "minute", number>;
}

export function zonedDayKey(date: Date, timeZone = DEFAULT_TIMEZONE): string {
  const p = zonedParts(date.getTime(), timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function minuteOfDay(date: Date, timeZone = DEFAULT_TIMEZONE): number {
  const p = zonedParts(date.getTime(), timeZone);
  return p.hour * 60 + p.minute;
}

function parseDayKey(dayKey: string): [number, number, number] {
  const [y, m, d] = dayKey.split("-").map(Number);
  return [y ?? 1970, m ?? 1, d ?? 1];
}

function offsetAt(ms: number, timeZone: string): number {
  const p = zonedParts(ms, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return asUtc - Math.floor(ms / 60000) * 60000;
}

// Dos pasadas: el offset del instante candidato puede cruzar un cambio de hora (DST).
export function zonedToUtc(dayKey: string, minute: number, timeZone = DEFAULT_TIMEZONE): Date {
  const [y, m, d] = parseDayKey(dayKey);
  const guess = Date.UTC(y, m - 1, d, 0, minute);
  const first = guess - offsetAt(guess, timeZone);
  const second = guess - offsetAt(first, timeZone);
  return new Date(second);
}

export function shiftDay(dayKey: string, days: number): string {
  const [y, m, d] = parseDayKey(dayKey);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function getWeekDays(dayKey: string): string[] {
  const [y, m, d] = parseDayKey(dayKey);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const mondayOffset = (weekday + 6) % 7;
  const monday = shiftDay(dayKey, -mondayOffset);
  return Array.from({ length: 7 }, (_, i) => shiftDay(monday, i));
}

export function formatClock(minute: number): string {
  const m = ((minute % DAY_MIN) + DAY_MIN) % DAY_MIN;
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${h} h` : `${h} h ${rest} min`;
}

export function formatRange(startMin: number, endMin: number): string {
  return `${formatClock(startMin)}–${formatClock(endMin)} (${formatDuration(endMin - startMin)})`;
}

export function dayStartMinute(dayKey: string, now: Date, timeZone = DEFAULT_TIMEZONE): number {
  if (zonedDayKey(now, timeZone) !== dayKey) return WORKDAY_START_MIN;
  const nowMin = minuteOfDay(now, timeZone);
  if (nowMin < WORKDAY_START_MIN) return WORKDAY_START_MIN;
  // Hacia arriba: empezar antes de "ahora" dejaría la primera tarea ya vencida.
  return Math.ceil(nowMin / 5) * 5;
}

function resolveDuration(task: TimelineTask, fallback: number): number {
  const value = task.durationMin;
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : fallback;
}

function overlaps(a: ScheduleEntry, b: ScheduleEntry): boolean {
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

export function buildSchedule(tasks: readonly TimelineTask[], options: ScheduleOptions): Schedule {
  const tz = options.timeZone ?? DEFAULT_TIMEZONE;
  const fallback = options.defaultDurationMin ?? DEFAULT_DURATION_MIN;
  const { dayKey, now } = options;
  const isToday = zonedDayKey(now, tz) === dayKey;

  const ordered = tasks
    .map((task, index) => ({ task, index }))
    .filter(({ task }) => !task.archivedAt && task.status !== "CANCELLED")
    .sort((a, b) => a.task.position - b.task.position || a.index - b.index)
    .map(({ task }) => task);

  let cursor = dayStartMinute(dayKey, now, tz);
  const entries: ScheduleEntry[] = [];

  for (const task of ordered) {
    const due = task.dueAt ? new Date(task.dueAt) : null;
    const dueKey = due && !Number.isNaN(due.getTime()) ? zonedDayKey(due, tz) : null;
    const done = task.status === "DONE";
    let explicit = false;
    let carried = false;

    if (dueKey !== null) {
      if (dueKey === dayKey) explicit = true;
      else if (dueKey < dayKey || !isToday) {
        // Solo "hoy" arrastra atrasadas; en otros días una tarea con otra fecha no pertenece.
        if (isToday && dueKey < dayKey && !done) carried = true;
        else continue;
      } else continue;
    }

    const durationMin = resolveDuration(task, fallback);
    const startMin = explicit && due ? minuteOfDay(due, tz) : cursor;
    const endMin = startMin + durationMin;
    cursor = Math.max(cursor, endMin);

    const startAt = zonedToUtc(dayKey, startMin, tz);
    const endAt = zonedToUtc(dayKey, endMin, tz);
    entries.push({
      task,
      startMin,
      endMin,
      durationMin,
      startAt,
      endAt,
      explicit,
      overdue: isToday && !done && (carried || endAt.getTime() <= now.getTime()),
      conflictsWith: [],
    });
  }

  for (const a of entries) {
    if (a.task.status === "DONE") continue;
    for (const b of entries) {
      if (a === b || b.task.status === "DONE") continue;
      if (overlaps(a, b)) a.conflictsWith.push(b.task.id);
    }
  }

  const rows: TimelineRow[] = [];
  entries.forEach((entry, i) => {
    const prev = entries[i - 1];
    if (prev && entry.startMin > prev.endMin) {
      const endAt = zonedToUtc(dayKey, entry.startMin, tz);
      rows.push({
        kind: "gap",
        key: `gap-${prev.task.id}-${entry.task.id}`,
        gap: {
          startMin: prev.endMin,
          endMin: entry.startMin,
          minutes: entry.startMin - prev.endMin,
          elapsed: endAt.getTime() <= now.getTime(),
        },
      });
    }
    rows.push({ kind: "task", key: entry.task.id, entry });
  });

  return { dayKey, entries, rows };
}

export function sortByPriority<T extends { priority: TaskPriority }>(tasks: readonly T[]): T[] {
  return tasks
    .map((task, index) => ({ task, index }))
    .sort(
      (a, b) =>
        PRIORITY_RANK[a.task.priority] - PRIORITY_RANK[b.task.priority] || a.index - b.index,
    )
    .map(({ task }) => task);
}

export function moveId(ids: readonly string[], id: string, direction: -1 | 1): string[] {
  const from = ids.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return [...ids];
  return moveIdToIndex(ids, id, to);
}

export function moveIdToIndex(ids: readonly string[], id: string, index: number): string[] {
  const from = ids.indexOf(id);
  if (from < 0) return [...ids];
  const next = ids.filter((candidate) => candidate !== id);
  next.splice(Math.max(0, Math.min(index, next.length)), 0, id);
  return next;
}

// Las tareas no visibles (archivadas, canceladas, de otro día) conservan su hueco en la lista total.
export function mergeVisibleOrder(
  allIds: readonly string[],
  visibleOrder: readonly string[],
): string[] {
  const visible = new Set(visibleOrder);
  const queue = [...visibleOrder];
  return allIds.map((id) => (visible.has(id) ? (queue.shift() as string) : id));
}

export interface ReplanPlan {
  orderedIds: string[];
  clearDueAtIds: string[];
}

export function planReplan(schedule: Schedule): ReplanPlan {
  const overdue = schedule.entries.filter((e) => e.overdue);
  const overdueIds = new Set(overdue.map((e) => e.task.id));
  const rest = schedule.entries.filter((e) => !overdueIds.has(e.task.id));
  const firstPending = rest.findIndex((e) => e.task.status !== "DONE");
  const insertAt = firstPending < 0 ? rest.length : firstPending;
  const ordered = rest.map((e) => e.task.id);
  ordered.splice(insertAt, 0, ...overdue.map((e) => e.task.id));
  return {
    orderedIds: ordered,
    clearDueAtIds: overdue.filter((e) => e.task.dueAt).map((e) => e.task.id),
  };
}

export function dueAtToTimeInput(
  dueAt: string | null | undefined,
  timeZone = DEFAULT_TIMEZONE,
): string {
  if (!dueAt) return "";
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return "";
  return formatClock(minuteOfDay(date, timeZone)).padStart(5, "0");
}

export function timeInputToDueAt(
  dayKey: string,
  value: string,
  timeZone = DEFAULT_TIMEZONE,
): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const minute = Number(match[1]) * 60 + Number(match[2]);
  return zonedToUtc(dayKey, minute, timeZone).toISOString();
}
