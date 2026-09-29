import { describe, expect, it } from "vitest";

import {
  nextSchemeBoundary,
  resolveAppearanceScheme,
  scheduledSchemeAt,
} from "../appearance-schedule";

describe("Madrid appearance schedule", () => {
  it.each([
    ["2026-09-27T04:59:00.000Z", "dark"],
    ["2026-09-27T05:00:00.000Z", "light"],
    ["2026-09-27T18:59:00.000Z", "light"],
    ["2026-09-27T19:00:00.000Z", "dark"],
  ] as const)("resolves %s as %s", (input, expected) => {
    expect(scheduledSchemeAt(input, "Europe/Madrid")).toBe(expected);
  });

  it("finds the next local 07:00 or 21:00 boundary", () => {
    expect(nextSchemeBoundary("2026-09-27T18:00:00.000Z", "Europe/Madrid").toISOString()).toBe(
      "2026-09-27T19:00:00.000Z",
    );
    expect(nextSchemeBoundary("2026-09-27T20:00:00.000Z", "Europe/Madrid").toISOString()).toBe(
      "2026-09-28T05:00:00.000Z",
    );
  });

  it("lets manual light and dark preferences win", () => {
    const daytime = "2026-09-27T12:00:00.000Z";
    expect(resolveAppearanceScheme("dark", daytime)).toBe("dark");
    expect(resolveAppearanceScheme("light", daytime)).toBe("light");
    expect(resolveAppearanceScheme("time", daytime)).toBe("light");
  });
});
