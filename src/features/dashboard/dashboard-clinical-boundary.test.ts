import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Dashboard clinical context boundary", () => {
  it("does not render a patient pipeline without a patient context", () => {
    const dashboard = readFileSync(new URL("./dashboard.tsx", import.meta.url), "utf8");
    expect(dashboard).not.toContain("ClinicalPipelineCard");
    expect(dashboard).not.toContain("Gestión y seguimiento");
    expect(dashboard).toContain("Economía de la clínica");
    expect(dashboard).toContain("canReadFinance ? (");
  });
});
