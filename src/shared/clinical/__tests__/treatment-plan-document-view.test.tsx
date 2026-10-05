// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { TreatmentPlanDocumentButton } from "../treatment-plan-document-view";

const printHtml = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("@/shared/print/print-html", () => ({ printHtml }));
vi.mock("@/shared/documents/document-context", () => ({
  useDocumentContext: () => ({ clinicName: "Clínica Sonrisa" }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const items = [
  {
    id: "1",
    treatmentCode: "FILLING",
    label: "Obturación",
    tooth: "46",
    priceCents: 6000,
    status: "PLANNED",
  },
  {
    id: "2",
    treatmentCode: "IMPLANT",
    label: "Implante",
    tooth: "36",
    priceCents: 90000,
    status: "PLANNED",
  },
];
const patient = { firstName: "Lucía", lastName: "Martín", recordNumber: "DNT-7" };

function renderButton(planItems = items) {
  render(
    <MantineProvider>
      <TreatmentPlanDocumentButton items={planItems} patient={patient} />
    </MantineProvider>,
  );
}

test("explains the plan phase by phase in plain words", async () => {
  renderButton();
  fireEvent.click(screen.getByRole("button", { name: "Documento del plan" }));
  const dialog = await screen.findByRole("dialog", { name: "Tu plan de tratamiento" });
  expect(within(dialog).getByText(/Lucía, este es tu plan/)).toBeInTheDocument();
  const phase1 = within(dialog).getByRole("region", { name: "Fase 1 · Recuperar la salud" });
  expect(within(phase1).getByText("1. Empaste · dientes 46")).toBeInTheDocument();
  const phase2 = within(dialog).getByRole("region", { name: "Fase 2 · Reponer y mejorar" });
  expect(within(phase2).getByText("1. Implante · dientes 36")).toBeInTheDocument();
  expect(within(phase2).getAllByText("Inconvenientes y riesgos").length).toBe(1);
});

test("prints the same document for the patient to take home", async () => {
  renderButton();
  fireEvent.click(screen.getByRole("button", { name: "Documento del plan" }));
  const dialog = await screen.findByRole("dialog", { name: "Tu plan de tratamiento" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Imprimir para el paciente" }));
  await waitFor(() => expect(printHtml).toHaveBeenCalledTimes(1));
  const [html] = printHtml.mock.calls[0] as unknown as [string];
  expect(html).toContain("Clínica Sonrisa");
  expect(html).toContain("Ficha DNT-7");
  expect(html).toContain("Fase 2 · Reponer y mejorar");
});

test("is unavailable while the plan has nothing to explain", () => {
  renderButton([]);
  expect(screen.getByRole("button", { name: "Documento del plan" })).toBeDisabled();
});
