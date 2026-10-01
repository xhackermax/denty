"use client";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type KeyboardCoordinateGetter,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import type { ReactNode } from "react";
export function ClinicalDragContext({
  children,
  onDragEnd,
  onDragStart,
  onDragOver,
  onDragCancel,
  keyboardCoordinates,
}: {
  children: ReactNode;
  onDragEnd: (event: DragEndEvent) => void;
  onDragStart?: (event: DragStartEvent) => void;
  onDragOver?: (event: DragOverEvent) => void;
  onDragCancel?: () => void;
  keyboardCoordinates?: KeyboardCoordinateGetter;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, keyboardCoordinates ? { coordinateGetter: keyboardCoordinates } : {}),
  );
  return (
    <DndContext
      sensors={sensors}
      onDragEnd={onDragEnd}
      {...(onDragStart ? { onDragStart } : {})}
      {...(onDragOver ? { onDragOver } : {})}
      {...(onDragCancel ? { onDragCancel } : {})}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            "Pulsa espacio para recoger. Usa las flechas para mover y espacio para soltar. Escape cancela.",
        },
      }}
    >
      {children}
    </DndContext>
  );
}
