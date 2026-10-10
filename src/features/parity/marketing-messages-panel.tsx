"use client";

import {
  Alert, Badge, Button, Group, Modal, NumberInput, Select, Stack, Switch,
  Text, Textarea, TextInput, Title,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { getBrowserApi } from "@/shared/api/browser";
import type { z } from "zod";
import type {
  marketingMessageTemplateSchema,
  saveMarketingMessageTemplateSchema,
} from "@/shared/api/schemas/engagement";
import styles from "@/shared/ui/parity.module.css";
import panelStyles from "./marketing-messages-panel.module.css";

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
  const footer = `Para dejar de recibir estos mensajes, escribe a ${input.contactEmail || "(correo pendiente)"}.`;
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
  const [optOutOpen, setOptOutOpen] = useState(false);
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
  const changed = JSON.stringify({
    ...state, offerDetails: state.offerDetails || "",
  }) !== JSON.stringify({
    kind: template.kind, channel: template.channel, enabled: template.enabled,
    subject: template.subject, body: template.body,
    offerDetails: template.offer_details, discountPercent: template.discount_percent,
    validUntil: template.valid_until, contactEmail: template.contact_email,
  });
  const preview = useQuery({
    queryKey: ["marketing-audience-preview", template.kind, patientId,
      template.updated_at, template.channel],
    queryFn: () => getBrowserApi().engagement.communications.previewCampaign({
      kind: template.kind,
      ...(patientId && template.kind !== "BIRTHDAY" ? { patientId } : {}),
    }),
    enabled: template.enabled && !changed &&
      (template.kind === "BIRTHDAY" || Boolean(patientId)),
    staleTime: 0,
  });
  const selectedPatient = patients.data?.items.find(p => p.id === patientId);
  const granted = useMemo(() => {
    const rows = (consents.data?.items ?? []) as Array<Record<string, unknown>>;
    const consent = rows.find(row => row.channel === state.channel &&
      (row.purpose === "MARKETING" || row.category === "MARKETING"));
    return consent?.status === "GRANTED" || consent?.granted === true;
  }, [consents.data, state.channel]);

  const unsubscribe = useMutation({
    mutationFn: () => getBrowserApi().engagement.communications.setConsent(patientId!, {
      channel: state.channel, category: "MARKETING", granted: false,
      source: "STAFF_UI", evidenceNote: "Baja solicitada por el paciente, registrada en campañas",
    }),
    onSuccess: () => {
      setOptOutOpen(false);
      void qc.invalidateQueries({ queryKey: ["marketing-campaign-consents", patientId] });
      void qc.invalidateQueries({ queryKey: ["marketing-audience-preview"] });
    },
  });
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
      void qc.invalidateQueries({ queryKey: ["marketing-audience-preview"] });
    },
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
        <TextInput label="Correo de bajas (todos los canales)" type="email" required
          description="Debe ser una dirección atendida. Hasta conectar respuestas automáticas, la baja se solicita aquí."
          placeholder="privacidad@clinica.es" value={state.contactEmail}
          onChange={event => setState(s => ({ ...s, contactEmail: event.currentTarget.value }))}/>
        <div>
          <Text fw={600} size="sm" mb="xs">Vista previa del mensaje</Text>
          <Text size="sm" className={panelStyles.previewText}>
            {previewTemplate(state, selectedPatient
              ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
              : "María García")}
          </Text>
        </div>
        <Alert color="yellow">
          Los mensajes se guardan en la cola de Denty. Si la clínica tiene un proveedor
          de envíos conectado y el procesador activo, podrían enviarse en cuanto se encolen.
          Comprueba la configuración del proveedor y los permisos antes de confirmarlo.
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
        {patientId && granted ? (
          <Group justify="flex-end">
            <Button variant="subtle" color="red" size="xs"
              onClick={() => setOptOutOpen(true)}>
              Registrar baja de publicidad del paciente
            </Button>
          </Group>
        ) : null}
        {preview.data ? (
          <Alert color={preview.data.eligible > 0 ? "blue" : "gray"} title="Simulación de destinatarios">
            Revisados: {preview.data.candidates} · Elegibles: {preview.data.eligible}.
            {Object.entries(preview.data.excluded).map(([reason, count]) => (
              <Text size="xs" key={reason}>
                Excluidos ({reason === "NO_CONSENT" ? "sin permiso comercial" :
                  reason === "RECENT_PROMOTION" ? "contactados recientemente" :
                  reason === "UNDERAGE_OR_UNKNOWN_AGE" ? "menores o edad desconocida" :
                  reason === "MISSING_CONTACT" ? "sin datos de contacto" :
                  reason === "NOT_BIRTHDAY" ? "no cumplen años" : reason}): {count}
              </Text>
            ))}
            <Text size="xs">
              Fecha prevista: {new Date(preview.data.scheduledAt).toLocaleString("es-ES", {
                timeZone: "Europe/Madrid", dateStyle: "medium", timeStyle: "short",
              })} (hora peninsular).
            </Text>
          </Alert>
        ) : null}
        {preview.isFetching ? <Text size="xs" c="dimmed">Comprobando elegibilidad…</Text> : null}
        {preview.isError && template.enabled && !changed ?
          <Alert color="red">No se pudo simular la campaña. No se permitirá encolar sin comprobarla.</Alert>
          : null}
        {changed ? <Text c="dimmed" size="xs">Guarda los cambios antes de preparar el envío.</Text> : null}
        <Group justify="flex-end">
          <Button variant="light" disabled={!template.enabled || changed || preview.isFetching ||
              !preview.data || preview.data.eligible === 0 ||
              (template.kind !== "BIRTHDAY" && (!patientId || !granted))}
            onClick={() => setConfirmOpen(true)}>
            {template.kind === "BIRTHDAY" ? "Encolar cumpleaños de hoy" : "Encolar mensaje"}
          </Button>
        </Group>
        {queue.data ? (
          <Alert color="green">
            Encolados: {queue.data.queued}. Sin autorización/contacto: {queue.data.skipped}.
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
            Se registrará en la cola para la franja horaria configurada y podrá enviarse
            automáticamente cuando el proveedor esté activo. La audiencia se verificará de nuevo.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button loading={queue.isPending} onClick={() => queue.mutate()}>
              Confirmar
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal opened={optOutOpen} onClose={() => setOptOutOpen(false)}
        title="Registrar oposición a publicidad">
        <Stack gap="md">
          <Text size="sm">
            Se revocará el consentimiento comercial de {selectedPatient?.firstName ?? "este paciente"}
            para {state.channel}. Esto también impide despachar mensajes comerciales pendientes.
          </Text>
          {unsubscribe.isError ? <Alert color="red">No se pudo registrar la baja.</Alert> : null}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setOptOutOpen(false)}>Cancelar</Button>
            <Button color="red" loading={unsubscribe.isPending}
              onClick={() => unsubscribe.mutate()}>Registrar baja</Button>
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
