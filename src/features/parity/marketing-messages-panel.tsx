"use client";

import {
  Alert, Badge, Button, Group, Modal, NumberInput, Select, Stack, Switch,
  Text, Textarea, TextInput, Title,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { getBrowserApi } from "@/shared/api/browser";
import type { z } from "zod";
import type {
  marketingMessageTemplateSchema,
  saveMarketingMessageTemplateSchema,
} from "@/shared/api/schemas/engagement";
import styles from "@/shared/ui/parity.module.css";

type Template = z.infer<typeof marketingMessageTemplateSchema>;
type TemplateInput = z.input<typeof saveMarketingMessageTemplateSchema>;
type Kind = Template["kind"];

const LABELS: Record<Kind, string> = {
  BIRTHDAY: "Felicitaciones de cumpleaños",
  OFFER: "Ofertas especiales",
  DISCOUNT: "Descuentos",
};

const channels = [
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "SMS", label: "SMS" },
  { value: "EMAIL", label: "Correo electrónico" },
];

function previewTemplate(input: TemplateInput, patientName: string) {
  const body = input.body
    .replaceAll("{{patientName}}", patientName || "Paciente de ejemplo")
    .replaceAll("{{clinicName}}", "Nombre de la clínica")
    .replaceAll("{{offerDetails}}", input.offerDetails)
    .replaceAll("{{discountPercent}}", String(input.discountPercent ?? ""))
    .replaceAll("{{validUntil}}", input.validUntil ?? "");
  const prefix = input.kind === "BIRTHDAY" ? "" : "PUBLICIDAD · Nombre de la clínica. ";
  const footer = input.channel === "EMAIL"
    ? `Para dejar de recibir publicidad, escribe a ${input.contactEmail || "(correo pendiente)"}.`
    : "Para no recibir más ofertas, responde BAJA a este mensaje.";
  return `${prefix}${body}\n${footer}`;
}

