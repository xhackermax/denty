/**
 * Recall types (templates) and the follow-up recalls assigned to patients.
 *
 * The database stores the original `patient_recalls.status` values; the richer
 * states shown to reception are derived here and mirrored by
 * `private.recall_display_state` (checked by the migration contract test).
 */

import {
  addDaysMadrid,
  dateYMDMadrid,
  epochMillis,
  madridLocalDateTime,
  type DateInput,
} from "./dates";

export const RECALL_CATEGORIES = [
  "GENERAL",
  "PERIODONTAL",
  "IMPLANTES",
  "ORTODONCIA",
  "PROTESIS",
  "ODONTOPEDIATRIA",
  "PERSONALIZADO",
] as const;
export type RecallCategory = (typeof RECALL_CATEGORIES)[number];

export const RECALL_ANCHORS = [
  "FECHA_MANUAL",
  "CITA_COMPLETADA",
  "ULTIMA_REVISION_COMPLETADA",
  "TRATAMIENTO_FINALIZADO",
] as const;
export type RecallAnchor = (typeof RECALL_ANCHORS)[number];

export const RECALL_INTERVAL_UNITS = ["DIAS", "SEMANAS", "MESES"] as const;
export type RecallIntervalUnit = (typeof RECALL_INTERVAL_UNITS)[number];

export const RECALL_CHANNELS = ["WHATSAPP", "SMS", "EMAIL"] as const;
export type RecallChannel = (typeof RECALL_CHANNELS)[number];

export const RECALL_STORED_STATUSES = [
  "pending",
  "contacted",
  "booked",
  "dismissed",
  "superseded",
] as const;
export type RecallStoredStatus = (typeof RECALL_STORED_STATUSES)[number];

export const RECALL_CLOSE_REASONS = ["COMPLETED", "CANCELLED"] as const;
export type RecallCloseReason = (typeof RECALL_CLOSE_REASONS)[number];

export const RECALL_STATES = [
  "PROGRAMADO",
  "PROXIMO",
  "VENCIDO",
  "CONTACTADO",
  "CITA_PROGRAMADA",
  "COMPLETADO",
  "POSPUESTO",
  "CANCELADO",
  "REEMPLAZADO",
] as const;
export type RecallState = (typeof RECALL_STATES)[number];

export const RECALL_STATE_LABELS: Readonly<Record<RecallState, string>> = {
  PROGRAMADO: "Programado",
  PROXIMO: "Próximo",
  VENCIDO: "Vencido",
  CONTACTADO: "Contactado",
  CITA_PROGRAMADA: "Cita programada",
  COMPLETADO: "Completado",
  POSPUESTO: "Pospuesto",
  CANCELADO: "Cancelado",
  REEMPLAZADO: "Reemplazado",
};

export const RECALL_CATEGORY_LABELS: Readonly<Record<RecallCategory, string>> = {
  GENERAL: "General",
  PERIODONTAL: "Periodontal",
  IMPLANTES: "Implantes",
  ORTODONCIA: "Ortodoncia",
  PROTESIS: "Prótesis",
  ODONTOPEDIATRIA: "Odontopediatría",
  PERSONALIZADO: "Personalizado",
};

export const RECALL_ANCHOR_LABELS: Readonly<Record<RecallAnchor, string>> = {
  FECHA_MANUAL: "Fecha indicada al asignar",
  CITA_COMPLETADA: "Última cita completada",
  ULTIMA_REVISION_COMPLETADA: "Última revisión completada",
  TRATAMIENTO_FINALIZADO: "Tratamiento finalizado",
};

export const RECALL_UNIT_LABELS: Readonly<Record<RecallIntervalUnit, string>> = {
  DIAS: "días",
  SEMANAS: "semanas",
  MESES: "meses",
};

export const RECALL_INTERVAL_MAX = 120;
export const RECALL_CODE_MAX = 48;

const DAY_MS = 86_400_000;

function parseIsoDate(value: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("INVALID_RECALL_DATE");
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new Error("INVALID_RECALL_DATE");
  }
  return { year, month, day };
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Calendar arithmetic on clinic days (never instants), so daylight saving
 * changes cannot move a recall by a day. Months keep the day of month and fall
 * back to the month's last day, like PostgreSQL `date + interval 'n months'`.
 */
export function addRecallInterval(
  anchorDate: string,
  value: number,
  unit: RecallIntervalUnit,
): string {
  if (!Number.isInteger(value) || value < 1 || value > RECALL_INTERVAL_MAX) {
    throw new Error("INVALID_RECALL_INTERVAL");
  }
  const { year, month, day } = parseIsoDate(anchorDate);
  if (unit === "MESES") {
    const index = year * 12 + (month - 1) + value;
    const nextYear = Math.floor(index / 12);
    const nextMonth = (index % 12) + 1;
    return isoDate(nextYear, nextMonth, Math.min(day, daysInMonth(nextYear, nextMonth)));
  }
  const days = unit === "SEMANAS" ? value * 7 : value;
  // Midday keeps the clinic day stable across daylight saving changes.
  const midday = madridLocalDateTime(isoDate(year, month, day), "12:00");
  return dateYMDMadrid(addDaysMadrid(midday, days));
}

/** Recalls fall due at 09:00 clinic time, the same convention as treatment reviews. */
export function recallDueAt(dueDate: string): string {
  const { year, month, day } = parseIsoDate(dueDate);
  // TZDate#toISOString keeps the Madrid offset; the API contract stores UTC.
  return Date.prototype.toISOString.call(madridLocalDateTime(isoDate(year, month, day), "09:00"));
}

export function normalizeRecallCode(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, RECALL_CODE_MAX)
    .replace(/_+$/g, "");
}

/** Template recalls never share a kind with the automatic REVIEW_* series. */
export function recallKindForTemplate(code: string): string {
  return `RECALL_${code}`;
}

export interface RecallStateInput {
  status: RecallStoredStatus;
  dueAt: string;
  closeReason: RecallCloseReason | null;
  pausedUntil: string | null;
}

export function deriveRecallState(
  recall: RecallStateInput,
  leadDays: number,
  now: DateInput = Date.now(),
): RecallState {
  const nowMs = epochMillis(now);
  const dueMs = Date.parse(recall.dueAt);
  switch (recall.status) {
    case "booked":
      return "CITA_PROGRAMADA";
    case "superseded":
      return "REEMPLAZADO";
    case "dismissed":
      return recall.closeReason === "COMPLETED" ? "COMPLETADO" : "CANCELADO";
    default:
      break;
  }
  if (recall.status === "pending" && recall.pausedUntil && Date.parse(recall.pausedUntil) > nowMs) {
    return "POSPUESTO";
  }
  if (dueMs < nowMs) return "VENCIDO";
  if (recall.status === "contacted") return "CONTACTADO";
  return dueMs - nowMs <= leadDays * DAY_MS ? "PROXIMO" : "PROGRAMADO";
}
