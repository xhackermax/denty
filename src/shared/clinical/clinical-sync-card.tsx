"use client";

import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import Link from "next/link";
import { useState } from "react";

import {
  useClinicalSyncQuery,
  useConsentRequirementsQuery,
  useSignBudgetMutation,
  useSyncBudgetFromPlanMutation,
  useSyncPlanFromOdontogramMutation,
} from "@/shared/clinical/clinical-data";
import styles from "@/shared/ui/parity.module.css";
import { SignaturePad } from "@/shared/ui/signature-pad";

interface ClinicalSyncCardProps {
  patientId: string;
}

export function ClinicalSyncCard({ patientId }: ClinicalSyncCardProps) {
  const syncQuery = useClinicalSyncQuery(patientId);
  const planSync = useSyncPlanFromOdontogramMutation(patientId);
  const budgetSync = useSyncBudgetFromPlanMutation(patientId);
  const consents = useConsentRequirementsQuery(patientId);
  const signBudget = useSignBudgetMutation(patientId);
  const [signOpen, setSignOpen] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);

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
  const pendingConsentCount = (consents.data?.items ?? []).filter(
    (item) => item.status !== "SATISFIED",
  ).length;

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

      {sync.nextAction === "READY" &&
      sync.budget &&
      !sync.budget.outdated &&
      sync.budget.status !== "SIGNED" ? (
        pendingConsentCount > 0 ? (
          <Alert mt="lg" color="orange" title="Faltan consentimientos">
            Firma {pendingConsentCount} consentimiento(s) antes del presupuesto.{" "}
            <Link
              href={`/app/documents?patientId=${encodeURIComponent(patientId)}&workflow=consents`}
            >
              Continuar a consentimientos
            </Link>
          </Alert>
        ) : (
          <Button mt="lg" color="teal" onClick={() => setSignOpen(true)}>
            Firmar presupuesto {sync.budget.code}
          </Button>
        )
      ) : null}

      <Modal
        opened={signOpen}
        onClose={() => setSignOpen(false)}
        title="Firma del presupuesto"
        centered
      >
        <Stack>
          <TextInput
            label="Nombre de quien firma"
            value={signerName}
            onChange={(event) => setSignerName(event.currentTarget.value)}
          />
          <SignaturePad onChange={setSignature} />
          {signBudget.isError ? (
            <Alert color="red">
              {signBudget.error instanceof Error
                ? signBudget.error.message
                : "No se pudo firmar el presupuesto."}
            </Alert>
          ) : null}
          <Button
            loading={signBudget.isPending}
            disabled={!signature || signerName.trim().length < 2 || !sync.budget?.version}
            onClick={() => {
              if (!sync.budget?.version || !signature) return;
              signBudget.mutate(
                {
                  budgetId: sync.budget.id,
                  expectedVersion: sync.budget.version,
                  signerName: signerName.trim(),
                  signatureData: signature,
                },
                { onSuccess: () => setSignOpen(false) },
              );
            }}
          >
            Guardar firma
          </Button>
        </Stack>
      </Modal>

      {planSync.isError || budgetSync.isError ? (
        <Alert mt="lg" color="red" title="No se sincronizó">
          La versión remota se conserva. Recarga antes de volver a intentarlo.
        </Alert>
      ) : null}
    </section>
  );
}
