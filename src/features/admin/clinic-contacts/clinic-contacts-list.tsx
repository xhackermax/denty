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
import styles from "@/shared/ui/parity.module.css";
import { ClinicContactForm } from "./clinic-contact-form";
import { ContactCard } from "./contact-card";
import type { ClinicContact } from "@/shared/api/resources/clinic-contacts";
import { useClinicContacts } from "./use-clinic-contacts";

interface ClinicContactsListProps {
  clinicId: string;
  initialContacts: ClinicContact[];
  initialTotalCount: number;
  canManage?: boolean;
}

export function ClinicContactsList({
  clinicId,
  initialContacts,
  initialTotalCount,
  canManage = true,
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
      setToast({ type: "error", message: "No se pudo eliminar el contacto" });
      console.error(error);
    }
  };

  const handleEdit = (contact: ClinicContact) => {
    setEditingContact(contact);
    setShowForm(true);
  };

  const groups = filteredContacts.reduce<Record<string, ClinicContact[]>>(
    (result, contact) => {
      const category = contact.category.trim() || "General";
      (result[category] ??= []).push(contact);
      return result;
    },
    Object.create(null) as Record<string, ClinicContact[]>,
  );
  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={1}>Contactos especiales</Title>
        {canManage ? <Button
          leftSection={<IconPlus size={17} />}
          onClick={() => {
            setEditingContact(null);
            setShowForm(true);
          }}
        >
          Añadir contacto
        </Button> : null}
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
          className={styles.flexField}
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
          {canManage ? <Button
            variant="light"
            onClick={() => {
              setEditingContact(null);
              setShowForm(true);
            }}
          >
            Añadir contacto
          </Button> : null}
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
                  canManage={canManage}
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
        {showForm && canManage ? (
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
