// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { AdminTreatmentCatalogPanel } from "./admin-treatment-catalog-panel";
const api = vi.hoisted(() => ({ update: vi.fn(), create: vi.fn(), requiresLab: false }));
vi.mock("@/shared/api/browser", () => ({
  getBrowserApi: () => ({
    admin: {
      treatmentCatalog: {
        list: async () => ({
          items: [
            {
              id: "crown",
              code: "CROWN",
              name: "Corona",
              defaultPriceCents: 50000,
              baseCostCents: 0,
              requiresLab: api.requiresLab,
              active: true,
              version: 3,
            },
          ],
        }),
        update: api.update,
        create: api.create,
      },
    },
  }),
}));
afterEach(cleanup);
beforeEach(() => {
  api.requiresLab = false;
  vi.clearAllMocks();
});
function mount() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <AdminTreatmentCatalogPanel />
      </MantineProvider>
    </QueryClientProvider>,
  );
}
test.each([true, false])(
  "an administrator can edit and persist requiresLab=%s",
  async (initial) => {
    api.requiresLab = initial;
    api.update.mockImplementation(async (_id, payload) => {
      api.requiresLab = payload.requiresLab;
      return {};
    });
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Editar" }));
    const requirement = screen.getByRole("switch", { name: "Requiere laboratorio CROWN" });
    expect(requirement).toHaveProperty("checked", initial);
    fireEvent.click(requirement);
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith(
        "crown",
        expect.objectContaining({ expectedVersion: 3, requiresLab: !initial }),
      ),
    );
    await waitFor(() => expect(screen.queryByRole("button", { name: "Guardar" })).toBeNull());
    expect(api.requiresLab).toBe(!initial);
  },
);
test("creating a treatment persists the laboratory requirement", async () => {
  mount();
  fireEvent.change(screen.getByRole("textbox", { name: "Código" }), {
    target: { value: "CROWN2" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Tratamiento" }), {
    target: { value: "Corona nueva" },
  });
  fireEvent.click(screen.getByRole("switch", { name: "Requiere laboratorio" }));
  fireEvent.click(screen.getByRole("button", { name: "Añadir tratamiento" }));
  await waitFor(() =>
    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({ code: "CROWN2", requiresLab: true }),
    ),
  );
});

test("enabling the requirement exposes the patient's linked laboratory action after saving", async () => {
  const { ClinicalWorkspace } = await import("@/shared/clinical/clinical-workspace");
  const { dentyQueryKeys } = await import("@/shared/query");
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  client.setQueryData(dentyQueryKeys.clinical.plan("p1"), {
    status: "ACTIVE",
    items: [
      {
        id: "item1",
        treatmentCatalogId: "crown",
        treatmentCode: "CROWN",
        label: "Corona",
        phase: 1,
        status: "PLANNED",
        tooth: "16",
        priceCents: 50000,
      },
    ],
  });
  client.setQueryData(dentyQueryKeys.clinical.workflow("p1"), {});
  client.setQueryData(dentyQueryKeys.clinical.sync("p1"), {});
  api.update.mockImplementation(async (_id, payload) => {
    api.requiresLab = payload.requiresLab;
    return {};
  });
  render(
    <QueryClientProvider client={client}>
      <MantineProvider>
        <AdminTreatmentCatalogPanel />
        <ClinicalWorkspace patientId="p1" />
      </MantineProvider>
    </QueryClientProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Editar" }));
  expect(screen.queryByRole("link", { name: "Enviar a laboratorio" })).toBeNull();
  fireEvent.click(screen.getByRole("switch", { name: "Requiere laboratorio CROWN" }));
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
  expect(await screen.findByRole("link", { name: "Enviar a laboratorio" })).toHaveAttribute(
    "href",
    "/app/laboratory?patientId=p1&planItemId=item1",
  );
});
