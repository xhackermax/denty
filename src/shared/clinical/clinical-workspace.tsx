"use client";

import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatEUR } from "@/domain/money";
import { comparePlanAlternatives } from "@/domain/plan";
import {
  useAddClinicalPlanItemMutation,
  useBudgetDiscountSettingsQuery,
  useDeleteDraftBudgetMutation,
  useClinicalPlanQuery,
  useClinicalSyncQuery,
  useReorderClinicalPlanMutation,
  useClinicalWorkflowQuery,
  usePatientBudgetsQuery,
  useSyncBudgetFromPlanMutation,
  useSyncPlanFromOdontogramMutation,
  useTreatmentCatalogQuery,
  useTreatmentStaffTimesQuery,
  useUpdateDraftBudgetMutation,
} from "@/shared/clinical/clinical-data";
import { ClinicalDragContext } from "@/shared/drag/clinical-drag-context";
import { DragHandle } from "@/shared/drag/drag-handle";
import styles from "@/shared/ui/parity.module.css";
import type { BudgetView } from "./budget-options";
import { BudgetDiscountsPanel } from "./budget-discounts-panel";
import { BudgetTotalsSummary } from "./budget-totals";
import { FinancingCalculator } from "./financing-calculator";
import { ClinicalPlanBranchBuilder } from "./clinical-plan-branch-builder";
import { comparableBudgets } from "./budget-comparison";
import { ClinicalPhaseAccordion } from "./clinical-phase-accordion";
import { PlanAlternativesBoard } from "./plan-alternatives-board";

const CLINIC_TIMES = "clinic";

type ClinicalWorkspaceMode = "plan" | "budget" | "combined";

interface PlanItemView {
  id: string;
  tooth?: string | null;
  treatmentCatalogId?: string | null;
  treatmentCode: string;
  label: string;
  phase: number;
  status: string;
  priceCents?: number | null;
}

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

function reorderIds(ids: readonly string[], activeId: string, overId: string): string[] {
  const from = ids.indexOf(activeId);
  const to = ids.indexOf(overId);
  if (from < 0 || to < 0 || from === to) return [...ids];
  const next = [...ids];
  const [moved] = next.splice(from, 1);
  if (!moved) return [...ids];
  next.splice(to, 0, moved);
  return next;
}

const PLAN_ITEM_STATUS: Readonly<Record<string, { label: string; color: string }>> = {
  PLANNED: { label: "Planificado", color: "blue" },
  ACTIVE: { label: "En curso", color: "teal" },
  DEFERRED: { label: "Aplazado", color: "yellow" },
  COMPLETED: { label: "Hecho", color: "green" },
  CANCELLED: { label: "Cancelado", color: "gray" },
  SUPERSEDED: { label: "Sustituido", color: "gray" },
};
const CLOSED_PLAN_STATUSES = new Set(["CANCELLED", "SUPERSEDED"]);

function SortablePlanRow({
  item,
  index,
  patientId,
  requiresLab,
  disabled,
}: {
  item: PlanItemView;
  index: number;
  patientId: string;
  requiresLab: boolean;
  disabled: boolean;
}) {
  const sortable = useSortable({ id: item.id, disabled });
  const dragStyle = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    zIndex: sortable.isDragging ? 20 : undefined,
    opacity: sortable.isDragging ? 0.72 : 1,
  };

  return (
    <li
      ref={sortable.setNodeRef}
      style={dragStyle}
      className={`${styles.row} ${styles.draggablePlanRow} ${styles.planRow}`}
      data-dragging={sortable.isDragging || undefined}
      data-closed={CLOSED_PLAN_STATUSES.has(item.status) || undefined}
    >
      <DragHandle
        label={`Mover ${item.label}`}
        disabled={disabled}
        attributes={sortable.attributes}
        listeners={sortable.listeners}
        setActivatorNodeRef={sortable.setActivatorNodeRef}
      />
      <Text fw={850} className={styles.planSequenceNumber}>
        {index + 1}
      </Text>
      <div className={styles.rowMain}>
        <span className={styles.rowTitle}>{item.label}</span>
        <span className={styles.rowMeta}>
          {item.tooth ? `Diente ${item.tooth}` : "General"} · {item.treatmentCode}
        </span>
      </div>
      {/* Fixed slots keep status, price and lab action aligned even when a row lacks one. */}
      <span className={styles.planRowStatus}>
        <Badge variant="light" color={PLAN_ITEM_STATUS[item.status]?.color ?? "blue"}>
          {PLAN_ITEM_STATUS[item.status]?.label ?? item.status}
        </Badge>
      </span>
      <Text fw={700} className={`${styles.rowAmount} ${styles.planRowPrice}`}>
        {item.priceCents != null ? formatEUR(item.priceCents) : "—"}
      </Text>
      <span className={styles.planRowAction}>
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
      </span>
    </li>
  );
}

