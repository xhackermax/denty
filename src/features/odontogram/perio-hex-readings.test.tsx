// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PerioHexReadings } from "./perio-hex-readings";

describe("periodontal hexagonal numbers", () => {
  it("shows exactly six sites in clinical order with only recorded values", () => {
    const readings = [
      { tooth: "16", site: "MV" as const, probingDepth: 3 },
      { tooth: "16", site: "V" as const, probingDepth: 4 },
      { tooth: "16", site: "DV" as const, probingDepth: 6 },
      { tooth: "16", site: "MP" as const, probingDepth: 0 },
    ];
    render(<PerioHexReadings tooth="16" readings={readings} />);
    const group = screen.getByRole("group", { name: /diente 16/ });
    expect(group.querySelectorAll("svg")).toHaveLength(6);
    expect(Array.from(group.querySelectorAll("svg"), el => el.getAttribute("data-site")))
      .toEqual(["MV", "V", "DV", "MP", "P/L", "DP"]);
    expect(within(group).getByRole("img", { name: "MV: 3 milímetros" })).toHaveAttribute("data-tier", "low");
    expect(within(group).getByRole("img", { name: "V: 4 milímetros" })).toHaveAttribute("data-tier", "moderate");
    expect(within(group).getByRole("img", { name: "DV: 6 milímetros" })).toHaveAttribute("data-tier", "high");
    expect(within(group).getByRole("img", { name: "MP: 0 milímetros" })).toHaveAttribute("data-depth", "0");
    expect(within(group).getByRole("img", { name: "P/L: sin medir" })).toBeInTheDocument();
    expect(group.querySelectorAll("text")).toHaveLength(4);
  });

  it("does not display values belonging to another tooth", () => {
    const { container } = render(
      <PerioHexReadings tooth="11" readings={[{ tooth: "21", site: "MV", probingDepth: 7 }]} />,
    );
    expect(container.querySelector("svg")).toBeNull();
  });
});
