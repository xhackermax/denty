import type { DentalEntity } from "@/domain";

export interface SurgicalVisualMark {
  readonly key: string;
  readonly kind: string;
  readonly path: string;
  readonly ariaLabel: string;
  readonly lifecycle: string;
}

function visualFor(entity: DentalEntity, tooth: string): SurgicalVisualMark | null {
  const lifecycle = String(entity.attributes?.lifecycle ?? "HALLAZGO_EXISTENTE");
  if (entity.entityType === "IMPLANT") {
    const lost = entity.status === "implant_lost";
    return {
      key: entity.id,
      kind: lost ? "implant-lost" : "implant",
      path: lost ? "M23 50 L41 78 M41 50 L23 78" : "M27 50 H37 L39 75 L32 84 L25 75 Z",
      ariaLabel: lost
        ? `Implante perdido en ${tooth}`
        : `${lifecycle === "REALIZADO" ? "Implante colocado" : "Implante planificado"} en ${tooth}`,
      lifecycle,
    };
  }
  if (entity.entityType === "BONE_GRAFT")
    return {
      key: entity.id,
      kind: "graft",
      path: "M16 72 Q32 58 48 72 Q32 86 16 72 Z",
      ariaLabel: `Regeneración ósea en ${tooth}`,
      lifecycle,
    };
  if (entity.entityType === "MEMBRANE")
    return {
      key: entity.id,
      kind: "membrane",
      path: "M14 66 Q32 52 50 66",
      ariaLabel: `Membrana en ${tooth}`,
      lifecycle,
    };
  if (entity.entityType === "SINUS_LIFT")
    return {
      key: entity.id,
      kind: "sinus",
      path: "M12 14 Q32 2 52 14",
      ariaLabel: `Elevación de seno en ${tooth}`,
      lifecycle,
    };
  if (entity.entityType === "SURGICAL_LESION")
    return {
      key: entity.id,
      kind: "lesion",
      path: "M45 18 A6 6 0 1 1 44.9 18",
      ariaLabel: `Biopsia o lesión en ${tooth}`,
      lifecycle,
    };
  if (entity.entityType === "SURGERY") {
    const extraction = entity.status.startsWith("extraction");
    return {
      key: entity.id,
      kind: extraction ? "extraction" : "surgery",
      path: extraction ? "M15 18 L49 70 M49 18 L15 70" : "M19 20 Q32 10 45 20",
      ariaLabel: `${String(entity.attributes?.label ?? "Procedimiento quirúrgico")} en ${tooth}`,
      lifecycle,
    };
  }
  return null;
}

export function surgicalVisualsForTooth(
  tooth: string,
  entities: readonly DentalEntity[],
): SurgicalVisualMark[] {
  return entities
    .filter((entity) => entity.active && entity.tooth === tooth)
    .map((entity) => visualFor(entity, tooth))
    .filter((mark): mark is SurgicalVisualMark => mark !== null);
}
