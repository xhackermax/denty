"use client";

import { Badge, Button, Group, Text } from "@mantine/core";

import {
  planTradeoffContext,
  type ComparedTreatment,
  type PlanAlternativesComparison,
} from "@/domain/plan";
import { ClinicalPhaseAccordion } from "./clinical-phase-accordion";
import { PlanDentigram } from "./plan-dentigram";
import { PlanTradeoffReference } from "./plan-tradeoff-reference";
import styles from "./plan-alternatives-board.module.css";

function treatmentText(item: ComparedTreatment): string {
  return item.tooth ? `${item.label} · ${item.tooth}` : item.label;
}

function TreatmentList({ items, label }: { items: readonly ComparedTreatment[]; label?: string }) {
  return (
    <ul className={styles.treatments} {...(label ? { "aria-label": label } : {})}>
      {items.map((item, index) => (
        <li key={`${item.key}-${index}`}>{treatmentText(item)}</li>
      ))}
    </ul>
  );
}

// What the dentist wrote for the branch wins; otherwise generic points for its treatments.
function ProsCons({
  title,
  letter,
  written,
  suggested,
}: {
  title: string;
  letter: string;
  written: string | null;
  suggested: readonly string[];
}) {
  if (!written && !suggested.length) return null;
  return (
    <div className={styles.prosCons} role="group" aria-label={`${title} del Plan ${letter}`}>
      <Group gap={6}>
        <Text size="xs" fw={700}>
          {title}
        </Text>
        {!written ? (
          <Badge size="xs" variant="light" color="gray">
            Sugerido
          </Badge>
        ) : null}
      </Group>
      {written ? (
        <Text size="xs">{written}</Text>
      ) : (
        <ul className={styles.prosConsList}>
          {suggested.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PlanAlternativesBoard({
  comparison,
  selectedLetter,
  signedAlternativeIds = [],
  onSelect,
}: {
  comparison: PlanAlternativesComparison;
  selectedLetter?: string;
  signedAlternativeIds?: readonly string[];
  onSelect?: (alternativeId: string | null) => void;
}) {
  return (
    <section className={styles.board} aria-label="Comparativa de planes">
      <div className={styles.columns}>
        {comparison.columns.map((column) => {
          const selected = column.letter === selectedLetter;
          return (
            <article
              key={column.letter}
              className={styles.column}
              data-selected={selected || undefined}
              aria-label={`Plan ${column.letter}`}
            >
              <Group justify="space-between" wrap="nowrap" gap="xs">
                <div>
                  <Text fw={800}>Plan {column.letter}</Text>
                  <Text size="xs" c="dimmed">
                    {column.title} · {column.treatments.length} tratamientos
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
              {column.treatments.length ? (
                <ClinicalPhaseAccordion
                  items={column.treatments}
                  renderItems={(items) => <TreatmentList items={items} />}
                />
              ) : (
                <Text size="sm" c="dimmed">
                  Sin tratamientos.
                </Text>
              )}
            </article>
          );
        })}
      </div>

      <div className={styles.differences}>
        <div className={styles.panel}>
          <Text fw={800}>Tratamientos comunes</Text>
          <Text size="xs" c="dimmed">
            Se hacen elija el plan que elija.
          </Text>
          {comparison.common.length ? (
            <TreatmentList items={comparison.common} label="Tratamientos comunes" />
          ) : (
            <Text size="sm" c="dimmed">
              Ningún tratamiento se repite en todos los planes.
            </Text>
          )}
        </div>
        <div className={styles.panel}>
          <Text fw={800}>Tratamientos alternativos</Text>
          <Text size="xs" c="dimmed">
            Lo que cambia en cada plan, con sus ventajas y desventajas.
          </Text>
          {comparison.alternatives.length ? (
            comparison.alternatives.map((alternative) => (
              <div key={alternative.letter} className={styles.alternative}>
                <Text fw={700} size="sm">
                  Plan {alternative.letter} · {alternative.title}
                </Text>
                {alternative.exclusive.length ? (
                  <TreatmentList
                    items={alternative.exclusive}
                    label={`Tratamientos exclusivos del Plan ${alternative.letter}`}
                  />
                ) : (
                  <Text size="xs" c="dimmed">
                    Solo los tratamientos comunes.
                  </Text>
                )}
                <ProsCons
                  title="Ventajas"
                  letter={alternative.letter}
                  written={alternative.advantages}
                  suggested={alternative.suggestedAdvantages}
                />
                <ProsCons
                  title="Desventajas"
                  letter={alternative.letter}
                  written={alternative.disadvantages}
                  suggested={alternative.suggestedDisadvantages}
                />
              </div>
            ))
          ) : (
            <Text size="sm" c="dimmed">
              Todavía no hay alternativas. Ramifica el plan para comparar opciones.
            </Text>
          )}
        </div>
      </div>

      <PlanTradeoffReference context={planTradeoffContext(comparison)} />
    </section>
  );
}
