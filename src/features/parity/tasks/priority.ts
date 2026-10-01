import {
  IconChevronDown,
  IconChevronsUp,
  IconEqual,
  IconFlame,
  type Icon,
} from "@tabler/icons-react";

import type { TaskPriority } from "./task-types";

export const PRIORITY_META: Record<TaskPriority, { label: string; icon: Icon }> = {
  URGENT: { label: "Urgente", icon: IconFlame },
  HIGH: { label: "Alta", icon: IconChevronsUp },
  NORMAL: { label: "Normal", icon: IconEqual },
  LOW: { label: "Baja", icon: IconChevronDown },
};

export const PRIORITY_OPTIONS = (["LOW", "NORMAL", "HIGH", "URGENT"] as const).map((value) => ({
  value,
  label: PRIORITY_META[value].label,
}));
