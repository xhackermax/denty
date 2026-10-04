import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { LOCALLY_HANDLED_SECTIONS } from "../route-handler";

// The dispatcher drops unlisted sections before their branch runs, which shipped the configurable
// menu (/api/navigation) and plan pricing (/api/clinical-plan) as 501s. Derive the sections from
// the branches themselves so a new one cannot be forgotten.
const source = readFileSync(join(__dirname, "..", "route-handler.ts"), "utf8");
const dispatched = new Set(
  [...source.matchAll(/parts\[1\] === "([a-z-]+)"/g)].map((match) => match[1] ?? ""),
);
dispatched.delete("auth"); // answered before the session-scoped dispatcher

describe("locally handled sections", () => {
  it("lists every section the dispatcher has a branch for", () => {
    expect([...dispatched].filter((section) => !LOCALLY_HANDLED_SECTIONS.has(section))).toEqual([]);
  });

  it.each(["navigation", "clinical-plan"])("routes /api/%s to its handler", (section) => {
    expect(LOCALLY_HANDLED_SECTIONS.has(section)).toBe(true);
  });
});
