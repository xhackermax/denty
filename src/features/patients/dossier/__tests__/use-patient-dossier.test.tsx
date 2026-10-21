// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Patient } from "@/shared/api";

const mocks = vi.hoisted(() => ({
  printHtml: vi.fn(async (_html: string) => undefined),
  signatureImage: vi.fn(async (_id: string) => new Blob(["firma"], { type: "image/png" })),
}));

const api = {
  clinical: {
    odontogram: {
      get: async () => ({
        entities: [
          {
            id: "e1",
            tooth: "36",
            entityType: "CARIES",
            status: "caries",
            surfacesJson: [],
            attributesJson: {},
            active: true,
          },
        ],
      }),
    },
    plan: {
      get: async () => ({
        items: [
          {
            id: "i1",
            treatmentCode: "FILLING",
            label: "Obturación",
            tooth: "36",
            status: "PLANNED",
          },
          { id: "i2", treatmentCode: "CLEANING", label: "Limpieza hecha", status: "COMPLETED" },
        ],
      }),
    },
    budgets: { listForPatient: async () => ({ items: [] }) },
  },
  clinicalArguments: { comparisons: async () => ({ items: [] }) },
  portal: { projection: async () => ({ appointments: [] }) },
  documents: {
    list: async () => ({
      items: [
        {
          id: "doc-debt-1",
          type: "DEBT_ACKNOWLEDGEMENT",
          title: "Reconocimiento de deuda",
          status: "SIGNED",
          templateId: "t-debt",
          signerName: "Lucía Martín",
          signedAt: "2026-10-02T10:00:00Z",
          data: { paciente: "Lucía Martín" },
          createdAt: "2026-10-02T09:00:00Z",
        },
        {
          id: "doc-file-1",
          type: "CLINICAL_DOCUMENT",
          title: "Radiografía.pdf",
          status: "FINAL",
          templateId: null,
          createdAt: "2026-10-03T09:00:00Z",
        },
      ],
    }),
    templates: {
      list: async () => ({
        items: [{ id: "t-debt", code: "DEBT_ACKNOWLEDGEMENT", body: "Debo {{importe_deuda}}." }],
      }),
    },
    signatureImage: mocks.signatureImage,
  },
};

vi.mock("@/shared/api/browser", () => ({ getBrowserApi: () => api }));
vi.mock("@/shared/print/print-html", () => ({ printHtml: mocks.printHtml }));
vi.mock("@/shared/documents/document-context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/documents/document-context")>()),
  useDocumentContext: () => ({
    clinicName: "Clínica Sonrisa",
    site: undefined,
    doctorById: () => null,
    defaultDoctorId: null,
  }),
}));

import { usePatientDossierPrinter } from "../use-patient-dossier";

const patient = {
  id: "p1",
  firstName: "Lucía",
  lastName: "Martín",
  recordNumber: "H-12",
  dni: null,
  birthDate: null,
  phone: null,
  email: null,
} as unknown as Patient;

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => usePatientDossierPrinter("p1"), { wrapper });
}

describe("usePatientDossierPrinter", () => {
  beforeEach(() => {
    mocks.printHtml.mockClear();
    mocks.signatureImage.mockClear();
  });

  it("gathers the patient's records and prints them as one dossier", async () => {
    const { result } = setup();
    await act(() => result.current.print(patient, ["Alergia · Penicilina"]));

    expect(mocks.printHtml).toHaveBeenCalledTimes(1);
    const html = mocks.printHtml.mock.calls[0]?.[0] ?? "";
    expect(html).toContain("<title>Dossier de Lucía Martín</title>");
    expect(html).toContain("Clínica Sonrisa");
    expect(html).toContain("Alergia · Penicilina");
    // Only pending plan items reach the plan document.
    expect(html).toContain('<section class="dossier-part-1">');
    expect(html).toContain("dientes 36");
    expect(html).not.toContain("Limpieza hecha");
    expect(html).toContain("Radiografía.pdf");
    expect(html).toContain("(archivo adjunto, no incluido)");
    expect(html).toContain("data:image/png;base64");
    expect(mocks.signatureImage).toHaveBeenCalledWith("doc-debt-1");
    expect(result.current.printing).toBe(false);
    expect(result.current.notice.error).toBeNull();
  });

  it("still prints when a signature image cannot be loaded", async () => {
    mocks.signatureImage.mockRejectedValueOnce(new Error("404"));
    const { result } = setup();
    await act(() => result.current.print(patient, []));
    const html = mocks.printHtml.mock.calls[0]?.[0] ?? "";
    expect(html).toContain("Reconocimiento de deuda");
    expect(html).not.toContain("data:image/png;base64");
  });

  it("tells the user when printing fails", async () => {
    mocks.printHtml.mockRejectedValueOnce(new Error("No se pudo abrir el diálogo de impresión."));
    const { result } = setup();
    await act(() => result.current.print(patient, []));
    expect(result.current.notice.error).toBe("No se pudo abrir el diálogo de impresión.");
    expect(result.current.printing).toBe(false);
  });
});
