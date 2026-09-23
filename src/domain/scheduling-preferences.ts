import { addDaysMadrid, dateYMDMadrid } from "./dates";

export const DEFAULT_PLAN_VISIT_GAP_DAYS = 7;
export const PLAN_VISIT_GAP_MIN_DAYS = 0;
export const PLAN_VISIT_GAP_MAX_DAYS = 180;
export const DEMO_SCHEDULING_STORAGE_KEY = "denty.demo.scheduling.v1";

export interface SchedulingPreferences {
  defaultPlanVisitGapDays: number;
}

export function normalizePlanVisitGapDays(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_PLAN_VISIT_GAP_DAYS;
  return Math.min(PLAN_VISIT_GAP_MAX_DAYS, Math.max(PLAN_VISIT_GAP_MIN_DAYS, Math.round(numeric)));
}

export function resolvePlanVisitGapDays(input: {
  itemGapDays?: number | null;
  defaultGapDays?: number | null;
}): number {
  if (input.itemGapDays !== undefined && input.itemGapDays !== null) {
    return normalizePlanVisitGapDays(input.itemGapDays);
  }
  return normalizePlanVisitGapDays(input.defaultGapDays ?? DEFAULT_PLAN_VISIT_GAP_DAYS);
}

export function planVisitDates(startDate: string, visits: number, gapDays: number): string[] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate);
  if (!match || visits <= 0) return [];
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const gap = normalizePlanVisitGapDays(gapDays);
  const ymd = [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ];
  const start = ymd.join("-");
  return Array.from({ length: Math.max(0, Math.floor(visits)) }, (_, index) => {
    return dateYMDMadrid(addDaysMadrid(start, index * gap));
  });
}
