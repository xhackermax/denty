import {
  IconBell,
  IconCalendar,
  IconChartBar,
  IconChecklist,
  IconClipboardText,
  IconCreditCard,
  IconFileText,
  IconHome,
  IconMessage,
  IconMicroscope,
  IconPill,
  IconSettings,
  IconShieldLock,
  IconSpeakerphone,
  IconUsers,
} from "@tabler/icons-react";
import type { ComponentType } from "react";

export type NavigationKey =
  | "home"
  | "patients"
  | "agenda"
  | "laboratory"
  | "prescriptions"
  | "communications"
  | "documents"
  | "finance"
  | "analysis"
  | "campaigns"
  | "alerts"
  | "attendance"
  | "settings"
  | "tasks"
  | "admin";

export type NavigationTone = "teal" | "blue" | "green" | "amber" | "violet" | "cyan";

export interface NavigationItem {
  href: string;
  key: NavigationKey;
  tone: NavigationTone;
  icon: ComponentType<{ size?: number; stroke?: number; "aria-hidden"?: boolean }>;
}

export interface NavigationSection {
  key: "clinicalTools" | "management" | "system";
  items: readonly NavigationItem[];
}

export const PRIMARY_NAV: readonly NavigationItem[] = [
  { href: "/app", key: "home", tone: "blue", icon: IconHome },
  { href: "/app/patients", key: "patients", tone: "teal", icon: IconUsers },
  { href: "/app/agenda", key: "agenda", tone: "green", icon: IconCalendar },
  { href: "/app/tasks", key: "tasks", tone: "amber", icon: IconChecklist },
];

export const CLINICAL_NAV: readonly NavigationItem[] = [
  { href: "/app/laboratory", key: "laboratory", tone: "violet", icon: IconMicroscope },
  { href: "/app/prescriptions", key: "prescriptions", tone: "blue", icon: IconPill },
  { href: "/app/documents", key: "documents", tone: "cyan", icon: IconFileText },
  { href: "/app/communications", key: "communications", tone: "teal", icon: IconMessage },
];

export const MANAGEMENT_NAV: readonly NavigationItem[] = [
  { href: "/app/finance", key: "finance", tone: "green", icon: IconCreditCard },
  { href: "/app/analysis", key: "analysis", tone: "blue", icon: IconChartBar },
  { href: "/app/campaigns", key: "campaigns", tone: "violet", icon: IconSpeakerphone },
  { href: "/app/alerts", key: "alerts", tone: "amber", icon: IconBell },
  { href: "/app/attendance", key: "attendance", tone: "cyan", icon: IconClipboardText },
];

export const SYSTEM_NAV: readonly NavigationItem[] = [
  { href: "/app/settings", key: "settings", tone: "blue", icon: IconSettings },
  { href: "/app/admin", key: "admin", tone: "violet", icon: IconShieldLock },
];

export const NAV_SECTIONS: readonly NavigationSection[] = [
  { key: "clinicalTools", items: CLINICAL_NAV },
  { key: "management", items: MANAGEMENT_NAV },
  { key: "system", items: SYSTEM_NAV },
];

export const SECONDARY_NAV: readonly NavigationItem[] = [
  ...CLINICAL_NAV,
  ...MANAGEMENT_NAV,
  ...SYSTEM_NAV,
];
