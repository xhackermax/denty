"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconPlus, IconSearch } from "@tabler/icons-react";
import { ContactCard } from "./contact-card";
import type {
  ClinicContact,
  ClinicContactInsert,
  ClinicContactUpdate,
  PhoneEntry,
} from "@/shared/api/resources/clinic-contacts";
import { useClinicContacts } from "./use-clinic-contacts";

interface ClinicContactsListProps {
  clinicId: string;
  initialContacts: ClinicContact[];
  initialTotalCount: number;
}

export function ClinicContactsList({
  clinicId,
  initialContacts,
  initialTotalCount,
}: ClinicContactsListProps) {
  const {
    create,
    list,
    update,
    delete: deleteContact,
    isLoading: apiLoading,
  } = useClinicContacts(clinicId);
  const [contacts, setContacts] = useState(initialContacts);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<ClinicContact | null>(null);
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);

  const categories = useMemo(() => [...new Set(contacts.map((c) => c.category))], [contacts]);

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const matchesSearch =
        !search ||
        contact.name.toLowerCase().includes(search.toLowerCase()) ||
        contact.notes?.toLowerCase().includes(search.toLowerCase());

      const matchesCategory = !selectedCategory || contact.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [contacts, search, selectedCategory]);

  const handleLoadContacts = async () => {
    try {
      const options: NonNullable<Parameters<typeof list>[0]> = { limit: 100, offset: 0 };
      if (search) options.search = search;
      if (selectedCategory) options.category = selectedCategory;

      const result = await list(options);
      setContacts(result.data);
      setTotalCount(result.totalCount);
    } catch (error) {
      setToast({ type: "error", message: "No se pudieron cargar los contactos" });
      console.error(error);
    }
  };

  const handleDelete = async (contactId: string) => {
    if (!confirm("¿Eliminar este contacto?")) return;

    try {
      await deleteContact(contactId);
      setContacts(contacts.filter((c) => c.id !== contactId));
      setToast({ type: "success", message: "Contacto eliminado" });
    } catch (error) {
      setToast({ type: "error", message: "Error deleting contact" });
      console.error(error);
    }
  };

  const handleEdit = (contact: ClinicContact) => {
    setEditingContact(contact);
    setShowForm(true);
  };

  const groups = filteredContacts.reduce<Record<string, ClinicContact[]>>((result, contact) => {
    const category = contact.category.trim() || "General";
    (result[category] ??= []).push(contact);
    return result;
  }, {});
  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={1}>Contactos especiales</Title>
        <Button
          leftSection={<IconPlus size={17} />}
          onClick={() => {
            setEditingContact(null);
            setShowForm(true);
          }}
        >
          Añadir contacto
        </Button>
      </Group>
      {toast ? (
        <Alert
          color={toast.type === "error" ? "red" : "teal"}
          onClose={() => setToast(null)}
          withCloseButton
        >
          {toast.message}
        </Alert>
      ) : null}
      <Group align="end">
        <TextInput
          label="Buscar"
          placeholder="Buscar contactos"
          leftSection={<IconSearch size={17} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Select
          label="Categoría"
          placeholder="Todas las categorías"
          value={selectedCategory || null}
          onChange={(value) => setSelectedCategory(value ?? "")}
          data={categories.filter(Boolean)}
          clearable
        />
        <Button variant="light" loading={apiLoading} onClick={() => void handleLoadContacts()}>
          Actualizar
        </Button>
      </Group>
      {!filteredContacts.length ? (
        <Stack align="center" py="xl">
          <Text c="dimmed">No hay contactos que coincidan</Text>
          <Button
            variant="light"
            onClick={() => {
              setEditingContact(null);
              setShowForm(true);
            }}
          >
            Añadir contacto
          </Button>
        </Stack>
      ) : (
        Object.entries(groups).map(([category, items]) => (
          <section key={category} aria-label={category}>
            <Title order={2} size="h4" mb="sm">
              {category}
            </Title>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
              {items?.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  onEdit={() => handleEdit(contact)}
                  onDelete={() => void handleDelete(contact.id)}
                  onMessage={(message, error = false) =>
                    setToast({ type: error ? "error" : "success", message })
                  }
                />
              ))}
            </SimpleGrid>
          </section>
        ))
      )}
      <Text c="dimmed" size="sm">
        {totalCount} contactos
      </Text>
      <Modal
        opened={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingContact(null);
        }}
        title={editingContact ? "Editar contacto" : "Añadir contacto"}
        size="lg"
      >
        {showForm ? (
          <ClinicContactForm
            clinicId={clinicId}
            editingContact={editingContact}
            onCreate={(_clinic, data) => create(data)}
            onUpdate={(id, data) => update(id, data)}
            onCancel={() => {
              setShowForm(false);
              setEditingContact(null);
            }}
            onSuccess={(contact) => {
              setContacts((current) =>
                editingContact
                  ? current.map((c) => (c.id === contact.id ? contact : c))
                  : [contact, ...current],
              );
              if (!editingContact) setTotalCount((current) => current + 1);
              setShowForm(false);
              setEditingContact(null);
              setToast({ type: "success", message: "Contacto guardado" });
            }}
          />
        ) : null}
      </Modal>
    </Stack>
  );
}

