import { describe, expect, it } from "vitest";

import {
  implantSurgeryDataHref,
  implantSurgeryReminderForAppointment,
  missingImplantSurgeryFields,
} from "../implant-surgery-reminder";

describe("implant surgery-day reminder", () => {
  it("deep-links today's implant surgery into the Surgery odontogram", () => {
    const reminder = implantSurgeryReminderForAppointment(
      { patientId: "patient 1", reason: "Cirugía colocación de implantes", startsAt: "2026-09-27T08:00:00+02:00" },
      "2026-09-27",
    );
    expect(reminder?.href).toBe(implantSurgeryDataHref("patient 1"));
    expect(reminder?.href).toContain("action=implant-surgery");
  });

  it("requires all six actual fields and no optional field", () => {
    expect(missingImplantSurgeryFields({
      system: "Ticare INHEX",
      diameterMm: 4.25,
      lengthMm: 10,
      placementDate: "2026-09-27",
      insertionTorqueNcm: 40,
      primaryIsq: 71,
    })).toEqual([]);
  });
});
