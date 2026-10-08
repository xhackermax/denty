// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OdontogramLayerControls } from "./odontogram-layer-controls";
import { createInitialOdontogramViewState } from "./odontogram-view-state";

afterEach(cleanup);

describe("odontogram layer controls", () => {
  it("keeps all eight clinical areas available in the same toolbar", () => {
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

    const areas = screen.getByRole("group", { name: "Áreas clínicas del odontograma" });
    expect(within(areas).getAllByRole("button", { name: /^Mostrar capa / })).toHaveLength(8);
    expect(within(areas).getByRole("button", { name: "Mostrar capa General" })).toHaveAttribute("aria-pressed", "true");
    expect(within(areas).getByRole("button", { name: "Mostrar capa Perio" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(within(areas).getByRole("button", { name: "Mostrar capa Cirugía" }));
    fireEvent.click(within(areas).getByRole("button", { name: "Mostrar capa Orto" }));
    expect(onToggleLayer).toHaveBeenNthCalledWith(1, "surgery");
    expect(onToggleLayer).toHaveBeenNthCalledWith(2, "ortho");
    fireEvent.click(within(areas).getByRole("button", { name: "Editar área General" }));
    expect(onFocusLayer).toHaveBeenCalledWith("general");
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
