"use client";

import {
  Button,
  Group,
  Modal,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useState } from "react";

import { DayPicker } from "./day-picker";
import { PRIORITY_OPTIONS } from "./priority";
import { DEFAULT_DURATION_MIN, dueAtToTimeInput, taskDay } from "./task-timeline";
import type { TaskPriority, TaskTeam, TimelineTask } from "./task-types";

export interface TaskFormValues {
  title: string;
  description?: string;
  priority: TaskPriority;
  durationMin: number;
  day: string | null;
  time: string;
  assigneeStaffId?: string | null;
}

interface TaskEditorModalProps {
  opened: boolean;
  task: TimelineTask | null;
  today: string;
  initialDay: string | null;
  pending?: boolean;
  team?: TaskTeam | undefined;
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => void;
}

function TaskForm({
  task,
  today,
  initialDay,
  pending,
  team,
  onClose,
  onSubmit,
}: Omit<TaskEditorModalProps, "opened">) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "NORMAL");
  const [duration, setDuration] = useState<number | string>(
    task?.durationMin ?? DEFAULT_DURATION_MIN,
  );
  const [day, setDay] = useState<string | null>(task ? taskDay(task) : initialDay);
  const [time, setTime] = useState(dueAtToTimeInput(task?.dueAt));
  const [assigneeStaffId, setAssigneeStaffId] = useState<string | null>(
    task?.assigneeStaffId ?? null,
  );
  const members = (team?.items ?? []).filter((member) =>
    !team?.assignableStaffIds || team.assignableStaffIds.includes(member.id),
  );
  const durationMin = typeof duration === "number" ? duration : Number(duration);
  const valid = title.trim().length > 0 && Number.isFinite(durationMin) && durationMin >= 1;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid) return;
        onSubmit({
          title: title.trim(),
          ...(!task && description.trim() ? { description: description.trim() } : {}),
          priority,
          durationMin: Math.round(durationMin),
          day,
          time,
          ...(assigneeStaffId ? { assigneeStaffId } : {}),
        });
      }}
    >
      <Stack gap="sm">
        <TextInput
          label="Título"
          value={title}
          maxLength={200}
          data-autofocus
          onChange={(event) => setTitle(event.currentTarget.value)}
        />
        {!task ? (
          <Textarea
            label="Instrucciones para el destinatario"
            placeholder="Explica qué hay que hacer y cualquier detalle importante"
            autosize minRows={2} maxRows={5} maxLength={1000}
            value={description}
            onChange={(event) => setDescription(event.currentTarget.value)}
          />
        ) : task.description ? (
          <Text size="sm" c="dimmed">Instrucciones: {task.description}</Text>
        ) : null}
        <div>
          <Text size="sm" fw={500} mb={4} id="task-priority-label">
            Prioridad
          </Text>
          <SegmentedControl
            fullWidth
            aria-labelledby="task-priority-label"
            data={PRIORITY_OPTIONS}
            value={priority}
            onChange={(value) => setPriority(value as TaskPriority)}
          />
        </div>
        <DayPicker value={day} today={today} onChange={setDay} />
        <Group grow align="flex-start">
          <NumberInput
            label="Duración (min)"
            min={1}
            max={720}
            step={5}
            allowDecimal={false}
            allowNegative={false}
            value={duration}
            onChange={setDuration}
          />
          <TextInput
            label="Hora (opcional)"
            type="time"
            description={
              day === null ? "Elige un día para fijar hora" : "Vacía: se calcula en secuencia"
            }
            disabled={day === null}
            value={time}
            onChange={(event) => setTime(event.currentTarget.value)}
          />
        </Group>
        {members.length > 0 && (
          <Stack gap={4}>
            <Select
              label="Asignar a"
              placeholder="Sin asignar"
              value={assigneeStaffId}
              onChange={setAssigneeStaffId}
              data={members.map((member) => ({
                value: member.id,
                label: `${member.name} · ${member.role === "DENTIST" ? "Doctor/a" : member.role === "RECEPTION" ? "Recepción" : member.role === "ASSISTANT" ? "Auxiliar / higienista" : "Administración"}`,
              }))}
              searchable
              clearable
              nothingFoundMessage="Sin resultados"
            />
            <Text size="xs" c="dimmed">La tarea aparecerá en «Mis tareas» de la persona seleccionada.</Text>
            {team?.currentStaffId && members.some((member) => member.id === team.currentStaffId) && assigneeStaffId !== team.currentStaffId ? (
              <Button
                variant="subtle"
                size="compact-sm"
                onClick={() => setAssigneeStaffId(team.currentStaffId)}
              >
                Asignármela a mí
              </Button>
            ) : null}
          </Stack>
        )}
        {team && members.length === 0 ? (
          <Text size="sm" c="dimmed">No hay usuarios disponibles para asignar tareas con tu perfil.</Text>
        ) : null}
        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!valid} loading={pending ?? false}>
            Guardar
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function TaskEditorModal({ opened, task, ...rest }: TaskEditorModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={rest.onClose}
      title={task ? "Editar tarea" : "Nueva tarea"}
      centered
      transitionProps={{ duration: 0 }}
    >
      <TaskForm key={task?.id ?? "new"} task={task} {...rest} />
    </Modal>
  );
}
