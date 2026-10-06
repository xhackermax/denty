// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { AdminUsersPanel } from "./admin-users-panel";
const state = vi.hoisted(() => ({
  configured: true,
  create: vi.fn(),
  update: vi.fn(),
  deleteUser: vi.fn(),
  items: [] as Array<{
    id: string;
    displayName: string;
    email?: string;
    role: "ADMIN" | "RECEPTION" | "DENTIST" | "ASSISTANT" | "PATIENT";
    active?: boolean;
    patientId?: string;
  }>,
}));
vi.mock("@/shared/api/browser", () => ({
  getBrowserApi: () => ({
    admin: {
      users: {
        list: async () => ({
          items: state.items,
          administration: {
            configured: state.configured,
            message: state.configured ? null : "Configura SUPABASE_SECRET_KEY solo en Vercel.",
          },
        }),
        create: state.create,
        update: state.update,
        delete: state.deleteUser,
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
  state.items = [];
  state.create.mockReset();
  state.update.mockReset();
  state.deleteUser.mockReset();
});
function renderPanel() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MantineProvider env="test">
        <AdminUsersPanel />
      </MantineProvider>
    </QueryClientProvider>,
  );
}
async function selectPatient() {
  renderPanel();
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

test("edits user login name and email", async () => {
  state.items = [
    {
      id: "u1",
      displayName: "Ana Admin",
      email: "ana@old.test",
      role: "ADMIN",
      active: true,
    },
  ];
  state.update.mockResolvedValue({
    id: "u1",
    displayName: "Ana Nueva",
    email: "ana@nueva.test",
    role: "ADMIN",
    active: true,
  });
  renderPanel();

  const row = (await screen.findByText("Ana Admin")).closest("div");
  expect(row).not.toBeNull();
  fireEvent.click(within(row!.parentElement!).getByRole("button", { name: "Editar acceso" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Nombre de acceso" }), {
    target: { value: "Ana Nueva" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Email de acceso" }), {
    target: { value: "ana@nueva.test" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Guardar acceso" }));

  await waitFor(() =>
    expect(state.update).toHaveBeenCalledWith("u1", {
      displayName: "Ana Nueva",
      email: "ana@nueva.test",
      role: "ADMIN",
      active: true,
    }),
  );
});

test("deletes a managed user account", async () => {
  state.items = [
    {
      id: "u1",
      displayName: "Paciente Portal",
      email: "paciente@denty.local",
      role: "PATIENT",
      active: true,
      patientId: "p1",
    },
  ];
  state.deleteUser.mockResolvedValue({ ok: true, deletedAuthUser: true, role: "PATIENT" });
  renderPanel();

  const row = (await screen.findByText("Paciente Portal")).closest("div");
  expect(row).not.toBeNull();
  fireEvent.click(within(row!.parentElement!).getByRole("button", { name: "Eliminar acceso" }));
  fireEvent.click(await screen.findByRole("button", { name: "Eliminar cuenta" }));

  await waitFor(() => expect(state.deleteUser).toHaveBeenCalledWith("u1"));
});
