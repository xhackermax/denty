// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PatientPortal } from "./patient-portal";

vi.mock("@/features/auth", () => ({ ChangePasswordForm: () => null }));
vi.mock("@/shared/api/browser", () => ({
  getBrowserApi: () => ({ agenda: { waitlist: { list: async () => ({ items: [] }) } } }),
}));
vi.mock("@/shared/patients/patient-data", () => ({
  usePatientProjectionQuery: () => ({
    isLoading: false,
    isError: false,
    data: {
      patient: { firstName: "Ana", lastName: "Gil" },
      appointments: [],
      prescriptions: [],
      budgets: [{ id: "b1", status: "sent", totalCents: 10000 }],
    },
  }),
}));

function renderPortal() {
  window.matchMedia ??= ((q: string) => ({
    matches: false,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <PatientPortal patientId="p1" />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe("PatientPortal budgets", () => {
  afterEach(cleanup);

  it("does not offer a dead 'Ver' button for budgets without a backend", () => {
    renderPortal();
    const buttons = screen.queryAllByRole("button", { name: "Ver" });
    for (const b of buttons) expect(b).toBeDisabled();
    expect(screen.queryByText("No disponible")).not.toBeNull();
  });
});
