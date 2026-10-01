// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OdontogramHistory } from "./odontogram-history";

let mutateImpl: () => Promise<unknown> = async () => ({});
const mutateAsync = (): Promise<unknown> => mutateImpl();

vi.mock("./odontogram-data", () => ({
  useOdontogramSnapshotsQuery: () => ({
    data: { items: [], currentVersion: 3 },
    isError: false,
  }),
  useCreateOdontogramSnapshotMutation: () => ({ mutateAsync, isPending: false }),
}));

function renderHistory() {
  render(
    <MantineProvider>
      <OdontogramHistory patientId="p1" />
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
});
