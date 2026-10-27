"use client";

import { Anchor, Badge, Group, Stack, Text } from "@mantine/core";
import Link from "next/link";

import { RECALL_STATE_LABELS } from "@/domain/recalls";
import { useActiveTenant } from "@/shared/tenancy/active-context";
import { DateText } from "@/shared/ui";
import styles from "@/shared/ui/parity.module.css";

import { useRecallListQuery } from "./recalls-data";

/** Open recalls of one patient for the patient record; the work itself happens in /app/recalls. */
export function PatientRecallsCard({ patientId }: { patientId: string }) {
  const { permissions } = useActiveTenant();
  const canRead = permissions.includes("recalls.read");
  const recalls = useRecallListQuery({ patientId, pageSize: 10 }, canRead);
  if (!canRead) return null;
  const items = recalls.data?.items ?? [];

  return (
    <section className={styles.summaryTile} aria-label="Recalls del paciente">
      <Group justify="space-between">
        <span className={styles.summaryTileLabel}>Recalls</span>
        <Anchor component={Link} href="/app/recalls" size="sm">
          Ver todos
        </Anchor>
      </Group>
      {recalls.isError ? (
        <Text c="red" size="sm">
          No se pudieron cargar los recalls.
        </Text>
      ) : items.length === 0 ? (
        <Text c="dimmed" size="sm">
          {recalls.isLoading ? "Cargando…" : "Sin recalls abiertos."}
        </Text>
      ) : (
        <Stack gap={4}>
          {items.map((recall) => (
            <Group key={recall.id} gap="xs" justify="space-between" wrap="nowrap">
              <Text size="sm" truncate>
                {recall.templateName ?? "Automático"} · <DateText value={recall.dueAt} />
              </Text>
              <Badge size="xs" variant="light">
                {RECALL_STATE_LABELS[recall.state]}
              </Badge>
            </Group>
          ))}
        </Stack>
      )}
    </section>
  );
}
