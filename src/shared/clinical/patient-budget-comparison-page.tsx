"use client";

import { Alert, Badge, Button, Checkbox, Group, Loader, Stack, Text, Title } from "@mantine/core";
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatEUR } from "@/domain/money";
import { usePatientBudgetsQuery } from "./clinical-data";
import { appointmentRangeLabel, budgetImplications, implicationLines } from "@/domain/plan";
import {
  comparableBudgets,
  comparisonBudget,
  compareBudgetTreatments,
  budgetOptionSummary,
  estimateBudgetAppointments,
  type BudgetAppointmentEstimate,
} from "./budget-comparison";
import type { BudgetView } from "./budget-options";
import { MirrorPanels, type MirrorColumn, type MirrorSection } from "./mirror-panels";
import styles from "./patient-budget-comparison.module.css";
import { TreatmentComparisonDecision } from "./treatment-comparison-decision";
import { TreatmentComparisonHistory } from "./treatment-comparison-history";

function title(budget: BudgetView) {
  return budget.title?.trim() || budget.code;
}

function TreatmentRows({ items }: { items: BudgetView["items"] }) {
  if (!items.length)
    return (
      <Text size="sm" c="dimmed">
        Sin tratamientos exclusivos.
      </Text>
    );
  return (
    <ul className={styles.treatments}>
      {items.map((item) => (
        <li key={item.id}>
          <span>
            {item.tooth ? `Diente ${item.tooth} · ` : ""}
            {item.description}
          </span>
          <strong>{formatEUR(item.totalCents)}</strong>
        </li>
      ))}
    </ul>
  );
}

/** Independent page: select between two and eight full treatment proposals, side by side. */
export function PatientBudgetComparisonPage({
  patientId,
  initialSelectedIds,
}: {
  patientId: string;
  initialSelectedIds: string[];
}) {
  const [selection, setSelection] = useState<string[]>(initialSelectedIds.slice(0, 8));
  const history = usePatientBudgetsQuery(patientId);
  const candidates = useMemo(
    () => comparableBudgets(history.data?.items ?? []),
    [history.data?.items],
  );
  const selected = candidates.filter((budget) => selection.includes(budget.id));
  const result = compareBudgetTreatments(selected);

  const toggle = (id: string, checked: boolean) =>
    setSelection((current) =>
      checked
        ? current.includes(id) || current.length >= 8
          ? current
          : [...current, id]
        : current.filter((value) => value !== id),
    );

  return (
    <main className={styles.comparisonPage}>
      <Group justify="space-between" align="flex-start">
        <div>
          <Text size="xs" c="dimmed" fw={750}>
            FICHA DEL PACIENTE · PRESUPUESTOS
          </Text>
          <Title order={2}>Comparar planes de tratamiento</Title>
          <Text size="sm" c="dimmed" mt={5}>
            Hasta ocho propuestas, cada una en su columna. La información es orientativa: comparar o
            marcar opciones no supone aceptación ni firma.
          </Text>
        </div>
        <Button
          component={Link}
          variant="default"
          href={`/app/patients/${encodeURIComponent(patientId)}?view=budgets`}
        >
          Volver a presupuestos
        </Button>
      </Group>
      {history.isLoading ? <Loader /> : null}
      {history.isError ? (
        <Alert color="red" title="No se pudieron cargar los presupuestos">
          Comprueba la conexión y vuelve a intentarlo.
        </Alert>
      ) : null}
      {!history.isLoading && !history.isError ? (
        <>
          <section className={styles.selection} aria-label="Presupuestos disponibles para comparar">
            <Text fw={750}>Selecciona las propuestas</Text>
            <div className={styles.selectionItems}>
              {candidates.map((budget) => (
                <Checkbox
                  key={budget.id}
                  checked={selection.includes(budget.id)}
                  onChange={(event) => toggle(budget.id, event.currentTarget.checked)}
                  disabled={!selection.includes(budget.id) && selection.length >= 8}
                  label={`${title(budget)} · ${formatEUR(budget.totalCents)} · ${budget.status === "SIGNED" ? "Firmado" : "Borrador"}`}
                />
              ))}
            </div>
          </section>
          {selected.length < 2 ? (
            <Alert color="blue">
              Selecciona al menos dos presupuestos completos para ver la comparación.
            </Alert>
          ) : (
            <>
              <section className={styles.common} aria-label="Tratamientos compartidos">
                <Group gap="xs">
                  <Title order={3}>Tratamientos comunes</Title>
                  <Badge variant="light">{result.shared.length}</Badge>
                </Group>
                <Text size="sm" c="dimmed">
                  Estos tratamientos aparecen en todos los planes seleccionados. Por ejemplo, el
                  tratamiento periodontal previo puede ser necesario tanto si después se eligen
                  implantes como si se elige una prótesis removible.
                </Text>
                {result.shared.length ? (
                  <TreatmentRows items={result.shared} />
                ) : (
                  <Text size="sm">
                    No hay tratamientos idénticos compartidos por todas las propuestas.
                  </Text>
                )}
              </section>
              <BudgetMirror budgets={selected} />
              <Text size="xs" c="dimmed">
                Las ventajas y las limitaciones se registran al crear cada rama clínica. No se
                deducen automáticamente del precio. La indicación definitiva, los consentimientos y
                la aceptación se revisan individualmente.
              </Text>
              <TreatmentComparisonDecision
                key={selected.map((budget) => budget.id).join("|")}
                patientId={patientId}
                budgets={selected}
                sharedKeys={result.sharedKeys}
              />
            </>
          )}
          <TreatmentComparisonHistory patientId={patientId} />
        </>
      ) : null}
    </main>
  );
}

