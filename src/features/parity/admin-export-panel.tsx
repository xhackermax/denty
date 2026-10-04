"use client";

import { Alert, Button, Group, Stack, Text, Title } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { getBrowserApi } from "@/shared/api/browser";
import { DentyApiError } from "@/shared/api/errors";
import { dentyQueryKeys } from "@/shared/query";
import { todayMadrid } from "@/domain/dates";
import styles from "@/shared/ui/parity.module.css";

const SERVER_MESSAGES: Record<string, string> = {
  EXPORT_FAILED: "No se pudo completar la exportación.",
};

function messageFromError(error: unknown) {
  if (error instanceof DentyApiError) {
    const code = Object.keys(SERVER_MESSAGES).find((key) => error.message.includes(key));
    return code ? SERVER_MESSAGES[code] : error.message;
  }
  return "No se pudo completar la operación.";
}

type ExportFormat = "csv" | "xlsx";
type ExportEntity = "patients" | "appointments" | "treatments";

export function AdminExportPanel() {
  const [format, setFormat] = useState<ExportFormat>("csv");

  const overview = useQuery({
    queryKey: dentyQueryKeys.settings.exportOverview,
    queryFn: () => getBrowserApi().admin.export.overview(),
  });

  const exportMutation = useMutation({
    mutationFn: async ({ type, format }: { type: ExportEntity; format: ExportFormat }) => {
      const blob = await getBrowserApi().admin.export.execute(type, format);

      const timestamp = todayMadrid();
      const fileName = `${type}-${timestamp}.${format === "csv" ? "csv" : "xlsx"}`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      try {
        link.click();
      } finally {
        link.remove();
        URL.revokeObjectURL(url);
      }
    },
  });

  const entityOptions: Array<{ value: ExportEntity; label: string; description: string }> = [
    {
      value: "patients",
      label: "Pacientes",
      description: `${overview.data?.patientCount ?? "—"} pacientes en el sistema`,
    },
    {
      value: "appointments",
      label: "Citas",
      description: `${overview.data?.appointmentCount ?? "—"} citas registradas`,
    },
    {
      value: "treatments",
      label: "Tratamientos",
      description: `${overview.data?.treatmentCount ?? "—"} tratamientos registrados`,
    },
  ];

  const handleExport = (type: ExportEntity) => {
    exportMutation.mutate({ type, format });
  };

  return (
    <Stack>
      {overview.isError ? <Alert color="red">{messageFromError(overview.error)}</Alert> : null}
      {exportMutation.isError ? (
        <Alert color="red">{messageFromError(exportMutation.error)}</Alert>
      ) : null}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderText}>
            <Title order={3} className={styles.sectionTitle}>
              Exportar datos
            </Title>
            <Text className={styles.sectionDescription}>
              Descarga tus datos en formato CSV o Excel. Incluye pacientes, citas y tratamientos.
            </Text>
          </div>
        </div>

        <Stack gap="lg">
          <div>
            <Text size="sm" fw={500} mb="xs">
              Formato de exportación
            </Text>
            <Group>
              <Button
                variant={format === "csv" ? "filled" : "light"}
                disabled={exportMutation.isPending}
                aria-pressed={format === "csv"}
                onClick={() => setFormat("csv")}
              >
                CSV
              </Button>
              <Button
                variant={format === "xlsx" ? "filled" : "light"}
                disabled={exportMutation.isPending}
                aria-pressed={format === "xlsx"}
                onClick={() => setFormat("xlsx")}
              >
                Excel
              </Button>
            </Group>
            <Text size="xs" c="dimmed" mt="xs">
              CSV es compatible con todas las aplicaciones. Excel es más fácil de usar en Windows y
              Mac.
            </Text>
          </div>

          <div className={styles.rowList}>
            {entityOptions.map((option) => (
              <div className={styles.row} key={option.value}>
                <div className={styles.rowMain}>
                  <span className={styles.rowTitle}>{option.label}</span>
                  <span className={styles.rowMeta}>{option.description}</span>
                </div>
                <Button
                  size="sm"
                  leftSection={<IconDownload size={16} />}
                  loading={exportMutation.isPending}
                  disabled={!overview.isSuccess || exportMutation.isPending}
                  onClick={() => handleExport(option.value)}
                >
                  Descargar
                </Button>
              </div>
            ))}
          </div>

          <Alert title="Nota de privacidad" color="blue">
            Los datos exportados contienen información personal sensible. Guárdalos en un lugar
            seguro y elimínalos cuando ya no los necesites.
          </Alert>
        </Stack>
      </section>
    </Stack>
  );
}
