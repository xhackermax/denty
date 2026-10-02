import { describeSurfaces } from "./command-input";
import { voiceReadback, type LocalVoiceAction } from "./local-nlu";
import type { VoicePreviewDetail, VoicePreviewView } from "./voice-command-panel";
import { canExecuteVoicePreview, type VoicePreview } from "./voice-router";

const FINDING_STATES: Readonly<Record<string, string>> = {
  CARIES: "Caries (hallazgo)",
  HEALTHY: "Sano",
  MISSING: "Ausente",
};

const TREATMENT_STATES: Readonly<Record<string, string>> = {
  PLANNED: "Planificado",
  COMPLETED: "Realizado",
  UNSATISFACTORY: "Defectuoso",
};

const ACTION_TREATMENT_STATE: Partial<Record<LocalVoiceAction["type"], string>> = {
  "clinical.add_item": "Planificado",
  "clinical.plan_item": "Planificado",
  "clinical.complete_item": "Realizado",
  "clinical.mark_unsatisfactory": "Defectuoso",
};

const PATIENT_FREE_ACTIONS: ReadonlySet<LocalVoiceAction["type"]> = new Set([
  "navigation.open",
  "navigation.patient",
  "patient.create",
  "patient.resolve",
]);

const euros = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

function describe(action: LocalVoiceAction): string {
  const sentence = voiceReadback([action], [])
    .replace(/^Voy a /, "")
    .replace(/\.$/, "");
  return sentence === "No he detectado una acción concreta" ? action.type : sentence;
}

function details(action: LocalVoiceAction): VoicePreviewDetail[] {
  const rows: VoicePreviewDetail[] = [];
  if ("tooth" in action && action.tooth) rows.push({ label: "Diente", value: action.tooth });
  if ("teeth" in action && action.teeth.length) {
    rows.push({ label: "Dientes", value: action.teeth.join(", ") });
  }
  if ("surfaces" in action && action.surfaces?.length) {
    rows.push({
      label: action.surfaces.length > 1 ? "Superficies" : "Superficie",
      value: describeSurfaces(action.surfaces),
    });
  }
  if (action.type === "odontogram.set_state") {
    rows.push({ label: "Estado", value: FINDING_STATES[action.status] ?? action.status });
  }
  if (action.type === "odontogram.bridge") {
    rows.push({ label: "Estado", value: TREATMENT_STATES[action.status] ?? action.status });
  }
  const treatmentState = ACTION_TREATMENT_STATE[action.type];
  if (treatmentState) rows.push({ label: "Estado", value: treatmentState });
  if (action.type === "payment.record" && action.amountCents !== undefined) {
    rows.push({ label: "Importe", value: euros.format(action.amountCents / 100) });
  }
  return rows;
}

export function buildVoicePreviewView(
  preview: VoicePreview,
  patientLabel: (patientId: string) => string | undefined,
): VoicePreviewView {
  const { plan } = preview;
  const visible = plan.actions.filter((action) => action.type !== "patient.resolve");
  const needsPatient = visible.some((action) => !PATIENT_FREE_ACTIONS.has(action.type));
  const label = plan.contextPatientId ? patientLabel(plan.contextPatientId) : undefined;
  const blockers: string[] = [];
  if (needsPatient && !plan.contextPatientId) {
    blockers.push("Abre la ficha del paciente o di su nombre.");
  }
  if (preview.unsupportedActions.length) {
    blockers.push(
      `Esta acción todavía no se puede ejecutar por voz: ${preview.unsupportedActions.join(", ")}.`,
    );
  }
  return {
    readback: plan.readback,
    ...(label ? { patientLabel: label } : {}),
    actions: visible.map((action) => ({ description: describe(action), details: details(action) })),
    ambiguities: plan.ambiguities,
    blockers,
    canConfirm: canExecuteVoicePreview(preview) && blockers.length === 0,
    source: plan.source,
  };
}
