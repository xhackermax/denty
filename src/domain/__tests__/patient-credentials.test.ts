import { describe, expect, it } from "vitest";

import { initialPatientPassword } from "../patient-credentials";

describe("initialPatientPassword", () => {
  it("uses the DNI in its canonical form", () => {
    expect(initialPatientPassword("12345678Z")).toBe("12345678Z");
    expect(initialPatientPassword(" 12.345.678-z ")).toBe("12345678Z");
    expect(initialPatientPassword("x-1234567-l")).toBe("X1234567L");
  });

  it("returns null when there is no usable document", () => {
    expect(initialPatientPassword(null)).toBeNull();
    expect(initialPatientPassword(undefined)).toBeNull();
    expect(initialPatientPassword("")).toBeNull();
    expect(initialPatientPassword("Menor")).toBeNull();
    expect(initialPatientPassword("123")).toBeNull();
    expect(initialPatientPassword("1234 5678ñ")).toBeNull();
  });
});
