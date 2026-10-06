// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tenant = vi.hoisted(() => ({
  role: "ADMIN",
  permissions: ["lab.read", "lab.write", "finance.read", "finance.write"],
}));

vi.mock("@/shared/tenancy/active-context", () => ({
  useActiveTenant: () => tenant,
}));

vi.mock("@/shared/patients/patient-data", () => ({
  usePatientsQuery: () => ({ data: { items: [] }, isError: false }),
}));

vi.mock("../laboratory-data", () => ({
  useAllocateSupplierPaymentMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateLaboratoryMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateLabWorkMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useLabAttachmentMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useLabCallPatientTaskMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useLaboratoriesQuery: () => ({
    data: {
      items: [
        {
          id: "lab-1",
          name: "Ceramica Norte",
          taxId: "B123",
          phone: null,
          email: null,
          defaultTurnaroundDays: 7,
          active: true,
          version: 1,
        },
      ],
    },
    isError: false,
  }),
  useLaboratoryBalancesQuery: (enabled: boolean) => ({
    data: enabled ? { items: [] } : undefined,
    isError: false,
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
  useLaboratoryQuery: () => ({ data: { items: [] }, isError: false, isLoading: false }),
  useLabReworkMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useLabTransitionMutation: () => ({ mutate: vi.fn(), isPending: false }),
  usePatientClinicalPlanQuery: () => ({ data: { items: [] } }),
  useRecordSupplierInvoiceMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useRecordSupplierPaymentMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSupplierInvoicesQuery: (enabled: boolean) => ({
    data: enabled ? { items: [] } : undefined,
    isError: false,
  }),
  useUpdateLaboratoryMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useUpsertLaboratoryPriceMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

import { LaboratoryModule } from "../laboratory-module";

function renderModule() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider env="test">
        <LaboratoryModule />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

afterEach(cleanup);

beforeEach(() => {
  tenant.role = "ADMIN";
  tenant.permissions = ["lab.read", "lab.write", "finance.read", "finance.write"];
});

describe("LaboratoryModule", () => {
  it("separa uso diario, finanzas y configuracion para administracion", () => {
    renderModule();

    expect(screen.getByRole("heading", { name: "Uso diario del laboratorio" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Facturas y pagos" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Configuracion de laboratorios" })).toBeInTheDocument();
    expect(screen.getByText("Corona zirconio")).toBeInTheDocument();
  });

  it("oculta configuracion y finanzas a perfiles sin permisos administrativos ni financieros", () => {
    tenant.role = "ASSISTANT";
    tenant.permissions = ["lab.read", "lab.write"];

    renderModule();

    expect(screen.getByRole("heading", { name: "Uso diario del laboratorio" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Facturas y pagos" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Configuracion de laboratorios" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Corona zirconio")).not.toBeInTheDocument();
  });
});
