// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OdontogramLayerControls } from "./odontogram-layer-controls";
import { createInitialOdontogramViewState } from "./odontogram-view-state";

afterEach(cleanup);

describe("odontogram layer controls", () => {
  it("keeps only the four frequent layers visible and exposes the rest in Más capas", () => {
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
    expect(screen.getByRole("button", { name: "Endo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prótesis" })).toBeInTheDocument();
    const frequentLayers = screen.getByLabelText("Capas frecuentes");
    expect(within(frequentLayers).getAllByRole("button")).toHaveLength(4);
    expect(within(frequentLayers).queryByRole("button", { name: "Orto" })).not.toBeInTheDocument();

    const moreLayers = screen.getByText("Más capas").closest("details");
    expect(moreLayers).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText("Más capas"));
    expect(moreLayers).toHaveAttribute("open");
    fireEvent.click(within(moreLayers!).getByRole("button", { name: "Cirugía" }));
    expect(onToggleLayer).toHaveBeenCalledWith("surgery");
  });

  it("offers visible subfilters without coupling them to the layer toggle", () => {
    const onToggleSubfilter = vi.fn();
    const onShowAll = vi.fn();
    render(
      <OdontogramLayerControls
        state={createInitialOdontogramViewState()}
        onToggleLayer={vi.fn()}
        onToggleSubfilter={onToggleSubfilter}
        onShowAll={onShowAll}
        onApplyPreset={vi.fn()}
        onReset={vi.fn()}
        onOpenHistory={vi.fn()}
      />,
    );

    const filters = screen.getByText("Filtros de capas").closest("details");
    expect(filters).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText("Filtros de capas"));
    fireEvent.click(screen.getByLabelText("Caries"));
    expect(onToggleSubfilter).toHaveBeenCalledWith("general", "caries");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar todo" }));
    expect(onShowAll).toHaveBeenCalledOnce();
  });
});
