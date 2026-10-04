// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { NavigationProvider } from "@/shared/navigation/navigation-provider";
import { dentyQueryKeys } from "@/shared/query";
import { OdontogramWorkspace } from "./odontogram-workspace";

const api = vi.hoisted(() => ({
  batch: vi.fn(),
  syncPlan: vi.fn(),
  syncBudget: vi.fn(),
  flow: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/app/patients/p/odontogram",
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/shared/api/browser", () => ({
  getBrowserApi: () => ({
    clinical: {
      odontogram: {
        get: () => new Promise(() => {}),
        batch: api.batch,
        snapshots: { list: async () => ({ items: [] }) },
      },
      sync: { plan: api.syncPlan, budget: api.syncBudget },
    },
  }),
}));
vi.mock("@/shared/patients/patient-data", () => ({
  usePatientQuery: () => ({ data: { birthDate: null } }),
}));
vi.mock("@/shared/clinical/clinical-pipeline-card", () => ({ ClinicalPipelineCard: () => null }));
vi.mock("@/shared/clinical/clinical-workspace", () => ({ ClinicalWorkspace: () => null }));
vi.mock("@/shared/clinical/treatment-flow", () => ({
  TreatmentFlowModal: ({ opened }: { opened: boolean }) => {
    api.flow(opened);
    return null;
  },
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const planResult = {
  plan: { id: "plan", items: [{ id: "i1", status: "PLANNED" }] },
  summary: { updated: 1, added: 1, superseded: 0, coveredByExisting: 0, linked: 0, completed: 0 },
  sync: { budget: null },
};

test("edits save themselves, keep the editor in place and bring plan and budget up to date", async () => {
  let version = 1;
  api.batch.mockImplementation(async (_id: string, input: { expectedVersion: number }) => {
    expect(input.expectedVersion).toBe(version);
    version += 1;
    // The real batch endpoint answers only with the saved entities and version.
    return { version, entities: [] };
  });
  api.syncPlan.mockResolvedValue(planResult);
  api.syncBudget.mockResolvedValue({});
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  queryClient.setQueryData(dentyQueryKeys.clinical.odontogram("p"), {
    id: "p",
    version: 1,
    entities: [],
    periodontal: [{ id: "m1", tooth: "16", site: "MV", probingDepth: 3 }],
  });
  queryClient.setQueryData(dentyQueryKeys.clinical.snapshots("p"), { items: [] });
  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <NavigationProvider>
          <OdontogramWorkspace patientId="p" />
        </NavigationProvider>
      </MantineProvider>
    </QueryClientProvider>,
  );

  expect(screen.getByText("Se guarda automáticamente")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Aplicar al diente seleccionado" }));
  expect(screen.getByText("Cambios pendientes…")).toBeInTheDocument();

  await waitFor(() => expect(api.batch).toHaveBeenCalledTimes(1), { timeout: 3000 });
  await waitFor(() => expect(api.syncBudget).toHaveBeenCalledTimes(1));
  expect(api.syncPlan).toHaveBeenCalledTimes(1);
  expect(await screen.findByText("Guardado · plan y presupuesto al día")).toBeInTheDocument();
  expect(api.flow).not.toHaveBeenCalledWith(true);

  // Same editor instance: the next edit saves against the version just written.
  fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));
  await waitFor(() => expect(api.batch).toHaveBeenCalledTimes(2), { timeout: 3000 });
  expect(version).toBe(3);
  queryClient.clear();
}, 15_000);