interface BudgetColumn extends MirrorColumn {
  budget: BudgetView;
  index: number;
  estimate: BudgetAppointmentEstimate;
  highlights: string[];
}

function ClinicalNote({ text }: { text: string | null | undefined }) {
  return text ? (
    <Text size="sm" className={styles.clinicalNote}>
      {text}
    </Text>
  ) : (
    <Text size="sm" c="dimmed">
      Pendiente de explicar por el odontólogo.
    </Text>
  );
}

const BUDGET_SECTIONS: ReadonlyArray<MirrorSection<BudgetColumn>> = [
  {
    id: "treatments",
    title: "Tratamientos incluidos",
    summary: ({ budget }) => `${budget.items.length} procedimientos`,
    render: ({ budget, highlights }) => (
      <>
        <TreatmentRows items={budget.items} />
        {highlights.length ? (
          <Text size="xs" c="dimmed" mt="sm">
            {highlights.join(" · ")}
          </Text>
        ) : null}
      </>
    ),
  },
  {
    id: "advantages",
    title: "Ventajas",
    render: ({ budget }) => <ClinicalNote text={budget.branch?.advantages} />,
  },
  {
    id: "disadvantages",
    title: "Desventajas y limitaciones",
    render: ({ budget }) => <ClinicalNote text={budget.branch?.disadvantages} />,
  },
  {
    id: "time",
    title: "Tiempo aproximado",
    hint: "Suma orientativa de las citas de cada etapa, contando también los pasos comunes. Las esperas clínicas y las revisiones se confirman con el profesional.",
    summary: ({ estimate }) => `≈ ${appointmentRangeLabel(estimate.total)}`,
    render: ({ estimate }) => (
      <Stack gap={8}>
        {estimate.stages.map((stage) => (
          <Group key={stage.phase} justify="space-between" gap="sm" wrap="nowrap">
            <Text size="sm">
              {stage.phase === "primary"
                ? "Fase 1 · Salud y urgencias"
                : "Fase 2 · Reponer y mejorar"}
            </Text>
            <Text size="sm" fw={700} className={styles.appointmentCount}>
              {appointmentRangeLabel(stage)}
            </Text>
          </Group>
        ))}
        <Group justify="space-between" gap="sm" wrap="nowrap">
          <Text size="sm" fw={800}>
            Total aproximado
          </Text>
          <Text size="sm" fw={800} className={styles.appointmentCount}>
            {appointmentRangeLabel(estimate.total)}
          </Text>
        </Group>
      </Stack>
    ),
  },
];

/** Every proposal in its column, with treatments, pros, cons and time folded in mirrored rows. */
function BudgetMirror({ budgets }: { budgets: readonly BudgetView[] }) {
  const columns = budgets.map((budget, index): BudgetColumn => ({
    key: budget.id,
    label: `Opción ${index + 1}`,
    ofLabel: `de la opción ${index + 1}`,
    budget,
    index,
    estimate: estimateBudgetAppointments(budget),
    highlights: implicationLines(budgetImplications(comparisonBudget(budget))).filter(
      (line) => line === "Incluye cirugía" || line === "Incluye pasos irreversibles",
    ),
  }));
  return (
    <MirrorPanels
      label="Comparación de presupuestos por columnas"
      columns={columns}
      sections={BUDGET_SECTIONS}
      defaultOpen={["treatments"]}
      header={({ budget, index, estimate }) => {
        const option = budgetOptionSummary(budget);
        return (
          <div className={styles.columnHeader}>
            <Text size="xs" fw={750} c="dimmed">
              OPCIÓN {index + 1}
            </Text>
            <Group gap={6} wrap="wrap" aria-label={`Resumen: ${option.approach}, ${option.format}`}>
              <Badge variant="light" color="blue">
                {option.approach}
              </Badge>
              <Badge variant="outline" color="teal">
                {option.format}
              </Badge>
            </Group>
            <Title order={3}>{title(budget)}</Title>
            <Badge variant="outline">{budget.status === "SIGNED" ? "Firmado" : "Borrador"}</Badge>
            <Title order={2} className={styles.amount}>
              {formatEUR(budget.totalCents)}
            </Title>
            <Text size="xs" c="dimmed">
              {budget.code}
            </Text>
            <div className={styles.headerFacts}>
              <span>{budget.items.length} procedimientos</span>
              <strong>{appointmentRangeLabel(estimate.total)}</strong>
            </div>
          </div>
        );
      }}
    />
  );
}
