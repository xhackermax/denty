// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateMouthScale, FittedMouthCanvas } from "./fitted-mouth-canvas";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("full-mouth responsive fitting", () => {
  it.each([
    [1000, 420, 1000, 330, 1],
    [760, 500, 1000, 330, 0.76],
    [340, 440, 520, 580, 340 / 520],
    [330, 300, 520, 580, 300 / 580],
    [700, 230, 1000, 330, 230 / 330],
  ])("fits all teeth to %i×%i without needing either axis to scroll", (w,h,canvasW,canvasH,expected) => {
    const actual = calculateMouthScale(w,h,canvasW,canvasH);
    expect(actual).toBeCloseTo(expected, 4);
    expect(canvasW * actual).toBeLessThanOrEqual(w);
    expect(canvasH * actual).toBeLessThanOrEqual(h);
  });

  it("handles hidden panes and unmeasured sizes without NaN or Infinity", () => {
    expect(calculateMouthScale(0, 300, 520, 580)).toBe(0);
    expect(calculateMouthScale(330, 0, 520, 580)).toBe(0);
    expect(calculateMouthScale(330, 440, Number.NaN, 580)).toBe(0);
    expect(calculateMouthScale(1000, 1000, 0, 580)).toBe(0);
  });

  it("reacts to portrait/landscape changes while preserving tooth content", () => {
    let vw = 342;
    let vh = 385;
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function() {
      return vw;
    });
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function() {
      return vh;
    });
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(520);
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(580);
    const { container } = render(
      <FittedMouthCanvas>
        <button>Diente 18</button><button>Diente 48</button>
      </FittedMouthCanvas>
    );
    const canvas = container.querySelector("[data-mouth-fit=complete]") as HTMLElement;
    expect(canvas).toBeTruthy();
    expect(Number(canvas.style.getPropertyValue("--mouth-scale"))).toBeCloseTo(340 / 520, 2);
    vh = 260;
    act(() => { window.dispatchEvent(new Event("resize")); });
    expect(Number(canvas.style.getPropertyValue("--mouth-scale"))).toBeCloseTo(258 / 580, 4);
    expect(container.querySelectorAll("button")).toHaveLength(2);
  });
});
