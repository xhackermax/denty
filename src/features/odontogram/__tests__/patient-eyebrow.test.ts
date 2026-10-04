import { describe, expect, it } from "vitest";

import { patientEyebrow } from "../patient-eyebrow";

describe("patientEyebrow", () => {
  it("names the patient and their record number, never the internal id", () => {
    expect(
      patientEyebrow({ firstName: "Lucía", lastName: "Martín Pérez", recordNumber: "DNT-0042" }),
    ).toBe("Lucía Martín Pérez · DNT-0042");
  });

  it("falls back to a neutral label while the patient loads or fails", () => {
    expect(patientEyebrow(undefined)).toBe("Paciente");
  });

  it("trims stray spaces so a blank surname leaves no gap", () => {
    expect(patientEyebrow({ firstName: " Ana ", lastName: " ", recordNumber: "7" })).toBe(
      "Ana · 7",
    );
  });
});
