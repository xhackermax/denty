// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { AdminUsersPanel } from "./admin-users-panel";
const state = vi.hoisted(() => ({ configured: true, create: vi.fn() }));
vi.mock("@/shared/api/browser", () => ({
  getBrowserApi: () => ({
    admin: {
      users: {
        list: async () => ({
          items: [],
          administration: {
            configured: state.configured,
            message: state.configured ? null : "Configura SUPABASE_SECRET_KEY solo en Vercel.",
          },
        }),
        create: state.create,
      },
      sites: { overview: async () => ({ staff: [] }) },
    },
    patients: {
      list: async () => ({
        items: [
          {
            id: "p1",
            firstName: "Ana",
            lastName: "García",
            dni: "12345678Z",
            recordNumber: "DNT-1",
            email: null,
          },
        ],
      }),
    },
  }),
}));
afterEach(cleanup);
beforeEach(() => {
  state.configured = true;
  state.create.mockReset();
});
async function selectPatient() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MantineProvider env="test">
        <AdminUsersPanel />
      </MantineProvider>
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole("radio", { name: "Paciente (portal)" }));
  const select = await screen.findByRole("combobox", { name: /^Paciente/ });
  await waitFor(() => expect(select).toHaveAttribute("placeholder", "Busca por nombre o DNI"));
  fireEvent.click(select);
  fireEvent.click(await screen.findByRole("option", { name: /Ana García/ }));
}
test("patient access is disabled with actionable setup when the server credential is absent", async () => {
  state.configured = false;
  await selectPatient();
  expect(await screen.findByRole("alert")).toHaveTextContent("SUPABASE_SECRET_KEY");
  expect(screen.getByRole("button", { name: "Crear acceso al portal" })).toBeDisabled();
  expect(state.create).not.toHaveBeenCalled();
});
test("creates selected patient access without requiring email and explains first login", async () => {
  state.create.mockResolvedValue({ displayName: "Ana García" });
  await selectPatient();
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Crear acceso al portal" })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Crear acceso al portal" }));
  await waitFor(() =>
    expect(state.create).toHaveBeenCalledWith({
      role: "PATIENT",
      patientId: "p1",
      email: undefined,
      password: undefined,
    }),
  );
  expect(await screen.findByText(/Cuenta creada para Ana García/)).toHaveTextContent("DNT-1");
});
