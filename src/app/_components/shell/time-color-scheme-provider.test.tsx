// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TimeColorSchemeProvider, useDentyAppearance } from "./time-color-scheme-provider";

function Probe() {
  const { preference, resolvedScheme, setPreference } = useDentyAppearance();
  return <button onClick={() => setPreference("dark")}>{preference}:{resolvedScheme}</button>;
}

function renderProvider() {
  return render(<MantineProvider defaultColorScheme="light"><TimeColorSchemeProvider><Probe /></TimeColorSchemeProvider></MantineProvider>);
}

describe("TimeColorSchemeProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("switches at the scheduled boundary without polling", () => {
    vi.setSystemTime(new Date("2026-09-27T18:59:59.000Z"));
    renderProvider();
    expect(screen.getByRole("button")).toHaveTextContent("time:light");
    act(() => vi.advanceTimersByTime(1_100));
    expect(screen.getByRole("button")).toHaveTextContent("time:dark");
  });

  it("refreshes after focus and persists a manual override", () => {
    vi.setSystemTime(new Date("2026-09-27T12:00:00.000Z"));
    renderProvider();
    act(() => screen.getByRole("button").click());
    expect(localStorage.getItem("denty-appearance")).toBe("dark");
    expect(screen.getByRole("button")).toHaveTextContent("dark:dark");
    act(() => window.dispatchEvent(new Event("focus")));
    expect(screen.getByRole("button")).toHaveTextContent("dark:dark");
  });
});
