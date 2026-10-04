import { describe, expect, it } from "vitest";

import {
  dentalEntitySchema,
  odontogramBatchSchema,
  periodontalExamSiteSchema,
  periodontalMeasurementSchema,
} from "../clinical";

const entity = (override: Record<string, unknown> = {}) => ({
  id: "e1",
  tooth: "36",
  entityType: "CARIES",
  status: "caries_pending",
  surfaces: ["O"],
  active: true,
  ...override,
});

describe("odontogram entity contract", () => {
  it.each(["11", "18", "28", "38", "48", "51", "55", "65", "75", "85"])(
    "accepts FDI tooth %s",
    (tooth) => {
      expect(dentalEntitySchema.safeParse(entity({ tooth })).success).toBe(true);
    },
  );

  it.each(["99", "00", "10", "19", "56", "86", "", " 11 ", "１１", "🦷"])(
    "rejects tooth %j",
    (tooth) => {
      expect(dentalEntitySchema.safeParse(entity({ tooth })).success).toBe(false);
    },
  );

  it("accepts arch-level entities without a tooth", () => {
    const { tooth: _tooth, ...archLevel } = entity({ entityType: "REMOVABLE", arch: "upper" });
    expect(dentalEntitySchema.safeParse(archLevel).success).toBe(true);
  });

  it.each(["X", "", "MOD", " V M ", "o"])("rejects surface %j", (surface) => {
    expect(dentalEntitySchema.safeParse(entity({ surfaces: [surface] })).success).toBe(false);
  });

  it.each([" ", "\n", "UNKNOWN", "caries"])("rejects entity type %j", (entityType) => {
    expect(dentalEntitySchema.safeParse(entity({ entityType })).success).toBe(false);
  });

  it.each([" ", "\t\n", "💥", "Caries Pending", "x".repeat(81)])(
    "rejects malformed status %j",
    (status) => {
      expect(dentalEntitySchema.safeParse(entity({ status })).success).toBe(false);
    },
  );

  it("keeps specialised statuses the panels record", () => {
    for (const status of ["tibase", "peri_implantitis", "retreatment", "extraction_completed"]) {
      expect(dentalEntitySchema.safeParse(entity({ status })).success).toBe(true);
    }
  });

  it.each(["middle", "UPPER"])("rejects arch %j", (arch) => {
    expect(dentalEntitySchema.safeParse(entity({ arch })).success).toBe(false);
  });

  it("rejects a batch that sends the same id twice", () => {
    const first = entity();
    expect(
      odontogramBatchSchema.safeParse({
        expectedVersion: 1,
        entities: [first, { ...first, status: "caries_active" }],
      }).success,
    ).toBe(false);
  });
});

describe("periodontal measurement contract", () => {
  const site = { tooth: "16", site: "MV", probingDepth: 3, recession: 0 };

  it.each([
    { probingDepth: 16 },
    { probingDepth: 1_000_000_000 },
    { probingDepth: -1 },
    { recession: -6 },
    { recession: 16 },
    { mobility: 4 },
    { furcation: 4 },
  ])("rejects %j", (variation) => {
    expect(periodontalMeasurementSchema.safeParse({ ...site, ...variation }).success).toBe(false);
    expect(periodontalExamSiteSchema.safeParse({ ...site, ...variation }).success).toBe(false);
  });

  it("accepts the program's limits", () => {
    const limits = { ...site, probingDepth: 15, recession: -5, mobility: 3, furcation: 3 };
    expect(periodontalMeasurementSchema.safeParse(limits).success).toBe(true);
    expect(periodontalExamSiteSchema.safeParse(limits).success).toBe(true);
  });
});
