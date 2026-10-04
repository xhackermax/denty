import {
  archForTooth,
  createBridgeEntities,
  createRemovable,
  type DentalEntity,
  type ToothSurface,
} from "@/domain";
import { resolveMadridDateQuery } from "@/domain/dates";
import { getBrowserApi } from "@/shared/api/browser";
import {
  createStateEntity,
  domainEntityToApiInput,
  persistedEntityToDomain,
} from "@/shared/odontogram/odontogram-wire";
import { entityForVoiceAction, mergeVoiceEntities } from "@/features/voice/voice-odontogram";

import type { AssistantToolCall } from "../assistant-types";
import { agendaToolHandlers, type AssistantToolDeps } from "./assistant-agenda-tools";
import { assistantToolNeedsConfirmation } from "./assistant-policy";

export type AssistantExecutionEffect =
  { type: "NAVIGATE"; href: string } | { type: "SELECT_TOOTH"; tooth: string } | { type: "NONE" };

export interface AssistantExecutionFailure {
  name: string;
  message: string;
}

export interface AssistantExecutionBatchResult {
  executed: string[];
  skipped: string[];
  /** Why each skipped call failed, in the same order as `skipped`. */
  failures?: AssistantExecutionFailure[];
  effects: AssistantExecutionEffect[];
  pendingConfirmation?: AssistantToolCall;
}

// A bridge the patient already wears must not be charted as one still to make.
const BRIDGE_STATE: Readonly<Record<string, "prosthesis" | "prosthesis_bad">> = {
  COMPLETED: "prosthesis",
  UNSATISFACTORY: "prosthesis_bad",
};

async function saveOdontogramEntities(patientId: string, entities: readonly DentalEntity[]) {
  const api = getBrowserApi();
  const current = await api.clinical.odontogram.get(patientId);
  const merged = mergeVoiceEntities(current.entities.map(persistedEntityToDomain), entities);
  await api.clinical.odontogram.batch(patientId, {
    expectedVersion: current.version,
    entities: merged.map(domainEntityToApiInput),
  });
}

function hrefForDestination(destination: unknown, patientId?: unknown, dateText?: unknown): string {
  const key = String(destination ?? "home").toLowerCase();
  if (key === "odontogram" || key === "odontograma") {
    return patientId ? `/app/patients/${String(patientId)}/odontogram` : "/app/patients";
  }
  const destinations: Record<string, string> = {
    home: "/app",
    inicio: "/app",
    dashboard: "/app",
    patients: "/app/patients",
    pacientes: "/app/patients",
    agenda: "/app/agenda",
    calendar: "/app/agenda",
    laboratory: "/app/laboratory",
    laboratorio: "/app/laboratory",
    finance: "/app/finance",
    finanzas: "/app/finance",
    documents: "/app/documents",
    documentos: "/app/documents",
    tasks: "/app/tasks",
    tareas: "/app/tasks",
    settings: "/app/settings",
    ajustes: "/app/settings",
    admin: "/app/admin",
  };
  const href = destinations[key] ?? "/app";
  if (key === "agenda" && typeof dateText === "string") {
    const date = resolveMadridDateQuery(dateText);
    if (date) return `${href}?date=${encodeURIComponent(date)}`;
  }
  return href;
}

const LEGACY_TOOL_NAMES: ReadonlySet<string> = new Set([
  "navigation.open",
  "navigation.patient",
  "odontogram.select_tooth",
  "odontogram.set_state",
  "odontogram.bridge",
  "odontogram.removable",
  "periodontal.update",
  "clinical.add_item",
  "clinical.complete_item",
  "clinical.mark_unsatisfactory",
  "clinical.note",
  "budget.sync",
  "payment.record",
  "patient.create",
]);

export function hasAssistantToolHandler(name: string): boolean {
  return name in agendaToolHandlers || LEGACY_TOOL_NAMES.has(name);
}

export function listAssistantToolHandlerNames(): string[] {
  return [...Object.keys(agendaToolHandlers), ...LEGACY_TOOL_NAMES];
}

