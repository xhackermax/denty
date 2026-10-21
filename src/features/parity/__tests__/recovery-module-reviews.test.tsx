// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

const api = vi.hoisted(() => ({ recoveryWorklist: vi.fn() }));
vi.mock("@/shared/api/browser", () => ({
  getBrowserApi: () => ({
    engagement: { communications: { recoveryWorklist: api.recoveryWorklist } },
  }),
}));
vi.mock("../modules/recovery-explorer", () => ({ RecoveryExplorer: () => null }));

import { RecoveryModule } from "../modules/recovery-module";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function item(kind: "RECALL" | "PLAN", label: string, id: string) {
  return {
    patientId: `00000000-0000-4000-8000-00000000000${id}`,
    patientName: `Paciente ${id}`,
    recordNumber: id,
    phone: null,
    kind,
    referenceId: `00000000-0000-4000-8000-00000000001${id}`,
    label,
    dueAt: "2027-01-13T08:00:00Z",
    amountCents: null,
    kinds: [kind],
  };
}

test("muestra cada revisión con su especialidad y plazo, no con el código interno", async () => {
  api.recoveryWorklist.mockResolvedValue({
    items: [
      item("RECALL", "REVIEW_IMPLANT_3M", "1"),
      item("RECALL", "NO_SHOW", "2"),
      item("PLAN", "REVIEW_IMPLANT_3M", "3"),
    ],
    counts: { RECALL: 2, PLAN: 1 },
    total: 3,
    page: 1,
    pageSize: 25,
  });
  render(
    <MantineProvider>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <RecoveryModule />
      </QueryClientProvider>
    </MantineProvider>,
  );

  expect(
    await screen.findByText(/Revisión pendiente · Revisión de implantes · 3 meses · 13 ene 2027/),
  ).toBeInTheDocument();
  expect(screen.getByText(/Revisión pendiente · No se presentó a la cita/)).toBeInTheDocument();
  // A treatment name that happens to look like a code is shown as written.
  expect(screen.getByText(/Tratamiento sin cita · REVIEW_IMPLANT_3M/)).toBeInTheDocument();
  expect(screen.queryByText(/Revisión pendiente · REVIEW_/)).not.toBeInTheDocument();
});
