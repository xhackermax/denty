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
    const done =
      ["REALIZADO", "REALIZADO_OTRA_CLINICA"].includes(clinicalLifecycleState(e) ?? "") ||
      /_completed$|^implant$/.test(e.status);
    if (!done) continue;
    if (e.entityType === "IMPLANT" && e.tooth && teeth[e.tooth])
      teeth[e.tooth] = { presence: "implant", replacedBy: "implant" };
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
