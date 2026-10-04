// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { NavigationProvider } from "@/shared/navigation/navigation-provider";
import { OdontogramWorkspace } from "./odontogram-workspace";
const state = vi.hoisted(() => ({ version: 1, save: vi.fn() }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/app/patients/p/odontogram",
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("./odontogram-data", async (importOriginal) => {
  const original = await importOriginal<typeof import("./odontogram-data")>();
  const React = await import("react");
  return {
    ...original,
    useOdontogramQuery: () => ({
      data: { id: "p", version: state.version, entities: [], periodontal: [] },
    }),
    useOdontogramSnapshotsQuery: () => ({ data: { items: [] } }),
    useSaveOdontogramBatchMutation: () => {
      const [, refresh] = React.useState(0);
      return {
        isPending: false,
        error: null,
        mutateAsync: async () => {
          state.save();
          state.version++;
          refresh((n) => n + 1);
        },
      };
    },
  };
});
vi.mock("@/shared/patients/patient-data", () => ({
  usePatientQuery: () => ({
    data: { birthDate: null, firstName: "Lucía", lastName: "Martín", recordNumber: "DNT-0042" },
  }),
}));
vi.mock("@/shared/clinical/clinical-pipeline-card", () => ({ ClinicalPipelineCard: () => null }));
vi.mock("@/shared/clinical/clinical-workspace", () => ({ ClinicalWorkspace: () => null }));
vi.mock("@/shared/clinical/treatment-flow", () => ({ TreatmentFlowModal: () => null }));
afterEach(cleanup);
// Specialty tabs are view layers over the same odontogram since the layered redesign:
// switching them keeps the edit without a dialog, and the autosave then stores it once.
test("switching layers keeps the edit without prompting, then it saves on its own", async () => {
  state.version = 1;
  state.save.mockClear();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <NavigationProvider>
          <OdontogramWorkspace patientId="p" />
        </NavigationProvider>
      </MantineProvider>
    </QueryClientProvider>,
  );
  const save = screen.getByRole("button", { name: "Guardar" });
  expect(save).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Aplicar al diente seleccionado" }));
  expect(save).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Cirugía" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Cirugía" })).toHaveAttribute("data-active", "true"),
  );
  expect(screen.queryByRole("dialog")).toBeNull();
  await waitFor(() => expect(state.save).toHaveBeenCalledTimes(1), { timeout: 3000 });
  expect(state.version).toBe(2);
});
