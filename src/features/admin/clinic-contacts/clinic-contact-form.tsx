"use client";
import { useRef, useState, type FormEvent } from "react";
import {
  ActionIcon,
  Alert,
  Button,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
} from "@mantine/core";
import {
  IconAddressBook,
  IconClock,
  IconMail,
  IconPhone,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import type {
  ClinicContact,
  ClinicContactInsert,
  ClinicContactUpdate,
  PhoneEntry,
} from "@/shared/api/resources/clinic-contacts";
interface ClinicContactFormProps {
  clinicId: string;
  editingContact: ClinicContact | null;
  onSuccess: (contact: ClinicContact) => void;
  onCancel: () => void;
  onCreate: (clinicId: string, data: ClinicContactInsert) => Promise<ClinicContact>;
  onUpdate: (
    id: string,
    data: ClinicContactUpdate & { expectedVersion?: number },
  ) => Promise<ClinicContact>;
}
export function ClinicContactForm({
  clinicId,
  editingContact,
  onSuccess,
  onCancel,
  onCreate,
  onUpdate,
}: ClinicContactFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: editingContact?.name ?? "",
    category: editingContact?.category ?? "",
    phones: (editingContact?.phones ?? []).map((phone): PhoneEntry =>
      typeof phone === "string" ? { number: phone } : phone,
    ),
    emails: editingContact?.emails ?? [],
    notes: editingContact?.notes ?? "",
    hours: editingContact?.hours ?? "",
  });
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const emailInput = useRef<HTMLInputElement>(null);
  const addPhone = () => {
    if (!newPhone.trim()) return;
    setFormData((current) => ({
      ...current,
      phones: [...current.phones, { number: newPhone.trim(), type: "mobile" }],
    }));
    setNewPhone("");
  };
  const addEmail = () => {
    if (!newEmail.trim() || !emailInput.current?.reportValidity()) return;
    setFormData((current) => ({ ...current, emails: [...current.emails, newEmail.trim()] }));
    setNewEmail("");
  };
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    const data = {
      ...formData,
      name: formData.name.trim(),
      category: formData.category.trim(),
      phones: newPhone.trim()
        ? [...formData.phones, { number: newPhone.trim(), type: "mobile" as const }]
        : formData.phones,
      emails: newEmail.trim() ? [...formData.emails, newEmail.trim()] : formData.emails,
    };
    try {
      const saved = editingContact
        ? await onUpdate(editingContact.id, { ...data, expectedVersion: editingContact.version })
        : await onCreate(clinicId, data);
      onSuccess(saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el contacto.");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="lg">
        <Group wrap="nowrap" gap="sm">
          <ThemeIcon size={42} radius="xl" variant="light" color="teal">
            <IconAddressBook size={22} stroke={1.5} />
          </ThemeIcon>
          <Text c="dimmed" size="sm">
            Datos de contacto para proveedores, laboratorios y otros servicios.
          </Text>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label="Nombre"
            placeholder="Persona o empresa"
            required
            maxLength={200}
            value={formData.name}
            disabled={isLoading}
            onChange={(e) => setFormData({ ...formData, name: e.currentTarget.value })}
          />
          <TextInput
            label="Categoría"
            placeholder="Laboratorio, proveedor, mantenimiento…"
            required
            maxLength={100}
            value={formData.category}
            disabled={isLoading}
            onChange={(e) => setFormData({ ...formData, category: e.currentTarget.value })}
          />
        </SimpleGrid>
        <Stack gap="xs">
          <Group align="end" wrap="nowrap">
            <TextInput
              flex={1}
              label="Teléfono"
              type="tel"
              placeholder="+34 600 000 000"
              leftSection={<IconPhone size={17} stroke={1.5} />}
              value={newPhone}
              disabled={isLoading}
              onChange={(e) => setNewPhone(e.currentTarget.value)}
            />
            <ActionIcon
              size={36}
              variant="light"
              radius="md"
              aria-label="Añadir teléfono"
              disabled={isLoading || !newPhone.trim()}
              onClick={addPhone}
            >
              <IconPlus size={18} />
            </ActionIcon>
          </Group>
          {formData.phones.map((phone, index) => (
            <Group key={`${phone.number}-${index}`} justify="space-between" gap="xs">
              <Text size="sm">{phone.number}</Text>
              <ActionIcon
                variant="subtle"
                color="red"
                aria-label={`Eliminar teléfono ${phone.number}`}
                disabled={isLoading}
                onClick={() =>
                  setFormData({
                    ...formData,
                    phones: formData.phones.filter((_, i) => i !== index),
                  })
                }
              >
                <IconTrash size={16} stroke={1.5} />
              </ActionIcon>
            </Group>
          ))}
        </Stack>
        <Stack gap="xs">
          <Group align="end" wrap="nowrap">
            <TextInput
              ref={emailInput}
              flex={1}
              label="Correo electrónico"
              type="email"
              placeholder="contacto@empresa.es"
              leftSection={<IconMail size={17} stroke={1.5} />}
              value={newEmail}
              disabled={isLoading}
              onChange={(e) => setNewEmail(e.currentTarget.value)}
            />
            <ActionIcon
              size={36}
              variant="light"
              radius="md"
              aria-label="Añadir correo"
              disabled={isLoading || !newEmail.trim()}
              onClick={addEmail}
            >
              <IconPlus size={18} />
            </ActionIcon>
          </Group>
          {formData.emails.map((email, index) => (
            <Group key={`${email}-${index}`} justify="space-between" gap="xs">
              <Text size="sm">{email}</Text>
              <ActionIcon
                variant="subtle"
                color="red"
                aria-label={`Eliminar correo ${email}`}
                disabled={isLoading}
                onClick={() =>
                  setFormData({
                    ...formData,
                    emails: formData.emails.filter((_, i) => i !== index),
                  })
                }
              >
                <IconTrash size={16} stroke={1.5} />
              </ActionIcon>
            </Group>
          ))}
        </Stack>
        <TextInput
          label="Horario"
          placeholder="Lunes a viernes, de 9:00 a 17:00"
          leftSection={<IconClock size={17} stroke={1.5} />}
          value={formData.hours}
          disabled={isLoading}
          onChange={(e) => setFormData({ ...formData, hours: e.currentTarget.value })}
        />
        <Textarea
          label="Notas"
          placeholder="Información útil para el equipo"
          rows={3}
          value={formData.notes}
          disabled={isLoading}
          onChange={(e) => setFormData({ ...formData, notes: e.currentTarget.value })}
        />
        {error ? (
          <Alert color="red" role="alert">
            {error}
          </Alert>
        ) : null}
        <Group justify="flex-end">
          <Button variant="default" disabled={isLoading} onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" loading={isLoading}>
            Guardar contacto
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
