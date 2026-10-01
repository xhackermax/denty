"use client";
import { Accordion, Alert, Badge, Button, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconExternalLink, IconRefresh, IconShieldCheck } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";
import { useActiveTenant } from "@/shared/tenancy/active-context";
import styles from "@/shared/ui/parity.module.css";
function dateLabel(value: string | null | undefined) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Fecha no disponible";
  return new Date(value).toLocaleString("es-ES", {
    timeZone: "Europe/Madrid",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
export function ManagedBackupsPanel() {
  const { role } = useActiveTenant();
  const backups = useQuery({
    queryKey: dentyQueryKeys.security.backups,
    queryFn: () => getBrowserApi().security.backups.list(),
    enabled: role === "ADMIN",
  });
  if (role !== "ADMIN") return null;
  const data = backups.data;
  const connected = data?.connected ?? Boolean(data?.configured && !data.message);
  const failed = backups.isError || Boolean(data?.configured && !connected);
  const dashboard = data?.dashboardUrl ?? "https://supabase.com/dashboard";
  return (
    <section className={styles.section} aria-label="Copias de seguridad">
      <Stack gap="md">
        <Group justify="space-between" align="start">
          <div>
            <h3 className={styles.sectionTitle}>Copias de seguridad</h3>
            <p className={styles.sectionDescription}>
              Copias automáticas de la base de datos en Supabase.
            </p>
          </div>
          <Badge
            color={failed ? "red" : connected ? "green" : backups.isLoading ? "gray" : "yellow"}
          >
            {failed
              ? "Error de conexión"
              : connected
                ? "Supabase conectado"
                : backups.isLoading
                  ? "Consultando…"
                  : "Pendiente de configuración"}
          </Badge>
        </Group>
        <Group gap="sm">
          <Button
            variant="light"
            component="a"
            href={dashboard}
            target="_blank"
            rel="noopener noreferrer"
            leftSection={<IconExternalLink size={16} stroke={1.5} />}
          >
            Configurar en Supabase
          </Button>
          <Button
            variant="default"
            loading={backups.isFetching}
            leftSection={<IconRefresh size={16} stroke={1.5} />}
            onClick={() => void backups.refetch()}
          >
            Actualizar estado
          </Button>
        </Group>
        {backups.isError ? (
          <Alert color="red" role="alert">
            No se pudo consultar el estado de las copias. Reintenta la consulta o revisa la
            configuración del servidor.
          </Alert>
        ) : data?.message ? (
          <Alert color={failed ? "red" : "yellow"} role="alert">
            {data.message}
          </Alert>
        ) : null}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <div>
            <Text size="sm" c="dimmed">
              Última copia registrada
            </Text>
            <Text fw={600}>
              {data?.backups[0]
                ? dateLabel(data.backups[0].createdAt)
                : connected
                  ? "Sin copias disponibles"
                  : "Sin confirmar"}
            </Text>
          </div>
          <div>
            <Text size="sm" c="dimmed">
              Recuperación a un punto en el tiempo (PITR)
            </Text>
            <Text fw={600}>
              {data?.pitrEnabled === true
                ? "Activa"
                : data?.pitrEnabled === false
                  ? "Inactiva"
                  : "Sin confirmar"}
            </Text>
          </div>
        </SimpleGrid>
        <Accordion variant="contained" radius="md">
          <Accordion.Item value="configuration">
            <Accordion.Control icon={<IconShieldCheck size={18} stroke={1.5} />}>
              Configuración de copias automáticas
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                <Text size="sm">
                  La programación y la retención se gestionan en Supabase, según el plan del
                  proyecto. Abre «Configurar en Supabase» para revisar las copias diarias y activar
                  o ajustar PITR.
                </Text>
                <Text size="sm" c="dimmed">
                  La consulta desde Denty necesita un token de Supabase Management configurado en el
                  servidor de Vercel. El proyecto se obtiene de SUPABASE_URL; usa
                  SUPABASE_PROJECT_REF si tienes un dominio propio.
                </Text>
                <Text size="sm" c="dimmed">
                  Las copias de la base de datos no incluyen los archivos de Storage. Los documentos
                  requieren su propia copia.
                </Text>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
        {connected && !backups.isError ? (
          <div className={styles.rowList}>
            {data?.backups.map((backup) => (
              <div className={styles.row} key={backup.id}>
                <div className={styles.rowMain}>
                  <span className={styles.rowTitle}>
                    {backup.type === "LOGICAL"
                      ? "Copia lógica"
                      : backup.type === "PHYSICAL"
                        ? "Copia física"
                        : (backup.type ?? "Copia de seguridad")}
                  </span>
                  <span className={styles.rowMeta}>
                    {dateLabel(backup.createdAt)}
                    {backup.status ? ` · ${backup.status}` : ""}
                  </span>
                </div>
              </div>
            ))}
            {!data?.backups.length ? (
              <Text c="dimmed" size="sm">
                Supabase no devolvió copias disponibles. Revisa la programación y el plan del
                proyecto.
              </Text>
            ) : null}
          </div>
        ) : null}
        {data?.checkedAt ? (
          <Text size="xs" c="dimmed">
            Última consulta: {dateLabel(data.checkedAt)} · Europe/Madrid
          </Text>
        ) : null}
      </Stack>
    </section>
  );
}
