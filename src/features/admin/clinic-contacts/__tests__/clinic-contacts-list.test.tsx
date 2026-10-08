// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { ClinicContactsList } from "../clinic-contacts-list";
import type { ClinicContact } from "@/shared/api/resources/clinic-contacts";
afterEach(cleanup);
const contact = (id: string, name: string, category: string): ClinicContact => ({
  id,
  name,
  category,
  clinic_id: "clinic",
  phones: [{ number: "+34 600 111 222" }],
  emails: ["ana@example.com"],
  notes: null,
  hours: null,
  created_by: "staff",
  created_at: "2026-10-01",
  updated_at: "2026-10-01",
  version: 1,
});
const mount = () =>
  render(
    <MantineProvider>
      <ClinicContactsList
        clinicId="clinic"
        initialContacts={[
          contact("a", "Laboratorio Ana", "Laboratorio"),
          contact("b", "Proveedor Luis", "Proveedor"),
        ]}
        initialTotalCount={2}
      />
    </MantineProvider>,
  );
test("groups contacts and exposes accessible quick actions", () => {
  mount();
  expect(screen.getByRole("heading", { name: "Laboratorio" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Llamar a Laboratorio Ana" })).toHaveAttribute(
    "href",
    "tel:+34600111222",
  );
  expect(screen.getByRole("link", { name: "WhatsApp de Laboratorio Ana" })).toHaveAttribute(
    "href",
    "https://wa.me/34600111222",
  );
  expect(screen.getByRole("link", { name: "Email de Laboratorio Ana" })).toHaveAttribute(
    "href",
    "mailto:ana@example.com",
  );
});
test("search filters cards and offers add contact in the empty state", () => {
  mount();
  fireEvent.change(screen.getByPlaceholderText("Buscar contactos"), { target: { value: "Luis" } });
  expect(screen.queryByRole("heading", { name: "Laboratorio Ana" })).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Proveedor Luis" })).toBeInTheDocument();
  fireEvent.change(screen.getByPlaceholderText("Buscar contactos"), {
    target: { value: "Sin resultados" },
  });
  expect(screen.getByText("No hay contactos que coincidan")).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Añadir contacto" }).length).toBeGreaterThan(0);
});

test("clipboard failure is shown without losing contact cards", async () => {
  const original = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async () => {
        throw new Error("Denied");
      },
    },
  });
  try {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Copiar Laboratorio Ana" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo copiar el contacto");
    expect(screen.getByRole("heading", { name: "Laboratorio Ana" })).toBeInTheDocument();
  } finally {
    if (original) Object.defineProperty(navigator, "clipboard", original);
    else Reflect.deleteProperty(navigator, "clipboard");
  }
});
test("copies contact data and allows editing", async () => {
  const original = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  const copied: string[] = [];
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async (text: string) => {
        copied.push(text);
      },
    },
  });
  try {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Copiar Laboratorio Ana" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Contacto copiado");
    expect(copied[0]).toContain("+34 600 111 222");
    fireEvent.click(screen.getByRole("button", { name: "Editar Laboratorio Ana" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Editar contacto");
  } finally {
    if (original) Object.defineProperty(navigator, "clipboard", original);
    else Reflect.deleteProperty(navigator, "clipboard");
  }
});

test.each(["constructor", "toString", "__proto__"])("renders persisted category %s", (category) => {
  render(
    <MantineProvider>
      <ClinicContactsList
        clinicId="clinic"
        initialContacts={[contact("special", "Contacto", category)]}
        initialTotalCount={1}
      />
    </MantineProvider>,
  );
  expect(screen.getByRole("heading", { name: category })).toBeInTheDocument();
});

test("reception can read contact cards but cannot add, edit or delete", () => {
  render(
    <MantineProvider>
      <ClinicContactsList
        clinicId="clinic"
        initialContacts={[contact("a", "Laboratorio Ana", "Laboratorio")]}
        initialTotalCount={1}
        canManage={false}
      />
    </MantineProvider>,
  );
  expect(screen.getByRole("heading", { name: "Laboratorio Ana" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Llamar a Laboratorio Ana" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Añadir contacto" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Editar Laboratorio Ana" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Eliminar Laboratorio Ana" })).not.toBeInTheDocument();
});
