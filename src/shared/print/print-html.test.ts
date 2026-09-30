// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { printHtml } from "./print-html";

type FakeFrame = {
  print: ReturnType<typeof vi.fn>;
  focus: ReturnType<typeof vi.fn>;
  write: ReturnType<typeof vi.fn>;
  images: { complete: boolean }[];
};

function mockFrame(overrides: Partial<{ print: () => void; noDocument: boolean }> = {}): FakeFrame {
  const fake: FakeFrame = {
    print: vi.fn(overrides.print ?? (() => undefined)),
    focus: vi.fn(),
    write: vi.fn(),
    images: [],
  };
  const contentDocument = {
    readyState: "complete",
    images: fake.images,
    open: vi.fn(),
    write: fake.write,
    close: vi.fn(),
  } as unknown as Document;
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
    const element = originalCreateElement(tagName);
    if (tagName.toLowerCase() !== "iframe") return element;
    Object.defineProperty(element, "contentDocument", {
      value: overrides.noDocument ? null : contentDocument,
    });
    Object.defineProperty(element, "contentWindow", {
      value: overrides.noDocument
        ? null
        : { addEventListener: vi.fn(), focus: fake.focus, print: fake.print },
    });
    return element;
  });
  return fake;
}

describe("printHtml", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("writes the printable html into the frame and prints it", async () => {
    const fake = mockFrame();
    const done = printHtml("<!doctype html><html><body><h1>Documento</h1></body></html>");
    await vi.runAllTimersAsync();
    await expect(done).resolves.toBeUndefined();
    expect(fake.write).toHaveBeenCalledWith(expect.stringContaining("Documento"));
    expect(fake.focus).toHaveBeenCalledOnce();
    expect(fake.print).toHaveBeenCalledOnce();
  });

  it("uses a frame with a real (non-zero) size so every browser lays it out", async () => {
    mockFrame();
    const done = printHtml("<html></html>");
    const frame = document.querySelector("iframe") as HTMLIFrameElement;
    expect(frame.width).not.toBe("0");
    expect(frame.height).not.toBe("0");
    await vi.runAllTimersAsync();
    await done;
  });

  it("falls back to a popup window when the frame cannot print", async () => {
    mockFrame({
      print: () => {
        throw new Error("blocked");
      },
    });
    const popupPrint = vi.fn();
    const popup = {
      document: { open: vi.fn(), write: vi.fn(), close: vi.fn() },
      focus: vi.fn(),
      print: popupPrint,
    };
    const open = vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    const done = printHtml("<html><body>X</body></html>");
    await vi.runAllTimersAsync();
    await expect(done).resolves.toBeUndefined();
    expect(open).toHaveBeenCalled();
    expect(popup.document.write).toHaveBeenCalledWith(expect.stringContaining("X"));
    expect(popupPrint).toHaveBeenCalled();
  });

  it("rejects with a readable message when neither the frame nor a popup can print", async () => {
    mockFrame({
      print: () => {
        throw new Error("blocked");
      },
    });
    vi.spyOn(window, "open").mockReturnValue(null);
    const done = printHtml("<html></html>");
    const assertion = expect(done).rejects.toThrow(/impres/i);
    await vi.runAllTimersAsync();
    await assertion;
  });

  it("rejects when the frame has no document", async () => {
    mockFrame({ noDocument: true });
    vi.spyOn(window, "open").mockReturnValue(null);
    const done = printHtml("<html></html>");
    const assertion = expect(done).rejects.toThrow(/impres/i);
    await vi.runAllTimersAsync();
    await assertion;
  });

  it("removes the frame after printing", async () => {
    mockFrame();
    const done = printHtml("<html></html>");
    await vi.runAllTimersAsync();
    await done;
    await vi.advanceTimersByTimeAsync(61_000);
    expect(document.querySelector("iframe")).toBeNull();
  });
});
