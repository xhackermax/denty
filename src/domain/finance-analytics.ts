export const UNASSIGNED_DOCTOR = "Sin profesional asignado";

export interface TreatmentMetric {
  label: string;
  producedCents: number;
  invoicedCents: number;
  collectedCents: number;
  costCents: number;
  marginCents: number;
  count: number;
}

export interface DoctorMetric {
  id?: string;
  name: string;
  producedCents: number;
  invoicedCents: number;
  collectedCents: number;
  count: number;
}

export interface MonthlyMetric {
  month: string;
  producedCents: number;
  invoicedCents: number;
  collectedCents: number;
}

export interface FinanceDashboardMetrics {
  producedCents: number;
  invoicedCents: number;
  collectedCents: number;
  pendingCents: number;
  marginCents: number;
}

type Row = Record<string, unknown>;

export function finiteCents(value: unknown): number | null {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : NaN;
  return Number.isFinite(numeric) ? Math.round(numeric) : null;
}

function firstText(row: Row, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function firstCents(row: Row, keys: readonly string[]): number {
  for (const key of keys) {
    const value = finiteCents(row[key]);
    if (value !== null) return value;
  }
  return 0;
}

function hasFinite(row: Row, keys: readonly string[]): boolean {
  return keys.some((key) => finiteCents(row[key]) !== null);
}

export function projectTreatmentMetrics(rows: readonly Row[]): TreatmentMetric[] {
  return rows.flatMap((row) => {
    const label = firstText(row, ["treatment", "treatmentName", "label", "name", "procedure"]);
    const moneyKeys = [
      "producedCents",
      "productionCents",
      "revenueCents",
      "totalCents",
      "invoicedCents",
      "collectedCents",
      "paidCents",
    ] as const;
    if (!label || !hasFinite(row, moneyKeys)) return [];
    const producedCents = firstCents(row, [
      "producedCents",
      "productionCents",
      "revenueCents",
      "totalCents",
    ]);
    const invoicedCents = firstCents(row, ["invoicedCents", "billedCents"]);
    const collectedCents = firstCents(row, ["collectedCents", "paidCents"]);
    const costCents = firstCents(row, ["costCents", "costsCents", "expenseCents"]);
    const count = Math.max(0, firstCents(row, ["count", "cases", "treatments"]));
    return [
      {
        label,
        producedCents,
        invoicedCents,
        collectedCents,
        costCents,
        marginCents: producedCents - costCents,
        count,
      },
    ];
  });
}

export function projectDoctorMetrics(rows: readonly Row[]): DoctorMetric[] {
  return rows.flatMap((row) => {
    const moneyKeys = [
      "producedCents",
      "productionCents",
      "revenueCents",
      "totalCents",
      "invoicedCents",
      "collectedCents",
    ] as const;
    if (!hasFinite(row, moneyKeys)) return [];
    const id = firstText(row, ["doctorId", "staffId", "id"]);
    const name =
      firstText(row, ["doctor", "doctorName", "staffName", "name", "label"]) ?? UNASSIGNED_DOCTOR;
    const metric: DoctorMetric = {
      name,
      producedCents: firstCents(row, [
        "producedCents",
        "productionCents",
        "revenueCents",
        "totalCents",
      ]),
      invoicedCents: firstCents(row, ["invoicedCents", "billedCents"]),
      collectedCents: firstCents(row, ["collectedCents", "paidCents"]),
      count: Math.max(0, firstCents(row, ["count", "cases", "treatments"])),
    };
    return [{ ...(id ? { id } : {}), ...metric }];
  });
}

export function projectMonthlyMetrics(rows: readonly Row[]): MonthlyMetric[] {
  return rows.flatMap((row) => {
    const month = firstText(row, ["month", "period", "label", "date"]);
    const moneyKeys = [
      "producedCents",
      "productionCents",
      "revenueCents",
      "totalCents",
      "invoicedCents",
      "collectedCents",
    ] as const;
    if (!month || !hasFinite(row, moneyKeys)) return [];
    return [
      {
        month,
        producedCents: firstCents(row, [
          "producedCents",
          "productionCents",
          "revenueCents",
          "totalCents",
        ]),
        invoicedCents: firstCents(row, ["invoicedCents", "billedCents"]),
        collectedCents: firstCents(row, ["collectedCents", "paidCents"]),
      },
    ];
  });
}

export function summarizeFinanceMetrics(
  treatments: readonly TreatmentMetric[],
  invoicedCents: number,
  collectedCents: number,
): FinanceDashboardMetrics {
  const producedCents = treatments.reduce((sum, metric) => sum + metric.producedCents, 0);
  const marginCents = treatments.reduce((sum, metric) => sum + metric.marginCents, 0);
  return {
    producedCents,
    invoicedCents,
    collectedCents,
    pendingCents: Math.max(0, invoicedCents - collectedCents),
    marginCents,
  };
}
