"use client";

import { Badge, Button, Group, Text } from "@mantine/core";

import type { ComparedTreatment, PlanAlternativesComparison } from "@/domain/plan";
import { ClinicalPhaseAccordion } from "./clinical-phase-accordion";
import { PlanDentigram } from "./plan-dentigram";
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
                <dl className={styles.prosCons}>
                  <dt>Ventajas</dt>
                  <dd>{alternative.advantages ?? "Sin indicar"}</dd>
                  <dt>Desventajas</dt>
                  <dd>{alternative.disadvantages ?? "Sin indicar"}</dd>
                </dl>
              </div>
            ))
          ) : (
            <Text size="sm" c="dimmed">
              Todavía no hay alternativas. Ramifica el plan para comparar opciones.
            </Text>
          )}
        </div>
      </div>
    </section>
  );
}
