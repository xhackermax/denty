"use client";

import { Button } from "@mantine/core";
import { IconInbox } from "@tabler/icons-react";

import { dayShortcuts } from "./task-timeline";
import styles from "./tasks-timeline.module.css";

interface ScheduleChooserProps {
  taskTitle: string;
  today: string;
  selectedDay?: string;
  allowNone?: boolean;
  onPick: (day: string | null) => void;
}

export function ScheduleChooser({
  taskTitle,
  today,
  selectedDay,
  allowNone = false,
  onPick,
}: ScheduleChooserProps) {
  return (
    <div className={styles.chooser} role="group" aria-label={`Elegir día para ${taskTitle}`}>
      {dayShortcuts(today, selectedDay).map((shortcut) => (
        <Button
          key={shortcut.key}
          size="compact-sm"
          variant="light"
          onClick={() => onPick(shortcut.day)}
        >
          {shortcut.label}
        </Button>
      ))}
      <input
        type="date"
        className={styles.dateInput}
        aria-label="Elegir fecha"
        onChange={(event) => {
          if (event.currentTarget.value) onPick(event.currentTarget.value);
        }}
      />
      {allowNone ? (
        <Button
          size="compact-sm"
          variant="subtle"
          color="gray"
          leftSection={<IconInbox size={14} />}
          onClick={() => onPick(null)}
        >
          Sin día (Bandeja)
        </Button>
      ) : null}
    </div>
  );
}
