import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Layout is only measurable in a real browser; these guard the rules that keep task cards
// readable on phones (a 34 px card column made titles wrap one letter per line).
const css = (file: string) => readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");

function mobileBlock(source: string): string {
  const start = source.indexOf("@media (width < 48em)");
  expect(start).toBeGreaterThanOrEqual(0);
  let depth = 0;
  for (let index = source.indexOf("{", start); index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error("unclosed media block");
}

describe("tasks layout on phones", () => {
  it("puts quick actions in a row above the tasks instead of a side column", () => {
    const block = mobileBlock(css("tasks-page.module.css"));
    expect(block).toMatch(/\.workspace\s*{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(block).toMatch(/\.quickList\s*{[^}]*flex-direction:\s*row/);
  });

  it("gives the time column's width to the card, which already shows its range", () => {
    const block = mobileBlock(css("tasks/tasks-timeline.module.css"));
    expect(block).toMatch(/\.item > \.time\s*{[^}]*display:\s*none/);
    expect(block).toMatch(/grid-template-columns:\s*28px 34px minmax\(0,\s*1fr\)/);
    expect(block).toMatch(/\.card,\s*\.gap\s*{[^}]*grid-column:\s*3/);
  });
});
