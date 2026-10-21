"use client";

import {
  Alert,
  Button,
  Checkbox,
  Group,
  Radio,
  Select,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { IconPrinter } from "@tabler/icons-react";
import { useMemo, useState } from "react";

import {
  COMPARISON_DECISIONS,
  COMPARISON_DECISION_LABELS,
  TRADEOFF_CATALOG_VERSION,
  buildComparisonContent,
  comparisonConsequences,
  validateComparisonDecision,
  type ComparisonBudget,
  type ComparisonDecision,
} from "@/domain/plan";
import { DentyApiError } from "@/shared/api/errors";
import type { TreatmentComparisonRecord } from "@/shared/api/schemas/clinical-arguments";
import { useDocumentContext } from "@/shared/documents/document-context";
import { PrintNotice } from "@/shared/print/print-notice";

import { comparisonItemKey } from "./budget-comparison";
import type { BudgetView } from "./budget-options";
import { useSaveComparisonMutation } from "./clinical-arguments-data";
import { useComparisonPrinter } from "./use-comparison-printer";
import styles from "./patient-budget-comparison.module.css";

function comparisonBudget(budget: BudgetView): ComparisonBudget {
  return {
    id: budget.id,
    code: budget.code,
    title: budget.title ?? null,
    totalCents: budget.totalCents,
    advantages: budget.branch?.advantages ?? null,
    disadvantages: budget.branch?.disadvantages ?? null,
    items: budget.items.map((item) => ({
      key: comparisonItemKey(item),
      description: item.description,
      tooth: item.tooth ?? null,
      totalCents: item.totalCents,
    })),
  };
}

function errorText(error: unknown): string {
  return error instanceof DentyApiError || error instanceof Error
    ? error.message
    : "No se pudo guardar la comparación.";
}

/**
 * Records what the patient decided after seeing the compared budgets: which option they accept,
 * or that they decline, postpone or choose not to treat, plus the consequences of postponing the
 * dentist explained. Saving stores an exact copy that can be printed for the patient.
 */
export function TreatmentComparisonDecision({
  patientId,
  budgets,
  sharedKeys,
}: {
  patientId: string;
  budgets: readonly BudgetView[];
  sharedKeys: ReadonlySet<string>;
}) {
  const context = useDocumentContext();
  const save = useSaveComparisonMutation(patientId);
  const { print, notice } = useComparisonPrinter(patientId);
  const options = useMemo(() => budgets.map(comparisonBudget), [budgets]);
  const suggested = useMemo(() => comparisonConsequences(options), [options]);
  const [explained, setExplained] = useState<string[]>([]);
  const [decision, setDecision] = useState<ComparisonDecision>("PENDING");
  const [chosenOptionId, setChosenOptionId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [saved, setSaved] = useState<TreatmentComparisonRecord | null>(null);

  const doctor = context.doctorById(doctorId ?? context.defaultDoctorId);
  const professionalName = doctor
    ? `${doctor.displayName}${doctor.collegiateNumber ? ` · Col. ${doctor.collegiateNumber}` : ""}`
    : "";
  const chosen = decision === "ACCEPTED" ? chosenOptionId : null;
  const invalid = validateComparisonDecision(
    { decision, chosenOptionId: chosen },
    options.map((option) => option.id),
  );

  const submit = () =>
    save.mutate(
      {
        // A second save of the same comparison on this page becomes its next version.
        seriesId: saved?.seriesId ?? null,
        decision,
        chosenOptionId: chosen,
        decisionNote: note.trim(),
        catalogVersion: TRADEOFF_CATALOG_VERSION,
        professionalName,
        content: buildComparisonContent(
          options,
          sharedKeys,
          suggested.filter((item) => explained.includes(item.id)),
        ),
      },
      { onSuccess: setSaved },
    );

  return (
    <section className={styles.common} aria-label="Decisión del paciente">
      <Text fw={750}>Decisión del paciente</Text>
      <Text size="sm" c="dimmed">
        Guarda una copia exacta de lo que se ha explicado. Las ventajas y desventajas son las
        escritas en cada propuesta.
      </Text>
      {suggested.length ? (
        <Checkbox.Group
          label="Consecuencias de posponer que se han explicado"
          description="Marca solo las que sean pertinentes para este paciente."
          value={explained}
          onChange={setExplained}
        >
          <Stack gap={4} mt={6}>
            {suggested.map((item) => (
              <Checkbox
                key={item.id}
                value={item.id}
                label={`${item.decision}: ${item.consequence.toLowerCase()}.`}
              />
            ))}
          </Stack>
        </Checkbox.Group>
      ) : null}
      <Radio.Group
        label="Decisión"
        value={decision}
        onChange={(value) => setDecision(value as ComparisonDecision)}
      >
        <Group gap="md" mt={6}>
          {COMPARISON_DECISIONS.map((value) => (
            <Radio key={value} value={value} label={COMPARISON_DECISION_LABELS[value]} />
          ))}
        </Group>
      </Radio.Group>
      {decision === "ACCEPTED" ? (
        <Select
          label="Opción que acepta"
          placeholder="Elige una opción"
          data={budgets.map((budget, index) => ({
            value: budget.id,
            label: `Opción ${index + 1} · ${budget.title?.trim() || budget.code}`,
          }))}
          value={chosenOptionId}
          onChange={setChosenOptionId}
        />
      ) : null}
      <Textarea
        label="Nota"
        description="Motivo, dudas del paciente o cuándo volver a valorarlo."
        autosize
        minRows={2}
        maxLength={2000}
        value={note}
        onChange={(event) => setNote(event.currentTarget.value)}
      />
      <Select
        label="Profesional"
        data={context.doctors.map((item) => ({ value: item.id, label: item.displayName }))}
        value={doctor?.id ?? null}
        onChange={setDoctorId}
      />
      {save.error ? <Alert color="red">{errorText(save.error)}</Alert> : null}
      {saved ? (
        <Alert color="teal" title={`Guardada la versión ${saved.version}`}>
          Ya está en la ficha del paciente. Si cambia algo, vuelve a guardar y se añadirá una
          versión nueva.
        </Alert>
      ) : null}
      <PrintNotice error={notice.error} onClose={notice.clear} />
      <Group justify="flex-end" gap="xs">
        {saved ? (
          <Button
            variant="default"
            leftSection={<IconPrinter size={16} />}
            onClick={() => void print(saved)}
          >
            Imprimir para el paciente
          </Button>
        ) : null}
        <Button
          onClick={submit}
          loading={save.isPending}
          disabled={Boolean(invalid) || !professionalName}
          title={invalid ?? (!professionalName ? "Elige el profesional." : undefined)}
        >
          Guardar comparación
        </Button>
      </Group>
    </section>
  );
}
