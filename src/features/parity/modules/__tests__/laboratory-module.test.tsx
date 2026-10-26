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

const invoices = vi.hoisted(() => ({ items: [] as Array<Record<string, unknown>> }));
const labWorks = vi.hoisted(() => ({ items: [] as Array<Record<string, unknown>> }));

vi.mock("@/shared/tenancy/active-context", () => ({
  useActiveTenant: () => tenant,
}));

vi.mock("@/shared/patients/patient-data", () => ({
  usePatientsQuery: () => ({ data: { items: [] }, isError: false }),
}));

vi.mock("../laboratory-data", () => ({
  downloadSupplierInvoiceDocument: vi.fn(),
  useAttachSupplierInvoiceDocumentMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
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
  useLaboratoryQuery: () => ({ data: labWorks, isError: false, isLoading: false }),
  useLabReworkMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useLabTransitionMutation: () => ({ mutate: vi.fn(), isPending: false }),
  usePatientClinicalPlanQuery: () => ({ data: { items: [] } }),
  useRecordSupplierInvoiceMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useRecordSupplierPaymentMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSupplierInvoicesQuery: (enabled: boolean) => ({
    data: enabled ? { items: invoices.items } : undefined,
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
  invoices.items = [];
  labWorks.items = [];
});

function labWork(id: string, status: string) {
  return {
    id,
    title: `Trabajo ${id}`,
    status,
    version: 1,
    costCents: 0,
    patient: null,
    lab: null,
    clinicalPlanItemId: null,
    appointmentId: null,
    attachments: [],
    statusEvents: [],
    reworks: [],
  };
}

describe("LaboratoryModule", () => {
  it("separa uso diario, finanzas y configuracion para administracion", () => {
    renderModule();

    expect(screen.getByRole("heading", { name: "Uso diario del laboratorio" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Facturas y pagos" })).toBeInTheDocument();
    // Prices and lab setup moved to their own page; the daily view only links to it.
    expect(screen.getByRole("link", { name: "Configuración de laboratorios" })).toHaveAttribute(
      "href",
      "/app/laboratory/configuration",
    );
  });

  it("oculta configuracion y finanzas a perfiles sin permisos administrativos ni financieros", () => {
    tenant.role = "ASSISTANT";
    tenant.permissions = ["lab.read", "lab.write"];

    renderModule();

    expect(screen.getByRole("heading", { name: "Uso diario del laboratorio" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Facturas y pagos" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Configuración de laboratorios" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Corona zirconio")).not.toBeInTheDocument();
  });

  it("permite adjuntar la factura escaneada al registrar y verla despues", () => {
    invoices.items = [
      {
        id: "inv-1",
        laboratoryId: "lab-1",
        invoiceNumber: "F-001",
        issuedAt: "2026-10-01T10:00:00.000Z",
        totalCents: 12000,
        status: "OPEN",
        documentPath: "c/inv-1/scan.pdf",
        documentFileName: "F-001.pdf",
        version: 2,
      },
      {
        id: "inv-2",
        laboratoryId: "lab-1",
        invoiceNumber: "F-002",
        issuedAt: "2026-10-02T10:00:00.000Z",
        totalCents: 5000,
        status: "OPEN",
        documentPath: null,
        version: 1,
      },
    ];

    renderModule();

    expect(screen.getByText("Factura escaneada")).toBeInTheDocument();
    expect(screen.getByText("F-001 · Ceramica Norte")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Ver archivo" })).toHaveLength(1);
    expect(screen.getByText("Reemplazar archivo")).toBeInTheDocument();
    expect(screen.getByText("Adjuntar archivo")).toBeInTheDocument();
  });

  it("colorea el borde de cada trabajo segun su estado", () => {
    labWorks.items = [
      labWork("a", "PLACED"),
      labWork("b", "SENT"),
      labWork("c", "SCANNED"),
      labWork("d", "INCIDENT"),
    ];

    renderModule();

    const tone = (title: string) =>
      screen.getByText(title).closest("[data-tone]")?.getAttribute("data-tone");
    expect(tone("Trabajo a")).toBe("done");
    expect(tone("Trabajo b")).toBe("sent");
    expect(tone("Trabajo c")).toBe("pending");
    expect(tone("Trabajo d")).toBe("incident");
    expect(screen.getByText("Pendiente de enviar")).toBeInTheDocument();
  });
});
