"use client";

import { Alert, Badge, Button, Checkbox, Group, Loader, Stack, Text, Title } from "@mantine/core";
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatEUR } from "@/domain/money";
import { usePatientBudgetsQuery } from "./clinical-data";
import { comparableBudgets, compareBudgetTreatments } from "./budget-comparison";
import type { BudgetView } from "./budget-options";
import styles from "./patient-budget-comparison.module.css";

function title(budget: BudgetView) {
  return budget.title?.trim() || budget.code;
}

function TreatmentRows({ items }: { items: BudgetView["items"] }) {
  if (!items.length) return <Text size="sm" c="dimmed">Sin tratamientos exclusivos.</Text>;
  return (
    <ul className={styles.treatments}>
      {items.map((item) => (
        <li key={item.id}>
          <span>{item.tooth ? `Diente ${item.tooth} · ` : ""}{item.description}</span>
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
  const candidates = useMemo(() => comparableBudgets(history.data?.items ?? []), [history.data?.items]);
  const selected = candidates.filter((budget) => selection.includes(budget.id));
  const result = compareBudgetTreatments(selected);

  const toggle = (id: string, checked: boolean) =>
    setSelection((current) =>
      checked ? (current.includes(id) || current.length >= 8 ? current : [...current, id])
        : current.filter((value) => value !== id));

  return (
    <main className={styles.comparisonPage}>
      <Group justify="space-between" align="flex-start">
        <div>
          <Text size="xs" c="dimmed" fw={750}>FICHA DEL PACIENTE · PRESUPUESTOS</Text>
          <Title order={2}>Comparar planes de tratamiento</Title>
          <Text size="sm" c="dimmed" mt={5}>
            Hasta ocho propuestas, cada una en su columna. La información es orientativa:
            comparar o marcar opciones no supone aceptación ni firma.
          </Text>
        </div>
        <Button component={Link} variant="default" href={`/app/patients/${encodeURIComponent(patientId)}?view=budgets`}>
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
            <Alert color="blue">Selecciona al menos dos presupuestos completos para ver la comparación.</Alert>
          ) : (
            <>
              <section className={styles.common} aria-label="Tratamientos compartidos">
                <Group gap="xs">
                  <Title order={3}>Tratamientos comunes</Title>
                  <Badge variant="light">{result.shared.length}</Badge>
                </Group>
                <Text size="sm" c="dimmed">
                  Estos tratamientos aparecen en todos los planes seleccionados. Por ejemplo,
                  el tratamiento periodontal previo puede ser necesario tanto si después se
                  eligen implantes como si se elige una prótesis removible.
                </Text>
                {result.shared.length ? <TreatmentRows items={result.shared} /> : (
                  <Text size="sm">No hay tratamientos idénticos compartidos por todas las propuestas.</Text>
                )}
              </section>
              <div className={styles.horizontalScroll} role="region" aria-label="Comparación de presupuestos por columnas" tabIndex={0}>
                <div className={styles.columns}>
                  {selected.map((budget, index) => (
                    <article key={budget.id} className={styles.column}>
                      <div className={styles.columnHeader}>
                        <Text size="xs" fw={750} c="dimmed">OPCIÓN {index + 1}</Text>
                        <Title order={3}>{title(budget)}</Title>
                        <Badge variant="outline">{budget.status === "SIGNED" ? "Firmado" : "Borrador"}</Badge>
                        <Title order={2} className={styles.amount}>{formatEUR(budget.totalCents)}</Title>
                        <Text size="xs" c="dimmed">{budget.code}</Text>
                      </div>
                      <section className={styles.columnSection}>
                        <Title order={4}>Tratamientos propios</Title>
                        <TreatmentRows items={result.uniqueByBudget[budget.id] ?? []} />
                      </section>
                      <section className={styles.columnSection}>
                        <Title order={4}>Ventajas</Title>
                        <Text size="sm" className={styles.clinicalNote}>
                          {budget.branch?.advantages || "Pendiente de explicar por el odontólogo."}
                        </Text>
                      </section>
                      <section className={styles.columnSection}>
                        <Title order={4}>Desventajas y limitaciones</Title>
                        <Text size="sm" className={styles.clinicalNote}>
                          {budget.branch?.disadvantages || "Pendiente de explicar por el odontólogo."}
                        </Text>
                      </section>
                      <div className={styles.columnFooter}>
                        <Text size="xs" c="dimmed">
                          {budget.items.length} procedimientos incluidos. Los pasos comunes
                          también están contabilizados en este total.
                        </Text>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
              <Text size="xs" c="dimmed">
                Las ventajas y las limitaciones se registran al crear cada rama clínica.
                No se deducen automáticamente del precio. La indicación definitiva,
                los consentimientos y la aceptación se revisan individualmente.
              </Text>
            </>
          )}
        </>
      ) : null}
    </main>
  );
}
