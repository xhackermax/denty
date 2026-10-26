import { describe, expect, it } from "vitest";

import manifest from "../../../../docs/legacy-api-routes.json" with { type: "json" };
import { isAllowedDentyProxyRoute } from "../proxy-policy";

function samplePath(pattern: string): string {
  return pattern
    .split("/")
    .map((segment) => (segment.startsWith(":") ? "sample-id" : segment))
    .join("/");
}

describe("Denty proxy route policy", () => {
  it("allows admin user deletion through the runtime route contract", () => {
    expect(isAllowedDentyProxyRoute("DELETE", "/api/users/user-1")).toBe(true);
  });

  it("allows recently added browser routes through the runtime route contract", () => {
    expect(isAllowedDentyProxyRoute("GET", "/api/laboratory-price-list")).toBe(true);
    expect(isAllowedDentyProxyRoute("POST", "/api/laboratory-price-list")).toBe(true);
    expect(isAllowedDentyProxyRoute("POST", "/api/patients/patient-1/clinical-plan/reorder")).toBe(
      true,
    );
  });

  it("lets the buttons added since October reach their server routes", () => {
    expect(isAllowedDentyProxyRoute("POST", "/api/supplier-invoices/inv-1/document")).toBe(true);
    expect(isAllowedDentyProxyRoute("GET", "/api/supplier-invoices/inv-1/document")).toBe(true);
    expect(isAllowedDentyProxyRoute("GET", "/api/analytics/new-patients")).toBe(true);
    expect(isAllowedDentyProxyRoute("GET", "/api/tasks/assignees")).toBe(true);
    expect(isAllowedDentyProxyRoute("POST", "/api/documents/privacy-notice")).toBe(true);
    expect(isAllowedDentyProxyRoute("POST", "/api/documents/debt-acknowledgement")).toBe(true);
    expect(isAllowedDentyProxyRoute("GET", "/api/recovery/worklist")).toBe(true);
    expect(isAllowedDentyProxyRoute("POST", "/api/patients/patient-1/clinical-plan/branches")).toBe(
      true,
    );
  });

  // The documented manifest is what CI checks; the runtime copy drifted from it and
  // silently answered 404 to working server routes.
  it("allows every browser route of the documented API manifest", () => {
    const blocked = manifest.routes
      .filter((route) => route.kind === "browser")
      .filter((route) => !isAllowedDentyProxyRoute(route.method, samplePath(route.path)))
      .map((route) => `${route.method} ${route.path}`);
    expect(blocked).toEqual([]);
  });
});
