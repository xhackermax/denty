"use client";

import { Alert, Badge, Button, Group, Stack, Text } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";
import styles from "@/shared/ui/parity.module.css";

export function SettingsModule() {
  const queryClient = useQueryClient();
  const sessions = useQuery({
    queryKey: dentyQueryKeys.security.sessions,
    queryFn: () => getBrowserApi().security.sessions.list(),
  });
  const backups = useQuery({
    queryKey: dentyQueryKeys.security.backups,
    queryFn: () => getBrowserApi().security.backups.list(),
  });
  const privacy = useQuery({
    queryKey: dentyQueryKeys.security.privacy,
    queryFn: () => getBrowserApi().security.privacy.list(),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => getBrowserApi().security.sessions.revoke(id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.security.sessions }),
  });
  const hasError = sessions.isError || backups.isError || privacy.isError;

  return (
    <Stack gap="md">
      {hasError ? (
        <Alert color="red">Parte de los ajustes de seguridad no está disponible.</Alert>
      ) : null}

      <section className={styles.section}>
        <Group justify="space-between">
          <div>
            <h3 className={styles.sectionTitle}>Sesiones</h3>
            <p className={styles.sectionDescription}>Sesiones persistidas del usuario.</p>
          </div>
          <Badge>{sessions.data?.items.length ?? 0}</Badge>
        </Group>
        <div className={styles.rowList}>
          {(sessions.data?.items ?? []).map((session) => (
            <div className={styles.row} key={session.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{session.deviceLabel ?? "Dispositivo"}</span>
                <span className={styles.rowMeta}>
                  Última actividad: {new Date(session.lastSeenAt).toLocaleString("es-ES")}
                </span>
              </div>
              <Button
                size="xs"
                variant="light"
                color="red"
                onClick={() => revoke.mutate(session.id)}
              >
                Revocar
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <Group justify="space-between">
          <div>
            <h3 className={styles.sectionTitle}>Copias de seguridad</h3>
            <p className={styles.sectionDescription}>
              Estado real de Supabase Managed Backups. Los objetos de Storage requieren su propia estrategia de retención.
            </p>
          </div>
          <Badge color={backups.data?.configured ? "green" : "yellow"}>
            {backups.data?.configured ? "Supabase conectado" : "No conectado"}
          </Badge>
        </Group>
        {backups.data?.message ? <Alert mt="md" color="yellow">{backups.data.message}</Alert> : null}
        <Text mt="md" size="sm">
          PITR: {backups.data?.pitrEnabled === true ? "activo" : backups.data?.pitrEnabled === false ? "inactivo" : "sin confirmar"}
        </Text>
        <div className={styles.rowList}>
          {(backups.data?.backups ?? []).map((backup) => (
            <div className={styles.row} key={backup.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{backup.type ?? "Backup"}</span>
                <span className={styles.rowMeta}>
                  {backup.createdAt ? new Date(backup.createdAt).toLocaleString("es-ES") : "Fecha no disponible"}
                  {backup.status ? ` · ${backup.status}` : ""}
                </span>
              </div>
            </div>
          ))}
          {backups.data?.configured && !backups.isLoading && (backups.data?.backups.length ?? 0) === 0 ? (
            <Text c="dimmed">Supabase no devolvió backups disponibles.</Text>
          ) : null}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Privacidad</h3>
        <div className={styles.rowList}>
          {(privacy.data?.items ?? []).map((request) => (
            <div className={styles.row} key={request.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{request.type}</span>
                <span className={styles.rowMeta}>{request.status}</span>
              </div>
            </div>
          ))}
          {!privacy.isLoading && (privacy.data?.items.length ?? 0) === 0 ? (
            <Text c="dimmed">Sin solicitudes.</Text>
          ) : null}
        </div>
      </section>
    </Stack>
  );
}
