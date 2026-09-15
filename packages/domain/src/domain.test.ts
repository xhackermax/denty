import { describe, expect, it } from "vitest";
import { calculateFinanceSummary, canRoleAccess, createConsentDocument } from "./index";

describe("domain permissions", () => {
  it("keeps operational users out of admin settings", () => {
    expect(canRoleAccess("operational", "manageSettings")).toBe(false);
    expect(canRoleAccess("operational", "managePatients")).toBe(true);
    expect(canRoleAccess("admin", "manageSettings")).toBe(true);
  });
});

describe("consent documents", () => {
  it("autofills patient clinician site and date", () => {
    const document = createConsentDocument({
      id: "doc-1",
      patient: { id: "p1", firstName: "Maria", lastName: "Lopez" },
      clinician: { id: "u1", name: "Dra. Seneida", role: "operational" },
      site: { id: "s1", name: "Paseo Damas", address: "Zaragoza" },
      template: { id: "ci", title: "CI Endodoncia", version: 1, active: true, body: "Texto clinico" },
      date: "15/09/2026"
    });

    expect(document.body).toContain("Maria Lopez");
    expect(document.body).toContain("Dra. Seneida");
    expect(document.body).toContain("Paseo Damas");
    expect(document.body).toContain("15/09/2026");
    expect(document.body).toContain("pendiente de firma digital");
  });
});

describe("finance", () => {
  it("calculates pending amount", () => {
    expect(calculateFinanceSummary([{ total: 100, paid: 25 }, { total: 50, paid: 50 }])).toEqual({
      totalBudgeted: 150,
      paid: 75,
      pending: 75
    });
  });
});
