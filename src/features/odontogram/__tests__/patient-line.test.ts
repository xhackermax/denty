import { describe, expect, it } from "vitest";

import { patientLine } from "../patient-line";

describe("patientLine", () => {
  it("names the patient and their record number, never the internal id", () => {
    expect(
      patientLine({ firstName: "Lucía", lastName: "Martín Pérez", recordNumber: "DNT-0042" }),
    ).toBe("Lucía Martín Pérez · DNT-0042");
  });

  it("falls back to a neutral label while the patient loads or fails", () => {
    expect(patientLine(undefined)).toBe("Paciente");
  });

  it("trims stray spaces so a blank surname leaves no gap", () => {
    expect(patientLine({ firstName: " Ana ", lastName: " ", recordNumber: "7" })).toBe("Ana · 7");
  });
});
