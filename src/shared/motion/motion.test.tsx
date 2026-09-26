// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  MotionPage,
  MotionPressable,
  MotionScrollReveal,
  SpeedingMetric,
  formatSpeedingMetric,
} from "@/shared/motion";

beforeAll(() => {
  global.IntersectionObserver = class IntersectionObserver {
    root = null;
    rootMargin = "0px";
    thresholds = [0];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  } as unknown as typeof IntersectionObserver;
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("Denty motion foundation", () => {
  it("renders page, pressable and scroll-reveal content without hiding semantics", () => {
    render(
      <MotionPage>
        <MotionScrollReveal>
          <MotionPressable>
            <button type="button">Abrir paciente</button>
          </MotionPressable>
        </MotionScrollReveal>
      </MotionPage>,
    );

    expect(screen.getByRole("button", { name: "Abrir paciente" })).toBeInTheDocument();
  });

  it("formats protagonist metrics for euro and percent values", () => {
    expect(formatSpeedingMetric(184520, { kind: "currency", locale: "es-ES" })).toMatch(
      /184[.\s]520/,
    );
    expect(formatSpeedingMetric(27.8, { kind: "percent", locale: "es-ES", decimals: 1 })).toMatch(
      /27,8\s?%/,
    );
    expect(formatSpeedingMetric(1284, { decimals: undefined })).toMatch(/1[.\s]284/);
  });

  it("accepts optional class names produced by strict CSS-module typing", () => {
    const optionalClassName: string | undefined = undefined;

    render(
      <MotionPage className={optionalClassName}>
        <MotionScrollReveal className={optionalClassName}>
          <MotionPressable className={optionalClassName}>
            <SpeedingMetric
              className={optionalClassName}
              value={92}
              kind="percent"
              aria-label="Ocupación clínica"
            />
          </MotionPressable>
        </MotionScrollReveal>
      </MotionPage>,
    );

    expect(screen.getByLabelText(/Ocupación clínica/)).toBeInTheDocument();
  });

  it("renders the final metric as accessible text", () => {
    render(
      <SpeedingMetric
        value={184520}
        kind="currency"
        locale="es-ES"
        aria-label="Facturación anual"
      />,
    );

    expect(screen.getByLabelText(/Facturación anual:.*184[.\s]520/)).toBeInTheDocument();
  });
});
