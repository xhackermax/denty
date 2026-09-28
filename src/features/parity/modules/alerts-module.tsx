"use client";

import { Alert, Badge, Button, Group, Stack, Text } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";
import styles from "@/shared/ui/parity.module.css";

function textValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export function AlertsModule() {
  const queryClient = useQueryClient();
  const alerts = useQuery({
    queryKey: dentyQueryKeys.alerts.all,
    queryFn: () => getBrowserApi().engagement.alerts.list(),
  });
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.alerts.root });
    void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.dashboard.root });
  };
  const resolve = useMutation({ mutationFn: (id: string) => getBrowserApi().engagement.alerts.resolve(id), onSuccess: invalidate });
  const review = useMutation({ mutationFn: (id: string) => getBrowserApi().engagement.alerts.review(id), onSuccess: invalidate });

  if (alerts.isError) return <Alert color="red">No se pudieron cargar las alertas. No se muestran sustitutos locales.</Alert>;

  return (
    <Stack gap="md">
      <Group justify="space-between"><Text fw={700}>Alertas abiertas</Text><Badge color={alerts.data?.criticalCount ? "red" : "gray"}>{alerts.data?.openCount ?? 0}</Badge></Group>
      <div className={styles.rowList}>
        {(alerts.data?.items ?? []).map((item) => {
          const row = item as Record<string, unknown>;
          return (
            <div className={styles.row} key={item.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{textValue(row.title, "Alerta")}</span>
                <span className={styles.rowMeta}>{textValue(row.message, textValue(row.description, "Pendiente de revisión"))}</span>
              </div>
              <div className={styles.rowActions}>
                <Button size="xs" variant="light" onClick={() => review.mutate(item.id)} loading={review.isPending}>Revisada</Button>
                <Button size="xs" onClick={() => resolve.mutate(item.id)} loading={resolve.isPending}>Resolver</Button>
              </div>
            </div>
          );
        })}
        {!alerts.isLoading && (alerts.data?.items.length ?? 0) === 0 ? <Text c="dimmed">No hay alertas persistidas.</Text> : null}
      </div>
    </Stack>
  );
}
