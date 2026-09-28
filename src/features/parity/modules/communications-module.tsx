"use client";

import { Alert, Badge, Stack, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";
import styles from "@/shared/ui/parity.module.css";

function asText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function CommunicationsModule() {
  const communications = useQuery({
    queryKey: dentyQueryKeys.communications.all,
    queryFn: () => getBrowserApi().engagement.communications.list(),
  });

  if (communications.isError) {
    return <Alert color="red">No se pudieron cargar las comunicaciones persistidas.</Alert>;
  }

  const items = communications.data?.items ?? [];
  return (
    <Stack>
      <div className={styles.rowList}>
        {items.map((item) => {
          const row = item as Record<string, unknown>;
          return (
            <div className={styles.row} key={item.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{asText(row.subject, "Comunicación")}</span>
                <span className={styles.rowMeta}>
                  {asText(row.body, asText(row.category, "Sin contenido"))}
                </span>
              </div>
              <Badge variant="light">{asText(row.channel, "—")}</Badge>
            </div>
          );
        })}
        {!communications.isLoading && items.length === 0 ? (
          <Text c="dimmed">No hay comunicaciones.</Text>
        ) : null}
      </div>
    </Stack>
  );
}
