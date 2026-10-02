import {
  pickPatientOverride,
  resolveVoicePatient,
  type VoicePatientCandidate,
  type VoicePatientResolution,
} from "./voice-patient-resolver";
import type { VoicePreview } from "./voice-router";

export type PatientDecision =
  | { kind: "preview"; preview: VoicePreview }
  | {
      kind: "choose";
      query: string;
      /** True when the order only opens the chart; otherwise the chosen patient gets the action. */
      navigate: boolean;
      options: VoicePatientResolution[];
      preview: VoicePreview;
    }
  | { kind: "not_found"; query: string };

const MAX_OPTIONS = 5;
// Below this a name is a guess (e.g. one shared first name), never enough to act on.
const STRONG_MATCH = 0.9;

export function patientQueryOf(preview: VoicePreview): string | undefined {
  for (const action of preview.plan.actions) {
    if (action.type === "patient.resolve" && action.query.trim()) return action.query.trim();
    if (action.type === "navigation.patient" && action.patientRef.trim()) {
      return action.patientRef.trim();
    }
  }
  return undefined;
}

function opensChartOnly(preview: VoicePreview): boolean {
  const actions = preview.plan.actions.filter((action) => action.type !== "patient.resolve");
  return actions.length > 0 && actions.every((action) => action.type === "navigation.patient");
}

export function withPatient(preview: VoicePreview, patientId: string): VoicePreview {
  return {
    ...preview,
    plan: {
      ...preview.plan,
      contextPatientId: patientId,
      ambiguities: preview.plan.ambiguities.filter((item) => !item.startsWith("paciente")),
    },
  };
}

export function decidePatient(
  preview: VoicePreview,
  candidates: readonly VoicePatientCandidate[],
  options: { search: boolean },
): PatientDecision {
  const query = patientQueryOf(preview);
  if (!query) return { kind: "preview", preview };

  if (preview.plan.contextPatientId) {
    // A patient is open: only a strong, unambiguous name may redirect the order.
    const other = pickPatientOverride(query, preview.plan.contextPatientId, candidates);
    return { kind: "preview", preview: other ? withPatient(preview, other.id) : preview };
  }

  const matches = resolveVoicePatient(query, candidates);
  const [best, second] = matches;
  if (!best) return { kind: "not_found", query };

  const navigate = opensChartOnly(preview);
  const unique = navigate
    ? best.score >= 0.98 && (!second || second.score < STRONG_MATCH)
    : best.score >= STRONG_MATCH && (!second || best.score - second.score >= 0.08);
  if (unique && !options.search) return { kind: "preview", preview: withPatient(preview, best.id) };

  return {
    kind: "choose",
    query,
    navigate,
    options: matches.slice(0, MAX_OPTIONS),
    preview,
  };
}
