// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TaskEditorModal } from "../task-editor-modal";

const mocks = vi.hoisted(() => ({ getClient: vi.fn() }));
vi.mock("@/shared/supabase-browser", () => ({ getSupabaseBrowserClient: mocks.getClient }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("task editor release regressions", () => {
  it("obtiene el usuario autenticado del contenedor data.user", async () => {
    const eq = vi.fn();
    const query = {
      select: vi.fn(),
      eq,
      single: vi.fn(async () => ({ data: { clinic_id: "clinic" } })),
      order: vi.fn(async () => ({ data: [{ id: "staff", name: "Dra. Vega" }] })),
    };
    query.select.mockReturnValue(query);
    eq.mockReturnValue(query);
    mocks.getClient.mockReturnValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: "auth-user" } } })) },
      from: vi.fn(() => query),
    });
    render(
      <MantineProvider>
        <TaskEditorModal
          opened
          task={null}
          today="2026-10-01"
          initialDay={null}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      </MantineProvider>,
    );
    await screen.findByRole("combobox", { name: "Asignar a (opcional)" });
    expect(eq).toHaveBeenCalledWith("id", "auth-user");
  });
  it("mantiene utilizable el formulario si no se puede cargar el equipo", async () => {
    mocks.getClient.mockImplementationOnce(() => {
      throw new Error("Supabase no configurado");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <MantineProvider>
        <TaskEditorModal
          opened
          task={null}
          today="2026-10-01"
          initialDay={null}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      </MantineProvider>,
    );
    expect(screen.getByRole("textbox", { name: "Título" })).toBeVisible();
  });
  it("omite el identificador de responsable cuando no se ha seleccionado", async () => {
    mocks.getClient.mockReturnValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
    });
    const onSubmit = vi.fn();
    render(
      <MantineProvider>
        <TaskEditorModal
          opened
          task={null}
          today="2026-10-01"
          initialDay={null}
          onClose={vi.fn()}
          onSubmit={onSubmit}
        />
      </MantineProvider>,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Título" }), {
      target: { value: "Llamar" },
    });
    fireEvent.submit(screen.getByRole("textbox", { name: "Título" }).closest("form")!);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0]?.[0]).not.toHaveProperty("assigneeStaffId");
  });
});
