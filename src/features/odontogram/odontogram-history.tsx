"use client";

import { Alert, Badge, Button, Group, Text, TextInput, Title } from "@mantine/core";
import { useState } from "react";
import { dateDMY, hhmm } from "@/domain/dates";
import {
  useCreateOdontogramSnapshotMutation,
  useOdontogramSnapshotsQuery,
} from "./odontogram-data";
import styles from "@/shared/ui/parity.module.css";

interface Props {
  patientId: string;
  selectedSnapshotId?: string | undefined;
  onSelectSnapshot?: (snapshotId: string | null) => void;
}
export function OdontogramHistory({ patientId, selectedSnapshotId, onSelectSnapshot }: Props) {
  const [label, setLabel] = useState("");
  const snapshots = useOdontogramSnapshotsQuery(patientId);
  const create = useCreateOdontogramSnapshotMutation(patientId);
  const historical = Boolean(selectedSnapshotId);
  return (
    <section className={styles.section}>
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={3}>Historial</Title>
          <Text c="dimmed" size="sm" mt="xs">
            Snapshots persistentes.
          </Text>
        </div>
        <Badge variant="light">v{snapshots.data?.currentVersion ?? "?"}</Badge>
      </Group>
      <Group mt="lg" align="flex-end">
        <TextInput
          label="Nombre del control"
          value={label}
          disabled={historical}
          onChange={(e) => setLabel(e.currentTarget.value)}
        />
        <Button
          size="sm"
          loading={create.isPending}
          disabled={historical}
          onClick={() =>
            void create.mutateAsync(label.trim() ? { label: label.trim() } : {}, {
              onSuccess: () => setLabel(""),
            })
          }
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
        <Alert mt="lg" color="yellow">
          El snapshot es solo lectura.
        </Alert>
      ) : null}
      {snapshots.isError ? (
        <Alert mt="lg" color="red">
          No se pudo cargar el historial remoto.
        </Alert>
      ) : null}
      <div className={styles.rowList}>
        {(snapshots.data?.items ?? []).slice(0, 8).map((snapshot) => (
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
            <Button
              size="compact-xs"
              variant={selectedSnapshotId === snapshot.id ? "filled" : "light"}
              onClick={() => onSelectSnapshot?.(snapshot.id)}
            >
              {selectedSnapshotId === snapshot.id ? "Viendo" : "Ver"}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
