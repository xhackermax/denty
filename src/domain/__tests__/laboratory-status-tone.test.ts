import { describe, expect, it } from "vitest";

import { LABORATORY_STATUS_LABELS, laboratoryStatusTone } from "../state-machines";

describe("laboratoryStatusTone", () => {
  it("maps every lab status to its border colour family", () => {
    expect(["PLANNED", "IMPRESSION_TAKEN", "SCANNED"].map(laboratoryStatusTone)).toEqual([
      "pending",
      "pending",
      "pending",
    ]);
    expect(["SENT", "IN_PRODUCTION", "TRIAL"].map(laboratoryStatusTone)).toEqual([
      "sent",
      "sent",
      "sent",
    ]);
    expect(["RECEIVED", "PLACED"].map(laboratoryStatusTone)).toEqual(["done", "done"]);
    expect(laboratoryStatusTone("INCIDENT")).toBe("incident");
    expect(laboratoryStatusTone("CANCELLED")).toBe("cancelled");
  });

  it("has a Spanish label for every status", () => {
    expect(LABORATORY_STATUS_LABELS.INCIDENT).toBe("Incidencia");
    expect(Object.keys(LABORATORY_STATUS_LABELS)).toHaveLength(10);
  });
});
