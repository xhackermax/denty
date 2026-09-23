"use client";

import { Alert, Badge, Button, Group, SimpleGrid, Text, Title } from "@mantine/core";

import {
  useClinicalSyncQuery,
  useSyncBudgetFromPlanMutation,
  useSyncPlanFromOdontogramMutation,
} from "@/shared/clinical/clinical-data";
import styles from "@/shared/ui/parity.module.css";

interface ClinicalSyncCardProps {
  patientId: string;
  demoMode: boolean;
}

export function ClinicalSyncCard({ patientId, demoMode }: ClinicalSyncCardProps) {
  const syncQuery = useClinicalSyncQuery(patientId, !demoMode);
  const planSync = useSyncPlanFromOdontogramMutation(patientId);
  const budgetSync = useSyncBudgetFromPlanMutation(patientId);

  if (demoMode) {
    return (
      <section className={styles.section}>
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={3}>Sincronizar</Title>
            <Text c="dimmed" size="sm" mt="xs">
              Odontograma → plan → presupuesto usa versiones independientes.
            </Text>
          </div>
          <Badge variant="light">Demo</Badge>
        </Group>
      </section>
    );
  }

  if (syncQuery.isError) {
    return (
      <Alert color="red" title="Error de sincronización">
        No se ha supuesto un estado local alternativo. Revisa la conexión con Denty.
      </Alert>
    );
  }

  if (!syncQuery.data) {
    return (
      <section className={styles.section}>
        <Title order={3}>Sincronizar</Title>
        <Text c="dimmed" size="sm" mt="xs">
          Comprobando versiones de odontograma, plan y presupuesto.
        </Text>
      </section>
    );
  }

  const sync = syncQuery.data;
  const pendingMutation = planSync.isPending || budgetSync.isPending;

  return (
    <section className={styles.section}>
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={3}>Sincronizar</Title>
          <Text c="dimmed" size="sm" mt="xs">
            Las versiones impiden que un presupuesto quede silenciosamente desfasado.
          </Text>
        </div>
        <Badge color={sync.nextAction === "READY" ? "green" : "yellow"} variant="light">
          {sync.nextAction === "READY" ? "Sincronizado" : "Acción necesaria"}
        </Badge>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 3 }} mt="lg">
        <div>
          <Text c="dimmed" size="xs">
            Odontograma
          </Text>
          <Text fw={700}>v{sync.odontogram.version}</Text>
          <Text c="dimmed" size="xs">
            {sync.odontogram.suggestionCount} sugerencias · {sync.odontogram.historyCount} snapshots
          </Text>
        </div>
        <div>
          <Text c="dimmed" size="xs">
            Plan
          </Text>
          <Text fw={700}>v{sync.plan.version}</Text>
          <Text c={sync.plan.outdated ? "orange" : "dimmed"} size="xs">
            {sync.plan.outdated ? "Desactualizado" : `${sync.plan.itemCount} items activos`}
          </Text>
        </div>
        <div>
          <Text c="dimmed" size="xs">
            Presupuesto
          </Text>
          <Text fw={700}>{sync.budget?.code ?? "Sin presupuesto"}</Text>
          <Text c={sync.budget?.outdated ? "orange" : "dimmed"} size="xs">
            {sync.budget?.outdated ? "Desactualizado" : "Coherente con el plan"}
          </Text>
        </div>
      </SimpleGrid>

      {sync.nextAction === "SYNC_PLAN" ? (
        <Button mt="lg" loading={pendingMutation} onClick={() => void planSync.mutateAsync()}>
          Sincronizar plan desde odontograma
        </Button>
      ) : null}

      {sync.nextAction === "SYNC_BUDGET" ? (
        <Button mt="lg" loading={pendingMutation} onClick={() => void budgetSync.mutateAsync()}>
          Actualizar presupuesto desde plan
        </Button>
      ) : null}

      {planSync.isError || budgetSync.isError ? (
        <Alert mt="lg" color="red" title="No se sincronizó">
          La versión remota se conserva. Recarga antes de volver a intentarlo.
        </Alert>
      ) : null}
    </section>
  );
}
