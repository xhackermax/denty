import { Badge } from "@mantine/core";
import { IconCircleCheck, IconClock, IconInfoCircle, IconX } from "@tabler/icons-react";
import type { ComponentType } from "react";

interface StatusPresentation {
  color: string;
  icon: ComponentType<{ size?: number }>;
}

const PRESENTATION: Record<string, StatusPresentation> = {
  success: { color: "green", icon: IconCircleCheck },
  active: { color: "dentyTeal", icon: IconCircleCheck },
  pending: { color: "yellow", icon: IconClock },
  danger: { color: "red", icon: IconX },
  info: { color: "blue", icon: IconInfoCircle },
};

interface StatusBadgeProps {
  label: string;
  tone?: keyof typeof PRESENTATION;
}

export function StatusBadge({ label, tone = "info" }: StatusBadgeProps) {
  const presentation = PRESENTATION[tone];
  const Icon = presentation?.icon ?? IconInfoCircle;

  return (
    <Badge color={presentation?.color ?? "blue"} leftSection={<Icon size={12} />}>
      {label}
    </Badge>
  );
}
