import {
  IconArmchair,
  IconBan,
  IconCircleCheck,
  IconClock,
  IconDoorEnter,
  IconHourglass,
  IconUserCheck,
  IconUserOff,
  type Icon,
} from "@tabler/icons-react";

import type { AgendaStatus } from "./agenda-projection";

export interface AgendaStatusMeta {
  label: string;
  /** Next step in the reception workflow, as a verb. */
  nextLabel: string | null;
  icon: Icon;
}

// Status is never conveyed by color alone: every state also has its own icon and name.
export const AGENDA_STATUS_META: Readonly<Record<AgendaStatus, AgendaStatusMeta>> = {
  PLANNED: { label: "Pendiente de confirmación", nextLabel: "Ha llegado", icon: IconClock },
  CONFIRMED: { label: "Confirmada", nextLabel: "Ha llegado", icon: IconUserCheck },
  RUNNING_LATE: { label: "Con retraso", nextLabel: "Ha llegado", icon: IconHourglass },
  ARRIVED: { label: "Ha llegado", nextLabel: "A gabinete", icon: IconDoorEnter },
  WAITING: { label: "Ha llegado", nextLabel: "A gabinete", icon: IconDoorEnter },
  IN_CHAIR: { label: "En gabinete", nextLabel: "Finalizar", icon: IconArmchair },
  COMPLETED: { label: "Finalizada", nextLabel: null, icon: IconCircleCheck },
  NO_SHOW: { label: "No presentado", nextLabel: null, icon: IconUserOff },
  CANCELLED: { label: "Cancelada", nextLabel: null, icon: IconBan },
};

export function AgendaStatusIcon({ status, size = 13 }: { status: AgendaStatus; size?: number }) {
  const meta = AGENDA_STATUS_META[status];
  const StatusIcon = meta.icon;
  return <StatusIcon size={size} aria-label={meta.label} role="img" />;
}
