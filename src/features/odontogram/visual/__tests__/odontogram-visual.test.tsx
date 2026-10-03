// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import OdontogramVisual, { type EditTarget, type ToothRecord } from "../odontogram-visual";

const teeth: ToothRecord[] = [
  {
    fdi: 16,
    probing: { MV: 3, V: 2, DV: null },
    findings: [
      { id: "f1", layer: "restauradora", label: "Caries", status: "observed", surface: "O" },
      {
        id: "f2",
        layer: "restauradora",
        label: "Obturación",
        status: "planned",
        surface: "M",
        note: "Composite",
        recordedAt: "2026-10-01T08:30:00Z",
      },
      { id: "f3", layer: "perio", label: "Bolsa", status: "observed", site: "MV" },
      { id: "f3b", layer: "endo", label: "Endodoncia", status: "completed", surface: "O" },
    ],
  },
  { fdi: 36, presence: "implant", findings: [] },
  { fdi: 46, presence: "absent", findings: [] },
  {
    fdi: 11,
    findings: [
      { id: "f4", layer: "orto", label: "Bracket", status: "planned", marker: "bracket" },
      { id: "f5", layer: "cirugia", label: "Sin fecha", status: "completed", recordedAt: "nope" },
    ],
  },
];

let wide = true;
beforeEach(() => {
  wide = true;
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: !wide })),
  );
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const detail = () => screen.getByRole("complementary");
const tooth = (fdi: number) => screen.getByRole("button", { name: new RegExp(`^Diente ${fdi},`) });

