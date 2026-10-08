"use client";

import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Loader,
  Modal,
  Radio,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { formatEUR } from "@/domain/money";
import {
  TREATMENT_PHASE_LABELS,
  splitPlanByPhase,
  treatmentPhase,
  type TreatmentPhase,
} from "@/domain/plan/treatment-phase";
import { DentyApiError } from "@/shared/api/errors";
import styles from "@/shared/ui/parity.module.css";

import { useCreateScopedBudgetMutation } from "./clinical-data";

export interface BudgetView {
  id: string;
  code: string;
  status: string;
  totalCents: number;
  version?: number | undefined;
  revision?: number | undefined;
  sourcePlanVersion?: number | null | undefined;
  createdAt?: string | undefined;
  scope?: string | undefined;
  title?: string | null | undefined;
  items: Array<{
    id: string;
    clinicalPlanItemId?: string | null | undefined;
    description: string;
    tooth?: string | null | undefined;
    unitPriceCents?: number | undefined;
    quantity?: number | undefined;
    billingMode?: "separate" | "included" | "no_charge" | undefined;
    totalCents: number;
  }>;
}

const EMPTY_BUDGETS: readonly BudgetView[] = [];

export interface BudgetPlanItem {
  id: string;
  treatmentCode: string;
  label: string;
  tooth?: string | null | undefined;
  priceCents?: number | null | undefined;
  status: string;
}

type BudgetMode = "phases" | "single";

function errorText(error: unknown, fallback: string): string {
  return error instanceof DentyApiError || error instanceof Error ? error.message : fallback;
}

function budgetTitle(budget: BudgetView): string {
  if (budget.title) return budget.title;
  if (budget.scope === "primary") return TREATMENT_PHASE_LABELS.primary.title;
  if (budget.scope === "secondary") return TREATMENT_PHASE_LABELS.secondary.title;
  return "Presupuesto completo";
}

function BudgetCard({
  budget,
  summary,
  selectable,
  planLabel,
}: {
  budget: BudgetView;
  summary?: string | undefined;
  selectable: boolean;
  planLabel?: string | undefined;
}) {
  return (
    <div className={styles.section} data-budget-scope={budget.scope ?? "plan"}>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <div>
          {planLabel ? (
            <Badge size="xs" variant="light" color="teal" mb={4}>
              {planLabel}
            </Badge>
          ) : null}
          {selectable ? (
            <Radio
              value={budget.id}
              label={<Text fw={700}>{budgetTitle(budget)}</Text>}
              aria-label={`Firmar ${budgetTitle(budget)}`}
            />
          ) : (
            <Text fw={700}>{budgetTitle(budget)}</Text>
          )}
          {summary ? (
            <Text size="xs" c="dimmed" mt={4}>
              {summary}
            </Text>
          ) : null}
        </div>
        <Stack gap={2} align="flex-end">
          <Badge variant="light">{budget.status === "SIGNED" ? "Firmado" : "Borrador"}</Badge>
          <Text size="xs" c="dimmed">
            {budget.code}
          </Text>
        </Stack>
      </Group>
      <div className={styles.rowList}>
        {budget.items.map((item) => (
          <div className={styles.row} key={item.id}>
            <div className={styles.rowMain}>
              <span className={styles.rowTitle}>
                {item.tooth ? `Diente ${item.tooth} · ` : ""}
                {item.description}
              </span>
            </div>
            <Text fw={600} className={styles.rowAmount}>
              {formatEUR(item.totalCents)}
            </Text>
          </div>
        ))}
      </div>
      <Group justify="flex-end">
        <Text fw={800}>Total {formatEUR(budget.totalCents)}</Text>
      </Group>
    </div>
  );
}

/**
 * Budget step: the whole plan in one budget, or natively split into phase 1 (disease control)
 * and phase 2 (rehabilitation), plus any number of custom budgets. The chosen one is signed.
 */
