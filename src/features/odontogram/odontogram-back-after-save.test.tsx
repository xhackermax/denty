// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { NavigationProvider } from "@/shared/navigation/navigation-provider";
import { dentyQueryKeys } from "@/shared/query";
import { OdontogramWorkspace } from "./odontogram-workspace";
const api = vi.hoisted(() => ({ batch: vi.fn(), get: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/app/patients/p/odontogram",
  useRouter: () => ({ push: api.push }),
}));
vi.mock("@/shared/api/browser", () => ({
  getBrowserApi: () => ({
    clinical: {
      odontogram: {
        get: api.get,
        batch: api.batch,
        snapshots: { list: async () => ({ items: [] }) },
      },
      budgets: { listForPatient: async () => ({ items: [] }) },
    },
  }),
}));
vi.mock("@/shared/patients/patient-data", () => ({
  usePatientQuery: () => ({
    data: { birthDate: null, firstName: "Lucía", lastName: "Martín", recordNumber: "DNT-0042" },
  }),
}));
vi.mock("@/shared/clinical/clinical-pipeline-card", () => ({ ClinicalPipelineCard: () => null }));
vi.mock("@/shared/clinical/clinical-workspace", () => ({ ClinicalWorkspace: () => null }));
vi.mock("@/shared/clinical/treatment-flow", () => ({ TreatmentFlowModal: () => null }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
function mountEditor() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  const key = dentyQueryKeys.clinical.odontogram("p");
  queryClient.setQueryData(key, { id: "p", version: 1, entities: [], periodontal: [] });
  queryClient.setQueryData(dentyQueryKeys.clinical.snapshots("p"), { items: [] });
  api.get.mockImplementation(() => new Promise(() => {}));
  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <NavigationProvider>
          <OdontogramWorkspace patientId="p" />
        </NavigationProvider>
      </MantineProvider>
    </QueryClientProvider>,
  );
  return { queryClient, key };
}
test("a successful save clears dirty state and Back works while the subsequent read is slow", async () => {
  api.batch.mockResolvedValue({ version: 2, entities: [] });
  const { queryClient, key } = mountEditor();
  fireEvent.click(screen.getByRole("button", { name: "Aplicar al diente seleccionado" }));
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
  await waitFor(() => expect(api.batch).toHaveBeenCalledOnce());
  await waitFor(() => expect(queryClient.getQueryData(key)).toMatchObject({ version: 2 }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled());
  fireEvent.click(screen.getByRole("button", { name: "Volver" }));
  expect(api.push).toHaveBeenCalledWith("/app/patients/p");
  expect(screen.queryByText("Tienes cambios sin guardar")).toBeNull();
  queryClient.clear();
});

test("Back saves pending edits once before leaving even if the background read stalls", async () => {
  api.batch.mockResolvedValue({ version: 2, entities: [] });
  const { queryClient } = mountEditor();
  fireEvent.click(screen.getByRole("button", { name: "Aplicar al diente seleccionado" }));
  fireEvent.click(screen.getByRole("button", { name: "Volver" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
  await waitFor(() => expect(api.push).toHaveBeenCalledWith("/app/patients/p"));
  expect(api.batch).toHaveBeenCalledOnce();
  queryClient.clear();
});
test("Back keeps edits and the committed version unchanged when saving fails", async () => {
  api.batch.mockRejectedValue(new Error("No se pudo guardar"));
  const { queryClient, key } = mountEditor();
  fireEvent.click(screen.getByRole("button", { name: "Aplicar al diente seleccionado" }));
  fireEvent.click(screen.getByRole("button", { name: "Volver" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
  expect(await within(dialog).findByRole("alert")).toHaveTextContent("No se pudo guardar");
  expect(api.push).not.toHaveBeenCalled();
  expect(queryClient.getQueryData(key)).toMatchObject({ version: 1 });
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
  queryClient.clear();
});
