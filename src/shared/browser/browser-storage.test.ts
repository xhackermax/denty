// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { readBrowserStorageItem, writeBrowserStorageItem } from "./browser-storage";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("browser storage adapter", () => {
  it("reads and writes values through the browser storage boundary", () => {
    expect(writeBrowserStorageItem("preference", "value")).toBe(true);
    expect(readBrowserStorageItem("preference")).toEqual({ ok: true, value: "value" });
    expect(readBrowserStorageItem("missing")).toEqual({ ok: true, value: null });
  });

  it("reports browser storage read and write failures", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });

    expect(readBrowserStorageItem("preference")).toEqual({ ok: false });
    expect(writeBrowserStorageItem("preference", "value")).toBe(false);
  });
});