export function BudgetOptions({
  patientId,
  items,
  wholeBudget,
  wholeLoading,
  wholeError,
  onRetryWhole,
  selectedId,
  onSelect,
  existingCustomBudgets = EMPTY_BUDGETS,
}: {
  patientId: string;
  items: readonly BudgetPlanItem[];
  wholeBudget: BudgetView | null;
  wholeLoading: boolean;
  wholeError: unknown;
  onRetryWhole: () => void;
  selectedId: string | null;
  onSelect: (budget: BudgetView | null) => void;
  existingCustomBudgets?: readonly BudgetView[];
}) {
  const phases = useMemo(() => splitPlanByPhase(items), [items]);
  const bothPhases = phases.primary.length > 0 && phases.secondary.length > 0;
  const [mode, setMode] = useState<BudgetMode>(
    existingCustomBudgets.length ? "single" : bothPhases ? "phases" : "single",
  );
  const [phaseBudgets, setPhaseBudgets] = useState<Partial<Record<TreatmentPhase, BudgetView>>>({});
  const [custom, setCustom] = useState<BudgetView[]>(() => [...existingCustomBudgets]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const create = useCreateScopedBudgetMutation(patientId);
  const [phaseError, setPhaseError] = useState<unknown>(null);
  const [preparing, setPreparing] = useState(false);
  // Bumped only by the retry button: a failure must never re-run the build on its own.
  const [attempt, setAttempt] = useState(0);
  const preparedAttempt = useRef<number | null>(null);
  const latest = useRef({ phases, create, onSelect });
  latest.current = { phases, create, onSelect };

  useEffect(() => {
    setCustom((current) => {
      const byId = new Map(existingCustomBudgets.map((budget) => [budget.id, budget]));
      for (const budget of current) if (!byId.has(budget.id)) byId.set(budget.id, budget);
      return [...byId.values()];
    });
    if (existingCustomBudgets.length) setMode("single");
  }, [existingCustomBudgets]);

  // Phase budgets are (re)built from the current plan the first time the phases view opens.
  useEffect(() => {
    if (mode !== "phases" || preparedAttempt.current === attempt) return;
    preparedAttempt.current = attempt;
    const { phases: current, create: mutation, onSelect: select } = latest.current;
    setPreparing(true);
    setPhaseError(null);
    // Nothing is signable until the phases exist: "Siguiente" waits instead of signing the whole.
    select(null);
    const build = async () => {
      const built: Partial<Record<TreatmentPhase, BudgetView>> = {};
      for (const phase of ["primary", "secondary"] as const) {
        if (!current[phase].length) continue;
        const result = await mutation.mutateAsync({
          scope: phase,
          title: TREATMENT_PHASE_LABELS[phase].title,
          clinicalPlanItemIds: current[phase].map((item) => item.id),
        });
        built[phase] = result.budget as BudgetView;
      }
      setPhaseBudgets(built);
      select(built.primary ?? built.secondary ?? null);
    };
    build()
      .catch((error: unknown) => setPhaseError(error))
      .finally(() => setPreparing(false));
  }, [mode, attempt]);

  const switchMode = (next: string) => {
    const value = next as BudgetMode;
    setMode(value);
    if (value === "single") onSelect(wholeBudget);
    else {
      const first = phaseBudgets.primary ?? phaseBudgets.secondary ?? null;
      if (first) onSelect(first);
    }
  };

  const visible: BudgetView[] =
    mode === "single"
      ? [wholeBudget, ...custom].filter((budget): budget is BudgetView => Boolean(budget))
      : [phaseBudgets.primary, phaseBudgets.secondary].filter((budget): budget is BudgetView =>
          Boolean(budget),
        );
  const all = visible;

  return (
    <Stack gap="sm">
      {mode === "single" ? (
        <Text size="sm" c="dimmed">
          Elige el Plan A, B o C que el paciente va a aceptar. Aquí se muestra el importe de cada
          alternativa sin mezclarlo con las fases clínicas.
        </Text>
      ) : null}
      <Group justify="space-between" wrap="wrap">
        <SegmentedControl
          size="xs"
          value={mode}
          onChange={switchMode}
          data={[
            { value: "phases", label: "Por fases" },
            { value: "single", label: "Un presupuesto" },
          ]}
          aria-label="Cómo presupuestar"
        />
        <Button
          size="xs"
          variant="light"
          leftSection={<IconPlus size={14} />}
          onClick={() => setPickerOpen(true)}
          disabled={!items.length}
        >
          Nuevo presupuesto
        </Button>
      </Group>

      {mode === "phases" && !bothPhases ? (
        <Text size="xs" c="dimmed">
          Todo el plan pertenece a una sola fase; sale un único presupuesto de esa fase.
        </Text>
      ) : null}

      {(mode === "single" && wholeLoading) || (mode === "phases" && preparing) ? (
        <Group gap="sm" py="md">
          <Loader size="sm" />
          <Text c="dimmed">Preparando el presupuesto con el plan…</Text>
        </Group>
      ) : null}

      {mode === "single" && !wholeLoading && (wholeError || !wholeBudget) ? (
        <Alert color="red" title="No se pudo preparar el presupuesto">
          <Stack gap="xs">
            <Text size="sm">{errorText(wholeError, "Inténtalo de nuevo.")}</Text>
            <Button size="xs" variant="light" onClick={onRetryWhole}>
              Reintentar
            </Button>
          </Stack>
        </Alert>
      ) : null}
      {mode === "phases" && phaseError ? (
        <Alert color="red" title="No se pudieron preparar las fases">
          <Stack gap="xs">
            <Text size="sm">{errorText(phaseError, "Inténtalo de nuevo.")}</Text>
            <Button size="xs" variant="light" onClick={() => setAttempt((value) => value + 1)}>
              Reintentar
            </Button>
          </Stack>
        </Alert>
      ) : null}

      <Radio.Group
        value={selectedId}
        onChange={(id) => onSelect(all.find((budget) => budget.id === id) ?? null)}
        aria-label="Presupuesto que firma el paciente"
      >
        <Stack gap="sm">
          {visible.map((budget, index) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              selectable={all.length > 1}
              planLabel={
                mode === "single" ? `Plan ${String.fromCharCode(65 + index)}` : undefined
              }
              summary={
                budget.scope === "primary" || budget.scope === "secondary"
                  ? TREATMENT_PHASE_LABELS[budget.scope].summary
                  : undefined
              }
            />
          ))}
        </Stack>
      </Radio.Group>

      {all.some((budget) => budget.totalCents === 0) ? (
        <Text size="xs" c="orange">
          Hay un total de 0 €. Si no es gratuito, vuelve al plan y pon los precios.
        </Text>
      ) : null}

      <CustomBudgetPicker
        opened={pickerOpen}
        items={items.filter(
          (item) => phases.primary.includes(item) || phases.secondary.includes(item),
        )}
        loading={create.isPending}
        error={create.isError && pickerOpen ? create.error : null}
        onClose={() => setPickerOpen(false)}
        onCreate={async (title, ids) => {
          const result = await create.mutateAsync({
            scope: "custom",
            title,
            clinicalPlanItemIds: ids,
          });
          const budget = result.budget as BudgetView;
          setCustom((current) => [...current, budget]);
          setMode("single");
          onSelect(budget);
          setPickerOpen(false);
        }}
      />
    </Stack>
  );
}

