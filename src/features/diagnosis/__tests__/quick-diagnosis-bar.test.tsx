// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, test, expect, vi } from "vitest";
import { QuickDiagnosisBar } from "../quick-diagnosis-bar";
const api = vi.hoisted(() => ({
  diagnoses: {
    list: vi.fn(async () => ({ current: [], history: [] })),
    create: vi.fn(async () => ({ id: "d" })),
    resolve: vi.fn(),
    addToPlan: vi.fn(),
  },
}));
vi.mock("@/shared/api/browser", () => ({ getBrowserApi: () => api }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const mount = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <QuickDiagnosisBar patientId="p" />
      </MantineProvider>
    </QueryClientProvider>,
  );
test("requires a clinical note and saves clinician-confirmed gingivitis", async () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Gingivitis" }));
  expect(screen.getByRole("button", { name: "Guardar diagnóstico" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Gingivitis" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  fireEvent.change(screen.getByLabelText("Justificación"), {
    target: { value: "Sangrado sin pérdida de inserción" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Guardar diagnóstico" }));
  await waitFor(() =>
    expect(api.diagnoses.create).toHaveBeenCalledWith(
      "p",
      expect.objectContaining({
        value: "gingivitis",
        justification: "Sangrado sin pérdida de inserción",
      }),
    ),
  );
});
test("records sleep bruxism signs and certainty", async () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Bruxismo" }));
  fireEvent.click(screen.getByRole("switch", { name: "Bruxismo presente" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Desgaste" }));
  fireEvent.click(screen.getByRole("button", { name: "Guardar diagnóstico" }));
  await waitFor(() =>
    expect(api.diagnoses.create).toHaveBeenCalledWith(
      "p",
      expect.objectContaining({
        value: "bruxism",
        detail: { type: "sleep", certainty: "probable", signs: ["wear"] },
      }),
    ),
  );
});
