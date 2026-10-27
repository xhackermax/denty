"use client";

import { Badge, Button, Group, Stack, Text } from "@mantine/core";

import {
  appointmentRangeLabel,
  chairTimeLabel,
  estimatePlanAppointments,
  planTradeoffContext,
  type ComparedPlanColumn,
  type ComparedTreatment,
  type PlanAlternativeDifference,
  type PlanAlternativesComparison,
  type PlanAppointmentEstimate,
  type TreatmentTimeSource,
} from "@/domain/plan";
import type { ReactNode } from "react";
import { ClinicalPhaseAccordion } from "./clinical-phase-accordion";
import { MirrorPanels, type MirrorColumn, type MirrorSection } from "./mirror-panels";
import { PlanDentigram } from "./plan-dentigram";
import { PlanTradeoffReference } from "./plan-tradeoff-reference";
import styles from "./plan-alternatives-board.module.css";

function treatmentText(item: ComparedTreatment): string {
  return item.tooth ? `${item.label} · ${item.tooth}` : item.label;
}

function TreatmentList({
  items,
  commonKeys,
}: {
  items: readonly ComparedTreatment[];
  commonKeys: ReadonlySet<string>;
}) {
  return (
    <ul className={styles.treatments}>
      {items.map((item, index) => (
        <li key={`${item.key}-${index}`}>
          {treatmentText(item)}
          {commonKeys.has(item.key) ? (
            <Badge size="xs" variant="light" color="gray" ml={6}>
              Común
            </Badge>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

// What the dentist wrote for the branch wins; otherwise generic points for its treatments.
function ProsCons({
  written,
  suggested,
}: {
  written: string | null;
  suggested: readonly string[];
}) {
  if (written)
    return (
      <Text size="sm" className={styles.note}>
        {written}
      </Text>
    );
  if (!suggested.length)
    return (
      <Text size="sm" c="dimmed">
        Pendiente de explicar por el odontólogo.
      </Text>
    );
  return (
    <Stack gap={4}>
      <Badge size="xs" variant="light" color="gray">
        Sugerido
      </Badge>
      <ul className={styles.prosConsList}>
        {suggested.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </Stack>
  );
}

interface BoardColumn extends MirrorColumn {
  column: ComparedPlanColumn;
  difference: PlanAlternativeDifference | undefined;
  estimate: PlanAppointmentEstimate;
}

function pointCount(written: string | null, suggested: readonly string[]): string {
  const count = written
    ? written.split(/\n+/).filter((line) => line.trim()).length
    : suggested.length;
  if (!count) return "—";
  return `${count} ${count === 1 ? "punto" : "puntos"}${written ? "" : " sugeridos"}`;
}

function AppointmentStages({ estimate }: { estimate: PlanAppointmentEstimate }) {
  if (!estimate.stages.length)
    return (
      <Text size="sm" c="dimmed">
        Sin citas previstas.
      </Text>
    );
  return (
    <Stack gap={6}>
      {estimate.stages.map((stage) => (
        <Group key={stage.key} justify="space-between" gap="sm" wrap="nowrap">
          <Text size="sm">{stage.label}</Text>
          <Text size="sm" fw={700} className={styles.appointments}>
            {appointmentRangeLabel(stage)}
          </Text>
        </Group>
      ))}
      <Group justify="space-between" gap="sm" wrap="nowrap" className={styles.appointmentTotal}>
        <Text size="sm" fw={800}>
          Total aproximado
        </Text>
        <Text size="sm" fw={800} className={styles.appointments}>
          {appointmentRangeLabel(estimate.total)}
        </Text>
      </Group>
      {estimate.chairMinutes ? (
        <Text size="xs" c="dimmed">
          ≈ {chairTimeLabel(estimate.chairMinutes)}
        </Text>
      ) : null}
    </Stack>
  );
}

export function PlanAlternativesBoard({
  comparison,
  selectedLetter,
  signedAlternativeIds = [],
  onSelect,
  timeSourcesFor,
  timeBasis,
}: {
  comparison: PlanAlternativesComparison;
  selectedLetter?: string;
  signedAlternativeIds?: readonly string[];
  onSelect?: (alternativeId: string | null) => void;
  /** Recorded times for a treatment, most specific first (the doctor's, then the catalog's). */
  timeSourcesFor?: (treatment: ComparedTreatment) => ReadonlyArray<TreatmentTimeSource | null>;
  /** Shown with the time row, e.g. a picker for whose times to use. */
  timeBasis?: ReactNode;
}) {
  const commonKeys = new Set(comparison.common.map((item) => item.key));
  const hasAlternatives = comparison.alternatives.length > 0;
  const columns: BoardColumn[] = comparison.columns.map((column) => ({
    key: column.letter,
    label: `Plan ${column.letter}`,
    ofLabel: `del Plan ${column.letter}`,
    selected: column.letter === selectedLetter,
    column,
    difference: comparison.alternatives.find((item) => item.letter === column.letter),
    estimate: estimatePlanAppointments(column.treatments, timeSourcesFor),
  }));

  const sections: Array<MirrorSection<BoardColumn>> = [
    {
      id: "treatments",
      title: "Tratamientos",
      ...(hasAlternatives && comparison.common.length
        ? { hint: "Los marcados como «Común» se hacen elija el plan que elija." }
        : {}),
      summary: ({ column }) => `${column.treatments.length} tratamientos`,
      render: ({ column }) =>
        column.treatments.length ? (
          <ClinicalPhaseAccordion
            items={column.treatments}
            renderItems={(items) => <TreatmentList items={items} commonKeys={commonKeys} />}
          />
        ) : (
          <Text size="sm" c="dimmed">
            Sin tratamientos.
          </Text>
        ),
    },
    ...(hasAlternatives
      ? (["advantages", "disadvantages"] as const).map((kind): MirrorSection<BoardColumn> => {
          const title = kind === "advantages" ? "Ventajas" : "Desventajas";
          const written = (difference: PlanAlternativeDifference | undefined) =>
            difference?.[kind] ?? null;
          const suggested = (difference: PlanAlternativeDifference | undefined) =>
            (kind === "advantages"
              ? difference?.suggestedAdvantages
              : difference?.suggestedDisadvantages) ?? [];
          return {
            id: kind,
            title,
            summary: ({ difference }) => pointCount(written(difference), suggested(difference)),
            render: ({ difference }) => (
              <ProsCons written={written(difference)} suggested={suggested(difference)} />
            ),
          };
        })
      : []),
    {
      id: "time",
      title: "Tiempo aproximado",
      hint: (
        <Stack gap={6}>
          {timeBasis}
          <span>
            Suma orientativa de las citas de cada etapa. Las esperas de cicatrización y las
            revisiones las confirma el profesional.
          </span>
        </Stack>
      ),
      summary: ({ estimate }) => `≈ ${appointmentRangeLabel(estimate.total)}`,
      render: ({ estimate }) => <AppointmentStages estimate={estimate} />,
    },
  ];

  return (
    <section className={styles.board} aria-label="Comparativa de planes">
      <MirrorPanels
        label="Planes en paralelo"
        columns={columns}
        sections={sections}
        defaultOpen={["treatments"]}
        header={({ column, estimate, selected }) => {
          return (
            <>
              <Group justify="space-between" wrap="nowrap" gap="xs">
                <div>
                  <Text fw={800}>Plan {column.letter}</Text>
                  <Text size="xs" c="dimmed">
                    {column.title} · {column.treatments.length} tratamientos ·{" "}
                    {appointmentRangeLabel(estimate.total)}
                  </Text>
                </div>
                {column.alternativeId && signedAlternativeIds.includes(column.alternativeId) ? (
                  <Badge color="green">Firmado</Badge>
                ) : onSelect ? (
                  selected ? (
                    <Badge color="teal">Elegido</Badge>
                  ) : (
                    <Button
                      size="compact-xs"
                      variant="light"
                      color="teal"
                      aria-label={`Elegir Plan ${column.letter}`}
                      onClick={() => onSelect(column.alternativeId)}
                    >
                      Elegir
                    </Button>
                  )
                ) : null}
              </Group>
              <PlanDentigram letter={column.letter} treatments={column.treatments} />
            </>
          );
        }}
      />

      {hasAlternatives ? null : (
        <Text size="sm" c="dimmed">
          Todavía no hay alternativas. Ramifica el plan para comparar opciones y ver sus ventajas y
          desventajas en paralelo.
        </Text>
      )}

      <PlanTradeoffReference context={planTradeoffContext(comparison)} />
    </section>
  );
}
