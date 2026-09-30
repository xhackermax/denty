// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { printHtml } from "./print-html";

describe("printHtml", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
  });

  it("writes the printable html into the frame before printing", () => {
    const print = vi.fn();
    const focus = vi.fn();
    const open = vi.fn();
    const write = vi.fn();
    const close = vi.fn();

    const contentDocument = {
      readyState: "complete",
      open,
      write,
      close,
    } as unknown as Document;

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      const element = originalCreateElement(tagName);
      if (tagName.toLowerCase() !== "iframe") return element;
      Object.defineProperty(element, "contentDocument", { value: contentDocument });
      Object.defineProperty(element, "contentWindow", {
        value: {
          addEventListener: vi.fn(),
          focus,
          print,
        },
      });
      return element;
    });

    printHtml("<!doctype html><html><body><h1>Documento</h1></body></html>");

    expect(open).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledWith(expect.stringContaining("Documento"));
    expect(close).toHaveBeenCalledOnce();
    vi.runOnlyPendingTimers();
    expect(focus).toHaveBeenCalledOnce();
    expect(print).toHaveBeenCalledOnce();
  });
});
