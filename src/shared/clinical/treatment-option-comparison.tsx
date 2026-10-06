"use client";

import { Badge, Button, Group, Modal, Select, Stack, Text } from "@mantine/core";
import { useMemo, useState } from "react";

import { formatEUR } from "@/domain/money";
import type { BudgetView } from "./budget-options";
import styles from "./treatment-option-comparison.module.css";

interface TreatmentOptionComparisonProps {
  budgets: readonly BudgetView[];
  opened: boolean;
  onClose: () => void;
  onOpenBudget: (budget: BudgetView) => void;
  onRegisterInterest?: (budget: BudgetView) => Promise<void> | void;
  registeringInterest?: boolean;
  registerError?: string | null;
}

const WORDING: Array<{ test: RegExp; label: string }> = [
  { test: /endodon|conducto/i, label: "Tratamiento de conductos" },
  { test: /exodon|extracci/i, label: "Extracción del diente" },
  { test: /reconstru|obtura|empaste|filling/i, label: "Reconstrucción del diente" },
  { test: /implante|implant/i, label: "Colocación del implante" },
  { test: /corona|crown/i, label: "Corona dental" },
  { test: /puente|bridge/i, label: "Puente dental" },
  { test: /injerto|regeneraci[oó]n|graft/i, label: "Regeneración de hueso" },
  { test: /limpieza|higiene/i, label: "Limpieza profesional" },
  { test: /raspado|alisado|periodon/i, label: "Tratamiento de encías" },
  { test: /ortodon|alineador|bracket/i, label: "Tratamiento de ortodoncia" },
  { test: /carilla|veneer/i, label: "Carilla dental" },
  { test: /pr[oó]tesis|dentadura|removible/i, label: "Prótesis dental" },
];

function patientLabel(description: string): string {
  const translated = WORDING.find((entry) => entry.test.test(description));
  return translated?.label ?? description;
}

function optionTitle(budget: BudgetView, index: number): string {
  const title = budget.title?.trim();
  if (title) return title;
  if (budget.scope === "primary") return "Recuperar la salud primero";
  if (budget.scope === "secondary") return "Completar la rehabilitación";
  return `Opción ${index + 1}`;
}

