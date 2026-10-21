"use client";

import { Accordion, Badge, Group, Text } from "@mantine/core";
import type { ReactNode } from "react";

import { groupByClinicalPhase, type ClinicalPhaseClassifiable } from "@/domain/plan";

/** Folds a treatment list into collapsible clinical phases so long plans stay scannable. */
export function ClinicalPhaseAccordion<T extends ClinicalPhaseClassifiable>({
  items,
  renderItems,
  defaultOpen = [],
}: {
  items: readonly T[];
  renderItems: (items: T[]) => ReactNode;
  defaultOpen?: string[];
}) {
  const groups = groupByClinicalPhase(items);
  if (!groups.length) return null;
  return (
    <Accordion multiple variant="separated" radius="md" defaultValue={defaultOpen}>
      {groups.map((group) => (
        <Accordion.Item key={group.key} value={group.key}>
          <Accordion.Control>
            <Group gap="xs" wrap="nowrap">
              <Text fw={700} size="sm">
                {group.label}
              </Text>
              <Badge size="sm" variant="light" aria-label={`${group.items.length} tratamientos`}>
                {group.items.length}
              </Badge>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>{renderItems(group.items)}</Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}
