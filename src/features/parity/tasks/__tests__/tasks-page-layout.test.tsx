// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { TasksPage } from "../../tasks-page";
vi.mock("../tasks-timeline", () => ({ TasksTimeline: () => <h2>Tareas</h2> }));
afterEach(cleanup);
test("quick actions are compact labelled icon links beside the main tasks region", () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <TasksPage />
      </MantineProvider>
    </QueryClientProvider>,
  );
  const navigation = screen.getByRole("navigation", { name: "Acciones rápidas" });
  const tasks = screen.getByRole("region", { name: "Tareas" });
  expect(navigation.compareDocumentPosition(tasks) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const targets: readonly (readonly [string, string])[] = [
    ["Crear paciente", "/app/patients"],
    ["Crear cita", "/app/agenda"],
    ["Emitir receta", "/app/prescriptions"],
    ["Registrar cobro", "/app/finance"],
    ["Laboratorio", "/app/laboratory"],
  ];
  expect(within(navigation).getAllByRole("link")).toHaveLength(targets.length);
  for (const [name, href] of targets) {
    const link = within(navigation).getByRole("link", { name });
    expect(link).toHaveAttribute("href", href);
    expect(link.querySelector("svg")).not.toBeNull();
  }
  expect(within(navigation).queryByText("Abrir")).toBeNull();
});
