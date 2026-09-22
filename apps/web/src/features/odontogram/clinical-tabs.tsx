"use client";

import { Button, Group } from "@mantine/core";

import styles from "./odontogram.module.css";

export type ClinicalTab =
  | "general"
  | "periodontal"
  | "orthodontic"
  | "pediatric"
  | "endodontic"
  | "history";

const TABS: readonly { value: ClinicalTab; label: string }[] = [
  { value: "general", label: "General" },
  { value: "periodontal", label: "Periodonto" },
  { value: "orthodontic", label: "Ortodoncia" },
  { value: "pediatric", label: "Pediatrico" },
  { value: "endodontic", label: "Endodoncia" },
  { value: "history", label: "Historial" },
];

interface ClinicalTabsProps {
  active: ClinicalTab;
  onChange: (tab: ClinicalTab) => void;
}

export function ClinicalTabs({ active, onChange }: ClinicalTabsProps) {
  return (
    <Group className={styles.clinicalTabs} gap={6}>
      {TABS.map((tab) => (
        <Button
          key={tab.value}
          type="button"
          size="xs"
          variant={active === tab.value ? "filled" : "light"}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </Button>
      ))}
    </Group>
  );
}
