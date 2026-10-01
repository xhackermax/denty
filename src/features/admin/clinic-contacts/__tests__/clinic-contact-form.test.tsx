// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ClinicContactsList } from "../clinic-contacts-list";
const api = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }));
vi.mock("../use-clinic-contacts", () => ({
  useClinicContacts: () => ({ ...api, isLoading: false }),
}));
afterEach(cleanup);
beforeEach(() => vi.resetAllMocks());
async function mount() {
  render(
    <MantineProvider>
      <ClinicContactsList clinicId="clinic" initialContacts={[]} initialTotalCount={0} />
    </MantineProvider>,
  );
  fireEvent.click(screen.getAllByRole("button", { name: "Añadir contacto" })[0]!);
  return screen.findByRole("dialog");
}
test("creates a contact with labelled Spanish fields and includes unadded phone and email", async () => {
  api.create.mockResolvedValue({
    id: "saved",
    name: "Ana",
    category: "Laboratorio",
    phones: [],
    emails: [],
    version: 1,
  });
  const dialog = await mount();
  fireEvent.change(within(dialog).getByRole("textbox", { name: /^Nombre/ }), {
    target: { value: "Ana" },
  });
  fireEvent.change(within(dialog).getByRole("textbox", { name: /^Categoría/ }), {
    target: { value: "Laboratorio" },
  });
  fireEvent.change(within(dialog).getByRole("textbox", { name: "Teléfono" }), {
    target: { value: "600111222" },
  });
  fireEvent.change(within(dialog).getByRole("textbox", { name: "Correo electrónico" }), {
    target: { value: "ana@example.com" },
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "Guardar contacto" }));
  await waitFor(() =>
    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Ana",
        category: "Laboratorio",
        phones: [{ number: "600111222", type: "mobile" }],
        emails: ["ana@example.com"],
      }),
    ),
  );
  expect(await screen.findByText("Contacto guardado")).toBeInTheDocument();
});
test("shows a save error inside the form and preserves entered data", async () => {
  api.create.mockRejectedValue(new Error("No se pudo conectar"));
  const dialog = await mount();
  fireEvent.change(within(dialog).getByRole("textbox", { name: /^Nombre/ }), {
    target: { value: "Ana" },
  });
  fireEvent.change(within(dialog).getByRole("textbox", { name: /^Categoría/ }), {
    target: { value: "Laboratorio" },
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "Guardar contacto" }));
  expect(await within(dialog).findByRole("alert")).toHaveTextContent("No se pudo conectar");
  expect(within(dialog).getByRole("textbox", { name: /^Nombre/ })).toHaveValue("Ana");
});

test("adds and removes contact channels without submitting the form", async () => {
  const dialog = await mount();
  const phone = within(dialog).getByRole("textbox", { name: "Teléfono" });
  fireEvent.change(phone, { target: { value: "600111222" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Añadir teléfono" }));
  expect(phone).toHaveValue("");
  fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar teléfono 600111222" }));
  expect(within(dialog).queryByText("600111222")).toBeNull();
  const email = within(dialog).getByRole("textbox", { name: "Correo electrónico" });
  fireEvent.change(email, { target: { value: "ana@example.com" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Añadir correo" }));
  expect(email).toHaveValue("");
  fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar correo ana@example.com" }));
  expect(within(dialog).queryByText("ana@example.com")).toBeNull();
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(api.create).not.toHaveBeenCalled();
});

test("editing preserves existing channels and sends the version with changes", async () => {
  const { ClinicContactForm } = await import("../clinic-contact-form");
  const contact = {
    id: "c1",
    clinic_id: "clinic",
    name: "Ana",
    category: "Laboratorio",
    phones: ["600000000"],
    emails: ["ana@example.com"],
    notes: null,
    hours: null,
    version: 4,
    created_by: "admin",
    created_at: "2026-10-01",
    updated_at: "2026-10-01",
  };
  const success = vi.fn();
  api.update.mockResolvedValue({ ...contact, version: 5 });
  render(
    <MantineProvider>
      <ClinicContactForm
        clinicId="clinic"
        editingContact={contact}
        onCreate={api.create}
        onUpdate={api.update}
        onSuccess={success}
        onCancel={() => {}}
      />
    </MantineProvider>,
  );
  fireEvent.change(screen.getByRole("textbox", { name: "Horario" }), {
    target: { value: "9:00–17:00" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Notas" }), {
    target: { value: "Entrega por la mañana" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Guardar contacto" }));
  await waitFor(() =>
    expect(api.update).toHaveBeenCalledWith(
      "c1",
      expect.objectContaining({
        expectedVersion: 4,
        phones: [{ number: "600000000" }],
        emails: ["ana@example.com"],
        hours: "9:00–17:00",
        notes: "Entrega por la mañana",
      }),
    ),
  );
  expect(success).toHaveBeenCalled();
  expect(api.create).not.toHaveBeenCalled();
});
