import assert from "node:assert/strict";

import { implantSurgeryDataFromAttributes } from "../src/domain/implant-surgery-reminder.ts";

const empty = implantSurgeryDataFromAttributes({});

for (const field of ["diameterMm", "lengthMm", "insertionTorqueNcm", "primaryIsq"] as const) {
  assert.equal(
    Object.prototype.hasOwnProperty.call(empty, field),
    false,
    `${field} must be omitted when the surgical value is unknown`,
  );
}

assert.equal(empty.system, "");
assert.equal(empty.placementDate, "");

const populated = implantSurgeryDataFromAttributes({
  system: "Ticare INHEX",
  diameterMm: 4.25,
  lengthMm: 10,
  placementDate: "2026-09-26",
  insertionTorqueNcm: 40,
  primaryIsq: 71,
  lotNumber: "LOT-123",
});

assert.equal(populated.diameterMm, 4.25);
assert.equal(populated.lengthMm, 10);
assert.equal(populated.insertionTorqueNcm, 40);
assert.equal(populated.primaryIsq, 71);
assert.equal(populated.lotNumber, "LOT-123");

console.log("implant surgery exact optional regression: OK");
