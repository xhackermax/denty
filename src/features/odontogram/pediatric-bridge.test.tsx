// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
    data: {
      // Six years old whenever the test runs: mixed dentition.
      birthDate: `${new Date().getFullYear() - 6}-03-01`,
      firstName: "Lucía",
      lastName: "Martín",
      recordNumber: "DNT-0042",
    },
  }),
}));
vi.mock("@/shared/clinical/clinical-pipeline-card", () => ({ ClinicalPipelineCard: () => null }));
vi.mock("@/shared/clinical/clinical-workspace", () => ({ ClinicalWorkspace: () => null }));
vi.mock("@/shared/clinical/treatment-flow", () => ({ TreatmentFlowModal: () => null }));
afterEach(cleanup);
// A six-year-old has primary and permanent teeth side by side in the same row: the
// bridge must follow the row on screen, not one dentition's numbering.
test("a child's bridge can join a permanent molar and the primary teeth next to it", () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <NavigationProvider>
          <OdontogramWorkspace patientId="p" />
        </NavigationProvider>
      </MantineProvider>
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getAllByRole("button", { name: /Prótesis fija \/ puente/i })[0]!);
  fireEvent.click(screen.getByRole("button", { name: "Diente 16" }));
  fireEvent.click(screen.getByRole("button", { name: "Diente 54" }));
  expect(screen.getByRole("button", { name: "Diente 16, pilar del puente" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Diente 54, pilar del puente" })).toBeInTheDocument();
});
