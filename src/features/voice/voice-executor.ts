import { archForTooth, createBridgeEntities, createRemovable, type DentalEntity } from "@/domain";
import { getBrowserApi } from "@/shared/api/browser";
import { createStateEntity, domainEntityToApiInput } from "@/shared/odontogram/odontogram-wire";

import type { LocalVoiceAction, LocalVoicePlan } from "./local-nlu";

export interface VoiceExecutionResult {
  executed: string[];
  skipped: string[];
}

function requirePatientId(plan: LocalVoicePlan): string {
  if (!plan.contextPatientId) {
    throw new Error("La acción necesita resolver primero el paciente activo.");
  }
  return plan.contextPatientId;
}

async function saveOdontogramEntities(patientId: string, entities: readonly DentalEntity[]) {
  const api = getBrowserApi();
  const current = await api.clinical.odontogram.get(patientId);
  await api.clinical.odontogram.batch(patientId, {
    expectedVersion: current.version,
    entities: entities.map(domainEntityToApiInput),
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

  if (action.type === "odontogram.set_state") {
    const state =
      action.status === "CARIES" ? "caries" : action.status === "HEALTHY" ? "healthy" : "missing";
    await saveOdontogramEntities(requirePatientId(plan), [
      createStateEntity(action.tooth, state, action.surfaces ?? []),
    ]);
    return true;
  }

  if (action.type === "odontogram.bridge") {
    const first = action.teeth[0];
    const last = action.teeth.at(-1);
    if (!first || !last) return false;
    await saveOdontogramEntities(requirePatientId(plan), createBridgeEntities(first, last));
    return true;
  }

  if (action.type === "odontogram.removable") {
    const firstTooth = action.teeth[0];
    if (!firstTooth) return false;
    const arch =
      action.arch === "UPPER"
        ? "upper"
        : action.arch === "LOWER"
          ? "lower"
          : archForTooth(firstTooth);
    await saveOdontogramEntities(requirePatientId(plan), [createRemovable(arch, action.teeth)]);
    return true;
  }

  return false;
}

export async function executeVoicePlan(plan: LocalVoicePlan): Promise<VoiceExecutionResult> {
  const executed: string[] = [];
  const skipped: string[] = [];

  for (const action of plan.actions) {
    if (action.type === "patient.resolve" || action.type.startsWith("navigation.")) continue;
    const didExecute = await executeAction(action, plan);
    (didExecute ? executed : skipped).push(action.type);
  }

  if (skipped.length) {
    throw new Error(
      `Denty todavía no puede ejecutar por voz: ${skipped.join(", ")}. ` +
        "No se ha aplicado ninguna confirmación ficticia.",
    );
  }

  return { executed, skipped };
}
