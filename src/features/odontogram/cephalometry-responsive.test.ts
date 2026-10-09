import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./cephalometry-editor.module.css", import.meta.url), "utf8");
const editor = readFileSync(new URL("./cephalometry-editor.tsx", import.meta.url), "utf8");
const standalone = readFileSync(new URL("../../../public/cephalometry-lateral.html", import.meta.url), "utf8");

describe("responsive cephalometry", () => {
  it("does not impose a fixed wide table or SVG and uses responsive cards", () => {
    expect(css).not.toMatch(/min-width:\s*(?:730|340)px/);
    expect(css).toContain("container-type:inline-size");
    expect(css).toContain('@container (max-width: 760px)');
    expect(css).toContain("content:attr(data-label)");
    expect(css).toContain(".diagramSvg{display:block;width:100%;height:auto;min-width:0");
  });
  it("keeps every clinical value and interpretation explicitly labelled on mobile", () => {
    for (const label of ["Valor", "Norma ± DE", "Desviación", "Interpretación"]) {
      expect(editor).toContain(`data-label="${label}"`);
      expect(standalone).toContain(`data-label="${label}"`);
    }
  });
  it("makes the independent HTML responsive too", () => {
    expect(standalone).not.toContain("min-width:760px");
    expect(standalone).not.toContain("min-width:340px");
    expect(standalone).toContain("table thead{display:none}");
    expect(standalone).toContain("overflow:hidden");
  });
});
