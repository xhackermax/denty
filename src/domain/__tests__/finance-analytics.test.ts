import { describe, expect, it } from "vitest";
import { projectDoctorMetrics, projectTreatmentMetrics } from "../finance-analytics";

describe("finance analytics projections", () => {
  it("keeps produced and collected separate", () => {
    const [metric] = projectTreatmentMetrics([
      { treatment: "Implante", producedCents: 95000, collectedCents: 40000 },
    ]);
    expect(metric?.producedCents).toBe(95000);
    expect(metric?.collectedCents).toBe(40000);
  });
  it("uses unassigned doctor instead of guessing", () => {
    expect(projectDoctorMetrics([{ producedCents: 50000 }])[0]?.name).toBe(
      "Sin profesional asignado",
    );
  });
  it("drops corrupt rows without NaN", () => {
    expect(projectTreatmentMetrics([{ label: "X", producedCents: "abc" }])).toEqual([]);
  });
});
