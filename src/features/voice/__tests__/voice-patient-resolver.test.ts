import { describe, expect, it } from "vitest";

import { DEMO_PATIENTS } from "@/shared/demo/demo-data";
import { resolveVoicePatient } from "../voice-patient-resolver";

describe("voice patient resolver", () => {
  it("resolves an exact patient name ignoring accents", () => {
    const matches = resolveVoicePatient("juan perez", DEMO_PATIENTS);
    expect(matches[0]?.id).toBe("juan-perez");
    expect(matches[0]?.score).toBeGreaterThanOrEqual(0.99);
  });

  it("resolves a record number", () => {
    const matches = resolveVoicePatient("000104", DEMO_PATIENTS);
    expect(matches[0]?.id).toBe("juan-perez");
  });
});
