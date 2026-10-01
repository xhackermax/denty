"use client";

import { Badge, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { memo } from "react";
import type { TimelineTask } from "./task-types";
import styles from "./tasks-timeline.module.css";

interface TasksSidebarProps {
  tasks: TimelineTask[];
  isOpen: boolean;
  onToggle: () => void;
  onSelectTask: (task: TimelineTask) => void;
  selectedTaskId?: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "gray",
  NORMAL: "blue",
  HIGH: "orange",
  URGENT: "red",
};

const TaskItem = memo(
  ({
    task,
    isSelected,
    onSelect,
  }: {
    task: TimelineTask;
    isSelected: boolean;
    onSelect: (task: TimelineTask) => void;
  }) => (
    <UnstyledButton
      className={`${styles.sidebarTaskItem} ${isSelected ? styles.sidebarTaskItemSelected : ""}`}
      onClick={() => onSelect(task)}
    >
      <Stack gap={4}>
        <Group justify="space-between" align="flex-start" gap={4}>
          <Text size="sm" fw={500} lineClamp={1} flex={1}>
            {task.title}
          </Text>
          <Badge size="xs" variant="light" color={PRIORITY_COLORS[task.priority] || "blue"}>
            {task.priority[0]}
          </Badge>
        </Group>
        <Text size="xs" c="dimmed">
          {task.status === "DONE" && "✓ "}
          {task.status === "IN_PROGRESS" && "⟳ "}
          {task.status}
        </Text>
      </Stack>
    </UnstyledButton>
  ),
);

TaskItem.displayName = "TaskItem";

export function TasksSidebar({
  tasks,
  isOpen,
  onToggle,
  onSelectTask,
  selectedTaskId,
}: TasksSidebarProps) {
  return (
    <div className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ""}`}>
      <button
        className={styles.sidebarToggle}
        onClick={onToggle}
        aria-label={isOpen ? "Cerrar panel de tareas" : "Abrir panel de tareas"}
      >
        {isOpen ? <IconChevronLeft size={18} /> : <IconChevronRight size={18} />}
      </button>

      {isOpen && (
        <div className={styles.sidebarContent}>
          <div className={styles.sidebarHeader}>
            <Text fw={600} size="sm">
              Tareas
            </Text>
            <Badge size="sm" variant="light">
              {tasks.length}
            </Badge>
          </div>

          <Stack gap={6} className={styles.sidebarList}>
            {tasks.length === 0 ? (
              <Text size="xs" c="dimmed" ta="center" py="md">
                Sin tareas
              </Text>
            ) : (
              tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  isSelected={selectedTaskId === task.id}
                  onSelect={onSelectTask}
                />
              ))
            )}
          </Stack>
        </div>
      )}
    </div>
  );
}