function CustomBudgetPicker({
  opened,
  items,
  loading,
  error,
  onClose,
  onCreate,
}: {
  opened: boolean;
  items: readonly BudgetPlanItem[];
  loading: boolean;
  error: unknown;
  onClose: () => void;
  onCreate: (title: string | undefined, ids: string[]) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  const total = items
    .filter((item) => chosen.includes(item.id))
    .reduce((sum, item) => sum + (item.priceCents ?? 0), 0);
  return (
    <Modal opened={opened} onClose={onClose} title="Nuevo presupuesto" centered>
      <Stack gap="sm">
        <TextInput
          label="Nombre"
          placeholder="Por ejemplo: Alternativa con prótesis removible"
          value={title}
          maxLength={120}
          onChange={(event) => setTitle(event.currentTarget.value)}
        />
        <Checkbox.Group label="Tratamientos que incluye" value={chosen} onChange={setChosen}>
          <Stack gap={6} mt={6}>
            {items.map((item) => (
              <Checkbox
                key={item.id}
                value={item.id}
                label={
                  <Group gap={6} wrap="nowrap">
                    <Text size="sm">
                      {item.tooth ? `Diente ${item.tooth} · ` : ""}
                      {item.label}
                    </Text>
                    <Badge size="xs" variant="light">
                      {treatmentPhase(item) === "primary" ? "Fase 1" : "Fase 2"}
                    </Badge>
                  </Group>
                }
              />
            ))}
          </Stack>
        </Checkbox.Group>
        {error ? <Alert color="red">{errorText(error, "No se pudo crear.")}</Alert> : null}
        <Group justify="space-between">
          <Text size="sm" fw={700}>
            {chosen.length} tratamientos · {formatEUR(total)}
          </Text>
          <Button
            loading={loading}
            disabled={!chosen.length}
            onClick={() => {
              void onCreate(title.trim() || undefined, chosen).then(
                () => {
                  setTitle("");
                  setChosen([]);
                },
                () => undefined,
              );
            }}
          >
            Crear presupuesto
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
