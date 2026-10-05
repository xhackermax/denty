// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const downloadAccountingCsv = vi.fn();
const openInvoicePdf = vi.fn();
const query = { data: undefined, isError: false, isLoading: false, isPending: false };
const verifactuQuery = { ...query, data: { counts: { pending: 0 } } };
const invoiceQuery = {
  ...query,
  data: {
    items: [
      { id: "inv1", fullNumber: "A-1", customerName: "Ana", totalCents: 1000, status: "DRAFT" },
    ],
  },
};
const paymentsQuery = { ...query, data: { items: [] } };

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("./finance-data", () => ({
  downloadAccountingCsv: (...args: unknown[]) => downloadAccountingCsv(...args),
  openInvoicePdf: (...args: unknown[]) => openInvoicePdf(...args),
  useFinanceQueries: () => ({
    summary: query,
    verifactu: verifactuQuery,
    invoices: invoiceQuery,
    payments: paymentsQuery,
  }),
  useIssueInvoiceMutation: () => ({ mutate: vi.fn(), error: null }),
  useSubmitVerifactuMutation: () => ({ mutate: vi.fn(), error: null }),
}));
vi.mock("@/features/payments/patient-charge-panel", () => ({ PatientChargePanel: () => null }));
vi.mock("@/shared/clinical/clinical-sync-card", () => ({ ClinicalSyncCard: () => null }));
vi.mock("@/shared/motion", () => ({ MotionNumber: () => null }));

import { FinanceModule } from "./finance-module";

function renderModule() {
  return render(
    <MantineProvider>
      <FinanceModule />
    </MantineProvider>,
  );
}

describe("FinanceModule export actions", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    Object.assign(query, { data: undefined, isError: false, isLoading: false, isPending: false });
    Object.assign(verifactuQuery, {
      data: { counts: { pending: 0 } },
      isError: false,
      isLoading: false,
      isPending: false,
    });
    Object.assign(invoiceQuery, {
      data: {
        items: [
          {
            id: "inv1",
            fullNumber: "A-1",
            customerName: "Ana",
            totalCents: 1000,
            status: "DRAFT",
          },
        ],
      },
      isError: false,
      isLoading: false,
      isPending: false,
    });
    Object.assign(paymentsQuery, {
      data: { items: [] },
      isError: false,
      isLoading: false,
      isPending: false,
    });
  });

  it("shows an error when the CSV export fails", async () => {
    downloadAccountingCsv.mockRejectedValue(new Error("Sin permisos de contabilidad"));
    renderModule();
    fireEvent.click(screen.getByRole("button", { name: "Exportar CSV" }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("Sin permisos de contabilidad"),
    );
  });

  it("shows an error when the invoice PDF fails", async () => {
    openInvoicePdf.mockRejectedValue(new Error("PDF no disponible"));
    renderModule();
    fireEvent.click(screen.getByRole("button", { name: "PDF" }));
    await waitFor(() => expect(openInvoicePdf).toHaveBeenCalledWith("inv1"));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("PDF no disponible"),
    );
  });

  it("does not show zeroes or empty lists when finance queries fail", () => {
    Object.assign(query, { data: undefined, isError: true, isLoading: false, isPending: false });
    Object.assign(verifactuQuery, {
      data: undefined,
      isError: true,
      isLoading: false,
      isPending: false,
    });
    Object.assign(invoiceQuery, {
      data: undefined,
      isError: true,
      isLoading: false,
      isPending: false,
    });
    Object.assign(paymentsQuery, {
      data: undefined,
      isError: true,
      isLoading: false,
      isPending: false,
    });

    renderModule();

    expect(screen.getByRole("alert").textContent).toContain("Hay datos financieros no disponibles");
    expect(screen.getAllByText("No disponible")).toHaveLength(7);
    expect(screen.getByText("Facturas no disponibles.")).toBeInTheDocument();
    expect(screen.getByText("Pagos no disponibles.")).toBeInTheDocument();
    expect(screen.queryByText("Sin facturas.")).not.toBeInTheDocument();
    expect(screen.queryByText("Sin pagos.")).not.toBeInTheDocument();
  });

  it("shows loading states instead of zeroes before finance queries resolve", () => {
    Object.assign(query, { data: undefined, isError: false, isLoading: true, isPending: true });
    Object.assign(verifactuQuery, {
      data: undefined,
      isError: false,
      isLoading: true,
      isPending: true,
    });
    Object.assign(invoiceQuery, {
      data: undefined,
      isError: false,
      isLoading: true,
      isPending: true,
    });
    Object.assign(paymentsQuery, {
      data: undefined,
      isError: false,
      isLoading: true,
      isPending: true,
    });

    renderModule();

    expect(screen.getAllByText("Cargando…")).toHaveLength(7);
    expect(screen.getByText("Cargando facturas…")).toBeInTheDocument();
    expect(screen.getByText("Cargando pagos…")).toBeInTheDocument();
    expect(screen.queryByText("Sin facturas.")).not.toBeInTheDocument();
    expect(screen.queryByText("Sin pagos.")).not.toBeInTheDocument();
  });
});
