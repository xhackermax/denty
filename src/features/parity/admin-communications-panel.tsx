"use client";

import {
  Alert,
  Button,
  Group,
  NumberInput,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query/keys";
import styles from "@/shared/ui/parity.module.css";

const defaultTemplate =
  "Hola {{patientName}}, confirma tu cita en Denty para el {{appointmentDate}} a las {{appointmentTime}}: {{confirmationUrl}}";

export function AdminCommunicationsPanel() {
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: dentyQueryKeys.communications.appointmentSettings,
    queryFn: () => getBrowserApi().engagement.communications.appointmentSettings(),
  });
  const save = useMutation({
    mutationFn: () =>
      getBrowserApi().engagement.communications.updateAppointmentSettings({
        reminderDaysBefore,
        preferredChannel,
        whatsappEnabled,
        smsEnabled,
        whatsappProvider,
        smsProvider,
        whatsappFrom: whatsappFrom || undefined,
        smsFrom: smsFrom || undefined,
        confirmationLinkBaseUrl: confirmationLinkBaseUrl || undefined,
        reminderTemplate,
      }),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: dentyQueryKeys.communications.appointmentSettings,
      }),
  });
  const queue = useMutation({
    mutationFn: () => getBrowserApi().engagement.communications.queueAppointmentReminders(),
  });

  const [reminderDaysBefore, setReminderDaysBefore] = useState(7);
  const [preferredChannel, setPreferredChannel] = useState<"WHATSAPP" | "SMS">("WHATSAPP");
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [whatsappProvider, setWhatsappProvider] = useState("UNCONFIGURED");
  const [smsProvider, setSmsProvider] = useState("UNCONFIGURED");
  const [whatsappFrom, setWhatsappFrom] = useState("");
  const [smsFrom, setSmsFrom] = useState("");
  const [confirmationLinkBaseUrl, setConfirmationLinkBaseUrl] = useState("");
  const [reminderTemplate, setReminderTemplate] = useState(defaultTemplate);

  useEffect(() => {
    const data = settings.data;
    if (!data) return;
    setReminderDaysBefore(data.reminderDaysBefore ?? data.reminder_days_before ?? 7);
    setPreferredChannel(data.preferredChannel ?? data.preferred_channel ?? "WHATSAPP");
    setWhatsappEnabled(data.whatsappEnabled ?? data.whatsapp_enabled ?? true);
    setSmsEnabled(data.smsEnabled ?? data.sms_enabled ?? true);
    setWhatsappProvider(data.whatsappProvider ?? data.whatsapp_provider ?? "UNCONFIGURED");
    setSmsProvider(data.smsProvider ?? data.sms_provider ?? "UNCONFIGURED");
    setWhatsappFrom(data.whatsappFrom ?? data.whatsapp_from ?? "");
    setSmsFrom(data.smsFrom ?? data.sms_from ?? "");
    setConfirmationLinkBaseUrl(
      data.confirmationLinkBaseUrl ?? data.confirmation_link_base_url ?? "",
    );
    setReminderTemplate(data.reminderTemplate ?? data.reminder_template ?? defaultTemplate);
  }, [settings.data]);

  return (
    <Stack gap="md">
      {settings.isError ? (
        <Alert color="red">No se pudo cargar la configuración de comunicaciones.</Alert>
      ) : null}
      <section className={styles.section}>
        <Group justify="space-between" align="start">
          <div>
            <Title order={3}>Confirmación de citas</Title>
            <Text c="dimmed" size="sm" mt="xs">
              Preparado para WhatsApp y SMS: Denty genera enlaces únicos y deja los mensajes en la
              cola para el proveedor que se conecte después.
            </Text>
          </div>
          <Button variant="light" onClick={() => queue.mutate()} loading={queue.isPending}>
            Encolar recordatorios
          </Button>
        </Group>
        {queue.data ? (
          <Alert color="green" mt="md">
            Recordatorios encolados: {queue.data.queued}. Omitidos: {queue.data.skipped}.
          </Alert>
        ) : null}
        {queue.isError ? (
          <Alert color="red" mt="md">
            No se pudieron encolar los recordatorios. Revisa la URL base y los permisos.
          </Alert>
        ) : null}
        <Stack mt="lg">
          <Group grow align="end">
            <NumberInput
              label="Días antes de la cita"
              min={1}
              max={30}
              value={reminderDaysBefore}
              onChange={(value) => setReminderDaysBefore(Number(value) || 7)}
            />
            <Select
              label="Canal preferido"
              data={[
                { value: "WHATSAPP", label: "WhatsApp" },
                { value: "SMS", label: "SMS" },
              ]}
              value={preferredChannel}
              onChange={(value) => setPreferredChannel(value === "SMS" ? "SMS" : "WHATSAPP")}
            />
          </Group>
          <Group grow align="end">
            <Switch
              label="WhatsApp activo"
              checked={whatsappEnabled}
              onChange={(event) => setWhatsappEnabled(event.currentTarget.checked)}
            />
            <TextInput
              label="Proveedor WhatsApp"
              value={whatsappProvider}
              onChange={(event) => setWhatsappProvider(event.currentTarget.value)}
            />
            <TextInput
              label="Remitente WhatsApp"
              value={whatsappFrom}
              onChange={(event) => setWhatsappFrom(event.currentTarget.value)}
            />
          </Group>
          <Group grow align="end">
            <Switch
              label="SMS activo"
              checked={smsEnabled}
              onChange={(event) => setSmsEnabled(event.currentTarget.checked)}
            />
            <TextInput
              label="Proveedor SMS"
              value={smsProvider}
              onChange={(event) => setSmsProvider(event.currentTarget.value)}
            />
            <TextInput
              label="Remitente SMS"
              value={smsFrom}
              onChange={(event) => setSmsFrom(event.currentTarget.value)}
            />
          </Group>
          <TextInput
            label="URL base del enlace"
            placeholder="https://tudominio.com"
            value={confirmationLinkBaseUrl}
            onChange={(event) => setConfirmationLinkBaseUrl(event.currentTarget.value)}
          />
          <Textarea
            label="Plantilla del mensaje"
            minRows={4}
            value={reminderTemplate}
            onChange={(event) => setReminderTemplate(event.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button onClick={() => save.mutate()} loading={save.isPending}>
              Guardar configuración
            </Button>
          </Group>
          {save.isSuccess ? <Alert color="green">Configuración guardada.</Alert> : null}
          {save.isError ? <Alert color="red">No se pudo guardar la configuración.</Alert> : null}
        </Stack>
      </section>
    </Stack>
  );
}
