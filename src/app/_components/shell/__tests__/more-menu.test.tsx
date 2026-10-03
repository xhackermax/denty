// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { moreSections } from "@/features/navigation/catalog";
import { ES_MESSAGES } from "@/i18n/messages";

import { MoreMenu } from "../more-menu";

afterEach(cleanup);

const wrap = (node: ReactNode) => (
  <NextIntlClientProvider locale="es" messages={ES_MESSAGES}>
    <MantineProvider env="test">{node}</MantineProvider>
  </NextIntlClientProvider>
);

function mount(pathname = "/app") {
  const menu = (path: string) => (
    <MoreMenu
      sections={moreSections(["home", "patients", "agenda"])}
      pathname={path}
      position="top-end"
      trigger={<button type="button">Más</button>}
    />
  );
  const view = render(wrap(menu(pathname)));
  return { rerender: (path: string) => view.rerender(wrap(menu(path))) };
}

describe("MoreMenu", () => {
  it("lists the hidden destinations grouped by section", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Más" }));
    expect(await screen.findByRole("link", { name: "Tareas" })).toHaveAttribute(
      "href",
      "/app/tasks",
    );
    expect(screen.getByText("Gestión")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Agenda" })).toBeNull();
  });

  it("closes as soon as a destination is chosen", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Más" }));
    fireEvent.click(await screen.findByRole("link", { name: "Tareas" }));
    await waitFor(() => expect(screen.queryByRole("link", { name: "Tareas" })).toBeNull());
  });

  it("closes when the route changes by any other means", async () => {
    const { rerender } = mount();
    fireEvent.click(screen.getByRole("button", { name: "Más" }));
    await screen.findByRole("link", { name: "Tareas" });
    rerender("/app/agenda");
    await waitFor(() => expect(screen.queryByRole("link", { name: "Tareas" })).toBeNull());
  });

  it("marks the current destination", async () => {
    mount("/app/tasks");
    fireEvent.click(screen.getByRole("button", { name: "Más" }));
    const current = await screen.findByRole("link", { name: "Tareas" });
    expect(current).toHaveAttribute("aria-current", "page");
  });
});
