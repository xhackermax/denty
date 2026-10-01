// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ManagedBackupsPanel } from "./managed-backups-panel";
const state = vi.hoisted(() => ({ role: "ADMIN", list: vi.fn() }));
vi.mock("@/shared/tenancy/active-context", () => ({
  useActiveTenant: () => ({ role: state.role }),
}));
vi.mock("@/shared/api/browser", () => ({
  getBrowserApi: () => ({ security: { backups: { list: state.list } } }),
}));
const status = {
  provider: "SUPABASE_MANAGED",
  configured: false,
  connected: false,
  projectRef: "project-ref",
  dashboardUrl: "https://supabase.com/dashboard/project/project-ref/database/backups",
  checkedAt: "2026-10-01T06:00:00Z",
  pitrEnabled: null,
  backups: [],
  message: "Configura SUPABASE_MANAGEMENT_ACCESS_TOKEN en Vercel.",
};
afterEach(cleanup);
beforeEach(() => {
  state.role = "ADMIN";
  state.list.mockReset();
  state.list.mockResolvedValue(status);
});
function mount() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MantineProvider env="test">
        <ManagedBackupsPanel />
      </MantineProvider>
    </QueryClientProvider>,
  );
}
test("offers real Supabase configuration and explains schedule and retention", async () => {
  mount();
  expect(await screen.findByText("Pendiente de configuración")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Configurar en Supabase" })).toHaveAttribute(
    "href",
    status.dashboardUrl,
  );
  fireEvent.click(screen.getByRole("button", { name: "Configuración de copias automáticas" }));
  expect(screen.getByText(/programación y la retención/)).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent("SUPABASE_MANAGEMENT_ACCESS_TOKEN");
  expect(screen.queryByRole("textbox")).toBeNull();
});
test("configured credentials do not turn a failed connection green", async () => {
  state.list.mockResolvedValue({
    ...status,
    configured: true,
    message: "El token no tiene acceso.",
  });
  mount();
  expect(await screen.findByText("Error de conexión")).toBeInTheDocument();
  expect(screen.queryByText("Supabase conectado")).toBeNull();
});
test("refresh retrieves actual backup state and dates in Madrid", async () => {
  state.list.mockResolvedValue({
    ...status,
    configured: true,
    connected: true,
    pitrEnabled: true,
    message: null,
    backups: [
      { id: "b1", type: "LOGICAL", createdAt: "2026-10-01T06:00:00Z", status: "COMPLETED" },
    ],
  });
  mount();
  expect(await screen.findByText("Supabase conectado")).toBeInTheDocument();
  expect(screen.getByText("Copia lógica")).toBeInTheDocument();
  expect(screen.getAllByText(/08:00/).length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole("button", { name: "Actualizar estado" }));
  await waitFor(() => expect(state.list).toHaveBeenCalledTimes(2));
});
test("shows consultation errors instead of an empty successful status", async () => {
  state.list.mockRejectedValue(new Error("Forbidden"));
  mount();
  expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo consultar");
  expect(screen.getByText("Error de conexión")).toBeInTheDocument();
});
test("only administrators request management backup data", () => {
  state.role = "RECEPTION";
  mount();
  expect(state.list).not.toHaveBeenCalled();
  expect(screen.queryByText("Copias de seguridad")).toBeNull();
});
