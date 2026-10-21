import { describe, expect, it } from "vitest";

import { embedPrintDocument } from "./embed-print-document";

const page = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Plan · Ana</title>
<style>
  @page { size: A4; margin: 16mm 18mm; }
  body { font: 12pt/1.5 sans-serif; margin: 18mm; }
  h1, body p { color: #111; }
</style></head><body>
<h1>Plan</h1><p>Texto</p>
</body></html>`;

describe("embedPrintDocument", () => {
  const fragment = embedPrintDocument(page, "dossier-part-1");

  it("keeps the body and drops the page shell", () => {
    expect(fragment).toContain("<h1>Plan</h1><p>Texto</p>");
    expect(fragment).not.toMatch(/<html|<head|<title|<!doctype/i);
    expect(fragment.startsWith('<section class="dossier-part-1">')).toBe(true);
  });

  it("scopes the stylesheet and maps body rules to the fragment root", () => {
    expect(fragment).toContain(".dossier-part-1 {");
    expect(fragment).toContain("& { font: 12pt/1.5 sans-serif");
    expect(fragment).toContain("& p { color");
    expect(fragment).not.toMatch(/\bbody\b/);
  });

  it("leaves page size to the master document and resets the embedded margin", () => {
    expect(fragment).not.toContain("@page");
    expect(fragment).toContain(".dossier-part-1 { margin: 0; }");
  });

  it("accepts a fragment without stylesheet or body", () => {
    expect(embedPrintDocument("<p>Solo</p>", "x")).toBe('<section class="x"><p>Solo</p></section>');
  });
});
