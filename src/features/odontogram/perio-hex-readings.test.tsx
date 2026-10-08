// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PerioHexReadings } from "./perio-hex-readings";

describe("periodontal measurements around six imaginary hexagon vertices", () => {
  it("shows measured numbers, no hexagons, in the six clinical positions", () => {
    const { container } = render(
      <PerioHexReadings tooth="16" readings={[
        { tooth: "16", site: "MV", probingDepth: 0 },
        { tooth: "16", site: "V", probingDepth: 3 },
        { tooth: "16", site: "DV", probingDepth: 4 },
        { tooth: "16", site: "MP", probingDepth: 5 },
        { tooth: "16", site: "P/L", probingDepth: 6 },
        { tooth: "16", site: "DP", probingDepth: 15 },
      ]} />,
    );
    const group = screen.getByRole("group", { name: "Periodoncia del diente 16" });
    const numbers = Array.from(group.querySelectorAll("[data-site]"));
    expect(numbers.map((element) => element.getAttribute("data-site"))).toEqual([
      "MV", "V", "DV", "MP", "P/L", "DP",
    ]);
    expect(numbers.map((element) => element.textContent)).toEqual(["0","3","4","5","6","15"]);
    expect(numbers.map((element) => element.getAttribute("data-severity"))).toEqual([
      "normal","normal","red","red","purple","purple",
    ]);
    expect(container.querySelectorAll("polygon, rect, svg")).toHaveLength(0);
    expect(within(group).getByRole("img", { name: "DV: 4 milímetros" })).toBeInTheDocument();
    expect(within(group).getByRole("img", { name: "P/L: 6 milímetros" })).toBeInTheDocument();
  });

  it("does not invent empty measurements or mix readings from different teeth", () => {
    const { container, rerender } = render(
      <PerioHexReadings tooth="11" readings={[{ tooth: "21", site: "MV", probingDepth: 7 }]} />,
    );
    expect(container.querySelector("[role=group]")).toBeNull();
    rerender(<PerioHexReadings tooth="11" readings={[
      { tooth: "11", site: "V", probingDepth: 5 },
      { tooth: "11", site: "DV", probingDepth: Number.NaN },
      { tooth: "11", site: "MP", probingDepth: -1 },
    ]}/>);
    expect(container.querySelectorAll("[data-site]")).toHaveLength(1);
    expect(screen.getByRole("img", { name: "V: 5 milímetros" })).toBeInTheDocument();
  });

  it.each([
    [{ tooth: "16", site: "MV" as const, bleeding: true }, "bleeding", "Sangrado"],
    [{ tooth: "16", site: "V" as const, suppuration: true }, "suppuration", "Supuración"],
  ])("draws the tooth indicator even without PD, for one finding", (reading, finding, name) => {
    const { container } = render(<PerioHexReadings tooth="16" readings={[reading]} />);
    const marker = screen.getByRole("img", { name: `${name} en el diente 16` });
    expect(marker).toHaveAttribute("data-finding", finding);
    expect(container.querySelectorAll("[data-site]")).toHaveLength(0);
  });

  it("draws exactly one half-red half-yellow indicator if BOP and suppuration coexist", () => {
    const { container } = render(<PerioHexReadings tooth="16" readings={[
      { tooth: "16", site: "MV", bleeding: true },
      { tooth: "16", site: "DP", suppuration: true },
    ]} />);
    expect(screen.getByRole("img", { name: "Sangrado y supuración en el diente 16" }))
      .toHaveAttribute("data-finding", "both");
    expect(container.querySelectorAll("[data-finding]")).toHaveLength(1);
    expect(container.querySelector("[data-site]")).toBeNull();
  });

  it("respects individual layer subfilters for depth, bleeding and suppuration", () => {
    const readings = [{
      tooth: "26", site: "MV" as const, probingDepth: 6, bleeding: true, suppuration: true,
    }];
    const { rerender } = render(<PerioHexReadings tooth="26" readings={readings} showBleeding={false} />);
    expect(screen.getByRole("img", { name: "Supuración en el diente 26" })).toHaveAttribute("data-finding", "suppuration");
    rerender(<PerioHexReadings tooth="26" readings={readings} showSuppuration={false}/>);
    expect(screen.getByRole("img", { name: "Sangrado en el diente 26" })).toHaveAttribute("data-finding", "bleeding");
    rerender(<PerioHexReadings tooth="26" readings={readings} showNumbers={false} showBleeding={false} />);
    expect(screen.queryByRole("img", { name: "MV: 6 milímetros" })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Supuración en el diente 26" })).toBeInTheDocument();
    rerender(<PerioHexReadings tooth="26" readings={readings}
      showNumbers={false} showBleeding={false} showSuppuration={false}/>);
    expect(screen.queryByRole("group", { name: "Periodoncia del diente 26" })).toBeNull();
  });
});
