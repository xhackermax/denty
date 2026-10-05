import { expect, test } from "vitest";
import { nextRecordNumber } from "../record-number";

test("starts at 1 for an empty clinic", () => {
  expect(nextRecordNumber([])).toBe("DNT-000001");
});

test("continues from the highest sequential number", () => {
  expect(nextRecordNumber(["DNT-000009", "DNT-000123", "42"])).toBe("DNT-000124");
});

test("ignores legacy date and uuid style numbers", () => {
  expect(nextRecordNumber(["DNT-20261005-AB12CD34", "DNT-1A2B3C4D", "DNT-000007"])).toBe(
    "DNT-000008",
  );
});
