import type { z } from "zod";

import type { analyticsItemSchema } from "@/shared/api/schemas/analytics";

type FinancialPeriod = z.output<typeof analyticsItemSchema>;
type NewPatientsPeriod = { periodStart: string; count: number };

export type HistoryPeriod = FinancialPeriod & { periodStart: string; newPatients: number };

// Financial and registration buckets come from different sources, so a period can exist in
// only one of them; the union keeps months with patients but no billing visible.
export function mergeHistoryWithNewPatients(
  financial: readonly FinancialPeriod[],
  newPatients: readonly NewPatientsPeriod[],
): HistoryPeriod[] {
  const byPeriod = new Map<string, HistoryPeriod>();
  for (const item of financial) {
    if (!item.periodStart) continue;
    byPeriod.set(item.periodStart, { ...item, periodStart: item.periodStart, newPatients: 0 });
  }
  for (const { periodStart, count } of newPatients) {
    const existing = byPeriod.get(periodStart);
    byPeriod.set(
      periodStart,
      existing ? { ...existing, newPatients: count } : { periodStart, newPatients: count },
    );
  }
  return [...byPeriod.values()].sort((a, b) => b.periodStart.localeCompare(a.periodStart));
}
