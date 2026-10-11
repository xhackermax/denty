"use client";

import {
  Alert, Badge, Button, Group, Modal, Pagination, Paper, Select,
  SimpleGrid, Stack, Text, Textarea, TextInput,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import type { z } from "zod";

import { getBrowserApi } from "@/shared/api/browser";
import type { recoveryPatientSearchItemSchema } from "@/shared/api/schemas/engagement";

type Patient = z.infer<typeof recoveryPatientSearchItemSchema>;
type SearchCriteria = {
  patient: string;
  budgeted: string;
  performed: string;
  absence: string;
};
type ActionType = "VERIFY" | "CALL" | "REVIEW" | "BUDGET";

const EMPTY: SearchCriteria = {
  patient: "", budgeted: "", performed: "", absence: "ALL",
};
const PAGE_SIZE = 20;
const ACTION_OPTIONS: { value: ActionType; label: string }[] = [
  { value: "VERIFY", label: "Verificar historial y contactos" },
  { value: "CALL", label: "Llamar para seguimiento" },
  { value: "REVIEW", label: "Valorar propuesta de revisión" },
  { value: "BUDGET", label: "Consultar decisión del presupuesto" },
];

function dateMadrid(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Fecha no disponible"
    : parsed.toLocaleDateString("es-ES", {
      dateStyle: "medium", timeZone: "Europe/Madrid",
    });
}

function todayMadrid() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

function visitDescription(patient: Patient) {
  if (patient.lastVisitAt === null || patient.daysSinceVisit === null) {
    return "Sin asistencia confirmada en Denty";
  }
  if (patient.daysSinceVisit === 0) return "Última asistencia: hoy";
  return `Última asistencia hace ${patient.daysSinceVisit} días (${dateMadrid(patient.lastVisitAt)})`;
}

function suggestedAction(patient: Patient): { type: ActionType; reason: string } {
  if (patient.nextAppointmentAt) {
    return {
      type: "VERIFY",
      reason: "Hay una cita futura registrada. Comprobar si procede seguimiento antes de contactar.",
    };
  }
  if (patient.daysSinceVisit === null) {
    return {
      type: "VERIFY",
      reason: "Verificar si existen visitas anteriores no importadas y revisar la ficha antes de contactar.",
    };
  }
  if (patient.budgetedTreatments.some(item => item.status === "SIGNED") &&
      patient.daysSinceVisit >= 90) {
    return {
      type: "BUDGET",
      reason: "Revisar con recepción si el plan presupuestado y firmado necesita una cita.",
    };
  }
  if (patient.daysSinceVisit >= 365) {
    return {
      type: "CALL",
      reason: "Revisar situación del paciente y valorar ofrecer una revisión según criterio del odontólogo.",
    };
  }
  if (patient.daysSinceVisit >= 180) {
    return {
      type: "REVIEW",
      reason: "Comprobar con el profesional si corresponde programar un control individualizado.",
    };
  }
  return {
    type: "VERIFY",
    reason: "Revisar historial, tratamientos y fecha recomendada de seguimiento antes de contactar.",
  };
}

/** Análisis para recepción. Las tareas se crean expresamente, nunca se envían mensajes. */
export function RecoveryExplorer() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<SearchCriteria>(EMPTY);
  const [criteria, setCriteria] = useState<SearchCriteria>(EMPTY);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [actionType, setActionType] = useState<ActionType>("VERIFY");
  const [scheduledOn, setScheduledOn] = useState(todayMadrid);
  const [note, setNote] = useState("");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [createdFor, setCreatedFor] = useState<string | null>(null);

  const results = useQuery({
    queryKey: ["recovery", "explorer", criteria, page],
    queryFn: () => getBrowserApi().engagement.communications.recoveryPatientSearch({
      patient: criteria.patient.trim(),
      budgeted: criteria.budgeted.trim(),
      performed: criteria.performed.trim(),
      minDays: criteria.absence === "ALL" || criteria.absence === "NEVER"
        ? null : Number(criteria.absence),
      maxDays: null,
      onlyNoVisit: criteria.absence === "NEVER",
      page,
      pageSize: PAGE_SIZE,
    }),
    staleTime: 30_000,
  });
  const assignees = useQuery({
    queryKey: ["recovery", "task-assignees"],
    queryFn: () => getBrowserApi().tasks.assignees(),
    enabled: Boolean(selected),
  });
  const createTask = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Selecciona un paciente.");
      const suggestion = suggestedAction(selected);
      const title = `Recuperación: ${selected.patientName}`.slice(0, 200);
      const summary = [
        `Acción: ${ACTION_OPTIONS.find(option => option.value === actionType)?.label ?? actionType}`,
        `Paciente: ${selected.patientName}`,
        `Última visita: ${visitDescription(selected)}`,
        `Seguimiento sugerido: ${suggestion.reason}`,
        selected.nextAppointmentAt
          ? `Próxima cita: ${dateMadrid(selected.nextAppointmentAt)}` : "",
        note.trim() ? `Instrucciones: ${note.trim()}` : "",
        "No enviar mensajes ni compartir datos clínicos sin verificar los permisos y el contexto.",
      ].filter(Boolean).join("\n").slice(0, 1000);
      return getBrowserApi().tasks.create({
        title,
        description: summary,
        patientId: selected.patientId,
        taskType: "PATIENT_FOLLOW_UP",
        priority: selected.daysSinceVisit !== null && selected.daysSinceVisit >= 365
          ? "HIGH" : "NORMAL",
        sourceType: "RECOVERY",
        sourceId: selected.patientId,
        scheduledOn,
        ...(assigneeId ? { assigneeStaffId: assigneeId } : {}),
      });
    },
    onSuccess: () => {
      setCreatedFor(selected?.patientId ?? null);
      setSelected(null);
      void qc.invalidateQueries({ queryKey: ["denty", "tasks"] });
    },
  });

  const search = () => {
    setCriteria({ ...draft });
    setPage(1);
    setCreatedFor(null);
  };
  const openPlan = (patient: Patient) => {
    const suggested = suggestedAction(patient);
    setSelected(patient);
    setActionType(suggested.type);
    setNote("");
    setAssigneeId(null);
    setScheduledOn(todayMadrid());
    createTask.reset();
  };
  const allowedAssignees = (assignees.data?.items ?? [])
    .filter(item => (assignees.data?.assignableStaffIds ?? []).includes(item.id));

  return (
    <Stack gap="md">
      <Paper p="md" radius="md" withBorder>
        <Text fw={700}>Explorador de pacientes y plan de acción</Text>
        <Text size="sm" c="dimmed" mt={4}>
          Busca en toda la clínica por última asistencia, tratamientos presupuestados
          y tratamientos realmente ejecutados. La fecha se basa en asistencias
          confirmadas, no en ausencias ni citas futuras.
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" mt="md">
          <TextInput
            label="Paciente o número de historia"
            placeholder="Nombre, apellidos o historia"
            value={draft.patient}
            maxLength={100}
            onChange={event => setDraft(d => ({
              ...d, patient: event.currentTarget.value,
            }))}
          />
          <Select
            label="Tiempo desde la última asistencia"
            value={draft.absence}
            data={[
              { value: "ALL", label: "Cualquier antigüedad" },
              { value: "90", label: "3 meses o más" },
              { value: "180", label: "6 meses o más" },
              { value: "365", label: "12 meses o más" },
              { value: "730", label: "24 meses o más" },
              { value: "NEVER", label: "Sin asistencia registrada" },
            ]}
            onChange={value => setDraft(d => ({ ...d, absence: value ?? "ALL" }))}
          />
          <TextInput
            label="Tratamiento presupuestado"
            placeholder="Ej.: implante, corona, endodoncia"
            value={draft.budgeted}
            maxLength={100}
            description="Busca conceptos presupuestados, incluso sin aceptación."
            onChange={event => setDraft(d => ({
              ...d, budgeted: event.currentTarget.value,
            }))}
          />
          <TextInput
            label="Tratamiento realizado"
            placeholder="Ej.: obturación, implante, ortodoncia"
            value={draft.performed}
            maxLength={100}
            description="Solo actuaciones del registro de ejecuciones."
            onChange={event => setDraft(d => ({
              ...d, performed: event.currentTarget.value,
            }))}
          />
        </SimpleGrid>
        <Group mt="md" justify="flex-end">
          <Button variant="default" onClick={() => {
            setDraft(EMPTY); setCriteria(EMPTY); setPage(1);
          }}>Limpiar</Button>
          <Button onClick={search}>Buscar pacientes</Button>
        </Group>
      </Paper>

      <Paper p="md" radius="md" withBorder>
        <Group justify="space-between" mb="sm" align="center">
          <Text fw={600}>Pacientes encontrados</Text>
          {results.data ? (
            <Badge variant="light">{results.data.total} resultados</Badge>
          ) : null}
        </Group>
        {results.isPending ? (
          <Text c="dimmed">Consultando el historial…</Text>
        ) : results.isError ? (
          <Alert color="red">No se pudo consultar la búsqueda clínica.</Alert>
        ) : results.data.items.length === 0 ? (
          <Text c="dimmed">No hay pacientes con estos criterios.</Text>
        ) : (
          <Stack gap="sm">
            {results.data.items.map(patient => {
              const suggestion = suggestedAction(patient);
              return (
                <Paper key={patient.patientId} withBorder p="sm" radius="md">
                  <Group justify="space-between" gap="xs" wrap="wrap">
                    <Text fw={700}>{patient.patientName}</Text>
                    <Badge color={patient.daysSinceVisit === null
                      ? "gray" : patient.daysSinceVisit >= 365
                        ? "orange" : "blue"} variant="light">
                      {patient.daysSinceVisit === null
                        ? "Sin visita confirmada"
                        : `${patient.daysSinceVisit} días sin acudir`}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed" mt={4}>
                    {patient.recordNumber ?? "Historia sin número"} · {visitDescription(patient)}
                  </Text>
                  {patient.nextAppointmentAt ? (
                    <Badge variant="outline" color="green" mt="xs">
                      Con cita futura: {dateMadrid(patient.nextAppointmentAt)}
                    </Badge>
                  ) : null}
                  <SimpleGrid cols={{ base: 1, md: 2 }} mt="sm" spacing="sm">
                    <Stack gap={2}>
                      <Text fw={600} size="sm">Presupuestado</Text>
                      {patient.budgetedTreatments.length ? patient.budgetedTreatments.map((t, i) => (
                        <Text key={`${t.budgetId}-${i}`} size="xs">
                          {t.label} · {t.status === "SIGNED" ? "Firmado" :
                            t.status === "DRAFT" ? "Borrador" : t.status}
                        </Text>
                      )) : <Text size="xs" c="dimmed">Sin conceptos coincidentes</Text>}
                    </Stack>
                    <Stack gap={2}>
                      <Text fw={600} size="sm">Realizado y registrado</Text>
                      {patient.performedTreatments.length ? patient.performedTreatments.map((t, i) => (
                        <Text key={`${t.code}-${i}`} size="xs">
                          {t.label} · {dateMadrid(t.executedAt)}
                        </Text>
                      )) : <Text size="xs" c="dimmed">Sin ejecuciones coincidentes registradas</Text>}
                    </Stack>
                  </SimpleGrid>
                  <Text size="sm" mt="sm">
                    <Text span fw={600}>Acción sugerida: </Text>{suggestion.reason}
                  </Text>
                  <Group justify="flex-end" mt="sm" gap="xs">
                    <Button component={Link}
                      href={`/app/patients/${encodeURIComponent(patient.patientId)}`}
                      variant="subtle" size="xs">Ver ficha</Button>
                    <Button size="xs" variant="light"
                      disabled={createdFor === patient.patientId}
                      onClick={() => openPlan(patient)}>
                      {createdFor === patient.patientId ? "Tarea creada" : "Crear plan de seguimiento"}
                    </Button>
                  </Group>
                </Paper>
              );
            })}
            {results.data.total > PAGE_SIZE ? (
              <Group justify="center">
                <Pagination value={page}
                  total={Math.ceil(results.data.total / PAGE_SIZE)}
                  onChange={setPage}/>
              </Group>
            ) : null}
          </Stack>
        )}
      </Paper>

      <Modal opened={Boolean(selected)} onClose={() => setSelected(null)}
        title="Crear tarea del plan de recuperación" centered>
        {selected ? (
          <Stack gap="sm">
            <Text fw={600}>{selected.patientName}</Text>
            <Text size="xs" c="dimmed">{visitDescription(selected)}</Text>
            <Text size="sm">{suggestedAction(selected).reason}</Text>
            <Select label="Acción a realizar"
              data={ACTION_OPTIONS}
              value={actionType}
              onChange={value => setActionType((value ?? "VERIFY") as ActionType)}
            />
            <Select label="Responsable"
              description="Solo se muestran usuarios a los que puedes delegar tareas."
              searchable clearable
              placeholder="Sin asignar"
              value={assigneeId}
              data={allowedAssignees.map(person => ({
                value: person.id, label: `${person.name} · ${person.role}`,
              }))}
              onChange={setAssigneeId}
            />
            <TextInput label="Fecha prevista" type="date"
              value={scheduledOn}
              onChange={event => setScheduledOn(event.currentTarget.value)}
              required
            />
            <Textarea label="Instrucciones para el equipo"
              placeholder="Qué revisar antes de llamar, próximos pasos…"
              value={note} maxLength={350} minRows={3}
              onChange={event => setNote(event.currentTarget.value)}
            />
            <Alert color="blue">
              Se creará una tarea interna vinculada a la ficha. No se enviará ningún
              WhatsApp, SMS ni correo al paciente.
            </Alert>
            {createTask.isError ? (
              <Alert color="red">No se pudo guardar la tarea. Revisa los datos y los permisos.</Alert>
            ) : null}
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setSelected(null)}>Cancelar</Button>
              <Button loading={createTask.isPending} disabled={!scheduledOn}
                onClick={() => createTask.mutate()}>Guardar tarea</Button>
            </Group>
          </Stack>
        ) : null}
      </Modal>
    </Stack>
  );
}
