import { describe, expect, it } from "vitest";

import {
  patientIdFromPathname,
  previewVoiceCommand,
  primaryHrefForVoicePlan,
} from "../voice-router";

describe("voice router", () => {
  it("extracts the active patient from staff patient routes", () => {
    expect(patientIdFromPathname("/app/patients/patient-42/odontogram")).toBe("patient-42");
    expect(patientIdFromPathname("/app/agenda")).toBeUndefined();
  });

  it("keeps clinical navigation on the active patient", () => {
    const preview = previewVoiceCommand("endodoncia realizada en 22", {
      pathname: "/app/patients/patient-42/odontogram",
    });

    expect(preview.plan.contextPatientId).toBe("patient-42");
    expect(primaryHrefForVoicePlan(preview.plan)).toBe("/app/patients/patient-42/odontogram");
  });

  it("does not fall back to a hardcoded demo patient", () => {
    const preview = previewVoiceCommand("hay que hacer endodoncia 22", {
      pathname: "/app/agenda",
    });

    expect(primaryHrefForVoicePlan(preview.plan)).toBe("/app/patients");
  });
  it("opens the resolved patient profile instead of the generic patient list", () => {
    const preview = previewVoiceCommand("Oye Denty abre el paciente Juan Pérez");
    const resolved = {
      ...preview.plan,
      contextPatientId: "juan-perez",
    };
    expect(primaryHrefForVoicePlan(resolved)).toBe("/app/patients/juan-perez");
  });
});
