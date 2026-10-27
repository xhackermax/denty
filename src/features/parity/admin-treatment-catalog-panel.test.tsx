// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { AdminTreatmentCatalogPanel } from "./admin-treatment-catalog-panel";
const api = vi.hoisted(() => ({
  update: vi.fn(),
  create: vi.fn(),
  saveStaffTime: vi.fn(),
  removeStaffTime: vi.fn(),
  requiresLab: false,
}));
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
        staffTimes: {
          list: async () => ({
            items: [
              {
                id: "time-1",
                treatmentCatalogId: "crown",
                staffMemberId: "dr-gil",
                staffName: "Dr. Gil",
                durationMin: 70,
                appointmentsMin: 3,
                appointmentsMax: 4,
                version: 1,
              },
            ],
          }),
          save: api.saveStaffTime,
          remove: api.removeStaffTime,
        },
      },
      sites: {
        overview: async () => ({
          sites: [],
          staff: [
            {
              id: "dr-ruiz",
              displayName: "Dra. Ruiz",
              role: "DENTIST",
              active: true,
              collegiateNumber: null,
              hasLogin: true,
              schedules: [],
            },
            {
              id: "front",
              displayName: "Recepción",
              role: "RECEPTION",
              active: true,
              collegiateNumber: null,
              hasLogin: true,
              schedules: [],
            },
          ],
        }),
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

test("an administrator records minutes per visit and the usual number of visits", async () => {
  api.update.mockResolvedValue({});
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "Editar" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Minutos por cita CROWN" }), {
    target: { value: "45" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Citas mínimas CROWN" }), {
    target: { value: "2" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Citas máximas CROWN" }), {
    target: { value: "3" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
  await waitFor(() =>
    expect(api.update).toHaveBeenCalledWith(
      "crown",
      expect.objectContaining({ defaultDurationMin: 45, appointmentsMin: 2, appointmentsMax: 3 }),
    ),
  );
});

test("each doctor can have their own times for a treatment", async () => {
  Element.prototype.scrollIntoView = vi.fn();
  api.saveStaffTime.mockResolvedValue({});
  api.removeStaffTime.mockResolvedValue({ deleted: true });
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "Editar" }));
  const doctors = screen.getByRole("group", { name: "Tiempos por doctor CROWN" });
  expect(await within(doctors).findByText(/Dr\. Gil · 70 min por cita · 3–4 citas/)).toBeVisible();

  // Let the clinic's staff list load before opening the doctor picker.
  await act(async () => {});
  fireEvent.click(within(doctors).getByRole("combobox", { name: "Doctor CROWN" }));
  // Only active dentists are offered.
  // Mantine keeps the dropdown in a transition that jsdom never finishes.
  const option = await screen.findByRole("option", { name: "Dra. Ruiz", hidden: true });
  expect(screen.queryByRole("option", { name: "Recepción", hidden: true })).toBeNull();
  fireEvent.click(option);
  fireEvent.change(within(doctors).getByRole("textbox", { name: "Minutos del doctor CROWN" }), {
    target: { value: "60" },
  });
  fireEvent.click(within(doctors).getByRole("button", { name: "Guardar doctor" }));
  await waitFor(() =>
    expect(api.saveStaffTime).toHaveBeenCalledWith("crown", "dr-ruiz", {
      durationMin: 60,
      appointmentsMin: null,
      appointmentsMax: null,
    }),
  );

  fireEvent.click(within(doctors).getByRole("button", { name: "Quitar tiempos de Dr. Gil" }));
  await waitFor(() => expect(api.removeStaffTime).toHaveBeenCalledWith("crown", "dr-gil"));
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
  // The plan folds treatments into collapsed clinical phases; open the crown's phase.
  const sequence = await screen.findByRole("region", { name: "Plan de tratamiento por fases" });
  fireEvent.click(within(sequence).getByRole("button", { name: /Fase prostodóncica/ }));
  expect(screen.queryByRole("link", { name: "Enviar a laboratorio" })).toBeNull();
  fireEvent.click(screen.getByRole("switch", { name: "Requiere laboratorio CROWN" }));
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
  expect(await screen.findByRole("link", { name: "Enviar a laboratorio" })).toHaveAttribute(
    "href",
    "/app/laboratory?patientId=p1&planItemId=item1",
  );
});
