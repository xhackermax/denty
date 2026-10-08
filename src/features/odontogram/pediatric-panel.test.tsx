// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PediatricPanel } from "./pediatric-panel";

describe("PediatricPanel in the shared odontogram", () => {
  it("keeps temporal/mixed tools without mounting a second full-mouth chart", () => {
    const onCommit = vi.fn();
    const onSelectTooth = vi.fn();
    render(
      <MantineProvider env="test">
        <PediatricPanel
          patientId="child-1"
          selectedTooth="55"
          onSelectTooth={onSelectTooth}
          readOnly={false}
          onCommit={onCommit}
        />
      </MantineProvider>,
    );

    expect(screen.getByRole("radio", { name: "Temporal" })).toBeChecked();
    expect(screen.getByText("Dentición y recambio · pieza 55")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aplicar al 55" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Odontograma pediátrico" })).not.toBeInTheDocument();
    expect(screen.queryByTitle(/^55 ·/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Mixta" }));
    expect(screen.getByRole("radio", { name: "Mixta" })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Aplicar al 55" }));
    expect(onCommit).toHaveBeenCalledOnce();
  }, 15_000);
});
