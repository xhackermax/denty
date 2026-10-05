// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DentalEntity } from "@/domain";
import { OdontogramVisitSummaryPanel } from "./odontogram-visit-summary";

function entity(
  partial: Partial<DentalEntity> & Pick<DentalEntity, "id" | "entityType" | "status">,
) {
  return {
    active: true,
    ...partial,
  } as DentalEntity;
}

function renderPanel(entities: readonly DentalEntity[]) {
  return render(
    <MantineProvider>
      <OdontogramVisitSummaryPanel entities={entities} readOnly={false} />
    </MantineProvider>,
  );
}

afterEach(() => cleanup());

describe("OdontogramVisitSummaryPanel", () => {
  it("genera un resumen editable de los hallazgos activos del odontograma", () => {
    renderPanel([
      entity({ id: "caries-36", entityType: "CARIES", status: "caries", tooth: "36" }),
      entity({ id: "missing-46", entityType: "MISSING", status: "missing", tooth: "46" }),
    ]);

    expect(screen.getByLabelText("Resumen editable de hoy")).toHaveValue(
      "Diente 36: Caries.\nDiente 46: Ausente.",
    );
    expect(screen.getByText("2 hallazgos")).toBeInTheDocument();
  });

  it("mantiene las ediciones manuales hasta que se regenera el resumen", () => {
    const { rerender } = renderPanel([
      entity({ id: "caries-36", entityType: "CARIES", status: "caries", tooth: "36" }),
    ]);
    const textarea = screen.getByLabelText("Resumen editable de hoy");

    fireEvent.change(textarea, { target: { value: "Paciente refiere dolor al frío." } });
    rerender(
      <MantineProvider>
        <OdontogramVisitSummaryPanel
          entities={[
            entity({ id: "caries-36", entityType: "CARIES", status: "caries", tooth: "36" }),
            entity({
              id: "filling-35",
              entityType: "RESTORATION",
              status: "filling_pending",
              tooth: "35",
            }),
          ]}
          readOnly={false}
        />
      </MantineProvider>,
    );

    expect(screen.getByLabelText("Resumen editable de hoy")).toHaveValue(
      "Paciente refiere dolor al frío.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Regenerar desde odontograma" }));
    expect(screen.getByLabelText("Resumen editable de hoy")).toHaveValue(
      "Diente 35: Obturación pendiente.\nDiente 36: Caries.",
    );
  });

  it("guarda el resumen editable y lo previsto para la siguiente visita", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <MantineProvider>
        <OdontogramVisitSummaryPanel
          entities={[
            entity({ id: "caries-36", entityType: "CARIES", status: "caries", tooth: "36" }),
          ]}
          readOnly={false}
          onSaveEncounter={onSave}
        />
      </MantineProvider>,
    );

    fireEvent.change(screen.getByLabelText("Previsto para la próxima visita"), {
      target: { value: "Reconstrucción 36 y valorar endodoncia." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar en historia clínica" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        narrativeNote: "Diente 36: Caries.",
        nextVisit: "Reconstrucción 36 y valorar endodoncia.",
        sign: true,
      }),
    );
    expect(await screen.findByText("Nota guardada en historia clínica.")).toBeInTheDocument();
  });
});
