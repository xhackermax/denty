// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  isAdmin: false,
  notes: [] as Array<Record<string, unknown>>,
  created: [] as unknown[],
  statusChanges: [] as unknown[],
}));

vi.mock("next/navigation", () => ({ usePathname: () => "/app/agenda" }));
vi.mock("../feedback-data", () => ({
  useFeedbackNotesQuery: () => ({ data: state.notes, isPending: false, isError: false }),
  useIsFeedbackAdmin: () => state.isAdmin,
  useCreateFeedbackNoteMutation: () => ({
    isPending: false,
    mutate: (input: unknown, options: { onSuccess: () => void }) => {
      state.created.push(input);
      options.onSuccess();
    },
  }),
  useFeedbackNoteStatusMutation: () => ({
    isPending: false,
    mutate: (input: unknown) => state.statusChanges.push(input),
  }),
}));

import { FeedbackInboxButton } from "../feedback-inbox";

const note = (overrides: Record<string, unknown>) => ({
  id: "n-1",
  kind: "BUG",
  message: "No se guarda la cita",
  pagePath: "/app/agenda",
  status: "NEW",
  authorId: "u-1",
  authorName: "Ana Pérez",
  createdAt: "2026-10-30T10:00:00.000Z",
  updatedAt: "2026-10-30T10:00:00.000Z",
  ...overrides,
});

const open = () => {
  render(
    <MantineProvider env="test">
      <FeedbackInboxButton />
    </MantineProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Notas y recomendaciones" }));
  return screen.getByRole("dialog");
};

afterEach(() => {
  cleanup();
  state.isAdmin = false;
  state.notes = [];
  state.created = [];
  state.statusChanges = [];
});

describe("FeedbackInboxButton", () => {
  it("saves a note with its kind and the current page", () => {
    const dialog = open();
    fireEvent.click(within(dialog).getByText("Mejora"));
    fireEvent.change(within(dialog).getByLabelText("Tu comentario"), {
      target: { value: "Añadir un atajo para nueva cita" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Enviar nota" }));
    expect(state.created).toEqual([
      { kind: "IDEA", message: "Añadir un atajo para nueva cita", pagePath: "/app/agenda" },
    ]);
    expect(within(dialog).getByText("Gracias, la nota se ha guardado.")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Tu comentario")).toHaveValue("");
  });

  it("explains a note that is too short instead of sending it", () => {
    const dialog = open();
    fireEvent.change(within(dialog).getByLabelText("Tu comentario"), { target: { value: "x" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Enviar nota" }));
    expect(state.created).toHaveLength(0);
    expect(within(dialog).getByText("Escribe al menos 3 caracteres.")).toBeInTheDocument();
  });

  it("shows pending notes by default and all of them on demand", () => {
    state.notes = [
      note({ id: "n-1", message: "Nota pendiente" }),
      note({ id: "n-2", message: "Nota resuelta", status: "DONE", kind: "IDEA" }),
    ];
    const dialog = open();
    expect(within(dialog).getByText("Nota pendiente")).toBeInTheDocument();
    expect(within(dialog).queryByText("Nota resuelta")).not.toBeInTheDocument();
    expect(within(dialog).getByText(/Ana Pérez/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByText("Todas"));
    expect(within(dialog).getByText("Nota resuelta")).toBeInTheDocument();
  });

  it("shows the status as a badge to non-admins, without a selector", () => {
    state.notes = [note({})];
    const dialog = open();
    expect(within(dialog).getByText("Nueva")).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Estado de la nota")).not.toBeInTheDocument();
  });

  it("lets admins change the status", () => {
    state.isAdmin = true;
    state.notes = [note({})];
    const dialog = open();
    fireEvent.click(
      within(dialog)
        .getAllByLabelText("Estado de la nota")
        .find((element) => element.tagName === "INPUT")!,
    );
    fireEvent.click(screen.getByRole("option", { name: "Resuelta" }));
    expect(state.statusChanges).toEqual([{ noteId: "n-1", status: "DONE" }]);
  });
});
