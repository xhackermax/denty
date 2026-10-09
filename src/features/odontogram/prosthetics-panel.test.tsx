// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProstheticsPanel } from "./prosthetics-panel";

afterEach(cleanup);

describe("ProstheticsPanel", () => {
  it("creates a tooth-supported plan from the prosthetics layer", () => {
    const onCommit = vi.fn();
    render(
      <MantineProvider>
        <ProstheticsPanel
          selectedTooth="16"
          readOnly={false}
          onCommit={onCommit}
          onWarning={() => {}}
        />
      </MantineProvider>,
    );
    expect(screen.getByText("Prótesis · pieza 16")).toBeInTheDocument();
    expect(screen.getByText("Prótesis sobre dientes")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Registrar prótesis" }));
    expect(onCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        tooth: "16",
        entityType: "PROSTHESIS",
        attributes: expect.objectContaining({ support: "teeth", teethToRestore: 1 }),
      }),
    );
  });
  it("shows implant and abutment quantities only for implant-supported designs", () => {
    const onCommit = vi.fn();
    render(
      <MantineProvider>
        <ProstheticsPanel
          selectedTooth="26"
          readOnly={false}
          onCommit={onCommit}
          onWarning={() => {}}
        />
      </MantineProvider>,
    );
    expect(screen.queryByText("Número de implantes")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Sobre implantes"));
    expect(screen.getByText("Prótesis sobre implantes")).toBeInTheDocument();
    expect(screen.getByText("Número de implantes")).toBeInTheDocument();
    expect(screen.getByText("Número de aditamentos")).toBeInTheDocument();
    expect(screen.getByText("Tipo de aditamentos")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Registrar prótesis" }));
    expect(onCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        tooth: "26",
        attributes: expect.objectContaining({
          support: "implants",
          implantCount: 1,
          attachmentCount: 1,
          attachmentType: "TI_BASE",
        }),
      }),
    );
  });
});
