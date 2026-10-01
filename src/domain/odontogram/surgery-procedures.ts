import type { DentalEntity, ToothArch } from "@/domain";
const LEGACY_PROCEDURES = [
  ["extraction_simple", "Exodoncia simple"],
  ["extraction_surgical", "Exodoncia quirúrgica"],
  ["impacted", "Diente incluido / impactado"],
  ["germectomy", "Germectomía"],
  ["alveoloplasty", "Alveoloplastia"],
  ["surgical_exposure", "Exposición para tracción"],
  ["apicoectomy", "Apicectomía"],
  ["frenectomy_labial", "Frenectomía labial"],
  ["frenectomy_lingual", "Frenectomía lingual"],
  ["biopsy", "Biopsia / lesión"],
  ["implant_planned", "Implante planificado"],
  ["implant_placed", "Implante colocado"],
  ["implant_lost", "Implante perdido"],
  ["bone_graft", "Injerto óseo / ROG"],
  ["socket_preservation", "Preservación alveolar"],
  ["split_crest", "Split crest"],
  ["membrane", "Membrana"],
  ["sinus_lift_internal", "Elevación de seno interna / Summers"],
  ["sinus_lift_external", "Elevación de seno externa"],
] as const;
export const SURGERY_PROCEDURES = [
  ...LEGACY_PROCEDURES.map(([value, label]) => ({
    value,
    label,
    entityType: entityTypeFor(value),
    scope: "tooth" as const,
  })),
  { value: "gingivectomy", label: "Gingivectomía", entityType: "SURGERY", scope: "tooth" },
  {
    value: "bone_regularization",
    label: "Regularización ósea",
    entityType: "SURGERY",
    scope: "tooth",
  },
  {
    value: "guided_surgery_splint",
    label: "Férula quirúrgica guiada",
    entityType: "SURGERY",
    scope: "arch",
  },
  { value: "titanium_mesh", label: "Malla de titanio", entityType: "MEMBRANE", scope: "tooth" },
] as const;
function entityTypeFor(procedure: string): DentalEntity["entityType"] {
  if (["bone_graft", "socket_preservation", "split_crest"].includes(procedure)) return "BONE_GRAFT";
  if (procedure === "membrane") return "MEMBRANE";
  if (procedure.startsWith("sinus_lift")) return "SINUS_LIFT";
  if (procedure === "biopsy") return "SURGICAL_LESION";
  if (procedure.startsWith("implant")) return "IMPLANT";
  return "SURGERY";
}
export function archForTooth(tooth: string): ToothArch {
  return ["1", "2", "5", "6"].includes(tooth[0] ?? "") ? "upper" : "lower";
}
export function plannedImplantsInArch(entities: readonly DentalEntity[], arch: ToothArch) {
  return entities.filter(
    (e) =>
      e.active &&
      e.entityType === "IMPLANT" &&
      e.tooth &&
      archForTooth(e.tooth) === arch &&
      (e.attributes?.lifecycle === "PLANIFICADO" ||
        e.status === "implant_planned" ||
        e.status === "implant_indicated"),
  );
}
export function createSurgeryEntity(
  procedure: string,
  tooth: string,
  lifecycle: string,
  entities: readonly DentalEntity[],
  arch: ToothArch,
): DentalEntity {
  const config = SURGERY_PROCEDURES.find((p) => p.value === procedure);
  if (!config) throw new Error("Procedimiento desconocido");
  const implants = config.scope === "arch" ? plannedImplantsInArch(entities, arch) : [];
  if (config.scope === "arch" && !implants.length)
    throw new Error("Planifica los implantes de la arcada antes de registrar la férula guiada.");
  return {
    id: `surgery-${config.scope === "arch" ? arch : tooth}-${procedure}`,
    ...(config.scope === "arch" ? { arch } : { tooth }),
    entityType: config.entityType,
    status: procedure,
    active: true,
    attributes: {
      lifecycle,
      procedure,
      label: config.label,
      ...(config.scope === "arch" ? { linkedImplantIds: implants.map((e) => e.id) } : {}),
      ...(procedure === "extraction_surgical" ? { impacted: true } : {}),
    },
  };
}
