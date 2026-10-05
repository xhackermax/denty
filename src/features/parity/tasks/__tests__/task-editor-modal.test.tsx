// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TaskEditorModal } from "../task-editor-modal";
import type { TaskTeam } from "../task-types";

afterEach(cleanup);

const team: TaskTeam = {
  items: [
    { id: "aux", name: "Marta (auxiliar)" },
    { id: "me", name: "Dra. Vega" },
  ],
  currentStaffId: "me",
};

function open(value?: TaskTeam) {
  const onSubmit = vi.fn();
  render(
    <MantineProvider>
      <TaskEditorModal
        opened
        task={null}
        today="2026-10-01"
        initialDay={null}
        team={value}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    </MantineProvider>,
  );
  return onSubmit;
}

function submitWithTitle(title: string) {
  const box = screen.getByRole("textbox", { name: "Título" });
  fireEvent.change(box, { target: { value: title } });
  fireEvent.submit(box.closest("form")!);
}

describe("task editor assignment", () => {
  it("ofrece al equipo para asignar la tarea", async () => {
    open(team);
    expect(await screen.findByRole("combobox", { name: "Asignar a" })).toBeVisible();
  });

  it("permite autoasignarse con un botón", async () => {
    const onSubmit = open(team);
    fireEvent.click(await screen.findByRole("button", { name: "Asignármela a mí" }));
    submitWithTitle("Comprar papel");
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ assigneeStaffId: "me" });
  });

  it("mantiene utilizable el formulario sin equipo cargado", () => {
    open();
    expect(screen.getByRole("textbox", { name: "Título" })).toBeVisible();
    expect(screen.queryByRole("combobox", { name: "Asignar a" })).toBeNull();
  });

  it("omite el identificador de responsable cuando no se ha seleccionado", async () => {
    const onSubmit = open(team);
    submitWithTitle("Llamar");
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0]?.[0]).not.toHaveProperty("assigneeStaffId");
  });
});
