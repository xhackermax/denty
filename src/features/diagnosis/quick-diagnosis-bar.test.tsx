// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/api/browser", () => ({
  getBrowserApi: () => ({ diagnoses: { list: async () => ({ current: [], history: [] }) } }),
}));

vi.mock("./treatment-suggestion-panel", () => ({ TreatmentSuggestionPanel: () => null }));

import { QuickDiagnosisBar } from "./quick-diagnosis-bar";

afterEach(cleanup);

describe("QuickDiagnosisBar", () => {
  it("uses the periodontal-specific quick diagnosis label", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MantineProvider>
          <QuickDiagnosisBar patientId="patient-1" readings={[]} />
        </MantineProvider>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole("region", { name: "Diagnóstico periodontal rápido" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Diagnóstico periodontal rápido")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Historial/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
