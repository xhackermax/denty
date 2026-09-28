import assert from "node:assert/strict";
import {
  implantSurgeryDataHref,
  implantSurgeryReminderForAppointment,
  missingImplantSurgeryFields,
} from "../src/domain/implant-surgery-reminder.ts";

const reminder = implantSurgeryReminderForAppointment(
  {
    patientId: "juan-perez",
    reason: "Cirugía implantes 14 y 16",
    startsAt: "2026-09-26T10:00:00+02:00",
    status: "CONFIRMED",
  },
  "2026-09-26",
);
assert.equal(reminder?.patientId, "juan-perez");
assert.equal(reminder?.href, "/app/patients/juan-perez/odontogram?action=implant-surgery");
assert.equal(reminder?.title, "Completar datos del implante colocado");

assert.equal(
  implantSurgeryReminderForAppointment(
    {
      patientId: "juan-perez",
      reason: "Revisión implante 46",
      startsAt: "2026-09-26T10:00:00+02:00",
      status: "CONFIRMED",
    },
    "2026-09-26",
  ),
  null,
);

assert.equal(
  implantSurgeryReminderForAppointment(
    {
      patientId: "juan-perez",
      reason: "Cirugía implantes 14 y 16",
      startsAt: "2026-09-27T10:00:00+02:00",
      status: "CONFIRMED",
    },
    "2026-09-26",
  ),
  null,
);

assert.equal(
  implantSurgeryReminderForAppointment(
    {
      patientId: "juan-perez",
      reason: "Cirugía implantes + prótesis inmediata",
      startsAt: "2026-09-26T12:00:00+02:00",
      status: "CONFIRMED",
    },
    "2026-09-26",
  )?.patientId,
  "juan-perez",
);

assert.equal(
  implantSurgeryReminderForAppointment(
    {
      patientId: "juan-perez",
      reason: "Cirugía implantes 14 y 16",
      startsAt: "2026-09-26T10:00:00+02:00",
      status: "COMPLETED",
    },
    "2026-09-26",
  ),
  null,
);

assert.deepEqual(
  missingImplantSurgeryFields({
    system: "Ticare",
    diameterMm: 4.25,
    lengthMm: 10,
    placementDate: "2026-09-26",
    insertionTorqueNcm: 40,
    primaryIsq: 71,
  }),
  [],
);
assert.deepEqual(
  missingImplantSurgeryFields({
    system: "Ticare",
    diameterMm: 4.25,
  }),
  ["lengthMm", "placementDate", "insertionTorqueNcm", "primaryIsq"],
);

assert.equal(
  implantSurgeryDataHref("juan perez"),
  "/app/patients/juan%20perez/odontogram?action=implant-surgery",
);

console.log("implant surgery reminder regression: OK");
