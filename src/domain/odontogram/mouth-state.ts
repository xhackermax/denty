import {
  PERMANENT_UPPER,
  PERMANENT_LOWER,
  TEMPORARY_UPPER,
  TEMPORARY_LOWER,
  clinicalLifecycleState,
  dentitionStageForBirthDate,
  type DentalEntity,
} from "./index";
import { defaultMixedPresence } from "./dentition";
export type ToothPresence =
  "present" | "missing" | "implant" | "extracted_planned" | "unerupted" | "deciduous" | "pontic";
export interface MouthState {
  dentition: "permanent" | "mixed" | "deciduous";
  teeth: Record<string, { presence: ToothPresence; replacedBy?: "implant" | "pontic" | "denture" }>;
}
const permanent: readonly string[] = [...PERMANENT_UPPER, ...PERMANENT_LOWER];
const primary: readonly string[] = [...TEMPORARY_UPPER, ...TEMPORARY_LOWER];
const natural = new Set<ToothPresence>(["present", "deciduous", "extracted_planned"]);
const IMPLANT_GONE = /lost|failed|removed|explant/;

export function deriveMouthState(
  entities: readonly DentalEntity[],
  options: { birthDate?: string; today?: string | number | Date } = {},
): MouthState {
  const stage = dentitionStageForBirthDate(options.birthDate, options.today);
  const dentition = stage === "primary" ? "deciduous" : stage;
  const mixed = defaultMixedPresence();
  const teeth: MouthState["teeth"] = Object.fromEntries(
    [...permanent, ...primary].map((tooth) => [
      tooth,
      {
        presence:
          stage === "permanent"
            ? permanent.includes(tooth)
              ? "present"
              : "missing"
            : stage === "primary"
              ? primary.includes(tooth)
                ? "deciduous"
                : "unerupted"
              : mixed.has(tooth)
                ? primary.includes(tooth)
                  ? "deciduous"
                  : "present"
                : "unerupted",
      },
    ]),
  );
  const active = entities.filter((e) => e.active);
  for (const e of active) {
    if (!e.tooth || !teeth[e.tooth]) continue;
    if (
      e.entityType === "PEDIATRIC" ||
      e.entityType === "HEALTHY" ||
      (e.entityType === "TOOTH_STATE" && e.status === "healthy")
    ) {
      teeth[e.tooth] = {
        presence: ["unerupted", "impacted", "exfoliated"].includes(e.status)
          ? "unerupted"
          : e.status === "congenitally_missing"
            ? "missing"
            : primary.includes(e.tooth)
              ? "deciduous"
              : "present",
      };
    }
  }
  for (const e of active) {
    if (!e.tooth || !teeth[e.tooth]) continue;
    const lifecycle = clinicalLifecycleState(e);
    const extraction =
      e.entityType === "EXTRACTION" ||
      (e.entityType === "SURGERY" &&
        String(e.attributes?.procedure ?? e.status).startsWith("extraction"));
    if (
      e.entityType === "MISSING" ||
      e.status === "missing" ||
      e.status === "congenitally_missing" ||
      (extraction &&
        (lifecycle === "REALIZADO" ||
          lifecycle === "REALIZADO_OTRA_CLINICA" ||
          /_completed$/.test(e.status)))
    )
      teeth[e.tooth] = { presence: "missing" };
    else if (extraction && lifecycle === "PLANIFICADO" && natural.has(teeth[e.tooth]!.presence))
      teeth[e.tooth] = { presence: "extracted_planned" };
  }
  for (const e of active) {
    const lifecycle = clinicalLifecycleState(e);
    const completed =
      ["REALIZADO", "REALIZADO_OTRA_CLINICA"].includes(lifecycle ?? "") ||
      /_completed$|^implant$/.test(e.status);
    const done =
      e.entityType === "IMPLANT"
        ? lifecycle !== "PLANIFICADO" && (completed || lifecycle === "HALLAZGO_EXISTENTE")
        : completed;
    if (!done) continue;
    // A lost or removed implant leaves the position empty: nothing to probe or restore.
    if (e.entityType === "IMPLANT" && e.tooth && teeth[e.tooth])
      teeth[e.tooth] = IMPLANT_GONE.test(e.status)
        ? { presence: "missing" }
        : { presence: "implant", replacedBy: "implant" };
    const pontics =
      e.entityType === "PONTIC" && e.tooth
        ? [e.tooth]
        : e.entityType === "BRIDGE" && Array.isArray(e.attributes?.pontics)
          ? e.attributes.pontics
          : [];
    for (const tooth of pontics)
      if (typeof tooth === "string" && teeth[tooth])
        teeth[tooth] = { presence: "pontic", replacedBy: "pontic" };
  }
  return { dentition, teeth };
}
export const isProbeable = (state: MouthState, tooth: string) =>
  natural.has(state.teeth[tooth]?.presence ?? "missing") ||
  state.teeth[tooth]?.presence === "implant";
