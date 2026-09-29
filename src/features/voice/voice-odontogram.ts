import type { DentalEntity, ToothState, ToothSurface } from "@/domain";
import { createStateEntity } from "@/shared/odontogram/odontogram-wire";

import type { ClinicalTreatmentState, LocalVoiceAction } from "./local-nlu";

type TreatmentFamily = "filling" | "endo" | "crown" | "post" | "implant" | "extraction";

/** Voice treatment codes that can be drawn on the odontogram. */
const TREATMENT_FAMILY: Readonly<Record<string, TreatmentFamily>> = {
  restoration: "filling",
  reconstruction: "filling",
  inlay: "filling",
  endodontics: "endo",
  reendodontics: "endo",
  crown: "crown",
  post: "post",
  implant: "implant",
  extraction: "extraction",
};

const FAMILY_STATES: Record<
  Exclude<TreatmentFamily, "extraction">,
  Record<ClinicalTreatmentState, ToothState>
> = {
  filling: { PLANNED: "filling_pending", COMPLETED: "filling", UNSATISFACTORY: "filling_bad" },
  endo: { PLANNED: "endo_indicated", COMPLETED: "endo", UNSATISFACTORY: "endo_bad" },
  crown: { PLANNED: "crown_pending", COMPLETED: "crown", UNSATISFACTORY: "crown_bad" },
  post: { PLANNED: "post_pending", COMPLETED: "post", UNSATISFACTORY: "post_bad" },
  implant: {
    PLANNED: "implant_indicated",
    COMPLETED: "implant",
    UNSATISFACTORY: "implant_review",
  },
};

export function isOdontogramTreatmentCode(code: string): boolean {
  return code in TREATMENT_FAMILY;
}

/** The tooth state a spoken treatment becomes (null when it can't be drawn). */
export function treatmentToothState(
  code: string,
  state: ClinicalTreatmentState,
): ToothState | null {
  const family = TREATMENT_FAMILY[code];
  if (!family) return null;
  if (family === "extraction") {
    if (state === "PLANNED") return "extraction";
    return state === "COMPLETED" ? "missing" : null;
  }
  return FAMILY_STATES[family][state];
}

const TREATMENT_STATE: Partial<Record<LocalVoiceAction["type"], ClinicalTreatmentState>> = {
  "clinical.add_item": "PLANNED",
  "clinical.complete_item": "COMPLETED",
  "clinical.mark_unsatisfactory": "UNSATISFACTORY",
};

/** The odontogram entity a voice action writes, or null if it doesn't touch the odontogram. */
export function entityForVoiceAction(action: LocalVoiceAction): DentalEntity | null {
  if (action.type === "odontogram.set_state") {
    const state: ToothState =
      action.status === "CARIES" ? "caries" : action.status === "HEALTHY" ? "healthy" : "missing";
    return createStateEntity(
      action.tooth,
      state,
      state === "caries" ? (action.surfaces ?? []) : [],
    );
  }
  if (
    action.type === "clinical.add_item" ||
    action.type === "clinical.complete_item" ||
    action.type === "clinical.mark_unsatisfactory"
  ) {
    const treatmentState = TREATMENT_STATE[action.type];
    if (!treatmentState || !action.tooth) return null;
    const state = treatmentToothState(action.treatmentCode, treatmentState);
    if (!state) return null;
    const surfaces: readonly ToothSurface[] = state.startsWith("filling") ? action.surfaces : [];
    return createStateEntity(action.tooth, state, surfaces);
  }
  return null;
}

function surfaceKey(entity: DentalEntity): string {
  return [...(entity.surfaces ?? [])].sort().join("");
}

/**
 * Adds spoken findings to the current odontogram. Saving replaces the whole
 * odontogram, so the result keeps every other tooth and entity untouched:
 * - "healthy"/"missing" describe the whole tooth and replace what it had;
 * - any other entry replaces only the same kind of entry on the same surfaces
 *   (a filling done replaces the planned one) and clears "healthy".
 */
export function mergeVoiceEntities(
  current: readonly DentalEntity[],
  additions: readonly DentalEntity[],
): DentalEntity[] {
  let result = current.filter((entity) => entity.active);
  for (const addition of additions) {
    const wholeTooth = addition.status === "healthy" || addition.status === "missing";
    result = result.filter((entity) => {
      if (entity.tooth !== addition.tooth) return true;
      if (wholeTooth) return false;
      if (entity.entityType === "HEALTHY" || entity.status === "healthy") return false;
      return !(
        entity.entityType === addition.entityType && surfaceKey(entity) === surfaceKey(addition)
      );
    });
    result.push(addition);
  }
  return result;
}
