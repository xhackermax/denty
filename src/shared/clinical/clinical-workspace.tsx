"use client";

import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import Link from "next/link";
import { useState } from "react";
import { formatEUR } from "@/domain/money";
import {
  useAddClinicalPlanItemMutation,
  useDeleteDraftBudgetMutation,
  useClinicalPlanQuery,
  useClinicalSyncQuery,
  useClinicalWorkflowQuery,
  usePatientBudgetsQuery,
  useSyncBudgetFromPlanMutation,
  useSyncPlanFromOdontogramMutation,
  useTreatmentCatalogQuery,
  useUpdateDraftBudgetMutation,
} from "@/shared/clinical/clinical-data";
import styles from "@/shared/ui/parity.module.css";
import type { BudgetView } from "./budget-options";

function budgetDate(value: string | undefined): string {
  if (!value) return "Fecha no disponible";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Fecha no disponible"
    : date.toLocaleDateString("es-ES", { dateStyle: "medium" });
}

function readableError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function ClinicalWorkspace({ patientId }: { patientId: string }) {
  const workflow = useClinicalWorkflowQuery(patientId);
  const plan = useClinicalPlanQuery(patientId);
  const budgetHistory = usePatientBudgetsQuery(patientId);
  const sync = useClinicalSyncQuery(patientId);
  const syncPlan = useSyncPlanFromOdontogramMutation(patientId);
  const syncBudget = useSyncBudgetFromPlanMutation(patientId);
  const updateDraftBudget = useUpdateDraftBudgetMutation(patientId);
  const deleteDraftBudget = useDeleteDraftBudgetMutation(patientId);
  const treatmentCatalog = useTreatmentCatalogQuery();
  const addItem = useAddClinicalPlanItemMutation(patientId);
  const [treatmentCatalogId, setTreatmentCatalogId] = useState<string | null>(null);
  const [tooth, setTooth] = useState("");
  const [openBudget, setOpenBudget] = useState<BudgetView | null>(null);
  const [editingBudget, setEditingBudget] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<BudgetView | null>(null);
  const [budgetTitle, setBudgetTitle] = useState("");
  const [budgetPrices, setBudgetPrices] = useState<Record<string, number | string>>({});
  const [budgetFormError, setBudgetFormError] = useState<string | null>(null);
  const activeCatalog = (treatmentCatalog.data?.items ?? []).filter((item) => item.active);
  const selectedTreatment = activeCatalog.find((item) => item.id === treatmentCatalogId);
  const hasError = workflow.isError || plan.isError || sync.isError;
  const budgets = budgetHistory.data?.items ?? [];
  const editedBudgetTotal = openBudget?.items.reduce((sum, item) => {
    if (item.billingMode && item.billingMode !== "separate") return sum;
    const price = Number(budgetPrices[item.id]);
    if (!Number.isFinite(price) || price < 0) return sum;
    return sum + Math.round(price * 100) * (item.quantity ?? 1);
  }, 0);
  const showBudget = (budget: BudgetView, edit = false) => {
    setOpenBudget(budget);
    setEditingBudget(edit);
    setBudgetTitle(budget.title ?? "");
    setBudgetPrices(
      Object.fromEntries(
        budget.items.map((item) => [
          item.id,
          (item.unitPriceCents ?? item.totalCents / (item.quantity ?? 1)) / 100,
        ]),
      ),
    );
    setBudgetFormError(null);
    updateDraftBudget.reset();
  };
  const saveBudget = () => {
    if (!openBudget || openBudget.version === undefined) return;
    const items = openBudget.items.map((item) => {
      const price = Number(budgetPrices[item.id]);
      return {
        id: item.id,
        unitPriceCents:
          budgetPrices[item.id] !== "" &&
          Number.isFinite(price) &&
          price >= 0 &&
          price <= 21_474_836.47
            ? Math.round(price * 100)
            : -1,
      };
    });
    if (items.some((item) => item.unitPriceCents < 0)) {
      setBudgetFormError("Introduce un importe válido y no negativo para cada tratamiento.");
      return;
    }
    updateDraftBudget
      .mutateAsync({
        budgetId: openBudget.id,
        expectedVersion: openBudget.version,
        title: budgetTitle.trim() || null,
        items,
      })
      .then(
        () => {
          setOpenBudget(null);
          setEditingBudget(false);
        },
        () => undefined,
      );
  };
  const removeBudget = () => {
    if (!deleteCandidate || deleteCandidate.version === undefined) return;
    deleteDraftBudget
      .mutateAsync({
        budgetId: deleteCandidate.id,
        expectedVersion: deleteCandidate.version,
      })
      .then(
        () => setDeleteCandidate(null),
        () => undefined,
      );
  };

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
          <Text size="sm" c="dimmed">
            Odontograma, plan y presupuesto comparten la misma fuente persistida.
          </Text>
        </div>
        <Badge variant="light">Servidor</Badge>
      </Group>
      <Group>
        <Button
          size="xs"
          variant="light"
          loading={syncPlan.isPending}
          onClick={() => syncPlan.mutate()}
        >
          Sincronizar plan desde odontograma
        </Button>
        <Button
          size="xs"
          loading={syncBudget.isPending}
          onClick={() => syncBudget.mutate()}
          disabled={!plan.data?.items.length}
        >
          Sincronizar presupuesto desde plan
        </Button>
      </Group>
      <section className={styles.section}>
        <Text fw={800}>Añadir tratamiento al plan</Text>
        <Text size="sm" c="dimmed" mt="xs">
          El selector se alimenta del catálogo clínico persistido de la clínica.
        </Text>
        <Group mt="sm" align="end" grow>
          <Select
            label="Tratamiento"
            placeholder="Selecciona tratamiento"
            searchable
            value={treatmentCatalogId}
            onChange={setTreatmentCatalogId}
            data={activeCatalog.map((item) => ({
              value: item.id,
              label: `${item.name} · ${(item.defaultPriceCents / 100).toFixed(2)} €`,
            }))}
          />
          <TextInput
            label="Diente / zona"
            placeholder="16"
            value={tooth}
            onChange={(event) => setTooth(event.currentTarget.value)}
          />
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
          <div>
            <h3 className={styles.sectionTitle}>Plan activo</h3>
            <p className={styles.sectionDescription}>
              {plan.data?.items.length ?? 0} tratamientos persistidos.
            </p>
          </div>
          <Badge>{plan.data?.status ?? "SIN PLAN"}</Badge>
        </div>
        <div className={styles.rowList}>
          {(plan.data?.route?.length ? plan.data.route : (plan.data?.items ?? [])).map((item) => {
            const catalogItem = activeCatalog.find((entry) => entry.id === item.treatmentCatalogId);
            const requiresLab = catalogItem?.requiresLab ?? false;
            return (
              <div className={styles.row} key={item.id}>
                <div className={styles.rowMain}>
                  <span className={styles.rowTitle}>{item.label}</span>
                  <span className={styles.rowMeta}>
                    Fase {item.phase} · {item.tooth ?? "General"} · {item.treatmentCode}
                  </span>
                </div>
                <div className={styles.rowActions}>
                  <Badge variant="light">{item.status}</Badge>
                  {item.priceCents != null ? (
                    <Text fw={700}>{formatEUR(item.priceCents)}</Text>
                  ) : null}
                  {requiresLab ? (
                    <Button
                      component={Link}
                      href={`/app/laboratory?patientId=${encodeURIComponent(patientId)}&planItemId=${encodeURIComponent(item.id)}`}
                      size="xs"
                      variant="light"
                    >
                      Enviar a laboratorio
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
          {!plan.isLoading && !plan.data?.items.length ? (
            <Text c="dimmed">Todavía no hay tratamientos en el plan.</Text>
          ) : null}
        </div>
      </section>
      <section className={styles.section} aria-labelledby="patient-budget-history">
        <div className={styles.sectionHeader}>
          <div>
            <h3 className={styles.sectionTitle} id="patient-budget-history">
              Presupuestos anteriores
            </h3>
            <p className={styles.sectionDescription}>
              Consulta las versiones guardadas de este paciente. Los firmados se conservan sin
              cambios.
            </p>
          </div>
          <Badge variant="light">{budgets.length}</Badge>
        </div>
        {budgetHistory.isError ? (
          <Alert color="red" title="No se pudo cargar el historial de presupuestos">
            {readableError(budgetHistory.error, "Comprueba la conexión e inténtalo de nuevo.")}
          </Alert>
        ) : budgetHistory.isLoading ? (
          <Text size="sm" c="dimmed">
            Cargando presupuestos…
          </Text>
        ) : budgets.length ? (
          <div className={styles.rowList}>
            {budgets.map((budget) => {
              const canManage = budget.status === "DRAFT" && budget.version !== undefined;
              return (
                <div className={styles.row} key={budget.id}>
                  <div className={styles.rowMain}>
                    <span className={styles.rowTitle}>{budget.title || budget.code}</span>
                    <span className={styles.rowMeta}>
                      {budget.code}
                      {budget.revision === undefined ? "" : ` · Revisión ${budget.revision}`}
                      {` · ${budgetDate(budget.createdAt)}`}
                    </span>
                  </div>
                  <div className={styles.rowActions}>
                    <Badge variant="light">
                      {budget.status === "SIGNED" ? "Firmado" : "Borrador"}
                    </Badge>
                    <Text fw={700}>{formatEUR(budget.totalCents)}</Text>
                    <Button size="xs" variant="subtle" onClick={() => showBudget(budget)}>
                      Abrir
                    </Button>
                    {canManage ? (
                      <>
                        <Button size="xs" variant="light" onClick={() => showBudget(budget, true)}>
                          Editar
                        </Button>
                        <Button
                          size="xs"
                          variant="subtle"
                          color="red"
                          onClick={() => {
                            deleteDraftBudget.reset();
                            setDeleteCandidate(budget);
                          }}
                        >
                          Eliminar
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Text size="sm" c="dimmed">
            Todavía no hay presupuestos guardados para este paciente.
          </Text>
        )}
      </section>
      <Modal
        opened={openBudget !== null}
        onClose={() => {
          setOpenBudget(null);
          setEditingBudget(false);
        }}
        title={
          editingBudget
            ? `Editar presupuesto ${openBudget?.code ?? ""}`
            : `Presupuesto ${openBudget?.code ?? ""}`
        }
        size="lg"
        centered
      >
        {openBudget ? (
          <Stack gap="sm">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                {budgetDate(openBudget.createdAt)}
                {openBudget.revision === undefined ? "" : ` · Revisión ${openBudget.revision}`}
              </Text>
              <Badge variant="light">
                {openBudget.status === "SIGNED" ? "Firmado" : "Borrador"}
              </Badge>
            </Group>
            {editingBudget ? (
              <TextInput
                label="Nombre del presupuesto"
                value={budgetTitle}
                maxLength={120}
                onChange={(event) => {
                  setBudgetFormError(null);
                  updateDraftBudget.reset();
                  setBudgetTitle(event.currentTarget.value);
                }}
              />
            ) : null}
            <div className={styles.rowList}>
              {openBudget.items.map((item) => {
                const quantity = item.quantity ?? 1;
                const isPriced = item.billingMode === undefined || item.billingMode === "separate";
                const editedUnitPrice = Number(budgetPrices[item.id] ?? 0);
                const editedLineTotal =
                  isPriced && Number.isFinite(editedUnitPrice) && editedUnitPrice >= 0
                    ? Math.round(editedUnitPrice * 100) * quantity
                    : 0;
                return (
                  <div className={styles.row} key={item.id}>
                    <div className={styles.rowMain}>
                      <span className={styles.rowTitle}>
                        {item.tooth ? `Diente ${item.tooth} · ` : ""}
                        {item.description}
                        {quantity > 1 ? ` · ${quantity} uds.` : ""}
                      </span>
                      {editingBudget ? (
                        <NumberInput
                          label={`${item.description} · importe unitario en euros`}
                          value={budgetPrices[item.id] ?? 0}
                          min={0}
                          max={21_474_836.47}
                          decimalScale={2}
                          disabled={!isPriced}
                          onChange={(value) => {
                            setBudgetFormError(null);
                            updateDraftBudget.reset();
                            setBudgetPrices((current) => ({ ...current, [item.id]: value }));
                          }}
                        />
                      ) : null}
                    </div>
                    <Text fw={600}>
                      {formatEUR(editingBudget ? editedLineTotal : item.totalCents)}
                    </Text>
                  </div>
                );
              })}
            </div>
            {budgetFormError || updateDraftBudget.error ? (
              <Alert color="red" title="No se pudo guardar el presupuesto">
                {budgetFormError ??
                  readableError(
                    updateDraftBudget.error,
                    "Comprueba la conexión e inténtalo de nuevo.",
                  )}
              </Alert>
            ) : null}
            <Group justify="space-between">
              <Text fw={800}>
                Total{" "}
                {formatEUR(
                  editingBudget
                    ? (editedBudgetTotal ?? openBudget.totalCents)
                    : openBudget.totalCents,
                )}
              </Text>
              <Group>
                <Button
                  variant="default"
                  onClick={() => {
                    setOpenBudget(null);
                    setEditingBudget(false);
                  }}
                >
                  Cerrar
                </Button>
                {editingBudget ? (
                  <Button loading={updateDraftBudget.isPending} onClick={saveBudget}>
                    Guardar cambios
                  </Button>
                ) : null}
              </Group>
            </Group>
          </Stack>
        ) : null}
      </Modal>
      <Modal
        opened={deleteCandidate !== null}
        onClose={() => setDeleteCandidate(null)}
        title="¿Eliminar este presupuesto?"
        centered
      >
        {deleteCandidate ? (
          <Stack gap="sm">
            <Text size="sm">
              Se eliminará el borrador {deleteCandidate.code} por{" "}
              {formatEUR(deleteCandidate.totalCents)}. Esta acción no se puede deshacer.
            </Text>
            {deleteDraftBudget.error ? (
              <Alert color="red" title="No se pudo eliminar">
                {readableError(
                  deleteDraftBudget.error,
                  "El presupuesto puede tener una firma o un movimiento asociado.",
                )}
              </Alert>
            ) : null}
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setDeleteCandidate(null)}>
                Cancelar
              </Button>
              <Button color="red" loading={deleteDraftBudget.isPending} onClick={removeBudget}>
                Eliminar presupuesto
              </Button>
            </Group>
          </Stack>
        ) : null}
      </Modal>
      <section className={styles.section}>
        <Text fw={800}>Estado de sincronización</Text>
        <Text size="sm" c="dimmed" mt="xs">
          {sync.data
            ? "Sincronización cargada desde el backend."
            : "Sin estado de sincronización disponible."}
        </Text>
      </section>
    </Stack>
  );
}
