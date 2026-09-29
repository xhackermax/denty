import { toMadridISO, type DateInput } from "./dates";
export type AppointmentStatus =
  | "scheduled"
  | "arrived"
  | "waiting"
  | "in_chair"
  | "completed"
  | "no_show"
  | "cancelled"
  | "running_late";
export interface AppointmentLifecycle {
  status: AppointmentStatus;
  arrivedAt?: string;
  waitingAt?: string;
  chairStartedAt?: string;
  completedAt?: string;
  noShowAt?: string;
  cancelledAt?: string;
}
const ALLOWED: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  scheduled: ["arrived", "running_late", "no_show", "cancelled"],
  running_late: ["arrived", "no_show", "cancelled"],
  arrived: ["waiting", "in_chair", "cancelled"],
  waiting: ["in_chair", "cancelled"],
  in_chair: ["completed"],
  completed: [],
  no_show: [],
  cancelled: [],
};
export function transitionAppointment(
  current: AppointmentLifecycle,
  next: AppointmentStatus,
  at: DateInput = Date.now(),
): AppointmentLifecycle {
  if (!ALLOWED[current.status].includes(next))
    throw new Error(`Transición de cita no permitida: ${current.status} -> ${next}`);
  const iso = toMadridISO(at);
  const result: AppointmentLifecycle = { ...current, status: next };
  if (next === "arrived") result.arrivedAt = iso;
  if (next === "waiting") result.waitingAt = iso;
  if (next === "in_chair") result.chairStartedAt = iso;
  if (next === "completed") result.completedAt = iso;
  if (next === "no_show") result.noShowAt = iso;
  if (next === "cancelled") result.cancelledAt = iso;
  return result;
}
function minutes(a?: string, b?: string) {
  if (!a || !b) return null;
  return Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 60000));
}
export function appointmentMetrics(value: AppointmentLifecycle) {
  return {
    waitingMinutes: minutes(value.waitingAt ?? value.arrivedAt, value.chairStartedAt),
    chairMinutes: minutes(value.chairStartedAt, value.completedAt),
  };
}