function uniqueTreatmentLabels(budget: BudgetView): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const item of budget.items) {
    const label = patientLabel(item.description);
    const key = `${item.tooth ?? ""}|${label.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(item.tooth ? `Diente ${item.tooth}: ${label}` : label);
  }
  return labels;
}

function teethLabel(budget: BudgetView): string {
  const teeth = [...new Set(budget.items.map((item) => item.tooth).filter(Boolean))] as string[];
  if (!teeth.length) return "Tratamiento general";
  if (teeth.length === 1) return `Diente ${teeth[0]}`;
  if (teeth.length <= 4) return `Dientes ${teeth.join(", ")}`;
  return `${teeth.length} dientes o zonas`;
}

function objectiveText(budget: BudgetView): string {
  const text = budget.items.map((item) => item.description).join(" ").toLowerCase();
  if ((/endodon|conducto/.test(text) && /corona|reconstru|obtura|empaste/.test(text))) {
    return "Tratar el diente y reconstruirlo para intentar mantenerlo en función.";
  }
  if (/extracci/.test(text) && /implante/.test(text)) {
    return "Retirar el diente que no se va a conservar y sustituirlo mediante un implante.";
  }
  if (/implante/.test(text) && /corona/.test(text)) {
    return "Reponer el diente con una solución fija sobre implante.";
  }
  if (/puente|pr[oó]tesis|dentadura/.test(text)) {
    return "Reponer los dientes incluidos en esta propuesta y recuperar la función.";
  }
  return "Resolver los tratamientos incluidos en esta propuesta siguiendo el orden indicado.";
}

function differenceLabels(left: BudgetView, right: BudgetView) {
  const leftLabels = uniqueTreatmentLabels(left);
  const rightLabels = uniqueTreatmentLabels(right);
  const normalize = (value: string) => value.toLocaleLowerCase("es-ES");
  const leftSet = new Set(leftLabels.map(normalize));
  const rightSet = new Set(rightLabels.map(normalize));
  return {
    onlyLeft: leftLabels.filter((label) => !rightSet.has(normalize(label))),
    onlyRight: rightLabels.filter((label) => !leftSet.has(normalize(label))),
  };
}

function OptionCard({
  budget,
  index,
  selected,
  onSelect,
  onOpenBudget,
}: {
  budget: BudgetView;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onOpenBudget: () => void;
}) {
  const steps = uniqueTreatmentLabels(budget);
  return (
    <article className={styles.optionCard} data-selected={selected || undefined}>
      <div className={styles.optionTop}>
        <div>
          <Text size="xs" fw={750} c="dimmed">
            OPCIÓN {index + 1}
          </Text>
          <Text className={styles.optionTitle}>{optionTitle(budget, index)}</Text>
          <Text size="sm" c="dimmed" mt={5}>
            {objectiveText(budget)}
          </Text>
        </div>
        {selected ? <Badge color="teal">Me interesa</Badge> : null}
      </div>

      <div className={styles.patientPath} aria-label={`Pasos de ${optionTitle(budget, index)}`}>
        {steps.map((step, stepIndex) => (
          <div className={styles.patientPathStep} key={`${step}-${stepIndex}`}>
            <span className={styles.patientPathNumber}>{stepIndex + 1}</span>
            <span>{step}</span>
          </div>
        ))}
      </div>

      <div className={styles.optionFacts}>
        <div>
          <span>Zona</span>
          <strong>{teethLabel(budget)}</strong>
        </div>
        <div>
          <span>Pasos de tratamiento</span>
          <strong>{steps.length}</strong>
        </div>
        <div>
          <span>Presupuesto</span>
          <strong>{formatEUR(budget.totalCents)}</strong>
        </div>
      </div>

      <Group grow>
        <Button variant={selected ? "filled" : "light"} color="teal" onClick={onSelect}>
          {selected ? "Opción seleccionada" : "Me interesa esta opción"}
        </Button>
        <Button variant="subtle" color="gray" onClick={onOpenBudget}>
          Ver presupuesto
        </Button>
      </Group>
    </article>
  );
}

export function TreatmentOptionComparison({
  budgets,
  opened,
  onClose,
  onOpenBudget,
  onRegisterInterest,
  registeringInterest = false,
  registerError,
}: TreatmentOptionComparisonProps) {
  const candidates = useMemo(
    () => budgets.filter((budget) => budget.status === "DRAFT"),
    [budgets],
  );
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [showDifferences, setShowDifferences] = useState(false);

  const left = candidates.find((budget) => budget.id === leftId) ?? candidates[0] ?? null;
  const right =
    candidates.find((budget) => budget.id === rightId) ??
    candidates.find((budget) => budget.id !== left?.id) ??
    null;

  const differences = left && right ? differenceLabels(left, right) : null;
  const selected = candidates.find((budget) => budget.id === selectedId) ?? null;

  const choices = candidates.map((budget, index) => ({
    value: budget.id,
    label: `${optionTitle(budget, index)} · ${formatEUR(budget.totalCents)}`,
  }));

  const choose = (budget: BudgetView) => {
    setSelectedId(budget.id);
    setSavedId(null);
  };

  const register = async () => {
    if (!selected || !onRegisterInterest) return;
    await onRegisterInterest(selected);
    setSavedId(selected.id);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Comparar opciones de tratamiento"
      size="xl"
      centered
      classNames={{ body: styles.modalBody }}
    >
      <Stack gap="lg">
        <div className={styles.intro}>
          <Text fw={800} size="lg">
            ¿Qué opción encaja mejor contigo?
          </Text>
          <Text size="sm" c="dimmed">
            Compara qué tratamiento incluye cada propuesta, el recorrido previsto y su presupuesto.
            Elegir una opción aquí no firma ni acepta el tratamiento.
          </Text>
        </div>

        {candidates.length > 2 ? (
          <div className={styles.selectors}>
            <Select
              label="Primera opción"
              data={choices.filter((choice) => choice.value !== right?.id)}
              value={left?.id ?? null}
              onChange={setLeftId}
              allowDeselect={false}
            />
            <Select
              label="Segunda opción"
              data={choices.filter((choice) => choice.value !== left?.id)}
              value={right?.id ?? null}
              onChange={setRightId}
              allowDeselect={false}
            />
          </div>
        ) : null}

        {left && right ? (
          <>
            <div className={styles.comparisonGrid}>
              <OptionCard
                budget={left}
                index={0}
                selected={selectedId === left.id}
                onSelect={() => choose(left)}
                onOpenBudget={() => onOpenBudget(left)}
              />
              <OptionCard
                budget={right}
                index={1}
                selected={selectedId === right.id}
                onSelect={() => choose(right)}
                onOpenBudget={() => onOpenBudget(right)}
              />
            </div>

            <Button
              variant="subtle"
              color="gray"
              className={styles.differenceToggle}
              onClick={() => setShowDifferences((value) => !value)}
            >
              {showDifferences ? "Ocultar diferencias" : "Ver solo las diferencias"}
            </Button>

            {showDifferences && differences ? (
              <section className={styles.differences} aria-label="Diferencias entre opciones">
                <div className={styles.differenceColumn}>
                  <Text fw={750}>{optionTitle(left, 0)}</Text>
                  {differences.onlyLeft.length ? (
                    differences.onlyLeft.map((label) => <span key={label}>• {label}</span>)
                  ) : (
                    <span>No añade pasos exclusivos frente a la otra opción.</span>
                  )}
                </div>
                <div className={styles.differenceColumn}>
                  <Text fw={750}>{optionTitle(right, 1)}</Text>
                  {differences.onlyRight.length ? (
                    differences.onlyRight.map((label) => <span key={label}>• {label}</span>)
                  ) : (
                    <span>No añade pasos exclusivos frente a la otra opción.</span>
                  )}
                </div>
                <div className={styles.priceDifference}>
                  <span>Diferencia de presupuesto</span>
                  <strong>{formatEUR(Math.abs(left.totalCents - right.totalCents))}</strong>
                </div>
              </section>
            ) : null}

            {selected ? (
              <section className={styles.choiceSummary} aria-live="polite">
                <div>
                  <Text fw={800}>Te interesa: {optionTitle(selected, candidates.indexOf(selected))}</Text>
                  <Text size="sm" c="dimmed">
                    Esta elección sirve para continuar la conversación. No equivale a una firma ni
                    a una aceptación definitiva.
                  </Text>
                </div>
                {onRegisterInterest ? (
                  <Button
                    color="teal"
                    loading={registeringInterest}
                    disabled={savedId === selected.id}
                    onClick={() => void register()}
                  >
                    {savedId === selected.id ? "Preferencia guardada" : "Guardar preferencia"}
                  </Button>
                ) : null}
              </section>
            ) : (
              <Text ta="center" size="sm" c="dimmed">
                Puedes marcar la opción que más te interesa o seguir comparando antes de decidir.
              </Text>
            )}

            {registerError ? (
              <Text size="sm" c="red" ta="center">
                {registerError}
              </Text>
            ) : null}
          </>
        ) : (
          <Text size="sm" c="dimmed">
            Necesitas al menos dos presupuestos en borrador para comparar opciones de tratamiento.
          </Text>
        )}
      </Stack>
    </Modal>
  );
}
