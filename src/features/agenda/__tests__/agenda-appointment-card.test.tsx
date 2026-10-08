// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { agendaClinicalGlyphs, clinicalGlyphFor } from "@/domain";
import { ClinicalGlyph } from "@/shared/odontogram/clinical-glyph";
import { AgendaAppointmentCard } from "../agenda-appointment-card";
import { AgendaQuickView } from "../agenda-quick-view";
import type { AgendaAppointmentView } from "../agenda-projection";

afterEach(cleanup);

const cardStyle = {};
const reason = "Implante 46; Corona 11; Raspado Q1; Extracción 28";
function showCard(heightPx = 90, reason = "Implante 46; Corona 11; Raspado Q1; Extracción 28") {
  const glyphs = agendaClinicalGlyphs({ label: reason });
  const appointment: AgendaAppointmentView = {
    id: "appointment",
    patientId: "patient",
    patientName: "Ana García López",
    staffId: "staff",
    startsAt: "2026-10-01T10:00:00+02:00",
    endsAt: "2026-10-01T10:30:00+02:00",
    status: "PLANNED",
    version: 1,
    reason,
    glyph: glyphs[0] ?? null,
    glyphs,
  };
  const onOpen = vi.fn();
  const onCopy = vi.fn();
  render(
    <MantineProvider>
      <AgendaAppointmentCard
        appointment={appointment}
        style={cardStyle}
        heightPx={heightPx}
        selected={false}
        dimmed={false}
        menu={null}
        onOpen={onOpen}
        onCopy={onCopy}
        onDragStart={vi.fn()}
        onResizeStart={vi.fn()}
      />
    </MantineProvider>,
  );
  return { onOpen, onCopy };
}

