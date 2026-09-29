// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DoctorBars, MonthlyTrend, TreatmentDonut } from "./finance-charts";

describe("finance chart motion", () => {
  it("marks doctor bars, treatment donut and trend for one-shot reveal", () => {
    const { container } = render(
      <>
        <DoctorBars
          metrics={[
            {
              id: "d1",
              name: "Dra. Ana",
              producedCents: 10000,
              invoicedCents: 9500,
              collectedCents: 9000,
              count: 2,
            },
          ]}
        />
        <TreatmentDonut
          metrics={[
            {
              label: "Implantes",
              producedCents: 10000,
              invoicedCents: 9500,
              collectedCents: 9000,
              costCents: 3500,
              marginCents: 6500,
              count: 2,
            },
          ]}
        />
        <MonthlyTrend
          metrics={[
            { month: "Ene", producedCents: 5000, invoicedCents: 4500, collectedCents: 4000 },
            { month: "Feb", producedCents: 10000, invoicedCents: 9000, collectedCents: 8000 },
          ]}
        />
      </>,
    );
    expect(container.querySelector('[data-motion="doctor-bar"]')).toBeInTheDocument();
    expect(container.querySelector('[data-motion="treatment-donut"]')).toBeInTheDocument();
    expect(container.querySelector('[data-motion="monthly-line"]')).toBeInTheDocument();
  });

  it("keeps empty data explicit", () => {
    render(<DoctorBars metrics={[]} />);
    expect(screen.getByText("Sin datos")).toBeInTheDocument();
  });
});
