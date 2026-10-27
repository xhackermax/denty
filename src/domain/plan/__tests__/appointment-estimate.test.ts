import { describe, expect, it } from "vitest";

import {
  appointmentRangeLabel,
  chairTimeLabel,
  estimatePlanAppointments,
  resolveTreatmentTimes,
} from "../appointment-estimate.ts";

const implant = { treatmentCode: "IMPLANT", label: "Implante" };
const scaling = { treatmentCode: "PERIODONTICS", label: "Raspado" };
const crown = { treatmentCode: "CROWN", label: "Corona" };

describe("resolveTreatmentTimes", () => {
  it("falls back to the family default when nothing is recorded", () => {
    expect(resolveTreatmentTimes(implant)).toEqual({
      minAppointments: 3,
      maxAppointments: 5,
      durationMin: null,
    });
  });

  it("takes each value from the first source that records it", () => {
    const doctor = { durationMin: 90, appointmentsMin: null, appointmentsMax: 6 };
    const catalog = { durationMin: 60, appointmentsMin: 4, appointmentsMax: 5 };
    expect(resolveTreatmentTimes(implant, [doctor, catalog])).toEqual({
      minAppointments: 4,
      maxAppointments: 6,
      durationMin: 90,
    });
  });

  it("keeps the range valid when only one end is recorded", () => {
    expect(resolveTreatmentTimes(implant, [{ appointmentsMin: 7 }])).toMatchObject({
      minAppointments: 7,
      maxAppointments: 7,
    });
    expect(resolveTreatmentTimes(implant, [{ appointmentsMax: 2 }])).toMatchObject({
      minAppointments: 2,
      maxAppointments: 2,
    });
  });

  it("ignores missing sources and non-positive values", () => {
    expect(resolveTreatmentTimes(crown, [null, undefined, { appointmentsMin: 0 }])).toMatchObject({
      minAppointments: 2,
      maxAppointments: 3,
    });
  });
});

describe("estimatePlanAppointments", () => {
  it("adds up visits per clinical stage and in total", () => {
    const estimate = estimatePlanAppointments([implant, scaling, crown]);
    expect(estimate.stages).toEqual([
      expect.objectContaining({ key: "periodontal", minAppointments: 2, maxAppointments: 4 }),
      expect.objectContaining({ key: "surgical", minAppointments: 3, maxAppointments: 5 }),
      expect.objectContaining({ key: "prosthetic", minAppointments: 2, maxAppointments: 3 }),
    ]);
    expect(estimate.total).toEqual({ minAppointments: 7, maxAppointments: 12 });
    expect(estimate.chairMinutes).toBeNull();
  });

  it("reports chair time only when every treatment has a duration", () => {
    const durations = new Map([
      [implant, { durationMin: 60 }],
      [crown, { durationMin: 30 }],
    ]);
    const estimate = estimatePlanAppointments([implant, crown], (item) => [durations.get(item)]);
    // 60 × 3–5 + 30 × 2–3
    expect(estimate.chairMinutes).toEqual({ minMinutes: 240, maxMinutes: 390 });
    expect(
      estimatePlanAppointments([implant, scaling], (item) => [durations.get(item)]),
    ).toMatchObject({ chairMinutes: null });
  });

  it("is empty for a plan without treatments", () => {
    expect(estimatePlanAppointments([])).toEqual({
      stages: [],
      total: { minAppointments: 0, maxAppointments: 0 },
      chairMinutes: null,
    });
  });
});

describe("labels", () => {
  it("formats visits", () => {
    expect(appointmentRangeLabel({ minAppointments: 1, maxAppointments: 1 })).toBe("1 cita");
    expect(appointmentRangeLabel({ minAppointments: 2, maxAppointments: 2 })).toBe("2 citas");
    expect(appointmentRangeLabel({ minAppointments: 2, maxAppointments: 4 })).toBe("2–4 citas");
  });

  it("formats chair time in minutes or hours", () => {
    expect(chairTimeLabel({ minMinutes: 45, maxMinutes: 45 })).toBe("45 min en el sillón");
    expect(chairTimeLabel({ minMinutes: 30, maxMinutes: 50 })).toBe("30–50 min en el sillón");
    expect(chairTimeLabel({ minMinutes: 240, maxMinutes: 390 })).toBe("4–6,5 h en el sillón");
    expect(chairTimeLabel({ minMinutes: 120, maxMinutes: 120 })).toBe("2 h en el sillón");
  });
});
