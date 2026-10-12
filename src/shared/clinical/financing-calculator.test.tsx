// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FinancingCalculator } from "./financing-calculator";

const BUDGETS = [{
  id: "budget-1", code: "P-2026-1", title: "Rehabilitación", status: "DRAFT",
  totalCents: 180_000, items: [],
}];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("financiación a continuación del presupuesto", () => {
  it("compara varios plazos, recalcula al pulsar y no permite enviar préstamos", () => {
    render(<MantineProvider><FinancingCalculator budgets={BUDGETS} /></MantineProvider>);
    fireEvent.click(screen.getByText("Calculadora de financiación · Simular cuotas"));
    const comparison = screen.getByRole("region", { name: "Comparar plazos de financiación" });
    expect(within(comparison).getByRole("button", { name: /12 meses/ })).toBeInTheDocument();
    expect(within(comparison).getByRole("button", { name: /36 meses/ })).toBeInTheDocument();
    fireEvent.click(within(comparison).getByRole("button", { name: /12 meses/ }));
    expect(within(comparison).getByRole("button", { name: /12 meses/ }))
      .toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/12 cuotas\. Última cuota/)).toBeInTheDocument();
    expect(screen.getByText(/No realiza cobros ni solicita financiación/)).toBeInTheDocument();
  });

  it("copia un resumen explícitamente orientativo sin acciones de envío automáticas", async () => {
    const copy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true, value: { writeText: copy },
    });
    render(<MantineProvider><FinancingCalculator budgets={BUDGETS} /></MantineProvider>);
    fireEvent.click(screen.getByText("Calculadora de financiación · Simular cuotas"));
    fireEvent.click(screen.getByRole("button", { name: "Copiar simulación para el paciente" }));
    await waitFor(() => expect(copy).toHaveBeenCalledOnce());
    const summary = String(copy.mock.calls[0]?.[0]);
    expect(summary).toContain("Presupuesto: P-2026-1 · Rehabilitación");
    expect(summary).toContain("TAE teórica aproximada");
    expect(summary).toContain("no oferta vinculante");
    expect(screen.getByText(/Simulación copiada/)).toBeInTheDocument();
  });

  it("starts collapsed and prints a clean finance simulation", () => {
    const print = vi.fn();
    const documentWrite = vi.fn();
    const popup = { document: { open: vi.fn(), write: documentWrite, close: vi.fn() }, focus: vi.fn(), print };
    const open = vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    render(<MantineProvider><FinancingCalculator budgets={BUDGETS} /></MantineProvider>);
    const details = screen.getByTestId("financing-calculator") as HTMLDetailsElement;
    expect(details.open).toBe(false);
    fireEvent.click(screen.getByText("Calculadora de financiación · Simular cuotas"));
    expect(details.open).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Imprimir PDF" }));
    expect(open).toHaveBeenCalledWith("", "_blank");
    expect(documentWrite.mock.calls[0]?.[0]).toContain("P-2026-1");
    expect(documentWrite.mock.calls[0]?.[0]).toContain("Simulación de financiación");
    expect(print).toHaveBeenCalledOnce();
  });

  it("no permite simular cuando no hay presupuestos guardados", () => {
    render(<MantineProvider><FinancingCalculator budgets={[]} /></MantineProvider>);
    expect(screen.queryByRole("heading", { name: "Calculadora de financiación" }))
      .not.toBeInTheDocument();
  });
});
