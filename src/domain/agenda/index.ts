import { addMinutes, epochMillis, hhmm, overlaps, toMadridISO, type TimeRange } from "../dates";

export const ALLOWED_DURATIONS = [20, 30, 45, 60, 90, 120] as const;
export const ALLOWED_EXTENSIONS = [10, 20, 30, 60] as const;
export const MIN_APPOINTMENT_MINUTES = 10;

export type AppointmentStatus =
  | "PLANNED"
  | "CONFIRMED"
  | "ARRIVED"
  | "IN_CHAIR"
  | "COMPLETED"
  | "NO_SHOW"
  | "CANCELLED";

export interface AgendaAppointment extends TimeRange {
  id: string;
  staffId: string;
  cabinetId?: string;
  status?: AppointmentStatus;
  arrivedAt?: string | null;
}

export interface AgendaBlock extends TimeRange {
  id: string;
  staffId?: string;
  cabinetId?: string;
}

export interface LayoutConfig {
  dayStartMinutes?: number;
  dayEndMinutes?: number;
}

export interface LaidOutAppointment {
  id: string;
  topMinutes: number;
  heightMinutes: number;
  column: number;
  columnCount: number;
}

export interface MoveValidation {
  ok: boolean;
  conflicts: string[];
}

function minutesSinceMidnight(value: Date | number | string): number {
  const [hours = "0", minutes = "0"] = hhmm(value).split(":");
  return Number(hours) * 60 + Number(minutes);
}

export function durationMinutes(range: TimeRange): number {
  const duration = (epochMillis(range.endsAt) - epochMillis(range.startsAt)) / 60_000;
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new RangeError("La cita debe terminar después de empezar");
  }
  return duration;
}

export function snap(minutes: number, step = 10): number {
  if (!Number.isFinite(minutes) || !Number.isFinite(step) || step <= 0) {
    throw new RangeError("El minuto y el paso deben ser válidos");
  }
  return Math.round(minutes / step) * step;
}

function conflictsByResource(
  moving: AgendaAppointment,
  candidate: TimeRange,
  other: AgendaAppointment,
): boolean {
  if (moving.id === other.id || !overlaps(candidate, other)) {
    return false;
  }
  const sameStaff = moving.staffId === other.staffId;
  const sameCabinet =
    Boolean(moving.cabinetId) && moving.cabinetId === other.cabinetId;
  return sameStaff || sameCabinet;
}

export function findConflicts(
  moving: AgendaAppointment,
  candidate: TimeRange,
  appointments: readonly AgendaAppointment[],
  blocks: readonly AgendaBlock[] = [],
): string[] {
  const appointmentConflicts = appointments
    .filter((other) => conflictsByResource(moving, candidate, other))
    .map((other) => `appointment:${other.id}`);

  const blockConflicts = blocks
    .filter((block) => {
      if (!overlaps(candidate, block)) return false;
      if (!block.staffId && !block.cabinetId) return true;
      const staffConflict = Boolean(block.staffId) && block.staffId === moving.staffId;
      const cabinetConflict =
        Boolean(block.cabinetId) && block.cabinetId === moving.cabinetId;
      return staffConflict || cabinetConflict;
    })
    .map((block) => `block:${block.id}`);

  return [...appointmentConflicts, ...blockConflicts];
}

export function canMove(
  moving: AgendaAppointment,
  candidate: TimeRange,
  appointments: readonly AgendaAppointment[],
  blocks: readonly AgendaBlock[] = [],
): MoveValidation {
  const conflicts = findConflicts(moving, candidate, appointments, blocks);
  return { ok: conflicts.length === 0, conflicts };
}

export function resizeTo(
  appointment: AgendaAppointment,
  minutes: number,
): AgendaAppointment {
  const duration = Math.max(MIN_APPOINTMENT_MINUTES, Math.round(minutes));
  return {
    ...appointment,
    endsAt: toMadridISO(addMinutes(appointment.startsAt, duration)),
  };
}

interface LayoutNode {
  appointment: AgendaAppointment;
  start: number;
  end: number;
  column: number;
  group: number;
}

export function layoutDay(
  appointments: readonly AgendaAppointment[],
  config: LayoutConfig = {},
): LaidOutAppointment[] {
  const dayStart = config.dayStartMinutes ?? 8 * 60;
  const dayEnd = config.dayEndMinutes ?? 19 * 60;
  if (dayEnd <= dayStart) throw new RangeError("El final del día debe ser posterior al inicio");

  const sorted = [...appointments]
    .map((appointment) => ({
      appointment,
      start: minutesSinceMidnight(appointment.startsAt),
      end: minutesSinceMidnight(appointment.endsAt),
    }))
    .sort(
      (a, b) =>
        a.start - b.start ||
        a.end - b.end ||
        a.appointment.id.localeCompare(b.appointment.id),
    );

  const nodes: LayoutNode[] = [];
  let group = -1;
  let groupEnd = -Infinity;
  let columnEnds: number[] = [];

  for (const item of sorted) {
    if (item.start >= groupEnd) {
      group += 1;
      groupEnd = item.end;
      columnEnds = [];
    } else {
      groupEnd = Math.max(groupEnd, item.end);
    }

    let column = columnEnds.findIndex((end) => end <= item.start);
    if (column < 0) column = columnEnds.length;
    columnEnds[column] = item.end;
    nodes.push({ ...item, column, group });
  }

  const columnsByGroup = new Map<number, number>();
  for (const node of nodes) {
    columnsByGroup.set(
      node.group,
      Math.max(columnsByGroup.get(node.group) ?? 0, node.column + 1),
    );
  }

  return nodes.map((node) => ({
    id: node.appointment.id,
    topMinutes: node.start - dayStart,
    heightMinutes: Math.max(MIN_APPOINTMENT_MINUTES, node.end - node.start),
    column: node.column,
    columnCount: columnsByGroup.get(node.group) ?? 1,
  }));
}

export function waitingVisualState(input: {
  status: AppointmentStatus;
  arrivedAt?: string | null;
  now?: Date | number | string;
}): "neutral" | "yellow" | "red" | "green" | "blue" {
  if (input.status === "IN_CHAIR") return "green";
  if (input.status === "NO_SHOW") return "blue";
  if (input.status !== "ARRIVED" || !input.arrivedAt) return "neutral";

  const now = epochMillis(input.now ?? Date.now());
  const waitedMinutes = (now - epochMillis(input.arrivedAt)) / 60_000;
  return waitedMinutes > 15 ? "red" : "yellow";
}
