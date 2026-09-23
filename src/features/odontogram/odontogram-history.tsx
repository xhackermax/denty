"use client";

import { Alert, Badge, Button, Group, Text, TextInput, Title } from "@mantine/core";
import { useState } from "react";

import { dateDMY, hhmm } from "@/domain/dates";
import {
  useCreateOdontogramSnapshotMutation,
  useOdontogramSnapshotsQuery,
} from "./odontogram-data";
import styles from "@/shared/ui/parity.module.css";

interface OdontogramHistoryProps {
  patientId: string;
  demoMode: boolean;
  selectedSnapshotId?: string | undefined;
  onSelectSnapshot?: ((snapshotId: string | null) => void) | undefined;
}

export function OdontogramHistory({
  patientId,
  demoMode,
  selectedSnapshotId,
  onSelectSnapshot,
}: OdontogramHistoryProps) {
  const [label, setLabel] = useState("");
  const snapshotsQuery = useOdontogramSnapshotsQuery(patientId, !demoMode);
  const createMutation = useCreateOdontogramSnapshotMutation(patientId);
  const historical = Boolean(selectedSnapshotId);

  const createSnapshot = async () => {
    if (demoMode || historical) return;
    const cleanLabel = label.trim();
    await createMutation.mutateAsync(cleanLabel ? { label: cleanLabel } : {});
    setLabel("");
  };

  return (
    <section className={styles.section}>
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={3}>Historial</Title>
          <Text c="dimmed" size="sm" mt="xs">
            Snapshots persistentes separados del undo/redo local de 30 pasos.
          </Text>
        </div>
        <Badge variant="light">
          {demoMode ? "Demo" : `v${snapshotsQuery.data?.currentVersion ?? "?"}`}
        </Badge>
      </Group>

      {demoMode ? (
        <Alert mt="lg" color="blue" title="Historial demo">
          El modo demo conserva solo el historial local del editor. Los snapshots del servidor no se
          simulan.
        </Alert>
      ) : (
        <>
          <Group mt="lg" align="flex-end">
            <TextInput
              label="Nombre del control"
              placeholder="Ej. Revisión 6 meses"
              value={label}
              disabled={historical}
              onChange={(event) => setLabel(event.currentTarget.value)}
            />
            <Button
              size="sm"
              loading={createMutation.isPending}
              disabled={historical}
              onClick={() => void createSnapshot()}
            >
              Guardar snapshot
            </Button>
            {historical ? (
              <Button size="sm" variant="light" onClick={() => onSelectSnapshot?.(null)}>
                Volver al actual
              </Button>
            ) : null}
          </Group>

          {historical ? (
            <Alert mt="lg" color="yellow" title="Vista histórica">
              El snapshot es solo lectura. Ninguna acción clínica modifica esta versión.
            </Alert>
          ) : null}

          {createMutation.isError ? (
            <Alert mt="lg" color="red" title="No se guardó la versión">
              El historial remoto no se ha sustituido por una copia local.
            </Alert>
          ) : null}

          {snapshotsQuery.isError ? (
            <Alert mt="lg" color="red" title="Error al cargar historial">
              Revisa la conexión con el backend Denty.
            </Alert>
          ) : null}

          <div className={styles.rowList}>
            {(snapshotsQuery.data?.items ?? []).slice(0, 8).map((snapshot) => (
              <div className={styles.row} key={snapshot.id}>
                <div className={styles.rowMain}>
                  <span className={styles.rowTitle}>
                    {snapshot.label?.trim() || "Snapshot sin nombre"}
                  </span>
                  <span className={styles.rowMeta}>
                    {dateDMY(snapshot.createdAt)} · {hhmm(snapshot.createdAt)} · versión{" "}
                    {snapshot.version}
                  </span>
                </div>
                <Group gap="xs">
                  <Badge variant="light">{snapshot.entities.length} entidades</Badge>
                  <Button
                    size="compact-xs"
                    variant={selectedSnapshotId === snapshot.id ? "filled" : "light"}
                    onClick={() => onSelectSnapshot?.(snapshot.id)}
                  >
                    {selectedSnapshotId === snapshot.id ? "Viendo" : "Ver"}
                  </Button>
                </Group>
              </div>
            ))}
            {!snapshotsQuery.isLoading && !snapshotsQuery.data?.items.length ? (
              <Text c="dimmed" size="sm">
                Todavía no hay snapshots manuales o automáticos disponibles.
              </Text>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
