import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  DEFAULT_REVIEW_INTERVAL_MONTHS,
  DISCHARGE_REVIEW_KIND,
  dischargeReviewDueDate,
  isReviewIntervalMonths,
  nextMaintenanceDueDate,
  reviewIntervalLabel,
  suggestDischargeReviewMonths,
} from "../patient-discharge";
import { recallReasonLabel } from "../treatment-reviews";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20261027200000_patient_discharge_reviews.sql"),
  "utf8",
);

describe("intervalo de revisión al dar de alta", () => {
  it("usa el intervalo más corto de los tratamientos realizados", () => {
    expect(
      suggestDischargeReviewMonths([
        { name: "Obturación", reviewIntervalMonths: 12 },
        { name: "Implante", reviewIntervalMonths: 6 },
      ]),
    ).toEqual({ months: 6, basedOn: "Implante" });
  });

  it("anual cuando todos los tratamientos configurados piden 12 meses", () => {
    expect(
      suggestDischargeReviewMonths([
        { name: "Obturación", reviewIntervalMonths: 12 },
        { name: "Limpieza", reviewIntervalMonths: null },
      ]),
    ).toEqual({ months: 12, basedOn: "Obturación" });
  });

  it("sin configuración aplica la revisión habitual de 6 meses", () => {
    expect(suggestDischargeReviewMonths([])).toEqual({
      months: DEFAULT_REVIEW_INTERVAL_MONTHS,
      basedOn: null,
    });
    expect(suggestDischargeReviewMonths([{ name: "Raro", reviewIntervalMonths: 9 }])).toEqual({
      months: 6,
      basedOn: null,
    });
  });

  it("solo admite 6 o 12 meses", () => {
    expect(isReviewIntervalMonths(6)).toBe(true);
    expect(isReviewIntervalMonths(12)).toBe(true);
    expect(isReviewIntervalMonths(3)).toBe(false);
    expect(isReviewIntervalMonths("6")).toBe(false);
  });

  it("calcula la fecha de la primera revisión en días de calendario", () => {
    expect(dischargeReviewDueDate("2026-10-27", 6)).toBe("2027-04-27");
    expect(dischargeReviewDueDate("2026-08-31", 6)).toBe("2027-02-28");
    expect(dischargeReviewDueDate("2026-10-27", 12)).toBe("2027-10-27");
  });

  it("la revisión a citar avanza si la anterior lleva más de un mes vencida", () => {
    expect(nextMaintenanceDueDate("2026-10-27", 6, "2026-10-28")).toBe("2027-04-27");
    expect(nextMaintenanceDueDate("2026-10-27", 6, "2027-05-20")).toBe("2027-04-27");
    expect(nextMaintenanceDueDate("2026-10-27", 6, "2027-06-01")).toBe("2027-10-27");
    expect(nextMaintenanceDueDate("2025-01-10", 12, "2027-03-01")).toBe("2028-01-10");
  });

  it("etiquetas para recepción", () => {
    expect(reviewIntervalLabel(6)).toBe("Cada 6 meses");
    expect(reviewIntervalLabel(12)).toBe("Anual (12 meses)");
    expect(recallReasonLabel(DISCHARGE_REVIEW_KIND)).toBe("Revisión de mantenimiento (alta)");
  });
});

describe("contrato con la migración", () => {
  it("usa el mismo tipo de recall y los mismos intervalos", () => {
    expect(migration).toContain(`'${DISCHARGE_REVIEW_KIND}'`);
    expect(migration).toContain("review_interval_months in (6, 12)");
    expect(migration).toContain("p_review_months not in (6, 12)");
  });

  it("es aditiva: no borra columnas, tablas ni políticas", () => {
    expect(migration).not.toMatch(/\bdrop\s+(table|column|policy|constraint)\b/i);
  });

  it("encadena la siguiente revisión al reservar cita y mantiene RLS", () => {
    expect(migration).toContain("after update of status on public.patient_recalls");
    expect(migration).toMatch(/discharge_patient[\s\S]*security invoker/);
  });
});
