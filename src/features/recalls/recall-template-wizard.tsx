"use client";

import {
  Alert,
  Button,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Stepper,
  Switch,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useState } from "react";

import {
  RECALL_ANCHOR_LABELS,
  RECALL_ANCHORS,
  RECALL_CATEGORIES,
  RECALL_CATEGORY_LABELS,
  RECALL_CHANNELS,
  RECALL_INTERVAL_UNITS,
  RECALL_UNIT_LABELS,
} from "@/domain/recalls";
import type { RecallAssignResult, RecallTemplate } from "@/shared/api";

import {
  draftFromTemplate,
  emptyRecallDraft,
  firstInvalidStep,
  parseOffsets,
  stepIssues,
  WIZARD_STEP_LABELS,
  WIZARD_STEPS,
  withSuggestedCode,
  type RecallDraft,
} from "./recall-template-draft";
import {
  RecallPatientPicker,
  type AssignmentMode,
  type PickedPatient,
} from "./recall-patient-picker";
import {
  useAssignRecallMutation,
  useRecallStaffAndSitesQuery,
  useSaveRecallTemplateMutation,
} from "./recalls-data";

export type WizardOpening =
  | { mode: "create" }
  | { mode: "edit"; template: RecallTemplate }
  | { mode: "duplicate"; template: RecallTemplate };

interface RecallTemplateWizardProps {
  opening: WizardOpening;
  onClose: () => void;
}

const CHANNEL_LABELS = { WHATSAPP: "WhatsApp", SMS: "SMS", EMAIL: "Email" } as const;
const SKIP_REASONS = {
  ALREADY_ACTIVE: "ya tenía uno abierto",
  PATIENT_ARCHIVED: "paciente archivado",
  PATIENT_NOT_FOUND: "paciente no encontrado",
} as const;

function newIdempotencyKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `recall-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Create, edit or duplicate a recall type in five steps, optionally assigning patients. */
export function RecallTemplateWizard({ opening, onClose }: RecallTemplateWizardProps) {
  const isMobile = useMediaQuery("(max-width: 48em)") ?? false;
  const editing = opening.mode === "edit" ? opening.template : null;
  const [draft, setDraft] = useState<RecallDraft>(() =>
    opening.mode === "create"
      ? emptyRecallDraft()
      : draftFromTemplate(opening.template, opening.mode === "duplicate"),
  );
  const [codeTouched, setCodeTouched] = useState(opening.mode !== "create");
  const [active, setActive] = useState(0);
  const [showIssues, setShowIssues] = useState(false);
  const [assignment, setAssignment] = useState<AssignmentMode>(
    draft.autoEnroll ? "AUTOMATICA" : "NINGUNO",
  );
  const [picked, setPicked] = useState<PickedPatient[]>([]);
  const [anchorDate, setAnchorDate] = useState("");
  const [offsetsText, setOffsetsText] = useState(draft.reminderOffsets.join(", "));
  const [recompute, setRecompute] = useState(false);
  // One key per opening: a retried submit cannot assign the same patients twice.
  const [idempotencyKey] = useState(newIdempotencyKey);
  // Once the type exists a retry only repeats the assignment, never the creation.
  const [saved, setSaved] = useState<RecallTemplate | null>(null);
  const [assigned, setAssigned] = useState<RecallAssignResult | null>(null);
  const save = useSaveRecallTemplateMutation();
  const assign = useAssignRecallMutation();
  const options = useRecallStaffAndSitesQuery();

  const step = WIZARD_STEPS[active] ?? "review";
  const issues = showIssues ? stepIssues(draft, step) : {};
  const update = (patch: Partial<RecallDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const busy = save.isPending || assign.isPending;
  const title =
    opening.mode === "edit"
      ? "Editar tipo de recall"
      : opening.mode === "duplicate"
        ? "Duplicar tipo de recall"
        : "Nuevo tipo de recall";

  const next = () => {
    if (Object.keys(stepIssues(draft, step)).length > 0) {
      setShowIssues(true);
      return;
    }
    setShowIssues(false);
    setActive((current) => Math.min(current + 1, WIZARD_STEPS.length - 1));
  };

  const submit = async () => {
    if (busy) return;
    const invalid = firstInvalidStep(draft);
    if (invalid) {
      setActive(WIZARD_STEPS.indexOf(invalid));
      setShowIssues(true);
      return;
    }
    const template = { ...draft, autoEnroll: assignment === "AUTOMATICA" };
    let target = saved;
    if (!target) {
      target = await save
        .mutateAsync(
          editing
            ? {
                templateId: editing.id,
                template,
                expectedVersion: editing.version,
                recomputePending: recompute,
              }
            : { templateId: null, template },
        )
        .catch(() => null);
      if (!target) return;
      setSaved(target);
    }
    const toAssign = assignment === "MANUAL" || assignment === "FILTRO" ? picked : [];
    if (toAssign.length > 0) {
      const dueOverrides = Object.fromEntries(
        toAssign
          .filter((patient) => patient.dueDate)
          .map((patient) => [patient.id, patient.dueDate]),
      );
      const result = await assign
        .mutateAsync({
          templateId: target.id,
          patientIds: toAssign.map((patient) => patient.id),
          dueOverrides,
          anchorDate: anchorDate || null,
          idempotencyKey,
        })
        .catch(() => null);
      if (!result) return;
      setAssigned(result);
      if (result.skipped.length > 0) return;
    }
    onClose();
  };

  if (assigned && saved) {
    return (
      <Modal opened onClose={onClose} title={title} fullScreen={isMobile} size="lg">
        <Stack>
          <Alert color="teal">
            «{saved.name}» guardado. {assigned.added} recall
            {assigned.added === 1 ? "" : "s"} creado{assigned.added === 1 ? "" : "s"}.
          </Alert>
          <Text size="sm">No se asignaron {assigned.skipped.length} pacientes:</Text>
          <Stack gap={2} aria-label="Pacientes no asignados">
            {assigned.skipped.map((skip) => (
              <Text key={skip.patientId} size="sm">
                {picked.find((patient) => patient.id === skip.patientId)?.name ?? skip.patientId}:{" "}
                {SKIP_REASONS[skip.reason]}
              </Text>
            ))}
          </Stack>
          <Group justify="flex-end">
            <Button onClick={onClose}>Cerrar</Button>
          </Group>
        </Stack>
      </Modal>
    );
  }

  const errorMessage = [save.error, assign.error].find(Boolean);

  return (
    <Modal opened onClose={onClose} title={title} fullScreen={isMobile} size="xl">
      <Stack gap="md">
        <Stepper
          active={active}
          onStepClick={(index) => index < active && setActive(index)}
          size="xs"
          allowNextStepsSelect={false}
        >
          {WIZARD_STEPS.map((key) => (
            <Stepper.Step key={key} label={WIZARD_STEP_LABELS[key]} />
          ))}
        </Stepper>

        {step === "identity" ? (
          <Stack gap="sm">
            <TextInput
              label="Nombre"
              required
              value={draft.name}
              error={issues.name}
              onChange={(event) => {
                // currentTarget is gone by the time the updater runs.
                const name = event.currentTarget.value;
                setDraft((current) => withSuggestedCode(current, name, codeTouched));
              }}
            />
            <TextInput
              label="Código"
              description={
                editing && editing.openCount > 0
                  ? "No se puede cambiar: ya hay pacientes asignados."
                  : "Identificador interno, en mayúsculas."
              }
              required
              disabled={Boolean(editing && editing.openCount > 0)}
              value={draft.code}
              error={issues.code}
              onChange={(event) => {
                setCodeTouched(true);
                update({ code: event.currentTarget.value.toUpperCase() });
              }}
            />
            <Select
              label="Categoría"
              allowDeselect={false}
              data={RECALL_CATEGORIES.map((value) => ({
                value,
                label: RECALL_CATEGORY_LABELS[value],
              }))}
              value={draft.category}
              onChange={(value) => value && update({ category: value as RecallDraft["category"] })}
            />
            <Textarea
              label="Descripción"
              autosize
              minRows={2}
              value={draft.description ?? ""}
              error={issues.description}
              onChange={(event) => update({ description: event.currentTarget.value || null })}
            />
            <Switch
              label="Activo"
              checked={draft.active}
              onChange={(event) => update({ active: event.currentTarget.checked })}
            />
          </Stack>
        ) : null}

        {step === "scheduling" ? (
          <Stack gap="sm">
            <Select
              label="Contar desde"
              allowDeselect={false}
              data={RECALL_ANCHORS.map((value) => ({ value, label: RECALL_ANCHOR_LABELS[value] }))}
              value={draft.anchorType}
              onChange={(value) =>
                value && update({ anchorType: value as RecallDraft["anchorType"] })
              }
            />
            <Group grow align="flex-start">
              <NumberInput
                label="Cada"
                min={1}
                max={120}
                value={draft.intervalValue}
                error={issues.intervalValue}
                onChange={(value) => update({ intervalValue: Number(value) || 0 })}
              />
              <Select
                label="Unidad"
                allowDeselect={false}
                data={RECALL_INTERVAL_UNITS.map((value) => ({
                  value,
                  label: RECALL_UNIT_LABELS[value],
                }))}
                value={draft.intervalUnit}
                onChange={(value) =>
                  value && update({ intervalUnit: value as RecallDraft["intervalUnit"] })
                }
              />
            </Group>
            <Group grow align="flex-start">
              <NumberInput
                label="Mostrar como próximo (días antes)"
                min={0}
                max={180}
                value={draft.leadDays}
                error={issues.leadDays}
                onChange={(value) => update({ leadDays: Number(value) || 0 })}
              />
              <NumberInput
                label="Intentos de contacto"
                min={0}
                max={10}
                value={draft.maxAttempts}
                error={issues.maxAttempts}
                onChange={(value) => update({ maxAttempts: Number(value) || 0 })}
              />
            </Group>
            <Group grow align="flex-start">
              <Select
                label="Sede por defecto"
                clearable
                data={(options.data?.sites ?? []).map((site) => ({
                  value: site.id,
                  label: site.name,
                }))}
                value={draft.defaultSiteId}
                onChange={(value) => update({ defaultSiteId: value })}
              />
              <Select
                label="Responsable por defecto"
                clearable
                data={(options.data?.staff ?? []).map((member) => ({
                  value: member.id,
                  label: member.displayName,
                }))}
                value={draft.defaultStaffId}
                onChange={(value) => update({ defaultStaffId: value })}
              />
            </Group>
            <Switch
              label="Programar el siguiente al completar"
              checked={draft.autoRecurrence}
              onChange={(event) => update({ autoRecurrence: event.currentTarget.checked })}
            />
          </Stack>
        ) : null}

        {step === "patients" ? (
          <Stack gap="sm">
            <RecallPatientPicker
              mode={assignment}
              onModeChange={setAssignment}
              picked={picked}
              onPickedChange={setPicked}
              excludeTemplateId={editing?.id}
            />
            {(assignment === "MANUAL" || assignment === "FILTRO") && picked.length > 0 ? (
              <TextInput
                type="date"
                label="Fecha de referencia"
                description="Se suma la periodicidad a esta fecha. Vacía: se calcula desde el historial o desde hoy."
                value={anchorDate}
                onChange={(event) => setAnchorDate(event.currentTarget.value)}
              />
            ) : null}
          </Stack>
        ) : null}

        {step === "communications" ? (
          <Stack gap="sm">
            <Alert color="gray">
              Denty no envía mensajes todavía: esta configuración se guarda para cuando se active la
              mensajería. Mientras tanto el equipo contacta desde la lista.
            </Alert>
            <Switch
              label="Preparar avisos automáticos"
              checked={draft.messagingEnabled}
              onChange={(event) => update({ messagingEnabled: event.currentTarget.checked })}
            />
            {draft.messagingEnabled ? (
              <>
                <Checkbox.Group
                  label="Canales"
                  value={draft.channels}
                  error={issues.channels}
                  onChange={(value) => update({ channels: value as RecallDraft["channels"] })}
                >
                  <Group mt={4}>
                    {RECALL_CHANNELS.map((channel) => (
                      <Checkbox key={channel} value={channel} label={CHANNEL_LABELS[channel]} />
                    ))}
                  </Group>
                </Checkbox.Group>
                <TextInput
                  label="Avisar (días antes de la fecha)"
                  description="Separados por comas. Un número negativo avisa después de la fecha."
                  value={offsetsText}
                  error={issues.reminderOffsets}
                  onChange={(event) => {
                    setOffsetsText(event.currentTarget.value);
                    update({ reminderOffsets: parseOffsets(event.currentTarget.value) });
                  }}
                />
                <TextInput
                  label="Plantilla de mensaje"
                  value={draft.messageTemplateKey ?? ""}
                  error={issues.messageTemplateKey}
                  onChange={(event) =>
                    update({ messageTemplateKey: event.currentTarget.value || null })
                  }
                />
              </>
            ) : null}
          </Stack>
        ) : null}

        {step === "review" ? (
          <Stack gap={6} aria-label="Resumen">
            <Text size="sm">
              <b>{draft.name}</b> ({draft.code}) · {RECALL_CATEGORY_LABELS[draft.category]}
            </Text>
            <Text size="sm">
              Cada {draft.intervalValue} {RECALL_UNIT_LABELS[draft.intervalUnit]} desde «
              {RECALL_ANCHOR_LABELS[draft.anchorType].toLowerCase()}». Aparece como próximo{" "}
              {draft.leadDays} días antes.
            </Text>
            <Text size="sm">
              {draft.autoRecurrence
                ? "Al completarlo se programa el siguiente."
                : "No se repite automáticamente."}
            </Text>
            <Text size="sm">
              Pacientes:{" "}
              {assignment === "AUTOMATICA"
                ? "inscripción automática (pendiente de activar)"
                : assignment === "NINGUNO" || picked.length === 0
                  ? "ninguno por ahora"
                  : `${picked.length} seleccionados`}
            </Text>
            <Text size="sm">
              Avisos: {draft.messagingEnabled ? "configurados (sin envío real)" : "desactivados"}
            </Text>
            {editing && editing.openCount > 0 ? (
              <Checkbox
                mt="xs"
                label={`Recalcular las fechas de los ${editing.openCount} recalls pendientes`}
                description="Solo cambia los que no tienen fecha propia ni cita vinculada."
                checked={recompute}
                onChange={(event) => setRecompute(event.currentTarget.checked)}
              />
            ) : null}
          </Stack>
        ) : null}

        {errorMessage ? (
          <Alert color="red">
            {errorMessage instanceof Error ? errorMessage.message : "No se pudo guardar."}
            {saved ? " El tipo ya está guardado; puedes reintentar la asignación." : ""}
          </Alert>
        ) : null}

        <Group justify="space-between">
          <Button variant="default" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Group gap="xs">
            {active > 0 ? (
              <Button variant="subtle" onClick={() => setActive(active - 1)} disabled={busy}>
                Atrás
              </Button>
            ) : null}
            {step === "review" ? (
              <Button onClick={() => void submit()} loading={busy}>
                {saved ? "Reintentar asignación" : editing ? "Guardar cambios" : "Crear tipo"}
              </Button>
            ) : (
              <Button onClick={next}>Siguiente</Button>
            )}
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
