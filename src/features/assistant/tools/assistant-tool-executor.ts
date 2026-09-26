import { archForTooth, createBridgeEntities, createRemovable, type DentalEntity } from "@/domain";
import { getBrowserApi } from "@/shared/api/browser";
import { createStateEntity, domainEntityToApiInput } from "@/shared/odontogram/odontogram-wire";

import type { AssistantToolCall } from "../assistant-types";
import { assistantToolNeedsConfirmation } from "./assistant-policy";

export type AssistantExecutionEffect =
  | { type: "NAVIGATE"; href: string }
  | { type: "SELECT_TOOTH"; tooth: string }
  | { type: "NONE" };

export interface AssistantExecutionBatchResult {
  executed: string[];
  skipped: string[];
  effects: AssistantExecutionEffect[];
  pendingConfirmation?: AssistantToolCall;
}

async function saveOdontogramEntities(patientId: string, entities: readonly DentalEntity[]) {
  const api = getBrowserApi();
  const current = await api.clinical.odontogram.get(patientId);
  await api.clinical.odontogram.batch(patientId, {
    expectedVersion: current.version,
    entities: entities.map(domainEntityToApiInput),
  });
}

export async function executeAssistantTool(call: AssistantToolCall): Promise<AssistantExecutionEffect> {
  const api = getBrowserApi();
  const args = call.args as Record<string, unknown>;

  if (call.name === "navigation.open") {
    return { type: "NAVIGATE", href: String(args.destination ?? "/app") };
  }
  if (call.name === "navigation.patient") {
    return { type: "NAVIGATE", href: `/app/patients/${String(args.patientId)}` };
  }
  if (call.name === "odontogram.select_tooth") {
    return { type: "SELECT_TOOTH", tooth: String(args.tooth) };
  }
  if (call.name === "patient.create") {
    await api.patients.create({
      firstName: String(args.firstName),
      lastName: String(args.lastName),
      ...(args.phone ? { phone: String(args.phone) } : {}),
      ...(args.dni ? { dni: String(args.dni) } : {}),
    });
    return { type: "NONE" };
  }
  if (call.name === "clinical.note") {
    await api.clinical.workflow.createEncounter(String(args.patientId), {
      narrativeNote: String(args.text),
      sign: true,
    });
    return { type: "NONE" };
  }
  if (call.name === "periodontal.update") {
    const mobilityRaw = args.mobility;
    const mobility = mobilityRaw === undefined ? undefined : Number(mobilityRaw);
    await api.clinical.odontogram.periodontal(String(args.patientId), {
      tooth: String(args.tooth),
      site: String(args.site),
      ...(args.probingDepth !== undefined ? { probingDepth: Number(args.probingDepth) } : {}),
      ...(args.recession !== undefined ? { recession: Number(args.recession) } : {}),
      ...(mobility !== undefined && Number.isFinite(mobility) ? { mobility } : {}),
      ...(args.bleeding !== undefined ? { bleeding: Boolean(args.bleeding) } : {}),
      ...(args.suppuration !== undefined ? { suppuration: Boolean(args.suppuration) } : {}),
      ...(args.plaque !== undefined ? { plaque: Boolean(args.plaque) } : {}),
    });
    return { type: "NONE" };
  }
  if (call.name === "budget.sync") {
    await api.clinical.sync.budget(String(args.patientId));
    return { type: "NONE" };
  }
  if (call.name === "payment.record") {
    await api.billing.payments.record({
      patientId: String(args.patientId),
      amountCents: Number(args.amountCents),
      method: args.method as "CARD" | "CASH" | "TRANSFER" | "FINANCING",
    });
    return { type: "NONE" };
  }
  if (call.name === "odontogram.set_state") {
    const status = String(args.status);
    const state = status === "CARIES" ? "caries" : status === "HEALTHY" ? "healthy" : "missing";
    await saveOdontogramEntities(String(args.patientId), [
      createStateEntity(String(args.tooth), state, (args.surfaces as Parameters<typeof createStateEntity>[2]) ?? []),
    ]);
    return { type: "NONE" };
  }
  if (call.name === "odontogram.bridge") {
    const teeth = (args.teeth as string[]) ?? [];
    const first = teeth[0];
    const last = teeth.at(-1);
    if (!first || !last) throw new Error("El puente necesita al menos dos extremos.");
    await saveOdontogramEntities(String(args.patientId), createBridgeEntities(first, last));
    return { type: "NONE" };
  }
  if (call.name === "odontogram.removable") {
    const teeth = (args.teeth as string[]) ?? [];
    const first = teeth[0];
    if (!first) throw new Error("La prótesis removible necesita al menos un diente.");
    const archValue = String(args.arch ?? "UNSPECIFIED");
    const arch = archValue === "UPPER" ? "upper" : archValue === "LOWER" ? "lower" : archForTooth(first);
    await saveOdontogramEntities(String(args.patientId), [createRemovable(arch, teeth)]);
    return { type: "NONE" };
  }
  throw new Error(`Herramienta de Denty no implementada: ${call.name}`);
}

export async function executeAssistantCalls(
  calls: readonly AssistantToolCall[],
  options: { confirmedCallIds: ReadonlySet<string> },
): Promise<AssistantExecutionBatchResult> {
  const result: AssistantExecutionBatchResult = { executed: [], skipped: [], effects: [] };

  for (const call of calls) {
    if (assistantToolNeedsConfirmation(call) && !options.confirmedCallIds.has(call.id)) {
      result.pendingConfirmation = call;
      break;
    }
    try {
      result.effects.push(await executeAssistantTool(call));
      result.executed.push(call.name);
    } catch {
      result.skipped.push(call.name);
    }
  }

  return result;
}