interface ClinicContactFormProps {
  clinicId: string;
  editingContact: ClinicContact | null;
  onSuccess: (contact: ClinicContact) => void;
  onCancel: () => void;
  onCreate: (clinicId: string, data: ClinicContactInsert) => Promise<ClinicContact>;
  onUpdate: (
    contactId: string,
    data: ClinicContactUpdate & { expectedVersion?: number },
  ) => Promise<ClinicContact>;
}

function ClinicContactForm({
  clinicId,
  editingContact,
  onSuccess,
  onCancel,
  onCreate,
  onUpdate,
}: ClinicContactFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: editingContact?.name || "",
    category: editingContact?.category || "",
    phones: (editingContact?.phones || []) as PhoneEntry[],
    emails: (editingContact?.emails || []) as string[],
    notes: editingContact?.notes || "",
    hours: editingContact?.hours || "",
  });
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let result;

      if (editingContact) {
        result = await onUpdate(editingContact.id, {
          ...formData,
          expectedVersion: editingContact.version,
        });
      } else {
        result = await onCreate(clinicId, formData);
      }

      onSuccess(result);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Error saving contact");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-6 bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">
        {editingContact ? "Edit contact" : "New contact"}
      </h3>

      <div className="grid gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="e.g., Plumber Juan"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Category *</label>
          <input
            type="text"
            required
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="e.g., Plumber, Electrician, Delivery"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Phones</label>
          <div className="flex gap-2 mb-2">
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg"
              placeholder="Add phone number"
            />
            <button
              type="button"
              onClick={() => {
                if (newPhone) {
                  setFormData({
                    ...formData,
                    phones: [
                      ...(Array.isArray(formData.phones) ? formData.phones : []),
                      { number: newPhone, type: "mobile" },
                    ],
                  });
                  setNewPhone("");
                }
              }}
              className="px-3 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
            >
              Add
            </button>
          </div>
          <div className="space-y-1">
            {Array.isArray(formData.phones) &&
              formData.phones.map((phone, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm">
                    {typeof phone === "string" ? phone : phone.number}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        phones: formData.phones.filter((_, i) => i !== idx),
                      });
                    }}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Emails</label>
          <div className="flex gap-2 mb-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg"
              placeholder="Add email"
            />
            <button
              type="button"
              onClick={() => {
                if (newEmail) {
                  setFormData({
                    ...formData,
                    emails: [...(Array.isArray(formData.emails) ? formData.emails : []), newEmail],
                  });
                  setNewEmail("");
                }
              }}
              className="px-3 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
            >
              Add
            </button>
          </div>
          <div className="space-y-1">
            {Array.isArray(formData.emails) &&
              formData.emails.map((email, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm">{email}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        emails: formData.emails.filter((_, i) => i !== idx),
                      });
                    }}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Hours</label>
          <input
            type="text"
            value={formData.hours}
            onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="e.g., 9:00-17:00 (Mon-Fri)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="Additional notes..."
            rows={3}
          />
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? "Saving..." : editingContact ? "Update" : "Create"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border rounded-lg py-2 hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
