"use client";

import { Alert, Badge, Button, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import { useState } from "react";
import { formatEUR } from "@/domain/money";
import {
  useAddClinicalPlanItemMutation,
  useClinicalPlanQuery,
  useClinicalSyncQuery,
  useClinicalWorkflowQuery,
  useSyncBudgetFromPlanMutation,
  useSyncPlanFromOdontogramMutation,
  useTreatmentCatalogQuery,
} from "@/shared/clinical/clinical-data";
import styles from "@/shared/ui/parity.module.css";

export function ClinicalWorkspace({ patientId }: { patientId: string }) {
  const workflow = useClinicalWorkflowQuery(patientId);
  const plan = useClinicalPlanQuery(patientId);
  const sync = useClinicalSyncQuery(patientId);
  const syncPlan = useSyncPlanFromOdontogramMutation(patientId);
  const syncBudget = useSyncBudgetFromPlanMutation(patientId);
  const treatmentCatalog = useTreatmentCatalogQuery();
  const addItem = useAddClinicalPlanItemMutation(patientId);
  const [treatmentCatalogId, setTreatmentCatalogId] = useState<string | null>(null);
  const [tooth, setTooth] = useState("");
  const activeCatalog = (treatmentCatalog.data?.items ?? []).filter((item) => item.active);
  const selectedTreatment = activeCatalog.find((item) => item.id === treatmentCatalogId);
  const hasError = workflow.isError || plan.isError || sync.isError;

  return (
    <Stack gap="md">
      {hasError ? (
        <Alert color="red" title="No se pudo cargar el flujo clínico">
          No se genera un plan alternativo en memoria. Revisa la API/Supabase y reintenta.
        </Alert>
      ) : null}
      <Group justify="space-between">
        <div>
          <Text fw={800}>Flujo clínico</Text>
          <Text size="sm" c="dimmed">Odontograma, plan y presupuesto comparten la misma fuente persistida.</Text>
        </div>
        <Badge variant="light">Servidor</Badge>
      </Group>
      <Group>
        <Button size="xs" variant="light" loading={syncPlan.isPending} onClick={() => syncPlan.mutate()}>
          Sincronizar plan desde odontograma
        </Button>
        <Button size="xs" loading={syncBudget.isPending} onClick={() => syncBudget.mutate()} disabled={!plan.data?.items.length}>
          Sincronizar presupuesto desde plan
        </Button>
      </Group>
      <section className={styles.section}>
        <Text fw={800}>Añadir tratamiento al plan</Text>
        <Text size="sm" c="dimmed" mt="xs">El selector se alimenta del catálogo clínico persistido de la clínica.</Text>
        <Group mt="sm" align="end" grow>
          <Select
            label="Tratamiento"
            placeholder="Selecciona tratamiento"
            searchable
            value={treatmentCatalogId}
            onChange={setTreatmentCatalogId}
            data={activeCatalog.map((item) => ({ value: item.id, label: `${item.name} · ${(item.defaultPriceCents / 100).toFixed(2)} €` }))}
          />
          <TextInput label="Diente / zona" placeholder="16" value={tooth} onChange={(event) => setTooth(event.currentTarget.value)} />
          <Button
            disabled={!selectedTreatment}
            loading={addItem.isPending}
            onClick={() => {
              if (!selectedTreatment) return;
              addItem.mutate({
                treatmentCatalogId: selectedTreatment.id,
                treatmentCode: selectedTreatment.code,
                label: selectedTreatment.name,
                ...(tooth.trim() ? { tooth: tooth.trim() } : {}),
                priceCents: selectedTreatment.defaultPriceCents,
              });
            }}
          >
            Añadir al plan
          </Button>
        </Group>
      </section>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div><h3 className={styles.sectionTitle}>Plan activo</h3><p className={styles.sectionDescription}>{plan.data?.items.length ?? 0} tratamientos persistidos.</p></div>
          <Badge>{plan.data?.status ?? "SIN PLAN"}</Badge>
        </div>
        <div className={styles.rowList}>
          {(plan.data?.route?.length ? plan.data.route : plan.data?.items ?? []).map((item) => (
            <div className={styles.row} key={item.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{item.label}</span>
                <span className={styles.rowMeta}>Fase {item.phase} · {item.tooth ?? "General"} · {item.treatmentCode}</span>
              </div>
              <div className={styles.rowActions}><Badge variant="light">{item.status}</Badge>{item.priceCents != null ? <Text fw={700}>{formatEUR(item.priceCents)}</Text> : null}</div>
            </div>
          ))}
          {!plan.isLoading && !(plan.data?.items.length) ? <Text c="dimmed">Todavía no hay tratamientos en el plan.</Text> : null}
        </div>
      </section>
      <section className={styles.section}>
        <Text fw={800}>Estado de sincronización</Text>
        <Text size="sm" c="dimmed" mt="xs">
          {sync.data ? "Sincronización cargada desde el backend." : "Sin estado de sincronización disponible."}
        </Text>
      </section>
    </Stack>
  );
}
