// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OdontogramLayerControls } from "./odontogram-layer-controls";
import { createInitialOdontogramViewState } from "./odontogram-view-state";

afterEach(cleanup);

describe("odontogram layer controls", () => {
  it("exposes all eight areas directly in a compact multi-layer toolbar", () => {
    const onToggleLayer = vi.fn();
    const onFocusLayer = vi.fn();
    render(
      <OdontogramLayerControls
        state={createInitialOdontogramViewState()}
        focusedLayer="general"
        onFocusLayer={onFocusLayer}
        onToggleLayer={onToggleLayer}
        onToggleSubfilter={vi.fn()}
        onShowAll={vi.fn()}
        onApplyPreset={vi.fn()}
        onReset={vi.fn()}
        onOpenHistory={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Mostrar capa General" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Mostrar capa Perio" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Mostrar capa Endo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mostrar capa Prótesis" })).toBeInTheDocument();
    const areas = screen.getByLabelText("Áreas clínicas");
    expect(within(areas).getAllByRole("button", { name: /^Mostrar capa / })).toHaveLength(8);
    expect(within(areas).getByRole("button", { name: "Mostrar capa Orto" })).toBeInTheDocument();
    expect(within(areas).getByRole("button", { name: "Mostrar capa Recambio" })).toBeInTheDocument();
    expect(screen.queryByText("Más capas")).not.toBeInTheDocument();
    fireEvent.click(within(areas).getByRole("button", { name: "Mostrar capa Cirugía" }));
    expect(onToggleLayer).toHaveBeenCalledWith("surgery");
    fireEvent.click(screen.getByRole("button", { name: "Editar área General" }));
    expect(onFocusLayer).toHaveBeenCalledWith("general");
    fireEvent.click(within(areas).getByRole("button", { name: "Mostrar capa Perio" }));
    fireEvent.click(within(areas).getByRole("button", { name: "Mostrar capa Endo" }));
    expect(onToggleLayer).toHaveBeenCalledWith("perio");
    expect(onToggleLayer).toHaveBeenCalledWith("endo");
  });

  it("offers visible subfilters without coupling them to the layer toggle", () => {
    const onToggleSubfilter = vi.fn();
    const onShowAll = vi.fn();
    render(
      <OdontogramLayerControls
        state={createInitialOdontogramViewState()}
        focusedLayer="general"
        onFocusLayer={vi.fn()}
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
