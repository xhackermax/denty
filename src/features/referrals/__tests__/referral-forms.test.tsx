// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { program } from "./fixtures";

const mocks = vi.hoisted(() => ({ create: vi.fn(), save: vi.fn() }));

vi.mock("@/shared/patients/patient-data", () => ({
  usePatientsQuery: () => ({
    data: {
      items: [
        { id: "p-ana", firstName: "Ana", lastName: "López", recordNumber: "101" },
        { id: "p-ben", firstName: "Ben", lastName: "Ruiz", recordNumber: "102" },
      ],
    },
    isError: false,
  }),
}));
vi.mock("../referrals-data", () => ({
  useCreateReferralMutation: () => ({ mutate: mocks.create, isPending: false, error: null }),
  useSaveReferralProgramMutation: () => ({ mutate: mocks.save, isPending: false, error: null }),
  useReferralProgramsQuery: () => ({
    data: { items: [program(), program({ id: "g2", name: "Verano", active: true })] },
  }),
  useReferralSitesQuery: () => ({ data: [{ id: "s1", name: "Centro" }] }),
}));

import { ReferralLinkDialog } from "../referral-link-dialog";
import { ReferralProgramForm } from "../referral-program-form";

const wrap = (node: React.ReactNode) =>
  render(<MantineProvider env="test">{node}</MantineProvider>);

async function choosePatient(label: RegExp, name: RegExp) {
  const input = screen.getByLabelText(label, { selector: "input" });
  fireEvent.click(input);
  fireEvent.change(input, { target: { value: "an" } });
  fireEvent.click(await screen.findByRole("option", { name }, { timeout: 2000 }));
}

afterEach(cleanup);
beforeEach(() => {
  mocks.create.mockReset();
  mocks.save.mockReset();
});

describe("ReferralLinkDialog", () => {
  it("pide los dos pacientes antes de asociar", () => {
    wrap(<ReferralLinkDialog onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Asociar" }));
    expect(screen.getByText("Elige quién recomienda.")).toBeInTheDocument();
    expect(screen.getByText("Elige al paciente recomendado.")).toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("asocia con el recomendado de la ficha y marca los programas inactivos", async () => {
    wrap(<ReferralLinkDialog onClose={vi.fn()} referred={{ id: "p-ben", name: "Ben Ruiz" }} />);
    await choosePatient(/^Paciente que recomienda/, /Ana López/);
    fireEvent.click(screen.getByLabelText(/^Programa de beneficios/, { selector: "input" }));
    expect(
      await screen.findByRole("option", { name: "Recomienda (inactivo)" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Fecha de recomendación/), {
      target: { value: "2026-10-20" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Asociar" }));
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        referrerPatientId: "p-ana",
        referredPatientId: "p-ben",
        status: "PENDING",
        source: "DECLARADO_EN_RECEPCION",
        reportedAt: "2026-10-20T12:00:00.000+02:00",
        notes: null,
      }),
      expect.anything(),
    );
  });
});

describe("ReferralProgramForm", () => {
  it("nace inactivo, sin importes y explica qué falta", () => {
    wrap(<ReferralProgramForm program={null} onClose={vi.fn()} />);
    expect(screen.getByRole("switch", { name: /Programa activo/ })).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Crear programa" }));
    expect(screen.getByText("Mínimo 3 caracteres.")).toBeInTheDocument();
    expect(screen.getByText("Escribe las condiciones.")).toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("activar exige confirmar la revisión normativa", () => {
    wrap(<ReferralProgramForm program={null} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Nombre del programa/), {
      target: { value: "Recomienda" },
    });
    fireEvent.change(screen.getByLabelText(/Condiciones y exclusiones/), {
      target: { value: "Solo pacientes nuevos." },
    });
    fireEvent.click(screen.getByRole("switch", { name: /Programa activo/ }));
    expect(screen.getByText(/Revisa la normativa comercial/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Crear programa" }));
    expect(mocks.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText("He revisado las condiciones con la clínica"));
    fireEvent.click(screen.getByRole("button", { name: "Crear programa" }));
    expect(mocks.save).toHaveBeenCalledWith(
      {
        programId: null,
        program: expect.objectContaining({
          name: "Recomienda",
          active: true,
          referrerReward: { kind: "NONE", valueCents: null, percentBps: null, description: null },
        }),
      },
      expect.anything(),
    );
  });

  it("al editar avisa de que los beneficios generados no cambian y envía la versión", () => {
    wrap(<ReferralProgramForm program={program()} onClose={vi.fn()} />);
    expect(screen.getByText(/Los ya generados conservan sus condiciones/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({ programId: "g1", expectedVersion: 1 }),
      expect.anything(),
    );
  });
});
