// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  usePatientQuery: () => ({ data: { birthDate: null } }),
}));
vi.mock("@/shared/clinical/clinical-pipeline-card", () => ({ ClinicalPipelineCard: () => null }));
vi.mock("@/shared/clinical/clinical-workspace", () => ({ ClinicalWorkspace: () => null }));
vi.mock("@/shared/clinical/treatment-flow", () => ({ TreatmentFlowModal: () => null }));
afterEach(cleanup);
test("dirty tab navigation saves and retains destination after version remount", async () => {
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
  fireEvent.click(screen.getByRole("button", { name: "Aplicar al diente seleccionado" }));
  fireEvent.click(screen.getByRole("button", { name: "Cirugía" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
  await waitFor(() => expect(state.save).toHaveBeenCalledTimes(1));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Cirugía" })).toHaveAttribute("data-active", "true"),
  );
  expect(state.version).toBe(2);
});
