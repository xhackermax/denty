"use client";

import { Button } from "@mantine/core";
import { IconArrowBackUp } from "@tabler/icons-react";

import styles from "@/shared/ui/parity.module.css";
import timelineStyles from "./tasks-timeline.module.css";
import { PRIORITY_META } from "./priority";
import type { TimelineTask } from "./task-types";

interface ArchivedListProps {
  tasks: readonly TimelineTask[];
  onRestore: (task: TimelineTask) => void;
}

export function ArchivedList({ tasks, onRestore }: ArchivedListProps) {
  if (tasks.length === 0) {
    return <p className={timelineStyles.state}>No hay tareas archivadas.</p>;
  }
  return (
    <div className={timelineStyles.inboxList}>
      {tasks.map((task) => (
        <div className={`${styles.row} ${timelineStyles.archiveCard}`} key={task.id}>
          <div className={styles.rowMain}>
            <span className={styles.rowTitle}>{task.title}</span>
            <span className={styles.rowMeta}>
              {PRIORITY_META[task.priority].label}
              {task.status === "DONE" ? " · Hecha" : ""}
            </span>
          </div>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconArrowBackUp size={14} />}
            aria-label={`Restaurar: ${task.title}`}
            onClick={() => onRestore(task)}
          >
            Restaurar
          </Button>
        </div>
      ))}
    </div>
  );
}
