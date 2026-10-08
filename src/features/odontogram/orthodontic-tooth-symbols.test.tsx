// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OrthodonticToothSymbols } from "./orthodontic-tooth-symbols";

describe("OrthodonticToothSymbols", () => {
  it("draws distinct SVG symbols for every orthodontic mark and appliance", () => {
    const { container } = render(
      <svg viewBox="0 0 64 90">
        <OrthodonticToothSymbols symbols={[
          "bracket", "band", "attachment", "extract", "space", "miniscrew",
          "maintainer", "aligner", "retainer", "expander", "lingual_arch",
        ]} />
      </svg>,
    );
    for (const kind of [
      "bracket", "band", "attachment", "extract", "space", "miniscrew",
      "maintainer", "aligner", "retainer", "expander", "lingual_arch",
    ]) {
      expect(container.querySelector(`[data-orthodontic-symbol="${kind}"]`)).not.toBeNull();
    }
    expect(screen.getByRole("img", { name: "Microtornillo de anclaje ortodóntico" }))
      .toBeInTheDocument();
    expect(container.querySelector('[data-orthodontic-symbol="miniscrew"] circle')).not.toBeNull();
    expect(container.querySelector('[data-orthodontic-symbol="miniscrew"] path')).not.toBeNull();
  });

  it("does not create a prosthetic implant symbol or draw when no appliance is selected", () => {
    const { container } = render(<svg><OrthodonticToothSymbols symbols={[]} /></svg>);
    expect(container.querySelector("[data-orthodontic-symbol]")).toBeNull();
  });
});
