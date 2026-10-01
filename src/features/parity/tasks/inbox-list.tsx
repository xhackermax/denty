"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DragHandle } from "@/shared/drag/drag-handle";

import { ActionIcon, Button } from "@mantine/core";
import {
  IconArchive,
  IconCalendarPlus,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconPencil,
} from "@tabler/icons-react";
import { useState, type DragEvent } from "react";

import { PRIORITY_META } from "./priority";
import { ScheduleChooser } from "./schedule-chooser";
import type { TimelineTask } from "./task-types";
import styles from "./tasks-timeline.module.css";

export interface InboxHandlers {
  onSchedule: (task: TimelineTask, day: string) => void;
  onToggleDone: (task: TimelineTask) => void;
  onArchive: (task: TimelineTask) => void;
  onEdit: (task: TimelineTask) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onDragStart: (id: string) => void;
  onDrop?: (id: string) => void;
  ordering?: boolean;
  onDragEnd: () => void;
}

interface InboxListProps extends InboxHandlers {
  tasks: readonly TimelineTask[];
  today: string;
  selectedDay: string;
}

interface InboxItemProps extends InboxHandlers {
  task: TimelineTask;
  today: string;
  selectedDay: string;
  isFirst: boolean;
  isLast: boolean;
}

function InboxItem({ task, today, selectedDay, isFirst, isLast, ...handlers }: InboxItemProps) {
  const [choosing, setChoosing] = useState(false);
  const sortable = useSortable({ id: task.id, disabled: Boolean(handlers.ordering) });
  const dragStyle = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };
  const done = task.status === "DONE";
  const meta = PRIORITY_META[task.priority];
  const PriorityIcon = meta.icon;

  function onDragStart(event: DragEvent<HTMLLIElement>) {
    event.dataTransfer?.setData("text/plain", task.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    handlers.onDragStart(task.id);
  }

  return (
    <li
      ref={sortable.setNodeRef}
      style={dragStyle}
      className={`${styles.inboxItem} ${done ? styles.doneCard : ""}`}
      data-testid="inbox-item"
      draggable={!handlers.ordering}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        if (!handlers.ordering) handlers.onDrop?.(task.id);
      }}
      onDragStart={onDragStart}
      onDragEnd={handlers.onDragEnd}
    >
      <DragHandle
        label={`Reordenar tarea ${task.title}`}
        disabled={Boolean(handlers.ordering)}
        attributes={sortable.attributes}
        listeners={sortable.listeners}
        setActivatorNodeRef={sortable.setActivatorNodeRef}
      />
      <span className={styles.node} data-priority={task.priority} title={`Prioridad ${meta.label}`}>
        <PriorityIcon size={18} aria-hidden="true" />
      </span>
      <div className={styles.inboxBody}>
        <div className={styles.taskTitle} data-testid="inbox-title">
          {task.title}
        </div>
        <div className={styles.range}>{meta.label}</div>
      </div>
      <button
        type="button"
        className={`${styles.check} ${done ? styles.checkDone : ""}`}
        aria-label={
          done ? `Marcar como pendiente: ${task.title}` : `Marcar como hecha: ${task.title}`
        }
        aria-pressed={done}
        onClick={() => handlers.onToggleDone(task)}
      >
        <IconCheck size={16} aria-hidden="true" />
      </button>
      <div className={styles.inboxActions}>
        <Button
          size="compact-sm"
          variant="light"
          leftSection={<IconCalendarPlus size={14} />}
          aria-label={`Programar: ${task.title}`}
          aria-expanded={choosing}
          onClick={() => setChoosing((open) => !open)}
        >
          Programar
        </Button>
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label={`Subir: ${task.title}`}
          disabled={isFirst || Boolean(handlers.ordering)}
          onClick={() => handlers.onMove(task.id, -1)}
        >
          <IconChevronUp size={18} />
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label={`Bajar: ${task.title}`}
          disabled={isLast || Boolean(handlers.ordering)}
          onClick={() => handlers.onMove(task.id, 1)}
        >
          <IconChevronDown size={18} />
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label={`Editar: ${task.title}`}
          onClick={() => handlers.onEdit(task)}
        >
          <IconPencil size={18} />
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label={`Archivar: ${task.title}`}
          onClick={() => handlers.onArchive(task)}
        >
          <IconArchive size={18} />
        </ActionIcon>
      </div>
      {choosing ? (
        <div className={styles.inboxChooser}>
          <ScheduleChooser
            taskTitle={task.title}
            today={today}
            selectedDay={selectedDay}
            onPick={(day) => {
              if (day) handlers.onSchedule(task, day);
              setChoosing(false);
            }}
          />
        </div>
      ) : null}
    </li>
  );
}

export function InboxList({ tasks, today, selectedDay, ...handlers }: InboxListProps) {
  if (tasks.length === 0) {
    return (
      <p className={styles.state}>
        La Bandeja está vacía. Aquí caen las tareas sin día: crea una con «+» y elige «Sin día».
      </p>
    );
  }
  return (
    <ul className={styles.inboxList} aria-label="Tareas sin día">
      {tasks.map((task, index) => (
        <InboxItem
          key={task.id}
          task={task}
          today={today}
          selectedDay={selectedDay}
          isFirst={index === 0}
          isLast={index === tasks.length - 1}
          {...handlers}
        />
      ))}
    </ul>
  );
}
