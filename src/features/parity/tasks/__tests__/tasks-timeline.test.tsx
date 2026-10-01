// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { makeApi, mk, renderTimeline, titlesInOrder } from "./agenda-fixture";

describe("TasksTimeline", () => {
  afterEach(cleanup);

  it("muestra estado vacío", async () => {
    renderTimeline(makeApi([]));
    expect(await screen.findByText(/Nada programado este día/)).toBeTruthy();
  });

  it("muestra error de carga", async () => {
    const api = makeApi([]);
    api.list.mockRejectedValueOnce(new Error("Sin conexión"));
    renderTimeline(api);
    expect(await screen.findByText(/Sin conexión/)).toBeTruthy();
  });

  it("muestra horarios calculados apilando duraciones", async () => {
    renderTimeline(
      makeApi([
        mk({ id: "a", position: 1, durationMin: 30 }),
        mk({ id: "b", position: 2, durationMin: 15 }),
      ]),
    );
    expect(await screen.findByText("9:00–9:30 (30 min)")).toBeTruthy();
    expect(screen.getByText("9:30–9:45 (15 min)")).toBeTruthy();
  });

  it("marca como hecha con el círculo y permite deshacer", async () => {
    const api = makeApi([mk({ id: "a", position: 1 })]);
    renderTimeline(api);
    fireEvent.click(await screen.findByRole("button", { name: "Marcar como hecha: A" }));
    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith("a", { status: "DONE", expectedVersion: 1 }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Deshacer" }));
    await waitFor(() =>
      expect(api.update).toHaveBeenLastCalledWith("a", { status: "OPEN", expectedVersion: 2 }),
    );
  });

  it("archiva una tarea y la restaura desde la vista Archivo", async () => {
    const api = makeApi([mk({ id: "a", position: 1 }), mk({ id: "b", position: 2 })]);
    renderTimeline(api);
    fireEvent.click(await screen.findByRole("button", { name: "Archivar: A" }));
    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith("a", { archived: true, expectedVersion: 1 }),
    );
    await waitFor(() => expect(titlesInOrder()).toEqual(["B"]));

    fireEvent.click(screen.getByRole("radio", { name: /Archivo/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Restaurar: A" }));
    await waitFor(() =>
      expect(api.update).toHaveBeenLastCalledWith("a", { archived: false, expectedVersion: 2 }),
    );
  });

  it("archiva todas las hechas en bloque", async () => {
    const api = makeApi([
      mk({ id: "a", position: 1, status: "DONE" }),
      mk({ id: "b", position: 2 }),
      mk({ id: "c", position: 3, status: "DONE" }),
    ]);
    renderTimeline(api);
    await screen.findByText("B");
    fireEvent.click(screen.getByRole("button", { name: "Archivar hechas" }));
    await waitFor(() => expect(api.update).toHaveBeenCalledTimes(2));
    expect(api.update).toHaveBeenCalledWith("a", { archived: true, expectedVersion: 1 });
    expect(api.update).toHaveBeenCalledWith("c", { archived: true, expectedVersion: 1 });
  });

  it("reordena con los botones subir/bajar y llama a reorder", async () => {
    const api = makeApi([
      mk({ id: "a", position: 1 }),
      mk({ id: "b", position: 2 }),
      mk({ id: "c", position: 3 }),
    ]);
    renderTimeline(api);
    fireEvent.click(await screen.findByRole("button", { name: "Subir: B" }));
    await waitFor(() => expect(api.reorder).toHaveBeenCalledWith(["b", "a", "c"]));
    await waitFor(() => expect(titlesInOrder()).toEqual(["B", "A", "C"]));
    fireEvent.click(screen.getByRole("button", { name: "Bajar: B" }));
    await waitFor(() => expect(api.reorder).toHaveBeenLastCalledWith(["a", "b", "c"]));
  });

  it("deshabilita subir en la primera y bajar en la última", async () => {
    renderTimeline(makeApi([mk({ id: "a", position: 1 }), mk({ id: "b", position: 2 })]));
    const up = await screen.findByRole("button", { name: "Subir: A" });
    expect((up as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Bajar: B" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("ordena por prioridad", async () => {
    const api = makeApi([
      mk({ id: "a", position: 1, priority: "LOW" }),
      mk({ id: "b", position: 2, priority: "URGENT" }),
      mk({ id: "c", position: 3, priority: "HIGH" }),
    ]);
    renderTimeline(api);
    await screen.findByText("B");
    fireEvent.click(screen.getByRole("button", { name: "Ordenar por prioridad" }));
    await waitFor(() => expect(api.reorder).toHaveBeenCalledWith(["b", "c", "a"]));
  });

  it("reordena por arrastre", async () => {
    const api = makeApi([mk({ id: "a", position: 1 }), mk({ id: "b", position: 2 })]);
    renderTimeline(api);
    await screen.findByText("A");
    const nodes = screen.getAllByTestId("task-node");
    const dataTransfer = {
      setData: vi.fn(),
      getData: () => "a",
      effectAllowed: "",
      dropEffect: "",
    };
    fireEvent.dragStart(nodes[0] as HTMLElement, { dataTransfer });
    fireEvent.dragOver(nodes[1] as HTMLElement, { dataTransfer });
    fireEvent.drop(nodes[1] as HTMLElement, { dataTransfer });
    await waitFor(() => expect(api.reorder).toHaveBeenCalledWith(["b", "a"]));
  });

  it("muestra la etiqueta de conflicto cuando dos tareas se solapan", async () => {
    renderTimeline(
      makeApi([
        mk({ id: "a", position: 1, dueAt: "2026-09-30T10:00:00+02:00", durationMin: 30 }),
        mk({ id: "b", position: 2, dueAt: "2026-09-30T10:15:00+02:00" }),
      ]),
    );
    const labels = await screen.findAllByText("Las tareas coinciden");
    expect(labels.length).toBeGreaterThan(0);
  });

  it("no muestra conflicto si no hay solape", async () => {
    renderTimeline(makeApi([mk({ id: "a", position: 1 }), mk({ id: "b", position: 2 })]));
    await screen.findByText("A");
    expect(screen.queryByText("Las tareas coinciden")).toBeNull();
  });

  it("muestra huecos con texto de pausa", async () => {
    renderTimeline(
      makeApi([
        mk({ id: "a", position: 1 }),
        mk({ id: "b", position: 2, dueAt: "2026-09-30T11:00:00+02:00" }),
      ]),
    );
    expect(await screen.findByText(/Pausa de 1 h 45 min/)).toBeTruthy();
  });

  it("ofrece volver a planificar las vencidas y llama a update + reorder", async () => {
    const api = makeApi([
      mk({ id: "a", position: 1 }),
      mk({ id: "b", position: 2, dueAt: "2026-09-30T07:00:00+02:00", version: 3 }),
    ]);
    renderTimeline(api);
    const button = await screen.findByRole("button", { name: "Volver a planificar 1 tarea" });
    fireEvent.click(button);
    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith("b", {
        scheduledOn: "2026-09-30",
        dueAt: null,
        expectedVersion: 3,
      }),
    );
    await waitFor(() => expect(api.reorder).toHaveBeenCalledWith(["b", "a"]));
  });

  it("no muestra el botón de replanificar sin vencidas", async () => {
    renderTimeline(makeApi([mk({ id: "a", position: 1 })]));
    await screen.findByText("A");
    expect(screen.queryByRole("button", { name: /Volver a planificar/ })).toBeNull();
  });

  it("crea una tarea desde el modal con prioridad y duración", async () => {
    const api = makeApi([]);
    renderTimeline(api);
    fireEvent.click(await screen.findByRole("button", { name: "Nueva tarea" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Título"), { target: { value: "Llamar" } });
    fireEvent.change(within(dialog).getByLabelText("Duración (min)"), { target: { value: "30" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(api.create).toHaveBeenCalledWith({
        title: "Llamar",
        priority: "NORMAL",
        durationMin: 30,
        scheduledOn: "2026-09-30",
      }),
    );
  });

  it("edita el título desde el modal", async () => {
    const api = makeApi([mk({ id: "a", position: 1, version: 4 })]);
    renderTimeline(api);
    fireEvent.click(await screen.findByRole("button", { name: "Editar: A" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Título"), { target: { value: "Nuevo" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith(
        "a",
        expect.objectContaining({ title: "Nuevo", expectedVersion: 4, dueAt: null }),
      ),
    );
  });

  it("resalta el día actual en la franja y navega semanas", async () => {
    renderTimeline(makeApi([]));
    const today = await screen.findByRole("button", { name: /30 de septiembre/ });
    expect(today.getAttribute("aria-current")).toBe("date");
    fireEvent.click(screen.getByRole("button", { name: "Semana siguiente" }));
    expect(await screen.findByRole("button", { name: /7 de octubre/ })).toBeTruthy();
  });
});

it("reorders inbox by dragging and restores the order after server failure", async () => {
  const api = makeApi([
    mk({ id: "a", position: 1, scheduledOn: null, dueAt: null }),
    mk({ id: "b", position: 2, scheduledOn: null, dueAt: null }),
  ]);
  api.reorder.mockRejectedValueOnce(new Error("Orden no guardado"));
  renderTimeline(api);
  await screen.findByText(/Nada programado este día/);
  fireEvent.click(screen.getByRole("radio", { name: /Bandeja/ }));
  const cards = await screen.findAllByTestId("inbox-item");
  fireEvent.dragStart(cards[0]!);
  fireEvent.dragOver(cards[1]!);
  fireEvent.drop(cards[1]!);
  await waitFor(() => expect(api.reorder).toHaveBeenCalledWith(["b", "a"]));
  await screen.findByText(/Orden no guardado/);
  expect(screen.getAllByTestId("inbox-title").map((e) => e.textContent)).toEqual(["A", "B"]);
  cleanup();
});
