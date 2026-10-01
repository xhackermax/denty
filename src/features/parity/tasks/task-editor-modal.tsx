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
  TextInput,
} from "@mantine/core";
import { useEffect, useState } from "react";

import { getSupabaseBrowserClient } from "@/shared/supabase-browser";
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
  assigneeStaffId?: string | null;
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

interface StaffMember {
  id: string;
  name: string;
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
  const [assigneeStaffId, setAssigneeStaffId] = useState<string | null>(
    task?.assigneeStaffId ?? null,
  );
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);

  useEffect(() => {
    const loadStaff = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: staffMember } = await supabase
          .from("staff_members")
          .select("clinic_id")
          .eq("id", user.id)
          .single();

        if (!staffMember) return;

        const { data: staff } = await supabase
          .from("staff_members")
          .select("id, name")
          .eq("clinic_id", staffMember.clinic_id)
          .order("name");

        if (staff) {
          setStaffMembers(staff);
        }
      } catch (error) {
        console.error("Error loading staff members:", error);
      }
    };

    loadStaff();
  }, []);

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
        {staffMembers.length > 0 && (
          <Select
            label="Asignar a (opcional)"
            placeholder="Sin asignar"
            value={assigneeStaffId}
            onChange={setAssigneeStaffId}
            data={staffMembers.map((member) => ({ value: member.id, label: member.name }))}
            clearable
          />
        )}
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
