// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const api = vi.hoisted(() => ({
  createLab: vi.fn(),
  updateLab: vi.fn(),
  upsertPrice: vi.fn(),
}));

vi.mock("./modules/laboratory-data", () => ({
  useCreateLaboratoryMutation: () => ({ mutate: api.createLab, isPending: false }),
  useLaboratoriesQuery: () => ({
    data: {
      items: [
        {
          id: "lab-1",
          name: "Ceramica Norte",
          taxId: "B123",
          phone: "911223344",
          email: "norte@example.com",
          address: "Calle Mayor 1",
          defaultTurnaroundDays: 7,
          active: true,
          version: 1,
        },
      ],
    },
    isError: false,
    isLoading: false,
  }),
  useLaboratoryPriceListQuery: () => ({
    data: {
      items: [
        {
          id: "price-1",
          laboratoryId: "lab-1",
          workTypeId: "type-1",
          workTypeName: "Corona zirconio",
          priceCents: 12000,
          turnaroundDays: 6,
          active: true,
          version: 1,
        },
      ],
    },
    isError: false,
  }),
  useUpdateLaboratoryMutation: () => ({ mutate: api.updateLab, isPending: false }),
  useUpsertLaboratoryPriceMutation: () => ({ mutate: api.upsertPrice, isPending: false }),
}));

import { AdminLaboratoriesPanel } from "./admin-laboratories-panel";

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
});

function mount() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <AdminLaboratoriesPanel />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

test("admin configures laboratory identity and performed treatments with cost and time", async () => {
  mount();

  expect(screen.getByRole("heading", { name: "Laboratorios" })).toBeInTheDocument();
  expect(screen.getAllByText("Ceramica Norte").length).toBeGreaterThan(0);
  expect(screen.getByText(/B123/)).toBeInTheDocument();
  expect(screen.getByText(/Calle Mayor 1/)).toBeInTheDocument();
  expect(screen.getByText("Corona zirconio")).toBeInTheDocument();
  expect(screen.getByText(/120,00/)).toBeInTheDocument();
  expect(screen.getByText(/6 dias/)).toBeInTheDocument();

  fireEvent.change(screen.getByRole("textbox", { name: "Nombre del laboratorio" }), {
    target: { value: "Digital Lab" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Datos fiscales" }), {
    target: { value: "B999" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Telefono" }), {
    target: { value: "934445566" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Correo" }), {
    target: { value: "digital@example.com" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Ubicacion" }), {
    target: { value: "Avenida Dental 8" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Crear laboratorio" }));

  await waitFor(() =>
    expect(api.createLab).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Digital Lab",
        taxId: "B999",
        phone: "934445566",
        email: "digital@example.com",
        address: "Avenida Dental 8",
      }),
      expect.anything(),
    ),
  );

  fireEvent.change(screen.getByRole("combobox", { name: "Laboratorio" }), {
    target: { value: "Ceramica Norte" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Tratamiento realizado" }), {
    target: { value: "Incrustacion" },
  });
  fireEvent.change(screen.getByLabelText("Coste (€)"), { target: { value: "80" } });
  fireEvent.change(screen.getByLabelText("Tiempo (dias)"), { target: { value: "5" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar tratamiento" }));

  await waitFor(() =>
    expect(api.upsertPrice).toHaveBeenCalledWith(
      expect.objectContaining({
        laboratoryId: "lab-1",
        workTypeName: "Incrustacion",
        priceCents: 8000,
        turnaroundDays: 5,
      }),
      expect.anything(),
    ),
  );
});
