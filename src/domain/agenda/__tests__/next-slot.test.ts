import { describe, expect, it } from "vitest";

import {
  AFTERNOON_STARTS_AT_MINUTE,
  dayPartOf,
  dayPartWindow,
  nextSlotsNotBefore,
  parseDayPart,
} from "../next-slot";

describe("day parts", () => {
  it("splits the day at 14:00 Madrid time", () => {
    expect(AFTERNOON_STARTS_AT_MINUTE).toBe(14 * 60);
    expect(dayPartWindow("AM")).toEqual({ fromMinute: 0, toMinute: 840 });
    expect(dayPartWindow("PM")).toEqual({ fromMinute: 840, toMinute: 1440 });
    expect(dayPartWindow(null)).toEqual({ fromMinute: 0, toMinute: 1440 });
  });

  it("classifies a slot by its Madrid start time, not UTC", () => {
    // 11:59 UTC is 13:59 in Madrid (summer): still morning.
    expect(dayPartOf("2026-10-05T11:59:00Z")).toBe("AM");
    expect(dayPartOf("2026-10-05T12:00:00Z")).toBe("PM");
    // Winter time: 13:00 UTC is 14:00 in Madrid.
    expect(dayPartOf("2026-12-01T13:00:00Z")).toBe("PM");
  });

  it("accepts only AM, PM or nothing from a query string", () => {
    expect(parseDayPart("AM")).toBe("AM");
    expect(parseDayPart("pm")).toBe("PM");
    expect(parseDayPart(null)).toBeNull();
    expect(parseDayPart("")).toBeNull();
    expect(parseDayPart("noche")).toBeUndefined();
  });
});

describe("nextSlotsNotBefore", () => {
  const now = "2026-10-03T08:07:00Z";

  it("never offers a slot that has already started", () => {
    expect(nextSlotsNotBefore(now)).toBe("2026-10-03T10:07:00+02:00");
    expect(nextSlotsNotBefore(now, "2026-09-01")).toBe("2026-10-03T10:07:00+02:00");
  });

  it("starts at Madrid midnight of a future day", () => {
    expect(nextSlotsNotBefore(now, "2026-10-10")).toBe("2026-10-10T00:00:00+02:00");
  });

  it("rejects malformed dates", () => {
    expect(() => nextSlotsNotBefore(now, "10/10/2026")).toThrow(RangeError);
  });
});
