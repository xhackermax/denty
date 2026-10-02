// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { makeApi, mk, renderTimeline, titlesInOrder } from "./agenda-fixture";

const dataTransfer = () => ({
  setData: vi.fn(),
  getData: () => "",
  effectAllowed: "",
  dropEffect: "",
});

async function openInbox() {
  fireEvent.click(await screen.findByRole("radio", { name: /Bandeja/ }));
}

describe("Agenda de días", () => {
  afterEach(cleanup);

  it("solo muestra las tareas del día visto y no las de la Bandeja", async () => {
    renderTimeline(
      makeApi([
        mk({ id: "hoy", position: 1 }),
        mk({ id: "manana", position: 2, scheduledOn: "2026-10-01" }),
        mk({ id: "sin", position: 3, scheduledOn: null }),
      ]),
    );
    await screen.findByText("HOY");
    expect(titlesInOrder()).toEqual(["HOY"]);
    fireEvent.click(screen.getByRole("button", { name: /1 de octubre/ }));
    await waitFor(() => expect(titlesInOrder()).toEqual(["MANANA"]));
  });

  it("muestra la agenda en orden de hora aunque las tareas tengan otro orden guardado", async () => {
    renderTimeline(
      makeApi([
        mk({ id: "Mediodía", position: 1, dueAt: "2026-09-30T12:00:00+02:00" }),
        mk({ id: "Mañana", position: 2, dueAt: "2026-09-30T09:30:00+02:00" }),
        mk({ id: "Media mañana", position: 3, dueAt: "2026-09-30T10:45:00+02:00" }),
      ]),
    );

    await waitFor(() => expect(titlesInOrder()).toEqual(["MAÑANA", "MEDIA MAÑANA", "MEDIODÍA"]));
  });

  it("vista vacía de un día explica qué hacer", async () => {
    renderTimeline(makeApi([]));
    expect(
      await screen.findByText(
        "Nada programado este día. Crea una tarea o trae alguna de la Bandeja.",
      ),
    ).toBeTruthy();
  });

  it("vista Bandeja vacía tiene su propio mensaje", async () => {
    renderTimeline(makeApi([mk({ id: "a", position: 1 })]));
    await openInbox();
    expect(await screen.findByText(/La Bandeja está vacía/)).toBeTruthy();
  });

  it("el selector de vista cuenta las tareas de la Bandeja", async () => {
    renderTimeline(
      makeApi([
        mk({ id: "a", position: 1, scheduledOn: null }),
        mk({ id: "b", position: 2, scheduledOn: null }),
      ]),
    );
    expect(await screen.findByRole("radio", { name: "Bandeja (2)" })).toBeTruthy();
  });

  describe("Bandeja", () => {
    const inboxApi = () =>
      makeApi([
        mk({ id: "a", position: 1, scheduledOn: null }),
        mk({ id: "b", position: 2, scheduledOn: null, priority: "URGENT" }),
        mk({ id: "hoy", position: 3 }),
      ]);

    it("lista las tareas sin día", async () => {
      renderTimeline(inboxApi());
      await openInbox();
      await waitFor(() => expect(titlesInOrder("inbox-title")).toEqual(["A", "B"]));
    });

    it("programa una tarea para Hoy", async () => {
      const api = inboxApi();
      renderTimeline(api);
      await openInbox();
      fireEvent.click(await screen.findByRole("button", { name: "Programar: A" }));
      const group = screen.getByRole("group", { name: "Elegir día para A" });
      fireEvent.click(within(group).getByRole("button", { name: "Hoy" }));
      await waitFor(() =>
        expect(api.update).toHaveBeenCalledWith("a", {
          scheduledOn: "2026-09-30",
          expectedVersion: 1,
        }),
      );
      await waitFor(() => expect(titlesInOrder("inbox-title")).toEqual(["B"]));
    });

    it("programa para Mañana y para el día seleccionado", async () => {
      const api = inboxApi();
      renderTimeline(api);
      fireEvent.click(await screen.findByRole("button", { name: /3 de octubre/ }));
      await openInbox();
      fireEvent.click(await screen.findByRole("button", { name: "Programar: A" }));
      fireEvent.click(
        within(screen.getByRole("group", { name: "Elegir día para A" })).getByRole("button", {
          name: /Día seleccionado/,
        }),
      );
      await waitFor(() =>
        expect(api.update).toHaveBeenCalledWith("a", {
          scheduledOn: "2026-10-03",
          expectedVersion: 1,
        }),
      );
      fireEvent.click(await screen.findByRole("button", { name: "Programar: B" }));
      fireEvent.click(
        within(screen.getByRole("group", { name: "Elegir día para B" })).getByRole("button", {
          name: "Mañana",
        }),
      );
      await waitFor(() =>
        expect(api.update).toHaveBeenCalledWith("b", {
          scheduledOn: "2026-10-01",
          expectedVersion: 1,
        }),
      );
    });

    it("programa eligiendo una fecha", async () => {
      const api = inboxApi();
      renderTimeline(api);
      await openInbox();
      fireEvent.click(await screen.findByRole("button", { name: "Programar: A" }));
      const group = screen.getByRole("group", { name: "Elegir día para A" });
      fireEvent.change(within(group).getByLabelText("Elegir fecha"), {
        target: { value: "2026-11-12" },
      });
      await waitFor(() =>
        expect(api.update).toHaveBeenCalledWith("a", {
          scheduledOn: "2026-11-12",
          expectedVersion: 1,
        }),
      );
    });

    it("archiva y reordena como el resto", async () => {
      const api = inboxApi();
      renderTimeline(api);
      await openInbox();
      fireEvent.click(await screen.findByRole("button", { name: "Mover a la derecha: A" }));
      await waitFor(() => expect(api.reorder).toHaveBeenCalledWith(["b", "a", "hoy"]));
      fireEvent.click(await screen.findByRole("button", { name: "Archivar: B" }));
      await waitFor(() =>
        expect(api.update).toHaveBeenCalledWith("b", { archived: true, expectedVersion: 1 }),
      );
    });

    it("ordena la Bandeja por prioridad", async () => {
      const api = inboxApi();
      renderTimeline(api);
      await openInbox();
      await screen.findByText("A");
      fireEvent.click(screen.getByRole("button", { name: "Ordenar por prioridad" }));
      await waitFor(() => expect(api.reorder).toHaveBeenCalledWith(["b", "a", "hoy"]));
    });

    it("crear en la Bandeja no fija día", async () => {
      const api = inboxApi();
      renderTimeline(api);
      await openInbox();
      fireEvent.click(await screen.findByRole("button", { name: "Nueva tarea" }));
      const dialog = await screen.findByRole("dialog");
      expect(
        within(dialog)
          .getByRole("radio", { name: "Sin día (Bandeja)" })
          .getAttribute("aria-checked"),
      ).toBe("true");
      fireEvent.change(within(dialog).getByLabelText("Título"), { target: { value: "Idea" } });
      fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
      await waitFor(() =>
        expect(api.create).toHaveBeenCalledWith({
          title: "Idea",
          priority: "NORMAL",
          durationMin: 15,
        }),
      );
    });
  });

  describe("crear y editar con día", () => {
    it("crea en el día que se está viendo", async () => {
      const api = makeApi([]);
      renderTimeline(api);
      fireEvent.click(await screen.findByRole("button", { name: /2 de octubre/ }));
      fireEvent.click(screen.getByRole("button", { name: "Nueva tarea" }));
      const dialog = await screen.findByRole("dialog");
      fireEvent.change(within(dialog).getByLabelText("Título"), { target: { value: "Fontanero" } });
      fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
      await waitFor(() =>
        expect(api.create).toHaveBeenCalledWith({
          title: "Fontanero",
          priority: "NORMAL",
          durationMin: 15,
          scheduledOn: "2026-10-02",
        }),
      );
    });

    it("permite elegir Mañana y una hora fija: su fecha manda", async () => {
      const api = makeApi([]);
      renderTimeline(api);
      fireEvent.click(await screen.findByRole("button", { name: "Nueva tarea" }));
      const dialog = await screen.findByRole("dialog");
      fireEvent.change(within(dialog).getByLabelText("Título"), { target: { value: "Autoclave" } });
      fireEvent.click(within(dialog).getByRole("radio", { name: "Mañana" }));
      fireEvent.change(within(dialog).getByLabelText(/Hora/), { target: { value: "10:05" } });
      fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
      await waitFor(() =>
        expect(api.create).toHaveBeenCalledWith({
          title: "Autoclave",
          priority: "NORMAL",
          durationMin: 15,
          scheduledOn: "2026-10-01",
          dueAt: "2026-10-01T08:05:00.000Z",
        }),
      );
    });

    it("elegir fecha muestra un input nativo de fecha", async () => {
      const api = makeApi([]);
      renderTimeline(api);
      fireEvent.click(await screen.findByRole("button", { name: "Nueva tarea" }));
      const dialog = await screen.findByRole("dialog");
      fireEvent.change(within(dialog).getByLabelText("Título"), { target: { value: "X" } });
      fireEvent.click(within(dialog).getByRole("radio", { name: "Elegir fecha" }));
      const input = within(dialog).getByLabelText("Fecha") as HTMLInputElement;
      expect(input.type).toBe("date");
      fireEvent.change(input, { target: { value: "2026-12-24" } });
      fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
      await waitFor(() =>
        expect(api.create).toHaveBeenCalledWith(
          expect.objectContaining({ scheduledOn: "2026-12-24" }),
        ),
      );
    });

    it("al editar, Sin día devuelve la tarea a la Bandeja y quita la hora", async () => {
      const api = makeApi([mk({ id: "a", position: 1, version: 4 })]);
      renderTimeline(api);
      fireEvent.click(await screen.findByRole("button", { name: "Editar: A" }));
      const dialog = await screen.findByRole("dialog");
      fireEvent.click(within(dialog).getByRole("radio", { name: "Sin día (Bandeja)" }));
      fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
      await waitFor(() =>
        expect(api.update).toHaveBeenCalledWith(
          "a",
          expect.objectContaining({ scheduledOn: null, dueAt: null, expectedVersion: 4 }),
        ),
      );
    });
  });

  describe("mover de día", () => {
    it("Mover a mañana", async () => {
      const api = makeApi([mk({ id: "a", position: 1 })]);
      renderTimeline(api);
      fireEvent.click(await screen.findByRole("button", { name: "Mover a mañana: A" }));
      await waitFor(() =>
        expect(api.update).toHaveBeenCalledWith("a", {
          scheduledOn: "2026-10-01",
          expectedVersion: 1,
        }),
      );
      await waitFor(() => expect(titlesInOrder()).toEqual([]));
      expect(await screen.findByText(/movida a mañana/)).toBeTruthy();
    });

    it("Mover al día… con fecha y deshacer", async () => {
      const api = makeApi([mk({ id: "a", position: 1 })]);
      renderTimeline(api);
      fireEvent.click(await screen.findByRole("button", { name: "Mover al día: A" }));
      const group = screen.getByRole("group", { name: "Elegir día para A" });
      fireEvent.change(within(group).getByLabelText("Elegir fecha"), {
        target: { value: "2026-10-08" },
      });
      await waitFor(() =>
        expect(api.update).toHaveBeenCalledWith("a", {
          scheduledOn: "2026-10-08",
          expectedVersion: 1,
        }),
      );
      fireEvent.click(await screen.findByRole("button", { name: "Deshacer" }));
      await waitFor(() =>
        expect(api.update).toHaveBeenLastCalledWith("a", {
          scheduledOn: "2026-09-30",
          expectedVersion: 2,
        }),
      );
    });

    it("enviar a la Bandeja desde el selector de día", async () => {
      const api = makeApi([mk({ id: "a", position: 1 })]);
      renderTimeline(api);
      fireEvent.click(await screen.findByRole("button", { name: "Mover al día: A" }));
      fireEvent.click(
        within(screen.getByRole("group", { name: "Elegir día para A" })).getByRole("button", {
          name: "Sin día (Bandeja)",
        }),
      );
      await waitFor(() =>
        expect(api.update).toHaveBeenCalledWith("a", { scheduledOn: null, expectedVersion: 1 }),
      );
    });

    it("al mover una tarea con hora fija conserva la hora", async () => {
      const api = makeApi([mk({ id: "a", position: 1, dueAt: "2026-09-30T10:00:00+02:00" })]);
      renderTimeline(api);
      fireEvent.click(await screen.findByRole("button", { name: "Mover a mañana: A" }));
      await waitFor(() =>
        expect(api.update).toHaveBeenCalledWith("a", {
          scheduledOn: "2026-10-01",
          dueAt: "2026-10-01T08:00:00.000Z",
          expectedVersion: 1,
        }),
      );
    });

    it("soltar una tarea sobre un día de la franja la programa ahí", async () => {
      const api = makeApi([mk({ id: "a", position: 1 })]);
      renderTimeline(api);
      await screen.findByText("A");
      const node = screen.getByTestId("task-node");
      fireEvent.dragStart(node, { dataTransfer: dataTransfer() });
      const day = screen.getByRole("button", { name: /2 de octubre/ });
      fireEvent.dragOver(day, { dataTransfer: dataTransfer() });
      fireEvent.drop(day, { dataTransfer: dataTransfer() });
      await waitFor(() =>
        expect(api.update).toHaveBeenCalledWith("a", {
          scheduledOn: "2026-10-02",
          expectedVersion: 1,
        }),
      );
    });

    it("soltar una tarea de la Bandeja sobre un día también funciona", async () => {
      const api = makeApi([mk({ id: "a", position: 1, scheduledOn: null })]);
      renderTimeline(api);
      await openInbox();
      await screen.findByText("A");
      fireEvent.dragStart(screen.getByTestId("inbox-item"), { dataTransfer: dataTransfer() });
      fireEvent.drop(screen.getByRole("button", { name: /1 de octubre/ }), {
        dataTransfer: dataTransfer(),
      });
      await waitFor(() =>
        expect(api.update).toHaveBeenCalledWith("a", {
          scheduledOn: "2026-10-01",
          expectedVersion: 1,
        }),
      );
    });
  });

  describe("marcadores de la franja", () => {
    it("muestran el número de tareas y las hechas con aria-label", async () => {
      renderTimeline(
        makeApi([
          mk({ id: "a", position: 1, scheduledOn: "2026-10-01" }),
          mk({ id: "b", position: 2, scheduledOn: "2026-10-01", status: "DONE" }),
          mk({ id: "c", position: 3, scheduledOn: "2026-10-01" }),
        ]),
      );
      const marker = await screen.findByRole("img", { name: "3 tareas, 1 hecha" });
      expect(marker.querySelectorAll("[data-dot]")).toHaveLength(3);
      expect(marker.querySelectorAll('[data-dot][data-done="true"]')).toHaveLength(1);
    });

    it("resumen con más de 4 tareas y botón de día accesible", async () => {
      renderTimeline(
        makeApi(
          Array.from({ length: 6 }, (_, i) =>
            mk({ id: `t${i}`, position: i, scheduledOn: "2026-10-02" }),
          ),
        ),
      );
      const marker = await screen.findByRole("img", { name: "6 tareas" });
      expect(marker.querySelectorAll("[data-dot]")).toHaveLength(4);
      expect(within(marker).getByText("+2")).toBeTruthy();
      expect(screen.getByRole("button", { name: /2 de octubre.*6 tareas/ })).toBeTruthy();
    });

    it("días sin tareas no muestran marcador y la Bandeja no cuenta", async () => {
      renderTimeline(makeApi([mk({ id: "a", position: 1, scheduledOn: null })]));
      await screen.findByRole("radio", { name: "Bandeja (1)" });
      expect(screen.queryAllByRole("img")).toHaveLength(0);
    });

    it("resalta con aria el día con vencidas", async () => {
      renderTimeline(makeApi([mk({ id: "a", position: 1, scheduledOn: "2026-09-28" })]));
      expect(
        await screen.findByRole("button", { name: /30 de septiembre.*vencidas/ }),
      ).toBeTruthy();
    });
  });

  describe("volver a planificar", () => {
    it("pasa las vencidas a hoy y quita dueAt", async () => {
      const api = makeApi([
        mk({ id: "a", position: 1 }),
        mk({ id: "b", position: 2, scheduledOn: "2026-09-28", version: 3 }),
        mk({ id: "c", position: 3, dueAt: "2026-09-28T09:00:00+02:00", version: 2 }),
      ]);
      renderTimeline(api);
      fireEvent.click(await screen.findByRole("button", { name: "Volver a planificar 2 tareas" }));
      await waitFor(() =>
        expect(api.update).toHaveBeenCalledWith("b", {
          scheduledOn: "2026-09-30",
          expectedVersion: 3,
        }),
      );
      expect(api.update).toHaveBeenCalledWith("c", {
        scheduledOn: "2026-09-30",
        dueAt: null,
        expectedVersion: 2,
      });
      await waitFor(() => expect(api.reorder).toHaveBeenCalledWith(["b", "c", "a"]));
    });
  });
});
