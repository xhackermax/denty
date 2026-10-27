import { normalizeRecallCode, RECALL_CODE_MAX } from "@/domain/recalls";
import {
  recallTemplateInputSchema,
  type RecallTemplate,
  type RecallTemplateInput,
} from "@/shared/api/schemas/recalls";

export const WIZARD_STEPS = [
  "identity",
  "scheduling",
  "patients",
  "communications",
  "review",
] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

export const WIZARD_STEP_LABELS: Record<WizardStep, string> = {
  identity: "Datos generales",
  scheduling: "Periodicidad",
  patients: "Pacientes",
  communications: "Avisos",
  review: "Confirmación",
};

const STEP_FIELDS: Record<WizardStep, readonly (keyof RecallTemplateInput)[]> = {
  identity: ["code", "name", "category", "description", "active"],
  scheduling: [
    "anchorType",
    "intervalValue",
    "intervalUnit",
    "leadDays",
    "defaultSiteId",
    "defaultStaffId",
    "autoRecurrence",
    "maxAttempts",
  ],
  patients: ["autoEnroll"],
  communications: ["messagingEnabled", "channels", "reminderOffsets", "messageTemplateKey"],
  review: [],
};

export type RecallDraft = RecallTemplateInput;

export function emptyRecallDraft(): RecallDraft {
  return {
    code: "",
    name: "",
    category: "GENERAL",
    description: null,
    intervalValue: 6,
    intervalUnit: "MESES",
    anchorType: "FECHA_MANUAL",
    leadDays: 14,
    maxAttempts: 3,
    autoRecurrence: true,
    autoEnroll: false,
    messagingEnabled: false,
    channels: [],
    reminderOffsets: [14, 2],
    messageTemplateKey: null,
    defaultSiteId: null,
    defaultStaffId: null,
    active: true,
  };
}

/** Editing keeps every value; duplicating needs a new, unused code and name. */
export function draftFromTemplate(template: RecallTemplate, duplicate = false): RecallDraft {
  const draft: RecallDraft = {
    code: template.code,
    name: template.name,
    category: template.category,
    description: template.description,
    intervalValue: template.intervalValue,
    intervalUnit: template.intervalUnit,
    anchorType: template.anchorType,
    leadDays: template.leadDays,
    maxAttempts: template.maxAttempts,
    autoRecurrence: template.autoRecurrence,
    autoEnroll: template.autoEnroll,
    messagingEnabled: template.messagingEnabled,
    channels: [...template.channels],
    reminderOffsets: [...template.reminderOffsets],
    messageTemplateKey: template.messageTemplateKey,
    defaultSiteId: template.defaultSiteId,
    defaultStaffId: template.defaultStaffId,
    active: template.active,
  };
  if (!duplicate) return draft;
  const suffix = "_COPIA";
  return {
    ...draft,
    code: `${template.code.slice(0, RECALL_CODE_MAX - suffix.length)}${suffix}`,
    name: `${template.name} (copia)`.slice(0, 100),
  };
}

/** Suggests a code from the name until the user types one of their own. */
export function withSuggestedCode(draft: RecallDraft, name: string, codeTouched: boolean) {
  return { ...draft, name, code: codeTouched ? draft.code : normalizeRecallCode(name) };
}

// The schema's own messages are generic; these say what the field accepts.
const FIELD_HINTS: Partial<Record<keyof RecallTemplateInput, string>> = {
  code: "Usa mayúsculas, números y guion bajo (máximo 48).",
  name: "Entre 3 y 100 caracteres.",
  description: "Máximo 1000 caracteres.",
  intervalValue: "Un número entero entre 1 y 120.",
  leadDays: "Entre 0 y 180 días.",
  maxAttempts: "Entre 0 y 10 intentos.",
  messageTemplateKey: "Máximo 100 caracteres.",
};

/** Validation messages for the fields shown in one wizard step. */
export function stepIssues(draft: RecallDraft, step: WizardStep): Partial<Record<string, string>> {
  const result = recallTemplateInputSchema.safeParse(draft);
  if (result.success) return {};
  const fields = new Set<string>(STEP_FIELDS[step]);
  const issues: Partial<Record<string, string>> = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? "");
    if (fields.has(field) && !issues[field]) {
      issues[field] =
        issue.code === "custom"
          ? issue.message
          : (FIELD_HINTS[field as keyof RecallTemplateInput] ?? issue.message);
    }
  }
  return issues;
}

export function firstInvalidStep(draft: RecallDraft): WizardStep | null {
  return WIZARD_STEPS.find((step) => Object.keys(stepIssues(draft, step)).length > 0) ?? null;
}

/** "14, 2, -7" → [14, 2, -7]; anything that is not a whole number is dropped. */
export function parseOffsets(input: string): number[] {
  return input
    .split(/[,;\s]+/)
    .filter(Boolean)
    .map(Number)
    .filter((value) => Number.isInteger(value));
}
