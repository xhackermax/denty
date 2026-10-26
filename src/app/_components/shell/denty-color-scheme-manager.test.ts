// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DENTY_APPEARANCE_STORAGE_KEY } from "@/domain/appearance-schedule";

import { dentyColorSchemeManager } from "./denty-color-scheme-manager";

describe("dentyColorSchemeManager", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-26T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses Denty's saved dark preference instead of Mantine's stale light value", () => {
    localStorage.setItem(DENTY_APPEARANCE_STORAGE_KEY, "dark");
    localStorage.setItem("mantine-color-scheme-value", "light");

    expect(dentyColorSchemeManager.get("light")).toBe("dark");
  });

  it("does not let Mantine overwrite Denty's manual preference", () => {
    localStorage.setItem(DENTY_APPEARANCE_STORAGE_KEY, "dark");

    dentyColorSchemeManager.set("light");

    expect(localStorage.getItem(DENTY_APPEARANCE_STORAGE_KEY)).toBe("dark");
    expect(dentyColorSchemeManager.get("light")).toBe("dark");
  });

  it("keeps a manual light choice at night even when Mantine has a stale dark value", () => {
    vi.setSystemTime(new Date("2026-10-26T23:00:00.000Z"));
    localStorage.setItem(DENTY_APPEARANCE_STORAGE_KEY, "light");
    localStorage.setItem("mantine-color-scheme-value", "dark");

    expect(dentyColorSchemeManager.get("dark")).toBe("light");
  });
});