function Editor({ template }: { template: Template }) {
  const qc = useQueryClient();
  const [state, setState] = useState<TemplateInput>({
    kind: template.kind,
    channel: template.channel,
    enabled: template.enabled,
    subject: template.subject,
    body: template.body,
    offerDetails: template.offer_details,
    discountPercent: template.discount_percent,
    validUntil: template.valid_until,
    contactEmail: template.contact_email,
  });
  const [patientId, setPatientId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const patients = useQuery({
    queryKey: ["marketing-campaign-patients"],
    queryFn: () => getBrowserApi().patients.list(),
    enabled: template.kind !== "BIRTHDAY",
  });
  const consents = useQuery({
    queryKey: ["marketing-campaign-consents", patientId],
    queryFn: () => getBrowserApi().engagement.communications.consents(patientId!),
    enabled: Boolean(patientId),
  });
  const selectedPatient = patients.data?.items.find(p => p.id === patientId);
  const granted = useMemo(() => {
    const rows = (consents.data?.items ?? []) as Array<Record<string, unknown>>;
    const consent = rows.find(row => row.channel === state.channel &&
      (row.purpose === "MARKETING" || row.category === "MARKETING"));
    return consent?.status === "GRANTED" || consent?.granted === true;
  }, [consents.data, state.channel]);

  const save = useMutation({
    mutationFn: () => getBrowserApi().engagement.communications.saveCampaignTemplate(state),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["marketing-campaign-templates"] });
    },
  });
  const queue = useMutation({
    mutationFn: () => getBrowserApi().engagement.communications.queueCampaignTemplate({
      kind: template.kind,
      ...(patientId && template.kind !== "BIRTHDAY" ? { patientId } : {}),
    }),
    onSuccess: () => {
      setConfirmOpen(false);
      void qc.invalidateQueries({ queryKey: ["denty", "communications"] });
    },
  });
  const changed = JSON.stringify({
    ...state, offerDetails: state.offerDetails || "",
  }) !== JSON.stringify({
    kind: template.kind, channel: template.channel, enabled: template.enabled,
    subject: template.subject, body: template.body,
    offerDetails: template.offer_details, discountPercent: template.discount_percent,
    validUntil: template.valid_until, contactEmail: template.contact_email,
  });

  return (
    <section className={styles.section}>
      <Group justify="space-between" mb="md">
        <Title order={3}>{LABELS[template.kind]}</Title>
        <Badge variant="light" color={state.enabled ? "green" : "gray"}>
          {state.enabled ? "Activada" : "Desactivada"}
        </Badge>
      </Group>
      <Stack gap="sm">
        <Switch label="Habilitar esta plantilla" checked={state.enabled}
          onChange={event => setState(s => ({ ...s, enabled: event.currentTarget.checked }))} />
        <Select label="Canal de envío" data={channels} value={state.channel}
          onChange={value => setState(s => ({
            ...s, channel: (value ?? "WHATSAPP") as TemplateInput["channel"],
          }))}/>
        <TextInput label="Asunto" value={state.subject} maxLength={150}
          onChange={event => setState(s => ({ ...s, subject: event.currentTarget.value }))}/>
        <Textarea label="Mensaje editable" minRows={3} maxLength={1000}
          description="Variables: {{patientName}}, {{clinicName}}, {{offerDetails}}, {{discountPercent}}, {{validUntil}}"
          value={state.body}
          onChange={event => setState(s => ({ ...s, body: event.currentTarget.value }))}/>
        {template.kind !== "BIRTHDAY" ? (
          <>
            <Textarea label="Oferta y condiciones" minRows={2} maxLength={500}
              placeholder="Servicios incluidos, exclusiones y condiciones de participación"
              value={state.offerDetails}
              onChange={event => setState(s => ({ ...s, offerDetails: event.currentTarget.value }))}/>
            {template.kind === "DISCOUNT" ? (
              <NumberInput label="Porcentaje de descuento" min={1} max={100}
                value={state.discountPercent ?? ""}
                onChange={value => setState(s => ({
                  ...s, discountPercent: typeof value === "number" ? value : null,
                }))} />
            ) : null}
            <TextInput label="Válido hasta" type="date" value={state.validUntil ?? ""}
              onChange={event => setState(s => ({
                ...s, validUntil: event.currentTarget.value || null,
              }))}/>
          </>
        ) : null}
        {state.channel === "EMAIL" ? (
          <TextInput label="Correo para ejercer la baja" type="email" required
            placeholder="contacto@clinica.es" value={state.contactEmail}
            onChange={event => setState(s => ({ ...s, contactEmail: event.currentTarget.value }))}/>
        ) : null}
        <div>
          <Text fw={600} size="sm" mb="xs">Vista previa del mensaje</Text>
          <Text size="sm" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {previewTemplate(state, selectedPatient
              ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
              : "María García")}
          </Text>
        </div>
        <Alert color="blue">
          Los mensajes se preparan en la cola de Denty, pero no se enviarán realmente
          hasta conectar y activar el proveedor autorizado. Solo se admiten destinatarios
          con consentimiento comercial vigente para el canal seleccionado.
        </Alert>
        {save.isError ? <Alert color="red">
          No se pudo guardar. Revisa los datos y las condiciones de la oferta.
        </Alert> : null}
        {save.isSuccess ? <Alert color="green">Plantilla guardada.</Alert> : null}
        <Group justify="flex-end">
          <Button onClick={() => save.mutate()} loading={save.isPending}>
            Guardar plantilla
          </Button>
        </Group>
        <Text fw={600} size="sm">
          {template.kind === "BIRTHDAY" ? "Cumpleaños de hoy" : "Preparar mensaje para un paciente"}
        </Text>
        {template.kind === "BIRTHDAY" ? (
          <Text size="sm" c="dimmed">
            Solo se incluyen pacientes que cumplen años hoy, tienen medio de contacto
            y han autorizado comunicaciones comerciales. No se duplican las felicitaciones del año.
          </Text>
        ) : (
          <Select searchable clearable label="Paciente destinatario"
            placeholder="Seleccionar paciente" value={patientId}
            data={(patients.data?.items ?? []).map(p => ({
              value: p.id, label: `${p.firstName} ${p.lastName}`,
            }))}
            onChange={setPatientId} />
        )}
        {patientId && !consents.isPending && !granted ? (
          <Alert color="orange">
            Este paciente no tiene consentimiento comercial vigente para {state.channel}.
            Regístralo únicamente si el paciente lo ha autorizado realmente.
          </Alert>
        ) : null}
        {changed ? <Text c="dimmed" size="xs">Guarda los cambios antes de preparar el envío.</Text> : null}
        <Group justify="flex-end">
          <Button variant="light" disabled={!template.enabled || changed ||
              (template.kind !== "BIRTHDAY" && (!patientId || !granted))}
            onClick={() => setConfirmOpen(true)}>
            {template.kind === "BIRTHDAY" ? "Preparar cumpleaños de hoy" : "Preparar mensaje"}
          </Button>
        </Group>
        {queue.data ? (
          <Alert color="green">
            Preparados: {queue.data.queued}. Sin autorización/contacto: {queue.data.skipped}.
            Ya preparados anteriormente: {queue.data.alreadyQueued}.
          </Alert>
        ) : null}
        {queue.isError ? <Alert color="red">
          No se pudieron preparar los mensajes. Revisa permisos, consentimiento y vigencia.
        </Alert> : null}
      </Stack>
      <Modal opened={confirmOpen} onClose={() => setConfirmOpen(false)}
        title="Confirmar preparación de comunicaciones">
        <Stack gap="md">
          <Text size="sm">
            Vas a preparar {template.kind === "BIRTHDAY"
              ? "los cumpleaños de hoy de pacientes con permiso comercial"
              : `una promoción para ${selectedPatient?.firstName ?? "el paciente seleccionado"}`}.
            Se registrará en la cola, sin efectuar un envío directo.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button loading={queue.isPending} onClick={() => queue.mutate()}>
              Confirmar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </section>
  );
}

export function MarketingMessagesPanel() {
  const templates = useQuery({
    queryKey: ["marketing-campaign-templates"],
    queryFn: () => getBrowserApi().engagement.communications.campaignTemplates(),
  });

  return (
    <Stack gap="md">
      <Title order={2}>Cumpleaños, ofertas y descuentos</Title>
      <Text c="dimmed" size="sm">
        Plantillas de marketing independientes por clínica. Configura el contenido,
        el canal y las condiciones de cada promoción. Las citas se gestionan en
        «Confirmación de citas», arriba.
      </Text>
      {templates.isError ? (
        <Alert color="red">No se pudo cargar la configuración de las campañas.</Alert>
      ) : null}
      {templates.isLoading ? <Text>Cargando plantillas…</Text> : null}
      {(templates.data?.items ?? []).map(template =>
        <Editor key={template.kind} template={template} />,
      )}
    </Stack>
  );
}
