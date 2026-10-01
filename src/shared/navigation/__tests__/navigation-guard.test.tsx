import Link from "next/link";
// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { NavigationProvider, backTarget } from "../navigation-provider";
import { useUnsavedChangesGuard } from "../use-unsaved-changes-guard";
import { PageBackButton } from "@/shared/ui/page-back-button";
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/app/patients/p1/odontogram",
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
function Editor({ fail = false }: { fail?: boolean }) {
  const [dirty, setDirty] = useState(true);
  useUnsavedChangesGuard({
    dirty,
    onDiscard: () => setDirty(false),
    onSave: async () => {
      if (fail) throw new Error("No se pudo guardar");
      setDirty(false);
    },
  });
  return (
    <>
      <span>{dirty ? "Pendiente" : "Limpio"}</span>
      <PageBackButton fallbackHref="/app/patients/p1" />
      <Link href="/app/tasks">Tareas</Link>
    </>
  );
}
const mount = (fail = false) =>
  render(
    <MantineProvider>
      <NavigationProvider>
        <Editor fail={fail} />
      </NavigationProvider>
    </MantineProvider>,
  );
test("direct entry uses fallback and internal history cannot lead outside the app", () => {
  expect(backTarget([], "/app/patients/p1")).toBe("/app/patients/p1");
  expect(backTarget(["https://outside.test", "/app/current"], "/app")).toBe("/app");
  expect(backTarget(["/app/patients", "/app/patients/p1"], "/app")).toBe("/app/patients");
});
test("cancel keeps edits; discard resets state then navigates to fallback", async () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Volver" }));
  expect(await screen.findByText("Tienes cambios sin guardar")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(router.push).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Volver" }));
  fireEvent.click(await screen.findByRole("button", { name: "Descartar" }));
  expect(screen.getByText("Limpio")).toBeInTheDocument();
  expect(router.push).toHaveBeenCalledWith("/app/patients/p1");
});
test("saving error keeps editor and prevents navigation", async () => {
  mount(true);
  fireEvent.click(screen.getByRole("button", { name: "Volver" }));
  fireEvent.click(await screen.findByRole("button", { name: "Guardar" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar");
  expect(router.push).not.toHaveBeenCalled();
  expect(screen.getByText("Pendiente")).toBeInTheDocument();
});
test("guards internal links and registers beforeunload only while dirty", async () => {
  mount();
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  fireEvent.click(screen.getByRole("link", { name: "Tareas" }));
  fireEvent.click(await screen.findByRole("button", { name: "Guardar" }));
  await waitFor(() => expect(router.push).toHaveBeenCalledWith("/app/tasks"));
  const clean = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(clean);
  expect(clean.defaultPrevented).toBe(false);
});
test("multiple clinical editors all save before navigation; a later clean editor cannot hide dirty edits", async () => {
  const saved: string[] = [];
  function First() {
    useUnsavedChangesGuard({
      dirty: true,
      onDiscard: () => undefined,
      onSave: async () => {
        saved.push("mouth");
      },
    });
    return <PageBackButton fallbackHref="/app" />;
  }
  function Second() {
    useUnsavedChangesGuard({
      dirty: false,
      onDiscard: () => undefined,
      onSave: async () => {
        saved.push("perio");
      },
    });
    return null;
  }
  render(
    <MantineProvider>
      <NavigationProvider>
        <First />
        <Second />
      </NavigationProvider>
    </MantineProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Volver" }));
  expect(await screen.findByText("Tienes cambios sin guardar")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
  await waitFor(() => expect(router.push).toHaveBeenCalledWith("/app"));
  expect(saved).toEqual(["mouth"]);
});
test("saves every dirty editor and blocks navigation if any save fails", async () => {
  const saved: string[] = [];
  function First() {
    useUnsavedChangesGuard({
      dirty: true,
      onDiscard: () => undefined,
      onSave: async () => {
        saved.push("mouth");
      },
    });
    return <PageBackButton fallbackHref="/app" />;
  }
  function Second() {
    useUnsavedChangesGuard({
      dirty: true,
      onDiscard: () => undefined,
      onSave: async () => {
        saved.push("perio");
        throw new Error("Borrador sin guardar");
      },
    });
    return null;
  }
  render(
    <MantineProvider>
      <NavigationProvider>
        <First />
        <Second />
      </NavigationProvider>
    </MantineProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Volver" }));
  fireEvent.click(await screen.findByRole("button", { name: "Guardar" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Borrador sin guardar");
  expect(router.push).not.toHaveBeenCalled();
  expect(saved).toEqual(["mouth", "perio"]);
});