export const isEndoCandidate = (state: MouthState, tooth: string) =>
  natural.has(state.teeth[tooth]?.presence ?? "missing");
export function isSurgicalSite(state: MouthState, tooth: string, procedure: string): boolean {
  const presence = state.teeth[tooth]?.presence;
  if (!presence) return false;
  // An impacted or retained tooth is exactly what a surgical extraction removes.
  if (procedure === "extraction_surgical" && presence === "unerupted") return true;
  if (/implant|bone|graft|mesh|alveoloplasty|sinus|splint/.test(procedure))
    return presence !== "unerupted";
  return natural.has(presence);
}
export function teethForChart(
  state: MouthState,
  _chart: "perio" | "endo" | "ortho" | "surgery",
): string[] {
  if (state.dentition === "deciduous") return [...primary];
  return state.dentition === "permanent"
    ? [...permanent, ...primary.filter((tooth) => isProbeable(state, tooth))]
    : [...PERMANENT_UPPER, ...TEMPORARY_UPPER, ...PERMANENT_LOWER, ...TEMPORARY_LOWER].filter(
        (t) => state.teeth[t]?.presence !== "unerupted",
      );
}

// Positions from the patient's right to left; the primary tooth that precedes each permanent one.
const PRIMARY_PREDECESSOR: Readonly<Record<string, string>> = Object.fromEntries(
  [1, 2, 3, 4].flatMap((quadrant) =>
    [1, 2, 3, 4, 5].map((index) => [`${quadrant}${index}`, `${quadrant + 4}${index}`]),
  ),
);

const inMouth = (state: MouthState, tooth: string) => {
  const presence = state.teeth[tooth]?.presence;
  return presence !== undefined && presence !== "unerupted";
};

/**
 * The teeth the chart draws, one per position. A young child sees only primary teeth and an adult
 * only permanent ones; a mixed dentition shows the primary tooth while it is in place and its
 * successor once it is lost, and hides permanent molars that have not erupted yet.
 */
export function chartArches(state: MouthState): { upper: string[]; lower: string[] } {
  if (state.dentition === "deciduous")
    return { upper: [...TEMPORARY_UPPER], lower: [...TEMPORARY_LOWER] };
  if (state.dentition === "permanent")
    return { upper: [...PERMANENT_UPPER], lower: [...PERMANENT_LOWER] };
  const arch = (permanentArch: readonly string[]) =>
    permanentArch.flatMap((tooth) => {
      const predecessor = PRIMARY_PREDECESSOR[tooth];
      if (predecessor && state.teeth[predecessor]?.presence === "deciduous") return [predecessor];
      if (predecessor || inMouth(state, tooth)) return [tooth];
      return [];
    });
  return { upper: arch(PERMANENT_UPPER), lower: arch(PERMANENT_LOWER) };
}
