"use client";

import { Alert, Badge, Button, Group, Select, Stack, Text } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";
import { useActiveTenant } from "@/shared/tenancy/active-context";
import styles from "@/shared/ui/parity.module.css";
import { ActionErrorAlert } from "./action-error-alert";

function textValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export function AlertsModule() {
  const queryClient = useQueryClient();
  const { role } = useActiveTenant();
  const alerts = useQuery({
    queryKey: dentyQueryKeys.alerts.all,
    queryFn: () => getBrowserApi().engagement.alerts.list(),
  });
  const users = useQuery({
    queryKey: dentyQueryKeys.staff.all,
    queryFn: () => getBrowserApi().admin.users.list(),
    enabled: role === "ADMIN",
    staleTime: 60_000,
  });
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.alerts.root });
    void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.dashboard.root });
  };
  const resolve = useMutation({
    mutationFn: (id: string) => getBrowserApi().engagement.alerts.resolve(id),
    onSuccess: invalidate,
  });
  const review = useMutation({
    mutationFn: (id: string) => getBrowserApi().engagement.alerts.review(id),
    onSuccess: invalidate,
  });
  const snooze = useMutation({
    mutationFn: (id: string) =>
      getBrowserApi().engagement.alerts.snooze(id, {
        until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }),
    onSuccess: invalidate,
  });
  const assign = useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string | null }) =>
      getBrowserApi().engagement.alerts.assign(id, { userId }),
    onSuccess: invalidate,
  });

  if (alerts.isError)
    return (
      <Alert color="red">
        No se pudieron cargar las alertas. No se muestran sustitutos locales.
      </Alert>
    );

  const assigneeOptions = (users.data?.items ?? [])
    .filter((user) => user.active !== false)
    .map((user) => ({ value: user.id, label: `${user.displayName} · ${user.role}` }));

  return (
    <Stack gap="md">
      <ActionErrorAlert errors={[resolve.error, review.error, snooze.error, assign.error]} />
      <Group justify="space-between">
        <Text fw={700}>Alertas abiertas</Text>
        <Group gap="xs">
          <Badge color={alerts.data?.criticalCount ? "red" : "gray"}>
            {alerts.data?.openCount ?? 0} abiertas
          </Badge>
          {(alerts.data?.criticalCount ?? 0) > 0 ? (
            <Badge color="red">{alerts.data?.criticalCount} críticas</Badge>
          ) : null}
        </Group>
      </Group>
      <div className={styles.rowList}>
        {(alerts.data?.items ?? []).map((item) => {
          const row = item as Record<string, unknown>;
          const priority = textValue(row.priority, "MEDIUM");
          const status = textValue(row.status, "OPEN");
          const assigneeUserId = typeof row.assigneeUserId === "string" ? row.assigneeUserId : null;
          return (
            <div className={styles.row} key={item.id}>
              <div className={styles.rowMain}>
                <Group gap="xs">
                  <span className={styles.rowTitle}>{textValue(row.title, "Alerta")}</span>
                  <Badge
                    size="xs"
                    color={
                      priority === "CRITICAL" ? "red" : priority === "HIGH" ? "orange" : "gray"
                    }
                  >
                    {priority}
                  </Badge>
                  {status === "REVIEWED" ? (
                    <Badge size="xs" variant="light">
                      Revisada
                    </Badge>
                  ) : null}
                </Group>
                <span className={styles.rowMeta}>
                  {textValue(row.message, textValue(row.description, "Pendiente de revisión"))}
                </span>
              </div>
              <div className={styles.rowActions}>
                {role === "ADMIN" ? (
                  <Select
                    size="xs"
                    placeholder="Asignar"
                    data={assigneeOptions}
                    value={assigneeUserId}
                    clearable
                    searchable
                    disabled={users.isLoading || assign.isPending}
                    onChange={(userId) => assign.mutate({ id: item.id, userId })}
                    w={190}
                  />
                ) : null}
                <Button
                  size="xs"
                  variant="subtle"
                  onClick={() => snooze.mutate(item.id)}
                  loading={snooze.isPending}
                >
                  Posponer 24 h
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => review.mutate(item.id)}
                  loading={review.isPending}
                >
                  Revisada
                </Button>
                <Button
                  size="xs"
                  onClick={() => resolve.mutate(item.id)}
                  loading={resolve.isPending}
                >
                  Resolver
                </Button>
              </div>
            </div>
          );
        })}
        {!alerts.isLoading && (alerts.data?.items.length ?? 0) === 0 ? (
          <Text c="dimmed">No hay alertas persistidas.</Text>
        ) : null}
      </div>
    </Stack>
  );
}
