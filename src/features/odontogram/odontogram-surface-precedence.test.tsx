// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { NavigationProvider } from "@/shared/navigation/navigation-provider";
import { dentyQueryKeys } from "@/shared/query";
import { OdontogramWorkspace } from "./odontogram-workspace";

const api = vi.hoisted(() => ({
  batch: vi.fn(),
  syncPlan: vi.fn(),
  syncBudget: vi.fn(),
  flow: vi.fn(),
  snapshot: vi.fn(),
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
        snapshots: { list: async () => ({ items: [] }), create: api.snapshot },
      },
      sync: { plan: api.syncPlan, budget: api.syncBudget },
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

function renderChart(entities: unknown[]) {
  api.batch.mockImplementation(async (_id: string, input: { expectedVersion: number }) => ({
    version: input.expectedVersion + 1,
    entities: [],
  }));
  api.syncPlan.mockResolvedValue(planResult);
  api.syncBudget.mockResolvedValue({});
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  queryClient.setQueryData(dentyQueryKeys.clinical.odontogram("p"), {
    id: "p",
    version: 2,
    entities,
    periodontal: [],
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
  return queryClient;
}

const occlusal36 = () => screen.getByRole("button", { name: "Diente 36 superficie oclusal" });

test("a completed filling on a carious face resolves that caries and shows the filling", async () => {
  const client = renderChart([
    {
      id: "c1",
      tooth: "36",
      entityType: "CARIES",
      status: "caries_pending",
      surfacesJson: ["O"],
      active: true,
      version: 2,
    },
  ]);
  expect(occlusal36()).toHaveAttribute("data-state", "caries");
  fireEvent.click(screen.getByRole("button", { name: "Obturación. Realizada. Se aplica a Cara." }));
  fireEvent.click(occlusal36());
  expect(occlusal36()).toHaveAttribute("data-state", "filling");

  await waitFor(() => expect(api.batch).toHaveBeenCalledTimes(1), { timeout: 3000 });
  const [, payload] = api.batch.mock.calls[0] as [
    string,
    { entities: { entityType: string; active: boolean; surfaces?: string[] }[] },
  ];
  const active = payload.entities.filter((entity) => entity.active);
  expect(active).toEqual([expect.objectContaining({ entityType: "RESTORATION", surfaces: ["O"] })]);
  client.clear();
}, 15_000);

test("caries found on a filled face stays visible as the finding to treat", () => {
  const client = renderChart([
    {
      id: "f1",
      tooth: "36",
      entityType: "RESTORATION",
      status: "restoration_completed",
      surfacesJson: ["O"],
      active: true,
      version: 2,
    },
    {
      id: "c1",
      tooth: "36",
      entityType: "CARIES",
      status: "caries_pending",
      surfacesJson: ["O"],
      active: true,
      version: 2,
    },
  ]);
  expect(occlusal36()).toHaveAttribute("data-state", "caries");
  client.clear();
});

test("a whole-tooth tool on a hidden layer does not mark the tooth when it is clicked", async () => {
  const client = renderChart([]);
  fireEvent.click(screen.getByRole("button", { name: "Corona. Realizada. Se aplica a Diente." }));
  expect(screen.getByText("La herramienta activa pertenece a una capa oculta")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Diente 46" }));
  await new Promise((resolve) => setTimeout(resolve, 1500));
  expect(api.batch).not.toHaveBeenCalled();
  client.clear();
}, 15_000);

test("a filling on one face of a multi-face caries leaves the other faces carious", async () => {
  const client = renderChart([
    {
      id: "c1",
      tooth: "36",
      entityType: "CARIES",
      status: "caries_pending",
      surfacesJson: ["O", "M"],
      active: true,
      version: 2,
    },
  ]);
  fireEvent.click(screen.getByRole("button", { name: "Obturación. Realizada. Se aplica a Cara." }));
  fireEvent.click(occlusal36());
  expect(occlusal36()).toHaveAttribute("data-state", "filling");
  expect(screen.getByRole("button", { name: "Diente 36 superficie mesial" })).toHaveAttribute(
    "data-state",
    "caries",
  );
  await waitFor(() => expect(api.batch).toHaveBeenCalledTimes(1), { timeout: 3000 });
  client.clear();
}, 15_000);

test("a bridge picked on the chart is confirmed right there, both ends marked", async () => {
  const client = renderChart([]);
  fireEvent.click(screen.getByRole("button", { name: /^Prótesis fija \/ puente\. / }));
  const reactivate = screen.queryByRole("button", { name: "Reactivar capa" });
  if (reactivate) fireEvent.click(reactivate);
  fireEvent.click(screen.getByRole("button", { name: "Diente 34" }));
  fireEvent.click(screen.getByRole("button", { name: "Diente 36" }));
  expect(screen.getByRole("button", { name: "Diente 36" })).toHaveAttribute(
    "data-prosthesis-endpoint",
    "true",
  );

  fireEvent.click(screen.getByRole("button", { name: "Aplicar puente 34 → 36" }));
  await waitFor(() => expect(api.batch).toHaveBeenCalledTimes(1), { timeout: 3000 });
  const [, payload] = api.batch.mock.calls[0] as [
    string,
    { entities: { entityType: string; tooth?: string }[] },
  ];
  const abutments = payload.entities
    .filter((entity) => entity.entityType === "PROSTHESIS")
    .map((entity) => entity.tooth);
  expect(abutments).toEqual(["34", "35", "36"]);
  expect(screen.getByRole("button", { name: "Diente 34" })).toHaveAttribute(
    "data-prosthesis-endpoint",
    "true",
  );
  expect(screen.getByRole("button", { name: "Diente 36" })).toHaveAttribute(
    "data-prosthesis-endpoint",
    "true",
  );
  client.clear();
}, 15_000);

test("a bridge in progress can be cancelled from the chart", () => {
  const client = renderChart([]);
  fireEvent.click(screen.getByRole("button", { name: /^Prótesis fija \/ puente\. / }));
  const reactivate = screen.queryByRole("button", { name: "Reactivar capa" });
  if (reactivate) fireEvent.click(reactivate);
  fireEvent.click(screen.getByRole("button", { name: "Diente 34" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancelar puente" }));
  expect(screen.getByRole("button", { name: "Diente 34" })).toHaveAttribute(
    "data-prosthesis-endpoint",
    "false",
  );
  client.clear();
});

test("resetting the chart asks first, clears every mark, saves it and can be undone", async () => {
  const client = renderChart([
    {
      id: "c1",
      tooth: "36",
      entityType: "CARIES",
      status: "caries_pending",
      surfacesJson: ["O"],
      active: true,
      version: 2,
    },
  ]);
  fireEvent.click(screen.getByRole("button", { name: "Reiniciar odontograma" }));
  const dialog = await screen.findByRole("dialog", { name: "¿Reiniciar el odontograma?" });
  expect(occlusal36()).toHaveAttribute("data-state", "caries");
  fireEvent.click(within(dialog).getByRole("button", { name: "Reiniciar" }));

  expect(occlusal36()).not.toHaveAttribute("data-state", "caries");
  await waitFor(() => expect(api.batch).toHaveBeenCalledTimes(1), { timeout: 3000 });
  const [, payload] = api.batch.mock.calls[0] as [string, { entities: { active: boolean }[] }];
  expect(payload.entities.filter((entity) => entity.active)).toEqual([]);

  fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));
  expect(occlusal36()).toHaveAttribute("data-state", "caries");
  client.clear();
}, 15_000);

test("cancelling the reset keeps the chart as it was", async () => {
  const client = renderChart([
    {
      id: "c1",
      tooth: "36",
      entityType: "CARIES",
      status: "caries_pending",
      surfacesJson: ["O"],
      active: true,
      version: 2,
    },
  ]);
  fireEvent.click(screen.getByRole("button", { name: "Reiniciar odontograma" }));
  const dialog = await screen.findByRole("dialog", { name: "¿Reiniciar el odontograma?" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
  expect(occlusal36()).toHaveAttribute("data-state", "caries");
  await new Promise((resolve) => setTimeout(resolve, 1500));
  expect(api.batch).not.toHaveBeenCalled();
  client.clear();
}, 15_000);
