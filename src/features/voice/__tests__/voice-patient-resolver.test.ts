import { describe, expect, it } from "vitest";

import { resolveVoicePatient, type VoicePatientCandidate } from "../voice-patient-resolver";

const PATIENTS: readonly VoicePatientCandidate[] = [
  { id: "patient-1", firstName: "María", lastName: "García", recordNumber: "000104" },
  { id: "patient-2", firstName: "Álvaro", lastName: "Ruiz", recordNumber: "000205" },
];

describe("voice patient resolver", () => {
  it("resolves an exact patient name ignoring accents", () => {
    const matches = resolveVoicePatient("maria garcia", PATIENTS);
    expect(matches[0]?.id).toBe("patient-1");
    expect(matches[0]?.score).toBeGreaterThanOrEqual(0.99);
  });

  it("resolves a record number", () => {
    const matches = resolveVoicePatient("000104", PATIENTS);
    expect(matches[0]?.id).toBe("patient-1");
  });
});
