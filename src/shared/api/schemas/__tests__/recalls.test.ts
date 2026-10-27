import { describe, expect, it } from "vitest";

import {
  recallActionSchema,
  recallAssignSchema,
  recallBulkSchema,
  recallListFiltersSchema,
  recallTemplateInputSchema,
} from "../recalls";

const template = {
  code: "HIGIENE",
  name: "Higiene semestral",
  category: "GENERAL",
  description: null,
  intervalValue: 6,
  intervalUnit: "MESES",
  anchorType: "FECHA_MANUAL",
  leadDays: 14,
  maxAttempts: 3,
  autoRecurrence: true,
  autoEnroll: false,
  messagingEnabled: false,
  channels: [],
  reminderOffsets: [],
  messageTemplateKey: null,
  defaultSiteId: null,
  defaultStaffId: null,
  active: true,
};

describe("recallTemplateInputSchema", () => {
  it("accepts a complete template and trims the name", () => {
    expect(recallTemplateInputSchema.parse({ ...template, name: "  Higiene  " }).name).toBe(
      "Higiene",
    );
  });

  it("rejects codes with lowercase letters or spaces", () => {
    expect(recallTemplateInputSchema.safeParse({ ...template, code: "higiene 6" }).success).toBe(
      false,
    );
  });

  it("enforces the ranges of the form", () => {
    for (const patch of [
      { name: "ab" },
      { intervalValue: 0 },
      { intervalValue: 121 },
      { leadDays: 181 },
      { maxAttempts: 11 },
      { description: "x".repeat(1001) },
    ]) {
      expect(recallTemplateInputSchema.safeParse({ ...template, ...patch }).success).toBe(false);
    }
  });

  it("requires channels and distinct reminder days when messaging is enabled", () => {
    const enabled = { ...template, messagingEnabled: true };
    expect(recallTemplateInputSchema.safeParse(enabled).success).toBe(false);
    expect(
      recallTemplateInputSchema.safeParse({
        ...enabled,
        channels: ["SMS"],
        reminderOffsets: [14, 14],
      }).success,
    ).toBe(false);
    expect(
      recallTemplateInputSchema.safeParse({
        ...enabled,
        channels: ["SMS"],
        reminderOffsets: [14, -3],
      }).success,
    ).toBe(true);
  });
});

describe("recallAssignSchema", () => {
  it("defaults to a real assignment and caps the batch at 500 patients", () => {
    expect(recallAssignSchema.parse({ patientIds: ["p1"] })).toMatchObject({
      dryRun: false,
      dueOverrides: {},
    });
    expect(
      recallAssignSchema.safeParse({ patientIds: Array.from({ length: 501 }, (_, i) => `p${i}`) })
        .success,
    ).toBe(false);
    expect(recallAssignSchema.safeParse({ patientIds: [] }).success).toBe(false);
  });

  it("validates per-patient dates", () => {
    expect(
      recallAssignSchema.safeParse({ patientIds: ["p1"], dueOverrides: { p1: "31/12/2026" } })
        .success,
    ).toBe(false);
  });
});

describe("recallActionSchema", () => {
  it("requires the data each action needs", () => {
    expect(recallActionSchema.safeParse({ action: "POSTPONE", payload: {} }).success).toBe(false);
    expect(
      recallActionSchema.safeParse({ action: "POSTPONE", payload: { until: "2026-12-01" } })
        .success,
    ).toBe(true);
    expect(recallActionSchema.safeParse({ action: "RESCHEDULE", payload: {} }).success).toBe(false);
    expect(recallActionSchema.safeParse({ action: "LINK_APPOINTMENT", payload: {} }).success).toBe(
      false,
    );
    expect(recallActionSchema.parse({ action: "CONTACT" })).toMatchObject({ payload: {} });
  });
});

describe("recallBulkSchema", () => {
  it("only allows actions that make sense in bulk", () => {
    expect(recallBulkSchema.safeParse({ ids: ["r1"], action: "COMPLETE" }).success).toBe(false);
    expect(recallBulkSchema.safeParse({ ids: ["r1"], action: "CANCEL" }).success).toBe(true);
  });
});

describe("recallListFiltersSchema", () => {
  it("coerces paging and drops empty filters", () => {
    expect(recallListFiltersSchema.parse({ page: "2", pageSize: "50", search: "" })).toEqual({
      page: 2,
      pageSize: 50,
      includeClosed: false,
    });
  });
});
