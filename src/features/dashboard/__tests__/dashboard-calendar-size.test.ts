import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Size is only measurable in a browser; these guard the rules that keep the card compact
// (square tiles plus a five-row day list made it 761 px tall, taller than a laptop screen).
const css = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const rule = (source: string, selector: string) => {
  const match = source.match(new RegExp(`(?:^|\\n)${selector.replace(".", "\\.")}\\s*{([^}]*)}`));
  expect(match, selector).not.toBeNull();
  return match?.[1] ?? "";
};

describe("dashboard calendar size", () => {
  it("uses short fixed-height tiles instead of square ones", () => {
    const day = rule(css("dashboard-calendar.module.css"), ".day");
    expect(day).not.toMatch(/aspect-ratio/);
    const height = Number(day.match(/height:\s*(\d+)px/)?.[1]);
    expect(height).toBeGreaterThan(0);
    expect(height).toBeLessThanOrEqual(32);
  });

  it("keeps the desktop side column narrow", () => {
    const layout = css("dashboard-layout.module.css");
    const max = Number(layout.match(/minmax\(\d+px,\s*(\d+)px\)/)?.[1]);
    expect(max).toBeGreaterThan(0);
    expect(max).toBeLessThanOrEqual(340);
  });
});
