import { describe, expect, it } from "vitest";

import { resolveVoiceDateTime } from "../tools/assistant-datetime";

// Wednesday 2026-09-30 09:00 local time.
const now = new Date(2026, 8, 30, 9, 0, 0);

function local(date: Date | undefined): string | undefined {
  if (!date) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

describe("resolveVoiceDateTime", () => {
  it.each([
    ["hoy", "10:30", "2026-09-30 10:30"],
    ["mañana", "10:30", "2026-10-01 10:30"],
    ["manana", "08:00", "2026-10-01 08:00"],
    ["pasado manana", "12:00", "2026-10-02 12:00"],
    ["lunes", "12:00", "2026-10-05 12:00"],
    ["miercoles", "12:00", "2026-10-07 12:00"],
    ["3/10", "16:15", "2026-10-03 16:15"],
    ["03-10-2026", "16:15", "2026-10-03 16:15"],
    ["3/10/26", "16:15", "2026-10-03 16:15"],
  ])("resolves %s %s", (dateText, timeText, expected) => {
    expect(local(resolveVoiceDateTime({ dateText, timeText }, now))).toBe(expected);
  });

  it("rolls a numeric date already past to next year", () => {
    expect(local(resolveVoiceDateTime({ dateText: "1/2", timeText: "10:00" }, now))).toBe(
      "2027-02-01 10:00",
    );
  });

  it("uses the fallback time when no time is spoken", () => {
    expect(local(resolveVoiceDateTime({ dateText: "mañana" }, now, "11:45"))).toBe(
      "2026-10-01 11:45",
    );
  });

  it("returns undefined without time or fallback, or with unknown date", () => {
    expect(resolveVoiceDateTime({ dateText: "mañana" }, now)).toBeUndefined();
    expect(resolveVoiceDateTime({ dateText: "algún día", timeText: "10:00" }, now)).toBeUndefined();
    expect(resolveVoiceDateTime({ dateText: "31/02", timeText: "10:00" }, now)).toBeUndefined();
  });
});
