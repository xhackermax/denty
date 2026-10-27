import { describe, expect, it } from "vitest";

import {
  addRecallInterval,
  deriveRecallState,
  normalizeRecallCode,
  recallDueAt,
  recallKindForTemplate,
  RECALL_STATE_LABELS,
} from "../recalls";

describe("addRecallInterval", () => {
  it("adds days and weeks on the clinic calendar", () => {
    expect(addRecallInterval("2026-10-27", 10, "DIAS")).toBe("2026-11-06");
    expect(addRecallInterval("2026-12-28", 2, "SEMANAS")).toBe("2027-01-11");
  });

  it("keeps the day of month and falls back to the month's last day", () => {
    expect(addRecallInterval("2026-03-15", 6, "MESES")).toBe("2026-09-15");
    expect(addRecallInterval("2026-08-31", 6, "MESES")).toBe("2027-02-28");
    expect(addRecallInterval("2027-08-31", 6, "MESES")).toBe("2028-02-29");
    expect(addRecallInterval("2026-01-31", 120, "MESES")).toBe("2036-01-31");
  });

  it("is not affected by daylight saving changes", () => {
    expect(addRecallInterval("2026-10-24", 1, "DIAS")).toBe("2026-10-25");
    expect(addRecallInterval("2026-03-28", 1, "SEMANAS")).toBe("2026-04-04");
  });

  it("rejects out of range intervals and malformed dates", () => {
    expect(() => addRecallInterval("2026-10-27", 0, "MESES")).toThrow("INVALID_RECALL_INTERVAL");
    expect(() => addRecallInterval("2026-10-27", 121, "MESES")).toThrow("INVALID_RECALL_INTERVAL");
    expect(() => addRecallInterval("2026-10-27", 1.5, "DIAS")).toThrow("INVALID_RECALL_INTERVAL");
    expect(() => addRecallInterval("2026-02-30", 1, "DIAS")).toThrow("INVALID_RECALL_DATE");
    expect(() => addRecallInterval("27/10/2026", 1, "DIAS")).toThrow("INVALID_RECALL_DATE");
  });
});

describe("recallDueAt", () => {
  it("stores 09:00 Madrid time as UTC in winter and summer", () => {
    expect(recallDueAt("2027-01-15")).toBe("2027-01-15T08:00:00.000Z");
    expect(recallDueAt("2027-07-15")).toBe("2027-07-15T07:00:00.000Z");
  });
});

describe("normalizeRecallCode", () => {
  it("builds an uppercase code without accents or spaces", () => {
    expect(normalizeRecallCode("  Revisión de implantes ")).toBe("REVISION_DE_IMPLANTES");
    expect(normalizeRecallCode("Higiene 6-meses!!")).toBe("HIGIENE_6_MESES");
  });

  it("caps the length at 48 characters", () => {
    expect(normalizeRecallCode("a".repeat(80))).toHaveLength(48);
  });

  it("returns an empty string when nothing usable is left", () => {
    expect(normalizeRecallCode("¿¿??")).toBe("");
  });
});

describe("recallKindForTemplate", () => {
  it("prefixes the template code so it never collides with automatic reviews", () => {
    expect(recallKindForTemplate("HIGIENE")).toBe("RECALL_HIGIENE");
  });
});

describe("deriveRecallState", () => {
  const now = "2026-10-27T10:00:00Z";
  const base = {
    status: "pending" as const,
    dueAt: "2026-12-27T08:00:00Z",
    closeReason: null,
    pausedUntil: null,
  };

  it("labels future pending recalls as scheduled", () => {
    expect(deriveRecallState(base, 14, now)).toBe("PROGRAMADO");
  });

  it("labels recalls inside the lead window as upcoming, inclusive", () => {
    expect(deriveRecallState({ ...base, dueAt: "2026-11-10T10:00:00Z" }, 14, now)).toBe("PROXIMO");
    expect(deriveRecallState({ ...base, dueAt: "2026-11-10T10:00:01Z" }, 14, now)).toBe(
      "PROGRAMADO",
    );
    expect(deriveRecallState({ ...base, dueAt: "2026-10-27T10:00:00Z" }, 0, now)).toBe("PROXIMO");
  });

  it("labels pending or contacted recalls past due as overdue", () => {
    const due = "2026-10-20T08:00:00Z";
    expect(deriveRecallState({ ...base, dueAt: due }, 14, now)).toBe("VENCIDO");
    expect(deriveRecallState({ ...base, status: "contacted", dueAt: due }, 14, now)).toBe(
      "VENCIDO",
    );
  });

  it("keeps contacted recalls that are not yet due as contacted", () => {
    expect(deriveRecallState({ ...base, status: "contacted" }, 14, now)).toBe("CONTACTADO");
  });

  it("shows postponed recalls while the pause lasts, even if overdue", () => {
    const paused = { ...base, dueAt: "2026-10-01T08:00:00Z", pausedUntil: "2026-11-01T00:00:00Z" };
    expect(deriveRecallState(paused, 14, now)).toBe("POSPUESTO");
    expect(deriveRecallState({ ...paused, pausedUntil: "2026-10-26T00:00:00Z" }, 14, now)).toBe(
      "VENCIDO",
    );
  });

  it("maps booked, closed and superseded recalls", () => {
    expect(deriveRecallState({ ...base, status: "booked" }, 14, now)).toBe("CITA_PROGRAMADA");
    expect(
      deriveRecallState({ ...base, status: "dismissed", closeReason: "COMPLETED" }, 14, now),
    ).toBe("COMPLETADO");
    expect(
      deriveRecallState({ ...base, status: "dismissed", closeReason: "CANCELLED" }, 14, now),
    ).toBe("CANCELADO");
    // Legacy rows were dismissed without a reason: they were never confirmed as done.
    expect(deriveRecallState({ ...base, status: "dismissed" }, 14, now)).toBe("CANCELADO");
    expect(deriveRecallState({ ...base, status: "superseded" }, 14, now)).toBe("REEMPLAZADO");
  });

  it("has a Spanish label for every state", () => {
    expect(Object.keys(RECALL_STATE_LABELS)).toHaveLength(9);
    expect(RECALL_STATE_LABELS.VENCIDO).toBe("Vencido");
  });
});