describe("OdontogramVisual", () => {
  it("lays out the four permanent quadrants and opens on the first tooth", () => {
    render(<OdontogramVisual recordKey="p1" teeth={teeth} />);
    expect(screen.getByRole("heading", { name: "Odontograma" })).toBeInTheDocument();
    for (const label of [
      "Superior · derecho",
      "Superior · izquierdo",
      "Inferior · derecho",
      "Inferior · izquierdo",
    ])
      expect(screen.getByRole("region", { name: `Dientes: ${label}` })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Diente \d+,/ })).toHaveLength(32);
    expect(within(detail()).getByRole("heading", { name: "Diente 18" })).toBeInTheDocument();
    expect(tooth(18)).toHaveAttribute("aria-pressed", "true");
    expect(within(detail()).getByText(/No hay anotaciones/)).toBeInTheDocument();
  });

  it("summarises each tooth's visible findings and probing", () => {
    render(<OdontogramVisual recordKey="p1" teeth={teeth} />);
    expect(tooth(16)).toHaveAccessibleName(
      "Diente 16, 4 anotaciones visibles, con sondaje registrado",
    );
    expect(within(tooth(16)).getByText("Restauradora · 2")).toBeInTheDocument();
    expect(within(tooth(17)).getByText("Sin registro")).toBeInTheDocument();
    expect(within(tooth(36)).getByText("Implante")).toBeInTheDocument();
    expect(within(tooth(46)).getByText("Ausente")).toBeInTheDocument();
  });

  it("shows the chosen tooth's findings grouped by layer with location, note and date", () => {
    render(<OdontogramVisual recordKey="p1" teeth={teeth} />);
    fireEvent.click(tooth(16));
    const panel = detail();
    expect(within(panel).getByRole("heading", { name: "Diente 16" })).toBeInTheDocument();
    expect(within(panel).getByText("4 anotaciones visibles")).toBeInTheDocument();
    expect(within(panel).getByRole("heading", { name: "Restauradora" })).toBeInTheDocument();
    expect(within(panel).getByText("Composite")).toBeInTheDocument();
    expect(within(panel).getByText("Mesial")).toBeInTheDocument();
    expect(within(panel).getByText("Mesiovestibular")).toBeInTheDocument();
    expect(within(panel).getByText(/1 oct 2026/)).toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: "16, Oclusal, 2 anotaciones" }),
    ).toBeInTheDocument();
  });

  it("filters the panel by surface or probing site and back to the whole tooth", () => {
    render(<OdontogramVisual recordKey="p1" teeth={teeth} />);
    fireEvent.click(tooth(16));
    const panel = detail();
    fireEvent.click(within(panel).getByRole("button", { name: "16, Mesial, 1 anotaciones" }));
    expect(within(panel).getByText("Obturación")).toBeInTheDocument();
    expect(within(panel).queryByText("Caries")).toBeNull();
    fireEvent.keyDown(within(panel).getByRole("button", { name: "16, Oclusal, 2 anotaciones" }), {
      key: "Enter",
    });
    expect(within(panel).getByText("Caries")).toBeInTheDocument();
    expect(within(panel).getByText("Oclusal", { selector: "strong" })).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole("button", { name: /16, Mesiovestibular, sondaje 3/ }));
    expect(within(panel).getByText("Bolsa")).toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: /16, Distovestibular, sin registro/ }),
    ).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole("button", { name: "Ver todo el diente" }));
    expect(within(panel).getByText("Diente completo")).toBeInTheDocument();
  });

  it("hides layers, offers presets and keeps at least the chosen ones", () => {
    render(<OdontogramVisual recordKey="p1" teeth={teeth} />);
    fireEvent.click(tooth(16));
    const layers = screen.getByRole("group", { name: "Capas visibles" });
    fireEvent.click(within(layers).getByRole("button", { name: "Restauradora" }));
    expect(within(layers).getByRole("button", { name: "Todas" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(within(detail()).queryByText("Caries")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Perio + Endo" }));
    expect(within(layers).getByRole("button", { name: "Perio" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(layers).getByRole("button", { name: "Orto" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(within(detail()).getByText("Endodoncia")).toBeInTheDocument();
    fireEvent.click(within(layers).getByRole("button", { name: "Perio" }));
    expect(within(detail()).queryByRole("button", { name: /Mesiovestibular/ })).toBeNull();
    fireEvent.click(within(layers).getByRole("button", { name: "Todas" }));
    expect(within(detail()).getByText("Caries")).toBeInTheDocument();
  });

  it("asks the host to edit the tooth, the selected zone or one finding", () => {
    const onEdit = vi.fn<(target: EditTarget) => void>();
    render(<OdontogramVisual recordKey="p1" teeth={teeth} onEdit={onEdit} />);
    fireEvent.click(tooth(16));
    fireEvent.click(screen.getByRole("button", { name: "Abrir en el editor" }));
    expect(onEdit).toHaveBeenLastCalledWith({ fdi: 16, selection: null, finding: null });
    fireEvent.click(within(detail()).getByRole("button", { name: "16, Mesial, 1 anotaciones" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar anotación" }));
    expect(onEdit).toHaveBeenLastCalledWith({
      fdi: 16,
      selection: { kind: "surface", value: "M" },
      finding: expect.objectContaining({ id: "f2" }),
    });
  });

  it("uses incisal, palatal and bracket notation and tolerates bad dates", () => {
    render(<OdontogramVisual recordKey="p1" teeth={teeth} />);
    fireEvent.click(tooth(11));
    const panel = detail();
    expect(
      within(panel).getByRole("button", { name: "11, Incisal, 0 anotaciones" }),
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: "11, Palatino, 0 anotaciones" }),
    ).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: /11, Mesiopalatino/ })).toBeInTheDocument();
    expect(within(panel).getByText("Fecha no disponible")).toBeInTheDocument();
    expect(document.querySelector(".ov-bracket")).not.toBeNull();
    fireEvent.click(tooth(41));
    expect(
      within(detail()).getByRole("button", { name: "41, Lingual, 0 anotaciones" }),
    ).toBeInTheDocument();
  });

  it("moves focus to the detail on narrow screens", () => {
    wide = false;
    render(<OdontogramVisual recordKey="p1" teeth={teeth} />);
    fireEvent.click(tooth(16));
    expect(within(detail()).getByRole("heading", { name: "Diente 16" })).toHaveFocus();
  });

  it("shows primary or mixed dentition and resets when the record changes", () => {
    const { rerender } = render(
      <OdontogramVisual recordKey="p1" teeth={teeth} dentition="primary" />,
    );
    expect(screen.getAllByRole("button", { name: /^Diente \d+,/ })).toHaveLength(20);
    expect(within(detail()).getByRole("heading", { name: "Diente 55" })).toBeInTheDocument();
    rerender(<OdontogramVisual recordKey="p1" teeth={teeth} dentition="mixed" />);
    expect(screen.getAllByRole("button", { name: /^Diente \d+,/ })).toHaveLength(52);
    fireEvent.click(tooth(16));
    rerender(<OdontogramVisual recordKey="p2" teeth={teeth} dentition="mixed" />);
    expect(within(detail()).getByRole("heading", { name: "Diente 18" })).toBeInTheDocument();
  });
});
