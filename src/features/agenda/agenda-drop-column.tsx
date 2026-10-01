"use client";
import { useDroppable } from "@dnd-kit/core";
import type { HTMLAttributes } from "react";
export function AgendaDropColumn({
  id,
  ...props
}: HTMLAttributes<HTMLDivElement> & { id: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return <div {...props} ref={setNodeRef} data-drop-active={isOver || undefined} />;
}