describe("tarjeta de agenda sencilla", () => {
  it.each([30, 90])("mantiene visible un motivo sin icono a altura %s", (height) => {
    showCard(height, "Consulta personalizada");
    expect(screen.getByText("Consulta personalizada")).toBeVisible();
  });
  it("muestra un máximo de tres símbolos y abre el detalle completo al tocar", () => {
    const { onOpen } = showCard();
    expect(document.querySelectorAll("[data-family]")).toHaveLength(3);
    expect(screen.getByText("+1")).toBeVisible();
    expect(screen.queryByText(reason)).not.toBeInTheDocument();
    expect(screen.getByText("Ana García López")).toBeVisible();
    fireEvent.click(screen.getByText("+1"));
    expect(onOpen).toHaveBeenCalledOnce();
  });
  it("permite abrir con teclado y mantiene el detalle clínico en su nombre accesible", () => {
    const { onOpen } = showCard();
    const card = screen.getByRole("article");
    expect(card).toHaveAccessibleName(/Implante 46/);
    fireEvent.keyDown(card, { key: "Enter" });
    expect(onOpen).toHaveBeenCalledOnce();
  });
  it("copia una cita con clic derecho sin abrir el detalle", () => {
    const { onOpen, onCopy } = showCard();
    const card = screen.getByRole("article");
    fireEvent.contextMenu(card);
    expect(onCopy).toHaveBeenCalledOnce();
    expect(onOpen).not.toHaveBeenCalled();
  });
  it("una cita pequeña conserva un símbolo y avisa del resto sin texto largo", () => {
    showCard(30);
    expect(document.querySelectorAll("[data-family]")).toHaveLength(1);
    expect(screen.getByText("+3")).toBeVisible();
    expect(screen.queryByText(reason)).not.toBeInTheDocument();
  });
  it("el detalle muestra todos los tratamientos y permite cerrar con un botón accesible", () => {
    const glyphs = agendaClinicalGlyphs({ label: reason });
    const appointment: AgendaAppointmentView = {
      id: "appointment",
      patientId: "patient",
      patientName: "Ana García",
      staffId: "staff",
      startsAt: "2026-10-01T10:00:00+02:00",
      endsAt: "2026-10-01T10:30:00+02:00",
      status: "PLANNED",
      version: 1,
      reason,
      glyph: glyphs[0] ?? null,
      glyphs,
    };
    const onClose = vi.fn();
    render(
      <MantineProvider>
        <AgendaQuickView
          appointment={appointment}
          patient={undefined}
          staffName={undefined}
          cabinetName={undefined}
          siteName={undefined}
          staffOptions={[]}
          busy={false}
          onClose={onClose}
          onAdvance={vi.fn()}
          onNoShow={vi.fn()}
          onReschedule={vi.fn()}
          onCancel={vi.fn()}
          onEdit={vi.fn()}
        />
      </MantineProvider>,
    );
    expect(document.querySelectorAll("[data-family]")).toHaveLength(4);
    expect(screen.getByText(reason)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar detalle de la cita" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
  it.each([
    "Extracción 28",
    "Cirugía 48",
    "Endodoncia 46",
    "Implante 46",
    "Corona 11",
    "Puente 14-16",
    "Prótesis removible superior",
    "Prótesis total inferior",
    "Férula de descarga",
    "Ortodoncia inferior",
    "Raspado Q1",
    "Sellador 16",
    "Carilla 11",
    "Blanqueamiento",
    "CBCT",
    "Primera visita",
    "Revisión",
    "Urgencia dental",
  ])("dibuja un símbolo accesible para %s", (label) => {
    const glyph = clinicalGlyphFor({ label });
    const { container } = render(<ClinicalGlyph glyph={glyph!} />);
    expect(container.querySelectorAll("svg path, svg rect, svg circle").length).toBeGreaterThan(0);
    expect(screen.getByRole("img")).toHaveAccessibleName(new RegExp(label));
  });
  it("representa higiene sin requerir una pieza dental", () => {
    const glyph = clinicalGlyphFor({ label: "Raspado Q1-Q4" });
    expect(glyph).not.toBeNull();
    const { container } = render(<ClinicalGlyph glyph={glyph!} />);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelector('[data-icon="toothbrush"]')).not.toBeNull();
    expect(screen.getByRole("img")).toHaveAccessibleName(/Higiene.*Q1–Q4.*Pendiente/);
  });
  it.each(["Profilaxis dental", "Limpieza dental", "Raspado Q1", "Mantenimiento periodontal"])(
    "dibuja un cepillo con cabezal y cerdas visibles en la agenda compacta para %s",
    (label) => {
      const glyph = clinicalGlyphFor({ label });
      expect(glyph?.family).toBe("periodontal_hygiene");
      const { container } = render(<ClinicalGlyph glyph={glyph!} mode="micro" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
      const toothbrush = svg?.querySelector('[data-icon="toothbrush"]');
      expect(toothbrush).not.toBeNull();
      expect(toothbrush?.querySelector('[data-part="brush-handle"]')).not.toBeNull();
      const bristles = toothbrush?.querySelector('[data-part="brush-bristles"]');
      expect(bristles).not.toBeNull();
      // Four upright groups of bristles: the previous three diagonal lines
      // merged into a pencil-shaped nib at the agenda's 19px icon size.
      expect((bristles?.getAttribute("d")?.match(/V/g) ?? [])).toHaveLength(4);
      expect(screen.getByRole("img")).toHaveAccessibleName(new RegExp(label));
    },
  );
  it("no marca cinco superficies afectadas cuando el plan no especifica ninguna", () => {
    const glyph = clinicalGlyphFor({ treatmentCode: "FILLING", tooth: "26", label: "Obturación" });
    const { container } = render(<ClinicalGlyph glyph={glyph!} />);
    expect(container.querySelectorAll('[data-surface][data-active="true"]')).toHaveLength(0);
    expect(screen.getByRole("img")).toHaveAccessibleName(/superficies no especificadas/i);
  });
  it("un mini-odontograma tiene cinco superficies y marca solo las afectadas como rehacer", () => {
    const glyph = clinicalGlyphFor({
      treatmentCode: "FILLING",
      tooth: "26",
      surfaces: ["M", "O", "D"],
      clinicalStatus: "filling_bad",
    });
    const { container } = render(<ClinicalGlyph glyph={glyph!} />);
    expect(container.querySelectorAll("[data-surface]")).toHaveLength(5);
    expect(container.querySelectorAll('[data-surface][data-active="true"]')).toHaveLength(3);
    expect(screen.getByRole("img")).toHaveAccessibleName(/insatisfactorio.*rehacer/i);
  });
});
it("drag grip keyboard activation does not open appointment details", () => {
  const { onOpen } = showCard();
  const grip = screen.getByRole("button", { name: "Mover cita de Ana García López" });
  fireEvent.keyDown(grip, { key: " ", code: "Space" });
  expect(onOpen).not.toHaveBeenCalled();
  fireEvent.keyDown(screen.getByRole("article"), { key: "Enter" });
  expect(onOpen).toHaveBeenCalledTimes(1);
});
