import { describe, expect, it } from "vitest";

import {
  buildTreatmentReviewSchedule,
  nextAnnualReviewDate,
  parseReviewKind,
  recallReasonLabel,
  reviewKind,
  reviewSpecialtyForExecution,
} from "../treatment-reviews";

describe("especialidad de revisión según el tratamiento realizado", () => {
  it("toda endodoncia abre seguimiento de endodoncia", () => {
    expect(
      reviewSpecialtyForExecution({
        treatmentCode: "ENDODONCIA_UNIRRADICULAR",
        treatmentCategory: "ENDODONTICS",
      }),
    ).toBe("ENDO");
    expect(
      reviewSpecialtyForExecution({
        treatmentCode: "pulpotomia",
        treatmentCategory: "endodontics",
      }),
    ).toBe("ENDO");
  });

  it("la ortodoncia se sigue desde la retención, no desde cada visita activa", () => {
    expect(
      reviewSpecialtyForExecution({
        treatmentCode: "RETENEDOR_LINGUAL",
        treatmentCategory: "ORTHODONTICS",
      }),
    ).toBe("ORTHO");
    expect(
      reviewSpecialtyForExecution({
        treatmentCode: "RETENEDOR_ESSIX",
        treatmentCategory: "ORTHODONTICS",
      }),
    ).toBe("ORTHO");
    expect(
      reviewSpecialtyForExecution({
        treatmentCode: "ALINEADOR_ORTODONCIA_INVISIBLE",
        treatmentCategory: "ORTHODONTICS",
      }),
    ).toBeNull();
  });

  it("la periodoncia activa abre seguimiento; mantenimientos y revisiones no lo reinician", () => {
    expect(
      reviewSpecialtyForExecution({
        treatmentCode: "ROOT_PLANING",
        treatmentCategory: "PERIODONTICS",
      }),
    ).toBe("PERIO");
    expect(
      reviewSpecialtyForExecution({
        treatmentCode: "TRATAMIENTO_PERIODONTAL_POR_CUADRANTES",
        treatmentCategory: "PERIODONTICS",
      }),
    ).toBe("PERIO");
    for (const code of [
      "PERIO_MAINTENANCE",
      "PERIO_REVIEW",
      "SPLINT_REVIEW",
      "ORAL_HYGIENE",
      "HYGIENE",
    ]) {
      expect(
        reviewSpecialtyForExecution({ treatmentCode: code, treatmentCategory: "PERIODONTICS" }),
      ).toBeNull();
    }
  });

  it("los implantes se programan desde la colocación registrada, no desde el libro de tratamientos", () => {
    expect(
      reviewSpecialtyForExecution({ treatmentCode: "IMPLANT", treatmentCategory: "IMPLANTOLOGY" }),
    ).toBeNull();
  });

  it("ignora otras especialidades y datos vacíos", () => {
    expect(
      reviewSpecialtyForExecution({ treatmentCode: "FILLING", treatmentCategory: "RESTORATION" }),
    ).toBeNull();
    expect(
      reviewSpecialtyForExecution({ treatmentCode: null, treatmentCategory: null }),
    ).toBeNull();
  });
});

describe("calendario de revisiones", () => {
  it("programa 3, 6 y 12 meses desde el día del tratamiento", () => {
    expect(buildTreatmentReviewSchedule("IMPLANT", "2026-10-13")).toEqual([
      { kind: "REVIEW_IMPLANT_3M", step: "3M", dueDate: "2027-01-13" },
      { kind: "REVIEW_IMPLANT_6M", step: "6M", dueDate: "2027-04-13" },
      { kind: "REVIEW_IMPLANT_12M", step: "12M", dueDate: "2027-10-13" },
    ]);
  });

  it("ajusta a fin de mes como PostgreSQL cuando el día no existe", () => {
    expect(
      buildTreatmentReviewSchedule("ENDO", "2026-11-30").map((review) => review.dueDate),
    ).toEqual(["2027-02-28", "2027-05-30", "2027-11-30"]);
    expect(nextAnnualReviewDate("2028-02-29")).toBe("2029-02-28");
  });

  it("después del primer año la revisión es anual", () => {
    expect(nextAnnualReviewDate("2027-10-13")).toBe("2028-10-13");
  });

  it("rechaza fechas no válidas", () => {
    expect(() => buildTreatmentReviewSchedule("PERIO", "13/10/2026")).toThrow(
      "INVALID_REVIEW_DATE",
    );
    expect(() => nextAnnualReviewDate("2026-02-30")).toThrow("INVALID_REVIEW_DATE");
  });
});

describe("etiquetas para recepción", () => {
  it("codifica y lee el tipo de revisión", () => {
    expect(reviewKind("ORTHO", "ANNUAL")).toBe("REVIEW_ORTHO_ANNUAL");
    expect(parseReviewKind("REVIEW_PERIO_6M")).toEqual({ specialty: "PERIO", step: "6M" });
    expect(parseReviewKind("REVIEW_SURGERY_3M")).toBeNull();
    expect(parseReviewKind("NO_SHOW")).toBeNull();
  });

  it("traduce los motivos de la cola de seguimiento", () => {
    expect(recallReasonLabel("REVIEW_IMPLANT_3M")).toBe("Revisión de implantes · 3 meses");
    expect(recallReasonLabel("REVIEW_ENDO_12M")).toBe("Revisión de endodoncia · 1 año");
    expect(recallReasonLabel("REVIEW_ORTHO_ANNUAL")).toBe("Revisión de ortodoncia · anual");
    expect(recallReasonLabel("REVIEW_PERIO_6M")).toBe("Revisión de periodoncia · 6 meses");
    expect(recallReasonLabel("NO_SHOW")).toBe("No se presentó a la cita");
    expect(recallReasonLabel("Otro motivo")).toBe("Otro motivo");
  });
});
