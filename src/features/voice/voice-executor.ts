import { archForTooth, createBridgeEntities, createRemovable, type DentalEntity } from "@/domain";
import { getBrowserApi } from "@/shared/api/browser";
import { DentyApiError } from "@/shared/api/errors";
import {
  domainEntityToApiInput,
  persistedEntityToDomain,
} from "@/shared/odontogram/odontogram-wire";

import type { LocalVoiceAction, LocalVoicePlan } from "./local-nlu";
import {
  entityForVoiceAction,
  isOdontogramTreatmentCode,
  mergeVoiceEntities,
} from "./voice-odontogram";

export interface VoiceExecutionResult {
  executed: string[];
  skipped: string[];
}

export const EXECUTABLE_VOICE_ACTION_TYPES = new Set<LocalVoiceAction["type"]>([
  "patient.create",
  "clinical.note",
  "periodontal.update",
  "budget.sync",
  "payment.record",
  "odontogram.set_state",
  "odontogram.bridge",
  "odontogram.removable",
  "clinical.add_item",
  "clinical.complete_item",
  "clinical.mark_unsatisfactory",
]);

export function isExecutableVoiceAction(action: LocalVoiceAction): boolean {
  if (action.type === "patient.resolve" || action.type.startsWith("navigation.")) return true;
  if (!EXECUTABLE_VOICE_ACTION_TYPES.has(action.type)) return false;
  if (action.type === "payment.record") {
    return action.amountCents !== undefined && Boolean(action.method);
  }
  if (action.type === "odontogram.bridge") return action.teeth.length >= 2;
  if (action.type === "odontogram.removable") return action.teeth.length >= 1;
  if (
    action.type === "clinical.add_item" ||
    action.type === "clinical.complete_item" ||
    action.type === "clinical.mark_unsatisfactory"
  ) {
    return Boolean(action.tooth) && isOdontogramTreatmentCode(action.treatmentCode);
  }
  return true;
}

function describeError(error: unknown): string {
  if (error instanceof DentyApiError) {
    const status = error.status ? ` (HTTP ${error.status})` : "";
    const code = error.code ? ` [${error.code}]` : "";
    return `${error.message}${code}${status}`;
  }
  return error instanceof Error ? error.message : "error desconocido";
}

function requirePatientId(plan: LocalVoicePlan): string {
  if (!plan.contextPatientId) {
    throw new Error("La acción necesita resolver primero el paciente activo.");
  }
  return plan.contextPatientId;
}

/**
 * Saving replaces the whole odontogram, so spoken findings are merged into the
 * current one instead of being sent alone (which would wipe every other tooth).
 */
async function saveOdontogramEntities(patientId: string, additions: readonly DentalEntity[]) {
  if (!additions.length) return;
  const api = getBrowserApi();
  const current = await api.clinical.odontogram.get(patientId);
  const merged = mergeVoiceEntities(current.entities.map(persistedEntityToDomain), additions);
  await api.clinical.odontogram.batch(patientId, {
    expectedVersion: current.version,
    entities: merged.map(domainEntityToApiInput),
  });
}

async function executeAction(action: LocalVoiceAction, plan: LocalVoicePlan): Promise<boolean> {
  const api = getBrowserApi();

  if (action.type === "patient.create") {
    await api.patients.create({
      firstName: action.firstName,
      lastName: action.lastName,
      ...(action.phone ? { phone: action.phone } : {}),
      ...(action.dni ? { dni: action.dni } : {}),
    });
    return true;
  }

  if (action.type === "clinical.note") {
    await api.clinical.workflow.createEncounter(requirePatientId(plan), {
      narrativeNote: action.text,
      sign: true,
    });
    return true;
  }

  if (action.type === "periodontal.update") {
    const mobility = action.mobility ? Number(action.mobility) : undefined;
    await api.clinical.odontogram.periodontal(requirePatientId(plan), {
      tooth: action.tooth,
      site: action.site,
      ...(action.probingDepth !== undefined ? { probingDepth: action.probingDepth } : {}),
      ...(action.recession !== undefined ? { recession: action.recession } : {}),
      ...(mobility !== undefined && Number.isFinite(mobility) ? { mobility } : {}),
      ...(action.bleeding !== undefined ? { bleeding: action.bleeding } : {}),
      ...(action.suppuration !== undefined ? { suppuration: action.suppuration } : {}),
      ...(action.plaque !== undefined ? { plaque: action.plaque } : {}),
    });
    return true;
  }

  if (action.type === "budget.sync") {
    await api.clinical.sync.budget(requirePatientId(plan));
    return true;
  }

  if (action.type === "payment.record") {
    if (action.amountCents === undefined || !action.method) return false;
    await api.billing.payments.record({
      patientId: requirePatientId(plan),
      amountCents: action.amountCents,
      method: action.method,
    });
    return true;
  }

  return false;
}

export async function executeVoicePlan(plan: LocalVoicePlan): Promise<VoiceExecutionResult> {
  const unsupported = plan.actions.filter((action) => !isExecutableVoiceAction(action));
  if (unsupported.length) {
    throw new Error(
      `Denty todavía no puede ejecutar por voz: ${unsupported.map((action) => action.type).join(", ")}.`,
    );
  }

  const executed: string[] = [];
  const skipped: string[] = [];

  // Everything that draws on the odontogram goes in one merged save.
  const odontogramAdditions: DentalEntity[] = [];
  let plansTreatment = false;
  for (const action of plan.actions) {
    if (action.type === "odontogram.bridge") {
      const first = action.teeth[0];
      const last = action.teeth.at(-1);
      if (first && last) odontogramAdditions.push(...createBridgeEntities(first, last));
      executed.push(action.type);
      continue;
    }
    if (action.type === "odontogram.removable") {
      const firstTooth = action.teeth[0];
      if (!firstTooth) continue;
      const arch =
        action.arch === "UPPER"
          ? "upper"
          : action.arch === "LOWER"
            ? "lower"
            : archForTooth(firstTooth);
      odontogramAdditions.push(createRemovable(arch, action.teeth));
      executed.push(action.type);
      continue;
    }
    const entity = entityForVoiceAction(action);
    if (entity) {
      odontogramAdditions.push(entity);
      if (action.type === "clinical.add_item") plansTreatment = true;
      executed.push(action.type);
    }
  }
  if (odontogramAdditions.length) {
    const patientId = requirePatientId(plan);
    try {
      await saveOdontogramEntities(patientId, odontogramAdditions);
    } catch (error) {
      throw new Error(`No se pudo guardar en el odontograma: ${describeError(error)}`);
    }
    // A treatment to do goes straight to the plan (and from there to the budget).
    if (plansTreatment) {
      try {
        await getBrowserApi().clinical.sync.plan(patientId);
      } catch (error) {
        throw new Error(
          `Guardado en el odontograma, pero el plan no se actualizó: ${describeError(error)}`,
        );
      }
    }
  }

  for (const action of plan.actions) {
    if (action.type === "patient.resolve" || action.type.startsWith("navigation.")) continue;
    if (
      action.type.startsWith("odontogram.") ||
      action.type === "clinical.add_item" ||
      action.type === "clinical.complete_item" ||
      action.type === "clinical.mark_unsatisfactory"
    )
      continue;
    const didExecute = await executeAction(action, plan);
    (didExecute ? executed : skipped).push(action.type);
  }

  if (skipped.length) {
    throw new Error(`No se pudo completar por voz: ${skipped.join(", ")}.`);
  }

  return { executed, skipped };
}
