// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClinicContact } from "@/shared/api/resources/clinic-contacts";
import { dentyTheme } from "@/styles/theme";
import { ClinicContactForm } from "./clinic-contact-form";
import { ClinicContactsList } from "./clinic-contacts-list";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const contact: ClinicContact = {
  id: "contact-1",
  clinic_id: "clinic-1",
  name: "Laboratorio Norte",
  category: "Laboratorios",
  phones: [
    { number: "+34 600 111 222", type: "mobile" },
    { number: "910 222 333", type: "fixed" },
  ],
  emails: ["pedidos@norte.es", "facturas@norte.es"],
  notes: "Recogida diaria",
  hours: "L–V 09:00–18:00",
  created_by: "actor-1",
  created_at: "2026-10-01",
  updated_at: "2026-10-01",
  version: 1,
};

function renderForm(
  onSave: (data: unknown) => Promise<void>,
  existing: ClinicContact | null = null,
) {
  render(
    <MantineProvider theme={dentyTheme}>
      <ClinicContactForm
        contact={existing}
        categories={["Laboratorios"]}
        onSave={onSave}
        onCancel={() => {}}
        onPendingChange={() => {}}
      />
    </MantineProvider>,
  );
}

describe("Formulario de contactos", () => {
  it("guarda los teléfonos y correos escritos sin un paso de confirmación adicional", async () => {
    const save = vi.fn(async () => {});
    renderForm(save);
    fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: "  Proveedor Sur  " } });
    fireEvent.change(screen.getByLabelText(/^Categoría/), { target: { value: "Proveedores" } });
    fireEvent.change(screen.getByLabelText("Teléfono 1"), { target: { value: "+34 600 000 111" } });
    fireEvent.change(screen.getByLabelText("Correo electrónico 1"), {
      target: { value: "ventas@sur.es" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar contacto" }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Proveedor Sur",
          category: "Proveedores",
          phones: [{ number: "+34 600 000 111", type: "mobile" }],
          emails: ["ventas@sur.es"],
        }),
      ),
    );
  });

  it("conserva el borrador y permite reintentar si falla el guardado", async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error("No se pudo conectar"))
      .mockResolvedValueOnce(undefined);
    renderForm(save, contact);
    fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: "Nombre corregido" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo conectar");
    expect(screen.getByLabelText(/^Nombre/)).toHaveValue("Nombre corregido");
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  });

  it("permite quitar entradas y vaciar las notas al editar", async () => {
    const save = vi.fn(async () => {});
    renderForm(save, contact);
    fireEvent.click(screen.getByRole("button", { name: "Quitar teléfono 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Quitar correo 1" }));
    fireEvent.change(screen.getByLabelText("Notas"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          phones: [{ number: "910 222 333", type: "fixed" }],
          emails: ["facturas@norte.es"],
          notes: "",
        }),
      ),
    );
  });
});

describe("Directorio de contactos", () => {
  it("ofrece un enlace independiente para cada teléfono y correo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response(JSON.stringify([{ ...contact, total_count: 1 }]), { status: 200 }),
      ),
    );
    render(
      <MantineProvider theme={dentyTheme}>
        <ClinicContactsList clinicId="clinic-1" initialContacts={[contact]} initialTotalCount={1} />
      </MantineProvider>,
    );
    expect(screen.getByRole("link", { name: "+34 600 111 222" })).toHaveAttribute(
      "href",
      "tel:+34600111222",
    );
    expect(screen.getByRole("link", { name: "910 222 333" })).toHaveAttribute(
      "href",
      "tel:910222333",
    );
    expect(screen.getByRole("link", { name: "pedidos@norte.es" })).toHaveAttribute(
      "href",
      "mailto:pedidos@norte.es",
    );
    expect(screen.getByRole("link", { name: "facturas@norte.es" })).toHaveAttribute(
      "href",
      "mailto:facturas@norte.es",
    );
    await waitFor(() => expect(fetch).toHaveBeenCalled());
  });
});
