// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OdontogramLayerControls } from "./odontogram-layer-controls";
import { createInitialOdontogramViewState } from "./odontogram-view-state";

afterEach(cleanup);

describe("odontogram layer controls", () => {
  it("exposes independent pressed states and controls hidden layers in Más capas", () => {
    const onToggleLayer = vi.fn();
    render(
      <OdontogramLayerControls
        state={createInitialOdontogramViewState()}
        onToggleLayer={onToggleLayer}
        onToggleSubfilter={vi.fn()}
        onShowAll={vi.fn()}
        onApplyPreset={vi.fn()}
        onReset={vi.fn()}
        onOpenHistory={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "General" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Perio" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByText("Más capas"));
    fireEvent.click(screen.getByRole("button", { name: "Prótesis" }));
    expect(onToggleLayer).toHaveBeenCalledWith("prosthetics");
  });

  it("offers visible subfilters without coupling them to the layer toggle", () => {
    const onToggleSubfilter = vi.fn();
    render(
      <OdontogramLayerControls
        state={createInitialOdontogramViewState()}
        onToggleLayer={vi.fn()}
        onToggleSubfilter={onToggleSubfilter}
        onShowAll={vi.fn()}
        onApplyPreset={vi.fn()}
        onReset={vi.fn()}
        onOpenHistory={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Filtros de capas"));
    fireEvent.click(screen.getByLabelText("Caries"));
    expect(onToggleSubfilter).toHaveBeenCalledWith("general", "caries");
    expect(screen.getByRole("button", { name: "Mostrar todo" })).toBeInTheDocument();
  });
});
