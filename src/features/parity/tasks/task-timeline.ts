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

function validDueAt(task: TimelineTask): Date | null {
  if (!task.dueAt) return null;
  const due = new Date(task.dueAt);
  return Number.isNaN(due.getTime()) ? null : due;
}

// El día de una tarea: scheduledOn si existe, si no la fecha local de dueAt, si no null (Bandeja).
export function taskDay(task: TimelineTask, timeZone = DEFAULT_TIMEZONE): string | null {
  if (task.scheduledOn) return task.scheduledOn;
  const due = validDueAt(task);
  return due ? zonedDayKey(due, timeZone) : null;
}

function isActive(task: TimelineTask): boolean {
  return !task.archivedAt && task.status !== "CANCELLED";
}

export function inboxTasks(
  tasks: readonly TimelineTask[],
  timeZone = DEFAULT_TIMEZONE,
): TimelineTask[] {
  return tasks
    .map((task, index) => ({ task, index }))
    .filter(({ task }) => isActive(task) && taskDay(task, timeZone) === null)
    .sort((a, b) => a.task.position - b.task.position || a.index - b.index)
    .map(({ task }) => task);
}

export function buildSchedule(tasks: readonly TimelineTask[], options: ScheduleOptions): Schedule {
  const tz = options.timeZone ?? DEFAULT_TIMEZONE;
  const fallback = options.defaultDurationMin ?? DEFAULT_DURATION_MIN;
  const { dayKey, now } = options;
  const isToday = zonedDayKey(now, tz) === dayKey;

  const ordered = tasks
    .map((task, index) => ({ task, index }))
    .filter(({ task }) => isActive(task))
    .sort((a, b) => a.task.position - b.task.position || a.index - b.index)
    .map(({ task }) => task);

  let cursor = dayStartMinute(dayKey, now, tz);
  const entries: ScheduleEntry[] = [];

  for (const task of ordered) {
    const day = taskDay(task, tz);
    if (day === null) continue;
    const done = task.status === "DONE";
    let carried = false;
    if (day !== dayKey) {
      // Solo "hoy" arrastra las atrasadas sin hacer; en otros días una tarea de otra fecha no pertenece.
      if (isToday && day < dayKey && !done) carried = true;
      else continue;
    }
    const due = validDueAt(task);
    const explicit = !carried && due !== null && zonedDayKey(due, tz) === dayKey;

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

  entries.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

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

export interface ReplanMove {
  id: string;
  scheduledOn: string;
  clearDueAt: boolean;
}

export interface ReplanPlan {
  orderedIds: string[];
  moves: ReplanMove[];
}

// Las vencidas se reprograman para el día del horario (hoy) y pasan delante de lo pendiente.
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
    moves: overdue.map((e) => ({
      id: e.task.id,
      scheduledOn: schedule.dayKey,
      clearDueAt: Boolean(e.task.dueAt),
    })),
  };
}

export const MAX_MARKER_DOTS = 4;

export interface MarkerDot {
  priority: TaskPriority;
  done: boolean;
}

export interface DayMarker {
  total: number;
  done: number;
  pending: number;
  dots: MarkerDot[];
  extra: number;
  hasOverdue: boolean;
  hasConflict: boolean;
}

export function buildDayMarkers(
  tasks: readonly TimelineTask[],
  days: readonly string[],
  options: { now: Date; timeZone?: string },
): Record<string, DayMarker> {
  const result: Record<string, DayMarker> = {};
  for (const dayKey of days) {
    const { entries } = buildSchedule(tasks, { dayKey, ...options });
    const pendingEntries = sortByPriority(
      entries.filter((e) => e.task.status !== "DONE").map((e) => e.task),
    );
    const doneEntries = sortByPriority(
      entries.filter((e) => e.task.status === "DONE").map((e) => e.task),
    );
    const dots: MarkerDot[] = [
      ...pendingEntries.map((t) => ({ priority: t.priority, done: false })),
      ...doneEntries.map((t) => ({ priority: t.priority, done: true })),
    ];
    result[dayKey] = {
      total: entries.length,
      done: doneEntries.length,
      pending: pendingEntries.length,
      dots: dots.slice(0, MAX_MARKER_DOTS),
      extra: Math.max(0, dots.length - MAX_MARKER_DOTS),
      hasOverdue: entries.some((e) => e.overdue),
      hasConflict: entries.some((e) => e.conflictsWith.length > 0),
    };
  }
  return result;
}

export function markerLabel(marker: DayMarker): string {
  if (marker.total === 0) return "Sin tareas";
  const total = `${marker.total} ${marker.total === 1 ? "tarea" : "tareas"}`;
  if (marker.done === 0) return total;
  return `${total}, ${marker.done} ${marker.done === 1 ? "hecha" : "hechas"}`;
}

export interface TaskDayPatch {
  scheduledOn: string | null;
  dueAt?: string | null;
}

// Mover de día conserva la hora fija (en Madrid); a la Bandeja se pierde porque dueAt fijaría el día.
export function dayPatchFor(
  task: TimelineTask,
  day: string | null,
  timeZone = DEFAULT_TIMEZONE,
): TaskDayPatch {
  if (day === null) return task.dueAt ? { scheduledOn: null, dueAt: null } : { scheduledOn: null };
  const due = validDueAt(task);
  if (!due || zonedDayKey(due, timeZone) === day) return { scheduledOn: day };
  return {
    scheduledOn: day,
    dueAt: zonedToUtc(day, minuteOfDay(due, timeZone), timeZone).toISOString(),
  };
}

// Revierte un cambio de día restaurando solo los campos que el cambio tocó.
export function undoDayPatch(task: TimelineTask, patch: TaskDayPatch): TaskDayPatch {
  return {
    scheduledOn: task.scheduledOn ?? null,
    ...("dueAt" in patch ? { dueAt: task.dueAt ?? null } : {}),
  };
}

export interface DayShortcut {
  key: "today" | "tomorrow" | "selected";
  label: string;
  day: string;
}

// Atajos para programar: hoy, mañana y, si difiere, el día que se está viendo.
export function dayShortcuts(today: string, selectedDay?: string): DayShortcut[] {
  const tomorrow = shiftDay(today, 1);
  const shortcuts: DayShortcut[] = [
    { key: "today", label: "Hoy", day: today },
    { key: "tomorrow", label: "Mañana", day: tomorrow },
  ];
  if (selectedDay && selectedDay !== today && selectedDay !== tomorrow) {
    shortcuts.push({
      key: "selected",
      label: `Día seleccionado · ${describeDay(selectedDay, today)}`,
      day: selectedDay,
    });
  }
  return shortcuts;
}

export interface TaskSchedule {
  scheduledOn: string | null;
  dueAt: string | null;
}

// Con hora fija su fecha manda; scheduledOn se alinea con ella.
export function resolveTaskSchedule(
  day: string | null,
  time: string,
  timeZone = DEFAULT_TIMEZONE,
): TaskSchedule {
  if (day === null) return { scheduledOn: null, dueAt: null };
  const dueAt = timeInputToDueAt(day, time, timeZone);
  return { scheduledOn: dueAt ? zonedDayKey(new Date(dueAt), timeZone) : day, dueAt };
}

const shortDayFmt = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export function describeDay(dayKey: string, today: string): string {
  if (dayKey === today) return "hoy";
  if (dayKey === shiftDay(today, 1)) return "mañana";
  if (dayKey === shiftDay(today, -1)) return "ayer";
  return shortDayFmt.format(new Date(`${dayKey}T12:00:00Z`)).replace(/\./g, "");
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
