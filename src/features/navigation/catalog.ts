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
  IconPhone,
  IconPill,
  IconSettings,
  IconShieldLock,
  IconSpeakerphone,
  IconUsers,
} from "@tabler/icons-react";
import type { ComponentType } from "react";

import { NAVIGATION_KEYS, type NavigationKey } from "@/domain/navigation";

export type { NavigationKey };

export type NavigationTone = "teal" | "blue" | "green" | "amber" | "violet" | "cyan";

export interface NavigationItem {
  href: string;
  key: NavigationKey;
  tone: NavigationTone;
  icon: ComponentType<{ size?: number; stroke?: number; "aria-hidden"?: boolean }>;
}

export interface NavigationSection {
  key: "general" | "clinicalTools" | "management" | "system";
  items: readonly NavigationItem[];
}

/* Only the everyday destinations stay visible. Everything else remains one tap away in “Más”. */
export const PRIMARY_NAV: readonly NavigationItem[] = [
  { href: "/app", key: "home", tone: "blue", icon: IconHome },
  { href: "/app/patients", key: "patients", tone: "teal", icon: IconUsers },
  { href: "/app/agenda", key: "agenda", tone: "green", icon: IconCalendar },
  { href: "/app/documents", key: "documents", tone: "cyan", icon: IconFileText },
  { href: "/app/finance", key: "finance", tone: "green", icon: IconCreditCard },
];

export const CLINICAL_NAV: readonly NavigationItem[] = [
  { href: "/app/laboratory", key: "laboratory", tone: "violet", icon: IconMicroscope },
  { href: "/app/prescriptions", key: "prescriptions", tone: "blue", icon: IconPill },
  { href: "/app/communications", key: "communications", tone: "teal", icon: IconMessage },
];

export const MANAGEMENT_NAV: readonly NavigationItem[] = [
  { href: "/app/clinic-contacts", key: "clinic-contacts", tone: "teal", icon: IconPhone },
  { href: "/app/tasks", key: "tasks", tone: "amber", icon: IconChecklist },
  { href: "/app/recovery", key: "recovery", tone: "teal", icon: IconClipboardText },
  { href: "/app/analysis", key: "analysis", tone: "blue", icon: IconChartBar },
  { href: "/app/incidents", key: "incidents", tone: "amber", icon: IconClipboardText },
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

const ALL_NAV: readonly NavigationItem[] = [...PRIMARY_NAV, ...SECONDARY_NAV];

export const NAV_ITEMS = Object.fromEntries(
  ALL_NAV.map((item) => [item.key, item] as const),
) as Readonly<Record<NavigationKey, NavigationItem>>;

export const navItemsFor = (keys: readonly NavigationKey[]): NavigationItem[] =>
  keys.map((key) => NAV_ITEMS[key]);

/** “Más” lists every section minus what is already a tap away in the bar. */
export function moreSections(visible: readonly NavigationKey[]): NavigationSection[] {
  const shown = new Set(visible);
  const hidden = NAVIGATION_KEYS.filter((key) => !shown.has(key)).map((key) => NAV_ITEMS[key]);
  const sectionOf = (item: NavigationItem) =>
    NAV_SECTIONS.find((section) => section.items.includes(item))?.key ?? "general";
  const groups = new Map<NavigationSection["key"], NavigationItem[]>();
  for (const item of hidden) {
    const key = sectionOf(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return SECTION_ORDER.filter((key) => groups.has(key)).map((key) => ({
    key,
    items: groups.get(key) ?? [],
  }));
}

const SECTION_ORDER: readonly NavigationSection["key"][] = [
  "general",
  "clinicalTools",
  "management",
  "system",
];
