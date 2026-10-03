import { describe, expect, it } from "vitest";

import {
  buildMonthGrid,
  monthBoundsMadrid,
  monthOf,
  shiftMonth,
  summarizeAppointmentsByDay,
} from "../month-calendar";

describe("summarizeAppointmentsByDay", () => {
  it("groups by the Madrid calendar day, not the UTC one", () => {
    const days = summarizeAppointmentsByDay([
      // 23:30 UTC on 1 Oct is already 2 Oct in Madrid (UTC+2).
      { startsAt: "2026-10-01T23:30:00Z", patientId: "p1", status: "PLANNED" },
      { startsAt: "2026-10-02T08:00:00Z", patientId: "p2", status: "CONFIRMED" },
    ]);
    expect(days).toEqual([{ date: "2026-10-02", count: 2, patientIds: ["p1", "p2"] }]);
  });

  it("ignores cancelled appointments and keeps at most three distinct patients", () => {
    const days = summarizeAppointmentsByDay([
      { startsAt: "2026-10-05T07:00:00Z", patientId: "a", status: "PLANNED" },
      { startsAt: "2026-10-05T08:00:00Z", patientId: "a", status: "PLANNED" },
      { startsAt: "2026-10-05T09:00:00Z", patientId: "b", status: "CANCELLED" },
      { startsAt: "2026-10-05T10:00:00Z", patientId: "c", status: "COMPLETED" },
      { startsAt: "2026-10-05T11:00:00Z", patientId: "d", status: "ARRIVED" },
      { startsAt: "2026-10-05T12:00:00Z", patientId: "e", status: "NO_SHOW" },
    ]);
    expect(days).toEqual([{ date: "2026-10-05", count: 5, patientIds: ["a", "c", "d"] }]);
  });

  it("returns days in calendar order", () => {
    const days = summarizeAppointmentsByDay([
      { startsAt: "2026-10-20T07:00:00Z", patientId: "a", status: "PLANNED" },
      { startsAt: "2026-10-03T07:00:00Z", patientId: "b", status: "PLANNED" },
    ]);
    expect(days.map((day) => day.date)).toEqual(["2026-10-03", "2026-10-20"]);
  });
});

describe("monthBoundsMadrid", () => {
  it("covers the whole month in Madrid time", () => {
    expect(monthBoundsMadrid("2026-10")).toEqual({
      start: "2026-10-01T00:00:00+02:00",
      end: "2026-11-01T00:00:00+01:00",
    });
  });

  it("rejects malformed months", () => {
    expect(() => monthBoundsMadrid("2026-13")).toThrow();
    expect(() => monthBoundsMadrid("octubre")).toThrow();
  });
});

describe("month helpers", () => {
  it("reads and shifts months across years", () => {
    expect(monthOf("2026-10-03")).toBe("2026-10");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
});

describe("buildMonthGrid", () => {
  it("starts weeks on Monday and fills whole weeks", () => {
    const weeks = buildMonthGrid("2026-10", "2026-10-03");
    // 1 Oct 2026 is a Thursday.
    expect(weeks[0]?.map((day) => day.date)).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks.at(-1)?.at(-1)?.date).toBe("2026-11-01");
  });

  it("marks today and the days outside the month", () => {
    const days = buildMonthGrid("2026-10", "2026-10-03").flat();
    expect(days.find((day) => day.date === "2026-10-03")?.isToday).toBe(true);
    expect(days.filter((day) => day.isToday)).toHaveLength(1);
    expect(days.find((day) => day.date === "2026-09-30")?.inMonth).toBe(false);
    expect(days.find((day) => day.date === "2026-10-31")?.inMonth).toBe(true);
  });

  it("pads to a minimum number of weeks so side calendars keep their height", () => {
    // February 2027 starts on Monday and spans exactly four weeks.
    expect(buildMonthGrid("2027-02", "2027-02-01")).toHaveLength(4);
    const padded = buildMonthGrid("2027-02", "2027-02-01", { minWeeks: 6 });
    expect(padded).toHaveLength(6);
    expect(padded.at(-1)?.at(-1)).toMatchObject({ date: "2027-03-14", inMonth: false });
  });

  it("never skips or repeats a day across daylight-saving changes", () => {
    for (const month of ["2026-03", "2026-10"]) {
      const dates = buildMonthGrid(month, "2026-01-01")
        .flat()
        .map((day) => day.date);
      expect(new Set(dates).size).toBe(dates.length);
      const inMonth = dates.filter((date) => date.startsWith(month));
      expect(inMonth).toHaveLength(31);
    }
  });
});
