"use client";
import { ActionIcon, Avatar, Card, Group, Stack, Text, Title } from "@mantine/core";
import {
  IconBrandWhatsapp,
  IconCopy,
  IconMail,
  IconPencil,
  IconPhone,
  IconTrash,
} from "@tabler/icons-react";
import type { ClinicContact } from "@/shared/api/resources/clinic-contacts";
import { contactEmailLink, contactPhoneLinks } from "./contact-links";
export function ContactCard({
  contact,
  onEdit,
  onDelete,
  onMessage,
  canManage = true,
}: {
  contact: ClinicContact;
  onEdit: () => void;
  onDelete: () => void;
  canManage?: boolean;
  onMessage: (message: string, error?: boolean) => void;
}) {
  const phones = contact.phones
    .map((p) => (typeof p === "string" ? p : p.number))
    .map(contactPhoneLinks)
    .filter((p) => p !== null);
  const emails = contact.emails.map(contactEmailLink).filter((e) => e !== null);
  const category = contact.category.toLocaleLowerCase("es");
  const color = category.includes("labor")
    ? "blue"
    : category.includes("prove")
      ? "teal"
      : category.includes("urgen")
        ? "red"
        : "violet";
  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error("No disponible");
      await navigator.clipboard.writeText(
        [
          contact.name,
          ...contact.phones.map((p) => (typeof p === "string" ? p : p.number)),
          ...contact.emails,
        ].join("\n"),
      );
      onMessage("Contacto copiado");
    } catch {
      onMessage("No se pudo copiar el contacto", true);
    }
  };
  return (
    <Card withBorder radius="md" padding="md">
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Group wrap="nowrap">
            <Avatar color={color} radius="xl">
              {contact.name
                .split(/\s+/)
                .slice(0, 2)
                .map((p) => p[0])
                .join("")
                .toUpperCase()}
            </Avatar>
            <Title order={3} size="h5">
              {contact.name}
            </Title>
          </Group>
          {canManage ? <Group gap={4} wrap="nowrap">
            <ActionIcon variant="subtle" aria-label={`Editar ${contact.name}`} onClick={onEdit}>
              <IconPencil size={17} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="red"
              aria-label={`Eliminar ${contact.name}`}
              onClick={onDelete}
            >
              <IconTrash size={17} />
            </ActionIcon>
          </Group> : null}
        </Group>
        {contact.hours ? (
          <Text size="sm" c="dimmed">
            {contact.hours}
          </Text>
        ) : null}
        {contact.notes ? <Text size="sm">{contact.notes}</Text> : null}
        <Group gap="xs">
          {phones.map((p, i) => (
            <Group gap={4} key={p.tel}>
              <ActionIcon
                component="a"
                href={p.tel}
                variant="light"
                aria-label={`Llamar a ${contact.name}${i ? ` (${i + 1})` : ""}`}
              >
                <IconPhone size={18} />
              </ActionIcon>
              {p.whatsapp ? (
                <ActionIcon
                  component="a"
                  href={p.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  color="green"
                  variant="light"
                  aria-label={`WhatsApp de ${contact.name}${i ? ` (${i + 1})` : ""}`}
                >
                  <IconBrandWhatsapp size={18} />
                </ActionIcon>
              ) : null}
            </Group>
          ))}
          {emails.map((href, i) => (
            <ActionIcon
              key={href}
              component="a"
              href={href}
              variant="light"
              aria-label={`Email de ${contact.name}${i ? ` (${i + 1})` : ""}`}
            >
              <IconMail size={18} />
            </ActionIcon>
          ))}
          <ActionIcon
            variant="light"
            aria-label={`Copiar ${contact.name}`}
            onClick={() => void copy()}
          >
            <IconCopy size={18} />
          </ActionIcon>
        </Group>
      </Stack>
    </Card>
  );
}
