"use client";

import { Badge, Button, Group, Stack, Text } from "@mantine/core";
import { IconPrinter } from "@tabler/icons-react";

import { dateDMY } from "@/domain/dates";
import { decisionSummary } from "@/domain/plan";
import { PrintNotice } from "@/shared/print/print-notice";

import { usePatientComparisonsQuery } from "./clinical-arguments-data";
import { useComparisonPrinter } from "./use-comparison-printer";

/** Saved comparisons in the patient record, newest first; each version can be reprinted. */
export function TreatmentComparisonHistory({ patientId }: { patientId: string }) {
  const history = usePatientComparisonsQuery(patientId);
  const { print, notice } = useComparisonPrinter(patientId);
  const items = history.data?.items ?? [];
  return (
    <section aria-label="Comparaciones guardadas">
      <Text fw={750}>Comparaciones guardadas</Text>
      {history.isError ? (
        <Text size="sm" c="red">
          No se pudo cargar el historial de comparaciones.
        </Text>
      ) : !items.length ? (
        <Text size="sm" c="dimmed">
          {history.isLoading ? "Cargando…" : "Todavía no se ha guardado ninguna comparación."}
        </Text>
      ) : (
        <Stack gap={6} mt={6}>
          {items.map((record) => (
            <Group key={record.id} justify="space-between" wrap="nowrap" gap="xs">
              <div>
                <Group gap={6}>
                  <Text size="sm" fw={600}>
                    {decisionSummary(record, record.content)}
                  </Text>
                  <Badge size="xs" variant="light">
                    v{record.version}
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed">
                  {dateDMY(record.createdAt)} · {record.professionalName} ·{" "}
                  {record.content.options.map((option) => option.title).join(" / ")}
                </Text>
              </div>
              <Button
                size="compact-xs"
                variant="default"
                leftSection={<IconPrinter size={14} />}
                aria-label={`Imprimir versión ${record.version} del ${dateDMY(record.createdAt)}`}
                onClick={() => void print(record)}
              >
                Imprimir
              </Button>
            </Group>
          ))}
        </Stack>
      )}
      <PrintNotice error={notice.error} onClose={notice.clear} />
    </section>
  );
}
