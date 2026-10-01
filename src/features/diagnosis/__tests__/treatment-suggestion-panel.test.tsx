// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, test, expect, vi } from "vitest";
import { TreatmentSuggestionPanel } from "../treatment-suggestion-panel";
import type { ClinicalDiagnosis } from "@/shared/api/schemas/diagnoses";
const api = vi.hoisted(() => ({ diagnoses: { addToPlan: vi.fn(async () => ({ added: 2 })) } }));
vi.mock("@/shared/api/browser", () => ({ getBrowserApi: () => api }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const diagnosis: ClinicalDiagnosis = {
  id: "d",
  clinicId: "c",
  patientId: "p",
  category: "periodontal",
  value: "periodontitis",
  detail: { stage: "III" },
  justification: "CAL",
  status: "active",
  createdAt: "2026-10-01",
  createdBy: "doctor",
  encounterId: null,
  version: 1,
};
const mount = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <TreatmentSuggestionPanel
          diagnosis={diagnosis}
          readings={[
            { tooth: "16", site: "MV", probingDepth: 5, recession: 0 },
            { tooth: "36", site: "MV", probingDepth: 4, recession: 0 },
          ]}
        />
      </MantineProvider>
    </QueryClientProvider>,
  );
test("preselects affected quadrants, permits all four and creates selected items only", async () => {
  mount();
  expect(screen.getByRole("checkbox", { name: "Cuadrante 1" })).toBeChecked();
  expect(screen.getByRole("checkbox", { name: "Cuadrante 3" })).toBeChecked();
  expect(screen.getByRole("checkbox", { name: "Cuadrante 2" })).not.toBeChecked();
  fireEvent.click(screen.getByRole("checkbox", { name: "Reevaluación a las 6–8 semanas" }));
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Mantenimiento periodontal cada 3–4 meses" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Los 4" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Cuadrante 2" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Cuadrante 4" }));
  fireEvent.click(screen.getByRole("button", { name: "Añadir al plan" }));
  await waitFor(() =>
    expect(api.diagnoses.addToPlan).toHaveBeenCalledWith("p", "d", {
      selections: [{ id: "root-planing", quadrants: [1, 3] }],
    }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("2 tratamientos");
});
test("keeps selection and reports catalog errors", async () => {
  api.diagnoses.addToPlan.mockRejectedValueOnce(new Error("Configura el precio del catálogo"));
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Añadir al plan" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Configura el precio");
  expect(screen.getByRole("checkbox", { name: "Cuadrante 1" })).toBeChecked();
});
