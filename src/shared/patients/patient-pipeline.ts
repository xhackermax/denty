export type PatientPipelineStepKey =
  "odontogram" | "plan" | "budget" | "documents" | "appointments";

export interface PatientPipelineStep {
  key: PatientPipelineStepKey;
  label: string;
}

export const PATIENT_PIPELINE_STEPS: readonly PatientPipelineStep[] = [
  { key: "odontogram", label: "Odontograma" },
  { key: "plan", label: "Plan de tratamiento" },
  { key: "budget", label: "Presupuesto" },
  { key: "documents", label: "Documentos" },
  { key: "appointments", label: "Citas" },
];

// Documentos y Citas reutilizan las pantallas generales filtradas por paciente
// para no duplicar módulos; el resto vive dentro de la ficha.
export function patientPipelineHref(step: PatientPipelineStepKey, patientId: string): string {
  const id = encodeURIComponent(patientId);
  switch (step) {
    case "odontogram":
      return `/app/patients/${id}/odontogram`;
    case "plan":
      return `/app/patients/${id}?view=plan`;
    case "budget":
      return `/app/patients/${id}?view=budgets`;
    case "documents":
      return `/app/documents?patientId=${id}`;
    case "appointments":
      return `/app/agenda?patientId=${id}`;
  }
}

export function adjacentPipelineSteps(current: PatientPipelineStepKey): {
  previous: PatientPipelineStep | undefined;
  next: PatientPipelineStep | undefined;
} {
  const index = PATIENT_PIPELINE_STEPS.findIndex((step) => step.key === current);
  return {
    previous: index > 0 ? PATIENT_PIPELINE_STEPS[index - 1] : undefined,
    next: index >= 0 ? PATIENT_PIPELINE_STEPS[index + 1] : undefined,
  };
}
