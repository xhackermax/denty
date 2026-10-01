// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const downloadAccountingCsv = vi.fn();
const openInvoicePdf = vi.fn();
const query = { data: undefined, isError: false, isLoading: false };

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("./finance-data", () => ({
  downloadAccountingCsv: (...args: unknown[]) => downloadAccountingCsv(...args),
  openInvoicePdf: (...args: unknown[]) => openInvoicePdf(...args),
  useFinanceQueries: () => ({
    summary: query,
    verifactu: query,
    invoices: {
      ...query,
      data: {
        items: [
          { id: "inv1", fullNumber: "A-1", customerName: "Ana", totalCents: 1000, status: "DRAFT" },
        ],
      },
    },
    payments: query,
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
});