export async function executeAssistantTool(
  call: AssistantToolCall,
  deps: AssistantToolDeps = {},
): Promise<AssistantExecutionEffect> {
  const args = call.args as Record<string, unknown>;
  const handler = agendaToolHandlers[call.name];
  if (handler) {
    await handler(args, { now: deps.now ?? (() => new Date()) });
    return { type: "NONE" };
  }
  const api = getBrowserApi();

  if (call.name === "navigation.open") {
    return {
      type: "NAVIGATE",
      href: hrefForDestination(args.destination, args.patientId, args.dateText),
    };
  }
  if (call.name === "navigation.patient") {
    return { type: "NAVIGATE", href: `/app/patients/${String(args.patientId)}` };
  }
  if (call.name === "odontogram.select_tooth") {
    return { type: "SELECT_TOOTH", tooth: String(args.tooth) };
  }
  if (call.name === "patient.create") {
    if (!args.dni) throw new Error("Crear paciente requiere DNI o NIE.");
    await api.patients.create({
      firstName: String(args.firstName),
      lastName: String(args.lastName),
      ...(args.phone ? { phone: String(args.phone) } : {}),
      dni: String(args.dni),
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
      createStateEntity(
        String(args.tooth),
        state,
        (args.surfaces as Parameters<typeof createStateEntity>[2]) ?? [],
      ),
    ]);
    return { type: "NONE" };
  }
  if (call.name === "odontogram.bridge") {
    const teeth = (args.teeth as string[]) ?? [];
    const first = teeth[0];
    const last = teeth.at(-1);
    if (!first || !last) throw new Error("El puente necesita al menos dos extremos.");
    await saveOdontogramEntities(
      String(args.patientId),
      createBridgeEntities(first, last, BRIDGE_STATE[String(args.status)] ?? "prosthesis_pending"),
    );
    return { type: "NONE" };
  }
  if (call.name === "odontogram.removable") {
    const teeth = (args.teeth as string[]) ?? [];
    const first = teeth[0];
    if (!first) throw new Error("La prótesis removible necesita al menos un diente.");
    const archValue = String(args.arch ?? "UNSPECIFIED");
    const arch =
      archValue === "UPPER" ? "upper" : archValue === "LOWER" ? "lower" : archForTooth(first);
    await saveOdontogramEntities(String(args.patientId), [createRemovable(arch, teeth)]);
    return { type: "NONE" };
  }
  if (
    call.name === "clinical.add_item" ||
    call.name === "clinical.complete_item" ||
    call.name === "clinical.mark_unsatisfactory"
  ) {
    const patientId = String(args.patientId);
    const entity = entityForVoiceAction({
      type: call.name,
      patientRef: "",
      tooth: String(args.tooth),
      treatmentCode: String(args.treatmentCode),
      label: "",
      surfaces: (args.surfaces as ToothSurface[] | undefined) ?? [],
    });
    if (!entity) throw new Error("Este tratamiento no se puede dibujar en el odontograma.");
    await saveOdontogramEntities(patientId, [entity]);
    if (call.name === "clinical.add_item") {
      // The odontogram is already saved; the UI flags an outdated plan and can re-sync it.
      await api.clinical.sync.plan(patientId).catch(() => undefined);
    }
    return { type: "NONE" };
  }
  throw new Error(`Herramienta de Denty no implementada: ${call.name}`);
}

export async function executeAssistantCalls(
  calls: readonly AssistantToolCall[],
  options: { confirmedCallIds: ReadonlySet<string> } & AssistantToolDeps,
): Promise<AssistantExecutionBatchResult> {
  const result: AssistantExecutionBatchResult = {
    executed: [],
    skipped: [],
    failures: [],
    effects: [],
  };

  for (const call of calls) {
    if (assistantToolNeedsConfirmation(call) && !options.confirmedCallIds.has(call.id)) {
      result.pendingConfirmation = call;
      break;
    }
    try {
      result.effects.push(await executeAssistantTool(call, options));
      result.executed.push(call.name);
    } catch (error) {
      result.skipped.push(call.name);
      result.failures?.push({
        name: call.name,
        message: error instanceof Error ? error.message : "No se pudo ejecutar la acción.",
      });
    }
  }

  // Current callers only surface thrown errors, so a total failure must throw to be visible.
  if (result.executed.length === 0 && result.failures?.length) {
    throw new Error(result.failures.map((failure) => failure.message).join(" "));
  }

  return result;
}
