// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { tradeoffEntry, type ArgumentOverride } from "@/domain/plan";
import { AdminClinicalArgumentsPanel } from "../admin-clinical-arguments-panel";

const api = vi.hoisted(() => ({
  clinicalArguments: {
    overrides: vi.fn(async (): Promise<{ items: ArgumentOverride[] }> => ({ items: [] })),
    save: vi.fn(async () => ({ count: 1 })),
    restore: vi.fn(async () => ({ count: 1 })),
    history: vi.fn(async () => ({ items: [] as unknown[] })),
  },
}));
vi.mock("@/shared/api/browser", () => ({ getBrowserApi: () => api }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  api.clinicalArguments.overrides.mockResolvedValue({ items: [] });
});

const crown = tradeoffEntry("b.corona-completa")!;
const [first, second] = crown.advantages;

function mount() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MantineProvider env="test">
        <AdminClinicalArgumentsPanel />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

async function openCrown() {
  fireEvent.change(screen.getByLabelText("Buscar tratamiento"), {
    target: { value: "corona completa" },
  });
  fireEvent.click((await screen.findAllByRole("button", { name: /^Corona completa Banco/ }))[0]!);
  return screen.findByRole("region", { name: "Ventajas · Corona completa" });
}

describe("AdminClinicalArgumentsPanel", () => {
  test("recuerda los criterios de calidad y las fuentes para validar las frases", () => {
    mount();
    expect(screen.getByRole("list", { name: "Criterios de calidad" })).toHaveTextContent(
      "No comparar únicamente precios",
    );
    expect(
      within(screen.getByRole("list", { name: "Fuentes para validar" })).getAllByRole("link"),
    ).toHaveLength(5);
  });

  test("busca tratamientos y muestra sus frases por tipo", async () => {
    mount();
    const pros = await openCrown();
    expect(within(pros).getByText(first!.text)).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Desventajas · Corona completa" }),
    ).toBeInTheDocument();
  });

  test("editar una frase guarda solo el cambio, conservando la plantilla", async () => {
    mount();
    const pros = await openCrown();
    fireEvent.click(within(pros).getAllByRole("button", { name: "Editar" })[0]!);
    fireEvent.change(within(pros).getByLabelText("Texto de la frase"), {
      target: { value: "Protege lo que queda del diente." },
    });
    fireEvent.click(within(pros).getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(api.clinicalArguments.save).toHaveBeenCalledWith({
        items: [
          {
            phraseId: first!.id,
            entryId: crown.id,
            kind: "advantage",
            text: "Protege lo que queda del diente.",
            hidden: false,
            position: null,
            custom: false,
          },
        ],
      }),
    );
  });

  test("ocultar, reordenar y añadir frases propias", async () => {
    mount();
    const pros = await openCrown();
    fireEvent.click(within(pros).getByRole("button", { name: `Ocultar: ${first!.text}` }));
    await waitFor(() => expect(api.clinicalArguments.save).toHaveBeenCalledTimes(1));
    expect(api.clinicalArguments.save.mock.calls[0]).toEqual([
      { items: [expect.objectContaining({ phraseId: first!.id, hidden: true })] },
    ]);

    fireEvent.click(within(pros).getByRole("button", { name: `Subir: ${second!.text}` }));
    await waitFor(() => expect(api.clinicalArguments.save).toHaveBeenCalledTimes(2));
    const moved = (
      api.clinicalArguments.save.mock.calls[1] as unknown as [{ items: ArgumentOverride[] }]
    )[0].items;
    expect(moved.slice(0, 2).map((item) => [item.phraseId, item.position])).toEqual([
      [second!.id, 0],
      [first!.id, 1],
    ]);
    expect(within(pros).getByRole("button", { name: `Subir: ${first!.text}` })).toBeDisabled();

    fireEvent.change(within(pros).getByLabelText("Nueva ventaja"), {
      target: { value: "Hecha en nuestro laboratorio." },
    });
    fireEvent.click(within(pros).getByRole("button", { name: "Añadir" }));
    await waitFor(() => expect(api.clinicalArguments.save).toHaveBeenCalledTimes(3));
    expect(api.clinicalArguments.save.mock.calls[2]).toEqual([
      {
        items: [
          expect.objectContaining({
            phraseId: "b.corona-completa.C1",
            text: "Hecha en nuestro laboratorio.",
            custom: true,
          }),
        ],
      },
    ]);
  });

  test("restaura frases sueltas o la plantilla entera y enseña el historial", async () => {
    api.clinicalArguments.overrides.mockResolvedValue({
      items: [
        {
          phraseId: first!.id,
          entryId: crown.id,
          kind: "advantage",
          text: "Cambiada.",
          hidden: false,
          position: null,
          custom: false,
        },
        {
          phraseId: "b.corona-completa.C1",
          entryId: crown.id,
          kind: "advantage",
          text: "Propia.",
          hidden: false,
          position: null,
          custom: true,
        },
      ],
    });
    api.clinicalArguments.history.mockResolvedValue({
      items: [
        {
          id: "h1",
          phraseId: first!.id,
          entryId: crown.id,
          action: "SAVE",
          text: "Cambiada.",
          hidden: false,
          changedBy: "u1",
          changedAt: "2026-10-21T10:00:00Z",
        },
      ],
    });
    mount();
    fireEvent.click(await screen.findByRole("button", { name: /Solo cambiados \(1\)/ }));
    fireEvent.click((await screen.findAllByRole("button", { name: /^Corona completa Banco/ }))[0]!);
    const pros = await screen.findByRole("region", { name: "Ventajas · Corona completa" });
    expect(within(pros).getByText("Editada")).toBeInTheDocument();
    expect(within(pros).getByText("Propia")).toBeInTheDocument();

    fireEvent.click(within(pros).getByRole("button", { name: "Restaurar" }));
    await waitFor(() =>
      expect(api.clinicalArguments.restore).toHaveBeenCalledWith({ phraseIds: [first!.id] }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Restaurar plantilla" }));
    await waitFor(() =>
      expect(api.clinicalArguments.restore).toHaveBeenLastCalledWith({
        phraseIds: [first!.id, "b.corona-completa.C1"],
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Ver historial" }));
    const history = await screen.findByRole("list", { name: "Historial de cambios" });
    expect(within(history).getByText(/Guardada: «Cambiada\.»/)).toBeInTheDocument();
  });

  test("avisa si no puede guardar", async () => {
    api.clinicalArguments.save.mockRejectedValueOnce(new Error("Sin permiso."));
    mount();
    const pros = await openCrown();
    fireEvent.click(within(pros).getByRole("button", { name: `Ocultar: ${first!.text}` }));
    expect(await screen.findByText("Sin permiso.")).toBeInTheDocument();
  });
});
