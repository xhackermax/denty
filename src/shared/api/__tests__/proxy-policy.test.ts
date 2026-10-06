import { describe, expect, it } from "vitest";

import { isAllowedDentyProxyRoute } from "../proxy-policy";

describe("Denty proxy route policy", () => {
  it("allows admin user deletion through the runtime route contract", () => {
    expect(isAllowedDentyProxyRoute("DELETE", "/api/users/user-1")).toBe(true);
  });

  it("allows recently added browser routes through the runtime route contract", () => {
    expect(isAllowedDentyProxyRoute("GET", "/api/laboratory-price-list")).toBe(true);
    expect(isAllowedDentyProxyRoute("POST", "/api/laboratory-price-list")).toBe(true);
    expect(
      isAllowedDentyProxyRoute("POST", "/api/patients/patient-1/clinical-plan/reorder"),
    ).toBe(true);
  });
});
