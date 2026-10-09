import { describe, expect, it } from "vitest";
import { summarizeAttendance, type AttendancePunch } from "../attendance-hours";

const p = (id: string, punchType: "IN" | "OUT", occurredAt: string,
  correctsPunchId: string | null = null): AttendancePunch =>
  ({id, punchType, occurredAt, correctsPunchId});
const start = "2026-10-09T00:00:00Z";
const end = "2026-10-10T00:00:00Z";

describe("attendance linked to each doctor", () => {
  it("counts only paired time, not event totals", () => {
    const rows = [
      p("a", "IN", "2026-10-09T08:00:00Z"),
      p("b", "OUT", "2026-10-09T12:00:00Z"),
      p("c", "IN", "2026-10-09T13:00:00Z"),
      p("d", "OUT", "2026-10-09T17:00:00Z"),
    ];
    expect(summarizeAttendance(rows, start, end))
      .toEqual({hours:8, status:"COMPLETE",pairs:2});
  });

  it("uses a corrected event, without counting the original twice", () => {
    const rows = [
      p("a", "IN", "2026-10-09T08:00:00Z"),
      p("b", "OUT", "2026-10-09T12:00:00Z"),
      p("correction", "OUT", "2026-10-09T14:00:00Z", "b"),
    ];
    expect(summarizeAttendance(rows, start, end).hours).toBe(6);
  });

  it("clips an overnight shift to the requested day", () => {
    const rows = [
      p("a", "IN", "2026-10-08T22:00:00Z"),
      p("b", "OUT", "2026-10-09T06:00:00Z"),
    ];
    expect(summarizeAttendance(rows, start, end))
      .toEqual({hours:6,status:"COMPLETE",pairs:1});
  });

  it("does not invent hours when the exit is missing", () => {
    const rows = [p("a", "IN", "2026-10-09T08:00:00Z")];
    expect(summarizeAttendance(rows, start, end))
      .toMatchObject({hours:null,status:"INCOMPLETE"});
  });

  it("does not report no-attendance for an unresolved prior clock-in", () => {
    const rows = [p("a", "IN", "2026-10-08T22:00:00Z")];
    expect(summarizeAttendance(rows, start, end).status).toBe("INCOMPLETE");
  });

  it("returns no records when there was no shift in this range", () => {
    const rows = [
      p("a", "IN", "2026-10-08T08:00:00Z"),
      p("b", "OUT", "2026-10-08T16:00:00Z"),
    ];
    expect(summarizeAttendance(rows, start, end).status).toBe("NO_RECORDS");
  });
});
