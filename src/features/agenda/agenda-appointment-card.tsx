"use client";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { DragHandle } from "@/shared/drag/drag-handle";

import { Tooltip } from "@mantine/core";
import { IconGripVertical } from "@tabler/icons-react";
import { useRef, type CSSProperties, type DragEvent, type PointerEvent, type ReactNode } from "react";

import { appointmentCardSize, shortPatientName } from "@/domain";
import { epochMillis, hhmm } from "@/domain/dates";
import { ClinicalGlyphs, describeClinicalGlyph } from "@/shared/odontogram/clinical-glyph";
import type { AgendaAppointmentView } from "./agenda-projection";
import { AGENDA_STATUS_META, AgendaStatusIcon } from "./agenda-status";
import styles from "./agenda.module.css";

export interface AgendaAppointmentCardProps {
  appointment: AgendaAppointmentView;
  style: CSSProperties;
  heightPx: number;
  selected: boolean;
  dimmed: boolean;
  /** Doctor or cabinet name, shown only on large cards when it adds context. */
  contextLabel?: string | undefined;
  /** Site is intentionally visible on the card in multi-site agendas. */
  siteLabel?: string | undefined;
  menu: ReactNode;
  onOpen: () => void;
  onCopy: () => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onResizeStart: (event: PointerEvent<HTMLDivElement>) => void;
}

export function AgendaAppointmentCard({
  appointment,
  style,
  heightPx,
  selected,
  dimmed,
  contextLabel,
  siteLabel,
  menu,
  onOpen,
  onCopy,
  onDragStart,
  onResizeStart,
}: AgendaAppointmentCardProps) {
  const draggable = useDraggable({ id: appointment.id });
  const copyTimerRef = useRef<number | null>(null);
  const copyStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressOpenRef = useRef(false);
  const clearCopyTimer = () => {
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = null;
    copyStartRef.current = null;
  };
  const dragStyle = {
    ...style,
    transform: CSS.Translate.toString(draggable.transform),
    zIndex: draggable.isDragging ? 30 : style.zIndex,
  };
  const size = appointmentCardSize(heightPx);
  const status = AGENDA_STATUS_META[appointment.status];
  const glyphs = appointment.glyphs;
  const urgent = glyphs.some((glyph) => glyph.urgent);
  const duration = Math.round(
    (epochMillis(appointment.endsAt) - epochMillis(appointment.startsAt)) / 60_000,
  );
  const tooltip = [
    `${hhmm(appointment.startsAt)}–${hhmm(appointment.endsAt)} · ${appointment.patientName}`,
    appointment.reason,
    siteLabel ? `Sede: ${siteLabel}` : null,
    contextLabel ?? null,
    ...glyphs.map(describeClinicalGlyph),
    status.label,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <Tooltip label={tooltip} multiline maw={260} openDelay={450} withinPortal>
      <article
        ref={draggable.setNodeRef}
        className={styles.card}
        data-status={appointment.status}
        data-size={size}
        data-selected={selected}
        data-dimmed={dimmed}
        data-urgent={urgent}
        draggable
        style={dragStyle}
        tabIndex={0}
        aria-label={tooltip}
        onClick={() => {
          if (suppressOpenRef.current) {
            suppressOpenRef.current = false;
            return;
          }
          if (!draggable.isDragging) onOpen();
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          clearCopyTimer();
          onCopy();
        }}
        onPointerDown={(event) => {
          if (event.pointerType !== "touch") return;
          clearCopyTimer();
          copyStartRef.current = { x: event.clientX, y: event.clientY };
          copyTimerRef.current = window.setTimeout(() => {
            suppressOpenRef.current = true;
            copyTimerRef.current = null;
            onCopy();
          }, 550);
        }}
        onPointerMove={(event) => {
          const start = copyStartRef.current;
          if (!start) return;
          if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) clearCopyTimer();
        }}
        onPointerUp={clearCopyTimer}
        onPointerCancel={clearCopyTimer}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen();
          }
        }}
        onDragStart={onDragStart}
      >
        <div className={styles.cardRow}>
          <DragHandle
            label={`Mover cita de ${appointment.patientName}`}
            attributes={draggable.attributes}
            listeners={draggable.listeners}
            setActivatorNodeRef={draggable.setActivatorNodeRef}
          />
          <span className={styles.cardTime}>{hhmm(appointment.startsAt)}</span>
          <span className={styles.cardName}>
            {size === "small" ? shortPatientName(appointment.patientName) : appointment.patientName}
          </span>
          {size === "small" && siteLabel ? (
            <span className={styles.cardSite} title={siteLabel}>
              {siteLabel}
            </span>
          ) : null}
          {size === "small" ? (
            glyphs.length ? (
              <ClinicalGlyphs glyphs={glyphs} max={1} />
            ) : (
              <span className={styles.cardReason}>{appointment.reason}</span>
            )
          ) : null}
          <span className={styles.cardStatus} data-status={appointment.status}>
            <AgendaStatusIcon status={appointment.status} size={12} />
          </span>
          {size === "small" ? null : menu}
        </div>
        {size === "small" ? null : (
          <div className={styles.cardDetail}>
            {glyphs.length ? (
              <ClinicalGlyphs glyphs={glyphs} />
            ) : (
              <span className={styles.cardReason}>{appointment.reason}</span>
            )}
            {siteLabel ? <span className={styles.cardSite}>{siteLabel}</span> : null}
          </div>
        )}
        {size === "large" && (contextLabel || duration) ? (
          <span className={styles.cardMeta}>
            {[contextLabel, `${duration} min`].filter(Boolean).join(" · ")}
          </span>
        ) : null}
        <div
          className={styles.resizeHandle}
          title="Arrastrar para cambiar duración"
          onPointerDown={onResizeStart}
          onClick={(event) => event.stopPropagation()}
        >
          <IconGripVertical size={12} />
        </div>
      </article>
    </Tooltip>
  );
}
