import { describe, expect, it } from "vitest";
import { verifiedAttendanceHours, type AttendancePunch } from "../verified-attendance";

const punch = (id: string, type: "IN"|"OUT", time: string,
  corrects: string|null = null): AttendancePunch => ({
  id, staff_member_id: "dr", punch_type: type,
  occurred_at: `2026-10-09T${time}:00+02:00`,
  corrects_punch_id: corrects,
});
const end = "2026-10-10T00:00:00+02:00";

describe("verified attendance", () => {
  it("calculates two closed shifts without double counting", () => {
    expect(verifiedAttendanceHours([
      punch("1","IN","08:00"), punch("2","OUT","12:00"),
      punch("3","IN","14:00"), punch("4","OUT","18:00"),
    ], end)).toEqual({hours:8,note:null});
  });
  it("replaces the original timestamp with an administrative correction", () => {
    expect(verifiedAttendanceHours([
      punch("1","IN","08:00"), punch("2","OUT","12:00"),
      punch("3","IN","09:00","1"),
    ], end).hours).toBe(3);
  });
  it("refuses missing exit and overlapping entrances", () => {
    expect(verifiedAttendanceHours([
      punch("1","IN","08:00"),
    ],end).hours).toBeNull();
    expect(verifiedAttendanceHours([
      punch("1","IN","08:00"), punch("2","IN","09:00"),
      punch("3","OUT","17:00"),
    ],end).hours).toBeNull();
  });
  it("clips a verified overnight shift to the selected report period", () => {
    const rows: AttendancePunch[] = [
      {...punch("a","IN","23:00"),occurred_at:"2026-10-08T23:00:00+02:00"},
      {...punch("b","OUT","02:00"),occurred_at:"2026-10-09T02:00:00+02:00"},
    ];
    expect(verifiedAttendanceHours(rows, "2026-10-10T00:00:00+02:00",
      "2026-10-09T00:00:00+02:00").hours).toBe(2);
  });
  it("does not include completed shifts from previous dates", () => {
    const rows: AttendancePunch[] = [
      {...punch("a","IN","09:00"),occurred_at:"2026-10-08T09:00:00+02:00"},
      {...punch("b","OUT","17:00"),occurred_at:"2026-10-08T17:00:00+02:00"},
    ];
    expect(verifiedAttendanceHours(rows,"2026-10-10T00:00:00+02:00",
      "2026-10-09T00:00:00+02:00")).toMatchObject({
      hours:null,note:"Sin fichajes en este periodo",
    });
  });
  it("refuses a 27-hour phantom shift and ignores future events", () => {
    const future: AttendancePunch = {
      ...punch("3","IN","08:00"), occurred_at:"2026-10-11T08:00:00+02:00",
    };
    expect(verifiedAttendanceHours([
      punch("1","IN","01:00"),
      {...punch("2","OUT","04:00"),occurred_at:"2026-10-10T04:00:00+02:00"},
    ],"2026-10-11T00:00:00+02:00").hours).toBeNull();
    expect(verifiedAttendanceHours([
      punch("1","IN","08:00"),punch("2","OUT","10:00"),future,
    ],end).hours).toBe(2);
  });
});
