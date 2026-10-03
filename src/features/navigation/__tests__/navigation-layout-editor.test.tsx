// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ES_MESSAGES } from "@/i18n/messages";
import type { NavigationLayouts } from "@/shared/api/schemas/navigation";

import { NavigationLayoutEditor } from "../navigation-layout-editor";
import type { NavigationLayoutApi } from "../use-navigation-layout";

afterEach(cleanup);

function setup(scope: "me" | "clinic", initial: NavigationLayouts) {
  let current = initial;
  const api: NavigationLayoutApi = {
    layouts: vi.fn(async () => current),
    saveMine: vi.fn(
      async (pinned) => (current = { ...current, user: pinned ? { pinned: [...pinned] } : null }),
    ),
    saveClinic: vi.fn(
      async (pinned) => (current = { ...current, clinic: pinned ? { pinned: [...pinned] } : null }),
    ),
  };
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <NextIntlClientProvider locale="es" messages={ES_MESSAGES}>
        <MantineProvider env="test">
          <NavigationLayoutEditor scope={scope} api={api} />
        </MantineProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
  return api;
}

const barLabels = () =>
  within(screen.getByRole("list", { name: "Orden del menú" }))
    .getAllByRole("listitem")
    .map((item) => item.getAttribute("data-key"));

describe("NavigationLayoutEditor", () => {
  it("starts from the clinic order when the member has none and saves a personal one", async () => {
    const api = setup("me", {
      available: true,
      clinic: { pinned: ["agenda", "home", "patients"] },
      user: null,
    });
    await waitFor(() => expect(barLabels()).toEqual(["agenda", "home", "patients"]));
    expect(screen.getByText(/orden de la clínica/i)).toBeInTheDocument();
    const save = screen.getByRole("button", { name: "Guardar mi menú" });
    expect(save).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Subir Inicio" }));
    fireEvent.click(screen.getByRole("button", { name: "Añadir Tareas al menú" }));
    expect(barLabels()).toEqual(["home", "agenda", "patients", "tasks"]);
    fireEvent.click(save);
    await waitFor(() =>
      expect(api.saveMine).toHaveBeenCalledWith(["home", "agenda", "patients", "tasks"]),
    );
    expect(
      await screen.findByRole("button", { name: "Usar el de la clínica" }),
    ).toBeInTheDocument();
  });

  it("restores the clinic order by clearing the personal one", async () => {
    const api = setup("me", {
      available: true,
      clinic: { pinned: ["agenda"] },
      user: { pinned: ["tasks", "home"] },
    });
    await waitFor(() => expect(barLabels()).toEqual(["tasks", "home"]));
    fireEvent.click(screen.getByRole("button", { name: "Usar el de la clínica" }));
    await waitFor(() => expect(api.saveMine).toHaveBeenCalledWith(null));
    await waitFor(() => expect(barLabels()).toEqual(["agenda"]));
  });

  it("lets the administrator remove items but never empty the menu", async () => {
    const api = setup("clinic", { available: true, clinic: null, user: null });
    await waitFor(() => expect(barLabels()).toHaveLength(5));
    for (const label of ["Inicio", "Pacientes", "Agenda", "Documentos"])
      fireEvent.click(screen.getByRole("button", { name: `Quitar ${label} del menú` }));
    expect(screen.getByRole("button", { name: "Quitar Finanzas del menú" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Guardar menú de la clínica" }));
    await waitFor(() => expect(api.saveClinic).toHaveBeenCalledWith(["finance"]));
  });

  it("explains that the feature waits for the database update", async () => {
    setup("me", { available: false, clinic: null, user: null });
    expect(await screen.findByText(/actualización de la base de datos/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar mi menú" })).toBeDisabled();
  });

  it("shows a save failure", async () => {
    const api = setup("me", { available: true, clinic: null, user: null });
    vi.mocked(api.saveMine).mockRejectedValueOnce(new Error("offline"));
    await waitFor(() => expect(barLabels()).toHaveLength(5));
    fireEvent.click(screen.getByRole("button", { name: "Bajar Inicio" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar mi menú" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/no se pudo guardar/i);
  });
});
