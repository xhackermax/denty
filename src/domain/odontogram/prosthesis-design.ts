import type { DentalEntity, ToothArch } from "./index";
import { archForTooth } from "./index";

export type ProsthesisSupport = "teeth" | "implants";
export type ProsthesisKind = "fixed" | "removable";
export type ProsthesisLifecycle = "PLANIFICADO" | "REALIZADO";
export type ImplantAttachmentType = "TI_BASE" | "MULTIUNIT" | "LOCATOR" | "BAR" | "FIXED_BRIDGE_ATTACHMENTS";

export const PROSTHESIS_ON_TEETH = [
  { value: "fixed_bridge", label: "Prótesis fija sobre dientes", kind: "fixed" },
  { value: "fixed_attachments", label: "Prótesis fija con ataches", kind: "fixed" },
  { value: "removable_cast_clasps", label: "Prótesis removible con ganchos colados / sinterizados", kind: "removable" },
  { value: "removable_wrought_clasps", label: "Prótesis removible con ganchos forjados", kind: "removable" },
  { value: "removable_flexible", label: "Prótesis removible flexible", kind: "removable" },
  { value: "complete_denture", label: "Prótesis completa", kind: "removable" },
  { value: "telescopic_complete", label: "Prótesis completa telescópica", kind: "removable" },
  { value: "provisional", label: "Prótesis provisional", kind: "removable" },
  { value: "immediate", label: "Prótesis inmediata", kind: "removable" },
] as const;

export const PROSTHESIS_ON_IMPLANTS = [
  { value: "fixed_blender_bar", label: "Prótesis fija sobre barra Blender", kind: "fixed" },
  { value: "fixed_hybrid", label: "Prótesis fija híbrida", kind: "fixed" },
  { value: "fixed_attachments", label: "Prótesis fija con ataches sobre implantes", kind: "fixed" },
  { value: "fixed_implants", label: "Prótesis fija sobre implantes", kind: "fixed" },
  { value: "removable_locator", label: "Prótesis removible con Locator", kind: "removable" },
  { value: "removable_bar", label: "Prótesis removible sobre barra", kind: "removable" },
  { value: "single_implant", label: "Implante unitario (rehabilitación)", kind: "fixed" },
] as const;

export const IMPLANT_ATTACHMENT_TYPES: readonly { value: ImplantAttachmentType; label: string }[] = [
  { value: "TI_BASE", label: "Ti-base" },
  { value: "MULTIUNIT", label: "Multiunit" },
  { value: "LOCATOR", label: "Locator" },
  { value: "BAR", label: "Barra" },
  { value: "FIXED_BRIDGE_ATTACHMENTS", label: "Puente fijo con ataches" },
];

export interface ProsthesisPlanInput {
  selectedTooth: string;
  support: ProsthesisSupport;
  prosthesisType: string;
  arch: ToothArch;
  lifecycle: ProsthesisLifecycle;
  teethToRestore: number;
  implantCount?: number;
  attachmentCount?: number;
  attachmentType?: ImplantAttachmentType;
}

function positiveCount(value: number | undefined, field: string, max = 16): number {
  if (!Number.isInteger(value) || value! < 1 || value! > max) {
    throw new RangeError(`${field}: introduce un número entero entre 1 y ${max}.`);
  }
  return value!;
}

/** The selected tooth anchors the plan. No other teeth or implants are fabricated implicitly. */
export function createProsthesisPlan(input: ProsthesisPlanInput): DentalEntity {
  const catalog = input.support === "implants" ? PROSTHESIS_ON_IMPLANTS : PROSTHESIS_ON_TEETH;
  const procedure = catalog.find((option) => option.value === input.prosthesisType);
  if (!procedure) throw new RangeError("Selecciona un tipo de prótesis válido para su soporte.");
  if (archForTooth(input.selectedTooth) !== input.arch) {
    throw new RangeError("La pieza seleccionada debe pertenecer a la arcada indicada.");
  }
  const teethToRestore = positiveCount(input.teethToRestore, "Dientes a restaurar");
  let implantAttributes: Record<string, string | number> = {};
  if (input.support === "implants") {
    const implantCount = positiveCount(input.implantCount, "Número de implantes");
    const attachmentCount = positiveCount(input.attachmentCount, "Número de aditamentos");
    if (attachmentCount > implantCount) {
      throw new RangeError("Los aditamentos no pueden superar el número de implantes.");
    }
    if (!IMPLANT_ATTACHMENT_TYPES.some(({ value }) => value === input.attachmentType)) {
      throw new RangeError("Selecciona el tipo de aditamento.");
    }
    implantAttributes = {
      implantCount,
      attachmentCount,
      attachmentType: input.attachmentType!,
    };
  }
  return {
    id: `prosthesis-plan-${input.support}-${input.arch}-${input.selectedTooth}`,
    tooth: input.selectedTooth,
    arch: input.arch,
    entityType: procedure.kind === "removable" ? "REMOVABLE" : "PROSTHESIS",
    status: procedure.kind === "removable"
      ? (input.lifecycle === "REALIZADO" ? "removable" : "removable_pending")
      : (input.lifecycle === "REALIZADO" ? "prosthesis" : "prosthesis_pending"),
    active: true,
    attributes: {
      label: procedure.label,
      prosthesisType: procedure.value,
      support: input.support,
      kind: procedure.kind,
      lifecycle: input.lifecycle,
      teethToRestore,
      ...implantAttributes,
    },
  };
}
