import { describe, expect, it } from "vitest";

import {
  buildAdmissionPayload,
  dentalMedicalAdmissionOptions,
  suggestedDentitionForBirthDate,
} from "./patient-admission";

describe("patient admission workflow", () => {
  it("suggests the odontogram dentition from the patient birth date", () => {
    expect(suggestedDentitionForBirthDate("2021-09-22", "2026-09-23")).toBe("primary");
    expect(suggestedDentitionForBirthDate("2017-09-22", "2026-09-23")).toBe("mixed");
    expect(suggestedDentitionForBirthDate("1990-09-22", "2026-09-23")).toBe("permanent");
  });

  it("keeps common dental risk options available for anamnesis", () => {
    expect(dentalMedicalAdmissionOptions.conditions).toContainEqual(
      expect.objectContaining({ value: "diabetes", label: expect.stringMatching(/diabetes/i) }),
    );
    expect(dentalMedicalAdmissionOptions.conditions).toContainEqual(
      expect.objectContaining({ value: "endocarditis_risk" }),
    );
    expect(dentalMedicalAdmissionOptions.medications).toContainEqual(
      expect.objectContaining({ value: "anticoagulants" }),
    );
    expect(dentalMedicalAdmissionOptions.allergies).toContainEqual(
      expect.objectContaining({ value: "local_anesthetic" }),
    );
  });

  it("builds a create patient payload with ISO birth date and clinical anamnesis", () => {
    expect(
      buildAdmissionPayload({
        firstName: "Sofia",
        lastName: "Ruiz",
        birthDate: "2021-11-14",
        dni: "Menor",
        phone: "+34 600 731 100",
        email: "tutor.sofia@example.test",
        allergies: ["latex"],
        medications: ["bisphosphonates"],
        conditions: ["radiotherapy_head_neck", "asthma"],
        dentalRisks: ["bruxism"],
        notes: "Acude con tutor legal.",
      }),
    ).toMatchObject({
      firstName: "Sofia",
      lastName: "Ruiz",
      birthDate: "2021-11-14T00:00:00.000+02:00",
      dni: "Menor",
      phone: "+34 600 731 100",
      email: "tutor.sofia@example.test",
      medicalProfile: {
        allergies: ["latex"],
        medications: ["bisphosphonates"],
        conditions: ["radiotherapy_head_neck", "asthma"],
        dentalRisks: ["bruxism"],
        notes: "Acude con tutor legal.",
        dentitionStage: "primary",
      },
    });
  });
});
