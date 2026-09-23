// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HorizontalSnapNav } from "./horizontal-snap-nav";

describe("HorizontalSnapNav", () => {
  it("keeps full labels and changes the selected tab", () => {
    const onChange = vi.fn();
    render(
      <HorizontalSnapNav
        ariaLabel="Paciente"
        value="finance"
        onChange={onChange}
        items={[
          { value: "finance", label: "Cobros" },
          { value: "documents", label: "Documentos firmados" },
        ]}
      />,
    );
    expect(screen.getByRole("tab", { name: "Cobros" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "Documentos firmados" }));
    expect(onChange).toHaveBeenCalledWith("documents");
  });
});