export function ClinicalWorkspace({
  patientId,
  mode = "combined",
  onOpenGuidedFlow,
}: {
  patientId: string;
  mode?: ClinicalWorkspaceMode;
  onOpenGuidedFlow?: (budgetId?: string) => void;
}) {
  const showPlan = mode !== "budget";
  const showBudget = mode !== "plan";
  const workflow = useClinicalWorkflowQuery(patientId, showPlan);
  const plan = useClinicalPlanQuery(patientId);
  const budgetHistory = usePatientBudgetsQuery(patientId, showBudget || showPlan);
  const sync = useClinicalSyncQuery(patientId, showPlan);
  const syncPlan = useSyncPlanFromOdontogramMutation(patientId);
  const syncBudget = useSyncBudgetFromPlanMutation(patientId);
  const updateDraftBudget = useUpdateDraftBudgetMutation(patientId);
  const deleteDraftBudget = useDeleteDraftBudgetMutation(patientId);
  const reorderPlan = useReorderClinicalPlanMutation(patientId);
  const treatmentCatalog = useTreatmentCatalogQuery(showPlan);
  const staffTimes = useTreatmentStaffTimesQuery(showPlan);
  const [timeDoctorId, setTimeDoctorId] = useState<string>(CLINIC_TIMES);
  const addItem = useAddClinicalPlanItemMutation(patientId);
  const [treatmentCatalogId, setTreatmentCatalogId] = useState<string | null>(null);
  const [tooth, setTooth] = useState("");
  const [optimisticOrder, setOptimisticOrder] = useState<string[] | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [openBudget, setOpenBudget] = useState<BudgetView | null>(null);
  const discountSettings = useBudgetDiscountSettingsQuery(showBudget);
  const [editingBudget, setEditingBudget] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<BudgetView | null>(null);
  const [budgetTitle, setBudgetTitle] = useState("");
  const [budgetPrices, setBudgetPrices] = useState<Record<string, number | string>>({});
  const [budgetFormError, setBudgetFormError] = useState<string | null>(null);
  const [compareSelectMode, setCompareSelectMode] = useState(false);
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [alternativeOpen, setAlternativeOpen] = useState(false);
  const [selectedPlanAlternativeId, setSelectedPlanAlternativeId] = useState<string | null>(null);

  const activeCatalog = (treatmentCatalog.data?.items ?? []).filter((item) => item.active);
  const selectedTreatment = activeCatalog.find((item) => item.id === treatmentCatalogId);
  const hasError =
    plan.isError ||
    (showPlan && (workflow.isError || sync.isError)) ||
    ((showPlan || showBudget) && budgetHistory.isError);
  const budgets = budgetHistory.data?.items ?? [];
  const currentPlanVersion = plan.data?.version;
  const planAlternativeBudgets = budgets
    .filter((budget) => ["DRAFT", "SIGNED"].includes(budget.status) && budget.scope === "custom")
    .sort((left, right) => (left.createdAt ?? "").localeCompare(right.createdAt ?? ""));
  const comparisonCandidates = comparableBudgets(budgets);
  const eligibleSelectedIds = comparisonIds.filter((id) =>
    comparisonCandidates.some((budget) => budget.id === id),
  );
  const comparisonHref = `/app/patients/${encodeURIComponent(patientId)}/budgets/compare?ids=${eligibleSelectedIds.map(encodeURIComponent).join(",")}`;
  useEffect(() => {
    const signedOption = sync.data?.budget;
    if (signedOption?.status === "SIGNED" && signedOption.scope === "custom") {
      setSelectedPlanAlternativeId(signedOption.id);
    }
  }, [sync.data?.budget?.id, sync.data?.budget?.status, sync.data?.budget?.scope]);

  const selectedPlanBudget = planAlternativeBudgets.find(
    (budget) => budget.id === selectedPlanAlternativeId,
  );
  const selectedIsSigned = selectedPlanBudget?.status === "SIGNED";
  // Alternative-only catalogue items have no canonical plan item yet. The signature
  // RPC intentionally blocks them until clinically formalized and consented.
  const selectedNeedsFormalization = Boolean(
    selectedPlanBudget?.branch &&
    selectedPlanBudget.items.some((item) => item.clinicalPlanItemId == null),
  );
  const selectedPlanLetter =
    selectedPlanAlternativeId === null
      ? "A"
      : String.fromCharCode(
          66 +
            Math.max(
              0,
              planAlternativeBudgets.findIndex((budget) => budget.id === selectedPlanAlternativeId),
            ),
        );
  const serverSequencedItems = (
    plan.data?.route?.length ? plan.data.route : (plan.data?.items ?? [])
  ) as PlanItemView[];

  const sequencedItems = useMemo(() => {
    if (!optimisticOrder) return serverSequencedItems;
    const byId = new Map(serverSequencedItems.map((item) => [item.id, item]));
    const ordered = optimisticOrder
      .map((id) => byId.get(id))
      .filter((item): item is PlanItemView => Boolean(item));
    const seen = new Set(ordered.map((item) => item.id));
    return [...ordered, ...serverSequencedItems.filter((item) => !seen.has(item.id))];
  }, [optimisticOrder, serverSequencedItems]);

  useEffect(() => {
    if (!optimisticOrder) return;
    const serverIds = serverSequencedItems.map((item) => item.id);
    if (serverIds.join("|") === optimisticOrder.join("|")) setOptimisticOrder(null);
  }, [optimisticOrder, serverSequencedItems]);

  const planComparison = comparePlanAlternatives(
    sequencedItems,
    planAlternativeBudgets.map((budget) => ({
      id: budget.id,
      title: budget.title,
      advantages: budget.branch?.advantages,
      disadvantages: budget.branch?.disadvantages,
      items: budget.items,
    })),
  );

  // Plan durations use the chosen doctor's recorded times, then the catalog's, then defaults.
  const catalogById = new Map((treatmentCatalog.data?.items ?? []).map((item) => [item.id, item]));
  const staffTimeRows = staffTimes.data?.items ?? [];
  const timeDoctors = [
    ...new Map(
      staffTimeRows.map((row) => [row.staffMemberId, row.staffName ?? "Doctor sin nombre"]),
    ),
  ].sort(([, left], [, right]) => left.localeCompare(right, "es"));
  const timeSourcesFor = (treatment: { treatmentCatalogId: string | null }) => {
    if (!treatment.treatmentCatalogId) return [];
    const own = staffTimeRows.find(
      (row) =>
        row.staffMemberId === timeDoctorId &&
        row.treatmentCatalogId === treatment.treatmentCatalogId,
    );
    return [own ?? null, catalogById.get(treatment.treatmentCatalogId) ?? null];
  };
  const timeBasis = timeDoctors.length ? (
    <Select
      size="xs"
      w={240}
      label="Tiempos según"
      allowDeselect={false}
      value={timeDoctorId}
      onChange={(value) => setTimeDoctorId(value ?? CLINIC_TIMES)}
      data={[
        { value: CLINIC_TIMES, label: "Catálogo de la clínica" },
        ...timeDoctors.map(([id, name]) => ({ value: id, label: name })),
      ]}
    />
  ) : null;

  const editedBudgetTotal = openBudget?.items.reduce((sum, item) => {
    if (item.billingMode && item.billingMode !== "separate") return sum;
    const price = Number(budgetPrices[item.id]);
    if (!Number.isFinite(price) || price < 0) return sum;
    return sum + Math.round(price * 100) * (item.quantity ?? 1);
  }, 0);

  const showBudgetDetails = (budget: BudgetView, edit = false) => {
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

  const applyPlanOrder = (activeId: string, overId: string) => {
    const currentIds = sequencedItems.map((item) => item.id);
    const orderedIds = reorderIds(currentIds, activeId, overId);
    if (orderedIds.join("|") === currentIds.join("|")) return;
    setOptimisticOrder(orderedIds);
    reorderPlan.mutate(orderedIds, {
      onError: () => setOptimisticOrder(null),
    });
  };

  const title =
    mode === "plan"
      ? "Plan de tratamiento"
      : mode === "budget"
        ? "Presupuestos"
        : "Presupuestos y plan de tratamiento";
  const description =
    mode === "plan"
      ? "Ordena la secuencia clínica arrastrando cada tratamiento."
      : mode === "budget"
        ? "Precios, versiones, aceptación y documentos económicos del paciente."
        : "Organiza la secuencia clínica y revisa los presupuestos del paciente.";

  return (
    <Stack gap="md">
      {hasError ? (
        <Alert color="red" title="No se pudo cargar la información clínica">
          Revisa la conexión con Denty y vuelve a intentarlo.
        </Alert>
      ) : null}

      <Group justify="space-between">
        <div>
          <Text fw={800}>{title}</Text>
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        </div>
        <Badge variant="light">Servidor</Badge>
      </Group>

      {showPlan ? (
        <>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h3 className={styles.sectionTitle}>Plan de tratamiento</h3>
                <p className={styles.sectionDescription}>
                  {sequencedItems.length
                    ? `${sequencedItems.length} tratamientos. Arrastra para cambiar el orden clínico.`
                    : "Todavía no hay tratamientos en el plan."}
                </p>
              </div>
              <Group gap="xs">
                <Badge>{plan.data?.status ?? "SIN PLAN"}</Badge>
                <Button
                  size="xs"
                  variant="light"
                  loading={syncPlan.isPending}
                  onClick={() => syncPlan.mutate()}
                >
                  Sincronizar
                </Button>
                {onOpenGuidedFlow && sequencedItems.length ? (
                  <Button
                    size="xs"
                    color="teal"
                    disabled={selectedNeedsFormalization}
                    onClick={() => onOpenGuidedFlow(selectedPlanAlternativeId ?? undefined)}
                  >
                    {selectedNeedsFormalization
                      ? `Formalizar Plan ${selectedPlanLetter} antes de firmar`
                      : selectedIsSigned
                        ? `Ver citas del Plan ${selectedPlanLetter}`
                        : `Continuar con Plan ${selectedPlanLetter} a consentimientos`}
                  </Button>
                ) : null}
              </Group>
            </div>

            {selectedNeedsFormalization ? (
              <Alert color="blue" mb="sm">
                Esta rama contiene tratamientos exclusivos que todavía no pertenecen al plan clínico
                activo. Puede compararse y presupuestarse, pero no firmarse hasta formalizar dichos
                tratamientos y sus consentimientos clínicos.
              </Alert>
            ) : null}

            {sequencedItems.length ? (
              <div role="region" aria-label="Plan de tratamiento por fases">
                <ClinicalDragContext
                  keyboardCoordinates={sortableKeyboardCoordinates}
                  onDragStart={(event) => setDragId(String(event.active.id))}
                  onDragCancel={() => setDragId(null)}
                  onDragEnd={(event) => {
                    const activeId = String(event.active.id);
                    const overId = event.over ? String(event.over.id) : null;
                    setDragId(null);
                    if (overId) applyPlanOrder(activeId, overId);
                  }}
                >
                  <SortableContext
                    items={sequencedItems.map((item) => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ClinicalPhaseAccordion
                      items={sequencedItems}
                      renderItems={(phaseItems) => (
                        <ol
                          className={`${styles.rowList} ${styles.sequenceList}`}
                          aria-label="Tratamientos a realizar"
                        >
                          {phaseItems.map((item, phaseIndex) => {
                            const catalogItem = activeCatalog.find(
                              (entry) => entry.id === item.treatmentCatalogId,
                            );
                            return (
                              <SortablePlanRow
                                key={item.id}
                                item={item}
                                index={phaseIndex}
                                patientId={patientId}
                                requiresLab={catalogItem?.requiresLab ?? false}
                                disabled={reorderPlan.isPending}
                              />
                            );
                          })}
                        </ol>
                      )}
                    />
                  </SortableContext>
                </ClinicalDragContext>
              </div>
            ) : !plan.isLoading ? (
              <Text c="dimmed">Todavía no hay tratamientos en el plan.</Text>
            ) : null}

            {dragId ? (
              <Text size="xs" c="dimmed" mt="xs" role="status">
                Suelta el tratamiento en la posición deseada.
              </Text>
            ) : null}
            {reorderPlan.isError ? (
              <Alert color="red" mt="sm" title="No se pudo guardar el nuevo orden">
                Se ha restaurado el orden anterior. Vuelve a intentarlo.
              </Alert>
            ) : null}
          </section>

          <section className={styles.section} aria-label="Opciones del plan de tratamiento">
            <div className={styles.sectionHeader}>
              <div>
                <h3 className={styles.sectionTitle}>Opciones del plan</h3>
                <p className={styles.sectionDescription}>
                  Compara los planes a la vez: qué se hace siempre, qué cambia en cada uno y sus
                  ventajas y desventajas. Ramifica para añadir el Plan B, C…
                </p>
              </div>
              <Button
                size="xs"
                variant="light"
                disabled={plan.data?.version === undefined}
                onClick={() => setAlternativeOpen(true)}
              >
                Ramificar · Plan {String.fromCharCode(66 + planAlternativeBudgets.length)}
              </Button>
            </div>
            <PlanAlternativesBoard
              comparison={planComparison}
              selectedLetter={selectedPlanLetter}
              signedAlternativeIds={planAlternativeBudgets
                .filter((budget) => budget.status === "SIGNED")
                .map((budget) => budget.id)}
              onSelect={setSelectedPlanAlternativeId}
              timeSourcesFor={timeSourcesFor}
              timeBasis={timeBasis}
            />
          </section>

          {alternativeOpen ? (
            <ClinicalPlanBranchBuilder
              opened={alternativeOpen}
              onClose={() => setAlternativeOpen(false)}
              patientId={patientId}
              planVersion={plan.data?.version ?? 0}
              items={sequencedItems}
              catalog={activeCatalog}
              letter={String.fromCharCode(66 + planAlternativeBudgets.length)}
              onCreated={(budgetId) => setSelectedPlanAlternativeId(budgetId)}
            />
          ) : null}

          <details className={styles.disclosure}>
            <summary>
              <span>
                <strong>Añadir tratamiento</strong>
                <small>Solo cuando no venga ya del odontograma</small>
              </span>
            </summary>
            <div className={styles.disclosureBody}>
              <Group align="end" grow>
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
            </div>
          </details>
        </>
      ) : null}

      {showBudget ? (
        <section className={styles.section} aria-labelledby="patient-budget-history">
          <div className={styles.sectionHeader}>
            <div>
              <h3 className={styles.sectionTitle} id="patient-budget-history">
                Presupuestos
              </h3>
              <p className={styles.sectionDescription}>
                Versiones económicas del plan. Los presupuestos firmados quedan conservados.
              </p>
            </div>
            <Group gap="xs">
              <Badge variant="light">{budgets.length}</Badge>
              <Button
                size="xs"
                loading={syncBudget.isPending}
                onClick={() => syncBudget.mutate()}
                disabled={!plan.data?.items.length}
              >
                Crear desde el plan
              </Button>
              {comparisonCandidates.length >= 2 ? (
                <>
                  <Button
                    size="xs"
                    variant="light"
                    color="teal"
                    onClick={() => setCompareSelectMode((value) => !value)}
                  >
                    {compareSelectMode ? "Cancelar selección" : "Seleccionar y comparar"}
                  </Button>
                  {compareSelectMode ? (
                    <Button
                      component={Link}
                      size="xs"
                      color="teal"
                      disabled={eligibleSelectedIds.length < 2}
                      href={comparisonHref}
                    >
                      Comparar {eligibleSelectedIds.length} en página aparte
                    </Button>
                  ) : null}
                </>
              ) : null}
              {onOpenGuidedFlow ? (
                <Button size="xs" variant="subtle" onClick={() => onOpenGuidedFlow()}>
                  Firma y citas
                </Button>
              ) : null}
            </Group>
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
                    {compareSelectMode &&
                    comparisonCandidates.some((option) => option.id === budget.id) ? (
                      <Checkbox
                        aria-label={`Seleccionar presupuesto ${budget.title || budget.code}`}
                        checked={comparisonIds.includes(budget.id)}
                        disabled={!comparisonIds.includes(budget.id) && comparisonIds.length >= 8}
                        onChange={(event) => {
                          const checked = event.currentTarget.checked;
                          setComparisonIds((current) =>
                            checked
                              ? current.includes(budget.id) || current.length >= 8
                                ? current
                                : [...current, budget.id]
                              : current.filter((id) => id !== budget.id),
                          );
                        }}
                      />
                    ) : null}
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
                      <Button size="xs" variant="subtle" onClick={() => showBudgetDetails(budget)}>
                        Abrir
                      </Button>
                      {canManage ? (
                        <>
                          <Button
                            size="xs"
                            variant="light"
                            onClick={() => showBudgetDetails(budget, true)}
                          >
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
      ) : null}

      {showBudget && budgets.length > 0 ? <FinancingCalculator budgets={budgets} /> : null}

      {showBudget ? (
        <>
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
                    const isPriced =
                      item.billingMode === undefined || item.billingMode === "separate";
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
                                setBudgetPrices((current) => ({
                                  ...current,
                                  [item.id]: value,
                                }));
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
                {editingBudget ? null : (
                  <BudgetTotalsSummary
                    budget={openBudget}
                    fallbackEarlyPaymentPercent={
                      openBudget.status === "DRAFT" && discountSettings.data?.earlyPaymentEnabled
                        ? discountSettings.data.earlyPaymentPercent
                        : null
                    }
                  />
                )}
                {!editingBudget && openBudget.status === "DRAFT" ? (
                  <BudgetDiscountsPanel
                    key={openBudget.id}
                    patientId={patientId}
                    budget={openBudget}
                    onUpdated={setOpenBudget}
                  />
                ) : null}
                <Group justify={editingBudget ? "space-between" : "flex-end"}>
                  {editingBudget ? (
                    <Text fw={800}>
                      {openBudget.subtotalCents !== undefined &&
                      openBudget.subtotalCents !== openBudget.totalCents
                        ? "Subtotal "
                        : "Total "}
                      {formatEUR(
                        editedBudgetTotal ?? openBudget.subtotalCents ?? openBudget.totalCents,
                      )}
                    </Text>
                  ) : null}
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
        </>
      ) : null}
    </Stack>
  );
}
