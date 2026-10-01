"use client";
import { IconGripVertical } from "@tabler/icons-react";
import type { DraggableAttributes, useDraggable } from "@dnd-kit/core";
import styles from "./drag.module.css";
export function DragHandle({
  label,
  disabled,
  attributes,
  listeners,
  setActivatorNodeRef,
}: {
  label: string;
  disabled?: boolean;
  attributes: DraggableAttributes;
  listeners: ReturnType<typeof useDraggable>["listeners"];
  setActivatorNodeRef: (element: HTMLElement | null) => void;
}) {
  return (
    <button
      type="button"
      draggable={false}
      className={styles.handle}
      ref={setActivatorNodeRef}
      disabled={disabled}
      {...attributes}
      {...listeners}
      aria-label={label}
      onPointerDown={(event) => {
        listeners?.onPointerDown?.(event);
        event.preventDefault();
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <IconGripVertical size={16} aria-hidden="true" />
    </button>
  );
}
