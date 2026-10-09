import { expect, test } from "vitest";
import { nextRecordNumber, normalizeImportedRecordNumber } from "../record-number";

test("starts at 00001 without a prefix for an empty clinic", () => {
  expect(nextRecordNumber([])).toBe("00001");
});

test("continues beyond existing imported records and older prefixed numbers", () => {
  expect(nextRecordNumber(["DNT-000009", "DNT-000123", "42", "5015"])).toBe("05016");
});

test("ignores legacy date and UUID style identifiers in numeric sequencing", () => {
  expect(nextRecordNumber(["DNT-20261005-AB12CD34", "DNT-1A2B3C4D", "DNT-000007"])).toBe(
    "00008",
  );
});

test("keeps the numeric sequence usable beyond five digits", () => {
  expect(nextRecordNumber(["99999"])).toBe("100000");
});

test("converts older prefixed import numbers without rewriting external identifiers", () => {
  expect(normalizeImportedRecordNumber(" dnt-000123 ")).toBe("00123");
  expect(normalizeImportedRecordNumber("42")).toBe("42");
  expect(normalizeImportedRecordNumber("CLINICCLOUD-ABC")).toBe("CLINICCLOUD-ABC");
});
