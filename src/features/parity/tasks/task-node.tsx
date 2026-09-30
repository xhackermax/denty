"use client";

import { ActionIcon } from "@mantine/core";
import {
  IconArchive,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconPencil,
} from "@tabler/icons-react";
import type { DragEvent } from "react";

import { PRIORITY_META } from "./priority";
import { formatClock, formatRange, type ScheduleEntry } from "./task-timeline";
import styles from "./tasks-timeline.module.css";

export interface TaskNodeHandlers {
  onToggleDone: (entry: ScheduleEntry) => void;
  onArchive: (entry: ScheduleEntry) => void;
  onEdit: (entry: ScheduleEntry) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDrop: (id: string) => void;
  onDragEnd: () => void;
}

interface TaskNodeProps extends TaskNodeHandlers {
  entry: ScheduleEntry;
  isFirst: boolean;
  isLast: boolean;
  dragging: boolean;
  dropTarget: boolean;
}

export function TaskNode({
  entry,
  isFirst,
  isLast,
  dragging,
  dropTarget,
  ...handlers
}: TaskNodeProps) {
  const { task } = entry;
  const done = task.status === "DONE";
  const conflict = entry.conflictsWith.length > 0;
  const meta = PRIORITY_META[task.priority];
  const PriorityIcon = meta.icon;

  const classes = [
    styles.item,
    dragging ? styles.dragging : "",
    dropTarget ? styles.dropTarget : "",
    conflict ? styles.conflictCard : "",
    done ? styles.doneCard : "",
  ];

  function onDragStart(event: DragEvent<HTMLLIElement>) {
    event.dataTransfer?.setData("text/plain", task.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    handlers.onDragStart(task.id);
  }

  function onDragOver(event: DragEvent<HTMLLIElement>) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    handlers.onDragOver(task.id);
  }

  function onDrop(event: DragEvent<HTMLLIElement>) {
    event.preventDefault();
    handlers.onDrop(task.id);
  }

  return (
    <li
      className={classes.filter(Boolean).join(" ")}
      data-testid="task-node"
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={handlers.onDragEnd}
    >
      <span className={styles.time}>
        {formatClock(entry.startMin)}
        <span className={styles.timeEnd}>{formatClock(entry.endMin)}</span>
      </span>
      <span className={styles.rail}>
        <span
          className={styles.node}
          data-priority={task.priority}
          title={`Prioridad ${meta.label}`}
        >
          <PriorityIcon size={18} aria-hidden="true" />
        </span>
      </span>
      <div className={styles.card}>
        <div>
          <div className={styles.range}>{formatRange(entry.startMin, entry.endMin)}</div>
          <div className={styles.taskTitle} data-testid="task-title">
            {task.title}
          </div>
          {conflict || entry.overdue || entry.explicit ? (
            <div className={styles.tags}>
              {conflict ? (
                <span className={`${styles.tag} ${styles.tagDanger}`}>Las tareas coinciden</span>
              ) : null}
              {entry.overdue ? (
                <span className={`${styles.tag} ${styles.tagWarn}`}>Vencida</span>
              ) : null}
              {entry.explicit ? <span className={styles.tag}>Hora fija</span> : null}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className={`${styles.check} ${done ? styles.checkDone : ""}`}
          aria-label={
            done ? `Marcar como pendiente: ${task.title}` : `Marcar como hecha: ${task.title}`
          }
          aria-pressed={done}
          onClick={() => handlers.onToggleDone(entry)}
        >
          <IconCheck size={16} aria-hidden="true" />
        </button>
        <div className={styles.actions}>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="md"
            aria-label={`Subir: ${task.title}`}
            disabled={isFirst}
            onClick={() => handlers.onMove(task.id, -1)}
          >
            <IconChevronUp size={18} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="md"
            aria-label={`Bajar: ${task.title}`}
            disabled={isLast}
            onClick={() => handlers.onMove(task.id, 1)}
          >
            <IconChevronDown size={18} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="md"
            aria-label={`Editar: ${task.title}`}
            onClick={() => handlers.onEdit(entry)}
          >
            <IconPencil size={18} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="md"
            aria-label={`Archivar: ${task.title}`}
            onClick={() => handlers.onArchive(entry)}
          >
            <IconArchive size={18} />
          </ActionIcon>
        </div>
      </div>
    </li>
  );
}
