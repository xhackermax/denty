// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OdontogramHistory } from "./odontogram-history";

let mutateImpl: () => Promise<unknown> = async () => ({});
const mutateAsync = vi.fn((): Promise<unknown> => mutateImpl());

vi.mock("./odontogram-data", () => ({
  useOdontogramSnapshotsQuery: () => ({
    data: {
      items: [
        {
          id: "s1",
          label: "Control",
          createdAt: "2026-10-01T10:00:00Z",
          version: 2,
          entities: [],
          periodontal: [],
        },
      ],
      currentVersion: 3,
    },
    isError: false,
  }),
  useCreateOdontogramSnapshotMutation: () => ({ mutateAsync, isPending: false }),
}));

function renderHistory(props: Partial<Parameters<typeof OdontogramHistory>[0]> = {}) {
  render(
    <MantineProvider>
      <OdontogramHistory patientId="p1" {...props} />
    </MantineProvider>,
  );
}

describe("OdontogramHistory", () => {
  afterEach(cleanup);

  it("confirma el snapshot guardado", async () => {
    mutateImpl = async () => ({});
    renderHistory();
    fireEvent.click(screen.getByRole("button", { name: "Guardar snapshot" }));
    expect(await screen.findByText("Snapshot guardado.")).toBeInTheDocument();
  });

  it("muestra el error si no se pudo guardar el snapshot", async () => {
    mutateImpl = async () => {
      throw new Error("fallo");
    };
    renderHistory();
    fireEvent.click(screen.getByRole("button", { name: "Guardar snapshot" }));
    await waitFor(() =>
      expect(screen.getByText("No se pudo guardar el snapshot.")).toBeInTheDocument(),
    );
  });

  it("guarda los cambios pendientes antes de capturar el snapshot", async () => {
    mutateImpl = async () => ({});
    const order: string[] = [];
    mutateAsync.mockImplementationOnce(async () => {
      order.push("snapshot");
      return {};
    });
    renderHistory({
      flushPending: async () => {
        order.push("flush");
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar snapshot" }));
    expect(await screen.findByText("Snapshot guardado.")).toBeInTheDocument();
    expect(order).toEqual(["flush", "snapshot"]);
  });

  it("no captura un snapshot si los cambios pendientes no se guardaron", async () => {
    mutateAsync.mockClear();
    renderHistory({ flushPending: async () => Promise.reject(new Error("409")) });
    fireEvent.click(screen.getByRole("button", { name: "Guardar snapshot" }));
    await waitFor(() =>
      expect(screen.getByText("No se pudo guardar el snapshot.")).toBeInTheDocument(),
    );
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("guarda el borrador antes de abrir un control histórico", async () => {
    const onSelectSnapshot = vi.fn();
    const flushPending = vi.fn(async () => undefined);
    renderHistory({ onSelectSnapshot, flushPending });
    fireEvent.click(screen.getByRole("button", { name: "Ver" }));
    await waitFor(() => expect(onSelectSnapshot).toHaveBeenCalledWith("s1"));
    expect(flushPending).toHaveBeenCalledBefore(onSelectSnapshot);
  });

  it("se queda en el actual si el borrador no se pudo guardar", async () => {
    const onSelectSnapshot = vi.fn();
    renderHistory({ onSelectSnapshot, flushPending: async () => Promise.reject(new Error("x")) });
    fireEvent.click(screen.getByRole("button", { name: "Ver" }));
    expect(
      await screen.findByText("Guarda o descarta los cambios antes de abrir un control."),
    ).toBeInTheDocument();
    expect(onSelectSnapshot).not.toHaveBeenCalled();
  });
});
