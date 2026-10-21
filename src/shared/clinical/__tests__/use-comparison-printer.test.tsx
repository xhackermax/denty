// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import type { TreatmentComparisonRecord } from "@/shared/api/schemas/clinical-arguments";

const mocks = vi.hoisted(() => ({ printHtml: vi.fn(async (_html: string) => undefined) }));
vi.mock("@/shared/print/print-html", () => ({ printHtml: mocks.printHtml }));
vi.mock("@/shared/documents/document-context", () => ({
  useDocumentContext: () => ({ clinicName: "Clínica Sonrisa" }),
}));
vi.mock("@/shared/patients/patient-data", () => ({
  usePatientQuery: () => ({ data: { firstName: "Ana", lastName: "López", recordNumber: "H-12" } }),
}));

import { useComparisonPrinter } from "../use-comparison-printer";

const record = {
  id: "c1",
  patientId: "p1",
  seriesId: "s1",
  version: 1,
  decision: "POSTPONED",
  chosenOptionId: null,
  decisionNote: "",
  catalogVersion: "1.0",
  professionalName: "Dra. Ruiz",
  createdBy: null,
  createdAt: "2026-10-20T22:30:00Z",
  content: { options: [], common: [], consequences: [] },
} satisfies TreatmentComparisonRecord;

describe("useComparisonPrinter", () => {
  test("imprime con los datos del paciente y la fecha en que se guardó, en hora de Madrid", async () => {
    const { result } = renderHook(() => useComparisonPrinter("p1"));
    await act(() => result.current.print(record));
    const html = mocks.printHtml.mock.calls[0]![0];
    expect(html).toContain("Clínica Sonrisa · Ana López · Ficha H-12 · 21/10/2026");
  });

  test("si el navegador bloquea la impresión lo deja en el aviso", async () => {
    mocks.printHtml.mockRejectedValueOnce(new Error("Ventana bloqueada."));
    const { result } = renderHook(() => useComparisonPrinter("p1"));
    await act(() => result.current.print(record));
    expect(result.current.notice.error).toBe("Ventana bloqueada.");
  });
});
