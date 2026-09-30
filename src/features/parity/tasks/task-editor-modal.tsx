"use client";

import {
  Button,
  Group,
  Modal,
  NumberInput,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useState } from "react";

import { DayPicker } from "./day-picker";
import { PRIORITY_OPTIONS } from "./priority";
import { DEFAULT_DURATION_MIN, dueAtToTimeInput, taskDay } from "./task-timeline";
import type { TaskPriority, TimelineTask } from "./task-types";

export interface TaskFormValues {
  title: string;
  priority: TaskPriority;
  durationMin: number;
  day: string | null;
  time: string;
}

interface TaskEditorModalProps {
  opened: boolean;
  task: TimelineTask | null;
  today: string;
  initialDay: string | null;
  pending?: boolean;
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => void;
}

function TaskForm({
  task,
  today,
  initialDay,
  pending,
  onClose,
  onSubmit,
}: Omit<TaskEditorModalProps, "opened">) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "NORMAL");
  const [duration, setDuration] = useState<number | string>(
    task?.durationMin ?? DEFAULT_DURATION_MIN,
  );
  const [day, setDay] = useState<string | null>(task ? taskDay(task) : initialDay);
  const [time, setTime] = useState(dueAtToTimeInput(task?.dueAt));

  const durationMin = typeof duration === "number" ? duration : Number(duration);
  const valid = title.trim().length > 0 && Number.isFinite(durationMin) && durationMin >= 1;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid) return;
        onSubmit({
          title: title.trim(),
          priority,
          durationMin: Math.round(durationMin),
          day,
          time,
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
